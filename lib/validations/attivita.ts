import { z } from "zod";
import { TIPI_ATTIVITA } from "@/lib/config";
import { optionalText } from "./utils";

export const attivitaSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome attività obbligatorio"),
    tipo: z.enum(TIPI_ATTIVITA),
    dataInizio: optionalText,
    dataFine: optionalText,
    attivo: z.coerce.boolean().default(true),
    note: optionalText,
    autoGeneraSessioniMensili: z.coerce.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.tipo !== "doposcuola") {
      if (!val.dataInizio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataInizio"],
          message: "Data inizio obbligatoria per laboratori e locomotiva",
        });
      }
      if (!val.dataFine) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataFine"],
          message: "Data fine obbligatoria per laboratori e locomotiva",
        });
      }
    }
  });

export type AttivitaInput = z.infer<typeof attivitaSchema>;
