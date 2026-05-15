import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { ModalitaIscrizione } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type { TipoPrezzo } from "@/lib/config";

type ModalitaRow = Database["public"]["Tables"]["modalita_iscrizione"]["Row"];

function mapModalita(row: ModalitaRow): ModalitaIscrizione {
  return {
    recordId: row.id,
    attivitaId: row.attivita_id,
    nome: row.nome,
    importo: Number(row.importo),
    tipoPrezzo: row.tipo_prezzo as TipoPrezzo,
    descrizione: row.descrizione ?? undefined,
    attivo: row.attivo,
  };
}

async function _listAllModalita(): Promise<ModalitaIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("modalita_iscrizione")
    .select("*")
    .order("importo");
  if (error) throw error;
  return (data ?? []).map(mapModalita);
}

export const listAllModalita = unstable_cache(
  _listAllModalita,
  ["modalita:all"],
  { revalidate: 120, tags: ["modalita"] },
);

async function _listModalitaByAttivita(
  attivitaId: string,
): Promise<ModalitaIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("modalita_iscrizione")
    .select("*")
    .eq("attivita_id", attivitaId)
    .order("importo");
  if (error) throw error;
  return (data ?? []).map(mapModalita);
}

export const listModalitaByAttivita = unstable_cache(
  _listModalitaByAttivita,
  ["modalita:by-attivita"],
  { revalidate: 120, tags: ["modalita"] },
);

export async function getModalita(
  recordId: string,
): Promise<ModalitaIscrizione | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("modalita_iscrizione")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapModalita(data) : null;
}

export async function createModalita(input: {
  attivitaId: string;
  nome: string;
  importo: number;
  tipoPrezzo?: TipoPrezzo;
  descrizione?: string;
  attivo?: boolean;
}): Promise<ModalitaIscrizione> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("modalita_iscrizione")
    .insert({
      attivita_id: input.attivitaId,
      nome: input.nome,
      importo: input.importo,
      tipo_prezzo: input.tipoPrezzo ?? "per_sessione",
      descrizione: input.descrizione,
      attivo: input.attivo ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("modalita", "max");
  return mapModalita(data);
}

export async function updateModalita(
  recordId: string,
  fields: Partial<{
    nome: string;
    importo: number;
    tipo_prezzo: TipoPrezzo;
    descrizione: string;
    attivo: boolean;
  }>,
): Promise<ModalitaIscrizione> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("modalita_iscrizione")
    .update(fields)
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("modalita", "max");
  return mapModalita(data);
}

export async function deleteModalita(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("modalita_iscrizione")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
  revalidateTag("modalita", "max");
}

/**
 * Cancella in bulk un set di modalita per id. Usato dal cascade delete di
 * attivita. FK CASCADE in DB rende il flusso ridondante ma manteniamo la
 * funzione per non rompere i chiamanti esistenti.
 */
export async function deleteModalitaByIds(ids: string[]): Promise<void> {
  if (!db || ids.length === 0) return;
  const { error } = await db
    .from("modalita_iscrizione")
    .delete()
    .in("id", ids);
  if (error) throw error;
  revalidateTag("modalita", "max");
}
