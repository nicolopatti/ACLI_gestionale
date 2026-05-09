"use client";

import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { etichettaRuolo, type Ruolo } from "@/lib/config";

export function UserMenu({
  nome,
  email,
  ruolo,
}: {
  nome: string;
  email: string;
  ruolo: Ruolo;
}) {
  const ruoloLabel = etichettaRuolo(ruolo);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="user-pill" aria-label={`Menu utente di ${nome}`}>
          <span className="avatar" aria-hidden>
            {iniziali(nome)}
          </span>
          <span className="who">
            {nome}
            <small>{ruoloLabel}</small>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span>{nome}</span>
          <span className="text-xs font-normal text-[var(--muted-foreground)]">{email}</span>
          <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {ruoloLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profilo" className="flex w-full items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Cambia password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          {/*
            FIX CRITICO — non rimuovere `onSelect={(e) => e.preventDefault()}`.
            Senza questo, Radix chiude il menu sul click e smonta il <form>
            prima che il submit parta, e il logout sembra non fare nulla.
            Storia in STATUS.md (regressione 2026-05).
          */}
          <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function iniziali(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
