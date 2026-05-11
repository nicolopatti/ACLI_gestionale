import "server-only";
import { db } from "./client";
import type { Movimento } from "@/lib/airtable/types";
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
}

export async function createMovimento(
  input: CreaMovimentoInput,
): Promise<Movimento> {
  if (!db) throw new Error("Supabase client non configurato");
  // Prefisso `app_` per non collidere con gli id generati dal bot Telegram.
  const id = `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await db
    .from("movimenti")
    .insert({
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
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapMovimento(data);
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
    if (m.tipo === "Entrata") tot[m.conto].entrate += m.importo;
    else tot[m.conto].uscite += m.importo;
  }
  for (const k of Object.keys(tot) as MezzoPagamento[]) {
    tot[k].saldo = tot[k].entrate - tot[k].uscite;
  }
  return tot;
}
