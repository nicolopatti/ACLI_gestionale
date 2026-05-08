import { base, TABLE_NAMES } from "./client";
import type { Sessione } from "./types";
import type { TipoUnita } from "@/lib/config";

function mapSessione(record: { id: string; fields: Record<string, unknown> }): Sessione {
  const f = record.fields;
  const attivitaLink = (f.attivita as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    attivitaId: attivitaLink[0] ?? "",
    tipoUnita: (f.tipo_unita as TipoUnita) ?? "mese",
    chiave: (f.chiave as string) ?? "",
    etichetta: (f.etichetta as string) ?? "",
    dataInizio: (f.data_inizio as string) ?? undefined,
    dataFine: (f.data_fine as string) ?? undefined,
    importo: f.importo != null ? Number(f.importo as number) : undefined,
  };
}

/**
 * Sessioni di un'attività. Reverse lookup: prima leggiamo `Attivita.Sessioni`
 * per ottenere i recordIds linkati, poi filtriamo `Sessioni` per `RECORD_ID()`.
 *
 * Non si può filtrare direttamente con `FIND(recordId, ARRAYJOIN({attivita}))`
 * perché Airtable serializza un linked record field come stringa di display
 * names (primary field dei record collegati), non come stringa di recordId.
 */
export async function listSessioniByAttivita(attivitaId: string): Promise<Sessione[]> {
  if (!base) return [];
  const attivitaRec = await base(TABLE_NAMES.attivita).find(attivitaId).catch(() => null);
  if (!attivitaRec) return [];
  const ids = ((attivitaRec.fields.Sessioni as string[] | undefined) ?? []);
  if (ids.length === 0) return [];
  const filterByFormula = `OR(${ids.map((id) => `RECORD_ID() = '${id}'`).join(", ")})`;
  const records = await base(TABLE_NAMES.sessioni)
    .select({
      filterByFormula,
      sort: [{ field: "chiave", direction: "asc" }],
    })
    .all();
  return records.map((r) => mapSessione({ id: r.id, fields: r.fields }));
}

export async function listSessioni(opts?: { recordIds?: string[] }): Promise<Sessione[]> {
  if (!base) return [];
  if (opts?.recordIds && opts.recordIds.length === 0) return [];
  const filterByFormula = opts?.recordIds
    ? `OR(${opts.recordIds.map((id) => `RECORD_ID() = '${id}'`).join(", ")})`
    : undefined;
  const records = await base(TABLE_NAMES.sessioni)
    .select({
      sort: [{ field: "data_inizio", direction: "asc" }],
      ...(filterByFormula ? { filterByFormula } : {}),
    })
    .all();
  return records.map((r) => mapSessione({ id: r.id, fields: r.fields }));
}

export async function getSessione(recordId: string): Promise<Sessione | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.sessioni).find(recordId);
    return mapSessione({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function createSessioniBatch(
  input: Array<{
    attivitaId: string;
    tipoUnita: TipoUnita;
    chiave: string;
    etichetta: string;
    dataInizio?: string;
    dataFine?: string;
    importo?: number;
  }>,
): Promise<Sessione[]> {
  if (!base) throw new Error("Airtable client non configurato");
  if (input.length === 0) return [];
  const created: Sessione[] = [];
  // Airtable consente max 10 record per chiamata create
  for (let i = 0; i < input.length; i += 10) {
    const batch = input.slice(i, i + 10);
    const res = await base(TABLE_NAMES.sessioni).create(
      batch.map((s) => ({
        fields: {
          attivita: [s.attivitaId],
          tipo_unita: s.tipoUnita,
          chiave: s.chiave,
          etichetta: s.etichetta,
          ...(s.dataInizio ? { data_inizio: s.dataInizio } : {}),
          ...(s.dataFine ? { data_fine: s.dataFine } : {}),
          ...(s.importo !== undefined ? { importo: s.importo } : {}),
        },
      })),
    );
    for (const r of res) created.push(mapSessione({ id: r.id, fields: r.fields }));
  }
  return created;
}

export async function deleteSessione(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.sessioni).destroy([recordId]);
}
