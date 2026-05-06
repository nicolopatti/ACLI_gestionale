import type Airtable from "airtable";
import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Presenza } from "./types";

type Fields = Partial<Airtable.FieldSet>;

function mapPresenza(record: { id: string; fields: Record<string, unknown> }): Presenza {
  const f = record.fields;
  const bambinoLink = (f.bambino as string[] | undefined) ?? [];
  const iscrLink = (f.iscrizione as string[] | undefined) ?? [];
  const userLink = (f.registrato_da as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    codice: (f.codice as string) ?? "",
    bambinoId: bambinoLink[0] ?? "",
    iscrizioneId: iscrLink[0],
    data: (f.data as string) ?? "",
    presente: Boolean(f.presente),
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

export async function listPresenzeByBambino(bambinoId: string): Promise<Presenza[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.presenze)
    .select({
      filterByFormula: `FIND('${bambinoId}', ARRAYJOIN({bambino}))`,
      sort: [{ field: "data", direction: "desc" }],
    })
    .all();
  return records.map((r) => mapPresenza({ id: r.id, fields: r.fields }));
}

export async function upsertPresenze(
  input: Array<{
    bambinoId: string;
    iscrizioneId?: string;
    data: string;
    presente: boolean;
    registratoDaId?: string;
    note?: string;
  }>,
): Promise<void> {
  if (!base || input.length === 0) return;

  // Trova le presenze esistenti per il giorno per fare upsert
  const giornoRecords = await listPresenzeByData(input[0].data);
  const existingByBambino = new Map<string, Presenza>();
  for (const p of giornoRecords) existingByBambino.set(p.bambinoId, p);

  const toCreate: Array<{ fields: Fields }> = [];
  const toUpdate: Array<{ id: string; fields: Fields }> = [];

  for (const item of input) {
    const existing = existingByBambino.get(item.bambinoId);
    const fields: Fields = {
      bambino: [item.bambinoId],
      data: item.data,
      presente: item.presente,
      ...(item.iscrizioneId ? { iscrizione: [item.iscrizioneId] } : {}),
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
}

export async function countPresenzeOggi(): Promise<number> {
  if (!base) return 0;
  const oggi = new Date().toISOString().slice(0, 10);
  const records = await base(TABLE_NAMES.presenze)
    .select({
      filterByFormula: `AND({data} = '${oggi}', {presente} = TRUE())`,
      fields: ["data"],
    })
    .all();
  return records.length;
}
