"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterBar, FilterSearch, FilterSelect } from "@/components/ui/filterbar";
import { MEZZI_PAGAMENTO } from "@/lib/config";

export interface CassaFiltersProps {
  categorie: { id: string; nome: string; tipo: "Entrata" | "Uscita" }[];
}

export function CassaFilters({ categorie }: CassaFiltersProps) {
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
        placeholder="Cerca descrizione, categoria o volontario…"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => setParam("q", e.currentTarget.value)}
      />
      <FilterSelect
        defaultValue={sp.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.currentTarget.value)}
        aria-label="Filtra per tipo"
      >
        <option value="">Tipo: tutti</option>
        <option value="Entrata">Entrate</option>
        <option value="Uscita">Uscite</option>
      </FilterSelect>
      <FilterSelect
        defaultValue={sp.get("conto") ?? ""}
        onChange={(e) => setParam("conto", e.currentTarget.value)}
        aria-label="Filtra per conto"
      >
        <option value="">Conto: tutti</option>
        {MEZZI_PAGAMENTO.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        defaultValue={sp.get("categoria") ?? ""}
        onChange={(e) => setParam("categoria", e.currentTarget.value)}
        aria-label="Filtra per categoria"
      >
        <option value="">Categoria: tutte</option>
        {categorie.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </FilterSelect>
    </FilterBar>
  );
}
