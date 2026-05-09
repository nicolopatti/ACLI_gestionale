# Schermate — ACLI Gestionale

Per ciascuna schermata: scopo, layout, sezioni, comportamenti notevoli. Per i dettagli pixel-perfect aprire la pagina nel prototipo e ispezionare il file `prototype/page-*.jsx` corrispondente.

---

## 0. Login (`app.jsx::LoginScreen`)

**Scopo**: selezione profilo demo + form email/password.

**Layout**: 2 colonne 50/50 (sotto 880px diventa 1 colonna, art panel nascosto).
- **Sinistra (`.login-art`)**: gradiente radiale soft con palette accent + primary, BrandMark + nome circolo in alto, quote serif al centro, footer "MVP 2026" in basso.
- **Destra (`.login-form-wrap`)**: form 360px max — H2 "Bentornato", lista account-card cliccabili (3 demo: admin, coordinatore, volontario cassa), email read-only, password placeholder, btn primary full-width.

**Comportamento**: select account → submit chiama `onEnter(account)` → app entra con `landing` di quell'account.

---

## 1. Cruscotto Amministrazione — `adm-home` (`page-admin.jsx`)

**Scopo**: overview presidente. Cassa, eventi imminenti, alert.

**Sezioni**:
1. **Page head** — H1 "Cruscotto", sub "Direttivo · Presidenza · Maggio 2026"
2. **Stats grid** (4 KPI):
   - Saldo cassa totale
   - Entrate del mese
   - Uscite del mese
   - Movimenti da approvare (eventuali con stato "errato")
3. **Card "Eventi prossimi"** — lista compatta con data + nome + cta "Dettaglio"
4. **Card "Movimenti recenti"** — tabella ridotta (5 righe, link "Vedi tutti" → `cassa`)
5. **Card "Alert"** — iscrizioni in ritardo, educatori inattivi, ecc.

---

## 2. Eventi e iniziative — `eventi` (`page-admin.jsx::PageEventi`)

**Scopo**: calendario + lista eventi del circolo (assemblee, feste, sagre, ecc.)

**Sezioni**:
1. Page head + Btn primary "+ Nuovo evento"
2. Tabs "Prossimi" / "Passati" / "Bozze"
3. Vista lista con card per evento: titolo serif, data, luogo, stato (in programma/concluso), partecipanti, cta "Apri"

---

## 3. Cassa e finanze — `cassa` (`page-cassa.jsx`)

**Scopo**: registro completo movimenti del circolo, multi-conto.

**Sezioni**:
1. Page head + Btn primary "+ Registra movimento" (apre Dialog)
2. Stats grid: Saldo BCC, Saldo Cassa fisica, Saldo Sumup, Totale
3. **Filterbar**: search, filtri tipo (Entrata/Uscita), conto, categoria, data range, volontario
4. **Tabella movimenti** (`m1..m14` in `data.js`):
   - colonne: Data, Tipo (badge tone green/red), Descrizione, Categoria, Conto, Volontario, Importo (num), Stato (badge), Azioni
   - righe `stato: "errato"` con strike-through e badge red "errato"
   - riga `stato: "corretto"` con badge gold "correzione"
5. **Dialog "Registra movimento"**: form con tipo (segmented Entrata/Uscita), importo, data, conto (radio), categoria (select), descrizione, volontario, allegato (placeholder).

---

## 4. Utenti gestionale — `utenti` (`page-admin.jsx::PageUtenti`)

**Scopo**: gestione account che possono accedere al gestionale (admin, coordinatori, volontari).

**Sezioni**:
1. Page head + Btn "+ Invita utente"
2. Tabella utenti: Nome, Email, Ruolo (badge), Stato (attivo/disattivo), Ultimo accesso, Azioni
3. Drawer "Modifica utente" su click riga: cambio ruolo, reset password, disattiva account.

---

## 5. Cruscotto educativo — `edu-home` (`page-edu.jsx`)

**Scopo**: overview coordinatore educativo.

**Sezioni**:
1. Page head — H1 "Cruscotto educativo", sub "Doposcuola · Maggio 2026"
2. Stats grid:
   - Bambini iscritti attivi
   - Presenze oggi
   - Iscrizioni in ritardo (count)
   - Saldo cassa educativa
3. **Card "Oggi al doposcuola"** — lista bambini presenti con orario entrata + educatore di riferimento
4. **Card "Iscrizioni in ritardo"** — bambini con `stato: "in_ritardo"`, importo + mesi non pagati
5. **Card "Turni della settimana"** — mini-calendario settimana + chi è in turno

---

## 6. Bambini — `bambini` (`page-bambini.jsx`)

**Scopo**: anagrafica bambini iscritti al circolo educativo.

