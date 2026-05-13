"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  setCategoriaMovimentoAction,
  setVoceRendicontoMovimentoAction,
} from "@/lib/actions/movimenti";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/utils";
import type { MezzoPagamento } from "@/lib/config";

interface CategoriaOpt {
  id: string;
  nome: string;
}

interface VoceOpt {
  id: string;
  codice: string;
  label: string;
}

interface Props {
  movimento: {
    id: string;
    dataMovimento?: string;
    descrizione?: string;
    conto: MezzoPagamento;
    tipo: "Entrata" | "Uscita";
    importo: number;
    categoriaId?: string;
    voceRendicontoId?: string;
  };
  categorie: CategoriaOpt[];
  voci: VoceOpt[];
}

export function MovimentoDaClassificareRow({
  movimento,
  categorie,
  voci,
}: Props) {
  const [categoriaValue, setCategoriaValue] = useState(
    movimento.categoriaId ?? "",
  );
  const [voceValue, setVoceValue] = useState(movimento.voceRendicontoId ?? "");
  const [pending, startTransition] = useTransition();

  function handleCategoriaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCategoriaValue(next);
    startTransition(async () => {
      try {
        await setCategoriaMovimentoAction(movimento.id, next || null);
        toast.success("Categoria aggiornata");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function handleVoceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setVoceValue(next);
    startTransition(async () => {
      try {
        await setVoceRendicontoMovimentoAction(movimento.id, next || null);
        toast.success("Voce assegnata");
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  const tipoLabel = movimento.tipo === "Entrata" ? "+" : "−";

  return (
    <li className="px-4 py-3 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 lg:items-center text-[12.5px] border-b border-[var(--border)]/40 last:border-b-0">
      <div className="lg:col-span-2 font-mono text-[12px] text-[var(--muted-foreground)]">
        {movimento.dataMovimento ?? "—"}
      </div>
      <div className="lg:col-span-3 min-w-0">
        <div
          className="truncate font-medium"
          title={movimento.descrizione ?? ""}
        >
          {movimento.descrizione || (
            <span className="italic text-[var(--muted-foreground)]">
              (nessuna descrizione)
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
          <span>{movimento.conto}</span>
          <span>·</span>
          <Badge
            variant={movimento.tipo === "Entrata" ? "success" : "warning"}
            className="text-[10px] py-0 px-1.5"
          >
            {tipoLabel} {formatEur(movimento.importo)}
          </Badge>
        </div>
      </div>
      <div className="lg:col-span-3">
        <select
          value={categoriaValue}
          onChange={handleCategoriaChange}
          disabled={pending}
          className="border border-[var(--border)] rounded h-8 px-2 text-[12px] bg-[var(--background)] w-full"
        >
          <option value="">— Nessuna categoria —</option>
          {categorie.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="lg:col-span-4">
        <select
          value={voceValue}
          onChange={handleVoceChange}
          disabled={pending}
          className="border border-[var(--border)] rounded h-8 px-2 text-[12px] bg-[var(--background)] w-full"
        >
          <option value="">— Voce ETS diretta (opzionale) —</option>
          {voci.map((v) => (
            <option key={v.id} value={v.id}>
              {v.codice} · {v.label}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
