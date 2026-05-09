# Handoff: ACLI Gestionale — Design Prototype

> Pacchetto di handoff per Claude Code (o altro sviluppatore). Contiene il **prototipo di design in HTML/JSX** del gestionale del Circolo ACLI di Calvisano, più la documentazione necessaria per riprodurlo nella codebase di produzione.

---

## ⚠️ Cosa sono questi file

I file in `prototype/` sono **mockup di design ad alta fedeltà scritti in HTML + React via Babel in-browser**. Servono come **riferimento visivo e di interazione**, NON sono codice di produzione da copiare e incollare.

Il tuo compito (caro Claude Code / sviluppatore):

> **Ricreare le schermate, i componenti e i comportamenti documentati in questo bundle dentro la codebase reale dell'applicativo**, usando i pattern, i framework e le librerie già presenti in quel progetto. Se l'applicativo è ancora vuoto, scegli lo stack più adatto (consigliato: React + Vite + TypeScript + un router come react-router) e implementa il design lì.

I tre artefatti chiave da rispettare con precisione:

1. **Design tokens** (colori, typography, spacing, radii) — vedi `DESIGN_TOKENS.md` e la sezione tokens di `prototype/styles.css`.
2. **Architettura informativa** (sidebar a 2 aree, ruoli/permessi, rotte) — vedi sezione "Navigazione & Ruoli" qui sotto.
3. **Schermate** (layout, contenuti, stati) — vedi `PAGES.md`.

---

## Fedeltà

**High-fidelity**. Colori, tipografia, spacing, stati, e micro-interazioni sono definiti con precisione. La copy in italiano è quella definitiva. I dati mostrati sono mock plausibili (`prototype/data.js`) — vanno sostituiti con dati reali dal backend.

---

## Come aprire il prototipo localmente

Due opzioni:

### A) Versione "live" full-source (sviluppo)
1. `cd prototype/`
2. Servire la cartella con qualsiasi static server, es: `npx serve .` oppure `python3 -m http.server 8000`
3. Aprire `http://localhost:8000/index.html`

⚠️ Aprire `index.html` con `file://` direttamente NON funziona perché Babel-standalone deve poter fetchare i `.jsx`. Serve un http server.

### B) Versione standalone offline
- Aprire direttamente `prototype/standalone.html` con doppio click. È un singolo file self-contained che gira offline (utile per visualizzare il design senza setup).

### Tweaks panel
In basso a destra c'è un pannello "Tweaks ACLI" con:
- 3 palette colore (warm, ACLI navy+rosso, mono)
- Densità (comoda / densa)
- Tema chiaro/scuro
- Sidebar espansa / icone
- 5 set di font
- Toggle login

Usa il pannello per esplorare le varianti. Il **default consigliato per la produzione** è documentato sotto in "Default scelti".

---

## Default scelti (configurazione raccomandata)

```js
{
  palette: "warm",       // beige/verde oliva sobrio, neutro istituzionale
  density: "comfortable", // 52px row height
  theme: "light",
  sidebar: "expanded",
  accentByArea: true,    // colori sidebar diversi per area (vedi sotto)
  fontset: "dashboard"   // DM Sans
}
```

---

## Stack del prototipo (NON lo stack di produzione)

Il prototipo usa una stack volutamente "no-build" per essere ispezionabile/modificabile rapidamente:

- **React 18.3.1** caricato via UMD da unpkg
- **Babel Standalone 7.29** in-browser per trasformare i `.jsx`
- **CSS vaniglia** con custom properties (no Tailwind, no CSS-in-JS)
- **Lucide-style icone inline** definite in `ui.jsx` come componenti SVG
- **Mock data globale** su `window.ACLI_DATA` in `data.js`
- **State** gestito con `useState` locale ai componenti pagina; nessuna libreria di state management
- **Routing** rudimentale: una `route` string in `App` che mappa a `PAGES[route]`

In produzione si raccomanda invece:
- Build tool: **Vite**
- Linguaggio: **TypeScript**
- Routing: **react-router-dom v6** (o il file-based router del framework scelto)
- Icone: **lucide-react** (le icone del prototipo sono già stilisticamente compatibili — stroke 1.6, lineCap round)
- Form: **react-hook-form + zod**
- Tabelle: **TanStack Table** se servono ordinamento/filtri seri
- Data fetching: **TanStack Query** o quello che usa il backend
- CSS: mantenere CSS modules o vanilla extract con i tokens copiati 1:1 da `styles.css`. **Sconsigliato Tailwind** perché il design system usa custom properties con `oklch()` e mode-switching che si esprime meglio in CSS nativo.

---

## Struttura del bundle

