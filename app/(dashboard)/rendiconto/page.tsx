import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listMovimentiInRange } from "@/lib/db/movimenti";
import { listVociRendiconto } from "@/lib/db/voci-rendiconto";
import { listCategorie } from "@/lib/db/categorie";
import { aggregaRendiconto } from "@/lib/rendiconto/aggregate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/utils";
import { MovimentoDaClassificareRow } from "@/components/rendiconto/movimento-da-classificare-row";

function annoCorrente(): number {
  return new Date().getFullYear();
}

function parseAnno(v: string | undefined): number {
  const n = Number.parseInt(v ?? "", 10);
  if (Number.isFinite(n) && n >= 2020 && n <= 2100) return n;
  return annoCorrente();
}

export default async function RendicontoPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.ruolo !== "admin") redirect("/cassa");

  const sp = await searchParams;
  const anno = parseAnno(sp.anno);
  const annoPrec = anno - 1;

  const [movAnno, movAnnoPrec, voci, categorie] = await Promise.all([
    listMovimentiInRange(`${anno}-01-01`, `${anno}-12-31`),
    listMovimentiInRange(`${annoPrec}-01-01`, `${annoPrec}-12-31`),
    listVociRendiconto(),
    listCategorie(),
  ]);

  const r = aggregaRendiconto(anno, movAnno, voci, categorie);
  const rPrec = aggregaRendiconto(annoPrec, movAnnoPrec, voci, categorie);

  // Mappa codice → importo anno precedente per la colonna affiancata
  const importoPrecPerCodice = new Map<string, number>();
  for (const sez of [...rPrec.uscite, ...rPrec.entrate]) {
    for (const v of sez.voci) {
      importoPrecPerCodice.set(v.voce.codice, v.importo);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Rendiconto ETS · {anno}
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Schema di rendiconto per cassa (D.M. 5/3/2020 — Modello D). I
            giroconti interni sono esclusi.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <form className="flex items-center gap-1" action="" method="get">
            <label
              htmlFor="anno-input"
              className="text-[12px] text-[var(--muted-foreground)]"
            >
              Anno:
            </label>
            <input
              id="anno-input"
              name="anno"
              type="number"
              min={2020}
              max={2100}
              defaultValue={anno}
              className="border border-[var(--border)] rounded h-8 px-2 text-sm w-24"
            />
            <Button type="submit" size="sm" variant="outline">
              Aggiorna
            </Button>
          </form>
          <Button asChild size="sm" variant="outline">
            <Link href={`/rendiconto/export?anno=${anno}`}>Esporta CSV</Link>
          </Button>
        </div>
      </div>

      {r.nonClassificati.length > 0 ? (
        <details
          open
          className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/[0.04]"
        >
          <summary className="px-4 py-3 text-[12.5px] cursor-pointer select-none flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-medium text-[var(--danger)]">
              {r.nonClassificati.length} movimenti senza voce rendiconto
            </span>
            <span className="text-[var(--muted-foreground)]">
              ({formatEur(r.nonClassificati.reduce((s, m) => s + m.importo, 0))}{" "}
              totale)
            </span>
            <span className="text-[var(--muted-foreground)]">
              · assegna categoria o voce qui sotto, oppure imposta il default da{" "}
              <Link href="/categorie" className="underline">
                /categorie
              </Link>
              .
            </span>
          </summary>
          <div className="border-t border-[var(--danger)]/20 bg-[var(--background)]">
            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]/60">
              <div className="col-span-2">Data</div>
              <div className="col-span-3">Movimento</div>
              <div className="col-span-3">Categoria</div>
              <div className="col-span-4">Voce ETS (override)</div>
            </div>
            <ul>
              {r.nonClassificati.map((m) => {
                const categorieOpt = categorie
                  .filter((c) => c.tipo === m.tipo)
                  .map((c) => ({ id: c.recordId, nome: c.nome }));
                const vociOpt = voci
                  .filter((v) => v.tipo === m.tipo && v.attivo)
                  .sort((a, b) => a.ordering - b.ordering)
                  .map((v) => ({
                    id: v.recordId,
                    codice: v.codice,
                    label: v.label,
                  }));
                return (
                  <MovimentoDaClassificareRow
                    key={m.recordId}
                    movimento={{
                      id: m.recordId,
                      dataMovimento: m.dataMovimento,
                      descrizione: m.descrizione,
                      conto: m.conto,
                      tipo: m.tipo,
                      importo: m.importo,
                      categoriaId: m.categoriaId,
                      voceRendicontoId: m.voceRendicontoId,
                    }}
                    categorie={categorieOpt}
                    voci={vociOpt}
                  />
                );
              })}
            </ul>
          </div>
        </details>
      ) : null}

      {r.giroconti.length > 0 ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-2 text-[12px] text-[var(--muted-foreground)]">
          {r.giroconti.length} giroconti esclusi (
          {formatEur(r.giroconti.reduce((s, m) => s + m.importo, 0))}).
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h2 className="font-serif text-[15px] font-medium">
              USCITE — Totale {formatEur(r.totaleUscite)}
            </h2>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-[12.5px]">
              <thead className="text-[var(--muted-foreground)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-2 text-left font-medium">Voce</th>
                  <th className="px-3 py-2 text-right font-medium w-28">
                    {anno}
                  </th>
                  <th className="px-3 py-2 text-right font-medium w-28">
                    {annoPrec}
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.uscite.map((sez) => (
                  <SezioneRows
                    key={sez.sezione}
                    sez={sez}
                    importoPrec={importoPrecPerCodice}
                  />
                ))}
                <tr className="bg-[var(--muted)]/60 font-semibold">
                  <td className="px-3 py-2">TOTALE ONERI E COSTI</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatEur(r.totaleUscite)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatEur(rPrec.totaleUscite)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h2 className="font-serif text-[15px] font-medium">
              ENTRATE — Totale {formatEur(r.totaleEntrate)}
            </h2>
          </div>
          <CardContent className="p-0">
            <table className="w-full text-[12.5px]">
              <thead className="text-[var(--muted-foreground)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-2 text-left font-medium">Voce</th>
                  <th className="px-3 py-2 text-right font-medium w-28">
                    {anno}
                  </th>
                  <th className="px-3 py-2 text-right font-medium w-28">
                    {annoPrec}
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.entrate.map((sez) => (
                  <SezioneRows
                    key={sez.sezione}
                    sez={sez}
                    importoPrec={importoPrecPerCodice}
                  />
                ))}
                <tr className="bg-[var(--muted)]/60 font-semibold">
                  <td className="px-3 py-2">TOTALE ENTRATE DELLA GESTIONE</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatEur(r.totaleEntrate)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatEur(rPrec.totaleEntrate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card
        className={
          r.avanzo >= 0
            ? "bg-[var(--primary-soft)] border-[var(--primary-soft-ink)]/20"
            : "border-[var(--danger)]/40"
        }
      >
        <CardContent className="p-4 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              Avanzo/Disavanzo d&apos;esercizio
            </p>
            <p className="text-2xl font-semibold tabular-nums mt-1">
              {formatEur(r.avanzo)}
            </p>
          </div>
          <div className="text-right text-[12.5px] text-[var(--muted-foreground)]">
            {anno}: {formatEur(r.totaleEntrate)} − {formatEur(r.totaleUscite)}
            <br />
            {annoPrec}: avanzo di {formatEur(rPrec.avanzo)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SezioneRows({
  sez,
  importoPrec,
}: {
  sez: ReturnType<typeof aggregaRendiconto>["uscite"][number];
  importoPrec: Map<string, number>;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={3}
          className="px-3 pt-3 pb-1 text-[12px] uppercase tracking-wide text-[var(--muted-foreground)]"
        >
          {sez.titolo}
        </td>
      </tr>
      {sez.voci.map((v) => (
        <tr
          key={v.voce.recordId}
          className="border-b border-[var(--border)]/40"
        >
          <td className="px-3 py-1.5">
            <span className="text-[var(--muted-foreground)] font-mono mr-1.5">
              {v.voce.numero})
            </span>
            {v.voce.label}
          </td>
          <td className="px-3 py-1.5 text-right font-mono tabular-nums">
            {v.importo > 0 ? formatEur(v.importo) : "—"}
          </td>
          <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[var(--muted-foreground)]">
            {(() => {
              const prev = importoPrec.get(v.voce.codice) ?? 0;
              return prev > 0 ? formatEur(prev) : "—";
            })()}
          </td>
        </tr>
      ))}
      <tr className="border-b border-[var(--border)]/60">
        <td className="px-3 py-1.5 font-medium text-[var(--muted-foreground)]">
          Totale sezione {sez.sezione}
        </td>
        <td className="px-3 py-1.5 text-right font-mono tabular-nums font-medium">
          {formatEur(sez.totale)}
        </td>
        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[var(--muted-foreground)]">
          {/* totale sezione anno precedente: somma dei codici noti */}
          {(() => {
            const tot = sez.voci.reduce(
              (s, v) => s + (importoPrec.get(v.voce.codice) ?? 0),
              0,
            );
            return tot > 0 ? formatEur(tot) : "—";
          })()}
        </td>
      </tr>
    </>
  );
}
