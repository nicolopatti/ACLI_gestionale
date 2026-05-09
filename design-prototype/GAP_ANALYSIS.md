# Gap analysis prototipo ↔ codice

> Scopo: confronto sistematico tra le funzionalità del prototipo Claude Design (`design-prototype/prototype/`) e quelle realmente presenti nel codice. Per ogni voce: stato, costo stimato e — quando la soluzione del prototipo è cara — un'alternativa più semplice da valutare insieme.
>
> Compilato: 2026-05-09. Branch: `claude/align-design-code-Lmqps`.
> Aggiornato: 2026-05-09 (sera) — decisioni di scope dopo il primo giro di domande.

## Scope deciso

| Voce | Decisione |
|---|---|
| **Eventi** | ❌ Fuori scope. Niente tabella, niente route. |
| **Turni** | ✅ Come da prototipo: tabella assegnazioni nuova + drag-drop educatori. |
| **Cassa-edu** | ❌ Fuori scope come pagina dedicata. Si elimina anche il flag `area` sulle Categorie: il bisogno reale è solo il form di registrazione movimento, coperto da `/spese-edu`. |
| **Presenze "giustificato"** | ❌ Non si traccia. |
| **Charts** | ❌ Fuori scope ora. Quando si faranno, dovranno essere interattivi (hover, click su barra/punto). |
| **Spese-edu** | ✅ Form rapido per educatore: registra Movimento, dopo submit toast + reset (no redirect a cassa-edu, che non esiste). |

## Legenda

- 🟢 **UI-only**: aggiunta/restyling senza toccare modello dati o auth.
- 🟡 **Feature**: richiede server action nuova o logica derivata, ma niente schema Airtable.
- 🔴 **Schema**: richiede tabella o campi nuovi su Airtable + mapper + migrazione dati.
- ⚠️ **Auth**: tocca `lib/auth/auth.config.ts` o `nav-config.ts` (gating per ruolo).

---

## 1. Route assenti dal codice

| # | Route prototipo | Stato codice | Costo | Note |
|---|---|---|---|---|
| 1 | ~~`/eventi`~~ | — | — | **Fuori scope.** |
| 2 | `/adm-home` | esiste `/dashboard` ma generico | 🟡 | Cruscotto presidenza: stats finanziarie + alert. _Niente eventi prossimi._ |
| 3 | `/edu-home` | assente | 🟡 | Cruscotto coordinatore: presenze oggi, morosità, turni settimana. |
| 4 | `/turni` | assente | 🔴 + 🟡 + ⚠️ | Tabella `AssegnazioniTurni` + UI drag-drop. Vedi §4.2. |
| 5 | `/spese-edu` | assente | 🟡 + ⚠️ | Form rapido per educatore — riusa tabella Movimenti, gating per ruolo. |
| 6 | ~~`/cassa-edu`~~ | — | — | **Fuori scope.** Educatore registra movimenti via `/spese-edu`. |
| 7 | Login 2-colonne | login presente, no art panel | 🟢 | Estetico, restyling pagina `(auth)/login`. |

## 2. Pagine esistenti — gap funzionali

### `/bambini`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| Tabs `tutti / attivi / saldo / archivio` con count | nessun tab | mancante | 🟡 (count = aggregazioni) |
| Filtri `scuola`, `classe`, `iscrizione`, search | nessun filtro | mancante | 🟢 |
| Colonna "Pres. mese" con bar | assente | mancante | 🟡 (aggregazione presenze del mese) |
| Colonna "Saldo aperto" con badge red se >0 | assente | mancante | 🟡 (somma rate non pagate) |
| Drawer dettaglio con tabs Anagrafica/Iscrizioni/Presenze/Pagamenti/Note | esiste full-page `/bambini/[id]` | divergente | 🟢 (vedi §5.1) |

### `/attivita`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| Grid di **card** per attività (icona, KPI, pulsanti) | tabella | divergente | 🟢 |
| Sotto-tabella "Sessioni del mese" con avatar educatori sovrapposti, bar pagamenti | assente | mancante | 🟡 |

### `/iscrizioni`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| Tabs `attive / ritardo / completate / tutte` con count | nessun tab | mancante | 🟡 (deriva stato da rate) |
| Bar avanzamento mesi `pagati/tot` | assente | mancante | 🟢 |
| Bottone inline "Segna pagato" per riga | esiste solo nel detail | mancante | 🟢 (riusa dialog) |

### `/educatori`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| Layout split: lista a sinistra (320px) + detail a destra | tabella separata + page detail | divergente | 🟢 |
| KPI "Giorni/sett, Ore/mese, Compenso, Stato" nel detail | assente | mancante | 🟡 (ore = somma turni; compenso = nuovo) |
| Calendario disponibilità 7 colonne con pip copertura | esiste editor di disponibilità (form) | mancante (visualizzazione) | 🟡 |

