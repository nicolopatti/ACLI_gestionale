import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { VoceRendiconto, SezioneRendiconto } from "@/lib/airtable/types";
import type { Database } from "./types.gen";

type VoceRow = Database["public"]["Tables"]["voci_rendiconto"]["Row"];

function mapVoce(row: VoceRow): VoceRendiconto {
  return {
    recordId: row.id,
    codice: row.codice,
    tipo: row.tipo,
    sezione: row.sezione as SezioneRendiconto,
    numero: row.numero,
    label: row.label,
    ordering: row.ordering,
    attivo: row.attivo,
  };
}

async function _listVociRendiconto(): Promise<VoceRendiconto[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("voci_rendiconto")
    .select("*")
    .order("tipo", { ascending: true })
    .order("ordering", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapVoce);
}

export const listVociRendiconto = unstable_cache(
  _listVociRendiconto,
  ["voci-rendiconto:all"],
  { revalidate: 3600, tags: ["voci-rendiconto"] },
);

export async function listVociRendicontoByTipo(
  tipo: "Entrata" | "Uscita",
): Promise<VoceRendiconto[]> {
  const all = await listVociRendiconto();
  return all.filter((v) => v.tipo === tipo && v.attivo);
}

export async function getVoceRendicontoByCodice(
  codice: string,
): Promise<VoceRendiconto | null> {
  const all = await listVociRendiconto();
  return all.find((v) => v.codice === codice) ?? null;
}

export function invalidateVociRendicontoCache() {
  revalidateTag("voci-rendiconto", "max");
}
