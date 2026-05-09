"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterBar, FilterSearch, FilterSelect } from "@/components/ui/filterbar";

export interface BambiniFiltersProps {
  scuole: string[];
  classi: string[];
  attivita: { id: string; nome: string }[];
}

export function BambiniFilters({ scuole, classi, attivita }: BambiniFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <FilterBar>
      <FilterSearch
        placeholder="Cerca nome, cognome o genitore…"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => setParam("q", e.currentTarget.value)}
      />
      <FilterSelect
        defaultValue={sp.get("scuola") ?? ""}
        onChange={(e) => setParam("scuola", e.currentTarget.value)}
        aria-label="Filtra per scuola"
      >
        <option value="">Tutte le scuole</option>
        {scuole.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        defaultValue={sp.get("classe") ?? ""}
        onChange={(e) => setParam("classe", e.currentTarget.value)}
        aria-label="Filtra per classe"
      >
        <option value="">Tutte le classi</option>
        {classi.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        defaultValue={sp.get("attivita") ?? ""}
        onChange={(e) => setParam("attivita", e.currentTarget.value)}
        aria-label="Filtra per attività"
      >
        <option value="">Tutte le attività</option>
        {attivita.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
          </option>
        ))}
      </FilterSelect>
    </FilterBar>
  );
}
