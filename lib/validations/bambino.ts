import { z } from "zod";
import { CONTATTO_RUOLI } from "@/lib/config";

const optionalString = z.string().trim().optional().or(z.literal(""));
const optionalEmail = z
  .string()
  .trim()
  .email("Email non valida")
  .optional()
  .or(z.literal(""));

export const contattoAggiuntivoSchema = z.object({
  recordId: optionalString,
  ruolo: z.enum(CONTATTO_RUOLI),
  nome: z.string().trim().min(1, "Nome contatto obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome contatto obbligatorio"),
  telefono: optionalString,
  note: optionalString,
});

export const bambinoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  dataNascita: optionalString,
  scuola: optionalString,
  classe: optionalString,
  nomeGenitore: z.string().trim().min(1, "Nome genitore obbligatorio"),
  cognomeGenitore: z.string().trim().min(1, "Cognome genitore obbligatorio"),
  telefonoGenitore: optionalString,
  emailGenitore: optionalEmail,
  cfGenitore: optionalString,
  fratelloDiId: optionalString,
  note: optionalString,
  attivo: z.coerce.boolean().default(true),
  contatti: z.array(contattoAggiuntivoSchema).default([]),
});

export type BambinoInput = z.infer<typeof bambinoSchema>;
export type ContattoAggiuntivoInput = z.infer<typeof contattoAggiuntivoSchema>;
