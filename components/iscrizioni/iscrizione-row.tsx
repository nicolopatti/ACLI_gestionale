"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DeleteConfirmDialog,
  type DeleteImpactItem,
} from "@/components/ui/delete-confirm-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { SegnaPagatoDialog } from "@/components/iscrizioni/segna-pagato-dialog";
import { AnnullaPagamentoButton } from "@/components/iscrizioni/annulla-pagamento-button";
import {
  deleteIscrizioneAction,
  getDeleteIscrizioneImpactAction,
} from "@/lib/actions/iscrizioni";
import { cn, formatDate, formatEur } from "@/lib/utils";
import type {
  Bambino,
  Iscrizione,
  MeseIscrizione,
  ModalitaIscrizione,
} from "@/lib/db/types";

type StatoIscrizione = "attiva" | "ritardo" | "completata" | "anagrafica";

interface Props {
  iscrizione: Iscrizione;
  rate: MeseIscrizione[];
  pagati: number;
  totaleRate: number;
  stato: StatoIscrizione;
  prossimaRata?: MeseIscrizione;
  bambino?: Bambino;
  modalita?: ModalitaIscrizione;
  /** URL a cui tornare dopo l'eliminazione (default: lista globale). */
  redirectAfterDelete?: string;
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

function tipoRigaLabel(m: MeseIscrizione): string {
  if (m.descrizioneRiga) return m.descrizioneRiga;
  return m.chiavePeriodo ?? m.meseAnno ?? "—";
}

function tipoRigaBadge(m: MeseIscrizione) {
  switch (m.tipoRiga) {
    case "pacchetto":
      return (
        <Badge variant="secondary" className="ml-2 text-[10px]">
          pacchetto
        </Badge>
      );
    case "quota_iscrizione":
      return (
        <Badge variant="outline" className="ml-2 text-[10px]">
          quota
        </Badge>
      );
    case "sconto":
      return (
        <Badge variant="destructive" className="ml-2 text-[10px]">
          sconto
        </Badge>
      );
    case "sessione":
    default:
      return null;
  }
}

export function IscrizioneRow({
  iscrizione,
  rate,
  pagati,
  totaleRate,
  stato,
  prossimaRata,
  bambino,
  modalita,
  redirectAfterDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const fullName = bambino ? `${bambino.cognome} ${bambino.nome}`.trim() : "—";
  const tone =
    stato === "ritardo"
      ? "danger"
      : stato === "completata"
        ? "success"
        : "primary";

  // Le righe nella sezione espansa: tutte le rate, ordinate (sconti in fondo).
  const rateOrdered = [...rate].sort((a, b) => {
    if (a.tipoRiga === "sconto" && b.tipoRiga !== "sconto") return 1;
    if (b.tipoRiga === "sconto" && a.tipoRiga !== "sconto") return -1;
    return (a.chiavePeriodo ?? a.descrizioneRiga ?? "").localeCompare(
      b.chiavePeriodo ?? b.descrizioneRiga ?? "",
    );
  });

  return (
    <>
      <TableRow>
        <TableCell className="w-[36px] p-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Nascondi rate" : "Mostra rate"}
            aria-expanded={expanded}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-[var(--muted-foreground)] transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2.5">
            {bambino ? <Avatar name={fullName} size="md" /> : null}
            <Link
              href={`/iscrizioni/${iscrizione.recordId}`}
              className="font-medium hover:underline"
            >
              {fullName}
            </Link>
          </div>
        </TableCell>
        <TableCell className="text-[13px] text-[var(--ink-2)]">
          {modalita?.nome ?? "—"}
          {modalita?.tipoPrezzo === "flat" && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              pacchetto
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {modalita ? formatEur(modalita.importo) : "—"}
          {modalita && (
            <span className="text-xs text-[var(--muted-foreground)] ml-1">
              {modalita.tipoPrezzo === "flat" ? "tot." : "/sess."}
            </span>
          )}
        </TableCell>
        <TableCell className="w-[200px]">
          {totaleRate === 0 ? (
            <span className="text-[12px] text-[var(--muted-foreground)]">
              Nessuna rata
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] tabular-nums w-12 shrink-0">
                {pagati}/{totaleRate}
              </span>
              <Progress
                value={pagati}
                max={totaleRate}
                tone={tone}
                className="flex-1"
                label={`${pagati} rate pagate su ${totaleRate}`}
              />
            </div>
          )}
        </TableCell>
        <TableCell>{statoBadge(stato)}</TableCell>
        <TableCell className="w-[1%] whitespace-nowrap text-right">
          <div className="inline-flex items-center justify-end gap-1.5">
            {prossimaRata ? <SegnaPagatoDialog mese={prossimaRata} /> : null}
            <DeleteConfirmDialog
              triggerVariant="ghost"
              triggerIconOnly
              triggerLabel="Elimina iscrizione"
              title="Elimina iscrizione"
              description={
                <>
                  Stai per eliminare l&apos;iscrizione di{" "}
                  <strong>{fullName}</strong> e tutte le rate collegate.
                  L&apos;operazione e&apos; definitiva.
                </>
              }
              successToast="Iscrizione eliminata"
              loadImpact={async (): Promise<DeleteImpactItem[]> => {
                const impact = await getDeleteIscrizioneImpactAction(
                  iscrizione.recordId,
                );
                return [{ label: "Rate (MesiIscrizione)", count: impact.rate }];
              }}
              onConfirm={async () => {
                await deleteIscrizioneAction(iscrizione.recordId, {
                  redirectTo: redirectAfterDelete,
                });
              }}
            />
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]/40">
          <TableCell colSpan={7} className="p-0">
            <div className="px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                Rate ({rate.length})
              </p>
              {rate.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nessuna rata generata.
                </p>
              ) : (
                <div className="rounded-md border border-[var(--border)] bg-[var(--background)]">
                  <table className="w-full text-sm">
                    <thead className="text-[12px] text-[var(--muted-foreground)]">
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left font-medium px-3 py-2">
                          Periodo
                        </th>
                        <th className="text-right font-medium px-3 py-2 w-[110px]">
                          Importo
                        </th>
                        <th className="text-left font-medium px-3 py-2 w-[170px]">
                          Stato
                        </th>
                        <th className="text-left font-medium px-3 py-2 w-[120px]">
                          Pagato il
                        </th>
                        <th className="text-left font-medium px-3 py-2 w-[80px]">
                          Mezzo
                        </th>
                        <th className="text-right font-medium px-3 py-2 w-[180px]">
                          Azione
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateOrdered.map((r) => {
                        const isSconto = r.tipoRiga === "sconto";
                        return (
                          <tr
                            key={r.recordId}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="px-3 py-2 font-medium capitalize">
                              {tipoRigaLabel(r)}
                              {tipoRigaBadge(r)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right tabular-nums",
                                isSconto && "text-[var(--destructive)]",
                              )}
                            >
                              {formatEur(r.importoDovuto)}
                            </td>
                            <td className="px-3 py-2">
                              {isSconto ? (
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  —
                                </span>
                              ) : r.statoPagamento === "pagato" ? (
                                <Badge variant="success">
                                  Pagato {formatEur(r.importoPagato)}
                                </Badge>
                              ) : r.statoPagamento === "parziale" ? (
                                <Badge variant="warning">Parziale</Badge>
                              ) : (
                                <Badge variant="outline">Non pagato</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-[var(--ink-2)]">
                              {formatDate(r.dataPagamento)}
                            </td>
                            <td className="px-3 py-2 text-[var(--ink-2)]">
                              {r.mezzoPagamento ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isSconto ? null : r.statoPagamento ===
                                "pagato" ? (
                                <AnnullaPagamentoButton meseId={r.recordId} />
                              ) : (
                                <SegnaPagatoDialog mese={r} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-2 text-right">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/iscrizioni/${iscrizione.recordId}`}>
                    Apri iscrizione →
                  </Link>
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
