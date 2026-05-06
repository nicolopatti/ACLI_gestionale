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
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await getUserByEmail(email);
        if (!user || !user.attivo) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        // fire-and-forget update last_login (non blocca il login)
        recordLogin(user.recordId).catch(() => {});
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
