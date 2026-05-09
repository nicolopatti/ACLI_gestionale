import { z } from "zod";

// Le fasce orarie ammesse vengono dalle Attività attive nel periodo, quindi
// la validazione "fascia tra quelle offerte" è runtime-checked nei server
// actions, non in Zod. Qui chiediamo solo una stringa non vuota.
export const disponibilitaSlotSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO obbligatoria"),
  fasciaOraria: z.string().trim().min(1, "Fascia oraria obbligatoria"),
});

export const disponibilitaBatchSchema = z.object({
  educatoreId: z.string().trim().min(1, "Educatore obbligatorio"),
  meseAnno: z.string().regex(/^\d{4}-\d{2}$/, "Mese (YYYY-MM) obbligatorio"),
  slots: z.array(disponibilitaSlotSchema),
});

export type DisponibilitaSlotInput = z.infer<typeof disponibilitaSlotSchema>;
export type DisponibilitaBatchInput = z.infer<typeof disponibilitaBatchSchema>;
