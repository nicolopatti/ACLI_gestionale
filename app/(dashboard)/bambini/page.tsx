import Link from "next/link";
import { Plus } from "lucide-react";
import { listBambini } from "@/lib/airtable/bambini";
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

export default async function BambiniPage() {
  const bambini = await listBambini();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bambini</h1>
        <Button asChild>
          <Link href="/bambini/nuovo">
            <Plus className="h-4 w-4" /> Nuovo
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Genitore</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Iscrizioni</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bambini.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessun bambino registrato.
                  </TableCell>
                </TableRow>
              ) : (
                bambini.map((b) => {
                  const numIscrizioni = b.iscrizioniIds.length;
                  return (
                    <TableRow key={b.recordId}>
                      <TableCell>
                        <Link href={`/bambini/${b.recordId}`} className="font-medium hover:underline">
                          {b.cognome} {b.nome}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {b.cognomeGenitore || b.nomeGenitore
                          ? `${b.cognomeGenitore} ${b.nomeGenitore}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell>{b.telefonoGenitore ?? "—"}</TableCell>
                      <TableCell>
                        {b.classe ?? "—"} {b.scuola ? `· ${b.scuola}` : ""}
                      </TableCell>
                      <TableCell>
                        {numIscrizioni > 0 ? (
                          <Badge variant="success">
                            {numIscrizioni} iscritt{numIscrizioni === 1 ? "a" : "e"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Solo anagrafica</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {b.attivo ? (
                          <Badge variant="outline">Attivo</Badge>
                        ) : (
                          <Badge variant="outline">Archiviato</Badge>
                        )}
                      </TableCell>
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
