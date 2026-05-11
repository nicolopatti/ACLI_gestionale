/**
 * Script one-off di migrazione dati da Airtable a Supabase.
 *
 * Uso:
 *   pnpm migrate:airtable
 *   pnpm migrate:airtable -- --reset    (svuota le tabelle Supabase prima)
 *   pnpm migrate:airtable -- --dry-run  (conta soltanto, niente scrittura)
 *
 * Env richieste (in .env.local):
 *   AIRTABLE_API_KEY, AIRTABLE_BASE_ID         (sorgente)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY    (destinazione)
 *
 * Strategia:
 *  - Genera UUID v4 client-side per tutte le tabelle UUID-keyed, mantenendo
 *    una mappa `recXXX -> uuid` per tradurre i linked record in foreign keys.
 *  - `movimenti.id` resta text: il PK è il campo `id` esistente su Airtable
 *    (es. `app_xxx` o id Telegram bot).
 *  - Self-FK `bambini.fratello_di` risolto in seconda passata via UPDATE.
 *  - `iscrizioni.sessioni_scelte` (multi-link) esploso nella join table
 *    `iscrizioni_sessioni`.
 *  - `--reset` cancella le righe di ogni tabella in ordine inverso delle FK.
 */
import { randomUUID } from "node:crypto";
import Airtable from "airtable";
import type { FieldSet, Records } from "airtable";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/db/types.gen";

const ARGS = new Set(process.argv.slice(2));
const RESET = ARGS.has("--reset");
const DRY = ARGS.has("--dry-run");

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

const AIRTABLE_API_KEY = required("AIRTABLE_API_KEY");
const AIRTABLE_BASE_ID = required("AIRTABLE_BASE_ID");
const SUPABASE_URL = required("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

const air = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const sb = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const AT = {
  users: "Users",
  bambini: "Bambini",
  iscrizioni: "Iscrizioni",
  mesi: "MesiIscrizione",
  presenze: "Presenze",
  movimenti: "Movimenti",
  categorie: "Categorie",
  attivita: "Attivita",
  sessioni: "Sessioni",
  contattiAggiuntivi: "ContattiAggiuntivi",
  modalitaIscrizione: "ModalitaIscrizione",
  educatori: "Educatori",
  disponibilita: "Disponibilita",
} as const;

// =========== Field helpers ===========
const s = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const str = String(v).trim();
  return str === "" ? undefined : str;
};
const num = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const arr = <T = string>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const firstLink = (v: unknown): string | undefined => arr<string>(v)[0];

// =========== Generic loaders ===========
async function fetchAll(tableName: string): Promise<Records<FieldSet>> {
  return air(tableName).select().all();
}

type SbTable = keyof Database["public"]["Tables"];

async function insertBatched<R>(table: SbTable, rows: R[]): Promise<void> {
  if (rows.length === 0 || DRY) return;
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    // Cast a `never` per accomodare il generic dinamico delle tabelle.
    const { error } = await sb
      .from(table)
      .insert(slice as unknown as never);
    if (error) {
      console.error(`[${table}] insert error:`, error);
      console.error("Sample failing row:", JSON.stringify(slice[0], null, 2));
      throw error;
    }
  }
}

// =========== --reset (delete-all in dependency order) ===========
async function resetAll() {
  if (DRY) return;
  const NEVER_UUID = "00000000-0000-0000-0000-000000000000";
  // Ordine inverso delle FK: figli prima, padri dopo.
  const order: Array<{ table: SbTable; col: string; val: string }> = [
    { table: "iscrizioni_sessioni", col: "iscrizione_id", val: NEVER_UUID },
    { table: "contatti_aggiuntivi", col: "id", val: NEVER_UUID },
    { table: "disponibilita", col: "id", val: NEVER_UUID },
    { table: "presenze", col: "id", val: NEVER_UUID },
    { table: "rate", col: "id", val: NEVER_UUID },
    { table: "iscrizioni", col: "id", val: NEVER_UUID },
    { table: "movimenti", col: "id", val: "__never_match__" },
    { table: "sessioni", col: "id", val: NEVER_UUID },
    { table: "modalita_iscrizione", col: "id", val: NEVER_UUID },
    { table: "bambini", col: "id", val: NEVER_UUID },
    { table: "attivita", col: "id", val: NEVER_UUID },
    { table: "educatori", col: "id", val: NEVER_UUID },
    { table: "categorie", col: "id", val: NEVER_UUID },
    { table: "users", col: "id", val: NEVER_UUID },
  ];
  for (const o of order) {
    const { error } = await sb.from(o.table).delete().neq(o.col, o.val);
    if (error) {
      console.error(`[reset:${o.table}] delete error:`, error);
      throw error;
    }
  }
  console.log("✓ Reset completed (all tables empty).");
}

