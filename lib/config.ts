// Configurazione del calendario doposcuola
// I mesi qui generati per ogni nuova attività doposcuola (set..giu di default)
export const MESI_ANNO_SCOLASTICO = [
  9, 10, 11, 12, 1, 2, 3, 4, 5, 6,
] as const;

export const GIORNI_SETTIMANA = ["lun", "mar", "mer", "gio", "ven"] as const;
export type GiornoSettimana = (typeof GIORNI_SETTIMANA)[number];

export const MEZZI_PAGAMENTO = ["Cassa", "BCC", "Sumup"] as const;
export type MezzoPagamento = (typeof MEZZI_PAGAMENTO)[number];

export const RUOLI = ["admin", "volontario_cassa", "coordinatore_educativo"] as const;
export type Ruolo = (typeof RUOLI)[number];

const ETICHETTE_RUOLO: Record<Ruolo, string> = {
  admin: "Admin",
  volontario_cassa: "Volontario",
  coordinatore_educativo: "Coordinatore",
};

export function etichettaRuolo(ruolo: Ruolo): string {
  return ETICHETTE_RUOLO[ruolo];
}

export const STATO_PAGAMENTO = ["non_pagato", "parziale", "pagato"] as const;
export type StatoPagamento = (typeof STATO_PAGAMENTO)[number];

export const TIPI_ATTIVITA = ["doposcuola", "laboratorio", "locomotiva"] as const;
export type TipoAttivita = (typeof TIPI_ATTIVITA)[number];

export const TIPI_UNITA = ["mese", "giornata", "settimana"] as const;
export type TipoUnita = (typeof TIPI_UNITA)[number];

export const TIPO_ATTIVITA_TO_UNITA: Record<TipoAttivita, TipoUnita> = {
  doposcuola: "mese",
  laboratorio: "giornata",
  locomotiva: "settimana",
};

export const FASCE_ORARIE = ["14-16", "14-18"] as const;
export type FasciaOraria = (typeof FASCE_ORARIE)[number];

export const FASCE_DISPONIBILITA = ["14-16", "14-18", "16-18"] as const;
export type FasciaDisponibilita = (typeof FASCE_DISPONIBILITA)[number];

export const CONTATTO_RUOLI = ["nonno", "nonna", "zio", "zia", "altro"] as const;
export type RuoloContatto = (typeof CONTATTO_RUOLI)[number];

/**
 * Genera i mesi di un anno scolastico in formato `YYYY-MM`.
 * Es. annoScolastico = "2025-2026" → ["2025-09", "2025-10", ..., "2026-06"]
 */
export function generaMesiAnnoScolastico(annoScolastico: string): string[] {
  const [yStart, yEnd] = annoScolastico.split("-").map((s) => parseInt(s, 10));
  if (!yStart || !yEnd) return [];
  return MESI_ANNO_SCOLASTICO.map((m) => {
    const year = m >= 9 ? yStart : yEnd;
    return `${year}-${String(m).padStart(2, "0")}`;
  });
}

/**
 * Restituisce il "mese in corso" come stringa YYYY-MM.
 */
export function meseCorrente(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Restituisce l'anno scolastico in corso ("2025-2026" se siamo da settembre in poi,
 * altrimenti "2024-2025").
 */
export function annoScolasticoCorrente(): string {
  return annoScolasticoDaData(new Date());
}

/**
 * Deriva l'anno scolastico ("YYYY-YYYY") da una data: mese ≥ 9 → year-(year+1),
 * mese ≤ 8 → (year-1)-year. Generalizza `annoScolasticoCorrente`.
 */
export function annoScolasticoDaData(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  if (m >= 9) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

/**
 * Etichetta human-readable per un mese ISO YYYY-MM, es. "settembre 2025".
 */
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

export function etichettaMese(meseAnno: string): string {
  const [y, m] = meseAnno.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || m < 1 || m > 12) return meseAnno;
  return `${NOMI_MESI[m - 1]} ${y}`;
}
