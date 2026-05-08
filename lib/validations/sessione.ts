import { z } from "zod";
import { TIPI_UNITA } from "@/lib/config";
import { currencyNumberOptional, optionalText } from "./utils";

export const sessioneSchema = z.object({
  attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
  tipoUnita: z.enum(TIPI_UNITA),
  dataInizio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inizio obbligatoria"),
  dataFine: optionalText,
  importo: currencyNumberOptional,
});

export type SessioneInput = z.infer<typeof sessioneSchema>;
