"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Forma minima di una server action result. Lasciata volutamente lasca: alcune
 * action ritornano solo `{ error }` su fallimento e `undefined` (o redirect) su
 * successo, altre ritornano `{ ok: true, ... }`. L'hook gestisce entrambi i
 * pattern.
 */
export interface ActionResult {
  ok?: boolean;
  error?: string;
}

interface Options {
  /** Toast mostrato in caso di esito positivo. Passa `null` per non mostrarlo. */
  successToast?: string | null;
  /**
   * Callback invocata SOLO se l'azione torna `ok: true`. Riceve il risultato
   * intero. Tipico uso: chiudere il dialog, resettare il form, ecc.
   */
  onSuccess?: (res: ActionResult) => void;
  /**
   * Durata in ms dello stato "success" prima di tornare in idle. Default: 1400ms,
   * abbastanza lungo da farlo notare ma corto abbastanza da non bloccare.
   */
  successDurationMs?: number;
  /** Durata in ms dello stato "error". Default: 600ms (lo shake basta). */
  errorDurationMs?: number;
}

/**
 * Hook che gestisce il ciclo di vita di una server action e ne segnala l'esito
 * con toast + flag visivi (`pending` / `success` / `error`) da inoltrare a
 * `<ActionButton />`.
 *
 * Usage:
 * ```tsx
 * const fb = useActionFeedback({ successToast: "Salvato", onSuccess: () => onOpenChange(false) });
 *
 * <ActionButton pending={fb.pending} success={fb.success} error={fb.error}
 *   onClick={() => fb.run(() => myAction(undefined, formData))}>
 *   Conferma
 * </ActionButton>
 * ```
 *
 * Nota: il toast è mostrato sempre dall'hook in caso di errore (con il messaggio
 * lato server), e in caso di successo se `successToast` è una stringa truthy.
 */
export function useActionFeedback(options: Options = {}) {
  const {
    successToast,
    onSuccess,
    successDurationMs = 1400,
    errorDurationMs = 600,
  } = options;

  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  // Ricordo l'ultimo timer per pulirlo se l'utente ri-clicca prima del reset.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const run = useCallback(
    (fn: () => Promise<ActionResult | undefined | void>) => {
      // Reset immediato per evitare di mostrare l'esito vecchio sul nuovo run.
      if (timerRef.current) clearTimeout(timerRef.current);
      setSuccess(false);
      setError(false);

      startTransition(async () => {
        try {
          const res = (await fn()) as ActionResult | undefined;
          const isError = !!res && typeof res === "object" && "error" in res && res.error;
          if (isError) {
            setError(true);
            toast.error(String(res!.error));
            timerRef.current = setTimeout(() => {
              setError(false);
              timerRef.current = null;
            }, errorDurationMs);
          } else {
            // Sia `{ ok: true, ... }` che `undefined` (azione che redirige
            // o non ritorna nulla) sono trattati come successo.
            setSuccess(true);
            if (successToast) toast.success(successToast);
            if (res) onSuccess?.(res);
            else onSuccess?.({ ok: true });
            timerRef.current = setTimeout(() => {
              setSuccess(false);
              timerRef.current = null;
            }, successDurationMs);
          }
        } catch (e) {
          setError(true);
          const msg =
            e instanceof Error ? e.message : "Errore inatteso. Riprova.";
          toast.error(msg);
          timerRef.current = setTimeout(() => {
            setError(false);
            timerRef.current = null;
          }, errorDurationMs);
        }
      });
    },
    [onSuccess, successToast, successDurationMs, errorDurationMs],
  );

  return { pending, success, error, run };
}
