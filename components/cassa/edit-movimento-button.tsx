"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  setCategoriaMovimentoAction,
  setVoceRendicontoMovimentoAction,
} from "@/lib/actions/movimenti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatEur } from "@/lib/utils";
import type { SezioneRendiconto } from "@/lib/db/types";

interface CategoriaOpt {
  id: string;
  nome: string;
  tipo: "Entrata" | "Uscita";
}

interface VoceOpt {
  id: string;
  codice: string;
  tipo: "Entrata" | "Uscita";
  sezione: SezioneRendiconto;
  label: string;
}

interface Props {
  movimentoId: string;
  tipo: "Entrata" | "Uscita";
  importo: number;
  descrizione?: string;
  currentCategoriaId?: string;
  currentVoceRendicontoId?: string;
  categorie: CategoriaOpt[];
  voci: VoceOpt[];
  sezioniTitoli: Record<SezioneRendiconto, string>;
}

/**
 * Bottone matita per modificare classificazione (categoria + voce
 * rendiconto ETS) di un singolo movimento. Utile per aggiustare
 * movimenti registrati da Telegram (privi di voce) o da bank import
 * con classificazione automatica sbagliata.
 *
 * Stesso pattern usato in /rendiconto/voce/[code] e /rendiconto per i
 * movimenti da classificare, ma esposto sulla lista principale di
 * /cassa per accesso rapido.
 */
export function EditMovimentoButton({
  movimentoId,
  tipo,
  importo,
  descrizione,
  currentCategoriaId,
  currentVoceRendicontoId,
  categorie,
  voci,
  sezioniTitoli,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [categoriaId, setCategoriaId] = useState(currentCategoriaId ?? "");
  const [voceId, setVoceId] = useState(currentVoceRendicontoId ?? "");

  // Quando si apre il dialog, allinea lo state ai valori correnti del DB
  // (importante se il movimento e' stato editato altrove fra una apertura
  // e l'altra).
  function handleOpenChange(next: boolean) {
    if (next) {
      setCategoriaId(currentCategoriaId ?? "");
      setVoceId(currentVoceRendicontoId ?? "");
    }
    setOpen(next);
  }

  const categorieFiltrate = categorie.filter((c) => c.tipo === tipo);
  const vociFiltrate = voci.filter((v) => v.tipo === tipo);
  // Raggruppa per sezione preservando l'ordering esterno (voci e' gia'
  // ordinato dal server).
  const vociPerSezione = new Map<SezioneRendiconto, VoceOpt[]>();
  for (const v of vociFiltrate) {
    const arr = vociPerSezione.get(v.sezione);
    if (arr) arr.push(v);
    else vociPerSezione.set(v.sezione, [v]);
  }

  function handleSave() {
    const nextCategoria = categoriaId || null;
    const nextVoce = voceId || null;
    const prevCategoria = currentCategoriaId ?? null;
    const prevVoce = currentVoceRendicontoId ?? null;
    const changedCat = nextCategoria !== prevCategoria;
    const changedVoce = nextVoce !== prevVoce;
    if (!changedCat && !changedVoce) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await Promise.all([
          changedCat
            ? setCategoriaMovimentoAction(movimentoId, nextCategoria)
            : Promise.resolve(),
          changedVoce
            ? setVoceRendicontoMovimentoAction(movimentoId, nextVoce)
            : Promise.resolve(),
        ]);
        toast.success("Classificazione aggiornata", {
          position: "bottom-center",
        });
        setOpen(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => handleOpenChange(true)}
        aria-label="Modifica classificazione"
        title="Modifica categoria e voce di rendiconto"
        className="btn-tactile h-8 w-8"
      >
        <Pencil className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--primary)]" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica classificazione</DialogTitle>
            <DialogDescription>
              <span
                className={
                  "font-mono tabular-nums " +
                  (tipo === "Entrata"
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]")
                }
              >
                {tipo === "Uscita" ? "−" : "+"} {formatEur(importo)}
              </span>
              {descrizione ? (
                <span className="ml-2 text-[var(--muted-foreground)]">
                  · {descrizione}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-categoria">Categoria</Label>
              <select
                id="edit-categoria"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[13px]"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                disabled={pending}
              >
                <option value="">— Nessuna categoria —</option>
                {categorieFiltrate.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-voce">Voce di rendiconto ETS</Label>
              <select
                id="edit-voce"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[13px]"
                value={voceId}
                onChange={(e) => setVoceId(e.target.value)}
                disabled={pending}
              >
                <option value="">— Nessuna voce —</option>
                {Array.from(vociPerSezione.entries()).map(([sez, vs]) => (
                  <optgroup
                    key={sez}
                    label={`${sez} · ${sezioniTitoli[sez] ?? sez}`}
                  >
                    {vs.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.codice} · {v.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button type="button" onClick={handleSave} disabled={pending}>
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