### `/presenze`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| 3 stat card: Totali / Presenti / Assenti _(no "Giustificati", fuori scope)_ | nessuno | mancante | 🟡 |
| Filtro fascia oraria + date picker chiaro | filtro esiste via query param | parziale | 🟢 |

### `/cassa`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| 4 KPI card: 3 conti + saldo totale | 3 KPI generici | divergente | 🟢 (riorganizzazione) |
| Filterbar: search, tipo, conto, categoria | nessun filtro | mancante | 🟢 |
| Sidebar: card Categorie (distribuzione) + card "Sync n8n" | assente | mancante | 🟢 / 🟡 (chart) |
| Footer tabella con totali periodo | assente | mancante | 🟢 |

### `/utenti`
| Funzionalità prototipo | Codice attuale | Stato | Costo |
|---|---|---|---|
| Drawer "Modifica utente" (cambio ruolo, reset, disattiva) | reset+toggle inline su riga | divergente | 🟢 (riconfeziona) |
| Bottone "Invita utente" | creazione utente esistente ma flow diverso | parziale | 🟢 |

### `/dashboard` (oggi unico)
Va **splittata** in `adm-home` (presidenza) e `edu-home` (coordinatore) — vedi §1 + §5.4.

---

## 3. Modello dati — confronto

| Concetto prototipo | Su Airtable | Note |
|---|---|---|
| `Movimenti.conto` ∈ {Cassa, BCC, Sumup} | ✓ presente | Identico al prototipo. |
| ~~`Movimenti.area`~~ | — | **Fuori scope** (cassa-edu eliminato). |
| ~~`Eventi`~~ | — | **Fuori scope.** |
| `AssegnazioniTurni` (data, fascia, educatore) | ✗ assente | Tabella nuova. Distinta da `Disponibilita` (che dichiara la disponibilità). Vedi §4.2. |
| ~~`Presenze.stato` "giustificato"~~ | — | **Fuori scope.** Resta lo stato implicito presente/assente da `oraIngresso/oraUscita`. |
| `Iscrizioni.stato` ∈ {attiva, in_ritardo, completata} | ✗ — derivabile da rate | Calcolabile lato server. |
| `coordinatore_educativo` come ruolo reale | tipo + nav, ma nessun utente | Va creato + esteso il proxy gating per `/turni`, `/spese-edu`, `/edu-home`. |

---

## 4. Decisioni di scope (chiuse)

### 4.1 ~~Eventi~~ — fuori scope

Non si introduce la tabella né la route. Se in futuro servirà, si parte dall'anagrafica minimale (`nome / data / luogo / stato`).

---

### 4.2 Turni — come da prototipo (drag-drop su tabella nuova)

**Da fare**:

- Nuova tabella Airtable `AssegnazioniTurni` con campi: `data` (date), `fascia` (single select: 14-16 / 14-18 / 16-18), `educatore` (link a Educatori), `note` (text). Una assegnazione per coppia (fascia × educatore × giorno). Più educatori per stessa fascia/giorno → più record.
- Mapper + server actions `assegnaTurno` / `rimuoviTurno`.
- UI griglia `giorni × slot` con celle che mostrano gli avatar degli educatori assegnati. Cella vuota → badge `SCOPERTO` rosso.
- Sidebar destra "Educatori disponibili nel periodo": lista degli educatori che hanno una `Disponibilita` matching su quella fascia/data.
- Drag-drop dalla sidebar sulle celle. Implementazione: `@dnd-kit` (libreria standard React, ~10kb gz).
- Validation soft: se trascini un educatore su una fascia in cui **non** ha disponibilità, mostra warning ma consenti override.

**Punti aperti** (decideremo in fase di PR):
- Scope temporale: settimana o mese? Il prototipo mostra settimana.
- Stato cella oltre a "scoperto": "ok 2 educatori", "completo 3 educatori"? Soglia copertura va decisa.
- Assegnazione massiva (es. "copia turni della settimana scorsa")? Probabilmente fuori scope dell'MVP.

---

### 4.3 ~~Cassa-edu~~ — fuori scope

L'educatore registra movimenti via `/spese-edu` (form rapido). Niente flag `area` su Categorie, niente filtro su `/cassa`. La pagina `/cassa` resta unica e admin-only come ora.

---

### 4.4 Dashboard — split logico, non per route

Resta **una sola** route `/dashboard`. Il contenuto varia per ruolo:

