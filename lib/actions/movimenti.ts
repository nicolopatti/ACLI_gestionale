"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import {
  createMovimento,
  setCategoriaMovimento,
  setStatoMovimento,
  setVoceRendicontoMovimento,
} from "@/lib/db/movimenti";
import { logAudit } from "@/lib/db/audit-log";
import { movimentoSchema } from "@/lib/validations/movimento";
import { BusinessError, userErrorMessage } from "@/lib/errors";

export interface CreaMovimentoResult {
  ok?: boolean;
  error?: string;
  recordId?: string;
}

async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new BusinessError("Non autorizzato");
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
    console.error("[creaMovimentoAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'operazione") };
  }

  const parsed = movimentoSchema.safeParse({
    tipo: formData.get("tipo"),
    importo: formData.get("importo"),
    conto: formData.get("conto"),
    dataMovimento: formData.get("dataMovimento"),
    categoriaId: formData.get("categoriaId") ?? "",
    voceRendicontoId: formData.get("voceRendicontoId") ?? "",
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
      voceRendicontoId: parsed.data.voceRendicontoId || undefined,
      descrizione: parsed.data.descrizione,
      note: parsed.data.note || undefined,
      volontario: user.nome,
      telegramUserId: user.telegramUserId,
      origine: "app",
    });
    await logAudit({
      userId: user.recordId,
      userEmail: user.email,
      action: "movimento.create",
      entityType: "movimento",
      entityId: created.recordId,
      diff: {
        tipo: parsed.data.tipo,
        importo: parsed.data.importo,
        conto: parsed.data.conto,
        dataMovimento: parsed.data.dataMovimento,
        origine: "app",
      },
    });
    revalidatePath("/spese-edu");
    revalidatePath("/cassa");
    return { ok: true, recordId: created.recordId };
  } catch (e) {
    console.error("[creaMovimentoAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'operazione") };
  }
}

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new BusinessError("Non autorizzato");
  return session;
}

export async function setCategoriaMovimentoAction(
  movimentoId: string,
  categoriaId: string | null,
) {
  const admin = await requireAdmin();
  await setCategoriaMovimento(movimentoId, categoriaId);
  await logAudit({
    userId: admin.user?.recordId,
    userEmail: admin.user?.email,
    action: "movimento.set_categoria",
    entityType: "movimento",
    entityId: movimentoId,
    diff: { categoriaId },
  });
  revalidatePath("/rendiconto");
  revalidatePath("/cassa");
}

export async function setVoceRendicontoMovimentoAction(
  movimentoId: string,
  voceRendicontoId: string | null,
) {
  const admin = await requireAdmin();
  await setVoceRendicontoMovimento(movimentoId, voceRendicontoId);
  await logAudit({
    userId: admin.user?.recordId,
    userEmail: admin.user?.email,
    action: "movimento.set_voce_rendiconto",
    entityType: "movimento",
    entityId: movimentoId,
    diff: { voceRendicontoId },
  });
  revalidatePath("/rendiconto");
  revalidatePath("/rendiconto/voce/[code]", "page");
  revalidatePath("/cassa");
}

export async function softDeleteMovimentoAction(movimentoId: string) {
  const admin = await requireAdmin();
  await setStatoMovimento(movimentoId, "errato");
  await logAudit({
    userId: admin.user?.recordId,
    userEmail: admin.user?.email,
    action: "movimento.soft_delete",
    entityType: "movimento",
    entityId: movimentoId,
    diff: { newStato: "errato" },
  });
  revalidatePath("/rendiconto");
  revalidatePath("/rendiconto/voce/[code]", "page");
  revalidatePath("/cassa");
}

export async function restoreMovimentoAction(movimentoId: string) {
  const admin = await requireAdmin();
  await setStatoMovimento(movimentoId, "valido");
  await logAudit({
    userId: admin.user?.recordId,
    userEmail: admin.user?.email,
    action: "movimento.restore",
    entityType: "movimento",
    entityId: movimentoId,
    diff: { newStato: "valido" },
  });
  revalidatePath("/rendiconto");
  revalidatePath("/rendiconto/voce/[code]", "page");
  revalidatePath("/cassa");
}
