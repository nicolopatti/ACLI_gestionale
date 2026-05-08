"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { upsertPresenze } from "@/lib/airtable/presenze";
import { presenzeBatchSchema } from "@/lib/validations/presenza";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
  return session;
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
