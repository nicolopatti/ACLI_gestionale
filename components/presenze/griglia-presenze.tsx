"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  PresenzeRapide,
  type PresenzaRapidaCandidato,
} from "./presenze-rapide";
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

export function GrigliaPresenze({
  data,
  attivitaId,
  attivita,
  candidati,
  presenzeEsistenti,
}: Props) {
  const [date, setDate] = useState(data);
  const [attivitaSel, setAttivitaSel] = useState(attivitaId);

  const reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("data", date);
    if (attivitaSel) url.searchParams.set("attivitaId", attivitaSel);
    else url.searchParams.delete("attivitaId");
    window.location.href = url.toString();
  };

  const presenzeByBambino = new Map(
    presenzeEsistenti.map((p) => [p.bambinoId, p] as const),
  );
  const candidatiRapidi: PresenzaRapidaCandidato[] = candidati.map((c) => {
    const p = presenzeByBambino.get(c.bambino.recordId);
    const presente = Boolean(p && !presenzaAssente(p));
    return {
      bambinoId: c.bambino.recordId,
      nomeCompleto: `${c.bambino.cognome} ${c.bambino.nome}`,
      sessioneId: c.sessioneId,
      fasceOrarie: c.iscrizione.fasceOrarie,
      presenteIniziale: presente,
      oraIngressoIniziale: p?.oraIngresso,
      oraUscitaIniziale: p?.oraUscita,
    };
  });

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
          <PresenzeRapide data={data} candidati={candidatiRapidi} />
        </CardContent>
      </Card>
    </div>
  );
}
