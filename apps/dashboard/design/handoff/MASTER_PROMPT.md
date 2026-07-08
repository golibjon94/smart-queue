# MASTER PROMPT — Smart-Queue "Aurora Petrol" dashboard restyle

> Paste this whole file into Claude Code from the repo root (the folder that
> contains `apps/dashboard`). It is self-contained: every colour and value is
> inline. The companion files `tokens.css`, `tailwind-theme.css`, and the
> prototype `Smart Queue Dashboard.dc.html` are references you can open, but you
> do not strictly need them to follow this prompt.

---

## Role & goal
You are restyling the existing Angular dashboard in `apps/dashboard` to a hi-fi,
futuristic look called **"Aurora Petrol"**. This is a **pure visual restyle**.
Do NOT change the data layer, routing, `DashboardStore` signals, the SignalR/HTTP
flow, or the component boundaries. Keep the standalone-component + signals + OnPush
+ Tailwind v4 + PrimeNG architecture exactly as it is.

Preserve these components and only change how they look:
`app-shell`, `sidebar`, `shell-topbar`, `dashboard-header`, `kpi-cards`,
`counters-panel`, `queues-table`, `forecast-chart`, `anomalies-panel`,
`recommendations-panel`. Keep binding to `store.*` signals and the existing
`toggleScenario()` / `respond(recId, status)` actions.

## Art direction
Calm, low-strain **petrol-slate** dark base (deep desaturated green-grey — easy on
the eyes for long shifts), lifted by a delicate **aurora** accent sweep that runs
cool→warm: **aqua → mint → iris → coral**. Aqua is the futuristic highlight and is
used sparingly (brand mark, live dot, active nav, chart line/area, hover glow,
progress). Motion is elegant and subtle. A faint animated neural-network canvas
sits behind everything. Full **dark + light** theming via one attribute.

## Design tokens (put these in a global stylesheet as CSS custom properties)
Accents are RGB triplets so any alpha can be composed as `rgba(var(--a-rgb), .18)`.

DARK (default):
```
--a-rgb: 63 224 197;    /* mint-teal  */
--b-rgb: 142 140 255;   /* iris       */
--c-rgb: 255 122 156;   /* coral-pink */
--d-rgb: 90 226 255;    /* aqua glow  */
--warn-rgb: 255 179 92; /* amber      */
--grad: linear-gradient(100deg, rgb(var(--d-rgb)), rgb(var(--a-rgb)) 34%, rgb(var(--b-rgb)) 68%, rgb(var(--c-rgb)));
--ok: rgb(var(--a-rgb)); --warn: rgb(var(--warn-rgb)); --danger: rgb(var(--c-rgb));

--bg: #0f1311;
--bg-radials:
  radial-gradient(1100px 640px at 82% -8%, rgba(var(--a-rgb),.10), transparent 58%),
  radial-gradient(900px 560px at -6% 6%,   rgba(var(--warn-rgb),.07), transparent 55%),
  radial-gradient(760px 820px at 55% 120%, rgba(var(--b-rgb),.07), transparent 60%);
--vignette: rgba(11,14,12,.72);
--panel-1: rgba(28,34,32,.60);  --panel-2: rgba(17,21,20,.48);
--panel-alt-1: rgba(28,36,33,.62); --panel-alt-2: rgba(16,21,19,.48);
--border: rgba(150,180,168,.12); --border-strong: rgba(150,190,175,.30);
--border-accent: rgba(var(--c-rgb),.22);
--chip: rgba(255,255,255,.03);   --chip-bd: rgba(150,180,168,.12);
--text: #e8ede9; --text-dim: #9daba3; --text-mut: #66716b;
--shadow: 0 22px 54px -26px rgba(0,0,0,.60);
--inset: inset 0 1px 0 rgba(255,255,255,.045);
--ok-ink: #03241d;   /* text on a mint button */
--canvas-opacity: .60;
```

