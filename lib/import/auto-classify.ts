import type { ParsedRow } from "./types";

/**
 * Suggerimento di classificazione per una riga di estratto conto.
 * Tutti i campi sono opzionali: l'UI di review li propone come default ma
 * l'utente conferma riga per riga prima dell'import.
 */
export interface ClassificationSuggestion {
  /** Nome categoria (case-insensitive lookup contro `categorie.nome`). */
  categoriaNome?: string;
  /** Codice voce rendiconto (es. `U-A-2`). Se assente, deriva dalla categoria. */
  voceRendicontoCodice?: string;
  isGiroconto: boolean;
  /** Etichetta breve della regola che ha matchato (per UI/debug). */
  reason: string;
}

interface Rule {
  test: (r: ParsedRow) => boolean;
  out: Omit<ClassificationSuggestion, "isGiroconto"> & { isGiroconto?: boolean };
}

/**
 * IBAN del conto BCC dell'associazione, usato per riconoscere i giroconti
 * interni. È una constant per evitare un round-trip al DB ad ogni riga;
 * se cambia l'IBAN, basta aggiornarla qui.
 */
const IBAN_CIRCOLO = "IT88Z0857554190000000205966";

const RULES: Rule[] = [
  // ─── Giroconti interni (escluso dal rendiconto) ────────────────────────
  {
    test: (r) =>
      r.descrizione.toUpperCase().includes("CIRCOLO ACLI CALVISANO") ||
      r.descrizione.includes(IBAN_CIRCOLO),
    out: {
      categoriaNome: undefined,
      voceRendicontoCodice: undefined,
      isGiroconto: true,
      reason: "Giroconto interno (CIRCOLO ACLI)",
    },
  },
  // SumUp payout = giroconto SumUp → BCC. Da contabilizzare solo una volta.
  {
    test: (r) =>
      r.conto === "BCC" && /SUMUP.*PAYOUT/i.test(r.descrizione),
    out: {
      categoriaNome: undefined,
      voceRendicontoCodice: undefined,
      isGiroconto: true,
      reason: "Payout SumUp (giroconto)",
    },
  },

  // ─── Uscite ────────────────────────────────────────────────────────────
  // Utenze (SDD bollette + telco)
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(SORGENIA|ENEL|A2A|HERA|EDISON|ACEA|ITALGAS|TELECOM|TIM SPA|VODAFONE|WINDTRE|FASTWEB)/i.test(
        r.descrizione,
      ),
    out: { categoriaNome: "Utenze", voceRendicontoCodice: "U-A-2", reason: "Utenze (SDD/telco)" },
  },
  // Commissioni bancarie
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(commission|comm\.?\s*bonific|spese tenuta|imposta di bollo)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Altro",
      voceRendicontoCodice: "U-D-1",
      reason: "Commissioni bancarie",
    },
  },
  // Supermercati e cibo → Vitto
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(ITALMARK|IPERCOOP|IN'?S MERCATO|TOSANO|ROSSETTO|CONAD|ESSELUNGA|LIDL|EUROSPIN|PENNY|MD\b|TIGRE|FAMILA|PAM|CARREFOUR|CASA DEL PANE|PASTICCERIA|GIO-CA-FER)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Vitto e ospitalità",
      voceRendicontoCodice: "U-A-2",
      reason: "Acquisto generi alimentari",
    },
  },
  // Cartoleria / materiale didattico (Amazon, Libraccio)
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(LIBRACCIO|FELTRINELLI|MONDADORI|GIUNTI|HOEPLI)/i.test(r.descrizione),
    out: {
      categoriaNome: "Materiale didattico",
      voceRendicontoCodice: "U-A-1",
      reason: "Libreria/didattica",
    },
  },
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(AMAZON|AMZN MKTP|TIGOTA|TIGER\b)/i.test(r.descrizione),
    out: {
      categoriaNome: "Materiale di consumo",
      voceRendicontoCodice: "U-A-1",
      reason: "Acquisto online generico",
    },
  },
  // Bricolage / sport (OBI, Decathlon)
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(OBI\b|LEROY MERLIN|BRICO|DECATHLON|MEDIAWORLD|UNIEURO)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Materiale di consumo",
      voceRendicontoCodice: "U-A-1",
      reason: "Bricolage/sport",
    },
  },
  // Trasporti
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(ITALOTRENO|TRENORD|TRENITALIA|FNM|ATM|MOBIQ|AUTOSTRADE|TELEPASS|ENI STATION|Q8|IP\b|TAMOIL|AGIP)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Trasporti e rimborsi km",
      voceRendicontoCodice: "U-A-2",
      reason: "Trasporti",
    },
  },
  // Servizi professionali / cooperative
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(VIRIDIANA|COOPERATIVA|SOC.?\s*COOP|S\.?C\.?S\.?\b|SOC\.\s*COOPE)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Servizi professionali",
      voceRendicontoCodice: "U-A-2",
      reason: "Servizio da cooperativa",
    },
  },
  // Agenzie viaggi/gite
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(BREVIVET|AGENZIA VIAGGI|ALPITOUR|EDEN VIAGGI)/i.test(r.descrizione),
    out: {
      categoriaNome: "Vitto e ospitalità",
      voceRendicontoCodice: "U-A-2",
      reason: "Gita/viaggio",
    },
  },
  // ACLI nazionale → quote associative
  {
    test: (r) =>
      r.tipo === "Uscita" &&
      /(\bACLI\b\s*APS|ACLI NAZIONALE|ACLI BRESCIA|ACLI LOMBARDIA)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Quote associative",
      voceRendicontoCodice: "U-A-5",
      reason: "Quote ACLI",
    },
  },

  // ─── Entrate ───────────────────────────────────────────────────────────
  // Quote iscrizione bambini: bonifico con menzione di un'attività o di un mese
  {
    test: (r) =>
      r.tipo === "Entrata" &&
      /(DOPOSCUOLA|LABORATORIO|LOCOMOTIVA|ISCRIZIONE|RETTA|MENSILE|MESE\b)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Quote iscrizione",
      voceRendicontoCodice: "E-A-3",
      reason: "Quota iscrizione attività",
    },
  },
  // Donazioni / erogazioni liberali
  {
    test: (r) =>
      r.tipo === "Entrata" &&
      /(DONAZ|EROGAZ|LIBERAL|OFFERTA)/i.test(r.descrizione),
    out: {
      categoriaNome: "Donazioni",
      voceRendicontoCodice: "E-A-4",
      reason: "Donazione",
    },
  },
  // 5x1000
  {
    test: (r) =>
      r.tipo === "Entrata" && /(5\s*X\s*1000|CINQUEPERMILLE)/i.test(r.descrizione),
    out: {
      categoriaNome: "Altro",
      voceRendicontoCodice: "E-A-5",
      reason: "5 per mille",
    },
  },
  // Tesseramenti
  {
    test: (r) =>
      r.tipo === "Entrata" && /TESSER/i.test(r.descrizione),
    out: {
      categoriaNome: "Tesseramenti",
      voceRendicontoCodice: "E-A-1",
      reason: "Tesseramento",
    },
  },
  // Eventi / raccolta fondi
  {
    test: (r) =>
      r.tipo === "Entrata" &&
      /(EVENTO|FESTA|CENA|TOMBOL|LOTTERIA|MERCATIN|BANCHETTO)/i.test(
        r.descrizione,
      ),
    out: {
      categoriaNome: "Eventi",
      voceRendicontoCodice: "E-C-2",
      reason: "Raccolta fondi/evento",
    },
  },
];

export function classifyRow(r: ParsedRow): ClassificationSuggestion {
  for (const rule of RULES) {
    if (rule.test(r)) {
      return {
        categoriaNome: rule.out.categoriaNome,
        voceRendicontoCodice: rule.out.voceRendicontoCodice,
        isGiroconto: rule.out.isGiroconto ?? false,
        reason: rule.out.reason,
      };
    }
  }
  // Fallback: nessun match → categoria "Altro" coerente col segno
  return {
    categoriaNome: "Altro",
    voceRendicontoCodice: r.tipo === "Entrata" ? "E-A-10" : "U-A-5",
    isGiroconto: false,
    reason: "Senza regola, fallback Altro",
  };
}
