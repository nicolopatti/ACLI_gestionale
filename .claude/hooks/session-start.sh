#!/bin/bash
# Promemoria SECURITY_PLAN — date-based reminder.
# Creato 2026-05-16 per ricordare le scadenze delle finestre di osservazione
# delle sessioni 5 (JWT), 6 (audit log) e 7 (caching/RPC).
#
# Rimuovere questo file + voce in .claude/settings.json quando la Sessione 8
# e' partita oppure dopo $EXPIRE (qualunque arrivi prima).
set -euo pipefail

TODAY=$(date +%Y-%m-%d)
SMOKE_67_FROM="2026-05-17"   # Sess. 6 + 7 chiudono osservazione (48h)
SESSION_5_DONE="2026-05-22"  # Sess. 5 chiude osservazione (1 settimana)
EXPIRE="2026-06-15"          # dopo questa data l'hook si auto-segnala come scaduto

if [[ "$TODAY" > "$EXPIRE" ]]; then
  cat <<EOF
[SECURITY_PLAN promemoria] Questo hook e' scaduto ($EXPIRE). Tutte le finestre
di osservazione delle sessioni 5-7 sono passate da tempo. Rimuovi
.claude/hooks/session-start.sh + la voce SessionStart in .claude/settings.json
se non serve piu'.
EOF
  exit 0
fi

if [[ "$TODAY" < "$SMOKE_67_FROM" ]]; then
  echo "[SECURITY_PLAN promemoria] Oggi $TODAY: tutte le sessioni 5-7 in osservazione. Sess. 6+7 chiudono il $SMOKE_67_FROM, Sess. 5 il $SESSION_5_DONE. Nulla da fare oggi."
  exit 0
fi

if [[ "$TODAY" < "$SESSION_5_DONE" ]]; then
  cat <<EOF
[SECURITY_PLAN promemoria] Oggi $TODAY: Sessioni 6 (audit log) e 7 (caching +
RPC saldi) hanno chiuso la finestra di 48h. Smoke test dovuti (vedi STATUS.md):

  Sess. 6 — audit log
    1. SQL Supabase: select at, user_email, action, entity_type, entity_id, ip
       from public.audit_log order by at desc limit 20;
    2. SQL Supabase: select diff from public.audit_log
       where action like 'user.password%';  -> verifica zero leak hash/password.

  Sess. 7 — caching/RPC saldi
    3. /cassa mostra gli stessi numeri di KPI di prima del merge.
    4. /dashboard 'Saldo totale' coerente con /cassa.
    5. Crea movimento da /spese-edu -> /cassa aggiornato senza ritardo
       (cache tag 'movimenti' invalidata correttamente).

Sessione 5 (JWT maxAge + session invalidation) chiude il $SESSION_5_DONE,
poi si potra' avviare la Sessione 8 (DB transactions race conditions).
EOF
  exit 0
fi

# Da $SESSION_5_DONE in poi (e prima di $EXPIRE)
cat <<EOF
[SECURITY_PLAN promemoria] Oggi $TODAY: tutte le finestre di osservazione
(sessioni 5 + 6 + 7) sono chiuse. Si puo' avviare la
**Sessione 8 — DB transactions per race conditions** (rischio alto, branch
suggerito 'claude/secplan-08-db-transactions', vedi SECURITY_PLAN.md per il
piano dettagliato).

Se non gia' fatti, mancano gli smoke test della Sessione 5:
  - 2 finestre incognito, login utente A in entrambe -> cambia password in 1
    -> finestra 2 al refresh deve sloggarsi.
  - Admin resetta password utente B -> B sloggato al refresh.
  - Coord. appena creato: temp pwd -> /primo-accesso -> atterra su /attivita
    senza re-login (verifica unstable_update con passwordVersion).
EOF
