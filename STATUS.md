# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-10** — **animazioni di feedback delle operazioni** (branch `claude/add-operation-animations-AhGJg`). Lamentela utente: "spesso non si capisce quando la piattaforma ha fatto o non un'operazione". Soluzione: pacchetto centralizzato di feedback visivo basato su tre primitive nuove — (1) `<ActionButton />` in `components/ui/action-button.tsx` che estende `<Button />` con stati `pending` (spinner + barra animata che attraversa il bottone), `success` (flash verde 1.4s con check disegnato), `error` (shake + bordo rosso); (2) `useActionFeedback()` in `lib/hooks/use-action-feedback.ts` — wrapper di `useTransition` che intercetta il risultato della server action, mostra il toast giusto e tiene gli stati per il bottone; (3) `<TopProgressBar />` in `components/ui/top-progress-bar.tsx` montato nel layout dashboard, mostra un sottile filo in cima alla pagina al cambio rotta (≈600ms) e su eventi globali `acli:pending-start/-end`. Toaster Sonner ricalibrato in `app/layout.tsx` (durata 3.5s, `closeButton`, `expand`, classi più visibili). 11 keyframe nuove in `globals.css` (flash-success, shake, pop-in, check-draw, progress-indeterminate). Convertiti 16 form di mutazione: `spese-edu`, `turno-dialog`, `utente-drawer` (save + reset password), `segna-pagato-dialog`, `griglia-presenze`, `login`, `primo-accesso`, `cambia-password`, `attivita-form`, `modalita-editor`, `sessioni-editor` (incluso delete inline), `bambino-form`, `iscrizione-form`, `educatore-form`, `calendario-disponibilita`, `utente-form`. Cella `/turni` ora ha micro-scale al click (`btn-tactile`). Rispetto di `prefers-reduced-motion`. Type-check + lint + build puliti.
>
> Sessione precedente (2026-05-09 notte): allineamento contenuti pagine al prototipo Claude Design **mergeato in produzione**: PR [#14](https://github.com/nicolopatti/ACLI_gestionale/pull/14) (`claude/align-design-code-Lmqps` → `claude/n8n-association-management-Q4pBM`, merge commit `ff4541d`). 14 commit atomici: componenti UI base (Tabs/Sheet/Avatar/Progress/FilterBar), restyling di tutte le pagine esistenti (`/bambini`, `/iscrizioni`, `/cassa`, `/attivita`, `/educatori`, `/presenze`, `/utenti`, `/dashboard`), tabs nel detail bambino (5 sezioni), 2 nuove rotte (`/spese-edu` form rapido educatori e `/turni` con vista settimana/mese e click-su-cella), gating proxy esteso a `coordinatore_educativo`, login restyled a 2 colonne con pannello brand. Modello dati: aggiunti 2 campi opzionali `ora_ingresso`/`ora_uscita` su `Disponibilita` per il consuntivo turni. Pianificazione + decisioni di scope in `design-prototype/GAP_ANALYSIS.md`.
>
> Stessa sessione, fix sync Movimenti n8n: scoperti 741 record duplicati su Airtable (`id` sempre vuoto). Causa: il nodo Airtable v2.2 di n8n **strippa i `matchingColumns` dal payload di scrittura**, anche con `defineBelow` e mapping esplicito — il match key viene trattato come "già noto" e non scritto. Fix: spostata la match key da `id` a `timestamp` (univoco per costruzione del bot Telegram, ms-precision), `mappingMode: defineBelow` con espressione esplicita per ogni campo. **Ottimizzazione architetturale** in coda: workflow ora event-driven via `Google Sheets Trigger` con `event: rowAdded` (poll ogni minuto, fa partire il workflow solo su nuova riga in coda al Sheet) invece dello schedule ogni 5 min che riprocessava tutto. Tabella ricostruita pulita: 19 record con `id` valorizzato.
>
> Sessione precedente (sera): adattamento del guscio dashboard al prototipo Claude Design — PR #13 mergeata. Solo chrome (sidebar a 2 sezioni amm/edu, topbar con area-pill + theme toggle persistito, design tokens `oklch` warm, font DM Sans + Newsreader, dark mode, logo ACLI). Pagine esistenti renderizzavano col loro contenuto attuale ma ereditavano il nuovo look. Tipo `Ruolo` esteso con `coordinatore_educativo` (tipo TS + `ROLE_ACCESS`). Cartella `design-prototype/` (handoff package) versionata nel repo.

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch `claude/n8n-association-management-Q4pBM` (con il modello nuovo Attività → Modalità + Sessione → Iscrizione → Rate, tutte le pagine allineate al prototipo Claude Design dopo PR #14).
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli. Tipo `Ruolo` su `lib/config.ts` include `admin` / `volontario_cassa` / `coordinatore_educativo`. **Proxy gating completo** (`lib/auth/auth.config.ts`): admin ha tutto, coordinatore_educativo accede a tutte le rotte edu (incluse `/turni` e `/spese-edu`), volontario_cassa solo `/cassa`, `/profilo` universale per chi è loggato.
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): tabelle aggiornate al nuovo modello (vedi sotto).
- **Pagine dashboard**: `/dashboard` (rolewise: admin = stats finanziarie + alert; coordinatore = presenze oggi + morosità + turni settimana), `/bambini` (tabs + filtri + saldo/presenze), `/bambini/[id]` (5 tabs Anagrafica/Iscrizioni/Presenze/Pagamenti/Note), `/attivita` (card grid + sotto-tabella sessioni del mese), `/iscrizioni` (tabs per stato + bar avanzamento + segna-pagato inline), `/educatori` (split-view 320px + detail con KPI ore/giorni), `/presenze` (3 stat card + filtro fascia oraria a pillole), `/cassa` (4 KPI per conto + filterbar + footer totali periodo), `/utenti` (drawer "Modifica utente" con reset password integrato), `/profilo`. **Nuove rotte**: `/turni` (vista settimana/mese, click-su-cella → multi-select educatori, KPI ore pianificate/consuntivate, riepilogo per educatore) e `/spese-edu` (form rapido educatori per registrare movimenti, dialog conferma, sidebar "I miei ultimi 5").
- **Componenti UI base** in `components/ui/`: `Tabs` (Radix), `Sheet` (drawer laterale 640px), `Avatar` (iniziali da nome), `Progress` (bar value/max con toni), `FilterBar` + `FilterSearch` + `FilterSelect`. Riusati in tutte le pagine.
- **Server Actions** per tutte le mutazioni; type-check, lint e build puliti.
- **Try/catch anti-crash** su login: se Airtable cade o la PAT viene revocata, l'utente vede "Email o password non corretti" invece di un 500.
- **Cambio password self-service** da UserMenu → "Cambia password" (`/profilo`): password attuale + nuova ≥ 8 caratteri + conferma. L'azione abbassa anche `must_change_password`.
- **Primo accesso forzato** (`/primo-accesso`): quando admin crea l'utente o resetta la password, `must_change_password=true`. Il proxy edge intercetta tutte le route per gli utenti loggati con il flag alto e li reindirizza al form (solo nuova + conferma, no password attuale visto che hanno appena fatto login). A submit ok l'action chiama `signOut({ redirectTo: "/login" })` per forzare la rigenerazione del JWT senza il flag.
- **Reset password admin** dal drawer "Modifica utente" su `/utenti`: bottone genera password casuale 12 caratteri (alfabeto senza ambigui `0/O/1/l/I` per dettatura a voce), la salva e la mostra inline con bottone "Copia" finché il drawer è aperto. L'utente target verrà mandato su `/primo-accesso` al login successivo.
- **Blocco eliminazione sessione** se esiste almeno una rata `pagato` o `parziale` collegata (`hasAnyRataPagataForSessione`).
- **Editor modalità e sessioni** (`/attivita/[id]`): pattern `useActionState` + `<form action>`, refetch automatico dei dati lato server dopo il submit.
- **Pagamento rate** (`/iscrizioni/[id]`): tabella rate con bottone "Segna pagato" → dialog (importo, data, mezzo, note). Disponibile anche **inline su `/iscrizioni`** (riga lista) puntando alla prossima rata non pagata.
- **Spese-edu** (`/spese-edu`): form unico (Tipo Entrata/Uscita, Importo, Data, Conto radio Cassa/BCC/Sumup, Categoria filtrata per tipo, Descrizione obbligatoria, Note). Submit → dialog conferma con riepilogo segnato/colorato → `creaMovimentoAction` salva su Airtable Movimenti con `id` `app_xxx` per non collidere con quelli del bot Telegram. Toast successo + reset form. Sidebar a destra mostra gli ultimi 5 movimenti dell'utente corrente.
- **Turni** (`/turni`): griglia `giorni × fasce` (vista settimana 7×3, vista mese calendar grid). Click su cella → `TurnoDialog` multi-select educatori con campi opzionali ora ingresso/uscita per consuntivo. `salvaTurnoCellaAction` fa diff create/update/delete sui record `Disponibilita` per quella `(data, fascia)`. Stats: ore pianificate, ore consuntivate, educatori attivi nel periodo. Tabella riepilogo per educatore (Turni / Giorni / Ore) come base dati per il calcolo compensi che il responsabile fa fuori dal software.
- **Sync Movimenti** Google Sheet → Airtable (workflow n8n `Cassa Sheets → Airtable Sync`, id `cmMaMjtv6xEzdZQC`): **event-driven** via `Google Sheets Trigger` con `event: rowAdded`, polling ogni minuto, fa partire il workflow solo quando viene aggiunta una riga al Sheet (niente più scan completo ogni 5 min). Upsert by **`timestamp`** (non più `id` perché il nodo Airtable v2.2 di n8n strippa i `matchingColumns` dal payload di scrittura), `mappingMode: defineBelow` con espressione esplicita per ogni campo. Il nodo `Normalize for Airtable` forza `telegram_user_id` e `id_correzione` a stringa via `String(...)` perché il Sheet API restituisce gli ID Telegram come number e Airtable rifiuta il typecast su campi text molto lunghi. La pagina `/cassa` legge da Airtable Movimenti (filtro `stato != 'errato'`).
- **Filtro affidabile per linked record** in tutte le query Airtable: il filterByFormula con `FIND...ARRAYJOIN` non matcha gli id dei linked record (Airtable serializza il display name); fix con filtro lato server in JS sui campi `*Id` dei mapper. Applicato a `modalita-iscrizione`, `sessioni`, `mesi`, `iscrizioni`, `presenze`, `disponibilita`, `contatti-aggiuntivi`.

## Modello dati corrente

- **Attività → Modalità di iscrizione + Sessione → Iscrizione → Rate**.
- `Attivita` (`tipo`: doposcuola | laboratorio | locomotiva, `attivo`). I campi
  `importo_default` e `anno_scolastico` sono orfani su Airtable (non più usati
  dal codice).
- `ModalitaIscrizione` (link a Attivita): `nome`, `importo` (per sessione),
  `descrizione`, `attivo`. Una stessa attività può avere più modalità a prezzi
  diversi (es. "Mensile 14-16 (3 giorni)" vs "Mensile 14-18 (5 giorni)").
- `Sessioni` (`tipo_unita`: mese | giornata | settimana, `chiave`, `etichetta`).
  Chiave ed etichetta sono derivate server-side da `tipo_unita` + `data_inizio`.
  Il campo `importo` su Airtable è orfano (rimosso dal codice il "override
  sessione"; l'importo della rata viene sempre dalla modalità).
- `Iscrizioni` con `attivita`, `modalita_iscrizione`, `sessioni_scelte` (multi),
  `fasce_orarie` (`14-16` / `14-18`, multi, solo doposcuola), `giorni_settimana`
  (solo doposcuola). Il campo `anno_scolastico` è orfano.
- `MesiIscrizione` (significato evoluto: "Rata") con `sessione`, `tipo_unita`,
  `chiave_periodo`. `mese_anno` popolato solo per rate di tipo `mese` (legacy/cache).
  L'importo è snapshot di `modalita.importo` al momento della creazione della rata.
- `Bambini` con campi genitore inline (`nome_genitore`, `cognome_genitore`,
  `telefono_genitore`, `email_genitore`, `cf_genitore`) + link self `fratello_di`.
- `ContattiAggiuntivi` (link a Bambini, ruolo nonno/nonna/zio/zia/altro).
- `Presenze`: `ora_ingresso`, `ora_uscita` (entrambi vuoti = assente), link
  opzionale `sessione`.
- `Educatori` (anagrafica: `nome`, `cognome`, `email`, `telefono`, `attivo`).
- `Disponibilita` (link a Educatori): `data`, `fascia_oraria` (14-16 / 14-18 /
  16-18), `note`, `ora_ingresso`, `ora_uscita`. Funge da pianificazione (riga
  esistente senza ore = turno previsto) **e da consuntivo** (ore valorizzate
  = turno effettivamente svolto, base dati per il calcolo compensi). Vista
  combinata su `/turni`.
- `Movimenti` (sync da Google Sheet via n8n): `id` (text, primary), `timestamp`
  (datetime, **match key** dell'upsert n8n), `data_movimento`, `tipo`,
  `importo`, `conto` (Cassa/BCC/Sumup), `categoria` (link), `descrizione`,
  `volontario`, `telegram_user_id`, `stato` (valido/errato/corretto), `note`,
  `id_correzione`, `importo_segnato`, `synced_at`. Per i movimenti creati da
  app (`/spese-edu`) l'`id` ha prefix `app_xxx` per non collidere con quelli
  del bot Telegram.
- La tabella `Genitori` è stata svuotata e non è più usata dal codice (resta
  come scheletro su Airtable, in attesa di rimozione manuale).
- `Users` ha un nuovo campo `must_change_password` (checkbox). True = l'utente
  deve passare da `/primo-accesso` al prossimo login per impostare una password
  personale prima di poter usare l'app. Settato automaticamente da
  `createUser` e da reset password (admin UI + script).

## In review

Niente. PR #13 (chrome) e PR #14 (allineamento contenuti pagine + nuove rotte) entrambe mergeate in produzione.

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Tabelle residue su Airtable (`Genitori`, `Table 1`) | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). Il campo `importo` su Sessioni è anch'esso orfano. |
| 2 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 3 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |
| 4 | Performance: i `.filter()` lato server caricano l'intera tabella | 🟢 nice-to-have | Volume attuale basso, OK. Se cresce, valutare campi formula `RECORD_ID()` su Airtable per riabilitare `filterByFormula`. |
| 5 | Sidebar collapsable funzionante (76px icone-only) | 🟢 nice-to-have | Bottone già presente nel topbar ma stub. Richiede state condiviso sidebar↔topbar. |
| 6 | Drawer dettaglio bambino dalla list page | 🟢 nice-to-have | Per ora la full-page `/bambini/[id]` ha 5 tabs (PR #14). Drawer dalla list resta come miglioramento futuro. |
| 7 | Charts interattivi (trend cassa, distribuzione categorie) | 🟢 nice-to-have | Decisione utente: quando si faranno, devono essere interattivi (hover con valore, click per filtrare). |
| 8 | Bulk action "copia turni della settimana scorsa" | 🟢 nice-to-have | Per accelerare la pianificazione di settimane simili. Out of scope MVP turni. |
| 9 | Match composito `[timestamp, descrizione]` su Movimenti se necessario | 🟢 nice-to-have | Il match attuale by `timestamp` ms è teoricamente fragile se due movimenti collidono al ms. Non si è mai verificato; passare al composito solo se succede. |
| 10 | Utente di test reale `coordinatore_educativo` | 🟢 product | Creare via `pnpm seed:admin -- coord@... pwd "Nome" coordinatore_educativo` e verificare end-to-end il flusso edu (turni, spese-edu, cruscotto). |
| 11 | Eventi e iniziative del circolo | 🟢 product | Out of scope di #14 per decisione utente. Se servirà, partire dall'anagrafica minimale (nome/data/luogo/stato), niente budget contabile. |

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Branch production di Vercel**: `claude/n8n-association-management-Q4pBM`
- **Branch di lavoro corrente**: nessuno aperto (tutto mergeato in produzione)
- **Bundle prototipo Claude Design**: `design-prototype/` (handoff package — design tokens, page specs, JSX di riferimento; non codice di produzione). Include `GAP_ANALYSIS.md` con il piano di lavoro e le decisioni di scope chiuse.
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot` ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Workflow n8n sync Movimenti**: `cmMaMjtv6xEzdZQC` ([link](https://eurita.app.n8n.cloud/workflow/cmMaMjtv6xEzdZQC)) — Google Sheet `Cassa_Associazione_Template` (id `1NZ9G7Vv8C6yYMb-oA3czSNq4d1vVC961iIMOXtAnrqE`) → Airtable Movimenti. **Trigger**: `Google Sheets Trigger` su `event: rowAdded`, polling ogni minuto (parte solo su nuova riga). **Match**: `timestamp` (ms-precision dal bot Telegram). **Mapping**: `defineBelow` con espressione esplicita per ogni campo (incluso `id`, che n8n strippa se in matchingColumns).
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
