# Design Tokens — ACLI Gestionale

Tutti i tokens sono definiti come CSS custom properties in `prototype/styles.css`. Questa è una versione tabellare per riferimento rapido.

I valori usano `oklch()` per garantire armonia percettiva tra varianti tema/palette. Convertire in HEX solo se il framework target non supporta `oklch` (Safari ≥15.4 e tutti i browser moderni lo supportano nativamente).

## Palette default ("warm" — beige + verde oliva)

### Background & superficie
| Token | Valore | Uso |
|---|---|---|
| `--bg` | `oklch(0.985 0.008 85)` | sfondo pagina |
| `--bg-elev` | `oklch(0.995 0.005 85)` | sidebar, topbar, card |
| `--surface` | `#ffffff` | input, drawer body |
| `--surface-2` | `oklch(0.97 0.01 85)` | hover state, table head |
| `--border` | `oklch(0.91 0.012 85)` | border default |
| `--border-strong` | `oklch(0.84 0.014 85)` | border focus, button outline |

### Inchiostro
| Token | Valore | Uso |
|---|---|---|
| `--ink` | `oklch(0.22 0.018 75)` | testo primario |
| `--ink-2` | `oklch(0.38 0.015 75)` | testo secondario |
| `--muted` | `oklch(0.55 0.012 75)` | label, hint |
| `--muted-2` | `oklch(0.7 0.01 75)` | placeholder, separatori soft |

### Primary (verde oliva)
| Token | Valore |
|---|---|
| `--primary` | `oklch(0.4 0.07 150)` |
| `--primary-ink` | `oklch(0.99 0.005 85)` |
| `--primary-soft` | `oklch(0.94 0.03 150)` |
| `--primary-soft-ink` | `oklch(0.32 0.06 150)` |

### Accent (gold/ocra) — usato per warning, evidenze
| Token | Valore |
|---|---|
| `--accent` | `oklch(0.72 0.13 75)` |
| `--accent-soft` | `oklch(0.94 0.04 75)` |
| `--accent-soft-ink` | `oklch(0.42 0.1 70)` |

### Stati
| Stato | Solid | Soft bg | Soft ink |
|---|---|---|---|
| danger | `oklch(0.55 0.18 25)` | `oklch(0.94 0.04 25)` | `oklch(0.42 0.14 25)` |
| success | `oklch(0.55 0.12 150)` | `oklch(0.93 0.04 150)` | `oklch(0.36 0.09 150)` |
| warning | `oklch(0.7 0.14 75)` | `oklch(0.93 0.05 80)` | `oklch(0.42 0.1 70)` |
| info | `oklch(0.55 0.13 240)` | `oklch(0.93 0.04 240)` | `oklch(0.38 0.1 240)` |

## Palette alternative

### "acli" (navy + rosso istituzionale)
- `--primary: oklch(0.32 0.16 260)` — navy
- `--accent: oklch(0.55 0.22 25)` — rosso ACLI

### "mono" (scala di grigi)
- `--primary: oklch(0.18 0 0)` — quasi nero
- `--accent: oklch(0.55 0 0)` — grigio medio

## Area accents (sidebar)

Quando `data-area="amm"` (Amministrazione):
- `--area-color: oklch(0.4 0.08 250)` — navy istituzionale
- `--area-soft: oklch(0.94 0.03 250)`

Quando `data-area="edu"` (Educativa):
- `--area-color: oklch(0.55 0.16 45)` — terracotta caldo
- `--area-soft: oklch(0.94 0.05 50)`

Questi guidano il colore di `nav-section[data-area]`, della pill `area-pill`, e del bordo inferiore della topbar.

---

## Typography

### Font families
| Token | Default font (fontset "dashboard") |
|---|---|
| `--font-sans` | `"DM Sans", system-ui, sans-serif` |
| `--font-serif` | `"Newsreader", Georgia, serif` (per H1, card titles, KPI values) |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` (per kbd, codici) |

Set di font alternativi (`data-fontset` attr su `<html>`):
- **editoriale** — Public Sans + Newsreader
- **istituzionale** — IBM Plex Sans + Source Serif 4
- **caldo** — Manrope + Fraunces
- **display** — Inter + Instrument Serif
- **dashboard** (default) — DM Sans + Newsreader

### Scale tipografica (estratta dai componenti)
| Uso | Family | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| H1 page-head | serif | 32px | 400 | 1.05 | -0.02em |
| Card head | serif | 17px | 500 | 1.2 | -0.01em |
| Stat value (KPI) | serif | 30px | 400 | 1 | -0.02em |
| Nav section label | serif | 13px | 500 | 1.1 | -0.01em |
| Body | sans | 14px | 400 | 1.5 | normal |
| Table cell | sans | 13.5px | 400 (500 per .name) | 1.5 | normal |
| Table header | sans | 11.5px | 500 | normal | 0.06em UPPERCASE |
| Badge | sans | 11.5px | 500 | normal | 0.01em |
| Btn | sans | 13px | 500 | normal | normal |
| Sub / hint | sans | 12px | 400 | 1.5 | normal |
| Kbd / mono | mono | 10.5px | 400 | normal | normal |

---

## Spacing & sizing

| Token | Comfortable | Compact |
|---|---|---|
| `--row-h` (table row) | 52px | 38px |
| `--gap-page` (content padding y) | 32px | 20px |
| `--pad-card` (card padding) | 24px | 16px |

## Radii

| Token | Valore | Uso |
|---|---|---|
| `--radius-sm` | 6px | input minor, kbd |
| `--radius` | 10px | card, button outline grande, drawer |
| `--radius-lg` | 14px | dialog, sheet |
| `--radius-pill` | 999px | badge, user pill |
| (altri) | 8px | bottoni, input, segments — hardcoded nei componenti |

## Shadows

```css
--shadow-sm: 0 1px 2px rgba(38, 30, 18, 0.04);
--shadow-md: 0 6px 24px -8px rgba(38, 30, 18, 0.12), 0 2px 6px rgba(38, 30, 18, 0.04);
--shadow-lg: 0 20px 48px -12px rgba(38, 30, 18, 0.18), 0 4px 12px rgba(38, 30, 18, 0.06);
```

In dark mode i valori passano a `rgba(0,0,0,0.3..0.55)`.

---

## Animation / transitions

| Uso | Durata | Easing |
|---|---|---|
| Hover state generico | 120ms | ease |
| Drawer slide-in | 220ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| Dialog pop | 180ms | ease |
| Scrim fade | 180ms | ease |
| Bar fill | 400ms | `cubic-bezier(0.4, 0.7, 0.2, 1)` |
| Button :active | 50ms | translateY(1px) |

---

## Accessibilità

- Contrasto: tutte le combinazioni `--ink` su `--bg`, `--ink-2` su `--bg`, `--primary-ink` su `--primary` superano AA (4.5:1).
- Focus state: input `:focus { border-color: var(--primary) }` — in produzione aggiungere `outline: 2px solid var(--primary); outline-offset: 2px` per tastiera.
- Hit target minimo: 36px (bottoni default), eccetto `btn.sm` 30px che va riservato a contesti densi (toolbar tabella).
- Animazioni: rispettare `prefers-reduced-motion` (NON ancora gestito nel prototipo, da aggiungere in produzione).
