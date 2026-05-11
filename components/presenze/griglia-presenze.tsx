"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { setPresenzaAction } from "@/lib/actions/presenze";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { presenzaAssente } from "@/lib/airtable/types";
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

type Stato = "presente" | "assente" | "non_segnato";

function statoDa(p: Presenza | undefined): Stato {
  if (!p) return "non_segnato";
  if (typeof p.presente === "boolean") {
    return p.presente ? "presente" : "assente";
  }
  return presenzaAssente(p) ? "assente" : "presente";
}

export function GrigliaPresenze({
  data,
  attivitaId,
  attivita,
  candidati,
  presenzeEsistenti,
}: Props) {
  const router = useRouter();
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bambino</TableHead>
                <TableHead>Sessione</TableHead>
                <TableHead>Fasce</TableHead>
                <TableHead className="text-center">Stato</TableHead>
                <TableHead className="text-center w-32">Orari</TableHead>
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
                candidati.map(({ bambino, iscrizione, sessioneId, sessioneEtichetta }) => (
                  <RigaPresenza
                    key={bambino.recordId}
                    bambino={bambino}
                    iscrizione={iscrizione}
                    sessioneId={sessioneId}
                    sessioneEtichetta={sessioneEtichetta}
                    data={date}
                    presenzaIniziale={presenzeMap.get(bambino.recordId)}
                    onChange={() => router.refresh()}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--muted-foreground)]">
        Click su <strong>Presente</strong> o <strong>Assente</strong> per registrare lo stato. Le ore
        sono opzionali: usa l&apos;icona orologio quando servono.
      </p>
    </div>
  );
}

function RigaPresenza({
  bambino,
  iscrizione,
  sessioneId,
  sessioneEtichetta,
  data,
  presenzaIniziale,
  onChange,
}: {
  bambino: Bambino;
  iscrizione: Iscrizione;
  sessioneId?: string;
  sessioneEtichetta?: string;
  data: string;
  presenzaIniziale?: Presenza;
  onChange: () => void;
}) {
  const [presenza, setPresenza] = useState<Presenza | undefined>(presenzaIniziale);
  const [pending, startTransition] = useTransition();
  const [oreOpen, setOreOpen] = useState(false);

  const stato = statoDa(presenza);

  const setStato = (next: Stato) => {
    startTransition(async () => {
      const presenteFlag = next === "presente" ? true : next === "assente" ? false : null;
      const res = await setPresenzaAction({
        bambinoId: bambino.recordId,
        sessioneId,
        data,
        presente: presenteFlag,
        // Manteniamo eventuali ore già presenti se passi da "non_segnato"/"assente" → "presente"
        oraIngresso: next === "presente" ? presenza?.oraIngresso : undefined,
        oraUscita: next === "presente" ? presenza?.oraUscita : undefined,
      });
      if (res?.error) {
        toast.error(res.error);
      } else {
        // Aggiornamento ottimistico
        setPresenza((prev) => {
          if (next === "non_segnato") return undefined;
          return {
            recordId: prev?.recordId ?? "",
            codice: prev?.codice ?? "",
            bambinoId: bambino.recordId,
            sessioneId,
            data,
            presente: next === "presente",
            oraIngresso: next === "presente" ? prev?.oraIngresso : undefined,
            oraUscita: next === "presente" ? prev?.oraUscita : undefined,
          } as Presenza;
        });
        onChange();
      }
    });
  };

  return (
    <TableRow>
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
      <TableCell className="text-center">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setStato(stato === "presente" ? "non_segnato" : "presente")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium border transition-colors",
              stato === "presente"
                ? "bg-[var(--success)] text-white border-[var(--success)]"
                : "bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--success)] hover:text-[var(--success)]",
              pending && "opacity-50 cursor-not-allowed",
            )}
            aria-pressed={stato === "presente"}
          >
            <Check className="h-3.5 w-3.5" />
            Presente
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStato(stato === "assente" ? "non_segnato" : "assente")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium border transition-colors",
              stato === "assente"
                ? "bg-[var(--danger)] text-white border-[var(--danger)]"
                : "bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--danger)] hover:text-[var(--danger)]",
              pending && "opacity-50 cursor-not-allowed",
            )}
            aria-pressed={stato === "assente"}
          >
            <X className="h-3.5 w-3.5" />
            Assente
          </button>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {stato === "presente" ? (
          <button
            type="button"
            onClick={() => setOreOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--ink)]"
            title="Imposta ora ingresso/uscita"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums">
              {presenza?.oraIngresso || presenza?.oraUscita
                ? `${presenza?.oraIngresso ?? "—"} → ${presenza?.oraUscita ?? "—"}`
                : "imposta"}
            </span>
          </button>
        ) : (
          <span className="text-[12px] text-[var(--muted-2)]">—</span>
        )}
        <OreDialog
          open={oreOpen}
          onOpenChange={setOreOpen}
          bambinoNome={`${bambino.cognome} ${bambino.nome}`}
          data={data}
          oraIngressoIniziale={presenza?.oraIngresso ?? ""}
          oraUscitaIniziale={presenza?.oraUscita ?? ""}
          onSave={(oraIngresso, oraUscita) => {
            startTransition(async () => {
              const res = await setPresenzaAction({
                bambinoId: bambino.recordId,
                sessioneId,
                data,
                presente: true,
                oraIngresso: oraIngresso || undefined,
                oraUscita: oraUscita || undefined,
              });
              if (res?.error) {
                toast.error(res.error);
              } else {
                setPresenza((prev) => ({
                  recordId: prev?.recordId ?? "",
                  codice: prev?.codice ?? "",
                  bambinoId: bambino.recordId,
                  sessioneId,
                  data,
                  presente: true,
                  oraIngresso: oraIngresso || undefined,
                  oraUscita: oraUscita || undefined,
                }) as Presenza);
                setOreOpen(false);
                toast.success("Orari salvati");
                onChange();
              }
            });
          }}
        />
      </TableCell>
      {pending ? (
        <TableCell className="w-0 p-0">
          <Loader2 className="h-3 w-3 animate-spin text-[var(--muted-foreground)]" />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function OreDialog({
  open,
  onOpenChange,
  bambinoNome,
  data,
  oraIngressoIniziale,
  oraUscitaIniziale,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bambinoNome: string;
  data: string;
  oraIngressoIniziale: string;
  oraUscitaIniziale: string;
  onSave: (oraIngresso: string, oraUscita: string) => void;
}) {
  const [oraIngresso, setOraIngresso] = useState(oraIngressoIniziale);
  const [oraUscita, setOraUscita] = useState(oraUscitaIniziale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Orari di {bambinoNome}</DialogTitle>
          <DialogDescription>
            {data}. Lascia vuoto se non vuoi tracciare l&apos;orario specifico.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[12px] text-[var(--muted-foreground)]">Ingresso</span>
            <Input
              type="time"
              value={oraIngresso}
              onChange={(e) => setOraIngresso(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px] text-[var(--muted-foreground)]">Uscita</span>
            <Input
              type="time"
              value={oraUscita}
              onChange={(e) => setOraUscita(e.target.value)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={() => onSave(oraIngresso, oraUscita)}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
