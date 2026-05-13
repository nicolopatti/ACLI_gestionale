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

  // Stage 1: dati indipendenti (mesi non dipende da iscrizione, usa l'id direttamente)
  const [iscrizione, mesi, attivita, bambini] = await Promise.all([
    getIscrizione(id),
    listMesiByIscrizione(id),
    listAttivita({ attivo: true }),
    listBambini(),
  ]);
  if (!iscrizione) notFound();

  // Determina se l'attivita corrente e' gia' nella lista delle attivita attive.
  const attivitaCorrenteInList = attivita.find(
    (a) => a.recordId === iscrizione.attivitaId,
  );
  const sessioneIdsRate = Array.from(
    new Set(mesi.map((m) => m.sessioneId).filter(Boolean) as string[]),
  );

  // Stage 2: tutto in parallelo (getAttivita opzionale, sessioni rate, sessioni
  // e modalita per ogni attivita del form).
  const [attivitaCorrente, sessioniRate, sessioniLists, modalitaLists] =
    await Promise.all([
      attivitaCorrenteInList
        ? Promise.resolve(attivitaCorrenteInList)
        : getAttivita(iscrizione.attivitaId),
      listSessioni({ recordIds: sessioneIdsRate }),
      Promise.all(attivita.map((a) => listSessioniByAttivita(a.recordId))),
      Promise.all(attivita.map((a) => listModalitaByAttivita(a.recordId))),
    ]);

  const attivitaPerForm =
    attivitaCorrente && !attivitaCorrenteInList
      ? [...attivita, attivitaCorrente]
      : attivita;

  const sessioniByAttivita: Record<string, Sessione[]> = {};
  const modalitaByAttivita: Record<string, ModalitaIscrizione[]> = {};
  attivita.forEach((a, i) => {
    sessioniByAttivita[a.recordId] = sessioniLists[i];
    modalitaByAttivita[a.recordId] = modalitaLists[i];
  });
  // Se l'attivita corrente non era fra quelle attive, caricala on-demand per
  // popolare il form (caso edge: iscrizione su attivita ora archiviata).
  if (attivitaCorrente && !attivitaCorrenteInList) {
    const [sess, mod] = await Promise.all([
      listSessioniByAttivita(attivitaCorrente.recordId),
      listModalitaByAttivita(attivitaCorrente.recordId),
    ]);
    sessioniByAttivita[attivitaCorrente.recordId] = sess;
    modalitaByAttivita[attivitaCorrente.recordId] = mod;
  }

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
