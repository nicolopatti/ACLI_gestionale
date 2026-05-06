import { base, TABLE_NAMES } from "./client";
import type { Genitore } from "./types";

function mapGenitore(record: { id: string; fields: Record<string, unknown> }): Genitore {
  const f = record.fields;
  return {
    recordId: record.id,
    nomeCompleto: (f.nome_completo as string) ?? "",
    nome: (f.nome as string) ?? "",
    cognome: (f.cognome as string) ?? "",
    telefono: (f.telefono as string) ?? undefined,
    email: (f.email as string) ?? undefined,
    codiceFiscale: (f.codice_fiscale as string) ?? undefined,
    note: (f.note as string) ?? undefined,
    bambiniIds: ((f.bambini as string[]) ?? []) as string[],
  };
}

export async function listGenitori(): Promise<Genitore[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.genitori)
    .select({ sort: [{ field: "cognome", direction: "asc" }] })
    .all();
  return records.map((r) => mapGenitore({ id: r.id, fields: r.fields }));
}

export async function getGenitore(recordId: string): Promise<Genitore | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.genitori).find(recordId);
    return mapGenitore({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function createGenitore(input: {
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  codiceFiscale?: string;
  note?: string;
}): Promise<Genitore> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.genitori).create([
    {
      fields: {
        nome: input.nome,
        cognome: input.cognome,
        ...(input.telefono ? { telefono: input.telefono } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.codiceFiscale ? { codice_fiscale: input.codiceFiscale } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
    },
  ]);
  return mapGenitore({ id: created[0].id, fields: created[0].fields });
}

export async function updateGenitore(
  recordId: string,
  fields: Partial<{
    nome: string;
    cognome: string;
    telefono: string;
    email: string;
    codice_fiscale: string;
    note: string;
  }>,
): Promise<Genitore> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.genitori).update([{ id: recordId, fields }]);
  return mapGenitore({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteGenitore(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.genitori).destroy([recordId]);
}
