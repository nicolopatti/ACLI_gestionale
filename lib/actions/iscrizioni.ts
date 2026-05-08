"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { iscrizioneSchema } from "@/lib/validations/iscrizione";
import { annoScolasticoDaData } from "@/lib/config";
import {
  createIscrizione,
  deleteIscrizione,
  getIscrizione,
  updateIscrizione,
} from "@/lib/airtable/iscrizioni";
import {
  createMesi,
  deleteRateBySessioneEIscrizione,
  hasRataPagataForSessione,
} from "@/lib/airtable/mesi";
import { getAttivita } from "@/lib/airtable/attivita";
import { listSessioni } from "@/lib/airtable/sessioni";
import type { FasciaOraria, GiornoSettimana } from "@/lib/config";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

function parseIscrizioneForm(formData: FormData) {
  return {
    bambinoId: formData.get("bambinoId"),
    attivitaId: formData.get("attivitaId"),
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

  const attivita = await getAttivita(d.attivitaId);
  if (!attivita) return { error: "Attività non trovata" };

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

  const annoScolastico =
    attivita.annoScolastico ||
    (attivita.dataInizio
      ? annoScolasticoDaData(attivita.dataInizio)
      : annoScolasticoDaData(new Date()));

  const iscr = await createIscrizione({
    bambinoId: d.bambinoId,
    attivitaId: d.attivitaId,
    annoScolastico,
    dataIscrizione: d.dataIscrizione || undefined,
    giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
    fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
    sessioniSelteIds: d.sessioniSelteIds,
    note: d.note || undefined,
  });

  // Materializza una rata per ogni sessione scelta (snapshot importo).
  await createMesi(
    sessioni.map((s) => ({
      iscrizioneId: iscr.recordId,
      sessioneId: s.recordId,
      tipoUnita: s.tipoUnita,
      chiavePeriodo: s.chiave,
      importoDovuto: s.importo ?? attivita.importoDefault,
      meseAnno: s.tipoUnita === "mese" ? s.chiave : undefined,
    })),
  );

  revalidatePath("/iscrizioni");
  revalidatePath(`/bambini/${d.bambinoId}`);
  revalidatePath(`/attivita/${d.attivitaId}`);
  redirect(`/iscrizioni/${iscr.recordId}`);
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

  const attivita = await getAttivita(d.attivitaId);
  if (!attivita) return { error: "Attività non trovata" };

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

  const annoScolastico =
    attivita.annoScolastico ||
    (attivita.dataInizio
      ? annoScolasticoDaData(attivita.dataInizio)
      : annoScolasticoDaData(new Date()));

  await updateIscrizione(recordId, {
    bambinoId: d.bambinoId,
    attivitaId: d.attivitaId,
    annoScolastico,
    dataIscrizione: d.dataIscrizione || undefined,
    giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
    fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
    sessioniSelteIds: d.sessioniSelteIds,
    note: d.note || undefined,
  });

  // Cancella le rate per le sessioni rimosse (sono state già verificate non pagate).
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
        importoDovuto: s.importo ?? attivita.importoDefault,
        meseAnno: s.tipoUnita === "mese" ? s.chiave : undefined,
      })),
    );
  }

  revalidatePath("/iscrizioni");
  revalidatePath(`/iscrizioni/${recordId}`);
  return { ok: true };
}

export async function deleteIscrizioneAction(recordId: string) {
  await requireAdmin();
  await deleteIscrizione(recordId);
  revalidatePath("/iscrizioni");
  redirect("/iscrizioni");
}
