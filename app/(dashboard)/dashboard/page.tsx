import Link from "next/link";
import {
  AlertCircle,
  Baby,
  CalendarCheck,
  CalendarClock,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { listBambini } from "@/lib/airtable/bambini";
import { listMovimenti } from "@/lib/airtable/movimenti";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listAttivita } from "@/lib/airtable/attivita";
import { listAllMesi } from "@/lib/airtable/mesi";
import { listPresenzeByData } from "@/lib/airtable/presenze";
import { listSessioni } from "@/lib/airtable/sessioni";
import { listEducatori } from "@/lib/airtable/educatori";
import { listDisponibilitaByRange } from "@/lib/airtable/disponibilita";
import { presenzaAssente } from "@/lib/airtable/types";
import type { MeseIscrizione, Movimento } from "@/lib/airtable/types";
import { meseAnnoSCorrenteLabel } from "@/lib/utils-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatEur } from "@/lib/utils";
import type { FasciaDisponibilita } from "@/lib/config";
import { MEZZI_PAGAMENTO } from "@/lib/config";

const ORE_PER_FASCIA: Record<FasciaDisponibilita, number> = {
  "14-16": 2,
  "16-18": 2,
};

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoStartOfWeek(): string {
  const d = new Date();
  const dow = d.getDay();
  const offset = (dow + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function isoEndOfWeek(): string {
  const d = new Date();
  const dow = d.getDay();
  const offset = (dow + 6) % 7;
  d.setDate(d.getDate() - offset + 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function meseAnnoCorrente(): string {
  return new Date().toISOString().slice(0, 7);
}

function rataInRitardo(r: MeseIscrizione, currentMonth: string): boolean {
  if (r.statoPagamento === "pagato") return false;
  if (!r.chiavePeriodo) return false;
  return r.chiavePeriodo.slice(0, 7) < currentMonth;
}

export default async function DashboardHomePage() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  const isAdmin = ruolo === "admin";
  const isCoord = ruolo === "coordinatore_educativo";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-serif">
          Ciao {session?.user?.nome ?? ""}
        </h1>
        <p className="text-[13px] text-[var(--muted-foreground)] capitalize mt-0.5">
          {isAdmin
            ? "Cruscotto direttivo"
            : isCoord
              ? "Cruscotto educativo"
              : "Cruscotto"}{" "}
          · {meseAnnoSCorrenteLabel()}
        </p>
      </div>

      {isAdmin ? <AdminBlock /> : null}
      {isCoord ? <EduBlock /> : null}
    </div>
  );
}

async function AdminBlock() {
  const currentMonth = meseAnnoCorrente();

  const [bambini, movimenti, iscrizioni, allRate, attivita] = await Promise.all([
    listBambini({ soloAttivi: true }),
    listMovimenti({ limit: 1000 }),
    listIscrizioni(),
    listAllMesi(),
    listAttivita(),
  ]);

  const totali = aggregaPerConto(movimenti);
  const saldoTotale = MEZZI_PAGAMENTO.reduce((s, k) => s + totali[k].saldo, 0);

  const movimentiMese = movimenti.filter(
    (m) => m.dataMovimento && m.dataMovimento.startsWith(currentMonth),
  );
  const entrateMese = movimentiMese
    .filter((m) => m.tipo === "Entrata")
    .reduce((s, m) => s + m.importo, 0);
  const usciteMese = movimentiMese
    .filter((m) => m.tipo === "Uscita")
    .reduce((s, m) => s + m.importo, 0);

  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));
  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));

  // Iscrizioni con rate in ritardo
  const ritardiPerIscrizione = new Map<
    string,
    { rate: MeseIscrizione[]; importoRitardo: number }
  >();
  for (const r of allRate) {
    if (!rataInRitardo(r, currentMonth)) continue;
    const cur = ritardiPerIscrizione.get(r.iscrizioneId) ?? {
      rate: [],
      importoRitardo: 0,
    };
    cur.rate.push(r);
    cur.importoRitardo += Math.max(0, (r.importoDovuto ?? 0) - (r.importoPagato ?? 0));
    ritardiPerIscrizione.set(r.iscrizioneId, cur);
  }
  const iscrizioniInRitardo = Array.from(ritardiPerIscrizione.entries())
    .map(([iscrizioneId, agg]) => {
      const i = iscrizioni.find((x) => x.recordId === iscrizioneId);
      const bambino = i ? bambinoById.get(i.bambinoId) : undefined;
      const att = i ? attivitaById.get(i.attivitaId) : undefined;
      return { iscrizioneId, bambino, attivita: att, ...agg };
    })
    .filter((x) => Boolean(x.bambino))
    .sort((a, b) => b.importoRitardo - a.importoRitardo)
    .slice(0, 5);

  const ultimiMovimenti = movimenti.slice(0, 5);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Saldo totale"
          value={formatEur(saldoTotale)}
          icon={<Wallet className="h-4 w-4" />}
          highlight
        />
        <Stat
          label="Entrate del mese"
          value={formatEur(entrateMese)}
          icon={<TrendingUp className="h-4 w-4 text-[var(--success)]" />}
          hint={`${movimentiMese.filter((m) => m.tipo === "Entrata").length} movimenti`}
        />
        <Stat
          label="Uscite del mese"
          value={formatEur(usciteMese)}
          icon={<TrendingDown className="h-4 w-4 text-[var(--danger)]" />}
          hint={`${movimentiMese.filter((m) => m.tipo === "Uscita").length} movimenti`}
        />
        <Stat
          label="Iscrizioni in ritardo"
          value={String(iscrizioniInRitardo.length)}
          icon={<AlertCircle className="h-4 w-4 text-[var(--danger)]" />}
          hint={
            iscrizioniInRitardo.length > 0
              ? `Tot. ${formatEur(
                  iscrizioniInRitardo.reduce((s, r) => s + r.importoRitardo, 0),
                )}`
              : "Tutto in regola"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHead
            title="Ultimi movimenti"
            cta={{ href: "/cassa", label: "Vedi tutti" }}
          />
          <CardContent className="p-0">
            {ultimiMovimenti.length === 0 ? (
              <p className="text-[13px] text-[var(--muted-foreground)] px-5 py-5">
                Nessun movimento.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {ultimiMovimenti.map((m) => (
                  <li key={m.recordId} className="px-5 py-3 flex items-center gap-3">
                    {m.tipo === "Entrata" ? (
                      <Badge variant="success">Entrata</Badge>
                    ) : (
                      <Badge variant="warning">Uscita</Badge>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">{m.descrizione ?? "—"}</div>
                      <div className="text-[11.5px] text-[var(--muted-foreground)]">
                        {formatDate(m.dataMovimento)} · {m.conto}
                      </div>
                    </div>
                    <span
                      className={
                        "font-mono tabular-nums text-[13px] font-semibold " +
                        (m.tipo === "Entrata"
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]")
                      }
                    >
                      {m.tipo === "Uscita" ? "−" : "+"} {formatEur(m.importo)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <SectionHead
            title="Iscrizioni in ritardo"
            cta={{ href: "/iscrizioni?tab=ritardo", label: "Tutte" }}
          />
          <CardContent className="p-0">
            {iscrizioniInRitardo.length === 0 ? (
              <p className="text-[13px] text-[var(--muted-foreground)] px-5 py-5">
                Nessuna iscrizione in ritardo. 🎉
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {iscrizioniInRitardo.map((r) => {
                  const fullName = r.bambino
                    ? `${r.bambino.cognome} ${r.bambino.nome}`
                    : "—";
                  return (
                    <li
                      key={r.iscrizioneId}
                      className="px-5 py-3 flex items-center gap-3"
                    >
                      <Avatar name={fullName} size="md" />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/iscrizioni/${r.iscrizioneId}`}
                          className="text-[13px] font-medium hover:underline truncate block"
                        >
                          {fullName}
                        </Link>
                        <div className="text-[11.5px] text-[var(--muted-foreground)]">
                          {r.attivita?.nome ?? "—"} · {r.rate.length} rate non pagate
                        </div>
                      </div>
                      <Badge variant="destructive">{formatEur(r.importoRitardo)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

async function EduBlock() {
  const today = isoToday();
  const startWeek = isoStartOfWeek();
  const endWeek = isoEndOfWeek();
  const currentMonth = meseAnnoCorrente();

  const [
    bambini,
    iscrizioni,
    attivita,
    allRate,
    presenzeOggi,
    sessioni,
    educatori,
    dispWeek,
  ] = await Promise.all([
    listBambini({ soloAttivi: true }),
    listIscrizioni(),
    listAttivita(),
    listAllMesi(),
    listPresenzeByData(today),
    listSessioni(),
    listEducatori(),
    listDisponibilitaByRange(startWeek, endWeek),
  ]);

  const bambinoById = new Map(bambini.map((b) => [b.recordId, b] as const));
  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));
  const sessioniById = new Map(sessioni.map((s) => [s.recordId, s] as const));
  const educatoriById = new Map(educatori.map((e) => [e.recordId, e] as const));

  // Presenze oggi (solo presenti)
  const presentiOggi = presenzeOggi
    .filter((p) => !presenzaAssente(p))
    .sort((a, b) => (a.oraIngresso ?? "").localeCompare(b.oraIngresso ?? ""))
    .slice(0, 8);

  // Iscrizioni in ritardo
  const ritardiPerIscrizione = new Map<
    string,
    { rate: MeseIscrizione[]; importoRitardo: number }
  >();
  for (const r of allRate) {
    if (!rataInRitardo(r, currentMonth)) continue;
    const cur = ritardiPerIscrizione.get(r.iscrizioneId) ?? {
      rate: [],
      importoRitardo: 0,
    };
    cur.rate.push(r);
    cur.importoRitardo += Math.max(0, (r.importoDovuto ?? 0) - (r.importoPagato ?? 0));
    ritardiPerIscrizione.set(r.iscrizioneId, cur);
  }
  const iscrizioniInRitardo = Array.from(ritardiPerIscrizione.entries())
    .map(([iscrizioneId, agg]) => {
      const i = iscrizioni.find((x) => x.recordId === iscrizioneId);
      const bambino = i ? bambinoById.get(i.bambinoId) : undefined;
      const att = i ? attivitaById.get(i.attivitaId) : undefined;
      return { iscrizioneId, bambino, attivita: att, ...agg };
    })
    .filter((x) => Boolean(x.bambino))
    .sort((a, b) => b.importoRitardo - a.importoRitardo)
    .slice(0, 5);

  // Turni della settimana
  const oreSettimanaPianificate = dispWeek.reduce(
    (s, d) => s + (ORE_PER_FASCIA[d.fasciaOraria] ?? 0),
    0,
  );
  const educatoriSettimana = new Set(dispWeek.map((d) => d.educatoreId));

  // Mesi non pagati del corrente (count totale)
  const mesiAperti = allRate.filter(
    (r) => r.statoPagamento !== "pagato" && r.chiavePeriodo?.slice(0, 7) === currentMonth,
  ).length;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Bambini attivi"
          value={String(bambini.length)}
          icon={<Baby className="h-4 w-4" />}
        />
        <Stat
          label="Presenze oggi"
          value={String(presentiOggi.length)}
          icon={<CalendarCheck className="h-4 w-4 text-[var(--info)]" />}
          hint={`${presenzeOggi.filter(presenzaAssente).length} assenti`}
        />
        <Stat
          label="Mesi non pagati"
          value={String(mesiAperti)}
          icon={<GraduationCap className="h-4 w-4 text-[var(--accent-solid)]" />}
          hint={
            iscrizioniInRitardo.length > 0
              ? `${iscrizioniInRitardo.length} iscrizioni in ritardo`
              : "del mese in corso"
          }
        />
        <Stat
          label="Turni settimana"
          value={`${oreSettimanaPianificate}h`}
          icon={<CalendarClock className="h-4 w-4 text-[var(--primary)]" />}
          hint={`${educatoriSettimana.size} educatori in turno`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHead
            title="Presenze di oggi"
            cta={{ href: "/presenze", label: "Apri" }}
          />
          <CardContent className="p-0">
            {presentiOggi.length === 0 ? (
              <p className="text-[13px] text-[var(--muted-foreground)] px-5 py-5">
                Nessuna presenza registrata oggi.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {presentiOggi.map((p) => {
                  const b = bambinoById.get(p.bambinoId);
                  const s = p.sessioneId ? sessioniById.get(p.sessioneId) : undefined;
                  const a = s ? attivitaById.get(s.attivitaId) : undefined;
                  const fullName = b ? `${b.cognome} ${b.nome}` : "—";
                  return (
                    <li key={p.recordId} className="px-5 py-3 flex items-center gap-3">
                      <Avatar name={fullName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{fullName}</div>
                        <div className="text-[11.5px] text-[var(--muted-foreground)] truncate">
                          {a?.nome ?? "—"}
                        </div>
                      </div>
                      <span className="font-mono text-[12.5px] tabular-nums text-[var(--ink-2)]">
                        {p.oraIngresso ?? "—"}
                        {p.oraUscita ? ` → ${p.oraUscita}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <SectionHead
            title="Iscrizioni in ritardo"
            cta={{ href: "/iscrizioni?tab=ritardo", label: "Tutte" }}
          />
          <CardContent className="p-0">
            {iscrizioniInRitardo.length === 0 ? (
              <p className="text-[13px] text-[var(--muted-foreground)] px-5 py-5">
                Nessuna iscrizione in ritardo. 🎉
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {iscrizioniInRitardo.map((r) => {
                  const fullName = r.bambino
                    ? `${r.bambino.cognome} ${r.bambino.nome}`
                    : "—";
                  return (
                    <li
                      key={r.iscrizioneId}
                      className="px-5 py-3 flex items-center gap-3"
                    >
                      <Avatar name={fullName} size="md" />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/iscrizioni/${r.iscrizioneId}`}
                          className="text-[13px] font-medium hover:underline truncate block"
                        >
                          {fullName}
                        </Link>
                        <div className="text-[11.5px] text-[var(--muted-foreground)]">
                          {r.attivita?.nome ?? "—"} · {r.rate.length} rate
                        </div>
                      </div>
                      <Badge variant="destructive">{formatEur(r.importoRitardo)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <SectionHead
          title="Turni della settimana"
          cta={{ href: "/turni", label: "Apri planning" }}
        />
        <CardContent className="px-5 pb-5">
          {dispWeek.length === 0 ? (
            <p className="text-[13px] text-[var(--muted-foreground)] py-3">
              Nessun turno pianificato questa settimana.
            </p>
          ) : (
            <RiepilogoTurniSettimana
              dispWeek={dispWeek}
              educatoriById={educatoriById}
              startWeek={startWeek}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RiepilogoTurniSettimana({
  dispWeek,
  educatoriById,
  startWeek,
}: {
  dispWeek: import("@/lib/airtable/types").Disponibilita[];
  educatoriById: Map<string, import("@/lib/airtable/types").Educatore>;
  startWeek: string;
}) {
  const start = new Date(`${startWeek}T00:00:00`);
  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      data: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
      }),
    };
  });

  const perGiorno = new Map<
    string,
    { educatoriIds: Set<string>; ore: number; consuntivo: number }
  >();
  for (const d of dispWeek) {
    const cur = perGiorno.get(d.data) ?? {
      educatoriIds: new Set<string>(),
      ore: 0,
      consuntivo: 0,
    };
    cur.educatoriIds.add(d.educatoreId);
    cur.ore += ORE_PER_FASCIA[d.fasciaOraria] ?? 0;
    if (d.oraIngresso) cur.consuntivo += 1;
    perGiorno.set(d.data, cur);
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {giorni.map((g) => {
        const stats = perGiorno.get(g.data);
        const eduIds = stats ? Array.from(stats.educatoriIds).slice(0, 3) : [];
        return (
          <div
            key={g.data}
            className="border border-[var(--border)] rounded-md p-2.5 min-h-[90px]"
          >
            <div className="text-[11px] text-[var(--muted-foreground)] capitalize mb-1.5">
              {g.label}
            </div>
            {stats ? (
              <>
                <div className="text-[15px] font-medium tabular-nums">
                  {stats.ore}
                  <span className="text-[10.5px] text-[var(--muted-2)] ml-0.5">h</span>
                </div>
                <div className="flex -space-x-1.5 mt-1.5">
                  {eduIds.map((id) => {
                    const ed = educatoriById.get(id);
                    return (
                      <Avatar
                        key={id}
                        name={ed?.nomeCompleto ?? "??"}
                        size="sm"
                        className="border-2 border-[var(--surface)]"
                      />
                    );
                  })}
                  {stats.educatoriIds.size > 3 ? (
                    <span className="text-[10px] text-[var(--muted-foreground)] self-center pl-2">
                      +{stats.educatoriIds.size - 3}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-[var(--muted-2)]">—</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function aggregaPerConto(movimenti: Movimento[]) {
  type Tot = { entrate: number; uscite: number; saldo: number };
  const tot: Record<string, Tot> = {
    Cassa: { entrate: 0, uscite: 0, saldo: 0 },
    BCC: { entrate: 0, uscite: 0, saldo: 0 },
    Sumup: { entrate: 0, uscite: 0, saldo: 0 },
  };
  for (const m of movimenti) {
    if (m.tipo === "Entrata") tot[m.conto].entrate += m.importo;
    else tot[m.conto].uscite += m.importo;
  }
  for (const k of MEZZI_PAGAMENTO) tot[k].saldo = tot[k].entrate - tot[k].uscite;
  return tot as Record<(typeof MEZZI_PAGAMENTO)[number], Tot>;
}

function Stat({
  label,
  value,
  hint,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      className={
        highlight
          ? "bg-[var(--primary-soft)] border-[var(--primary-soft-ink)]/20"
          : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span
            className={
              highlight
                ? "text-[10.5px] uppercase tracking-[0.06em] text-[var(--primary-soft-ink)]"
                : "text-[10.5px] uppercase tracking-[0.06em] text-[var(--muted-foreground)]"
            }
          >
            {label}
          </span>
          {icon}
        </div>
        <div
          className={
            "font-serif text-[24px] font-medium tracking-tight tabular-nums mt-1 " +
            (highlight ? "text-[var(--primary-soft-ink)]" : "")
          }
        >
          {value}
        </div>
        {hint ? (
          <p
            className={
              "text-[11.5px] mt-1 " +
              (highlight
                ? "text-[var(--primary-soft-ink)]/70"
                : "text-[var(--muted-foreground)]")
            }
          >
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectionHead({
  title,
  cta,
}: {
  title: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
      <h2 className="font-serif text-[16px] font-medium tracking-tight">{title}</h2>
      {cta ? (
        <Link
          href={cta.href}
          className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--ink)] transition-colors no-underline"
        >
          {cta.label} →
        </Link>
      ) : null}
    </div>
  );
}
