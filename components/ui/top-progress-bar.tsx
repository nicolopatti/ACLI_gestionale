"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Sottile filo animato in cima alla pagina, visibile quando:
 *
 * 1) cambia `pathname` (navigazione client) → ~600ms.
 * 2) un componente dispatcha `acli:pending-start` su window e finché non
 *    arriva il corrispettivo `acli:pending-end`. Utile per server action
 *    lunghe che si trovano fuori da un bottone con feedback.
 *
 * È un singleton: montato una volta nel layout dashboard.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [pending, setPending] = useState(0);
  const [navVisible, setNavVisible] = useState(false);
  const firstPathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathname === firstPathnameRef.current) return;
    firstPathnameRef.current = pathname;
    setNavVisible(true);
    const id = setTimeout(() => setNavVisible(false), 600);
    return () => clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    const onStart = () => setPending((n) => n + 1);
    const onEnd = () => setPending((n) => Math.max(0, n - 1));
    window.addEventListener("acli:pending-start", onStart);
    window.addEventListener("acli:pending-end", onEnd);
    return () => {
      window.removeEventListener("acli:pending-start", onStart);
      window.removeEventListener("acli:pending-end", onEnd);
    };
  }, []);

  if (!navVisible && pending === 0) return null;
  return <div className="acli-top-progress" role="progressbar" aria-label="Caricamento" />;
}
