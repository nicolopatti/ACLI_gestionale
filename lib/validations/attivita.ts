import { z } from "zod";
import { GIORNI_SETTIMANA, TIPI_ATTIVITA } from "@/lib/config";

const optionalString = z.string().trim().optional().or(z.literal(""));
const giornoEnum = z.enum(GIORNI_SETTIMANA);

export const attivitaSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome attività obbligatorio"),
    tipo: z.enum(TIPI_ATTIVITA),
    dataInizio: optionalString,
    dataFine: optionalString,
    attivo: z.coerce.boolean().default(true),
    note: optionalString,
    autoGeneraSessioniMensili: z.coerce.boolean().default(false),
    giorniSettimana: z.array(giornoEnum).default([]),
    fasceOrarie: z.array(z.string().trim().min(1)).default([]),
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
    // Doposcuola: giorni e fasce obbligatori (la griglia turni ha bisogno di
    // sapere quando l'attività ha luogo). Per laboratorio/locomotiva i giorni
    // sono facoltativi sull'attività; le sessioni hanno date specifiche.
    if (val.tipo === "doposcuola") {
      if (val.giorniSettimana.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["giorniSettimana"],
          message: "Seleziona almeno un giorno della settimana",
        });
      }
      if (val.fasceOrarie.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fasceOrarie"],
          message: "Seleziona almeno una fascia oraria",
        });
      }
    }
    if (val.tipo === "locomotiva" && val.giorniSettimana.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["giorniSettimana"],
        message: "La locomotiva deve indicare i giorni della settimana",
      });
    }
  });

export type AttivitaInput = z.infer<typeof attivitaSchema>;
