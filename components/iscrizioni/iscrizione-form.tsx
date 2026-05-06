"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  createIscrizioneAction,
  updateIscrizioneAction,
} from "@/lib/actions/iscrizioni";
import { GIORNI_SETTIMANA, annoScolasticoCorrente } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Bambino, Iscrizione } from "@/lib/airtable/types";

interface Props {
  iscrizione?: Iscrizione;
  bambini: Bambino[];
  defaultBambinoId?: string;
}

const GIORNI_LABEL: Record<(typeof GIORNI_SETTIMANA)[number], string> = {
  lun: "Lunedì",
  mar: "Martedì",
  mer: "Mercoledì",
  gio: "Giovedì",
  ven: "Venerdì",
};

export function IscrizioneForm({ iscrizione, bambini, defaultBambinoId }: Props) {
  const action = iscrizione
    ? updateIscrizioneAction.bind(null, iscrizione.recordId)
    : createIscrizioneAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);

  const giorniSelezionati = new Set(iscrizione?.giorniSettimana ?? []);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bambinoId">Bambino</Label>
        <select
          id="bambinoId"
          name="bambinoId"
          required
          defaultValue={iscrizione?.bambinoId ?? defaultBambinoId ?? ""}
          className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">— Seleziona —</option>
          {bambini.map((b) => (
            <option key={b.recordId} value={b.recordId}>
              {b.cognome} {b.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="annoScolastico">Anno scolastico</Label>
          <Input
            id="annoScolastico"
            name="annoScolastico"
            placeholder="es. 2025-2026"
            required
            defaultValue={iscrizione?.annoScolastico ?? annoScolasticoCorrente()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataIscrizione">Data iscrizione</Label>
          <Input
            id="dataIscrizione"
            name="dataIscrizione"
            type="date"
            defaultValue={iscrizione?.dataIscrizione ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Giorni frequentati</Label>
          <div className="flex flex-wrap gap-3">
            {GIORNI_SETTIMANA.map((g) => (
              <label
                key={g}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="giorniSettimana"
                  value={g}
                  defaultChecked={giorniSelezionati.has(g)}
                  className="h-4 w-4"
                />
                {GIORNI_LABEL[g]}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="importoMensileDefault">Importo mensile (€)</Label>
          <Input
            id="importoMensileDefault"
            name="importoMensileDefault"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={iscrizione?.importoMensileDefault ?? 50}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={iscrizione?.note ?? ""} />
      </div>

      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Salvato.</p> : null}
      {!iscrizione && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Verranno creati automaticamente i mesi da settembre a giugno con l'importo specificato.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {iscrizione ? "Aggiorna" : "Crea iscrizione"}
      </Button>
    </form>
  );
}
