"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { salvaDisponibilitaAction } from "@/lib/actions/disponibilita";
import { FASCE_DISPONIBILITA, type FasciaDisponibilita } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Disponibilita } from "@/lib/airtable/types";

interface Props {
  educatoreId: string;
  meseAnno: string;
  disponibilita: Disponibilita[];
}

const NOMI_GIORNI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const NOMI_MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

function shiftMese(meseAnno: string, delta: number): string {
  const [y, m] = meseAnno.split("-").map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function giorniDelMese(meseAnno: string): { data: string; dow: number; numero: number }[] {
  const [y, m] = meseAnno.split("-").map((s) => parseInt(s, 10));
  const ultimoGiorno = new Date(y, m, 0).getDate();
  const out: { data: string; dow: number; numero: number }[] = [];
  for (let d = 1; d <= ultimoGiorno; d++) {
    const date = new Date(y, m - 1, d);
    out.push({
      data: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dow: date.getDay(),
      numero: d,
    });
  }
  return out;
}

export function CalendarioDisponibilita({
  educatoreId,
  meseAnno,
  disponibilita,
}: Props) {
  const router = useRouter();
  const [meseSel, setMeseSel] = useState(meseAnno);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const giorni = useMemo(() => giorniDelMese(meseSel), [meseSel]);
  const setIniziale = useMemo(
    () =>
      new Set(
        disponibilita
          .filter((d) => d.data.startsWith(meseAnno))
          .map((d) => `${d.data}__${d.fasciaOraria}`),
      ),
    [disponibilita, meseAnno],
  );
  const [checked, setChecked] = useState<Set<string>>(setIniziale);

  const toggle = (data: string, fascia: FasciaDisponibilita) => {
    const key = `${data}__${fascia}`;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reload = (newMese: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("mese", newMese);
    window.location.href = url.toString();
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("educatoreId", educatoreId);
    fd.set("meseAnno", meseAnno);
    for (const key of checked) {
      fd.set(`slot_${key}`, "on");
    }
    startTransition(async () => {
      setMessage(null);
      const res = await salvaDisponibilitaAction(fd);
      if (res?.error) setMessage(`Errore: ${res.error}`);
      else {
        setMessage("Disponibilità salvate.");
        router.refresh();
      }
    });
  };

  const [y, m] = meseSel.split("-").map((s) => parseInt(s, 10));
  const meseLabel = `${NOMI_MESI[m - 1]} ${y}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label>Mese</Label>
            <Input
              type="month"
              value={meseSel}
              onChange={(e) => setMeseSel(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => reload(meseSel)}>
            Vai al mese
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => reload(shiftMese(meseAnno, -1))}>
              ← mese precedente
            </Button>
            <Button variant="outline" size="sm" onClick={() => reload(shiftMese(meseAnno, 1))}>
              mese successivo →
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold capitalize">{meseLabel}</h2>

      <form onSubmit={submit}>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="text-left p-2 w-32">Giorno</th>
                  {FASCE_DISPONIBILITA.map((f) => (
                    <th key={f} className="p-2 text-center w-24">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {giorni.map((g) => {
                  const isWeekend = g.dow === 0 || g.dow === 6;
                  return (
                    <tr
                      key={g.data}
                      className={`border-b border-[var(--border)] ${isWeekend ? "bg-[var(--muted)]/30" : ""}`}
                    >
                      <td className="p-2">
                        <span className="capitalize text-[var(--muted-foreground)]">
                          {NOMI_GIORNI[g.dow]}
                        </span>{" "}
                        <span className="font-medium">{g.numero}</span>
                      </td>
                      {FASCE_DISPONIBILITA.map((f) => {
                        const key = `${g.data}__${f}`;
                        return (
                          <td key={f} className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={checked.has(key)}
                              onChange={() => toggle(g.data, f)}
                              className="h-4 w-4"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salva disponibilità
          </Button>
          {message && <p className="text-sm">{message}</p>}
          <p className="text-xs text-[var(--muted-foreground)] ml-auto">
            Spunta le caselle nelle fasce in cui sei disponibile per quel giorno.
          </p>
        </div>
      </form>
    </div>
  );
}
