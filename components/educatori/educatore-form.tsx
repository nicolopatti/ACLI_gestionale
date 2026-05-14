"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createEducatoreAction,
  updateEducatoreAction,
} from "@/lib/actions/educatori";
import { ActionButton, CheckIconAnimated } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Educatore } from "@/lib/db/types";

interface Props {
  educatore?: Educatore;
}

export function EducatoreForm({ educatore }: Props) {
  const action = educatore
    ? updateEducatoreAction.bind(null, educatore.recordId)
    : createEducatoreAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);
  const [success, setSuccess] = useState(false);
  const hasError = !!state?.error;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state?.ok) {
      setSuccess(true);
      const id = setTimeout(() => setSuccess(false), 1400);
      return () => clearTimeout(id);
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required defaultValue={educatore?.nome ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cognome">Cognome</Label>
          <Input id="cognome" name="cognome" required defaultValue={educatore?.cognome ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={educatore?.email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Telefono</Label>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            defaultValue={educatore?.telefono ?? ""}
          />
        </div>
        <div className="flex items-center gap-2 pt-6 md:col-span-2">
          <Checkbox
            id="attivo"
            name="attivo"
            defaultChecked={educatore?.attivo ?? true}
            value="true"
          />
          <Label htmlFor="attivo" className="cursor-pointer">
            Educatore attivo
          </Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={educatore?.note ?? ""} />
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)] field-error" key={state.error}>
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="flex items-center gap-1.5 text-sm text-[var(--success-soft-ink)]">
          <CheckIconAnimated /> Salvato.
        </p>
      ) : null}
      <ActionButton
        type="submit"
        pending={pending}
        success={success}
        error={hasError && !pending}
        pendingText="Salvataggio…"
      >
        {educatore ? "Aggiorna" : "Crea educatore"}
      </ActionButton>
    </form>
  );
}
