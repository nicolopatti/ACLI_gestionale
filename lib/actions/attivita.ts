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
} from "@/lib/airtable/attivita";
import { createSessioniBatch } from "@/lib/airtable/sessioni";
import { primoEUltimoGiornoDelMese } from "@/lib/sessioni-utils";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
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
  };
}

export async function createAttivitaAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = attivitaSchema.safeParse(parseAttivitaForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const created = await createAttivita({
    nome: d.nome,
    tipo: d.tipo,
    dataInizio: d.dataInizio || undefined,
    dataFine: d.dataFine || undefined,
    attivo: d.attivo,
    note: d.note || undefined,
    giorniSettimana: d.giorniSettimana,
    fasceOrarie: d.fasceOrarie,
  });

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

  revalidatePath("/attivita");
  redirect(`/attivita/${created.recordId}`);
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
  await updateAttivita(recordId, {
    nome: d.nome,
    tipo: d.tipo,
    data_inizio: d.dataInizio || "",
    data_fine: d.dataFine || "",
    attivo: d.attivo,
    note: d.note || "",
    giorni_settimana: d.giorniSettimana,
    fasce_orarie: d.fasceOrarie,
  });
  revalidatePath("/attivita");
  revalidatePath(`/attivita/${recordId}`);
  return { ok: true };
}

export async function deleteAttivitaAction(recordId: string) {
  await requireAdmin();
  await deleteAttivita(recordId);
  revalidatePath("/attivita");
  redirect("/attivita");
}
