"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { attivitaSchema } from "@/lib/validations/attivita";
import { etichettaMese, generaMesiAnnoScolastico, annoScolasticoCorrente } from "@/lib/config";
import {
  createAttivita,
  deleteAttivita,
  updateAttivita,
} from "@/lib/db/attivita";
import {
  createSessioniBatch,
  deleteSessioniByIds,
  listSessioniByAttivita,
} from "@/lib/db/sessioni";
import {
  deleteIscrizioniByIds,
  listIscrizioni,
} from "@/lib/db/iscrizioni";
import {
  deleteMesiByIscrizione,
  listMesiByIscrizione,
} from "@/lib/db/mesi";
import {
  deleteModalitaByIds,
  listModalitaByAttivita,
} from "@/lib/db/modalita-iscrizione";
import { primoEUltimoGiornoDelMese } from "@/lib/sessioni-utils";
import { BusinessError, userErrorMessage } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new BusinessError("Non autorizzato");
}

function parseAttivitaForm(formData: FormData) {
  return {
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine"),
    attivo:
      formData.get("attivo") === "on" ||
      formData.get("attivo") === "true" ||
      formData.get("attivo") === null /* default true */,
    note: formData.get("note"),
    autoGeneraSessioniMensili:
      formData.get("autoGeneraSessioniMensili") === "on" ||
      formData.get("autoGeneraSessioniMensili") === "true",
    giorniSettimana: formData.getAll("giorniSettimana"),
    fasceOrarie: formData.getAll("fasceOrarie"),
    quotaIscrizione: formData.get("quotaIscrizione"),
  };
}

export async function createAttivitaAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = attivitaSchema.safeParse(parseAttivitaForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  let createdId: string;
  try {
    const created = await createAttivita({
      nome: d.nome,
      tipo: d.tipo,
      dataInizio: d.dataInizio || undefined,
      dataFine: d.dataFine || undefined,
      attivo: d.attivo,
      note: d.note || undefined,
      giorniSettimana: d.giorniSettimana,
      fasceOrarie: d.fasceOrarie,
      quotaIscrizione: d.quotaIscrizione,
    });
    createdId = created.recordId;

    if (d.tipo === "doposcuola" && d.autoGeneraSessioniMensili) {
      const annoScolastico = annoScolasticoCorrente();
      const mesi = generaMesiAnnoScolastico(annoScolastico);
      await createSessioniBatch(
        mesi.map((meseAnno) => {
          const { dataInizio, dataFine } = primoEUltimoGiornoDelMese(meseAnno);
          return {
            attivitaId: created.recordId,
            tipoUnita: "mese" as const,
            chiave: meseAnno,
            etichetta: etichettaMese(meseAnno),
            dataInizio,
            dataFine,
          };
        }),
      );
    }
  } catch (e) {
    console.error("[createAttivitaAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }

  revalidatePath("/attivita");
  redirect(`/attivita/${createdId}`);
}

export async function updateAttivitaAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();
  const parsed = attivitaSchema.safeParse(parseAttivitaForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  try {
    await updateAttivita(recordId, {
      nome: d.nome,
      tipo: d.tipo,
      data_inizio: d.dataInizio || "",
      data_fine: d.dataFine || "",
      attivo: d.attivo,
      note: d.note || "",
      giorni_settimana: d.giorniSettimana,
      fasce_orarie: d.fasceOrarie,
      quota_iscrizione: d.quotaIscrizione ?? null,
    });
  } catch (e) {
    console.error("[updateAttivitaAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
  revalidatePath("/attivita");
  revalidatePath(`/attivita/${recordId}`);
  return { ok: true };
}

/**
 * Conta i record collegati che verranno cascadeati cancellando un'attività.
 */
export async function getDeleteAttivitaImpactAction(
  recordId: string,
): Promise<{
  modalita: number;
  sessioni: number;
  iscrizioni: number;
  rate: number;
}> {
  await requireAdmin();
  const [modalita, sessioni, iscrizioni] = await Promise.all([
    listModalitaByAttivita(recordId),
    listSessioniByAttivita(recordId),
    listIscrizioni({ attivitaId: recordId }),
  ]);
  let rate = 0;
  for (const i of iscrizioni) {
    const r = await listMesiByIscrizione(i.recordId);
    rate += r.length;
  }
  return {
    modalita: modalita.length,
    sessioni: sessioni.length,
    iscrizioni: iscrizioni.length,
    rate,
  };
}

export async function deleteAttivitaAction(recordId: string) {
  await requireAdmin();
  try {
    // Cascade dal basso verso l'alto: rate → iscrizioni → sessioni/modalità →
    // attività. Le rate vanno per ogni iscrizione perché il loro link punta lì,
    // non all'attività direttamente.
    const [iscrizioni, sessioni, modalita] = await Promise.all([
      listIscrizioni({ attivitaId: recordId }),
      listSessioniByAttivita(recordId),
      listModalitaByAttivita(recordId),
    ]);
    for (const i of iscrizioni) {
      await deleteMesiByIscrizione(i.recordId);
    }
    await deleteIscrizioniByIds(iscrizioni.map((i) => i.recordId));
    await deleteSessioniByIds(sessioni.map((s) => s.recordId));
    await deleteModalitaByIds(modalita.map((m) => m.recordId));
    await deleteAttivita(recordId);
  } catch (e) {
    console.error("[deleteAttivitaAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'eliminazione") };
  }
  revalidatePath("/attivita");
  redirect("/attivita");
}
