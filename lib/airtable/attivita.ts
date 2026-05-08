import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Attivita } from "./types";
import type { TipoAttivita } from "@/lib/config";

function mapAttivita(record: { id: string; fields: Record<string, unknown> }): Attivita {
  const f = record.fields;
  return {
    recordId: record.id,
    nome: (f.nome as string) ?? "",
    tipo: (f.tipo as TipoAttivita) ?? "doposcuola",
    annoScolastico: (f.anno_scolastico as string) ?? undefined,
    dataInizio: (f.data_inizio as string) ?? undefined,
    dataFine: (f.data_fine as string) ?? undefined,
    importoDefault: Number((f.importo_default as number) ?? 0),
    attivo: Boolean(f.attivo),
    note: (f.note as string) ?? undefined,
    sessioniIds: ((f.Sessioni as string[]) ?? []) as string[],
    iscrizioniIds: ((f.Iscrizioni as string[]) ?? []) as string[],
  };
}

export async function listAttivita(opts?: {
  tipo?: TipoAttivita;
  attivo?: boolean;
}): Promise<Attivita[]> {
  if (!base) return [];
  const conds: string[] = [];
  if (opts?.tipo) conds.push(`{tipo} = '${escapeFormulaString(opts.tipo)}'`);
  if (opts?.attivo !== undefined) conds.push(`{attivo} = ${opts.attivo ? "TRUE()" : "FALSE()"}`);
  const filterByFormula =
    conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : `AND(${conds.join(", ")})`;

  const records = await base(TABLE_NAMES.attivita)
    .select({
      sort: [{ field: "data_inizio", direction: "desc" }],
      ...(filterByFormula ? { filterByFormula } : {}),
    })
    .all();
  return records.map((r) => mapAttivita({ id: r.id, fields: r.fields }));
}

export async function getAttivita(recordId: string): Promise<Attivita | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.attivita).find(recordId);
    return mapAttivita({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function createAttivita(input: {
  nome: string;
  tipo: TipoAttivita;
  annoScolastico?: string;
  dataInizio?: string;
  dataFine?: string;
  importoDefault: number;
  attivo?: boolean;
  note?: string;
}): Promise<Attivita> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.attivita).create([
    {
      fields: {
        nome: input.nome,
        tipo: input.tipo,
        importo_default: input.importoDefault,
        attivo: input.attivo ?? true,
        ...(input.annoScolastico ? { anno_scolastico: input.annoScolastico } : {}),
        ...(input.dataInizio ? { data_inizio: input.dataInizio } : {}),
        ...(input.dataFine ? { data_fine: input.dataFine } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
    },
  ]);
  return mapAttivita({ id: created[0].id, fields: created[0].fields });
}

export async function updateAttivita(
  recordId: string,
  fields: Partial<{
    nome: string;
    tipo: TipoAttivita;
    anno_scolastico: string;
    data_inizio: string;
    data_fine: string;
    importo_default: number;
    attivo: boolean;
    note: string;
  }>,
): Promise<Attivita> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.attivita).update([{ id: recordId, fields }]);
  return mapAttivita({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteAttivita(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.attivita).destroy([recordId]);
}
