import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { Attivita, Sessione } from "./types";
import type { FasciaOraria, GiornoSettimana, TipoUnita } from "@/lib/config";
import { dowToGiorno } from "@/lib/config";

function mapAttivita(record: { id: string; fields: Record<string, unknown> }): Attivita {
  const f = record.fields;
  return {
    recordId: record.id,
    nome: (f.nome as string) ?? "",
    tipo: (f.tipo as Attivita["tipo"]) ?? "doposcuola",
    dataInizio: (f.data_inizio as string) ?? undefined,
    dataFine: (f.data_fine as string) ?? undefined,
    attivo: Boolean(f.attivo),
    note: (f.note as string) ?? undefined,
    giorniSettimana: ((f.giorni_settimana as GiornoSettimana[]) ?? []) as GiornoSettimana[],
    fasceOrarie: ((f.fasce_orarie as FasciaOraria[]) ?? []) as FasciaOraria[],
    sessioniIds: ((f.Sessioni as string[]) ?? []) as string[],
    iscrizioniIds: ((f.Iscrizioni as string[]) ?? []) as string[],
    modalitaIds: ((f.ModalitaIscrizione as string[]) ?? []) as string[],
  };
}

/**
 * Attività con `attivo: true` il cui range [data_inizio, data_fine] interseca
 * il range richiesto. Una attività senza data_inizio/data_fine viene
 * considerata attiva indefinitamente (fallback conservativo).
 */
export async function listAttivitaAttiveInRange(
  dataInizio: string,
  dataFine: string,
): Promise<Attivita[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.attivita)
    .select({
      filterByFormula: `AND(
        {attivo} = TRUE(),
        OR(
          {data_inizio} = BLANK(),
          {data_inizio} <= '${escapeFormulaString(dataFine)}'
        ),
        OR(
          {data_fine} = BLANK(),
          {data_fine} >= '${escapeFormulaString(dataInizio)}'
        )
      )`,
    })
    .all();
  return records.map((r) => mapAttivita({ id: r.id, fields: r.fields }));
}

/**
 * Unione delle fasce orarie offerte da un set di attività, ordinate
 * "naturalmente" per ora di inizio.
 */
export function unionFasceOfferte(attivita: Attivita[]): FasciaOraria[] {
  const set = new Set<FasciaOraria>();
  for (const a of attivita) for (const f of a.fasceOrarie) set.add(f);
  return Array.from(set).sort((a, b) => fasciaOrdine(a) - fasciaOrdine(b));
}

/**
 * Unione dei giorni della settimana offerti da un set di attività, in ordine
 * lun..dom.
 */
export function unionGiorniOfferti(attivita: Attivita[]): GiornoSettimana[] {
  const set = new Set<GiornoSettimana>();
  for (const a of attivita) for (const g of a.giorniSettimana) set.add(g);
  const order: GiornoSettimana[] = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
  return order.filter((g) => set.has(g));
}

function fasciaOrdine(f: FasciaOraria): number {
  const m = f.match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : 99;
}

/**
 * Ritorna il numero del giorno nel formato GiornoSettimana per una data
 * ISO YYYY-MM-DD.
 */
export function giornoDaDataIso(isoDate: string): GiornoSettimana {
  const d = new Date(`${isoDate}T00:00:00`);
  return dowToGiorno(d.getDay());
}

/**
 * Per ogni attività individua le celle (data, fascia) che essa "occupa"
 * nel range richiesto. Per doposcuola (mese): tutte le combinazioni
 * giorni × fasce dell'attività che cadono nel range. Per laboratorio
 * (giornata): le sessioni del periodo. Per locomotiva (settimana): le
 * sessioni con la loro fascia, espanse su tutti i giorni offerti
 * della settimana.
 */
export interface CellaAttiva {
  data: string;
  fascia: FasciaOraria;
  attivitaId: string;
  attivitaNome: string;
  tipo: TipoUnita;
  sessioneId?: string;
  etichetta?: string;
}

export function calcolaCelleAttive(
  attivita: Attivita[],
  sessioniInRange: Sessione[],
  rangeStart: string,
  rangeEnd: string,
): CellaAttiva[] {
  const celle: CellaAttiva[] = [];
  const attById = new Map(attivita.map((a) => [a.recordId, a] as const));
  const sessByAtt = new Map<string, Sessione[]>();
  for (const s of sessioniInRange) {
    const arr = sessByAtt.get(s.attivitaId) ?? [];
    arr.push(s);
    sessByAtt.set(s.attivitaId, arr);
  }

  for (const a of attivita) {
    if (a.tipo === "doposcuola") {
      // Genera tutte le date del range e per ognuna se è in giorniSettimana
      // crea celle per ogni fascia.
      for (const data of iterateDates(rangeStart, rangeEnd)) {
        if (a.dataInizio && data < a.dataInizio) continue;
        if (a.dataFine && data > a.dataFine) continue;
        const giorno = giornoDaDataIso(data);
        if (!a.giorniSettimana.includes(giorno)) continue;
        for (const fascia of a.fasceOrarie) {
          celle.push({
            data,
            fascia,
            attivitaId: a.recordId,
            attivitaNome: a.nome,
            tipo: "mese",
          });
        }
      }
    } else if (a.tipo === "laboratorio") {
      const sess = sessByAtt.get(a.recordId) ?? [];
      for (const s of sess) {
        if (s.tipoUnita !== "giornata") continue;
        if (!s.dataInizio || !s.fasciaOraria) continue;
        if (s.dataInizio < rangeStart || s.dataInizio > rangeEnd) continue;
        celle.push({
          data: s.dataInizio,
          fascia: s.fasciaOraria,
          attivitaId: a.recordId,
          attivitaNome: a.nome,
          tipo: "giornata",
          sessioneId: s.recordId,
          etichetta: s.etichetta,
        });
      }
    } else if (a.tipo === "locomotiva") {
      const sess = sessByAtt.get(a.recordId) ?? [];
      for (const s of sess) {
        if (s.tipoUnita !== "settimana") continue;
        if (!s.dataInizio || !s.dataFine || !s.fasciaOraria) continue;
        // Espandi sul range della sessione, intersecato col range richiesto.
        const start = s.dataInizio < rangeStart ? rangeStart : s.dataInizio;
        const end = s.dataFine > rangeEnd ? rangeEnd : s.dataFine;
        for (const data of iterateDates(start, end)) {
          const giorno = giornoDaDataIso(data);
          if (!a.giorniSettimana.includes(giorno)) continue;
          celle.push({
            data,
            fascia: s.fasciaOraria,
            attivitaId: a.recordId,
            attivitaNome: a.nome,
            tipo: "settimana",
            sessioneId: s.recordId,
            etichetta: s.etichetta,
          });
        }
      }
    }
    void attById;
  }
  return celle;
}

function iterateDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${dd}`);
  }
  return out;
}
