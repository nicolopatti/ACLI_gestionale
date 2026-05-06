# ACLI Gestionale

MVP del gestionale dell'associazione: anagrafica iscritti al doposcuola, iscrizioni mensili, pagamenti, presenze e cassa. Si affianca al bot Telegram esistente "Cassa Associazione - Bot Telegram" che resta operativo per registrare entrate/uscite; un workflow n8n schedulato sincronizza i Movimenti del Google Sheet su Airtable e questa app li mostra in dashboard.

## Stack

- **Next.js 16** (App Router, TypeScript strict, React 19, Turbopack)
- **Tailwind CSS v4** + componenti UI shadcn-style su Radix primitives
- **Auth.js v5** (Credentials, JWT) con `bcryptjs`
- **Airtable** come backend dati (libreria ufficiale `airtable.js`)
- **Server Actions** per le mutazioni; route handlers solo per `[...nextauth]`
- **n8n** orchestratore (bot Telegram + sync Sheets→Airtable)

## Schema Airtable

Crea una base `ACLI Gestionale` con queste 8 tabelle. I nomi dei campi sono in italiano (snake_case) e devono corrispondere esattamente.

### `Users`
`email` (Email) · `password_hash` (Long text) · `nome` · `ruolo` (Single select: `admin`, `volontario_cassa`) · `attivo` (Checkbox) · `telegram_user_id` · `created_at` (Created time) · `last_login` (Date with time)

### `Genitori`
`nome_completo` (Formula `{nome}&" "&{cognome}`, Primary) · `nome` · `cognome` · `telefono` (Phone) · `email` (Email) · `codice_fiscale` · `note` · `bambini` (Link → Bambini, multiple)

### `Bambini`
`nome_completo` (Formula PK) · `nome` · `cognome` · `data_nascita` (Date) · `scuola` · `classe` · `genitore` (Link → Genitori, single) · `note` · `attivo` (Checkbox) · `iscrizioni` (Link → Iscrizioni, multiple)

### `Iscrizioni`
`codice` (Formula PK `{bambino} & " " & {anno_scolastico}`) · `bambino` (Link → Bambini, single) · `anno_scolastico` (Single select: `2025-2026` ecc.) · `data_iscrizione` (Date) · `giorni_settimana` (Multi select: `lun`, `mar`, `mer`, `gio`, `ven`) · `importo_mensile_default` (Currency) · `note` · `mesi` (Link → MesiIscrizione, multiple)

### `MesiIscrizione`
`codice` (Formula PK) · `iscrizione` (Link → Iscrizioni, single) · `mese_anno` (Single line, formato `YYYY-MM`) · `importo_dovuto` (Currency) · `stato_pagamento` (Single select: `non_pagato`, `parziale`, `pagato`) · `importo_pagato` (Currency) · `data_pagamento` (Date) · `mezzo_pagamento` (Single select: `Cassa`, `BCC`, `Sumup`) · `movimento_collegato` (Link → Movimenti, single, opt) · `note`

### `Presenze`
`codice` (Formula PK `{bambino} & " " & {data}`) · `bambino` (Link → Bambini, single) · `iscrizione` (Link → Iscrizioni, single) · `data` (Date) · `presente` (Checkbox) · `note` · `registrato_da` (Link → Users) · `created_at` (Created time)

### `Movimenti` (replica del Google Sheet, scritta da n8n)
`id` (Single line, Primary) · `timestamp` (Date with time) · `data_movimento` (Date) · `tipo` (Single select: `Entrata`, `Uscita`) · `importo` (Currency) · `conto` (Single select: `Cassa`, `BCC`, `Sumup`) · `categoria` (Link → Categorie, single) · `descrizione` · `volontario` · `telegram_user_id` · `stato` (Single select: `valido`, `errato`, `corretto`) · `note` · `id_correzione` · `importo_segnato` (Currency) · `synced_at` (Date with time)

### `Categorie`
`nome` (Single line, Primary) · `tipo` (Single select: `Entrata`, `Uscita`)

## Setup locale

```bash
pnpm install
cp .env.example .env.local
# riempi AIRTABLE_API_KEY (PAT con scope data.records:r/w + schema.bases:r), AIRTABLE_BASE_ID, AUTH_SECRET (openssl rand -base64 32)
```

### Seed iniziale

```bash
# 1) popola la tabella Categorie con un set base (Entrate/Uscite)
pnpm seed:categorie

# 2) crea il primo amministratore
pnpm seed:admin -- admin@acli.it password123 "Mario Rossi" admin

# 3) avvia il dev server
pnpm dev
```

Apri http://localhost:3000 e accedi con le credenziali create.

## Comandi

