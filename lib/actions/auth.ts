"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/lib/auth/auth";
import { checkLoginRateLimit, loginRateLimitKey } from "@/lib/rate-limit";

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
        return { error: "Email o password non corretti." };
      }
      return { error: "Errore di autenticazione." };
    }
    // redirect() lancia un'eccezione che dobbiamo lasciar passare
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
