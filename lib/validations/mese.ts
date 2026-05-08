import { z } from "zod";
import { MEZZI_PAGAMENTO } from "@/lib/config";
import { currencyNumber } from "./utils";

export const segnaPagatoSchema = z.object({
  meseId: z.string().min(1),
  importoPagato: currencyNumber,
  dataPagamento: z.string().min(1),
  mezzoPagamento: z.enum(MEZZI_PAGAMENTO),
  note: z.string().trim().optional(),
});

export type SegnaPagatoInput = z.infer<typeof segnaPagatoSchema>;
