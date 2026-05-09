"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { aggiornaConfigAttivitaAction } from "@/lib/actions/attivita";
import { Button } from "@/components/ui/button";
import {
  FASCE_DISPONIBILITA,
  GIORNI_SETTIMANA,
  type FasciaDisponibilita,
  type GiornoSettimana,
} from "@/lib/config";
import { cn } from "@/lib/utils";

const GIORNO_LABEL: Record<GiornoSettimana, string> = {
  lun: "Lun",
  mar: "Mar",
  mer: "Mer",
  gio: "Gio",
  ven: "Ven",
  sab: "Sab",
  dom: "Dom",
};

interface Props {
  attivitaId: string;
  attivitaNome: string;
  giorniIniziali: GiornoSettimana[];
  fasceIniziali: FasciaDisponibilita[];
}

/**
 * Editor inline per i campi `giorniSettimana` e `fasceOrarie` di un'attività.
 * Esposto su /turni e /educatori così l'utente non deve uscire dal flusso di
 * pianificazione per configurare l'attività. Quando i campi sono già
 * valorizzati, mostra un riassunto con bottone "Modifica" che apre i
 * checkbox.
 */
export function AttivitaConfigInline({
  attivitaId,
  attivitaNome,
  giorniIniziali,
  fasceIniziali,
}: Props) {
  const giaConfigurato =
    giorniIniziali.length > 0 || fasceIniziali.length > 0;
  const [editing, setEditing] = useState(!giaConfigurato);
  const [giorni, setGiorni] = useState<Set<GiornoSettimana>>(
    new Set(giorniIniziali),
  );
  const [fasce, setFasce] = useState<Set<FasciaDisponibilita>>(
    new Set(fasceIniziali),
  );
  const [pending, startTransition] = useTransition();

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

  function salva() {
    startTransition(async () => {
      const res = await aggiornaConfigAttivitaAction({
        recordId: attivitaId,
        giorniSettimana: Array.from(giorni),
        fasceOrarie: Array.from(fasce),
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${attivitaNome}: configurazione aggiornata`);
      setEditing(false);
      // Refresh per riprendere i nuovi valori dal server (filtra la griglia)
      window.location.reload();
    });
  }

  if (!editing) {
    const giorniLabel =
      giorniIniziali.length > 0
        ? giorniIniziali.map((g) => GIORNO_LABEL[g]).join(" · ")
        : "tutti i giorni";
    const fasceLabel =
      fasceIniziali.length > 0 ? fasceIniziali.join(" · ") : "tutte le fasce";
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <div className="text-[12.5px] text-[var(--muted-foreground)] flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Giorni: <strong className="text-[var(--ink)]">{giorniLabel}</strong>
          </span>
          <span>
            Fasce: <strong className="text-[var(--ink)]">{fasceLabel}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-2.5 h-8 text-[12px] rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          <Pencil className="w-3.5 h-3.5" /> Modifica
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-[var(--muted-foreground)]">
          Configura giorni e fasce per <strong className="text-[var(--ink)]">{attivitaNome}</strong>.
          Influenza la griglia turni e il calendario disponibilità.
        </p>
        {giaConfigurato ? (
          <button
            type="button"
            onClick={() => {
              setGiorni(new Set(giorniIniziali));
              setFasce(new Set(fasceIniziali));
              setEditing(false);
            }}
            className="text-[var(--muted-foreground)] hover:text-[var(--ink)]"
            aria-label="Annulla"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        <span className="block text-[10.5px] uppercase tracking-wide text-[var(--muted-foreground)]">
          Giorni della settimana
        </span>
        <div className="flex flex-wrap gap-1.5">
          {GIORNI_SETTIMANA.map((g) => {
            const checked = giorni.has(g);
            return (
              <label
                key={g}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-[12px] cursor-pointer transition-colors",
                  checked
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGiorno(g)}
                  className="w-3.5 h-3.5"
                />
                {GIORNO_LABEL[g]}
              </label>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <span className="block text-[10.5px] uppercase tracking-wide text-[var(--muted-foreground)]">
          Fasce orarie operative
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FASCE_DISPONIBILITA.map((f) => {
            const checked = fasce.has(f);
            return (
              <label
                key={f}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-[12px] cursor-pointer transition-colors tabular-nums",
                  checked
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFascia(f)}
                  className="w-3.5 h-3.5"
                />
                {f}
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" size="sm" onClick={salva} disabled={pending}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Salva
        </Button>
      </div>
    </div>
  );
}
