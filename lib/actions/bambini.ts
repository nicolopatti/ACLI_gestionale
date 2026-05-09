"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { bambinoSchema, type ContattoAggiuntivoInput } from "@/lib/validations/bambino";
import {
  createBambino as createBambinoAt,
  deleteBambino as deleteBambinoAt,
  updateBambino as updateBambinoAt,
} from "@/lib/airtable/bambini";
import { replaceContattiForBambino } from "@/lib/airtable/contatti-aggiuntivi";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

/**
 * Estrae la lista dei contatti aggiuntivi da una FormData.
 * I campi sono inviati come `contatti.<i>.<campo>` (recordId, ruolo, nome, cognome, telefono, note).
 */
function parseContattiFromFormData(formData: FormData): ContattoAggiuntivoInput[] {
  const indexes = new Set<number>();
  for (const key of formData.keys()) {
    const m = /^contatti\.(\d+)\./.exec(key);
    if (m) indexes.add(parseInt(m[1], 10));
  }
  const sorted = Array.from(indexes).sort((a, b) => a - b);
  return sorted
    .map((i) => ({
      recordId: String(formData.get(`contatti.${i}.recordId`) ?? ""),
      ruolo: String(formData.get(`contatti.${i}.ruolo`) ?? "altro") as ContattoAggiuntivoInput["ruolo"],
      nome: String(formData.get(`contatti.${i}.nome`) ?? ""),
      cognome: String(formData.get(`contatti.${i}.cognome`) ?? ""),
      telefono: String(formData.get(`contatti.${i}.telefono`) ?? ""),
      note: String(formData.get(`contatti.${i}.note`) ?? ""),
    }))
    .filter((c) => c.nome.trim() !== "" || c.cognome.trim() !== "");
}

function parseBambinoForm(formData: FormData) {
  return {
    nome: formData.get("nome"),
    cognome: formData.get("cognome"),
    dataNascita: formData.get("dataNascita"),
    scuola: formData.get("scuola"),
    classe: formData.get("classe"),
    nomeGenitore: formData.get("nomeGenitore"),
    cognomeGenitore: formData.get("cognomeGenitore"),
    telefonoGenitore: formData.get("telefonoGenitore"),
    emailGenitore: formData.get("emailGenitore"),
    cfGenitore: formData.get("cfGenitore"),
    fratelloDiId: formData.get("fratelloDiId"),
    note: formData.get("note"),
    attivo: formData.get("attivo") === "on" || formData.get("attivo") === "true",
    contatti: parseContattiFromFormData(formData),
  };
}

export async function createBambinoAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = bambinoSchema.safeParse(parseBambinoForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const created = await createBambinoAt({
    nome: d.nome,
    cognome: d.cognome,
    dataNascita: d.dataNascita || undefined,
    scuola: d.scuola || undefined,
    classe: d.classe || undefined,
    nomeGenitore: d.nomeGenitore,
    cognomeGenitore: d.cognomeGenitore,
    telefonoGenitore: d.telefonoGenitore || undefined,
    emailGenitore: d.emailGenitore || undefined,
    cfGenitore: d.cfGenitore || undefined,
    fratelloDiId: d.fratelloDiId || undefined,
    note: d.note || undefined,
    attivo: d.attivo,
  });
  if (d.contatti.length > 0) {
    await replaceContattiForBambino(
      created.recordId,
      d.contatti.map((c) => ({
        recordId: c.recordId || undefined,
        ruolo: c.ruolo,
        nome: c.nome,
        cognome: c.cognome,
        telefono: c.telefono || undefined,
        note: c.note || undefined,
      })),
    );
  }
  revalidatePath("/bambini");
  redirect(`/bambini/${created.recordId}`);
}

export async function updateBambinoAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();
  const parsed = bambinoSchema.safeParse(parseBambinoForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateBambinoAt(recordId, {
    nome: d.nome,
    cognome: d.cognome,
    dataNascita: d.dataNascita || undefined,
    scuola: d.scuola || undefined,
    classe: d.classe || undefined,
    nomeGenitore: d.nomeGenitore,
    cognomeGenitore: d.cognomeGenitore,
    telefonoGenitore: d.telefonoGenitore || undefined,
    emailGenitore: d.emailGenitore || undefined,
    cfGenitore: d.cfGenitore || undefined,
    fratelloDiId: d.fratelloDiId || undefined,
    note: d.note || undefined,
    attivo: d.attivo,
  });
  await replaceContattiForBambino(
    recordId,
    d.contatti.map((c) => ({
      recordId: c.recordId || undefined,
      ruolo: c.ruolo,
      nome: c.nome,
      cognome: c.cognome,
      telefono: c.telefono || undefined,
      note: c.note || undefined,
    })),
  );
  revalidatePath("/bambini");
  revalidatePath(`/bambini/${recordId}`);
  return { ok: true };
}

export async function deleteBambinoAction(recordId: string) {
  await requireAdmin();
  await deleteBambinoAt(recordId);
  revalidatePath("/bambini");
  redirect("/bambini");
}
