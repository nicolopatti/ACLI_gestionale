/**
 * Crea un utente admin (o volontario) su Airtable con password bcrypt.
 *
 * Uso:
 *   pnpm seed:admin -- email@dominio.it password123 "Mario Rossi" [admin|volontario_cassa]
 *
 * Richiede AIRTABLE_API_KEY e AIRTABLE_BASE_ID in .env.local
 */
import { hashPassword } from "../lib/auth/password";
import { createUser, getUserByEmail } from "../lib/airtable/users";
import type { Ruolo } from "../lib/config";

async function main() {
  const [, , email, password, nome, ruoloArg] = process.argv;
  if (!email || !password || !nome) {
    console.error(
      'Uso: pnpm seed:admin -- <email> <password> "<nome completo>" [admin|volontario_cassa]',
    );
    process.exit(1);
  }
  const ruolo: Ruolo = (ruoloArg as Ruolo) || "admin";
  if (ruolo !== "admin" && ruolo !== "volontario_cassa") {
    console.error("Ruolo non valido. Usa 'admin' o 'volontario_cassa'.");
    process.exit(1);
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    console.error(`Utente con email ${email} esiste già (recordId=${existing.recordId}).`);
    process.exit(1);
  }
  const hash = await hashPassword(password);
  const user = await createUser({
    email,
    passwordHash: hash,
    nome,
    ruolo,
  });
  console.log("Utente creato:");
  console.log("  recordId:", user.recordId);
  console.log("  email:   ", user.email);
  console.log("  nome:    ", user.nome);
  console.log("  ruolo:   ", user.ruolo);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
