import Link from "next/link";
import { requireAdminOrCassa } from "@/lib/auth/page-guards";
import { listMovimenti, saldiPerContoReale } from "@/lib/db/movimenti";
import { listCategorie } from "@/lib/db/categorie";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEur } from "@/lib/utils";
import { MEZZI_PAGAMENTO, type MezzoPagamento } from "@/lib/config";

const RECENT_LIMIT = 5;

export default async function ContiPage() {
  const session = await requireAdminOrCassa();
  const isAdmin = session.user?.ruolo === "admin";
  const telegramUserId = session.user?.telegramUserId;

  const [saldi, movimenti, categorie] = await Promise.all([
    saldiPerContoReale(isAdmin ? {} : { telegramUserId }),
    // Prendo 200 movimenti recenti (gia' filtrati per telegramUserId
    // se non-admin) e raggruppo per conto lato pagina: evita 3 round-trip
    // separati per le 5 righe per conto.
    listMovimenti({ ...(isAdmin ? {} : { telegramUserId }), limit: 200 }),
    listCategorie(),
  ]);
  const categoriaById = new Map(
    categorie.map((c) => [c.recordId, c] as const),
  );

  const movimentiByConto: Record<MezzoPagamento, typeof movimenti> = {
    Cassa: [],
    BCC: [],
    Sumup: [],
  };
  for (const m of movimenti) {
    movimentiByConto[m.conto]?.push(m);
  }

  const totaleReale = MEZZI_PAGAMENTO.reduce(
    (acc, k) => acc + saldi[k].saldo,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Saldi conti
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Stato reale di cassa contanti e conti bancari, partite di giro
            incluse. Per il rendiconto finanziario (escluse partite di giro)
            vai su{" "}
            <Link href="/cassa" className="underline">
              Cassa
            </Link>
            .
          </p>
        </div>
        <Card className="bg-[var(--primary-soft)] border-[var(--primary-soft-ink)]/20 min-w-[200px]">
          <CardContent className="p-3 px-4">
            <p className="text-[11px] text-[var(--primary-soft-ink)] uppercase tracking-wide">
              Totale disponibilita&apos;
            </p>
            <p className="text-xl font-semibold tabular-nums mt-0.5 text-[var(--primary-soft-ink)]">
              {formatEur(totaleReale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {MEZZI_PAGAMENTO.map((conto) => {
          const s = saldi[conto];
          const ultime = movimentiByConto[conto].slice(0, RECENT_LIMIT);
          return (
            <Card key={conto} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                    {conto}
                  </p>
                  <p
                    className={
                      "text-2xl font-semibold tabular-nums mt-1 " +
                      (s.saldo < 0 ? "text-[var(--danger)]" : "")
                    }
                  >
                    {formatEur(s.saldo)}
                  </p>
                  <p className="mt-2 text-[11.5px] text-[var(--muted-foreground)]">
                    <span className="text-[var(--success)]">
                      + {formatEur(s.entrate)}
                    </span>
                    <span className="mx-1.5 text-[var(--muted-2)]">·</span>
                    <span className="text-[var(--danger)]">
                      − {formatEur(s.uscite)}
                    </span>
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide px-1">
                    Ultime operazioni
                  </p>
                  {ultime.length === 0 ? (
                    <p className="text-[12px] text-[var(--muted-foreground)] italic px-1 py-2">
                      Nessun movimento registrato per questo conto.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {ultime.map((m) => {
                        const cat = m.categoriaId
                          ? categoriaById.get(m.categoriaId)?.nome
                          : null;
                        return (
                          <li
                            key={m.recordId}
                            className="flex items-baseline justify-between gap-2 px-1 text-[12.5px]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[var(--muted-foreground)] tabular-nums">
                                  {formatDate(m.dataMovimento)}
                                </span>
                                {m.isGiroconto ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    Giroconto
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="truncate text-[var(--foreground)]">
                                {m.descrizione ?? cat ?? "—"}
                              </div>
                            </div>
                            <div
                              className={
                                "font-mono tabular-nums whitespace-nowrap " +
                                (m.tipo === "Entrata"
                                  ? "text-[var(--success)]"
                                  : "text-[var(--danger)]")
                              }
                            >
                              {m.tipo === "Uscita" ? "−" : "+"}{" "}
                              {formatEur(m.importo)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Link
                    href={`/cassa?conto=${conto}`}
                    className="block text-[12px] text-[var(--primary)] hover:underline mt-2 px-1"
                  >
                    Vedi tutti i movimenti →
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
