import { z } from "zod";
import { FASCE_DISPONIBILITA } from "@/lib/config";

const fasciaEnum = z.enum(FASCE_DISPONIBILITA);

export const disponibilitaSlotSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO obbligatoria"),
  fasciaOraria: fasciaEnum,
});

export const disponibilitaBatchSchema = z.object({
  educatoreId: z.string().trim().min(1, "Educatore obbligatorio"),
  meseAnno: z.string().regex(/^\d{4}-\d{2}$/, "Mese (YYYY-MM) obbligatorio"),
  slots: z.array(disponibilitaSlotSchema),
});

export type DisponibilitaSlotInput = z.infer<typeof disponibilitaSlotSchema>;
export type DisponibilitaBatchInput = z.infer<typeof disponibilitaBatchSchema>;
