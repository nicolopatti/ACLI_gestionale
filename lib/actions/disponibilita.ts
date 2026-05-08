"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { disponibilitaBatchSchema } from "@/lib/validations/disponibilita";
import { replaceDisponibilita } from "@/lib/airtable/disponibilita";
import { getEducatore } from "@/lib/airtable/educatori";
import type { FasciaDisponibilita } from "@/lib/config";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

/**
 * Riceve dalla form i checkbox "slot_<data>_<fascia>" e li converte in una
 * lista di slot, poi sincronizza la tabella `Disponibilita` per quel mese.
 */
export async function salvaDisponibilitaAction(formData: FormData) {
  await requireAdmin();
  const educatoreId = String(formData.get("educatoreId") ?? "");
  const meseAnno = String(formData.get("meseAnno") ?? "");

  const slots: Array<{ data: string; fasciaOraria: FasciaDisponibilita }> = [];
  for (const key of formData.keys()) {
    if (!key.startsWith("slot_")) continue;
    const value = formData.get(key);
    if (value !== "on" && value !== "true") continue;
    const parts = key.slice(5).split("__");
    if (parts.length !== 2) continue;
    slots.push({
      data: parts[0],
      fasciaOraria: parts[1] as FasciaDisponibilita,
    });
  }

  const parsed = disponibilitaBatchSchema.safeParse({
    educatoreId,
    meseAnno,
    slots,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const educatore = await getEducatore(educatoreId);
  if (!educatore) return { error: "Educatore non trovato" };

  await replaceDisponibilita(
    educatoreId,
    educatore.nomeCompleto,
    meseAnno,
    parsed.data.slots,
  );
  revalidatePath(`/educatori/${educatoreId}`);
  return { ok: true };
}
