import { z } from "zod";
import { RUOLI } from "@/lib/config";

export const nuovoUtenteSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Almeno 8 caratteri"),
  nome: z.string().trim().min(1),
  ruolo: z.enum(RUOLI),
  telegramUserId: z.string().trim().optional(),
});

export type NuovoUtenteInput = z.infer<typeof nuovoUtenteSchema>;
