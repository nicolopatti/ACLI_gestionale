import type { NextAuthConfig } from "next-auth";
import type { Ruolo } from "@/lib/config";
import { getPasswordVersion } from "@/lib/db/users";

/**
 * Config edge-safe di Auth.js: nessun import che dipende da Node-only
 * (bcrypt, fs, ecc.) per essere compatibile con il runtime edge di proxy.ts.
 * `getPasswordVersion` usa Supabase client (compatibile edge).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Sessione 5 SECURITY_PLAN: ridotto da 14gg a 24h. Una compromissione
    // del JWT (token rubato via XSS / cookie leak) e' sfruttabile fino a
    // questo limite. L'invalidazione esplicita su cambio password e'
    // gestita dal check `passwordVersion` nel callback jwt qui sotto.
    maxAge: 60 * 60 * 24, // 24 ore
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
      // Qui dentro l'utente puo' completare il primo accesso indipendentemente
      // dal ruolo: senza questo early-return, il gating ruoli sotto rimanda i
      // non-admin su /dashboard o /cassa, che a loro volta richiamano il check
      // mustChangePassword sopra e causano un loop di redirect.
      if (isOnPrimoAccesso) return true;
      // Gating ruoli per area
      const ruolo = auth?.user?.ruolo;
      const path = nextUrl.pathname;
      const matches = (paths: string[]) => paths.some((p) => path.startsWith(p));

      // Route universali (accessibili a chiunque sia loggato)
      const universal = ["/profilo"];
      // Area Educativa (incluse rotte previste dalle PR successive: turni, spese-edu)
      const eduRoutes = [
        "/dashboard",
        "/bambini",
        "/educatori",
        "/attivita",
        "/iscrizioni",
        "/presenze",
        "/turni",
        "/spese-edu",
      ];

      if (matches(universal)) return true;

      if (ruolo === "admin") return true;

      if (ruolo === "coordinatore_educativo") {
        if (matches(eduRoutes)) return true;
        // Fuori dal proprio perimetro -> torna al cruscotto
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (ruolo === "volontario_cassa") {
        if (path.startsWith("/cassa") || path.startsWith("/conti")) return true;
        return Response.redirect(new URL("/cassa", nextUrl));
      }

      // Ruolo sconosciuto: nega accesso
      return false;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.recordId;
        token.ruolo = user.ruolo;
        token.email = user.email;
        token.nome = user.nome;
        token.telegramUserId = user.telegramUserId;
        token.mustChangePassword = user.mustChangePassword;
        token.passwordVersion = user.passwordVersion;
      }
      // Permette al server di abbassare il flag dopo un cambio password
      // riuscito senza richiedere logout/login. La firma supportata e' quella
      // di unstable_update: { user: { mustChangePassword: false, passwordVersion: N } };
      // teniamo anche il fallback al formato piatto per non rompere chiamate
      // precedenti.
      if (trigger === "update" && session && typeof session === "object") {
        const next = session as {
          user?: { mustChangePassword?: boolean; passwordVersion?: number };
          mustChangePassword?: boolean;
          passwordVersion?: number;
        };
        const mcp = next.user?.mustChangePassword ?? next.mustChangePassword;
        if (typeof mcp === "boolean") {
          token.mustChangePassword = mcp;
        }
        const pv = next.user?.passwordVersion ?? next.passwordVersion;
        if (typeof pv === "number") {
          token.passwordVersion = pv;
        }
      }
      // Sessione 5 SECURITY_PLAN: invalidazione sessione su cambio password.
      // Ad ogni request che non sia il login iniziale o un update server-side,
      // confronta la `passwordVersion` del token con quella corrente sul DB.
      // Mismatch -> ritorna null, il proxy redirezione l'utente a /login.
      // Se la query fallisce (DB irraggiungibile, utente cancellato) lasciamo
      // passare: l'invalidazione non deve bloccare gli utenti per un problema
      // infrastrutturale (fail-open coerente con il rate-limit di /login).
      if (
        trigger !== "signIn" &&
        trigger !== "update" &&
        typeof token.userId === "string"
      ) {
        const current = await getPasswordVersion(token.userId);
        if (
          current !== null &&
          typeof token.passwordVersion === "number" &&
          current !== token.passwordVersion
        ) {
          return null;
        }
        // Token vecchio senza passwordVersion (pre-Sessione 5): forziamo
        // re-login una volta sola. Tutti gli utenti gia' loggati passeranno
        // di qui al primo refresh dopo il deploy.
        if (
          current !== null &&
          typeof token.passwordVersion !== "number"
        ) {
          return null;
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
        session.user.passwordVersion = token.passwordVersion as
          | number
          | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
