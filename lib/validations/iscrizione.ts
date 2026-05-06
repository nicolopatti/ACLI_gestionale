import { z } from "zod";
import { GIORNI_SETTIMANA } from "@/lib/config";

const giornoEnum = z.enum(GIORNI_SETTIMANA);

export const iscrizioneSchema = z.object({
  bambinoId: z.string().trim().min(1, "Bambino obbligatorio"),
  annoScolastico: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Formato anno: YYYY-YYYY"),
  dataIscrizione: z.string().trim().optional(),
  giorniSettimana: z
    .array(giornoEnum)
    .min(1, "Seleziona almeno un giorno"),
  importoMensileDefault: z.coerce.number().nonnegative("Importo non negativo"),
  note: z.string().trim().optional(),
});

export type IscrizioneInput = z.infer<typeof iscrizioneSchema>;
