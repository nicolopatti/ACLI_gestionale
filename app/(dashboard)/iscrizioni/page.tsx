import Link from "next/link";
import { requireAdminOrCoordinatore } from "@/lib/auth/page-guards";
import {
  ChevronRight,
  Drama,
  GraduationCap,
  Plus,
  Train,
  type LucideIcon,
} from "lucide-react";
import { listIscrizioni } from "@/lib/db/iscrizioni";
import { listAttivita } from "@/lib/db/attivita";
import { listAllMesi } from "@/lib/db/mesi";
import type { Iscrizione, MeseIscrizione } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatEur } from "@/lib/utils";
import type { TipoAttivita } from "@/lib/config";

const ICON_BY_TIPO: Record<TipoAttivita, LucideIcon> = {
  doposcuola: GraduationCap,
  laboratorio: Drama,
  locomotiva: Train,
};

const TONE_BY_TIPO: Record<TipoAttivita, { bg: string; ink: string }> = {
  doposcuola: { bg: "bg-[var(--primary-soft)]", ink: "text-[var(--primary-soft-ink)]" },
  laboratorio: { bg: "bg-[var(--accent-soft)]", ink: "text-[var(--accent-soft-ink)]" },
  locomotiva: { bg: "bg-[var(--info-soft)]", ink: "text-[var(--info-soft-ink)]" },
};

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function rataInRitardo(r: MeseIscrizione, currentMonth: string): boolean {
  if (r.statoPagamento === "pagato") return false;
  // Le righe sconto hanno importo negativo: non sono "in ritardo".
  if (r.tipoRiga === "sconto") return false;
  // Per pacchetto/quota_iscrizione manca chiave_periodo: trattate come
  // dovute al momento corrente, quindi NON in ritardo finche' non pagate.
  if (!r.chiavePeriodo) return false;
  return r.chiavePeriodo.slice(0, 7) < currentMonth;
}

interface AttivitaCardData {
  attivitaId: string;
  attivitaNome: string;
  attivitaTipo: TipoAttivita;
  iscritti: number;
  totaleIncassato: number;
  rateInRitardo: number;
}

export default async function IscrizioniPage() {
  await requireAdminOrCoordinatore();
  const currentMonth = currentMonthKey();

  const [iscrizioni, attivita, allRate] = await Promise.all([
    listIscrizioni(),
    listAttivita(),
    listAllMesi(),
  ]);

  // Aggrego per attivita.
  const byAttivita = new Map<string, {
    iscrizioni: Iscrizione[];
    rate: MeseIscrizione[];
  }>();
  for (const i of iscrizioni) {
    const cur = byAttivita.get(i.attivitaId) ?? { iscrizioni: [], rate: [] };
    cur.iscrizioni.push(i);
    byAttivita.set(i.attivitaId, cur);
  }
  const iscrizioniIds = new Set(iscrizioni.map((i) => i.recordId));
  for (const r of allRate) {
    if (!iscrizioniIds.has(r.iscrizioneId)) continue;
    const iscr = iscrizioni.find((i) => i.recordId === r.iscrizioneId);
    if (!iscr) continue;
    const cur = byAttivita.get(iscr.attivitaId);
    if (cur) cur.rate.push(r);
  }

  const cards: AttivitaCardData[] = [];
  for (const a of attivita) {
    const agg = byAttivita.get(a.recordId);
    if (!agg || agg.iscrizioni.length === 0) continue;
    const totaleIncassato = agg.rate
      .filter((r) => r.statoPagamento === "pagato")
      .reduce((acc, r) => acc + (r.importoPagato ?? 0), 0);
    const rateInRitardo = agg.rate.filter((r) =>
      rataInRitardo(r, currentMonth),
    ).length;
    cards.push({
      attivitaId: a.recordId,
      attivitaNome: a.nome,
      attivitaTipo: a.tipo,
      iscritti: agg.iscrizioni.length,
      totaleIncassato,
      rateInRitardo,
    });
  }

  // Ordina: attivita con iscrizioni in ritardo prima, poi per numero iscritti.
  cards.sort((a, b) => {
    if (a.rateInRitardo !== b.rateInRitardo)
      return b.rateInRitardo - a.rateInRitardo;
    return b.iscritti - a.iscritti;
  });

  // Attivita attive senza iscrizioni: card "vuota" sotto le altre.
  const attivitaConIscrizioniIds = new Set(cards.map((c) => c.attivitaId));
  const attivitaVuote = attivita.filter(
    (a) => a.attivo && !attivitaConIscrizioniIds.has(a.recordId),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Iscrizioni</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
            Seleziona un&apos;attività per gestirne gli iscritti
          </p>
        </div>
        <Button asChild>
          <Link href="/iscrizioni/nuova">
            <Plus className="h-4 w-4" /> Nuova iscrizione
          </Link>
        </Button>
      </div>

      {cards.length === 0 && attivitaVuote.length === 0 ? (
        <Card>
          <CardContent className="text-center text-[var(--muted-foreground)] py-12">
            Nessuna attività configurata.{" "}
            <Link href="/attivita/nuova" className="underline">
              Crea la prima attività
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">
          {cards.map((c) => {
            const Icon = ICON_BY_TIPO[c.attivitaTipo];
            const tone = TONE_BY_TIPO[c.attivitaTipo];
            return (
              <Link
                key={c.attivitaId}
                href={`/iscrizioni/attivita/${c.attivitaId}`}
                className="no-underline"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5 mb-4">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-[10px] grid place-items-center shrink-0",
                          tone.bg,
                          tone.ink,
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-serif text-[18px] font-medium tracking-tight truncate">
                            {c.attivitaNome}
                          </h3>
                          {c.rateInRitardo > 0 && (
                            <Badge variant="destructive">
                              {c.rateInRitardo} in ritardo
                            </Badge>
                          )}
                        </div>
                        <div className="text-[12.5px] text-[var(--muted-foreground)] capitalize">
                          {c.attivitaTipo}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Mini label="Iscritti" value={String(c.iscritti)} highlight />
                      <Mini label="Incassato" value={formatEur(c.totaleIncassato)} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {attivitaVuote.map((a) => {
            const Icon = ICON_BY_TIPO[a.tipo];
            const tone = TONE_BY_TIPO[a.tipo];
            return (
              <Link
                key={a.recordId}
                href={`/iscrizioni/attivita/${a.recordId}`}
                className="no-underline"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-[10px] grid place-items-center shrink-0 opacity-60",
                          tone.bg,
                          tone.ink,
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-serif text-[18px] font-medium tracking-tight truncate text-[var(--muted-foreground)]">
                            {a.nome}
                          </h3>
                        </div>
                        <div className="text-[12.5px] text-[var(--muted-foreground)] capitalize">
                          {a.tipo} · nessun iscritto
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
      <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.06em] mb-0.5">
        {label}
      </div>
      <div
        className={cn(
          "font-serif text-[20px] tabular-nums tracking-tight",
          highlight ? "text-[var(--primary)]" : "text-[var(--ink)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
