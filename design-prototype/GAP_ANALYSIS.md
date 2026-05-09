# Gap analysis prototipo ↔ codice

> Scopo: confronto sistematico tra le funzionalità del prototipo Claude Design (`design-prototype/prototype/`) e quelle realmente presenti nel codice. Per ogni voce: stato, costo stimato e — quando la soluzione del prototipo è cara — un'alternativa più semplice da valutare insieme.
>
> Compilato: 2026-05-09. Branch: `claude/align-design-code-Lmqps`.

## Legenda

- 🟢 **UI-only**: aggiunta/restyling senza toccare modello dati o auth.
- 🟡 **Feature**: richiede server action nuova o logica derivata, ma niente schema Airtable.
- 🔴 **Schema**: richiede tabella o campi nuovi su Airtable + mapper + migrazione dati.
- ⚠️ **Auth**: tocca `lib/auth/auth.config.ts` o `nav-config.ts` (gating per ruolo).

---

## 1. Route assenti dal codice

| # | Route prototipo | Stato codice | Costo | Note |
|---|---|---|---|---|
| 1 | `/eventi` | assente | 🔴 + 🟡 | Tabella Eventi nuova (vedi §4.1). |
| 2 | `/adm-home` | esiste `/dashboard` ma generico | 🟡 | Cruscotto presidenza con stats finanziarie + eventi prossimi. |
| 3 | `/edu-home` | assente | 🟡 | Cruscotto coordinatore: presenze oggi, morosità, turni settimana. |
| 4 | `/turni` | assente | 🔴 + 🟡 + ⚠️ | Vedi §4.2: turni come entità o derivati da `Disponibilita`. |
| 5 | `/spese-edu` | assente | 🟡 + ⚠️ | Form rapido educatori — riusa tabella Movimenti, gating per ruolo. |
| 6 | `/cassa-edu` | assente | 🟡 (con alternativa 🟢) | Vedi §4.3: route nuova vs filtro su `/cassa`. |
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
| 4 stat card: Totali / Presenti / Assenti / **Giustificati** | nessuno | mancante | 🟡 + nuovo enum |
| Stato "giustificato" sulle righe | non esiste | mancante | 🔴 (nuovo campo o convenzione su `note`) |
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
| `Movimenti.conto` ∈ {Cassa, BCC, Sumup} | ✓ presente | Identico |
| `Movimenti.area` ∈ {amm, edu} | ✗ assente | Vedi §4.3: alternativa via categoria. |
| `Eventi` (nome, data, luogo, responsabile, stato, budget, incassato) | ✗ assente | Tabella nuova. |
| `Turni` (giorno × slot × educatori, stato copertura) | ✗ — esiste `Disponibilita` (data, fascia, educatore) | Vedi §4.2. |
| `Presenze.stato` ∈ {presente, assente, giustificato} | ✗ — derivato da ore_ingresso/uscita | "Giustificato" non esprimibile. |
| `Iscrizioni.stato` ∈ {attiva, in_ritardo, completata} | ✗ — derivabile da rate | Calcolabile lato server. |
| `coordinatore_educativo` come ruolo reale | tipo + nav, ma nessun utente | Va creato + esteso il proxy gating. |

---

## 4. Punti complessi — alternative più semplici

### 4.1 Eventi: tabella completa **vs** anagrafica leggera

**Prototipo**: card con `nome / data / luogo / responsabile / stato / budget / incassato`. Stato a 3 valori (`in_preparazione / in_corso / concluso`).

**Costo pieno**: nuova tabella su Airtable, mapper, server actions CRUD, possibilmente collegamento Movimenti → Evento per calcolare incassato/budget reale.

**Alternativa più semplice (consigliata per la prima iterazione)**:

- Tabella Eventi minimale: `nome / data / luogo / note / stato`. Stato a 2 valori (`programmato / concluso`).
- **Niente budget/incassato**. Si valuta dopo se serve davvero il legame contabile.
- Solo lista (no detail page). Modifica inline o piccolo dialog.

**Cosa si perde**: il legame "questo evento ha incassato X". Si recupera in seconda battuta aggiungendo un campo opzionale `evento` sui Movimenti.

---

### 4.2 Turni: tabella dedicata **vs** vista derivata da Disponibilità

**Prototipo**: griglia `giorni × slot` con educatori assegnati per cella, stato "scoperto", drag-drop dalla colonna educatori disponibili.

**Costo pieno**: nuova tabella Turni (assegnazione effettiva), UI drag-drop (cara da fare bene), conflict detection con disponibilità.

**Alternativa più semplice (consigliata)**:

- **Niente nuova tabella**. La pagina `/turni` è una **vista read-only** sulla tabella `Disponibilita` esistente: aggrega per `(data, fascia)` e mostra chi si è dichiarato disponibile.
- "Scoperto" = nessun educatore disponibile per quella cella.
- La modifica avviene editando le `Disponibilita` (UI già esistente sotto educatori).
- **Niente drag-drop**: se serve davvero un'assegnazione vincolante (≠ disponibilità), si aggiunge dopo un campo `confermato` sulla tabella.

**Cosa si perde**: la distinzione "disponibile" vs "in turno". Per circoli piccoli (volume attuale) la distinzione è accademica.

---

### 4.3 Cassa-edu: route separata **vs** filtro su `/cassa`

