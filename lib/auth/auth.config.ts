import type { NextAuthConfig } from "next-auth";
import type { Ruolo } from "@/lib/config";

/**
 * Config edge-safe di Auth.js: nessun import che dipende da Node-only
 * (bcrypt, fs, ecc.) per essere compatibile con il runtime edge di proxy.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14, // 14 giorni
  },
  providers: [], // i provider veri sono in lib/auth/auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLogged = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnPrimoAccesso = nextUrl.pathname.startsWith("/primo-accesso");
      if (isOnLogin) {
        if (isLogged) {
          if (auth?.user?.mustChangePassword) {
            return Response.redirect(new URL("/primo-accesso", nextUrl));
          }
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      if (!isLogged) return false; // redirect a /login
      // Onboarding: finché il flag è alto, l'utente può raggiungere solo
      // /primo-accesso. Tutto il resto viene reindirizzato lì.
      if (auth?.user?.mustChangePassword && !isOnPrimoAccesso) {
        return Response.redirect(new URL("/primo-accesso", nextUrl));
      }
      if (!auth?.user?.mustChangePassword && isOnPrimoAccesso) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      // Gating ruoli: solo admin può accedere alle aree di gestione
      const ruolo = auth?.user?.ruolo;
      const adminOnly = [
        "/bambini",
        "/attivita",
        "/iscrizioni",
        "/educatori",
        "/presenze",
        "/utenti",
      ];
      if (
        adminOnly.some((p) => nextUrl.pathname.startsWith(p)) &&
        ruolo !== "admin"
      ) {
        return Response.redirect(new URL("/cassa", nextUrl));
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.recordId;
        token.ruolo = user.ruolo;
        token.email = user.email;
        token.nome = user.nome;
        token.telegramUserId = user.telegramUserId;
        token.mustChangePassword = user.mustChangePassword;
      }
      // Permette al client/server di abbassare il flag dopo un cambio password
      // riuscito senza richiedere logout/login.
      if (trigger === "update" && session && typeof session === "object") {
        const next = session as { mustChangePassword?: boolean };
        if (typeof next.mustChangePassword === "boolean") {
          token.mustChangePassword = next.mustChangePassword;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.recordId = token.userId as string;
        session.user.ruolo = token.ruolo as Ruolo;
        session.user.nome = token.nome as string;
        session.user.email = token.email as string;
        session.user.telegramUserId = token.telegramUserId as string | undefined;
        session.user.mustChangePassword = token.mustChangePassword as
          | boolean
          | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
