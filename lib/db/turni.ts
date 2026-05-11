import "server-only";
import { db } from "./client";
import type { Attivita, Sessione } from "@/lib/airtable/types";
import type { Database } from "./types.gen";
import type { FasciaOraria, GiornoSettimana, TipoUnita } from "@/lib/config";
import { dowToGiorno } from "@/lib/config";

type AttivitaRow = Database["public"]["Tables"]["attivita"]["Row"];

function mapAttivita(row: AttivitaRow): Attivita {
  return {
    recordId: row.id,
    nome: row.nome,
    tipo: row.tipo as Attivita["tipo"],
    dataInizio: row.data_inizio ?? undefined,
    dataFine: row.data_fine ?? undefined,
    attivo: row.attivo,
    note: row.note ?? undefined,
    giorniSettimana: (row.giorni_settimana ?? []) as GiornoSettimana[],
    fasceOrarie: (row.fasce_orarie ?? []) as FasciaOraria[],
    sessioniIds: [],
    iscrizioniIds: [],
    modalitaIds: [],
  };
}

/**
 * Attivita con `attivo: true` il cui range [data_inizio, data_fine] interseca
 * il range richiesto. Range aperto (NULL) considerato indefinito.
 */
export async function listAttivitaAttiveInRange(
  dataInizio: string,
  dataFine: string,
): Promise<Attivita[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("attivita")
    .select("*")
    .eq("attivo", true)
    .or(`data_inizio.is.null,data_inizio.lte.${dataFine}`)
    .or(`data_fine.is.null,data_fine.gte.${dataInizio}`);
  if (error) throw error;
  return (data ?? []).map(mapAttivita);
}

export function unionFasceOfferte(attivita: Attivita[]): FasciaOraria[] {
  const set = new Set<FasciaOraria>();
  for (const a of attivita) for (const f of a.fasceOrarie) set.add(f);
  return Array.from(set).sort((a, b) => fasciaOrdine(a) - fasciaOrdine(b));
}

export function unionGiorniOfferti(attivita: Attivita[]): GiornoSettimana[] {
  const set = new Set<GiornoSettimana>();
  for (const a of attivita) for (const g of a.giorniSettimana) set.add(g);
  const order: GiornoSettimana[] = [
    "lun",
    "mar",
    "mer",
    "gio",
    "ven",
    "sab",
    "dom",
  ];
  return order.filter((g) => set.has(g));
}

function fasciaOrdine(f: FasciaOraria): number {
  const m = f.match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : 99;
}

export function giornoDaDataIso(isoDate: string): GiornoSettimana {
  const d = new Date(`${isoDate}T00:00:00`);
  return dowToGiorno(d.getDay());
}

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
  const sessByAtt = new Map<string, Sessione[]>();
  for (const s of sessioniInRange) {
    const arr = sessByAtt.get(s.attivitaId) ?? [];
    arr.push(s);
    sessByAtt.set(s.attivitaId, arr);
  }

  for (const a of attivita) {
    if (a.tipo === "doposcuola") {
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
