"use client";

import {
  DeleteConfirmDialog,
  type DeleteImpactItem,
} from "@/components/ui/delete-confirm-dialog";
import {
  deleteIscrizioneAction,
  getDeleteIscrizioneImpactAction,
} from "@/lib/actions/iscrizioni";

export function DeleteIscrizioneButton({ iscrizioneId }: { iscrizioneId: string }) {
  return (
    <DeleteConfirmDialog
      triggerLabel="Elimina iscrizione"
      title="Elimina iscrizione"
      description="Stai per eliminare questa iscrizione e tutte le rate collegate. L'operazione è definitiva e non recuperabile."
      successToast="Iscrizione eliminata"
      loadImpact={async (): Promise<DeleteImpactItem[]> => {
        const impact = await getDeleteIscrizioneImpactAction(iscrizioneId);
        return [
          { label: "Rate (MesiIscrizione)", count: impact.rate },
          { label: "Movimenti di cassa", count: impact.movimenti },
        ];
      }}
      onConfirm={async () => {
        await deleteIscrizioneAction(iscrizioneId);
      }}
    />
  );
}
