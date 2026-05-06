import { notFound } from "next/navigation";
import Link from "next/link";
import { getIscrizione } from "@/lib/airtable/iscrizioni";
import { listMesiByIscrizione } from "@/lib/airtable/mesi";
import { listBambini } from "@/lib/airtable/bambini";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IscrizioneForm } from "@/components/iscrizioni/iscrizione-form";
import { MesiTable } from "@/components/iscrizioni/mesi-table";
import { Button } from "@/components/ui/button";
import { deleteIscrizioneAction } from "@/lib/actions/iscrizioni";
import { formatEur } from "@/lib/utils";

export default async function IscrizioneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [iscrizione, bambini, mesi] = await Promise.all([
    getIscrizione(id),
    listBambini(),
    listMesiByIscrizione(id),
  ]);
  if (!iscrizione) notFound();
  const bambino = bambini.find((b) => b.recordId === iscrizione.bambinoId);
  const totaleDovuto = mesi.reduce((acc, m) => acc + m.importoDovuto, 0);
  const totalePagato = mesi.reduce((acc, m) => acc + (m.importoPagato ?? 0), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Iscrizione A.S. {iscrizione.annoScolastico}
        </h1>
        {bambino && (
          <p className="text-sm text-[var(--muted-foreground)]">
            <Link href={`/bambini/${bambino.recordId}`} className="hover:underline">
              {bambino.cognome} {bambino.nome}
            </Link>
          </p>
        )}
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
          <CardTitle>Mesi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MesiTable mesi={mesi} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifica iscrizione</CardTitle>
        </CardHeader>
        <CardContent>
          <IscrizioneForm iscrizione={iscrizione} bambini={bambini} />
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
              await deleteIscrizioneAction(iscrizione.recordId);
            }}
          >
            <Button variant="destructive" type="submit">
              Elimina iscrizione
            </Button>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              I record dei mesi vanno rimossi separatamente da Airtable.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
