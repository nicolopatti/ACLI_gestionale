import { meseAnnoLabel } from "@/lib/utils";
import { meseCorrente as meseCorrenteIso } from "@/lib/config";

export const meseCorrente = meseCorrenteIso;

export function meseAnnoSCorrenteLabel(): string {
  return meseAnnoLabel(meseCorrente());
}
