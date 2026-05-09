import { z } from "zod";
import { MEZZI_PAGAMENTO } from "@/lib/config";

export const movimentoSchema = z.object({
  tipo: z.enum(["Entrata", "Uscita"]),
  importo: z.coerce.number().positive("Importo deve essere positivo"),
  conto: z.enum(MEZZI_PAGAMENTO),
  dataMovimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  categoriaId: z.string().trim().optional().or(z.literal("")),
  descrizione: z.string().trim().min(1, "Descrizione obbligatoria"),
  note: z.string().trim().optional().or(z.literal("")),
});

export type MovimentoInput = z.infer<typeof movimentoSchema>;
