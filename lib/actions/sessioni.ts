"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { sessioneSchema } from "@/lib/validations/sessione";
import { createSessioniBatch, deleteSessione } from "@/lib/airtable/sessioni";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

function parseSessioneForm(formData: FormData) {
  return {
    attivitaId: formData.get("attivitaId"),
    tipoUnita: formData.get("tipoUnita"),
    chiave: formData.get("chiave"),
    etichetta: formData.get("etichetta"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine"),
    importo: formData.get("importo"),
  };
}

export async function createSessioneAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = sessioneSchema.safeParse(parseSessioneForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await createSessioniBatch([
    {
      attivitaId: d.attivitaId,
      tipoUnita: d.tipoUnita,
      chiave: d.chiave,
      etichetta: d.etichetta,
      dataInizio: d.dataInizio || undefined,
      dataFine: d.dataFine || undefined,
      importo: d.importo,
    },
  ]);
  revalidatePath(`/attivita/${d.attivitaId}`);
  return { ok: true };
}

export async function deleteSessioneAction(sessioneId: string, attivitaId: string) {
  await requireAdmin();
  await deleteSessione(sessioneId);
  revalidatePath(`/attivita/${attivitaId}`);
}
