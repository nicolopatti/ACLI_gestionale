"use client";

import {
  DeleteConfirmDialog,
  type DeleteImpactItem,
} from "@/components/ui/delete-confirm-dialog";
import {
  deleteAttivitaAction,
  getDeleteAttivitaImpactAction,
} from "@/lib/actions/attivita";

export function DeleteAttivitaButton({ attivitaId }: { attivitaId: string }) {
  return (
    <DeleteConfirmDialog
      triggerLabel="Elimina attività"
      title="Elimina attività"
      description="Stai per eliminare l'attività e a cascata tutte le modalità, le sessioni, le iscrizioni e le rate collegate. L'operazione è definitiva."
      successToast="Attività eliminata"
      loadImpact={async (): Promise<DeleteImpactItem[]> => {
        const i = await getDeleteAttivitaImpactAction(attivitaId);
        return [
          { label: "Modalità di iscrizione", count: i.modalita },
          { label: "Sessioni", count: i.sessioni },
          { label: "Iscrizioni", count: i.iscrizioni },
          { label: "Rate (MesiIscrizione)", count: i.rate },
        ];
      }}
      onConfirm={async () => {
        await deleteAttivitaAction(attivitaId);
      }}
    />
  );
}
