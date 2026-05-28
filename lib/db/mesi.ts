import "server-only";
import { db } from "./client";
import type { MeseIscrizione } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type {
  MezzoPagamento,
  StatoPagamento,
  TipoAttivita,
  TipoRigaRata,
  TipoUnita,
} from "@/lib/config";

type RataRow = Database["public"]["Tables"]["rate"]["Row"];

function mapMese(row: RataRow): MeseIscrizione {
  return {
    recordId: row.id,
    codice: row.codice ?? "",
    iscrizioneId: row.iscrizione_id,
    sessioneId: row.sessione_id ?? undefined,
    tipoUnita: (row.tipo_unita as TipoUnita | null) ?? undefined,
    chiavePeriodo: row.chiave_periodo ?? undefined,
    meseAnno: row.mese_anno ?? "",
    importoDovuto: Number(row.importo_dovuto),
    statoPagamento: row.stato_pagamento as StatoPagamento,
    importoPagato:
      row.importo_pagato != null ? Number(row.importo_pagato) : undefined,
    dataPagamento: row.data_pagamento ?? undefined,
    mezzoPagamento:
      (row.mezzo_pagamento as MezzoPagamento | null) ?? undefined,
    movimentoCollegatoId: row.movimento_id ?? undefined,
    tipoRiga: row.tipo_riga as TipoRigaRata,
    descrizioneRiga: row.descrizione_riga ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listAllMesi(): Promise<MeseIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .order("chiave_periodo");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function listMesiByIscrizione(
  iscrizioneId: string,
): Promise<MeseIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .eq("iscrizione_id", iscrizioneId)
    .order("chiave_periodo");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function listMesiByIscrizioneIds(
  iscrizioneIds: string[],
): Promise<MeseIscrizione[]> {
  if (!db || iscrizioneIds.length === 0) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .in("iscrizione_id", iscrizioneIds)
    .order("chiave_periodo");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function listMesiByChiavePeriodo(
  chiave: string,
): Promise<MeseIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .eq("chiave_periodo", chiave);
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function getMese(recordId: string): Promise<MeseIscrizione | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("rate")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapMese(data) : null;
}

/**
 * Crea N rate in batch. Tutti i campi specifici (sessioneId/tipoUnita/
 * chiavePeriodo) sono opzionali: le righe `pacchetto`/`quota_iscrizione`/
 * `sconto` non sono legate a una sessione e li lasciano NULL. La policy
 * `tipoRiga` (default `'sessione'` lato applicativo come lato DB) discrimina
 * il tipo.
 */
export async function createMesi(
  input: Array<{
    iscrizioneId: string;
    sessioneId?: string | null;
    tipoUnita?: TipoUnita | null;
    chiavePeriodo?: string | null;
    importoDovuto: number;
    meseAnno?: string | null;
    tipoRiga?: TipoRigaRata;
    descrizioneRiga?: string | null;
  }>,
): Promise<MeseIscrizione[]> {
  if (!db) throw new Error("Supabase client non configurato");
  if (input.length === 0) return [];
  const rows = input.map((m) => ({
    iscrizione_id: m.iscrizioneId,
    sessione_id: m.sessioneId ?? null,
    tipo_unita: m.tipoUnita ?? null,
    chiave_periodo: m.chiavePeriodo ?? null,
    importo_dovuto: m.importoDovuto,
    stato_pagamento: "non_pagato" as const,
    mese_anno: m.meseAnno ?? null,
    tipo_riga: m.tipoRiga ?? ("sessione" as const),
    descrizione_riga: m.descrizioneRiga ?? null,
  }));
  const { data, error } = await db.from("rate").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

/**
 * True se l'iscrizione ha almeno una rata pagata o parziale (qualunque
 * tipo_riga). Usata dal `wipe-and-recreate` su cambio policy.
 */
export async function hasAnyRataPagata(iscrizioneId: string): Promise<boolean> {
  if (!db) return false;
  const { data, error } = await db
    .from("rate")
    .select("id")
    .eq("iscrizione_id", iscrizioneId)
    .in("stato_pagamento", ["pagato", "parziale"])
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Cancella selettivamente le rate di un'iscrizione per `tipo_riga`. Utile in
 * `updateIscrizioneAction` per: rimuovere la quota quando l'utente la
 * deseleziona, oppure resettare tutti gli sconti prima di ricrearli col
 * nuovo set selezionato.
 */
export async function deleteRateByTipoRiga(
  iscrizioneId: string,
  tipoRiga: TipoRigaRata,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("iscrizione_id", iscrizioneId)
    .eq("tipo_riga", tipoRiga)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function updateMese(
  recordId: string,
  fields: Partial<{
    importo_dovuto: number;
    stato_pagamento: StatoPagamento;
    importo_pagato: number;
    data_pagamento: string;
    mezzo_pagamento: MezzoPagamento;
    movimento_collegato: string[];
    note: string;
  }>,
): Promise<MeseIscrizione> {
  if (!db) throw new Error("Supabase client non configurato");
  // Retrocompat: `movimento_collegato` arrivava come array di linked record da
  // Airtable. Qui mappiamo al campo testuale singolo `movimento_id`.
  const { movimento_collegato, ...rest } = fields;
  const update: Database["public"]["Tables"]["rate"]["Update"] = { ...rest };
  if (movimento_collegato !== undefined) {
    update.movimento_id = movimento_collegato[0] ?? null;
  }
  const { data, error } = await db
    .from("rate")
    .update(update)
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  return mapMese(data);
}

export async function countMesiNonPagati(chiavePeriodo: string): Promise<number> {
  if (!db) return 0;
  const { count, error } = await db
    .from("rate")
    .select("id", { count: "exact", head: true })
    .eq("chiave_periodo", chiavePeriodo)
    .neq("stato_pagamento", "pagato");
  if (error) throw error;
  return count ?? 0;
}

export async function deleteRateBySessioneEIscrizione(
  iscrizioneId: string,
  sessioneId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("iscrizione_id", iscrizioneId)
    .eq("sessione_id", sessioneId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function hasRataPagataForSessione(
  iscrizioneId: string,
  sessioneId: string,
): Promise<boolean> {
  if (!db) return false;
  const { data, error } = await db
    .from("rate")
    .select("id")
    .eq("iscrizione_id", iscrizioneId)
    .eq("sessione_id", sessioneId)
    .in("stato_pagamento", ["pagato", "parziale"])
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function hasAnyRataPagataForSessione(
  sessioneId: string,
): Promise<boolean> {
  if (!db) return false;
  const { data, error } = await db
    .from("rate")
    .select("id")
    .eq("sessione_id", sessioneId)
    .in("stato_pagamento", ["pagato", "parziale"])
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * IDs dei movimenti di cassa collegati alle rate pagate delle iscrizioni date
 * (rate.movimento_id non nullo). Serve a rimuovere le entrate generate dai
 * pagamenti quando si elimina un'iscrizione / un bambino / un'attivita,
 * evitando movimenti "fantasma" orfani in contabilita'.
 */
export async function listMovimentiIdsByIscrizioni(
  iscrizioneIds: string[],
): Promise<string[]> {
  if (!db || iscrizioneIds.length === 0) return [];
  const { data, error } = await db
    .from("rate")
    .select("movimento_id")
    .in("iscrizione_id", iscrizioneIds)
    .not("movimento_id", "is", null);
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.movimento_id)
    .filter((id): id is string => !!id);
}

export async function deleteMesiByIscrizione(
  iscrizioneId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("iscrizione_id", iscrizioneId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function deleteMesiBySessione(
  sessioneId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("sessione_id", sessioneId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export interface RataPaymentContext {
  rata: MeseIscrizione;
  bambinoNome: string;
  bambinoCognome: string;
  attivitaNome: string;
  attivitaTipo: TipoAttivita;
  modalitaNome: string;
}

/**
 * Recupera la rata + i metadati necessari a costruire un Movimento Entrata
 * (nome bambino, attività, modalità) in un'unica query con join.
 */
export async function getRataPaymentContext(
  rataId: string,
): Promise<RataPaymentContext | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("rate")
    .select(
      "*, iscrizione:iscrizioni!inner(*, bambino:bambini!inner(nome,cognome), attivita:attivita!inner(nome,tipo), modalita:modalita_iscrizione!inner(nome))",
    )
    .eq("id", rataId)
    .maybeSingle();
  if (error || !data) return null;
  const iscrizione = data.iscrizione as unknown as {
    bambino: { nome: string; cognome: string };
    attivita: { nome: string; tipo: TipoAttivita };
    modalita: { nome: string };
  };
  return {
    rata: mapMese(data),
    bambinoNome: iscrizione.bambino.nome,
    bambinoCognome: iscrizione.bambino.cognome,
    attivitaNome: iscrizione.attivita.nome,
    attivitaTipo: iscrizione.attivita.tipo,
    modalitaNome: iscrizione.modalita.nome,
  };
}
