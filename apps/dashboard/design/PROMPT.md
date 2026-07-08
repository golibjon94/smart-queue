# Claude Code prompt — Smart-Queue "Aurora Obsidian" restyle

Paste this into Claude Code from the repo root (the folder containing `apps/dashboard`).

---

You are restyling the existing Angular dashboard in `apps/dashboard` to match a hi-fi
design reference. This is a **visual restyle only** — do not change the data layer,
routing, `DashboardStore`, the SignalR/HTTP flow, or the component boundaries.

## Inputs (in this handoff folder)
- `README.md` — full spec: every screen, component, colour, size, and interaction.
- `tokens.css` — the design tokens (dark default + `data-theme="light"` overrides).
- `tailwind-theme.css` — how to wire tokens into Tailwind v4 + PrimeNG + theme switching.
- `Smart Queue Dashboard.dc.html` — the interactive prototype. Open it in a browser and
  toggle the theme (sun/moon, top-right) to see both modes and all animations.

## Goal
Recreate the prototype pixel-faithfully inside the existing app, keeping its patterns
(standalone components, signals, Tailwind utilities, PrimeNG, OnPush).

## Steps
1. Add `tokens.css` globally (import in `src/styles.scss` after the Tailwind/PrimeUI
   imports) and apply `tailwind-theme.css` guidance. Drive theming off **one** attribute:
   make `ThemeService` set `data-theme="light|dark"` on `<html>` (keep the existing
   `sq_theme` localStorage key and `prefers-color-scheme` fallback).
2. Restyle the shell: `app-shell`, `sidebar` (brand mark, active-item gradient bar,
   bottom AI-Engine widget), `shell-topbar` (search pill, Jonli pill, bell, theme toggle,
   user pill). Add the full-viewport neural-network `<canvas>` background as a standalone
   `NeuralBackground` component mounted in `app-shell` behind the router outlet
   (see the prototype's `initBackground()` — port it 1:1, recolour per theme).
3. Restyle each dashboard component to the spec in `README.md §Screens`:
   `dashboard-header`, `kpi-cards` (with count-up on value change),
   `counters-panel`, `queues-table`, `forecast-chart` (rebuild the chart to the
   custom SVG in the prototype — draw-in line, iris confidence band, pulsing peak;
   keep PrimeNG Chart only if you prefer, but match the visual),
   `anomalies-panel`, and `recommendations-panel` (fixed `max-height:360px` inner
   scroll with the aurora scrollbar).
4. Wire nothing new: keep binding to `store.*` signals and the existing
   `toggleScenario()` / `respond()` actions. Prototype numbers are mock — use real data.
5. Add the entrance/hover/pulse animations and the count-up + chart draw-in.
   Gate motion behind `prefers-reduced-motion`.

## Constraints
- Match colours/spacing/typography from `tokens.css` exactly — no invented values.
- Fonts: Space Grotesk (display + numbers), Sora (body), JetBrains Mono (labels).
- Both dark and light must look correct; verify by toggling the theme.
- Keep everything type-safe and OnPush; no console errors.

## Definition of done
- Every screen matches the prototype in both themes.
- Sidebar, topbar, KPIs, counters, queues, forecast, anomalies, and the scrollable
  recommendations panel are all restyled and still bound to live signals.
- Animated neural background runs behind the app; recommendations panel scrolls
  independently; KPI numbers count up; forecast line draws in.
