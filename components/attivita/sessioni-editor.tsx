"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TIPI_UNITA, type TipoUnita } from "@/lib/config";
import {
  createSessioneAction,
  deleteSessioneAction,
  getDeleteSessioneImpactAction,
} from "@/lib/actions/sessioni";
import { deriveChiaveEtichetta } from "@/lib/sessioni-utils";
import { ActionButton } from "@/components/ui/action-button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import type { Sessione } from "@/lib/db/types";

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
              <DeleteConfirmDialog
                triggerVariant="ghost"
                triggerIconOnly
                triggerLabel="Elimina sessione"
                title={`Elimina sessione "${s.etichetta}"`}
                description="Le rate non pagate collegate verranno eliminate. Se ci sono rate pagate o parziali, l'eliminazione sarà rifiutata."
                successToast="Sessione eliminata"
                loadImpact={async () => {
                  const i = await getDeleteSessioneImpactAction(s.recordId);
                  if (i.bloccatoDaPagate) {
                    return [
                      {
                        label: "Rate pagate/parziali (bloccano la delete)",
                        count: 1,
                      },
                    ];
                  }
                  return [
                    { label: "Rate non pagate", count: i.rateNonPagate },
                  ];
                }}
                onConfirm={async () => {
                  const res = await deleteSessioneAction(s.recordId, attivitaId);
                  if (res && "error" in res) return { error: res.error };
                  router.refresh();
                  return { ok: true };
                }}
              />
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
