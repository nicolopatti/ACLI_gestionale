"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createAttivitaAction,
  updateAttivitaAction,
} from "@/lib/actions/attivita";
import { TIPI_ATTIVITA, type TipoAttivita, annoScolasticoCorrente } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Attivita } from "@/lib/airtable/types";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

interface Props {
  attivita?: Attivita;
}

export function AttivitaForm({ attivita }: Props) {
  const action = attivita
    ? updateAttivitaAction.bind(null, attivita.recordId)
    : createAttivitaAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);

  const [tipo, setTipo] = useState<TipoAttivita>(attivita?.tipo ?? "doposcuola");
  const isDoposcuola = tipo === "doposcuola";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="nome">Nome attività</Label>
          <Input id="nome" name="nome" required defaultValue={attivita?.nome ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoAttivita)}
            className={SELECT_CLASS}
          >
            {TIPI_ATTIVITA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {isDoposcuola && (
          <div className="space-y-2">
            <Label htmlFor="annoScolastico">Anno scolastico</Label>
            <Input
              id="annoScolastico"
              name="annoScolastico"
              placeholder="es. 2025-2026"
              required
              defaultValue={attivita?.annoScolastico ?? annoScolasticoCorrente()}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="dataInizio">Data inizio</Label>
          <Input
            id="dataInizio"
            name="dataInizio"
            type="date"
            required={!isDoposcuola}
            defaultValue={attivita?.dataInizio ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataFine">Data fine</Label>
          <Input
            id="dataFine"
            name="dataFine"
            type="date"
            required={!isDoposcuola}
            defaultValue={attivita?.dataFine ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="importoDefault">Importo default (€)</Label>
          <Input
            id="importoDefault"
            name="importoDefault"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={attivita?.importoDefault ?? 50}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="attivo"
            name="attivo"
            defaultChecked={attivita?.attivo ?? true}
            value="true"
          />
          <Label htmlFor="attivo" className="cursor-pointer">
            Attiva (visibile nelle iscrizioni)
          </Label>
        </div>
        {!attivita && isDoposcuola && (
          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox
              id="autoGeneraSessioniMensili"
              name="autoGeneraSessioniMensili"
              defaultChecked
              value="true"
            />
            <Label htmlFor="autoGeneraSessioniMensili" className="cursor-pointer">
              Genera automaticamente 10 sessioni mensili (settembre → giugno)
            </Label>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={attivita?.note ?? ""} />
      </div>
      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Salvato.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {attivita ? "Aggiorna" : "Crea attività"}
      </Button>
    </form>
  );
}
