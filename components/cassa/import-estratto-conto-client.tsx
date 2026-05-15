"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEur } from "@/lib/utils";
import { MEZZI_PAGAMENTO, type MezzoPagamento } from "@/lib/config";
import {
  parseEstrattoContoAction,
  confermaImportAction,
  type ParseAndDedupResult,
} from "@/app/(dashboard)/cassa/import/actions";

interface CategoriaOpt {
  id: string;
  nome: string;
  tipo: "Entrata" | "Uscita";
  voceRendicontoDefaultId?: string;
}

interface VoceOpt {
  id: string;
  codice: string;
  tipo: "Entrata" | "Uscita";
  sezione: string;
  label: string;
}

interface Props {
  categorie: CategoriaOpt[];
  voci: VoceOpt[];
}

// SECURITY_PLAN sessione 2: hardening upload.
// Limite duplicato server-side in app/(dashboard)/cassa/import/actions.ts
// (client-side e' bypassabile via curl/devtools, ma blocca i mistake comuni).
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".xls", ".txt"];

function getFileExtension(name: string): string {
  const idx = name.toLowerCase().lastIndexOf(".");
  return idx >= 0 ? name.toLowerCase().slice(idx) : "";
}

function validateUploadedFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File troppo grande (max ${MAX_FILE_SIZE / 1024 / 1024} MB).`;
  }
  if (!ALLOWED_EXTENSIONS.includes(getFileExtension(file.name))) {
    return `Formato non supportato. Usa CSV/TSV/XLS/TXT.`;
  }
  return null;
}

interface RowOverride {
  importa: boolean;
  categoriaId: string;
  voceRendicontoId: string;
  isGiroconto: boolean;
  note: string;
}

export function ImportEstrattoContoClient({ categorie, voci }: Props) {
  const [conto, setConto] = useState<MezzoPagamento>("BCC");
  const [fileName, setFileName] = useState<string>("");
  const [parseResult, setParseResult] = useState<ParseAndDedupResult | null>(null);
  const [overrides, setOverrides] = useState<RowOverride[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const categorieByName = useMemo(() => {
    const m = new Map<string, CategoriaOpt>();
    for (const c of categorie) {
      m.set(`${c.tipo}|${c.nome.toLowerCase()}`, c);
    }
    return m;
  }, [categorie]);

  const voceByCodice = useMemo(() => {
    const m = new Map<string, VoceOpt>();
    for (const v of voci) m.set(v.codice, v);
    return m;
  }, [voci]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const validationError = validateUploadedFile(f);
    if (validationError) {
      setError(validationError);
      setFileName("");
      e.target.value = "";
      return;
    }
    setError(null);
    setFileName(f.name);
    const name = f.name.toLowerCase();
    if (name.endsWith(".xls") || name.includes("export_")) {
      setConto("BCC");
    } else if (name.includes("resoconto") || name.includes("sumup")) {
      setConto("Sumup");
    }
  }

  async function handleAnteprima(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Seleziona un file");
      return;
    }
    const validationError = validateUploadedFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const text = await file.text();
    startTransition(async () => {
      const res = await parseEstrattoContoAction(conto, text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setParseResult(res);
      // Il server puo' aver rilevato un conto diverso da quello selezionato
      // (auto-detect basato sul contenuto del file). Allinea lo state UI.
      if (res.conto !== conto) setConto(res.conto);
      // Inizializza overrides dalle suggerimenti
      const init: RowOverride[] = res.righe.map((r, i) => {
        const sugg = res.suggerimenti[i];
        const match = res.matches[i];
        const cat = sugg.categoriaNome
          ? categorieByName.get(`${r.tipo}|${sugg.categoriaNome.toLowerCase()}`)
          : undefined;
        const voceFromCodice = sugg.voceRendicontoCodice
          ? voceByCodice.get(sugg.voceRendicontoCodice)
          : undefined;
        // Importa di default solo righe NEW; salta dup/match esatti
        const importa =
          match.status === "new" || match.status === "match_partial"
            ? match.status === "new"
            : false;
        return {
          importa,
          categoriaId: cat?.id ?? "",
          voceRendicontoId:
            voceFromCodice?.id ?? cat?.voceRendicontoDefaultId ?? "",
          isGiroconto: sugg.isGiroconto,
          note: sugg.reason,
        };
      });
      setOverrides(init);
    });
  }

  function updateOverride(i: number, patch: Partial<RowOverride>) {
    setOverrides((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      // Se cambia categoria, allinea voce al default categoria se voce è vuota
      if (patch.categoriaId !== undefined) {
        const c = categorie.find((c) => c.id === patch.categoriaId);
        if (c?.voceRendicontoDefaultId && !next[i].voceRendicontoId) {
          next[i].voceRendicontoId = c.voceRendicontoDefaultId;
        }
      }
      return next;
    });
  }

  async function handleConferma() {
    if (!parseResult) return;
    setError(null);
    const righe = parseResult.righe
      .map((r, i) => ({ r, o: overrides[i], i }))
      .filter(({ o }) => o.importa)
      .map(({ r, o }) => ({
        dataValuta: r.dataValuta,
        tipo: r.tipo,
        importo: r.importo,
        descrizione: r.descrizione,
        fingerprint: r.fingerprint,
        categoriaId: o.categoriaId || undefined,
        voceRendicontoId: o.voceRendicontoId || undefined,
        isGiroconto: o.isGiroconto,
        note: o.note || undefined,
      }));
    if (righe.length === 0) {
      setError("Nessuna riga selezionata per l'import");
      return;
    }
    startTransition(async () => {
      const res = await confermaImportAction({ conto, righe });
      if (!res.ok) {
        setError(res.error ?? "Errore durante l'import");
        toast.error(res.error ?? "Errore durante l'import");
        return;
      }
      toast.success(`Importate ${res.inserted} righe`);
      setParseResult(null);
      setFileName("");
      setOverrides([]);
    });
  }

  if (!parseResult) {
    return <UploadStep
      conto={conto}
      setConto={setConto}
      fileName={fileName}
      handleFileChange={handleFileChange}
      handleAnteprima={handleAnteprima}
      pending={pending}
      error={error}
    />;
  }

  const stats = {
    totali: parseResult.righe.length,
    nuove: parseResult.matches.filter((m) => m.status === "new").length,
    dup: parseResult.matches.filter((m) => m.status === "duplicate").length,
    matchEx: parseResult.matches.filter((m) => m.status === "match_exact").length,
    dubbi: parseResult.matches.filter((m) => m.status === "match_partial").length,
    daImportare: overrides.filter((o) => o.importa).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
        <div className="font-medium">
          {fileName} → {conto}
        </div>
        <div className="text-[var(--muted-foreground)]">
          {stats.totali} righe lette · {stats.nuove} nuove · {stats.matchEx} già
          presenti · {stats.dubbi} dubbi · {stats.dup} duplicati nel file
        </div>
      </div>

      {parseResult.warnings.length > 0 ? (
        <div className="rounded-md bg-[var(--warning-bg,#fff3cd)] border border-[var(--warning,#ffc107)] px-3 py-2 text-[12.5px]">
          {parseResult.warnings.slice(0, 5).map((w, i) => (
            <div key={i}>· {w}</div>
          ))}
          {parseResult.warnings.length > 5 ? (
            <div>… {parseResult.warnings.length - 5} altri warning</div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-separate border-spacing-y-1">
          <thead className="text-[var(--muted-foreground)] text-left">
            <tr>
              <th className="px-2 py-1.5 w-8">✓</th>
              <th className="px-2 py-1.5">Stato</th>
              <th className="px-2 py-1.5">Data</th>
              <th className="px-2 py-1.5 text-right">Importo</th>
              <th className="px-2 py-1.5">Descrizione</th>
              <th className="px-2 py-1.5">Categoria</th>
              <th className="px-2 py-1.5">Voce ETS</th>
              <th className="px-2 py-1.5">Giroc.</th>
            </tr>
          </thead>
          <tbody>
            {parseResult.righe.map((r, i) => {
              const o = overrides[i];
              const m = parseResult.matches[i];
              const tipoCat = r.tipo;
              const cats = categorie.filter((c) => c.tipo === tipoCat);
              const vocesT = voci.filter((v) => v.tipo === tipoCat);
              const status = m.status;
              return (
                <tr
                  key={`${r.fingerprint}-${i}`}
                  className={
                    status === "duplicate" || status === "match_exact"
                      ? "opacity-50"
                      : ""
                  }
                >
                  <td className="px-2 py-1 align-top">
                    <input
                      type="checkbox"
                      checked={o.importa}
                      onChange={(e) =>
                        updateOverride(i, { importa: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <StatoBadge status={status} />
                    {o.note ? (
                      <div className="text-[10.5px] text-[var(--muted-foreground)] mt-0.5">
                        {o.note}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-1 align-top whitespace-nowrap">
                    {formatDate(r.dataValuta)}
                  </td>
                  <td
                    className={
                      "px-2 py-1 align-top text-right font-mono tabular-nums whitespace-nowrap " +
                      (r.tipo === "Entrata"
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]")
                    }
                  >
                    {r.tipo === "Uscita" ? "−" : "+"} {formatEur(r.importo)}
                  </td>
                  <td className="px-2 py-1 align-top max-w-[24ch]">
                    <div className="truncate" title={r.descrizione}>
                      {r.descrizione}
                    </div>
                  </td>
                  <td className="px-2 py-1 align-top">
                    <select
                      className="border border-[var(--border)] rounded px-1.5 py-1 bg-[var(--background)] text-[12px] w-full max-w-[18ch]"
                      value={o.categoriaId}
                      onChange={(e) =>
                        updateOverride(i, {
                          categoriaId: e.target.value,
                          voceRendicontoId: "",
                        })
                      }
                      disabled={o.isGiroconto}
                    >
                      <option value="">—</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 align-top">
                    <select
                      className="border border-[var(--border)] rounded px-1.5 py-1 bg-[var(--background)] text-[12px] w-full max-w-[24ch]"
                      value={o.voceRendicontoId}
                      onChange={(e) =>
                        updateOverride(i, { voceRendicontoId: e.target.value })
                      }
                      disabled={o.isGiroconto}
                    >
                      <option value="">—</option>
                      {vocesT.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.codice} · {v.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 align-top text-center">
                    <input
                      type="checkbox"
                      checked={o.isGiroconto}
                      onChange={(e) =>
                        updateOverride(i, { isGiroconto: e.target.checked })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? (
        <div className="text-[12.5px] text-[var(--danger)]">{error}</div>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            setParseResult(null);
            setOverrides([]);
          }}
          disabled={pending}
        >
          ← Cambia file
        </Button>
        <Button
          type="button"
          onClick={handleConferma}
          disabled={pending || stats.daImportare === 0}
        >
          {pending
            ? "Sto importando…"
            : `Importa ${stats.daImportare} righe`}
        </Button>
      </div>
    </div>
  );
}

function StatoBadge({ status }: { status: string }) {
  switch (status) {
    case "new":
      return <Badge variant="success">Nuovo</Badge>;
    case "match_exact":
      return <Badge variant="secondary">Già presente</Badge>;
    case "match_partial":
      return <Badge variant="warning">Dubbio</Badge>;
    case "duplicate":
      return <Badge variant="outline">Duplicato</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

interface UploadStepProps {
  conto: MezzoPagamento;
  setConto: (c: MezzoPagamento) => void;
  fileName: string;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnteprima: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  error: string | null;
}

function UploadStep({
  conto,
  setConto,
  fileName,
  handleFileChange,
  handleAnteprima,
  pending,
  error,
}: UploadStepProps) {
  return (
    <form onSubmit={handleAnteprima} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="conto-select">Conto</Label>
        <select
          id="conto-select"
          className="border border-[var(--border)] rounded-md h-9 px-2 bg-[var(--background)] text-sm w-full"
          value={conto}
          onChange={(e) => setConto(e.target.value as MezzoPagamento)}
        >
          {MEZZI_PAGAMENTO.filter((m) => m !== "Cassa").map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <p className="text-[11.5px] text-[var(--muted-foreground)]">
          BCC: export <code>.xls</code> (tab-separato). SumUp: export{" "}
          <code>.csv</code>.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file-input">File estratto conto</Label>
        <input
          id="file-input"
          name="file"
          type="file"
          accept=".csv,.xls,.tsv,.txt"
          onChange={handleFileChange}
          className="block w-full text-[12.5px] file:mr-3 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--background)] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:hover:bg-[var(--accent)]"
          required
        />
        {fileName ? (
          <p className="text-[11.5px] text-[var(--muted-foreground)]">
            Selezionato: {fileName}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="text-[12.5px] text-[var(--danger)]">{error}</div>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sto leggendo il file…" : "Anteprima →"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/cassa">Annulla</Link>
        </Button>
      </div>
    </form>
  );
}
