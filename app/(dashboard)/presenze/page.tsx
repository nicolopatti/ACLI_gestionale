import Link from "next/link";
import { listBambini } from "@/lib/airtable/bambini";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listPresenzeByData } from "@/lib/airtable/presenze";
import { GrigliaPresenze } from "@/components/presenze/griglia-presenze";
import { Button } from "@/components/ui/button";
import { annoScolasticoCorrente } from "@/lib/config";

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const sp = await searchParams;
  const data = sp.data || new Date().toISOString().slice(0, 10);
  const annoCorr = annoScolasticoCorrente();

  const [bambini, iscrizioni, presenze] = await Promise.all([
    listBambini({ soloAttivi: true }),
    listIscrizioni(),
    listPresenzeByData(data),
  ]);

  // Per ogni bambino attivo, trova la sua iscrizione dell'anno corrente
  const iscrizioneByBambinoIds = new Map<string, typeof iscrizioni[number]>();
  for (const i of iscrizioni) {
    if (i.annoScolastico === annoCorr) iscrizioneByBambinoIds.set(i.bambinoId, i);
  }
  const bambiniIscritti = bambini.map((b) => ({
    bambino: b,
    iscrizione: iscrizioneByBambinoIds.get(b.recordId),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Presenze</h1>
        <Button asChild variant="outline">
          <Link href="/presenze/storico">Storico</Link>
        </Button>
      </div>
      <GrigliaPresenze data={data} bambiniIscritti={bambiniIscritti} presenzeEsistenti={presenze} />
    </div>
  );
}
