// Tipi generati automaticamente da Supabase. NON modificare a mano.
// Per rigenerare: `pnpm db:types` (o `supabase gen types typescript --project-id <ref>`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attivita: {
        Row: {
          attivo: boolean
          created_at: string
          data_fine: string | null
          data_inizio: string | null
          fasce_orarie: string[]
          giorni_settimana: string[]
          id: string
          nome: string
          note: string | null
          quota_iscrizione: number | null
          tipo: Database["public"]["Enums"]["tipo_attivita"]
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          fasce_orarie?: string[]
          giorni_settimana?: string[]
          id?: string
          nome: string
          note?: string | null
          quota_iscrizione?: number | null
          tipo: Database["public"]["Enums"]["tipo_attivita"]
        }
        Update: {
          attivo?: boolean
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          fasce_orarie?: string[]
          giorni_settimana?: string[]
          id?: string
          nome?: string
          note?: string | null
          quota_iscrizione?: number | null
          tipo?: Database["public"]["Enums"]["tipo_attivita"]
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bambini: {
        Row: {
          attivo: boolean
          cf_genitore: string | null
          classe: string | null
          cognome: string
          cognome_genitore: string
          created_at: string
          data_nascita: string | null
          email_genitore: string | null
          fratello_di: string | null
          id: string
          nome: string
          nome_genitore: string
          note: string | null
          scuola: string | null
          telefono_genitore: string | null
        }
        Insert: {
          attivo?: boolean
          cf_genitore?: string | null
          classe?: string | null
          cognome: string
          cognome_genitore?: string
          created_at?: string
          data_nascita?: string | null
          email_genitore?: string | null
          fratello_di?: string | null
          id?: string
          nome: string
          nome_genitore?: string
          note?: string | null
          scuola?: string | null
          telefono_genitore?: string | null
        }
        Update: {
          attivo?: boolean
          cf_genitore?: string | null
          classe?: string | null
          cognome?: string
          cognome_genitore?: string
          created_at?: string
          data_nascita?: string | null
          email_genitore?: string | null
          fratello_di?: string | null
          id?: string
          nome?: string
          nome_genitore?: string
          note?: string | null
          scuola?: string | null
          telefono_genitore?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bambini_fratello_di_fkey"
            columns: ["fratello_di"]
            isOneToOne: false
            referencedRelation: "bambini"
            referencedColumns: ["id"]
          },
        ]
      }
      categorie: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          voce_rendiconto_default_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          voce_rendiconto_default_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          voce_rendiconto_default_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorie_voce_rendiconto_default_id_fkey"
            columns: ["voce_rendiconto_default_id"]
            isOneToOne: false
            referencedRelation: "voci_rendiconto"
            referencedColumns: ["id"]
          },
        ]
      }
      contatti_aggiuntivi: {
        Row: {
          bambino_id: string
          cognome: string
          created_at: string
          id: string
          nome: string
          note: string | null
          ruolo: Database["public"]["Enums"]["ruolo_contatto"]
          telefono: string | null
        }
        Insert: {
          bambino_id: string
          cognome: string
          created_at?: string
          id?: string
          nome: string
          note?: string | null
          ruolo: Database["public"]["Enums"]["ruolo_contatto"]
          telefono?: string | null
        }
        Update: {
          bambino_id?: string
          cognome?: string
          created_at?: string
          id?: string
          nome?: string
          note?: string | null
          ruolo?: Database["public"]["Enums"]["ruolo_contatto"]
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatti_aggiuntivi_bambino_id_fkey"
            columns: ["bambino_id"]
            isOneToOne: false
            referencedRelation: "bambini"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilita: {
        Row: {
          created_at: string
          data: string
          educatore_id: string
          fascia_oraria: string
          id: string
          note: string | null
          ora_ingresso: string | null
          ora_uscita: string | null
        }
        Insert: {
          created_at?: string
          data: string
          educatore_id: string
          fascia_oraria: string
          id?: string
          note?: string | null
          ora_ingresso?: string | null
          ora_uscita?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          educatore_id?: string
          fascia_oraria?: string
          id?: string
          note?: string | null
          ora_ingresso?: string | null
          ora_uscita?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disponibilita_educatore_id_fkey"
            columns: ["educatore_id"]
            isOneToOne: false
            referencedRelation: "educatori"
            referencedColumns: ["id"]
          },
        ]
      }
      educatori: {
        Row: {
          attivo: boolean
          cognome: string
          created_at: string
          email: string | null
          id: string
          nome: string
          note: string | null
          telefono: string | null
        }
        Insert: {
          attivo?: boolean
          cognome: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          telefono?: string | null
        }
        Update: {
          attivo?: boolean
          cognome?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      iscrizioni: {
        Row: {
          attivita_id: string
          bambino_id: string
          codice: string | null
          created_at: string
          data_iscrizione: string | null
          fasce_orarie: string[]
          giorni_settimana: string[]
          id: string
          modalita_id: string
          note: string | null
        }
        Insert: {
          attivita_id: string
          bambino_id: string
          codice?: string | null
          created_at?: string
          data_iscrizione?: string | null
          fasce_orarie?: string[]
          giorni_settimana?: string[]
          id?: string
          modalita_id: string
          note?: string | null
        }
        Update: {
          attivita_id?: string
          bambino_id?: string
          codice?: string | null
          created_at?: string
          data_iscrizione?: string | null
          fasce_orarie?: string[]
          giorni_settimana?: string[]
          id?: string
          modalita_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iscrizioni_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iscrizioni_bambino_id_fkey"
            columns: ["bambino_id"]
            isOneToOne: false
            referencedRelation: "bambini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iscrizioni_modalita_id_fkey"
            columns: ["modalita_id"]
            isOneToOne: false
            referencedRelation: "modalita_iscrizione"
            referencedColumns: ["id"]
          },
        ]
      }
      iscrizioni_sconti: {
        Row: {
          created_at: string
          iscrizione_id: string
          sconto_id: string
        }
        Insert: {
          created_at?: string
          iscrizione_id: string
          sconto_id: string
        }
        Update: {
          created_at?: string
          iscrizione_id?: string
          sconto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iscrizioni_sconti_iscrizione_id_fkey"
            columns: ["iscrizione_id"]
            isOneToOne: false
            referencedRelation: "iscrizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iscrizioni_sconti_sconto_id_fkey"
            columns: ["sconto_id"]
            isOneToOne: false
            referencedRelation: "sconti_attivita"
            referencedColumns: ["id"]
          },
        ]
      }
      iscrizioni_sessioni: {
        Row: {
          created_at: string
          iscrizione_id: string
          sessione_id: string
        }
        Insert: {
          created_at?: string
          iscrizione_id: string
          sessione_id: string
        }
        Update: {
          created_at?: string
          iscrizione_id?: string
          sessione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iscrizioni_sessioni_iscrizione_id_fkey"
            columns: ["iscrizione_id"]
            isOneToOne: false
            referencedRelation: "iscrizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iscrizioni_sessioni_sessione_id_fkey"
            columns: ["sessione_id"]
            isOneToOne: false
            referencedRelation: "sessioni"
            referencedColumns: ["id"]
          },
        ]
      }
      modalita_iscrizione: {
        Row: {
          attivita_id: string
          attivo: boolean
          created_at: string
          descrizione: string | null
          id: string
          importo: number
          nome: string
          tipo_prezzo: Database["public"]["Enums"]["tipo_prezzo"]
        }
        Insert: {
          attivita_id: string
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          importo: number
          nome: string
          tipo_prezzo?: Database["public"]["Enums"]["tipo_prezzo"]
        }
        Update: {
          attivita_id?: string
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          importo?: number
          nome?: string
          tipo_prezzo?: Database["public"]["Enums"]["tipo_prezzo"]
        }
        Relationships: [
          {
            foreignKeyName: "modalita_iscrizione_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
        ]
      }
      movimenti: {
        Row: {
          categoria_id: string | null
          conto: Database["public"]["Enums"]["mezzo_pagamento"]
          created_at: string
          data_movimento: string | null
          descrizione: string | null
          fingerprint_bank: string | null
          id: string
          id_correzione: string | null
          importo: number
          importo_segnato: number | null
          is_giroconto: boolean
          note: string | null
          origine: string | null
          stato: Database["public"]["Enums"]["stato_movimento"] | null
          synced_at: string | null
          telegram_user_id: string | null
          timestamp: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          voce_rendiconto_id: string | null
          volontario: string | null
        }
        Insert: {
          categoria_id?: string | null
          conto: Database["public"]["Enums"]["mezzo_pagamento"]
          created_at?: string
          data_movimento?: string | null
          descrizione?: string | null
          fingerprint_bank?: string | null
          id: string
          id_correzione?: string | null
          importo: number
          importo_segnato?: number | null
          is_giroconto?: boolean
          note?: string | null
          origine?: string | null
          stato?: Database["public"]["Enums"]["stato_movimento"] | null
          synced_at?: string | null
          telegram_user_id?: string | null
          timestamp?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          voce_rendiconto_id?: string | null
          volontario?: string | null
        }
        Update: {
          categoria_id?: string | null
          conto?: Database["public"]["Enums"]["mezzo_pagamento"]
          created_at?: string
          data_movimento?: string | null
          descrizione?: string | null
          fingerprint_bank?: string | null
          id?: string
          id_correzione?: string | null
          importo?: number
          importo_segnato?: number | null
          is_giroconto?: boolean
          note?: string | null
          origine?: string | null
          stato?: Database["public"]["Enums"]["stato_movimento"] | null
          synced_at?: string | null
          telegram_user_id?: string | null
          timestamp?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          voce_rendiconto_id?: string | null
          volontario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_voce_rendiconto_id_fkey"
            columns: ["voce_rendiconto_id"]
            isOneToOne: false
            referencedRelation: "voci_rendiconto"
            referencedColumns: ["id"]
          },
        ]
      }
      presenze: {
        Row: {
          bambino_id: string
          codice: string | null
          created_at: string
          data: string
          id: string
          note: string | null
          ora_ingresso: string | null
          ora_uscita: string | null
          presente: boolean | null
          registrato_da: string | null
          sessione_id: string | null
        }
        Insert: {
          bambino_id: string
          codice?: string | null
          created_at?: string
          data: string
          id?: string
          note?: string | null
          ora_ingresso?: string | null
          ora_uscita?: string | null
          presente?: boolean | null
          registrato_da?: string | null
          sessione_id?: string | null
        }
        Update: {
          bambino_id?: string
          codice?: string | null
          created_at?: string
          data?: string
          id?: string
          note?: string | null
          ora_ingresso?: string | null
          ora_uscita?: string | null
          presente?: boolean | null
          registrato_da?: string | null
          sessione_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presenze_bambino_id_fkey"
            columns: ["bambino_id"]
            isOneToOne: false
            referencedRelation: "bambini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presenze_registrato_da_fkey"
            columns: ["registrato_da"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presenze_sessione_id_fkey"
            columns: ["sessione_id"]
            isOneToOne: false
            referencedRelation: "sessioni"
            referencedColumns: ["id"]
          },
        ]
      }
      rate: {
        Row: {
          chiave_periodo: string | null
          codice: string | null
          created_at: string
          data_pagamento: string | null
          descrizione_riga: string | null
          id: string
          importo_dovuto: number
          importo_pagato: number | null
          iscrizione_id: string
          mese_anno: string | null
          mezzo_pagamento: Database["public"]["Enums"]["mezzo_pagamento"] | null
          movimento_id: string | null
          note: string | null
          sessione_id: string | null
          stato_pagamento: Database["public"]["Enums"]["stato_pagamento"]
          tipo_riga: Database["public"]["Enums"]["tipo_riga_rata"]
          tipo_unita: Database["public"]["Enums"]["tipo_unita"] | null
        }
        Insert: {
          chiave_periodo?: string | null
          codice?: string | null
          created_at?: string
          data_pagamento?: string | null
          descrizione_riga?: string | null
          id?: string
          importo_dovuto: number
          importo_pagato?: number | null
          iscrizione_id: string
          mese_anno?: string | null
          mezzo_pagamento?:
            | Database["public"]["Enums"]["mezzo_pagamento"]
            | null
          movimento_id?: string | null
          note?: string | null
          sessione_id?: string | null
          stato_pagamento?: Database["public"]["Enums"]["stato_pagamento"]
          tipo_riga?: Database["public"]["Enums"]["tipo_riga_rata"]
          tipo_unita?: Database["public"]["Enums"]["tipo_unita"] | null
        }
        Update: {
          chiave_periodo?: string | null
          codice?: string | null
          created_at?: string
          data_pagamento?: string | null
          descrizione_riga?: string | null
          id?: string
          importo_dovuto?: number
          importo_pagato?: number | null
          iscrizione_id?: string
          mese_anno?: string | null
          mezzo_pagamento?:
            | Database["public"]["Enums"]["mezzo_pagamento"]
            | null
          movimento_id?: string | null
          note?: string | null
          sessione_id?: string | null
          stato_pagamento?: Database["public"]["Enums"]["stato_pagamento"]
          tipo_riga?: Database["public"]["Enums"]["tipo_riga_rata"]
          tipo_unita?: Database["public"]["Enums"]["tipo_unita"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_iscrizione_id_fkey"
            columns: ["iscrizione_id"]
            isOneToOne: false
            referencedRelation: "iscrizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_movimento_id_fkey"
            columns: ["movimento_id"]
            isOneToOne: false
            referencedRelation: "movimenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_sessione_id_fkey"
            columns: ["sessione_id"]
            isOneToOne: false
            referencedRelation: "sessioni"
            referencedColumns: ["id"]
          },
        ]
      }
      sconti_attivita: {
        Row: {
          attivita_id: string
          attivo: boolean
          created_at: string
          descrizione: string | null
          id: string
          nome: string
          ordering: number
          tipo: Database["public"]["Enums"]["tipo_sconto"]
          valore: number
        }
        Insert: {
          attivita_id: string
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome: string
          ordering?: number
          tipo: Database["public"]["Enums"]["tipo_sconto"]
          valore: number
        }
        Update: {
          attivita_id?: string
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome?: string
          ordering?: number
          tipo?: Database["public"]["Enums"]["tipo_sconto"]
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "sconti_attivita_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
        ]
      }
      sessioni: {
        Row: {
          attivita_id: string
          chiave: string
          created_at: string
          data_fine: string | null
          data_inizio: string | null
          etichetta: string
          fascia_oraria: string | null
          id: string
          tipo_unita: Database["public"]["Enums"]["tipo_unita"]
        }
        Insert: {
          attivita_id: string
          chiave: string
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          etichetta: string
          fascia_oraria?: string | null
          id?: string
          tipo_unita: Database["public"]["Enums"]["tipo_unita"]
        }
        Update: {
          attivita_id?: string
          chiave?: string
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          etichetta?: string
          fascia_oraria?: string | null
          id?: string
          tipo_unita?: Database["public"]["Enums"]["tipo_unita"]
        }
        Relationships: [
          {
            foreignKeyName: "sessioni_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          attivo: boolean
          created_at: string
          email: string
          id: string
          last_login: string | null
          must_change_password: boolean
          nome: string
          password_hash: string
          password_version: number
          ruolo: Database["public"]["Enums"]["ruolo"]
          telegram_user_id: string | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          must_change_password?: boolean
          nome: string
          password_hash: string
          password_version?: number
          ruolo?: Database["public"]["Enums"]["ruolo"]
          telegram_user_id?: string | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          must_change_password?: boolean
          nome?: string
          password_hash?: string
          password_version?: number
          ruolo?: Database["public"]["Enums"]["ruolo"]
          telegram_user_id?: string | null
        }
        Relationships: []
      }
      voci_rendiconto: {
        Row: {
          attivo: boolean
          codice: string
          created_at: string
          id: string
          label: string
          numero: number
          ordering: number
          sezione: Database["public"]["Enums"]["sezione_rendiconto"]
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Insert: {
          attivo?: boolean
          codice: string
          created_at?: string
          id?: string
          label: string
          numero: number
          ordering: number
          sezione: Database["public"]["Enums"]["sezione_rendiconto"]
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Update: {
          attivo?: boolean
          codice?: string
          created_at?: string
          id?: string
          label?: string
          numero?: number
          ordering?: number
          sezione?: Database["public"]["Enums"]["sezione_rendiconto"]
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      saldi_per_conto: {
        Args: { anno_filtro?: number; telegram_user_filtro?: string }
        Returns: {
          conto: string
          entrate: number
          saldo: number
          uscite: number
        }[]
      }
      upsert_movimento_from_sheet: {
        Args: {
          mov_categoria: string
          mov_conto: string
          mov_data_movimento: string
          mov_descrizione: string
          mov_id: string
          mov_id_correzione: string
          mov_importo: number
          mov_importo_segnato: number
          mov_note: string
          mov_stato: string
          mov_telegram_user_id: string
          mov_timestamp: string
          mov_tipo: string
          mov_volontario: string
        }
        Returns: undefined
      }
    }
    Enums: {
      mezzo_pagamento: "Cassa" | "BCC" | "Sumup"
      ruolo: "admin" | "volontario_cassa" | "coordinatore_educativo"
      ruolo_contatto: "nonno" | "nonna" | "zio" | "zia" | "altro"
      sezione_rendiconto: "A" | "B" | "C" | "D" | "E"
      stato_movimento: "valido" | "errato" | "corretto"
      stato_pagamento: "non_pagato" | "pagato" | "parziale"
      tipo_attivita: "doposcuola" | "laboratorio" | "locomotiva"
      tipo_movimento: "Entrata" | "Uscita"
      tipo_prezzo: "per_sessione" | "flat"
      tipo_riga_rata: "sessione" | "pacchetto" | "quota_iscrizione" | "sconto"
      tipo_sconto: "percentuale" | "fisso"
      tipo_unita: "mese" | "giornata" | "settimana"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      mezzo_pagamento: ["Cassa", "BCC", "Sumup"],
      ruolo: ["admin", "volontario_cassa", "coordinatore_educativo"],
      ruolo_contatto: ["nonno", "nonna", "zio", "zia", "altro"],
      sezione_rendiconto: ["A", "B", "C", "D", "E"],
      stato_movimento: ["valido", "errato", "corretto"],
      stato_pagamento: ["non_pagato", "pagato", "parziale"],
      tipo_attivita: ["doposcuola", "laboratorio", "locomotiva"],
      tipo_movimento: ["Entrata", "Uscita"],
      tipo_prezzo: ["per_sessione", "flat"],
      tipo_riga_rata: ["sessione", "pacchetto", "quota_iscrizione", "sconto"],
      tipo_sconto: ["percentuale", "fisso"],
      tipo_unita: ["mese", "giornata", "settimana"],
    },
  },
} as const
