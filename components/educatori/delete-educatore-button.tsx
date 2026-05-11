"use client";

import {
  DeleteConfirmDialog,
  type DeleteImpactItem,
} from "@/components/ui/delete-confirm-dialog";
import {
  deleteEducatoreAction,
  getDeleteEducatoreImpactAction,
} from "@/lib/actions/educatori";

export function DeleteEducatoreButton({ educatoreId }: { educatoreId: string }) {
  return (
    <DeleteConfirmDialog
      triggerLabel="Elimina educatore"
      title="Elimina educatore"
      description="Stai per eliminare l'educatore e tutte le sue disponibilità (turni). L'operazione è definitiva e i record corrispondenti non saranno più visibili in /turni."
      successToast="Educatore eliminato"
      loadImpact={async (): Promise<DeleteImpactItem[]> => {
        const i = await getDeleteEducatoreImpactAction(educatoreId);
        return [{ label: "Disponibilità (turni)", count: i.disponibilita }];
      }}
      onConfirm={async () => {
        await deleteEducatoreAction(educatoreId);
      }}
    />
  );
}
