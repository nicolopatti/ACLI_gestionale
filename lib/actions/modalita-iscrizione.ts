"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { modalitaIscrizioneSchema } from "@/lib/validations/modalita-iscrizione";
import {
  createModalita,
  deleteModalita,
  updateModalita,
} from "@/lib/db/modalita-iscrizione";
import {
  deleteIscrizioniByIds,
  listIscrizioniByModalita,
} from "@/lib/db/iscrizioni";
import { deleteMesiByIscrizione } from "@/lib/db/mesi";
import { BusinessError } from "@/lib/errors";

// Modalita' di iscrizione (CRUD), sotto-risorsa di /attivita/[id]: admin +
// coordinatore_educativo, coerente con attivita.ts.
async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new BusinessError("Non autorizzato");
  }
}

function parseModalitaForm(formData: FormData) {
  return {
    attivitaId: formData.get("attivitaId"),
    nome: formData.get("nome"),
    importo: formData.get("importo"),
    tipoPrezzo: formData.get("tipoPrezzo") ?? undefined,
    descrizione: formData.get("descrizione"),
    attivo:
      formData.get("attivo") === "on" ||
      formData.get("attivo") === "true" ||
      formData.get("attivo") === null,
  };
}

export async function createModalitaAction(_prev: unknown, formData: FormData) {
  await requireEduOrAdmin();
  const parsed = modalitaIscrizioneSchema.safeParse(parseModalitaForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await createModalita({
    attivitaId: d.attivitaId,
    nome: d.nome,
    importo: d.importo,
    tipoPrezzo: d.tipoPrezzo,
    descrizione: d.descrizione || undefined,
    attivo: d.attivo,
  });
  revalidatePath(`/attivita/${d.attivitaId}`);
  return { ok: true };
}

export async function updateModalitaAction(
  recordId: string,
  attivitaId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireEduOrAdmin();
  const parsed = modalitaIscrizioneSchema.safeParse({
    ...parseModalitaForm(formData),
    attivitaId,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateModalita(recordId, {
    nome: d.nome,
    importo: d.importo,
    tipo_prezzo: d.tipoPrezzo,
    descrizione: d.descrizione || "",
    attivo: d.attivo,
  });
  revalidatePath(`/attivita/${attivitaId}`);
  return { ok: true };
}

/**
 * Conta iscrizioni che usano una specifica modalità. Cancellandola, anche
 * loro vengono cascadeate (con le rate sotto), perché il link sarebbe rotto.
 */
export async function getDeleteModalitaImpactAction(
  recordId: string,
): Promise<{ iscrizioni: number }> {
  await requireEduOrAdmin();
  const iscr = await listIscrizioniByModalita(recordId);
  return { iscrizioni: iscr.length };
}

export async function deleteModalitaAction(recordId: string, attivitaId: string) {
  await requireEduOrAdmin();
  // Cascade: ogni iscrizione che usa questa modalità perderebbe il prezzo,
  // quindi la cancello (con le sue rate sotto). Per non lasciare iscrizioni
  // "stub" senza modalità definita.
  const iscrizioni = await listIscrizioniByModalita(recordId);
  for (const i of iscrizioni) {
    await deleteMesiByIscrizione(i.recordId);
  }
  await deleteIscrizioniByIds(iscrizioni.map((i) => i.recordId));
  await deleteModalita(recordId);
  revalidatePath(`/attivita/${attivitaId}`);
  revalidatePath("/iscrizioni");
}
