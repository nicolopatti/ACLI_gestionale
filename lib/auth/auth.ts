import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { getUserByEmail, recordLogin } from "@/lib/airtable/users";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn("[login] schema invalido", parsed.error.flatten());
          return null;
        }
        const { email, password } = parsed.data;
        const hasAirtableEnv = Boolean(
          process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID,
        );
        if (!hasAirtableEnv) {
          console.error(
            "[login] env Airtable mancanti: AIRTABLE_API_KEY o AIRTABLE_BASE_ID non sono settati",
          );
          return null;
        }
        let user;
        try {
          user = await getUserByEmail(email);
        } catch (err) {
          // Mettiamo il messaggio Airtable nella prima parte della riga
          // perché i runtime logs di Vercel troncano il "message" del log
          // a poche decine di caratteri.
          const e = err as { error?: string; statusCode?: number; message?: string; name?: string };
          const code = e?.error ?? e?.name ?? "ERR";
          const status = e?.statusCode ?? "?";
          const msg = e?.message ?? String(err);
          console.error(`[login-airtable-err] ${code} status=${status} msg=${msg}`);
          return null;
        }
        if (!user) {
          console.warn("[login] utente non trovato", { email });
          return null;
        }
        if (!user.attivo) {
          console.warn("[login] utente disattivato", { email });
          return null;
        }
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          console.warn("[login] password errata", { email });
          return null;
        }
        recordLogin(user.recordId).catch((err) => {
          console.warn("[login] recordLogin fallita (non bloccante)", err);
        });
        return {
          id: user.recordId,
          recordId: user.recordId,
          email: user.email,
          nome: user.nome,
          ruolo: user.ruolo,
          telegramUserId: user.telegramUserId,
        };
      },
    }),
  ],
});
