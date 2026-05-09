import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { AreaAttr } from "@/components/dashboard/area-attr";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="app">
      <Sidebar ruolo={session.user.ruolo} />
      <div className="main">
        <Topbar
          nome={session.user.nome}
          email={session.user.email ?? ""}
          ruolo={session.user.ruolo}
        />
        <AreaAttr />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
