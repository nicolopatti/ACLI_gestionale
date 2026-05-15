import { z } from "zod";
import { TIPI_SCONTO } from "@/lib/config";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const scontoAttivitaSchema = z
  .object({
    attivitaId: z.string().trim().min(1, "Attività obbligatoria"),
    nome: z.string().trim().min(1, "Nome sconto obbligatorio"),
    tipo: z.enum(TIPI_SCONTO),
    valore: z.coerce.number().positive("Il valore dev'essere maggiore di 0"),
    descrizione: optionalString,
    ordering: z.coerce.number().int().nonnegative().default(0),
    attivo: z.coerce.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    // Una percentuale > 100 non avrebbe senso (azzererebbe il prezzo e oltre).
    if (val.tipo === "percentuale" && val.valore > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valore"],
        message: "Una percentuale non puo' superare 100",
      });
    }
  });

export type ScontoAttivitaInput = z.infer<typeof scontoAttivitaSchema>;
