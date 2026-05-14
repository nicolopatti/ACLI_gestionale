import type { MezzoPagamento } from "@/lib/config";

// SECURITY_PLAN sessione 2: cap descrizione importata. Una riga con
// descrizione patologicamente lunga (megabyte) finirebbe in DB e in
// memoria a ogni listing — qui taglia a 1k caratteri. Cosi' anche il
// fingerprint BCC (che dipende dalla descrizione) resta stabile.
export const MAX_DESCRIZIONE_LEN = 1000;

export function capDescrizione(s: string): string {
  return s.length > MAX_DESCRIZIONE_LEN ? s.slice(0, MAX_DESCRIZIONE_LEN) : s;
}

/** Riga grezza estratta dal parser, prima della dedup e dell'auto-classify. */
export interface ParsedRow {
  /** Indice nella lista originale (per stabilità dell'UI). */
  index: number;
  conto: MezzoPagamento;
  /** Data ISO YYYY-MM-DD usata per la dedup e per `data_movimento`. */
  dataValuta: string;
  /** Solo informativa, se diversa da `dataValuta`. */
  dataContabile?: string;
  /** Importo sempre positivo. Il segno è in `tipo`. */
  importo: number;
  tipo: "Entrata" | "Uscita";
  descrizione: string;
  /** Identificatore univoco riga per dedup re-import. */
  fingerprint: string;
  /** ID nativo della transazione bancaria, se presente (SumUp). */
  riferimentoBanca?: string;
}

export interface ParseResult {
  conto: MezzoPagamento;
  righe: ParsedRow[];
  warnings: string[];
}

export interface ParseError extends Error {
  riga?: number;
  raw?: string;
}
