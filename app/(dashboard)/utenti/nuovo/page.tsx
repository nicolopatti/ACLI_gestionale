import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/page-guards";
import { UtenteForm } from "@/components/utenti/utente-form";

export default async function NuovoUtentePage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuovo utente</h1>
      <Card>
        <CardHeader>
          <CardTitle>Credenziali e ruolo</CardTitle>
        </CardHeader>
        <CardContent>
          <UtenteForm />
        </CardContent>
      </Card>
    </div>
  );
}
