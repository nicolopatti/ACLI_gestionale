import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { Educatore } from "@/lib/db/types";
import type { Database } from "./types.gen";

type EducatoreRow = Database["public"]["Tables"]["educatori"]["Row"];

function mapEducatore(row: EducatoreRow): Educatore {
  return {
    recordId: row.id,
    nomeCompleto: `${row.cognome} ${row.nome}`.trim(),
    nome: row.nome,
    cognome: row.cognome,
    email: row.email ?? undefined,
    telefono: row.telefono ?? undefined,
    note: row.note ?? undefined,
    attivo: row.attivo,
  };
}

async function _listEducatori(opts?: {
  soloAttivi?: boolean;
}): Promise<Educatore[]> {
  if (!db) return [];
  let q = db.from("educatori").select("*").order("cognome");
  if (opts?.soloAttivi) q = q.eq("attivo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapEducatore);
}

export const listEducatori = unstable_cache(_listEducatori, ["educatori:list"], {
  revalidate: 120,
  tags: ["educatori"],
});

export async function getEducatore(recordId: string): Promise<Educatore | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("educatori")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapEducatore(data) : null;
}

export type EducatoreInput = {
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  note?: string;
  attivo?: boolean;
};

export async function createEducatore(input: EducatoreInput): Promise<Educatore> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("educatori")
    .insert({
      nome: input.nome,
      cognome: input.cognome,
      email: input.email,
      telefono: input.telefono,
      note: input.note,
      attivo: input.attivo ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("educatori", "max");
  return mapEducatore(data);
}

export async function updateEducatore(
  recordId: string,
  input: EducatoreInput,
): Promise<Educatore> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("educatori")
    .update({
      nome: input.nome,
      cognome: input.cognome,
      email: input.email ?? null,
      telefono: input.telefono ?? null,
      note: input.note ?? null,
      attivo: input.attivo ?? true,
    })
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("educatori", "max");
  return mapEducatore(data);
}

export async function deleteEducatore(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  // FK CASCADE in DB pulisce le disponibilita automaticamente.
  const { error } = await db.from("educatori").delete().eq("id", recordId);
  if (error) throw error;
  revalidateTag("educatori", "max");
}
