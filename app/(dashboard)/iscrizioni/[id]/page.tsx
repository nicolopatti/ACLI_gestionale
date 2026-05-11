import { notFound } from "next/navigation";
import Link from "next/link";
import { getIscrizione } from "@/lib/db/iscrizioni";
import { listMesiByIscrizione } from "@/lib/db/mesi";
import { listBambini } from "@/lib/db/bambini";
import { listAttivita, getAttivita } from "@/lib/db/attivita";
import {
  listSessioni,
  listSessioniByAttivita,
} from "@/lib/db/sessioni";
import { listModalitaByAttivita } from "@/lib/db/modalita-iscrizione";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IscrizioneForm } from "@/components/iscrizioni/iscrizione-form";
import { MesiTable } from "@/components/iscrizioni/mesi-table";
import { Badge } from "@/components/ui/badge";
import { DeleteIscrizioneButton } from "@/components/iscrizioni/delete-iscrizione-button";
import { formatEur } from "@/lib/utils";
import type { ModalitaIscrizione, Sessione } from "@/lib/airtable/types";

export default async function IscrizioneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [iscrizione, bambini, mesi, attivita] = await Promise.all([
    getIscrizione(id),
    listBambini(),
    listMesiByIscrizione(id),
    listAttivita({ attivo: true }),
  ]);
  if (!iscrizione) notFound();

  const attivitaCorrente = await getAttivita(iscrizione.attivitaId);
  const attivitaPerForm =
    attivitaCorrente && !attivita.some((a) => a.recordId === attivitaCorrente.recordId)
      ? [...attivita, attivitaCorrente]
      : attivita;

  const sessioniLists = await Promise.all(
    attivitaPerForm.map((a) => listSessioniByAttivita(a.recordId)),
  );
  const modalitaLists = await Promise.all(
    attivitaPerForm.map((a) => listModalitaByAttivita(a.recordId)),
  );
  const sessioniByAttivita: Record<string, Sessione[]> = {};
  const modalitaByAttivita: Record<string, ModalitaIscrizione[]> = {};
  attivitaPerForm.forEach((a, i) => {
    sessioniByAttivita[a.recordId] = sessioniLists[i];
    modalitaByAttivita[a.recordId] = modalitaLists[i];
  });

  // Cache delle sessioni linkate alle rate per la tabella
  const sessioniRate = await listSessioni({
    recordIds: Array.from(new Set(mesi.map((m) => m.sessioneId).filter(Boolean) as string[])),
  });
  const sessioniById = new Map(sessioniRate.map((s) => [s.recordId, s] as const));

  const bambino = bambini.find((b) => b.recordId === iscrizione.bambinoId);
  const modalitaCorrente = modalitaByAttivita[iscrizione.attivitaId]?.find(
    (m) => m.recordId === iscrizione.modalitaId,
  );
  const totaleDovuto = mesi.reduce((acc, m) => acc + m.importoDovuto, 0);
  const totalePagato = mesi.reduce((acc, m) => acc + (m.importoPagato ?? 0), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Iscrizione {attivitaCorrente?.nome ?? ""}
        </h1>
        <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-2">
          {bambino && (
            <Link href={`/bambini/${bambino.recordId}`} className="hover:underline">
              {bambino.cognome} {bambino.nome}
            </Link>
          )}
          {attivitaCorrente && (
            <Badge variant="outline">{attivitaCorrente.tipo}</Badge>
          )}
          {modalitaCorrente && (
            <span>
              · {modalitaCorrente.nome} ({formatEur(modalitaCorrente.importo)}/sessione)
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)]">Totale dovuto</p>
            <p className="text-2xl font-semibold">{formatEur(totaleDovuto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)]">Totale pagato</p>
            <p className="text-2xl font-semibold text-emerald-700">
              {formatEur(totalePagato)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)]">Residuo</p>
            <p className="text-2xl font-semibold text-amber-700">
              {formatEur(totaleDovuto - totalePagato)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate ({mesi.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MesiTable mesi={mesi} sessioniById={sessioniById} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifica iscrizione</CardTitle>
        </CardHeader>
        <CardContent>
          <IscrizioneForm
            iscrizione={iscrizione}
            bambini={bambini}
            attivita={attivitaPerForm}
            sessioniByAttivita={sessioniByAttivita}
            modalitaByAttivita={modalitaByAttivita}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eliminazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DeleteIscrizioneButton iscrizioneId={iscrizione.recordId} />
          <p className="text-xs text-[var(--muted-foreground)]">
            La cancellazione include automaticamente le rate collegate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
