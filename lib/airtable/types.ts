import type {
  FasciaOraria,
  GiornoSettimana,
  MezzoPagamento,
  RuoloContatto,
  Ruolo,
  StatoPagamento,
  TipoAttivita,
  TipoUnita,
} from "@/lib/config";

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

export interface Bambino {
  recordId: string;
  nomeCompleto: string;
  nome: string;
  cognome: string;
  dataNascita?: string;
  scuola?: string;
  classe?: string;
  nomeGenitore: string;
  cognomeGenitore: string;
  telefonoGenitore?: string;
  emailGenitore?: string;
  cfGenitore?: string;
  fratelloDiId?: string;
  note?: string;
  attivo: boolean;
  iscrizioniIds: string[];
  contattiAggiuntiviIds: string[];
}

export interface ContattoAggiuntivo {
  recordId: string;
  bambinoId: string;
  ruolo: RuoloContatto;
  nome: string;
  cognome: string;
  telefono?: string;
  note?: string;
}

export interface Attivita {
  recordId: string;
  nome: string;
  tipo: TipoAttivita;
  annoScolastico?: string;
  dataInizio?: string;
  dataFine?: string;
  importoDefault: number;
  attivo: boolean;
  note?: string;
  sessioniIds: string[];
  iscrizioniIds: string[];
}

export interface Sessione {
  recordId: string;
  attivitaId: string;
  tipoUnita: TipoUnita;
  chiave: string;
  etichetta: string;
  dataInizio?: string;
  dataFine?: string;
  importo?: number;
}

export interface Iscrizione {
  recordId: string;
  codice: string;
  bambinoId: string;
  attivitaId: string;
  annoScolastico: string;
  dataIscrizione?: string;
  giorniSettimana: GiornoSettimana[];
  fasceOrarie: FasciaOraria[];
  sessioniSelteIds: string[];
  note?: string;
  rateIds: string[];
}

export interface MeseIscrizione {
  recordId: string;
  codice: string;
  iscrizioneId: string;
  sessioneId?: string;
  tipoUnita?: TipoUnita;
  chiavePeriodo?: string;
  meseAnno: string;
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
  sessioneId?: string;
  data: string;
  oraIngresso?: string;
  oraUscita?: string;
  note?: string;
  registratoDaId?: string;
  createdAt?: string;
}

export function presenzaAssente(p: Presenza): boolean {
  return !p.oraIngresso && !p.oraUscita;
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
