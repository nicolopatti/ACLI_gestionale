import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listEducatori } from "@/lib/db/educatori";
import { listDisponibilitaByRange } from "@/lib/db/disponibilita";
import { listSessioniByRange } from "@/lib/db/sessioni";
import {
  listAttivitaAttiveInRange,
  unionFasceOfferte,
  unionGiorniOfferti,
  calcolaCelleAttive,
} from "@/lib/db/turni";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TurniGrid } from "@/components/turni/turni-grid";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { durataFasciaOre } from "@/lib/config";
import type { Disponibilita } from "@/lib/db/types";

type Vista = "settimana" | "mese";

function isVista(v: string | undefined): v is Vista {
  return v === "settimana" || v === "mese";
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIsoOrToday(s: string | undefined): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  const offset = (dow + 6) % 7; // Mon=0
  out.setDate(out.getDate() - offset);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function daysOfWeek(base: Date) {
  const start = startOfWeek(base);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return {
      data: isoDate(d),
      numero: d.getDate(),
      dow: d.getDay(),
      inMese: true,
    };
  });
}

function daysOfMonthGrid(base: Date) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const start = startOfWeek(first);
  const last = new Date(y, m + 1, 0);
  const end = startOfWeek(last);
  end.setDate(end.getDate() + 7);
  const out: { data: string; numero: number; dow: number; inMese: boolean }[] = [];
  let cur = start;
  while (cur < end) {
    out.push({
      data: isoDate(cur),
      numero: cur.getDate(),
      dow: cur.getDay(),
      inMese: cur.getMonth() === m,
    });
    cur = addDays(cur, 1);
  }
  return out;
}

