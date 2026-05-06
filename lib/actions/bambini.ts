"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { bambinoSchema } from "@/lib/validations/bambino";
import {
  createBambino as createBambinoAt,
  deleteBambino as deleteBambinoAt,
  updateBambino as updateBambinoAt,
} from "@/lib/airtable/bambini";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

export async function createBambinoAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = bambinoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const created = await createBambinoAt({
    nome: d.nome,
    cognome: d.cognome,
    genitoreId: d.genitoreId,
    dataNascita: d.dataNascita || undefined,
    scuola: d.scuola || undefined,
    classe: d.classe || undefined,
    note: d.note || undefined,
    attivo: d.attivo,
  });
  revalidatePath("/bambini");
  redirect(`/bambini/${created.recordId}`);
}

export async function updateBambinoAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();
  const parsed = bambinoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateBambinoAt(recordId, {
    nome: d.nome,
    cognome: d.cognome,
    genitore: [d.genitoreId],
    data_nascita: d.dataNascita || "",
    scuola: d.scuola || "",
    classe: d.classe || "",
    note: d.note || "",
    attivo: d.attivo,
  });
  revalidatePath("/bambini");
  revalidatePath(`/bambini/${recordId}`);
  return { ok: true };
}

export async function deleteBambinoAction(recordId: string) {
  await requireAdmin();
  await deleteBambinoAt(recordId);
  revalidatePath("/bambini");
  redirect("/bambini");
}
