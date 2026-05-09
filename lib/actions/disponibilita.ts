"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { disponibilitaBatchSchema } from "@/lib/validations/disponibilita";
import { replaceDisponibilita, replaceTurnoCella, type TurnoCellaRow } from "@/lib/airtable/disponibilita";
import { getEducatore, listEducatori } from "@/lib/airtable/educatori";
import { FASCE_DISPONIBILITA, type FasciaDisponibilita } from "@/lib/config";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") throw new Error("Non autorizzato");
}

async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new Error("Non autorizzato");
  }
}

/**
 * Riceve dalla form i checkbox "slot_<data>_<fascia>" e li converte in una
 * lista di slot, poi sincronizza la tabella `Disponibilita` per quel mese.
 */
export async function salvaDisponibilitaAction(formData: FormData) {
  await requireAdmin();
  const educatoreId = String(formData.get("educatoreId") ?? "");
  const meseAnno = String(formData.get("meseAnno") ?? "");

  const slots: Array<{ data: string; fasciaOraria: FasciaDisponibilita }> = [];
  for (const key of formData.keys()) {
    if (!key.startsWith("slot_")) continue;
    const value = formData.get(key);
    if (value !== "on" && value !== "true") continue;
    const parts = key.slice(5).split("__");
    if (parts.length !== 2) continue;
    slots.push({
      data: parts[0],
      fasciaOraria: parts[1] as FasciaDisponibilita,
    });
  }

  const parsed = disponibilitaBatchSchema.safeParse({
    educatoreId,
    meseAnno,
    slots,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const educatore = await getEducatore(educatoreId);
  if (!educatore) return { error: "Educatore non trovato" };

  await replaceDisponibilita(
    educatoreId,
    educatore.nomeCompleto,
    meseAnno,
    parsed.data.slots,
  );
  revalidatePath(`/educatori/${educatoreId}`);
  return { ok: true };
}

const ORA_RE = /^(\d{2}):(\d{2})$/;

/**
 * Sostituisce gli educatori in turno per una cella (data, fascia) e
 * imposta le ore consuntivo opzionali. Riceve un payload JSON-friendly
 * tramite FormData come "rows" (JSON-encoded). Accessibile a admin e
 * coordinatore_educativo.
 */
export async function salvaTurnoCellaAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireEduOrAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const data = String(formData.get("data") ?? "").trim();
  const fascia = String(formData.get("fascia") ?? "").trim() as FasciaDisponibilita;
  const rowsRaw = String(formData.get("rows") ?? "[]");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data non valida" };
  if (!FASCE_DISPONIBILITA.includes(fascia)) return { error: "Fascia non valida" };

  let rows: TurnoCellaRow[];
  try {
    const parsed = JSON.parse(rowsRaw) as unknown;
    if (!Array.isArray(parsed)) throw new Error();
    rows = parsed
      .filter((r): r is { educatoreId: string; oraIngresso?: string; oraUscita?: string } => {
        return Boolean(r && typeof r === "object" && "educatoreId" in r);
      })
      .map((r) => {
        const ingresso = typeof r.oraIngresso === "string" ? r.oraIngresso.trim() : "";
        const uscita = typeof r.oraUscita === "string" ? r.oraUscita.trim() : "";
        return {
          educatoreId: String(r.educatoreId),
          oraIngresso: ingresso && ORA_RE.test(ingresso) ? ingresso : undefined,
          oraUscita: uscita && ORA_RE.test(uscita) ? uscita : undefined,
        };
      });
  } catch {
    return { error: "Payload non valido" };
  }

  // Arricchisce le righe con il nome dell'educatore (per l'etichetta)
  const educatori = await listEducatori();
  const eduById = new Map(educatori.map((e) => [e.recordId, e] as const));
  const enrichedRows: TurnoCellaRow[] = rows
    .filter((r) => eduById.has(r.educatoreId))
    .map((r) => ({
      ...r,
      educatoreNomeCompleto: eduById.get(r.educatoreId)?.nomeCompleto,
    }));

  try {
    await replaceTurnoCella(data, fascia, enrichedRows);
    revalidatePath("/turni");
    revalidatePath("/educatori");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
