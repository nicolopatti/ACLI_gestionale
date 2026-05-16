import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import {
  entrateUscitePerMese,
  listMovimenti,
  saldiPerConto,
} from "@/lib/db/movimenti";
import { listCategorie } from "@/lib/db/categorie";
import { listVociRendiconto } from "@/lib/db/voci-rendiconto";
import {
  TITOLI_SEZIONE_ENTRATA,
  TITOLI_SEZIONE_USCITA,
} from "@/lib/rendiconto/aggregate";
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
import { Button } from "@/components/ui/button";
import { CassaFilters } from "@/components/cassa/cassa-filters";
import { DeleteMovimentoButton } from "@/components/cassa/delete-movimento-button";
import { EditMovimentoButton } from "@/components/cassa/edit-movimento-button";
import { ChartEntrateUscite } from "@/components/cassa/chart-entrate-uscite";
import { AnnoSwitcher } from "@/components/cassa/anno-switcher";
import { formatDate, formatEur } from "@/lib/utils";
import { MEZZI_PAGAMENTO, type MezzoPagamento } from "@/lib/config";
import type { Movimento } from "@/lib/db/types";

interface ContoTotali {
  entrate: number;
  uscite: number;
  saldo: number;
}

function emptyContoTotali(): ContoTotali {
  return { entrate: 0, uscite: 0, saldo: 0 };
}

function aggregaTotale(movimenti: Movimento[]): ContoTotali {
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

function parseAnno(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 2000 && n <= 2100) return n;
  return new Date().getFullYear();
}

