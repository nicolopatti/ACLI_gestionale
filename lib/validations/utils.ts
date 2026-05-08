import { z } from "zod";

/**
 * Stringa opzionale "robusta": accetta `null`, `undefined` o stringa
 * (eventualmente vuota). Trim. Restituisce sempre `string | undefined`.
 *
 * Necessario perché `formData.get(name)` di FormData restituisce `null` per
 * campi non inviati, e Zod's `z.string().optional()` rifiuterebbe il `null`
 * (accetta solo `string` o `undefined`).
 */
export const optionalText = z.preprocess(
  (v) => (v == null ? undefined : v),
  z.string().trim().optional(),
);

/**
 * Email opzionale: stessa logica di `optionalText` ma valida il formato email
 * se presente. Stringa vuota → undefined (non viene validata come email).
 */
export const optionalEmail = z.preprocess(
  (v) => {
    if (v == null) return undefined;
    if (typeof v === "string" && v.trim() === "") return undefined;
    return v;
  },
  z.string().trim().email("Email non valida").optional(),
);

/**
 * Schema per importi in EUR. Accetta:
 *  - stringhe in formato italiano "79,99" o internazionale "79.99"
 *  - stringhe con simboli "€" o spazi ("€ 79,99")
 *  - numeri JS già pronti
 * Restituisce sempre un `number` non negativo. Stringa vuota → errore
 * "Importo obbligatorio". Stringa non parsabile → errore "Importo non valido".
 */
export const currencyNumber = z.preprocess(
  (val) => {
    if (typeof val === "number") return val;
    if (typeof val !== "string") return val;
    const cleaned = val.trim().replace(/[€\s]/g, "").replace(",", ".");
    if (cleaned === "") return undefined;
    const n = Number(cleaned);
    if (Number.isNaN(n)) return val; // lascia passare la stringa originale per far fallire z.number()
    return n;
  },
  z
    .number({ message: "Importo non valido" })
    .nonnegative("Importo non negativo"),
);

/**
 * Variante opzionale: stringa vuota o assenza del campo → `undefined`.
 */
export const currencyNumberOptional = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === "number") return val;
    if (typeof val !== "string") return val;
    const cleaned = val.trim().replace(/[€\s]/g, "").replace(",", ".");
    if (cleaned === "") return undefined;
    const n = Number(cleaned);
    if (Number.isNaN(n)) return val;
    return n;
  },
  z
    .number({ message: "Importo non valido" })
    .nonnegative("Importo non negativo")
    .optional(),
);
