import { z } from "zod";
import { TIPI_UNITA } from "@/lib/config";

const optionalString = z.string().trim().optional().or(z.literal(""));

const meseRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const giornataRegex = /^\d{4}-\d{2}-\d{2}$/;
const settimanaRegex = /^\d{4}-W\d{2}$/;

export const sessioneSchema = z
  .object({
    attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
    tipoUnita: z.enum(TIPI_UNITA),
    chiave: z.string().trim().min(1, "Chiave obbligatoria"),
    etichetta: z.string().trim().min(1, "Etichetta obbligatoria"),
    dataInizio: optionalString,
    dataFine: optionalString,
    importo: z.coerce.number().nonnegative().optional(),
  })
  .superRefine((val, ctx) => {
    const re =
      val.tipoUnita === "mese"
        ? meseRegex
        : val.tipoUnita === "giornata"
          ? giornataRegex
          : settimanaRegex;
    if (!re.test(val.chiave)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chiave"],
        message: `Formato chiave non valido per tipo ${val.tipoUnita}`,
      });
    }
  });

export type SessioneInput = z.infer<typeof sessioneSchema>;
