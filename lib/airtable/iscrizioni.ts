import { base, TABLE_NAMES } from "./client";
import type { Iscrizione } from "./types";
import type { GiornoSettimana } from "@/lib/config";

function mapIscrizione(record: { id: string; fields: Record<string, unknown> }): Iscrizione {
  const f = record.fields;
  const bambinoLink = (f.bambino as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    codice: (f.codice as string) ?? "",
    bambinoId: bambinoLink[0] ?? "",
    annoScolastico: (f.anno_scolastico as string) ?? "",
    dataIscrizione: (f.data_iscrizione as string) ?? undefined,
    giorniSettimana: ((f.giorni_settimana as GiornoSettimana[]) ?? []) as GiornoSettimana[],
    importoMensileDefault: Number((f.importo_mensile_default as number) ?? 0),
    note: (f.note as string) ?? undefined,
    mesiIds: ((f.mesi as string[]) ?? []) as string[],
  };
}

export async function listIscrizioni(opts?: { bambinoId?: string }): Promise<Iscrizione[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.iscrizioni)
    .select({
      sort: [{ field: "anno_scolastico", direction: "desc" }],
      ...(opts?.bambinoId
        ? { filterByFormula: `FIND('${opts.bambinoId}', ARRAYJOIN({bambino}))` }
        : {}),
    })
    .all();
  return records.map((r) => mapIscrizione({ id: r.id, fields: r.fields }));
}

export async function getIscrizione(recordId: string): Promise<Iscrizione | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.iscrizioni).find(recordId);
    return mapIscrizione({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function createIscrizione(input: {
  bambinoId: string;
  annoScolastico: string;
  dataIscrizione?: string;
  giorniSettimana: GiornoSettimana[];
  importoMensileDefault: number;
  note?: string;
}): Promise<Iscrizione> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.iscrizioni).create([
    {
      fields: {
        bambino: [input.bambinoId],
        anno_scolastico: input.annoScolastico,
        giorni_settimana: input.giorniSettimana,
        importo_mensile_default: input.importoMensileDefault,
        ...(input.dataIscrizione ? { data_iscrizione: input.dataIscrizione } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
    },
  ]);
  return mapIscrizione({ id: created[0].id, fields: created[0].fields });
}

export async function updateIscrizione(
  recordId: string,
  fields: Partial<{
    bambino: string[];
    anno_scolastico: string;
    data_iscrizione: string;
    giorni_settimana: GiornoSettimana[];
    importo_mensile_default: number;
    note: string;
  }>,
): Promise<Iscrizione> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.iscrizioni).update([{ id: recordId, fields }]);
  return mapIscrizione({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteIscrizione(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.iscrizioni).destroy([recordId]);
}
