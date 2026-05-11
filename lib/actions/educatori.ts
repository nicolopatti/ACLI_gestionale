"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { educatoreSchema } from "@/lib/validations/educatore";
import {
  createEducatore,
  deleteEducatore,
  updateEducatore,
} from "@/lib/db/educatori";
import {
  deleteDisponibilitaByEducatore,
  listDisponibilitaByEducatore,
} from "@/lib/db/disponibilita";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

function parseEducatoreForm(formData: FormData) {
  return {
    nome: formData.get("nome"),
    cognome: formData.get("cognome"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    note: formData.get("note"),
    attivo:
      formData.get("attivo") === "on" ||
      formData.get("attivo") === "true" ||
      formData.get("attivo") === null,
  };
}

export async function createEducatoreAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = educatoreSchema.safeParse(parseEducatoreForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const created = await createEducatore({
    nome: d.nome,
    cognome: d.cognome,
    email: d.email || undefined,
    telefono: d.telefono || undefined,
    note: d.note || undefined,
    attivo: d.attivo,
  });
  revalidatePath("/educatori");
  redirect(`/educatori/${created.recordId}`);
}

export async function updateEducatoreAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();
  const parsed = educatoreSchema.safeParse(parseEducatoreForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateEducatore(recordId, {
    nome: d.nome,
    cognome: d.cognome,
    email: d.email || undefined,
    telefono: d.telefono || undefined,
    note: d.note || undefined,
    attivo: d.attivo,
  });
  revalidatePath("/educatori");
  revalidatePath(`/educatori/${recordId}`);
  return { ok: true };
}

/**
 * Conta le disponibilità collegate che verranno cascadeate cancellando
 * l'educatore. Senza questa cascade i turni mostrano avatar "??" perché
 * il link è rotto.
 */
export async function getDeleteEducatoreImpactAction(
  recordId: string,
): Promise<{ disponibilita: number }> {
  await requireAdmin();
  const dispo = await listDisponibilitaByEducatore(recordId);
  return { disponibilita: dispo.length };
}

export async function deleteEducatoreAction(recordId: string) {
  await requireAdmin();
  await deleteDisponibilitaByEducatore(recordId);
  await deleteEducatore(recordId);
  revalidatePath("/educatori");
  revalidatePath("/turni");
  redirect("/educatori");
}
