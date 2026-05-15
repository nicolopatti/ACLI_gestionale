import "server-only";
import { db } from "./client";
import type { Iscrizione } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type { FasciaOraria, GiornoSettimana } from "@/lib/config";

type IscrizioneRow = Database["public"]["Tables"]["iscrizioni"]["Row"];

type IscrizioneRowWithRel = IscrizioneRow & {
  iscrizioni_sessioni?: { sessione_id: string }[];
  iscrizioni_sconti?: { sconto_id: string }[];
  rate?: { id: string }[];
};

function mapIscrizione(row: IscrizioneRowWithRel): Iscrizione {
  return {
    recordId: row.id,
    codice: row.codice ?? "",
    bambinoId: row.bambino_id,
    attivitaId: row.attivita_id,
    modalitaId: row.modalita_id,
    dataIscrizione: row.data_iscrizione ?? undefined,
    giorniSettimana: (row.giorni_settimana ?? []) as GiornoSettimana[],
    fasceOrarie: (row.fasce_orarie ?? []) as FasciaOraria[],
    sessioniSelteIds: (row.iscrizioni_sessioni ?? []).map((x) => x.sessione_id),
    scontiIds: (row.iscrizioni_sconti ?? []).map((x) => x.sconto_id),
    note: row.note ?? undefined,
    rateIds: (row.rate ?? []).map((r) => r.id),
  };
}

const REL_SELECT =
  "*, iscrizioni_sessioni(sessione_id), iscrizioni_sconti(sconto_id), rate(id)";

export async function listIscrizioni(opts?: {
  bambinoId?: string;
  attivitaId?: string;
}): Promise<Iscrizione[]> {
  if (!db) return [];
  let q = db
    .from("iscrizioni")
    .select(REL_SELECT)
    .order("data_iscrizione", { ascending: false, nullsFirst: false });
  if (opts?.bambinoId) q = q.eq("bambino_id", opts.bambinoId);
  if (opts?.attivitaId) q = q.eq("attivita_id", opts.attivitaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapIscrizione(r as IscrizioneRowWithRel));
}

export async function getIscrizione(
  recordId: string,
): Promise<Iscrizione | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("iscrizioni")
    .select(REL_SELECT)
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapIscrizione(data as IscrizioneRowWithRel) : null;
}

/**
 * Iscrizioni che hanno almeno una rata con `chiave_periodo` uguale al periodo
 * specificato. Lookup in 2 step: rate by chiave -> iscrizioni by id.
 */
export async function listIscrizioniPerChiavePeriodo(
  chiave: string,
): Promise<Iscrizione[]> {
  if (!db) return [];
  const { data: rateRows, error: rateErr } = await db
    .from("rate")
    .select("iscrizione_id")
    .eq("chiave_periodo", chiave);
  if (rateErr) throw rateErr;
  const ids = Array.from(new Set((rateRows ?? []).map((r) => r.iscrizione_id)));
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("iscrizioni")
    .select(REL_SELECT)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []).map((r) => mapIscrizione(r as IscrizioneRowWithRel));
}

export async function listIscrizioniByModalita(
  modalitaId: string,
): Promise<Iscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("iscrizioni")
    .select(REL_SELECT)
    .eq("modalita_id", modalitaId);
  if (error) throw error;
  return (data ?? []).map((r) => mapIscrizione(r as IscrizioneRowWithRel));
}

export type IscrizioneInput = {
  bambinoId: string;
  attivitaId: string;
  modalitaId: string;
  dataIscrizione?: string;
  giorniSettimana: GiornoSettimana[];
  fasceOrarie: FasciaOraria[];
  sessioniSelteIds: string[];
  scontiIds?: string[];
  note?: string;
};

async function syncSessioniScelte(
  iscrizioneId: string,
  sessioniSelteIds: string[],
): Promise<void> {
  if (!db) return;
  // Replace strategy: cancello tutte le righe di join per quella iscrizione,
  // poi inserisco le nuove. Veloce per N piccolo (tipicamente <50).
  const { error: delErr } = await db
    .from("iscrizioni_sessioni")
    .delete()
    .eq("iscrizione_id", iscrizioneId);
  if (delErr) throw delErr;
  if (sessioniSelteIds.length === 0) return;
  const uniq = Array.from(new Set(sessioniSelteIds));
  const { error: insErr } = await db.from("iscrizioni_sessioni").insert(
    uniq.map((sessione_id) => ({
      iscrizione_id: iscrizioneId,
      sessione_id,
    })),
  );
  if (insErr) throw insErr;
}

/**
 * Allinea il set di sconti applicati a una iscrizione al `scontiIds` passato.
 * Stessa strategia di syncSessioniScelte: delete + insert. Le righe `rate`
 * di tipo 'sconto' vengono gestite separatamente dall'action chiamante (vedi
 * `deleteRateByTipoRiga` + ricrea con `createMesi`).
 */
async function syncScontiSelti(
  iscrizioneId: string,
  scontiIds: string[],
): Promise<void> {
  if (!db) return;
  const { error: delErr } = await db
    .from("iscrizioni_sconti")
    .delete()
    .eq("iscrizione_id", iscrizioneId);
  if (delErr) throw delErr;
  if (scontiIds.length === 0) return;
  const uniq = Array.from(new Set(scontiIds));
  const { error: insErr } = await db.from("iscrizioni_sconti").insert(
    uniq.map((sconto_id) => ({
      iscrizione_id: iscrizioneId,
      sconto_id,
    })),
  );
  if (insErr) throw insErr;
}

export async function createIscrizione(
  input: IscrizioneInput,
): Promise<Iscrizione> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("iscrizioni")
    .insert({
      bambino_id: input.bambinoId,
      attivita_id: input.attivitaId,
      modalita_id: input.modalitaId,
      data_iscrizione: input.dataIscrizione,
      giorni_settimana: input.giorniSettimana,
      fasce_orarie: input.fasceOrarie,
      note: input.note,
    })
    .select("id")
    .single();
  if (error) throw error;
  await syncSessioniScelte(data.id, input.sessioniSelteIds);
  await syncScontiSelti(data.id, input.scontiIds ?? []);
  const full = await getIscrizione(data.id);
  if (!full) throw new Error("Iscrizione appena creata non trovata");
  return full;
}

export async function updateIscrizione(
  recordId: string,
  input: IscrizioneInput,
): Promise<Iscrizione> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("iscrizioni")
    .update({
      bambino_id: input.bambinoId,
      attivita_id: input.attivitaId,
      modalita_id: input.modalitaId,
      data_iscrizione: input.dataIscrizione ?? null,
      giorni_settimana: input.giorniSettimana,
      fasce_orarie: input.fasceOrarie,
      note: input.note ?? null,
    })
    .eq("id", recordId);
  if (error) throw error;
  await syncSessioniScelte(recordId, input.sessioniSelteIds);
  await syncScontiSelti(recordId, input.scontiIds ?? []);
  const full = await getIscrizione(recordId);
  if (!full) throw new Error("Iscrizione non trovata dopo update");
  return full;
}

export async function deleteIscrizione(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  // FK CASCADE elimina automaticamente iscrizioni_sessioni e rate.
  const { error } = await db.from("iscrizioni").delete().eq("id", recordId);
  if (error) throw error;
}

export async function deleteIscrizioniByIds(ids: string[]): Promise<void> {
  if (!db || ids.length === 0) return;
  const { error } = await db.from("iscrizioni").delete().in("id", ids);
  if (error) throw error;
}
