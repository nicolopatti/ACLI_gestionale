"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readThemeFromDOM(): Theme {
  if (typeof document === "undefined") return "light";
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" ? "dark" : "light";
}

function subscribe(notify: () => void) {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(notify);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

export function ThemeToggle() {
  // Sorgente di verità = attributo `data-theme` su <html>, già impostato
  // dallo script anti-FOUC in app/layout.tsx prima dell'idratazione.
  const theme = useSyncExternalStore(subscribe, readThemeFromDOM, () => "light");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("acli-theme", next);
    } catch {
      // localStorage non disponibile (browser privato/embed): persistenza saltata.
    }
  }

  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro";

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