```
design-prototype/
├── README.md                 ← questo file
├── DESIGN_TOKENS.md          ← tutti i tokens (colori, font, spacing, radii) come tabella
├── PAGES.md                  ← descrizione schermata per schermata
├── assets/
│   ├── logo-acli.png
│   └── logo-acli.jpg
└── prototype/
    ├── index.html            ← entry point del prototipo (open con http server)
    ├── standalone.html       ← stesso prototipo bundlato in 1 file (open con double-click)
    ├── styles.css            ← TUTTI i design tokens + componenti
    ├── data.js               ← mock data
    ├── ui.jsx                ← componenti atomici: Btn, Badge, Avatar, Card, Dialog, Drawer, Toast, Ico
    ├── shell.jsx             ← Sidebar, Topbar, NAV config, ROLE_ACCESS
    ├── tweaks-panel.jsx      ← pannello dev (rimuovere in produzione)
    ├── app.jsx               ← <App>, <LoginScreen>, mapping rotte→pagine
    ├── page-admin.jsx        ← Cruscotto Amministrazione, Eventi e iniziative, Utenti gestionale
    ├── page-cassa.jsx        ← Cassa e finanze (movimenti, conti, registra movimento)
    ├── page-edu.jsx          ← Cruscotto educativo, Turni, Cassa educativa, Spese-edu
    ├── page-bambini.jsx      ← Anagrafica bambini + dettaglio drawer
    ├── page-attivita.jsx     ← Attività + Iscrizioni
    ├── page-educatori.jsx    ← Educatori
    ├── page-dashboard.jsx    ← (legacy) Presenze
    └── page-presenze.jsx     ← (importato in page-dashboard.jsx)
```

---

## Architettura informativa: 2 aree, 3 ruoli

L'app è divisa in **due aree** distinte, ciascuna con la propria identità cromatica nella sidebar:

| Area | Color accent | Per chi | Scope |
|---|---|---|---|
| **Amministrazione** (`amm`) | navy `oklch(0.4 0.08 250)` | Presidente, direttivo | Cassa generale, eventi del circolo, gestione utenti |
| **Attività educative** (`edu`) | terracotta `oklch(0.55 0.16 45)` | Coordinatori, educatori | Bambini, iscrizioni, presenze, turni, cassa educativa |

### Ruoli e permessi (`ROLE_ACCESS` in `shell.jsx`)

| Ruolo | Vede area `amm` | Vede area `edu` |
|---|---|---|
| `admin` | tutto | tutto |
| `coordinatore_educativo` | — | tutto |
| `volontario_cassa` | solo "Cassa e finanze" | — |

### Rotte (in ordine di apparizione nella sidebar)

**Amministrazione**
- `adm-home` — Cruscotto
- `eventi` — Eventi e iniziative
- `cassa` — Cassa e finanze (badge counter)
- `utenti` — Utenti gestionale

