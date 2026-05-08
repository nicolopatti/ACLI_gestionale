"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { TIPI_UNITA, type TipoUnita } from "@/lib/config";
import {
  createSessioneAction,
  deleteSessioneAction,
} from "@/lib/actions/sessioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatEur } from "@/lib/utils";
import type { Sessione } from "@/lib/airtable/types";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

interface Props {
  attivitaId: string;
  defaultTipoUnita: TipoUnita;
  sessioni: Sessione[];
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function deriveChiaveEtichetta(tipo: TipoUnita, dataInizio: string): { chiave: string; etichetta: string } {
  if (!dataInizio) return { chiave: "", etichetta: "" };
  const d = new Date(dataInizio);
  if (Number.isNaN(d.getTime())) return { chiave: "", etichetta: "" };
  const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const mesi = [
    "gen", "feb", "mar", "apr", "mag", "giu",
    "lug", "ago", "set", "ott", "nov", "dic",
  ];
  if (tipo === "mese") {
    const chiave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const long = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
    return { chiave, etichetta: `${long[d.getMonth()]} ${d.getFullYear()}` };
  }
  if (tipo === "giornata") {
    const chiave = dataInizio;
    const etichetta = `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
    return { chiave, etichetta };
  }
  // settimana
  const chiave = isoWeek(d);
  const etichetta = `Settimana ${chiave}`;
  return { chiave, etichetta };
}

export function SessioniEditor({ attivitaId, defaultTipoUnita, sessioni }: Props) {
  const [tipoUnita, setTipoUnita] = useState<TipoUnita>(defaultTipoUnita);
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [chiave, setChiave] = useState("");
  const [etichetta, setEtichetta] = useState("");
  const [importo, setImporto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDataInizioChange = (v: string) => {
    setDataInizio(v);
    const derived = deriveChiaveEtichetta(tipoUnita, v);
    if (!chiave) setChiave(derived.chiave);
    if (!etichetta) setEtichetta(derived.etichetta);
  };

  const onTipoChange = (t: TipoUnita) => {
    setTipoUnita(t);
    if (dataInizio) {
      const derived = deriveChiaveEtichetta(t, dataInizio);
      setChiave(derived.chiave);
      setEtichetta(derived.etichetta);
    }
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("attivitaId", attivitaId);
    fd.set("tipoUnita", tipoUnita);
    fd.set("chiave", chiave);
    fd.set("etichetta", etichetta);
    fd.set("dataInizio", dataInizio);
    fd.set("dataFine", dataFine);
    if (importo) fd.set("importo", importo);
    startTransition(async () => {
      setError(null);
      const res = await createSessioneAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setDataInizio("");
      setDataFine("");
      setChiave("");
      setEtichetta("");
      setImporto("");
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      await deleteSessioneAction(id, attivitaId);
    });
  };

  return (
    <div className="space-y-4">
      {sessioni.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Nessuna sessione configurata.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {sessioni.map((s) => (
            <li
              key={s.recordId}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{s.etichetta}</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {s.tipoUnita} · {s.chiave}
                  {s.dataInizio ? ` · ${formatDate(s.dataInizio)}` : ""}
                  {s.dataFine && s.dataFine !== s.dataInizio ? `–${formatDate(s.dataFine)}` : ""}
                  {s.importo !== undefined ? ` · ${formatEur(s.importo)}` : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(s.recordId)}
                aria-label="Elimina sessione"
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-md border border-[var(--border)] p-3 md:grid-cols-12"
      >
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Tipo</Label>
          <select
            className={SELECT_CLASS}
            value={tipoUnita}
            onChange={(e) => onTipoChange(e.target.value as TipoUnita)}
          >
            {TIPI_UNITA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Data inizio</Label>
          <Input type="date" value={dataInizio} onChange={(e) => onDataInizioChange(e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Data fine</Label>
          <Input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Chiave</Label>
          <Input value={chiave} onChange={(e) => setChiave(e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Etichetta</Label>
          <Input value={etichetta} onChange={(e) => setEtichetta(e.target.value)} />
        </div>
        <div className="md:col-span-1 space-y-1">
          <Label className="text-xs">€</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            placeholder="default"
          />
        </div>
        <div className="md:col-span-1 flex items-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {error && (
          <p className="md:col-span-12 text-sm text-[var(--destructive)]">{error}</p>
        )}
      </form>
    </div>
  );
}
