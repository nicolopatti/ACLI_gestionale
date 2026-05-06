import type { NextAuthConfig } from "next-auth";

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
      if (isOnLogin) {
        if (isLogged) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      if (!isLogged) return false; // redirect a /login
      // Gating ruoli: solo admin può accedere alle aree di gestione
      const ruolo = auth?.user?.ruolo;
      const adminOnly = [
        "/bambini",
        "/genitori",
        "/iscrizioni",
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
    jwt({ token, user }) {
      if (user) {
        token.userId = user.recordId;
        token.ruolo = user.ruolo;
        token.email = user.email;
        token.nome = user.nome;
        token.telegramUserId = user.telegramUserId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.recordId = token.userId as string;
        session.user.ruolo = token.ruolo as "admin" | "volontario_cassa";
        session.user.nome = token.nome as string;
        session.user.email = token.email as string;
        session.user.telegramUserId = token.telegramUserId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
