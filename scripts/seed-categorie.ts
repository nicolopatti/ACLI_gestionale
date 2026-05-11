/**
 * Popola la tabella Categorie con un set base.
 * Modifica le liste sotto se vuoi categorizzazioni diverse.
 *
 * Uso: pnpm seed:categorie
 */
import { ensureCategoria, listCategorie } from "../lib/db/categorie";

const ENTRATE = [
  "Quote iscrizione",
  "Donazioni",
  "Tesseramenti",
  "Eventi",
  "Altro",
];

const USCITE = [
  "Cancelleria",
  "Materiale didattico",
  "Trasporti e rimborsi km",
  "Compensi educatori",
  "Utenze",
  "Affitto",
  "Manutenzione",
  "Altro",
];

async function main() {
  const before = await listCategorie();
  console.log(`Categorie esistenti: ${before.length}`);
  for (const nome of ENTRATE) {
    const c = await ensureCategoria(nome, "Entrata");
    console.log(`  Entrata: ${c.nome}`);
  }
  for (const nome of USCITE) {
    const c = await ensureCategoria(nome, "Uscita");
    console.log(`  Uscita:  ${c.nome}`);
  }
  console.log("Seed completato.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
