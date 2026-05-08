import type { TipoUnita } from "@/lib/config";

const NOMI_MESI_LUNGHI = [
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

const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI_BREVI = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
];

/**
 * Settimana ISO: YYYY-Www. Una settimana è "del" l'anno che contiene il suo giovedì.
 */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Deriva chiave + etichetta di una sessione a partire da `tipoUnita` e `dataInizio`
 * in formato ISO `YYYY-MM-DD`.
 *
 * - mese     → chiave `YYYY-MM`,    etichetta es. "settembre 2025"
 * - giornata → chiave `YYYY-MM-DD`, etichetta es. "sab 27 dic"
 * - settimana→ chiave `YYYY-Www`,   etichetta es. "Settimana 2026-W27"
 *
 * Le date sono trattate in UTC per evitare slittamenti di fuso orario.
 */
export function deriveChiaveEtichetta(
  tipoUnita: TipoUnita,
  dataInizio: string,
): { chiave: string; etichetta: string } | null {
  if (!dataInizio || !/^\d{4}-\d{2}-\d{2}$/.test(dataInizio)) return null;
  const [y, m, d] = dataInizio.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return null;
  if (tipoUnita === "mese") {
    const chiave = `${y}-${String(m).padStart(2, "0")}`;
    return { chiave, etichetta: `${NOMI_MESI_LUNGHI[m - 1]} ${y}` };
  }
  if (tipoUnita === "giornata") {
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = GIORNI_BREVI[date.getUTCDay()];
    const mese = MESI_BREVI[m - 1];
    return { chiave: dataInizio, etichetta: `${dow} ${d} ${mese}` };
  }
  // settimana
  const date = new Date(Date.UTC(y, m - 1, d));
  const chiave = isoWeek(date);
  return { chiave, etichetta: `Settimana ${chiave}` };
}

/**
 * Primo e ultimo giorno del mese in formato ISO YYYY-MM-DD.
 */
export function primoEUltimoGiornoDelMese(meseAnno: string): {
  dataInizio: string;
  dataFine: string;
} {
  const [y, m] = meseAnno.split("-").map((s) => parseInt(s, 10));
  const inizio = `${y}-${String(m).padStart(2, "0")}-01`;
  const ultimoGiorno = new Date(y, m, 0).getDate();
  const fine = `${y}-${String(m).padStart(2, "0")}-${String(ultimoGiorno).padStart(2, "0")}`;
  return { dataInizio: inizio, dataFine: fine };
}
