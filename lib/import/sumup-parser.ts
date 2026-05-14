import { capDescrizione, type ParsedRow, type ParseResult } from "./types";

/**
 * Parser del "Resoconto transazioni" di SumUp.
 *
 * Formato osservato:
 * - CSV con separatore `,`, encoding UTF-8.
 * - Date ISO `YYYY-MM-DD`.
 * - Importi con punto decimale, negativi per uscite.
 * - Header: `Data transazione,Codice transazione,Riferimento,Importo,Saldo disponibile`.
 * - "Codice transazione" è univoco per design → fingerprint nativo.
 */

const HEADER_KEYS = [
  "data transazione",
  "codice transazione",
  "riferimento",
  "importo",
];

export function parseSumupCsv(content: string): ParseResult {
  const warnings: string[] = [];
  const text = content.replace(/^﻿/, "");
  const rows = splitCsv(text);
  if (rows.length === 0) {
    return { conto: "Sumup", righe: [], warnings: ["File vuoto"] };
  }
  const header = rows[0].map((c) => c.trim().toLowerCase());
  for (const k of HEADER_KEYS) {
    if (!header.includes(k)) {
      throw new Error(
        `Header SumUp non riconosciuto: manca "${k}". Trovate: ${header.join(", ")}`,
      );
    }
  }
  const idx = {
    data: header.indexOf("data transazione"),
    codice: header.indexOf("codice transazione"),
    riferimento: header.indexOf("riferimento"),
    importo: header.indexOf("importo"),
  };

  const righe: ParsedRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length === 0 || (cols.length === 1 && cols[0].trim() === "")) {
      continue;
    }
    try {
      const dataIso = cols[idx.data].trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
        throw new Error(`data non valida "${dataIso}"`);
      }
      const codice = cols[idx.codice].trim();
      if (!codice) throw new Error("codice transazione mancante");
      const importoSigned = parseImportoUs(cols[idx.importo]);
      const tipo: "Entrata" | "Uscita" =
        importoSigned < 0 ? "Uscita" : "Entrata";
      const descrizione = capDescrizione(
        normalizeWhitespace(cols[idx.riferimento] ?? ""),
      );

      righe.push({
        index: righe.length,
        conto: "Sumup",
        dataValuta: dataIso,
        importo: Math.abs(importoSigned),
        tipo,
        descrizione: descrizione || codice,
        fingerprint: `sumup:${codice}`,
        riferimentoBanca: codice,
      });
    } catch (err) {
      warnings.push(`Riga ${i + 1} non parsabile: ${(err as Error).message}`);
    }
  }

  return { conto: "Sumup", righe, warnings };
}

function parseImportoUs(s: string): number {
  const t = s.trim().replace(",", "");
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) throw new Error(`importo non valido "${s}"`);
  return n;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * CSV split che rispetta i campi quotati con virgolette doppie e gli escape `""`.
 * Mantiene CRLF/LF dentro le quotes.
 */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cur.push(field);
        field = "";
      } else if (ch === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (ch === "\r") {
        // ignora, gestito dal successivo \n o riga finale
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim()));
}
