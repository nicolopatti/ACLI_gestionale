import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import { EducatoreForm } from "@/components/educatori/educatore-form";

export default async function NuovoEducatorePage() {
  await requireAdminOrCoordinatore();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuovo educatore</h1>
      <Card>
        <CardHeader>
          <CardTitle>Anagrafica</CardTitle>
        </CardHeader>
        <CardContent>
          <EducatoreForm />
        </CardContent>
      </Card>
    </div>
  );
}
