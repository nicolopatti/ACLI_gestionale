import { auth } from "@/lib/auth/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrimoAccessoForm } from "@/components/auth/primo-accesso-form";

export default async function PrimoAccessoPage() {
  const session = await auth();
  const nome = session?.user?.nome ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Benvenuto{nome ? `, ${nome}` : ""}</CardTitle>
          <CardDescription>
            Per proteggere il tuo account, scegli ora una password personale.
            Useremo la nuova password al prossimo accesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrimoAccessoForm />
        </CardContent>
      </Card>
    </div>
  );
}
