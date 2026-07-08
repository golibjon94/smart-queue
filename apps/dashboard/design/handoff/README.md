# Handoff: Smart-Queue — Aurora Obsidian Dashboard Redesign

## Overview
A futuristic, AI-forward redesign of the **smart-queue** operations dashboard (bank / service-centre queue management). It keeps every feature of the existing Angular app — branch KPIs, live counter states, service queues, ML arrival forecast, anomaly feed, and AI recommendations — and re-skins them with a distinctive "Aurora Obsidian" visual system, an animated neural-network background, elegant motion, full **dark + light** theming, and a **self-scrolling recommendations panel**.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/JS** — a prototype showing the intended look, motion, and behaviour. They are **not** production code to paste in verbatim.

The task is to **recreate this design inside the existing `apps/dashboard` Angular codebase** (Angular 22, standalone components, signals, Tailwind v4, PrimeNG, SignalR realtime) using its established patterns:
- Keep the existing component split: `dashboard-header`, `kpi-cards`, `counters-panel`, `queues-table`, `forecast-chart`, `anomalies-panel`, `recommendations-panel`, plus the `app-shell` / `sidebar` / `shell-topbar` layout.
- Keep `DashboardStore` (signals) and the SignalR/HTTP data flow untouched — this is a **restyle**, not a data-layer change.
- Re-express the styling with the tokens in `tokens.css` (and `tailwind-theme.css` for the Tailwind/PrimeNG bridge).

## Fidelity
**High-fidelity (hifi).** Colours, typography, spacing, radii, shadows, and interactions are final. Recreate pixel-for-pixel using the codebase's Tailwind utilities + PrimeNG components, substituting the aurora tokens for the current blue/surface palette.

---

## Design Tokens

All values live in **`tokens.css`** as CSS custom properties. Dark is the default; `data-theme="light"` overrides. Accent colours are stored as RGB triplets so any alpha can be composed with `rgba(var(--a-rgb), .18)`.

