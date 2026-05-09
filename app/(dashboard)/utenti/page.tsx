import Link from "next/link";
import { Plus } from "lucide-react";
import { listUsers } from "@/lib/airtable/users";
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
import { toggleAttivoAction } from "@/lib/actions/utenti";
import { ResetPasswordDialog } from "@/components/utenti/reset-password-dialog";
import { formatDate } from "@/lib/utils";
import { etichettaRuolo } from "@/lib/config";

export default async function UtentiPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
        <Button asChild>
          <Link href="/utenti/nuovo">
            <Plus className="h-4 w-4" /> Nuovo utente
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
                <TableHead>Ruolo</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Ultimo accesso</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-[var(--muted-foreground)]">
                    Nessun utente. Crea il primo con `pnpm seed:admin`.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.recordId}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.ruolo === "admin" ? "default" : "secondary"}>
                        {etichettaRuolo(u.ruolo)}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.telegramUserId ?? "—"}</TableCell>
                    <TableCell>{formatDate(u.lastLogin)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {u.attivo ? (
                          <Badge variant="success">Attivo</Badge>
                        ) : (
                          <Badge variant="outline">Disattivato</Badge>
                        )}
                        {u.mustChangePassword ? (
                          <Badge variant="outline" title="Al prossimo login dovrà impostare una password personale">
                            Primo accesso
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ResetPasswordDialog
                          recordId={u.recordId}
                          nome={u.nome}
                          email={u.email}
                        />
                        <form
                          action={async () => {
                            "use server";
                            await toggleAttivoAction(u.recordId, !u.attivo);
                          }}
                        >
                          <Button size="sm" variant="outline" type="submit">
                            {u.attivo ? "Disattiva" : "Riattiva"}
                          </Button>
                        </form>
                      </div>
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
