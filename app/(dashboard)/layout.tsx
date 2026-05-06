import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar ruolo={session.user.ruolo} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-[var(--border)] bg-[var(--card)] px-6">
          <UserMenu
            nome={session.user.nome}
            email={session.user.email ?? ""}
            ruolo={session.user.ruolo}
          />
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
