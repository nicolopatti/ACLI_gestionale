"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
  anniDisponibili: number[];
  annoCorrente: number;
}

/**
 * Selettore anno per il chart entrate/uscite. Aggiorna il query param
 * `anno` preservando gli altri filtri della pagina. Default: anno solare
 * corrente, anche se l'utente non lo passa esplicitamente.
 */
export function AnnoSwitcher({ anniDisponibili, annoCorrente }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pickAnno(anno: number) {
    const next = new URLSearchParams(sp.toString());
    if (anno === new Date().getFullYear()) {
      next.delete("anno");
    } else {
      next.set("anno", String(anno));
    }
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] p-0.5"
      aria-disabled={pending}
    >
      {anniDisponibili.map((y) => {
        const active = y === annoCorrente;
        return (
          <button
            key={y}
            type="button"
            onClick={() => pickAnno(y)}
            className={
              "px-2 py-1 text-[12px] rounded-sm font-medium transition-colors " +
              (active
                ? "bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")
            }
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}
