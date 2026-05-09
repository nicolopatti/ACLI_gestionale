"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { creaMovimentoAction } from "@/lib/actions/movimenti";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import { cn, formatEur } from "@/lib/utils";
import { MEZZI_PAGAMENTO, type MezzoPagamento } from "@/lib/config";

export interface CategoriaOption {
  id: string;
  nome: string;
  tipo: "Entrata" | "Uscita";
}

export interface SpeseEduFormProps {
  categorie: CategoriaOption[];
}

type Tipo = "Entrata" | "Uscita";

export function SpeseEduForm({ categorie }: SpeseEduFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<Tipo>("Uscita");
  const [conto, setConto] = useState<MezzoPagamento>("Cassa");
  const [importo, setImporto] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [descrizione, setDescrizione] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fb = useActionFeedback({
    successToast: "Movimento registrato",
    onSuccess: () => {
      setConfirmOpen(false);
      formRef.current?.reset();
      setImporto("");
      setDescrizione("");
      setNote("");
      setCategoriaId("");
      setData(new Date().toISOString().slice(0, 10));
    },
  });

  function handleConfirm() {
    const fd = new FormData();
    fd.set("tipo", tipo);
    fd.set("conto", conto);
    fd.set("importo", importo);
    fd.set("dataMovimento", data);
    fd.set("categoriaId", categoriaId);
    fd.set("descrizione", descrizione);
    fd.set("note", note);
    fb.run(() => creaMovimentoAction(undefined, fd));
  }

  const categorieFiltrate = categorie.filter((c) => c.tipo === tipo);
  const categoriaSel = categorie.find((c) => c.id === categoriaId);
  const importoNum = Number(importo.replace(",", ".")) || 0;

  function openConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (importoNum <= 0) {
      toast.error("Importo deve essere positivo");
      return;
    }
    if (!descrizione.trim()) {
      toast.error("Descrizione obbligatoria");
      return;
    }
    setConfirmOpen(true);
  }

  return (
    <>
      <form ref={formRef} onSubmit={openConfirm} className="space-y-5">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="conto" value={conto} />

        <div className="space-y-1.5">
          <Label>Tipo movimento</Label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
            {(["Uscita", "Entrata"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipo(t);
                  setCategoriaId("");
                }}
                className={cn(
                  "py-2 text-[13px] font-medium rounded-md transition-colors",
                  tipo === t
                    ? "bg-[var(--surface)] shadow-sm text-[var(--ink)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--ink-2)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="importo">Importo (€)</Label>
            <Input
              id="importo"
              name="importo"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={importo}
              onChange={(e) => setImporto(e.currentTarget.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dataMovimento">Data</Label>
            <Input
              id="dataMovimento"
              name="dataMovimento"
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Conto</Label>
          <div className="grid grid-cols-3 gap-2">
            {MEZZI_PAGAMENTO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConto(c)}
                className={cn(
                  "py-2.5 px-3 text-[13px] font-medium rounded-lg border transition-colors",
                  conto === c
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--border-strong)]",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoriaId">Categoria</Label>
          <select
            id="categoriaId"
            name="categoriaId"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.currentTarget.value)}
            className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            <option value="">Nessuna categoria</option>
            {categorieFiltrate.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {categorieFiltrate.length === 0 ? (
            <p className="text-[11.5px] text-[var(--muted-foreground)]">
              Nessuna categoria di tipo {tipo}. Chiedi all&apos;admin di aggiungerne una.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descrizione">Descrizione</Label>
          <Input
            id="descrizione"
            name="descrizione"
            type="text"
            required
            value={descrizione}
            onChange={(e) => setDescrizione(e.currentTarget.value)}
            placeholder="Es. acquisto cancelleria, rimborso pasti…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (opzionale)</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="btn-tactile" disabled={fb.pending}>
            Registra movimento
          </Button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma registrazione</DialogTitle>
            <DialogDescription>
              Verifica i dati prima di salvare. Una volta registrato, il movimento sarà visibile
              in cassa.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-1.5 text-[13px]">
            <Riepilogo k="Tipo" v={tipo} />
            <Riepilogo
              k="Importo"
              v={
                <span
                  className={cn(
                    "font-mono tabular-nums font-semibold",
                    tipo === "Entrata" ? "text-[var(--success)]" : "text-[var(--danger)]",
                  )}
                >
                  {tipo === "Uscita" ? "−" : "+"} {formatEur(importoNum)}
                </span>
              }
            />
            <Riepilogo k="Data" v={data} />
            <Riepilogo k="Conto" v={conto} />
            <Riepilogo k="Categoria" v={categoriaSel?.nome ?? "—"} />
            <Riepilogo k="Descrizione" v={descrizione} />
            {note ? <Riepilogo k="Note" v={note} /> : null}
          </dl>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={fb.pending}
            >
              Annulla
            </Button>
            <ActionButton
              type="button"
              onClick={handleConfirm}
              pending={fb.pending}
              success={fb.success}
              error={fb.error}
              pendingText="Salvataggio…"
              successText="Registrato"
            >
              Conferma e salva
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Riepilogo({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--border)] pb-1.5">
      <dt className="text-[var(--muted-foreground)]">{k}</dt>
      <dd className="text-[var(--ink)] text-right">{v}</dd>
    </div>
  );
}
