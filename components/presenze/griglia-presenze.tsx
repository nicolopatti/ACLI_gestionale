"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { salvaPresenzeAction } from "@/lib/actions/presenze";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import type { Bambino, Iscrizione, Presenza } from "@/lib/airtable/types";
import type { GiornoSettimana } from "@/lib/config";

const GIORNO_DA_DATE: Record<number, GiornoSettimana | null> = {
  0: null, // domenica
  1: "lun",
  2: "mar",
  3: "mer",
  4: "gio",
  5: "ven",
  6: null, // sabato
};

interface BambinoConIscrizione {
  bambino: Bambino;
  iscrizione?: Iscrizione;
}

interface Props {
  data: string;
  bambiniIscritti: BambinoConIscrizione[];
  presenzeEsistenti: Presenza[];
}

export function GrigliaPresenze({ data, bambiniIscritti, presenzeEsistenti }: Props) {
  const router = typeof window !== "undefined" ? null : null;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [date, setDate] = useState(data);

  const giorno = GIORNO_DA_DATE[new Date(date).getDay()];

  const candidati = bambiniIscritti.filter((bi) => {
    if (!giorno) return false;
    return bi.iscrizione?.giorniSettimana.includes(giorno) ?? false;
  });

  const presenzeMap = new Map<string, boolean>(
    presenzeEsistenti.map((p) => [p.bambinoId, p.presente] as const),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="data-presenze">Data</Label>
            <Input
              id="data-presenze"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("data", date);
              window.location.href = url.toString();
            }}
          >
            Aggiorna giorno
          </Button>
          {!giorno && (
            <p className="text-sm text-[var(--muted-foreground)] ml-auto">
              Sabato o domenica: nessuna lezione.
            </p>
          )}
        </CardContent>
      </Card>

      <form
        action={(formData) =>
          startTransition(async () => {
            const res = await salvaPresenzeAction(formData);
            if (res?.error) setMessage(`Errore: ${res.error}`);
            else setMessage("Presenze salvate.");
          })
        }
      >
        <input type="hidden" name="data" value={date} />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Bambino</TableHead>
                  <TableHead>Anno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidati.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-[var(--muted-foreground)]">
                      Nessun bambino iscritto previsto per questo giorno.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidati.map(({ bambino, iscrizione }) => (
                    <TableRow key={bambino.recordId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          name="presenti"
                          value={bambino.recordId}
                          defaultChecked={presenzeMap.get(bambino.recordId) ?? false}
                          className="h-4 w-4"
                        />
                        <input
                          type="hidden"
                          name="candidati"
                          value={`${bambino.recordId}|${iscrizione?.recordId ?? ""}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {bambino.cognome} {bambino.nome}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {iscrizione?.annoScolastico ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={pending || candidati.length === 0}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salva presenze
          </Button>
          {message && <p className="text-sm">{message}</p>}
        </div>
      </form>
    </div>
  );
}
