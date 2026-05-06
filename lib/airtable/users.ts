import { base, escapeFormulaString, TABLE_NAMES } from "./client";
import type { User } from "./types";
import type { Ruolo } from "@/lib/config";

function mapUser(record: { id: string; fields: Record<string, unknown> }): User {
  const f = record.fields;
  return {
    recordId: record.id,
    email: (f.email as string) ?? "",
    passwordHash: (f.password_hash as string) ?? "",
    nome: (f.nome as string) ?? "",
    ruolo: (f.ruolo as Ruolo) ?? "volontario_cassa",
    attivo: Boolean(f.attivo),
    telegramUserId: (f.telegram_user_id as string) ?? undefined,
    createdAt: (f.created_at as string) ?? undefined,
    lastLogin: (f.last_login as string) ?? undefined,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!base) return null;
  const records = await base(TABLE_NAMES.users)
    .select({
      filterByFormula: `LOWER({email}) = '${escapeFormulaString(email.toLowerCase())}'`,
      maxRecords: 1,
    })
    .all();
  const r = records[0];
  if (!r) return null;
  return mapUser({ id: r.id, fields: r.fields });
}

export async function getUserById(recordId: string): Promise<User | null> {
  if (!base) return null;
  try {
    const r = await base(TABLE_NAMES.users).find(recordId);
    return mapUser({ id: r.id, fields: r.fields });
  } catch {
    return null;
  }
}

export async function listUsers(): Promise<User[]> {
  if (!base) return [];
  const records = await base(TABLE_NAMES.users)
    .select({ sort: [{ field: "nome", direction: "asc" }] })
    .all();
  return records.map((r) => mapUser({ id: r.id, fields: r.fields }));
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  nome: string;
  ruolo: Ruolo;
  telegramUserId?: string;
}): Promise<User> {
  if (!base) throw new Error("Airtable client non configurato");
  const created = await base(TABLE_NAMES.users).create([
    {
      fields: {
        email: input.email.toLowerCase(),
        password_hash: input.passwordHash,
        nome: input.nome,
        ruolo: input.ruolo,
        attivo: true,
        ...(input.telegramUserId ? { telegram_user_id: input.telegramUserId } : {}),
      },
    },
  ]);
  const r = created[0];
  return mapUser({ id: r.id, fields: r.fields });
}

export async function updateUser(
  recordId: string,
  fields: Partial<{
    nome: string;
    email: string;
    ruolo: Ruolo;
    attivo: boolean;
    password_hash: string;
    telegram_user_id: string;
    last_login: string;
  }>,
): Promise<User> {
  if (!base) throw new Error("Airtable client non configurato");
  const updated = await base(TABLE_NAMES.users).update([
    { id: recordId, fields },
  ]);
  const r = updated[0];
  return mapUser({ id: r.id, fields: r.fields });
}

export async function recordLogin(recordId: string): Promise<void> {
  if (!base) return;
  await base(TABLE_NAMES.users).update([
    { id: recordId, fields: { last_login: new Date().toISOString() } },
  ]);
}
