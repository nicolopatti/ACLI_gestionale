import Link from "next/link";
import { Plus } from "lucide-react";
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

export default async function AttivitaPage() {
  const attivita = await listAttivita();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Attività</h1>
        <Button asChild>
          <Link href="/attivita/nuova">
            <Plus className="h-4 w-4" /> Nuova
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Sessioni</TableHead>
                <TableHead>Modalità</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attivita.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessuna attività configurata.
                  </TableCell>
                </TableRow>
              ) : (
                attivita.map((a) => (
                  <TableRow key={a.recordId}>
                    <TableCell>
                      <Link href={`/attivita/${a.recordId}`} className="font-medium hover:underline">
                        {a.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">
                      {a.dataInizio || a.dataFine
                        ? `${formatDate(a.dataInizio)} → ${formatDate(a.dataFine)}`
                        : "—"}
                    </TableCell>
                    <TableCell>{a.sessioniIds.length}</TableCell>
                    <TableCell>{a.modalitaIds.length}</TableCell>
                    <TableCell>
                      {a.attivo ? (
                        <Badge variant="success">Attiva</Badge>
                      ) : (
                        <Badge variant="outline">Archiviata</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
