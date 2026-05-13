import "server-only";
import { db } from "./client";
import type { Movimento, OrigineMovimento } from "@/lib/airtable/types";
import type { Database } from "./types.gen";
import type { MezzoPagamento } from "@/lib/config";

type MovimentoRow = Database["public"]["Tables"]["movimenti"]["Row"];

function mapMovimento(row: MovimentoRow): Movimento {
  return {
    recordId: row.id,
    id: row.id,
    timestamp: row.timestamp ?? undefined,
    dataMovimento: row.data_movimento ?? undefined,
    tipo: row.tipo,
    importo: Number(row.importo),
    conto: row.conto as MezzoPagamento,
    categoriaId: row.categoria_id ?? undefined,
    descrizione: row.descrizione ?? undefined,
    volontario: row.volontario ?? undefined,
    telegramUserId: row.telegram_user_id ?? undefined,
    stato: row.stato ?? undefined,
    note: row.note ?? undefined,
    idCorrezione: row.id_correzione ?? undefined,
    importoSegnato:
      row.importo_segnato != null ? Number(row.importo_segnato) : undefined,
    syncedAt: row.synced_at ?? undefined,
    voceRendicontoId: row.voce_rendiconto_id ?? undefined,
    origine: (row.origine as OrigineMovimento | null) ?? undefined,
    fingerprintBank: row.fingerprint_bank ?? undefined,
    isGiroconto: row.is_giroconto,
  };
}

export interface ListMovimentiOpts {
  telegramUserId?: string;
  conto?: MezzoPagamento;
  tipo?: "Entrata" | "Uscita";
  daData?: string;
  aData?: string;
  limit?: number;
}

export async function listMovimenti(
  opts: ListMovimentiOpts = {},
): Promise<Movimento[]> {
  if (!db) return [];
  let q = db
    .from("movimenti")
    .select("*")
    .neq("stato", "errato")
    .order("data_movimento", { ascending: false, nullsFirst: false })
    .limit(opts.limit ?? 200);
  if (opts.telegramUserId) q = q.eq("telegram_user_id", opts.telegramUserId);
  if (opts.conto) q = q.eq("conto", opts.conto);
  if (opts.tipo) q = q.eq("tipo", opts.tipo);
  if (opts.daData) q = q.gt("data_movimento", opts.daData);
  if (opts.aData) q = q.lt("data_movimento", opts.aData);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapMovimento);
}

/**
 * Lista movimenti in un intervallo inclusivo `[daData, aData]` (date ISO).
 * Pensata per aggregati di rendiconto: estrae fino a 10000 movimenti per non
 * troncare gli aggregati anno per il volume corrente dell'associazione.
 */
export async function listMovimentiInRange(
  daData: string,
  aData: string,
): Promise<Movimento[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("movimenti")
    .select("*")
    .neq("stato", "errato")
    .gte("data_movimento", daData)
    .lte("data_movimento", aData)
    .order("data_movimento", { ascending: true })
    .limit(10000);
  if (error) throw error;
  return (data ?? []).map(mapMovimento);
}

export interface CreaMovimentoInput {
  tipo: "Entrata" | "Uscita";
  importo: number;
  conto: MezzoPagamento;
  dataMovimento: string;
  categoriaId?: string;
  descrizione?: string;
  volontario?: string;
  telegramUserId?: string;
  note?: string;
  voceRendicontoId?: string;
  origine?: OrigineMovimento;
  fingerprintBank?: string;
  isGiroconto?: boolean;
}

function buildInsertRow(
  input: CreaMovimentoInput,
  id: string,
): Database["public"]["Tables"]["movimenti"]["Insert"] {
  return {
    id,
    tipo: input.tipo,
    importo: input.importo,
    conto: input.conto,
    data_movimento: input.dataMovimento,
    timestamp: new Date().toISOString(),
    stato: "valido",
    categoria_id: input.categoriaId,
    descrizione: input.descrizione,
    volontario: input.volontario,
    telegram_user_id: input.telegramUserId,
    note: input.note,
    voce_rendiconto_id: input.voceRendicontoId,
    origine: input.origine ?? "app",
    fingerprint_bank: input.fingerprintBank,
    is_giroconto: input.isGiroconto ?? false,
  };
}

