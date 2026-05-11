import Link from "next/link";
import { listBambini } from "@/lib/db/bambini";
import { listPresenzeByBambino } from "@/lib/db/presenze";
import { presenzaAssente } from "@/lib/airtable/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function StoricoPresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ bambinoId?: string }>;
}) {
  const sp = await searchParams;
  const bambini = await listBambini();
  const selected = sp.bambinoId;
  const presenze = selected ? await listPresenzeByBambino(selected) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Storico presenze</h1>
        <Button asChild variant="outline">
          <Link href="/presenze">Indietro</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-end gap-3 p-4">
          <form className="flex items-end gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="bambinoId">
                Bambino
              </label>
              <select
                id="bambinoId"
                name="bambinoId"
                defaultValue={selected ?? ""}
                className="ml-2 h-9 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm"
              >
                <option value="">— Seleziona —</option>
                {bambini.map((b) => (
                  <option key={b.recordId} value={b.recordId}>
                    {b.cognome} {b.nome}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Filtra</Button>
          </form>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ingresso</TableHead>
                  <TableHead>Uscita</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presenze.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-[var(--muted-foreground)]">
                      Nessuna presenza registrata.
                    </TableCell>
                  </TableRow>
                ) : (
                  presenze.map((p) => (
                    <TableRow key={p.recordId}>
                      <TableCell>{formatDate(p.data)}</TableCell>
                      <TableCell>{p.oraIngresso ?? "—"}</TableCell>
                      <TableCell>{p.oraUscita ?? "—"}</TableCell>
                      <TableCell>
                        {presenzaAssente(p) ? (
                          <Badge variant="outline">Assente</Badge>
                        ) : (
                          <Badge variant="success">Presente</Badge>
                        )}
                      </TableCell>
                      <TableCell>{p.note ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
