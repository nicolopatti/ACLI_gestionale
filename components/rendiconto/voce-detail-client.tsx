"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  restoreMovimentoAction,
  setVoceRendicontoMovimentoAction,
  softDeleteMovimentoAction,
} from "@/lib/actions/movimenti";
import { formatEur, meseAnnoLabel } from "@/lib/utils";
import type { MezzoPagamento } from "@/lib/config";
import type { SezioneRendiconto } from "@/lib/db/types";

type Period = "all" | "month" | "quarter" | "year" | "custom";

interface MovimentoVista {
  id: string;
  dataMovimento: string;
  descrizione: string;
  conto: MezzoPagamento;
  tipo: "Entrata" | "Uscita";
  importo: number;
  categoriaNome: string;
  voceRendicontoId: string | null;
}

interface VoceOpt {
  id: string;
  codice: string;
  sezione: SezioneRendiconto;
  label: string;
}

interface Props {
  voce: {
    codice: string;
    label: string;
    tipo: "Entrata" | "Uscita";
    sezione: SezioneRendiconto;
  };
  eyebrow: string;
  sectionTitle: string;
  anno: number;
  movimenti: MovimentoVista[];
  vociPerSposta: VoceOpt[];
  sezioniTitoli: Record<SezioneRendiconto, string>;
  initialFilters: {
    q: string;
    amin: string;
    amax: string;
    period: Period;
    from: string;
    to: string;
  };
}

function todayStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInPeriod(
  dataIso: string,
  period: Period,
  from: string,
  to: string,
): boolean {
  if (period === "all" || period === "year") return true;
  const d = new Date(dataIso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const today = todayStartOfDay();
  if (period === "month") {
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth()
    );
  }
  if (period === "quarter") {
    const start = new Date(today);
    start.setDate(start.getDate() - 90);
    return d >= start && d <= today;
  }
  if (period === "custom") {
    if (from) {
      const f = new Date(from + "T00:00:00");
      if (!Number.isNaN(f.getTime()) && d < f) return false;
    }
    if (to) {
      const t = new Date(to + "T00:00:00");
      if (!Number.isNaN(t.getTime()) && d > t) return false;
    }
    return true;
  }
  return true;
}

