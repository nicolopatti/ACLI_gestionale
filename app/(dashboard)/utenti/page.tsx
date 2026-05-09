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
import { Avatar } from "@/components/ui/avatar";
import { UtenteRowActions } from "@/components/utenti/utente-row-actions";
import { formatDate } from "@/lib/utils";
import { etichettaRuolo } from "@/lib/config";

export default async function UtentiPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Gestione account che possono accedere al gestionale
          </p>
        </div>
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
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.nome} size="md" />
                        <span className="font-medium">{u.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.ruolo === "admin" ? "default" : "secondary"}>
                        {etichettaRuolo(u.ruolo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[12px]">
                      {u.telegramUserId ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(u.lastLogin)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {u.attivo ? (
                          <Badge variant="success">Attivo</Badge>
                        ) : (
                          <Badge variant="outline">Disattivato</Badge>
                        )}
                        {u.mustChangePassword ? (
                          <Badge
                            variant="warning"
                            title="Al prossimo login dovrà impostare una password personale"
                          >
                            Primo accesso
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <UtenteRowActions user={u} />
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
