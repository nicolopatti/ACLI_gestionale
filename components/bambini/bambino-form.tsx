"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  createBambinoAction,
  updateBambinoAction,
} from "@/lib/actions/bambini";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Bambino, Genitore } from "@/lib/airtable/types";

interface Props {
  bambino?: Bambino;
  genitori: Genitore[];
}

export function BambinoForm({ bambino, genitori }: Props) {
  const action = bambino
    ? updateBambinoAction.bind(null, bambino.recordId)
    : createBambinoAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required defaultValue={bambino?.nome ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cognome">Cognome</Label>
          <Input id="cognome" name="cognome" required defaultValue={bambino?.cognome ?? ""} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="genitoreId">Genitore di riferimento</Label>
          <select
            id="genitoreId"
            name="genitoreId"
            required
            defaultValue={bambino?.genitoreId ?? ""}
            className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <option value="">— Seleziona —</option>
            {genitori.map((g) => (
              <option key={g.recordId} value={g.recordId}>
                {g.cognome} {g.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataNascita">Data di nascita</Label>
          <Input
            id="dataNascita"
            name="dataNascita"
            type="date"
            defaultValue={bambino?.dataNascita ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scuola">Scuola</Label>
          <Input id="scuola" name="scuola" defaultValue={bambino?.scuola ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="classe">Classe</Label>
          <Input id="classe" name="classe" defaultValue={bambino?.classe ?? ""} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="attivo"
            name="attivo"
            defaultChecked={bambino?.attivo ?? true}
            value="true"
          />
          <Label htmlFor="attivo" className="cursor-pointer">
            Iscritto attualmente
          </Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={bambino?.note ?? ""} />
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Salvato.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {bambino ? "Aggiorna" : "Crea"}
      </Button>
    </form>
  );
}
