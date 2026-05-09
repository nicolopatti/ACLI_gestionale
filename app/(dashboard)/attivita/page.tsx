import Link from "next/link";
import {
  ChevronRight,
  Drama,
  GraduationCap,
  Plus,
  Train,
  type LucideIcon,
} from "lucide-react";
import { listAttivita } from "@/lib/airtable/attivita";
import { listSessioni } from "@/lib/airtable/sessioni";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listAllMesi } from "@/lib/airtable/mesi";
import type { Sessione } from "@/lib/airtable/types";
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
import { Progress } from "@/components/ui/progress";
import { cn, formatDate, formatEur } from "@/lib/utils";
import type { TipoAttivita } from "@/lib/config";

const ICON_BY_TIPO: Record<TipoAttivita, LucideIcon> = {
  doposcuola: GraduationCap,
  laboratorio: Drama,
  locomotiva: Train,
};

const TONE_BY_TIPO: Record<TipoAttivita, { bg: string; ink: string }> = {
  doposcuola: { bg: "bg-[var(--primary-soft)]", ink: "text-[var(--primary-soft-ink)]" },
  laboratorio: { bg: "bg-[var(--accent-soft)]", ink: "text-[var(--accent-soft-ink)]" },
  locomotiva: { bg: "bg-[var(--info-soft)]", ink: "text-[var(--info-soft-ink)]" },
};

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthBounds(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function sessioneInMese(s: Sessione, monthKey: string): boolean {
  if (s.dataInizio && s.dataFine) {
    const { start, end } = monthBounds(monthKey);
    return s.dataInizio <= end && s.dataFine >= start;
  }
  return s.chiave.startsWith(monthKey);
}

function periodoLabel(s: Sessione): string {
  if (s.dataInizio && s.dataFine) {
    return `${formatDate(s.dataInizio)} → ${formatDate(s.dataFine)}`;
  }
  return s.etichetta || s.chiave || "—";
}

export default async function AttivitaPage() {
  const monthKey = currentMonthKey();

  const [attivita, sessioni, iscrizioni, allRate] = await Promise.all([
    listAttivita(),
    listSessioni(),
    listIscrizioni(),
    listAllMesi(),
  ]);

  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));

  const iscrittiPerSessione = new Map<string, number>();
  for (const i of iscrizioni) {
    for (const sId of i.sessioniSelteIds) {
      iscrittiPerSessione.set(sId, (iscrittiPerSessione.get(sId) ?? 0) + 1);
    }
  }

  const ratePerSessione = new Map<string, { pagati: number; totale: number; importoMedio: number; importoSum: number }>();
  for (const r of allRate) {
    if (!r.sessioneId) continue;
    const cur = ratePerSessione.get(r.sessioneId) ?? {
      pagati: 0,
      totale: 0,
      importoMedio: 0,
      importoSum: 0,
    };
    cur.totale += 1;
    if (r.statoPagamento === "pagato") cur.pagati += 1;
    cur.importoSum += r.importoDovuto ?? 0;
    ratePerSessione.set(r.sessioneId, cur);
  }
  for (const [, agg] of ratePerSessione) {
    agg.importoMedio = agg.totale > 0 ? agg.importoSum / agg.totale : 0;
  }

  const sessioniDelMese = sessioni
    .filter((s) => sessioneInMese(s, monthKey))
    .sort((a, b) => (a.dataInizio ?? a.chiave).localeCompare(b.dataInizio ?? b.chiave));

  // Conta iscrizioni totali per attivita (linked, non solo per sessione)
  const iscrizioniPerAttivita = new Map<string, number>();
  for (const i of iscrizioni) {
    iscrizioniPerAttivita.set(i.attivitaId, (iscrizioniPerAttivita.get(i.attivitaId) ?? 0) + 1);
  }

  const monthLabel = new Date().toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attività</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Doposcuola, laboratori e centri estivi
          </p>
        </div>
        <Button asChild>
          <Link href="/attivita/nuova">
            <Plus className="h-4 w-4" /> Nuova
          </Link>
        </Button>
      </div>

      {attivita.length === 0 ? (
        <Card>
          <CardContent className="text-center text-[var(--muted-foreground)] py-12">
            Nessuna attività configurata.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">
          {attivita.map((a) => {
            const Icon = ICON_BY_TIPO[a.tipo];
            const tone = TONE_BY_TIPO[a.tipo];
            const iscritti = iscrizioniPerAttivita.get(a.recordId) ?? 0;
            return (
              <Card key={a.recordId}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3.5 mb-4">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-[10px] grid place-items-center shrink-0",
                        tone.bg,
                        tone.ink,
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-serif text-[18px] font-medium tracking-tight truncate">
                          {a.nome}
                        </h3>
                        {a.attivo ? (
                          <Badge variant="success">Attiva</Badge>
                        ) : (
                          <Badge variant="outline">Sospesa</Badge>
                        )}
                      </div>
                      <div className="text-[12.5px] text-[var(--muted-foreground)] capitalize">
                        {a.tipo}
                        {a.dataInizio || a.dataFine
                          ? ` · ${formatDate(a.dataInizio)} → ${formatDate(a.dataFine)}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    <Mini label="Modalità" value={a.modalitaIds.length} />
                    <Mini label="Sessioni" value={a.sessioniIds.length} />
                    <Mini label="Iscritti" value={iscritti} highlight />
                  </div>

                  <div className="flex items-center justify-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/attivita/${a.recordId}`}>
                        Apri <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-[18px] font-medium tracking-tight">
            Sessioni del mese
            <span className="text-[var(--muted-foreground)] font-normal ml-2 capitalize">
              · {monthLabel}
            </span>
          </h2>
          <span className="text-[12px] text-[var(--muted-foreground)] tabular-nums">
            {sessioniDelMese.length} sessioni
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attività</TableHead>
                  <TableHead>Sessione</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Iscritti</TableHead>
                  <TableHead className="text-right">Importo medio</TableHead>
                  <TableHead className="w-[200px] text-right">Pagamenti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessioniDelMese.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-[var(--muted-foreground)] py-8"
                    >
                      Nessuna sessione attiva nel mese corrente.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessioniDelMese.map((s) => {
                    const a = attivitaById.get(s.attivitaId);
                    const iscritti = iscrittiPerSessione.get(s.recordId) ?? 0;
                    const pagAgg = ratePerSessione.get(s.recordId);
                    const pagati = pagAgg?.pagati ?? 0;
                    const totale = pagAgg?.totale ?? 0;
                    return (
                      <TableRow key={s.recordId}>
                        <TableCell>
                          {a ? (
                            <Link
                              href={`/attivita/${a.recordId}`}
                              className="hover:underline text-[13px]"
                            >
                              {a.nome}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="font-medium uppercase text-[12.5px] tracking-wide tabular-nums">
                          {s.etichetta || s.chiave}
                        </TableCell>
                        <TableCell className="text-[12.5px] text-[var(--muted-foreground)] whitespace-nowrap">
                          {periodoLabel(s)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{iscritti}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {pagAgg && pagAgg.importoMedio > 0
                            ? formatEur(pagAgg.importoMedio)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {totale === 0 ? (
                            <span className="text-[12px] text-[var(--muted-foreground)]">—</span>
                          ) : (
                            <div className="flex items-center gap-2 justify-end">
                              <Progress
                                value={pagati}
                                max={totale}
                                tone={pagati === totale ? "success" : "primary"}
                                className="w-20"
                                label={`${pagati} pagamenti su ${totale}`}
                              />
                              <span className="text-[12px] tabular-nums w-12 text-right">
                                {pagati}/{totale}
                              </span>
                            </div>
                          )}
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
    </div>
  );
}

function Mini({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
      <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.06em] mb-0.5">
        {label}
      </div>
      <div
        className={cn(
          "font-serif text-[22px] tabular-nums tracking-tight",
          highlight ? "text-[var(--primary)]" : "text-[var(--ink)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

