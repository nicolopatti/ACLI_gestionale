"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Baby,
  CalendarCheck,
  CalendarRange,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ruolo } from "@/lib/config";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ruoli: Ruolo[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, ruoli: ["admin", "volontario_cassa"] },
  { href: "/bambini", label: "Bambini", icon: Baby, ruoli: ["admin"] },
  { href: "/attivita", label: "Attività", icon: CalendarRange, ruoli: ["admin"] },
  { href: "/iscrizioni", label: "Iscrizioni", icon: GraduationCap, ruoli: ["admin"] },
  { href: "/educatori", label: "Educatori", icon: HeartHandshake, ruoli: ["admin"] },
  { href: "/presenze", label: "Presenze", icon: CalendarCheck, ruoli: ["admin"] },
  { href: "/cassa", label: "Cassa", icon: Banknote, ruoli: ["admin", "volontario_cassa"] },
  { href: "/utenti", label: "Utenti", icon: UserCog, ruoli: ["admin"] },
];

export function Sidebar({ ruolo }: { ruolo: Ruolo }) {
  const pathname = usePathname();
  const visible = NAV_ITEMS.filter((i) => i.ruoli.includes(ruolo));
  return (
    <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-semibold tracking-tight">ACLI Gestionale</h1>
        <p className="text-xs text-[var(--muted-foreground)]">Doposcuola &amp; Cassa</p>
      </div>
      <nav className="flex flex-col gap-1">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
