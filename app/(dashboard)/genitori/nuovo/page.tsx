import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenitoreForm } from "@/components/genitori/genitore-form";

export default function NuovoGenitorePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuovo genitore</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dati anagrafici</CardTitle>
        </CardHeader>
        <CardContent>
          <GenitoreForm />
        </CardContent>
      </Card>
    </div>
  );
}
