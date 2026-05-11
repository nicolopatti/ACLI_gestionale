"use client";

import { useActionState, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  createAttivitaAction,
  updateAttivitaAction,
} from "@/lib/actions/attivita";
import {
  GIORNI_SETTIMANA,
  GIORNI_LABEL,
  TIPI_ATTIVITA,
  type GiornoSettimana,
  type TipoAttivita,
} from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Attivita } from "@/lib/airtable/types";

const FASCE_SUGGERITE = ["14-16", "16-18"] as const;

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
  const isLaboratorio = tipo === "laboratorio";

  const [giorni, setGiorni] = useState<Set<GiornoSettimana>>(
    () => new Set(attivita?.giorniSettimana ?? []),
  );
  const [fasce, setFasce] = useState<Set<string>>(
    () => new Set(attivita?.fasceOrarie ?? []),
  );
  const [fasciaCustom, setFasciaCustom] = useState("");

  const fasceVisibili = Array.from(new Set([...FASCE_SUGGERITE, ...fasce]));

  function toggleGiorno(g: GiornoSettimana) {
    setGiorni((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }
  function toggleFascia(f: string) {
    setFasce((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }
  function addFasciaCustom() {
    const v = fasciaCustom.trim();
    if (!v) return;
    if (!/^\d{1,2}(:\d{2})?-\d{1,2}(:\d{2})?$/.test(v)) return;
    setFasce((prev) => new Set([...prev, v]));
    setFasciaCustom("");
  }
  function removeFasciaCustom(f: string) {
    setFasce((prev) => {
      const next = new Set(prev);
      next.delete(f);
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
      {!isLaboratorio && (
        <div className="space-y-2">
          <Label>
            Giorni della settimana
            {isDoposcuola && <span className="text-[var(--destructive)]"> *</span>}
          </Label>
          <div className="flex flex-wrap gap-2">
            {GIORNI_SETTIMANA.map((g) => (
              <label
                key={g}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--surface-2)]"
              >
                <input
                  type="checkbox"
                  name="giorniSettimana"
                  value={g}
                  checked={giorni.has(g)}
                  onChange={() => toggleGiorno(g)}
                  className="h-4 w-4"
                />
                {GIORNI_LABEL[g]}
              </label>
            ))}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isDoposcuola
              ? "Giorni in cui il doposcuola si svolge."
              : "Giorni della settimana coperti (per locomotiva: vincolo per espandere le sessioni settimanali)."}
          </p>
        </div>
      )}

      {!isLaboratorio && (
        <div className="space-y-2">
          <Label>
            Fasce orarie
            {isDoposcuola && <span className="text-[var(--destructive)]"> *</span>}
          </Label>
          <div className="flex flex-wrap gap-2">
            {fasceVisibili.map((f) => (
              <label
                key={f}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--surface-2)]"
              >
                <input
                  type="checkbox"
                  name="fasceOrarie"
                  value={f}
                  checked={fasce.has(f)}
                  onChange={() => toggleFascia(f)}
                  className="h-4 w-4"
                />
                {f}
                {!FASCE_SUGGERITE.includes(f as (typeof FASCE_SUGGERITE)[number]) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeFasciaCustom(f);
                    }}
                    className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    aria-label={`Rimuovi fascia ${f}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Fascia custom (es. 10-12)"
              value={fasciaCustom}
              onChange={(e) => setFasciaCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFasciaCustom();
                }
              }}
              className="max-w-[180px]"
            />
            <Button type="button" variant="outline" size="sm" onClick={addFasciaCustom}>
              Aggiungi
            </Button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Spunta le fasce in cui l&apos;attività ha luogo. Per il pacchetto
            14-18 spunta sia <code>14-16</code> sia <code>16-18</code>.
          </p>
        </div>
      )}

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
