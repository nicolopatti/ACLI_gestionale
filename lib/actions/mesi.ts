"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { segnaPagatoSchema } from "@/lib/validations/mese";
import { updateMese } from "@/lib/db/mesi";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

export async function segnaPagatoAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const parsed = segnaPagatoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  await updateMese(d.meseId, {
    importo_pagato: d.importoPagato,
    data_pagamento: d.dataPagamento,
    mezzo_pagamento: d.mezzoPagamento,
    stato_pagamento: "pagato",
    note: d.note || "",
  });
  revalidatePath("/iscrizioni");
  return { ok: true };
}

export async function annullaPagamentoAction(meseId: string) {
  await requireAdmin();
  await updateMese(meseId, {
    importo_pagato: 0,
    stato_pagamento: "non_pagato",
  });
  revalidatePath("/iscrizioni");
}
