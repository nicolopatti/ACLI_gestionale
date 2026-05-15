import {
  Banknote,
  Baby,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  Receipt,
  Shield,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Ruolo } from "@/lib/config";

export type Area = "amm" | "edu";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface NavSection {
  key: Area;
  label: string;
  sub: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const NAV: Record<Area, NavSection> = {
  amm: {
    key: "amm",
    label: "Amministrazione",
    sub: "Direttivo · Presidenza",
    icon: Shield,
    items: [
      { href: "/cassa", label: "Cassa e finanze", icon: Banknote },
      { href: "/conti", label: "Saldi conti", icon: Wallet },
      { href: "/rendiconto", label: "Rendiconto ETS", icon: FileSpreadsheet },
      { href: "/categorie", label: "Categorie", icon: BookOpenCheck },
      { href: "/utenti", label: "Utenti gestionale", icon: UserCog },
    ],
  },
  edu: {
    key: "edu",
    label: "Attività educative",
    sub: "Doposcuola · Laboratori · Estate",
    icon: GraduationCap,
    items: [
      // "Attività" e' la home di questa sezione: prima voce, primo redirect
      // post-login per il ruolo coordinatore_educativo (vedi
      // `homeForRuolo` in `lib/config.ts`).
      { href: "/attivita", label: "Attività", icon: CalendarRange },
      { href: "/bambini", label: "Bambini", icon: Baby },
      { href: "/educatori", label: "Educatori", icon: HeartHandshake },
      { href: "/turni", label: "Turni", icon: CalendarClock },
      { href: "/iscrizioni", label: "Iscrizioni", icon: GraduationCap },
      { href: "/presenze", label: "Presenze", icon: CalendarCheck },
      { href: "/spese-edu", label: "Registra movimento", icon: Receipt },
    ],
  },
};

export const ROLE_ACCESS: Record<Ruolo, Partial<Record<Area, string[]>>> = {
  admin: {
    amm: NAV.amm.items.map((i) => i.href),
    edu: NAV.edu.items.map((i) => i.href),
  },
  coordinatore_educativo: {
    edu: NAV.edu.items.map((i) => i.href),
  },
  volontario_cassa: {
    amm: ["/cassa", "/conti"],
  },
};

export function visibleSections(ruolo: Ruolo): NavSection[] {
  const access = ROLE_ACCESS[ruolo];
  const out: NavSection[] = [];
  (["amm", "edu"] as const).forEach((key) => {
    const hrefs = access[key];
    if (!hrefs) return;
    const items = NAV[key].items.filter((i) => hrefs.includes(i.href));
    if (items.length) out.push({ ...NAV[key], items });
  });
  return out;
}

export function areaOfPath(pathname: string): Area {
  if (NAV.amm.items.some((i) => pathname.startsWith(i.href))) return "amm";
  return "edu";
}

export function getBreadcrumb(pathname: string): { area: string; page: string } | null {
  for (const key of ["amm", "edu"] as const) {
    const section = NAV[key];
    const item = section.items.find(
      (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
    );
    if (item) return { area: section.label, page: item.label };
  }
  return null;
}