// =========== Migration steps ===========
const idMap = {
  users: new Map<string, string>(),
  bambini: new Map<string, string>(),
  educatori: new Map<string, string>(),
  categorie: new Map<string, string>(),
  attivita: new Map<string, string>(),
  modalita: new Map<string, string>(),
  sessioni: new Map<string, string>(),
  iscrizioni: new Map<string, string>(),
  // movimenti: recXXX -> id legacy text
  movimenti: new Map<string, string>(),
};

async function migrateUsers() {
  const recs = await fetchAll(AT.users);
  const rows = recs.map((r) => {
    const id = randomUUID();
    idMap.users.set(r.id, id);
    const f = r.fields;
    return {
      id,
      email: s(f.email)?.toLowerCase() ?? "",
      password_hash: s(f.password_hash) ?? "",
      nome: s(f.nome) ?? "",
      ruolo: (s(f.ruolo) as Database["public"]["Enums"]["ruolo"]) ?? "volontario_cassa",
      attivo: Boolean(f.attivo),
      must_change_password: Boolean(f.must_change_password),
      telegram_user_id: s(f.telegram_user_id),
      created_at: s(f.created_at),
      last_login: s(f.last_login),
    };
  });
  await insertBatched("users", rows);
  console.log(`✓ users: ${rows.length}`);
}

async function migrateEducatori() {
  const recs = await fetchAll(AT.educatori);
  const rows = recs.map((r) => {
    const id = randomUUID();
    idMap.educatori.set(r.id, id);
    const f = r.fields;
    return {
      id,
      nome: s(f.nome) ?? "",
      cognome: s(f.cognome) ?? "",
      email: s(f.email),
      telefono: s(f.telefono),
      attivo: Boolean(f.attivo),
      note: s(f.note),
    };
  });
  await insertBatched("educatori", rows);
  console.log(`✓ educatori: ${rows.length}`);
}

async function migrateCategorie() {
  const recs = await fetchAll(AT.categorie);
  const rows = recs.map((r) => {
    const id = randomUUID();
    idMap.categorie.set(r.id, id);
    const f = r.fields;
    return {
      id,
      nome: s(f.nome) ?? "",
      tipo: (s(f.tipo) as Database["public"]["Enums"]["tipo_movimento"]) ?? "Uscita",
    };
  });
  await insertBatched("categorie", rows);
  console.log(`✓ categorie: ${rows.length}`);
}

async function migrateAttivita() {
  const recs = await fetchAll(AT.attivita);
  const rows = recs.map((r) => {
    const id = randomUUID();
    idMap.attivita.set(r.id, id);
    const f = r.fields;
    return {
      id,
      nome: s(f.nome) ?? "",
      tipo: (s(f.tipo) as Database["public"]["Enums"]["tipo_attivita"]) ?? "doposcuola",
      data_inizio: s(f.data_inizio),
      data_fine: s(f.data_fine),
      attivo: Boolean(f.attivo),
      note: s(f.note),
      giorni_settimana: arr<string>(f.giorni_settimana),
      fasce_orarie: arr<string>(f.fasce_orarie),
    };
  });
  await insertBatched("attivita", rows);
  console.log(`✓ attivita: ${rows.length}`);
}

// Bambini: prima passata SENZA fratello_di (rinviata).
const bambiniFratelloPairs: Array<{ id: string; fratello_di: string }> = [];

async function migrateBambiniFirstPass() {
  const recs = await fetchAll(AT.bambini);
  const rows = recs.map((r) => {
    const id = randomUUID();
    idMap.bambini.set(r.id, id);
    const f = r.fields;
    const fratelloRec = firstLink(f.fratello_di);
    if (fratelloRec) {
      bambiniFratelloPairs.push({ id, fratello_di: fratelloRec });
    }
    return {
      id,
      nome: s(f.nome) ?? "",
      cognome: s(f.cognome) ?? "",
      data_nascita: s(f.data_nascita),
      scuola: s(f.scuola),
      classe: s(f.classe),
      nome_genitore: s(f.nome_genitore) ?? "",
      cognome_genitore: s(f.cognome_genitore) ?? "",
      telefono_genitore: s(f.telefono_genitore),
      email_genitore: s(f.email_genitore),
      cf_genitore: s(f.cf_genitore),
      // fratello_di lasciato null, popolato nella seconda passata
      note: s(f.note),
      attivo: Boolean(f.attivo),
    };
  });
  await insertBatched("bambini", rows);
  console.log(`✓ bambini (pass 1): ${rows.length}`);
}

