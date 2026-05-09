"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createUtenteAction } from "@/lib/actions/utenti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RUOLI, etichettaRuolo } from "@/lib/config";

export function UtenteForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(createUtenteAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password (min 8)</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ruolo">Ruolo</Label>
          <select
            id="ruolo"
            name="ruolo"
            required
            defaultValue="volontario_cassa"
            className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm"
          >
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {etichettaRuolo(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="telegramUserId">Telegram User ID (opzionale)</Label>
          <Input
            id="telegramUserId"
            name="telegramUserId"
            placeholder="es. 123456789 — collega al bot esistente"
          />
        </div>
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Crea utente
      </Button>
    </form>
  );
}
