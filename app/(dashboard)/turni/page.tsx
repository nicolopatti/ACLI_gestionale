import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listEducatori } from "@/lib/airtable/educatori";
import { listDisponibilitaByRange } from "@/lib/airtable/disponibilita";
import { listAttivita } from "@/lib/airtable/attivita";
import { Button } from "@/components/ui/button";
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
import type { FasciaDisponibilita } from "@/lib/config";
import type { Disponibilita } from "@/lib/airtable/types";

const ORE_PER_FASCIA: Record<FasciaDisponibilita, number> = {
  "14-16": 2,
  "16-18": 2,
};

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

function calcolaOre(d: Disponibilita): { pianificate: number; consuntivate: number } {
  const pianificate = ORE_PER_FASCIA[d.fasciaOraria] ?? 0;
  if (!d.oraIngresso || !d.oraUscita) {
    return { pianificate, consuntivate: 0 };
  }
  const [hi, mi] = d.oraIngresso.split(":").map(Number);
  const [hu, mu] = d.oraUscita.split(":").map(Number);
  const diffMin = (hu * 60 + (mu || 0)) - (hi * 60 + (mi || 0));
  return {
    pianificate,
    consuntivate: diffMin > 0 ? diffMin / 60 : 0,
  };
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
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const vista: Vista = isVista(sp.vista) ? sp.vista : "settimana";
  const base = parseIsoOrToday(sp.d);
  const { start, end } = rangeForVista(base, vista);

  const [educatori, disponibilita, attivitaDoposcuola] = await Promise.all([
    listEducatori(),
    listDisponibilitaByRange(isoDate(start), isoDate(end)),
    listAttivita({ tipo: "doposcuola", attivo: true }),
  ]);

  // Empty state: se non c'è alcuna attività doposcuola attiva e nessuna
  // disponibilità nel periodo corrente, la griglia con le fasce orarie
  // sarebbe solo un guscio vuoto. Mostriamo invece una CTA chiara verso
  // /attivita così l'utente capisce che il punto di ingresso è quello,
  // non i turni.
  const showEmptyState =
    attivitaDoposcuola.length === 0 && disponibilita.length === 0;

  const educatoreLight = educatori.map((e) => ({
    recordId: e.recordId,
    nomeCompleto: e.nomeCompleto,
    attivo: e.attivo,
  }));

  const giorni = vista === "settimana" ? daysOfWeek(base) : daysOfMonthGrid(base);

  // Stats periodo
  let orePianificate = 0;
  let oreConsuntivate = 0;
  const educatoriAttivi = new Set<string>();
  for (const d of disponibilita) {
    const { pianificate, consuntivate } = calcolaOre(d);
    orePianificate += pianificate;
    oreConsuntivate += consuntivate;
    educatoriAttivi.add(d.educatoreId);
  }

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
    const { pianificate, consuntivate } = calcolaOre(d);
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

  if (showEmptyState) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Turni</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Pianificazione disponibilità + consuntivo ore
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center text-center gap-3 py-14 px-6">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-soft)] text-[var(--primary-soft-ink)] grid place-items-center">
              <CalendarPlus className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h2 className="font-serif text-[20px] font-medium tracking-tight">
                Nessun turno da pianificare
              </h2>
              <p className="text-[13.5px] text-[var(--muted-foreground)]">
                I turni educatori coprono le fasce orarie del doposcuola. Per
                cominciare, crea prima un&apos;attività di tipo doposcuola.
                Tornerai qui quando sarà ora di pianificare.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/attivita/nuova">Crea un&apos;attività</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
            consuntivato
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border border-dashed border-[var(--primary)]/60" />
            pianificato
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Mini label="Ore pianificate" value={`${orePianificate}h`} />
        <Mini label="Ore consuntivate" value={`${oreConsuntivate.toFixed(1)}h`} />
        <Mini label="Educatori attivi" value={educatoriAttivi.size.toString()} />
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          <TurniGrid
            vista={vista}
            giorni={giorni}
            educatori={educatoreLight}
            disponibilita={disponibilita}
          />
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.06em]">
          {label}
        </div>
        <div className="font-serif text-[28px] font-medium tracking-tight tabular-nums mt-1">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