async function migrateBambiniSecondPass() {
  if (bambiniFratelloPairs.length === 0 || DRY) return;
  let resolved = 0;
  for (const pair of bambiniFratelloPairs) {
    const fratelloUuid = idMap.bambini.get(pair.fratello_di);
    if (!fratelloUuid) {
      console.warn(`  warn: bambino ${pair.id} fratello_di ${pair.fratello_di} non risolto`);
      continue;
    }
    const { error } = await sb
      .from("bambini")
      .update({ fratello_di: fratelloUuid })
      .eq("id", pair.id);
    if (error) {
      console.error(`[bambini:fratello_di] update error:`, error);
      throw error;
    }
    resolved++;
  }
  console.log(`✓ bambini (pass 2 fratello_di): ${resolved}/${bambiniFratelloPairs.length}`);
}

async function migrateModalita() {
  const recs = await fetchAll(AT.modalitaIscrizione);
  const rows: Array<Database["public"]["Tables"]["modalita_iscrizione"]["Insert"]> = [];
  for (const r of recs) {
    const f = r.fields;
    const attivitaRec = firstLink(f.attivita);
    const attivita_id = attivitaRec ? idMap.attivita.get(attivitaRec) : undefined;
    if (!attivita_id) {
      console.warn(`  warn: modalita ${r.id} senza attivita valida, skip`);
      continue;
    }
    const id = randomUUID();
    idMap.modalita.set(r.id, id);
    rows.push({
      id,
      attivita_id,
      nome: s(f.nome) ?? "",
      importo: num(f.importo) ?? 0,
      descrizione: s(f.descrizione),
      attivo: Boolean(f.attivo),
    });
  }
  await insertBatched("modalita_iscrizione", rows);
  console.log(`✓ modalita_iscrizione: ${rows.length}`);
}

async function migrateSessioni() {
  const recs = await fetchAll(AT.sessioni);
  const rows: Array<Database["public"]["Tables"]["sessioni"]["Insert"]> = [];
  for (const r of recs) {
    const f = r.fields;
    const attivitaRec = firstLink(f.attivita);
    const attivita_id = attivitaRec ? idMap.attivita.get(attivitaRec) : undefined;
    if (!attivita_id) {
      console.warn(`  warn: sessione ${r.id} senza attivita valida, skip`);
      continue;
    }
    const id = randomUUID();
    idMap.sessioni.set(r.id, id);
    rows.push({
      id,
      attivita_id,
      tipo_unita: (s(f.tipo_unita) as Database["public"]["Enums"]["tipo_unita"]) ?? "mese",
      chiave: s(f.chiave) ?? "",
      etichetta: s(f.etichetta) ?? "",
      fascia_oraria: s(f.fascia_oraria),
      data_inizio: s(f.data_inizio),
      data_fine: s(f.data_fine),
    });
  }
  await insertBatched("sessioni", rows);
  console.log(`✓ sessioni: ${rows.length}`);
}

async function migrateMovimenti() {
  const recs = await fetchAll(AT.movimenti);
  const rows: Array<Database["public"]["Tables"]["movimenti"]["Insert"]> = [];
  for (const r of recs) {
    const f = r.fields;
    // PK testuale: usa `fields.id` esistente o genera `mig_<rec>` come fallback.
    const id = s(f.id) ?? `mig_${r.id}`;
    idMap.movimenti.set(r.id, id);
    const categoriaRec = firstLink(f.categoria);
    const categoria_id = categoriaRec ? idMap.categorie.get(categoriaRec) : undefined;
    rows.push({
      id,
      timestamp: s(f.timestamp),
      data_movimento: s(f.data_movimento),
      tipo: (s(f.tipo) as Database["public"]["Enums"]["tipo_movimento"]) ?? "Uscita",
      importo: num(f.importo) ?? 0,
      conto: (s(f.conto) as Database["public"]["Enums"]["mezzo_pagamento"]) ?? "Cassa",
      categoria_id,
      descrizione: s(f.descrizione),
      volontario: s(f.volontario),
      telegram_user_id: s(f.telegram_user_id),
      stato: (s(f.stato) as Database["public"]["Enums"]["stato_movimento"]) ?? "valido",
      note: s(f.note),
      id_correzione: s(f.id_correzione),
      importo_segnato: num(f.importo_segnato),
      synced_at: s(f.synced_at),
    });
  }
  await insertBatched("movimenti", rows);
  console.log(`✓ movimenti: ${rows.length}`);
}

