"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cambiaPasswordAction } from "@/lib/actions/utenti";
import { ActionButton, CheckIconAnimated } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CambiaPasswordForm() {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(cambiaPasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [success, setSuccess] = useState(false);

  // Quando l'azione torna ok, accendo "success" per ~1.4s così il bottone
  // mostra il flash verde e l'utente vede chiaramente che il salvataggio è
  // andato a buon fine. Reset del form a parte.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setSuccess(true);
      const id = setTimeout(() => setSuccess(false), 1400);
      return () => clearTimeout(id);
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const hasError = !!state?.error;

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="passwordAttuale">Password attuale</Label>
        <Input
          id="passwordAttuale"
          name="passwordAttuale"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordNuova">Nuova password (min 8 caratteri)</Label>
        <Input
          id="passwordNuova"
          name="passwordNuova"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
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
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)] field-error" key={state.error}>
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="flex items-center gap-1.5 text-sm text-[var(--success-soft-ink)]">
          <CheckIconAnimated /> Password aggiornata.
        </p>
      ) : null}
      <ActionButton
        type="submit"
        pending={pending}
        success={success}
        error={hasError && !pending}
        pendingText="Salvataggio…"
        successText="Aggiornata ✓"
      >
        Aggiorna password
      </ActionButton>
    </form>
  );
}