function rangeForVista(base: Date, vista: Vista): { start: Date; end: Date } {
  if (vista === "settimana") {
    const start = startOfWeek(base);
    return { start, end: addDays(start, 6) };
  }
  const start = startOfWeek(new Date(base.getFullYear(), base.getMonth(), 1));
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const end = startOfWeek(lastDay);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function shiftPeriod(base: Date, vista: Vista, delta: number): Date {
  const out = new Date(base);
  if (vista === "settimana") {
    out.setDate(out.getDate() + delta * 7);
  } else {
    out.setMonth(out.getMonth() + delta);
  }
  return out;
}

function periodoLabel(base: Date, vista: Vista): string {
  if (vista === "settimana") {
    const start = startOfWeek(base);
    const end = addDays(start, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  }
  return base.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function calcolaOre(
  d: Disponibilita,
  todayIso: string,
): { pianificate: number; consuntivate: number } {
  const pianificate = durataFasciaOre(d.fasciaOraria);
  // Le ore consuntivate vengono accumulate automaticamente quando la giornata
  // è già passata (la fascia è considerata svolta in pieno).
  const consuntivate = d.data < todayIso ? pianificate : 0;
  return { pianificate, consuntivate };
}

export default async function TurniPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; d?: string }>;
}) {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (!ruolo) redirect("/login");
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    redirect("/attivita");
  }

  const sp = await searchParams;
  const vista: Vista = isVista(sp.vista) ? sp.vista : "settimana";
  const base = parseIsoOrToday(sp.d);
  const { start, end } = rangeForVista(base, vista);
  const startIso = isoDate(start);
  const endIso = isoDate(end);

  const [educatori, disponibilita, attiveInRange, sessioniInRange] = await Promise.all([
    listEducatori(),
    listDisponibilitaByRange(startIso, endIso),
    listAttivitaAttiveInRange(startIso, endIso),
    listSessioniByRange(startIso, endIso),
  ]);

  const educatoreLight = educatori.map((e) => ({
    recordId: e.recordId,
    nomeCompleto: e.nomeCompleto,
    attivo: e.attivo,
  }));

  const giorni = vista === "settimana" ? daysOfWeek(base) : daysOfMonthGrid(base);
  const fasceOfferte = unionFasceOfferte(attiveInRange);
  const giorniOfferti = unionGiorniOfferti(attiveInRange);
  const celleAttive = calcolaCelleAttive(attiveInRange, sessioniInRange, startIso, endIso);

  // Empty state quando non c'è alcuna attività attiva nel periodo
  const noAttiveAttivita = attiveInRange.length === 0 || fasceOfferte.length === 0;

  const todayIso = isoDate(new Date());

  // Aggregato per educatore (tabella secondaria)
  const perEducatore = new Map<
    string,
    { giorni: Set<string>; ore: number; oreConsuntivate: number; turni: number }
  >();
  for (const d of disponibilita) {
    const cur = perEducatore.get(d.educatoreId) ?? {
      giorni: new Set<string>(),
      ore: 0,
      oreConsuntivate: 0,
      turni: 0,
    };
    cur.giorni.add(d.data);
    const { pianificate, consuntivate } = calcolaOre(d, todayIso);
    cur.ore += pianificate;
    cur.oreConsuntivate += consuntivate;
    cur.turni += 1;
    perEducatore.set(d.educatoreId, cur);
  }

  const summary = educatori
    .map((e) => {
      const stats = perEducatore.get(e.recordId);
      return {
        educatore: e,
        giorni: stats?.giorni.size ?? 0,
        ore: stats?.ore ?? 0,
        oreConsuntivate: stats?.oreConsuntivate ?? 0,
        turni: stats?.turni ?? 0,
      };
    })
    .filter((r) => r.turni > 0 || r.educatore.attivo)
    .sort((a, b) => b.ore - a.ore || a.educatore.cognome.localeCompare(b.educatore.cognome, "it"));

  function buildHref({ vista: nv, d }: { vista?: Vista; d?: string }): string {
    const next = new URLSearchParams();
    if (nv && nv !== "settimana") next.set("vista", nv);
    if (d) next.set("d", d);
    return `?${next.toString()}` || "/turni";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Turni</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Pianificazione disponibilità + consuntivo ore
          </p>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
          {(["settimana", "mese"] as const).map((v) => (
            <Link
              key={v}
              href={buildHref({ vista: v, d: isoDate(base) })}
              className={cn(
                "px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-colors capitalize no-underline",
                vista === v
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--ink-2)]",
              )}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Link
            href={buildHref({ vista, d: isoDate(shiftPeriod(base, vista, -1)) })}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)]"
            aria-label="Periodo precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href={buildHref({ vista, d: isoDate(new Date()) })}
            className="px-3 h-8 inline-flex items-center text-[12.5px] rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)] no-underline"
          >
            Oggi
          </Link>
          <Link
            href={buildHref({ vista, d: isoDate(shiftPeriod(base, vista, 1)) })}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)]"
            aria-label="Periodo successivo"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="ml-2 font-serif text-[16px] capitalize">
            {periodoLabel(base, vista)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[var(--primary-soft)]" />
            consuntivato (giornata passata)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border border-dashed border-[var(--primary)]/60" />
            pianificato
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          {noAttiveAttivita ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
                <Calendar className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--ink)]">
                  Nessuna attività attiva nel periodo
                </p>
                <p className="text-[13px] text-[var(--muted-foreground)] mt-1 max-w-md">
                  Non si possono pianificare turni finché non ci sono attività
                  con fasce orarie e giorni dichiarati. Crea o riattiva
                  un&apos;attività per iniziare.
                </p>
              </div>
              <Link
                href="/attivita/nuova"
                className="inline-flex items-center px-4 h-9 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-[13px] font-medium hover:bg-[var(--primary)]/90 no-underline"
              >
                Crea attività
              </Link>
            </div>
          ) : (
            <TurniGrid
              vista={vista}
              giorni={giorni}
              educatori={educatoreLight}
              disponibilita={disponibilita}
              fasceOfferte={fasceOfferte}
              giorniOfferti={giorniOfferti}
              celleAttive={celleAttive}
              todayIso={todayIso}
            />
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-[18px] font-medium tracking-tight">
            Riepilogo per educatore
          </h2>
          <span className="text-[12px] text-[var(--muted-foreground)] capitalize">
            {periodoLabel(base, vista)}
          </span>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Educatore</TableHead>
                  <TableHead className="text-right">Turni</TableHead>
                  <TableHead className="text-right">Giorni</TableHead>
                  <TableHead className="text-right">Ore pianificate</TableHead>
                  <TableHead className="text-right">Ore consuntivate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-[var(--muted-foreground)] py-8"
                    >
                      Nessun educatore con turni o attivo nel periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.map((r) => (
                    <TableRow key={r.educatore.recordId}>
                      <TableCell>
                        <Link
                          href={`/educatori?id=${r.educatore.recordId}`}
                          className="flex items-center gap-2.5 hover:underline"
                        >
                          <Avatar name={r.educatore.nomeCompleto} size="md" />
                          <span className="font-medium">
                            {r.educatore.nomeCompleto}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.turni}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.giorni}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.ore}h
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.oreConsuntivate > 0 ? `${r.oreConsuntivate.toFixed(1)}h` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

