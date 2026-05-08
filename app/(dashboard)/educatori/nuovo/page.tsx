import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EducatoreForm } from "@/components/educatori/educatore-form";

export default function NuovoEducatorePage() {
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
