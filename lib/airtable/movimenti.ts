import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Movimento } from "./types";
import type { MezzoPagamento } from "@/lib/config";

function mapMovimento(record: { id: string; fields: Record<string, unknown> }): Movimento {
  const f = record.fields;
  const catLink = (f.categoria as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    id: (f.id as string) ?? "",
    timestamp: (f.timestamp as string) ?? undefined,
    dataMovimento: (f.data_movimento as string) ?? undefined,
    tipo: (f.tipo as "Entrata" | "Uscita") ?? "Uscita",
    importo: Number((f.importo as number) ?? 0),
    conto: (f.conto as MezzoPagamento) ?? "Cassa",
    categoriaId: catLink[0],
    descrizione: (f.descrizione as string) ?? undefined,
    volontario: (f.volontario as string) ?? undefined,
    telegramUserId: (f.telegram_user_id as string) ?? undefined,
    stato: (f.stato as "valido" | "errato" | "corretto") ?? undefined,
    note: (f.note as string) ?? undefined,
    idCorrezione: (f.id_correzione as string) ?? undefined,
    importoSegnato: f.importo_segnato != null ? Number(f.importo_segnato as number) : undefined,
    syncedAt: (f.synced_at as string) ?? undefined,
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

export async function listMovimenti(opts: ListMovimentiOpts = {}): Promise<Movimento[]> {
  if (!base) return [];
  const filters: string[] = ["{stato} != 'errato'"];
  if (opts.telegramUserId) {
    filters.push(`{telegram_user_id} = '${escapeFormulaString(opts.telegramUserId)}'`);
  }
  if (opts.conto) filters.push(`{conto} = '${escapeFormulaString(opts.conto)}'`);
  if (opts.tipo) filters.push(`{tipo} = '${escapeFormulaString(opts.tipo)}'`);
  if (opts.daData) filters.push(`IS_AFTER({data_movimento}, '${escapeFormulaString(opts.daData)}')`);
  if (opts.aData) filters.push(`IS_BEFORE({data_movimento}, '${escapeFormulaString(opts.aData)}')`);

  const records = await base(TABLE_NAMES.movimenti)
    .select({
      filterByFormula: `AND(${filters.join(", ")})`,
      sort: [{ field: "data_movimento", direction: "desc" }],
      maxRecords: opts.limit ?? 200,
    })
    .all();
  return records.map((r) => mapMovimento({ id: r.id, fields: r.fields }));
}

export async function totaliPerConto(): Promise<Record<MezzoPagamento, { entrate: number; uscite: number; saldo: number }>> {
  const movimenti = await listMovimenti({ limit: 1000 });
  const init = { entrate: 0, uscite: 0, saldo: 0 };
  const tot: Record<MezzoPagamento, { entrate: number; uscite: number; saldo: number }> = {
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
