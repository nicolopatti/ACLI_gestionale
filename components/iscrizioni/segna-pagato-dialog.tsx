"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { segnaPagatoAction } from "@/lib/actions/mesi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEZZI_PAGAMENTO } from "@/lib/config";
import { meseAnnoLabel } from "@/lib/utils";
import type { MeseIscrizione } from "@/lib/airtable/types";

function periodoLabel(m: MeseIscrizione): string {
  if (m.tipoUnita === "mese" && m.meseAnno) return meseAnnoLabel(m.meseAnno);
  return m.chiavePeriodo ?? m.meseAnno ?? "—";
}

export function SegnaPagatoDialog({ mese }: { mese: MeseIscrizione }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(segnaPagatoAction, undefined);

  if (state?.ok && open) {
    setTimeout(() => setOpen(false), 200);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Segna pagato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagamento {periodoLabel(mese)}</DialogTitle>
          <DialogDescription>
            Importo dovuto: <strong>{mese.importoDovuto.toFixed(2)} €</strong>
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="meseId" value={mese.recordId} />
          <div className="space-y-2">
            <Label htmlFor="importoPagato">Importo pagato (€)</Label>
            <Input
              id="importoPagato"
              name="importoPagato"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={mese.importoDovuto}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataPagamento">Data pagamento</Label>
            <Input
              id="dataPagamento"
              name="dataPagamento"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mezzoPagamento">Mezzo</Label>
            <select
              id="mezzoPagamento"
              name="mezzoPagamento"
              required
              defaultValue="Cassa"
              className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm"
            >
              {MEZZI_PAGAMENTO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input id="note" name="note" />
          </div>
          {state?.error ? (
            <p className="text-sm text-[var(--destructive)]">{state.error}</p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conferma pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
