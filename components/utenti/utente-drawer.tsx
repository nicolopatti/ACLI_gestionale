"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  aggiornaUtenteAction,
  resetPasswordAction,
} from "@/lib/actions/utenti";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RUOLI, etichettaRuolo, type Ruolo } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import type { User } from "@/lib/airtable/types";

interface Props {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generaPasswordCasuale(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => alphabet[n % alphabet.length]).join("");
}

export function UtenteDrawer({ user, open, onOpenChange }: Props) {
  const router = useRouter();

  const [nome, setNome] = useState(user.nome);
  const [ruolo, setRuolo] = useState<Ruolo>(user.ruolo);
  const [telegramUserId, setTelegramUserId] = useState(user.telegramUserId ?? "");
  const [attivo, setAttivo] = useState<boolean>(user.attivo);

  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [pendingSave, startSave] = useTransition();
  const [pendingReset, startReset] = useTransition();

  const dirty =
    nome !== user.nome ||
    ruolo !== user.ruolo ||
    (telegramUserId || "") !== (user.telegramUserId ?? "") ||
    attivo !== user.attivo;

  function handleSave() {
    startSave(async () => {
      const fd = new FormData();
      fd.set("recordId", user.recordId);
      fd.set("nome", nome);
      fd.set("ruolo", ruolo);
      fd.set("telegramUserId", telegramUserId);
      fd.set("attivo", attivo ? "true" : "false");
      const res = await aggiornaUtenteAction(undefined, fd);
      if (res?.ok) {
        toast.success("Utente aggiornato");
        onOpenChange(false);
        router.refresh();
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  function handleResetPassword() {
    const password = generaPasswordCasuale();
    startReset(async () => {
      const fd = new FormData();
      fd.set("recordId", user.recordId);
      fd.set("passwordTemporanea", password);
      const res = await resetPasswordAction(undefined, fd);
      if (res?.ok) {
        setTempPassword(password);
        toast.success("Password rigenerata");
        router.refresh();
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  function handleCopyPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    toast.success("Password copiata");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-3 pr-8">
            <Avatar name={user.nome} size="lg" />
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{user.nome}</SheetTitle>
              <SheetDescription className="truncate">{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ut-nome">Nome</Label>
              <Input
                id="ut-nome"
                value={nome}
                onChange={(e) => setNome(e.currentTarget.value)}
                disabled={pendingSave}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ut-ruolo">Ruolo</Label>
              <select
                id="ut-ruolo"
                value={ruolo}
                onChange={(e) => setRuolo(e.currentTarget.value as Ruolo)}
                disabled={pendingSave}
                className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {RUOLI.map((r) => (
                  <option key={r} value={r}>
                    {etichettaRuolo(r)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ut-telegram">Telegram User ID</Label>
              <Input
                id="ut-telegram"
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.currentTarget.value)}
                disabled={pendingSave}
                placeholder="es. 123456789"
                inputMode="numeric"
              />
              <p className="text-[11.5px] text-[var(--muted-foreground)]">
                Necessario per filtrare i movimenti registrati dal bot Telegram.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div>
                <div className="text-[13px] font-medium">Account attivo</div>
                <div className="text-[11.5px] text-[var(--muted-foreground)]">
                  Se disattivato, l&apos;utente non può più fare login.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={attivo}
                onClick={() => setAttivo((v) => !v)}
                disabled={pendingSave}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  attivo
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border-strong)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    attivo ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <div>
              <h3 className="text-[13px] font-medium">Sicurezza</h3>
              <p className="text-[11.5px] text-[var(--muted-foreground)] mt-0.5">
                Reset password genera una temporanea che l&apos;utente dovrà cambiare al
                primo accesso.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              disabled={pendingReset}
            >
              {pendingReset ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reset password
            </Button>
            {tempPassword ? (
              <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success-soft)] px-3 py-2.5 space-y-2">
                <div className="text-[11.5px] uppercase tracking-wide text-[var(--success-soft-ink)]">
                  Password temporanea — copiala adesso
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-[13px] tabular-nums">
                    {tempPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copia
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <h3 className="text-[13px] font-medium">Stato</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
              {user.mustChangePassword ? (
                <Badge variant="warning">Primo accesso pendente</Badge>
              ) : null}
              <span className="text-[var(--muted-foreground)]">
                Ultimo accesso: {user.lastLogin ? formatDate(user.lastLogin) : "mai"}
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--muted-foreground)]">
              Creato il {user.createdAt ? formatDate(user.createdAt) : "—"}
            </p>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pendingSave}>
            Chiudi
          </Button>
          <Button onClick={handleSave} disabled={!dirty || pendingSave}>
            {pendingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salva modifiche
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
