"use client";

import { useActionState } from "react";
import { primoAccessoAction } from "@/lib/actions/utenti";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PrimoAccessoForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(primoAccessoAction, undefined);
  const hasError = !!state?.error;

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
        <p className="text-sm text-[var(--destructive)] field-error" key={state.error}>
          {state.error}
        </p>
      ) : null}
      <ActionButton
        type="submit"
        className="w-full"
        pending={pending}
        error={hasError && !pending}
        pendingText="Salvataggio…"
      >
        Imposta password e accedi
      </ActionButton>
    </form>
  );
}
