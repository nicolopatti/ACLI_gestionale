import { z } from "zod";
import { currencyNumber, optionalText } from "./utils";

export const modalitaIscrizioneSchema = z.object({
  attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  importo: currencyNumber,
  descrizione: optionalText,
  attivo: z.coerce.boolean().default(true),
});

export type ModalitaIscrizioneInput = z.infer<typeof modalitaIscrizioneSchema>;
