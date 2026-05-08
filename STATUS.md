# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-08** — refactor completo in produzione, query Airtable corrette, app funzionante.

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch
  `claude/refactor-signup-flow-X2pBR` allineato fino al commit `ba4501b`.
  L'utente ha confermato che modalità di iscrizione, sessioni e iscrizioni
  bambini funzionano correttamente in prod.
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli
  (`admin` / `volontario_cassa`). Try/catch anti-crash su Airtable.
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): schema
  aggiornato con tutte le nuove tabelle (vedi sotto).
- **Pagine dashboard** (19 route): `/dashboard`, `/bambini`, `/attivita`,
  `/iscrizioni`, `/educatori`, `/presenze`, `/cassa`, `/utenti`.
- **Server Actions** per tutte le mutazioni; type-check, lint e build
  Next.js puliti (HEAD `ba4501b`).
- **Editor inline** (sessioni, modalità, calendario disponibilità)
  rinfrescano la lista dopo create/delete via `router.refresh()` con
  feedback di successo esplicito.
- **Validazione importi tollerante**: virgola/punto/€/spazi accettati
  via `currencyNumber` helper in `lib/validations/utils.ts`.
- **Campi opzionali davvero opzionali**: helper `optionalText` /
  `optionalEmail` gestiscono `null` ricevuto da `formData.get()`.
- **Query Airtable per link field corrette**: tutte le ricerche "trova X
  by linked Y" usano reverse lookup invece del bug
  `FIND(id, ARRAYJOIN({linkedField}))` che non trovava nulla.

## Modello dati corrente

- **Attività → Modalità di iscrizione + Sessione → Iscrizione → Rate**.
- `Attivita` (`tipo`: doposcuola | laboratorio | locomotiva, `attivo`).
  I campi `importo_default` e `anno_scolastico` sono orfani su Airtable
  (non più usati dal codice).
- `ModalitaIscrizione` (link a Attivita): `nome`, `importo` (per sessione),
  `descrizione`, `attivo`. Una stessa attività può avere più tariffe a
  prezzi diversi (es. "Mensile 14-16 (3 giorni)" vs "Mensile 14-18
  (5 giorni)"). Nel form iscrizione il campo è etichettato "Tariffa
  applicata" per chiarezza utente.
- `Sessioni` (`tipo_unita`: mese | giornata | settimana, `chiave`,
  `etichetta`, `importo` opzionale come override sulla modalità). Chiave
  ed etichetta sono **derivate server-side** da `tipo_unita` +
  `data_inizio` (il form non chiede più di scriverle a mano). Il campo
  "Importo override" è stato rimosso dall'UI (resta modificabile da
  Airtable se serve).
- `Iscrizioni` con `bambino`, `attivita`, `modalita_iscrizione`,
  `sessioni_scelte` (multi), `fasce_orarie` (`14-16` / `14-18`, multi,
  solo doposcuola), `giorni_settimana` (solo doposcuola). Il campo
  `anno_scolastico` è orfano.
- `MesiIscrizione` (significato evoluto: "Rata") con `sessione`,
  `tipo_unita`, `chiave_periodo`. `mese_anno` popolato solo per rate di
  tipo `mese` (legacy/cache). L'importo è snapshot di
  `sessione.importo ?? modalita.importo`.
- `Bambini` con campi genitore inline (`nome_genitore`,
  `cognome_genitore`, `telefono_genitore`, `email_genitore`,
  `cf_genitore`) + link self `fratello_di` che autocompila i dati
  genitore in UI. Il badge "Iscritto" è dedotto dal numero di iscrizioni
  (non dal flag `attivo`, che ora rappresenta solo lo stato di
  archiviazione anagrafica).
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

## Note tecniche

- **Pattern reverse lookup per query su link field** (regola fissa):
  Airtable formule serializzano un link field come stringa di display
  name (primary field), non di recordId. Quindi
  `FIND(recordId, ARRAYJOIN({linkField}))` non funziona mai. Per
  trovare i record collegati a X, leggere il record proprietario,
  prendere l'array di recordIds dal campo link inverso (es.
  `Attivita.Sessioni`) e filtrare la tabella di destinazione con
  `OR(RECORD_ID() = '...', ...)`. Già applicato in tutti i layer
  `lib/airtable/*.ts`.
- **Promote production senza Rebuild**: se modifichi solo le env vars
  Production → Vercel deve ricostruire il bundle (Production Rebuild,
  ~1 min). Se invece le env sono identiche tra Preview e Production,
  il "Promote" è istantaneo (Instant Rollout).
- **Concurrency Vercel**: deployment in stato INITIALIZING senza eventi
  di build per più di 1-2 minuti significa che è in coda. Aspettare,
  non cancellare.

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Password admin = `qwerty` | 🔴 alta | Cambia con `pnpm reset-password -- <email> <nuova>`. |
| 2 | Manca pagina UI per cambio password | 🟠 media | Per ora solo via CLI in locale. |
| 3 | Educatori: collegamento alle attività/sessioni | 🟡 bassa | Oggi gli educatori hanno solo anagrafica + disponibilità "libera". Manca l'assegnazione educatore ↔ sessione (o turno presenze) per sapere chi copre cosa. |
| 4 | Tabella `Genitori` su Airtable | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). |
| 5 | Tabella `Table 1` residua su Airtable (`tblKYxVnnvY9JQNsM`) | 🟡 bassa | Default Airtable mai cancellata. |
| 6 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 7 | Workflow n8n di sync Google Sheet → Movimenti | 🟢 da verificare | Esiste, da confermare che sia attivo e collegato. |
| 8 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |
| 9 | Cancellare campi orfani su Airtable (`importo_default` e `anno_scolastico` di Attivita, `anno_scolastico` di Iscrizioni, `presente` e `iscrizione` di Presenze, `genitore` di Bambini, `importo_mensile_default` di Iscrizioni) | 🟡 bassa | API Airtable non supporta delete field; vanno rimossi a mano da Airtable UI. |
| 10 | 10 sessioni "orfane" residue in `Sessioni` su Airtable (senza link a nessuna attività) | 🟢 cleanup | Residuo di tentativi di test prima del fix. Cancellabili a mano. |

## Prossimi passi suggeriti

1. **Sicurezza minima**: pagina cambio password + reset di `qwerty`.
2. **Modello educatori → turni**: collegare un educatore alla
   sessione/turno (oggi sono entità slegate).
3. **Pulizia Airtable**: cancellare manualmente `Genitori`, `Table 1`,
   i campi orfani e le sessioni residue.
4. **Sync n8n**: verificare che il workflow Sheet → Airtable Movimenti
   sia attivo.

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Production branch (settings Vercel)**: `claude/n8n-association-management-Q4pBM`
- **Branch refactor in corso**: `claude/refactor-signup-flow-X2pBR`
  (HEAD `ba4501b`, in production)
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot`
  ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`,
  `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con
  scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