function newMovimentoId(prefix: "app" | "rata" | "bank"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createMovimento(
  input: CreaMovimentoInput,
): Promise<Movimento> {
  if (!db) throw new Error("Supabase client non configurato");
  const prefix: "app" | "rata" | "bank" =
    input.origine === "rata"
      ? "rata"
      : input.origine === "bank_import"
        ? "bank"
        : "app";
  const id = newMovimentoId(prefix);
  const { data, error } = await db
    .from("movimenti")
    .insert(buildInsertRow(input, id))
    .select("*")
    .single();
  if (error) throw error;
  return mapMovimento(data);
}

export async function createMovimentiBatch(
  inputs: CreaMovimentoInput[],
): Promise<Movimento[]> {
  if (!db) throw new Error("Supabase client non configurato");
  if (inputs.length === 0) return [];
  const rows = inputs.map((m) =>
    buildInsertRow(
      m,
      newMovimentoId(
        m.origine === "rata"
          ? "rata"
          : m.origine === "bank_import"
            ? "bank"
            : "app",
      ),
    ),
  );
  const { data, error } = await db.from("movimenti").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []).map(mapMovimento);
}

export async function getMovimento(id: string): Promise<Movimento | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("movimenti")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ? mapMovimento(data) : null;
}

export async function deleteMovimento(id: string): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db.from("movimenti").delete().eq("id", id);
  if (error) throw error;
}

export interface DedupCandidate {
  conto: MezzoPagamento;
  tipo: "Entrata" | "Uscita";
  importo: number;
  dataMin: string;
  dataMax: string;
}

/**
 * Cerca movimenti già registrati che potrebbero matchare una riga di estratto
 * conto (stesso conto, stesso segno/tipo, stesso importo, data entro range).
 */
export async function findMovimentiForDedup(
  c: DedupCandidate,
): Promise<Movimento[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("movimenti")
    .select("*")
    .eq("conto", c.conto)
    .eq("tipo", c.tipo)
    .eq("importo", c.importo)
    .gte("data_movimento", c.dataMin)
    .lte("data_movimento", c.dataMax)
    .neq("stato", "errato");
  if (error) throw error;
  return (data ?? []).map(mapMovimento);
}

/**
 * Recupera tutti i movimenti già importati con uno dei fingerprint dati,
 * per evitare doppi import dello stesso file estratto conto.
 */
export async function findMovimentiByFingerprints(
  conto: MezzoPagamento,
  fingerprints: string[],
): Promise<Movimento[]> {
  if (!db || fingerprints.length === 0) return [];
  const { data, error } = await db
    .from("movimenti")
    .select("*")
    .eq("conto", conto)
    .in("fingerprint_bank", fingerprints);
  if (error) throw error;
  return (data ?? []).map(mapMovimento);
}

export async function totaliPerConto(): Promise<
  Record<MezzoPagamento, { entrate: number; uscite: number; saldo: number }>
> {
  const movimenti = await listMovimenti({ limit: 1000 });
  const init = { entrate: 0, uscite: 0, saldo: 0 };
  const tot: Record<
    MezzoPagamento,
    { entrate: number; uscite: number; saldo: number }
  > = {
    Cassa: { ...init },
    BCC: { ...init },
    Sumup: { ...init },
  };
  for (const m of movimenti) {
    if (m.isGiroconto) continue;
    if (m.tipo === "Entrata") tot[m.conto].entrate += m.importo;
    else tot[m.conto].uscite += m.importo;
  }
  for (const k of Object.keys(tot) as MezzoPagamento[]) {
    tot[k].saldo = tot[k].entrate - tot[k].uscite;
  }
  return tot;
}
