"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { segnaPresenzaSingolaAction } from "@/lib/actions/presenze";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FasciaOraria } from "@/lib/config";

export interface PresenzaRapidaCandidato {
  bambinoId: string;
  nomeCompleto: string;
  sessioneId?: string;
  fasceOrarie: FasciaOraria[];
  /**
   * Stato attuale registrato. `null` = nessun record per oggi (implicitamente
   * non segnato → il bambino è considerato assente di default fino alla
   * spunta).
   */
  presenteIniziale: boolean;
  oraIngressoIniziale?: string;
  oraUscitaIniziale?: string;
}

interface Props {
  data: string;
  candidati: PresenzaRapidaCandidato[];
}

interface RigaState {
  presente: boolean;
  oraIngresso: string;
  oraUscita: string;
  expanded: boolean;
  pending: boolean;
}

/**
 * Orari "previsti" derivati dalla fascia di iscrizione del bambino. Quando
 * la presenza viene segnata senza override, vengono salvati questi.
 */
function orariPrevisti(fasceOrarie: FasciaOraria[]): {
  ingresso: string;
  uscita: string;
} {
  if (fasceOrarie.includes("14-16") && !fasceOrarie.includes("14-18")) {
    return { ingresso: "14:00", uscita: "16:00" };
  }
  return { ingresso: "14:00", uscita: "18:00" };
}

function isOverride(
  riga: { oraIngresso: string; oraUscita: string },
  attesi: { ingresso: string; uscita: string },
): boolean {
  return riga.oraIngresso !== attesi.ingresso || riga.oraUscita !== attesi.uscita;
}

