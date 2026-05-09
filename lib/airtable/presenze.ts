import type Airtable from "airtable";
import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Presenza } from "./types";

type Fields = Partial<Airtable.FieldSet>;

function mapPresenza(record: { id: string; fields: Record<string, unknown> }): Presenza {
  const f = record.fields;
  const bambinoLink = (f.bambino as string[] | undefined) ?? [];
  const sessLink = (f.sessione as string[] | undefined) ?? [];
  const userLink = (f.registrato_da as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    codice: (f.codice as string) ?? "",
    bambinoId: bambinoLink[0] ?? "",
    sessioneId: sessLink[0],
    data: (f.data as string) ?? "",
    oraIngresso: (f.ora_ingresso as string) ?? undefined,
    oraUscita: (f.ora_uscita as string) ?? undefined,
    note: (f.note as string) ?? undefined,
    registratoDaId: userLink[0],
    createdAt: (f.created_at as string) ?? undefined,
  };
}

export async function listPresenzeByData(data: string): Promise<Presenza[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.presenze)
    .select({
      filterByFormula: `{data} = '${escapeFormulaString(data)}'`,
    })
    .all();
  return records.map((r) => mapPresenza({ id: r.id, fields: r.fields }));
}

export async function listPresenzeByMese(meseAnno: string): Promise<Presenza[]> {
  if (!base) return [];
  // meseAnno = "YYYY-MM"
  const records = await base(TABLE_NAMES.presenze)
    .select({
      filterByFormula: `LEFT({data}, 7) = '${escapeFormulaString(meseAnno)}'`,
    })
    .all();
  return records.map((r) => mapPresenza({ id: r.id, fields: r.fields }));
}

export async function listPresenzeByBambino(bambinoId: string): Promise<Presenza[]> {
  if (!base) return [];
  // Filtro lato server: ARRAYJOIN su un linked record produce i display name,
  // non gli id, quindi FIND('rec...') non matcha. Carichiamo tutto e filtriamo.
  const records = await base(TABLE_NAMES.presenze)
    .select({
      sort: [{ field: "data", direction: "desc" }],
    })
    .all();
  return records
    .map((r) => mapPresenza({ id: r.id, fields: r.fields }))
    .filter((p) => p.bambinoId === bambinoId);
}

export type PresenzaInput = {
  bambinoId: string;
  sessioneId?: string;
  data: string;
  oraIngresso?: string;
  oraUscita?: string;
  registratoDaId?: string;
  note?: string;
};

/**
 * Upsert delle presenze per una data. Se entrambi gli orari sono vuoti il record
 * esistente viene eliminato (assenza); se non esisteva, non viene creato.
 */
export async function upsertPresenze(input: PresenzaInput[]): Promise<void> {
  if (!base || input.length === 0) return;

  const giornoRecords = await listPresenzeByData(input[0].data);
  const existingByBambino = new Map<string, Presenza>();
  for (const p of giornoRecords) existingByBambino.set(p.bambinoId, p);

  const toCreate: Array<{ fields: Fields }> = [];
  const toUpdate: Array<{ id: string; fields: Fields }> = [];
  const toDelete: string[] = [];

  for (const item of input) {
    const existing = existingByBambino.get(item.bambinoId);
    const assente = !item.oraIngresso && !item.oraUscita;
    if (assente) {
      if (existing) toDelete.push(existing.recordId);
      continue;
    }
    const fields: Fields = {
      bambino: [item.bambinoId],
      data: item.data,
      ...(item.oraIngresso ? { ora_ingresso: item.oraIngresso } : { ora_ingresso: "" }),
      ...(item.oraUscita ? { ora_uscita: item.oraUscita } : { ora_uscita: "" }),
      ...(item.sessioneId ? { sessione: [item.sessioneId] } : {}),
      ...(item.registratoDaId ? { registrato_da: [item.registratoDaId] } : {}),
      ...(item.note ? { note: item.note } : {}),
    };
    if (existing) {
      toUpdate.push({ id: existing.recordId, fields });
    } else {
      toCreate.push({ fields });
    }
  }

  for (let i = 0; i < toCreate.length; i += 10) {
    await base(TABLE_NAMES.presenze).create(toCreate.slice(i, i + 10));
  }
  for (let i = 0; i < toUpdate.length; i += 10) {
    await base(TABLE_NAMES.presenze).update(toUpdate.slice(i, i + 10));
  }
  for (let i = 0; i < toDelete.length; i += 10) {
    await base(TABLE_NAMES.presenze).destroy(toDelete.slice(i, i + 10));
  }
}

/**
 * Cancella in bulk tutte le presenze di un bambino (cascade da delete bambino).
 * Ritorna il numero di presenze cancellate.
 */
export async function deletePresenzeByBambino(bambinoId: string): Promise<number> {
  if (!base) return 0;
  const all = await base(TABLE_NAMES.presenze).select({}).all();
  const ids = all
    .map((r) => mapPresenza({ id: r.id, fields: r.fields }))
    .filter((p) => p.bambinoId === bambinoId)
    .map((p) => p.recordId);
  for (let i = 0; i < ids.length; i += 10) {
    await base(TABLE_NAMES.presenze).destroy(ids.slice(i, i + 10));
  }
  return ids.length;
}

export async function countPresenzeOggi(): Promise<number> {
  if (!base) return 0;
  const oggi = new Date().toISOString().slice(0, 10);
  const records = await base(TABLE_NAMES.presenze)
    .select({
      filterByFormula: `AND({data} = '${oggi}', OR({ora_ingresso} != '', {ora_uscita} != ''))`,
      fields: ["data"],
    })
    .all();
  return records.length;
}
