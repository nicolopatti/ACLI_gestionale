import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Next.js 16 ha rinominato `middleware.ts` in `proxy.ts`. La logica resta la stessa.
// Usiamo solo la authConfig edge-safe (nessun bcrypt) per fare gating veloce.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Esegui il proxy su tutto tranne asset statici e gli endpoint NextAuth.
  // `api/revalidate` e' escluso perche' e' un endpoint system-to-system
  // (chiamato da n8n) protetto da bearer token, non da session cookie:
  // se il proxy lo intercettasse, redirezione a /login e n8n non potrebbe
  // mai invalidare la cache.
  // Il pattern `\\..+$` esclude qualsiasi path che termina con un'estensione
  // (es. /logo-acli.png, /apple-icon.png, /sitemap.xml): senza questo, il
  // gating di authConfig.authorized considera "non loggato" -> 307 verso
  // /login anche per le immagini, rompendo il rendering del logo sulla
  // pagina di login.
  matcher: [
    "/((?!api/auth|api/revalidate|_next/static|_next/image|favicon.ico|.*\\..+$).*)",
  ],
};