export function VoceDetailClient({
  voce,
  eyebrow,
  sectionTitle,
  anno,
  movimenti: initialMovimenti,
  vociPerSposta,
  sezioniTitoli,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [movimenti, setMovimenti] =
    useState<MovimentoVista[]>(initialMovimenti);
  const [q, setQ] = useState(initialFilters.q);
  const [amin, setAmin] = useState(initialFilters.amin);
  const [amax, setAmax] = useState(initialFilters.amax);
  const [period, setPeriod] = useState<Period>(initialFilters.period);
  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const [pending, startTransition] = useTransition();

  // Sync filtri → URL (debounced sui campi testuali per non spammare history).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sp = new URLSearchParams();
      sp.set("anno", String(anno));
      if (q) sp.set("q", q);
      if (amin) sp.set("amin", amin);
      if (amax) sp.set("amax", amax);
      if (period !== "all") sp.set("period", period);
      if (period === "custom") {
        if (from) sp.set("from", from);
        if (to) sp.set("to", to);
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, amin, amax, period, from, to, anno, router, pathname]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const aminNum = amin === "" ? null : Math.abs(parseFloat(amin));
    const amaxNum = amax === "" ? null : Math.abs(parseFloat(amax));
    return movimenti.filter((m) => {
      if (qLower) {
        const hay = (
          m.descrizione +
          " " +
          m.categoriaNome +
          " " +
          m.conto
        ).toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      const absAmt = Math.abs(m.importo);
      if (aminNum !== null && !Number.isNaN(aminNum) && absAmt < aminNum)
        return false;
      if (amaxNum !== null && !Number.isNaN(amaxNum) && absAmt > amaxNum)
        return false;
      if (!isInPeriod(m.dataMovimento, period, from, to)) return false;
      return true;
    });
  }, [movimenti, q, amin, amax, period, from, to]);

  const totaleAnno = movimenti.reduce((s, m) => s + Math.abs(m.importo), 0);
  const totaleFiltrato = filtered.reduce(
    (s, m) => s + Math.abs(m.importo),
    0,
  );

  // Raggruppamento per mese, ordinato dal più recente al più vecchio.
  const groups = useMemo(() => {
    const map = new Map<string, MovimentoVista[]>();
    for (const m of filtered) {
      const k = m.dataMovimento.substring(0, 7); // "YYYY-MM"
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .map(([k, items]) => ({
        key: k,
        items: items.sort((a, b) =>
          a.dataMovimento < b.dataMovimento ? 1 : -1,
        ),
        total: items.reduce((s, m) => s + Math.abs(m.importo), 0),
      }));
  }, [filtered]);

  function handleSposta(
    mov: MovimentoVista,
    newVoceId: string | null,
    newLabel: string,
  ) {
    const oldVoceId = mov.voceRendicontoId;
    // Optimistic: rimuovo subito dalla lista corrente
    setMovimenti((prev) => prev.filter((x) => x.id !== mov.id));
    startTransition(async () => {
      try {
        await setVoceRendicontoMovimentoAction(mov.id, newVoceId);
        toast.success(newLabel, {
          position: "bottom-center",
          duration: 5000,
          action: {
            label: "Annulla",
            onClick: () => {
              startTransition(async () => {
                try {
                  await setVoceRendicontoMovimentoAction(mov.id, oldVoceId);
                  setMovimenti((prev) =>
                    prev.some((x) => x.id === mov.id) ? prev : [...prev, mov],
                  );
                  toast.success("Movimento ripristinato", {
                    position: "bottom-center",
                  });
                } catch (err) {
                  toast.error((err as Error).message);
                }
              });
            },
          },
        });
      } catch (err) {
        // rollback ottimistico
        setMovimenti((prev) =>
          prev.some((x) => x.id === mov.id) ? prev : [...prev, mov],
        );
        toast.error((err as Error).message);
      }
    });
  }

  function handleElimina(mov: MovimentoVista) {
    setMovimenti((prev) => prev.filter((x) => x.id !== mov.id));
    startTransition(async () => {
      try {
        await softDeleteMovimentoAction(mov.id);
        toast.success(`Movimento eliminato: ${mov.descrizione || "—"}`, {
          position: "bottom-center",
          duration: 5000,
          action: {
            label: "Annulla",
            onClick: () => {
              startTransition(async () => {
                try {
                  await restoreMovimentoAction(mov.id);
                  setMovimenti((prev) =>
                    prev.some((x) => x.id === mov.id) ? prev : [...prev, mov],
                  );
                  toast.success("Movimento ripristinato", {
                    position: "bottom-center",
                  });
                } catch (err) {
                  toast.error((err as Error).message);
                }
              });
            },
          },
        });
      } catch (err) {
        setMovimenti((prev) =>
          prev.some((x) => x.id === mov.id) ? prev : [...prev, mov],
        );
        toast.error((err as Error).message);
      }
    });
  }

  // Voci raggruppate per sezione per l'optgroup del select
  const vociBySezione = useMemo(() => {
    const map = new Map<SezioneRendiconto, VoceOpt[]>();
    for (const v of vociPerSposta) {
      if (!map.has(v.sezione)) map.set(v.sezione, []);
      map.get(v.sezione)!.push(v);
    }
    return map;
  }, [vociPerSposta]);

  return (
    <div>
      <Link href={`/rendiconto?anno=${anno}`} className="vd-back">
        <ArrowLeft className="w-3.5 h-3.5" />
        Torna al rendiconto
      </Link>

      <header className="vd-page-head">
        <div className="vd-page-title">
          <div className="vd-page-eyebrow">{eyebrow}</div>
          <h1 className="vd-page-h1">
            <span className="vd-code-pill">{voce.codice}</span>
            <span>{voce.label}</span>
          </h1>
          <p className="text-[12px] text-[var(--muted-foreground)] mt-2">
            {sectionTitle}
          </p>
        </div>
        <div className="vd-page-stats">
          <div className="vd-stat-card">
            <div className="vd-stat-label">Movimenti</div>
            <div className="vd-stat-value tabular-nums">
              {movimenti.length}
            </div>
          </div>
          <div className="vd-stat-card is-primary">
            <div className="vd-stat-label">Totale {anno}</div>
            <div className="vd-stat-value tabular-nums">
              {formatEur(totaleAnno)}
            </div>
          </div>
        </div>
      </header>

      <div className="vd-filterbar">
        <div className="vd-search">
          <Search />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca descrizione, conto, categoria…"
            autoComplete="off"
          />
        </div>
        <div className="vd-amount-range">
          <span>Importo&nbsp;da&nbsp;€</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={amin}
            onChange={(e) => setAmin(e.target.value)}
          />
          <span>a&nbsp;€</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="∞"
            value={amax}
            onChange={(e) => setAmax(e.target.value)}
          />
        </div>
        <div className="vd-periods" role="tablist" aria-label="Periodo">
          {(
            [
              ["all", "Tutto"],
              ["month", "Questo mese"],
              ["quarter", "Ultimo trimestre"],
              ["year", "Quest'anno"],
              ["custom", "Personalizzato"],
            ] as [Period, string][]
          ).map(([p, label]) => (
            <button
              key={p}
              type="button"
              className={`period-chip${period === p ? " is-active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" ? (
        <div className="vd-period-custom">
          <label className="vd-period-fld">
            <span>Dal</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="vd-period-fld">
            <span>Al</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      <div className="vd-summary">
        {movimenti.length === 0 ? (
          ""
        ) : filtered.length === movimenti.length ? (
          <>
            <b>{movimenti.length}</b> movimenti · {formatEur(totaleAnno)}
          </>
        ) : (
          <>
            <b>{filtered.length}</b> di {movimenti.length} movimenti ·{" "}
            {formatEur(totaleFiltrato)}
            <span className="text-[var(--muted-2)] ml-1.5">(filtro attivo)</span>
          </>
        )}
      </div>

      <div className="vd-list-card border border-[var(--border)] rounded-[var(--radius)] bg-[var(--card)] overflow-hidden">
        <table className="vd-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Data</th>
              <th>Descrizione</th>
              <th style={{ width: 90 }}>Conto</th>
              <th style={{ width: 180 }}>Categoria</th>
              <th className="text-right" style={{ width: 120 }}>
                Importo
              </th>
              <th className="text-right" style={{ width: 230 }}>
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? null : (
              groups.flatMap((g) => [
                <tr key={`m-${g.key}`} className="vd-month-row">
                  <td colSpan={6}>
                    <div className="vd-month-banner">
                      <span className="vd-month-banner-name">
                        {meseAnnoLabel(g.key).replace(/^./, (c) =>
                          c.toUpperCase(),
                        )}
                      </span>
                      <span className="vd-month-banner-meta">
                        {g.items.length} movimenti · {formatEur(g.total)}
                      </span>
                    </div>
                  </td>
                </tr>,
                ...g.items.map((m) => {
                  const isPos = m.tipo === "Entrata";
                  const sign = isPos ? "+" : "−";
                  return (
                    <tr key={m.id} className="vd-mov-row">
                      <td className="vd-mov-date">
                        {formatDateIt(m.dataMovimento)}
                      </td>
                      <td
                        className="vd-mov-desc"
                        title={m.descrizione}
                      >
                        {m.descrizione || (
                          <span className="italic text-[var(--muted-foreground)]">
                            (nessuna descrizione)
                          </span>
                        )}
                      </td>
                      <td className="vd-mov-conto">
                        <span className="account-chip">{m.conto}</span>
                      </td>
                      <td className="vd-mov-cat">{m.categoriaNome}</td>
                      <td
                        className={`vd-mov-amount ${isPos ? "pos" : "neg"}`}
                      >
                        {sign} {formatEur(m.importo)}
                      </td>
                      <td>
                        <div className="vd-mov-actions">
                          <select
                            className="vd-reassign"
                            disabled={pending}
                            value={voce.codice}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__none__") {
                                handleSposta(m, null, "Rimosso dalla voce");
                              } else if (val === voce.codice) {
                                return; // nessun cambio
                              } else {
                                const target = vociPerSposta.find(
                                  (v) => v.codice === val,
                                );
                                if (target) {
                                  handleSposta(
                                    m,
                                    target.id,
                                    `Spostato in ${target.codice} · ${target.label}`,
                                  );
                                }
                              }
                              // reset select alla voce corrente dopo l'azione
                              e.target.value = voce.codice;
                            }}
                            title="Sposta in un'altra voce"
                          >
                            <option value={voce.codice}>
                              Sposta in…
                            </option>
                            <option value="__none__">
                              — Rimuovi dalla voce —
                            </option>
                            {Array.from(vociBySezione.entries()).map(
                              ([sez, vs]) => (
                                <optgroup
                                  key={sez}
                                  label={sezioniTitoli[sez]}
                                >
                                  {vs.map((v) => (
                                    <option
                                      key={v.id}
                                      value={v.codice}
                                      disabled={v.codice === voce.codice}
                                    >
                                      {v.codice} · {v.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ),
                            )}
                          </select>
                          <button
                            type="button"
                            className="vd-del"
                            disabled={pending}
                            onClick={() => handleElimina(m)}
                            title="Elimina movimento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }),
              ])
            )}
          </tbody>
        </table>
        {groups.length === 0 ? (
          <div className="vd-empty">
            {movimenti.length === 0
              ? "Nessun movimento in questa voce per l'anno selezionato."
              : "Nessun movimento corrisponde ai filtri impostati."}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDateIt(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
