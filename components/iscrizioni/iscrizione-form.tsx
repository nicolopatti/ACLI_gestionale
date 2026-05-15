"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createIscrizioneAction,
  updateIscrizioneAction,
} from "@/lib/actions/iscrizioni";
import {
  GIORNI_LABEL,
  type FasciaOraria,
  type GiornoSettimana,
} from "@/lib/config";
import { ActionButton, CheckIconAnimated } from "@/components/ui/action-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/utils";
import type {
  Attivita,
  Bambino,
  Iscrizione,
  ModalitaIscrizione,
  ScontoAttivita,
  Sessione,
} from "@/lib/db/types";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

interface Props {
  iscrizione?: Iscrizione;
  bambini: Bambino[];
  attivita: Attivita[];
  sessioniByAttivita: Record<string, Sessione[]>;
  modalitaByAttivita: Record<string, ModalitaIscrizione[]>;
  scontiByAttivita: Record<string, ScontoAttivita[]>;
  defaultBambinoId?: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface BreakdownInput {
  modalita: ModalitaIscrizione | undefined;
  isFlat: boolean;
  sessioniCount: number;
  applicaQuota: boolean;
  quotaIscrizioneAttivita: number | undefined;
  scontiDisponibili: ScontoAttivita[];
  scontiSelti: Set<string>;
}

interface Breakdown {
  subtotale: number;
  quota: number;
  sconti: Array<{ nome: string; importo: number }>;
  totale: number;
}

function computeBreakdown(input: BreakdownInput): Breakdown {
  const { modalita, isFlat, sessioniCount, applicaQuota,
    quotaIscrizioneAttivita, scontiDisponibili, scontiSelti } = input;
  if (!modalita) {
    return { subtotale: 0, quota: 0, sconti: [], totale: 0 };
  }
  const subtotale = isFlat
    ? modalita.importo
    : round2(modalita.importo * sessioniCount);
  const quota =
    applicaQuota && quotaIscrizioneAttivita != null ? quotaIscrizioneAttivita : 0;
  const imponibile = subtotale + quota;
  const sconti: Array<{ nome: string; importo: number }> = [];
  let scontiSum = 0;
  for (const sc of scontiDisponibili) {
    if (!scontiSelti.has(sc.recordId)) continue;
    const importo =
      sc.tipo === "percentuale"
        ? round2((imponibile * sc.valore) / 100)
        : round2(sc.valore);
    if (importo <= 0) continue;
    sconti.push({ nome: sc.nome, importo });
    scontiSum += importo;
  }
  const totale = round2(subtotale + quota - scontiSum);
  return { subtotale, quota, sconti, totale };
}

export function IscrizioneForm({
  iscrizione,
  bambini,
  attivita,
  sessioniByAttivita,
  modalitaByAttivita,
  scontiByAttivita,
  defaultBambinoId,
}: Props) {
  const action = iscrizione
    ? updateIscrizioneAction.bind(null, iscrizione.recordId)
    : createIscrizioneAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);
  const [success, setSuccess] = useState(false);
  const hasError = !!state?.error;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state?.ok) {
      setSuccess(true);
      const id = setTimeout(() => setSuccess(false), 1400);
      return () => clearTimeout(id);
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [bambinoId, setBambinoId] = useState(
    iscrizione?.bambinoId ?? defaultBambinoId ?? "",
  );
  const [attivitaId, setAttivitaId] = useState(iscrizione?.attivitaId ?? "");
  const [modalitaId, setModalitaId] = useState(iscrizione?.modalitaId ?? "");
  const [sessioniSelte, setSessioniSelte] = useState<Set<string>>(
    new Set(iscrizione?.sessioniSelteIds ?? []),
  );
  const [giorni, setGiorni] = useState<Set<GiornoSettimana>>(
    new Set(iscrizione?.giorniSettimana ?? []),
  );
  const [fasce, setFasce] = useState<Set<FasciaOraria>>(
    new Set(iscrizione?.fasceOrarie ?? []),
  );
  const [applicaQuota, setApplicaQuota] = useState<boolean>(
    () => {
      // In create: default = ON (se l'attivita ha quota).
      // In edit: deduco dallo stato esistente cercando una rata
      // quota_iscrizione tra le rate dell'iscrizione — ma le rate non sono
      // qui. Soluzione pragmatica: in edit l'utente vede la checkbox e puo'
      // decidere se mantenerla. Default OFF se gia' iscritto (no surprise).
      return !iscrizione;
    },
  );
  const [scontiSelti, setScontiSelti] = useState<Set<string>>(
    new Set(iscrizione?.scontiIds ?? []),
  );

  const attivitaSelezionata = attivita.find((a) => a.recordId === attivitaId);
  const sessioniDisponibili = useMemo(
    () => (attivitaId ? (sessioniByAttivita[attivitaId] ?? []) : []),
    [attivitaId, sessioniByAttivita],
  );
  const modalitaDisponibili = useMemo(
    () =>
      (attivitaId ? (modalitaByAttivita[attivitaId] ?? []) : []).filter(
        (m) => m.attivo || m.recordId === iscrizione?.modalitaId,
      ),
    [attivitaId, modalitaByAttivita, iscrizione?.modalitaId],
  );
  const scontiDisponibili = useMemo(
    () =>
      (attivitaId ? (scontiByAttivita[attivitaId] ?? []) : []).filter(
        (s) => s.attivo || scontiSelti.has(s.recordId),
      ),
    [attivitaId, scontiByAttivita, scontiSelti],
  );
  const modalitaSelezionata = modalitaDisponibili.find(
    (m) => m.recordId === modalitaId,
  );
  const isDoposcuola = attivitaSelezionata?.tipo === "doposcuola";
  const isFlat = modalitaSelezionata?.tipoPrezzo === "flat";
  const fasceOfferte = attivitaSelezionata?.fasceOrarie ?? [];
  const giorniOfferti = attivitaSelezionata?.giorniSettimana ?? [];

  // Auto-select di tutte le sessioni quando si passa a modalita "flat".
  // Le sessioni servono per /presenze (chi viene fisicamente alle attivita)
  // ma il loro count NON influenza il prezzo del pacchetto.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isFlat && sessioniSelte.size === 0 && sessioniDisponibili.length > 0) {
      setSessioniSelte(new Set(sessioniDisponibili.map((s) => s.recordId)));
    }
    // Volutamente: NON reagiamo al cambio di tipoPrezzo da flat -> per_sessione.
    // L'utente puo' deselezionare manualmente le sessioni superflue.
  }, [isFlat, sessioniDisponibili, sessioniSelte.size]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Calcolo del totale con breakdown. Niente useMemo: React Compiler
  // ottimizza automaticamente i calcoli "puri" sui props/state.
  const breakdown = computeBreakdown({
    modalita: modalitaSelezionata,
    isFlat,
    sessioniCount: sessioniSelte.size,
    applicaQuota,
    quotaIscrizioneAttivita: attivitaSelezionata?.quotaIscrizione,
    scontiDisponibili,
    scontiSelti,
  });

  const toggleSet = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bambinoId">Bambino</Label>
          <select
            id="bambinoId"
            name="bambinoId"
            required
            value={bambinoId}
            onChange={(e) => setBambinoId(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">— Seleziona —</option>
            {bambini.map((b) => (
              <option key={b.recordId} value={b.recordId}>
                {b.cognome} {b.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="attivitaId">Attività</Label>
          <select
            id="attivitaId"
            name="attivitaId"
            required
            value={attivitaId}
            onChange={(e) => {
              setAttivitaId(e.target.value);
              setSessioniSelte(new Set());
              setModalitaId("");
              setScontiSelti(new Set());
            }}
            className={SELECT_CLASS}
          >
            <option value="">— Seleziona —</option>
            {attivita.map((a) => (
              <option key={a.recordId} value={a.recordId}>
                {a.nome} ({a.tipo})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="modalitaId">Modalità di iscrizione</Label>
          <select
            id="modalitaId"
            name="modalitaId"
            required
            value={modalitaId}
            onChange={(e) => setModalitaId(e.target.value)}
            disabled={!attivitaSelezionata}
            className={SELECT_CLASS}
          >
            <option value="">
              {attivitaSelezionata
                ? modalitaDisponibili.length === 0
                  ? "— Nessuna modalità configurata —"
                  : "— Seleziona —"
                : "— Seleziona prima un'attività —"}
            </option>
            {modalitaDisponibili.map((m) => (
              <option key={m.recordId} value={m.recordId}>
                {m.nome} · {formatEur(m.importo)}
                {m.tipoPrezzo === "flat" ? " (pacchetto)" : " per sessione"}
              </option>
            ))}
          </select>
          {modalitaSelezionata?.descrizione && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {modalitaSelezionata.descrizione}
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dataIscrizione">Data iscrizione</Label>
          <Input
            id="dataIscrizione"
            name="dataIscrizione"
            type="date"
            defaultValue={iscrizione?.dataIscrizione ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {attivitaSelezionata && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              Sessioni ({sessioniSelte.size}/{sessioniDisponibili.length})
            </h2>
            <div className="flex items-center gap-2">
              {isFlat && (
                <Badge variant="secondary">prezzo flat</Badge>
              )}
              <Badge variant="outline">{attivitaSelezionata.tipo}</Badge>
            </div>
          </div>
          {sessioniDisponibili.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Questa attività non ha ancora sessioni configurate.
            </p>
          ) : (
            <>
              {isFlat && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Modalità a prezzo fisso: scegli le sessioni a cui il bambino
                  parteciperà (per le presenze). Il prezzo non dipende dal
                  numero di sessioni.
                </p>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                {sessioniDisponibili.map((s) => {
                  const checked = sessioniSelte.has(s.recordId);
                  const importoRiga = isFlat ? 0 : (modalitaSelezionata?.importo ?? 0);
                  return (
                    <label
                      key={s.recordId}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="sessioniSelteIds"
                          value={s.recordId}
                          checked={checked}
                          onChange={() =>
                            setSessioniSelte((prev) => toggleSet(prev, s.recordId))
                          }
                          className="h-4 w-4"
                        />
                        <span>
                          <span className="font-medium">{s.etichetta}</span>
                        </span>
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {isFlat ? "incluso" : formatEur(importoRiga)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {isDoposcuola && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Doposcuola
          </h2>
          {giorniOfferti.length === 0 || fasceOfferte.length === 0 ? (
            <p className="text-sm text-[var(--destructive)]">
              L&apos;attività selezionata non ha giorni o fasce orarie
              dichiarati. Apri la scheda Attività e completa i campi
              <strong> Giorni della settimana</strong> e
              <strong> Fasce orarie</strong> prima di iscrivere bambini.
            </p>
          ) : (
            <>
              <div>
                <Label className="mb-2 block">Giorni frequentati</Label>
                <div className="flex flex-wrap gap-3">
                  {giorniOfferti.map((g) => (
                    <label
                      key={g}
                      className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="giorniSettimana"
                        value={g}
                        checked={giorni.has(g)}
                        onChange={() => setGiorni((prev) => toggleSet(prev, g))}
                        className="h-4 w-4"
                      />
                      {GIORNI_LABEL[g]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Fasce orarie</Label>
                <div className="flex flex-wrap gap-3">
                  {fasceOfferte.map((f) => (
                    <label
                      key={f}
                      className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="fasceOrarie"
                        value={f}
                        checked={fasce.has(f)}
                        onChange={() => setFasce((prev) => toggleSet(prev, f))}
                        className="h-4 w-4"
                      />
                      {f}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  Per il pacchetto 14-18 spunta sia <code>14-16</code> sia <code>16-18</code>.
                </p>
              </div>
            </>
          )}
        </section>
      )}

      {attivitaSelezionata?.quotaIscrizione != null && (
        <section className="space-y-1">
          <label className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="applicaQuotaIscrizione"
              checked={applicaQuota}
              onChange={(e) => setApplicaQuota(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              Applica quota iscrizione una-tantum
              <span className="ml-1 font-medium">
                ({formatEur(attivitaSelezionata.quotaIscrizione)})
              </span>
            </span>
          </label>
        </section>
      )}

      {scontiDisponibili.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Sconti applicabili
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {scontiDisponibili.map((sc) => {
              const checked = scontiSelti.has(sc.recordId);
              const label =
                sc.tipo === "percentuale" ? `${sc.valore}%` : formatEur(sc.valore);
              return (
                <label
                  key={sc.recordId}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="scontiIds"
                      value={sc.recordId}
                      checked={checked}
                      onChange={() =>
                        setScontiSelti((prev) => toggleSet(prev, sc.recordId))
                      }
                      className="h-4 w-4"
                    />
                    <span>
                      <span className="font-medium">{sc.nome}</span>
                      {sc.descrizione && (
                        <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                          {sc.descrizione}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--destructive)] font-medium">
                    −{label}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={iscrizione?.note ?? ""} />
      </div>

      {modalitaSelezionata && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm space-y-1">
          <div className="font-medium uppercase text-xs tracking-wide text-[var(--muted-foreground)] mb-2">
            Anteprima totale
          </div>
          <div className="flex justify-between">
            <span>
              {isFlat
                ? "Pacchetto"
                : `Sessioni (${sessioniSelte.size} × ${formatEur(modalitaSelezionata.importo)})`}
            </span>
            <span className="tabular-nums">{formatEur(breakdown.subtotale)}</span>
          </div>
          {breakdown.quota > 0 && (
            <div className="flex justify-between">
              <span>Quota iscrizione</span>
              <span className="tabular-nums">{formatEur(breakdown.quota)}</span>
            </div>
          )}
          {breakdown.sconti.map((s) => (
            <div
              key={s.nome}
              className="flex justify-between text-[var(--destructive)]"
            >
              <span>Sconto: {s.nome}</span>
              <span className="tabular-nums">−{formatEur(s.importo)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-[var(--border)] pt-1 mt-1 font-semibold">
            <span>Totale</span>
            <span className="tabular-nums">{formatEur(breakdown.totale)}</span>
          </div>
        </div>
      )}

      {state?.error ? (
        <p className="text-sm text-[var(--destructive)] field-error" key={state.error}>
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="flex items-center gap-1.5 text-sm text-[var(--success-soft-ink)]">
          <CheckIconAnimated /> Salvato.
        </p>
      ) : null}
      <ActionButton
        type="submit"
        pending={pending}
        success={success}
        error={hasError && !pending}
        pendingText="Salvataggio…"
      >
        {iscrizione ? "Aggiorna" : "Crea iscrizione"}
      </ActionButton>
    </form>
  );
}
