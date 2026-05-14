import { auth } from "@/lib/auth/auth";
import { notFound, redirect } from "next/navigation";
import { listMovimentiInRange } from "@/lib/db/movimenti";
import {
  getVoceRendicontoByCodice,
  listVociRendiconto,
} from "@/lib/db/voci-rendiconto";
import { listCategorie } from "@/lib/db/categorie";
import {
  resolveVoceMovimento,
  TITOLI_SEZIONE_ENTRATA,
  TITOLI_SEZIONE_USCITA,
} from "@/lib/rendiconto/aggregate";
import { VoceDetailClient } from "@/components/rendiconto/voce-detail-client";

function annoCorrente(): number {
  return new Date().getFullYear();
}

function parseAnno(v: string | undefined): number {
  const n = Number.parseInt(v ?? "", 10);
  if (Number.isFinite(n) && n >= 2020 && n <= 2100) return n;
  return annoCorrente();
}

export default async function VoceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    anno?: string;
    q?: string;
    amin?: string;
    amax?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.ruolo !== "admin") redirect("/cassa");

  const { code } = await params;
  const sp = await searchParams;
  const anno = parseAnno(sp.anno);

  const voce = await getVoceRendicontoByCodice(code);
  if (!voce) notFound();

  const [movimenti, voci, categorie] = await Promise.all([
    listMovimentiInRange(`${anno}-01-01`, `${anno}-12-31`),
    listVociRendiconto(),
    listCategorie(),
  ]);

  const categoriaNomeById = new Map(
    categorie.map((c) => [c.recordId, c.nome] as const),
  );

  // Movimenti che risolvono a questa voce (esplicita o via default categoria)
  const movimentiDellaVoce = movimenti
    .filter((m) => {
      const v = resolveVoceMovimento(m, voci, categorie);
      return v?.recordId === voce.recordId;
    })
    .map((m) => ({
      id: m.recordId,
      dataMovimento: m.dataMovimento ?? "",
      descrizione: m.descrizione ?? "",
      conto: m.conto,
      tipo: m.tipo,
      importo: m.importo,
      categoriaNome: m.categoriaId
        ? (categoriaNomeById.get(m.categoriaId) ?? "—")
        : "—",
      voceRendicontoId: m.voceRendicontoId ?? null,
    }));

  // Voci dello stesso tipo del movimento (Uscita → solo U-*; Entrata → solo E-*).
  // Servono al select "Sposta in altra voce".
  const vociPerSposta = voci
    .filter((v) => v.tipo === voce.tipo && v.attivo)
    .sort((a, b) => a.ordering - b.ordering)
    .map((v) => ({
      id: v.recordId,
      codice: v.codice,
      sezione: v.sezione,
      label: v.label,
    }));

  const sectionTitle =
    voce.tipo === "Uscita"
      ? TITOLI_SEZIONE_USCITA[voce.sezione]
      : TITOLI_SEZIONE_ENTRATA[voce.sezione];

  const eyebrow = `Sezione ${voce.sezione} · ${voce.tipo === "Uscita" ? "Uscite" : "Entrate"}`;

  return (
    <VoceDetailClient
      voce={{
        codice: voce.codice,
        label: voce.label,
        tipo: voce.tipo,
        sezione: voce.sezione,
      }}
      eyebrow={eyebrow}
      sectionTitle={sectionTitle}
      anno={anno}
      movimenti={movimentiDellaVoce}
      vociPerSposta={vociPerSposta}
      sezioniTitoli={
        voce.tipo === "Uscita"
          ? TITOLI_SEZIONE_USCITA
          : TITOLI_SEZIONE_ENTRATA
      }
      initialFilters={{
        q: sp.q ?? "",
        amin: sp.amin ?? "",
        amax: sp.amax ?? "",
        period: (sp.period as "all" | "month" | "quarter" | "year" | "custom") ?? "all",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
