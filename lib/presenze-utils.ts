import {
  GIORNI_INFRASETTIMANALI,
  type GiornoSettimana,
} from "@/lib/config";
import type {
  Attivita,
  Bambino,
  Iscrizione,
  Sessione,
} from "@/lib/airtable/types";

const GIORNO_DA_DATE: Record<number, GiornoSettimana> = {
  0: "dom",
  1: "lun",
  2: "mar",
  3: "mer",
  4: "gio",
  5: "ven",
  6: "sab",
};

export function dataInRangeSessione(data: string, sessione: Sessione): boolean {
  if (!sessione.dataInizio || !sessione.dataFine) return false;
  return data >= sessione.dataInizio && data <= sessione.dataFine;
}

export interface CandidatoPresenza {
  bambino: Bambino;
  iscrizione: Iscrizione;
  attivita: Attivita;
  sessioneId: string;
  sessioneEtichetta: string;
}

/**
 * Calcola i bambini candidati a presenza per una data, dato un insieme di
 * iscrizioni. Per i doposcuola filtra anche per giorno-della-settimana,
 * ricadendo sui giorni dell'attività e infine su lun-ven se nessuno è
 * configurato. La sessione attiva è quella che copre la data come
 * intervallo (`dataInizio ≤ data ≤ dataFine`), indipendentemente dal
 * `tipoUnita`.
 */
export function calcolaCandidatiPresenza(input: {
  data: string;
  iscrizioni: Iscrizione[];
  bambini: Bambino[];
  attivita: Attivita[];
  sessioni: Sessione[];
}): CandidatoPresenza[] {
  const { data, iscrizioni, bambini, attivita, sessioni } = input;
  const giorno = GIORNO_DA_DATE[new Date(data).getDay()];
  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));
  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));
  const sessioniById = new Map(sessioni.map((s) => [s.recordId, s] as const));

  const out: CandidatoPresenza[] = [];
  for (const iscrizione of iscrizioni) {
    const bambino = bambinoById.get(iscrizione.bambinoId);
    if (!bambino) continue;
    const att = attivitaById.get(iscrizione.attivitaId);
    if (!att) continue;

    const sessioniIscrizione = iscrizione.sessioniSelteIds
      .map((id) => sessioniById.get(id))
      .filter((s): s is Sessione => Boolean(s));
    const sessioneAttiva = sessioniIscrizione.find((s) =>
      dataInRangeSessione(data, s),
    );
    if (!sessioneAttiva) continue;

    if (att.tipo === "doposcuola") {
      const giorniIscrizione =
        iscrizione.giorniSettimana.length > 0
          ? iscrizione.giorniSettimana
          : att.giorniSettimana.length > 0
            ? att.giorniSettimana
            : [...GIORNI_INFRASETTIMANALI];
      if (!giorniIscrizione.includes(giorno)) continue;
    }

    out.push({
      bambino,
      iscrizione,
      attivita: att,
      sessioneId: sessioneAttiva.recordId,
      sessioneEtichetta: sessioneAttiva.etichetta,
    });
  }
  return out;
}
