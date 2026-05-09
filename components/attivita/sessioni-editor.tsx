"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TIPI_UNITA, type TipoUnita } from "@/lib/config";
import {
  createSessioneAction,
  deleteSessioneAction,
} from "@/lib/actions/sessioni";
import { deriveChiaveEtichetta } from "@/lib/sessioni-utils";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { formatDate } from "@/lib/utils";
import type { Sessione } from "@/lib/airtable/types";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

interface Props {
  attivitaId: string;
  defaultTipoUnita: TipoUnita;
  sessioni: Sessione[];
}

export function SessioniEditor({ attivitaId, defaultTipoUnita, sessioni }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [tipoUnita, setTipoUnita] = useState<TipoUnita>(defaultTipoUnita);
  const [dataInizio, setDataInizio] = useState("");
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createSessioneAction, undefined);
  const [success, setSuccess] = useState(false);
  const fbDelete = useActionFeedback({
    successToast: "Sessione eliminata",
    onSuccess: () => router.refresh(),
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const hasError = !!state?.error;

  const previewEtichetta = dataInizio
    ? deriveChiaveEtichetta(tipoUnita, dataInizio)?.etichetta
    : null;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setDataInizio("");
      setTipoUnita(defaultTipoUnita);
      setSuccess(true);
      toast.success("Sessione aggiunta");
      const id = setTimeout(() => setSuccess(false), 1400);
      return () => clearTimeout(id);
    }
  }, [state, defaultTipoUnita]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onDelete = (id: string) => {
    setPendingDeleteId(id);
    fbDelete.run(async () => {
      try {
        const res = await deleteSessioneAction(id, attivitaId);
        if (res && "error" in res) return { error: res.error };
        return { ok: true };
      } finally {
        setPendingDeleteId((curr) => (curr === id ? null : curr));
      }
    });
  };

  return (
    <div className="space-y-4">
      {sessioni.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Nessuna sessione configurata.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {sessioni.map((s) => (
            <li
              key={s.recordId}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{s.etichetta}</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {s.tipoUnita}
                  {s.dataInizio ? ` · ${formatDate(s.dataInizio)}` : ""}
                  {s.dataFine && s.dataFine !== s.dataInizio ? `–${formatDate(s.dataFine)}` : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(s.recordId)}
                aria-label="Elimina sessione"
                disabled={fbDelete.pending}
                className="btn-tactile"
                data-saved={pendingDeleteId === s.recordId && fbDelete.success ? "true" : undefined}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={action}
        className="grid gap-3 rounded-md border border-[var(--border)] p-3 md:grid-cols-12"
      >
        <input type="hidden" name="attivitaId" value={attivitaId} />
        <div className="md:col-span-3 space-y-1">
          <Label className="text-xs" htmlFor="sessione-tipo">Tipo</Label>
          <select
            id="sessione-tipo"
            name="tipoUnita"
            className={SELECT_CLASS}
            value={tipoUnita}
            onChange={(e) => setTipoUnita(e.target.value as TipoUnita)}
          >
            {TIPI_UNITA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3 space-y-1">
          <Label className="text-xs" htmlFor="sessione-inizio">Data inizio</Label>
          <Input
            id="sessione-inizio"
            name="dataInizio"
            type="date"
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-3 space-y-1">
          <Label className="text-xs" htmlFor="sessione-fine">Data fine</Label>
          <Input
            id="sessione-fine"
            name="dataFine"
            type="date"
          />
        </div>
        <div className="md:col-span-3 flex items-end">
          <ActionButton
            type="submit"
            pending={pending}
            success={success}
            error={hasError && !pending}
            pendingText="Aggiungo…"
            successText="Aggiunta ✓"
            idleIcon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            Aggiungi
          </ActionButton>
        </div>
        {previewEtichetta && (
          <p className="md:col-span-12 text-xs text-[var(--muted-foreground)]">
            Verrà creata: <strong>{previewEtichetta}</strong>
          </p>
        )}
        {state?.error && (
          <p
            className="md:col-span-12 text-sm text-[var(--destructive)] field-error"
            key={state.error}
          >
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
