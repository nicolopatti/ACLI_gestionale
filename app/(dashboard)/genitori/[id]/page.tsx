import { notFound } from "next/navigation";
import Link from "next/link";
import { getGenitore } from "@/lib/airtable/genitori";
import { listBambini } from "@/lib/airtable/bambini";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenitoreForm } from "@/components/genitori/genitore-form";
import { Button } from "@/components/ui/button";
import { deleteGenitoreAction } from "@/lib/actions/genitori";

export default async function GenitoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [genitore, tuttiBambini] = await Promise.all([
    getGenitore(id),
    listBambini(),
  ]);
  if (!genitore) notFound();
  const bambini = tuttiBambini.filter((b) => b.genitoreId === genitore.recordId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {genitore.cognome} {genitore.nome}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Dati anagrafici</CardTitle>
        </CardHeader>
        <CardContent>
          <GenitoreForm genitore={genitore} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bambini collegati ({bambini.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bambini.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Nessun bambino collegato.</p>
          ) : (
            <ul className="space-y-1">
              {bambini.map((b) => (
                <li key={b.recordId}>
                  <Link href={`/bambini/${b.recordId}`} className="text-sm hover:underline">
                    {b.cognome} {b.nome}
                  </Link>
                </li>
              ))}
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
              await deleteGenitoreAction(genitore.recordId);
            }}
          >
            <Button variant="destructive" type="submit" disabled={bambini.length > 0}>
              Elimina genitore
            </Button>
            {bambini.length > 0 && (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Rimuovi prima i bambini collegati.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