export function PresenzeRapide({ data, candidati }: Props) {
  const [stati, setStati] = useState<Record<string, RigaState>>(() =>
    Object.fromEntries(
      candidati.map((c) => {
        const attesi = orariPrevisti(c.fasceOrarie);
        return [
          c.bambinoId,
          {
            presente: c.presenteIniziale,
            oraIngresso: c.oraIngressoIniziale ?? attesi.ingresso,
            oraUscita: c.oraUscitaIniziale ?? attesi.uscita,
            expanded: false,
            pending: false,
          } as RigaState,
        ];
      }),
    ),
  );
  const [, startTransition] = useTransition();

  function patch(bambinoId: string, p: Partial<RigaState>) {
    setStati((prev) => ({ ...prev, [bambinoId]: { ...prev[bambinoId], ...p } }));
  }

  async function persist(
    candidato: PresenzaRapidaCandidato,
    riga: RigaState,
  ): Promise<{ ok?: boolean; error?: string }> {
    return await segnaPresenzaSingolaAction({
      bambinoId: candidato.bambinoId,
      data,
      sessioneId: candidato.sessioneId,
      presente: riga.presente,
      oraIngresso: riga.presente ? riga.oraIngresso : undefined,
      oraUscita: riga.presente ? riga.oraUscita : undefined,
    });
  }

  function togglePresente(candidato: PresenzaRapidaCandidato) {
    const corrente = stati[candidato.bambinoId];
    const attesi = orariPrevisti(candidato.fasceOrarie);
    const nuovaRiga: RigaState = {
      ...corrente,
      presente: !corrente.presente,
      // Se torno a "non presente" non chiudo la sezione orari (potrebbe
      // riaprirsi al toggle), ma resetto eventuale override aperto.
      expanded: !corrente.presente ? corrente.expanded : false,
      // Reset orari ai default se l'utente toglie la spunta
      oraIngresso: !corrente.presente ? corrente.oraIngresso : attesi.ingresso,
      oraUscita: !corrente.presente ? corrente.oraUscita : attesi.uscita,
      pending: true,
    };
    patch(candidato.bambinoId, nuovaRiga);
    startTransition(async () => {
      const res = await persist(candidato, nuovaRiga);
      if (res?.error) {
        toast.error(res.error);
        patch(candidato.bambinoId, { ...corrente, pending: false });
      } else {
        toast.success(
          nuovaRiga.presente
            ? `${candidato.nomeCompleto}: presente`
            : `${candidato.nomeCompleto}: non segnato`,
        );
        patch(candidato.bambinoId, { pending: false });
      }
    });
  }

  function salvaOrari(candidato: PresenzaRapidaCandidato) {
    const corrente = stati[candidato.bambinoId];
    if (!corrente.presente) return;
    if (!corrente.oraIngresso || !corrente.oraUscita) {
      toast.error("Imposta sia ingresso che uscita");
      return;
    }
    if (corrente.oraUscita <= corrente.oraIngresso) {
      toast.error("L'uscita deve essere successiva all'ingresso");
      return;
    }
    patch(candidato.bambinoId, { pending: true });
    startTransition(async () => {
      const res = await persist(candidato, corrente);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`${candidato.nomeCompleto}: orari aggiornati`);
        patch(candidato.bambinoId, { expanded: false });
      }
      patch(candidato.bambinoId, { pending: false });
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
        const riga = stati[c.bambinoId];
        const attesi = orariPrevisti(c.fasceOrarie);
        const haOverride = riga.presente && isOverride(riga, attesi);
        return (
          <li key={c.bambinoId} className="px-5 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={c.nomeCompleto} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {c.nomeCompleto}
                </div>
                <div className="text-[11.5px] text-[var(--muted-foreground)] tabular-nums">
                  {haOverride
                    ? `${riga.oraIngresso}–${riga.oraUscita}`
                    : `previsto ${attesi.ingresso}–${attesi.uscita}`}
                </div>
              </div>
              <label
                className={cn(
                  "inline-flex items-center gap-2 cursor-pointer select-none rounded-full border px-3 h-8 transition-colors",
                  riga.presente
                    ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--success)] hover:text-[var(--success)]",
                )}
              >
                {riga.pending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <input
                    type="checkbox"
                    checked={riga.presente}
                    onChange={() => togglePresente(c)}
                    className="w-4 h-4 accent-[var(--success)]"
                  />
                )}
                <span className="text-[12.5px] font-medium">Presente</span>
              </label>
              {riga.presente ? (
                <button
                  type="button"
                  onClick={() =>
                    patch(c.bambinoId, { expanded: !riga.expanded })
                  }
                  className="inline-flex items-center gap-1 text-[11.5px] text-[var(--muted-foreground)] hover:text-[var(--ink)] no-underline"
                  title={riga.expanded ? "Annulla" : "Modifica orari"}
                >
                  {riga.expanded ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <Pencil className="w-3.5 h-3.5" />
                  )}
                  {haOverride && !riga.expanded ? "Modificato" : "Orario"}
                </button>
              ) : null}
            </div>
            {riga.presente && riga.expanded ? (
              <div className="mt-2.5 ml-[44px] flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
                <label className="space-y-1">
                  <span className="block text-[10.5px] uppercase tracking-wide text-[var(--muted-foreground)]">
                    Ingresso
                  </span>
                  <Input
                    type="time"
                    value={riga.oraIngresso}
                    onChange={(e) =>
                      patch(c.bambinoId, { oraIngresso: e.currentTarget.value })
                    }
                    className="h-8 w-[110px]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-[10.5px] uppercase tracking-wide text-[var(--muted-foreground)]">
                    Uscita
                  </span>
                  <Input
                    type="time"
                    value={riga.oraUscita}
                    onChange={(e) =>
                      patch(c.bambinoId, { oraUscita: e.currentTarget.value })
                    }
                    className="h-8 w-[110px]"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => salvaOrari(c)}
                  disabled={riga.pending}
                >
                  {riga.pending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  Salva
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    patch(c.bambinoId, {
                      oraIngresso: attesi.ingresso,
                      oraUscita: attesi.uscita,
                    });
                  }}
                  className="text-[11.5px] text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                >
                  Ripristina previsto
                </button>
                <span className="ml-auto text-[11px] text-[var(--muted-foreground)] tabular-nums">
                  Previsto {attesi.ingresso}–{attesi.uscita}
                </span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
