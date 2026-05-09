import { z } from "zod";

/**
 * Stringa opzionale: accetta `string`, `null`, `undefined`. Trim implicito.
 *
 * Necessario perché `formData.get(key)` restituisce `null` quando il campo
 * non è presente nella form (es. input renderizzati condizionalmente come
 * `fratelloDiId`). Il classico `z.string().optional().or(z.literal(""))`
 * rifiuta `null` con "Invalid input"; con `preprocess` lo trattiamo come
 * stringa vuota prima della validazione.
 */
export const optionalString = z.preprocess(
  (v) => (v == null ? "" : v),
  z.string().trim(),
);

/**
 * Stringa opzionale che, se valorizzata, deve essere un'email valida.
 * Accetta `null`/`undefined`/`""` come "non specificata".
 */
export const optionalEmail = z.preprocess(
  (v) => (v == null ? "" : v),
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Email non valida",
    }),
);
