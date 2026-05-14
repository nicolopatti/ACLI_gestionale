import "server-only";
import { db } from "./client";
import type { ContattoAggiuntivo } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type { RuoloContatto } from "@/lib/config";

type ContattoRow = Database["public"]["Tables"]["contatti_aggiuntivi"]["Row"];

function mapContatto(row: ContattoRow): ContattoAggiuntivo {
  return {
    recordId: row.id,
    bambinoId: row.bambino_id,
    ruolo: row.ruolo as RuoloContatto,
    nome: row.nome,
    cognome: row.cognome,
    telefono: row.telefono ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listContattiByBambino(
  bambinoId: string,
): Promise<ContattoAggiuntivo[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("contatti_aggiuntivi")
    .select("*")
    .eq("bambino_id", bambinoId)
    .order("ruolo");
  if (error) throw error;
  return (data ?? []).map(mapContatto);
}

export type ContattoInput = {
  recordId?: string;
  ruolo: RuoloContatto;
  nome: string;
  cognome: string;
  telefono?: string;
  note?: string;
};

/**
 * Sostituisce in blocco la lista di contatti aggiuntivi di un bambino.
 */
export async function replaceContattiForBambino(
  bambinoId: string,
  contatti: ContattoInput[],
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const existing = await listContattiByBambino(bambinoId);

  const nextIds = new Set(
    contatti.map((c) => c.recordId).filter(Boolean) as string[],
  );
  const toDeleteIds = existing
    .filter((c) => !nextIds.has(c.recordId))
    .map((c) => c.recordId);

  const toCreate: Array<Database["public"]["Tables"]["contatti_aggiuntivi"]["Insert"]> = [];
  const toUpdate: Array<{ id: string; cols: Database["public"]["Tables"]["contatti_aggiuntivi"]["Update"] }> = [];

  for (const c of contatti) {
    const cols = {
      bambino_id: bambinoId,
      ruolo: c.ruolo,
      nome: c.nome,
      cognome: c.cognome,
      telefono: c.telefono ?? null,
      note: c.note ?? null,
    };
    if (c.recordId) {
      toUpdate.push({ id: c.recordId, cols });
    } else {
      toCreate.push(cols);
    }
  }

  if (toCreate.length > 0) {
    const { error } = await db.from("contatti_aggiuntivi").insert(toCreate);
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await db
      .from("contatti_aggiuntivi")
      .update(u.cols)
      .eq("id", u.id);
    if (error) throw error;
  }
  if (toDeleteIds.length > 0) {
    const { error } = await db
      .from("contatti_aggiuntivi")
      .delete()
      .in("id", toDeleteIds);
    if (error) throw error;
  }
}

export async function deleteContatto(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("contatti_aggiuntivi")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}

export async function deleteContattiByBambino(
  bambinoId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("contatti_aggiuntivi")
    .delete()
    .eq("bambino_id", bambinoId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}
