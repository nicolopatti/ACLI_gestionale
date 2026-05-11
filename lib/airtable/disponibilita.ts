import type Airtable from "airtable";
import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Disponibilita } from "./types";
import type { FasciaOraria } from "@/lib/config";

type Fields = Partial<Airtable.FieldSet>;

function mapDisponibilita(record: {
  id: string;
  fields: Record<string, unknown>;
}): Disponibilita {
  const f = record.fields;
  const eduLink = (f.educatore as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    educatoreId: eduLink[0] ?? "",
    data: (f.data as string) ?? "",
    fasciaOraria: (f.fascia_oraria as FasciaOraria) ?? "",
    oraIngresso: (f.ora_ingresso as string) || undefined,
    oraUscita: (f.ora_uscita as string) || undefined,
    note: (f.note as string) ?? undefined,
  };
}

export async function listDisponibilitaByRange(
  dataInizio: string,
  dataFine: string,
): Promise<Disponibilita[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.disponibilita)
    .select({
      filterByFormula: `AND({data} >= '${escapeFormulaString(dataInizio)}', {data} <= '${escapeFormulaString(dataFine)}')`,
      sort: [{ field: "data", direction: "asc" }],
    })
    .all();
  return records.map((r) => mapDisponibilita({ id: r.id, fields: r.fields }));
}

export async function listDisponibilitaByMese(meseAnno: string): Promise<Disponibilita[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.disponibilita)
    .select({
      filterByFormula: `LEFT({data}, 7) = '${escapeFormulaString(meseAnno)}'`,
      sort: [{ field: "data", direction: "asc" }],
    })
    .all();
  return records.map((r) => mapDisponibilita({ id: r.id, fields: r.fields }));
}

export async function listDisponibilitaByEducatoreEMese(
  educatoreId: string,
  meseAnno: string,
): Promise<Disponibilita[]> {
  // Filtra lato server: ARRAYJOIN su un linked record produce i display name,
  // non gli id, quindi FIND('rec...') non matcha. Riusiamo la versione "tutte"
  // e filtriamo per mese qui.
  const all = await listDisponibilitaByEducatore(educatoreId);
  return all.filter((d) => d.data.startsWith(meseAnno));
}

export async function listDisponibilitaByEducatore(
  educatoreId: string,
): Promise<Disponibilita[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.disponibilita)
    .select({
      sort: [{ field: "data", direction: "asc" }],
    })
    .all();
  return records
    .map((r) => mapDisponibilita({ id: r.id, fields: r.fields }))
    .filter((d) => d.educatoreId === educatoreId);
}

export async function listDisponibilitaByDataEFascia(
  data: string,
  fascia: FasciaOraria,
): Promise<Disponibilita[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.disponibilita)
    .select({
      filterByFormula: `AND({data} = '${escapeFormulaString(data)}', {fascia_oraria} = '${escapeFormulaString(fascia)}')`,
    })
    .all();
  return records.map((r) => mapDisponibilita({ id: r.id, fields: r.fields }));
}

export type DisponibilitaSlot = {
  data: string;
  fasciaOraria: FasciaOraria;
};

export type TurnoCellaRow = {
  educatoreId: string;
  educatoreNomeCompleto?: string;
};

/**
 * Sostituisce i record di Disponibilita per una cella (data, fascia) con
 * la lista di educatori passata. Crea i record nuovi e cancella quelli
 * degli educatori rimossi. Lascia intatti i record di altri (data, fascia).
 * Il consuntivo non si scrive: è derivato dalla data (passata = consuntivata).
 */
export async function replaceTurnoCella(
  data: string,
  fascia: FasciaOraria,
  rows: TurnoCellaRow[],
): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  const existing = await listDisponibilitaByDataEFascia(data, fascia);

  const wantedByEdu = new Map(rows.map((r) => [r.educatoreId, r] as const));
  const existingByEdu = new Map(existing.map((d) => [d.educatoreId, d] as const));

  const toCreate: Array<{ fields: Fields }> = [];
  const toDelete: string[] = [];

  for (const r of rows) {
    if (existingByEdu.has(r.educatoreId)) continue;
    const fields: Fields = {
      educatore: [r.educatoreId],
      data,
      fascia_oraria: fascia,
    };
    if (r.educatoreNomeCompleto) {
      fields.etichetta = `${r.educatoreNomeCompleto} · ${data} · ${fascia}`;
    }
    toCreate.push({ fields });
  }
  for (const ex of existing) {
    if (!wantedByEdu.has(ex.educatoreId)) toDelete.push(ex.recordId);
  }

  for (let i = 0; i < toCreate.length; i += 10) {
    await base(TABLE_NAMES.disponibilita).create(toCreate.slice(i, i + 10));
  }
  for (let i = 0; i < toDelete.length; i += 10) {
    await base(TABLE_NAMES.disponibilita).destroy(toDelete.slice(i, i + 10));
  }
}

/**
 * Sincronizza le disponibilità di un educatore per un dato insieme di slot.
 * Le disponibilità esistenti per quei (data, fascia) vengono mantenute o
 * cancellate. Quelle nuove vengono create. Le disponibilità su altri mesi/slot
 * non vengono toccate.
 */
export async function replaceDisponibilita(
  educatoreId: string,
  educatoreNomeCompleto: string,
  meseAnno: string,
  slots: DisponibilitaSlot[],
): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  const existing = await listDisponibilitaByEducatore(educatoreId);
  const existingMese = existing.filter((d) => d.data.startsWith(meseAnno));

  const slotKey = (data: string, fascia: string) => `${data}|${fascia}`;
  const nextSet = new Set(slots.map((s) => slotKey(s.data, s.fasciaOraria)));
  const existingMap = new Map(
    existingMese.map((d) => [slotKey(d.data, d.fasciaOraria), d.recordId] as const),
  );

  const toCreate: Array<{ fields: Fields }> = [];
  for (const s of slots) {
    if (!existingMap.has(slotKey(s.data, s.fasciaOraria))) {
      toCreate.push({
        fields: {
          educatore: [educatoreId],
          data: s.data,
          fascia_oraria: s.fasciaOraria,
          etichetta: `${educatoreNomeCompleto} · ${s.data} · ${s.fasciaOraria}`,
        },
      });
    }
  }

  const toDelete: string[] = [];
  for (const [key, id] of existingMap) {
    if (!nextSet.has(key)) toDelete.push(id);
  }

  for (let i = 0; i < toCreate.length; i += 10) {
    await base(TABLE_NAMES.disponibilita).create(toCreate.slice(i, i + 10));
  }
  for (let i = 0; i < toDelete.length; i += 10) {
    await base(TABLE_NAMES.disponibilita).destroy(toDelete.slice(i, i + 10));
  }
}

/**
 * Cancella in bulk tutte le disponibilità di un educatore (cascade da
 * delete educatore). Ritorna il numero di disponibilità cancellate.
 */
export async function deleteDisponibilitaByEducatore(
  educatoreId: string,
): Promise<number> {
  if (!base) return 0;
  const all = await listDisponibilitaByEducatore(educatoreId);
  const ids = all.map((d) => d.recordId);
  for (let i = 0; i < ids.length; i += 10) {
    await base(TABLE_NAMES.disponibilita).destroy(ids.slice(i, i + 10));
  }
  return ids.length;
}
