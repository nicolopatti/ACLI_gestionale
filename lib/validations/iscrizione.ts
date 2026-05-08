import { z } from "zod";
import { FASCE_ORARIE, GIORNI_SETTIMANA } from "@/lib/config";
import { optionalText } from "./utils";

const giornoEnum = z.enum(GIORNI_SETTIMANA);
const fasciaEnum = z.enum(FASCE_ORARIE);

export const iscrizioneSchema = z.object({
  bambinoId: z.string().trim().min(1, "Bambino obbligatorio"),
  attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
  modalitaId: z.string().trim().min(1, "Modalità di iscrizione obbligatoria"),
  dataIscrizione: optionalText,
  sessioniSelteIds: z.array(z.string().min(1)).min(1, "Seleziona almeno una sessione"),
  giorniSettimana: z.array(giornoEnum).default([]),
  fasceOrarie: z.array(fasciaEnum).default([]),
  note: optionalText,
});

export type IscrizioneInput = z.infer<typeof iscrizioneSchema>;
