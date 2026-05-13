import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { Attivita } from "@/lib/airtable/types";
import type { Database } from "./types.gen";
import type {
  FasciaOraria,
  GiornoSettimana,
  TipoAttivita,
} from "@/lib/config";

type AttivitaRow = Database["public"]["Tables"]["attivita"]["Row"];

type AttivitaRowWithRel = AttivitaRow & {
  sessioni?: { id: string }[];
  iscrizioni?: { id: string }[];
  modalita_iscrizione?: { id: string }[];
};

function mapAttivita(row: AttivitaRowWithRel): Attivita {
  return {
    recordId: row.id,
    nome: row.nome,
    tipo: row.tipo as TipoAttivita,
    dataInizio: row.data_inizio ?? undefined,
    dataFine: row.data_fine ?? undefined,
    attivo: row.attivo,
    note: row.note ?? undefined,
    giorniSettimana: (row.giorni_settimana ?? []) as GiornoSettimana[],
    fasceOrarie: (row.fasce_orarie ?? []) as FasciaOraria[],
    sessioniIds: (row.sessioni ?? []).map((s) => s.id),
    iscrizioniIds: (row.iscrizioni ?? []).map((i) => i.id),
    modalitaIds: (row.modalita_iscrizione ?? []).map((m) => m.id),
  };
}

const REL_SELECT = "*, sessioni(id), iscrizioni(id), modalita_iscrizione(id)";

async function _listAttivita(opts?: {
  tipo?: TipoAttivita;
  attivo?: boolean;
}): Promise<Attivita[]> {
  if (!db) return [];
  let q = db
    .from("attivita")
    .select(REL_SELECT)
    .order("data_inizio", { ascending: false, nullsFirst: false });
  if (opts?.tipo) q = q.eq("tipo", opts.tipo);
  if (opts?.attivo !== undefined) q = q.eq("attivo", opts.attivo);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapAttivita(r as AttivitaRowWithRel));
}

export const listAttivita = unstable_cache(_listAttivita, ["attivita:list"], {
  revalidate: 120,
  tags: ["attivita"],
});

export async function getAttivita(recordId: string): Promise<Attivita | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("attivita")
    .select(REL_SELECT)
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapAttivita(data as AttivitaRowWithRel) : null;
}

export async function createAttivita(input: {
  nome: string;
  tipo: TipoAttivita;
  dataInizio?: string;
  dataFine?: string;
  attivo?: boolean;
  note?: string;
  giorniSettimana?: GiornoSettimana[];
  fasceOrarie?: FasciaOraria[];
}): Promise<Attivita> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("attivita")
    .insert({
      nome: input.nome,
      tipo: input.tipo,
      attivo: input.attivo ?? true,
      data_inizio: input.dataInizio,
      data_fine: input.dataFine,
      note: input.note,
      giorni_settimana: input.giorniSettimana ?? [],
      fasce_orarie: input.fasceOrarie ?? [],
    })
    .select(REL_SELECT)
    .single();
  if (error) throw error;
  revalidateTag("attivita", "max");
  return mapAttivita(data as AttivitaRowWithRel);
}

export async function updateAttivita(
  recordId: string,
  fields: Partial<{
    nome: string;
    tipo: TipoAttivita;
    data_inizio: string;
    data_fine: string;
    attivo: boolean;
    note: string;
    giorni_settimana: GiornoSettimana[];
    fasce_orarie: FasciaOraria[];
  }>,
): Promise<Attivita> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("attivita")
    .update(fields)
    .eq("id", recordId)
    .select(REL_SELECT)
    .single();
  if (error) throw error;
  revalidateTag("attivita", "max");
  return mapAttivita(data as AttivitaRowWithRel);
}

export async function deleteAttivita(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  // FK CASCADE pulisce modalita, sessioni, iscrizioni (e a cascata rate).
  const { error } = await db.from("attivita").delete().eq("id", recordId);
  if (error) throw error;
  revalidateTag("attivita", "max");
}
