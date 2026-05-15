"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  restoreMovimentoAction,
  softDeleteMovimentoAction,
} from "@/lib/actions/movimenti";
import { Button } from "@/components/ui/button";

/**
 * Bottone cestino per soft-delete di un movimento (segna `stato='errato'`,
 * resta in DB per audit/restore). Mostra un toast 5s con azione "Annulla"
 * che ripristina il movimento. Stesso pattern di /rendiconto/voce/[code].
 *
 * Nota: per i movimenti con `origine='rata'` (pagamento di una rata),
 * questo lascia la rata in stato "pagato" con un link a un movimento
 * nascosto. Per annullare correttamente un pagamento di rata, l'utente
 * dovrebbe usare "Annulla pagamento" dalla pagina dell'iscrizione, che
 * pulisce anche il record sulla rata. Lasciamo qui la possibilita' di
 * eliminare per coerenza con il resto della UX cassa: l'undo del toast
 * copre l'errore.
 */
export function DeleteMovimentoButton({
  movimentoId,
  descrizione,
}: {
  movimentoId: string;
  descrizione?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await softDeleteMovimentoAction(movimentoId);
        toast.success(`Movimento eliminato${descrizione ? `: ${descrizione}` : ""}`, {
          position: "bottom-center",
          duration: 5000,
          action: {
            label: "Annulla",
            onClick: () => {
              startTransition(async () => {
                try {
                  await restoreMovimentoAction(movimentoId);
                  toast.success("Movimento ripristinato", {
                    position: "bottom-center",
                  });
                } catch (err) {
                  toast.error((err as Error).message);
                }
              });
            },
          },
        });
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={pending}
      onClick={handleClick}
      aria-label="Elimina movimento"
      title="Elimina movimento"
      className="btn-tactile h-8 w-8"
    >
      <Trash2 className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--destructive)]" />
    </Button>
  );
}
