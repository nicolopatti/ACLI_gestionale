import "server-only";
import { db } from "./client";
import type { Presenza } from "@/lib/airtable/types";
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

function isAssenteImplicita(p: PresenzaInput): boolean {
  return p.presente === undefined && !p.oraIngresso && !p.oraUscita;
}

function presenzaColumns(p: PresenzaInput) {
  return {
    bambino_id: p.bambinoId,
    data: p.data,
    presente: p.presente ?? null,
    ora_ingresso: p.oraIngresso ?? null,
    ora_uscita: p.oraUscita ?? null,
    sessione_id: p.sessioneId ?? null,
    registrato_da: p.registratoDaId ?? null,
    note: p.note ?? null,
  };
}

/**
 * Upsert di una singola presenza (per data + bambino).
 */
export async function setPresenza(input: PresenzaInput): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data: existing } = await db
    .from("presenze")
    .select("id")
    .eq("data", input.data)
    .eq("bambino_id", input.bambinoId)
    .maybeSingle();

  if (isAssenteImplicita(input)) {
    if (existing) {
      await db.from("presenze").delete().eq("id", existing.id);
    }
    return;
  }

  if (existing) {
    const { error } = await db
      .from("presenze")
      .update(presenzaColumns(input))
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await db.from("presenze").insert(presenzaColumns(input));
    if (error) throw error;
  }
}

export async function upsertPresenze(input: PresenzaInput[]): Promise<void> {
  if (!db || input.length === 0) return;
  const dataKey = input[0].data;
  const giorno = await listPresenzeByData(dataKey);
  const existingByBambino = new Map(giorno.map((p) => [p.bambinoId, p]));

  const toCreate: ReturnType<typeof presenzaColumns>[] = [];
  const toUpdate: Array<{ id: string; cols: ReturnType<typeof presenzaColumns> }> = [];
  const toDelete: string[] = [];

  for (const item of input) {
    const existing = existingByBambino.get(item.bambinoId);
    if (isAssenteImplicita(item)) {
      if (existing) toDelete.push(existing.recordId);
      continue;
    }
    const cols = presenzaColumns(item);
    if (existing) toUpdate.push({ id: existing.recordId, cols });
    else toCreate.push(cols);
  }

  if (toCreate.length > 0) {
    const { error } = await db.from("presenze").insert(toCreate);
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await db.from("presenze").update(u.cols).eq("id", u.id);
    if (error) throw error;
  }
  if (toDelete.length > 0) {
    const { error } = await db.from("presenze").delete().in("id", toDelete);
    if (error) throw error;
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
