import { createHash } from "node:crypto";
import type { ParsedRow, ParseResult } from "./types";

/**
 * Parser dell'export "Resoconto transazioni" della BCC.
 *
 * Formato osservato:
 * - TSV con estensione `.xls` (il browser lo apre con Excel ma è testo tab-separated).
 * - Encoding UTF-8 (eventualmente con BOM).
 * - Line endings CRLF (`\r\n`), tolleranti a LF.
 * - Header: `Data contabile\tData valuta\tImporto\tDescrizione\tNote`.
 * - Date: `dd/mm/yyyy`.
 * - Importi: virgola decimale, eventuale separatore migliaia con punto (es. `-2.918,49`).
 * - Segno: negativo per uscite, positivo per entrate.
 */

const HEADER_KEYS = [
  "data contabile",
  "data valuta",
  "importo",
  "descrizione",
  "note",
];

export function parseBccTsv(content: string): ParseResult {
  const warnings: string[] = [];
  // strip BOM
  const text = content.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { conto: "BCC", righe: [], warnings: ["File vuoto"] };
  }

  const headerCols = lines[0].split("\t").map((c) => c.trim().toLowerCase());
  for (const k of HEADER_KEYS) {
    if (!headerCols.includes(k)) {
      throw new Error(
        `Header BCC non riconosciuto: manca la colonna "${k}". Trovate: ${headerCols.join(", ")}`,
      );
    }
  }
  const idx = {
    dataContabile: headerCols.indexOf("data contabile"),
    dataValuta: headerCols.indexOf("data valuta"),
    importo: headerCols.indexOf("importo"),
    descrizione: headerCols.indexOf("descrizione"),
    note: headerCols.indexOf("note"),
  };

  const righe: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < HEADER_KEYS.length) {
      warnings.push(`Riga ${i + 1} ignorata (colonne insufficienti)`);
      continue;
    }
    try {
      const dataValuta = parseDateIt(cols[idx.dataValuta]);
      const dataContabile = parseDateIt(cols[idx.dataContabile]);
      const importoRaw = cols[idx.importo].trim();
      const importoSigned = parseImportoIt(importoRaw);
      const descrizione =
        normalizeWhitespace(cols[idx.descrizione]) +
        (cols[idx.note] && cols[idx.note].trim()
          ? ` | ${normalizeWhitespace(cols[idx.note])}`
          : "");

      const tipo: "Entrata" | "Uscita" = importoSigned < 0 ? "Uscita" : "Entrata";
      const importo = Math.abs(importoSigned);

      righe.push({
        index: righe.length,
        conto: "BCC",
        dataValuta,
        dataContabile: dataContabile !== dataValuta ? dataContabile : undefined,
        importo,
        tipo,
        descrizione,
        fingerprint: bccFingerprint(dataValuta, importoSigned, descrizione),
      });
    } catch (err) {
      warnings.push(
        `Riga ${i + 1} non parsabile: ${(err as Error).message}`,
      );
    }
  }

  return { conto: "BCC", righe, warnings };
}

function parseDateIt(s: string): string {
  const t = s.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) throw new Error(`data non valida "${t}"`);
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

function parseImportoIt(s: string): number {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) throw new Error(`importo non valido "${s}"`);
  return n;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function bccFingerprint(
  dataValuta: string,
  importoSigned: number,
  descrizione: string,
): string {
  const normalized = `bcc|${dataValuta}|${importoSigned.toFixed(2)}|${descrizione.toLowerCase()}`;
  return createHash("sha1").update(normalized).digest("hex");
}
