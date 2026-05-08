import Link from "next/link";
import { listBambini } from "@/lib/airtable/bambini";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listPresenzeByData } from "@/lib/airtable/presenze";
import { listAttivita } from "@/lib/airtable/attivita";
import { listSessioniByAttivita } from "@/lib/airtable/sessioni";
import { GrigliaPresenze } from "@/components/presenze/griglia-presenze";
import { Button } from "@/components/ui/button";
import type { GiornoSettimana } from "@/lib/config";
import type { Sessione } from "@/lib/airtable/types";

const GIORNO_DA_DATE: Record<number, GiornoSettimana | null> = {
  0: null,
  1: "lun",
  2: "mar",
  3: "mer",
  4: "gio",
  5: "ven",
  6: null,
};

function dataInRange(data: string, sessione: Sessione): boolean {
  if (!sessione.dataInizio || !sessione.dataFine) return false;
  return data >= sessione.dataInizio && data <= sessione.dataFine;
}

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; attivitaId?: string }>;
}) {
  const sp = await searchParams;
  const data = sp.data || new Date().toISOString().slice(0, 10);

  const attivita = await listAttivita({ attivo: true });

  // Default attivitaId: prima doposcuola attiva, fallback prima attività attiva
  const attivitaId =
    sp.attivitaId ||
    attivita.find((a) => a.tipo === "doposcuola")?.recordId ||
    attivita[0]?.recordId ||
    "";

  const attivitaSel = attivita.find((a) => a.recordId === attivitaId);

  const [bambini, iscrizioni, presenze, sessioniAttivita] = await Promise.all([
    listBambini({ soloAttivi: true }),
    attivitaId ? listIscrizioni({ attivitaId }) : Promise.resolve([]),
    listPresenzeByData(data),
    attivitaId ? listSessioniByAttivita(attivitaId) : Promise.resolve([] as Sessione[]),
  ]);

  const sessioniById = new Map(sessioniAttivita.map((s) => [s.recordId, s] as const));
  const giorno = GIORNO_DA_DATE[new Date(data).getDay()];
  const candidati = iscrizioni
    .map((iscrizione) => {
      const bambino = bambini.find((b) => b.recordId === iscrizione.bambinoId);
      if (!bambino) return null;

      // Trova la sessione che copre la data scelta
      const sessioniIscrizione = iscrizione.sessioniSelteIds
        .map((id) => sessioniById.get(id))
        .filter((s): s is Sessione => Boolean(s));

      let sessioneAttiva: Sessione | undefined;
      if (attivitaSel?.tipo === "doposcuola") {
        if (!giorno || !iscrizione.giorniSettimana.includes(giorno)) return null;
        // sessione = quella del mese della data scelta
        const meseData = data.slice(0, 7);
        sessioneAttiva = sessioniIscrizione.find((s) => s.chiave === meseData);
      } else {
        sessioneAttiva = sessioniIscrizione.find((s) => dataInRange(data, s));
      }
      if (!sessioneAttiva) return null;

      return {
        bambino,
        iscrizione,
        sessioneId: sessioneAttiva.recordId,
        sessioneEtichetta: sessioneAttiva.etichetta,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Presenze</h1>
        <Button asChild variant="outline">
          <Link href="/presenze/storico">Storico</Link>
        </Button>
      </div>
      <GrigliaPresenze
        data={data}
        attivitaId={attivitaId}
        attivita={attivita}
        candidati={candidati}
        presenzeEsistenti={presenze}
      />
    </div>
  );
}
