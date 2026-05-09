"use client";

import {
  DeleteConfirmDialog,
  type DeleteImpactItem,
} from "@/components/ui/delete-confirm-dialog";
import {
  deleteBambinoAction,
  getDeleteBambinoImpactAction,
} from "@/lib/actions/bambini";

export function DeleteBambinoButton({ bambinoId }: { bambinoId: string }) {
  return (
    <DeleteConfirmDialog
      triggerLabel="Elimina bambino"
      title="Elimina bambino"
      description="Stai per eliminare il bambino e tutti i suoi dati collegati (iscrizioni, rate, presenze, contatti aggiuntivi). L'operazione è definitiva."
      successToast="Bambino eliminato"
      loadImpact={async (): Promise<DeleteImpactItem[]> => {
        const i = await getDeleteBambinoImpactAction(bambinoId);
        return [
          { label: "Iscrizioni", count: i.iscrizioni },
          { label: "Rate (MesiIscrizione)", count: i.rate },
          { label: "Presenze", count: i.presenze },
          { label: "Contatti aggiuntivi", count: i.contatti },
        ];
      }}
      onConfirm={async () => {
        await deleteBambinoAction(bambinoId);
      }}
    />
  );
}
