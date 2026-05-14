import "server-only";
import { db } from "./client";
import type { MeseIscrizione } from "@/lib/db/types";
import type { Database } from "./types.gen";
import type {
  MezzoPagamento,
  StatoPagamento,
  TipoAttivita,
  TipoUnita,
} from "@/lib/config";

type RataRow = Database["public"]["Tables"]["rate"]["Row"];

function mapMese(row: RataRow): MeseIscrizione {
  return {
    recordId: row.id,
    codice: row.codice ?? "",
    iscrizioneId: row.iscrizione_id,
    sessioneId: row.sessione_id ?? undefined,
    tipoUnita: (row.tipo_unita as TipoUnita | null) ?? undefined,
    chiavePeriodo: row.chiave_periodo ?? undefined,
    meseAnno: row.mese_anno ?? "",
    importoDovuto: Number(row.importo_dovuto),
    statoPagamento: row.stato_pagamento as StatoPagamento,
    importoPagato:
      row.importo_pagato != null ? Number(row.importo_pagato) : undefined,
    dataPagamento: row.data_pagamento ?? undefined,
    mezzoPagamento:
      (row.mezzo_pagamento as MezzoPagamento | null) ?? undefined,
    movimentoCollegatoId: row.movimento_id ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function listAllMesi(): Promise<MeseIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .order("chiave_periodo");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function listMesiByIscrizione(
  iscrizioneId: string,
): Promise<MeseIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .eq("iscrizione_id", iscrizioneId)
    .order("chiave_periodo");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function listMesiByIscrizioneIds(
  iscrizioneIds: string[],
): Promise<MeseIscrizione[]> {
  if (!db || iscrizioneIds.length === 0) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .in("iscrizione_id", iscrizioneIds)
    .order("chiave_periodo");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function listMesiByChiavePeriodo(
  chiave: string,
): Promise<MeseIscrizione[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("rate")
    .select("*")
    .eq("chiave_periodo", chiave);
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function getMese(recordId: string): Promise<MeseIscrizione | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("rate")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  if (error) return null;
  return data ? mapMese(data) : null;
}

export async function createMesi(
  input: Array<{
    iscrizioneId: string;
    sessioneId: string;
    tipoUnita: TipoUnita;
    chiavePeriodo: string;
    importoDovuto: number;
    meseAnno?: string;
  }>,
): Promise<MeseIscrizione[]> {
  if (!db) throw new Error("Supabase client non configurato");
  if (input.length === 0) return [];
  const rows = input.map((m) => ({
    iscrizione_id: m.iscrizioneId,
    sessione_id: m.sessioneId,
    tipo_unita: m.tipoUnita,
    chiave_periodo: m.chiavePeriodo,
    importo_dovuto: m.importoDovuto,
    stato_pagamento: "non_pagato" as const,
    mese_anno: m.meseAnno ?? null,
  }));
  const { data, error } = await db.from("rate").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []).map(mapMese);
}

export async function updateMese(
  recordId: string,
  fields: Partial<{
    importo_dovuto: number;
    stato_pagamento: StatoPagamento;
    importo_pagato: number;
    data_pagamento: string;
    mezzo_pagamento: MezzoPagamento;
    movimento_collegato: string[];
    note: string;
  }>,
): Promise<MeseIscrizione> {
  if (!db) throw new Error("Supabase client non configurato");
  // Retrocompat: `movimento_collegato` arrivava come array di linked record da
  // Airtable. Qui mappiamo al campo testuale singolo `movimento_id`.
  const { movimento_collegato, ...rest } = fields;
  const update: Database["public"]["Tables"]["rate"]["Update"] = { ...rest };
  if (movimento_collegato !== undefined) {
    update.movimento_id = movimento_collegato[0] ?? null;
  }
  const { data, error } = await db
    .from("rate")
    .update(update)
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  return mapMese(data);
}

export async function countMesiNonPagati(chiavePeriodo: string): Promise<number> {
  if (!db) return 0;
  const { count, error } = await db
    .from("rate")
    .select("id", { count: "exact", head: true })
    .eq("chiave_periodo", chiavePeriodo)
    .neq("stato_pagamento", "pagato");
  if (error) throw error;
  return count ?? 0;
}

export async function deleteRateBySessioneEIscrizione(
  iscrizioneId: string,
  sessioneId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("iscrizione_id", iscrizioneId)
    .eq("sessione_id", sessioneId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function hasRataPagataForSessione(
  iscrizioneId: string,
  sessioneId: string,
): Promise<boolean> {
  if (!db) return false;
  const { data, error } = await db
    .from("rate")
    .select("id")
    .eq("iscrizione_id", iscrizioneId)
    .eq("sessione_id", sessioneId)
    .in("stato_pagamento", ["pagato", "parziale"])
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function hasAnyRataPagataForSessione(
  sessioneId: string,
): Promise<boolean> {
  if (!db) return false;
  const { data, error } = await db
    .from("rate")
    .select("id")
    .eq("sessione_id", sessioneId)
    .in("stato_pagamento", ["pagato", "parziale"])
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function deleteMesiByIscrizione(
  iscrizioneId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("iscrizione_id", iscrizioneId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function deleteMesiBySessione(
  sessioneId: string,
): Promise<number> {
  if (!db) return 0;
  const { data, error } = await db
    .from("rate")
    .delete()
    .eq("sessione_id", sessioneId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export interface RataPaymentContext {
  rata: MeseIscrizione;
  bambinoNome: string;
  bambinoCognome: string;
  attivitaNome: string;
  attivitaTipo: TipoAttivita;
  modalitaNome: string;
}

/**
 * Recupera la rata + i metadati necessari a costruire un Movimento Entrata
 * (nome bambino, attività, modalità) in un'unica query con join.
 */
export async function getRataPaymentContext(
  rataId: string,
): Promise<RataPaymentContext | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("rate")
    .select(
      "*, iscrizione:iscrizioni!inner(*, bambino:bambini!inner(nome,cognome), attivita:attivita!inner(nome,tipo), modalita:modalita_iscrizione!inner(nome))",
    )
    .eq("id", rataId)
    .maybeSingle();
  if (error || !data) return null;
  const iscrizione = data.iscrizione as unknown as {
    bambino: { nome: string; cognome: string };
    attivita: { nome: string; tipo: TipoAttivita };
    modalita: { nome: string };
  };
  return {
    rata: mapMese(data),
    bambinoNome: iscrizione.bambino.nome,
    bambinoCognome: iscrizione.bambino.cognome,
    attivitaNome: iscrizione.attivita.nome,
    attivitaTipo: iscrizione.attivita.tipo,
    modalitaNome: iscrizione.modalita.nome,
  };
}
