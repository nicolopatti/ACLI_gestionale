import Link from "next/link";
import { listBambini } from "@/lib/airtable/bambini";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IscrizioneForm } from "@/components/iscrizioni/iscrizione-form";

export default async function NuovaIscrizionePage({
  searchParams,
}: {
  searchParams: Promise<{ bambinoId?: string }>;
}) {
  const sp = await searchParams;
  const bambini = await listBambini({ soloAttivi: true });
  return (
    <div className="max-w-2xl space-y-6">
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dati iscrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <IscrizioneForm bambini={bambini} defaultBambinoId={sp.bambinoId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
