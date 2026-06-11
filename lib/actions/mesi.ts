"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { segnaPagatoSchema } from "@/lib/validations/mese";
import {
  getMese,
  getRataPaymentContext,
  updateMese,
} from "@/lib/db/mesi";
import { getIscrizione } from "@/lib/db/iscrizioni";
import { listCategorie } from "@/lib/db/categorie";
import { createMovimento, deleteMovimento } from "@/lib/db/movimenti";
import { logAudit } from "@/lib/db/audit-log";
import { BusinessError, userErrorMessage } from "@/lib/errors";

// Pagamenti rate: admin + coordinatore_educativo. L'account operativo
// dell'associazione e' un coordinatore e registra gli incassi delle iscrizioni;
// coerente con creaMovimentoAction (/spese-edu), che gia' apre la cassa al
// coordinatore.
async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new BusinessError("Non autorizzato");
  }
  return session!;
}

async function revalidateRatePaths(meseId: string) {
  // Una mutation su una rata tocca tre viste: la lista globale, il dettaglio
  // dell'iscrizione, la lista iscrizioni per attivita, e /cassa (perche'
  // viene creato/cancellato un movimento collegato).
  const rata = await getMese(meseId);
  if (rata) {
    revalidatePath(`/iscrizioni/${rata.iscrizioneId}`);
    const iscr = await getIscrizione(rata.iscrizioneId);
    if (iscr) revalidatePath(`/iscrizioni/attivita/${iscr.attivitaId}`);
  }
  revalidatePath("/iscrizioni");
  revalidatePath("/cassa");
}

export async function segnaPagatoAction(_prev: unknown, formData: FormData) {
  let actor;
  try {
    actor = await requireEduOrAdmin();
  } catch (e) {
    console.error("[segnaPagatoAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  const parsed = segnaPagatoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  try {
    const ctx = await getRataPaymentContext(d.meseId);
    if (!ctx) return { error: "Rata non trovata" };

    // Anti doppio conteggio: i pagamenti via BCC o SumUp arrivano gia' in
    // contabilita' quando si importa l'estratto conto (/cassa/import), quindi
    // NON creiamo qui un movimento per loro. Solo i contanti (Cassa), che non
    // transitano da nessun estratto conto, vengono registrati subito come
    // Entrata. La rata resta comunque marcata "pagato" in ogni caso (serve per
    // morosita'/avanzamento), semplicemente senza movimento collegato per
    // BCC/SumUp.
    const isContanti = d.mezzoPagamento === "Cassa";
    let movimentoId: string | undefined;
    let movimentoRecordId: string | undefined;

    if (isContanti) {
      // Categoria "Quote iscrizione" (default per pagamenti da iscrizione).
      const categorie = await listCategorie();
      const categoriaQuote = categorie.find(
        (c) =>
          c.tipo === "Entrata" && c.nome.toLowerCase() === "quote iscrizione",
      );

      const descrizione = `${ctx.attivitaNome} - ${ctx.bambinoNome} ${ctx.bambinoCognome}${
        ctx.rata.chiavePeriodo ? ` (${ctx.rata.chiavePeriodo})` : ""
      }`;

      const volontario = actor.user?.name ?? undefined;

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
      movimentoId = movimento.id;
      movimentoRecordId = movimento.recordId;
    }

    await updateMese(d.meseId, {
      importo_pagato: d.importoPagato,
      data_pagamento: d.dataPagamento,
      mezzo_pagamento: d.mezzoPagamento,
      stato_pagamento: "pagato",
      note: d.note || "",
      movimento_collegato: movimentoId ? [movimentoId] : [],
    });

    await logAudit({
      userId: actor.user?.recordId,
      userEmail: actor.user?.email,
      action: "rata.segna_pagato",
      entityType: "rata",
      entityId: d.meseId,
      diff: {
        importoPagato: d.importoPagato,
        dataPagamento: d.dataPagamento,
        mezzoPagamento: d.mezzoPagamento,
        movimentoId: movimentoRecordId ?? null,
        movimentoCreato: isContanti,
      },
    });

    await revalidateRatePaths(d.meseId);
    return { ok: true };
  } catch (err) {
    console.error("[segnaPagatoAction]", err);
    return { error: "Errore nel registrare il pagamento" };
  }
}

export async function annullaPagamentoAction(meseId: string) {
  let actor;
  try {
    actor = await requireEduOrAdmin();
  } catch (e) {
    console.error("[annullaPagamentoAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  try {
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
      userId: actor.user?.recordId,
      userEmail: actor.user?.email,
      action: "rata.annulla_pagamento",
      entityType: "rata",
      entityId: meseId,
      diff: { movimentoEliminatoId: rata?.movimentoCollegatoId ?? null },
    });
    await revalidateRatePaths(meseId);
    return { ok: true };
  } catch (e) {
    console.error("[annullaPagamentoAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'operazione") };
  }
}
