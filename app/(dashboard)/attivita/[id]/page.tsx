import { notFound } from "next/navigation";
import Link from "next/link";
import { getAttivita } from "@/lib/airtable/attivita";
import { listSessioniByAttivita } from "@/lib/airtable/sessioni";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listBambini } from "@/lib/airtable/bambini";
import { listModalitaByAttivita } from "@/lib/airtable/modalita-iscrizione";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttivitaForm } from "@/components/attivita/attivita-form";
import { SessioniEditor } from "@/components/attivita/sessioni-editor";
import { ModalitaEditor } from "@/components/attivita/modalita-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPO_ATTIVITA_TO_UNITA } from "@/lib/config";
import { deleteAttivitaAction } from "@/lib/actions/attivita";

export default async function AttivitaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [attivita, sessioni, iscrizioni, bambini, modalita] = await Promise.all([
    getAttivita(id),
    listSessioniByAttivita(id),
    listIscrizioni({ attivitaId: id }),
    listBambini(),
    listModalitaByAttivita(id),
  ]);
  if (!attivita) notFound();
  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{attivita.nome}</h1>
        <Badge variant="outline">{attivita.tipo}</Badge>
        {attivita.attivo ? (
          <Badge variant="success">Attiva</Badge>
        ) : (
          <Badge variant="outline">Archiviata</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurazione</CardTitle>
        </CardHeader>
        <CardContent>
          <AttivitaForm attivita={attivita} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modalità di iscrizione ({modalita.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ModalitaEditor attivitaId={attivita.recordId} modalita={modalita} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessioni ({sessioni.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <SessioniEditor
            attivitaId={attivita.recordId}
            defaultTipoUnita={TIPO_ATTIVITA_TO_UNITA[attivita.tipo]}
            sessioni={sessioni}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Iscritti ({iscrizioni.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {iscrizioni.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Nessuna iscrizione.</p>
          ) : (
            <ul className="space-y-1">
              {iscrizioni.map((i) => {
                const b = bambinoById.get(i.bambinoId);
                return (
                  <li key={i.recordId} className="flex items-center justify-between text-sm">
                    <Link href={`/iscrizioni/${i.recordId}`} className="hover:underline">
                      {b ? `${b.cognome} ${b.nome}` : "—"} · {i.sessioniSelteIds.length} sessioni
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eliminazione</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await deleteAttivitaAction(attivita.recordId);
            }}
          >
            <Button
              variant="destructive"
              type="submit"
              disabled={iscrizioni.length > 0 || sessioni.length > 0 || modalita.length > 0}
            >
              Elimina attività
            </Button>
            {(iscrizioni.length > 0 || sessioni.length > 0 || modalita.length > 0) && (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Rimuovi prima sessioni, modalità e iscrizioni collegate.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
