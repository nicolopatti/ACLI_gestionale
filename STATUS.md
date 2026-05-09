# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-09** — onboarding utenti volontari completo. Cambio password obbligatorio al primo accesso (flag `must_change_password` su Airtable Utenti, gating nel proxy verso `/primo-accesso`, action che termina con `signOut → /login` per rigenerare il JWT senza il flag). Admin UI: dialog "Reset password" su `/utenti` con generatore di password casuale a 12 caratteri leggibili e copia visibile dopo il submit. Fix collaterale: bottone "Esci" del menu utente non partiva (Radix chiudeva il dropdown smontando il `<form>` prima del submit) — risolto con `onSelect=preventDefault`.

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch `claude/n8n-association-management-Q4pBM` (con il modello nuovo Attività → Modalità + Sessione → Iscrizione → Rate).
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli (`admin` / `volontario_cassa`).
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): tabelle aggiornate al nuovo modello (vedi sotto).
- **Pagine dashboard**: `/dashboard`, `/bambini`, `/attivita`, `/iscrizioni`, `/educatori`, `/presenze`, `/cassa`, `/utenti`, `/profilo`.
- **Server Actions** per tutte le mutazioni; type-check, lint e build puliti.
- **Try/catch anti-crash** su login: se Airtable cade o la PAT viene revocata, l'utente vede "Email o password non corretti" invece di un 500.
- **Cambio password self-service** da UserMenu → "Cambia password" (`/profilo`): password attuale + nuova ≥ 8 caratteri + conferma. L'azione abbassa anche `must_change_password`.
- **Primo accesso forzato** (`/primo-accesso`): quando admin crea l'utente o resetta la password, `must_change_password=true`. Il proxy edge intercetta tutte le route per gli utenti loggati con il flag alto e li reindirizza al form (solo nuova + conferma, no password attuale visto che hanno appena fatto login). A submit ok l'action chiama `signOut({ redirectTo: "/login" })` per forzare la rigenerazione del JWT senza il flag.
- **Reset password admin** da `/utenti`: dialog "Reset password" per riga, con generatore di password casuale a 12 caratteri (alfabeto senza ambigui `0/O/1/l/I` per dettatura a voce). A submit ok la password temporanea resta visibile nel dialog finché non lo chiudi, così l'admin può copiarla e comunicarla. L'utente target verrà mandato su `/primo-accesso` al login successivo.
- **Blocco eliminazione sessione** se esiste almeno una rata `pagato` o `parziale` collegata (`hasAnyRataPagataForSessione`).
- **Editor modalità e sessioni** (`/attivita/[id]`): pattern `useActionState` + `<form action>`, refetch automatico dei dati lato server dopo il submit.
- **Pagamento rate** (`/iscrizioni/[id]`): tabella rate con bottone "Segna pagato" → dialog (importo, data, mezzo, note). Verificato end-to-end in produzione.
- **Sync Movimenti** Google Sheet → Airtable (workflow n8n `Cassa Sheets → Airtable Sync`, id `cmMaMjtv6xEzdZQC`): schedule ogni 5 minuti, upsert by `id` con typecast on (linka le categorie per nome). Il nodo `Normalize for Airtable` forza `telegram_user_id` e `id_correzione` a stringa via `String(...)` perché il Sheet API restituisce gli ID Telegram come number e Airtable rifiuta il typecast su campi text molto lunghi. La pagina `/cassa` legge da Airtable Movimenti (filtro `stato != 'errato'`).
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
  16-18). Calendario mensile di disponibilità per ogni educatore.
- La tabella `Genitori` è stata svuotata e non è più usata dal codice (resta
  come scheletro su Airtable, in attesa di rimozione manuale).
- `Users` ha un nuovo campo `must_change_password` (checkbox). True = l'utente
  deve passare da `/primo-accesso` al prossimo login per impostare una password
  personale prima di poter usare l'app. Settato automaticamente da
  `createUser` e da reset password (admin UI + script).

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Tabelle residue su Airtable (`Genitori`, `Table 1`) | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). Il campo `importo` su Sessioni è anch'esso orfano. |
| 2 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 3 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |
| 4 | Performance: i `.filter()` lato server caricano l'intera tabella | 🟢 nice-to-have | Volume attuale basso, OK. Se cresce, valutare campi formula `RECORD_ID()` su Airtable per riabilitare `filterByFormula`. |

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Branch production di Vercel**: `claude/n8n-association-management-Q4pBM`
- **Branch di lavoro corrente**: `claude/volunteer-onboarding-setup-vt7dn`
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot` ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Workflow n8n sync Movimenti**: `cmMaMjtv6xEzdZQC` ([link](https://eurita.app.n8n.cloud/workflow/cmMaMjtv6xEzdZQC)) — Google Sheet `Cassa_Associazione_Template` (id `1NZ9G7Vv8C6yYMb-oA3czSNq4d1vVC961iIMOXtAnrqE`) → Airtable Movimenti, schedule ogni 5 min.
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
