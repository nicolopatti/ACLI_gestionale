# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-08** — modello iscrizioni con tariffe + sezione educatori, in attesa di test in produzione.

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app>. La prima
  promote del refactor è stata fatta dall'utente sul commit `e48d723` del
  branch `claude/refactor-signup-flow-X2pBR`. I commit successivi (`3807fe0`,
  `e6ed873`, `069a086`) sono pushati ma **non ancora promossi** in
  production: serve un altro promote dalla UI Vercel sull'ultimo
  deployment READY del branch.
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli
  (`admin` / `volontario_cassa`). Try/catch anti-crash su Airtable.
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): schema
  aggiornato con tutte le nuove tabelle (vedi sotto).
- **Pagine dashboard**: `/dashboard`, `/bambini`, `/attivita`, `/iscrizioni`,
  `/educatori`, `/presenze`, `/cassa`, `/utenti`. 19 route in totale.
- **Server Actions** per tutte le mutazioni; type-check, lint e build
  Next.js puliti (commit `069a086`).
- **Editor inline** (sessioni, modalità, calendario disponibilità) ora
  rinfrescano la lista dopo create/delete via `router.refresh()` con
  feedback di successo esplicito.

## Modello dati corrente

- **Attività → Modalità di iscrizione + Sessione → Iscrizione → Rate**.
- `Attivita` (`tipo`: doposcuola | laboratorio | locomotiva, `attivo`). I campi
  `importo_default` e `anno_scolastico` sono orfani su Airtable (non più usati
  dal codice).
- `ModalitaIscrizione` (link a Attivita): `nome`, `importo` (per sessione),
  `descrizione`, `attivo`. Una stessa attività può avere più tariffe a prezzi
  diversi (es. "Mensile 14-16 (3 giorni)" vs "Mensile 14-18 (5 giorni)").
  Nel form iscrizione il campo è etichettato "Tariffa applicata" per
  chiarezza utente.
- `Sessioni` (`tipo_unita`: mese | giornata | settimana, `chiave`, `etichetta`,
  `importo` opzionale come override sulla modalità). Chiave ed etichetta
  sono **derivate server-side** da `tipo_unita` + `data_inizio` (il form
  non chiede più di scriverle a mano). Il campo "Importo override" è
  stato rimosso dall'UI (resta modificabile da Airtable se serve).
- `Iscrizioni` con `bambino`, `attivita`, `modalita_iscrizione`,
  `sessioni_scelte` (multi), `fasce_orarie` (`14-16` / `14-18`, multi,
  solo doposcuola), `giorni_settimana` (solo doposcuola).
  Il campo `anno_scolastico` è orfano.
- `MesiIscrizione` (significato evoluto: "Rata") con `sessione`, `tipo_unita`,
  `chiave_periodo`. `mese_anno` popolato solo per rate di tipo `mese`
  (legacy/cache). L'importo è snapshot di `sessione.importo ?? modalita.importo`.
- `Bambini` con campi genitore inline (`nome_genitore`, `cognome_genitore`,
  `telefono_genitore`, `email_genitore`, `cf_genitore`) + link self
  `fratello_di` che autocompila i dati genitore in UI. Il badge "Iscritto"
  è dedotto dal numero di iscrizioni (non dal flag `attivo`, che ora
  rappresenta solo lo stato di archiviazione anagrafica).
- `ContattiAggiuntivi` (link a Bambini, ruolo nonno/nonna/zio/zia/altro)
  gestiti come field-array nel form bambino.
- `Presenze`: `ora_ingresso`, `ora_uscita` (entrambi vuoti = assente),
  link opzionale `sessione`.
- `Educatori` (anagrafica: `nome`, `cognome`, `email`, `telefono`,
  `attivo`).
- `Disponibilita` (link a Educatori): `data`, `fascia_oraria` (14-16 /
  14-18 / 16-18). Calendario mensile per educatore: griglia giorno ×
  fascia con checkbox; il salvataggio fa diff (crea i nuovi, cancella i
  deselezionati) per il mese visualizzato.
- La tabella `Genitori` è stata svuotata e non è più usata dal codice
  (resta come scheletro su Airtable, in attesa di rimozione manuale).

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Password admin = `qwerty` | 🔴 alta | Cambia con `pnpm reset-password -- <email> <nuova>`. |
| 2 | Manca pagina UI per cambio password | 🟠 media | Per ora solo via CLI in locale. |
| 3 | Promote in production dei commit `3807fe0`, `e6ed873`, `069a086` | 🟠 media | Vercel UI → ultimo deployment READY del branch refactor → "Promote to Production". Include fix sessioni/badge bambini, modalità di iscrizione, educatori, e fix UX dei form. |
| 4 | Smoke test del flusso completo in produzione | 🟠 media | Crea attività → tariffa → sessioni → bambino → iscrizione → presenze. Verifica blocco rimozione sessione su rata pagata. |
| 5 | Educatori: collegamento alle attività/sessioni | 🟡 bassa | Oggi gli educatori hanno solo anagrafica + disponibilità "libera". Manca l'assegnazione educatore ↔ sessione (o turno presenze) per sapere chi copre cosa. |
| 6 | Tabella `Genitori` su Airtable | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). |
| 7 | Tabella `Table 1` residua su Airtable (`tblKYxVnnvY9JQNsM`) | 🟡 bassa | Default Airtable mai cancellata. |
| 8 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 9 | Workflow n8n di sync Google Sheet → Movimenti | 🟢 da verificare | Esiste, da confermare che sia attivo e collegato. |
| 10 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |
| 11 | Cancellare campi orfani su Airtable (`importo_default` e `anno_scolastico` di Attivita, `anno_scolastico` di Iscrizioni, `presente` di Presenze, `genitore` di Bambini, `importo_mensile_default` di Iscrizioni) | 🟡 bassa | API Airtable non supporta delete field; vanno rimossi a mano da Airtable UI. |

## Prossimi passi suggeriti

1. **Promote** dell'ultimo deployment del branch refactor a production
   per portare in linea i 3 commit successivi a `e48d723`.
2. **Smoke test in produzione** del flusso completo:
   - Su un'attività doposcuola: aggiungi una **tariffa** (es. "Mensile" 50€).
   - Aggiungi una **sessione** mensile (tipo `mese` + data inizio): deve
     apparire subito nella lista con feedback "X aggiunta".
   - Crea un **bambino** con genitore inline.
   - Vai su `/iscrizioni/nuova`, seleziona bambino + attività: il
     dropdown "Tariffa applicata" deve essere popolato. Spunta sessioni
     e crea l'iscrizione.
   - Verifica che le **rate** vengano materializzate nel dettaglio
     iscrizione, con totale corretto.
   - Registra **presenze** con orari per il giorno corrente.
   - Crea un **educatore** e segna disponibilità sul calendario di un mese.
3. **Sicurezza minima**: pagina cambio password + reset di `qwerty`.
4. **Pulizia Airtable**: cancellare manualmente `Genitori`, `Table 1` e
   i campi orfani sulle tabelle esistenti.
5. **Sync n8n**: verificare che il workflow Sheet → Airtable Movimenti
   sia attivo.

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Production branch (settings Vercel)**: `claude/n8n-association-management-Q4pBM`
- **Branch refactor in corso**: `claude/refactor-signup-flow-X2pBR`
  (HEAD `069a086`)
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot`
  ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`,
  `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con
  scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
