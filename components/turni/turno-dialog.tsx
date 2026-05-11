"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { salvaTurnoCellaAction } from "@/lib/actions/disponibilita";
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
import { Avatar } from "@/components/ui/avatar";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { cn } from "@/lib/utils";
import type { FasciaOraria } from "@/lib/config";

export interface EducatoreLight {
  recordId: string;
  nomeCompleto: string;
  attivo: boolean;
}

export interface TurnoRowState {
  educatoreId: string;
}

export interface TurnoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: string; // YYYY-MM-DD
  fascia: FasciaOraria;
  educatori: EducatoreLight[];
  initialRows: TurnoRowState[];
  contextLabel?: string;
}

function formatDataLabel(data: string): string {
  const d = new Date(data);
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TurnoDialog({
  open,
  onOpenChange,
  data,
  fascia,
  educatori,
  initialRows,
  contextLabel,
}: TurnoDialogProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TurnoRowState[]>(initialRows);
  const fb = useActionFeedback({
    successToast: "Turno salvato",
    onSuccess: () => {
      onOpenChange(false);
      // Forza re-fetch lato server: senza questo la TurniGrid resta
      // sui dati di prop precedenti e gli educatori rimossi sembrano
      // ancora "occupare" la cella.
      router.refresh();
    },
  });

  const selectedIds = useMemo(() => new Set(rows.map((r) => r.educatoreId)), [rows]);

  function toggle(eduId: string) {
    setRows((prev) => {
      if (prev.some((r) => r.educatoreId === eduId)) {
        return prev.filter((r) => r.educatoreId !== eduId);
      }
      return [...prev, { educatoreId: eduId }];
    });
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("data", data);
    fd.set("fascia", fascia);
    fd.set(
      "rows",
      JSON.stringify(rows.map((r) => ({ educatoreId: r.educatoreId }))),
    );
    fb.run(() => salvaTurnoCellaAction(undefined, fd));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="capitalize">
            Turno · {formatDataLabel(data)} · {fascia}
          </DialogTitle>
          <DialogDescription>
            {contextLabel ? <span className="block mb-1">{contextLabel}</span> : null}
            Seleziona gli educatori in turno. Le ore vengono consuntivate
            automaticamente quando la giornata è passata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto -mx-2 px-2">
          {educatori.length === 0 ? (
            <p className="text-[13px] text-[var(--muted-foreground)] py-3">
              Nessun educatore disponibile.
            </p>
          ) : (
            educatori.map((e) => {
              const isSel = selectedIds.has(e.recordId);
              return (
                <div
                  key={e.recordId}
                  className={cn(
                    "rounded-lg border transition-colors",
                    isSel
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]/40"
                      : "border-[var(--border)] bg-[var(--surface)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(e.recordId)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      readOnly
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    <Avatar name={e.nomeCompleto} size="sm" />
                    <span className="text-[13px] font-medium flex-1">
                      {e.nomeCompleto}
                    </span>
                    {!e.attivo && (
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        non attivo
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={fb.pending}
          >
            Annulla
          </Button>
          <ActionButton
            type="button"
            onClick={handleSave}
            pending={fb.pending}
            success={fb.success}
            error={fb.error}
            pendingText="Salvataggio…"
          >
            Salva
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
