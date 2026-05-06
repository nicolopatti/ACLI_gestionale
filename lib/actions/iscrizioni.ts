"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { iscrizioneSchema } from "@/lib/validations/iscrizione";
import { generaMesiAnnoScolastico } from "@/lib/config";
import {
  createIscrizione,
  deleteIscrizione,
  updateIscrizione,
} from "@/lib/airtable/iscrizioni";
import { createMesi } from "@/lib/airtable/mesi";
import type { GiornoSettimana } from "@/lib/config";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

export async function createIscrizioneAction(_prev: unknown, formData: FormData) {
  await requireAdmin();

  const giorni = formData.getAll("giorniSettimana") as GiornoSettimana[];
  const raw = {
    bambinoId: formData.get("bambinoId"),
    annoScolastico: formData.get("annoScolastico"),
    dataIscrizione: formData.get("dataIscrizione"),
    giorniSettimana: giorni,
    importoMensileDefault: formData.get("importoMensileDefault"),
    note: formData.get("note"),
  };
  const parsed = iscrizioneSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const iscr = await createIscrizione({
    bambinoId: d.bambinoId,
    annoScolastico: d.annoScolastico,
    dataIscrizione: d.dataIscrizione || undefined,
    giorniSettimana: d.giorniSettimana,
    importoMensileDefault: d.importoMensileDefault,
    note: d.note || undefined,
  });
  // Genera i record mensili per l'anno scolastico
  const mesi = generaMesiAnnoScolastico(d.annoScolastico);
  await createMesi(
    mesi.map((meseAnno) => ({
      iscrizioneId: iscr.recordId,
      meseAnno,
      importoDovuto: d.importoMensileDefault,
    })),
  );
  revalidatePath("/iscrizioni");
  revalidatePath(`/bambini/${d.bambinoId}`);
  redirect(`/iscrizioni/${iscr.recordId}`);
}

export async function updateIscrizioneAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  await requireAdmin();
  const giorni = formData.getAll("giorniSettimana") as GiornoSettimana[];
  const parsed = iscrizioneSchema.safeParse({
    bambinoId: formData.get("bambinoId"),
    annoScolastico: formData.get("annoScolastico"),
    dataIscrizione: formData.get("dataIscrizione"),
    giorniSettimana: giorni,
    importoMensileDefault: formData.get("importoMensileDefault"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateIscrizione(recordId, {
    bambino: [d.bambinoId],
    anno_scolastico: d.annoScolastico,
    data_iscrizione: d.dataIscrizione || "",
    giorni_settimana: d.giorniSettimana,
    importo_mensile_default: d.importoMensileDefault,
    note: d.note || "",
  });
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
