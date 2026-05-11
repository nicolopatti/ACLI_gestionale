import Link from "next/link";
import { Plus } from "lucide-react";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listBambini } from "@/lib/airtable/bambini";
import { listAttivita } from "@/lib/airtable/attivita";
import { listAllMesi } from "@/lib/airtable/mesi";
import { listAllModalita } from "@/lib/airtable/modalita-iscrizione";
import type { Iscrizione, MeseIscrizione } from "@/lib/airtable/types";
import { Button } from "@/components/ui/button";
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
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { SegnaPagatoDialog } from "@/components/iscrizioni/segna-pagato-dialog";
import { cn, formatEur } from "@/lib/utils";

type StatoIscrizione = "attiva" | "ritardo" | "completata" | "anagrafica";
type Tab = "tutte" | "attive" | "ritardo" | "completate";

function isTab(v: string | undefined): v is Tab {
  return v === "tutte" || v === "attive" || v === "ritardo" || v === "completate";
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function rataInRitardo(r: MeseIscrizione, currentMonth: string): boolean {
  if (r.statoPagamento === "pagato") return false;
  // Per chiavi YYYY-MM il confronto stringa è corretto. Per chiavi
  // diverse (settimanali/giornaliere) il confronto resta sufficiente
  // come approssimazione MVP.
  if (!r.chiavePeriodo) return false;
  return r.chiavePeriodo.slice(0, 7) < currentMonth;
}

function derivaStatoIscrizione(rate: MeseIscrizione[], currentMonth: string): StatoIscrizione {
  if (rate.length === 0) return "anagrafica";
  const hasRitardo = rate.some((r) => rataInRitardo(r, currentMonth));
  if (hasRitardo) return "ritardo";
  const tutteCompletate = rate.every((r) => r.statoPagamento === "pagato");
  if (tutteCompletate) return "completata";
  return "attiva";
}

function prossimaRataNonPagata(rate: MeseIscrizione[]): MeseIscrizione | undefined {
  return rate
    .filter((r) => r.statoPagamento !== "pagato")
    .sort((a, b) => (a.chiavePeriodo ?? "").localeCompare(b.chiavePeriodo ?? ""))[0];
}

function statoBadge(stato: StatoIscrizione) {
  switch (stato) {
    case "attiva":
      return <Badge variant="success">Attiva</Badge>;
    case "ritardo":
      return <Badge variant="destructive">In ritardo</Badge>;
    case "completata":
      return <Badge variant="secondary">Completata</Badge>;
    case "anagrafica":
      return <Badge variant="outline">Solo anagrafica</Badge>;
  }
}

export default async function IscrizioniPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = isTab(sp.tab) ? sp.tab : "tutte";
  const currentMonth = currentMonthKey();

  const [iscrizioni, bambini, attivita, allRate, modalita] = await Promise.all([
    listIscrizioni(),
    listBambini(),
    listAttivita(),
    listAllMesi(),
    listAllModalita(),
  ]);

  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));
  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));
  const modalitaById = new Map(modalita.map((m) => [m.recordId, m] as const));

  const rateByIscrizione = new Map<string, MeseIscrizione[]>();
  for (const r of allRate) {
    const arr = rateByIscrizione.get(r.iscrizioneId) ?? [];
    arr.push(r);
    rateByIscrizione.set(r.iscrizioneId, arr);
  }

  type Row = {
    iscrizione: Iscrizione;
    rate: MeseIscrizione[];
    pagati: number;
    totale: number;
    stato: StatoIscrizione;
    prossimaRata?: MeseIscrizione;
  };

  const rows: Row[] = iscrizioni.map((i) => {
    const rate = rateByIscrizione.get(i.recordId) ?? [];
    const pagati = rate.filter((r) => r.statoPagamento === "pagato").length;
    return {
      iscrizione: i,
      rate,
      pagati,
      totale: rate.length,
      stato: derivaStatoIscrizione(rate, currentMonth),
      prossimaRata: prossimaRataNonPagata(rate),
    };
  });

  const counts = {
    tutte: rows.length,
    attive: rows.filter((r) => r.stato === "attiva").length,
    ritardo: rows.filter((r) => r.stato === "ritardo").length,
    completate: rows.filter((r) => r.stato === "completata").length,
  };

  const filtered = rows
    .filter((r) => {
      if (tab === "tutte") return true;
      if (tab === "attive") return r.stato === "attiva";
      if (tab === "ritardo") return r.stato === "ritardo";
      if (tab === "completate") return r.stato === "completata";
      return true;
    })
    .sort((a, b) => {
      // ritardo > attiva > completata; poi per data iscrizione discendente
      const order: Record<StatoIscrizione, number> = {
        ritardo: 0,
        attiva: 1,
        anagrafica: 2,
        completata: 3,
      };
      const o = order[a.stato] - order[b.stato];
      if (o !== 0) return o;
      return (b.iscrizione.dataIscrizione ?? "").localeCompare(a.iscrizione.dataIscrizione ?? "");
    });

  function tabHref(t: Tab): string {
    return t === "tutte" ? "/iscrizioni" : `?tab=${t}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Iscrizioni</h1>
        <Button asChild>
          <Link href="/iscrizioni/nuova">
            <Plus className="h-4 w-4" /> Nuova iscrizione
          </Link>
        </Button>
      </div>

      <div className="flex gap-0.5 border-b border-[var(--border)]">
        {(
          [
            ["tutte", "Tutte"],
            ["attive", "Attive"],
            ["ritardo", "In ritardo"],
            ["completate", "Completate"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={tabHref(key)}
            data-active={tab === key}
            className={cn(
              "px-3.5 py-2.5 text-[13px] font-medium text-[var(--muted-foreground)]",
              "border-b-2 border-transparent -mb-px",
              "hover:text-[var(--ink-2)] transition-colors no-underline",
              "data-[active=true]:text-[var(--ink)] data-[active=true]:border-[var(--primary)]",
            )}
          >
            {label}
            <span className="ml-1.5 text-[11px] text-[var(--muted-2)] tabular-nums font-normal">
              {counts[key]}
            </span>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bambino</TableHead>
                <TableHead>Attività</TableHead>
                <TableHead>Modalità</TableHead>
                <TableHead className="text-right">Importo / sess.</TableHead>
                <TableHead className="w-[200px]">Avanzamento</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessuna iscrizione corrisponde al filtro.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const i = row.iscrizione;
                  const b = bambinoById.get(i.bambinoId);
                  const a = attivitaById.get(i.attivitaId);
                  const m = modalitaById.get(i.modalitaId);
                  const fullName = b ? `${b.cognome} ${b.nome}`.trim() : "—";
                  const tone =
                    row.stato === "ritardo"
                      ? "danger"
                      : row.stato === "completata"
                        ? "success"
                        : "primary";
                  return (
                    <TableRow key={i.recordId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {b ? <Avatar name={fullName} size="md" /> : null}
                          <Link
                            href={`/iscrizioni/${i.recordId}`}
                            className="font-medium hover:underline"
                          >
                            {fullName}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{a?.nome ?? "—"}</TableCell>
                      <TableCell className="text-[13px] text-[var(--ink-2)]">
                        {m?.nome ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m ? formatEur(m.importo) : "—"}
                      </TableCell>
                      <TableCell>
                        {row.totale === 0 ? (
                          <span className="text-[12px] text-[var(--muted-foreground)]">
                            Nessuna rata
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] tabular-nums w-12 shrink-0">
                              {row.pagati}/{row.totale}
                            </span>
                            <Progress
                              value={row.pagati}
                              max={row.totale}
                              tone={tone}
                              className="flex-1"
                              label={`${row.pagati} rate pagate su ${row.totale}`}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{statoBadge(row.stato)}</TableCell>
                      <TableCell className="text-right">
                        {row.prossimaRata ? <SegnaPagatoDialog mese={row.prossimaRata} /> : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
