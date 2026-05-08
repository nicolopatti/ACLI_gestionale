import Link from "next/link";
import { Plus } from "lucide-react";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listBambini } from "@/lib/airtable/bambini";
import { listAttivita } from "@/lib/airtable/attivita";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function IscrizioniPage() {
  const [iscrizioni, bambini, attivita] = await Promise.all([
    listIscrizioni(),
    listBambini(),
    listAttivita(),
  ]);
  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));
  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Iscrizioni</h1>
        <Button asChild>
          <Link href="/iscrizioni/nuova">
            <Plus className="h-4 w-4" /> Nuova iscrizione
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bambino</TableHead>
                <TableHead>Attività</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sessioni</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iscrizioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessuna iscrizione.
                  </TableCell>
                </TableRow>
              ) : (
                iscrizioni.map((i) => {
                  const b = bambinoById.get(i.bambinoId);
                  const a = attivitaById.get(i.attivitaId);
                  return (
                    <TableRow key={i.recordId}>
                      <TableCell>
                        <Link href={`/iscrizioni/${i.recordId}`} className="font-medium hover:underline">
                          {b ? `${b.cognome} ${b.nome}` : "—"}
                        </Link>
                      </TableCell>
                      <TableCell>{a?.nome ?? "—"}</TableCell>
                      <TableCell>
                        {a ? <Badge variant="outline">{a.tipo}</Badge> : "—"}
                      </TableCell>
                      <TableCell>{i.sessioniSelteIds.length}</TableCell>
                      <TableCell>{formatDate(i.dataIscrizione)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
