import Link from "next/link";
import { Plus } from "lucide-react";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listBambini } from "@/lib/airtable/bambini";
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
import { formatEur } from "@/lib/utils";

export default async function IscrizioniPage() {
  const [iscrizioni, bambini] = await Promise.all([listIscrizioni(), listBambini()]);
  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));

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
                <TableHead>Anno</TableHead>
                <TableHead>Giorni</TableHead>
                <TableHead className="text-right">Importo/mese</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {iscrizioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessuna iscrizione.
                  </TableCell>
                </TableRow>
              ) : (
                iscrizioni.map((i) => {
                  const b = bambinoById.get(i.bambinoId);
                  return (
                    <TableRow key={i.recordId}>
                      <TableCell>
                        <Link href={`/iscrizioni/${i.recordId}`} className="font-medium hover:underline">
                          {b ? `${b.cognome} ${b.nome}` : "—"}
                        </Link>
                      </TableCell>
                      <TableCell>{i.annoScolastico}</TableCell>
                      <TableCell>{i.giorniSettimana.join(", ")}</TableCell>
                      <TableCell className="text-right">
                        {formatEur(i.importoMensileDefault)}
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
