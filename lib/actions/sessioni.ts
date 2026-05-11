"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { sessioneSchema } from "@/lib/validations/sessione";
import { createSessioniBatch, deleteSessione } from "@/lib/db/sessioni";
import {
  deleteMesiBySessione,
  hasAnyRataPagataForSessione,
} from "@/lib/db/mesi";
import { listAllMesi } from "@/lib/db/mesi";
import { deriveChiaveEtichetta } from "@/lib/sessioni-utils";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

function parseSessioneForm(formData: FormData) {
  return {
    attivitaId: formData.get("attivitaId"),
    tipoUnita: formData.get("tipoUnita"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine"),
  };
}

export async function createSessioneAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = sessioneSchema.safeParse(parseSessioneForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const derived = deriveChiaveEtichetta(d.tipoUnita, d.dataInizio);
  if (!derived) return { error: "Data inizio non valida" };

  await createSessioniBatch([
    {
      attivitaId: d.attivitaId,
      tipoUnita: d.tipoUnita,
      chiave: derived.chiave,
      etichetta: derived.etichetta,
      dataInizio: d.dataInizio,
      dataFine: d.dataFine || d.dataInizio,
    },
  ]);
  revalidatePath(`/attivita/${d.attivitaId}`);
  return { ok: true };
}

/**
 * Conta rate non pagate che verranno cascadeate cancellando la sessione.
 * Le rate pagate/parziali bloccano la delete (vedi action sotto).
 */
export async function getDeleteSessioneImpactAction(
  sessioneId: string,
): Promise<{ rateNonPagate: number; bloccatoDaPagate: boolean }> {
  await requireAdmin();
  const blocked = await hasAnyRataPagataForSessione(sessioneId);
  if (blocked) return { rateNonPagate: 0, bloccatoDaPagate: true };
  const all = await listAllMesi();
  const rateNonPagate = all.filter(
    (m) => m.sessioneId === sessioneId && m.statoPagamento !== "pagato",
  ).length;
  return { rateNonPagate, bloccatoDaPagate: false };
}

export async function deleteSessioneAction(
  sessioneId: string,
  attivitaId: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  if (await hasAnyRataPagataForSessione(sessioneId)) {
    return {
      error:
        "Impossibile eliminare: esistono rate pagate o parziali collegate a questa sessione.",
    };
  }
  // Cascade rate non pagate prima della sessione, così non restano orfane.
  await deleteMesiBySessione(sessioneId);
  await deleteSessione(sessioneId);
  revalidatePath(`/attivita/${attivitaId}`);
  return { ok: true };
}
