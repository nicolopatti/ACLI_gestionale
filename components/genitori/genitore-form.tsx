"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  createGenitoreAction,
  updateGenitoreAction,
} from "@/lib/actions/genitori";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Genitore } from "@/lib/airtable/types";

interface Props {
  genitore?: Genitore;
}

export function GenitoreForm({ genitore }: Props) {
  const action = genitore
    ? updateGenitoreAction.bind(null, genitore.recordId)
    : createGenitoreAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="nome" label="Nome" defaultValue={genitore?.nome} required />
        <Field name="cognome" label="Cognome" defaultValue={genitore?.cognome} required />
        <Field name="telefono" label="Telefono" defaultValue={genitore?.telefono} />
        <Field name="email" label="Email" type="email" defaultValue={genitore?.email} />
        <Field
          name="codiceFiscale"
          label="Codice fiscale"
          defaultValue={genitore?.codiceFiscale}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" defaultValue={genitore?.note ?? ""} rows={3} />
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Salvato.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {genitore ? "Aggiorna" : "Crea"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}
