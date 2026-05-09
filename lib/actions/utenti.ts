"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  cambiaPasswordSchema,
  nuovoUtenteSchema,
  primoAccessoSchema,
  resetPasswordSchema,
} from "@/lib/validations/utente";
import { createUser, getUserByEmail, getUserById, updateUser } from "@/lib/airtable/users";

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

export async function resetPasswordAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { recordId, passwordTemporanea } = parsed.data;
  const target = await getUserById(recordId);
  if (!target) return { error: "Utente non trovato" };
  const passwordHash = await hashPassword(passwordTemporanea);
  await updateUser(recordId, {
    password_hash: passwordHash,
    must_change_password: true,
  });
  revalidatePath("/utenti");
  return { ok: true };
}

export async function cambiaPasswordAction(_prev: unknown, formData: FormData) {
  const session = await auth();
  const recordId = session?.user?.recordId;
  if (!recordId) return { error: "Sessione non valida" };

  const parsed = cambiaPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const user = await getUserById(recordId);
  if (!user) return { error: "Utente non trovato" };

  const ok = await verifyPassword(d.passwordAttuale, user.passwordHash);
  if (!ok) return { error: "Password attuale non corretta" };

  const passwordHash = await hashPassword(d.passwordNuova);
  await updateUser(recordId, {
    password_hash: passwordHash,
    must_change_password: false,
  });
  return { ok: true };
}

export async function primoAccessoAction(_prev: unknown, formData: FormData) {
  const session = await auth();
  const recordId = session?.user?.recordId;
  if (!recordId) return { error: "Sessione non valida" };

  const parsed = primoAccessoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const user = await getUserById(recordId);
  if (!user) return { error: "Utente non trovato" };
  if (!user.mustChangePassword) {
    // Flag già abbassato — niente da fare. Rimanderà al dashboard al prossimo redirect.
    redirect("/dashboard");
  }

  const sameAsOld = await verifyPassword(d.passwordNuova, user.passwordHash);
  if (sameAsOld) {
    return { error: "La nuova password deve essere diversa da quella attuale" };
  }

  const passwordHash = await hashPassword(d.passwordNuova);
  await updateUser(recordId, {
    password_hash: passwordHash,
    must_change_password: false,
  });

  // Forza un nuovo login: il JWT corrente porterebbe ancora mustChangePassword=true.
  // signOut() lancia una NEXT_REDIRECT, quindi non torna; nessun valore da restituire dopo.
  await signOut({ redirectTo: "/login" });
}
