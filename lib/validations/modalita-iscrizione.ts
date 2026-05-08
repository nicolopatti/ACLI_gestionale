import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const modalitaIscrizioneSchema = z.object({
  attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  importo: z.coerce.number().nonnegative("Importo non negativo"),
  descrizione: optionalString,
  attivo: z.coerce.boolean().default(true),
});

export type ModalitaIscrizioneInput = z.infer<typeof modalitaIscrizioneSchema>;
