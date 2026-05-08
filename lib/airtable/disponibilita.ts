import type Airtable from "airtable";
import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Disponibilita } from "./types";
import type { FasciaDisponibilita } from "@/lib/config";

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
    fasciaOraria: (f.fascia_oraria as FasciaDisponibilita) ?? "14-16",
    note: (f.note as string) ?? undefined,
  };
}

/**
 * Tutte le disponibilità di un educatore. Reverse lookup: leggiamo
 * Educatori.Disponibilita per gli ids.
 */
export async function listDisponibilitaByEducatore(
  educatoreId: string,
): Promise<Disponibilita[]> {
  if (!base) return [];
  const rec = await base(TABLE_NAMES.educatori).find(educatoreId).catch(() => null);
  if (!rec) return [];
  const ids = ((rec.fields.Disponibilita as string[] | undefined) ?? []);
  if (ids.length === 0) return [];
  const filterByFormula = `OR(${ids.map((id) => `RECORD_ID() = '${id}'`).join(", ")})`;
  const records = await base(TABLE_NAMES.disponibilita)
    .select({
      filterByFormula,
      sort: [{ field: "data", direction: "asc" }],
    })
    .all();
  return records.map((r) => mapDisponibilita({ id: r.id, fields: r.fields }));
}

export async function listDisponibilitaByDataEFascia(
  data: string,
  fascia: FasciaDisponibilita,
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
  fasciaOraria: FasciaDisponibilita;
};

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
