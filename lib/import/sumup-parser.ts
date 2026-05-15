import { BusinessError } from "@/lib/errors";
import { capDescrizione, type ParsedRow, type ParseResult } from "./types";

/**
 * Parser dei due formati noti dell'export "Resoconto transazioni" di SumUp:
 *
 * 1. **Legacy / payments-only**: CSV con separatore `,`, 5 colonne
 *    (`Data transazione,Codice transazione,Riferimento,Importo,Saldo disponibile`),
 *    date ISO `YYYY-MM-DD`, importi con segno (negativi = uscite).
 *
 * 2. **Business Account (esteso)**: CSV con separatore `;`, 15 colonne
 *    (`Data transazione;Codice transazione;Tipo transazione;Riferimento;
 *    Causale pagamento;Stato;Importo di fatturazione in uscita;...;Saldo
 *    disponibile`), date `dd/MM/yyyy` seguite da orario `hh:mm` in un campo
 *    separato (per via del `;` interno alla data esportata), importi sempre
 *    positivi separati su due colonne (uscita / entrata).
 *
 * In entrambi i casi il `Codice transazione` e' univoco per design → e' il
 * fingerprint nativo (`sumup:<codice>`), stabile fra reimport.
 */

const LEGACY_HEADER_KEYS = [
  "data transazione",
  "codice transazione",
  "riferimento",
  "importo",
];

const EXTENDED_HEADER_KEYS = [
  "data transazione",
  "codice transazione",
  "tipo transazione",
  "importo di fatturazione in uscita",
  "importo di fatturazione in entrata",
];

export function parseSumupCsv(content: string): ParseResult {
  const text = content.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (semis > commas) {
    return parseSumupExtendedCsv(text);
  }
  return parseSumupLegacyCsv(text);
}

function parseSumupLegacyCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const rows = splitCsv(text, ",");
  if (rows.length === 0) {
    return { conto: "Sumup", righe: [], warnings: ["File vuoto"] };
  }
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const missing = LEGACY_HEADER_KEYS.filter((k) => !header.includes(k));
  if (missing.length > 0) {
    throw new BusinessError(
      `Il file non sembra un export SumUp: colonne mancanti (${missing.join(", ")}). Verifica di aver selezionato il conto giusto e di aver scaricato il "Resoconto transazioni" CSV.`,
    );
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

/**
 * Parser per il formato esteso del SumUp Business Account. Il file ha un
 * trailing `;` ad ogni riga (sia header che dati): lo splitter restituisce
 * una cella vuota in coda, qui la rimuoviamo. Inoltre alcuni export inseriscono
 * l'orario come campo separato dopo la data (per via di un `;` interno alla
 * data esportata) — lo si rileva sulla prima riga di dati e si applica un
 * offset di +1 a tutti gli indici colonna dopo la data.
 */
function parseSumupExtendedCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const rawRows = splitCsv(text, ";");
  const rows = rawRows.map((r) => stripTrailingEmpty(r));
  if (rows.length === 0) {
    return { conto: "Sumup", righe: [], warnings: ["File vuoto"] };
  }
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const missing = EXTENDED_HEADER_KEYS.filter((k) => !header.includes(k));
  if (missing.length > 0) {
    throw new BusinessError(
      `Il file non sembra un export SumUp: colonne mancanti (${missing.join(", ")}). Verifica di aver scaricato il "Resoconto transazioni" CSV dal SumUp Business Account.`,
    );
  }

  let dateTimeSplit = false;
  for (let i = 1; i < rows.length; i++) {
    const sample = rows[i];
    if (sample.length <= 1) continue;
    const c0 = (sample[0] ?? "").trim();
    const c1 = (sample[1] ?? "").trim();
    if (
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(c0) &&
      /^\d{1,2}:\d{2}(:\d{2})?$/.test(c1)
    ) {
      dateTimeSplit = true;
    }
    break;
  }
  const offset = dateTimeSplit ? 1 : 0;

  const dataIdx = (key: string): number => {
    const hi = header.indexOf(key);
    if (hi < 0) return -1;
    if (hi === 0) return 0;
    return hi + offset;
  };

  const COL = {
    data: dataIdx("data transazione"),
    codice: dataIdx("codice transazione"),
    tipo: dataIdx("tipo transazione"),
    riferimento: dataIdx("riferimento"),
    causale: dataIdx("causale pagamento"),
    impFattUscita: dataIdx("importo di fatturazione in uscita"),
    impFattEntrata: dataIdx("importo di fatturazione in entrata"),
  };

  const righe: ParsedRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length === 0 || (cols.length === 1 && cols[0].trim() === "")) {
      continue;
    }
    try {
      const dataIso = parseItalianDate((cols[COL.data] ?? "").trim());
      if (!dataIso) {
        throw new Error(`data non valida "${cols[COL.data] ?? ""}"`);
      }
      const codice = (cols[COL.codice] ?? "").trim();
      if (!codice) throw new Error("codice transazione mancante");
      const usc = parseImportoUs(cols[COL.impFattUscita] ?? "0");
      const ent = parseImportoUs(cols[COL.impFattEntrata] ?? "0");
      const importo = usc > 0 ? usc : ent;
      if (!(importo > 0)) {
        throw new Error("importo zero o non valido");
      }
      const tipo: "Entrata" | "Uscita" = usc > 0 ? "Uscita" : "Entrata";

      const tipoT = normalizeWhitespace(cols[COL.tipo] ?? "");
      const riferimento = normalizeWhitespace(cols[COL.riferimento] ?? "");
      const causale = normalizeWhitespace(cols[COL.causale] ?? "");
      const descrParts = [tipoT, riferimento, causale].filter(Boolean);
      const descrizione = capDescrizione(descrParts.join(" - ") || codice);

      righe.push({
        index: righe.length,
        conto: "Sumup",
        dataValuta: dataIso,
        importo,
        tipo,
        descrizione,
        fingerprint: `sumup:${codice}`,
        riferimentoBanca: codice,
      });
    } catch (err) {
      warnings.push(`Riga ${i + 1} non parsabile: ${(err as Error).message}`);
    }
  }

  return { conto: "Sumup", righe, warnings };
}

function parseItalianDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function stripTrailingEmpty(row: string[]): string[] {
  const out = [...row];
  while (out.length > 0 && out[out.length - 1].trim() === "") {
    out.pop();
  }
  return out;
}

function parseImportoUs(s: string): number {
  const t = s.trim().replace(/,/g, "");
  if (t === "") return 0;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) throw new Error(`importo non valido "${s}"`);
  return n;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * CSV split che rispetta i campi quotati con virgolette doppie e gli escape `""`.
 * Mantiene CRLF/LF dentro le quotes. Il separatore e' parametrizzato (`,` per
 * il formato legacy, `;` per quello esteso).
 */
function splitCsv(text: string, separator: string): string[][] {
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
      } else if (ch === separator) {
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
