import "server-only";
import { db } from "./client";
import type { Sessione } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type { FasciaOraria, TipoUnita } from "@/lib/config";

type SessioneRow = Database["public"]["Tables"]["sessioni"]["Row"];

function mapSessione(row: SessioneRow): Sessione {
  return {
    recordId: row.id,
    attivitaId: row.attivita_id,
    tipoUnita: row.tipo_unita as TipoUnita,
    chiave: row.chiave,
    etichetta: row.etichetta,
    dataInizio: row.data_inizio ?? undefined,
    dataFine: row.data_fine ?? undefined,
    importo: undefined,
    fasciaOraria: (row.fascia_oraria as FasciaOraria | null) ?? undefined,
  };
}

export async function listSessioniByAttivita(
  attivitaId: string,
): Promise<Sessione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("sessioni")
    .select("*")
    .eq("attivita_id", attivitaId)
    .order("chiave");
  if (error) throw error;
  return (data ?? []).map(mapSessione);
}

export async function listSessioni(opts?: {
  recordIds?: string[];
}): Promise<Sessione[]> {
  if (!db) return [];
  if (opts?.recordIds && opts.recordIds.length === 0) return [];
  let q = db
    .from("sessioni")
    .select("*")
    .order("data_inizio", { ascending: true, nullsFirst: false });
  if (opts?.recordIds) q = q.in("id", opts.recordIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapSessione);
}

export async function getSessione(recordId: string): Promise<Sessione | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("sessioni")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapSessione(data) : null;
}

export async function listSessioniByRange(
  dataInizio: string,
  dataFine: string,
): Promise<Sessione[]> {
  if (!db) return [];
  // Overlap fra [data_inizio, data_fine] sessione e [dataInizio, dataFine]
  // richiesto. Per semplicita' carichiamo le sessioni che hanno data_inizio
  // <= dataFine AND data_fine >= dataInizio (intersezione classica fra range).
  const { data, error } = await db
    .from("sessioni")
    .select("*")
    .lte("data_inizio", dataFine)
    .gte("data_fine", dataInizio)
    .order("data_inizio");
  if (error) throw error;
  return (data ?? []).map(mapSessione);
}

export async function createSessioniBatch(
  input: Array<{
    attivitaId: string;
    tipoUnita: TipoUnita;
    chiave: string;
    etichetta: string;
    dataInizio?: string;
    dataFine?: string;
    importo?: number; // ignorato (orfano sullo schema Postgres)
    fasciaOraria?: FasciaOraria;
  }>,
): Promise<Sessione[]> {
  if (!db) throw new Error("Supabase client non configurato");
  if (input.length === 0) return [];
  const rows = input.map((s) => ({
    attivita_id: s.attivitaId,
    tipo_unita: s.tipoUnita,
    chiave: s.chiave,
    etichetta: s.etichetta,
    data_inizio: s.dataInizio,
    data_fine: s.dataFine,
    fascia_oraria: s.fasciaOraria,
  }));
  const { data, error } = await db
    .from("sessioni")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []).map(mapSessione);
}

export async function updateSessione(
  recordId: string,
  fields: Partial<{
    chiave: string;
    etichetta: string;
    data_inizio: string;
    data_fine: string;
    importo: number; // ignorato
    fascia_oraria: FasciaOraria;
  }>,
): Promise<Sessione> {
  if (!db) throw new Error("Supabase client non configurato");
  const { importo: _ignored, ...rest } = fields;
  void _ignored;
  const { data, error } = await db
    .from("sessioni")
    .update(rest)
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  return mapSessione(data);
}

export async function deleteSessione(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db.from("sessioni").delete().eq("id", recordId);
  if (error) throw error;
}

export async function deleteSessioniByIds(ids: string[]): Promise<void> {
  if (!db || ids.length === 0) return;
  const { error } = await db.from("sessioni").delete().in("id", ids);
  if (error) throw error;
}
