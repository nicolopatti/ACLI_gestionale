import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./client";
import type { Movimento, OrigineMovimento } from "@/lib/db/types";
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

async function _listMovimenti(
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
 * Cached. La cache key include automaticamente `opts`. Invalidata su qualsiasi
 * mutazione (create/delete/setStato/setCategoria/setVoceRendiconto) via
 * `revalidateTag("movimenti", "max")`. TTL di sicurezza 5 min.
 */
export const listMovimenti = unstable_cache(_listMovimenti, ["movimenti:list"], {
  revalidate: 300,
  tags: ["movimenti"],
});

async function _listMovimentiInRange(
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

/**
 * Lista movimenti in un intervallo inclusivo `[daData, aData]` (date ISO).
 * Pensata per aggregati di rendiconto: estrae fino a 10000 movimenti per non
 * troncare gli aggregati anno per il volume corrente dell'associazione.
 */
export const listMovimentiInRange = unstable_cache(
  _listMovimentiInRange,
  ["movimenti:range"],
  { revalidate: 300, tags: ["movimenti"] },
);

export interface ContoTotali {
  entrate: number;
  uscite: number;
  saldo: number;
}

export interface SaldiPerContoOpts {
  /**
   * Restringe il calcolo all'anno solare specificato (YYYY).
   * Senza filtro, aggrega su tutto lo storico.
   */
  anno?: number;
  /**
   * Restringe il calcolo ai soli movimenti registrati da uno specifico
   * `telegram_user_id` (volontari non-admin sulla pagina `/cassa`).
   */
  telegramUserId?: string;
}

async function _saldiPerConto(
  opts: SaldiPerContoOpts = {},
): Promise<Record<MezzoPagamento, ContoTotali>> {
  const empty: ContoTotali = { entrate: 0, uscite: 0, saldo: 0 };
  const init: Record<MezzoPagamento, ContoTotali> = {
    Cassa: { ...empty },
    BCC: { ...empty },
    Sumup: { ...empty },
  };
  if (!db) return init;
  const { data, error } = await db.rpc("saldi_per_conto", {
    anno_filtro: opts.anno ?? undefined,
    telegram_user_filtro: opts.telegramUserId ?? undefined,
  });
  if (error) throw error;
  const out: Record<MezzoPagamento, ContoTotali> = init;
  for (const row of data ?? []) {
    const k = row.conto as MezzoPagamento;
    if (k === "Cassa" || k === "BCC" || k === "Sumup") {
      out[k] = {
        entrate: Number(row.entrate),
        uscite: Number(row.uscite),
        saldo: Number(row.saldo),
      };
    }
  }
  return out;
}

/**
 * RPC Postgres `saldi_per_conto`: aggrega entrate/uscite/saldo per conto
 * lato DB invece di scaricare 1000 movimenti e fare reduce in JS. Esclude
 * automaticamente movimenti `stato = 'errato'` e giroconti.
 * Filtri opzionali: anno solare, telegram_user_id.
 */
export const saldiPerConto = unstable_cache(_saldiPerConto, ["movimenti:saldi"], {
  revalidate: 300,
  tags: ["movimenti"],
});

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
  timestamp: string,
): Database["public"]["Tables"]["movimenti"]["Insert"] {
  return {
    id,
    tipo: input.tipo,
    importo: input.importo,
    conto: input.conto,
    data_movimento: input.dataMovimento,
    timestamp,
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
    .insert(buildInsertRow(input, id, new Date().toISOString()))
    .select("*")
    .single();
  if (error) throw error;
  revalidateTag("movimenti", "max");
  return mapMovimento(data);
}

export async function createMovimentiBatch(
  inputs: CreaMovimentoInput[],
): Promise<Movimento[]> {
  if (!db) throw new Error("Supabase client non configurato");
  if (inputs.length === 0) return [];
  // La colonna `timestamp` ha UNIQUE constraint (serve a n8n per
  // `ON CONFLICT (timestamp) DO UPDATE` sul sync da Google Sheets).
  // `new Date().toISOString()` chiamato dentro un `.map()` sincrono
  // ritorna lo stesso ms per tutte le righe → violazione unique sul
  // batch insert. Offset di +i ms per riga garantisce unicità.
  const baseMs = Date.now();
  const rows = inputs.map((m, i) =>
    buildInsertRow(
      m,
      newMovimentoId(
        m.origine === "rata"
          ? "rata"
          : m.origine === "bank_import"
            ? "bank"
            : "app",
      ),
      new Date(baseMs + i).toISOString(),
    ),
  );
  const { data, error } = await db.from("movimenti").insert(rows).select("*");
  if (error) throw error;
  revalidateTag("movimenti", "max");
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
  revalidateTag("movimenti", "max");
}

export async function setCategoriaMovimento(
  movimentoId: string,
  categoriaId: string | null,
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("movimenti")
    .update({ categoria_id: categoriaId })
    .eq("id", movimentoId);
  if (error) throw error;
  revalidateTag("movimenti", "max");
}

export async function setVoceRendicontoMovimento(
  movimentoId: string,
  voceRendicontoId: string | null,
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("movimenti")
    .update({ voce_rendiconto_id: voceRendicontoId })
    .eq("id", movimentoId);
  if (error) throw error;
  revalidateTag("movimenti", "max");
}

export async function setStatoMovimento(
  movimentoId: string,
  stato: "valido" | "errato" | "corretto",
): Promise<void> {
  if (!db) throw new Error("Supabase client non configurato");
  const { error } = await db
    .from("movimenti")
    .update({ stato })
    .eq("id", movimentoId);
  if (error) throw error;
  revalidateTag("movimenti", "max");
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
 * Non cached: il flow di import deve vedere sempre lo stato fresco del DB.
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
 * Non cached: vedi sopra.
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
