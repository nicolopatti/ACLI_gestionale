import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listMovimenti } from "@/lib/db/movimenti";
import { listCategorie } from "@/lib/db/categorie";
import { listVociRendiconto } from "@/lib/db/voci-rendiconto";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpeseEduForm } from "@/components/spese-edu/spese-edu-form";
import { formatDate, formatEur } from "@/lib/utils";

export default async function SpeseEduPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (user.ruolo !== "admin" && user.ruolo !== "coordinatore_educativo") {
    redirect("/attivita");
  }

  const [categorie, movimenti, voci] = await Promise.all([
    listCategorie(),
    listMovimenti({
      ...(user.telegramUserId ? { telegramUserId: user.telegramUserId } : {}),
      limit: 200,
    }),
    listVociRendiconto(),
  ]);
  const categoriaById = new Map(categorie.map((c) => [c.recordId, c] as const));

  // Filtra "miei ultimi" anche per nome volontario, per coordinatori che non hanno
  // un Telegram user id collegato
  const miei = (
    user.telegramUserId
      ? movimenti
      : movimenti.filter((m) => m.volontario === user.nome)
  )
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registra movimento</h1>
        <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
          Inserisci una spesa o un&apos;entrata della cassa educativa. Verra registrata a tuo
          nome.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-6">
            <SpeseEduForm
              categorie={categorie.map((c) => ({
                id: c.recordId,
                nome: c.nome,
                tipo: c.tipo,
                voceRendicontoDefaultId: c.voceRendicontoDefaultId,
              }))}
              voci={voci
                .filter((v) => v.attivo)
                .map((v) => ({
                  id: v.recordId,
                  codice: v.codice,
                  label: v.label,
                  tipo: v.tipo,
                }))}
            />
          </CardContent>
        </Card>

        <div className="space-y-3 self-start">
          <Card>
            <div className="px-5 py-3.5 border-b border-[var(--border)]">
              <h2 className="font-serif text-[15px] font-medium tracking-tight">
                I miei ultimi movimenti
              </h2>
              <p className="text-[11.5px] text-[var(--muted-foreground)] mt-0.5">
                Ultimi 5 registrati a tuo nome
              </p>
            </div>
            <CardContent className="p-0">
              {miei.length === 0 ? (
                <p className="text-[12.5px] text-[var(--muted-foreground)] px-5 py-5">
                  Non hai ancora registrato movimenti.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {miei.map((m) => (
                    <li key={m.recordId} className="px-5 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        {m.tipo === "Entrata" ? (
                          <Badge variant="success">Entrata</Badge>
                        ) : (
                          <Badge variant="warning">Uscita</Badge>
                        )}
                        <span
                          className={
                            "font-mono tabular-nums text-[13px] font-semibold " +
                            (m.tipo === "Entrata"
                              ? "text-[var(--success)]"
                              : "text-[var(--danger)]")
                          }
                        >
                          {m.tipo === "Uscita" ? "−" : "+"} {formatEur(m.importo)}
                        </span>
                      </div>
                      <div className="text-[12.5px] text-[var(--ink)] truncate">
                        {m.descrizione ?? "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--muted-foreground)]">
                        <span>{formatDate(m.dataMovimento)}</span>
                        <span>·</span>
                        <span>{m.conto}</span>
                        {m.categoriaId && categoriaById.get(m.categoriaId) ? (
                          <>
                            <span>·</span>
                            <span className="truncate">
                              {categoriaById.get(m.categoriaId)?.nome}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
