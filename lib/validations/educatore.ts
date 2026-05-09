import { z } from "zod";
import { optionalString, optionalEmail } from "./utils";

export const educatoreSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  email: optionalEmail,
  telefono: optionalString,
  note: optionalString,
  attivo: z.coerce.boolean().default(true),
});

export type EducatoreInput = z.infer<typeof educatoreSchema>;
