import "server-only";
import { db } from "./client";
import type { Bambino } from "@/lib/airtable/types";
import type { Database } from "./types.gen";

type BambinoRow = Database["public"]["Tables"]["bambini"]["Row"];

type BambinoRowWithRel = BambinoRow & {
  iscrizioni?: { id: string }[];
  contatti_aggiuntivi?: { id: string }[];
};

function mapBambino(row: BambinoRowWithRel): Bambino {
  const nome = row.nome ?? "";
  const cognome = row.cognome ?? "";
  return {
    recordId: row.id,
    nomeCompleto: `${nome} ${cognome}`.trim(),
    nome,
    cognome,
    dataNascita: row.data_nascita ?? undefined,
    scuola: row.scuola ?? undefined,
    classe: row.classe ?? undefined,
    nomeGenitore: row.nome_genitore ?? "",
    cognomeGenitore: row.cognome_genitore ?? "",
    telefonoGenitore: row.telefono_genitore ?? undefined,
    emailGenitore: row.email_genitore ?? undefined,
    cfGenitore: row.cf_genitore ?? undefined,
    fratelloDiId: row.fratello_di ?? undefined,
    note: row.note ?? undefined,
    attivo: row.attivo,
    iscrizioniIds: (row.iscrizioni ?? []).map((i) => i.id),
    contattiAggiuntiviIds: (row.contatti_aggiuntivi ?? []).map((c) => c.id),
  };
}

const REL_SELECT = "*, iscrizioni(id), contatti_aggiuntivi(id)";

export async function listBambini(opts?: {
  soloAttivi?: boolean;
}): Promise<Bambino[]> {
  if (!db) return [];
  let q = db.from("bambini").select(REL_SELECT).order("cognome");
  if (opts?.soloAttivi) q = q.eq("attivo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapBambino(r as BambinoRowWithRel));
}

export async function getBambino(recordId: string): Promise<Bambino | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("bambini")
    .select(REL_SELECT)
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapBambino(data as BambinoRowWithRel) : null;
}

export type BambinoInput = {
  nome: string;
  cognome: string;
  dataNascita?: string;
  scuola?: string;
  classe?: string;
  nomeGenitore: string;
  cognomeGenitore: string;
  telefonoGenitore?: string;
  emailGenitore?: string;
  cfGenitore?: string;
  fratelloDiId?: string;
  note?: string;
  attivo?: boolean;
};

function bambinoColumns(input: BambinoInput) {
  return {
    nome: input.nome,
    cognome: input.cognome,
    nome_genitore: input.nomeGenitore,
    cognome_genitore: input.cognomeGenitore,
    attivo: input.attivo ?? true,
    data_nascita: input.dataNascita || null,
    scuola: input.scuola || null,
    classe: input.classe || null,
    telefono_genitore: input.telefonoGenitore || null,
    email_genitore: input.emailGenitore || null,
    cf_genitore: input.cfGenitore || null,
    fratello_di: input.fratelloDiId || null,
    note: input.note || null,
  };
}

export async function createBambino(input: BambinoInput): Promise<Bambino> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("bambini")
    .insert(bambinoColumns(input))
    .select(REL_SELECT)
    .single();
  if (error) throw error;
  return mapBambino(data as BambinoRowWithRel);
}

export async function updateBambino(
  recordId: string,
  input: BambinoInput,
): Promise<Bambino> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("bambini")
    .update(bambinoColumns(input))
    .eq("id", recordId)
    .select(REL_SELECT)
    .single();
  if (error) throw error;
  return mapBambino(data as BambinoRowWithRel);
}

export async function deleteBambino(recordId: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  // FK CASCADE pulisce iscrizioni (e a cascata rate), presenze, contatti_aggiuntivi.
  const { error } = await db.from("bambini").delete().eq("id", recordId);
  if (error) throw error;
}
