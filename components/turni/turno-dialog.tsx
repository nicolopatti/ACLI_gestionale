"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { cn } from "@/lib/utils";
import type { FasciaDisponibilita } from "@/lib/config";

export interface EducatoreLight {
  recordId: string;
  nomeCompleto: string;
  attivo: boolean;
}

export interface TurnoRowState {
  educatoreId: string;
  oraIngresso: string;
  oraUscita: string;
}

export interface TurnoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: string; // YYYY-MM-DD
  fascia: FasciaDisponibilita;
  educatori: EducatoreLight[];
  initialRows: TurnoRowState[];
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
}: TurnoDialogProps) {
  const [rows, setRows] = useState<TurnoRowState[]>(initialRows);
  const fb = useActionFeedback({
    successToast: "Turno salvato",
    onSuccess: () => onOpenChange(false),
  });

  const selectedIds = useMemo(() => new Set(rows.map((r) => r.educatoreId)), [rows]);

  function toggle(eduId: string) {
    setRows((prev) => {
      if (prev.some((r) => r.educatoreId === eduId)) {
        return prev.filter((r) => r.educatoreId !== eduId);
      }
      return [...prev, { educatoreId: eduId, oraIngresso: "", oraUscita: "" }];
    });
  }

  function setOra(
    eduId: string,
    field: "oraIngresso" | "oraUscita",
    value: string,
  ) {
    setRows((prev) =>
      prev.map((r) => (r.educatoreId === eduId ? { ...r, [field]: value } : r)),
    );
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("data", data);
    fd.set("fascia", fascia);
    fd.set(
      "rows",
      JSON.stringify(
        rows.map((r) => ({
          educatoreId: r.educatoreId,
          oraIngresso: r.oraIngresso || undefined,
          oraUscita: r.oraUscita || undefined,
        })),
      ),
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
            Seleziona gli educatori in turno. Compila le ore solo a consuntivo
            (dopo la data).
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
              const row = rows.find((r) => r.educatoreId === e.recordId);
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
                  {isSel && row ? (
                    <div className="px-3 pb-2.5 grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">
                          Ingresso
                        </span>
                        <Input
                          type="time"
                          value={row.oraIngresso}
                          onChange={(ev) =>
                            setOra(e.recordId, "oraIngresso", ev.currentTarget.value)
                          }
                          className="h-8"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">
                          Uscita
                        </span>
                        <Input
                          type="time"
                          value={row.oraUscita}
                          onChange={(ev) =>
                            setOra(e.recordId, "oraUscita", ev.currentTarget.value)
                          }
                          className="h-8"
                        />
                      </label>
                    </div>
                  ) : null}
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
