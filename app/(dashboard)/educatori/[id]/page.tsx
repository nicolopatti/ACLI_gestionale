import { notFound } from "next/navigation";
import { getEducatore } from "@/lib/airtable/educatori";
import { listDisponibilitaByEducatore } from "@/lib/airtable/disponibilita";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EducatoreForm } from "@/components/educatori/educatore-form";
import { CalendarioDisponibilita } from "@/components/educatori/calendario-disponibilita";
import { Badge } from "@/components/ui/badge";
import { DeleteEducatoreButton } from "@/components/educatori/delete-educatore-button";

function meseCorrenteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function EducatoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mese?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const meseAnno =
    sp.mese && /^\d{4}-\d{2}$/.test(sp.mese) ? sp.mese : meseCorrenteIso();

  const [educatore, disponibilita] = await Promise.all([
    getEducatore(id),
    listDisponibilitaByEducatore(id),
  ]);
  if (!educatore) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {educatore.cognome} {educatore.nome}
        </h1>
        {educatore.attivo ? (
          <Badge variant="success">Attivo</Badge>
        ) : (
          <Badge variant="outline">Archiviato</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anagrafica</CardTitle>
        </CardHeader>
        <CardContent>
          <EducatoreForm educatore={educatore} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendario disponibilità</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarioDisponibilita
            educatoreId={educatore.recordId}
            meseAnno={meseAnno}
            disponibilita={disponibilita}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eliminazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DeleteEducatoreButton educatoreId={educatore.recordId} />
          <p className="text-xs text-[var(--muted-foreground)]">
            Cascade automatico sulle disponibilità (turni) collegate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
