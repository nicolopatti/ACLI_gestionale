"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  createEducatoreAction,
  updateEducatoreAction,
} from "@/lib/actions/educatori";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Educatore } from "@/lib/airtable/types";

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
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Salvato.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {educatore ? "Aggiorna" : "Crea educatore"}
      </Button>
    </form>
  );
}
