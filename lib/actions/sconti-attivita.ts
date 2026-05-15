"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { scontoAttivitaSchema } from "@/lib/validations/sconto-attivita";
import {
  countIscrizioniByScontoId,
  createSconto,
  deleteSconto,
  getSconto,
  updateSconto,
} from "@/lib/db/sconti-attivita";
import { logAudit } from "@/lib/db/audit-log";
import { BusinessError, userErrorMessage } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin")
    throw new BusinessError("Non autorizzato");
  return session;
}

function parseScontoForm(formData: FormData) {
  return {
    attivitaId: formData.get("attivitaId"),
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    valore: formData.get("valore"),
    descrizione: formData.get("descrizione"),
    ordering: formData.get("ordering") ?? 0,
    attivo:
      formData.get("attivo") === "on" ||
      formData.get("attivo") === "true" ||
      formData.get("attivo") === null,
  };
}

export async function createScontoAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = scontoAttivitaSchema.safeParse(parseScontoForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  try {
    const created = await createSconto({
      attivitaId: d.attivitaId,
      nome: d.nome,
      tipo: d.tipo,
      valore: d.valore,
      descrizione: d.descrizione || undefined,
      ordering: d.ordering,
      attivo: d.attivo,
    });
    await logAudit({
      userId: admin.user?.recordId,
      userEmail: admin.user?.email,
      action: "sconto.create",
      entityType: "sconto",
      entityId: created.recordId,
      diff: {
        attivitaId: d.attivitaId,
        nome: d.nome,
        tipo: d.tipo,
        valore: d.valore,
      },
    });
    revalidatePath(`/attivita/${d.attivitaId}`);
    revalidatePath("/iscrizioni/nuova");
    return { ok: true };
  } catch (e) {
    console.error("[createScontoAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
}

export async function updateScontoAction(
  recordId: string,
  attivitaId: string,
  _prev: unknown,
  formData: FormData,
) {
  const admin = await requireAdmin();
  const parsed = scontoAttivitaSchema.safeParse({
    ...parseScontoForm(formData),
    attivitaId,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  try {
    await updateSconto(recordId, {
      nome: d.nome,
      tipo: d.tipo,
      valore: d.valore,
      descrizione: d.descrizione || null,
      ordering: d.ordering,
      attivo: d.attivo,
    });
    await logAudit({
      userId: admin.user?.recordId,
      userEmail: admin.user?.email,
      action: "sconto.update",
      entityType: "sconto",
      entityId: recordId,
      diff: { nome: d.nome, tipo: d.tipo, valore: d.valore, attivo: d.attivo },
    });
    revalidatePath(`/attivita/${attivitaId}`);
    return { ok: true };
  } catch (e) {
    console.error("[updateScontoAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
}

export async function getDeleteScontoImpactAction(
  recordId: string,
): Promise<{ iscrizioni: number }> {
  await requireAdmin();
  const iscrizioni = await countIscrizioniByScontoId(recordId);
  return { iscrizioni };
}

export async function deleteScontoAction(recordId: string, attivitaId: string) {
  const admin = await requireAdmin();
  try {
    const sconto = await getSconto(recordId);
    await deleteSconto(recordId);
    await logAudit({
      userId: admin.user?.recordId,
      userEmail: admin.user?.email,
      action: "sconto.delete",
      entityType: "sconto",
      entityId: recordId,
      diff: sconto
        ? { nome: sconto.nome, tipo: sconto.tipo, valore: sconto.valore }
        : undefined,
    });
    revalidatePath(`/attivita/${attivitaId}`);
  } catch (e) {
    console.error("[deleteScontoAction]", e);
    // FK ON DELETE RESTRICT: l'errore Postgres tipico contiene
    // "violates foreign key constraint". Mostriamo un messaggio user-friendly.
    return {
      error:
        "Impossibile eliminare: lo sconto e' applicato a una o piu' iscrizioni. Disattivalo invece di cancellarlo per nasconderlo senza perdere lo storico.",
    };
  }
}