async function migrateIscrizioni() {
  const recs = await fetchAll(AT.iscrizioni);
  const rows: Array<Database["public"]["Tables"]["iscrizioni"]["Insert"]> = [];
  const sessioniScelte: Array<{ iscrizione_id: string; sessione_id: string }> = [];
  for (const r of recs) {
    const f = r.fields;
    const bambinoRec = firstLink(f.bambino);
    const attivitaRec = firstLink(f.attivita);
    const modalitaRec = firstLink(f.modalita_iscrizione);
    const bambino_id = bambinoRec ? idMap.bambini.get(bambinoRec) : undefined;
    const attivita_id = attivitaRec ? idMap.attivita.get(attivitaRec) : undefined;
    const modalita_id = modalitaRec ? idMap.modalita.get(modalitaRec) : undefined;
    if (!bambino_id || !attivita_id || !modalita_id) {
      console.warn(`  warn: iscrizione ${r.id} senza FK complete, skip`);
      continue;
    }
    const id = randomUUID();
    idMap.iscrizioni.set(r.id, id);
    rows.push({
      id,
      codice: s(f.codice),
      bambino_id,
      attivita_id,
      modalita_id,
      data_iscrizione: s(f.data_iscrizione),
      giorni_settimana: arr<string>(f.giorni_settimana),
      fasce_orarie: arr<string>(f.fasce_orarie),
      note: s(f.note),
    });
    for (const sesRec of arr<string>(f.sessioni_scelte)) {
      const sessione_id = idMap.sessioni.get(sesRec);
      if (sessione_id) sessioniScelte.push({ iscrizione_id: id, sessione_id });
    }
  }
  await insertBatched("iscrizioni", rows);
  console.log(`✓ iscrizioni: ${rows.length}`);
  // Dedup the join table in case Airtable had duplicates
  const seen = new Set<string>();
  const uniq = sessioniScelte.filter((x) => {
    const k = `${x.iscrizione_id}:${x.sessione_id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await insertBatched("iscrizioni_sessioni", uniq);
  console.log(`✓ iscrizioni_sessioni: ${uniq.length}`);
}

async function migrateRate() {
  const recs = await fetchAll(AT.mesi);
  const rows: Array<Database["public"]["Tables"]["rate"]["Insert"]> = [];
  for (const r of recs) {
    const f = r.fields;
    const iscrizioneRec = firstLink(f.iscrizione);
    const iscrizione_id = iscrizioneRec ? idMap.iscrizioni.get(iscrizioneRec) : undefined;
    if (!iscrizione_id) {
      console.warn(`  warn: rata ${r.id} senza iscrizione valida, skip`);
      continue;
    }
    const sessioneRec = firstLink(f.sessione);
    const sessione_id = sessioneRec ? idMap.sessioni.get(sessioneRec) : undefined;
    const movimentoRec = firstLink(f.movimento_collegato);
    const movimento_id = movimentoRec ? idMap.movimenti.get(movimentoRec) : undefined;
    rows.push({
      id: randomUUID(),
      codice: s(f.codice),
      iscrizione_id,
      sessione_id,
      tipo_unita: (s(f.tipo_unita) as Database["public"]["Enums"]["tipo_unita"]) ?? null,
      chiave_periodo: s(f.chiave_periodo),
      mese_anno: s(f.mese_anno),
      importo_dovuto: num(f.importo_dovuto) ?? 0,
      stato_pagamento:
        (s(f.stato_pagamento) as Database["public"]["Enums"]["stato_pagamento"]) ??
        "non_pagato",
      importo_pagato: num(f.importo_pagato),
      data_pagamento: s(f.data_pagamento),
      mezzo_pagamento:
        (s(f.mezzo_pagamento) as Database["public"]["Enums"]["mezzo_pagamento"]) ?? null,
      movimento_id,
      note: s(f.note),
    });
  }
  await insertBatched("rate", rows);
  console.log(`✓ rate: ${rows.length}`);
}

async function migratePresenze() {
  const recs = await fetchAll(AT.presenze);
  const rows: Array<Database["public"]["Tables"]["presenze"]["Insert"]> = [];
  for (const r of recs) {
    const f = r.fields;
    const bambinoRec = firstLink(f.bambino);
    const bambino_id = bambinoRec ? idMap.bambini.get(bambinoRec) : undefined;
    if (!bambino_id) {
      console.warn(`  warn: presenza ${r.id} senza bambino valido, skip`);
      continue;
    }
    const sessioneRec = firstLink(f.sessione);
    const sessione_id = sessioneRec ? idMap.sessioni.get(sessioneRec) : undefined;
    const userRec = firstLink(f.registrato_da);
    const registrato_da = userRec ? idMap.users.get(userRec) : undefined;
    rows.push({
      id: randomUUID(),
      codice: s(f.codice),
      bambino_id,
      sessione_id,
      data: s(f.data) ?? "",
      presente: typeof f.presente === "boolean" ? f.presente : null,
      ora_ingresso: s(f.ora_ingresso),
      ora_uscita: s(f.ora_uscita),
      note: s(f.note),
      registrato_da,
      created_at: s(f.created_at),
    });
  }
  await insertBatched("presenze", rows);
  console.log(`✓ presenze: ${rows.length}`);
}

async function migrateDisponibilita() {
  const recs = await fetchAll(AT.disponibilita);
  const rows: Array<Database["public"]["Tables"]["disponibilita"]["Insert"]> = [];
  const seen = new Set<string>();
  for (const r of recs) {
    const f = r.fields;
    const eduRec = firstLink(f.educatore);
    const educatore_id = eduRec ? idMap.educatori.get(eduRec) : undefined;
    if (!educatore_id) {
      console.warn(`  warn: disponibilita ${r.id} senza educatore valido, skip`);
      continue;
    }
    const data = s(f.data) ?? "";
    const fascia_oraria = s(f.fascia_oraria) ?? "";
    if (!data || !fascia_oraria) continue;
    // Dedup su UNIQUE (educatore_id, data, fascia_oraria)
    const k = `${educatore_id}|${data}|${fascia_oraria}`;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({
      id: randomUUID(),
      educatore_id,
      data,
      fascia_oraria,
      ora_ingresso: s(f.ora_ingresso),
      ora_uscita: s(f.ora_uscita),
      note: s(f.note),
    });
  }
  await insertBatched("disponibilita", rows);
  console.log(`✓ disponibilita: ${rows.length}`);
}

async function migrateContatti() {
  const recs = await fetchAll(AT.contattiAggiuntivi);
  const rows: Array<Database["public"]["Tables"]["contatti_aggiuntivi"]["Insert"]> = [];
  for (const r of recs) {
    const f = r.fields;
    const bambinoRec = firstLink(f.bambino);
    const bambino_id = bambinoRec ? idMap.bambini.get(bambinoRec) : undefined;
    if (!bambino_id) {
      console.warn(`  warn: contatto ${r.id} senza bambino, skip`);
      continue;
    }
    rows.push({
      id: randomUUID(),
      bambino_id,
      ruolo: (s(f.ruolo) as Database["public"]["Enums"]["ruolo_contatto"]) ?? "altro",
      nome: s(f.nome) ?? "",
      cognome: s(f.cognome) ?? "",
      telefono: s(f.telefono),
      note: s(f.note),
    });
  }
  await insertBatched("contatti_aggiuntivi", rows);
  console.log(`✓ contatti_aggiuntivi: ${rows.length}`);
}

// =========== Main ===========
async function main() {
  console.log("Migrazione Airtable -> Supabase");
  console.log(`  modalita: ${RESET ? "RESET + insert" : "insert only"}${DRY ? " [DRY-RUN]" : ""}`);
  if (RESET) await resetAll();
  await migrateUsers();
  await migrateEducatori();
  await migrateCategorie();
  await migrateAttivita();
  await migrateBambiniFirstPass();
  await migrateModalita();
  await migrateSessioni();
  await migrateMovimenti();
  await migrateIscrizioni();
  await migrateRate();
  await migratePresenze();
  await migrateDisponibilita();
  await migrateContatti();
  await migrateBambiniSecondPass();
  console.log("\n✓ Migrazione completata.");
}

main().catch((err) => {
  console.error("\n✗ Migrazione fallita:", err);
  process.exit(1);
});
