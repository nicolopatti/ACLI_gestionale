import Link from "next/link";
import { Plus } from "lucide-react";
import { listEducatori } from "@/lib/airtable/educatori";
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

export default async function EducatoriPage() {
  const educatori = await listEducatori();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Educatori</h1>
        <Button asChild>
          <Link href="/educatori/nuovo">
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
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {educatori.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessun educatore registrato.
                  </TableCell>
                </TableRow>
              ) : (
                educatori.map((e) => (
                  <TableRow key={e.recordId}>
                    <TableCell>
                      <Link href={`/educatori/${e.recordId}`} className="font-medium hover:underline">
                        {e.cognome} {e.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{e.email ?? "—"}</TableCell>
                    <TableCell>{e.telefono ?? "—"}</TableCell>
                    <TableCell>
                      {e.attivo ? (
                        <Badge variant="success">Attivo</Badge>
                      ) : (
                        <Badge variant="outline">Archiviato</Badge>
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
