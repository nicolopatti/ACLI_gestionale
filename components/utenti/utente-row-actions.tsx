"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UtenteDrawer } from "./utente-drawer";
import type { User } from "@/lib/airtable/types";

export function UtenteRowActions({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" /> Modifica
      </Button>
      {open ? (
        <UtenteDrawer user={user} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