LIGHT (`data-theme="light"` overrides — soft lavender-white, deeper accents):
```
--a-rgb: 15 178 150; --b-rgb: 108 99 232; --c-rgb: 236 74 120; --d-rgb: 20 165 200; --warn-rgb: 214 132 36;
--bg: #f2f1fb;
--bg-radials:
  radial-gradient(1100px 640px at 82% -8%, rgba(var(--c-rgb),.14), transparent 58%),
  radial-gradient(900px 560px at -6% 6%,   rgba(var(--a-rgb),.13), transparent 55%),
  radial-gradient(760px 820px at 55% 120%, rgba(var(--b-rgb),.10), transparent 60%);
--vignette: rgba(242,241,251,.55);
--panel-1: rgba(255,255,255,.92); --panel-2: rgba(255,255,255,.70);
--panel-alt-1: rgba(255,255,255,.94); --panel-alt-2: rgba(252,250,255,.78);
--border: rgba(70,58,130,.13); --border-strong: rgba(70,58,130,.32);
--border-accent: rgba(var(--c-rgb),.30);
--chip: rgba(70,58,130,.04); --chip-bd: rgba(70,58,130,.12);
--text: #1a1730; --text-dim: #5a5578; --text-mut: #8a85a6;
--shadow: 0 18px 44px -24px rgba(70,55,130,.28);
--inset: inset 0 1px 0 rgba(255,255,255,.90);
--ok-ink: #ffffff; --canvas-opacity: .55;
```

Radii: sm 10 / md 14 / lg 18 / xl 20 / pill 999. Cards use xl, KPI cards 18.
Fonts: **Space Grotesk** (display + all numbers), **Sora** (body), **JetBrains Mono**
(labels, timestamps, model version, metrics). Self-host or Google Fonts.

## Theming
Make `ThemeService` set `data-theme="light|dark"` on `<html>` (keep the existing
`sq_theme` localStorage key + `prefers-color-scheme` first-load fallback). All
colours flip via the variables above — no component re-render needed. Add a
sun/moon toggle in the topbar.

## Layout
Fixed 250px sidebar (sticky, blur 22px) + main column (sticky topbar over a
scrolling content area). Content max-width 1520px, centred, padding 26px.
Main grid: `grid-template-columns: 5fr 7fr; gap: 18px; align-items: start`.
Below `lg`: single column; KPI grid 2-up then 1-up; sidebar collapses via the
existing `LayoutService.sidebarCollapsed()`.

## Components (match the prototype exactly)
- **Sidebar**: brand = 42px conic-gradient (aqua→mint→iris→coral) rounded square with
  a 2px inset knocked to `--bg` + gradient bolt; wordmark "smart-queue" + caption
  "AI ORCHESTRATOR". Nav: Boshqaruv paneli (active), Analitika, Sozlamalar (both
  badge "tez orada"). Active item: mint/iris tint bg, inset iris ring, 3px left
  **aqua→iris** bar, aqua icon. Bottom **AI Engine** widget: dual counter-rotating
  gradient rings + pulsing **aqua** core, "AI Engine / LightGBM v3.2 · live".
- **Topbar** (66px, blur 18px): search pill; "Jonli" pill with pulsing **aqua** dot
  (aqua glow); bell with coral unread dot; theme toggle; user pill (conic avatar
  "A", "Aziza R.").
- **Page header**: eyebrow "REAL-TIME · ASIA/TASHKENT" (mono, iris); H1 branch name
  in `--grad` clipped text (Space Grotesk 30/700); subtitle; primary CTA
  "Demo: tushlik cho'qqisi" (`--grad`, play icon) → `store.toggleScenario()`.
- **KPI cards** (4-col, gap 16): each has a 44px gradient icon chip, a mono trend
  badge, a 34px value that **counts up** from 0 on mount (cubic ease-out ~1300ms),
  a label, and a footer viz. 1) Navbatda kutmoqda — iris, users, ▲12% danger,
  sparkline. 2) O'rtacha kutish — amber, clock, ▼3% ok, sparkline. 3) Ochiq kassalar
  — mint, monitor, "67% band", value N/12, **aqua→mint** progress bar. 4) Faol AI
  tavsiyalari — coral alt-card, brain, pulsing "AI" pill, "so'nggi: 2 daq oldin".
- **Kassalar holati**: 6-col grid of 12 tiles. serving = mint tint + pulsing dot
  ("xizmatda"); idle = chip bg + grey dot ("bo'sh"); closed = dashed border, 55%
  opacity ("yopiq"). Number Space Grotesk 20/700.
