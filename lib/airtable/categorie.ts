import { base, TABLE_NAMES } from "./client";
import type { Categoria } from "./types";

function mapCategoria(record: { id: string; fields: Record<string, unknown> }): Categoria {
  const f = record.fields;
  return {
    recordId: record.id,
    nome: (f.nome as string) ?? "",
    tipo: (f.tipo as "Entrata" | "Uscita") ?? "Uscita",
  };
}

export async function listCategorie(): Promise<Categoria[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.categorie)
    .select({ sort: [{ field: "nome", direction: "asc" }] })
    .all();
  return records.map((r) => mapCategoria({ id: r.id, fields: r.fields }));
}

export async function ensureCategoria(nome: string, tipo: "Entrata" | "Uscita"): Promise<Categoria> {
  if (!base) throw new Error("Airtable client non configurato");
  const all = await listCategorie();
  const found = all.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
  if (found) return found;
  const created = await base(TABLE_NAMES.categorie).create([
    { fields: { nome, tipo } },
  ]);
  return mapCategoria({ id: created[0].id, fields: created[0].fields });
}
