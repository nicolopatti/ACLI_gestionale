"use client";

import { useMemo, useState } from "react";
import { TurnoDialog, type EducatoreLight, type TurnoRowState } from "./turno-dialog";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FASCE_DISPONIBILITA, type FasciaDisponibilita } from "@/lib/config";
import type { Disponibilita } from "@/lib/airtable/types";

export interface TurniGridProps {
  vista: "settimana" | "mese";
  giorni: { data: string; numero: number; dow: number; inMese?: boolean }[];
  educatori: EducatoreLight[];
  disponibilita: Disponibilita[];
}

const NOMI_GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

function dispKey(data: string, fascia: FasciaDisponibilita): string {
  return `${data}__${fascia}`;
}

export function TurniGrid({
  vista,
  giorni,
  educatori,
  disponibilita,
}: TurniGridProps) {
  const [openCell, setOpenCell] = useState<{
    data: string;
    fascia: FasciaDisponibilita;
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

  const initialRows: TurnoRowState[] = useMemo(() => {
    if (!openCell) return [];
    const cellRecords = dispMap.get(dispKey(openCell.data, openCell.fascia)) ?? [];
    return cellRecords.map((d) => ({
      educatoreId: d.educatoreId,
      oraIngresso: d.oraIngresso ?? "",
      oraUscita: d.oraUscita ?? "",
    }));
  }, [openCell, dispMap]);

  function renderCell(data: string, fascia: FasciaDisponibilita) {
    const records = dispMap.get(dispKey(data, fascia)) ?? [];
    return (
      <button
        type="button"
        onClick={() => setOpenCell({ data, fascia })}
        className={cn(
          "w-full text-left rounded-md border border-dashed border-[var(--border)]",
          "px-2 py-1.5 min-h-[42px] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/20",
          "transition-colors",
        )}
      >
        {records.length === 0 ? (
          <span className="text-[11px] text-[var(--muted-2)]">+ aggiungi</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {records.map((d) => {
              const ed = educatoreById.get(d.educatoreId);
              const consuntivato = Boolean(d.oraIngresso);
              return (
                <span
                  key={d.recordId}
                  title={
                    ed
                      ? `${ed.nomeCompleto}${consuntivato ? ` · ${d.oraIngresso}–${d.oraUscita ?? "?"}` : " · pianificato"}`
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

  if (vista === "settimana") {
    return (
      <>
        <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-1.5">
          <div />
          {giorni.map((g) => (
            <div key={g.data} className="px-2 py-1">
              <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {NOMI_GIORNI[(g.dow + 6) % 7]}
              </div>
              <div className="text-[14px] font-medium tabular-nums">{g.numero}</div>
            </div>
          ))}
          {FASCE_DISPONIBILITA.map((fascia) => (
            <div key={fascia} className="contents">
              <div className="px-2 py-2 text-[12px] font-medium text-[var(--muted-foreground)] tabular-nums">
                {fascia}
              </div>
              {giorni.map((g) => (
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
          />
        ) : null}
      </>
    );
  }

  // Vista mese: griglia 7 colonne con celle giorno che mostrano le 3 fasce stack
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
        {giorni.map((g) => (
          <div
            key={g.data}
            className={cn(
              "border border-[var(--border)] rounded-md p-1.5 min-h-[140px] flex flex-col gap-1",
              !g.inMese && "opacity-40",
            )}
          >
            <div className="text-[11.5px] font-medium tabular-nums px-0.5">
              {g.numero}
            </div>
            <div className="flex-1 space-y-1">
              {FASCE_DISPONIBILITA.map((fascia) => (
                <div key={fascia} className="space-y-0.5">
                  <div className="text-[9.5px] text-[var(--muted-2)] tabular-nums px-0.5">
                    {fascia}
                  </div>
                  {renderCell(g.data, fascia)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {openCell ? (
        <TurnoDialog
          open={Boolean(openCell)}
          onOpenChange={(o) => !o && setOpenCell(null)}
          data={openCell.data}
          fascia={openCell.fascia}
          educatori={educatori}
          initialRows={initialRows}
        />
      ) : null}
    </>
  );
}
