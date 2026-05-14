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
import type { MezzoPagamento } from "@/lib/config";
import type { ParsedRow } from "@/lib/import/types";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") {
    throw new Error("Non autorizzato");
  }
  return session.user;
}

// SECURITY_PLAN sessione 2: client-side guard a 5 MB e' bypassabile via
// curl/devtools, qui taglia hard. 6 MB lascia margine per encoding multibyte.
const MAX_FILE_TEXT_SIZE = 6 * 1024 * 1024;

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
    const parsed =
      conto === "BCC" ? parseBccTsv(fileText) : parseSumupCsv(fileText);

    const matches = await dedupParsedRows(conto, parsed.righe);
    const suggerimenti = parsed.righe.map((r) => classifyRow(r));

    return {
      ok: true,
      conto,
      righe: parsed.righe,
      matches,
      suggerimenti,
      warnings: parsed.warnings,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
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
    revalidatePath("/cassa");
    revalidatePath("/rendiconto");
    return { ok: true, inserted: created.length };
  } catch (err) {
    return {
      ok: false,
      inserted: 0,
      error: (err as Error).message,
    };
  }
}
