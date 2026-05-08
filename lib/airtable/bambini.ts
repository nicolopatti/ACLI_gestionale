import type Airtable from "airtable";
import { base, TABLE_NAMES } from "./client";
import type { Bambino } from "./types";

type Fields = Partial<Airtable.FieldSet>;

function mapBambino(record: { id: string; fields: Record<string, unknown> }): Bambino {
  const f = record.fields;
  const fratelloLink = (f.fratello_di as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    nomeCompleto: (f.nome_completo as string) ?? `${f.nome ?? ""} ${f.cognome ?? ""}`.trim(),
    nome: (f.nome as string) ?? "",
    cognome: (f.cognome as string) ?? "",
    dataNascita: (f.data_nascita as string) ?? undefined,
    scuola: (f.scuola as string) ?? undefined,
    classe: (f.classe as string) ?? undefined,
    nomeGenitore: (f.nome_genitore as string) ?? "",
    cognomeGenitore: (f.cognome_genitore as string) ?? "",
    telefonoGenitore: (f.telefono_genitore as string) ?? undefined,
    emailGenitore: (f.email_genitore as string) ?? undefined,
    cfGenitore: (f.cf_genitore as string) ?? undefined,
    fratelloDiId: fratelloLink[0],
    note: (f.note as string) ?? undefined,
    attivo: Boolean(f.attivo),
    iscrizioniIds: ((f.Iscrizioni as string[]) ?? []) as string[],
    contattiAggiuntiviIds: ((f.ContattiAggiuntivi as string[]) ?? []) as string[],
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

function bambinoFields(input: BambinoInput): Fields {
  return {
    nome: input.nome,
    cognome: input.cognome,
    nome_genitore: input.nomeGenitore,
    cognome_genitore: input.cognomeGenitore,
    attivo: input.attivo ?? true,
    ...(input.dataNascita ? { data_nascita: input.dataNascita } : {}),
    ...(input.scuola ? { scuola: input.scuola } : {}),
    ...(input.classe ? { classe: input.classe } : {}),
    ...(input.telefonoGenitore ? { telefono_genitore: input.telefonoGenitore } : {}),
    ...(input.emailGenitore ? { email_genitore: input.emailGenitore } : {}),
    ...(input.cfGenitore ? { cf_genitore: input.cfGenitore } : {}),
    ...(input.fratelloDiId ? { fratello_di: [input.fratelloDiId] } : { fratello_di: [] }),
    ...(input.note ? { note: input.note } : {}),
  };
}

export async function createBambino(input: BambinoInput): Promise<Bambino> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.bambini).create([{ fields: bambinoFields(input) }]);
  return mapBambino({ id: created[0].id, fields: created[0].fields });
}

export async function updateBambino(recordId: string, input: BambinoInput): Promise<Bambino> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.bambini).update([
    { id: recordId, fields: bambinoFields(input) },
  ]);
  return mapBambino({ id: updated[0].id, fields: updated[0].fields });
}

export async function deleteBambino(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.bambini).destroy([recordId]);
}
