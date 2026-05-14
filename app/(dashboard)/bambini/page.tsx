import Link from "next/link";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { Plus } from "lucide-react";
import { listBambini } from "@/lib/db/bambini";
import { listIscrizioni } from "@/lib/db/iscrizioni";
import { listAttivita } from "@/lib/db/attivita";
import { listAllMesi } from "@/lib/db/mesi";
import { listPresenzeByMese } from "@/lib/db/presenze";
import { presenzaAssente } from "@/lib/db/types";
import type { Attivita, Bambino } from "@/lib/db/types";
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
import { BambiniFilters } from "@/components/bambini/bambini-filters";
import { cn, formatDate, formatEur } from "@/lib/utils";

type Tab = "tutti" | "attivi" | "saldo" | "archivio";

function isTab(v: string | undefined): v is Tab {
  return v === "tutti" || v === "attivi" || v === "saldo" || v === "archivio";
}

const TIPO_BADGE: Record<Attivita["tipo"], "default" | "success" | "warning" | "secondary"> = {
  doposcuola: "success",
  laboratorio: "warning",
  locomotiva: "default",
};

function weekdaysSoFarThisMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  let count = 0;
  for (let d = 1; d <= today; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return Math.max(count, 1);
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function BambiniPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    scuola?: string;
    classe?: string;
    attivita?: string;
  }>;
}) {
  await requireAdminOrCoordinatore();
  const sp = await searchParams;
  const tab: Tab = isTab(sp.tab) ? sp.tab : "tutti";
  const q = (sp.q ?? "").trim().toLowerCase();
  const scuolaSel = sp.scuola ?? "";
  const classeSel = sp.classe ?? "";
  const attivitaSel = sp.attivita ?? "";

  const meseAnno = currentMonthKey();
  const denomPresenze = weekdaysSoFarThisMonth();

  const [bambini, iscrizioni, attivita, rate, presenzeMese] = await Promise.all([
    listBambini(),
    listIscrizioni(),
    listAttivita(),
    listAllMesi(),
    listPresenzeByMese(meseAnno),
  ]);

  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));

  const iscrizioniByBambino = new Map<string, typeof iscrizioni>();
  for (const i of iscrizioni) {
    const arr = iscrizioniByBambino.get(i.bambinoId) ?? [];
    arr.push(i);
    iscrizioniByBambino.set(i.bambinoId, arr);
  }

  const iscrizioneIdToBambinoId = new Map(iscrizioni.map((i) => [i.recordId, i.bambinoId] as const));

  const saldoByBambino = new Map<string, number>();
  for (const r of rate) {
    const bambinoId = iscrizioneIdToBambinoId.get(r.iscrizioneId);
    if (!bambinoId) continue;
    if (r.statoPagamento === "pagato") continue;
    const dovuto = r.importoDovuto ?? 0;
    const pagato = r.importoPagato ?? 0;
    const residuo = Math.max(0, dovuto - pagato);
    saldoByBambino.set(bambinoId, (saldoByBambino.get(bambinoId) ?? 0) + residuo);
  }

  const presenzeByBambino = new Map<string, number>();
  for (const p of presenzeMese) {
    if (presenzaAssente(p)) continue;
    presenzeByBambino.set(p.bambinoId, (presenzeByBambino.get(p.bambinoId) ?? 0) + 1);
  }

  // Opzioni filter dai dati reali
  const scuole = Array.from(
    new Set(bambini.map((b) => b.scuola).filter((s): s is string => Boolean(s))),
  ).sort();
  const classi = Array.from(
    new Set(bambini.map((b) => b.classe).filter((c): c is string => Boolean(c))),
  ).sort();
  const attivitaOpzioni = attivita.map((a) => ({ id: a.recordId, nome: a.nome }));

  // Conta per tab (prima del filtro)
  const counts = {
    tutti: bambini.length,
    attivi: bambini.filter((b) => b.attivo).length,
    saldo: bambini.filter((b) => (saldoByBambino.get(b.recordId) ?? 0) > 0).length,
    archivio: bambini.filter((b) => !b.attivo).length,
  };

  // Filtri
  function passesTab(b: Bambino): boolean {
    if (tab === "tutti") return true;
    if (tab === "attivi") return b.attivo;
    if (tab === "saldo") return (saldoByBambino.get(b.recordId) ?? 0) > 0;
    if (tab === "archivio") return !b.attivo;
    return true;
  }
  function passesSearch(b: Bambino): boolean {
    if (!q) return true;
    const hay = [
      b.nome,
      b.cognome,
      b.nomeGenitore,
      b.cognomeGenitore,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }
  function passesScuola(b: Bambino): boolean {
    return !scuolaSel || b.scuola === scuolaSel;
  }
  function passesClasse(b: Bambino): boolean {
    return !classeSel || b.classe === classeSel;
  }
  function passesAttivita(b: Bambino): boolean {
    if (!attivitaSel) return true;
    const isc = iscrizioniByBambino.get(b.recordId) ?? [];
    return isc.some((i) => i.attivitaId === attivitaSel);
  }

  const filtered = bambini
    .filter((b) => passesTab(b) && passesSearch(b) && passesScuola(b) && passesClasse(b) && passesAttivita(b))
    .sort((a, b) => {
      const c = a.cognome.localeCompare(b.cognome, "it");
      return c !== 0 ? c : a.nome.localeCompare(b.nome, "it");
    });

  function tabHref(t: Tab): string {
    const next = new URLSearchParams();
    if (t !== "tutti") next.set("tab", t);
    if (q) next.set("q", q);
    if (scuolaSel) next.set("scuola", scuolaSel);
    if (classeSel) next.set("classe", classeSel);
    if (attivitaSel) next.set("attivita", attivitaSel);
    const qs = next.toString();
    return qs ? `?${qs}` : "/bambini";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bambini</h1>
        <Button asChild>
          <Link href="/bambini/nuovo">
            <Plus className="h-4 w-4" /> Nuovo
          </Link>
        </Button>
      </div>

      <div className="flex gap-0.5 border-b border-[var(--border)]">
        {(
          [
            ["tutti", "Tutti"],
            ["attivi", "Attivi"],
            ["saldo", "Con saldo"],
            ["archivio", "Archivio"],
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

      <BambiniFilters scuole={scuole} classi={classi} attivita={attivitaOpzioni} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bambino</TableHead>
                <TableHead>Classe / scuola</TableHead>
                <TableHead>Iscrizione</TableHead>
                <TableHead>Genitore</TableHead>
                <TableHead className="w-[160px]">Pres. mese</TableHead>
                <TableHead className="text-right">Saldo aperto</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[var(--muted-foreground)] py-8">
                    Nessun bambino corrisponde ai filtri.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => {
                  const isc = iscrizioniByBambino.get(b.recordId) ?? [];
                  const attivitaIscritto = Array.from(
                    new Map(
                      isc
                        .map((i) => attivitaById.get(i.attivitaId))
                        .filter((a): a is Attivita => Boolean(a))
                        .map((a) => [a.recordId, a] as const),
                    ).values(),
                  );
                  const saldo = saldoByBambino.get(b.recordId) ?? 0;
                  const pres = presenzeByBambino.get(b.recordId) ?? 0;
                  const fullName = `${b.cognome} ${b.nome}`.trim();
                  const genitore =
                    [b.cognomeGenitore, b.nomeGenitore].filter(Boolean).join(" ").trim() || "—";

                  return (
                    <TableRow key={b.recordId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={fullName} size="md" />
                          <div className="min-w-0">
                            <Link
                              href={`/bambini/${b.recordId}`}
                              className="font-medium hover:underline block truncate"
                            >
                              {fullName}
                            </Link>
                            {b.dataNascita && (
                              <div className="text-[11.5px] text-[var(--muted-foreground)]">
                                {formatDate(b.dataNascita)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[13px] text-[var(--ink)]">{b.classe ?? "—"}</div>
                        {b.scuola && (
                          <div className="text-[11.5px] text-[var(--muted-foreground)]">{b.scuola}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {attivitaIscritto.length === 0 ? (
                          <Badge variant="outline">Solo anagrafica</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {attivitaIscritto.map((a) => (
                              <Badge key={a.recordId} variant={TIPO_BADGE[a.tipo]}>
                                {a.nome}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-[13px]">{genitore}</div>
                        {b.telefonoGenitore && (
                          <div className="text-[11.5px] text-[var(--muted-foreground)] font-mono">
                            {b.telefonoGenitore}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] tabular-nums w-10 shrink-0">
                            {pres}
                            <span className="text-[var(--muted-2)]">/{denomPresenze}</span>
                          </span>
                          <Progress
                            value={pres}
                            max={denomPresenze}
                            tone="primary"
                            className="flex-1"
                            label={`${pres} presenze su ${denomPresenze} giorni`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {saldo > 0 ? (
                          <Badge variant="destructive">{formatEur(saldo)}</Badge>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {b.attivo ? (
                          <Badge variant="success">Attivo</Badge>
                        ) : (
                          <Badge variant="outline">Archiviato</Badge>
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
  );
}
