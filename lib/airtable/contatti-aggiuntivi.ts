import type Airtable from "airtable";
import { base, TABLE_NAMES } from "./client";
import type { ContattoAggiuntivo } from "./types";
import type { RuoloContatto } from "@/lib/config";

type Fields = Partial<Airtable.FieldSet>;

function mapContatto(record: { id: string; fields: Record<string, unknown> }): ContattoAggiuntivo {
  const f = record.fields;
  const bambinoLink = (f.bambino as string[] | undefined) ?? [];
  return {
    recordId: record.id,
    bambinoId: bambinoLink[0] ?? "",
    ruolo: (f.ruolo as RuoloContatto) ?? "altro",
    nome: (f.nome as string) ?? "",
    cognome: (f.cognome as string) ?? "",
    telefono: (f.telefono as string) ?? undefined,
    note: (f.note as string) ?? undefined,
  };
}

export async function listContattiByBambino(bambinoId: string): Promise<ContattoAggiuntivo[]> {
  if (!base) return [];
  // Filtro lato server: ARRAYJOIN su un linked record produce i display name,
  // non gli id, quindi FIND('rec...') non matcha. Carichiamo tutto e filtriamo.
  const records = await base(TABLE_NAMES.contattiAggiuntivi)
    .select({
      sort: [{ field: "ruolo", direction: "asc" }],
    })
    .all();
  return records
    .map((r) => mapContatto({ id: r.id, fields: r.fields }))
    .filter((c) => c.bambinoId === bambinoId);
}

export type ContattoInput = {
  recordId?: string;
  ruolo: RuoloContatto;
  nome: string;
  cognome: string;
  telefono?: string;
  note?: string;
};

/**
 * Sincronizza la lista di contatti per un bambino: crea i nuovi, aggiorna gli esistenti
 * e cancella quelli rimossi. I contatti senza `recordId` vengono creati; quelli con
 * un `recordId` non più presente nella nuova lista vengono cancellati.
 */
export async function replaceContattiForBambino(
  bambinoId: string,
  contatti: ContattoInput[],
): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  const existing = await listContattiByBambino(bambinoId);

  const nextIds = new Set(contatti.map((c) => c.recordId).filter(Boolean) as string[]);
  const toDelete = existing.filter((c) => !nextIds.has(c.recordId)).map((c) => c.recordId);

  const toCreate: Array<{ fields: Fields }> = [];
  const toUpdate: Array<{ id: string; fields: Fields }> = [];

  for (const c of contatti) {
    const fields: Fields = {
      bambino: [bambinoId],
      ruolo: c.ruolo,
      nome: c.nome,
      cognome: c.cognome,
      nome_completo: `${c.ruolo} ${c.nome} ${c.cognome}`.trim(),
      ...(c.telefono ? { telefono: c.telefono } : {}),
      ...(c.note ? { note: c.note } : {}),
    };
    if (c.recordId) {
      toUpdate.push({ id: c.recordId, fields });
    } else {
      toCreate.push({ fields });
    }
  }

  for (let i = 0; i < toCreate.length; i += 10) {
    await base(TABLE_NAMES.contattiAggiuntivi).create(toCreate.slice(i, i + 10));
  }
  for (let i = 0; i < toUpdate.length; i += 10) {
    await base(TABLE_NAMES.contattiAggiuntivi).update(toUpdate.slice(i, i + 10));
  }
  for (let i = 0; i < toDelete.length; i += 10) {
    await base(TABLE_NAMES.contattiAggiuntivi).destroy(toDelete.slice(i, i + 10));
  }
}

export async function deleteContatto(recordId: string): Promise<void> {
  if (!base) throw new Error("Airtable client non configurato");
  await base(TABLE_NAMES.contattiAggiuntivi).destroy([recordId]);
}

/**
 * Cancella in bulk tutti i contatti aggiuntivi di un bambino. Usato dal
 * cascade delete del bambino. Ritorna il numero di contatti cancellati.
 */
export async function deleteContattiByBambino(bambinoId: string): Promise<number> {
  if (!base) return 0;
  const all = await listContattiByBambino(bambinoId);
  const ids = all.map((c) => c.recordId);
  for (let i = 0; i < ids.length; i += 10) {
    await base(TABLE_NAMES.contattiAggiuntivi).destroy(ids.slice(i, i + 10));
  }
  return ids.length;
}
