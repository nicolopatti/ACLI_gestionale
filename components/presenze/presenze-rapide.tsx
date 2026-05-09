"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { segnaPresenzaSingolaAction } from "@/lib/actions/presenze";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FasciaOraria } from "@/lib/config";

export type StatoPresenzaRapida = "presente" | "assente" | null;

export interface PresenzaRapidaCandidato {
  bambinoId: string;
  nomeCompleto: string;
  sessioneId?: string;
  fasceOrarie: FasciaOraria[];
  statoIniziale: StatoPresenzaRapida;
}

interface Props {
  data: string;
  candidati: PresenzaRapidaCandidato[];
}

function defaultOrari(fasceOrarie: FasciaOraria[]): {
  ingresso: string;
  uscita: string;
} {
  // Se l'iscrizione include la fascia 14-16 ma non 14-18, la presenza
  // rapida si ferma alle 16:00; in tutti gli altri casi 14:00-18:00.
  if (fasceOrarie.includes("14-16") && !fasceOrarie.includes("14-18")) {
    return { ingresso: "14:00", uscita: "16:00" };
  }
  return { ingresso: "14:00", uscita: "18:00" };
}

export function PresenzeRapide({ data, candidati }: Props) {
  const [stati, setStati] = useState<Record<string, StatoPresenzaRapida>>(() =>
    Object.fromEntries(candidati.map((c) => [c.bambinoId, c.statoIniziale])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function setStato(bambinoId: string, prossimo: StatoPresenzaRapida) {
    const candidato = candidati.find((c) => c.bambinoId === bambinoId);
    if (!candidato) return;

    const precedente = stati[bambinoId] ?? null;
    if (precedente === prossimo) return;

    setStati((prev) => ({ ...prev, [bambinoId]: prossimo }));
    setPendingId(bambinoId);

    startTransition(async () => {
      const orari = defaultOrari(candidato.fasceOrarie);
      const res = await segnaPresenzaSingolaAction({
        bambinoId,
        data,
        sessioneId: candidato.sessioneId,
        presente: prossimo === "presente",
        oraIngresso: prossimo === "presente" ? orari.ingresso : undefined,
        oraUscita: prossimo === "presente" ? orari.uscita : undefined,
      });
      if (res?.error) {
        // Rollback ottimistico
        setStati((prev) => ({ ...prev, [bambinoId]: precedente }));
        toast.error(res.error);
      } else if (prossimo === "presente") {
        toast.success(`${candidato.nomeCompleto}: presente`);
      } else if (prossimo === "assente") {
        toast.success(`${candidato.nomeCompleto}: assente`);
      }
      setPendingId((id) => (id === bambinoId ? null : id));
    });
  }

  if (candidati.length === 0) {
    return (
      <p className="text-[13px] text-[var(--muted-foreground)] px-5 py-5">
        Oggi non ci sono bambini previsti.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {candidati.map((c) => {
        const stato = stati[c.bambinoId] ?? null;
        const isPending = pendingId === c.bambinoId;
        return (
          <li
            key={c.bambinoId}
            className="px-5 py-2.5 flex items-center gap-3"
          >
            <Avatar name={c.nomeCompleto} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">
                {c.nomeCompleto}
              </div>
              {c.fasceOrarie.length > 0 ? (
                <div className="text-[11.5px] text-[var(--muted-foreground)] tabular-nums">
                  {c.fasceOrarie.join(" · ")}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStato(c.bambinoId, "presente")}
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 h-7 text-[11.5px] font-medium transition-colors",
                  stato === "presente"
                    ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--success)] hover:text-[var(--success)]",
                )}
                aria-pressed={stato === "presente"}
              >
                {isPending && stato === "presente" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Presente
              </button>
              <button
                type="button"
                onClick={() => setStato(c.bambinoId, "assente")}
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 h-7 text-[11.5px] font-medium transition-colors",
                  stato === "assente"
                    ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--danger)] hover:text-[var(--danger)]",
                )}
                aria-pressed={stato === "assente"}
              >
                {isPending && stato === "assente" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                Assente
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
