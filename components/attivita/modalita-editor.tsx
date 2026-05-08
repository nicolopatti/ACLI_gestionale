"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [nome, setNome] = useState("");
  const [importo, setImporto] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nome.trim() || !importo) {
      setError("Nome e importo obbligatori.");
      return;
    }
    const fd = new FormData();
    fd.set("attivitaId", attivitaId);
    fd.set("nome", nome.trim());
    fd.set("importo", importo);
    if (descrizione) fd.set("descrizione", descrizione);
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const res = await createModalitaAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const aggiunto = nome.trim();
      setNome("");
      setImporto("");
      setDescrizione("");
      setSuccess(`Modalità "${aggiunto}" aggiunta.`);
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
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
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-md border border-[var(--border)] p-3 md:grid-cols-12"
      >
        <div className="md:col-span-5 space-y-1">
          <Label className="text-xs">Nome modalità</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder='es. "Mensile 14-16 (3 giorni)"'
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Importo (€)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
          />
        </div>
        <div className="md:col-span-3 space-y-1">
          <Label className="text-xs">Descrizione</Label>
          <Input
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="opzionale"
          />
        </div>
        <div className="md:col-span-2 flex items-end">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Aggiungi
          </Button>
        </div>
        {error && (
          <p className="md:col-span-12 text-sm text-[var(--destructive)]">{error}</p>
        )}
        {success && (
          <p className="md:col-span-12 text-sm text-emerald-700">{success}</p>
        )}
      </form>

      <p className="text-xs text-[var(--muted-foreground)]">
        L&apos;importo è <strong>per sessione</strong> (es. 50€/mese per il doposcuola, 15€/giornata per i laboratori).
      </p>
    </div>
  );
}
