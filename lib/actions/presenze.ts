"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { setPresenza, upsertPresenze } from "@/lib/db/presenze";
import { oraSchema, presenzeBatchSchema } from "@/lib/validations/presenza";
import { BusinessError, userErrorMessage } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new BusinessError("Non autorizzato");
  return session;
}

/**
 * Toggle singolo: registra "presente" o "assente" per un bambino in una data
 * specifica, con ore opzionali. Se `presente` è null, cancella la presenza.
 */
export async function setPresenzaAction(input: {
  bambinoId: string;
  sessioneId?: string;
  data: string;
  presente: boolean | null;
  oraIngresso?: string;
  oraUscita?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    console.error("[setPresenzaAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'operazione") };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) {
    return { error: "Data non valida" };
  }
  if (!input.bambinoId) return { error: "Bambino mancante" };

  const oraIngressoParsed = oraSchema.safeParse(input.oraIngresso ?? "");
  const oraUscitaParsed = oraSchema.safeParse(input.oraUscita ?? "");
  if (!oraIngressoParsed.success || !oraUscitaParsed.success) {
    return { error: "Formato orario non valido (HH:MM)" };
  }

  try {
    await setPresenza({
      bambinoId: input.bambinoId,
      sessioneId: input.sessioneId,
      data: input.data,
      // null = cancella record (vecchio comportamento "assenza implicita")
      presente: input.presente ?? undefined,
      oraIngresso: input.oraIngresso || undefined,
      oraUscita: input.oraUscita || undefined,
      registratoDaId: session.user?.recordId,
    });
  } catch (e) {
    console.error("[setPresenzaAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
  revalidatePath("/presenze");
  return { ok: true };
}

export async function salvaPresenzeAction(formData: FormData) {
  const session = await requireAdmin();
  const data = String(formData.get("data") ?? "");
  const attivitaId = String(formData.get("attivitaId") ?? "");

  // Tutte le coppie bambinoId|sessioneId arrivano nascoste come "candidati[]"
  const candidati = formData.getAll("candidati").map(String);
  const righe = candidati.map((c) => {
    const [bambinoId, sessioneId] = c.split("|");
    return {
      bambinoId,
      sessioneId: sessioneId || "",
      oraIngresso: String(formData.get(`oraIngresso_${bambinoId}`) ?? "").trim(),
      oraUscita: String(formData.get(`oraUscita_${bambinoId}`) ?? "").trim(),
    };
  });

  const parsed = presenzeBatchSchema.safeParse({
    data,
    attivitaId,
    righe: righe.map(({ bambinoId, oraIngresso, oraUscita }) => ({
      bambinoId,
      oraIngresso: oraIngresso || "",
      oraUscita: oraUscita || "",
    })),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const input = righe.map((r) => ({
    bambinoId: r.bambinoId,
    sessioneId: r.sessioneId || undefined,
    data,
    oraIngresso: r.oraIngresso || undefined,
    oraUscita: r.oraUscita || undefined,
    registratoDaId: session.user?.recordId,
  }));
  await upsertPresenze(input);
  revalidatePath("/presenze");
  return { ok: true };
}
