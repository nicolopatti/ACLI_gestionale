import { listBambini } from "@/lib/db/bambini";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BambinoForm } from "@/components/bambini/bambino-form";

export default async function NuovoBambinoPage() {
  await requireAdminOrCoordinatore();
  const bambini = await listBambini();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuovo bambino</h1>
      <Card>
        <CardHeader>
          <CardTitle>Anagrafica</CardTitle>
        </CardHeader>
        <CardContent>
          <BambinoForm bambini={bambini} contatti={[]} />
        </CardContent>
      </Card>
    </div>
  );
}