**Attività educative**
- `edu-home` — Cruscotto educativo
- `bambini` — Bambini (badge counter)
- `educatori` — Educatori (badge counter)
- `attivita` — Attività
- `iscrizioni` — Iscrizioni (badge counter)
- `presenze` — Presenze
- `turni` — Turni · calendario
- `spese-edu` — Registra movimento (form veloce per educatori)
- `cassa-edu` — Cassa educativa (sotto-cassa dedicata all'area educativa)

### Logica di routing

In `app.jsx`:
1. Login → `setUser(account)` → `setRoute(account.landing)`
2. Ad ogni cambio rotta, controllare che `route ∈ ROLE_ACCESS[user.ruolo]`. Se no, fallback a `user.landing`.
3. L'attributo `data-area` su `<html>` cambia a `"amm"` o `"edu"` in base alla rotta corrente, e questo guida il colore di accent della sidebar e altri elementi.

---

## Componenti chiave (in `ui.jsx`)

Tutti già con varianti di colore mappate sui design tokens. Da ricreare 1:1 in produzione:

| Componente | Varianti | Note |
|---|---|---|
| `<Btn>` | `primary` / `outline` / `ghost` / `danger` · size `sm`/`md`/`lg` · `icon-only` | bordo `8px`, height 36px default |
| `<Badge>` | `green` / `gold` / `red` / `blue` / `warn` · `dot` | pill 22px, font 11.5px |
| `<Avatar>` | `sm` / `md` / `lg` | iniziali, colore primary |
| `<Card>` | `tight` / `flush` (no padding) | bordo `10px`, border 1px |
| `<CardHead>` | `title` + `sub` + `right` slot | font serif Newsreader |
| `<Dialog>` | con `head/body/foot` | center, scrim |
| `<Drawer>` | side panel right, 640px max | per dettaglio bambino, ecc. |
| `<Toast>` | bottom-right, dismissible | hook `useToast()` |
| `<Ico name="...">` | nomi: `home, calendar, bank, user, baby, hands, range, cap, check, plus, wallet, shield, ...` | SVG inline 18px stroke 1.6 |
| `<BrandMark>` | logo ACLI | usa `assets/logo-acli.png` |
| `fmtEur(n)` | formatta numero in `€ 1.234,50` | locale `it-IT` |

### Bottoni — micro-spec
- `height: 36px` (default), `30px` (sm), `42px` (lg)
- `border-radius: 8px`
- `font-weight: 500`, `font-size: 13px`
- `gap: 8px` tra icona e label
- `transition: 0.12s background, border` + `transform: translateY(1px)` su `:active`
- `primary`: `background: var(--primary)` · `color: var(--primary-ink)` · hover = `filter: brightness(1.06)`
- `outline`: `border: 1px solid var(--border-strong)` · `background: var(--bg-elev)` · hover = `var(--surface-2)`

### Tabelle — micro-spec
- `<th>` font 11.5px, uppercase, letterspacing 0.06em, color muted, bg `bg-elev`
- `<td>` height `var(--row-h)` (52px comfortable / 38px compact), padding 0 16px
- Riga hover: `background: var(--surface-2)`
- Riga selezionata: `background: var(--primary-soft)`
- `.num` per numeri (right-aligned, tabular-nums)

---

## Layout shell

```
┌────────────┬───────────────────────────────────────────────┐
│ sidebar    │ topbar (60px, sticky)                         │
│ 280px      │  └─ breadcrumb · search · theme · user pill   │
│ (fixed     ├───────────────────────────────────────────────┤
│  + scroll) │ content                                       │
│            │   max-width: 1480px                           │
│            │   padding: 32px 40px 64px                     │
│            │                                               │
│            │   page-head (titoli serif 32px + actions)     │
│            │   stats grid (4 cols KPI)                     │
│            │   filterbar                                   │
│            │   cards / tables / drawers                    │
└────────────┴───────────────────────────────────────────────┘
```

Sidebar collapsata = `76px` (solo icone). Toggle in topbar.

---

## Comportamenti / interazioni notevoli

- **Login → landing per ruolo**: ogni account in `data.js` ha un campo `landing` che determina la prima pagina dopo login.
- **Drawer dettaglio bambino**: click su riga in `Bambini` apre un drawer destra con tabs (Anagrafica, Iscrizioni, Presenze, Pagamenti, Note). Esc o click su scrim chiude.
- **Registra movimento**: form rapido per cassa/spese; valida importo, conto (BCC / Cassa / Sumup), categoria, e mostra Toast a successo.
- **Stato pagamento iscrizione**: `in_corso` (verde), `in_ritardo` (gold/giallo), `completata` (neutro), con barra di progresso `mesi.pagati / mesi.tot`.
- **Movimenti correttivi**: le righe con `stato: "errato"` vanno mostrate con barrato e badge red; la riga `stato: "corretto"` la sostituisce con badge "correzione".
- **Counter sidebar**: `Bambini`, `Educatori`, `Iscrizioni`, `Cassa` mostrano badge col numero items. Aggiornare reattivamente in produzione.
- **Tema scuro**: completo, switch dal topbar. Tutti i tokens hanno una versione `[data-theme="dark"]`.
- **Densità compact/comfortable**: cambia `--row-h`, `--pad-card`, `--gap-page`. Esposto ai tweaks ma può essere preferenza utente persistente.

---

## Cose NON ancora progettate (chiedere prima di implementare)

- Onboarding bambino completo (ora c'è solo dettaglio + lista)
- Recupero password / 2FA
- Notifiche / centro notifiche
- Stampe / export PDF (es. ricevute, registro presenze)
- Mobile / responsive sotto 880px (login già gestito, il resto va progettato)
- Permessi granulari sotto-pagina (per ora bin: hai accesso o no all'intera rotta)

---

## File di riferimento per ogni cosa

| Vuoi capire... | Apri... |
|---|---|
| Tutti i design tokens | `prototype/styles.css` (top, righe 1-200) + `DESIGN_TOKENS.md` |
| La struttura di una pagina | `prototype/page-*.jsx` corrispondente + `PAGES.md` |
| Come è costruita la sidebar | `prototype/shell.jsx` |
| Quali componenti atomici usare | `prototype/ui.jsx` |
| Quali permessi ha un ruolo | `ROLE_ACCESS` in `prototype/shell.jsx` |
| Mock data shape (per allineare il backend) | `prototype/data.js` |

---

## Asset

- **Logo ACLI**: `assets/logo-acli.png` e `.jpg`. Usato a 40×40px nella sidebar e 56×56px nel login. Ha già il suo padding bianco interno.
- **Iconografia**: tutte le icone sono SVG inline in `ui.jsx::Ico`. In produzione: usare `lucide-react` mantenendo `stroke-width: 1.6`. Nomi corrispondono o sono molto vicini a Lucide (`home`, `calendar`, `users`, `baby`, ecc.).
- **Font**: Google Fonts — Public Sans, Newsreader, IBM Plex Sans, Source Serif 4, Manrope, Fraunces, Inter, Instrument Serif, DM Sans, JetBrains Mono. In produzione caricare SOLO la coppia del `fontset` scelto (default: DM Sans) per ridurre il payload.

---

## Domande per chi implementa

Prima di iniziare, chiarire con il committente (Nicolò):
1. Backend / API — esiste già? Quale stack?
2. DB schema definitivo per `bambini / iscrizioni / movimenti` — i mock in `data.js` sono uno spunto, non la verità.
3. Auth: sessione, JWT, OAuth con un provider esistente?
4. Hosting target — i font Google sono OK o serve self-hosting per GDPR?
5. Multi-circolo? L'app è pensata per il solo circolo di Calvisano o multi-tenant?

---

_Generato come pacchetto di handoff dal prototipo HTML co-progettato. Per qualsiasi domanda sul design, riferirsi alle schermate live nel prototipo — sono la verità di riferimento._
