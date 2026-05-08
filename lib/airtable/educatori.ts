import type Airtable from "airtable";
import { base, TABLE_NAMES } from "./client";
import type { Educatore } from "./types";

type Fields = Partial<Airtable.FieldSet>;

function mapEducatore(record: { id: string; fields: Record<string, unknown> }): Educatore {
  const f = record.fields;
  return {
    recordId: record.id,
    nomeCompleto:
      (f.nome_completo as string) ?? `${f.cognome ?? ""} ${f.nome ?? ""}`.trim(),
    nome: (f.nome as string) ?? "",
    cognome: (f.cognome as string) ?? "",
    email: (f.email as string) ?? undefined,
    telefono: (f.telefono as string) ?? undefined,
    note: (f.note as string) ?? undefined,
    attivo: Boolean(f.attivo),
  };
}

export async function listEducatori(opts?: { soloAttivi?: boolean }): Promise<Educatore[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.educatori)
    .select({
      sort: [{ field: "cognome", direction: "asc" }],
      ...(opts?.soloAttivi ? { filterByFormula: "{attivo} = TRUE()" } : {}),
    })
    .all();
  return records.map((r) => mapEducatore({ id: r.id, fields: r.fields }));
}

export async function getEducatore(recordId: string): Promise<Educatore | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.educatori).find(recordId);
    return mapEducatore({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export type EducatoreInput = {
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  note?: string;
  attivo?: boolean;
};

function educatoreFields(input: EducatoreInput): Fields {
  return {
    nome: input.nome,
    cognome: input.cognome,
    nome_completo: `${input.cognome} ${input.nome}`.trim(),
    attivo: input.attivo ?? true,
    ...(input.email ? { email: input.email } : {}),
    ...(input.telefono ? { telefono: input.telefono } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
}

export async function createEducatore(input: EducatoreInput): Promise<Educatore> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.educatori).create([
    { fields: educatoreFields(input) },
  ]);
  return mapEducatore({ id: created[0].id, fields: created[0].fields });
}

export async function updateEducatore(
  recordId: string,
  input: EducatoreInput,
): Promise<Educatore> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.educatori).update([
    { id: recordId, fields: educatoreFields(input) },
  ]);
  return mapEducatore({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteEducatore(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.educatori).destroy([recordId]);
}
