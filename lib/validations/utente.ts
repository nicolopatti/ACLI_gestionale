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

export const cambiaPasswordSchema = z
  .object({
    passwordAttuale: z.string().min(1, "Inserisci la password attuale"),
    passwordNuova: z.string().min(8, "Almeno 8 caratteri"),
    passwordConferma: z.string().min(1, "Conferma la nuova password"),
  })
  .refine((d) => d.passwordNuova === d.passwordConferma, {
    message: "La conferma non coincide con la nuova password",
    path: ["passwordConferma"],
  })
  .refine((d) => d.passwordNuova !== d.passwordAttuale, {
    message: "La nuova password deve essere diversa da quella attuale",
    path: ["passwordNuova"],
  });

export type CambiaPasswordInput = z.infer<typeof cambiaPasswordSchema>;

export const primoAccessoSchema = z
  .object({
    passwordNuova: z.string().min(8, "Almeno 8 caratteri"),
    passwordConferma: z.string().min(1, "Conferma la nuova password"),
  })
  .refine((d) => d.passwordNuova === d.passwordConferma, {
    message: "La conferma non coincide con la nuova password",
    path: ["passwordConferma"],
  });

export type PrimoAccessoInput = z.infer<typeof primoAccessoSchema>;
