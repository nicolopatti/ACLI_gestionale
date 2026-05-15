import { createHash } from "node:crypto";
import { BusinessError } from "@/lib/errors";
import { capDescrizione, type ParsedRow, type ParseResult } from "./types";

/**
 * Parser dell'export "Resoconto transazioni" della BCC.
 *
 * Formato osservato:
 * - TSV con estensione `.xls` (il browser lo apre con Excel ma è testo tab-separated).
 * - Encoding UTF-8 (eventualmente con BOM).
 * - Line endings CRLF (`\r\n`), tolleranti a LF.
 * - Header: `Data contabile\tData valuta\tImporto\tDescrizione` (la colonna
 *   `Note` era presente in vecchie versioni — ora non c'e' piu', resta
 *   opzionale).
 * - Date: `dd/mm/yyyy`.
 * - Importi: virgola decimale, eventuale separatore migliaia con punto (es. `-2.918,49`).
 * - Segno: negativo per uscite, positivo per entrate.
 * - Righe di sommario tipo `15/05/2026\t\t2.177,37\tSaldo finale al ...`
 *   (data valuta vuota) vengono ignorate senza warning.
 */

const HEADER_REQUIRED = [
  "data contabile",
  "data valuta",
  "importo",
  "descrizione",
];

export function parseBccTsv(content: string): ParseResult {
  const warnings: string[] = [];
  // strip BOM
  const text = content.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { conto: "BCC", righe: [], warnings: ["File vuoto"] };
  }

  // Sniff binari Excel/altro: file `.xls` riaperti e salvati con Excel
  // diventano binari .xlsx (firma PK\x03\x04) o vecchio .xls (D0CF11E0...)
  // — il `.text()` lato browser restituirebbe solo gibberish con header
  // illeggibile. Diamo un messaggio chiaro invece del generico.
  const first2 = text.slice(0, 2);
  if (first2 === "PK" || /^\xd0\xcf/.test(first2)) {
    throw new BusinessError(
      "Il file sembra essere un Excel binario (xlsx/xls), non un TSV. Riscarica l'estratto conto dalla BCC senza aprirlo in Excel.",
    );
  }

  const headerCols = lines[0].split("\t").map((c) => c.trim().toLowerCase());
  const missing = HEADER_REQUIRED.filter((k) => !headerCols.includes(k));
  if (missing.length > 0) {
    throw new BusinessError(
      `Il file non sembra un export BCC: colonne mancanti (${missing.join(", ")}). Verifica di aver selezionato il conto giusto e di aver scaricato il "Resoconto transazioni" TSV.`,
    );
  }
  const idx = {
    dataContabile: headerCols.indexOf("data contabile"),
    dataValuta: headerCols.indexOf("data valuta"),
    importo: headerCols.indexOf("importo"),
    descrizione: headerCols.indexOf("descrizione"),
    note: headerCols.indexOf("note"), // -1 se la colonna non c'e'
  };
  const minColsNeeded = Math.max(
    idx.dataContabile,
    idx.dataValuta,
    idx.importo,
    idx.descrizione,
  ) + 1;

  const righe: ParsedRow[] = [];
  // Per ogni chiave `(dataValuta, importoSigned, descrizione)` teniamo il
  // contatore delle occorrenze viste finora nel file. Due righe legittime
  // identiche (es. 5 commissioni POS da 1,50€ nello stesso giorno) sono
  // perfettamente reali su BCC: senza un contatore in fingerprint, lo
  // UNIQUE INDEX `(conto, fingerprint_bank)` farebbe fallire l'insert
  // batch. La 1a occorrenza usa l'hash storico (no suffisso) per non
  // invalidare i fingerprint gia' in DB; dalla 2a in poi si aggiunge
  // `|#N`. L'ordine di apparizione nel file BCC e' stabile (sort per
  // data crescente), quindi re-importare lo stesso file produce gli
  // stessi fingerprint → dedup contro DB intercetta i re-import.
  const occurrenceByKey = new Map<string, number>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < minColsNeeded) {
      warnings.push(`Riga ${i + 1} ignorata (colonne insufficienti)`);
      continue;
    }
    // Righe di sommario (es. "Saldo finale al ...") hanno data_valuta vuota
    // e non sono transazioni. Vanno skippate silenziosamente.
    if (!cols[idx.dataValuta]?.trim()) continue;
    try {
      const dataValuta = parseDateIt(cols[idx.dataValuta]);
      const dataContabile = parseDateIt(cols[idx.dataContabile]);
      const importoRaw = cols[idx.importo].trim();
      const importoSigned = parseImportoIt(importoRaw);
      const noteCol = idx.note >= 0 ? cols[idx.note] : undefined;
      const descrizione = capDescrizione(
        normalizeWhitespace(cols[idx.descrizione]) +
          (noteCol && noteCol.trim()
            ? ` | ${normalizeWhitespace(noteCol)}`
            : ""),
      );

      const tipo: "Entrata" | "Uscita" = importoSigned < 0 ? "Uscita" : "Entrata";
      const importo = Math.abs(importoSigned);

      const key = `${dataValuta}|${importoSigned.toFixed(2)}|${descrizione.toLowerCase()}`;
      const occurrence = occurrenceByKey.get(key) ?? 0;
      occurrenceByKey.set(key, occurrence + 1);

      righe.push({
        index: righe.length,
        conto: "BCC",
        dataValuta,
        dataContabile: dataContabile !== dataValuta ? dataContabile : undefined,
        importo,
        tipo,
        descrizione,
        fingerprint: bccFingerprint(
          dataValuta,
          importoSigned,
          descrizione,
          occurrence,
        ),
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
  occurrence: number,
): string {
  const base = `bcc|${dataValuta}|${importoSigned.toFixed(2)}|${descrizione.toLowerCase()}`;
  // Retrocompat: la 1a occorrenza mantiene l'hash storico (i record in DB
  // pre-PR-fix sono nati senza suffisso). Solo dalla 2a in poi appendiamo
  // `|#N` per garantire unicita' su righe identiche legittime.
  const normalized = occurrence === 0 ? base : `${base}|#${occurrence}`;
  return createHash("sha1").update(normalized).digest("hex");
}
