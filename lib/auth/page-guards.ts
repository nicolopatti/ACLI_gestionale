import { redirect } from "next/navigation";
import { auth } from "./auth";

// SECURITY_PLAN sessione 3: defense-in-depth a livello pagina.
//
// Il proxy in proxy.ts blocca gia' le rotte sbagliate per ruolo a livello
// edge, MA il matcher del proxy puo' essere bypassato da un futuro
// `matcher` regex sbagliato, da una nuova rotta non gated, o da una
// modifica accidentale alla `authorized()` callback. Questi helper
// rendono il check esplicito a livello pagina cosi' che, se il proxy
// fallisce, la pagina comunque non rendera' nulla all'utente non
// autorizzato.

/** Pagina admin-only. Non admin → redirect "/" (il proxy lo manda a casa per ruolo). */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.ruolo !== "admin") redirect("/");
  return session;
}

/** Pagina area educativa (admin + coordinatore). Altri → /attivita. */
export async function requireAdminOrCoordinatore() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const r = session.user.ruolo;
  if (r !== "admin" && r !== "coordinatore_educativo") redirect("/attivita");
  return session;
}

/**
 * Pagina cassa/finanze (admin + volontario_cassa). Coordinatore educativo
 * non vede dati finanziari → redirect alla home edu (/attivita).
 */
export async function requireAdminOrCassa() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const r = session.user.ruolo;
  if (r !== "admin" && r !== "volontario_cassa") redirect("/attivita");
  return session;
}
