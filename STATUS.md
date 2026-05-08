# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-08** — refactor anagrafica + tipi attività (Attività → Sessione → Iscrizione → Rate).

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch `claude/n8n-association-management-Q4pBM`. Il branch `claude/refactor-signup-flow-X2pBR` contiene il modello nuovo (non ancora deployato).
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli (`admin` / `volontario_cassa`).
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): tabelle aggiornate al nuovo modello (vedi sotto).
- **Pagine dashboard scaffoldate**: `/dashboard`, `/bambini`, `/attivita`, `/iscrizioni`, `/presenze`, `/cassa`, `/utenti`.
- **Server Actions** per tutte le mutazioni; type-check e lint puliti.
- **Try/catch anti-crash** su login: se Airtable cade o la PAT viene revocata, l'utente vede "Email o password non corretti" invece di un 500.

## Modello dati corrente

- **Attività → Sessione → Iscrizione → Rate**.
- `Attivita` (`tipo`: doposcuola | laboratorio | locomotiva, `importo_default`, `attivo`, `anno_scolastico`).
- `Sessioni` (`tipo_unita`: mese | giornata | settimana, `chiave`, `etichetta`, `importo` opzionale come override).
- `Iscrizioni` con `attivita`, `sessioni_scelte` (multi), `fasce_orarie` (`14-16` / `14-18`, multi, solo doposcuola), `giorni_settimana` (solo doposcuola).
- `MesiIscrizione` (significato evoluto: "Rata") con `sessione`, `tipo_unita`, `chiave_periodo`. `mese_anno` popolato solo per rate di tipo `mese` (legacy/cache).
- `Bambini` con campi genitore inline (`nome_genitore`, `cognome_genitore`, `telefono_genitore`, `email_genitore`, `cf_genitore`) + link self `fratello_di`.
- `ContattiAggiuntivi` (nuova tabella, link a Bambini, ruolo nonno/nonna/zio/zia/altro).
- `Presenze`: `ora_ingresso`, `ora_uscita` (entrambi vuoti = assente), link opzionale `sessione`.
- La tabella `Genitori` è stata svuotata e non è più usata dal codice (resta come scheletro su Airtable, in attesa di rimozione manuale).

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Password admin = `qwerty` | 🔴 alta | Cambia con `pnpm reset-password -- <email> <nuova>`. |
| 2 | Manca pagina UI per cambio password | 🟠 media | Per ora solo via CLI in locale. |
| 3 | Smoke test in locale del nuovo modello + deploy | 🟠 media | Vedi sezione "Verifica" del piano. |
| 4 | Tabella `Genitori` su Airtable | 🟡 bassa | Da eliminare manualmente da Airtable UI (l'API non supporta delete table). |
| 5 | Tabella `Table 1` residua su Airtable (`tblKYxVnnvY9JQNsM`) | 🟡 bassa | Default Airtable mai cancellata. |
| 6 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 7 | Workflow n8n di sync Google Sheet → Movimenti | 🟢 da verificare | Esiste, da confermare che sia attivo e collegato. |
| 8 | Rinomina TS `MeseIscrizione` → `Rata` | 🟢 cleanup | Tabella Airtable resta `MesiIscrizione`. |

## Prossimi passi suggeriti

1. **Smoke test in locale** del flusso completo:
   - Crea attività doposcuola con auto-generazione 10 sessioni mensili.
   - Crea bambino con genitore inline + fratello + contatti aggiuntivi.
   - Crea iscrizione mensile con fasce orarie multi + giorni settimana.
   - Registra presenze con orari.
   - Verifica blocco rimozione sessione su rata pagata.
2. **Sicurezza minima** prima di altri utenti: pagina cambio password + reset di `qwerty`.
3. **Deploy** del nuovo modello in produzione dopo lo smoke test.
4. **Sync n8n**: verificare che il workflow Sheet → Airtable Movimenti sia attivo.
5. **Pulizia**: cancellare manualmente `Genitori` e `Table 1` da Airtable UI.

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
