"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { iscrizioneSchema } from "@/lib/validations/iscrizione";
import {
  createIscrizione,
  deleteIscrizione,
  getIscrizione,
  updateIscrizione,
} from "@/lib/airtable/iscrizioni";
import {
  createMesi,
  deleteMesiByIscrizione,
  deleteRateBySessioneEIscrizione,
  hasRataPagataForSessione,
  listMesiByIscrizione,
} from "@/lib/airtable/mesi";
import { getAttivita } from "@/lib/airtable/attivita";
import { listSessioni } from "@/lib/airtable/sessioni";
import { getModalita } from "@/lib/airtable/modalita-iscrizione";
import type { FasciaOraria, GiornoSettimana } from "@/lib/config";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

function parseIscrizioneForm(formData: FormData) {
  return {
    bambinoId: formData.get("bambinoId"),
    attivitaId: formData.get("attivitaId"),
    modalitaId: formData.get("modalitaId"),
    dataIscrizione: formData.get("dataIscrizione"),
    sessioniSelteIds: formData.getAll("sessioniSelteIds").map(String),
    giorniSettimana: formData.getAll("giorniSettimana") as GiornoSettimana[],
    fasceOrarie: formData.getAll("fasceOrarie") as FasciaOraria[],
    note: formData.get("note"),
  };
}

export async function createIscrizioneAction(_prev: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = iscrizioneSchema.safeParse(parseIscrizioneForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const [attivita, modalita] = await Promise.all([
    getAttivita(d.attivitaId),
    getModalita(d.modalitaId),
  ]);
  if (!attivita) return { error: "Attività non trovata" };
  if (!modalita || modalita.attivitaId !== d.attivitaId) {
    return { error: "Modalità di iscrizione non valida per questa attività" };
  }

  if (attivita.tipo === "doposcuola") {
    if (d.giorniSettimana.length === 0) {
      return { error: "Seleziona almeno un giorno settimana per il doposcuola" };
    }
    if (d.fasceOrarie.length === 0) {
      return { error: "Seleziona almeno una fascia oraria per il doposcuola" };
    }
  }

  const sessioni = await listSessioni({ recordIds: d.sessioniSelteIds });
  if (sessioni.length !== d.sessioniSelteIds.length) {
    return { error: "Una o più sessioni non sono valide" };
  }

  let iscrId: string;
  try {
    const iscr = await createIscrizione({
      bambinoId: d.bambinoId,
      attivitaId: d.attivitaId,
      modalitaId: d.modalitaId,
      dataIscrizione: d.dataIscrizione || undefined,
      giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
      fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
      sessioniSelteIds: d.sessioniSelteIds,
      note: d.note || undefined,
    });
    iscrId = iscr.recordId;

    // Materializza una rata per ogni sessione scelta. Snapshot dell'importo dalla modalità.
    await createMesi(
      sessioni.map((s) => ({
        iscrizioneId: iscr.recordId,
        sessioneId: s.recordId,
        tipoUnita: s.tipoUnita,
        chiavePeriodo: s.chiave,
        importoDovuto: modalita.importo,
        meseAnno: s.tipoUnita === "mese" ? s.chiave : undefined,
      })),
    );
  } catch (e) {
    return { error: (e as Error).message || "Errore durante il salvataggio" };
  }

  revalidatePath("/iscrizioni");
  revalidatePath(`/bambini/${d.bambinoId}`);
  revalidatePath(`/attivita/${d.attivitaId}`);
  redirect(`/iscrizioni/${iscrId}`);
}

export async function updateIscrizioneAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();
  const parsed = iscrizioneSchema.safeParse(parseIscrizioneForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const existing = await getIscrizione(recordId);
  if (!existing) return { error: "Iscrizione non trovata" };

  const [attivita, modalita] = await Promise.all([
    getAttivita(d.attivitaId),
    getModalita(d.modalitaId),
  ]);
  if (!attivita) return { error: "Attività non trovata" };
  if (!modalita || modalita.attivitaId !== d.attivitaId) {
    return { error: "Modalità di iscrizione non valida per questa attività" };
  }

  if (attivita.tipo === "doposcuola") {
    if (d.giorniSettimana.length === 0) {
      return { error: "Seleziona almeno un giorno settimana per il doposcuola" };
    }
    if (d.fasceOrarie.length === 0) {
      return { error: "Seleziona almeno una fascia oraria per il doposcuola" };
    }
  }

  // Diff sessioni: verifica blocco su rate pagate prima di rimuovere.
  const previous = new Set(existing.sessioniSelteIds);
  const next = new Set(d.sessioniSelteIds);
  const removed = [...previous].filter((id) => !next.has(id));
  const added = [...next].filter((id) => !previous.has(id));

  for (const sessioneId of removed) {
    const blocked = await hasRataPagataForSessione(recordId, sessioneId);
    if (blocked) {
      return {
        error:
          "Impossibile rimuovere: rata già pagata o parziale. Annulla prima il pagamento della rata.",
      };
    }
  }

  try {
    await updateIscrizione(recordId, {
      bambinoId: d.bambinoId,
      attivitaId: d.attivitaId,
      modalitaId: d.modalitaId,
      dataIscrizione: d.dataIscrizione || undefined,
      giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
      fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
      sessioniSelteIds: d.sessioniSelteIds,
      note: d.note || undefined,
    });

    // Cancella le rate per le sessioni rimosse (verificate non pagate).
    for (const sessioneId of removed) {
      await deleteRateBySessioneEIscrizione(recordId, sessioneId);
    }

    // Crea le rate per le sessioni aggiunte.
    if (added.length > 0) {
      const sessioniAggiunte = await listSessioni({ recordIds: added });
      await createMesi(
        sessioniAggiunte.map((s) => ({
          iscrizioneId: recordId,
          sessioneId: s.recordId,
          tipoUnita: s.tipoUnita,
          chiavePeriodo: s.chiave,
          importoDovuto: modalita.importo,
          meseAnno: s.tipoUnita === "mese" ? s.chiave : undefined,
        })),
      );
    }
  } catch (e) {
    return { error: (e as Error).message || "Errore durante il salvataggio" };
  }

  revalidatePath("/iscrizioni");
  revalidatePath(`/iscrizioni/${recordId}`);
  return { ok: true };
}

/**
 * Conta i record che verranno cascadeati cancellando questa iscrizione.
 * Usato dal dialog di conferma per mostrare l'impatto all'utente.
 */
export async function getDeleteIscrizioneImpactAction(
  recordId: string,
): Promise<{ rate: number }> {
  await requireAdmin();
  const rate = await listMesiByIscrizione(recordId);
  return { rate: rate.length };
}

export async function deleteIscrizioneAction(recordId: string) {
  await requireAdmin();
  try {
    // Cascade: prima cancella tutte le rate, poi l'iscrizione, così la
    // tabella Rate non resta con record orfani che falsificano report e saldi.
    await deleteMesiByIscrizione(recordId);
    await deleteIscrizione(recordId);
  } catch (e) {
    return { error: (e as Error).message || "Errore durante l'eliminazione" };
  }
  revalidatePath("/iscrizioni");
  redirect("/iscrizioni");
}
