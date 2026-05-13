/**
 * Backfill: per ogni rata già pagata (`stato_pagamento = 'pagato'`) senza
 * `movimento_id` collegato, crea un Movimento Entrata e collega via FK.
 * Idempotente: salta le rate che hanno già un movimento.
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/backfill-rate-movimenti.ts [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/db/types.gen";

const dryRun = process.argv.includes("--dry-run");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mancano SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function newRataId(): string {
  return `rata_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  // 1. Recupero la categoria "Quote iscrizione" con la sua voce default
  const { data: catRow, error: catErr } = await db
    .from("categorie")
    .select("id, voce_rendiconto_default_id")
    .eq("tipo", "Entrata")
    .ilike("nome", "quote iscrizione")
    .maybeSingle();
  if (catErr) throw catErr;
  const categoriaQuoteId = catRow?.id;
  const voceDefaultId = catRow?.voce_rendiconto_default_id ?? null;
  console.log(
    `Categoria 'Quote iscrizione': ${categoriaQuoteId ?? "(non trovata)"} · voce default: ${voceDefaultId ?? "(nessuna)"}`,
  );

  // 2. Trovo tutte le rate pagate senza movimento
  const { data: rate, error: rateErr } = await db
    .from("rate")
    .select(
      "id, importo_pagato, importo_dovuto, data_pagamento, mezzo_pagamento, chiave_periodo, note, iscrizione:iscrizioni!inner(bambino:bambini!inner(nome, cognome), attivita:attivita!inner(nome))",
    )
    .eq("stato_pagamento", "pagato")
    .is("movimento_id", null);
  if (rateErr) throw rateErr;

  console.log(`Trovate ${rate?.length ?? 0} rate pagate senza movimento.`);
  if (!rate || rate.length === 0) return;

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const r of rate) {
    if (!r.importo_pagato || !r.data_pagamento || !r.mezzo_pagamento) {
      console.log(`  skip rata ${r.id}: campi pagamento incompleti`);
      skipped++;
      continue;
    }
    const iscr = r.iscrizione as unknown as {
      bambino: { nome: string; cognome: string };
      attivita: { nome: string };
    };
    const descrizione = `${iscr.attivita.nome} - ${iscr.bambino.nome} ${iscr.bambino.cognome}${
      r.chiave_periodo ? ` (${r.chiave_periodo})` : ""
    }`;

    const movId = newRataId();
    if (dryRun) {
      console.log(
        `  [dry-run] Creerei ${movId} ${r.mezzo_pagamento} +${r.importo_pagato}€ "${descrizione}" e linko a rata ${r.id}`,
      );
      created++;
      linked++;
      continue;
    }
    const { error: insErr } = await db.from("movimenti").insert({
      id: movId,
      tipo: "Entrata",
      importo: r.importo_pagato,
      conto: r.mezzo_pagamento,
      data_movimento: r.data_pagamento,
      timestamp: new Date().toISOString(),
      stato: "valido",
      categoria_id: categoriaQuoteId,
      voce_rendiconto_id: voceDefaultId,
      descrizione,
      origine: "rata",
      note: r.note,
      is_giroconto: false,
    });
    if (insErr) {
      console.error(`  ERRORE insert movimento per rata ${r.id}:`, insErr.message);
      skipped++;
      continue;
    }
    created++;
    const { error: updErr } = await db
      .from("rate")
      .update({ movimento_id: movId })
      .eq("id", r.id);
    if (updErr) {
      console.error(`  ERRORE link rata ${r.id} → ${movId}:`, updErr.message);
      continue;
    }
    linked++;
    console.log(`  ✓ rata ${r.id} → movimento ${movId}`);
  }

  console.log(
    `\nDone. created=${created} linked=${linked} skipped=${skipped}${dryRun ? " (dry-run)" : ""}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
