"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createModalitaAction,
  deleteModalitaAction,
} from "@/lib/actions/modalita-iscrizione";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/utils";
import type { ModalitaIscrizione } from "@/lib/airtable/types";

interface Props {
  attivitaId: string;
  modalita: ModalitaIscrizione[];
}

export function ModalitaEditor({ attivitaId, modalita }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createModalitaAction, undefined);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const onDelete = (id: string) => {
    startDelete(async () => {
      await deleteModalitaAction(id, attivitaId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {modalita.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Nessuna modalità configurata. Aggiungine almeno una prima di poter creare iscrizioni.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {modalita.map((m) => (
            <li
              key={m.recordId}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {m.nome}
                  {!m.attivo && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      disattivata
                    </Badge>
                  )}
                </span>
                {m.descrizione && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {m.descrizione}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatEur(m.importo)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(m.recordId)}
                  aria-label="Elimina modalità"
                  disabled={deletePending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
          <Label className="text-xs" htmlFor="modalita-nome">Nome modalità</Label>
          <Input
            id="modalita-nome"
            name="nome"
            placeholder='es. "Mensile 14-16 (3 giorni)"'
            required
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs" htmlFor="modalita-importo">Importo (€)</Label>
          <Input
            id="modalita-importo"
            name="importo"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </div>
        <div className="md:col-span-3 space-y-1">
          <Label className="text-xs" htmlFor="modalita-descrizione">Descrizione</Label>
          <Input
            id="modalita-descrizione"
            name="descrizione"
            placeholder="opzionale"
          />
        </div>
        <div className="md:col-span-2 flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Aggiungi
          </Button>
        </div>
        {state?.error && (
          <p className="md:col-span-12 text-sm text-[var(--destructive)]">{state.error}</p>
        )}
      </form>

      <p className="text-xs text-[var(--muted-foreground)]">
        L&apos;importo è <strong>per sessione</strong> (es. 50€/mese per il doposcuola, 15€/giornata per i laboratori).
      </p>
    </div>
  );
}