### Accents (signature aurora palette)
| Token | Dark | Light | Use |
|---|---|---|---|
| `--a-rgb` mint-teal | `63 224 197` (#3FE0C5) | `15 178 150` (#0FB296) | ok / open / primary charts |
| `--b-rgb` iris | `142 140 255` (#8E8CFF) | `108 99 232` (#6C63E8) | info / links / mid-gradient |
| `--c-rgb` coral-pink | `255 122 156` (#FF7A9C) | `236 74 120` (#EC4A78) | AI / danger / accents |
| `--warn-rgb` amber | `255 179 92` (#FFB35C) | `214 132 36` (#D68424) | warnings |

Signature gradient `--grad`: `linear-gradient(100deg, mint, iris 52%, coral)` — used on the H1, primary button, brand mark, chart line, and scrollbar.

### Surfaces
| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0A0711` | `#F2F1FB` |
| `--panel-1 / --panel-2` (card gradient) | `rgba(26,21,42,.62)` → `rgba(14,11,24,.5)` | `rgba(255,255,255,.92)` → `rgba(255,255,255,.7)` |
| `--panel-alt-*` (AI card) | plum-tinted | white |
| `--border` | `rgba(150,140,220,.14)` | `rgba(70,58,130,.13)` |
| `--border-strong` (hover) | `rgba(150,140,220,.36)` | `rgba(70,58,130,.32)` |
| `--chip` / `--chip-bd` | `rgba(255,255,255,.03)` / `rgba(150,140,220,.13)` | `rgba(70,58,130,.04)` / `rgba(70,58,130,.12)` |
| `--bg-radials` | three soft coral/mint/iris radial glows behind everything |

### Text
`--text` `#ECEBF7` / `#1A1730` · `--text-dim` `#A49EC4` / `#5A5578` · `--text-mut` `#6A648F` / `#8A85A6`.

### Type scale
- Display / numbers: **Space Grotesk** (700) — H1 30px, KPI value 34px/line-1, panel titles 15px/600.
- Body: **Sora** (300–600) — base 13–13.5px, secondary 12–12.5px.
- Mono (labels, timestamps, model version, metrics): **JetBrains Mono** — 10–12px.

### Radii
`--r-sm 10` · `--r-md 14` · `--r-lg 18` · `--r-xl 20` · `--r-pill 999`. Cards use `--r-xl`; KPI cards `18px`; chips/tags pill.

### Shadows & effects
- `--shadow` ambient; `--inset` (1px top highlight) on every card.
- Card hover: `translateY(-4px)` + iris glow `0 22px 54px -22px rgba(var(--b-rgb),.5)`.
- `--canvas-opacity` .90 (dark) / .55 (light) for the neural background.

---

## Screens / Views

Single screen: **Boshqaruv paneli (Dashboard)**. Layout = fixed sidebar + main column (sticky topbar over a scrolling content area). Content max-width `1520px`, centred, padding `26px`.

### 1. Sidebar (`sidebar`) — width 250px, sticky, full height
- Backdrop-blur `22px`, `--panel-1` bg, right `1px --border`.
- **Brand**: 42px conic-gradient rounded square (mint→iris→coral) with a 2px inset knocked out to `--bg` and a gradient bolt glyph; wordmark "smart-queue" (Space Grotesk 16/700) + "AI ORCHESTRATOR" caption (10.5px mono, `--text-mut`, letter-spacing 1.5px).
- **Nav** (`NAV_ITEMS`): Boshqaruv paneli (active), Analitika (badge "tez orada"), Sozlamalar (badge "tez orada"). Active item: mint→iris tint bg, `inset` 1px iris ring, 3px left gradient bar, mint icon. Inactive: `--text-dim`, hover → `rgba(var(--b-rgb),.10)` bg.
- **AI Engine widget** (bottom): mint/coral tint card, dual counter-rotating gradient rings + pulsing core orb (see interactions), "AI Engine / LightGBM v3.2 · live".

### 2. Topbar (`shell-topbar`) — height 66px, sticky, blur 18px
Left: pill search field "Qidirish yoki AI'dan so'rash…". Right cluster: "Jonli" pill with pulsing mint dot; bell button with coral unread dot; **theme toggle** (sun in dark / moon in light); user pill (30px conic avatar "A", "Aziza R.", chevron). All controls 38px, `--chip` bg, `--chip-bd` border, hover lift.

### 3. Page header
Eyebrow "REAL-TIME · ASIA/TASHKENT" (mono, iris). H1 branch name in `--grad` clipped text (30/700). Sub "Navbatlar, prognoz va AI tavsiyalari — bir joyda, jonli." Right: primary CTA "Demo: tushlik cho'qqisi" (46px, `--grad`, play icon) → wired to `store.toggleScenario()`.

### 4. KPI cards (`kpi-cards`) — 4-col grid, gap 16
Each: 18px pad, `--r-lg`, card gradient, corner radial glow, 44px gradient icon chip, trend badge (mono), 34px value, label, and a footer viz. Mapping:
1. **Navbatda kutmoqda** — iris; users icon; trend `▲ 12%` in `--danger`; value **47**; footer sparkline (iris).
2. **O'rtacha kutish** — amber; clock icon; trend `▼ 3%` in `--ok`; value **~6 daq**; sparkline (amber).
3. **Ochiq kassalar** — mint; monitor icon; "67% band"; value **8/12**; 7px progress bar (mint→iris, 67%).
4. **Faol AI tavsiyalari** — coral (alt card style); brain icon; pulsing "AI" pill; value **3**; "so'nggi: 2 daq oldin".

Numbers **count up** from 0 on mount (see interactions).

### 5. Main grid — `grid-template-columns: 5fr 7fr; gap: 18px; align-items:start`

**Left column (5fr):**
- **Kassalar holati** (`counters-panel`): 6-col grid of 12 counter tiles. `serving` = mint tint + pulsing mint dot ("xizmatda"); `idle` = chip bg + grey dot ("bo'sh"); `closed` = dashed border, 55% opacity ("yopiq"). Number in Space Grotesk 20/700.
- **Navbatlar** (`queues-table`): header row (mono uppercase labels) + 5 rows: name, waiting pill, "N ochiq", `~N daq`. Wait severity colour: `>10` coral, `>5` amber, else mint (applies to pill + est-wait text).
- **Anomaliyalar** (`anomalies-panel`): "2 faol" coral badge; rows tinted by severity (jiddiy→coral, ogohlantirish→amber) with icon chip, title, severity tag, mono time, message, "Kuzatilgan / kutilgan" line.

**Right column (7fr):**
- **Kelish oqimi bashorati** (`forecast-chart`): title + "Keyingi 24 soat · mijoz/soat" + "LightGBM v3.2" coral pill. Legend (Bashorat / Ishonch oralig'i). Custom SVG area chart, 250px tall: iris confidence band, gradient area fill, `--grad` line with glow filter that **draws in** via stroke-dashoffset, pulsing coral marker on the peak point, 3 gridlines, mono x-labels (00–20h).
- **AI Tavsiyalar** (`recommendations-panel`): alt card. Header = spinning gradient orb + "AI Tavsiyalar / real-vaqtda generatsiya qilinmoqda" + "3 faol" coral badge. Body is a **fixed `max-height:360px`, `overflow-y:auto`** list with the custom aurora scrollbar. Each item: coral icon chip, action (Space Grotesk 14/600), status tag, reason, green benefit line with corner-arrow icon. `proposed` items are coral-tinted with **Qabul** (mint→iris gradient) + **Rad** (outline) buttons → `respond(recId, status)`; `accepted`/`rejected` are 62% opacity with a status tag.

---

## Interactions & Behavior
- **Theme toggle**: switches `data-theme` between `dark`/`light` on the root; all colours flip via CSS variables (no re-render needed). Persist to `localStorage` (`sq_theme`) as the existing `ThemeService` already does; respect `prefers-color-scheme` on first load.
- **KPI count-up**: on mount, each value animates 0→target over 1300ms, cubic ease-out (`1 - (1-t)^3`).
- **Chart draw-in**: line uses `stroke-dasharray:1600; stroke-dashoffset:1600` animated to 0 over 1.8s (ease `cubic-bezier(.4,0,.2,1)`, 0.3s delay). Peak marker pulses (r 5↔7, halo 8↔16) on a 2s loop.
- **Card entrance**: `sq-rise` (fade + 16px translateY, .7s) with staggered `animation-delay` 0.02→0.36s.
- **Card hover**: lift 4px + iris glow + stronger border (.5s). Buttons: lift 2px + brightness; active scale .98.
- **Live indicators**: mint "Jonli" dot and counter "serving" dots pulse (`sq-pulsedot` / `sq-pulse`). AI orbs are dual counter-rotating conic rings + a pulsing core.
- **Neural background**: full-viewport `<canvas>`, ~58 drifting nodes coloured mint/iris/coral, links fade by distance (<150px), and light pulses travel random node→node — evokes an "AI collapse graph". Recolours + drops opacity in light mode. Respect `prefers-reduced-motion` by pausing rAF if you add it.
- **Recommendations scroll**: independent inner scroll, does not grow the page.

## State Management
Unchanged — reuse `DashboardStore` signals: `state()`, `forecast()`, `recommendations()`, `anomalies()`, `openCounters()`, `totalCounters()`, `proposedCount()`, `isPeak()`, `scenarioLoading()`, `connectionError()`; actions `toggleScenario()` and `respond(recId, status)`. Data arrives via one-shot HTTP then SignalR push. All numbers/labels in the prototype are **mock stand-ins** — bind to the real signals.

## Responsive behavior
Desktop-first (matches current app). Below `lg`: collapse the 5fr/7fr grid to a single column and the KPI grid to 2-up then 1-up (mirror the existing Tailwind breakpoints). Sidebar collapses to 80px / off-canvas via the existing `LayoutService.sidebarCollapsed()`.

## Assets
No raster assets. All icons are inline SVG (feather-style 1.8px strokes) — map to the app's existing `primeicons` where equivalents exist (users, clock, desktop, bell, sun/moon, cog, plus/minus/directions/sync for recommendation action types, bolt/inbox/hourglass for anomaly types). Fonts: Google Fonts **Space Grotesk**, **Sora**, **JetBrains Mono** — self-host or `@import`.

## Files
- `Smart Queue Dashboard.dc.html` — the full interactive prototype (all screens, both themes, animations).
- `tokens.css` — global design tokens (dark + light) and optional helper classes.
- `tailwind-theme.css` — Tailwind v4 `@theme` mapping + PrimeNG token bridge + theme-switch notes.
- `PROMPT.md` — a ready-to-paste brief for Claude Code.
