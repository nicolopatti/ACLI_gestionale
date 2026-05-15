"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { parseBccTsv } from "@/lib/import/bcc-parser";
import { parseSumupCsv } from "@/lib/import/sumup-parser";
import { dedupParsedRows, type RowMatch } from "@/lib/import/dedup";
import { classifyRow } from "@/lib/import/auto-classify";
import {
  createMovimentiBatch,
  type CreaMovimentoInput,
} from "@/lib/db/movimenti";
import { logAudit } from "@/lib/db/audit-log";
import type { MezzoPagamento } from "@/lib/config";
import type { ParsedRow } from "@/lib/import/types";
import { BusinessError, userErrorMessage } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") {
    throw new BusinessError("Non autorizzato");
  }
  return session.user;
}

// SECURITY_PLAN sessione 2: client-side guard a 5 MB e' bypassabile via
// curl/devtools, qui taglia hard. 6 MB lascia margine per encoding multibyte.
const MAX_FILE_TEXT_SIZE = 6 * 1024 * 1024;

/**
 * Sniff del formato dal contenuto del file, indipendentemente dal `conto`
 * scelto dall'utente. L'auto-detect lato client si basa sul nome del file
 * ed e' fragile (es. "export (2)" senza estensione → resta sul conto
 * precedente, magari quello sbagliato). Qui leggiamo la prima riga del
 * contenuto e capiamo davvero che parser usare.
 *
 * - BCC: header TSV con "Data contabile" / "Data valuta".
 * - SumUp: header CSV con "Codice transazione" / "Data transazione".
 */
function detectContoFromContent(text: string): MezzoPagamento | null {
  const first = text
    .replace(/^﻿/, "")
    .split(/\r?\n/, 1)[0]
    ?.toLowerCase() ?? "";
  if (first.includes("data contabile") || first.includes("data valuta")) {
    return "BCC";
  }
  if (
    first.includes("codice transazione") ||
    first.includes("data transazione")
  ) {
    return "Sumup";
  }
  return null;
}

export interface ParseAndDedupResult {
  ok: true;
  conto: MezzoPagamento;
  righe: ParsedRow[];
  matches: RowMatch[];
  suggerimenti: Array<{
    categoriaNome?: string;
    voceRendicontoCodice?: string;
    isGiroconto: boolean;
    reason: string;
  }>;
  warnings: string[];
}

export interface ParseAndDedupError {
  ok: false;
  error: string;
}

export async function parseEstrattoContoAction(
  conto: MezzoPagamento,
  fileText: string,
): Promise<ParseAndDedupResult | ParseAndDedupError> {
  try {
    await requireAdmin();
    if (fileText.length > MAX_FILE_TEXT_SIZE) {
      return {
        ok: false,
        error: `File troppo grande (max ${MAX_FILE_TEXT_SIZE / 1024 / 1024} MB).`,
      };
    }

    // Server-side content-based detection: ignora la selezione dell'utente
    // se il contenuto del file dice chiaramente che parser usare. Cosi'
    // l'utente non resta bloccato su "Sumup selezionato per un file BCC".
    // Se il detection fallisce, usa la selezione utente come fallback.
    const detected = detectContoFromContent(fileText);
    const finalConto: MezzoPagamento = detected ?? conto;
    const warningsExtra: string[] = [];
    if (detected && detected !== conto) {
      warningsExtra.push(
        `Selezione "${conto}" sovrascritta: il file sembra un export ${detected}.`,
      );
    }

    const parsed =
      finalConto === "BCC" ? parseBccTsv(fileText) : parseSumupCsv(fileText);

    const matches = await dedupParsedRows(finalConto, parsed.righe);
    const suggerimenti = parsed.righe.map((r) => classifyRow(r));

    return {
      ok: true,
      conto: finalConto,
      righe: parsed.righe,
      matches,
      suggerimenti,
      warnings: [...warningsExtra, ...parsed.warnings],
    };
  } catch (err) {
    console.error("[parseEstrattoContoAction]", err);
    return { ok: false, error: userErrorMessage(err, "Errore durante l'operazione") };
  }
}

export interface ConfermaImportInput {
  conto: MezzoPagamento;
  righe: Array<{
    dataValuta: string;
    tipo: "Entrata" | "Uscita";
    importo: number;
    descrizione: string;
    fingerprint: string;
    categoriaId?: string;
    voceRendicontoId?: string;
    isGiroconto: boolean;
    note?: string;
  }>;
}

export interface ConfermaImportResult {
  ok: boolean;
  inserted: number;
  error?: string;
}

export async function confermaImportAction(
  input: ConfermaImportInput,
): Promise<ConfermaImportResult> {
  try {
    const user = await requireAdmin();
    if (input.righe.length === 0) {
      return { ok: true, inserted: 0 };
    }
    const inputs: CreaMovimentoInput[] = input.righe.map((r) => ({
      tipo: r.tipo,
      importo: r.importo,
      conto: input.conto,
      dataMovimento: r.dataValuta,
      descrizione: r.descrizione,
      categoriaId: r.categoriaId,
      voceRendicontoId: r.voceRendicontoId,
      isGiroconto: r.isGiroconto,
      fingerprintBank: r.fingerprint,
      origine: "bank_import",
      volontario: user.nome,
      note: r.note,
    }));
    const created = await createMovimentiBatch(inputs);
    await logAudit({
      userId: user.recordId,
      userEmail: user.email,
      action: "movimenti.bulk_import",
      entityType: "movimento",
      diff: {
        conto: input.conto,
        righeProposte: input.righe.length,
        inserite: created.length,
      },
    });
    revalidatePath("/cassa");
    revalidatePath("/rendiconto");
    return { ok: true, inserted: created.length };
  } catch (err) {
    console.error("[confermaImportAction]", err);
    return { ok: false,
      inserted: 0,
      error: userErrorMessage(err, "Errore durante l'operazione") };
  }
}
