import { z } from "zod";
import { TIPI_PREZZO } from "@/lib/config";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const modalitaIscrizioneSchema = z.object({
  attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
  nome: z.string().trim().min(1, "Nome obbligatorio"),
  importo: z.coerce.number().nonnegative("Importo non negativo"),
  tipoPrezzo: z.enum(TIPI_PREZZO).default("per_sessione"),
  descrizione: optionalString,
  attivo: z.coerce.boolean().default(true),
});

export type ModalitaIscrizioneInput = z.infer<typeof modalitaIscrizioneSchema>;
