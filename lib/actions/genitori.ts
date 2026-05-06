"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { genitoreSchema } from "@/lib/validations/genitore";
import {
  createGenitore as createGenitoreAt,
  deleteGenitore as deleteGenitoreAt,
  updateGenitore as updateGenitoreAt,
} from "@/lib/airtable/genitori";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") {
    throw new Error("Non autorizzato");
  }
}

export async function createGenitoreAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = genitoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const data = parsed.data;
  const created = await createGenitoreAt({
    nome: data.nome,
    cognome: data.cognome,
    telefono: data.telefono || undefined,
    email: data.email || undefined,
    codiceFiscale: data.codiceFiscale || undefined,
    note: data.note || undefined,
  });
  revalidatePath("/genitori");
  redirect(`/genitori/${created.recordId}`);
}

export async function updateGenitoreAction(recordId: string, _prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = genitoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateGenitoreAt(recordId, {
    nome: d.nome,
    cognome: d.cognome,
    telefono: d.telefono || "",
    email: d.email || "",
    codice_fiscale: d.codiceFiscale || "",
    note: d.note || "",
  });
  revalidatePath("/genitori");
  revalidatePath(`/genitori/${recordId}`);
  return { ok: true };
}

export async function deleteGenitoreAction(recordId: string) {
  await requireAdmin();
  await deleteGenitoreAt(recordId);
  revalidatePath("/genitori");
  redirect("/genitori");
}
