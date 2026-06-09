"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { educatoreSchema } from "@/lib/validations/educatore";
import {
  createEducatore,
  deleteEducatore,
  updateEducatore,
} from "@/lib/db/educatori";
import {
  deleteDisponibilitaByEducatore,
  listDisponibilitaByEducatore,
} from "@/lib/db/disponibilita";
import { BusinessError, userErrorMessage } from "@/lib/errors";

// Anagrafica educatori (CRUD): admin + coordinatore_educativo. Le pagine
// /educatori* sono gia' aperte al coordinatore (requireAdminOrCoordinatore).
// Guard dentro try/catch per evitare il crash della Server Action su ruolo
// non autorizzato. Coerente con iscrizioni.ts / presenze.ts.
async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new BusinessError("Non autorizzato");
  }
}

function parseEducatoreForm(formData: FormData) {
  return {
    nome: formData.get("nome"),
    cognome: formData.get("cognome"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    note: formData.get("note"),
    attivo:
      formData.get("attivo") === "on" ||
      formData.get("attivo") === "true" ||
      formData.get("attivo") === null,
  };
}

export async function createEducatoreAction(_prev: unknown, formData: FormData) {
  try {
    await requireEduOrAdmin();
  } catch (e) {
    console.error("[createEducatoreAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  const parsed = educatoreSchema.safeParse(parseEducatoreForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  let createdId: string;
  try {
    const created = await createEducatore({
      nome: d.nome,
      cognome: d.cognome,
      email: d.email || undefined,
      telefono: d.telefono || undefined,
      note: d.note || undefined,
      attivo: d.attivo,
    });
    createdId = created.recordId;
  } catch (e) {
    console.error("[createEducatoreAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
  revalidatePath("/educatori");
  redirect(`/educatori/${createdId}`);
}

export async function updateEducatoreAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  try {
    await requireEduOrAdmin();
  } catch (e) {
    console.error("[updateEducatoreAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  const parsed = educatoreSchema.safeParse(parseEducatoreForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  try {
    await updateEducatore(recordId, {
      nome: d.nome,
      cognome: d.cognome,
      email: d.email || undefined,
      telefono: d.telefono || undefined,
      note: d.note || undefined,
      attivo: d.attivo,
    });
  } catch (e) {
    console.error("[updateEducatoreAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
  revalidatePath("/educatori");
  revalidatePath(`/educatori/${recordId}`);
  return { ok: true };
}

/**
 * Conta le disponibilità collegate che verranno cascadeate cancellando
 * l'educatore. Senza questa cascade i turni mostrano avatar "??" perché
 * il link è rotto.
 */
export async function getDeleteEducatoreImpactAction(
  recordId: string,
): Promise<{ disponibilita: number }> {
  await requireEduOrAdmin();
  const dispo = await listDisponibilitaByEducatore(recordId);
  return { disponibilita: dispo.length };
}

export async function deleteEducatoreAction(recordId: string) {
  try {
    await requireEduOrAdmin();
  } catch (e) {
    console.error("[deleteEducatoreAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  try {
    await deleteDisponibilitaByEducatore(recordId);
    await deleteEducatore(recordId);
  } catch (e) {
    console.error("[deleteEducatoreAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'eliminazione") };
  }
  revalidatePath("/educatori");
  revalidatePath("/turni");
  redirect("/educatori");
}
