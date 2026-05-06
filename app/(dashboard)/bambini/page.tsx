import Link from "next/link";
import { Plus } from "lucide-react";
import { listBambini } from "@/lib/airtable/bambini";
import { listGenitori } from "@/lib/airtable/genitori";
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
  const [bambini, genitori] = await Promise.all([listBambini(), listGenitori()]);
  const genitoreById = new Map(genitori.map((g) => [g.recordId, g] as const));

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
                <TableHead>Classe</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bambini.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessun bambino registrato.
                  </TableCell>
                </TableRow>
              ) : (
                bambini.map((b) => {
                  const g = b.genitoreId ? genitoreById.get(b.genitoreId) : undefined;
                  return (
                    <TableRow key={b.recordId}>
                      <TableCell>
                        <Link href={`/bambini/${b.recordId}`} className="font-medium hover:underline">
                          {b.cognome} {b.nome}
                        </Link>
                      </TableCell>
                      <TableCell>{g ? `${g.cognome} ${g.nome}` : "—"}</TableCell>
                      <TableCell>
                        {b.classe ?? "—"} {b.scuola ? `· ${b.scuola}` : ""}
                      </TableCell>
                      <TableCell>
                        {b.attivo ? (
                          <Badge variant="success">Iscritto</Badge>
                        ) : (
                          <Badge variant="outline">Non attivo</Badge>
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
