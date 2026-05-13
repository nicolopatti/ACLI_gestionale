"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setVoceRendicontoDefaultAction } from "@/lib/actions/categorie";
import { Badge } from "@/components/ui/badge";

interface VoceOpt {
  id: string;
  codice: string;
  label: string;
  sezione: string;
}

interface Props {
  categoria: {
    id: string;
    nome: string;
    tipo: "Entrata" | "Uscita";
    voceRendicontoDefaultId?: string;
  };
  voci: VoceOpt[];
}

export function CategoriaRow({ categoria, voci }: Props) {
  const [value, setValue] = useState(categoria.voceRendicontoDefaultId ?? "");
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);
    startTransition(async () => {
      try {
        await setVoceRendicontoDefaultAction(categoria.id, next || null);
        toast.success(`Voce aggiornata per ${categoria.nome}`);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <li className="px-5 py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[160px]">
        <div className="text-[13.5px] font-medium">{categoria.nome}</div>
        <Badge
          variant={categoria.tipo === "Entrata" ? "success" : "warning"}
          className="mt-0.5"
        >
          {categoria.tipo}
        </Badge>
      </div>
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="border border-[var(--border)] rounded h-9 px-2 text-sm bg-[var(--background)] min-w-[280px]"
      >
        <option value="">— Nessuna voce di rendiconto —</option>
        {voci.map((v) => (
          <option key={v.id} value={v.id}>
            {v.codice} · {v.label}
          </option>
        ))}
      </select>
      <span className="text-[11.5px] text-[var(--muted-foreground)] min-w-[60px]">
        {pending ? "Salvataggio…" : ""}
      </span>
    </li>
  );
}
