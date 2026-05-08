import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));
const optionalEmail = z
  .string()
  .trim()
  .email("Email non valida")
  .optional()
  .or(z.literal(""));

export const educatoreSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  email: optionalEmail,
  telefono: optionalString,
  note: optionalString,
  attivo: z.coerce.boolean().default(true),
});

export type EducatoreInput = z.infer<typeof educatoreSchema>;
