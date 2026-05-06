import { Baby, CalendarCheck, GraduationCap, Wallet } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { listBambini } from "@/lib/airtable/bambini";
import { countMesiNonPagati } from "@/lib/airtable/mesi";
import { countPresenzeOggi } from "@/lib/airtable/presenze";
import { totaliPerConto } from "@/lib/airtable/movimenti";
import { meseCorrente, meseAnnoSCorrenteLabel } from "@/lib/utils-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEur } from "@/lib/utils";

export default async function DashboardHomePage() {
  const session = await auth();
  const isAdmin = session?.user?.ruolo === "admin";

  const [bambini, mesiAperti, presenzeOggi, totali] = await Promise.all([
    isAdmin ? listBambini({ soloAttivi: true }) : Promise.resolve([]),
    isAdmin ? countMesiNonPagati(meseCorrente()) : Promise.resolve(0),
    isAdmin ? countPresenzeOggi() : Promise.resolve(0),
    totaliPerConto(),
  ]);
  const totaleCassa = totali.Cassa.saldo + totali.BCC.saldo + totali.Sumup.saldo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ciao {session?.user?.nome ?? ""}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {isAdmin ? "Riepilogo del gestionale" : "Riepilogo della cassa"} ·{" "}
          {meseAnnoSCorrenteLabel()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
          <>
            <StatCard
              title="Bambini attivi"
              value={String(bambini.length)}
              icon={<Baby className="h-4 w-4" />}
            />
            <StatCard
              title="Mesi non pagati"
              value={String(mesiAperti)}
              hint="del mese in corso"
              icon={<GraduationCap className="h-4 w-4" />}
            />
            <StatCard
              title="Presenze oggi"
              value={String(presenzeOggi)}
              icon={<CalendarCheck className="h-4 w-4" />}
            />
          </>
        )}
        <StatCard
          title="Saldo totale"
          value={formatEur(totaleCassa)}
          hint={`Cassa ${formatEur(totali.Cassa.saldo)} · BCC ${formatEur(totali.BCC.saldo)} · Sumup ${formatEur(totali.Sumup.saldo)}`}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
