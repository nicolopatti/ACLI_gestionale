"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/utenti";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function generaPasswordCasuale(): string {
  // 12 caratteri alfanumerici senza ambigui (0/O/1/l/I) — facile da dettare a voce.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => alphabet[n % alphabet.length]).join("");
}

export function ResetPasswordDialog({
  recordId,
  nome,
  email,
}: {
  recordId: string;
  nome: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(resetPasswordAction, undefined);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPassword("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {nome}</DialogTitle>
          <DialogDescription>
            Imposta una password temporanea per <strong>{email}</strong>.
            Comunicagliela a voce: al prossimo login dovrà sceglierne una
            personale prima di poter usare l&apos;app.
          </DialogDescription>
        </DialogHeader>
        {state?.ok ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700">
              Password aggiornata. Comunica all&apos;utente questa password
              temporanea:
            </p>
            <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-3 font-mono text-sm">
              {password}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Chiudi
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="recordId" value={recordId} />
            <div className="space-y-2">
              <Label htmlFor="passwordTemporanea">
                Password temporanea (min 8 caratteri)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="passwordTemporanea"
                  name="passwordTemporanea"
                  type="text"
                  minLength={8}
                  required
                  ref={inputRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPassword(generaPasswordCasuale())}
                  title="Genera password casuale"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {state?.error ? (
              <p className="text-sm text-[var(--destructive)]">{state.error}</p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
