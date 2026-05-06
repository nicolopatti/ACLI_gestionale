import { auth } from "@/lib/auth/auth";
import { listMovimenti, totaliPerConto } from "@/lib/airtable/movimenti";
import { listCategorie } from "@/lib/airtable/categorie";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEur } from "@/lib/utils";

export default async function CassaPage() {
  const session = await auth();
  const isAdmin = session?.user?.ruolo === "admin";
  const telegramUserId = session?.user?.telegramUserId;

  const [movimenti, categorie, totali] = await Promise.all([
    listMovimenti(isAdmin ? {} : { telegramUserId }),
    listCategorie(),
    totaliPerConto(),
  ]);
  const categoriaById = new Map(categorie.map((c) => [c.recordId, c] as const));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cassa</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {(["Cassa", "BCC", "Sumup"] as const).map((conto) => (
          <Card key={conto}>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">{conto}</p>
              <p className="text-2xl font-semibold">{formatEur(totali[conto].saldo)}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Entrate {formatEur(totali[conto].entrate)} · Uscite{" "}
                {formatEur(totali[conto].uscite)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Conto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrizione</TableHead>
                {isAdmin && <TableHead>Volontario</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimenti.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center text-[var(--muted-foreground)] py-8"
                  >
                    {isAdmin
                      ? "Nessun movimento. Il workflow di sync non ha ancora importato dati dal foglio."
                      : "Nessun movimento registrato dal tuo account Telegram."}
                  </TableCell>
                </TableRow>
              ) : (
                movimenti.map((m) => (
                  <TableRow key={m.recordId}>
                    <TableCell>{formatDate(m.dataMovimento)}</TableCell>
                    <TableCell>
                      {m.tipo === "Entrata" ? (
                        <Badge variant="success">Entrata</Badge>
                      ) : (
                        <Badge variant="warning">Uscita</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{formatEur(m.importo)}</TableCell>
                    <TableCell>{m.conto}</TableCell>
                    <TableCell>
                      {m.categoriaId ? categoriaById.get(m.categoriaId)?.nome ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{m.descrizione ?? "—"}</TableCell>
                    {isAdmin && <TableCell>{m.volontario ?? "—"}</TableCell>}
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
