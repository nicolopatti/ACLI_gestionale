import "server-only";
import { db } from "./client";
import type { User } from "@/lib/airtable/types";
import type { Database } from "./types.gen";
import type { Ruolo } from "@/lib/config";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

function mapUser(row: UserRow): User {
  return {
    recordId: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    nome: row.nome,
    ruolo: row.ruolo as Ruolo,
    attivo: row.attivo,
    mustChangePassword: row.must_change_password,
    telegramUserId: row.telegram_user_id ?? undefined,
    createdAt: row.created_at ?? undefined,
    lastLogin: row.last_login ?? undefined,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!db) return null;
  // Email column is `citext`, quindi il match e' case-insensitive senza LOWER().
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  if (!db) return null;
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ? mapUser(data) : null;
}

export async function listUsers(): Promise<User[]> {
  if (!db) return [];
  const { data, error } = await db.from("users").select("*").order("nome");
  if (error) throw error;
  return (data ?? []).map(mapUser);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  nome: string;
  ruolo: Ruolo;
  telegramUserId?: string;
}): Promise<User> {
  if (!db) throw new Error("Supabase client non configurato");
  const { data, error } = await db
    .from("users")
    .insert({
      email: input.email.toLowerCase(),
      password_hash: input.passwordHash,
      nome: input.nome,
      ruolo: input.ruolo,
      attivo: true,
      must_change_password: true,
      telegram_user_id: input.telegramUserId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapUser(data);
}

export async function updateUser(
  recordId: string,
  fields: Partial<{
    nome: string;
    email: string;
    ruolo: Ruolo;
    attivo: boolean;
    password_hash: string;
    must_change_password: boolean;
    telegram_user_id: string;
    last_login: string;
  }>,
): Promise<User> {
  if (!db) throw new Error("Supabase client non configurato");
  // I chiamanti passano gia' i nomi in snake_case (retrocompat con la
  // signature Airtable), quindi possiamo fare il forward diretto.
  const { data, error } = await db
    .from("users")
    .update(fields)
    .eq("id", recordId)
    .select("*")
    .single();
  if (error) throw error;
  return mapUser(data);
}

export async function recordLogin(recordId: string): Promise<void> {
  if (!db) return;
  await db
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", recordId);
}
