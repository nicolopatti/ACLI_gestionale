"use client";

import { useMemo, useState } from "react";
import { TurnoDialog, type EducatoreLight, type TurnoRowState } from "./turno-dialog";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { dowToGiorno, type FasciaOraria, type GiornoSettimana } from "@/lib/config";
import type { Disponibilita } from "@/lib/db/types";
import type { CellaAttiva } from "@/lib/db/turni";

export interface TurniGridProps {
  vista: "settimana" | "mese";
  giorni: { data: string; numero: number; dow: number; inMese?: boolean }[];
  educatori: EducatoreLight[];
  disponibilita: Disponibilita[];
  fasceOfferte: FasciaOraria[];
  giorniOfferti: GiornoSettimana[];
  celleAttive: CellaAttiva[];
  /** Data di "oggi" in formato YYYY-MM-DD (calcolata server-side per evitare
   * hydration mismatch). Le celle con `data < todayIso` sono consuntivate. */
  todayIso: string;
}

const NOMI_GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

function dispKey(data: string, fascia: FasciaOraria): string {
  return `${data}__${fascia}`;
}

function cellaInfoKey(data: string, fascia: FasciaOraria): string {
  return `${data}__${fascia}`;
}

export function TurniGrid({
  vista,
  giorni,
  educatori,
  disponibilita,
  fasceOfferte,
  giorniOfferti,
  celleAttive,
  todayIso,
}: TurniGridProps) {
  const [openCell, setOpenCell] = useState<{
    data: string;
    fascia: FasciaOraria;
  } | null>(null);

  const dispMap = useMemo(() => {
    const m = new Map<string, Disponibilita[]>();
    for (const d of disponibilita) {
      const k = dispKey(d.data, d.fasciaOraria);
      const arr = m.get(k) ?? [];
      arr.push(d);
      m.set(k, arr);
    }
    return m;
  }, [disponibilita]);

  const educatoreById = useMemo(
    () => new Map(educatori.map((e) => [e.recordId, e] as const)),
    [educatori],
  );

  // Mappa (data, fascia) -> CellaAttiva (se la cella è offerta da un'attività).
  // Una cella può essere coperta da più attività: prendiamo la prima per
  // contesto (laboratorio/locomotiva prevalgono su doposcuola se presenti).
  const cellaInfo = useMemo(() => {
    const m = new Map<string, CellaAttiva>();
    for (const c of celleAttive) {
      const k = cellaInfoKey(c.data, c.fascia);
      const cur = m.get(k);
      if (!cur || (cur.tipo === "mese" && c.tipo !== "mese")) {
        m.set(k, c);
      }
    }
    return m;
  }, [celleAttive]);

  const giorniSet = useMemo(() => new Set(giorniOfferti), [giorniOfferti]);

  const initialRows: TurnoRowState[] = useMemo(() => {
    if (!openCell) return [];
    const cellRecords = dispMap.get(dispKey(openCell.data, openCell.fascia)) ?? [];
    return cellRecords.map((d) => ({ educatoreId: d.educatoreId }));
  }, [openCell, dispMap]);

  const openCellInfo = openCell
    ? cellaInfo.get(cellaInfoKey(openCell.data, openCell.fascia))
    : null;
  const contextLabel = openCellInfo?.etichetta
    ? `${openCellInfo.tipo === "giornata" ? "Laboratorio" : openCellInfo.tipo === "settimana" ? "Locomotiva" : "Doposcuola"}: ${openCellInfo.attivitaNome} · ${openCellInfo.etichetta}`
    : openCellInfo
      ? `${openCellInfo.attivitaNome}`
      : undefined;

  function renderCell(data: string, fascia: FasciaOraria) {
    const records = dispMap.get(dispKey(data, fascia)) ?? [];
    const info = cellaInfo.get(cellaInfoKey(data, fascia));
    const isAttiva = Boolean(info);

    if (!isAttiva) {
      return (
        <div
          className={cn(
            "w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40",
            "px-2 py-1.5 min-h-[42px] text-[10.5px] text-[var(--muted-2)]/70",
          )}
          title="Nessuna attività in questa cella"
        >
          —
        </div>
      );
    }

    const badge =
      info!.tipo === "giornata"
        ? { label: "Lab", cls: "bg-amber-100 text-amber-900" }
        : info!.tipo === "settimana"
          ? { label: "Loco", cls: "bg-violet-100 text-violet-900" }
          : null;

    return (
      <button
        type="button"
        onClick={() => setOpenCell({ data, fascia })}
        className={cn(
          "w-full text-left rounded-md border border-dashed border-[var(--border)]",
          "px-2 py-1.5 min-h-[42px] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/20",
          "transition-colors btn-tactile",
        )}
        title={info!.etichetta ?? info!.attivitaNome}
      >
        {badge ? (
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide mb-0.5",
              badge.cls,
            )}
          >
            {badge.label}
          </span>
        ) : null}
        {records.length === 0 ? (
          <span className="text-[11px] text-[var(--muted-2)] block">+ aggiungi</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {records.map((d) => {
              const ed = educatoreById.get(d.educatoreId);
              const consuntivato = d.data < todayIso;
              return (
                <span
                  key={d.recordId}
                  title={
                    ed
                      ? `${ed.nomeCompleto}${consuntivato ? " · consuntivato" : " · pianificato"}`
                      : ""
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full pl-0.5 pr-2 py-0.5 text-[11px]",
                    consuntivato
                      ? "bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                      : "border border-dashed border-[var(--primary)]/60 text-[var(--ink-2)]",
                  )}
                >
                  <Avatar
                    name={ed?.nomeCompleto ?? "??"}
                    size="sm"
                    className="!w-5 !h-5 !text-[9px]"
                  />
                  {ed?.nomeCompleto.split(" ")[0]}
                </span>
              );
            })}
          </div>
        )}
      </button>
    );
  }

  // Filtra giorni: in vista settimana mostra solo quelli offerti
  // dall'unione delle attività attive. In vista mese mostra il calendario
  // intero con celle non-offerte oscurate.
  const giorniFiltrati =
    vista === "settimana"
      ? giorni.filter((g) => giorniSet.has(dowToGiorno(g.dow)))
      : giorni;

  if (vista === "settimana") {
    if (giorniFiltrati.length === 0 || fasceOfferte.length === 0) {
      return (
        <p className="text-center text-[13px] text-[var(--muted-foreground)] py-8">
          Le attività attive non coprono questa settimana.
        </p>
      );
    }
    return (
      <>
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `80px repeat(${giorniFiltrati.length}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {giorniFiltrati.map((g) => (
            <div key={g.data} className="px-2 py-1">
              <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {NOMI_GIORNI[(g.dow + 6) % 7]}
              </div>
              <div className="text-[14px] font-medium tabular-nums">{g.numero}</div>
            </div>
          ))}
          {fasceOfferte.map((fascia) => (
            <div key={fascia} className="contents">
              <div className="px-2 py-2 text-[12px] font-medium text-[var(--muted-foreground)] tabular-nums">
                {fascia}
              </div>
              {giorniFiltrati.map((g) => (
                <div key={`${fascia}-${g.data}`}>{renderCell(g.data, fascia)}</div>
              ))}
            </div>
          ))}
        </div>
        {openCell ? (
          <TurnoDialog
            key={`${openCell.data}__${openCell.fascia}`}
            open={Boolean(openCell)}
            onOpenChange={(o) => !o && setOpenCell(null)}
            data={openCell.data}
            fascia={openCell.fascia}
            educatori={educatori}
            initialRows={initialRows}
            contextLabel={contextLabel}
          />
        ) : null}
      </>
    );
  }

  // Vista mese: griglia 7 colonne; celle giorno mostrano le fasce offerte
  // stack. Giorni non offerti sono oscurati.
  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {NOMI_GIORNI.map((n) => (
          <div
            key={n}
            className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-wide px-1.5 py-1"
          >
            {n}
          </div>
        ))}
        {giorni.map((g) => {
          const giornoEnum = dowToGiorno(g.dow);
          const giornoOfferto = giorniSet.has(giornoEnum);
          return (
            <div
              key={g.data}
              className={cn(
                "border border-[var(--border)] rounded-md p-1.5 min-h-[140px] flex flex-col gap-1",
                !g.inMese && "opacity-30",
                !giornoOfferto && "bg-[var(--surface-2)]/40",
              )}
            >
              <div className="text-[11.5px] font-medium tabular-nums px-0.5">
                {g.numero}
              </div>
              <div className="flex-1 space-y-1">
                {giornoOfferto ? (
                  fasceOfferte.map((fascia) => (
                    <div key={fascia} className="space-y-0.5">
                      <div className="text-[9.5px] text-[var(--muted-2)] tabular-nums px-0.5">
                        {fascia}
                      </div>
                      {renderCell(g.data, fascia)}
                    </div>
                  ))
                ) : (
                  <div className="text-[9.5px] text-[var(--muted-2)]/60 px-0.5">
                    chiuso
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {openCell ? (
        <TurnoDialog
          open={Boolean(openCell)}
          onOpenChange={(o) => !o && setOpenCell(null)}
          data={openCell.data}
          fascia={openCell.fascia}
          educatori={educatori}
          initialRows={initialRows}
          contextLabel={contextLabel}
        />
      ) : null}
    </>
  );
}
