import Link from "next/link";
import { listGenitori } from "@/lib/airtable/genitori";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BambinoForm } from "@/components/bambini/bambino-form";

export default async function NuovoBambinoPage() {
  const genitori = await listGenitori();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuovo bambino</h1>
      {genitori.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
            Per registrare un bambino devi prima creare almeno un{" "}
            <Link href="/genitori/nuovo" className="underline">
              genitore
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dati bambino</CardTitle>
          </CardHeader>
          <CardContent>
            <BambinoForm genitori={genitori} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
