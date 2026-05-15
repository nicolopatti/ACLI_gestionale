import type {
  FasciaOraria,
  GiornoSettimana,
  MezzoPagamento,
  RuoloContatto,
  Ruolo,
  StatoPagamento,
  TipoAttivita,
  TipoPrezzo,
  TipoRigaRata,
  TipoSconto,
  TipoUnita,
} from "@/lib/config";

/**
 * Modelli di dominio. `recordId` corrisponde al PK della riga su Supabase
 * (uuid generato lato Postgres). Il nome storico viene dall'era Airtable
 * (`recXXXXXXXXXXXXXX`) ma il formato attuale e' uuid v4.
 */

export interface User {
  recordId: string;
  email: string;
  passwordHash: string;
  nome: string;
  ruolo: Ruolo;
  attivo: boolean;
  mustChangePassword: boolean;
  /**
   * Versione monotonicamente crescente del materiale di autenticazione.
   * Incrementata ad ogni cambio password (self-service / primo accesso /
   * reset admin). Il JWT contiene la versione corrente al login; il proxy
   * verifica ad ogni richiesta che combaci, altrimenti forza re-login.
   * Cosi' un cambio password invalida immediatamente tutte le sessioni
   * esistenti dell'utente.
   */
  passwordVersion: number;
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
  dataInizio?: string;
  dataFine?: string;
  attivo: boolean;
  note?: string;
  /**
   * Giorni della settimana in cui l'attività ha luogo. Per doposcuola tipicamente
   * lun..ven; per laboratorio/locomotiva può includere weekend. Vuoto = nessun
   * vincolo dichiarato (l'attività non comparirà nella griglia turni finché
   * non vengono definiti).
   */
  giorniSettimana: GiornoSettimana[];
  /**
   * Fasce orarie offerte dall'attività. Stessa semantica di `Disponibilita.fasciaOraria`.
   * Se vuoto, l'attività non popola la griglia turni.
   */
  fasceOrarie: FasciaOraria[];
  /**
   * Quota di iscrizione una-tantum (€). Se valorizzata, il form di iscrizione
   * espone una checkbox per applicarla; al check viene materializzata come
   * rata `tipo_riga = 'quota_iscrizione'`.
   */
  quotaIscrizione?: number;
  sessioniIds: string[];
  iscrizioniIds: string[];
  modalitaIds: string[];
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
  /**
   * Fascia oraria della sessione. Richiesta per laboratorio (tipo_unita "giornata")
   * e locomotiva (tipo_unita "settimana"). Per doposcuola (tipo_unita "mese") è
   * lasciata vuota: le fasce vengono dalle iscrizioni dei bambini.
   */
  fasciaOraria?: FasciaOraria;
}

export interface ModalitaIscrizione {
  recordId: string;
  attivitaId: string;
  nome: string;
  importo: number;
  /**
   * Politica di prezzo:
   *  - per_sessione: l'importo è unitario, viene moltiplicato per le sessioni scelte.
   *  - flat: l'importo è il prezzo totale del pacchetto, indipendente dalle sessioni.
   */
  tipoPrezzo: TipoPrezzo;
  descrizione?: string;
  attivo: boolean;
}

export interface ScontoAttivita {
  recordId: string;
  attivitaId: string;
  nome: string;
  tipo: TipoSconto;
  /** Valore: % se tipo=percentuale (0-100), € se tipo=fisso (sempre > 0). */
  valore: number;
  descrizione?: string;
  ordering: number;
  attivo: boolean;
}

export interface Iscrizione {
  recordId: string;
  codice: string;
  bambinoId: string;
  attivitaId: string;
  modalitaId: string;
  dataIscrizione?: string;
  giorniSettimana: GiornoSettimana[];
  fasceOrarie: FasciaOraria[];
  sessioniSelteIds: string[];
  /** Id degli sconti applicati a questa iscrizione (regole su `sconti_attivita`). */
  scontiIds: string[];
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
  /**
   * Tipo di riga. Per backward-compat le 16 rate storiche sono "sessione".
   * Le righe nuove possono essere pacchetto/quota_iscrizione/sconto e in quel
   * caso `sessioneId` è null, `descrizioneRiga` contiene l'etichetta umana.
   */
  tipoRiga: TipoRigaRata;
  /** Etichetta umana per righe non legate a una sessione (pacchetto/quota/sconto). */
  descrizioneRiga?: string;
  note?: string;
}

export interface Presenza {
  recordId: string;
  codice: string;
  bambinoId: string;
  sessioneId?: string;
  data: string;
  presente?: boolean;
  oraIngresso?: string;
  oraUscita?: string;
  note?: string;
  registratoDaId?: string;
  createdAt?: string;
}

export function presenzaAssente(p: Presenza): boolean {
  if (typeof p.presente === "boolean") return !p.presente;
  return !p.oraIngresso && !p.oraUscita;
}

export interface Educatore {
  recordId: string;
  nomeCompleto: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  note?: string;
  attivo: boolean;
}

export interface Disponibilita {
  recordId: string;
  educatoreId: string;
  data: string;
  fasciaOraria: FasciaOraria;
  oraIngresso?: string;
  oraUscita?: string;
  note?: string;
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
  voceRendicontoId?: string;
  origine?: OrigineMovimento;
  fingerprintBank?: string;
  isGiroconto: boolean;
}

export type OrigineMovimento =
  | "telegram"
  | "app"
  | "rata"
  | "bank_import";

export interface Categoria {
  recordId: string;
  nome: string;
  tipo: "Entrata" | "Uscita";
  voceRendicontoDefaultId?: string;
}

export type SezioneRendiconto = "A" | "B" | "C" | "D" | "E";

export interface VoceRendiconto {
  recordId: string;
  codice: string;
  tipo: "Entrata" | "Uscita";
  sezione: SezioneRendiconto;
  numero: number;
  label: string;
  ordering: number;
  attivo: boolean;
}
