import "server-only";
import { db } from "./client";
import type { Disponibilita } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type { FasciaOraria } from "@/lib/config";

type DispoRow = Database["public"]["Tables"]["disponibilita"]["Row"];

function mapDisponibilita(row: DispoRow): Disponibilita {
  return {
    recordId: row.id,
    educatoreId: row.educatore_id,
    data: row.data,
    fasciaOraria: row.fascia_oraria as FasciaOraria,
    oraIngresso: row.ora_ingresso ?? undefined,
    oraUscita: row.ora_uscita ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listDisponibilitaByRange(
  dataInizio: string,
  dataFine: string,
): Promise<Disponibilita[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("disponibilita")
    .select("*")
    .gte("data", dataInizio)
    .lte("data", dataFine)
    .order("data");
  if (error) throw error;
  return (data ?? []).map(mapDisponibilita);
}

export async function listDisponibilitaByMese(
  meseAnno: string,
): Promise<Disponibilita[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("disponibilita")
    .select("*")
    .gte("data", `${meseAnno}-01`)
    .lte("data", `${meseAnno}-31`)
    .order("data");
  if (error) throw error;
  return (data ?? []).map(mapDisponibilita);
}

export async function listDisponibilitaByEducatoreEMese(
  educatoreId: string,
  meseAnno: string,
): Promise<Disponibilita[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("disponibilita")
    .select("*")
    .eq("educatore_id", educatoreId)
    .gte("data", `${meseAnno}-01`)
    .lte("data", `${meseAnno}-31`)
    .order("data");
  if (error) throw error;
  return (data ?? []).map(mapDisponibilita);
}

export async function listDisponibilitaByEducatore(
  educatoreId: string,
): Promise<Disponibilita[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("disponibilita")
    .select("*")
    .eq("educatore_id", educatoreId)
    .order("data");
  if (error) throw error;
  return (data ?? []).map(mapDisponibilita);
}

export async function listDisponibilitaByDataEFascia(
  data: string,
  fascia: FasciaOraria,
): Promise<Disponibilita[]> {
  if (!db) return [];
  // Query nativa per UNIQUE(educatore_id, data, fascia_oraria): risolve il
  // bug TODO #0 della versione Airtable (filterByFormula su {data} non sempre
  // matcha per via della serializzazione del campo date).
  const { data: rows, error } = await db
    .from("disponibilita")
    .select("*")
    .eq("data", data)
    .eq("fascia_oraria", fascia);
  if (error) throw error;
  return (rows ?? []).map(mapDisponibilita);
}

export type DisponibilitaSlot = {
  data: string;
  fasciaOraria: FasciaOraria;
};

export type TurnoCellaRow = {
  educatoreId: string;
  educatoreNomeCompleto?: string;
};

/**
 * Sostituisce i record di Disponibilita per una cella (data, fascia) con
 * la lista di educatori passata. Crea i record nuovi e cancella quelli
 * degli educatori rimossi.
 */
export async function replaceTurnoCella(
  data: string,
  fascia: FasciaOraria,
  rows: TurnoCellaRow[],
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const existing = await listDisponibilitaByDataEFascia(data, fascia);

  const wantedEdu = new Set(rows.map((r) => r.educatoreId));
  const existingByEdu = new Map(existing.map((d) => [d.educatoreId, d] as const));

  const toCreate: Array<Database["public"]["Tables"]["disponibilita"]["Insert"]> = [];
  const toDeleteIds: string[] = [];

  for (const r of rows) {
    if (existingByEdu.has(r.educatoreId)) continue;
    toCreate.push({
      educatore_id: r.educatoreId,
      data,
      fascia_oraria: fascia,
    });
  }
  for (const ex of existing) {
    if (!wantedEdu.has(ex.educatoreId)) toDeleteIds.push(ex.recordId);
  }

  if (toCreate.length > 0) {
    const { error } = await db.from("disponibilita").insert(toCreate);
    if (error) throw error;
  }
  if (toDeleteIds.length > 0) {
    const { error } = await db
      .from("disponibilita")
      .delete()
      .in("id", toDeleteIds);
    if (error) throw error;
  }
}

/**
 * Sincronizza le disponibilita di un educatore per un mese: crea/cancella
 * i (data, fascia) per allinearsi a `slots`.
 */
export async function replaceDisponibilita(
  educatoreId: string,
  _educatoreNomeCompleto: string,
  meseAnno: string,
  slots: DisponibilitaSlot[],
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  void _educatoreNomeCompleto; // L'etichetta non e' persistita su Postgres.
  const existing = await listDisponibilitaByEducatoreEMese(educatoreId, meseAnno);

  const slotKey = (d: string, f: string) => `${d}|${f}`;
  const nextSet = new Set(slots.map((s) => slotKey(s.data, s.fasciaOraria)));
  const existingMap = new Map(
    existing.map((d) => [slotKey(d.data, d.fasciaOraria), d.recordId] as const),
  );

  const toCreate: Array<Database["public"]["Tables"]["disponibilita"]["Insert"]> = [];
  for (const s of slots) {
    if (!existingMap.has(slotKey(s.data, s.fasciaOraria))) {
      toCreate.push({
        educatore_id: educatoreId,
        data: s.data,
        fascia_oraria: s.fasciaOraria,
      });
    }
  }

  const toDeleteIds: string[] = [];
  for (const [key, id] of existingMap) {
    if (!nextSet.has(key)) toDeleteIds.push(id);
  }

  if (toCreate.length > 0) {
    const { error } = await db.from("disponibilita").insert(toCreate);
    if (error) throw error;
  }
  if (toDeleteIds.length > 0) {
    const { error } = await db
      .from("disponibilita")
      .delete()
      .in("id", toDeleteIds);
    if (error) throw error;
  }
}

export async function deleteDisponibilitaByEducatore(
  educatoreId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("disponibilita")
    .delete()
    .eq("educatore_id", educatoreId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}
