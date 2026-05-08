import { z } from "zod";
import { TIPI_ATTIVITA } from "@/lib/config";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const attivitaSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome attività obbligatorio"),
    tipo: z.enum(TIPI_ATTIVITA),
    dataInizio: optionalString,
    dataFine: optionalString,
    attivo: z.coerce.boolean().default(true),
    note: optionalString,
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
