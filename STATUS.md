# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> **⚠️ Prima di pianificare lavori di sicurezza/architettura, leggi `SECURITY_PLAN.md` nella root**: contiene la roadmap multi-sessione delle migliorie pianificate dopo l'audit del 2026-05-14 (8 sessioni, ognuna con rollback path, smoke test e criteri di accettazione). Aggiornalo a ogni sessione completata.
>
> Ultimo aggiornamento: **2026-05-14** — **Sessione 1 SECURITY_PLAN: HTTP security headers + CSP Report-Only** in review sul branch `claude/security-plan-session-1-UNFfC`. Aggiunti su `next.config.ts` 5 header standard (HSTS `max-age=63072000; includeSubDomains; preload`, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy disabilita camera/microphone/geolocation/payment) + CSP **Report-Only** (`default-src 'self'`, `script-src 'self' 'unsafe-inline'` con `'unsafe-eval'` solo in dev per le stack trace React, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, `base-uri 'self'`; `connect-src` e `img-src` includono `https://*.supabase.co` come safety net anche se oggi il client non chiama Supabase). Smoke test locale (`curl -I` su `/login`, `/dashboard`, `/`): tutti e 6 gli header presenti su 200 e 307, l'HTML non contiene risorse esterne o inline event handler quindi nessuna violazione attesa quando si passera' a enforcing. Build verde, 29 rotte invariate. **Prossimo step**: dopo 24h in produzione senza violazioni in console, rinominare la key in `next.config.ts` da `Content-Security-Policy-Report-Only` a `Content-Security-Policy` per attivare l'enforcing (vedi SECURITY_PLAN.md Sessione 1).
>
> **Sessione precedente `claude/implement-ets-report-zB3PG` (PR #24)**: **pagina dettaglio voce ETS + refactor estetico riepilogo rendiconto** mergeata in produzione. Dalla tabella `/rendiconto` adesso si clicca "Vedi dettaglio →" su una voce con movimenti e si apre `/rendiconto/voce/[code]?anno=YYYY` (admin-only): lista di tutti i movimenti attribuiti alla voce nell'anno, filtri client-side (ricerca testo + range importo + chip periodo "Tutto"/"Questo mese"/"Ultimo trimestre"/"Quest'anno"/"Personalizzato" + date custom) **persistiti in URL** per condivisibilità, tabella raggruppata per mese con banner, azione "Sposta in altra voce" via select con optgroup A-E filtrate per tipo del movimento, azione "Elimina" via soft-delete (`stato='errato'`, già escluso da `listMovimenti` — zero migration), entrambe con toast bottom-center 5s + Annulla e optimistic update con rollback. Refactor estetico delle tabelle riepilogo USCITE|ENTRATE su classi `.rend-table` semantiche del mockup Claude Design (sezioni A-E in caps, voci con numero monospace, tfoot scuro per il TOTALE); banner "non classificati" portato a grid 4-col. 3 commit atomici (backend: `setStatoMovimento` + `soft/restoreMovimentoAction` + `resolveVoceMovimento` utility esportata; styles: ~430 righe CSS sui token esistenti, dark mode automatico; ui: refactor `/rendiconto` + nuova `/rendiconto/voce/[code]` server + `VoceDetailClient` client). Build verde, 29 rotte (era 28).
>
> **Sessione precedente `claude/verify-session-status-FERv9` (PR #22)**: **fix UX rendiconto: lista inline dei movimenti da classificare** mergeata in produzione. Il banner "N movimenti senza voce rendiconto" su `/rendiconto` ora si espande automaticamente in una lista riga-per-riga: per ciascun movimento orfano due select autosave (Categoria + Voce ETS diretta), entrambe filtrate per tipo del movimento. Risolve la lamentela utente "non capisco come individuare proprio quei casi specifici per associarli a delle categorie": prima il banner era solo informativo, ora è anche actionable dal punto in cui appare. Toccati 4 file: nuovo client component `components/rendiconto/movimento-da-classificare-row.tsx`, due helper DB (`setCategoriaMovimento`, `setVoceRendicontoMovimento`) e due server action admin-only in `lib/actions/movimenti.ts` con `revalidatePath` di `/rendiconto` + `/cassa`. Build verde, 28 rotte invariate.
>
> **Sessione precedente `claude/add-bank-statement-sync-6jLq3` (PR #21)**: **import estratto conto BCC/SumUp + rendiconto ETS** mergeato in produzione. 6 commit atomici (5 feat + 1 docs). Risponde a due richieste utente: (1) caricare gli estratti conto della banca per intercettare le spese che non passano da Telegram (bollette domiciliate, commissioni, gite, ecc.) deduplicandole contro i movimenti gia registrati; (2) attribuire a ogni movimento una "voce di rendiconto" cosi che entrate/uscite si possano raggruppare nello schema obbligatorio del rendiconto per cassa ETS (D.M. 5/3/2020 — Modello D, 49 voci su 5 sezioni A-E per entrate e uscite). Cambio strutturale collaterale: ora **segnare una rata come pagata crea un Movimento Entrata** sul conto scelto (Cassa/BCC/Sumup), linkato via `rate.movimento_id`. Prima la rata pagata viveva solo nella tabella `rate` e il bank import non poteva matcharla. **Decisione utente sul backfill**: i dati attualmente in produzione sono trattati come "dati di test" (16 movimenti Telegram + 1 rata pagata storica), quindi lo script `pnpm backfill:rate-movimenti` NON viene eseguito. Quando l'utente vorrà partire seriamente (probabilmente a inizio anno per coprire 2026 completo), il flusso sarà: (a) azzerare la tabella `movimenti` via Supabase; (b) caricare gli estratti conto BCC e SumUp di gennaio-XXX 2026 in ordine cronologico su `/cassa/import` — il sistema deduplica le righe sovrapposte; (c) segnare le rate pagate dalla UI man mano che si verificano (creano Movimenti in tempo reale, niente backfill).
>
> **Sessione `claude/add-bank-statement-sync-6jLq3`**: 5 commit atomici, tutti i check verdi (typecheck + lint + build).
>
> 1. **Schema (`feat(schema)`)**. Nuova tabella `voci_rendiconto` (49 voci ETS, enum `sezione_rendiconto` A-E, codice univoco tipo `U-A-1`..`E-E-2`, indice su `(tipo, ordering)`). Estensioni: `categorie.voce_rendiconto_default_id` (FK opzionale: voce ETS proposta per i movimenti di questa categoria); `movimenti.voce_rendiconto_id` (override per movimento); `movimenti.origine` (telegram/app/rata/bank_import); `movimenti.fingerprint_bank` + UNIQUE `(conto, fingerprint_bank)` per dedup re-import; `movimenti.is_giroconto` (escluso dal rendiconto). Mappati i default delle 18 categorie esistenti alle voci sensate (es. Utenze → U-A-2 Servizi, Cancelleria → U-A-1 Materie prime, Compensi educatori → U-A-4 Personale, Quote iscrizione → E-A-3, Donazioni → E-A-4). 3 migration applicate su Supabase via MCP.
>
> 2. **Backend (`feat(backend)`)**. `segnaPagatoAction` ora crea un Movimento Entrata sul conto scelto e linka `rate.movimento_id`; `annullaPagamentoAction` cancella il movimento. Nuovi helper in `lib/db/movimenti.ts`: `createMovimentiBatch` (bulk insert per import), `findMovimentiForDedup({conto, tipo, importo, dataMin, dataMax})` (match per dedup con tolleranza ±N giorni), `findMovimentiByFingerprints` (lookup batch per re-import idempotente), `listMovimentiInRange` (range inclusivo per aggregati rendiconto), `deleteMovimento`, `totaliPerConto` che esclude i giroconti. `lib/db/mesi.ts` ha un nuovo `getRataPaymentContext(rataId)` che fa il join rate+iscrizione+bambino+attivita+modalita per costruire la descrizione del movimento. `lib/db/voci-rendiconto.ts` con list cached 1h. Script `scripts/backfill-rate-movimenti.ts` (idempotente, supporta `--dry-run`) esposto come `pnpm backfill:rate-movimenti`.
>
> 3. **Import estratto conto (`feat(cassa)`)**. Nuova rotta `/cassa/import` (admin only). Parser dedicati: BCC TSV (encoding UTF-8 CRLF, separatore TAB, date `dd/mm/yyyy`, virgola decimale + punto migliaia tipo `-2.918,49`, fingerprint = sha1 di `data|importo_signed|descrizione_norm`) e SumUp CSV (encoding UTF-8, ISO date, punto decimale, fingerprint nativo = `sumup:<Codice transazione>`). Auto-classifier (`lib/import/auto-classify.ts`) con regole testuali: SDD bollette → Utenze/U-A-2, supermercati → Vitto/U-A-2, libreria/Amazon → Materiale didattico/consumo/U-A-1, OBI/Decathlon → Materiale consumo, trasporti → U-A-2, cooperative → Servizi prof/U-A-2, bonifici DOPOSCUOLA/MENSILE → Quote iscrizione/E-A-3, donazioni → E-A-4, 5x1000 → E-A-5, eventi → E-C-2. Giroconti CIRCOLO ACLI (IBAN `IT88Z0857554190000000205966`) e PAYOUT SumUp → BCC marcati `is_giroconto=true`. Dedup (`lib/import/dedup.ts`): fingerprint hit → "duplicate", altrimenti `(conto, tipo, importo, data ±3gg)` → "new" / "match_exact" (1 hit) / "match_partial" (N hit, dubbio). UI client component con due step (upload/review): tabella inline per ogni riga con badge stato, select categoria, select voce ETS, checkbox giroconto. Auto-detect conto dal nome file. Submit bulk con `origine="bank_import"` e fingerprint popolato. Bottoni "Importa estratto conto" e "Rendiconto ETS" aggiunti nell'header di `/cassa`. Saldi su `/cassa` ora escludono i giroconti.
>
> 4. **Rendiconto ETS (`feat(rendiconto)`)**. Nuova rotta `/rendiconto?anno=YYYY` (admin only). `lib/rendiconto/aggregate.ts:aggregaRendiconto` risolve la voce da `movimento.voce_rendiconto_id` o, in fallback, da `categoria.voce_rendiconto_default_id`. Esclude `is_giroconto`. Movimenti con voce non risolvibile (o tipo incoerente) finiscono in `nonClassificati`, segnalati in pagina con link a `/categorie` per assegnare il default. Layout: due colonne (USCITE | ENTRATE) con sezioni A-E, totali sezione, totale generale, avanzo/disavanzo, confronto anno precedente affiancato. Route handler `GET /rendiconto/export?anno=YYYY` genera CSV (BOM UTF-8 + Content-Disposition attachment) importabile in Excel/Numbers.
>
> 5. **UI di gestione (`feat(ui)`)**. Pagina `/categorie` (admin only): lista categorie raggruppate per tipo, select inline per la voce di default. Autosave on change via `setVoceRendicontoDefaultAction` con toast di conferma. `/spese-edu` form esteso con campo "Voce di rendiconto ETS" che si auto-popola al cambio categoria (dal default configurato) ed e overridabile. La server action salva `voce_rendiconto_id` e marca `origine="app"`. Sidebar amm: aggiunti "Rendiconto ETS" (icona `FileSpreadsheet`) e "Categorie" (icona `BookOpenCheck`); rotte protette via `auth()` server-side nelle pagine.
>
> **Sessione `claude/review-site-architecture-TBDbq` (PR #20)**: 4 commit per togliere le tre cause principali della lentezza percepita. Audit ha trovato che il problema era principalmente architetturale: Vercel girava in `iad1` (Washington) e Supabase in `eu-central-1` (Frankfurt), ogni query SQL pagava ~95ms di RTT geografico, e nessuna pagina aveva caching o Suspense. Storia compressa al mattino: **cutover Airtable → Supabase completato end-to-end** (2026-05-11), verificato anche il flusso n8n con una riga reale dal Google Sheet che è apparsa su `/cassa` entro 1 minuto. Produzione gira sul progetto Supabase `aikforfebngrqfzdkowo` (`acli-gestionale.vercel.app`). **Aperto**: (1) fix cosmetico n8n manuale (cambia Response Format del nodo HTTP da `JSON` a `Autodetect` per evitare il "rosso" sull'execution log; il dato passa lo stesso); (2) cleanup `lib/airtable/` + dep + env `AIRTABLE_*` dopo 1 settimana di osservazione del cutover.
>
> **Sessione `claude/review-site-architecture-TBDbq` (PR #20)**: 4 commit per togliere le tre cause principali della lentezza percepita.
>
> 1. **Vercel co-located con Supabase**. Nuovo `vercel.json` con `regions: ["fra1"]` (Frankfurt). Era `iad1` di default. Co-locando il compute con il database, il RTT per query crolla da ~95ms a <10ms. TTFB atteso delle pagine data-heavy da ~1.5s a ~300-400ms. **`next.config.ts` arricchito**: `images.formats: ["image/avif", "image/webp"]` (era solo WebP di default), `experimental.optimizePackageImports: ["lucide-react", "sonner"]` per alleggerire i client bundle.
>
> 2. **`loading.tsx` ovunque**. Tre nuovi file: `app/(dashboard)/loading.tsx` (skeleton cover-all per le rotte del gruppo), `app/(dashboard)/bambini/[id]/loading.tsx` e `app/(dashboard)/iscrizioni/[id]/loading.tsx` (override per le detail page più lente, con skeleton più fedele al layout reale: avatar + tabs + grid di card). Niente più "pagina bianca per 1 secondo" durante la navigazione. Inoltre `<Suspense>` con skeleton inline attorno ad `AdminBlock`/`EduBlock` nella dashboard: l'header "Ciao Nome" streama immediatamente, i KPI/liste arrivano appena pronti.
>
> 3. **Cache layer su lookup tables semi-statiche**. `listCategorie` (TTL 10 min), `listAttivita` / `listEducatori` / `listAllModalita` / `listModalitaByAttivita` (TTL 2 min) ora avvolte in `unstable_cache` con tag dedicati. Sono i dati più letti (li interrogano dashboard, cassa, detail page) e cambiano poche volte al mese. **Tutte le mutazioni** (create/update/delete in `lib/db/attivita.ts`, `lib/db/educatori.ts`, `lib/db/modalita-iscrizione.ts`, `lib/db/categorie.ts`) chiamano `revalidateTag("...", "max")` per invalidare subito dopo cambi dall'app — nota: Next.js 16 richiede la firma a 2 argomenti, con il profilo `cacheLife` come secondo arg (`"max"` per long-lived background revalidation).
>
> 4. **Stop all'over-fetching nelle detail page**. La pagina `bambini/[id]` prima caricava 9 query con tabelle complete (`listAllMesi()`, `listSessioni()`, `listBambini()`, ecc.) per mostrare un singolo bambino. Ora **stage 1** (parallel) prende solo dati specifici del bambino + lookup table cachate; **stage 2** prende le rate via `listMesiByIscrizioneIds` (nuovo helper batch via `.in()`) e le sessioni filtrate ai recordIds effettivamente referenziati dalle presenze. Su 500 rate / 200 sessioni passa da ~250KB a ~5KB di JSON trasferito per pageview. Stesso pattern su `iscrizioni/[id]`: il `getAttivita` seriale è stato piegato nel parallel block, le due `Promise.all` consecutive di sessioni/modalità unite in una sola — da 5 round-trip seriali a 2.
>
> 5. **Cleanup dipendenze zero-import**. Rimosse `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`, `date-fns`, `pino` (grep esaustivo su `app/`, `components/`, `lib/`, `scripts/` ha confermato 0 import per ognuna). Tree-shake già le toglieva dal bundle, ma erano peso in `pnpm-lock.yaml` (-154 righe) e audit surface.
>
> **Cosa NON è stato fatto consapevolmente**: re-encode di `logo-acli.png` (147KB → WebP/AVIF, no `cwebp`/`sharp` nel sandbox; comunque `next/image` con AVIF abilitato lo trasforma on-the-fly); attivazione di `cacheComponents: true` (PPR di Next 16, cambio invasivo dei default di routing, merita sessione dedicata dopo che questi fix sono stabili in produzione); RPC Postgres per aggregati SQL al posto di `.filter()` JS in `/cassa` e `/dashboard` (richiede testing dedicato — il payload corrente è 1000 movimenti aggregati in JS, funziona ma è una bomba a orologeria).
>
> **Sessione `claude/airtable-to-supabase-migration-uBZxn` (PR #19)**: 6 fasi completate, 2 rimanenti come cutover manuale.
>
> 1. **Schema Postgres su Supabase** (`supabase/aikforfebngrqfzdkowo`, region `eu-central-1`). 8 enum types + 14 tabelle (`users`, `bambini`, `attivita`, `modalita_iscrizione`, `sessioni`, `iscrizioni`, `iscrizioni_sessioni`, `rate` ex-`MesiIscrizione`, `presenze`, `educatori`, `disponibilita`, `movimenti`, `categorie`, `contatti_aggiuntivi`). FK `ON DELETE CASCADE` ovunque le dipendenze sono "forti" (figli del bambino, dell'attivita, dell'iscrizione, ecc.); `ON DELETE SET NULL` per relazioni opzionali (`rate.movimento_id`, `presenze.registrato_da`). Indici su FK + colonne di filtro frequente (data, chiave_periodo, stato_pagamento). **`UNIQUE(educatore_id, data, fascia_oraria)` su `disponibilita`** — fixa strutturalmente il bug residuo TODO #0 della versione Airtable. **Array Postgres** per i multi-value `giorni_settimana`/`fasce_orarie` (semantica = lista TS pura). **Join table** `iscrizioni_sessioni` per la M-to-M `sessioni_scelte`. RLS abilitata su tutte le tabelle senza policy → service-role key bypassa, anon key non puo' leggere niente (difesa in profondita').
>
> 2. **Client + types** (`lib/db/client.ts`, `lib/db/types.gen.ts`). Singleton `createClient<Database>(URL, SERVICE_ROLE_KEY)` con `auth.persistSession=false` (Auth.js gestisce la sessione, non Supabase Auth). `import "server-only"` in cima: errore di build se importato da un Client Component (la service-role key NON deve mai finire nel bundle). Tipi auto-generati da Supabase via `mcp__supabase__generate_typescript_types`.
>
> 3. **14 moduli `lib/db/*`** che replicano una-a-uno le signature pubbliche di `lib/airtable/*`. Stesso pattern `mapXxx(row)` -> domain type, stessi nomi funzione (`listBambini`, `getIscrizione`, `createMesi`, `replaceTurnoCella`, ecc.). I `.filter()` JS lato server della versione Airtable (workaround per il bug `filterByFormula` su linked records) **eliminati**: ora query SQL native via `.eq("bambino_id", ...)`, `.in("id", [...])`. I `delete*ByXxx` cascade-helpers ridotti a singolo `DELETE` Postgres che sfrutta `ON DELETE CASCADE` per le foglie. Le batch da 10 record di Airtable sostituite da insert singoli (Postgres no limit).
>
> 4. **Script di migrazione dati** (`scripts/migrate-airtable-to-supabase.ts`, `pnpm migrate:airtable`). Idempotente, ordine topologico, mappa `recXXX -> uuid` per ogni tabella, gestisce self-FK (`bambini.fratello_di`) in 2-pass, esplode `iscrizioni.sessioni_scelte` nella join table, mantiene il PK testuale dei `Movimenti` (`app_xxx` / id Telegram). Flag `--reset` (svuota Supabase prima) e `--dry-run`. **Da eseguire** al cutover (vedi sezione).
>
> 5. **Auth + codemod**. `lib/auth/auth.ts` import switchato a `lib/db/users` (zero altre modifiche all'auth flow — bcrypt, JWT, callbacks invariati). Sed globale sui 55 file dell'app: tutti gli `@/lib/airtable/{users,bambini,...,turni}` -> `@/lib/db/...`. `@/lib/airtable/types` mantenuto (domain types stabili, restano dove sono finche' non si rinomina `MeseIscrizione -> Rata`). Scripts `seed:admin`, `seed:categorie`, `reset-password` aggiornati allo stesso modo. **`pnpm typecheck` + `pnpm lint` + `pnpm build` verdi** (23 pagine generate). Branch deployabile come preview Vercel con env Supabase per QA.
>
> 6. **`.env.example`**: aggiunte `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Le env Airtable conservate (script di migrazione + n8n workflow le useranno fino al cutover).
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

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch `claude/n8n-association-management-Q4pBM` (con il modello nuovo Attività → Modalità + Sessione → Iscrizione → Rate, tutte le pagine allineate al prototipo Claude Design dopo PR #14, perf fix di PR #20).
- **Performance baseline** (post PR #20): Vercel functions in region `fra1` (Frankfurt), co-locate con Supabase `eu-central-1`. Lookup tables (`categorie`, `attivita`, `educatori`, `modalita`) servite da `unstable_cache` con tag-based invalidation sulle mutazioni. Dashboard streama l'header subito, KPI/liste via `<Suspense>`. Detail page `bambini/[id]` / `iscrizioni/[id]` fanno fetch mirate via `.in()` invece di tabelle complete. `loading.tsx` a livello `(dashboard)` + override per le detail più lente, no più "pagina bianca" durante la navigazione.
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
- **Pagamento rate** (`/iscrizioni/[id]`): tabella rate con bottone "Segna pagato" → dialog (importo, data, mezzo, note). Disponibile anche **inline su `/iscrizioni`** (riga lista) puntando alla prossima rata non pagata. Dopo PR #21: il "Segna pagato" crea automaticamente un Movimento Entrata sul conto scelto, linkato via `rate.movimento_id`. `annullaPagamentoAction` cancella il movimento e azzera i campi della rata.
- **Import estratto conto** (`/cassa/import`, admin only, PR #21): upload `.xls` BCC (TSV tab-separato) o `.csv` SumUp, auto-detect del conto dal nome file. Parsing tollerante al formato (BCC: virgola decimale + punto migliaia tipo `-2.918,49`, date `dd/mm/yyyy`, CRLF; SumUp: punto decimale, ISO date, `Codice transazione` come fingerprint univoco). Dedup contro i movimenti già registrati: fingerprint hit → "Duplicato" (re-import idempotente), altrimenti `(conto, tipo, importo, data ±3gg)` → "Nuovo" / "Già presente" / "Dubbio". Auto-classifier con regole testuali popola categoria + voce ETS per ogni riga; l'utente conferma riga per riga prima dell'insert bulk. Giroconti CIRCOLO ACLI (IBAN `IT88Z0857554190000000205966`) e payout SumUp → BCC marcati `is_giroconto=true`, esclusi dal rendiconto e dai saldi `/cassa`.
- **Rendiconto ETS** (`/rendiconto?anno=YYYY`, admin only, PR #21 + PR #22 + PR #24): tabella due colonne USCITE/ENTRATE strutturata sulle 5 sezioni A-E del Modello D (D.M. 5/3/2020), 49 voci totali. Aggregato per voce risolto da `movimento.voce_rendiconto_id` o, in fallback, `categoria.voce_rendiconto_default_id`. Esclude `is_giroconto`. Movimenti senza voce risolvibile finiscono in `nonClassificati`, esposti in **lista inline espandibile** sotto il banner rosso (PR #22): per ogni movimento orfano due select autosave (Categoria + Voce ETS diretta), entrambe filtrate per tipo del movimento, toast Sonner di conferma a ogni salvataggio, revalidate automatico di `/rendiconto` + `/cassa`. Totali sezione + totale generale + avanzo/disavanzo + confronto anno precedente. Export CSV via `GET /rendiconto/export?anno=YYYY` (BOM UTF-8, pronto per Excel/Numbers). **Dettaglio voce** (PR #24): cliccando "Vedi dettaglio →" su una voce con movimenti si apre `/rendiconto/voce/[code]?anno=YYYY` con la lista filtrabile dei movimenti di quella voce (ricerca testo + range importo + chip periodo + date custom, tutti persistiti in URL via `useRouter().replace` con debounce 250ms), tabella raggruppata per mese, ogni riga ha select "Sposta in altra voce" (optgroup per sezione, filtrate per tipo del movimento) e cestino "Elimina" (soft-delete via `stato='errato'`); entrambe con toast bottom-center 5s + Annulla e optimistic update con rollback su errore.
- **Gestione categorie** (`/categorie`, admin only, PR #21): lista categorie raggruppate per Entrata/Uscita con select inline per la voce di rendiconto di default. Autosave on change. Quando registri un movimento (Telegram / `/spese-edu` / bank import), la voce viene applicata automaticamente — overridabile per singolo movimento.
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
| `claude/security-plan-session-1-UNFfC` | 2026-05-14 | 👀 in review | Sessione 1 SECURITY_PLAN: HTTP security headers + CSP **Report-Only** su `next.config.ts`. 5 header standard (HSTS preload 2 anni, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy chiude camera/microphone/geolocation/payment) + CSP Report-Only con direttive da SECURITY_PLAN Sessione 1 (`script-src 'self' 'unsafe-inline'` + `'unsafe-eval'` solo in dev, `frame-ancestors 'none'`, `connect-src 'self' https://*.supabase.co` come safety net). Smoke test locale via `curl -I`: header presenti su `/login` (200), `/dashboard` e `/` (307 redirect). Dopo 24h di osservazione in produzione senza violazioni in console, flip della key da `Content-Security-Policy-Report-Only` a `Content-Security-Policy` per attivare enforcing. Build verde, 29 rotte invariate. |
| _Mergeato in produzione_ | — | ✅ | Ultima mergeata: PR #24 (dettaglio voce ETS + refactor estetico riepilogo rendiconto). Precedenti: PR #22 (lista inline movimenti da classificare), PR #21 (import estratto conto BCC/SumUp + rendiconto ETS), PR #20 (perf audit), PR #19 (cutover Supabase). |

## Stato post-cutover Supabase

Cutover eseguito 2026-05-11. Riepilogo di quello che e' fatto e quello che resta.

### Fatto ✓

- **Schema Postgres su Supabase** `aikforfebngrqfzdkowo` (eu-central-1, tier Free, `https://aikforfebngrqfzdkowo.supabase.co`). 8 enum + 14 tabelle + FK CASCADE + indici + `UNIQUE(educatore_id, data, fascia_oraria)` su `disponibilita` (fix strutturale TODO #0). RLS abilitata senza policy.
- **Travaso dati**: 47 record + 1 join row migrati via MCP (canale che bypassa il firewall del sandbox Claude Code, che blocca outbound HTTPS verso `*.supabase.co` da nodejs ma non dai server MCP):
  - users: 2 · bambini: 1 · attivita: 1 · modalita_iscrizione: 1 · sessioni: 1
  - iscrizioni: 1 · iscrizioni_sessioni: 1 · rate: 1 · presenze: 1
  - educatori: 1 · disponibilita: 1 · categorie: 18
  - movimenti: 20 (deduplicati da 39 Airtable: il bot Telegram aveva ri-creato i duplicati del fix STATUS già documentato; map `_mig_map` ha tutti e 39 recXXX -> mov_id cosi' le rate che linkano a un duplicato risolvono correttamente)
  - contatti_aggiuntivi: 0
- **Env Vercel Production + Preview**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (formato nuovo `sb_secret_*`) settate dall'utente.
- **Deploy `dpl_4GJWK1jaNUa3yVxyJvBs8abCxk1W`** READY su `acli-gestionale.vercel.app`. Login page carica, zero errori runtime nelle prime ore.
- **Workflow n8n `cmMaMjtv6xEzdZQC` rinominato e ripuntato a Supabase** (versione attiva `8dca5c6e-d047-...`):
  - Trigger Google Sheets invariato (poll `everyMinute` sul Sheet `Cassa_Associazione_Template`).
  - Code node `Normalize for Supabase` (sostituisce `Normalize for Airtable`): output con chiavi `mov_*` allineate alla RPC.
  - HTTP Request node `Upsert into Supabase Movimenti` (sostituisce il nodo Airtable v2.2): POST a `/rest/v1/rpc/upsert_movimento_from_sheet` con publishable key (`sb_publishable_*`, pubblica per design) in header `apikey` + `Authorization`.
  - **RPC `public.upsert_movimento_from_sheet(...)`** su Supabase (`SECURITY DEFINER` + `GRANT EXECUTE TO anon`): risolve `categoria_nome` -> `categoria_id` via lookup case-insensitive, fa `INSERT ... ON CONFLICT ("timestamp") DO UPDATE` aggiornando solo i campi mutabili. Bypassa il bug noto di n8n Airtable v2.2 sui `matchingColumns`.
  - Test eseguiti via Postgres simulando il ruolo `anon`: insert ok, update path ok, categoria risolta. Cleanup post-test verificato (count torna a 20).
- **Verifica end-to-end completata** (2026-05-13): l'utente ha aggiunto una riga reale (`MOV-1778699516478-0d9d3`, €0.01 "cancelleria", categoria "Materiale di consumo") al Google Sheet; entro 1 minuto è apparsa su Supabase con `categoria_id` risolto e sulla pagina `/cassa` della webapp. Il binding della credential Google Sheets del trigger si è preservato attraverso l'`update_workflow` MCP (non serviva ri-selezionarla manualmente).

### Quirk noto: nodo n8n marca l'execution come errore, ma il dato passa

Sintomo: ogni esecuzione del workflow mostra "Cannot read properties of undefined (reading 'data')" sul nodo `Upsert into Supabase Movimenti`, ma la riga **arriva regolarmente su Supabase** (verificabile da `synced_at`).

Causa: la RPC ritorna `void` → PostgREST risponde `204 No Content` (corpo vuoto) → n8n con `responseFormat: 'json'` tenta `JSON.parse('')` e fallisce **dopo** che la POST è andata a buon fine.

Fix cosmetico (UI n8n, ~5 secondi): apri il workflow → click sul nodo `Upsert into Supabase Movimenti` → scrolla `Parameters` fino a `Options` → `Response` → `Response Format`: cambia da `JSON` a `Autodetect` → Save. Non ho potuto applicarlo via SDK perché il token MCP n8n era scaduto a fine sessione.

Per la successiva sessione: oltre al fix, considerare anche di settare `Retry on Fail: false` sul nodo HTTP per evitare retry automatici causati dallo status "errore" — anche se con `ON CONFLICT (timestamp) DO UPDATE` un retry sarebbe innocuo (no duplicati).

### Da fare dopo 1 settimana di osservazione (PR separata di cleanup)

2. `pnpm remove airtable` + `rm -rf lib/airtable/` (i domain types si spostano in `lib/db/types.ts` o si re-export da lì).
3. Rimuovere `AIRTABLE_API_KEY` e `AIRTABLE_BASE_ID` dalle env Vercel.
4. Aggiornare `.env.example` (rimuovere le righe Airtable).
5. Rimuovere `scripts/migrate-airtable-to-supabase.ts` (one-off, non serve piu').
6. Aggiornare questo STATUS.md per rimuovere le sezioni Airtable e marcare il cleanup come fatto.

### Rollback rapido (se serve)

Finestra di osservazione = 1 settimana. In caso si scoprano regressioni gravi:
- `git revert HEAD` sul branch produzione (revert del commit `97bf287`) + push.
- Rimettere env Airtable in cima a quelle Supabase (entrambe attive simultaneamente in Vercel).
- Lo schema Supabase resta in piedi inutilizzato — non sono necessarie azioni distruttive.

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 0 | ~~Bug residuo: rimuovere educatore da cella turni non si propaga~~ | ✅ risolto strutturalmente | La causa era il `filterByFormula` di Airtable su campo date inaffidabile. Con Postgres + `UNIQUE(educatore_id, data, fascia_oraria)` + `.eq("data", data).eq("fascia_oraria", fascia)` il match e' deterministico. Da verificare in preview dopo cutover. |
| 1 | Tabelle residue su Airtable (`Genitori`, `Table 1`) | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). Il campo `importo` su Sessioni è anch'esso orfano. Con il cutover, tutto Airtable viene archiviato/dismesso quindi cleanup automatico. |
| 1b | Choice `14-18` su Airtable (`Iscrizioni.fasce_orarie`, `Attivita.fasce_orarie`, `Disponibilita.fascia_oraria`) | 🟡 bassa | Il codice non la userà più ma resta come choice morto. Da rimuovere manualmente da UI Airtable quando comodo (DB pulito al momento, nessun record con quella choice). |
| 2 | ~~Categorie iniziali~~ | ✅ migrato | 18 categorie travasate da Airtable a `public.categorie` durante il cutover. `pnpm seed:categorie` resta utile solo per ricreare un DB vuoto da zero. |
| 3 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |
| 4 | ~~Performance: i `.filter()` lato server caricano l'intera tabella~~ | 🟡 parzialmente risolto | Le detail page (`bambini/[id]`, `iscrizioni/[id]`) ora usano fetch mirate via `.in()` o helper batch (PR #20). `/cassa` filtra ancora 1000 movimenti in JS — accettabile al volume attuale, da migrare a query SQL (`.ilike()` + `.range()`) quando la tabella supera ~5k record. La nota su Airtable è obsoleta: siamo su Postgres. |
| 4b | Aggregati SQL invece di `.filter().reduce()` in JS | 🟢 nice-to-have | Dashboard (KPI saldo, entrate/uscite del mese) e `/cassa` (totali periodo) caricano 1000 movimenti e aggregano in JS. Una RPC Postgres `SELECT conto, tipo, SUM(importo) GROUP BY` ridurrebbe il payload da ~150KB a 3 righe. Da fare quando il volume cresce. |
| 4c | `cacheComponents: true` (PPR Next.js 16) | 🟢 nice-to-have | Cambio invasivo dei default di routing. Dopo che i fix di PR #20 sono in produzione stabili, valutare il passaggio da `unstable_cache` a `'use cache'` directive con PPR. |
| 4d | Re-encode `logo-acli.png` 147KB → WebP/AVIF a 256px | 🟢 nice-to-have | Con `next/image` ora configurato per AVIF (PR #20) il file viene trasformato on-the-fly al primo request. Ottimizzare il PNG sorgente (1920×2194) salva comunque qualche byte e il primo build di immagini. |
| 5 | Sidebar collapsable funzionante (76px icone-only) | 🟢 nice-to-have | Bottone già presente nel topbar ma stub. Richiede state condiviso sidebar↔topbar. |
| 6 | Drawer dettaglio bambino dalla list page | 🟢 nice-to-have | Per ora la full-page `/bambini/[id]` ha 5 tabs (PR #14). Drawer dalla list resta come miglioramento futuro. |
| 7 | Charts interattivi (trend cassa, distribuzione categorie) | 🟢 nice-to-have | Decisione utente: quando si faranno, devono essere interattivi (hover con valore, click per filtrare). |
| 8 | Bulk action "copia turni della settimana scorsa" | 🟢 nice-to-have | Per accelerare la pianificazione di settimane simili. Out of scope MVP turni. |
| 9 | Match composito `[timestamp, descrizione]` su Movimenti se necessario | 🟢 nice-to-have | Il match attuale by `timestamp` ms è teoricamente fragile se due movimenti collidono al ms. Non si è mai verificato; passare al composito solo se succede. |
| 10 | Utente di test reale `coordinatore_educativo` | 🟢 product | Creare via `pnpm seed:admin -- coord@... pwd "Nome" coordinatore_educativo` e verificare end-to-end il flusso edu (turni, spese-edu, cruscotto). |
| 11 | Eventi e iniziative del circolo | 🟢 product | Out of scope di #14 per decisione utente. Se servirà, partire dall'anagrafica minimale (nome/data/luogo/stato), niente budget contabile. |
| 12 | Go-live import estratto conto + rendiconto | 🟢 product | Decisione utente post-PR #21: dati attuali = "test", si parte seriamente più avanti (probabile inizio anno per coprire 2026 completo). Quando si arriva al momento: (a) azzerare `public.movimenti` su Supabase (TRUNCATE o DELETE), (b) caricare via `/cassa/import` gli estratti conto BCC e SumUp dei mesi gennaio→data corrente in ordine cronologico, (c) verificare il rendiconto a campione. Il backfill rate pagate (`pnpm backfill:rate-movimenti`) **non serve** in questo scenario: le rate verranno segnate pagate in tempo reale dalla UI man mano che si presentano. Lo script rimane disponibile per scenari futuri (es. recupero di pagamenti storici da Excel). Da fare anche: testare con un estratto conto reale che la classificazione automatica sia ragionevole e segnalare regole mancanti (lib/import/auto-classify.ts). |

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Branch production di Vercel**: `claude/n8n-association-management-Q4pBM`
- **Ultimo branch mergeato**: `claude/implement-ets-report-zB3PG` (PR #24, dettaglio voce ETS + refactor estetico rendiconto). Branch precedenti: `claude/verify-session-status-FERv9` (PR #22, lista inline movimenti da classificare), `claude/add-bank-statement-sync-6jLq3` (PR #21, import estratto conto + rendiconto ETS), `claude/review-site-architecture-TBDbq` (PR #20, perf audit), `claude/airtable-to-supabase-migration-uBZxn` (PR #19, cutover Supabase).
- **Bundle prototipo Claude Design**: `design-prototype/` (handoff package — design tokens, page specs, JSX di riferimento; non codice di produzione). Include `GAP_ANALYSIS.md` con il piano di lavoro e le decisioni di scope chiuse.
- **Supabase project**: `aikforfebngrqfzdkowo` (acli-gestionale, region `eu-central-1`, tier Free $0/mese). URL: `https://aikforfebngrqfzdkowo.supabase.co`. Dashboard: `https://supabase.com/dashboard/project/aikforfebngrqfzdkowo`. La service-role key NON e' nel repo: recuperarla da Settings / API / `service_role` (`secret`).
- **Airtable base** (legacy, in dismissione al cutover): `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot` ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Workflow n8n sync Movimenti**: `cmMaMjtv6xEzdZQC` ([link](https://eurita.app.n8n.cloud/workflow/cmMaMjtv6xEzdZQC)) — Google Sheet `Cassa_Associazione_Template` (id `1NZ9G7Vv8C6yYMb-oA3czSNq4d1vVC961iIMOXtAnrqE`) → Airtable Movimenti. **Trigger**: `Google Sheets Trigger` su `event: rowAdded`, polling ogni minuto (parte solo su nuova riga). **Match**: `timestamp` (ms-precision dal bot Telegram). **Mapping**: `defineBelow` con espressione esplicita per ogni campo (incluso `id`, che n8n strippa se in matchingColumns).
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `SUPABASE_URL=https://aikforfebngrqfzdkowo.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY` (formato `sb_secret_*`). Le `AIRTABLE_*` sono ancora valorizzate per la finestra di osservazione (rollback rapido); da rimuovere nella PR di cleanup post-osservazione.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
