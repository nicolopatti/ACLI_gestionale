import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Next.js 16 ha rinominato `middleware.ts` in `proxy.ts`. La logica resta la stessa.
// Usiamo solo la authConfig edge-safe (nessun bcrypt) per fare gating veloce.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Esegui il proxy su tutto tranne asset statici e gli endpoint NextAuth.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
