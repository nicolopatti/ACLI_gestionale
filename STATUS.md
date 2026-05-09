# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-09** — pagina UI cambio password (self-service) + blocco eliminazione sessione su rata pagata.

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch `claude/n8n-association-management-Q4pBM`. Il branch `claude/refactor-signup-flow-X2pBR` contiene il modello nuovo (non ancora deployato).
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli (`admin` / `volontario_cassa`).
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): tabelle aggiornate al nuovo modello (vedi sotto).
- **Pagine dashboard scaffoldate**: `/dashboard`, `/bambini`, `/attivita`, `/iscrizioni`, `/educatori`, `/presenze`, `/cassa`, `/utenti`, `/profilo`.
- **Server Actions** per tutte le mutazioni; type-check, lint e build puliti.
- **Try/catch anti-crash** su login: se Airtable cade o la PAT viene revocata, l'utente vede "Email o password non corretti" invece di un 500.
- **Cambio password self-service** da UserMenu → "Cambia password" (`/profilo`): richiede password attuale + nuova ≥ 8 caratteri + conferma.
- **Blocco eliminazione sessione** se esiste almeno una rata `pagato` o `parziale` collegata (`hasAnyRataPagataForSessione` in `lib/airtable/mesi.ts`).

## Modello dati corrente

- **Attività → Modalità di iscrizione + Sessione → Iscrizione → Rate**.
- `Attivita` (`tipo`: doposcuola | laboratorio | locomotiva, `attivo`). I campi
  `importo_default` e `anno_scolastico` sono orfani su Airtable (non più usati
  dal codice).
- `ModalitaIscrizione` (link a Attivita): `nome`, `importo` (per sessione),
  `descrizione`, `attivo`. Una stessa attività può avere più modalità a prezzi
  diversi (es. "Mensile 14-16 (3 giorni)" vs "Mensile 14-18 (5 giorni)").
- `Sessioni` (`tipo_unita`: mese | giornata | settimana, `chiave`, `etichetta`,
  `importo` opzionale come override sulla modalità). Chiave ed etichetta sono
  derivate server-side da `tipo_unita` + `data_inizio`.
- `Iscrizioni` con `attivita`, `modalita_iscrizione`, `sessioni_scelte` (multi),
  `fasce_orarie` (`14-16` / `14-18`, multi, solo doposcuola), `giorni_settimana`
  (solo doposcuola). Il campo `anno_scolastico` è orfano.
- `MesiIscrizione` (significato evoluto: "Rata") con `sessione`, `tipo_unita`,
  `chiave_periodo`. `mese_anno` popolato solo per rate di tipo `mese` (legacy/cache).
  L'importo è snapshot di `sessione.importo ?? modalita.importo`.
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

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Password admin = `qwerty` | 🔴 alta | Cambia con `pnpm reset-password -- <email> <nuova>` oppure (post-deploy) da `/profilo`. |
| 2 | Smoke test in locale del nuovo modello | 🟠 media | Checklist sotto. PR aperta verso branch production, in attesa di smoke utente prima del merge. |
| 3 | Tabella `Genitori` su Airtable | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). |
| 4 | Tabella `Table 1` residua su Airtable (`tblKYxVnnvY9JQNsM`) | 🟡 bassa | Default Airtable mai cancellata. |
| 5 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 6 | Workflow n8n di sync Google Sheet → Movimenti | 🟢 da verificare | Esiste, da confermare che sia attivo e collegato. |
| 7 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |

## Prossimi passi suggeriti

1. **Smoke test in locale** del flusso completo (vedi checklist sotto), poi merge della PR su `claude/n8n-association-management-Q4pBM` → deploy production automatico.
2. **Reset password admin** `qwerty` via `pnpm reset-password` (o, post-deploy, dalla pagina `/profilo`).
3. **Sync n8n**: verificare che il workflow Sheet → Airtable Movimenti sia attivo.
4. **Pulizia**: cancellare manualmente `Genitori` e `Table 1` da Airtable UI.

### Checklist smoke test in browser

Pre-requisiti: `.env.local` con `AUTH_SECRET`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`. Avvia con `pnpm dev`.

1. Login admin.
2. Crea **attività** doposcuola (tipo `doposcuola`, attivo). Verifica auto-generazione sessioni mensili dal form.
3. Crea **modalità di iscrizione** (es. "Mensile 14-16 (3 giorni)") con importo.
4. Crea **bambino** con genitore inline (nome / cognome / telefono / email / CF) + 1 fratello + 1 contatto aggiuntivo (nonno/zia).
5. Crea **iscrizione**: bambino + attività + modalità + 2 sessioni + fasce orarie `14-16` + giorni settimana.
6. **Presenze**: registra ingresso 14:00 e uscita 16:00.
7. Marca **una rata come pagata** (cassa o dettaglio iscrizione).
8. Da `/attivita`, prova a **eliminare la sessione** associata a quella rata pagata → deve fallire con messaggio "Impossibile eliminare: esistono rate pagate o parziali...".
9. Logout, login con un utente `volontario_cassa` → verifica gating ruoli (vede solo `/cassa` + `/dashboard`).
10. Da UserMenu → "**Cambia password**": prova con password attuale errata (errore), poi con nuova valida (success). Logout/login con la nuova password funziona.

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Branch production di Vercel**: `claude/n8n-association-management-Q4pBM`
- **Branch refactor in corso**: `claude/refactor-signup-flow-X2pBR`
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot` ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
