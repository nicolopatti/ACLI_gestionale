import Link from "next/link";
import { Mail, Pencil, Phone, Plus } from "lucide-react";
import { listEducatori } from "@/lib/airtable/educatori";
import { listDisponibilitaByMese } from "@/lib/airtable/disponibilita";
import { listAttivita } from "@/lib/airtable/attivita";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CalendarioDisponibilita } from "@/components/educatori/calendario-disponibilita";
import { AttivitaConfigInline } from "@/components/attivita/config-inline";
import { cn } from "@/lib/utils";

/**
 * Default operativi (lun-ven, 14-16/16-18) usati quando un'attività esiste ma
 * non ha ancora giorni o fasce configurate. Il default operativo è coerente
 * col prototipo Claude Design.
 */
const DEFAULT_GIORNI: import("@/lib/config").GiornoSettimana[] = [
  "lun",
  "mar",
  "mer",
  "gio",
  "ven",
];
const DEFAULT_FASCE: FasciaDisponibilita[] = ["14-16", "16-18"];
import { FASCE_DISPONIBILITA, type FasciaDisponibilita } from "@/lib/config";
import type { Disponibilita } from "@/lib/airtable/types";

const ORE_PER_FASCIA: Record<FasciaDisponibilita, number> = {
  "14-16": 2,
  "14-18": 4,
  "16-18": 2,
};

function meseCorrenteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function meseLabel(meseAnno: string): string {
  const [y, m] = meseAnno.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}

function aggregaOreEduMese(disp: Disponibilita[]): Map<
  string,
  { ore: number; giorni: number; count: number }
> {
  const map = new Map<string, { ore: number; giorni: Set<string>; count: number }>();
  for (const d of disp) {
    const cur = map.get(d.educatoreId) ?? { ore: 0, giorni: new Set<string>(), count: 0 };
    cur.ore += ORE_PER_FASCIA[d.fasciaOraria] ?? 0;
    cur.giorni.add(d.data);
    cur.count += 1;
    map.set(d.educatoreId, cur);
  }
  const out = new Map<string, { ore: number; giorni: number; count: number }>();
  for (const [k, v] of map) {
    out.set(k, { ore: v.ore, giorni: v.giorni.size, count: v.count });
  }
  return out;
}

