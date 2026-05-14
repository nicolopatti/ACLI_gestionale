import Link from "next/link";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { listBambini } from "@/lib/db/bambini";
import { listAttivita } from "@/lib/db/attivita";
import { listSessioniByAttivita } from "@/lib/db/sessioni";
import { listModalitaByAttivita } from "@/lib/db/modalita-iscrizione";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IscrizioneForm } from "@/components/iscrizioni/iscrizione-form";
import type { ModalitaIscrizione, Sessione } from "@/lib/db/types";

export default async function NuovaIscrizionePage({
  searchParams,
}: {
  searchParams: Promise<{ bambinoId?: string }>;
}) {
  await requireAdminOrCoordinatore();
  const sp = await searchParams;
  const [bambini, attivita] = await Promise.all([
    listBambini({ soloAttivi: true }),
    listAttivita({ attivo: true }),
  ]);

  const sessioniLists = await Promise.all(
    attivita.map((a) => listSessioniByAttivita(a.recordId)),
  );
  const modalitaLists = await Promise.all(
    attivita.map((a) => listModalitaByAttivita(a.recordId)),
  );
  const sessioniByAttivita: Record<string, Sessione[]> = {};
  const modalitaByAttivita: Record<string, ModalitaIscrizione[]> = {};
  attivita.forEach((a, i) => {
    sessioniByAttivita[a.recordId] = sessioniLists[i];
    modalitaByAttivita[a.recordId] = modalitaLists[i];
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuova iscrizione</h1>
      {bambini.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
            Nessun bambino attivo. Crea prima un{" "}
            <Link href="/bambini/nuovo" className="underline">
              bambino
            </Link>
            .
          </CardContent>
        </Card>
      ) : attivita.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
            Nessuna attività disponibile. Crea prima un&apos;{" "}
            <Link href="/attivita/nuova" className="underline">
              attività
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dati iscrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <IscrizioneForm
              bambini={bambini}
              attivita={attivita}
              sessioniByAttivita={sessioniByAttivita}
              modalitaByAttivita={modalitaByAttivita}
              defaultBambinoId={sp.bambinoId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
