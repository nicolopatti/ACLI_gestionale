import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { ChevronLeft, Plus } from "lucide-react";
import { getAttivita } from "@/lib/db/attivita";
import { listIscrizioni } from "@/lib/db/iscrizioni";
import { listBambini } from "@/lib/db/bambini";
import { listMesiByIscrizioneIds } from "@/lib/db/mesi";
import { listModalitaByAttivita } from "@/lib/db/modalita-iscrizione";
import type { Iscrizione, MeseIscrizione } from "@/lib/db/types";
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
  if (r.tipoRiga === "sconto") return false;
  if (!r.chiavePeriodo) return false;
  return r.chiavePeriodo.slice(0, 7) < currentMonth;
}

function derivaStatoIscrizione(
  rate: MeseIscrizione[],
  currentMonth: string,
): StatoIscrizione {
  // Solo le rate "vere" (sessione/pacchetto/quota) entrano nel calcolo stato.
  // Gli sconti sono sempre non_pagato ma negativi: vanno ignorati.
  const ratePagabili = rate.filter((r) => r.tipoRiga !== "sconto");
  if (ratePagabili.length === 0) return "anagrafica";
  const hasRitardo = ratePagabili.some((r) => rataInRitardo(r, currentMonth));
  if (hasRitardo) return "ritardo";
  const tutteCompletate = ratePagabili.every(
    (r) => r.statoPagamento === "pagato",
  );
  if (tutteCompletate) return "completata";
  return "attiva";
}

function prossimaRataNonPagata(rate: MeseIscrizione[]): MeseIscrizione | undefined {
  return rate
    .filter((r) => r.statoPagamento !== "pagato" && r.tipoRiga !== "sconto")
    .sort((a, b) =>
      (a.chiavePeriodo ?? a.descrizioneRiga ?? "").localeCompare(
        b.chiavePeriodo ?? b.descrizioneRiga ?? "",
      ),
    )[0];
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

export default async function IscrizioniByAttivitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminOrCoordinatore();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = isTab(sp.tab) ? sp.tab : "tutte";
  const currentMonth = currentMonthKey();

  const [attivita, iscrizioni, bambini, modalita] = await Promise.all([
    getAttivita(id),
    listIscrizioni({ attivitaId: id }),
    listBambini(),
    listModalitaByAttivita(id),
  ]);
  if (!attivita) notFound();

  const rate =
    iscrizioni.length > 0
      ? await listMesiByIscrizioneIds(iscrizioni.map((i) => i.recordId))
      : [];

  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));
  const modalitaById = new Map(modalita.map((m) => [m.recordId, m] as const));

  const rateByIscrizione = new Map<string, MeseIscrizione[]>();
  for (const r of rate) {
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
    const r = rateByIscrizione.get(i.recordId) ?? [];
    const ratePagabili = r.filter((rr) => rr.tipoRiga !== "sconto");
    const pagati = ratePagabili.filter((rr) => rr.statoPagamento === "pagato").length;
    return {
      iscrizione: i,
      rate: r,
      pagati,
      totale: ratePagabili.length,
      stato: derivaStatoIscrizione(r, currentMonth),
      prossimaRata: prossimaRataNonPagata(r),
    };
  });

  const counts = {
    tutte: rows.length,
    attive: rows.filter((r) => r.stato === "attiva").length,
    ritardo: rows.filter((r) => r.stato === "ritardo").length,
    completate: rows.filter((r) => r.stato === "completata").length,
  };

  // KPI per l'attivita
  const totaleIncassato = rate
    .filter((r) => r.statoPagamento === "pagato")
    .reduce((acc, r) => acc + (r.importoPagato ?? 0), 0);
  const totaleDovuto = rate.reduce((acc, r) => acc + r.importoDovuto, 0);
  const residuoTotale = totaleDovuto - totaleIncassato;

  const filtered = rows
    .filter((r) => {
      if (tab === "tutte") return true;
      if (tab === "attive") return r.stato === "attiva";
      if (tab === "ritardo") return r.stato === "ritardo";
      if (tab === "completate") return r.stato === "completata";
      return true;
    })
    .sort((a, b) => {
      const order: Record<StatoIscrizione, number> = {
        ritardo: 0,
        attiva: 1,
        anagrafica: 2,
        completata: 3,
      };
      const o = order[a.stato] - order[b.stato];
      if (o !== 0) return o;
      return (b.iscrizione.dataIscrizione ?? "").localeCompare(
        a.iscrizione.dataIscrizione ?? "",
      );
    });

  function tabHref(t: Tab): string {
    const base = `/iscrizioni/attivita/${id}`;
    return t === "tutte" ? base : `${base}?tab=${t}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/iscrizioni"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)]"
        >
          <ChevronLeft className="h-4 w-4" /> Tutte le attività
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Iscrizioni · {attivita.nome}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-[var(--muted-foreground)]">
            <Badge variant="outline">{attivita.tipo}</Badge>
            {attivita.quotaIscrizione != null && (
              <span>Quota {formatEur(attivita.quotaIscrizione)}</span>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/iscrizioni/nuova`}>
            <Plus className="h-4 w-4" /> Nuova iscrizione
          </Link>
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard label="Iscritti" value={String(rows.length)} highlight />
        <KpiCard label="Totale incassato" value={formatEur(totaleIncassato)} />
        <KpiCard
          label="Residuo da incassare"
          value={formatEur(residuoTotale)}
          danger={residuoTotale > 0}
        />
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
                <TableHead>Modalità</TableHead>
                <TableHead className="text-right">Importo modalità</TableHead>
                <TableHead className="w-[200px]">Avanzamento</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-[var(--muted-foreground)] py-8"
                  >
                    {iscrizioni.length === 0
                      ? "Nessuna iscrizione su questa attività."
                      : "Nessuna iscrizione corrisponde al filtro."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const i = row.iscrizione;
                  const b = bambinoById.get(i.bambinoId);
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
                      <TableCell className="text-[13px] text-[var(--ink-2)]">
                        {m?.nome ?? "—"}
                        {m?.tipoPrezzo === "flat" && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            pacchetto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m ? formatEur(m.importo) : "—"}
                        {m && (
                          <span className="text-xs text-[var(--muted-foreground)] ml-1">
                            {m.tipoPrezzo === "flat" ? "tot." : "/sess."}
                          </span>
                        )}
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
                        {row.prossimaRata ? (
                          <SegnaPagatoDialog mese={row.prossimaRata} />
                        ) : null}
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

function KpiCard({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            highlight && "text-[var(--primary)]",
            danger && "text-amber-700",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
