import Link from "next/link";
import { Plus } from "lucide-react";
import { listGenitori } from "@/lib/airtable/genitori";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default async function GenitoriPage() {
  const genitori = await listGenitori();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Genitori</h1>
        <Button asChild>
          <Link href="/genitori/nuovo">
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
                <TableHead>Telefono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Bambini</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {genitori.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessun genitore registrato.
                  </TableCell>
                </TableRow>
              ) : (
                genitori.map((g) => (
                  <TableRow key={g.recordId}>
                    <TableCell>
                      <Link href={`/genitori/${g.recordId}`} className="font-medium hover:underline">
                        {g.cognome} {g.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{g.telefono ?? "—"}</TableCell>
                    <TableCell>{g.email ?? "—"}</TableCell>
                    <TableCell className="text-right">{g.bambiniIds.length}</TableCell>
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
