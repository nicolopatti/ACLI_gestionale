import "server-only";
import { db } from "./client";
import type { Presenza } from "@/lib/db/types";
import type { Database } from "./types.gen";

type PresenzaRow = Database["public"]["Tables"]["presenze"]["Row"];

function mapPresenza(row: PresenzaRow): Presenza {
  return {
    recordId: row.id,
    codice: row.codice ?? "",
    bambinoId: row.bambino_id,
    sessioneId: row.sessione_id ?? undefined,
    data: row.data,
    presente: row.presente ?? undefined,
    oraIngresso: row.ora_ingresso ?? undefined,
    oraUscita: row.ora_uscita ?? undefined,
    note: row.note ?? undefined,
    registratoDaId: row.registrato_da ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listPresenzeByData(data: string): Promise<Presenza[]> {
  if (!db) return [];
  const { data: rows, error } = await db
    .from("presenze")
    .select("*")
    .eq("data", data);
  if (error) throw error;
  return (rows ?? []).map(mapPresenza);
}

export async function listPresenzeByMese(meseAnno: string): Promise<Presenza[]> {
  if (!db) return [];
  // meseAnno = "YYYY-MM" -> range [YYYY-MM-01, YYYY-MM-31]
  const start = `${meseAnno}-01`;
  const end = `${meseAnno}-31`;
  const { data, error } = await db
    .from("presenze")
    .select("*")
    .gte("data", start)
    .lte("data", end);
  if (error) throw error;
  return (data ?? []).map(mapPresenza);
}

export async function listPresenzeByBambino(
  bambinoId: string,
): Promise<Presenza[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("presenze")
    .select("*")
    .eq("bambino_id", bambinoId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPresenza);
}

export type PresenzaInput = {
  bambinoId: string;
  sessioneId?: string;
  data: string;
  presente?: boolean;
  oraIngresso?: string;
  oraUscita?: string;
  registratoDaId?: string;
  note?: string;
};

/**
 * Upsert atomico di una singola presenza (chiave naturale: bambino_id + data).
 * Delegato alla RPC `set_presenza` (SECURITY DEFINER), che usa il vincolo
 * UNIQUE(bambino_id, data) + ON CONFLICT per evitare race su chiamate
 * concorrenti. Caso "assente implicita" (nessun valore valorizzato): la RPC
 * cancella la riga esistente, se presente.
 */
export async function setPresenza(input: PresenzaInput): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db.rpc("set_presenza", {
    p_bambino_id: input.bambinoId,
    p_data: input.data,
    p_presente: input.presente ?? null,
    p_ora_ingresso: input.oraIngresso ?? null,
    p_ora_uscita: input.oraUscita ?? null,
    p_sessione_id: input.sessioneId ?? null,
    p_registrato_da: input.registratoDaId ?? null,
    p_note: input.note ?? null,
  });
  if (error) throw error;
}

/**
 * Batch di setPresenza. Atomico per singola riga (via RPC), non per l'insieme:
 * un crash a meta' lascia le prime N salvate. Caller che hanno bisogno di
 * tutto-o-niente devono dividere il payload o aggiungere retry idempotente.
 */
export async function upsertPresenze(input: PresenzaInput[]): Promise<void> {
  if (!db || input.length === 0) return;
  for (const item of input) {
    await setPresenza(item);
  }
}

export async function deletePresenzeByBambino(
  bambinoId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("presenze")
    .delete()
    .eq("bambino_id", bambinoId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function countPresenzeOggi(): Promise<number> {
  if (!db) return 0;
  const oggi = new Date().toISOString().slice(0, 10);
  const { count, error } = await db
    .from("presenze")
    .select("id", { count: "exact", head: true })
    .eq("data", oggi)
    .eq("presente", true);
  if (error) throw error;
  return count ?? 0;
}
