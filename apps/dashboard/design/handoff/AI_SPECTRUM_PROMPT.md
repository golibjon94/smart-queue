# ADD-ON PROMPT — Large rotating "AI Spectrum" on the login page

> Small, focused add-on to `LOGIN_PROMPT.md`. Adds a big, slowly-rotating aurora
> "AI spectrum" as an ambient hero visual on the login right-hand brand panel.
> Pure CSS (no JS). Paste into Claude Code after the login restyle is in place.

---

## Goal
On the login screen's **right brand panel**, add a large decorative **AI spectrum**:
a big glowing ring built from a conic aurora gradient (aqua → mint → iris → coral →
amber) that rotates slowly, with a few concentric counter-rotating rings and a soft
pulsing core. It sits **behind** the panel content as an ambient centerpiece — it must
never reduce headline/feature-list legibility, and it is decorative only (no state,
no interaction).

## Placement & sizing
- Container: `position:absolute; top:50%; right:-70px; transform:translateY(-50%);
  width:560px; height:560px; pointer-events:none; opacity:.75;` inside the right
  panel (which is `position:relative; overflow:hidden`). Content stays above via a
  higher stacking context (content wrapper `position:relative; z-index:2`).
- On smaller/hidden panel widths it disappears with the panel (`max-md:hidden`).

## Layers (all `position:absolute; border-radius:50%`)
1. **Spectrum halo** — `inset:0`,
   `background: conic-gradient(from 0deg, rgba(var(--d-rgb),0), rgba(var(--d-rgb),.55),
   rgba(var(--a-rgb),.55), rgba(var(--b-rgb),.55), rgba(var(--c-rgb),.55),
   rgba(var(--warn-rgb),.4), rgba(var(--d-rgb),0))`, `filter: blur(34px)`,
   `animation: spin 30s linear infinite`.
2. **Sweep arc** — `inset:90px`,
   `background: conic-gradient(from 140deg, transparent, rgba(var(--a-rgb),.42) 30%, transparent 62%)`,
   `filter: blur(10px)`, `animation: spin-reverse 22s linear infinite`.
3. **Solid ring** — `inset:150px`, `border:1px solid rgba(var(--d-rgb),.22)`,
   `box-shadow: inset 0 0 44px rgba(var(--d-rgb),.16)`, `animation: spin 40s linear infinite`.
4. **Dashed ring** — `inset:212px`, `border:1px dashed rgba(var(--b-rgb),.22)`,
   `animation: spin-reverse 34s linear infinite`.
5. **Pulsing core** — `inset:256px`,
   `background: radial-gradient(circle, rgba(var(--d-rgb),.5), transparent 70%)`,
   `filter: blur(6px)`, `animation: pulse 3s ease-in-out infinite`.

## Keyframes
```
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spin-reverse { to { transform: rotate(-360deg); } }
@keyframes pulse { 0%,100% { opacity:.55; transform:scale(1);} 50% { opacity:1; transform:scale(1.12);} }
```
(Reuse the app's existing `sq-spin` / `sq-spin-rev` / `sq-pulse` if present.)

## Tokens (aurora accents — same as the app)
`--a-rgb 63 224 197` (mint) · `--b-rgb 142 140 255` (iris) · `--c-rgb 255 122 156`
(coral) · `--d-rgb 90 226 255` (aqua) · `--warn-rgb 255 179 92` (amber). Light theme
uses the login page's light overrides automatically.

## Constraints
- CSS-only; no `<canvas>`, no JS. Keep it behind content; verify the headline and
  feature list remain fully readable in both dark and light themes.
- Gate the rotation behind `@media (prefers-reduced-motion: reduce)` (freeze all
  three animations) so it respects accessibility settings.
- Angular: implement as inline styles / a scoped stylesheet on the login component —
  do not add new state or inputs.

## Done when
A large aurora spectrum ring rotates slowly behind the right-panel content on the
login page, adds depth/wow without hurting legibility, and pauses under
reduced-motion. Matches `Login.dc.html` (updated prototype in this bundle).
