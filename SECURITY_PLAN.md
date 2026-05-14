# Piano sicurezza & architettura — roadmap multi-sessione

> Documento operativo. Lo legge ogni sessione futura per sapere a che punto siamo, cosa è già fatto, cosa è in corso, cosa rimane.
>
> **Origine**: audit completo del 2026-05-14 (3 agenti paralleli + verifica manuale, branch `claude/review-site-architecture-nRaS4`). Vedi commit di creazione di questo file per il report integrale.
>
> **Filosofia**:
> 1. Una PR per sessione, atomica e reversibile.
> 2. Sessioni a basso rischio prima, alto rischio dopo.
> 3. Tra una sessione e l'altra: finestra di osservazione in produzione (durata variabile per criticità).
> 4. Smoke test manuale obbligatorio prima del merge.
> 5. `pnpm typecheck && pnpm lint && pnpm build` verdi sono condizione necessaria, non sufficiente.

---

## Indice rapido

| # | Sessione | Rischio | Effort | Status |
|---|----------|---------|--------|--------|
| 1 | HTTP security headers + CSP | 🟢 basso | 1-2h | 🌐 in osservazione produzione (PR #27 mergeata, finestra 24h prima del flip Report-Only → enforcing) |
| 2 | File upload hardening (`/cassa/import`) + CSV formula injection | 🟢 basso | 1h | 🌐 in osservazione produzione (PR #28 mergeata) |
| 3 | Defense-in-depth auth checks + error message hardening | 🟢 basso | 2h | 🌐 in osservazione produzione (PR #29 mergeata) |
| 4 | Rate limiting su `/login` | 🟡 medio | 3h | ⏳ da fare |
| 5 | JWT maxAge + session invalidation on password change | 🟡 medio | 3-4h | ⏳ da fare |
| 6 | Audit log applicativo per operazioni sensibili | 🟡 medio | 3-4h | ⏳ da fare |
| 7 | Performance: `unstable_cache` esteso + RPC aggregati | 🟡 medio | 3h | ⏳ da fare |
| 8 | DB transactions per race conditions (presenze/iscrizioni/disponibilita) | 🔴 alto | 5-6h | ⏳ da fare |

Totale stimato: 21-27h spalmate su 8 sessioni.

**Status legend**: ⏳ da fare · 🚧 in corso · 👀 in review · ✅ merged · 🌐 in osservazione produzione · ❌ annullato.

---

## Convenzioni operative

### Per ogni sessione

1. **Branch**: nome suggerito sotto ogni sessione (`claude/secplan-NN-...`).
2. **Smoke test manuale** prima del merge:
   - `pnpm dev` → login con utente admin → naviga su `/dashboard`, `/cassa`, `/bambini/[id]`, `/iscrizioni`, `/rendiconto`, `/utenti`.
   - Se la sessione tocca auth: testa anche login fallito, primo-accesso, cambio password volontario.
   - Se la sessione tocca dati: prova un'azione mutante (es. crea un movimento da `/spese-edu`).
3. **Build green**: `pnpm typecheck && pnpm lint && pnpm build` tutti puliti.
4. **Preview Vercel**: ogni PR fa partire una preview. Per sessioni a rischio medio/alto, l'utente verifica la preview prima del merge.
5. **PR description**: include sempre "Test plan" con checkbox.
6. **Rollback path**: documentato per ogni sessione qui sotto (di solito: `git revert <merge-commit>` + eventuali undo aggiuntivi).

### Finestre di osservazione fra sessioni

| Categoria | Osservazione minima prima della sessione successiva |
|-----------|-----------------------------------------------------|
| Modifiche `next.config.ts` / headers / upload limits | 24h |
| Auth (rate limit, JWT, session) | 1 settimana |
| Nuove tabelle / RLS / RPC | 48h |
| Race conditions / transactions su tabelle live | 1 settimana |

L'utente decide se accelerare o rallentare in base ai risultati reali.

### Quando uno step fallisce

- Build/typecheck rosso → fix prima di merge, non bypass.
- Smoke test trova regressione → annulla la sessione, apri issue, ripianifica.
- Preview Vercel rotta → non mergiare anche se "in locale funziona".
- Sessione in produzione causa regressione → `git revert` immediato, non hotfix in avanti.

---

# Sessioni

## Sessione 1 — HTTP security headers + CSP

**Obiettivo**: portare il sito da "zero header di sicurezza" a baseline OWASP. È la prima perché è la più impattante a parità di rischio basso (non tocca logica applicativa).

**Branch suggerito**: `claude/secplan-01-security-headers`

**File toccati**:
- `next.config.ts` (aggiunta funzione `headers()`)
- Possibilmente `app/layout.tsx` se servono nonce per il bootstrap script

**Step**:

1. Aggiungere a `next.config.ts`:
   ```typescript
   async headers() {
     return [{
       source: "/(.*)",
       headers: [
         { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
         { key: "X-Frame-Options", value: "DENY" },
         { key: "X-Content-Type-Options", value: "nosniff" },
         { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
         { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
       ],
     }];
   }
   ```
2. CSP: partire in **Report-Only** mode (`Content-Security-Policy-Report-Only` invece di `Content-Security-Policy`) per non rompere nulla. Direttive di partenza:
   ```
   default-src 'self';
   script-src 'self' 'unsafe-inline';
   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
   img-src 'self' data: blob: https://*.supabase.co;
   font-src 'self' https://fonts.gstatic.com;
   connect-src 'self' https://*.supabase.co;
   frame-ancestors 'none';
   base-uri 'self';
   form-action 'self';
   ```
3. Dopo 24h in produzione **senza violazioni**, passare CSP da Report-Only a enforcing.
4. Stretch goal (opzionale, in sessione successiva): sostituire `'unsafe-inline'` su script con nonce per il bootstrap tema in `app/layout.tsx:54`.

**Smoke test specifico**:
- Apri DevTools Network → ispeziona response headers di `/login` e `/dashboard`. Tutti i header presenti.
- Console DevTools: nessun errore CSP violation in Report-Only.
- Tutte le pagine principali caricano correttamente (Supabase fetch, Google Fonts, Sonner toast, immagini).

**Criteri di accettazione**:
- Headers visibili in produzione su almeno 3 URL diversi.
- Lighthouse Security score migliorato (era da misurare → almeno 90+).
- Test su https://securityheaders.com/ → grade A o A+ (era F).

**Rollback**: `git revert <merge-commit>`. Headers spariscono, comportamento torna identico a prima.

**Cosa NON fare in questa sessione**:
- Non aggiungere nonce nello stesso PR (cambio invasivo del layout).
- Non passare CSP a enforcing nello stesso PR (rischio di rompere immagini/font/fetch).

---

## Sessione 2 — File upload hardening + CSV formula injection

**Obiettivo**: chiudere il vettore DoS via upload gigante e il rischio di formula injection nei CSV esportati.

**Branch suggerito**: `claude/secplan-02-upload-hardening`

**File toccati**:
- `components/cassa/import-estratto-conto-client.tsx` (validazione client-side)
- `app/(dashboard)/cassa/import/actions.ts` (validazione server-side)
- `app/(dashboard)/rendiconto/export/route.ts` (sanitizzazione CSV export — verificare path esatto)

**Step**:

1. **Client-side validation** in `import-estratto-conto-client.tsx:67-77` (`handleFileChange`) e `:79-95` (`handleAnteprima`):
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
   const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".xls", ".txt"];

   if (file.size > MAX_FILE_SIZE) {
     setError(`File troppo grande (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
     return;
   }
   const ext = "." + file.name.toLowerCase().split(".").pop();
   if (!ALLOWED_EXTENSIONS.includes(ext)) {
     setError("Formato non supportato. Usa CSV/TSV/XLS/TXT.");
     return;
   }
   ```

2. **Server-side validation** (la validazione client è bypassabile) in `parseEstrattoContoAction` (`actions.ts:43`):
   ```typescript
   const MAX_FILE_TEXT_SIZE = 6 * 1024 * 1024; // 6 MB di stringa = ~5 MB file
   if (fileText.length > MAX_FILE_TEXT_SIZE) {
     return { ok: false, error: "File troppo grande" };
   }
   ```

3. **CSV formula injection** in route handler `/rendiconto/export`:
   - Trovare il file (probabilmente `app/(dashboard)/rendiconto/export/route.ts`).
   - Per ogni cella che inizia con `=`, `+`, `-`, `@`, `\t`, `\r`, prepend con apostrofo `'`:
     ```typescript
     function sanitizeCsvCell(v: string): string {
       if (/^[=+\-@\t\r]/.test(v)) return `'${v}`;
       return v;
     }
     ```
   - Applicare a `descrizione`, `note`, e qualunque campo testuale.

4. (Opzionale) Limitare la lunghezza di `descrizione` parsata dai parser BCC/SumUp a 1000 caratteri.

**Smoke test specifico**:
- Crea un file CSV vuoto da 6MB (`dd if=/dev/zero of=fake.csv bs=1M count=6`) → upload deve essere rifiutato.
- Carica un estratto BCC reale piccolo → flusso completo funziona.
- Esporta `/rendiconto/export?anno=2026` → apri in Excel, verifica che descrizioni che iniziano per `=` non vengano interpretate come formule.

**Criteri di accettazione**:
- Upload >5MB rifiutato lato client e server.
- Estratti conto reali continuano a funzionare.
- CSV export sicuro da formula injection (verificato in Excel/Numbers).

**Rollback**: `git revert <merge-commit>`. Nessun impatto su dati esistenti.

---

## Sessione 3 — Defense-in-depth auth checks + error message hardening

**Obiettivo**: aggiungere `auth()` esplicito a livello page su rotte sensibili e ridurre information disclosure nei messaggi di errore.

**Branch suggerito**: `claude/secplan-03-auth-defense-in-depth`

**File toccati**:
- `app/(dashboard)/utenti/page.tsx` (manca `auth()`)
- `app/(dashboard)/bambini/page.tsx` (manca `auth()`)
- `app/(dashboard)/bambini/[id]/page.tsx` (verificare)
- `app/(dashboard)/iscrizioni/page.tsx` (verificare)
- Server actions: pattern di error handling

**Step**:

1. Aggiungere all'inizio di `utenti/page.tsx`:
   ```typescript
   const session = await auth();
   if (!session?.user || session.user.ruolo !== "admin") redirect("/");
   ```
2. Stessa cosa su `bambini/page.tsx` (admin + coordinatore_educativo):
   ```typescript
   const session = await auth();
   if (!session?.user) redirect("/login");
   if (!["admin", "coordinatore_educativo"].includes(session.user.ruolo)) redirect("/");
   ```
3. **Audit di tutte le `page.tsx` in `app/(dashboard)/`**: per ogni file, verificare la presenza di `auth()` esplicito. Lista delle rotte e dei ruoli richiesti da `proxy.ts`/`auth.config.ts`. Aggiungere check mancanti.
4. **Error message hardening**: rivedere ogni server action in `lib/actions/*.ts` e route handler:
   - Sostituire `return { error: (e as Error).message }` con messaggi user-friendly generici per errori non previsti.
   - Mantenere `console.error(e)` lato server per debugging.
   - Esempio:
     ```typescript
     } catch (e) {
       console.error("[actionName]", e);
       if (e instanceof KnownBusinessError) return { error: e.userMessage };
       return { error: "Si è verificato un errore. Riprova." };
     }
     ```
5. **Stale Airtable references**: in `app/(dashboard)/bambini/page.tsx:8-9` (e altri se trovati), aggiornare `import from "@/lib/airtable/types"` → `@/lib/db/types` (o re-export pulito).

**Smoke test specifico**:
- Login come `coordinatore_educativo` → tentativo di accedere a `/utenti` deve fare redirect.
- Login come `volontario_cassa` → tentativo di accedere a `/bambini` deve fare redirect.
- Login admin → tutto accessibile.
- Crea utente duplicato → messaggio user-friendly, no leak di "violates constraint users_email_key".

**Criteri di accettazione**:
- Tutte le `page.tsx` admin-only hanno `auth()` esplicito.
- Nessuna server action espone messaggi Postgres raw al client.
- TypeScript build green.

**Rollback**: `git revert <merge-commit>`. Le rotte rimangono protette dal middleware comunque.

---

## Sessione 4 — Rate limiting su `/login`

**Obiettivo**: bloccare brute-force dictionary attacks sul login.

**Branch suggerito**: `claude/secplan-04-login-rate-limit`

**Dipendenze nuove**: `@upstash/ratelimit` + `@upstash/redis` (free tier).

**File toccati**:
- `package.json` (add deps)
- `lib/rate-limit.ts` (nuovo)
- `lib/actions/auth.ts` (integrate)
- `.env.example` (aggiungi `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
- Env Vercel Production + Preview

**Step**:

1. Setup Upstash:
   - Crea istanza Redis (free tier, regione `fra1` per co-locazione).
   - Salva URL + token nelle env Vercel.
2. `lib/rate-limit.ts`:
   ```typescript
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   const redis = Redis.fromEnv();
   export const loginLimiter = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 tentativi / 15 min
     prefix: "rl:login",
   });
   ```
3. In `loginAction` (`lib/actions/auth.ts:10`):
   ```typescript
   import { headers } from "next/headers";
   import { loginLimiter } from "@/lib/rate-limit";

   const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "unknown";
   const email = String(formData.get("email") ?? "").toLowerCase();
   const key = `${ip}:${email}`;
   const { success, reset } = await loginLimiter.limit(key);
   if (!success) {
     const minutes = Math.ceil((reset - Date.now()) / 60000);
     return { error: `Troppi tentativi. Riprova tra ${minutes} minuti.` };
   }
   ```
4. **Graceful degradation**: se Upstash è down, il limiter throw → wrappa in try/catch e in caso di errore **lascia passare** (fail-open) con un `console.warn`. Alternativa fail-closed: blocca tutti i login. Scegli fail-open per disponibilità.
5. Testa con multipli login fallirsi: dopo 5, deve essere bloccato.

**Smoke test specifico**:
- 6 login con password sbagliata dalla stessa rete → il 6° è bloccato con messaggio chiaro.
- 1 login corretto → passa senza problemi.
- Dopo 15 min, contatore resetta (testabile in preview con sliding window più corta).

**Criteri di accettazione**:
- Login bloccato dopo 5 tentativi falliti in 15 min, per coppia IP+email.
- Upstash down ≠ login bloccato (fail-open).
- No falsi positivi su utenti legittimi (1-3 tentativi falliti).

**Rollback**: `git revert <merge-commit>` + `pnpm remove @upstash/ratelimit @upstash/redis` + rimuovi env vars. Mantieni istanza Upstash (è gratis) per uso futuro.

**Osservazione in produzione**: 1 settimana. Monitora Upstash dashboard per traffico e Vercel logs per `console.warn` di fail-open.

---

## Sessione 5 — JWT maxAge + session invalidation on password change

**Obiettivo**: ridurre la finestra di compromissione token + invalidare sessioni esistenti su cambio password.

**Branch suggerito**: `claude/secplan-05-jwt-session-invalidation`

**File toccati**:
- `lib/auth/auth.config.ts` (maxAge + jwt callback)
- `lib/db/users.ts` (campo `password_version`)
- `lib/actions/utenti.ts` (`cambiaPasswordAction`, `primoAccessoAction`, `resetPasswordAction`)
- Migration Supabase per aggiungere `password_version` su `users`

**Step**:

1. **Migration Supabase** (via MCP `apply_migration`):
   ```sql
   ALTER TABLE public.users ADD COLUMN password_version integer NOT NULL DEFAULT 1;
   ```
2. `lib/db/users.ts`: aggiungi `passwordVersion` al type `User` e al mapper. Aggiungi helper `incrementPasswordVersion(userId)`.
3. `lib/auth/auth.config.ts`:
   - Cambia `maxAge: 60 * 60 * 24 * 14` (14gg) → `60 * 60 * 24` (24h). Considera `60 * 60 * 4` (4h) per dati ETS più sensibili.
   - Nel callback `jwt()`: salva `token.passwordVersion = user.passwordVersion` al login.
   - Aggiungi callback che ad ogni richiesta verifica `token.passwordVersion` contro il DB:
     ```typescript
     async jwt({ token, user, trigger }) {
       if (user) {
         token.passwordVersion = user.passwordVersion;
         // ... resto come prima
       }
       // Verifica versione (skipped se appena loggato)
       if (trigger !== "signIn" && token.userId) {
         const current = await getPasswordVersion(token.userId as string);
         if (current !== token.passwordVersion) {
           return null; // forza re-login
         }
       }
       return token;
     }
     ```
4. In `cambiaPasswordAction` e `resetPasswordAction`: dopo update password, chiama `incrementPasswordVersion(recordId)`.
5. In `primoAccessoAction`: il flow attuale già chiama `signOut`, lasciare invariato. Eventuale anche qui increment per coerenza.

**Smoke test specifico** (delicato, testare in preview prima del merge):
- Login utente A → cambio password → riprova ad usare il vecchio JWT (apri seconda finestra con cookie copiato) → deve essere deslogiato.
- Admin resetta password di utente B → utente B viene deslogiato al refresh successivo.
- Login normale → continua a funzionare per 24h, poi richiede re-login.

**Criteri di accettazione**:
- Cambio password invalida immediatamente le sessioni esistenti dell'utente.
- Token vecchi (più di 24h) richiedono re-login.
- Nessun utente "buttato fuori" durante una sessione attiva legittima.

**Rollback**:
- `git revert <merge-commit>`.
- Migration DOWN: `ALTER TABLE users DROP COLUMN password_version;`.
- Tutti gli utenti dovranno re-loggare una volta (il vecchio JWT non ha `passwordVersion`).

**Osservazione in produzione**: 1 settimana. Questo è il fix più delicato perché tocca auth. Comunica all'utente che farà re-login il prossimo giorno.

---

## Sessione 6 — Audit log applicativo

**Obiettivo**: tracciare chi ha fatto cosa, quando, su quali entità sensibili. Richiesto per dati ETS e per investigazione incidenti.

**Branch suggerito**: `claude/secplan-06-audit-log`

**File toccati**:
- Migration Supabase: nuova tabella `audit_log`
- `lib/db/audit-log.ts` (nuovo)
- `lib/actions/*.ts` (chiamata audit a inizio/fine di ogni mutazione sensibile)
- `app/(dashboard)/utenti/audit/page.tsx` (visualizzazione admin, opzionale in questa sessione)

**Step**:

1. **Migration Supabase**:
   ```sql
   CREATE TABLE public.audit_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     at timestamptz NOT NULL DEFAULT now(),
     user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
     user_email text,
     action text NOT NULL,           -- es. "movimento.create", "user.password.reset"
     entity_type text,                -- es. "movimento", "user"
     entity_id text,
     diff jsonb,                      -- {before: {...}, after: {...}} o solo {data: {...}}
     ip text,
     user_agent text
   );
   CREATE INDEX idx_audit_at ON public.audit_log(at DESC);
   CREATE INDEX idx_audit_user ON public.audit_log(user_id);
   CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
   ```
2. `lib/db/audit-log.ts`:
   ```typescript
   export async function logAudit(entry: {
     userId?: string;
     userEmail?: string;
     action: string;
     entityType?: string;
     entityId?: string;
     diff?: Record<string, unknown>;
   }) {
     if (!db) return;
     const h = await headers();
     await db.from("audit_log").insert({
       user_id: entry.userId,
       user_email: entry.userEmail,
       action: entry.action,
       entity_type: entry.entityType,
       entity_id: entry.entityId,
       diff: entry.diff,
       ip: h.get("x-forwarded-for")?.split(",")[0],
       user_agent: h.get("user-agent"),
     });
   }
   ```
3. Aggiungi chiamate a `logAudit` in queste action **prioritarie**:
   - `lib/actions/utenti.ts`: createUtente, resetPassword, aggiornaUtente, cambiaPassword, primoAccesso.
   - `lib/actions/auth.ts`: loginAction (anche su fail, con `action: "login.fail"`).
   - `lib/actions/movimenti.ts`: creaMovimento, deleteMovimento, setStatoMovimento (specie `'errato'`).
   - `lib/actions/mesi.ts`: segnaPagato, annullaPagamento.
   - `app/(dashboard)/cassa/import/actions.ts`: confermaImport (con count righe).
4. **NON loggare**: password in chiaro, hash, token, contenuto sensibile (descrizioni rate). Solo metadati.
5. Pagina admin (opzionale): `/utenti/audit?from=YYYY-MM-DD&user=email` per visualizzare.

**Smoke test specifico**:
- Crea un movimento → verifica riga in `audit_log` con `action: "movimento.create"`.
- Login fallito → riga con `action: "login.fail"` e `user_email` (non `user_id`).
- Reset password admin → riga con `action: "user.password.reset.admin"`, ip dell'admin.

**Criteri di accettazione**:
- Tutte le 10+ action sensibili producono audit entry.
- Nessuna performance regression (insert audit è fire-and-forget, < 50ms).
- Nessun dato sensibile nei `diff` (verifica manuale a campione).

**Rollback**:
- `git revert <merge-commit>` rimuove le chiamate `logAudit`.
- Tabella `audit_log` resta in DB inutilizzata, nessuna azione distruttiva necessaria.

**Osservazione in produzione**: 48h. Verifica crescita tabella (volume atteso: ~50-100 righe/giorno).

---

## Sessione 7 — Performance: caching esteso + RPC aggregati

**Obiettivo**: ridurre payload e tempo di rendering di `/dashboard` e `/cassa`.

**Branch suggerito**: `claude/secplan-07-performance`

**File toccati**:
- `lib/db/movimenti.ts` (cache + nuova RPC wrapper)
- `lib/db/bambini.ts` (cache opzionale)
- `lib/db/iscrizioni.ts` (cache opzionale)
- Migration Supabase: nuova RPC `saldi_per_conto(anno int)`
- `app/(dashboard)/dashboard/page.tsx` (usa RPC invece di aggregare in JS)
- `app/(dashboard)/cassa/page.tsx` (idem)

**Step**:

1. **RPC Postgres** per i totali per conto:
   ```sql
   CREATE OR REPLACE FUNCTION public.saldi_per_conto(anno_filtro int DEFAULT NULL)
   RETURNS TABLE(conto text, entrate numeric, uscite numeric, saldo numeric)
   LANGUAGE sql STABLE AS $$
     SELECT
       conto::text,
       COALESCE(SUM(importo) FILTER (WHERE tipo = 'Entrata'), 0) AS entrate,
       COALESCE(SUM(importo) FILTER (WHERE tipo = 'Uscita'), 0) AS uscite,
       COALESCE(SUM(importo) FILTER (WHERE tipo = 'Entrata'), 0)
         - COALESCE(SUM(importo) FILTER (WHERE tipo = 'Uscita'), 0) AS saldo
     FROM public.movimenti
     WHERE stato != 'errato'
       AND is_giroconto = false
       AND (anno_filtro IS NULL OR EXTRACT(YEAR FROM data_movimento) = anno_filtro)
     GROUP BY conto;
   $$;
   ```
2. Wrapper in `lib/db/movimenti.ts`:
   ```typescript
   export async function saldiPerConto(anno?: number): Promise<{conto: MezzoPagamento, entrate: number, uscite: number, saldo: number}[]> {
     if (!db) return [];
     const { data, error } = await db.rpc("saldi_per_conto", { anno_filtro: anno ?? null });
     if (error) throw error;
     return data ?? [];
   }
   ```
3. Sostituisci `totaliPerConto` (`movimenti.ts:275-294`) e l'uso nel dashboard e in `/cassa`. Verifica che i numeri tornino identici a quelli aggregati prima.
4. Aggiungi `unstable_cache` a `listMovimenti` (con tag `movimenti`) e `revalidateTag("movimenti", "max")` in tutte le mutation di `movimenti.ts`. **Attenzione**: il listing `/cassa` filtra per data — accetta filtri come parametri del cache key.
5. **NON** cachare `listBambini`/`listIscrizioni` se vengono filtrati su molti criteri client-side (cache key explosion). Meglio prima ridurre i criteri al DB.

**Smoke test specifico**:
- `/dashboard` carica con saldi corretti per Cassa/BCC/SumUp.
- `/cassa` mostra gli stessi totali.
- Confronto numerico: `saldiPerConto()` deve dare gli stessi valori di `totaliPerConto` (script di verifica).
- Mutazione di un movimento → invalida cache → la pagina mostra il valore aggiornato.

**Criteri di accettazione**:
- Saldi identici prima e dopo (verifica numerica).
- Tempo di rendering `/dashboard` ridotto (misurabile via Vercel Analytics o DevTools).
- Cache invalidation funziona (mutazione + reload mostra il dato nuovo).

**Rollback**:
- `git revert <merge-commit>`.
- RPC resta in DB inutilizzata (non distruttiva).
- Cache di Next.js si svuota da sola al deploy.

**Osservazione in produzione**: 48h. Monitora Vercel Analytics (LCP, TTFB) confrontando prima/dopo.

---

## Sessione 8 — DB transactions per race conditions

**Obiettivo**: eliminare le finestre di stato inconsistente in `setPresenza`, `syncSessioniScelte`, `replaceTurnoCella`.

**Branch suggerito**: `claude/secplan-08-db-transactions`

**Rischio**: 🔴 alto. Tocca codice in produzione su entità live (presenze, iscrizioni, turni). Da fare **dopo** che le sessioni 1-7 sono stabili.

**File toccati**:
- Migration Supabase: 3 nuove RPC `SECURITY DEFINER`
- `lib/db/presenze.ts` (sostituisce `setPresenza` con chiamata RPC)
- `lib/db/iscrizioni.ts` (sostituisce `syncSessioniScelte`)
- `lib/db/disponibilita.ts` (sostituisce `replaceTurnoCella`)

**Step**:

1. **RPC `set_presenza`**:
   ```sql
   CREATE OR REPLACE FUNCTION public.set_presenza(
     p_bambino_id uuid, p_data date, p_fascia text,
     p_ora_ingresso text, p_ora_uscita text, p_sessione_id uuid
   ) RETURNS uuid LANGUAGE plpgsql AS $$
   DECLARE v_id uuid;
   BEGIN
     INSERT INTO public.presenze (bambino_id, data_presenza, fascia_oraria, ora_ingresso, ora_uscita, sessione_id)
     VALUES (p_bambino_id, p_data, p_fascia, p_ora_ingresso, p_ora_uscita, p_sessione_id)
     ON CONFLICT (bambino_id, data_presenza, fascia_oraria)
     DO UPDATE SET ora_ingresso = EXCLUDED.ora_ingresso,
                   ora_uscita = EXCLUDED.ora_uscita,
                   sessione_id = EXCLUDED.sessione_id
     RETURNING id INTO v_id;
     RETURN v_id;
   END $$;
   ```
   Richiede un `UNIQUE(bambino_id, data_presenza, fascia_oraria)` su `presenze` — verifica se esiste, altrimenti aggiungi.

2. **RPC `sync_iscrizione_sessioni`**: prende `iscrizione_id` + array di `sessione_id`, fa delete+insert in transazione.
3. **RPC `replace_turno_cella`**: prende `data`, `fascia`, array di `educatore_id` con ore opzionali, fa diff+apply in transazione.
4. Cambia i wrapper TS per chiamare le RPC invece di fare query multiple.
5. **Test paralleli** prima del merge: scrivi un piccolo script che fa N chiamate concorrenti alla stessa cella turni e verifica che lo stato finale sia coerente (no stati intermedi).

**Smoke test specifico**:
- Set presenza per stesso bambino/giorno/fascia in rapida successione → finisce con l'ultimo valore, nessuna duplicate row.
- Modifica turno in 2 tab del browser simultaneamente → un'azione vince, l'altra rifresca e mostra lo stato corretto.
- Iscrizione: aggiungi/rimuovi sessioni rapidamente → nessun stato vuoto intermedio.

**Criteri di accettazione**:
- Test concorrenza green.
- Nessuna regressione su flussi single-user.
- Tutte le entità interessate hanno UNIQUE constraints dove necessario.

**Rollback**:
- `git revert <merge-commit>` ripristina il codice JS.
- RPC restano in DB inutilizzate.
- **Attenzione**: se hai aggiunto UNIQUE constraint, va rimossa con migration DOWN per non rompere insert futuri.

**Osservazione in produzione**: 1 settimana. Le race conditions sono rare in single-user; monitora segnalazioni utente di "dato che non si salva" o "duplicati".

---

## Checkpoint progress

Ogni sessione, al completamento, aggiorna questa sezione:

```
## Sessione N — <titolo>
**PR**: #NN
**Mergeata il**: YYYY-MM-DD
**Osservazione fino al**: YYYY-MM-DD
**Note**: <eventuali deviazioni dal piano, problemi incontrati, lessons learned>
```

### Sessione 1 — HTTP security headers + CSP
**Branch**: `claude/security-plan-session-1-UNFfC`
**PR**: #27 mergeata in produzione (`3342fe9`)
**Osservazione fino al**: 24h dopo il deploy → poi flip della key in `next.config.ts` da `Content-Security-Policy-Report-Only` a `Content-Security-Policy`
**Note**:
- Tutti gli header del piano applicati: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
- CSP servita in **Report-Only** (header key `Content-Security-Policy-Report-Only`) come prescritto: niente blocco per ora, solo osservazione. Per attivare l'enforcing dopo 24h senza violazioni: rinominare la key in `Content-Security-Policy` in `next.config.ts`.
- Direttive CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- In sviluppo (`NODE_ENV=development`) `script-src` aggiunge `'unsafe-eval'` perche' React lo usa per ricostruire stack trace (lo dichiara la doc Next 16 in `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
- `'unsafe-inline'` su `script-src` mantenuto per coprire il bootstrap tema in `app/layout.tsx:54` (inline `dangerouslySetInnerHTML`). La sostituzione con nonce e' rimandata come stretch goal (incompatibile con la prerender statica usata su `/login` e `/`, richiederebbe `connection()` per forzare il dynamic render).
- `connect-src` e `img-src` includono `https://*.supabase.co` come safety net: la service-role key gira solo server-side (`lib/db/client.ts` ha `import "server-only"`), quindi il client oggi non chiama Supabase, ma il bucket-storage e l'eventuale lookup pubblico via publishable key sono coperti senza dover toccare la CSP piu' tardi.
- Smoke test locale (`pnpm build && pnpm start`, curl headers su `/login`, `/dashboard`, `/`): tutti i 6 header presenti, HTML emesso non contiene risorse esterne ne' inline event handler, quindi nessuna violazione attesa quando si passera' a enforcing.
- Build verde: `pnpm typecheck && pnpm lint && pnpm build` puliti, 29 rotte invariate.

### Sessione 2 — File upload hardening + CSV formula injection
**Branch**: `claude/secplan-02-upload-hardening` (pushato, in attesa di PR/merge)
**Mergeata il**: —
**Osservazione fino al**: 24h dopo il deploy in produzione
**Note**:
- **Upload limit lato client** (`components/cassa/import-estratto-conto-client.tsx`): nuove costanti `MAX_FILE_SIZE = 5 MB` e `ALLOWED_EXTENSIONS = [.csv, .tsv, .xls, .txt]` + helper `validateUploadedFile`. Validazione invocata sia in `handleFileChange` (reset input + messaggio inline se file rifiutato) sia in `handleAnteprima` (defense-in-depth, l'utente puo' aver bypassato il primo check via drag-and-drop programmatico o altro).
- **Upload limit lato server** (`app/(dashboard)/cassa/import/actions.ts`): nuova costante `MAX_FILE_TEXT_SIZE = 6 MB` (margine vs i 5 MB del client per coprire encoding multibyte). `parseEstrattoContoAction` rifiuta con `{ ok: false, error: "File troppo grande..." }` prima di chiamare il parser. La validazione client e' bypassabile via `curl` con cookie auth → questo check chiude il vettore DoS reale.
- **CSV formula injection** (`lib/rendiconto/aggregate.ts:rendicontoToCsv`): nuove utility `sanitizeFormula` (prepend apostrofo se la stringa inizia per `=`, `+`, `-`, `@`, `\t`, `\r`) e `escText` (combina `sanitizeFormula` + escape CSV RFC 4180 esistente). Applicata a tutti i campi testuali: `v.voce.label`, `Totale ${sez.titolo}`, le tre righe finali ("TOTALE ONERI E COSTI" / "TOTALE ENTRATE DELLA GESTIONE" / "Avanzo/Disavanzo d'esercizio"). I campi numerici (`fmt(...)`) restano nativi cosi' che Excel/Numbers/LibreOffice possano sommarli — applicare la sanitizzazione anche a quelli avrebbe rotto i totali.
- **Cap descrizione importata** (`lib/import/types.ts` + parsers): nuove `MAX_DESCRIZIONE_LEN = 1000` e `capDescrizione(s)` esportate da `types.ts`, invocate da entrambi i parser (BCC: dopo la concatenazione descrizione+note; SumUp: dopo `normalizeWhitespace`). Una riga con descrizione patologicamente lunga (megabyte) viene troncata prima di toccare il DB / la dedup. Il fingerprint BCC resta deterministico perche' calcolato dopo il cap.
- Smoke test inline (`node -e` + `pnpm exec tsx`) sulle utility:
  - `sanitizeFormula('=cmd|/c calc!A0')` → `"'=cmd|/c calc!A0"` (apostrofo, Excel non valuta)
  - `sanitizeFormula('Materie prime')` → `"Materie prime"` (nessun cambio)
  - `sanitizeFormula('\\t=evil')` → `"'\\t=evil"` (TAB iniziale rilevato)
  - `escText('=danger, with comma')` → `"\"'=danger, with comma\""` (apostrofo PRIMA del CSV escape, ordine corretto)
  - `capDescrizione('a'.repeat(5000)).length` → `1000`
  - Render end-to-end `rendicontoToCsv` con label `=danger`: la riga output e' `A,Uscita,U-A-X,'=danger,100.00`, numero `-100.00` mantenuto raw (sommabile).
- Build verde: `pnpm typecheck && pnpm lint && pnpm build` puliti, 29 rotte invariate.

### Sessione 3 — Defense-in-depth auth checks + error message hardening
**Branch**: `claude/secplan-03-auth-defense-in-depth`
**PR**: #29 mergeata in produzione (`8cf7ee3`)
**Osservazione fino al**: 48h dopo il deploy in produzione (zero-risk client: nessuna mutazione di schema/dati, niente nuove dipendenze esterne)
**Note**:
- **Nuove primitive di sicurezza**:
  - `lib/errors.ts` esporta `BusinessError extends Error` (per errori "human-readable", es. validazione di business, autorizzazione negata) + `userErrorMessage(e, fallback)` che restituisce `e.userMessage` se `e instanceof BusinessError` altrimenti `fallback`. Tutti gli altri throw (eccezioni Supabase, invarianti, timeout) finiscono nel fallback generico.
  - `lib/auth/page-guards.ts` esporta `requireAdmin()` e `requireAdminOrCoordinatore()`: entrambi chiamano `auth()`, fanno `redirect("/login")` se non loggato, e redirect alla home di ruolo (`"/"` o `"/dashboard"`) se il ruolo e' sbagliato. Restituiscono la session se autorizzato.
- **Defense-in-depth su 16 pagine** che prima si appoggiavano solo al `proxy.ts` per il gating ruolo:
  - 2 pagine admin-only (`utenti/page.tsx`, `utenti/nuovo/page.tsx`): `await requireAdmin();`
  - 14 pagine area educativa (admin + coordinatore_educativo): 3 sotto `attivita/*`, 3 sotto `bambini/*`, 3 sotto `educatori/*`, 3 sotto `iscrizioni/*`, 2 sotto `presenze/*`: `await requireAdminOrCoordinatore();`. Le 4 pagine "nuova" che erano sincrone sono state convertite in `async`.
  - Le 9 pagine che gia' avevano `auth()` esplicito (cassa, categorie, dashboard, profilo, rendiconto, rendiconto/voce, spese-edu, turni, cassa/import) sono lasciate invariate per ridurre il diff.
- **Error message hardening su 13 file di server action** (`lib/actions/*.ts` + `app/(dashboard)/cassa/import/actions.ts`):
  - Tutti i `throw new Error("Non autorizzato")` nei `requireAdmin()` locali ora sono `throw new BusinessError("Non autorizzato")` (12 helper diversi).
  - I 17 `catch (e) { return { error: (e as Error).message ... } }` sono stati riscritti come `catch (e) { console.error("[<actionName>]", e); return { error: userErrorMessage(e, "<fallback>") }; }`. Il fallback preserva il messaggio gia' specificato nell'originale (`"Errore durante il salvataggio"`, `"Errore durante l'eliminazione"`) o default `"Errore durante l'operazione"`. Cosi' `"duplicate key value violates unique constraint users_email_key"` non esce piu' dal server: l'utente vede `"Errore durante il salvataggio"`, l'admin vede lo stack nel log Vercel.
- **Cleanup import legacy**: `lib/db/types.ts` aggiunto come re-export shim verso `lib/airtable/types`. Sweep di tutti i `@/lib/airtable/types` in `app/`, `components/`, `lib/` (eccetto `lib/airtable/*` stesso che resta intra-package) → `@/lib/db/types`. Prepara il terreno per la rimozione definitiva di `lib/airtable/` (TODO STATUS "dopo 1 settimana di osservazione").
- Smoke test:
  - Unit-test inline su `BusinessError` + `userErrorMessage`: `userErrorMessage(new BusinessError("Email gia in uso"), "...")` → `"Email gia in uso"`; `userErrorMessage(new Error('duplicate key...'), "Errore durante il salvataggio")` → `"Errore durante il salvataggio"` (no leak); stringa raw + undefined → fallback.
  - Server smoke (`pnpm start` + `curl`): le rotte `/utenti`, `/bambini`, `/attivita`, `/presenze`, `/utenti/nuovo`, `/attivita/nuova` rispondono 307 → `/login` per unauthenticated (proxy intatto). La verifica del page-level guard contro un session-cookie di ruolo sbagliato richiede preview Vercel.
- Build verde: `pnpm typecheck && pnpm lint && pnpm build` puliti, 29 rotte invariate.

---

## Domande aperte da chiarire con l'utente prima/durante l'implementazione

1. **Quanto stretto vogliamo il maxAge JWT?** 24h è ragionevole per dati di minori; 4h è più sicuro ma richiede re-login giornaliero più volte. → **Default proposto**: 24h.
2. **Fail-open o fail-closed per rate limiting?** Se Upstash down, blocco tutti i login o lascio passare? → **Default proposto**: fail-open (disponibilità > sicurezza marginale, dato che il login normale è già protetto da bcrypt).
3. **Audit log retention?** Conservare per sempre, o auto-delete dopo N mesi? → **Default proposto**: nessun auto-delete per ora (volume basso).
4. **CSP nonce per il bootstrap tema?** Vale lo sforzo o `'unsafe-inline'` è accettabile? → **Default proposto**: posticipare a sessione successiva separata, non blocca CSP.
5. **Vogliamo Sentry o similar per error tracking?** Out-of-scope di questo piano ma utile per audit log e debugging in produzione. → Da decidere a parte.
