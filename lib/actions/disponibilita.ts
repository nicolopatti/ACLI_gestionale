"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { disponibilitaBatchSchema } from "@/lib/validations/disponibilita";
import { replaceDisponibilita, replaceTurnoCella, type TurnoCellaRow } from "@/lib/db/disponibilita";
import { getEducatore, listEducatori } from "@/lib/db/educatori";
import {
  listAttivitaAttiveInRange,
  unionFasceOfferte,
  unionGiorniOfferti,
} from "@/lib/db/turni";
import { dowToGiorno, type FasciaOraria, type GiornoSettimana } from "@/lib/config";
import { BusinessError, userErrorMessage } from "@/lib/errors";

async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new BusinessError("Non autorizzato");
  }
}

/**
 * Riceve dalla form i checkbox "slot_<data>_<fascia>" e li converte in una
 * lista di slot, poi sincronizza la tabella `Disponibilita` per quel mese.
 */
export async function salvaDisponibilitaAction(formData: FormData) {
  try {
    await requireEduOrAdmin();
  } catch (e) {
    console.error("[salvaDisponibilitaAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  const educatoreId = String(formData.get("educatoreId") ?? "");
  const meseAnno = String(formData.get("meseAnno") ?? "");

  const slots: Array<{ data: string; fasciaOraria: FasciaOraria }> = [];
  for (const key of formData.keys()) {
    if (!key.startsWith("slot_")) continue;
    const value = formData.get(key);
    if (value !== "on" && value !== "true") continue;
    const parts = key.slice(5).split("__");
    if (parts.length !== 2) continue;
    slots.push({
      data: parts[0],
      fasciaOraria: parts[1] as FasciaOraria,
    });
  }

  // Validazione: ogni slot deve cadere in una cella offerta (giorno + fascia)
  // da almeno una Attivita attiva nel periodo dello slot. La risposta è un
  // errore unico, non per slot — è un caso di sicurezza, l'UI non dovrebbe
  // permettere di submittare slot fuori dalle celle offerte.
  if (slots.length > 0) {
    const dates = slots.map((s) => s.data).sort();
    const attiveInRange = await listAttivitaAttiveInRange(dates[0], dates[dates.length - 1]);
    if (attiveInRange.length === 0) {
      return { error: "Nessuna attività attiva nel periodo: impossibile registrare disponibilità." };
    }
    const fasceOfferte = new Set<FasciaOraria>(unionFasceOfferte(attiveInRange));
    const giorniOfferti = new Set<GiornoSettimana>(unionGiorniOfferti(attiveInRange));
    for (const s of slots) {
      const dow = new Date(`${s.data}T00:00:00`).getDay();
      const giorno = dowToGiorno(dow);
      if (!giorniOfferti.has(giorno) || !fasceOfferte.has(s.fasciaOraria)) {
        return { error: `Cella non offerta da nessuna attività attiva: ${s.data} ${s.fasciaOraria}` };
      }
    }
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

  try {
    await replaceDisponibilita(
      educatoreId,
      educatore.nomeCompleto,
      meseAnno,
      parsed.data.slots,
    );
  } catch (e) {
    console.error("[salvaDisponibilitaAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }
  // Rinfresca tutte le viste che dipendono dalla Disponibilita: scheda
  // educatore, lista educatori (KPI ore mese), e griglia turni.
  revalidatePath(`/educatori/${educatoreId}`);
  revalidatePath("/educatori");
  revalidatePath("/turni");
  return { ok: true };
}

/**
 * Sostituisce gli educatori in turno per una cella (data, fascia). Riceve un
 * payload JSON-friendly tramite FormData come "rows" (JSON-encoded array di
 * `{ educatoreId }`). Le ore non sono più compilate manualmente: il consuntivo
 * è derivato dalla data (passata = ore della fascia in conto consuntivo).
 * Accessibile a admin e coordinatore_educativo.
 */
export async function salvaTurnoCellaAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireEduOrAdmin();
  } catch (e) {
    console.error("[salvaTurnoCellaAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'operazione") };
  }

  const data = String(formData.get("data") ?? "").trim();
  const fascia = String(formData.get("fascia") ?? "").trim() as FasciaOraria;
  const rowsRaw = String(formData.get("rows") ?? "[]");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data non valida" };
  if (!fascia) return { error: "Fascia non valida" };

  // Verifica che (data, fascia) sia una cella offerta da almeno un'Attivita
  // attiva. Anche qui è un check di sicurezza: l'UI mostra solo celle valide.
  const attive = await listAttivitaAttiveInRange(data, data);
  if (attive.length === 0) {
    return { error: "Nessuna attività attiva: impossibile assegnare turni." };
  }
  const fasceOfferte = new Set<FasciaOraria>(unionFasceOfferte(attive));
  const giorniOfferti = new Set<GiornoSettimana>(unionGiorniOfferti(attive));
  const giorno = dowToGiorno(new Date(`${data}T00:00:00`).getDay());
  if (!giorniOfferti.has(giorno) || !fasceOfferte.has(fascia)) {
    return { error: "Cella non offerta da nessuna attività attiva nel periodo." };
  }

  let rows: TurnoCellaRow[];
  try {
    const parsed = JSON.parse(rowsRaw) as unknown;
    if (!Array.isArray(parsed)) throw new Error();
    rows = parsed
      .filter((r): r is { educatoreId: string } => {
        return Boolean(r && typeof r === "object" && "educatoreId" in r);
      })
      .map((r) => ({ educatoreId: String(r.educatoreId) }));
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
    console.error("[salvaTurnoCellaAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'operazione") };
  }
}
