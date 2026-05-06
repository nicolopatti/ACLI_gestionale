"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/auth/password";
import { nuovoUtenteSchema } from "@/lib/validations/utente";
import { createUser, getUserByEmail, updateUser } from "@/lib/airtable/users";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

export async function createUtenteAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = nuovoUtenteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const existing = await getUserByEmail(d.email);
  if (existing) return { error: "Email già usata" };
  const passwordHash = await hashPassword(d.password);
  await createUser({
    email: d.email,
    passwordHash,
    nome: d.nome,
    ruolo: d.ruolo,
    telegramUserId: d.telegramUserId,
  });
  revalidatePath("/utenti");
  redirect("/utenti");
}

export async function toggleAttivoAction(recordId: string, attivo: boolean) {
  await requireAdmin();
  await updateUser(recordId, { attivo });
  revalidatePath("/utenti");
}

export async function resetPasswordAction(recordId: string, nuova: string) {
  await requireAdmin();
  if (nuova.length < 8) return { error: "Almeno 8 caratteri" };
  const passwordHash = await hashPassword(nuova);
  await updateUser(recordId, { password_hash: passwordHash });
  return { ok: true };
}
