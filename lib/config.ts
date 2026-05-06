// Configurazione del calendario doposcuola
// I mesi qui generati per ogni nuova iscrizione (set..giu di default)
export const MESI_ANNO_SCOLASTICO = [
  9, 10, 11, 12, 1, 2, 3, 4, 5, 6,
] as const;

export const GIORNI_SETTIMANA = ["lun", "mar", "mer", "gio", "ven"] as const;
export type GiornoSettimana = (typeof GIORNI_SETTIMANA)[number];

export const MEZZI_PAGAMENTO = ["Cassa", "BCC", "Sumup"] as const;
export type MezzoPagamento = (typeof MEZZI_PAGAMENTO)[number];

export const RUOLI = ["admin", "volontario_cassa"] as const;
export type Ruolo = (typeof RUOLI)[number];

export const STATO_PAGAMENTO = ["non_pagato", "parziale", "pagato"] as const;
export type StatoPagamento = (typeof STATO_PAGAMENTO)[number];

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
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  if (m >= 9) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}
