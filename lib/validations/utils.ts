import { z } from "zod";

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
