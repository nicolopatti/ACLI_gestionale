import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { Categoria } from "@/lib/airtable/types";
import type { Database } from "./types.gen";

type CategoriaRow = Database["public"]["Tables"]["categorie"]["Row"];

function mapCategoria(row: CategoriaRow): Categoria {
  return {
    recordId: row.id,
    nome: row.nome,
    tipo: row.tipo,
    voceRendicontoDefaultId: row.voce_rendiconto_default_id ?? undefined,
  };
}

async function _listCategorie(): Promise<Categoria[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("categorie")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map(mapCategoria);
}

export const listCategorie = unstable_cache(_listCategorie, ["categorie:all"], {
  revalidate: 600,
  tags: ["categorie"],
});

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
  revalidateTag("categorie", "max");
  return mapCategoria(data);
}

export async function setVoceRendicontoDefault(
  categoriaId: string,
  voceRendicontoId: string | null,
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("categorie")
    .update({ voce_rendiconto_default_id: voceRendicontoId })
    .eq("id", categoriaId);
  if (error) throw error;
  revalidateTag("categorie", "max");
}
