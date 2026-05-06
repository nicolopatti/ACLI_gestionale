import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { MeseIscrizione } from "./types";
import type { MezzoPagamento, StatoPagamento } from "@/lib/config";

function mapMese(record: { id: string; fields: Record<string, unknown> }): MeseIscrizione {
  const f = record.fields;
  const iscrLink = (f.iscrizione as string[] | undefined) ?? [];
  const movLink = (f.movimento_collegato as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    codice: (f.codice as string) ?? "",
    iscrizioneId: iscrLink[0] ?? "",
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

export async function listMesiByIscrizione(iscrizioneId: string): Promise<MeseIscrizione[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `FIND('${iscrizioneId}', ARRAYJOIN({iscrizione}))`,
      sort: [{ field: "mese_anno", direction: "asc" }],
    })
    .all();
  return records.map((r) => mapMese({ id: r.id, fields: r.fields }));
}

export async function listMesiByMese(meseAnno: string): Promise<MeseIscrizione[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `{mese_anno} = '${escapeFormulaString(meseAnno)}'`,
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
    meseAnno: string;
    importoDovuto: number;
  }>,
): Promise<MeseIscrizione[]> {
  if (!base) throw new Error("Airtable client non configurato");
  const created: MeseIscrizione[] = [];
  // Airtable consente max 10 record per chiamata create
  for (let i = 0; i < input.length; i += 10) {
    const batch = input.slice(i, i + 10);
    const res = await base(TABLE_NAMES.mesi).create(
      batch.map((m) => ({
        fields: {
          iscrizione: [m.iscrizioneId],
          mese_anno: m.meseAnno,
          importo_dovuto: m.importoDovuto,
          stato_pagamento: "non_pagato",
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

export async function countMesiNonPagati(meseAnno: string): Promise<number> {
  if (!base) return 0;
  const records = await base(TABLE_NAMES.mesi)
    .select({
      filterByFormula: `AND({mese_anno} = '${escapeFormulaString(meseAnno)}', {stato_pagamento} != 'pagato')`,
      fields: ["mese_anno"],
    })
    .all();
  return records.length;
}
