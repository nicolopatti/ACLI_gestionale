"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createScontoAction,
  deleteScontoAction,
  getDeleteScontoImpactAction,
} from "@/lib/actions/sconti-attivita";
import { ActionButton } from "@/components/ui/action-button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/utils";
import type { ScontoAttivita } from "@/lib/db/types";

interface Props {
  attivitaId: string;
  sconti: ScontoAttivita[];
}

function formatValoreSconto(sc: ScontoAttivita): string {
  return sc.tipo === "percentuale" ? `${sc.valore}%` : formatEur(sc.valore);
}

export function ScontiEditor({ attivitaId, sconti }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createScontoAction, undefined);
  const [success, setSuccess] = useState(false);
  const hasError = !!state?.error;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setSuccess(true);
      toast.success("Sconto aggiunto");
      const id = setTimeout(() => setSuccess(false), 1400);
      return () => clearTimeout(id);
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-4">
      {sconti.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Nessuno sconto configurato. Aggiungine uno per offrirlo come
          checkbox al momento dell&apos;iscrizione (es. &quot;Fratello iscritto&quot;,
          &quot;Early bird&quot;).
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {sconti.map((sc) => (
            <li
              key={sc.recordId}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {sc.nome}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {sc.tipo === "percentuale" ? "%" : "€"}
                  </Badge>
                  {!sc.attivo && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      disattivato
                    </Badge>
                  )}
                </span>
                {sc.descrizione && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {sc.descrizione}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  −{formatValoreSconto(sc)}
                </span>
                <DeleteConfirmDialog
                  triggerVariant="ghost"
                  triggerIconOnly
                  triggerLabel="Elimina sconto"
                  title={`Elimina sconto "${sc.nome}"`}
                  description="Se lo sconto è già stato applicato a una o più iscrizioni l'eliminazione viene bloccata: in quel caso disattivalo invece di cancellarlo per nasconderlo senza perdere lo storico."
                  successToast="Sconto eliminato"
                  loadImpact={async () => {
                    const i = await getDeleteScontoImpactAction(sc.recordId);
                    return [
                      { label: "Iscrizioni che lo applicano", count: i.iscrizioni },
                    ];
                  }}
                  onConfirm={async () => {
                    const r = await deleteScontoAction(sc.recordId, attivitaId);
                    if (r && "error" in r && r.error) {
                      toast.error(r.error);
                    }
                    router.refresh();
                  }}
                />
              </div>
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
        <div className="md:col-span-5 space-y-1">
          <Label className="text-xs" htmlFor="sconto-nome">Nome sconto</Label>
          <Input
            id="sconto-nome"
            name="nome"
            placeholder='es. "Fratello iscritto"'
            required
          />
        </div>
        <fieldset className="md:col-span-3 space-y-1">
          <legend className="text-xs">Tipo</legend>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value="fisso"
                defaultChecked
              />
              Valore fisso (€)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value="percentuale"
              />
              Percentuale (%)
            </label>
          </div>
        </fieldset>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs" htmlFor="sconto-valore">Valore</Label>
          <Input
            id="sconto-valore"
            name="valore"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </div>
        <div className="md:col-span-2 flex items-end">
          <ActionButton
            type="submit"
            pending={pending}
            success={success}
            error={hasError && !pending}
            pendingText="Aggiungo…"
            successText="Aggiunto ✓"
            idleIcon={<Plus className="h-4 w-4" />}
            className="w-full"
          >
            Aggiungi
          </ActionButton>
        </div>
        {state?.error && (
          <p
            className="md:col-span-12 text-sm text-[var(--destructive)] field-error"
            key={state.error}
          >
            {state.error}
          </p>
        )}
      </form>

      <p className="text-xs text-[var(--muted-foreground)]">
        Ogni sconto appare come checkbox nel form di iscrizione. L&apos;utente
        sceglie quali applicare a quella specifica iscrizione. La percentuale
        si applica su <strong>prezzo modalità + quota iscrizione</strong>.
      </p>
    </div>
  );
}
