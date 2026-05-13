import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listCategorie } from "@/lib/db/categorie";
import { listVociRendiconto } from "@/lib/db/voci-rendiconto";
import { Card, CardContent } from "@/components/ui/card";
import { ImportEstrattoContoClient } from "@/components/cassa/import-estratto-conto-client";

export default async function ImportEstrattoContoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.ruolo !== "admin") redirect("/cassa");

  const [categorie, voci] = await Promise.all([
    listCategorie(),
    listVociRendiconto(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[12px] text-[var(--muted-foreground)]">
          <Link href="/cassa" className="hover:underline">
            Cassa
          </Link>{" "}
          / Importa estratto conto
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Importa estratto conto
        </h1>
        <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5 max-w-3xl">
          Carica l&apos;estratto conto BCC (file <code>.xls</code> tab-separato)
          o SumUp (CSV). Il sistema deduplica contro i movimenti già registrati
          da Telegram, da iscrizione bambini o dall&apos;app, e propone
          categoria e voce di rendiconto per ogni riga nuova.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ImportEstrattoContoClient
            categorie={categorie.map((c) => ({
              id: c.recordId,
              nome: c.nome,
              tipo: c.tipo,
              voceRendicontoDefaultId: c.voceRendicontoDefaultId,
            }))}
            voci={voci.map((v) => ({
              id: v.recordId,
              codice: v.codice,
              tipo: v.tipo,
              sezione: v.sezione,
              label: v.label,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