- **Navbatlar**: mono uppercase header + rows (name, waiting pill, "N ochiq",
  `~N daq`). Severity: >10 coral, >5 amber, else mint (pill + est-wait text).
- **Anomaliyalar**: "N faol" coral badge; rows tinted by severity (jiddiy→coral,
  ogohlantirish→amber) with icon chip, title, severity tag, mono time, message,
  "Kuzatilgan / kutilgan" line.
- **Kelish oqimi bashorati**: title + "Keyingi 24 soat · mijoz/soat" + "LightGBM
  v3.2" coral pill + legend. Custom SVG area chart (250px): faint **aqua** confidence
  band, **aqua** area fill, `--grad` line (aqua→mint→iris→coral) with a glow filter
  that **draws in** via stroke-dashoffset (~1.8s), pulsing **coral** peak marker,
  3 gridlines, mono x-labels 00–20h. (You may keep PrimeNG Chart if you match this
  visual, or hand-roll the SVG as in the prototype.)
- **AI Tavsiyalar**: alt-card. Header = spinning gradient orb + "AI Tavsiyalar /
  real-vaqtda generatsiya qilinmoqda" + "N faol" badge. Body is a fixed
  **`max-height:360px; overflow-y:auto`** list with the aurora scrollbar
  (**aqua→iris** thumb). Each item: coral icon chip, action (Space Grotesk 14/600),
  status tag, reason, green benefit line. `proposed` items are coral-tinted with
  **Qabul** (mint→iris gradient) + **Rad** (outline) → `respond()`; accepted/rejected
  are 62% opacity with a status tag.

## Motion
- KPI count-up (cubic ease-out, ~1300ms). Chart line draw-in
  (`stroke-dasharray:1600; stroke-dashoffset:1600 → 0`, 1.8s, delay .3s) + pulsing
  peak marker (2s loop). Card entrance `sq-rise` (fade + 16px up, .7s, staggered
  delays 0.02→0.36s). Card hover: lift 4px + **aqua** rim glow
  `0 22px 54px -22px rgba(var(--d-rgb),.42)` + stronger border. Buttons: lift 2px +
  brightness; active scale .98. Live/serving dots pulse; AI orbs = dual
  counter-rotating conic rings + pulsing core.
- **Neural background**: full-viewport `<canvas>` in `app-shell` behind the router
  outlet. ~58 drifting nodes coloured **aqua/mint/iris/coral**, links fade by
  distance (<150px), light pulses travel random node→node ("AI collapse graph").
  Recolour + lower opacity (`--canvas-opacity`) in light mode. Gate all motion
  behind `prefers-reduced-motion`.

## Themes (multi-theme switcher)
Ship a **theme switcher** in the topbar: a palette-icon button that opens a small
popover of swatches. Selecting one sets `data-theme` on the root and every colour
flips via the variables (no re-render; the neural canvas re-inits per theme).
Persist the choice to `localStorage` (`sq_theme`).

Presets (accents stay identical across all — only surfaces change; full values in
`tokens.css`):
- **petrol** (default, no attribute) — `--bg:#0f1311`, calm petrol-slate.
- **slate** — `--bg:#171c24`, the **lightest dark** option (least eye strain).
- **navy** — `--bg:#0a0f1c`, deep space blue.
- **plum** — `--bg:#0a0711`, the original ink/aurora look.
- **light** — `--bg:#f2f1fb`, soft lavender-white.

Canvas opacity is per-theme (`--canvas-opacity` .5–.8 dark, .55 light); the neural
background reads `currentTheme === 'light'` to pick its light-vs-dark node palette
and link colour. The login page carries the same switcher and presets; each preset
also defines `--brand-base` for the login right-panel background.

## Constraints & definition of done
- Use the token values above exactly — no invented colours/spacing.
- Both dark and light must look correct (verify by toggling).
- Type-safe, OnPush, zero console errors; data still comes from live signals
  (prototype numbers/labels are mock stand-ins).
- Every screen matches the prototype in both themes; the recommendations panel
  scrolls independently; KPI numbers count up; the forecast line draws in; the
  neural background runs behind the app.
