"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { cn } from "@/lib/utils";

export interface DeleteImpactItem {
  /** Nome plurale della tabella collegata (es. "Rate", "Presenze"). */
  label: string;
  /** Quanti record di quel tipo verranno cancellati a cascata. */
  count: number;
}

export interface DeleteConfirmDialogProps {
  /** Etichetta del trigger (default: "Elimina"). */
  triggerLabel?: string;
  /** Variante di stile del trigger (default: destructive). */
  triggerVariant?: "destructive" | "outline" | "ghost";
  /** Mostra solo l'icona cestino (utile in tabelle). */
  triggerIconOnly?: boolean;
  /** Disabilita il trigger (es. attività con dipendenze in altro contesto). */
  triggerDisabled?: boolean;

  /** Titolo del dialog (es. "Elimina iscrizione"). */
  title: string;
  /** Descrizione: cosa sta per essere cancellato. */
  description?: React.ReactNode;

  /** Funzione che ritorna il count delle dipendenze. Eseguita on-open. */
  loadImpact: () => Promise<DeleteImpactItem[]>;
  /** Azione di delete vera. Ritorna void o un risultato standard. */
  onConfirm: () => Promise<{ ok?: boolean; error?: string } | void>;

  /** Toast da mostrare al successo (default: "Eliminato"). */
  successToast?: string;
  /** Etichetta bottone conferma (default: "Sì, elimina"). */
  confirmLabel?: string;

  /**
   * Quando il delete riesce, dopo il flash verde l'utente potrebbe essere
   * stato redirezionato server-side: in quel caso non c'è bisogno di chiudere
   * a mano. Default: chiudi dopo 600ms.
   */
  closeOnSuccessAfterMs?: number;

  /** ClassName extra sul trigger. */
  triggerClassName?: string;
}

/**
 * Dialog di conferma eliminazione con anteprima dei record che verranno
 * cancellati a cascata. Pattern: l'utente clicca, vede *quanti* figli stanno
 * per sparire, conferma. Niente sorprese, niente clic-trappola.
 *
 * Usa `useActionFeedback` per il bottone di conferma (pending/success/error
 * con animazioni). Carica le dipendenze on-open (lazy) così non sprechiamo
 * fetch finché l'utente non considera davvero la cancellazione.
 */
export function DeleteConfirmDialog({
  triggerLabel = "Elimina",
  triggerVariant = "destructive",
  triggerIconOnly = false,
  triggerDisabled = false,
  title,
  description,
  loadImpact,
  onConfirm,
  successToast = "Eliminato",
  confirmLabel = "Sì, elimina",
  closeOnSuccessAfterMs = 600,
  triggerClassName,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<DeleteImpactItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fb = useActionFeedback({
    successToast,
    onSuccess: () => {
      setTimeout(() => setOpen(false), closeOnSuccessAfterMs);
    },
  });

  // Lazy load delle dipendenze: solo quando il dialog si apre.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadImpact()
      .then((items) => {
        if (!cancelled) setImpact(items);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Errore nel calcolo dell'impatto");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadImpact]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalImpact = impact?.reduce((sum, i) => sum + i.count, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerIconOnly ? "icon" : "default"}
        disabled={triggerDisabled}
        onClick={() => setOpen(true)}
        className={cn("btn-tactile", triggerClassName)}
        aria-label={triggerIconOnly ? triggerLabel : undefined}
      >
        {triggerIconOnly ? <Trash2 className="h-4 w-4" /> : triggerLabel}
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2">
          {loading ? (
            <p className="text-[13px] text-[var(--muted-foreground)]">
              Calcolo dei record collegati…
            </p>
          ) : loadError ? (
            <p className="text-[13px] text-[var(--destructive)]">{loadError}</p>
          ) : !impact ? null : totalImpact === 0 ? (
            <p className="text-[13px] text-[var(--muted-foreground)]">
              Nessun record collegato. La cancellazione coinvolge solo questo elemento.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[13px] text-[var(--ink-2)]">
                Insieme a questo elemento verranno <strong>cancellati anche</strong>:
              </p>
              <ul className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)]/50 px-3.5 py-2.5 space-y-1">
                {impact
                  .filter((i) => i.count > 0)
                  .map((i) => (
                    <li
                      key={i.label}
                      className="flex items-baseline justify-between gap-3 text-[13px]"
                    >
                      <span className="text-[var(--ink-2)]">{i.label}</span>
                      <span className="font-mono tabular-nums font-semibold text-[var(--danger-soft-ink)]">
                        {i.count}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="text-[12px] text-[var(--muted-foreground)] pt-1">
                L&apos;operazione non è reversibile.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={fb.pending}
          >
            Annulla
          </Button>
          <ActionButton
            type="button"
            variant="destructive"
            onClick={() => fb.run(async () => (await onConfirm()) ?? undefined)}
            pending={fb.pending}
            success={fb.success}
            error={fb.error}
            pendingText="Eliminazione…"
            successText="Eliminato"
            disabled={loading}
          >
            {confirmLabel}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
