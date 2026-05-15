import "server-only";
import { headers } from "next/headers";
import { db } from "./client";
import type { Json } from "./types.gen";

/**
 * Sessione 6 SECURITY_PLAN — audit log applicativo.
 *
 * Helper fire-and-forget per registrare operazioni sensibili.
 *
 * Invariante: non logga MAI password in chiaro, hash, token,
 * codici di reset, contenuto sensibile (descrizioni rate complete,
 * dati personali oltre l'email). Solo metadati: chi ha fatto cosa,
 * quando, su quale entita', e diff JSON minimale (es. campi cambiati
 * con valori prima/dopo, ma con campi sensibili rimossi a monte).
 *
 * Errori interni vengono swallowati (con `console.error` per
 * diagnostica): un fallimento dell'audit log NON deve mai bloccare
 * l'azione di business sottostante.
 */
export type AuditEntry = {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  diff?: Record<string, unknown>;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  if (!db) return;
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = h.get("user-agent") ?? null;
    const { error } = await db.from("audit_log").insert({
      user_id: entry.userId ?? null,
      user_email: entry.userEmail ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      diff: (entry.diff ?? null) as Json | null,
      ip,
      user_agent: userAgent,
    });
    if (error) {
      console.error("[audit] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[audit] swallowed error:", e);
  }
}
