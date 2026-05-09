import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { MeseIscrizione } from "./types";
import type { MezzoPagamento, StatoPagamento, TipoUnita } from "@/lib/config";

function mapMese(record: { id: string; fields: Record<string, unknown> }): MeseIscrizione {
  const f = record.fields;
  const iscrLink = (f.iscrizione as string[] | undefined) ?? [];
  const sessLink = (f.sessione as string[] | undefined) ?? [];
  const movLink = (f.movimento_collegato as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    codice: (f.codice as string) ?? "",
    iscrizioneId: iscrLink[0] ?? "",
    sessioneId: sessLink[0],
    tipoUnita: (f.tipo_unita as TipoUnita) ?? undefined,
    chiavePeriodo: (f.chiave_periodo as string) ?? undefined,
    meseAnno: (f.mese_anno as string) ?? "",
    importoDovuto: Number((f.importo_dovuto as number) ?? 0),
    statoPagamento: ((f.stato_pagamento as StatoPagamento) ?? "non_pagato"),
    importoPagato: f.importo_pagato != null ? Number(f.importo_pagato as number) : undefined,
    dataPagamento: (f.data_pagamento as string) ?? undefined,
    mezzoPagamento: (f.mezzo_pagamento as MezzoPagamento) ?? undefined,
    movimentoCollegatoId: movLink[0],
    note: (f.note as string) ?? undefined,
  };
}

export async function listAllMesi(): Promise<MeseIscrizione[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.mesi)
    .select({ sort: [{ field: "chiave_periodo", direction: "asc" }] })
    .all();
  return records.map((r) => mapMese({ id: r.id, fields: r.fields }));
}

export async function listMesiByIscrizione(iscrizioneId: string): Promise<MeseIscrizione[]> {
  if (!base) return [];
  // Filtro lato server: ARRAYJOIN su un linked record produce i display name,
  // non gli id, quindi FIND('rec...') non matcha mai. Carichiamo tutto e
  // filtriamo in JS.
  const records = await base(TABLE_NAMES.mesi)
    .select({
      sort: [{ field: "chiave_periodo", direction: "asc" }],
    })
    .all();
  return records
    .map((r) => mapMese({ id: r.id, fields: r.fields }))
    .filter((m) => m.iscrizioneId === iscrizioneId);
}

export async function listMesiByChiavePeriodo(chiave: string): Promise<MeseIscrizione[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `{chiave_periodo} = '${escapeFormulaString(chiave)}'`,
    })
    .all();
  return records.map((r) => mapMese({ id: r.id, fields: r.fields }));
}

export async function getMese(recordId: string): Promise<MeseIscrizione | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.mesi).find(recordId);
    return mapMese({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
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
  if (!base) throw new Error("Airtable client non configurato");
  if (input.length === 0) return [];
  const created: MeseIscrizione[] = [];
  // Airtable consente max 10 record per chiamata create
  for (let i = 0; i < input.length; i += 10) {
    const batch = input.slice(i, i + 10);
    const res = await base(TABLE_NAMES.mesi).create(
      batch.map((m) => ({
        fields: {
          iscrizione: [m.iscrizioneId],
          sessione: [m.sessioneId],
          tipo_unita: m.tipoUnita,
          chiave_periodo: m.chiavePeriodo,
          importo_dovuto: m.importoDovuto,
          stato_pagamento: "non_pagato",
          ...(m.meseAnno ? { mese_anno: m.meseAnno } : {}),
        },
      })),
    );
    for (const r of res) created.push(mapMese({ id: r.id, fields: r.fields }));
  }
  return created;
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
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.mesi).update([{ id: recordId, fields }]);
  return mapMese({ id: updated[0].id, fields: updated[0].fields });
}

export async function countMesiNonPagati(chiavePeriodo: string): Promise<number> {
  if (!base) return 0;
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `AND({chiave_periodo} = '${escapeFormulaString(chiavePeriodo)}', {stato_pagamento} != 'pagato')`,
      fields: ["chiave_periodo"],
    })
    .all();
  return records.length;
}

export async function deleteRateBySessioneEIscrizione(
  iscrizioneId: string,
  sessioneId: string,
): Promise<number> {
  if (!base) return 0;
  const records = await base(TABLE_NAMES.mesi).select({}).all();
  const ids = records
    .map((r) => mapMese({ id: r.id, fields: r.fields }))
    .filter((m) => m.iscrizioneId === iscrizioneId && m.sessioneId === sessioneId)
    .map((m) => m.recordId);
  for (let i = 0; i < ids.length; i += 10) {
    await base(TABLE_NAMES.mesi).destroy(ids.slice(i, i + 10));
  }
  return ids.length;
}

export async function hasRataPagataForSessione(
  iscrizioneId: string,
  sessioneId: string,
): Promise<boolean> {
  if (!base) return false;
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `OR({stato_pagamento} = 'pagato', {stato_pagamento} = 'parziale')`,
    })
    .all();
  return records
    .map((r) => mapMese({ id: r.id, fields: r.fields }))
    .some((m) => m.iscrizioneId === iscrizioneId && m.sessioneId === sessioneId);
}

export async function hasAnyRataPagataForSessione(
  sessioneId: string,
): Promise<boolean> {
  if (!base) return false;
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `OR({stato_pagamento} = 'pagato', {stato_pagamento} = 'parziale')`,
    })
    .all();
  return records
    .map((r) => mapMese({ id: r.id, fields: r.fields }))
    .some((m) => m.sessioneId === sessioneId);
}