export default async function CassaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    conto?: string;
    categoria?: string;
    anno?: string;
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
  const anno = parseAnno(sp.anno);
  const annoCorrente = new Date().getFullYear();

  const [movimenti, categorie, voci, totaliStorico, totaliAnno, meseData] =
    await Promise.all([
      listMovimenti({ ...(isAdmin ? {} : { telegramUserId }), limit: 1000 }),
      listCategorie(),
      listVociRendiconto(),
      // KPI Risultato netto = storico totale (= attuale "Saldo totale", che
      // esclude giroconti). Indipendente dal selettore anno.
      saldiPerConto(isAdmin ? {} : { telegramUserId }),
      // KPI Entrate/Uscite anno selezionato + chart: stessa semantica
      // rendiconto (esclude giroconti). Lo stesso RPC saldi_per_conto
      // filtrato per anno copre i KPI. Il chart usa l'aggregato mensile.
      saldiPerConto({
        anno,
        ...(isAdmin ? {} : { telegramUserId }),
      }),
      entrateUscitePerMese(anno, isAdmin ? undefined : telegramUserId),
    ]);
  const categoriaById = new Map(categorie.map((c) => [c.recordId, c] as const));
  // Voci passate al bottone "modifica classificazione" come array piatto;
  // filtraggio per tipo del movimento e raggruppamento per sezione avvengono
  // nel componente client.
  const vociOptions = voci.map((v) => ({
    id: v.recordId,
    codice: v.codice,
    tipo: v.tipo,
    sezione: v.sezione,
    label: v.label,
  }));
  const categorieOptions = categorie.map((c) => ({
    id: c.recordId,
    nome: c.nome,
    tipo: c.tipo,
  }));

  // Risultato netto = somma dei 3 conti rendiconto (storico).
  const risultatoNetto: ContoTotali = MEZZI_PAGAMENTO.reduce(
    (acc, k) => ({
      entrate: acc.entrate + totaliStorico[k].entrate,
      uscite: acc.uscite + totaliStorico[k].uscite,
      saldo: acc.saldo + totaliStorico[k].saldo,
    }),
    emptyContoTotali(),
  );
  // Entrate/Uscite anno = somma dei 3 conti per l'anno selezionato.
  const totaliAnnoCorrente: ContoTotali = MEZZI_PAGAMENTO.reduce(
    (acc, k) => ({
      entrate: acc.entrate + totaliAnno[k].entrate,
      uscite: acc.uscite + totaliAnno[k].uscite,
      saldo: acc.saldo + totaliAnno[k].saldo,
    }),
    emptyContoTotali(),
  );

  // Anni disponibili = anni con almeno un movimento (no-giroconto, no apertura
  // periodo conto) + anno corrente sempre presente come fallback (utente puo'
  // voler vedere il chart vuoto per pianificare).
  const anniSet = new Set<number>([annoCorrente]);
  for (const m of movimenti) {
    if (m.isGiroconto) continue;
    if (m.isSaldoInizialeConto) continue;
    if (!m.dataMovimento) continue;
    const y = Number.parseInt(m.dataMovimento.slice(0, 4), 10);
    if (Number.isFinite(y)) anniSet.add(y);
  }
  const anniDisponibili = Array.from(anniSet).sort((a, b) => b - a);

  // Lista movimenti filtrata per la tabella. Esclude i giroconti e l'apertura
  // periodo conto (entrambi fuori vista rendiconto). I saldi iniziali
  // rendiconto restano visibili: concorrono al rendiconto e ai totali.
  const filtered = movimenti
    .filter((m) => !m.isGiroconto && !m.isSaldoInizialeConto)
    .filter((m) => {
      if (tipoSel && m.tipo !== tipoSel) return false;
      if (contoSel && m.conto !== contoSel) return false;
      if (categoriaSel && m.categoriaId !== categoriaSel) return false;
      if (q) {
        const cat = m.categoriaId
          ? categoriaById.get(m.categoriaId)?.nome ?? ""
          : "";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cassa</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Rendiconto finanziario: entrate, uscite e risultato netto (escluse
            partite di giro).
          </p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/conti">Saldi conti</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cassa/import">Importa estratto conto</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/rendiconto">Rendiconto ETS</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
              Entrate {anno}
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1 text-[var(--success)]">
              + {formatEur(totaliAnnoCorrente.entrate)}
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--muted-foreground)]">
              Movimenti in ingresso dell&apos;anno (no giroconti)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
              Uscite {anno}
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1 text-[var(--danger)]">
              − {formatEur(totaliAnnoCorrente.uscite)}
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--muted-foreground)]">
              Movimenti in uscita dell&apos;anno (no giroconti)
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--primary-soft)] border-[var(--primary-soft-ink)]/20">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--primary-soft-ink)] uppercase tracking-wide">
              Risultato netto (storico)
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1 text-[var(--primary-soft-ink)]">
              {formatEur(risultatoNetto.saldo)}
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--primary-soft-ink)]/80">
              + {formatEur(risultatoNetto.entrate)} · −{" "}
              {formatEur(risultatoNetto.uscite)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">
                Andamento entrate/uscite
              </h2>
              <p className="text-[12px] text-[var(--muted-foreground)]">
                Mensile, anno {anno}
              </p>
            </div>
            <AnnoSwitcher
              anniDisponibili={anniDisponibili}
              annoCorrente={anno}
            />
          </div>
          <ChartEntrateUscite
            data={meseData.map((m) => ({
              mese: m.mese,
              entrate: m.entrate,
              uscite: m.uscite,
            }))}
          />
        </CardContent>
      </Card>

      <CassaFilters
        categorie={categorie.map((c) => ({
          id: c.recordId,
          nome: c.nome,
          tipo: c.tipo,
        }))}
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
                {isAdmin && (
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    Azioni
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 8 : 6}
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
                    <TableCell className="whitespace-nowrap">
                      {formatDate(m.dataMovimento)}
                    </TableCell>
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
                      {m.categoriaId
                        ? categoriaById.get(m.categoriaId)?.nome ?? "—"
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {m.descrizione ?? "—"}
                    </TableCell>
                    {isAdmin && <TableCell>{m.volontario ?? "—"}</TableCell>}
                    {isAdmin && (
                      <TableCell className="w-[1%] whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditMovimentoButton
                            movimentoId={m.recordId}
                            tipo={m.tipo}
                            importo={m.importo}
                            descrizione={m.descrizione}
                            currentCategoriaId={m.categoriaId}
                            currentVoceRendicontoId={m.voceRendicontoId}
                            categorie={categorieOptions}
                            voci={vociOptions}
                            sezioniTitoli={
                              m.tipo === "Uscita"
                                ? TITOLI_SEZIONE_USCITA
                                : TITOLI_SEZIONE_ENTRATA
                            }
                          />
                          <DeleteMovimentoButton
                            movimentoId={m.recordId}
                            descrizione={m.descrizione}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-[12px] text-[var(--muted-foreground)]"
                  >
                    Totali periodo ({filtered.length} movimenti)
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    <span className="text-[var(--success)]">
                      + {formatEur(periodo.entrate)}
                    </span>
                    <span className="text-[var(--muted-2)] mx-1.5">·</span>
                    <span className="text-[var(--danger)]">
                      − {formatEur(periodo.uscite)}
                    </span>
                  </TableCell>
                  <TableCell
                    colSpan={isAdmin ? 5 : 3}
                    className="text-right font-mono tabular-nums font-semibold"
                  >
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
