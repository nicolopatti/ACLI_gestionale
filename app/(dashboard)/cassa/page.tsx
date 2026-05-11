import { auth } from "@/lib/auth/auth";
import { listMovimenti } from "@/lib/airtable/movimenti";
import { listCategorie } from "@/lib/airtable/categorie";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CassaFilters } from "@/components/cassa/cassa-filters";
import { formatDate, formatEur } from "@/lib/utils";
import { MEZZI_PAGAMENTO, type MezzoPagamento } from "@/lib/config";
import type { Movimento } from "@/lib/airtable/types";

interface ContoTotali {
  entrate: number;
  uscite: number;
  saldo: number;
}

function emptyContoTotali(): ContoTotali {
  return { entrate: 0, uscite: 0, saldo: 0 };
}

function aggregaPerConto(
  movimenti: Movimento[],
): Record<MezzoPagamento, ContoTotali> {
  const tot: Record<MezzoPagamento, ContoTotali> = {
    Cassa: emptyContoTotali(),
    BCC: emptyContoTotali(),
    Sumup: emptyContoTotali(),
  };
  for (const m of movimenti) {
    if (m.tipo === "Entrata") tot[m.conto].entrate += m.importo;
    else tot[m.conto].uscite += m.importo;
  }
  for (const k of MEZZI_PAGAMENTO) tot[k].saldo = tot[k].entrate - tot[k].uscite;
  return tot;
}

function aggregaTotale(
  movimenti: Movimento[],
): ContoTotali {
  const t = emptyContoTotali();
  for (const m of movimenti) {
    if (m.tipo === "Entrata") t.entrate += m.importo;
    else t.uscite += m.importo;
  }
  t.saldo = t.entrate - t.uscite;
  return t;
}

function isTipo(v: string | undefined): v is "Entrata" | "Uscita" {
  return v === "Entrata" || v === "Uscita";
}

function isConto(v: string | undefined): v is MezzoPagamento {
  return v === "Cassa" || v === "BCC" || v === "Sumup";
}

export default async function CassaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    conto?: string;
    categoria?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const isAdmin = session?.user?.ruolo === "admin";
  const telegramUserId = session?.user?.telegramUserId;

  const q = (sp.q ?? "").trim().toLowerCase();
  const tipoSel = isTipo(sp.tipo) ? sp.tipo : undefined;
  const contoSel = isConto(sp.conto) ? sp.conto : undefined;
  const categoriaSel = sp.categoria ?? "";

  const [movimenti, categorie] = await Promise.all([
    listMovimenti({ ...(isAdmin ? {} : { telegramUserId }), limit: 1000 }),
    listCategorie(),
  ]);
  const categoriaById = new Map(categorie.map((c) => [c.recordId, c] as const));

  // KPI per conto = unfiltered (saldo reale di ciascun conto)
  const totaliConto = aggregaPerConto(movimenti);
  const totaleGenerale = aggregaTotale(movimenti);

  // Movimenti filtrati per la tabella + footer periodo
  const filtered = movimenti.filter((m) => {
    if (tipoSel && m.tipo !== tipoSel) return false;
    if (contoSel && m.conto !== contoSel) return false;
    if (categoriaSel && m.categoriaId !== categoriaSel) return false;
    if (q) {
      const cat = m.categoriaId ? categoriaById.get(m.categoriaId)?.nome ?? "" : "";
      const hay = [m.descrizione ?? "", cat, m.volontario ?? "", m.note ?? ""]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const periodo = aggregaTotale(filtered);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cassa</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(MEZZI_PAGAMENTO).map((conto) => (
          <Card key={conto}>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                {conto}
              </p>
              <p className="text-2xl font-semibold tabular-nums mt-1">
                {formatEur(totaliConto[conto].saldo)}
              </p>
              <p className="mt-2 text-[11.5px] text-[var(--muted-foreground)]">
                <span className="text-[var(--success)]">
                  + {formatEur(totaliConto[conto].entrate)}
                </span>
                <span className="mx-1.5 text-[var(--muted-2)]">·</span>
                <span className="text-[var(--danger)]">
                  − {formatEur(totaliConto[conto].uscite)}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-[var(--primary-soft)] border-[var(--primary-soft-ink)]/20">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--primary-soft-ink)] uppercase tracking-wide">
              Saldo totale
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1 text-[var(--primary-soft-ink)]">
              {formatEur(totaleGenerale.saldo)}
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--primary-soft-ink)]/80">
              + {formatEur(totaleGenerale.entrate)} · − {formatEur(totaleGenerale.uscite)}
            </p>
          </CardContent>
        </Card>
      </div>

      <CassaFilters
        categorie={categorie.map((c) => ({ id: c.recordId, nome: c.nome, tipo: c.tipo }))}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Conto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrizione</TableHead>
                {isAdmin && <TableHead>Volontario</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center text-[var(--muted-foreground)] py-8"
                  >
                    {movimenti.length === 0
                      ? isAdmin
                        ? "Nessun movimento. Il workflow di sync non ha ancora importato dati dal foglio."
                        : "Nessun movimento registrato dal tuo account Telegram."
                      : "Nessun movimento corrisponde ai filtri."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.recordId}>
                    <TableCell className="whitespace-nowrap">{formatDate(m.dataMovimento)}</TableCell>
                    <TableCell>
                      {m.tipo === "Entrata" ? (
                        <Badge variant="success">Entrata</Badge>
                      ) : (
                        <Badge variant="warning">Uscita</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-right tabular-nums">
                      {m.tipo === "Uscita" ? "−" : "+"} {formatEur(m.importo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.conto}</Badge>
                    </TableCell>
                    <TableCell>
                      {m.categoriaId ? categoriaById.get(m.categoriaId)?.nome ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{m.descrizione ?? "—"}</TableCell>
                    {isAdmin && <TableCell>{m.volontario ?? "—"}</TableCell>}
                  </TableRow>
                ))
              )}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-[12px] text-[var(--muted-foreground)]">
                    Totali periodo ({filtered.length} movimenti)
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    <span className="text-[var(--success)]">+ {formatEur(periodo.entrate)}</span>
                    <span className="text-[var(--muted-2)] mx-1.5">·</span>
                    <span className="text-[var(--danger)]">− {formatEur(periodo.uscite)}</span>
                  </TableCell>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-right font-mono tabular-nums font-semibold">
                    Saldo periodo {formatEur(periodo.saldo)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
