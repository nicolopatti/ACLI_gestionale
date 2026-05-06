import type { GiornoSettimana, MezzoPagamento, Ruolo, StatoPagamento } from "@/lib/config";

/**
 * Modelli di dominio. `recordId` è sempre il record id interno di Airtable
 * (formato `recXXXXXXXXXXXXXX`); è la chiave primaria utilizzata in tutta l'app.
 */

export interface User {
  recordId: string;
  email: string;
  passwordHash: string;
  nome: string;
  ruolo: Ruolo;
  attivo: boolean;
  telegramUserId?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface Genitore {
  recordId: string;
  nomeCompleto: string;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  codiceFiscale?: string;
  note?: string;
  bambiniIds: string[];
}

export interface Bambino {
  recordId: string;
  nomeCompleto: string;
  nome: string;
  cognome: string;
  dataNascita?: string;
  scuola?: string;
  classe?: string;
  genitoreId?: string;
  note?: string;
  attivo: boolean;
  iscrizioniIds: string[];
}

export interface Iscrizione {
  recordId: string;
  codice: string;
  bambinoId: string;
  annoScolastico: string;
  dataIscrizione?: string;
  giorniSettimana: GiornoSettimana[];
  importoMensileDefault: number;
  note?: string;
  mesiIds: string[];
}

export interface MeseIscrizione {
  recordId: string;
  codice: string;
  iscrizioneId: string;
  meseAnno: string; // YYYY-MM
  importoDovuto: number;
  statoPagamento: StatoPagamento;
  importoPagato?: number;
  dataPagamento?: string;
  mezzoPagamento?: MezzoPagamento;
  movimentoCollegatoId?: string;
  note?: string;
}

export interface Presenza {
  recordId: string;
  codice: string;
  bambinoId: string;
  iscrizioneId?: string;
  data: string;
  presente: boolean;
  note?: string;
  registratoDaId?: string;
  createdAt?: string;
}

export interface Movimento {
  recordId: string;
  id: string;
  timestamp?: string;
  dataMovimento?: string;
  tipo: "Entrata" | "Uscita";
  importo: number;
  conto: MezzoPagamento;
  categoriaId?: string;
  descrizione?: string;
  volontario?: string;
  telegramUserId?: string;
  stato?: "valido" | "errato" | "corretto";
  note?: string;
  idCorrezione?: string;
  importoSegnato?: number;
  syncedAt?: string;
}

export interface Categoria {
  recordId: string;
  nome: string;
  tipo: "Entrata" | "Uscita";
}
