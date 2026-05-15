"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { auth, signIn, signOut } from "@/lib/auth/auth";
import { checkLoginRateLimit, loginRateLimitKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/db/audit-log";

export type LoginState = {
  error?: string;
} | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const email = String(formData.get("email") ?? "");
  const key = loginRateLimitKey(ip, email);
  const rl = await checkLoginRateLimit(key);
  if (!rl.allowed) {
    const ms = rl.resetAt ? rl.resetAt - Date.now() : 15 * 60_000;
    const minutes = Math.max(1, Math.ceil(ms / 60_000));
    await logAudit({
      userEmail: email || null,
      action: "auth.login.rate_limited",
      diff: { minutesRemaining: minutes },
    });
    return {
      error: `Troppi tentativi di login. Riprova tra ${minutes} ${minutes === 1 ? "minuto" : "minuti"}.`,
    };
  }
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        await logAudit({
          userEmail: email || null,
          action: "auth.login.fail",
          diff: { reason: "credentials" },
        });
        return { error: "Email o password non corretti." };
      }
      await logAudit({
        userEmail: email || null,
        action: "auth.login.fail",
        diff: { reason: "other", type: error.type },
      });
      return { error: "Errore di autenticazione." };
    }
    // redirect() lancia un'eccezione che dobbiamo lasciar passare.
    // NextAuth la usa per propagare il redirect post-signIn riuscito,
    // quindi se siamo qui senza AuthError e' un login OK.
    await logAudit({
      userEmail: email || null,
      action: "auth.login.success",
    });
    throw error;
  }
}

export async function logoutAction() {
  const session = await auth();
  await logAudit({
    userId: session?.user?.recordId,
    userEmail: session?.user?.email,
    action: "auth.logout",
  });
  await signOut({ redirectTo: "/login" });
}
