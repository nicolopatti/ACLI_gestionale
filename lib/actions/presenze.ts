"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { upsertPresenze } from "@/lib/airtable/presenze";
import { presenzeBatchSchema } from "@/lib/validations/presenza";

async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (!session || (ruolo !== "admin" && ruolo !== "coordinatore_educativo")) {
    throw new Error("Non autorizzato");
  }
  return session;
}

export async function salvaPresenzeAction(formData: FormData) {
  const session = await requireEduOrAdmin();
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

const ORA_RE = /^(\d{2}):(\d{2})$/;

/**
 * Segna la presenza/assenza di un singolo bambino per una data specifica.
 * Usata dal widget "Presenze rapide" del cruscotto. Quando `presente` è
 * `false` rimuove il record (assenza implicita); altrimenti imposta gli
 * orari passati o quelli di default `14:00-18:00`.
 */
export async function segnaPresenzaSingolaAction(input: {
  bambinoId: string;
  data: string;
  sessioneId?: string;
  presente: boolean;
  oraIngresso?: string;
  oraUscita?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  let session;
  try {
    session = await requireEduOrAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!input.bambinoId) return { error: "bambinoId mancante" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) return { error: "Data non valida" };

  const ingresso =
    input.presente
      ? input.oraIngresso && ORA_RE.test(input.oraIngresso)
        ? input.oraIngresso
        : "14:00"
      : undefined;
  const uscita =
    input.presente
      ? input.oraUscita && ORA_RE.test(input.oraUscita)
        ? input.oraUscita
        : "18:00"
      : undefined;

  try {
    await upsertPresenze([
      {
        bambinoId: input.bambinoId,
        sessioneId: input.sessioneId,
        data: input.data,
        oraIngresso: ingresso,
        oraUscita: uscita,
        registratoDaId: session?.user?.recordId,
      },
    ]);
    revalidatePath("/dashboard");
    revalidatePath("/presenze");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
