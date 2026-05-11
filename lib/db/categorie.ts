import "server-only";
import { db } from "./client";
import type { Categoria } from "@/lib/airtable/types";
import type { Database } from "./types.gen";

type CategoriaRow = Database["public"]["Tables"]["categorie"]["Row"];

function mapCategoria(row: CategoriaRow): Categoria {
  return {
    recordId: row.id,
    nome: row.nome,
    tipo: row.tipo,
  };
}

export async function listCategorie(): Promise<Categoria[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("categorie")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map(mapCategoria);
}

export async function ensureCategoria(
  nome: string,
  tipo: "Entrata" | "Uscita",
): Promise<Categoria> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data: existing } = await db
    .from("categorie")
    .select("*")
    .ilike("nome", nome)
    .maybeSingle();
  if (existing) return mapCategoria(existing);
  const { data, error } = await db
    .from("categorie")
    .insert({ nome, tipo })
    .select("*")
    .single();
  if (error) throw error;
  return mapCategoria(data);
}
