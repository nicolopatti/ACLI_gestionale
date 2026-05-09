import type Airtable from "airtable";
import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Iscrizione } from "./types";
import type { FasciaOraria, GiornoSettimana } from "@/lib/config";

type Fields = Partial<Airtable.FieldSet>;

function mapIscrizione(record: { id: string; fields: Record<string, unknown> }): Iscrizione {
  const f = record.fields;
  const bambinoLink = (f.bambino as string[] | undefined) ?? [];
  const attivitaLink = (f.attivita as string[] | undefined) ?? [];
  const modalitaLink = (f.modalita_iscrizione as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    codice: (f.codice as string) ?? "",
    bambinoId: bambinoLink[0] ?? "",
    attivitaId: attivitaLink[0] ?? "",
    modalitaId: modalitaLink[0] ?? "",
    dataIscrizione: (f.data_iscrizione as string) ?? undefined,
    giorniSettimana: ((f.giorni_settimana as GiornoSettimana[]) ?? []) as GiornoSettimana[],
    fasceOrarie: ((f.fasce_orarie as FasciaOraria[]) ?? []) as FasciaOraria[],
    sessioniSelteIds: ((f.sessioni_scelte as string[]) ?? []) as string[],
    note: (f.note as string) ?? undefined,
    rateIds: ((f.MesiIscrizione as string[]) ?? []) as string[],
  };
}

export async function listIscrizioni(opts?: {
  bambinoId?: string;
  attivitaId?: string;
}): Promise<Iscrizione[]> {
  if (!base) return [];
  // Filtro lato server: ARRAYJOIN su un linked record produce i display name,
  // non gli id, quindi FIND('rec...') non matcha. Carichiamo tutto e filtriamo
  // in JS.
  const records = await base(TABLE_NAMES.iscrizioni)
    .select({
      sort: [{ field: "data_iscrizione", direction: "desc" }],
    })
    .all();
  return records
    .map((r) => mapIscrizione({ id: r.id, fields: r.fields }))
    .filter((i) => {
      if (opts?.bambinoId && i.bambinoId !== opts.bambinoId) return false;
      if (opts?.attivitaId && i.attivitaId !== opts.attivitaId) return false;
      return true;
    });
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

/**
 * Iscrizioni che hanno almeno una rata con `chiave_periodo` uguale al mese
 * specificato. Lookup-based: prima cerca le rate del mese, poi raccoglie
 * gli iscrizioneId.
 */
export async function listIscrizioniPerChiavePeriodo(chiave: string): Promise<Iscrizione[]> {
  if (!base) return [];
  const rateRecords = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `{chiave_periodo} = '${escapeFormulaString(chiave)}'`,
      fields: ["iscrizione"],
    })
    .all();
  const iscrizioneIds = new Set<string>();
  for (const r of rateRecords) {
    const link = (r.fields.iscrizione as string[] | undefined) ?? [];
    if (link[0]) iscrizioneIds.add(link[0]);
  }
  if (iscrizioneIds.size === 0) return [];
  const ids = Array.from(iscrizioneIds);
  const filterByFormula = `OR(${ids.map((id) => `RECORD_ID() = '${id}'`).join(", ")})`;
  const records = await base(TABLE_NAMES.iscrizioni).select({ filterByFormula }).all();
  return records.map((r) => mapIscrizione({ id: r.id, fields: r.fields }));
}

export type IscrizioneInput = {
  bambinoId: string;
  attivitaId: string;
  modalitaId: string;
  dataIscrizione?: string;
  giorniSettimana: GiornoSettimana[];
  fasceOrarie: FasciaOraria[];
  sessioniSelteIds: string[];
  note?: string;
};

function iscrizioneFields(input: IscrizioneInput): Fields {
  return {
    bambino: [input.bambinoId],
    attivita: [input.attivitaId],
    modalita_iscrizione: [input.modalitaId],
    giorni_settimana: input.giorniSettimana,
    fasce_orarie: input.fasceOrarie,
    sessioni_scelte: input.sessioniSelteIds,
    ...(input.dataIscrizione ? { data_iscrizione: input.dataIscrizione } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
}

export async function createIscrizione(input: IscrizioneInput): Promise<Iscrizione> {
  if (!base) throw new Error("Airtable client non configurato");
  // typecast: true → Airtable crea automaticamente le choice mancanti
  // su `fasce_orarie` / `giorni_settimana` (sottoinsiemi dichiarati
  // dinamicamente sull'Attivita).
  const created = await base(TABLE_NAMES.iscrizioni).create(
    [{ fields: iscrizioneFields(input) }],
    { typecast: true },
  );
  return mapIscrizione({ id: created[0].id, fields: created[0].fields });
}

export async function updateIscrizione(
  recordId: string,
  input: IscrizioneInput,
): Promise<Iscrizione> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.iscrizioni).update(
    [{ id: recordId, fields: iscrizioneFields(input) }],
    { typecast: true },
  );
  return mapIscrizione({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteIscrizione(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.iscrizioni).destroy([recordId]);
}
