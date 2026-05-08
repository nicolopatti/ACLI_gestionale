"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { attivitaSchema } from "@/lib/validations/attivita";
import {
  annoScolasticoDaData,
  etichettaMese,
  generaMesiAnnoScolastico,
} from "@/lib/config";
import {
  createAttivita,
  deleteAttivita,
  updateAttivita,
} from "@/lib/airtable/attivita";
import { createSessioniBatch } from "@/lib/airtable/sessioni";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

function parseAttivitaForm(formData: FormData) {
  return {
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    annoScolastico: formData.get("annoScolastico"),
    dataInizio: formData.get("dataInizio"),
    dataFine: formData.get("dataFine"),
    importoDefault: formData.get("importoDefault"),
    attivo:
      formData.get("attivo") === "on" ||
      formData.get("attivo") === "true" ||
      formData.get("attivo") === null /* default true */,
    note: formData.get("note"),
    autoGeneraSessioniMensili:
      formData.get("autoGeneraSessioniMensili") === "on" ||
      formData.get("autoGeneraSessioniMensili") === "true",
  };
}

function primoEUltimoGiornoDelMese(meseAnno: string): { dataInizio: string; dataFine: string } {
  const [y, m] = meseAnno.split("-").map((s) => parseInt(s, 10));
  const inizio = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimoGiorno = new Date(y, m, 0).getDate();
  const fine = `${y}-${String(m).padStart(2, "0")}-${String(ultimoGiorno).padStart(2, "0")}`;
  return { dataInizio: inizio, dataFine: fine };
}

export async function createAttivitaAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = attivitaSchema.safeParse(parseAttivitaForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const annoScolastico =
    d.tipo === "doposcuola"
      ? d.annoScolastico
      : d.dataInizio
        ? annoScolasticoDaData(d.dataInizio)
        : annoScolasticoDaData(new Date());

  const created = await createAttivita({
    nome: d.nome,
    tipo: d.tipo,
    annoScolastico: annoScolastico || undefined,
    dataInizio: d.dataInizio || undefined,
    dataFine: d.dataFine || undefined,
    importoDefault: d.importoDefault,
    attivo: d.attivo,
    note: d.note || undefined,
  });

  if (d.tipo === "doposcuola" && d.autoGeneraSessioniMensili && annoScolastico) {
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
  const annoScolastico =
    d.tipo === "doposcuola"
      ? d.annoScolastico
      : d.dataInizio
        ? annoScolasticoDaData(d.dataInizio)
        : "";
  await updateAttivita(recordId, {
    nome: d.nome,
    tipo: d.tipo,
    anno_scolastico: annoScolastico || "",
    data_inizio: d.dataInizio || "",
    data_fine: d.dataFine || "",
    importo_default: d.importoDefault,
    attivo: d.attivo,
    note: d.note || "",
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
