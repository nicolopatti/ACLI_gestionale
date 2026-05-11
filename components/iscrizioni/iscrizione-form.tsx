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
  Sessione,
} from "@/lib/airtable/types";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

interface Props {
  iscrizione?: Iscrizione;
  bambini: Bambino[];
  attivita: Attivita[];
  sessioniByAttivita: Record<string, Sessione[]>;
  modalitaByAttivita: Record<string, ModalitaIscrizione[]>;
  defaultBambinoId?: string;
}

export function IscrizioneForm({
  iscrizione,
  bambini,
  attivita,
  sessioniByAttivita,
  modalitaByAttivita,
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
  const modalitaSelezionata = modalitaDisponibili.find((m) => m.recordId === modalitaId);
  const isDoposcuola = attivitaSelezionata?.tipo === "doposcuola";
  // Le fasce/giorni offerti dipendono dall'Attività selezionata (campi
  // dichiarati su `Attivita.fasce_orarie` e `Attivita.giorni_settimana`).
  const fasceOfferte = attivitaSelezionata?.fasceOrarie ?? [];
  const giorniOfferti = attivitaSelezionata?.giorniSettimana ?? [];

  const totale = useMemo(() => {
    if (!modalitaSelezionata) return 0;
    return sessioniSelte.size * modalitaSelezionata.importo;
  }, [sessioniSelte, modalitaSelezionata]);

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
                {m.nome} · {formatEur(m.importo)} per sessione
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
            <Badge variant="outline">{attivitaSelezionata.tipo}</Badge>
          </div>
          {sessioniDisponibili.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Questa attività non ha ancora sessioni configurate.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {sessioniDisponibili.map((s) => {
                const checked = sessioniSelte.has(s.recordId);
                const importo = modalitaSelezionata?.importo ?? 0;
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
                      {formatEur(importo)}
                    </span>
                  </label>
                );
              })}
            </div>
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

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={iscrizione?.note ?? ""} />
      </div>

      {modalitaSelezionata && sessioniSelte.size > 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Verranno create <strong>{sessioniSelte.size}</strong> rate per un totale di{" "}
          <strong>{formatEur(totale)}</strong>.
        </p>
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
