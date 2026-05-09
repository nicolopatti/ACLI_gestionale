"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { areaOfPath } from "./nav-config";

/**
 * Sincronizza l'attributo `data-area` su <html> col pathname corrente.
 * I tokens CSS in globals.css (`:root[data-area="..."]`) cambiano i colori
 * di accent (sidebar, area-pill, bordo topbar) in base all'area.
 */
export function AreaAttr() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.setAttribute("data-area", areaOfPath(pathname));
  }, [pathname]);
  return null;
}
