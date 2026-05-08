# Stato del progetto

> Documento vivo: si aggiorna a fine di ogni sessione di lavoro.
> Ultimo aggiornamento: **2026-05-08** — login sbloccato, MVP da smoke-testare in produzione.

## Cosa funziona

- **Deploy production**: <https://acli-gestionale.vercel.app> — branch `claude/n8n-association-management-Q4pBM`.
- **Login** Auth.js v5 (Credentials + JWT) con bcrypt e gating ruoli (`admin` / `volontario_cassa`).
- **Airtable** base `Acli Gestionale` (`appvWIKKkoSeydbL7`): 8 tabelle popolate (vuote ma con schema corretto).
- **Pagine dashboard scaffoldate**: `/dashboard`, `/utenti`, `/genitori`, `/bambini`, `/iscrizioni`, `/presenze`, `/cassa` con sotto-rotte `nuovo`/`[id]`/`storico`.
- **Server Actions** per le mutazioni di tutte le entità.
- **Try/catch anti-crash** su login: se Airtable cade o la PAT viene revocata, l'utente vede "Email o password non corretti" invece di un 500.

## Aperti (debiti / TODO)

| # | Cosa | Priorità | Note |
|---|------|----------|------|
| 1 | Password admin = `qwerty` | 🔴 alta | Cambia con `pnpm reset-password -- <email> <nuova>`. |
| 2 | Manca pagina UI per cambio password | 🟠 media | Per ora solo via CLI in locale. |
| 3 | Smoke test in produzione di tutte le pagine dashboard | 🟠 media | Mai testate dietro al login. Vedi sotto "Prossimi passi". |
| 4 | Tabella `Table 1` residua su Airtable (`tblKYxVnnvY9JQNsM`) | 🟡 bassa | Default Airtable mai cancellata. |
| 5 | Categorie iniziali su Airtable | 🟡 bassa | Verificare che `pnpm seed:categorie` sia stato eseguito. |
| 6 | Workflow n8n di sync Google Sheet → Movimenti | 🟢 da verificare | Esiste, da confermare che sia attivo e collegato. |
| 7 | Branch `claude/debug-network-issues-HoZXq` | 🟡 bassa | Allineato con production, può essere cancellato. |

## Prossimi passi suggeriti

1. **Smoke test produzione** (~10 min): aprire ogni voce di menu della dashboard e annotare cosa funziona, cosa è scaffold vuoto, cosa rompe.
2. **Sicurezza minima** prima di altri utenti: pagina cambio password + reset di `qwerty`.
3. **Sync n8n**: verificare che il workflow Sheet → Airtable Movimenti sia attivo, così la dashboard cassa mostra dati veri.
4. **Pulizia**: cancellare branch debug + `Table 1` su Airtable.

## Reference rapida

- **Repo GitHub**: <https://github.com/nicolopatti/ACLI_gestionale>
- **Vercel project**: `acli-gestionale` (team `nicolopattis-projects`)
- **Branch production di Vercel**: `claude/n8n-association-management-Q4pBM`
- **Airtable base**: `appvWIKKkoSeydbL7` (Acli Gestionale)
- **Workflow n8n bootstrap schema**: `BphNmCM5qehqdKot` ([link](https://eurita.app.n8n.cloud/workflow/BphNmCM5qehqdKot))
- **Env vars necessarie su Vercel** (Production + Preview): `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AIRTABLE_API_KEY` (Personal Access Token con scope `data.records:read/write` sulla base), `AIRTABLE_BASE_ID`.

## Stack

Next.js 16 (App Router, React 19, Turbopack) · Tailwind CSS v4 · Auth.js v5 · Airtable · n8n
