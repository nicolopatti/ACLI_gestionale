"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { salvaPresenzeAction } from "@/lib/actions/presenze";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";
import type { Attivita, Bambino, Iscrizione, Presenza } from "@/lib/airtable/types";

interface CandidatoPresenza {
  bambino: Bambino;
  iscrizione: Iscrizione;
  sessioneId?: string;
  sessioneEtichetta?: string;
}

interface Props {
  data: string;
  attivitaId: string;
  attivita: Attivita[];
  candidati: CandidatoPresenza[];
  presenzeEsistenti: Presenza[];
}

export function GrigliaPresenze({
  data,
  attivitaId,
  attivita,
  candidati,
  presenzeEsistenti,
}: Props) {
  const router = useRouter();
  const fb = useActionFeedback({
    successToast: "Presenze salvate",
    onSuccess: () => router.refresh(),
  });
  const [date, setDate] = useState(data);
  const [attivitaSel, setAttivitaSel] = useState(attivitaId);

  const presenzeMap = new Map<string, Presenza>(
    presenzeEsistenti.map((p) => [p.bambinoId, p] as const),
  );

  const reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("data", date);
    if (attivitaSel) url.searchParams.set("attivitaId", attivitaSel);
    window.location.href = url.toString();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="attivita-presenze">Attività</Label>
            <select
              id="attivita-presenze"
              value={attivitaSel}
              onChange={(e) => setAttivitaSel(e.target.value)}
              className="flex h-9 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="">— Tutte —</option>
              {attivita.map((a) => (
                <option key={a.recordId} value={a.recordId}>
                  {a.nome} ({a.tipo})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="data-presenze">Data</Label>
            <Input
              id="data-presenze"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={reload}>
            Aggiorna
          </Button>
        </CardContent>
      </Card>

      <form
        action={(formData) =>
          fb.run(async () => {
            const res = await salvaPresenzeAction(formData);
            // L'action torna `{ error }` su errore o `undefined` su successo.
            return res?.error ? { error: res.error } : { ok: true };
          })
        }
      >
        <input type="hidden" name="data" value={date} />
        <input type="hidden" name="attivitaId" value={attivitaSel} />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bambino</TableHead>
                  <TableHead>Sessione</TableHead>
                  <TableHead>Fasce</TableHead>
                  <TableHead className="w-32">Ingresso</TableHead>
                  <TableHead className="w-32">Uscita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidati.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-[var(--muted-foreground)]">
                      Nessun bambino iscritto previsto per questa data.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidati.map(({ bambino, iscrizione, sessioneId, sessioneEtichetta }) => {
                    const existing = presenzeMap.get(bambino.recordId);
                    return (
                      <TableRow key={bambino.recordId}>
                        <TableCell className="font-medium">
                          {bambino.cognome} {bambino.nome}
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">
                          {sessioneEtichetta ?? "—"}
                        </TableCell>
                        <TableCell>
                          {iscrizione.fasceOrarie.length > 0 ? (
                            <div className="flex gap-1">
                              {iscrizione.fasceOrarie.map((f) => (
                                <Badge key={f} variant="outline" className="text-xs">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <input
                            type="time"
                            name={`oraIngresso_${bambino.recordId}`}
                            defaultValue={existing?.oraIngresso ?? ""}
                            className="h-9 rounded-md border border-[var(--border)] bg-transparent px-2 text-sm"
                          />
                          <input
                            type="hidden"
                            name="candidati"
                            value={`${bambino.recordId}|${sessioneId ?? ""}`}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="time"
                            name={`oraUscita_${bambino.recordId}`}
                            defaultValue={existing?.oraUscita ?? ""}
                            className="h-9 rounded-md border border-[var(--border)] bg-transparent px-2 text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="mt-4 flex items-center gap-3">
          <ActionButton
            type="submit"
            disabled={candidati.length === 0}
            pending={fb.pending}
            success={fb.success}
            error={fb.error}
            pendingText="Salvataggio…"
            successText="Salvate ✓"
          >
            Salva presenze
          </ActionButton>
          <p className="text-xs text-[var(--muted-foreground)] ml-auto">
            Lascia vuoti entrambi gli orari per registrare un&apos;assenza.
          </p>
        </div>
      </form>
    </div>
  );
}
