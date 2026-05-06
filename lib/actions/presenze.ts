"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { upsertPresenze } from "@/lib/airtable/presenze";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
  return session;
}

export async function salvaPresenzeAction(formData: FormData) {
  const session = await requireAdmin();
  const data = String(formData.get("data") ?? "");
  if (!data) return { error: "Data mancante" };
  const presentiSet = new Set(formData.getAll("presenti").map(String));

  // Tutte le coppie bambinoId|iscrizioneId arrivano nascoste come "candidati[]"
  const candidati = formData.getAll("candidati").map(String);
  const input = candidati.map((c) => {
    const [bambinoId, iscrizioneId] = c.split("|");
    return {
      bambinoId,
      iscrizioneId: iscrizioneId || undefined,
      data,
      presente: presentiSet.has(bambinoId),
      registratoDaId: session.user?.recordId,
    };
  });
  await upsertPresenze(input);
  revalidatePath("/presenze");
  return { ok: true };
}
