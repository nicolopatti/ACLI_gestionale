"use client";

import { Bell, PanelLeft, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Ruolo } from "@/lib/config";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { areaOfPath, getBreadcrumb } from "./nav-config";

interface TopbarProps {
  nome: string;
  email: string;
  ruolo: Ruolo;
}

export function Topbar({ nome, email, ruolo }: TopbarProps) {
  const pathname = usePathname();
  const area = areaOfPath(pathname);
  const crumb = getBreadcrumb(pathname);
  const areaLabel = area === "amm" ? "Amministrazione" : "Attività educative";

  return (
    <header className="topbar" data-area={area}>
      {/* Collapse-sidebar: placeholder visivo, il toggle reale arriverà
          in PR successiva (richiede state condiviso sidebar↔topbar). */}
      <button
        type="button"
        className="icon-btn"
        title="Comprimi sidebar (presto)"
        aria-label="Comprimi sidebar"
        aria-disabled
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="area-pill" data-area={area}>
        <span className="dot" />
        {areaLabel}
      </div>

      {crumb ? (
        <div className="crumb">
          <span>{crumb.area}</span>
          <span className="crumb-sep">/</span>
          <b>{crumb.page}</b>
        </div>
      ) : null}

      {/* Search shell: in questa PR è solo visiva. La logica di ricerca
          arriverà quando avremo un endpoint server-side. */}
      <div className="search">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Cerca…"
          aria-disabled
          readOnly
          tabIndex={-1}
        />
        <kbd>⌘K</kbd>
      </div>

      <ThemeToggle />

      <button
        type="button"
        className="icon-btn"
        title="Notifiche (presto)"
        aria-label="Notifiche"
        aria-disabled
      >
        <Bell className="h-4 w-4" />
      </button>

      <UserMenu nome={nome} email={email} ruolo={ruolo} />
    </header>
  );
}
