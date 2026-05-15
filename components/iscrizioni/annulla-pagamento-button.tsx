"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { annullaPagamentoAction } from "@/lib/actions/mesi";
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
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";

/**
 * Bottone per annullare il pagamento di una rata. Mostra un dialog di conferma
 * che ricorda che anche il movimento collegato in `/cassa` viene cancellato.
 * Stesso schema dei DeleteConfirmDialog ma piu' leggero (nessuna preview di
 * impatto: l'azione cancella solo la rata + il movimento, e' chiaro a parole).
 */
export function AnnullaPagamentoButton({
  meseId,
  iconOnly = false,
}: {
  meseId: string;
  /** Solo icona (per uso inline in tabella). */
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fb = useActionFeedback({
    successToast: "Pagamento annullato",
    onSuccess: () => {
      setTimeout(() => setOpen(false), 600);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size={iconOnly ? "icon" : "sm"}
        variant="outline"
        onClick={() => setOpen(true)}
        className="btn-tactile"
        aria-label={iconOnly ? "Annulla pagamento" : undefined}
        title={iconOnly ? "Annulla pagamento" : undefined}
      >
        <RotateCcw className="h-4 w-4" />
        {!iconOnly && <span className="ml-1">Annulla pagamento</span>}
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annulla pagamento</DialogTitle>
          <DialogDescription>
            La rata torna a <strong>non pagato</strong> e il movimento di entrata
            collegato in <strong>/cassa</strong> viene cancellato. Usalo in caso di
            errore di registrazione.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={fb.pending}
          >
            Annulla
          </Button>
          <ActionButton
            type="button"
            variant="destructive"
            onClick={() => fb.run(() => annullaPagamentoAction(meseId))}
            pending={fb.pending}
            success={fb.success}
            error={fb.error}
            pendingText="Annullamento…"
            successText="Annullato"
          >
            Sì, annulla
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
