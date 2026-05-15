import { z } from "zod";
import { GIORNI_SETTIMANA } from "@/lib/config";

const giornoEnum = z.enum(GIORNI_SETTIMANA);

// Le fasce ammesse dipendono dall'Attività scelta: validazione "fascia tra
// quelle offerte dall'attività" è runtime-checked nel server action, non qui.
export const iscrizioneSchema = z.object({
  bambinoId: z.string().trim().min(1, "Bambino obbligatorio"),
  attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
  modalitaId: z.string().trim().min(1, "Modalità di iscrizione obbligatoria"),
  dataIscrizione: z.string().trim().optional().or(z.literal("")),
  sessioniSelteIds: z.array(z.string().min(1)).min(1, "Seleziona almeno una sessione"),
  giorniSettimana: z.array(giornoEnum).default([]),
  fasceOrarie: z.array(z.string().trim().min(1)).default([]),
  // Se true e l'attivita ha attivita.quotaIscrizione valorizzata, viene
  // generata una rata aggiuntiva tipo_riga="quota_iscrizione".
  applicaQuotaIscrizione: z.coerce.boolean().default(false),
  // Id degli sconti (regole su sconti_attivita) selezionati per questa iscrizione.
  scontiIds: z.array(z.string().min(1)).default([]),
  note: z.string().trim().optional().or(z.literal("")),
});

export type IscrizioneInput = z.infer<typeof iscrizioneSchema>;
