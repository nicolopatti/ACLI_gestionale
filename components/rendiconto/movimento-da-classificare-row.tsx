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
    <li className="nonclass-row">
      <div className="date">{movimento.dataMovimento ?? "—"}</div>
      <div className="min-w-0">
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
        <div className="meta">
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
      <div>
        <select
          value={categoriaValue}
          onChange={handleCategoriaChange}
          disabled={pending}
          className="mini-select"
        >
          <option value="">— Nessuna categoria —</option>
          {categorie.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={voceValue}
          onChange={handleVoceChange}
          disabled={pending}
          className="mini-select"
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
