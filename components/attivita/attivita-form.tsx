"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createAttivitaAction,
  updateAttivitaAction,
} from "@/lib/actions/attivita";
import {
  FASCE_DISPONIBILITA,
  GIORNI_SETTIMANA,
  TIPI_ATTIVITA,
  type FasciaDisponibilita,
  type GiornoSettimana,
  type TipoAttivita,
} from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Attivita } from "@/lib/airtable/types";

const GIORNO_LABEL: Record<GiornoSettimana, string> = {
  lun: "Lun",
  mar: "Mar",
  mer: "Mer",
  gio: "Gio",
  ven: "Ven",
  sab: "Sab",
  dom: "Dom",
};

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

  const [giorni, setGiorni] = useState<Set<GiornoSettimana>>(
    new Set(attivita?.giorniSettimana ?? []),
  );
  const [fasce, setFasce] = useState<Set<FasciaDisponibilita>>(
    new Set(attivita?.fasceOrarie ?? []),
  );

  function toggleGiorno(g: GiornoSettimana) {
    setGiorni((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function toggleFascia(f: FasciaDisponibilita) {
    setFasce((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

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
      <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
        <div>
          <Label className="mb-2 block">Giorni della settimana in cui si svolge</Label>
          <div className="flex flex-wrap gap-2">
            {GIORNI_SETTIMANA.map((g) => {
              const checked = giorni.has(g);
              return (
                <label
                  key={g}
                  className={
                    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors " +
                    (checked
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                      : "border-[var(--border)] bg-[var(--surface)]")
                  }
                >
                  <input
                    type="checkbox"
                    name="giorniSettimana"
                    value={g}
                    checked={checked}
                    onChange={() => toggleGiorno(g)}
                    className="h-4 w-4"
                  />
                  {GIORNO_LABEL[g]}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            Lascia vuoto per non vincolare giorni specifici. La griglia turni e
            la pagina presenze useranno questi giorni come default.
          </p>
        </div>
        <div>
          <Label className="mb-2 block">Fasce orarie operative</Label>
          <div className="flex flex-wrap gap-2">
            {FASCE_DISPONIBILITA.map((f) => {
              const checked = fasce.has(f);
              return (
                <label
                  key={f}
                  className={
                    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors tabular-nums " +
                    (checked
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                      : "border-[var(--border)] bg-[var(--surface)]")
                  }
                >
                  <input
                    type="checkbox"
                    name="fasceOrarie"
                    value={f}
                    checked={checked}
                    onChange={() => toggleFascia(f)}
                    className="h-4 w-4"
                  />
                  {f}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            Le fasce selezionate determinano le righe visibili nella griglia
            turni quando si filtra per questa attività.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={attivita?.note ?? ""} />
      </div>
      {!attivita && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Dopo aver creato l&apos;attività potrai aggiungere una o più <strong>modalità di iscrizione</strong> con il relativo prezzo.
        </p>
      )}
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
