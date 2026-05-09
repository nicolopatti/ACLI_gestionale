"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

/**
 * Button con feedback di stato visibile a colpo d'occhio.
 *
 * - `pending`  → spinner + label opzionale "Salvataggio…", barra animata che
 *                attraversa il bottone, click disabilitato.
 * - `success`  → flash verde con check disegnato per ~1.4s, poi torna allo stato
 *                normale. È utile passarlo via `useActionFeedback`.
 * - `error`    → micro-shake + bordo rosso per ~0.4s, poi torna normale.
 *
 * Importante: il componente NON resetta da solo `success` o `error`. Chi lo
 * usa è responsabile di farli tornare a `false` dopo un timeout (di solito è
 * `useActionFeedback` che lo fa per te).
 */
export interface ActionButtonProps extends ButtonProps {
  pending?: boolean;
  success?: boolean;
  error?: boolean;
  pendingText?: React.ReactNode;
  successText?: React.ReactNode;
  /** Icona mostrata quando lo stato è "idle". Default: niente. */
  idleIcon?: React.ReactNode;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      pending = false,
      success = false,
      error = false,
      pendingText,
      successText = "Salvato",
      idleIcon,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const showSuccess = success && !pending;
    const showError = error && !pending && !success;

    const content = pending ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>{pendingText ?? children}</span>
      </>
    ) : showSuccess ? (
      <>
        <CheckIconAnimated />
        <span>{successText}</span>
      </>
    ) : (
      <>
        {idleIcon}
        {children}
      </>
    );

    return (
      <Button
        ref={ref}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        aria-live={pending || showSuccess || showError ? "polite" : undefined}
        className={cn(
          "btn-tactile",
          pending && "btn-pending",
          showSuccess && "btn-success",
          showError && "btn-error",
          className,
        )}
        {...rest}
      >
        {content}
      </Button>
    );
  },
);
ActionButton.displayName = "ActionButton";

/**
 * Checkmark SVG con stroke disegnato in 0.32s. Usato sia da ActionButton sia
 * dai pannelli "operazione completata" (non solo dentro al bottone).
 */
export function CheckIconAnimated({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("acli-check-svg", className)}
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