**Prototipo**: `/cassa-edu` è una pagina identica a `/cassa` ma filtrata su categorie educative (`Quote iscrizione`, `Quote laboratorio`, `Compensi educatori`, `Materiale didattico`, `Cancelleria`, `Merenda`).

**Costo pieno (con campo `area`)**: aggiungere `area` su Movimenti, retro-compilare i record esistenti, mapper, due route gemelle.

**Alternativa più semplice**:

- **Niente campo `area`**. Si introduce su tabella `Categorie` un flag `area` (`amm | edu | entrambi`).
- `/cassa` di default mostra tutto; `/cassa?area=edu` filtra; il coordinatore educativo viene mandato direttamente lì dalla nav.
- Per il presidente la distinzione è un toggle nel filterbar — niente route gemella.

**Cosa si perde**: nulla di sostanziale. La separazione visiva resta perché la nav punta a URL diversi.

---

### 4.4 Tre dashboard separate **vs** un `/home` parametrico

**Prototipo**: `adm-home`, `edu-home`, e una `home` legacy.

**Alternativa più semplice (consigliata)**:

- Un'unica `/dashboard` (già esistente) che varia il contenuto in base a `session.ruolo`. Rinominata o no, è la stessa route.
- L'admin vede stats finanziarie + eventi; il coordinatore vede presenze oggi + morosità + turni; entrambi i ruoli (se l'utente è cumulativo) → tabbed (`Amministrazione | Educativo`).

**Cosa si perde**: due URL separati per il bookmark. Trascurabile.

---

### 4.5 Spese-edu: wizard 3 step **vs** form singolo

**Prototipo**: form 3 step (`compila → conferma → ok`).

**Alternativa più semplice (consigliata)**:

- Form singolo con dialog di conferma al submit (pattern già in uso in `/iscrizioni` per "Segna pagato").
- Toast di successo + redirect a `/cassa-edu` (o `/cassa?area=edu`).

**Cosa si perde**: nulla a livello di funzione, solo "polish" del flusso.

---

### 4.6 Drawer multi-tab bambino **vs** full-page detail già esistente

**Prototipo**: drawer 640px con 5 tabs (`Anagrafica / Iscrizioni / Presenze / Pagamenti / Note`).

**Stato**: esiste già `/bambini/[id]` come pagina piena con sezioni ma senza tabs.

**Alternativa più semplice (consigliata per ora)**:

- Tenere la full-page detail. Aggiungere solo i **tabs** dentro la pagina (componente Tabs nuovo, una volta sola) per ottenere lo stesso effetto informativo del drawer.
- Drawer dalla list page → in seconda battuta, dopo che il componente Tabs è in libreria.

**Cosa si perde**: l'effetto "side-peek" senza cambiare URL. Riproponibile dopo.

---

### 4.7 Trend chart 14 giorni e categorie chart

**Prototipo**: barre / area chart su movimenti e distribuzione categorie.

**Alternativa più semplice (consigliata per la prima iterazione)**:

- KPI numerici puri (saldo + delta vs periodo precedente come testo).
- "Categorie" = lista ordinata per importo, no chart.
- Una libreria di charting si aggiunge solo se l'utente la chiede esplicitamente.

**Cosa si perde**: l'effetto "wow" del trend visivo. Il dato c'è comunque.

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

Ipotesi: ogni PR è atomica, mergeabile, deployabile in preview. Ordine pensato per minimizzare il blocco reciproco.

1. **Componenti UI base**: `Tabs`, `Drawer/Sheet`, `Avatar`, `ProgressBar`, `Filterbar`. Una PR sola, niente uso ancora. _(🟢)_
2. **`/bambini` arricchito**: tabs + filtri + colonne saldo/presenze (calcolate server). _(🟡)_
3. **`/iscrizioni` arricchito**: tabs by stato + bar avanzamento + segna-pagato inline. _(🟡)_
4. **`/cassa` arricchito**: filterbar + 4 KPI per conto + footer totali periodo. _(🟢)_
5. **Categorie con flag `area`** + `/cassa?area=edu`. Coordinatore in nav punta lì. _(🔴 mini, su tabella Categorie)_
6. **Eventi MVP** (tabella minimale, niente budget): lista + form. _(🔴 + 🟡)_
7. **`/turni` come vista derivata** da Disponibilità. _(🟡)_
8. **`/edu-home`**: cruscotto coordinatore (riusa dati esistenti, niente schema). _(🟡 + ⚠️)_
9. **`/spese-edu`** form singolo + dialog conferma. _(🟡 + ⚠️)_
10. **Adm-home** rifinitura del `/dashboard` con focus presidenza. _(🟡)_
11. **Login 2-colonne** restyling. _(🟢)_
12. **Drawer bambino** dalla list (se serve ancora dopo §2). _(🟢)_

---

## Domande aperte per te

1. **Eventi** servono davvero ora, o sono "nice to have"? (Se servono, alternativa minimale §4.1 va bene?)
2. **Turni**: ti basta la vista read-only su `Disponibilita` o vuoi davvero un'assegnazione confermata distinta?
3. **Cassa-edu**: ok l'idea del flag `area` su `Categorie` invece del campo su `Movimenti`?
4. **`giustificato`** sulle presenze è un valore che vuoi tracciare o si può ignorare?
5. **Charts** (trend, categorie): sono importanti per te o partiamo senza?
