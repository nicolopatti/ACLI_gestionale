import { z } from "zod";

export const genitoreSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  telefono: z.string().trim().optional(),
  email: z.string().trim().email("Email non valida").optional().or(z.literal("")),
  codiceFiscale: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type GenitoreInput = z.infer<typeof genitoreSchema>;