**Sezioni**:
1. Page head + Btn "+ Nuovo bambino"
2. Filterbar: search nome, scuola (Don Milani / G. Bertinotti / A. Manzoni), classe, attività, attivo/inattivo
3. Tabella bambini: Avatar+Nome+Cognome, Classe, Scuola, Iscrizione corrente, Genitore (con telefono in tooltip), Saldo (badge red se >0), Presenze del mese, Azioni
4. **Drawer dettaglio** (su click riga, larghezza 640px):
   - Header: avatar + nome + cognome, badge stato
   - Tabs: **Anagrafica** / **Iscrizioni** / **Presenze** / **Pagamenti** / **Note**
   - Anagrafica: data nascita, classe, scuola, genitore + telefono, allergie/note
   - Iscrizioni: lista attività + modalità + importo + barra mesi pagati/totali
   - Presenze: tabella ultimi 30 gg
   - Pagamenti: timeline rate (`mese`, `importo`, `stato`, `data`, `mezzo`)
   - Note: textarea libera

---

## 7. Educatori — `educatori` (`page-educatori.jsx`)

**Scopo**: anagrafica + ore svolte da educatori.

**Sezioni**:
1. Page head + Btn "+ Nuovo educatore"
2. Tabella: Nome, Email, Telefono, Stato (attivo), Giorni/sett, Ore/mese, Azioni
3. Drawer dettaglio educatore: contatti, turni assegnati, compensi del mese.

---

## 8. Attività — `attivita` (`page-attivita.jsx::PageAttivita`)

**Scopo**: catalogo attività del circolo (Doposcuola, Laboratorio teatro, ecc.)

**Sezioni**:
1. Page head + Btn "+ Nuova attività"
2. Grid di **card attività** (3 col): icona Lucide grande, nome, tipo (badge), iscritti, frequenza, modalità di iscrizione, attivo/inattivo, cta "Apri".

---

## 9. Iscrizioni — `iscrizioni` (`page-attivita.jsx::PageIscrizioni`)

**Scopo**: tutte le iscrizioni in essere, con stato pagamento.

**Sezioni**:
1. Page head + Btn "+ Nuova iscrizione"
2. Tabs: "In corso" / "In ritardo" / "Completate" / "Tutte" — count nel tab
3. Tabella: Bambino, Attività, Modalità, Importo mensile, Mesi pagati/tot (con bar), Stato (badge tone green/gold/neutro), Azioni

---

## 10. Presenze — `presenze` (`page-dashboard.jsx::PagePresenze`)

**Scopo**: registro presenze giornaliero.

**Sezioni**:
1. Page head con date picker (default oggi) + filtro fascia oraria
2. Lista bambini iscritti per la fascia con checkbox presenza, orario entrata/uscita editabile, note rapide.

---

## 11. Turni · calendario — `turni` (`page-edu.jsx::PageTurni`)

**Scopo**: chi è in turno questa settimana / mese.

**Sezioni**:
1. Page head + toggle vista (Settimana / Mese)
2. Calendario `.cal` (grid 7 col) con educatori assegnati per giorno
3. Card laterale "Educatori disponibili" con drag-drop su giorno (in produzione).

---

## 12. Registra movimento (rapido educatore) — `spese-edu` (`page-edu.jsx::PageSpeseEdu`)

**Scopo**: form rapido per educatore che registra spesa di tasca/cassa educativa.

**Sezioni**:
- Form a singola card centrale: Tipo (Entrata/Uscita), Importo, Conto (Cassa educativa / Sumup educativa), Categoria, Descrizione, Foto scontrino (placeholder upload), Salva.
- Dopo salvataggio: Toast "Movimento registrato" + redirect a `cassa-edu`.

---

## 13. Cassa educativa — `cassa-edu` (`page-edu.jsx::PageCassaEdu`)

**Scopo**: sotto-cassa dedicata all'area educativa, separata dalla cassa generale.

**Sezioni**:
- Stesso layout di `cassa` ma filtrato sui movimenti dell'area educativa, con stats limitate ai conti educativi.

---

## Pattern condivisi

- **Card vuota / empty state**: usare `.empty` con titolo serif 18px e copy descrittiva, eventualmente cta primary.
- **Loading**: ogni tabella deve avere skeleton rows (non implementati nel prototipo — usare lo stesso `--row-h` con `background: var(--surface-2)` shimmer).
- **Errori di rete**: Toast con `tone="red"` + retry inline nella card.
- **Conferme distruttive**: Dialog con titolo "Sei sicuro?" + cta primary `danger`.

---

## Mappa file → schermate

| File | Esports |
|---|---|
| `page-admin.jsx` | `PageAdmHome`, `PageEventi`, `PageUtenti` |
| `page-cassa.jsx` | `PageCassa` |
| `page-edu.jsx` | `PageEduHome`, `PageTurni`, `PageCassaEdu`, `PageSpeseEdu` |
| `page-bambini.jsx` | `PageBambini` |
| `page-attivita.jsx` | `PageAttivita`, `PageIscrizioni` |
| `page-educatori.jsx` | `PageEducatori` |
| `page-dashboard.jsx` | `PagePresenze`, `PageDashboard` (legacy) |
