import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Endpoint chiamato da n8n al termine di ogni upsert sincronizzato da Google
 * Sheet -> Supabase, per invalidare la cache `movimenti` di Next.js.
 *
 * Senza questo trigger, il sito mostra dati stale fino al TTL di
 * `unstable_cache` (5 min) perche' n8n parla a Supabase via SQL diretto e
 * bypassa `revalidateTag` (che invece scatta sulle mutazioni applicative).
 *
 * Auth: shared bearer token via header `Authorization: Bearer <REVALIDATE_TOKEN>`.
 * Il segreto vive solo nelle env di Vercel. Se leakato l'unico abuso possibile
 * e' forzare cache-miss extra (degrado di performance, no data exposure).
 */
export async function POST(): Promise<NextResponse> {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected || expected.length < 16) {
    // Fail-closed: se il token non e' configurato (o e' debole), rifiuta.
    // Cosi' un setup incompleto non si traduce in endpoint aperto a chiunque.
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 },
    );
  }
  const h = await headers();
  const auth = h.get("authorization") ?? "";
  const presented = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length)
    : "";
  if (!constantTimeEqual(presented, expected)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  revalidateTag("movimenti", "max");
  return NextResponse.json({ ok: true, revalidated: "movimenti" });
}

/**
 * Confronto a tempo costante per evitare timing attacks sull'auth.
 * Opera su UTF-16 code units (charCodeAt): sufficiente per token base64/hex
 * dove ogni char e' ASCII a 1 byte.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
