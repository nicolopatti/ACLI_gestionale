# Idee per il futuro

> Archivio di funzionalita' / migliorie che vorremmo introdurre ma che non sono ancora in roadmap operativa. Ogni voce contiene contesto, decisioni di design gia' chiuse, e prerequisiti per quando si decidera' di partire.
>
> **Differenza con `SECURITY_PLAN.md`**: quello e' la roadmap operativa con sessioni numerate, rischio, effort e finestre di osservazione. Questo file e' lo "stack" di idee non ancora promosse a roadmap — discussioni, brainstorming, design review che vogliamo conservare.
>
> **Convenzioni stato**:
> - 💭 idea / non pianificata
> - 📌 promossa a roadmap (e' migrata su `SECURITY_PLAN.md` o `STATUS.md`, qui resta come archeologia con riferimento)
> - ✅ implementata (data + PR#)
> - ❌ scartata (con motivo)

---

## 1. Vault credenziali + TOTP step-up auth

**Stato**: 💭 idea / non pianificata
**Brainstorming**: 2026-05-14
**Effort stimato**: 6-8h, spalmabile in 2-3 mini-sessioni
**Rischio**: medio (tocca auth, introduce crypto at-rest, nuovo flow utente)
**Branch riservato**: `claude/add-credentials-vault-zWY77`

### Contesto

Aggiungere una "terza sezione" sidebar (oltre amm/edu) come **cassaforte per le credenziali dei siti dell'associazione** (Vercel, Supabase, banca, Telegram bot, dominio, ecc.) cifrate at-rest. L'idea e' nata dall'esigenza di non spedire password su WhatsApp tra volontari e di avere un posto unico dove le credenziali operative dell'associazione vivono in modo sicuro.

Distinzione chiave emersa nel brainstorming: **MFA e vault risolvono problemi diversi e complementari**, non alternativi.
- Il **vault** protegge dati a riposo (se rubano il dump DB, le credenziali esterne restano cifrate).
- L'**MFA** protegge l'accesso vivo (se rubano la password admin, non basta per aprire il vault).

Servono entrambi. Per questo l'idea include sia la cifratura at-rest sia un secondo fattore step-up sull'apertura del vault.

### Decisioni di design gia' chiuse

Confermate dall'utente via `AskUserQuestion` + validate da una critica dedicata di un Plan agent.

| Tema | Scelta | Motivo |
|---|---|---|
| Metodo MFA | TOTP (Google Authenticator / Authy / 1Password) | €0, standard industria, phishing-resistant. **SPID escluso**: €1-5k setup + €500-2k/anno + 3-6 mesi accreditamento AgID, blocca volontari senza SPID. **OTP Telegram/SMS scartati** per non aggiungere outbound deps in MVP. |
| Trigger MFA | Step-up solo all'apertura vault | Login resta password-only. Niente frizione su /dashboard, /cassa, ecc. Protezione mirata dove serve. |
| Storage `vaultMfaUntil` | **Redis Upstash (NON JWT)** | JWT in Auth.js v5 ha race con `unstable_update` post-redirect, no invalidazione server-side, sliding refresh richiederebbe re-emit cookie ad ogni action. Redis e' O(1), invalidabile, gia' configurato (Sessione 4 SECURITY_PLAN). **Fail-closed**: Redis down = vault chiuso (al contrario del rate limit /login che e' fail-open). |
| Crypto algoritmo | AES-256-GCM via `node:crypto`, **AAD obbligatorio** | AAD = `id` credenziale per password+note, AAD = `userId` per secret TOTP. Senza AAD un attacker con DB access puo' swappare ciphertext tra record. Costa 1 riga, blocca tutta una categoria di attacchi. |
| IV | 12 byte random (`crypto.randomBytes(12)`) | OK per <2^32 messaggi/chiave (siamo a <100 record). |
| Storage ciphertext | Colonne `text` base64, NON `bytea` | `@supabase/supabase-js` non gestisce bene `bytea` (ritorna stringhe `\x...` hex). Base64 ha +33% overhead ma zero bug subdoli sui tipi binari. |
| Secret TOTP in DB | **Cifrato** (stesso schema AES-GCM, AAD=userId) | Industry-norm 2026 (GitHub, Google). Un dump DB con secret in chiaro = bypass MFA per tutti gli admin. Costo: ~30 righe extra. |
| Setup TOTP | Colonna `mfa_secret_pending` separata da `mfa_secret`, promote dopo prima verify | Evita race "rigenera QR mentre app ha gia' scannerizzato il precedente". |
| Backup codes | 10 codici da 10 cifre formato `XXXX-XXXX`, bcrypt cost 10 | Piu' facili da digitare di 8 char alfanumerici. Spazio brute force impossibile sotto rate limit. |
| Categoria credenziale | Postgres ENUM (`hosting`, `database`, `banca`, `social`, `bot`, `cms`, `email`, `altro`) | Validazione DB-level, dropdown banale, no frammentazione testuale ("Bancha" vs "Banca"). |
| Permessi | Tutti gli admin vedono+modificano tutto. Audit log obbligatorio su ogni view. | Realta' operativa di un'associazione piccola. Audit log compensa la mancanza di ACL. Coordinatore_educativo escluso. |
| Audit log | Anticipo `public.audit_log` generale della Sessione 6 SECURITY_PLAN | Evita migrazione futura di una `vault_audit_log` parallela. La Sessione 6 estendera' solo le call site. |
| Rate limit `/credenziali/verify` | 5 / 15min per `(userId, ip)` | Stesso pattern di `loginRateLimitKey` (Sessione 4). Compound key evita DoS targeted di un admin. |
| Vault MFA TTL | 10 min sliding (Redis EXPIRE refreshato ad ogni action vault) | Cerco creds attivamente -> non sloggo. Idle 10 min -> richiedi nuovo OTP. |
| Recovery / reset MFA | Action admin-only + script CLI di last-resort | Per single-admin lockout: `scripts/admin-disable-mfa.ts` eseguibile in locale con service-role key (no endpoint web). |

### Schema (1 migration Supabase via MCP)

```sql
-- 1. Estendi public.users
ALTER TABLE public.users
  ADD COLUMN mfa_secret_iv text NULL,
  ADD COLUMN mfa_secret_ciphertext text NULL,
  ADD COLUMN mfa_secret_auth_tag text NULL,
  ADD COLUMN mfa_secret_pending_iv text NULL,
  ADD COLUMN mfa_secret_pending_ciphertext text NULL,
  ADD COLUMN mfa_secret_pending_auth_tag text NULL,
  ADD COLUMN mfa_enabled_at timestamptz NULL,
  ADD COLUMN mfa_backup_codes text[] NOT NULL DEFAULT '{}';

-- 2. Enum + tabella credenziali
CREATE TYPE public.credenziale_categoria AS ENUM (
  'hosting', 'database', 'banca', 'social', 'bot', 'cms', 'email', 'altro'
);
CREATE TABLE public.credenziali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  url text NULL,
  categoria public.credenziale_categoria NOT NULL DEFAULT 'altro',
  username text NOT NULL,
  password_iv text NOT NULL,
  password_ciphertext text NOT NULL CHECK (length(password_ciphertext) <= 8192),
  password_auth_tag text NOT NULL,
  note_iv text NULL,
  note_ciphertext text NULL CHECK (note_ciphertext IS NULL OR length(note_ciphertext) <= 16384),
  note_auth_tag text NULL
);
CREATE INDEX idx_credenziali_categoria ON public.credenziali(categoria);
CREATE INDEX idx_credenziali_updated_at ON public.credenziali(updated_at DESC);
ALTER TABLE public.credenziali ENABLE ROW LEVEL SECURITY;

-- 3. Audit log generale (schema della Sessione 6 SECURITY_PLAN, anticipato)
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  diff jsonb,
  ip text,
  user_agent text
);
CREATE INDEX idx_audit_at ON public.audit_log(at DESC);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
```

### Architettura file (alta)

```
lib/credenziali/       encryption.ts, totp.ts, qr.ts, backup-codes.ts
lib/auth/mfa-session.ts  (Redis: markMfaFresh/isMfaFresh/clearMfaFresh, fail-closed)
lib/auth/page-guards.ts  (+ requireVaultMfaFresh)
lib/db/credenziali.ts    (CRUD + decryption helpers)
lib/db/audit-log.ts      (logAudit fire-and-forget)
lib/actions/mfa.ts       (setup, verify, disable, regenerate backup codes)
lib/actions/credenziali.ts (CRUD; prima riga sempre requireVaultMfaFresh)
app/(dashboard)/credenziali/  layout.tsx, page.tsx, setup/, verify/, nuova/, [id]/
components/credenziali/  list, form, reveal-button, totp-setup-form, mfa-verify-form, backup-codes-display
scripts/admin-disable-mfa.ts
```

### Prerequisiti operativi (da preparare PRIMA di partire)

- **Env var nuova**: `VAULT_MASTER_KEY` (32 byte base64, generata con `openssl rand -base64 32`). Va su Vercel Production + Preview. **NON committarla mai**.
- **Dependencies npm** da aggiungere: `otpauth` (TOTP), `qrcode` + `@types/qrcode` (QR generation server-side). bcrypt e `@upstash/redis`/`@upstash/ratelimit` gia' presenti.
- **Runtime**: tutte le pagine `app/(dashboard)/credenziali/*` e le actions in `lib/actions/{mfa,credenziali}.ts` devono girare su **Node runtime** (default per server actions App Router). AES-GCM via `node:crypto` non funziona su Edge.

### Pattern obbligatori (invarianti di sicurezza)

- **Server actions vault**: ogni action ha come prima riga `await requireVaultMfaFresh()`. Senza eccezioni — documentato come invariante in commento di testa al file.
- **Plaintext**: mai cached, mai loggato, **mai passato come prop RSC** (finirebbe in chiaro nello stream HTML/RSC). Solo via action invocata da Client Component al click esplicito di "Mostra password".
- **Cache HTTP**: pagine vault hanno `export const dynamic = "force-dynamic"` + header `Cache-Control: no-store, max-age=0`.
- **Audit log**: ogni `view` di credenziale, ogni `verify` MFA (success/fail/backup_used), ogni `reset` admin -> entry in `audit_log`.

### Ordine commits suggerito (per PR review-friendly)

1. `feat(schema)`: migration users + credenziali + audit_log + enum. Regenerate types.
2. `feat(crypto)`: `lib/credenziali/{encryption,totp,qr,backup-codes}.ts`. Unit-test inline via `node -e` per encrypt/decrypt round-trip.
3. `feat(auth)`: `lib/auth/mfa-session.ts` (Redis) + `lib/auth/page-guards.ts` (`requireVaultMfaFresh`) + estensione `auth.config.ts` callback + `types/next-auth.d.ts`.
4. `feat(actions)`: `lib/actions/mfa.ts` + `lib/actions/credenziali.ts` + helper DB.
5. `feat(ui)`: rotte `app/(dashboard)/credenziali/*` + componenti `components/credenziali/*` + voce sidebar.
6. `feat(admin)`: action `disableMfaForUserAction` + bottone nel drawer `/utenti` + script `scripts/admin-disable-mfa.ts`.
7. `docs`: `STATUS.md` + `SECURITY_PLAN.md` aggiornati + `.env.example`.

### Punti aperti da rivedere prima di partire

- [ ] Confermare le 8 categorie enum coprono tutti i casi dell'associazione (oggi: hosting/db/banca/social/bot/cms/email/altro). Aggiungerne prima della migration costa zero.
- [ ] Decidere se "Disabilita MFA" sull'utente nel drawer admin esiste gia' (probabilmente no) o e' un nuovo bottone da aggiungere a `/utenti/[id]` drawer.
- [ ] Verificare retention dell'`audit_log`: per ora nessun auto-delete (volume basso atteso). Decisione formale nella Sessione 6 SECURITY_PLAN.
- [ ] **Future-future work** (NON in MVP): notifica Telegram self-monitoring tipo "Sei entrato nel vault alle 14:32 da IP X". Richiede outbound bot API (`TELEGRAM_BOT_TOKEN` + `sendMessage`). Riusa `telegram_user_id` gia' presente su `public.users`.
- [ ] **Future-future work**: rotazione `VAULT_MASTER_KEY`. Richiede script `scripts/rotate-vault-key.ts` che decifri con vecchia + ricifri con nuova in batch. Out of scope MVP, documentato.

### Riferimenti

- **Conversazione di brainstorming**: 2026-05-14, sessione su branch `claude/add-credentials-vault-zWY77`.
- **Sessione SECURITY_PLAN correlata**: Sessione 6 "Audit log applicativo" — questa idea **anticipa** la creazione della tabella `public.audit_log` cosi' che la Sessione 6 si riduca ad estenderne le call site, niente DDL nuovo.
- **Schema critico da riusare**: `lib/auth/auth.config.ts:18-39` (callback `authorized` con pattern `must_change_password` -> redirect `/primo-accesso`) e' il template esatto da clonare per `mfa_enabled_at` -> redirect `/credenziali/setup`. `lib/rate-limit.ts` e' il template per `getMfaLimiter()`. `lib/auth/page-guards.ts` e' il template per `requireVaultMfaFresh()`.

---

## 2. Fatture da pagare (promemoria scadenze)

**Stato**: 💭 idea / non pianificata
**Brainstorming**: 2026-05-15
**Effort stimato**: 4-5h MVP, 2-3h ciascuna le estensioni future
**Rischio**: basso (nuova tabella isolata, nessuna modifica a flussi esistenti)
**Branch riservato**: `claude/add-unpaid-invoices-section-DbtyA`

### Contesto

Nuova sezione admin-only `/fatture-da-pagare` come **promemoria delle fatture/bollette/spese non ancora pagate**. L'utente vuole un posto dove segnare "questa cosa va pagata entro il X" e poi spuntarla quando paga, cosi' da non dimenticarsene.

**Differenza con il resto del sistema**:
- `Movimenti` registra i pagamenti **gia' avvenuti** (cassa, BCC, SumUp).
- `Rate` (`MesiIscrizione`) sono le quote che i bambini devono pagare **all'associazione** (lato entrate).
- `FattureDaPagare` e' il nuovo lato simmetrico: le spese che **l'associazione deve** a fornitori esterni (Enel, BCC commissioni, cooperative educatori, manutenzione, gite, ecc.), prima che diventino `Movimento Uscita`.

**Flow desiderato**: registro una fattura -> appare in lista con scadenza -> quando pago, clicco "Segna pagata" -> dialog (importo effettivo, data, conto Cassa/BCC/SumUp, note) -> il sistema crea un `Movimento` di tipo Uscita sul conto scelto e linka la fattura via `movimento_id`. Stesso pattern di `segnaPagatoAction` per le rate (PR #21).

### Decisioni di design da chiudere con l'utente prima di partire

Da confermare via `AskUserQuestion` all'inizio della sessione operativa:

| Tema | Default proposto | Alternative |
|---|---|---|
| Scope MVP | Lista CRUD + "Segna pagata" -> crea Movimento | Solo lista senza creazione movimento (utente registra il movimento a mano) |
| Categorie/voce ETS sulla fattura | Opzionale, suggerita dalla `categoria` -> `voce_rendiconto_default_id` come per i movimenti | Obbligatoria al momento della creazione |
| Fatture ricorrenti (bollette mensili) | Out of scope MVP, da fare in mini-sessione successiva (template + cron N8N o scheduled function) | Includere nel MVP con campo `ricorrenza` (monthly/quarterly/yearly) |
| Allegato PDF | Out of scope MVP (richiede Supabase Storage bucket + RLS) | Includere con Storage |
| Notifiche promemoria | Out of scope MVP. Sfruttare bot Telegram esistente in sessione successiva: cron giornaliero che pinga admin con "fatture in scadenza nei prossimi 7gg" | Email via Resend / similar |
| Dashboard widget | "Prossime scadenze" (top 5 ordinate per data) nel blocco admin `/dashboard`, accanto al saldo | Solo lista isolata su `/fatture-da-pagare` |
| Permessi | Admin + volontario_cassa (lettura + creazione + segna pagata). Coordinatore_educativo escluso. | Solo admin |
| Stato "scaduta" | Calcolato (data_scadenza < oggi AND stato='da_pagare') — non persistito | Persistito con cron che aggiorna `stato='scaduta'` |

### Schema (1 migration Supabase via MCP)

```sql
CREATE TYPE public.fattura_da_pagare_stato AS ENUM ('da_pagare', 'pagata', 'annullata');

CREATE TABLE public.fatture_da_pagare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  fornitore text NOT NULL,
  descrizione text NULL,
  importo numeric(10,2) NOT NULL CHECK (importo > 0),
  data_scadenza date NOT NULL,
  data_emissione date NULL,
  numero_documento text NULL,
  stato public.fattura_da_pagare_stato NOT NULL DEFAULT 'da_pagare',
  conto_previsto public.mezzo_pagamento NULL,
  categoria_id uuid REFERENCES public.categorie(id) ON DELETE SET NULL,
  voce_rendiconto_id uuid REFERENCES public.voci_rendiconto(id) ON DELETE SET NULL,
  movimento_id text REFERENCES public.movimenti(id) ON DELETE SET NULL,
  pagata_il date NULL,
  pagata_da uuid REFERENCES public.users(id) ON DELETE SET NULL,
  note text NULL
);
CREATE INDEX idx_fatture_stato_scadenza ON public.fatture_da_pagare(stato, data_scadenza);
CREATE INDEX idx_fatture_movimento ON public.fatture_da_pagare(movimento_id);
ALTER TABLE public.fatture_da_pagare ENABLE ROW LEVEL SECURITY;
```

Note sullo schema:
- `importo` come `numeric(10,2)` allineato a `movimenti.importo` e `rate.importo`.
- `conto_previsto` riusa l'enum `public.mezzo_pagamento` esistente (Cassa/BCC/Sumup).
- `movimento_id` FK testuale verso `movimenti.id` (PK testuale `app_xxx`/Telegram id). `ON DELETE SET NULL` cosi' se elimino il movimento la fattura torna "da pagare" senza orfani.
- `categoria_id` e `voce_rendiconto_id` propagati al `Movimento` creato al "segna pagata", come fa gia' `creaMovimentoAction` da `/spese-edu`.
- Index composto `(stato, data_scadenza)` per la query principale: "fatture da pagare in scadenza".

### Architettura file (alta)

```
lib/db/fatture-da-pagare.ts    list / get / create / update / delete / segnaPagata / annulla
lib/actions/fatture.ts          createFatturaAction, updateFatturaAction, deleteFatturaAction,
                                segnaFatturaPagataAction (con dialog confermato),
                                annullaFatturaAction
app/(dashboard)/fatture-da-pagare/
  page.tsx                      lista con KPI + filtri
  nuova/page.tsx                form crea
  [id]/page.tsx                 detail con storico cambi (via audit_log) + segna pagata
components/fatture/
  fatture-list.tsx              tabella con badge stato, ordinamento data_scadenza ASC
  fattura-form.tsx              form crea/modifica
  segna-pagata-dialog.tsx       importo, data, conto, note (clone di segna-pagato-dialog rate)
  fatture-dashboard-widget.tsx  componente "prossime scadenze" per /dashboard
```

### Integrazione con sistema esistente

- **Sidebar amm**: nuova voce "Fatture da pagare" con icona `Receipt` o `FileWarning` (lucide-react). Subito sotto "Cassa".
- **Dashboard widget**: nel blocco admin di `/dashboard/page.tsx`, accanto ai KPI saldo, una card "Prossime scadenze" che lista le 5 fatture `da_pagare` ordinate per `data_scadenza` ASC. Badge rosso per quelle gia' scadute (`data_scadenza < CURRENT_DATE`). Click -> `/fatture-da-pagare/[id]`.
- **Rendiconto ETS**: nessun impatto. Le fatture non pagate **non entrano** nel rendiconto (e' un rendiconto per cassa, conta solo l'effettivo pagato). La fattura entra nel rendiconto solo nel momento in cui viene segnata pagata e crea un Movimento.
- **Import estratto conto BCC/SumUp**: potenziale matching automatico fattura<->movimento importato. **Out of scope MVP** ma da tenere in mente: quando importo un estratto conto, se trovo un movimento Uscita di importo X con descrizione che matcha un fornitore di una fattura `da_pagare`, propongo il match. Riusa la logica di dedup di `lib/import/dedup.ts`.
- **Audit log (Sessione 6 SECURITY_PLAN, gia' implementata)**: tutte le action sulla fattura (`fattura.create`, `fattura.update`, `fattura.delete`, `fattura.segna_pagata`, `fattura.annulla_pagamento`) producono entry. La pagina detail `/fatture-da-pagare/[id]` puo' mostrare lo storico via `select * from audit_log where entity_type='fattura' and entity_id=:id order by at desc`.

### Smoke test pianificati

- [ ] Admin crea una fattura -> appare in lista con badge "da pagare" giallo, data_scadenza visibile.
- [ ] La fattura scaduta (data passata) ha badge rosso "scaduta".
- [ ] Admin "Segna pagata" -> dialog -> conferma -> appare un Movimento Uscita su `/cassa` sul conto scelto, importo + descrizione coerenti, voce ETS popolata.
- [ ] La fattura nella lista ora ha badge verde "pagata", la riga e' linkata al movimento.
- [ ] Annulla pagamento -> il movimento viene cancellato (o soft-deleted con `stato='errato'`), la fattura torna `da_pagare`.
- [ ] Volontario_cassa accede a `/fatture-da-pagare`, vede la lista, puo' crearne una, ma **non** puo' eliminarla (decisione di design da confermare).
- [ ] Coordinatore_educativo accede a `/fatture-da-pagare` -> 307 redirect (proxy gating).
- [ ] Dashboard widget mostra le 5 prossime scadenze ordinate, badge corretto per scadute.

### Punti aperti da rivedere prima di partire

- [ ] Decidere se "Segna pagata" crea sempre un Movimento o se l'admin puo' anche segnarla pagata "fuori bilancio" (es. pagata in contanti senza ricevuta, non tracciata in cassa). Default proposto: **sempre crea movimento** per integrita' contabile.
- [ ] Decidere il comportamento del `delete` su una fattura gia' pagata: blocco (come per le rate pagate, vedi `hasAnyRataPagataForSessione`) o cascade del movimento? Default proposto: **blocco** con messaggio "Annulla prima il pagamento".
- [ ] **Future-future work**: fatture ricorrenti. Schema-side basta un campo `template_id uuid REFERENCES fatture_da_pagare_template(id)`. Implementare con tabella separata `fatture_da_pagare_template` + cron/scheduled function di Supabase che ogni 1° del mese crea le istanze.
- [ ] **Future-future work**: allegato PDF della fattura su Supabase Storage. Bucket privato + RLS policy admin-only + URL firmato temporaneo per download. Costa ~1h.
- [ ] **Future-future work**: notifiche Telegram. Cron giornaliero -> bot pinga admin con "Hai N fatture in scadenza nei prossimi 7gg, totale EUR X". Riusa `telegram_user_id` gia' presente su `public.users` + `TELEGRAM_BOT_TOKEN`.
- [ ] **Future-future work**: matching automatico con bank import. Da progettare insieme alla logica di auto-classifier (`lib/import/auto-classify.ts`).

### Riferimenti

- **Conversazione di brainstorming**: 2026-05-15.
- **Pattern simile da clonare**: la logica `segnaPagatoAction`/`annullaPagamentoAction` su `lib/actions/mesi.ts` (PR #21) — stesso flow "segna pagata -> crea Movimento -> link via FK". Riusa la stessa primitive per evitare di duplicare la logica di creazione movimento.
- **UI di riferimento**: `/iscrizioni/[id]` (tabella rate con "Segna pagato" inline) e il dialog componente `components/iscrizioni/segna-pagato-dialog.tsx` (verificare path esatto) — riadattare il dialog per accettare "fornitore" invece di "bambino" e "fattura" invece di "rata".
- **Index composto**: `(stato, data_scadenza)` e' lo stesso pattern usato su `rate(stato_pagamento, scadenza)` (verificare). Query principale: `where stato = 'da_pagare' order by data_scadenza asc`.
