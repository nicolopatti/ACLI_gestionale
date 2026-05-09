import Link from "next/link";
import { CalendarCheck, UserCheck, UserX } from "lucide-react";
import { listBambini } from "@/lib/airtable/bambini";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listPresenzeByData } from "@/lib/airtable/presenze";
import { listAttivita } from "@/lib/airtable/attivita";
import { listSessioniByAttivita } from "@/lib/airtable/sessioni";
import { GrigliaPresenze } from "@/components/presenze/griglia-presenze";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { presenzaAssente } from "@/lib/airtable/types";
import { FASCE_ORARIE, type FasciaOraria } from "@/lib/config";
import type { Sessione } from "@/lib/airtable/types";
import { calcolaCandidatiPresenza } from "@/lib/presenze-utils";

function isFascia(v: string | undefined): v is FasciaOraria {
  return Boolean(v) && (FASCE_ORARIE as readonly string[]).includes(v as string);
}

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; attivitaId?: string; fascia?: string }>;
}) {
  const sp = await searchParams;
  const data = sp.data || new Date().toISOString().slice(0, 10);
  const fasciaSel: FasciaOraria | undefined = isFascia(sp.fascia) ? sp.fascia : undefined;

  const attivita = await listAttivita({ attivo: true });

  // Default attivitaId: prima doposcuola attiva, fallback prima attività attiva
  const attivitaId =
    sp.attivitaId ||
    attivita.find((a) => a.tipo === "doposcuola")?.recordId ||
    attivita[0]?.recordId ||
    "";

  const [bambini, iscrizioni, presenze, sessioniAttivita] = await Promise.all([
    listBambini({ soloAttivi: true }),
    attivitaId ? listIscrizioni({ attivitaId }) : Promise.resolve([]),
    listPresenzeByData(data),
    attivitaId ? listSessioniByAttivita(attivitaId) : Promise.resolve([] as Sessione[]),
  ]);

  const candidati = calcolaCandidatiPresenza({
    data,
    iscrizioni,
    bambini,
    attivita,
    sessioni: sessioniAttivita,
  }).filter((c) => !fasciaSel || c.iscrizione.fasceOrarie.includes(fasciaSel));

  // Stats: Totali / Presenti / Assenti
  const presenzeByBambino = new Map(presenze.map((p) => [p.bambinoId, p] as const));
  const totali = candidati.length;
  let presenti = 0;
  let assenti = 0;
  for (const c of candidati) {
    const p = presenzeByBambino.get(c.bambino.recordId);
    if (!p) continue;
    if (presenzaAssente(p)) assenti += 1;
    else presenti += 1;
  }
  const daSegnare = Math.max(0, totali - presenti - assenti);

  function buildHref(next: { fascia?: FasciaOraria | "" }): string {
    const params = new URLSearchParams();
    params.set("data", data);
    if (attivitaId) params.set("attivitaId", attivitaId);
    const f = next.fascia === undefined ? fasciaSel : next.fascia;
    if (f) params.set("fascia", f);
    return `?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Presenze</h1>
        <Button asChild variant="outline">
          <Link href="/presenze/storico">Storico</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Iscritti previsti"
          value={String(totali)}
          icon={<CalendarCheck className="h-4 w-4 text-[var(--info)]" />}
          hint={daSegnare > 0 ? `${daSegnare} da segnare` : "Tutti registrati"}
        />
        <Stat
          label="Presenti"
          value={String(presenti)}
          icon={<UserCheck className="h-4 w-4 text-[var(--success)]" />}
          tone="success"
        />
        <Stat
          label="Assenti"
          value={String(assenti)}
          icon={<UserX className="h-4 w-4 text-[var(--danger)]" />}
          tone="danger"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[12px] text-[var(--muted-foreground)] mr-1">
          Fascia oraria:
        </span>
        {(["", ...FASCE_ORARIE] as const).map((f) => {
          const active = (f === "" && !fasciaSel) || fasciaSel === f;
          return (
            <Link
              key={f || "all"}
              href={buildHref({ fascia: f === "" ? "" : (f as FasciaOraria) })}
              className={
                "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors no-underline " +
                (active
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--border-strong)]")
              }
            >
              {f === "" ? "Tutte" : f}
            </Link>
          );
        })}
      </div>

      <GrigliaPresenze
        data={data}
        attivitaId={attivitaId}
        attivita={attivita}
        candidati={candidati}
        presenzeEsistenti={presenze}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  tone?: "success" | "danger";
}) {
  const valueColor =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[var(--danger)]"
        : "text-[var(--ink)]";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
            {label}
          </span>
          {icon}
        </div>
        <div
          className={`font-serif text-[28px] font-medium tracking-tight tabular-nums mt-1 ${valueColor}`}
        >
          {value}
        </div>
        {hint ? (
          <p className="text-[11.5px] text-[var(--muted-foreground)] mt-1">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
