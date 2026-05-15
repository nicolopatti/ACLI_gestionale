import "server-only";
import type { Movimento } from "@/lib/db/types";
import type { ParsedRow } from "./types";
import {
  findMovimentiByFingerprints,
  findMovimentiForDedup,
} from "@/lib/db/movimenti";
import type { MezzoPagamento } from "@/lib/config";

export type RowStatus = "new" | "match_exact" | "match_partial" | "duplicate";

export interface RowMatch {
  status: RowStatus;
  /** Movimenti già esistenti compatibili con questa riga. */
  candidati: Movimento[];
  /** Match scelto automaticamente (solo per match_exact). */
  scelto?: Movimento;
}

const DEDUP_WINDOW_DAYS = 3;

/**
 * Per ogni ParsedRow ritorna lo stato di dedup:
 * - `duplicate`: fingerprint già importato in passato dallo stesso file.
 * - `match_exact`: trovato 1 movimento candidato con stesso (conto, tipo,
 *   importo) e data entro ±3 giorni.
 * - `match_partial`: trovati N>1 candidati ambigui — richiede scelta utente.
 * - `new`: nessun match, la riga è nuova.
 */
export async function dedupParsedRows(
  conto: MezzoPagamento,
  righe: ParsedRow[],
): Promise<RowMatch[]> {
  if (righe.length === 0) return [];

  // 1. Dedup per fingerprint contro il DB (re-import dello stesso file).
  const fingerprints = righe.map((r) => r.fingerprint);
  const existingByFingerprint = await findMovimentiByFingerprints(
    conto,
    fingerprints,
  );
  const fingerprintMap = new Map(
    existingByFingerprint.map((m) => [m.fingerprintBank, m] as const),
  );

  // 2. Per ogni riga: prima dedup intra-file, poi contro il DB, poi fuzzy
  // match per (conto, tipo, importo, data±3gg). Il check intra-file e'
  // essenziale: lo UNIQUE INDEX `movimenti_fingerprint_bank_uidx` rolla
  // back l'intero batch se anche una sola riga collide. Senza il check,
  // un export con due righe identiche (commissione mensile ripetuta,
  // riga duplicata da bug dell'export, ecc.) farebbe fallire la conferma
  // con il messaggio generico "Errore durante l'operazione".
  const seenInFile = new Set<string>();
  const results: RowMatch[] = [];
  for (const r of righe) {
    if (seenInFile.has(r.fingerprint)) {
      results.push({ status: "duplicate", candidati: [] });
      continue;
    }
    seenInFile.add(r.fingerprint);
    const fpHit = fingerprintMap.get(r.fingerprint);
    if (fpHit) {
      results.push({ status: "duplicate", candidati: [fpHit] });
      continue;
    }
    const candidati = await findMovimentiForDedup({
      conto,
      tipo: r.tipo,
      importo: r.importo,
      dataMin: shiftDate(r.dataValuta, -DEDUP_WINDOW_DAYS),
      dataMax: shiftDate(r.dataValuta, +DEDUP_WINDOW_DAYS),
    });
    if (candidati.length === 0) {
      results.push({ status: "new", candidati: [] });
    } else if (candidati.length === 1) {
      results.push({
        status: "match_exact",
        candidati,
        scelto: candidati[0],
      });
    } else {
      results.push({ status: "match_partial", candidati });
    }
  }

  return results;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
