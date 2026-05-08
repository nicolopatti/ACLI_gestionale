import { z } from "zod";
import { optionalEmail, optionalText } from "./utils";

export const educatoreSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  email: optionalEmail,
  telefono: optionalText,
  note: optionalText,
  attivo: z.coerce.boolean().default(true),
});

export type EducatoreInput = z.infer<typeof educatoreSchema>;
