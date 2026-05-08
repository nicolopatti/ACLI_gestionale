import Link from "next/link";
import { listBambini } from "@/lib/airtable/bambini";
import { listAttivita } from "@/lib/airtable/attivita";
import { listSessioniByAttivita } from "@/lib/airtable/sessioni";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IscrizioneForm } from "@/components/iscrizioni/iscrizione-form";
import type { Sessione } from "@/lib/airtable/types";

export default async function NuovaIscrizionePage({
  searchParams,
}: {
  searchParams: Promise<{ bambinoId?: string }>;
}) {
  const sp = await searchParams;
  const [bambini, attivita] = await Promise.all([
    listBambini({ soloAttivi: true }),
    listAttivita({ attivo: true }),
  ]);

  const sessioniLists = await Promise.all(
    attivita.map((a) => listSessioniByAttivita(a.recordId)),
  );
  const sessioniByAttivita: Record<string, Sessione[]> = {};
  attivita.forEach((a, i) => {
    sessioniByAttivita[a.recordId] = sessioniLists[i];
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
              defaultBambinoId={sp.bambinoId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
