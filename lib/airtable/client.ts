import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

/**
 * Singleton del client Airtable. Ritorna `null` quando le env non sono configurate
 * (es. durante i build su Vercel senza secret), così i consumer possono fare
 * graceful fallback (`if (!base) return []`).
 */
export const base: Airtable.Base | null =
  apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;

/**
 * Escape sicuro di una stringa per `filterByFormula` di Airtable.
 * Le formule usano apici singoli per le stringhe; gli apici interni vanno escapati.
 */
export function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export const TABLE_NAMES = {
  users: "Users",
  genitori: "Genitori",
  bambini: "Bambini",
  iscrizioni: "Iscrizioni",
  mesi: "MesiIscrizione",
  presenze: "Presenze",
  movimenti: "Movimenti",
  categorie: "Categorie",
} as const;
