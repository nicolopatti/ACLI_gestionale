import { z } from "zod";

export const bambinoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  genitoreId: z.string().trim().min(1, "Genitore obbligatorio"),
  dataNascita: z.string().trim().optional(),
  scuola: z.string().trim().optional(),
  classe: z.string().trim().optional(),
  note: z.string().trim().optional(),
  attivo: z.coerce.boolean().default(true),
});

export type BambinoInput = z.infer<typeof bambinoSchema>;
