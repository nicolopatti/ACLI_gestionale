import type {
  Categoria,
  Movimento,
  SezioneRendiconto,
  VoceRendiconto,
} from "@/lib/airtable/types";

export interface VoceAggregata {
  voce: VoceRendiconto;
  importo: number;
  count: number;
}

export interface SezioneAggregata {
  sezione: SezioneRendiconto;
  titolo: string;
  voci: VoceAggregata[];
  totale: number;
}

export interface RendicontoAggregato {
  anno: number;
  uscite: SezioneAggregata[];
  entrate: SezioneAggregata[];
  totaleUscite: number;
  totaleEntrate: number;
  avanzo: number;
  /** Movimenti contabilizzati ma senza voce di rendiconto risolvibile. */
  nonClassificati: Movimento[];
  /** Movimenti esclusi dal rendiconto (giroconti). */
  giroconti: Movimento[];
}

export const TITOLI_SEZIONE_USCITA: Record<SezioneRendiconto, string> = {
  A: "A) Uscite da attività di interesse generale",
  B: "B) Uscite da attività diverse",
  C: "C) Uscite da attività di raccolta fondi",
  D: "D) Uscite da attività finanziarie e patrimoniali",
  E: "E) Uscite di supporto generale",
};

export const TITOLI_SEZIONE_ENTRATA: Record<SezioneRendiconto, string> = {
  A: "A) Entrate da attività di interesse generale",
  B: "B) Entrate da attività diverse",
  C: "C) Entrate da attività di raccolta fondi",
  D: "D) Entrate da attività finanziarie e patrimoniali",
  E: "E) Entrate di supporto generale",
};

const SEZIONI: SezioneRendiconto[] = ["A", "B", "C", "D", "E"];

/**
 * Risolve la voce di rendiconto di un movimento usando le stesse regole di
 * `aggregaRendiconto`: prima la voce esplicita, poi il default della categoria.
 * Restituisce undefined se il movimento è un giroconto, se non c'è voce
 * risolvibile, o se la voce trovata ha tipo incoerente con quello del movimento.
 */
export function resolveVoceMovimento(
  m: Movimento,
  voci: VoceRendiconto[],
  categorie: Categoria[],
): VoceRendiconto | undefined {
  if (m.isGiroconto) return undefined;
  const voceById = new Map(voci.map((v) => [v.recordId, v] as const));
  const categoriaById = new Map(
    categorie.map((c) => [c.recordId, c] as const),
  );
  let voce: VoceRendiconto | undefined;
  if (m.voceRendicontoId) voce = voceById.get(m.voceRendicontoId);
  if (!voce && m.categoriaId) {
    const c = categoriaById.get(m.categoriaId);
    if (c?.voceRendicontoDefaultId) {
      voce = voceById.get(c.voceRendicontoDefaultId);
    }
  }
  if (!voce) return undefined;
  if (voce.tipo !== m.tipo) return undefined;
  return voce;
}

/**
 * Aggrega i movimenti per voce di rendiconto.
 *
 * Regole:
 * - I movimenti con `is_giroconto=true` sono esclusi (trasferimenti interni).
 * - La voce è quella esplicita (`voce_rendiconto_id`); altrimenti deriva
 *   dalla categoria (`voce_rendiconto_default_id`).
 * - Movimenti senza voce risolvibile finiscono in `nonClassificati`.
 */
