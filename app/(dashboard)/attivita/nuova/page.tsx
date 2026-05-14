import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { AttivitaForm } from "@/components/attivita/attivita-form";

export default async function NuovaAttivitaPage() {
  await requireAdminOrCoordinatore();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuova attività</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configurazione</CardTitle>
        </CardHeader>
        <CardContent>
          <AttivitaForm />
        </CardContent>
      </Card>
    </div>
  );
}
