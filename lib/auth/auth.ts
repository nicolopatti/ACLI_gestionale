import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { getUserByEmail, recordLogin } from "@/lib/db/users";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // try/catch attorno alla chiamata Airtable: senza, un'outage o
        // una chiave revocata farebbe lanciare CallbackRouteError invece
        // del piu' utile CredentialsSignin.
        let user;
        try {
          user = await getUserByEmail(email);
        } catch (err) {
          const e = err as { error?: string; statusCode?: number; message?: string };
          console.error(
            `[auth] errore Airtable durante login: code=${e?.error ?? "?"} status=${e?.statusCode ?? "?"} msg=${e?.message ?? String(err)}`,
          );
          return null;
        }
        if (!user || !user.attivo) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        recordLogin(user.recordId).catch(() => {});
        return {
          id: user.recordId,
          recordId: user.recordId,
          email: user.email,
          nome: user.nome,
          ruolo: user.ruolo,
          telegramUserId: user.telegramUserId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
