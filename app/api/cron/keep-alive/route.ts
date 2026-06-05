import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * Keep-alive per il progetto Supabase sul tier Free.
 *
 * Supabase mette in pausa i progetti Free dopo 7 giorni senza attivita' sul
 * database. In periodi morti (nessuno usa la webapp, nessun movimento da
 * Telegram) il DB vede 0 query e viene sospeso. Questo endpoint esegue una
 * query banale (`select id limit 1`) che conta come attivita'. L'endpoint e'
 * chiamato da DUE scheduler indipendenti per ridondanza (il cron Hobby di
 * Vercel e' best-effort e puo' saltare giorni — successo gia' osservato):
 *   1. Vercel Cron, una volta al giorno (vedi `crons` in vercel.json);
 *   2. GitHub Actions, ogni 6h (vedi `.github/workflows/keep-alive.yml`).
 * Con piu' ping/giorno da sistemi diversi la finestra di 7 giorni non viene
 * mai raggiunta anche se uno dei due scheduler salta qualche esecuzione.
 *
 * Auth: quando `CRON_SECRET` e' configurata su Vercel, le invocazioni cron
 * arrivano con header `Authorization: Bearer <CRON_SECRET>` e qui lo
 * verifichiamo (confronto a tempo costante). Se il segreto non e' configurato
 * l'endpoint resta aperto, ma l'unico "abuso" possibile e' forzare una query
 * `select` di una riga: niente mutazioni, niente esposizione di dati. Settare
 * comunque `CRON_SECRET` e' la pratica consigliata.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const presented = auth.startsWith("Bearer ")
      ? auth.slice("Bearer ".length)
      : "";
    if (!constantTimeEqual(presented, secret)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Database non configurato" },
      { status: 503 },
    );
  }

  const { error } = await db.from("users").select("id").limit(1);
  if (error) {
    console.error("[cron/keep-alive]", error);
    return NextResponse.json(
      { ok: false, error: "Database non raggiungibile" },
      { status: 503 },
    );
  }

  // Log anche sul percorso di successo: senza questo l'endpoint e' muto sui
  // 200 e nei log runtime di Vercel non si vede se/quando il cron ha girato
  // (lo si puo' dedurre solo dai log Supabase, retention 24h). Una riga per
  // ogni esecuzione rende auditabile la storia del keep-alive.
  const at = new Date().toISOString();
  console.log(`[cron/keep-alive] ok at ${at}`);
  return NextResponse.json({ ok: true, at });
}

/**
 * Confronto a tempo costante per evitare timing attacks sull'auth.
 * Stesso helper di app/api/revalidate/movimenti/route.ts.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
