import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CambiaPasswordForm } from "@/components/profilo/cambia-password-form";

export default async function ProfiloPage() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profilo</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Stai modificando l&apos;account <span className="font-medium">{email}</span>.
        </p>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Cambia password</CardTitle>
        </CardHeader>
        <CardContent>
          <CambiaPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