export function aggregaRendiconto(
  anno: number,
  movimenti: Movimento[],
  voci: VoceRendiconto[],
  categorie: Categoria[],
): RendicontoAggregato {
  const voceById = new Map(voci.map((v) => [v.recordId, v] as const));
  const categoriaById = new Map(
    categorie.map((c) => [c.recordId, c] as const),
  );

  function resolveVoce(m: Movimento): VoceRendiconto | undefined {
    if (m.voceRendicontoId) {
      const v = voceById.get(m.voceRendicontoId);
      if (v) return v;
    }
    if (m.categoriaId) {
      const c = categoriaById.get(m.categoriaId);
      if (c?.voceRendicontoDefaultId) {
        return voceById.get(c.voceRendicontoDefaultId);
      }
    }
    return undefined;
  }

  const giroconti: Movimento[] = [];
  const nonClassificati: Movimento[] = [];
  const buckets = new Map<string, { importo: number; count: number }>();

  for (const m of movimenti) {
    if (m.isGiroconto) {
      giroconti.push(m);
      continue;
    }
    const voce = resolveVoce(m);
    if (!voce) {
      nonClassificati.push(m);
      continue;
    }
    if (voce.tipo !== m.tipo) {
      // voce coerente per tipo, altrimenti non classificato (per evitare
      // somme nel rendiconto con segno sbagliato).
      nonClassificati.push(m);
      continue;
    }
    const cur = buckets.get(voce.recordId) ?? { importo: 0, count: 0 };
    cur.importo += m.importo;
    cur.count += 1;
    buckets.set(voce.recordId, cur);
  }

  function buildSezione(
    tipo: "Entrata" | "Uscita",
    sezione: SezioneRendiconto,
  ): SezioneAggregata {
    const titolo =
      tipo === "Uscita"
        ? TITOLI_SEZIONE_USCITA[sezione]
        : TITOLI_SEZIONE_ENTRATA[sezione];
    const voci_sezione = voci
      .filter((v) => v.tipo === tipo && v.sezione === sezione && v.attivo)
      .sort((a, b) => a.ordering - b.ordering);
    let totale = 0;
    const vociAgg: VoceAggregata[] = voci_sezione.map((v) => {
      const b = buckets.get(v.recordId) ?? { importo: 0, count: 0 };
      totale += b.importo;
      return { voce: v, importo: b.importo, count: b.count };
    });
    return { sezione, titolo, voci: vociAgg, totale };
  }

  const usciteSez = SEZIONI.map((s) => buildSezione("Uscita", s));
  const entrateSez = SEZIONI.map((s) => buildSezione("Entrata", s));

  const totaleUscite = usciteSez.reduce((acc, s) => acc + s.totale, 0);
  const totaleEntrate = entrateSez.reduce((acc, s) => acc + s.totale, 0);

  return {
    anno,
    uscite: usciteSez,
    entrate: entrateSez,
    totaleUscite,
    totaleEntrate,
    avanzo: totaleEntrate - totaleUscite,
    nonClassificati,
    giroconti,
  };
}

// SECURITY_PLAN sessione 2: CSV formula injection.
// Quando Excel/Numbers/LibreOffice apre un CSV, se una cella inizia per
// =, +, -, @, TAB o CR, la interpreta come formula. Un attaccante che
// riesce a piazzare una stringa simile in `descrizione` o `voce.label`
// puo' eseguire DDE/payload all'apertura del file. Prefissiamo un
// apostrofo (forma testo letterale in Excel) per i campi text. I numeri
// passano da `fmt(...)`, restano nativi cosi' che il foglio li somma.
function sanitizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function escCsvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escText(s: string): string {
  return escCsvCell(sanitizeFormula(s));
}

export function rendicontoToCsv(r: RendicontoAggregato): string {
  const rows: string[] = [];
  const fmt = (n: number) => n.toFixed(2);

  rows.push(["Sezione", "Tipo", "Codice", "Voce", "Importo"].join(","));

  function flushSez(sez: SezioneAggregata, tipo: "Entrata" | "Uscita") {
    for (const v of sez.voci) {
      rows.push(
        [
          sez.sezione,
          tipo,
          v.voce.codice,
          escText(v.voce.label),
          fmt(v.importo),
        ].join(","),
      );
    }
    rows.push(
      [
        sez.sezione,
        tipo,
        "",
        escText(`Totale ${sez.titolo}`),
        fmt(sez.totale),
      ].join(","),
    );
  }

  for (const s of r.uscite) flushSez(s, "Uscita");
  for (const s of r.entrate) flushSez(s, "Entrata");

  rows.push(
    ["", "Uscita", "", escText("TOTALE ONERI E COSTI"), fmt(r.totaleUscite)].join(","),
  );
  rows.push(
    ["", "Entrata", "", escText("TOTALE ENTRATE DELLA GESTIONE"), fmt(r.totaleEntrate)].join(","),
  );
  rows.push(
    ["", "", "", escText("Avanzo/Disavanzo d'esercizio"), fmt(r.avanzo)].join(","),
  );

  return rows.join("\n");
}