- **admin** → blocco "Amministrazione" (stats finanziarie, alert, ultimi movimenti).
- **coordinatore_educativo** → blocco "Educativo" (presenze oggi, morosità, turni della settimana).
- ruoli cumulativi (se in futuro un utente avrà entrambi) → tabs interni alla pagina.

Niente `/adm-home` e `/edu-home` come URL separati: stessa pagina, contenuto condizionato.

---

### 4.5 Spese-edu — form singolo

- Form unico (no wizard 3 step). Pattern: dialog di conferma al submit, come `/iscrizioni`.
- Dopo submit → toast successo + form pulito (resta sulla pagina, no redirect a `/cassa-edu` che non esiste).
- Sidebar destra "I miei ultimi movimenti": ultimi 5 inseriti dall'educatore (filtra su volontario corrente).

---

### 4.6 Drawer multi-tab bambino — solo tabs, no drawer

Si tiene la full-page `/bambini/[id]`, ma si aggiunge il componente **Tabs** dentro la pagina (`Anagrafica / Iscrizioni / Presenze / Pagamenti / Note`). Nessun drawer dalla list page nell'MVP. Si valuta dopo se serve davvero il side-peek.

---

### 4.7 ~~Charts~~ — fuori scope ora

Niente chart adesso. Quando si introdurranno (priorità bassa), dovranno essere **interattivi**: hover con valore esatto, click su barra/punto che apre la lista filtrata. KPI numerici e liste ordinate sono sufficienti per il momento.

---

## 5. Componenti UI da introdurre

| Componente | Esiste? | Usato da | Note |
|---|---|---|---|
| Tabs | no | bambini detail, iscrizioni list, eventi list | Da aggiungere a `components/ui/`. Radix Tabs è la scelta di default. |
| Drawer / Sheet | no | utenti, educatori, eventualmente bambini | Radix Dialog in modalità side. |
| Filterbar | no | bambini, cassa, iscrizioni, presenze | Layout condiviso. |
| Avatar (iniziali) | no | ovunque ci sia un nome persona | Util pure. |
| Progress bar (mesi pagati) | no | iscrizioni, bambini | Componente da 20 righe. |
| StatePill / Badge tone-aware | esiste Badge variant | da estendere con `tone="green/gold/red/blue/neutral"` mappato sui tokens | Coerente col prototipo. |

---

## 6. Ordine proposto (PR per PR)

Ipotesi: ogni PR è atomica, mergeabile, deployabile in preview. Ordine pensato per minimizzare il blocco reciproco — i componenti base abilitano tutte le PR successive, le route admin-only precedono quelle che richiedono il gating per `coordinatore_educativo`.

| # | PR | Tipo | Dipendenze |
|---|---|---|---|
| 1 | **Componenti UI base** (`Tabs`, `Drawer/Sheet`, `Avatar`, `ProgressBar`, `Filterbar`) | 🟢 | nessuna |
| 2 | **`/bambini` arricchito**: tabs + filtri (scuola/classe/iscrizione) + colonne saldo/presenze del mese | 🟡 | #1 |
| 3 | **`/iscrizioni` arricchito**: tabs by stato + bar avanzamento + segna-pagato inline | 🟡 | #1 |
| 4 | **`/cassa` arricchito**: filterbar + 4 KPI per conto + footer totali periodo | 🟢 | #1 |
| 5 | **`/attivita`** card grid + sotto-tabella sessioni del mese | 🟡 | #1 |
| 6 | **Tabs nel detail bambino** (Anagrafica/Iscrizioni/Presenze/Pagamenti/Note) | 🟢 | #1 |
| 7 | **`/educatori` split-view** (lista sx + detail dx) + KPI ore/compenso | 🟡 | #1 |
| 8 | **Gating proxy esteso a `coordinatore_educativo`** + utente reale di test | ⚠️ | nessuna |
| 9 | **`/spese-edu`** form rapido educatore | 🟡 + ⚠️ | #1, #8 |
| 10 | **`/turni`** tabella `AssegnazioniTurni` + UI drag-drop | 🔴 + 🟡 + ⚠️ | #1, #8 |
| 11 | **`/dashboard` rifinito**: split admin/edu con tabs interni | 🟡 | #1, #8 |
| 12 | **Login 2-colonne** restyling | 🟢 | nessuna |
| 13 | **Presenze** stat card + filtro fascia oraria visivo | 🟡 | #1 |
| 14 | **`/utenti` drawer** "Modifica utente" | 🟢 | #1 |

**Critical path**: #1 → tutto il resto. #8 prima di #9, #10, #11.

**PR che richiedono modifiche su Airtable**:
- #10 → nuova tabella `AssegnazioniTurni`.

Tutte le altre PR sono codice puro (UI o logica server), nessuna migrazione dati richiesta.
