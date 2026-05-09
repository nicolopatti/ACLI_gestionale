import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getBambino, listBambini } from "@/lib/airtable/bambini";
import { listIscrizioni } from "@/lib/airtable/iscrizioni";
import { listContattiByBambino } from "@/lib/airtable/contatti-aggiuntivi";
import { listAttivita } from "@/lib/airtable/attivita";
import { listAllModalita } from "@/lib/airtable/modalita-iscrizione";
import { listAllMesi } from "@/lib/airtable/mesi";
import { listPresenzeByBambino } from "@/lib/airtable/presenze";
import { listSessioni } from "@/lib/airtable/sessioni";
import { presenzaAssente } from "@/lib/airtable/types";
import type { MeseIscrizione } from "@/lib/airtable/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BambinoForm } from "@/components/bambini/bambino-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteBambinoAction } from "@/lib/actions/bambini";
import { cn, formatDate, formatEur, meseAnnoLabel } from "@/lib/utils";

type Tab = "anagrafica" | "iscrizioni" | "presenze" | "pagamenti" | "note";

const TABS: { key: Tab; label: string }[] = [
  { key: "anagrafica", label: "Anagrafica" },
  { key: "iscrizioni", label: "Iscrizioni" },
  { key: "presenze", label: "Presenze" },
  { key: "pagamenti", label: "Pagamenti" },
  { key: "note", label: "Note" },
];

function isTab(v: string | undefined): v is Tab {
  return TABS.some((t) => t.key === v);
}

function periodoLabel(m: MeseIscrizione): string {
  if (m.tipoUnita === "mese" && m.meseAnno) return meseAnnoLabel(m.meseAnno);
  return m.chiavePeriodo ?? m.meseAnno ?? "—";
}

function statoRataBadge(stato: MeseIscrizione["statoPagamento"]) {
  if (stato === "pagato") return <Badge variant="success">Pagato</Badge>;
  if (stato === "parziale") return <Badge variant="warning">Parziale</Badge>;
  return <Badge variant="outline">Non pagato</Badge>;
}

