"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { primoAccessoAction } from "@/lib/actions/utenti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PrimoAccessoForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(primoAccessoAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="passwordNuova">Nuova password (min 8 caratteri)</Label>
        <Input
          id="passwordNuova"
          name="passwordNuova"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConferma">Conferma nuova password</Label>
        <Input
          id="passwordConferma"
          name="passwordConferma"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Imposta password e accedi
      </Button>
    </form>
  );
}
