import Link from "next/link";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { CalendarCheck, UserCheck, UserX } from "lucide-react";
import { listBambini } from "@/lib/db/bambini";
import { listIscrizioni } from "@/lib/db/iscrizioni";
import { listPresenzeByData } from "@/lib/db/presenze";
import { listAttivita } from "@/lib/db/attivita";
import { listSessioniByAttivita } from "@/lib/db/sessioni";
import { GrigliaPresenze } from "@/components/presenze/griglia-presenze";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { presenzaAssente } from "@/lib/db/types";
import { dowToGiorno, type FasciaOraria } from "@/lib/config";
import type { Sessione } from "@/lib/db/types";

function dataInRange(data: string, sessione: Sessione): boolean {
  if (!sessione.dataInizio || !sessione.dataFine) return false;
  return data >= sessione.dataInizio && data <= sessione.dataFine;
}

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; attivitaId?: string; fascia?: string }>;
}) {
  await requireAdminOrCoordinatore();
  const sp = await searchParams;
  const data = sp.data || new Date().toISOString().slice(0, 10);

  const attivita = await listAttivita({ attivo: true });

  // Default attivitaId: prima doposcuola attiva, fallback prima attività attiva
  const attivitaId =
    sp.attivitaId ||
    attivita.find((a) => a.tipo === "doposcuola")?.recordId ||
    attivita[0]?.recordId ||
    "";

  const attivitaSel = attivita.find((a) => a.recordId === attivitaId);
  const fasceAttivita = attivitaSel?.fasceOrarie ?? [];
  const fasciaSel: FasciaOraria | undefined =
    sp.fascia && fasceAttivita.includes(sp.fascia) ? sp.fascia : undefined;

  const [bambini, iscrizioni, presenze, sessioniAttivita] = await Promise.all([
    listBambini({ soloAttivi: true }),
    attivitaId ? listIscrizioni({ attivitaId }) : Promise.resolve([]),
    listPresenzeByData(data),
    attivitaId ? listSessioniByAttivita(attivitaId) : Promise.resolve([] as Sessione[]),
  ]);

  const sessioniById = new Map(sessioniAttivita.map((s) => [s.recordId, s] as const));
  const giorno = dowToGiorno(new Date(`${data}T00:00:00`).getDay());
  const giorniAttivita = attivitaSel?.giorniSettimana ?? [];
  const candidati = iscrizioni
    .map((iscrizione) => {
      const bambino = bambini.find((b) => b.recordId === iscrizione.bambinoId);
      if (!bambino) return null;

      // Trova la sessione che copre la data scelta
      const sessioniIscrizione = iscrizione.sessioniSelteIds
        .map((id) => sessioniById.get(id))
        .filter((s): s is Sessione => Boolean(s));

      let sessioneAttiva: Sessione | undefined;
      if (attivitaSel?.tipo === "doposcuola") {
        if (!giorniAttivita.includes(giorno)) return null;
        if (!iscrizione.giorniSettimana.includes(giorno)) return null;
        // sessione = quella del mese della data scelta
        const meseData = data.slice(0, 7);
        sessioneAttiva = sessioniIscrizione.find((s) => s.chiave === meseData);
      } else {
        sessioneAttiva = sessioniIscrizione.find((s) => dataInRange(data, s));
      }
      if (!sessioneAttiva) return null;

      return {
        bambino,
        iscrizione,
        sessioneId: sessioneAttiva.recordId,
        sessioneEtichetta: sessioneAttiva.etichetta,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .filter((c) => !fasciaSel || c.iscrizione.fasceOrarie.includes(fasciaSel));

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

      {fasceAttivita.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] text-[var(--muted-foreground)] mr-1">
            Fascia oraria:
          </span>
          {(["", ...fasceAttivita] as const).map((f) => {
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
      ) : null}

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
