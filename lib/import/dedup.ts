import "server-only";
import type { Movimento } from "@/lib/airtable/types";
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

  // 1. Dedup per fingerprint (re-import dello stesso file).
  const fingerprints = righe.map((r) => r.fingerprint);
  const existingByFingerprint = await findMovimentiByFingerprints(
    conto,
    fingerprints,
  );
  const fingerprintMap = new Map(
    existingByFingerprint.map((m) => [m.fingerprintBank, m] as const),
  );

  // 2. Per ogni riga non-duplicate, lookup per (conto, tipo, importo, data±3gg).
  const results: RowMatch[] = [];
  for (const r of righe) {
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
