"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Ruolo } from "@/lib/config";
import { visibleSections, type NavItem } from "./nav-config";

export function Sidebar({ ruolo }: { ruolo: Ruolo }) {
  const pathname = usePathname();
  const sections = visibleSections(ruolo);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Image src="/logo-acli.png" alt="ACLI" width={40} height={40} priority />
        <div className="brand-text">
          <div className="name">Circolo ACLI</div>
          <div className="sub">Calvisano</div>
        </div>
      </div>
      <nav className="nav">
        {sections.map((s) => {
          const SectionIcon = s.icon;
          return (
            <div className="nav-section" key={s.key} data-area={s.key}>
              <div className="nav-section-head">
                <SectionIcon size={13} strokeWidth={1.6} />
                <div className="nav-section-titles">
                  <div className="nav-section-label">{s.label}</div>
                  <div className="nav-section-sub">{s.sub}</div>
                </div>
              </div>
              {s.items.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <span className="dot" />
        <span>Sync n8n attivo</span>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="nav-item" data-active={active || undefined}>
      <Icon className="nav-icon" />
      <span>{item.label}</span>
      {item.count != null ? <span className="nav-badge">{item.count}</span> : null}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
