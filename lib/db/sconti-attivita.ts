import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { ScontoAttivita } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type { TipoSconto } from "@/lib/config";

type ScontoRow = Database["public"]["Tables"]["sconti_attivita"]["Row"];

function mapSconto(row: ScontoRow): ScontoAttivita {
  return {
    recordId: row.id,
    attivitaId: row.attivita_id,
    nome: row.nome,
    tipo: row.tipo as TipoSconto,
    valore: Number(row.valore),
    descrizione: row.descrizione ?? undefined,
    ordering: row.ordering,
    attivo: row.attivo,
  };
}

async function _listScontiByAttivita(
  attivitaId: string,
): Promise<ScontoAttivita[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("sconti_attivita")
    .select("*")
    .eq("attivita_id", attivitaId)
    .order("ordering", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSconto);
}

export const listScontiByAttivita = unstable_cache(
  _listScontiByAttivita,
  ["sconti:by-attivita"],
  { revalidate: 120, tags: ["sconti"] },
);

export async function getSconto(recordId: string): Promise<ScontoAttivita | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("sconti_attivita")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapSconto(data) : null;
}

export async function getScontiByIds(ids: string[]): Promise<ScontoAttivita[]> {
  if (!db || ids.length === 0) return [];
  const { data, error } = await db
    .from("sconti_attivita")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []).map(mapSconto);
}

export async function createSconto(input: {
  attivitaId: string;
  nome: string;
  tipo: TipoSconto;
  valore: number;
  descrizione?: string;
  ordering?: number;
  attivo?: boolean;
}): Promise<ScontoAttivita> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("sconti_attivita")
    .insert({
      attivita_id: input.attivitaId,
      nome: input.nome,
      tipo: input.tipo,
      valore: input.valore,
      descrizione: input.descrizione,
      ordering: input.ordering ?? 0,
      attivo: input.attivo ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("sconti", "max");
  return mapSconto(data);
}

export async function updateSconto(
  recordId: string,
  fields: Partial<{
    nome: string;
    tipo: TipoSconto;
    valore: number;
    descrizione: string | null;
    ordering: number;
    attivo: boolean;
  }>,
): Promise<ScontoAttivita> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("sconti_attivita")
    .update(fields)
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("sconti", "max");
  return mapSconto(data);
}

/**
 * Cancella uno sconto. FK `iscrizioni_sconti.sconto_id` ha `ON DELETE RESTRICT`,
 * quindi se lo sconto è già stato applicato a una o piu' iscrizioni Postgres
 * rifiuta. Per nascondere senza rompere lo storico usa `attivo = false`.
 */
export async function deleteSconto(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("sconti_attivita")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
  revalidateTag("sconti", "max");
}

/**
 * Conta quante iscrizioni hanno questo sconto applicato. Usato dall'impact
 * preview del DeleteConfirmDialog.
 */
export async function countIscrizioniByScontoId(
  scontoId: string,
): Promise<number> {
  if (!db) return 0;
  const { count, error } = await db
    .from("iscrizioni_sconti")
    .select("iscrizione_id", { count: "exact", head: true })
    .eq("sconto_id", scontoId);
  if (error) throw error;
  return count ?? 0;
}
