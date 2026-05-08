import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getBambino, listBambini } from "@/lib/airtable/bambini";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listContattiByBambino } from "@/lib/airtable/contatti-aggiuntivi";
import { listAttivita } from "@/lib/airtable/attivita";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BambinoForm } from "@/components/bambini/bambino-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteBambinoAction } from "@/lib/actions/bambini";

export default async function BambinoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bambino, bambini, iscrizioniBambino, contatti, attivita] = await Promise.all([
    getBambino(id),
    listBambini(),
    listIscrizioni({ bambinoId: id }),
    listContattiByBambino(id),
    listAttivita(),
  ]);
  if (!bambino) notFound();

  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {bambino.cognome} {bambino.nome}
        </h1>
        {bambino.attivo ? (
          <Badge variant="success">Iscritto</Badge>
        ) : (
          <Badge variant="outline">Non attivo</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anagrafica</CardTitle>
        </CardHeader>
        <CardContent>
          <BambinoForm bambino={bambino} bambini={bambini} contatti={contatti} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Iscrizioni ({iscrizioniBambino.length})</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/iscrizioni/nuova?bambinoId=${bambino.recordId}`}>
              <Plus className="h-4 w-4" /> Nuova iscrizione
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {iscrizioniBambino.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Nessuna iscrizione.</p>
          ) : (
            <ul className="space-y-1">
              {iscrizioniBambino.map((i) => {
                const a = attivitaById.get(i.attivitaId);
                return (
                  <li key={i.recordId} className="flex items-center justify-between text-sm">
                    <Link href={`/iscrizioni/${i.recordId}`} className="hover:underline">
                      {a?.nome ?? "Attività"} · {i.sessioniSelteIds.length} sessioni
                      {i.giorniSettimana.length > 0
                        ? ` · ${i.giorniSettimana.join(", ")}`
                        : ""}
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
              await deleteBambinoAction(bambino.recordId);
            }}
          >
            <Button
              variant="destructive"
              type="submit"
              disabled={iscrizioniBambino.length > 0}
            >
              Elimina bambino
            </Button>
            {iscrizioniBambino.length > 0 && (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Rimuovi prima le iscrizioni collegate.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
