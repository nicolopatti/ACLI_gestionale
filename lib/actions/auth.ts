"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/auth";

export type LoginState = {
  error?: string;
} | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Email o password non corretti." };
      }
      console.error("[loginAction] AuthError", {
        type: error.type,
        message: error.message,
        cause: error.cause,
      });
      return { error: "Errore di autenticazione." };
    }
    // redirect() lancia un'eccezione che dobbiamo lasciar passare
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