export default async function EducatoriPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; mese?: string; attivitaId?: string }>;
}) {
  const sp = await searchParams;
  const meseAnno = sp.mese && /^\d{4}-\d{2}$/.test(sp.mese) ? sp.mese : meseCorrenteIso();

  const [educatori, dispMese, attivita] = await Promise.all([
    listEducatori(),
    listDisponibilitaByMese(meseAnno),
    listAttivita({ attivo: true }),
  ]);

  // Default attivitaId: prima doposcuola attiva, fallback prima attività attiva
  const attivitaId =
    sp.attivitaId === "" // selezione esplicita "tutte"
      ? ""
      : sp.attivitaId ||
        attivita.find((a) => a.tipo === "doposcuola")?.recordId ||
        attivita[0]?.recordId ||
        "";
  const attivitaSel = attivita.find((a) => a.recordId === attivitaId);
  const giorniAttiviList: import("@/lib/config").GiornoSettimana[] | undefined = !attivitaSel
    ? undefined
    : attivitaSel.giorniSettimana.length > 0
      ? attivitaSel.giorniSettimana
      : DEFAULT_GIORNI;
  const fasceVisibili: FasciaDisponibilita[] = !attivitaSel
    ? [...FASCE_DISPONIBILITA]
    : attivitaSel.fasceOrarie.length > 0
      ? FASCE_DISPONIBILITA.filter((f) => attivitaSel.fasceOrarie.includes(f))
      : DEFAULT_FASCE;

  const oreByEducatore = aggregaOreEduMese(dispMese);

  // Ordina: attivi prima, poi per cognome
  const educatoriSorted = [...educatori].sort((a, b) => {
    if (a.attivo !== b.attivo) return a.attivo ? -1 : 1;
    return a.cognome.localeCompare(b.cognome, "it");
  });

  const selId =
    (sp.id && educatoriSorted.find((e) => e.recordId === sp.id)?.recordId) ??
    educatoriSorted[0]?.recordId ??
    "";
  const selected = educatoriSorted.find((e) => e.recordId === selId);
  const selectedDisp = dispMese.filter((d) => d.educatoreId === selId);
  const selStats = oreByEducatore.get(selId) ?? { ore: 0, giorni: 0, count: 0 };

  function buildHref(id: string): string {
    const next = new URLSearchParams();
    next.set("id", id);
    if (sp.mese) next.set("mese", meseAnno);
    if (sp.attivitaId !== undefined) next.set("attivitaId", attivitaId);
    return `?${next.toString()}`;
  }

  function buildAttivitaHref(targetId: string | null): string {
    const next = new URLSearchParams();
    if (sp.id) next.set("id", sp.id);
    if (sp.mese) next.set("mese", meseAnno);
    // "" = tutte le attività (override esplicito del default)
    next.set("attivitaId", targetId ?? "");
    return `?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Educatori</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5 capitalize">
            Anagrafica + calendario disponibilità · {meseLabel(meseAnno)}
          </p>
        </div>
        <Button asChild>
          <Link href="/educatori/nuovo">
            <Plus className="h-4 w-4" /> Nuovo
          </Link>
        </Button>
      </div>

      {attivita.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] text-[var(--muted-foreground)] mr-1">
            Attività:
          </span>
          <Link
            href={buildAttivitaHref(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors no-underline",
              !attivitaSel
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--border-strong)]",
            )}
          >
            Tutte le attività
          </Link>
          {attivita.map((a) => {
            const active = attivitaSel?.recordId === a.recordId;
            return (
              <Link
                key={a.recordId}
                href={buildAttivitaHref(a.recordId)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors no-underline",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--border-strong)]",
                )}
                title={
                  a.giorniSettimana.length > 0 || a.fasceOrarie.length > 0
                    ? `${a.giorniSettimana.join(", ") || "tutti i giorni"} · ${a.fasceOrarie.join(", ") || "tutte le fasce"}`
                    : "Nessun filtro configurato"
                }
              >
                {a.nome}
              </Link>
            );
          })}
        </div>
      )}

      {attivitaSel ? (
        <AttivitaConfigInline
          attivitaId={attivitaSel.recordId}
          attivitaNome={attivitaSel.nome}
          giorniIniziali={attivitaSel.giorniSettimana}
          fasceIniziali={attivitaSel.fasceOrarie}
        />
      ) : null}

      {educatoriSorted.length === 0 ? (
        <Card>
          <CardContent className="text-center text-[var(--muted-foreground)] py-12">
            Nessun educatore registrato.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="self-start overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-serif text-[16px] font-medium tracking-tight">Team</h2>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                {educatoriSorted.length} educatori ·{" "}
                {educatoriSorted.filter((e) => e.attivo).length} attivi
              </p>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {educatoriSorted.map((e) => {
                const stats = oreByEducatore.get(e.recordId);
                const fullName = `${e.nome} ${e.cognome}`.trim();
                const isSel = e.recordId === selId;
                return (
                  <li key={e.recordId}>
                    <Link
                      href={buildHref(e.recordId)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 transition-colors no-underline",
                        isSel
                          ? "bg-[var(--primary-soft)] text-[var(--primary-soft-ink)]"
                          : "hover:bg-[var(--surface-2)] text-[var(--ink)]",
                      )}
                    >
                      <Avatar name={fullName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[13.5px] truncate">{fullName}</div>
                        {e.telefono && (
                          <div
                            className={cn(
                              "text-[11.5px] font-mono truncate",
                              isSel
                                ? "text-[var(--primary-soft-ink)]/70"
                                : "text-[var(--muted-foreground)]",
                            )}
                          >
                            {e.telefono}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {e.attivo ? (
                          <Badge variant="success">Attivo</Badge>
                        ) : (
                          <Badge variant="outline">Inattivo</Badge>
                        )}
                        <div
                          className={cn(
                            "text-[11.5px] mt-1 tabular-nums",
                            isSel
                              ? "text-[var(--primary-soft-ink)]/70"
                              : "text-[var(--muted-foreground)]",
                          )}
                        >
                          {stats?.ore ?? 0}h / mese
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          {selected ? (
            <div className="space-y-4 min-w-0">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3.5 mb-5">
                    <Avatar name={`${selected.nome} ${selected.cognome}`} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-serif text-[22px] font-medium tracking-tight truncate">
                        {selected.nome} {selected.cognome}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--muted-foreground)] mt-1">
                        {selected.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> {selected.email}
                          </span>
                        )}
                        {selected.telefono && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" /> {selected.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/educatori/${selected.recordId}`}>
                        <Pencil className="w-4 h-4" /> Modifica scheda
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Mini label="Giorni col turno" value={selStats.giorni.toString()} />
                    <Mini label="Ore pianificate" value={`${selStats.ore}h`} />
                    <Mini label="Disponibilità" value={selStats.count.toString()} />
                    <Mini
                      label="Stato"
                      value={selected.attivo ? "In servizio" : "Pausa"}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <div className="px-5 py-4 border-b border-[var(--border)]">
                  <h2 className="font-serif text-[16px] font-medium tracking-tight">
                    Disponibilità
                    <span className="text-[var(--muted-foreground)] font-normal ml-2 capitalize">
                      · {meseLabel(meseAnno)}
                    </span>
                  </h2>
                  <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                    Click su un giorno per modificare le fasce
                  </p>
                </div>
                <CardContent>
                  <CalendarioDisponibilita
                    educatoreId={selected.recordId}
                    meseAnno={meseAnno}
                    disponibilita={selectedDisp}
                    giorniAmmessi={giorniAttiviList}
                    fasce={fasceVisibili}
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
      <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.06em]">
        {label}
      </div>
      <div className="text-[16px] font-medium text-[var(--ink)] mt-1 tabular-nums">{value}</div>
    </div>
  );
}
