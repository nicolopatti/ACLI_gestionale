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
import { formatDate } from "@/lib/utils";

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
                        {u.ruolo === "admin" ? "Admin" : "Volontario"}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.telegramUserId ?? "—"}</TableCell>
                    <TableCell>{formatDate(u.lastLogin)}</TableCell>
                    <TableCell>
                      {u.attivo ? (
                        <Badge variant="success">Attivo</Badge>
                      ) : (
                        <Badge variant="outline">Disattivato</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
