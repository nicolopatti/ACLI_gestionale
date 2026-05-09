import { base, TABLE_NAMES } from "./client";
import type { ModalitaIscrizione } from "./types";

function mapModalita(record: { id: string; fields: Record<string, unknown> }): ModalitaIscrizione {
  const f = record.fields;
  const attLink = (f.attivita as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    attivitaId: attLink[0] ?? "",
    nome: (f.nome as string) ?? "",
    importo: Number((f.importo as number) ?? 0),
    descrizione: (f.descrizione as string) ?? undefined,
    attivo: Boolean(f.attivo),
  };
}

export async function listAllModalita(): Promise<ModalitaIscrizione[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.modalitaIscrizione)
    .select({ sort: [{ field: "importo", direction: "asc" }] })
    .all();
  return records.map((r) => mapModalita({ id: r.id, fields: r.fields }));
}

export async function listModalitaByAttivita(
  attivitaId: string,
): Promise<ModalitaIscrizione[]> {
  if (!base) return [];
  // Filtro lato server: filterByFormula con FIND su un linked record
  // confronta il primary field (display name) del record collegato, non
  // il record id. Carichiamo tutto e filtriamo in JS.
  const records = await base(TABLE_NAMES.modalitaIscrizione)
    .select({
      sort: [{ field: "importo", direction: "asc" }],
    })
    .all();
  return records
    .map((r) => mapModalita({ id: r.id, fields: r.fields }))
    .filter((m) => m.attivitaId === attivitaId);
}

export async function getModalita(recordId: string): Promise<ModalitaIscrizione | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.modalitaIscrizione).find(recordId);
    return mapModalita({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function createModalita(input: {
  attivitaId: string;
  nome: string;
  importo: number;
  descrizione?: string;
  attivo?: boolean;
}): Promise<ModalitaIscrizione> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.modalitaIscrizione).create([
    {
      fields: {
        attivita: [input.attivitaId],
        nome: input.nome,
        importo: input.importo,
        attivo: input.attivo ?? true,
        ...(input.descrizione ? { descrizione: input.descrizione } : {}),
      },
    },
  ]);
  return mapModalita({ id: created[0].id, fields: created[0].fields });
}

export async function updateModalita(
  recordId: string,
  fields: Partial<{
    nome: string;
    importo: number;
    descrizione: string;
    attivo: boolean;
  }>,
): Promise<ModalitaIscrizione> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.modalitaIscrizione).update([
    { id: recordId, fields },
  ]);
  return mapModalita({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteModalita(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.modalitaIscrizione).destroy([recordId]);
}
