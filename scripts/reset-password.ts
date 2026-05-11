/**
 * Resetta la password di un utente esistente su Airtable.
 *
 * Uso:
 *   pnpm reset-password -- email@dominio.it nuova_password
 *
 * Richiede AIRTABLE_API_KEY e AIRTABLE_BASE_ID in .env.local.
 */
import { hashPassword } from "../lib/auth/password";
import { getUserByEmail, updateUser } from "../lib/db/users";

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Uso: pnpm reset-password -- <email> <nuova_password>");
    process.exit(1);
  }
  const existing = await getUserByEmail(email);
  if (!existing) {
    console.error(`Nessun utente trovato con email ${email}.`);
    process.exit(1);
  }
  const hash = await hashPassword(password);
  await updateUser(existing.recordId, {
    password_hash: hash,
    must_change_password: true,
  });
  console.log(
    `Password aggiornata per ${email} (recordId=${existing.recordId}). Al prossimo login l'utente dovrà sceglierne una personale.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
