import { base, TABLE_NAMES } from "./client";
import type { Bambino } from "./types";

function mapBambino(record: { id: string; fields: Record<string, unknown> }): Bambino {
  const f = record.fields;
  const genitoreLink = (f.genitore as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    nomeCompleto: (f.nome_completo as string) ?? `${f.nome ?? ""} ${f.cognome ?? ""}`.trim(),
    nome: (f.nome as string) ?? "",
    cognome: (f.cognome as string) ?? "",
    dataNascita: (f.data_nascita as string) ?? undefined,
    scuola: (f.scuola as string) ?? undefined,
    classe: (f.classe as string) ?? undefined,
    genitoreId: genitoreLink[0],
    note: (f.note as string) ?? undefined,
    attivo: Boolean(f.attivo),
    iscrizioniIds: ((f.iscrizioni as string[]) ?? []) as string[],
  };
}

export async function listBambini(opts?: { soloAttivi?: boolean }): Promise<Bambino[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.bambini)
    .select({
      sort: [{ field: "cognome", direction: "asc" }],
      ...(opts?.soloAttivi ? { filterByFormula: "{attivo} = TRUE()" } : {}),
    })
    .all();
  return records.map((r) => mapBambino({ id: r.id, fields: r.fields }));
}

export async function getBambino(recordId: string): Promise<Bambino | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.bambini).find(recordId);
    return mapBambino({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function createBambino(input: {
  nome: string;
  cognome: string;
  genitoreId: string;
  dataNascita?: string;
  scuola?: string;
  classe?: string;
  note?: string;
  attivo?: boolean;
}): Promise<Bambino> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.bambini).create([
    {
      fields: {
        nome: input.nome,
        cognome: input.cognome,
        genitore: [input.genitoreId],
        attivo: input.attivo ?? true,
        ...(input.dataNascita ? { data_nascita: input.dataNascita } : {}),
        ...(input.scuola ? { scuola: input.scuola } : {}),
        ...(input.classe ? { classe: input.classe } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
    },
  ]);
  return mapBambino({ id: created[0].id, fields: created[0].fields });
}

export async function updateBambino(
  recordId: string,
  fields: Partial<{
    nome: string;
    cognome: string;
    genitore: string[];
    data_nascita: string;
    scuola: string;
    classe: string;
    note: string;
    attivo: boolean;
  }>,
): Promise<Bambino> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.bambini).update([{ id: recordId, fields }]);
  return mapBambino({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteBambino(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.bambini).destroy([recordId]);
}
