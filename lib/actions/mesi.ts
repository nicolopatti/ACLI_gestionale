"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { segnaPagatoSchema } from "@/lib/validations/mese";
import {
  getMese,
  getRataPaymentContext,
  updateMese,
} from "@/lib/db/mesi";
import { listCategorie } from "@/lib/db/categorie";
import { createMovimento, deleteMovimento } from "@/lib/db/movimenti";
import { logAudit } from "@/lib/db/audit-log";
import { BusinessError } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new BusinessError("Non autorizzato");
  return session;
}

export async function segnaPagatoAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = segnaPagatoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  try {
    const ctx = await getRataPaymentContext(d.meseId);
    if (!ctx) return { error: "Rata non trovata" };

    // Categoria "Quote iscrizione" (default per pagamenti da iscrizione).
    const categorie = await listCategorie();
    const categoriaQuote = categorie.find(
      (c) =>
        c.tipo === "Entrata" && c.nome.toLowerCase() === "quote iscrizione",
    );

    const descrizione = `${ctx.attivitaNome} - ${ctx.bambinoNome} ${ctx.bambinoCognome}${
      ctx.rata.chiavePeriodo ? ` (${ctx.rata.chiavePeriodo})` : ""
    }`;

    const volontario = admin.user?.name ?? undefined;

    const movimento = await createMovimento({
      tipo: "Entrata",
      importo: d.importoPagato,
      conto: d.mezzoPagamento,
      dataMovimento: d.dataPagamento,
      categoriaId: categoriaQuote?.recordId,
      voceRendicontoId: categoriaQuote?.voceRendicontoDefaultId,
      descrizione,
      volontario,
      note: d.note || undefined,
      origine: "rata",
    });

    await updateMese(d.meseId, {
      importo_pagato: d.importoPagato,
      data_pagamento: d.dataPagamento,
      mezzo_pagamento: d.mezzoPagamento,
      stato_pagamento: "pagato",
      note: d.note || "",
      movimento_collegato: [movimento.id],
    });

    await logAudit({
      userId: admin.user?.recordId,
      userEmail: admin.user?.email,
      action: "rata.segna_pagato",
      entityType: "rata",
      entityId: d.meseId,
      diff: {
        importoPagato: d.importoPagato,
        dataPagamento: d.dataPagamento,
        mezzoPagamento: d.mezzoPagamento,
        movimentoId: movimento.recordId,
      },
    });

    revalidatePath("/iscrizioni");
    revalidatePath("/cassa");
    return { ok: true };
  } catch (err) {
    console.error("[segnaPagatoAction]", err);
    return { error: "Errore nel registrare il pagamento" };
  }
}

export async function annullaPagamentoAction(meseId: string) {
  const admin = await requireAdmin();
  const rata = await getMese(meseId);
  if (rata?.movimentoCollegatoId) {
    try {
      await deleteMovimento(rata.movimentoCollegatoId);
    } catch (err) {
      console.error("[annullaPagamentoAction] delete movimento", err);
    }
  }
  await updateMese(meseId, {
    importo_pagato: 0,
    stato_pagamento: "non_pagato",
    movimento_collegato: [],
  });
  await logAudit({
    userId: admin.user?.recordId,
    userEmail: admin.user?.email,
    action: "rata.annulla_pagamento",
    entityType: "rata",
    entityId: meseId,
    diff: { movimentoEliminatoId: rata?.movimentoCollegatoId ?? null },
  });
  revalidatePath("/iscrizioni");
  revalidatePath("/cassa");
}
