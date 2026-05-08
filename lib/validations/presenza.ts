import { z } from "zod";
import { optionalText } from "./utils";

const oraRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const oraSchema = z
  .string()
  .trim()
  .regex(oraRegex, "Formato orario HH:MM (24h) non valido")
  .optional()
  .or(z.literal(""));

export const presenzaRigaSchema = z.object({
  bambinoId: z.string().min(1),
  oraIngresso: oraSchema,
  oraUscita: oraSchema,
});

export type PresenzaRigaInput = z.infer<typeof presenzaRigaSchema>;

export const presenzeBatchSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO obbligatoria"),
  attivitaId: optionalText,
  righe: z.array(presenzaRigaSchema),
});

export type PresenzeBatchInput = z.infer<typeof presenzeBatchSchema>;
