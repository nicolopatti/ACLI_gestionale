import { z } from "zod";
import { CONTATTO_RUOLI } from "@/lib/config";
import { optionalEmail, optionalText } from "./utils";

export const contattoAggiuntivoSchema = z.object({
  recordId: optionalText,
  ruolo: z.enum(CONTATTO_RUOLI),
  nome: z.string().trim().min(1, "Nome contatto obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome contatto obbligatorio"),
  telefono: optionalText,
  note: optionalText,
});

export const bambinoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  cognome: z.string().trim().min(1, "Cognome obbligatorio"),
  dataNascita: optionalText,
  scuola: optionalText,
  classe: optionalText,
  nomeGenitore: z.string().trim().min(1, "Nome genitore obbligatorio"),
  cognomeGenitore: z.string().trim().min(1, "Cognome genitore obbligatorio"),
  telefonoGenitore: optionalText,
  emailGenitore: optionalEmail,
  cfGenitore: optionalText,
  fratelloDiId: optionalText,
  note: optionalText,
  attivo: z.coerce.boolean().default(true),
  contatti: z.array(contattoAggiuntivoSchema).default([]),
});

export type BambinoInput = z.infer<typeof bambinoSchema>;
export type ContattoAggiuntivoInput = z.infer<typeof contattoAggiuntivoSchema>;