export default async function BambinoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab: Tab = isTab(sp.tab) ? sp.tab : "anagrafica";

  const [
    bambino,
    bambini,
    iscrizioniBambino,
    contatti,
    attivita,
    modalita,
    allRate,
    presenze,
    sessioni,
  ] = await Promise.all([
    getBambino(id),
    listBambini(),
    listIscrizioni({ bambinoId: id }),
    listContattiByBambino(id),
    listAttivita(),
    listAllModalita(),
    listAllMesi(),
    listPresenzeByBambino(id),
    listSessioni(),
  ]);
  if (!bambino) notFound();

  const attivitaById = new Map(attivita.map((a) => [a.recordId, a] as const));
  const modalitaById = new Map(modalita.map((m) => [m.recordId, m] as const));
  const sessioniById = new Map(sessioni.map((s) => [s.recordId, s] as const));

  const iscrizioneIds = new Set(iscrizioniBambino.map((i) => i.recordId));
  const rateBambino = allRate
    .filter((r) => iscrizioneIds.has(r.iscrizioneId))
    .sort((a, b) => (b.chiavePeriodo ?? "").localeCompare(a.chiavePeriodo ?? ""));

  const fullName = `${bambino.cognome} ${bambino.nome}`.trim();

  function tabHref(t: Tab): string {
    return t === "anagrafica" ? `/bambini/${id}` : `?tab=${t}`;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3.5">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight font-serif truncate">
            {fullName}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[12.5px] text-[var(--muted-foreground)]">
            {bambino.classe && <span>Classe {bambino.classe}</span>}
            {bambino.scuola && <span>· {bambino.scuola}</span>}
            {bambino.dataNascita && <span>· {formatDate(bambino.dataNascita)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {iscrizioniBambino.length > 0 ? (
            <Badge variant="success">
              {iscrizioniBambino.length} iscrizion{iscrizioniBambino.length === 1 ? "e" : "i"}
            </Badge>
          ) : (
            <Badge variant="outline">Solo anagrafica</Badge>
          )}
          {!bambino.attivo && <Badge variant="outline">Archiviato</Badge>}
        </div>
      </div>

      <div className="flex gap-0.5 border-b border-[var(--border)]">
        {TABS.map(({ key, label }) => (
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
          </Link>
        ))}
      </div>

      {tab === "anagrafica" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Anagrafica</CardTitle>
            </CardHeader>
            <CardContent>
              <BambinoForm bambino={bambino} bambini={bambini} contatti={contatti} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eliminazione</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={async () => {
                  "use server";
                  await deleteBambinoAction(bambino.recordId);
                }}
              >
                <Button
                  variant="destructive"
                  type="submit"
                  disabled={iscrizioniBambino.length > 0}
                >
                  Elimina bambino
                </Button>
                {iscrizioniBambino.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Rimuovi prima le iscrizioni collegate.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "iscrizioni" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Iscrizioni · {iscrizioniBambino.length}</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href={`/iscrizioni/nuova?bambinoId=${bambino.recordId}`}>
                <Plus className="h-4 w-4" /> Nuova iscrizione
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {iscrizioniBambino.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] px-6 pb-6">
                Nessuna iscrizione.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attività</TableHead>
                    <TableHead>Modalità</TableHead>
                    <TableHead className="text-right">Importo / sess.</TableHead>
                    <TableHead className="w-[200px]">Avanzamento rate</TableHead>
                    <TableHead className="text-right">Apri</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {iscrizioniBambino.map((i) => {
                    const a = attivitaById.get(i.attivitaId);
                    const m = modalitaById.get(i.modalitaId);
                    const rate = rateBambino.filter((r) => r.iscrizioneId === i.recordId);
                    const pagati = rate.filter((r) => r.statoPagamento === "pagato").length;
                    const totale = rate.length;
                    return (
                      <TableRow key={i.recordId}>
                        <TableCell className="font-medium">{a?.nome ?? "—"}</TableCell>
                        <TableCell className="text-[13px] text-[var(--ink-2)]">
                          {m?.nome ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m ? formatEur(m.importo) : "—"}
                        </TableCell>
                        <TableCell>
                          {totale === 0 ? (
                            <span className="text-[12px] text-[var(--muted-foreground)]">
                              Nessuna rata
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] tabular-nums w-12 shrink-0">
                                {pagati}/{totale}
                              </span>
                              <Progress
                                value={pagati}
                                max={totale}
                                tone={pagati === totale ? "success" : "primary"}
                                className="flex-1"
                                label={`${pagati} rate pagate su ${totale}`}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/iscrizioni/${i.recordId}`}>Apri</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "presenze" && (
        <Card>
          <CardHeader>
            <CardTitle>Presenze · ultimi 30 record</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {presenze.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] px-6 pb-6">
                Nessuna presenza registrata.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Sessione</TableHead>
                    <TableHead>Ingresso</TableHead>
                    <TableHead>Uscita</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presenze.slice(0, 30).map((p) => {
                    const s = p.sessioneId ? sessioniById.get(p.sessioneId) : undefined;
                    const a = s ? attivitaById.get(s.attivitaId) : undefined;
                    const assente = presenzaAssente(p);
                    return (
                      <TableRow key={p.recordId}>
                        <TableCell className="whitespace-nowrap">{formatDate(p.data)}</TableCell>
                        <TableCell className="text-[12.5px] text-[var(--muted-foreground)]">
                          {a ? `${a.nome} · ${s?.etichetta ?? ""}` : s?.etichetta ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono">{p.oraIngresso ?? "—"}</TableCell>
                        <TableCell className="font-mono">{p.oraUscita ?? "—"}</TableCell>
                        <TableCell>
                          {assente ? (
                            <Badge variant="outline">Assente</Badge>
                          ) : (
                            <Badge variant="success">Presente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-[12.5px] text-[var(--muted-foreground)]">
                          {p.note ?? ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "pagamenti" && (
        <Card>
          <CardHeader>
            <CardTitle>Pagamenti · {rateBambino.length} rate</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rateBambino.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] px-6 pb-6">
                Nessuna rata generata.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Attività</TableHead>
                    <TableHead className="text-right">Dovuto</TableHead>
                    <TableHead className="text-right">Pagato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Mezzo</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateBambino.map((r) => {
                    const isc = iscrizioniBambino.find((i) => i.recordId === r.iscrizioneId);
                    const a = isc ? attivitaById.get(isc.attivitaId) : undefined;
                    return (
                      <TableRow key={r.recordId}>
                        <TableCell className="font-medium">{periodoLabel(r)}</TableCell>
                        <TableCell className="text-[12.5px] text-[var(--muted-foreground)]">
                          {a?.nome ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEur(r.importoDovuto)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.importoPagato != null ? formatEur(r.importoPagato) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(r.dataPagamento)}
                        </TableCell>
                        <TableCell>
                          {r.mezzoPagamento ? (
                            <Badge variant="outline">{r.mezzoPagamento}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{statoRataBadge(r.statoPagamento)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "note" && (
        <Card>
          <CardHeader>
            <CardTitle>Note</CardTitle>
          </CardHeader>
          <CardContent>
            {bambino.note ? (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--ink)]">
                {bambino.note}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nessuna nota. Per aggiungerne, usa il form nella scheda Anagrafica.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
