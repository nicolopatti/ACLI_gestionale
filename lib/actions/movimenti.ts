"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { createMovimento } from "@/lib/airtable/movimenti";
import { movimentoSchema } from "@/lib/validations/movimento";

export interface CreaMovimentoResult {
  ok?: boolean;
  error?: string;
  recordId?: string;
}

async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new Error("Non autorizzato");
  }
  return session!.user!;
}

export async function creaMovimentoAction(
  _prev: CreaMovimentoResult | undefined,
  formData: FormData,
): Promise<CreaMovimentoResult> {
  let user;
  try {
    user = await requireEduOrAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = movimentoSchema.safeParse({
    tipo: formData.get("tipo"),
    importo: formData.get("importo"),
    conto: formData.get("conto"),
    dataMovimento: formData.get("dataMovimento"),
    categoriaId: formData.get("categoriaId") ?? "",
    descrizione: formData.get("descrizione"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dati non validi" };
  }

  try {
    const created = await createMovimento({
      tipo: parsed.data.tipo,
      importo: parsed.data.importo,
      conto: parsed.data.conto,
      dataMovimento: parsed.data.dataMovimento,
      categoriaId: parsed.data.categoriaId || undefined,
      descrizione: parsed.data.descrizione,
      note: parsed.data.note || undefined,
      volontario: user.nome,
      telegramUserId: user.telegramUserId,
    });
    revalidatePath("/spese-edu");
    revalidatePath("/cassa");
    return { ok: true, recordId: created.recordId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
