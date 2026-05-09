import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Sessione } from "./types";
import type { FasciaOraria, TipoUnita } from "@/lib/config";

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
    fasciaOraria: (f.fascia_oraria as FasciaOraria) || undefined,
  };
}

export async function listSessioniByAttivita(attivitaId: string): Promise<Sessione[]> {
  if (!base) return [];
  // Filtro lato server: ARRAYJOIN su linked record dà il display name, non
  // il record id, quindi FIND con un id non matcha mai. Carichiamo tutto e
  // filtriamo in JS.
  const records = await base(TABLE_NAMES.sessioni)
    .select({
      sort: [{ field: "chiave", direction: "asc" }],
    })
    .all();
  return records
    .map((r) => mapSessione({ id: r.id, fields: r.fields }))
    .filter((s) => s.attivitaId === attivitaId);
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

export async function listSessioniByRange(
  dataInizio: string,
  dataFine: string,
): Promise<Sessione[]> {
  if (!base) return [];
  // Una sessione interseca il range se [dataInizio, dataFine] della sessione
  // overlap con [dataInizio, dataFine] richiesto, OR la chiave è in un mese/
  // giornata/settimana che cade nel range. Per semplicità includiamo tutte le
  // sessioni che hanno data_inizio o data_fine dentro il range, oppure che
  // contengono il range.
  const records = await base(TABLE_NAMES.sessioni)
    .select({
      filterByFormula: `OR(
        AND({data_inizio} >= '${escapeFormulaString(dataInizio)}', {data_inizio} <= '${escapeFormulaString(dataFine)}'),
        AND({data_fine} >= '${escapeFormulaString(dataInizio)}', {data_fine} <= '${escapeFormulaString(dataFine)}'),
        AND({data_inizio} <= '${escapeFormulaString(dataInizio)}', {data_fine} >= '${escapeFormulaString(dataFine)}')
      )`,
      sort: [{ field: "data_inizio", direction: "asc" }],
    })
    .all();
  return records.map((r) => mapSessione({ id: r.id, fields: r.fields }));
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
    fasciaOraria?: FasciaOraria;
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
          ...(s.fasciaOraria ? { fascia_oraria: s.fasciaOraria } : {}),
        },
      })),
      { typecast: true },
    );
    for (const r of res) created.push(mapSessione({ id: r.id, fields: r.fields }));
  }
  return created;
}

export async function updateSessione(
  recordId: string,
  fields: Partial<{
    chiave: string;
    etichetta: string;
    data_inizio: string;
    data_fine: string;
    importo: number;
    fascia_oraria: FasciaOraria;
  }>,
): Promise<Sessione> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.sessioni).update([{ id: recordId, fields }], {
    typecast: true,
  });
  return mapSessione({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteSessione(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.sessioni).destroy([recordId]);
}