| Comando | Descrizione |
| --- | --- |
| `pnpm dev` | Dev server con Turbopack |
| `pnpm build` | Build produzione |
| `pnpm start` | Avvia il build di produzione |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm seed:admin` | Crea utente (vedi sopra) |
| `pnpm seed:categorie` | Popola le categorie iniziali |

## Struttura del repo

```
app/
  (auth)/login/                 form di login
  (dashboard)/
    layout.tsx                  sidebar + header (auth-gated)
    dashboard/                  home con statistiche
    bambini/, genitori/         anagrafica
    iscrizioni/                 iscrizioni + dettaglio mesi (segna pagato)
    presenze/                   griglia giornaliera + storico
    cassa/                      Movimenti read-only (con scoping per volontari)
    utenti/                     gestione utenti (solo admin)
  api/auth/[...nextauth]/       handler Auth.js
lib/
  airtable/                     client + tipi + CRUD per ogni tabella
  auth/                         config Auth.js + bcrypt helpers
  actions/                      server actions per ogni modulo
  validations/                  schemi zod
  config.ts                     anno scolastico, ruoli, mezzi pagamento
components/
  ui/                           Button, Input, Card, Table, Dialog, ecc.
  dashboard/                    sidebar, user menu
  {bambini,genitori,iscrizioni,presenze,utenti}/
proxy.ts                        Next 16 (ex middleware) — gating ruoli
scripts/
  create-admin.ts
  seed-categorie.ts
```

## Ruoli e permessi

- **admin** — accesso completo: anagrafica, iscrizioni, presenze, cassa, utenti.
- **volontario_cassa** — vede solo `/cassa`, filtrato sui movimenti registrati col proprio `telegram_user_id`. Le altre rotte rimandano a `/cassa`.

Le restrizioni sono applicate sia in `proxy.ts` (callback `authorized`) che dentro le server action (`requireAdmin()`).

## Sync con il bot Telegram

Il bot `Cassa Associazione - Bot Telegram` (workflow n8n `769mYjOjQTqr9j4y`) continua a scrivere su Google Sheets (`Cassa_Associazione_Template`, foglio `Movimenti`).

Un secondo workflow n8n `Cassa Sheets → Airtable Sync` (id `cmMaMjtv6xEzdZQC`) gira ogni 5 minuti, legge tutto il foglio, normalizza i valori e fa upsert su Airtable matching per `id`. È stato creato via SDK n8n; per attivarlo:

1. Apri il workflow su n8n e collega le credenziali Google Sheets (OAuth2) e Airtable PAT.
2. Compila il placeholder del `base id` Airtable.
3. Attiva il workflow.

Le correzioni dei movimenti effettuate via Telegram (`stato='errato'`, `id_correzione`) si propagano automaticamente al prossimo run.

## Deploy

Su Vercel:

1. Importa il repo, framework rilevato Next.js.
2. Imposta env vars: `AUTH_SECRET`, `AUTH_URL` = dominio prod, `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`.
3. Deploy. La home redirige a `/dashboard`; il proxy fa redirect a `/login` se non autenticati.

## Verifica end-to-end

1. Login come admin → home con saldi e contatori.
2. Crea genitore → bambino linkato → iscrizione 2025-26 (es. 50€/mese, lun/mer/ven). Verifica che vengano creati 10 record `MesiIscrizione`.
3. Vai sull'iscrizione, segna settembre come pagato (Cassa). Stato passa a `pagato`.
4. `/presenze` con data odierna → spunta il bambino → salva → controlla in Airtable.
5. Invia un messaggio al bot Telegram (es. `"spesa cancelleria 15€"`) → entro 5 min appare in `/cassa`.
6. Crea un utente con ruolo `volontario_cassa`, fai login → verifica che `/iscritti` rimandi a `/cassa`.

## Punti aperti

- **Reset password self-service**: nel MVP solo via script (admin riemette hash con `pnpm seed:admin` o usa `resetPasswordAction` da estendere a UI).
- **Rate limit Airtable** (5 req/s per base): per ora le query non sono throttle-cached. Prevedere `unstable_cache` per liste statiche.
- **Backup Airtable**: aggiungere un workflow n8n di export CSV settimanale verso Drive.
- **Schema Airtable non versionato**: i cambi di schema vanno documentati qui.
- **GDPR / dati di minori**: prima del go-live reale, definire privacy policy e periodo di retention.
- **Anno scolastico**: i 10 mesi (set–giu) sono parametrizzati in `lib/config.ts`. Cambiali se l'associazione segue un calendario diverso.

## Roadmap successiva al MVP

1. Educatori (anagrafica + presenze docenza + compensi)
2. Archivio fatture/ricevute (Google Drive con metadata su Airtable)
3. Dashboard calendario lezioni
4. Resoconti finanziari per conto (Cassa/BCC/Sumup) con grafici
5. Webhook push da n8n per sync immediato (al posto del polling 5min)
