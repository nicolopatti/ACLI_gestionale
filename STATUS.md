# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-10** — due sessioni distinte mergeate in una PR. Aggiornamento atomico sopra il merge `claude/fix-educator-display-tL4EF` (5 commit, già in produzione) + sessione `claude/add-operation-animations-AhGJg` ([PR #17](https://github.com/nicolopatti/ACLI_gestionale/pull/17)).
>
> **Sessione `claude/add-operation-animations-AhGJg` (questo branch — PR #17)**: 4 fix in una passata.
>
> 1. **Feedback visivo delle operazioni**. Lamentela utente: "spesso non si capisce quando la piattaforma ha fatto o non un'operazione". Soluzione: 3 primitive nuove — `<ActionButton />` (`components/ui/action-button.tsx`) con stati `pending`/`success`/`error` (spinner + barra animata, flash verde + check, shake rosso); `useActionFeedback()` (`lib/hooks/use-action-feedback.ts`) wrapper di `useTransition` che intercetta il risultato della server action e tiene gli stati per il bottone; `<TopProgressBar />` (`components/ui/top-progress-bar.tsx`) filo sottile in cima alla pagina al cambio rotta (~600ms). Toaster Sonner ricalibrato (durata 3.5s, `closeButton`, `expand`). 11 keyframe nuove in `globals.css`. 16 form di mutazione convertiti. Rispetta `prefers-reduced-motion`.
>
> 2. **Empty state su `/turni`**: variante "soft" della stessa idea poi fatta strutturalmente in `55c9e8b` (vedi sotto). Rimasta come fallback per il caso senza disponibilità anche in periodi senza attività.
>
> 3. **Cascade delete + confirm dialog con anteprima dipendenze**. Audit utente: "quando cancello qualcosa, si cancella davvero su Airtable?". Prima il record principale veniva cancellato ma i collegati restavano orfani (rate dopo iscrizione, disponibilità dopo educatore, ecc.) → report sbagliati e link rotti. Adesso ogni delete (iscrizione, bambino, attività, modalità, sessione, educatore) cancella in cascata. Nuovo `<DeleteConfirmDialog />` (`components/ui/delete-confirm-dialog.tsx`) mostra il count di ogni dipendenza prima della conferma: "Rate: 24, Presenze: 12, Contatti: 1". Per ogni entità una `getDelete<X>ImpactAction` lato server calcola le dipendenze. La sessione mantiene il blocco hard su rate pagate/parziali. Bambino e attività non hanno più il blocco "rimuovi prima i figli" — basta il dialog di conferma.
>
> 4. **Convenzione anti-regressione in `STATUS.md`**: la sezione "In review" elenca ogni branch `claude/*` non mergeato. Ogni futura sessione la legge prima di pianificare per non riprovare lavoro già fatto.
>
> **Sessione precedente `claude/fix-educator-display-tL4EF` (già mergeata in produzione, 5 commit)** — bug residuo da riprendere: rimuovere un educatore da una cella in `/turni` salva server-side ma la cella resta visualmente "occupata" anche dopo `router.refresh()`. Pista: `replaceTurnoCella` (`lib/airtable/disponibilita.ts:106-150`) potrebbe non trovare il record da cancellare per via del `filterByFormula {data} = '...'` su un campo date di Airtable. Da verificare con un log.
>
> Commit della sessione precedente (in `claude/n8n-association-management-Q4pBM`):
> - `55c9e8b` — fix(turni): fasce/giorni dinamici da Attivita, empty state, no più 14-18. Big refactor: rimosse `FASCE_DISPONIBILITA`/`FASCE_ORARIE` hardcoded e la fascia ridondante `14-18`. `FasciaOraria` ora `string` runtime-checked. Le fasce e i giorni "offerti" si leggono dai campi `Attivita.fasce_orarie` e `Attivita.giorni_settimana`. Aggiunto campo `fascia_oraria` a `Sessioni`. Nuovo helper `lib/airtable/turni.ts` (`listAttivitaAttiveInRange`, `unionFasceOfferte`, `unionGiorniOfferti`, `calcolaCelleAttive`). `/turni` e `/educatori/[id]` mostrano empty state se nel periodo non c'è alcuna `Attivita.attivo:true`. Form crea/modifica attività con checkbox lun-dom + fasce. `ORE_PER_FASCIA` hardcoded rimosso, sostituito da `durataFasciaOre()` runtime.
> - `8106459` — fix(bambini,turni): null in parseBambinoForm + consuntivo turni automatico. `parseBambinoForm` normalizza ogni get con `String(... ?? "")`. Consuntivo turni automatico: `data < todayIso ? durataFasciaOre(fascia) : 0`. Rimossi gli input ore dal `TurnoDialog`.
> - `dc97ace` — fix(actions): `{typecast: true}` su `createIscrizione`/`updateIscrizione`/`createMesi`/`updateMese`. Try/catch nelle server actions di `iscrizioni`/`bambini`/`attivita`.
> - `84e45f9` — feat(presenze,turni,sidebar): toggle presenza 1-click via campo `presente` (boolean) su Airtable. `revalidatePath` + `router.refresh()` in `salvaDisponibilitaAction`. Sidebar "Circolo ACLI" cliccabile.
> - `79194c1` — fix(turni,sidebar): `router.refresh()` dopo `TurnoDialog`. Logo → `/cassa`.
>
> Sessione precedente (2026-05-09 notte): allineamento contenuti pagine al prototipo Claude Design **mergeato in produzione**: PR [#14](https://github.com/nicolopatti/ACLI_gestionale/pull/14). 14 commit atomici: componenti UI base (Tabs/Sheet/Avatar/Progress/FilterBar), restyling di tutte le pagine esistenti, tabs nel detail bambino, 2 nuove rotte (`/spese-edu` e `/turni`), gating proxy esteso a `coordinatore_educativo`, login a 2 colonne.
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
- `Attivita` (`tipo`: doposcuola | laboratorio | locomotiva, `attivo`,
  `giorni_settimana` multi `lun..dom`, `fasce_orarie` multi free-form es.
  `14-16`/`16-18`/`10-12`). I campi `giorni_settimana` e `fasce_orarie`
  dichiarano "quando l'attività ha luogo" e sono **fonte di verità** per
  griglia turni e calendario disponibilità educatore. I campi `importo_default`
  e `anno_scolastico` sono orfani su Airtable (non più usati dal codice).
- `ModalitaIscrizione` (link a Attivita): `nome`, `importo` (per sessione),
  `descrizione`, `attivo`. Una stessa attività può avere più modalità a prezzi
  diversi (es. "Mensile 14-16 (3 giorni)" vs "Mensile 14-18 (5 giorni)").
- `Sessioni` (`tipo_unita`: mese | giornata | settimana, `chiave`, `etichetta`,
  `fascia_oraria`). Chiave ed etichetta sono derivate server-side da
  `tipo_unita` + `data_inizio`. `fascia_oraria` (singleSelect) è richiesta
  per laboratorio/locomotiva (definisce in quale cella della griglia turni
  cade la sessione); per doposcuola è lasciata vuota perché le fasce vengono
  dalle iscrizioni dei bambini. Il campo `importo` su Airtable è orfano
  (rimosso dal codice il "override sessione"; l'importo della rata viene
  sempre dalla modalità).
- `Iscrizioni` con `attivita`, `modalita_iscrizione`, `sessioni_scelte` (multi),
  `fasce_orarie` (multi, solo doposcuola, sottoinsieme di `Attivita.fasce_orarie`),
  `giorni_settimana` (solo doposcuola, sottoinsieme di `Attivita.giorni_settimana`).
  La fascia legacy `14-18` è stata eliminata: chi vuole 14-18 spunta `14-16` +
  `16-18`. Il campo `anno_scolastico` è orfano.
- `MesiIscrizione` (significato evoluto: "Rata") con `sessione`, `tipo_unita`,
  `chiave_periodo`. `mese_anno` popolato solo per rate di tipo `mese` (legacy/cache).
  L'importo è snapshot di `modalita.importo` al momento della creazione della rata.
- `Bambini` con campi genitore inline (`nome_genitore`, `cognome_genitore`,
  `telefono_genitore`, `email_genitore`, `cf_genitore`) + link self `fratello_di`.
- `ContattiAggiuntivi` (link a Bambini, ruolo nonno/nonna/zio/zia/altro).
- `Presenze`: `ora_ingresso`, `ora_uscita` (entrambi vuoti = assente), link
  opzionale `sessione`.
- `Educatori` (anagrafica: `nome`, `cognome`, `email`, `telefono`, `attivo`).
- `Disponibilita` (link a Educatori): `data`, `fascia_oraria` (singleSelect:
  `14-16` / `16-18`; il legacy `14-18` resta come choice morto su Airtable
  fino a rimozione manuale ma il codice non lo userà mai), `note`,
  `ora_ingresso`, `ora_uscita`. Funge da pianificazione (riga esistente
  senza ore = turno previsto) **e da consuntivo** (ore valorizzate = turno
  effettivamente svolto, base dati per il calcolo compensi). Vista
  combinata su `/turni`. La griglia turni accetta solo celle `(data, fascia)`
  effettivamente offerte da almeno un'`Attivita.attivo:true` nel periodo —
  controllo runtime in `lib/airtable/turni.ts` + validazione in
  `salvaTurnoCellaAction`.
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

> **Convenzione**: ogni Claude/sviluppatore che apre una sessione DEVE leggere questa sezione prima di pianificare. Qui finisce ogni branch `claude/*` con commit pushati ma non ancora mergeati nel branch di produzione (`claude/n8n-association-management-Q4pBM`). Se trovi qui qualcosa che credevi "fatto in passato", il motivo è che quei commit non sono ancora arrivati in produzione: non ri-implementare, mergea o continua il lavoro pendente.

| Branch | Ultimo commit | Stato | Cosa contiene |
|---|---|---|---|
| `claude/add-operation-animations-AhGJg` | (tip del branch, post-merge) | **PR aperta** [#17](https://github.com/nicolopatti/ACLI_gestionale/pull/17), da mergeare | (1) Pacchetto animazioni di feedback (ActionButton, useActionFeedback, TopProgressBar, 11 keyframe, ~16 form convertiti). (2) Cascade delete + confirm dialog per ogni entità (iscrizione, bambino, attività, modalità, sessione, educatore): niente più orfani su Airtable. (3) Mergea con `claude/fix-educator-display-tL4EF` (già in produzione): mantiene fasce dinamiche da Attivita, empty state turni strutturale, presenze toggle, ecc. |

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 0 | **Bug residuo: rimuovere educatore da cella turni non si propaga** | 🔴 alta | Dal `TurnoDialog` deselezionando un educatore + Salva, lato server l'azione ritorna ok, `revalidatePath("/turni")` viene chiamato, e `router.refresh()` è in `turno-dialog.tsx:93-96`, ma l'educatore appare ancora nella cella. **Pista più calda**: `replaceTurnoCella` (`lib/airtable/disponibilita.ts:106-150`) usa `listDisponibilitaByDataEFascia(data, fascia)` con `filterByFormula: AND({data}='YYYY-MM-DD', {fascia_oraria}='14-16')`. Se Airtable serializza il campo `data` (date) in un formato non-ISO o se ci sono record con la fascia legacy `14-18` o spazi nella stringa, il filtro non matcha → `existing` vuoto → niente in `toDelete`. **Cosa provare**: (a) loggare cosa torna `listDisponibilitaByDataEFascia` con una cella nota; (b) sostituire il filtro con `listDisponibilitaByRange(data, data)` e filtrare in JS sulla fascia (più robusto, vedi pattern già usato in `listDisponibilitaByEducatoreEMese`); (c) verificare che `revalidatePath("/turni")` invalidi davvero il fetch (in Next 16 con Turbopack a volte serve `revalidateTag` su un tag esplicito). Stesso meccanismo del fix calendario disponibilità del commit `84e45f9` ma lì funziona — capire la differenza. |
| 1 | Tabelle residue su Airtable (`Genitori`, `Table 1`) | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). Il campo `importo` su Sessioni è anch'esso orfano. |
| 1b | Choice `14-18` su Airtable (`Iscrizioni.fasce_orarie`, `Attivita.fasce_orarie`, `Disponibilita.fascia_oraria`) | 🟡 bassa | Il codice non la userà più ma resta come choice morto. Da rimuovere manualmente da UI Airtable quando comodo (DB pulito al momento, nessun record con quella choice). |
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
- **Branch di lavoro corrente**: `claude/fix-educator-display-tL4EF` (HEAD `79194c1`, 5 commit ahead di main, non ancora mergeato — vedi bug residuo TODO #0).
- **Bundle prototipo Claude Design**: `design-prototype/` (handoff package — design tokens, page specs, JSX di riferimento; non codice di produzione). Include `GAP_ANALYSIS.md` con il piano di lavoro e le decisioni di scope chiuse.
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot` ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Workflow n8n sync Movimenti**: `cmMaMjtv6xEzdZQC` ([link](https://eurita.app.n8n.cloud/workflow/cmMaMjtv6xEzdZQC)) — Google Sheet `Cassa_Associazione_Template` (id `1NZ9G7Vv8C6yYMb-oA3czSNq4d1vVC961iIMOXtAnrqE`) → Airtable Movimenti. **Trigger**: `Google Sheets Trigger` su `event: rowAdded`, polling ogni minuto (parte solo su nuova riga). **Match**: `timestamp` (ms-precision dal bot Telegram). **Mapping**: `defineBelow` con espressione esplicita per ogni campo (incluso `id`, che n8n strippa se in matchingColumns).
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
