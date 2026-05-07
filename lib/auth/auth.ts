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
        // Vercel runtime logs sembra mostrare solo il primo console.error
        // per request: accumuliamo un trace e lo emettiamo una volta sola.
        const trace: string[] = ["entry"];
        const emit = (suffix: string) => {
          console.error(`[login-trace] ${trace.join("|")}|${suffix}`);
        };

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          emit(`schema-invalid:${JSON.stringify(parsed.error.flatten())}`);
          return null;
        }
        trace.push("schema-ok");
        const { email, password } = parsed.data;

        const hasKey = Boolean(process.env.AIRTABLE_API_KEY);
        const hasBase = Boolean(process.env.AIRTABLE_BASE_ID);
        trace.push(`env:key=${hasKey},base=${hasBase}`);
        if (!hasKey || !hasBase) {
          emit("env-missing");
          return null;
        }

        let user;
        try {
          user = await getUserByEmail(email);
          trace.push(user ? "user-found" : "user-null");
        } catch (err) {
          const e = err as { error?: string; statusCode?: number; message?: string; name?: string };
          emit(`airtable-throw:code=${e?.error ?? e?.name ?? "ERR"},status=${e?.statusCode ?? "?"},msg=${e?.message ?? String(err)}`);
          return null;
        }
        if (!user) {
          emit(`user-not-found:email=${email}`);
          return null;
        }

        trace.push(`user.attivo=${user.attivo}`);
        if (!user.attivo) {
          emit("user-not-active");
          return null;
        }

        trace.push(`hash.len=${user.passwordHash?.length ?? 0}`);
        let ok = false;
        try {
          ok = await verifyPassword(password, user.passwordHash);
        } catch (err) {
          emit(`bcrypt-throw:${(err as Error)?.message ?? String(err)}`);
          return null;
        }
        trace.push(`bcrypt.ok=${ok}`);
        if (!ok) {
          emit("bad-password");
          return null;
        }

        recordLogin(user.recordId).catch((err) => {
          console.error("[login-trace] recordLogin failed:", (err as Error)?.message);
        });
        emit("success");
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
