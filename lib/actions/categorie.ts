"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { setVoceRendicontoDefault } from "@/lib/db/categorie";
import { BusinessError } from "@/lib/errors";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new BusinessError("Non autorizzato");
}

export async function setVoceRendicontoDefaultAction(
  categoriaId: string,
  voceRendicontoId: string | null,
) {
  await requireAdmin();
  await setVoceRendicontoDefault(categoriaId, voceRendicontoId);
  revalidatePath("/categorie");
  revalidatePath("/rendiconto");
}
