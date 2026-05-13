import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listCategorie } from "@/lib/db/categorie";
import { listVociRendiconto } from "@/lib/db/voci-rendiconto";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriaRow } from "@/components/categorie/categoria-row";

export default async function CategoriePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.ruolo !== "admin") redirect("/cassa");

  const [categorie, voci] = await Promise.all([
    listCategorie(),
    listVociRendiconto(),
  ]);

  const entrate = categorie.filter((c) => c.tipo === "Entrata");
  const uscite = categorie.filter((c) => c.tipo === "Uscita");
  const vociEntrate = voci
    .filter((v) => v.tipo === "Entrata" && v.attivo)
    .map((v) => ({
      id: v.recordId,
      codice: v.codice,
      label: v.label,
      sezione: v.sezione,
    }));
  const vociUscite = voci
    .filter((v) => v.tipo === "Uscita" && v.attivo)
    .map((v) => ({
      id: v.recordId,
      codice: v.codice,
      label: v.label,
      sezione: v.sezione,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorie</h1>
        <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5 max-w-3xl">
          Mappa ciascuna categoria a una voce dello schema di rendiconto ETS.
          Quando registri un movimento (da Telegram, da app o dall&apos;import
          estratto conto), la voce verrà applicata automaticamente — puoi
          comunque sovrascriverla per singolo movimento.
        </p>
      </div>

      <Card>
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="font-serif text-[15px] font-medium">
            Entrate ({entrate.length})
          </h2>
        </div>
        <CardContent className="p-0">
          <ul className="divide-y divide-[var(--border)]">
            {entrate.map((c) => (
              <CategoriaRow
                key={c.recordId}
                categoria={{
                  id: c.recordId,
                  nome: c.nome,
                  tipo: c.tipo,
                  voceRendicontoDefaultId: c.voceRendicontoDefaultId,
                }}
                voci={vociEntrate}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="font-serif text-[15px] font-medium">
            Uscite ({uscite.length})
          </h2>
        </div>
        <CardContent className="p-0">
          <ul className="divide-y divide-[var(--border)]">
            {uscite.map((c) => (
              <CategoriaRow
                key={c.recordId}
                categoria={{
                  id: c.recordId,
                  nome: c.nome,
                  tipo: c.tipo,
                  voceRendicontoDefaultId: c.voceRendicontoDefaultId,
                }}
                voci={vociUscite}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
