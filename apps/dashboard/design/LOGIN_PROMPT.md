# LOGIN PROMPT — Smart-Queue "Aurora Petrol" login page restyle

> Paste this into Claude Code from the repo root (folder containing `apps/dashboard`).
> Self-contained: all colours/values inline. It restyles the existing login only;
> it reuses the same design tokens as `MASTER_PROMPT.md` (the dashboard restyle).

---

## Role & goal
Restyle **only** the login screen at `apps/dashboard/src/app/features/login/`
(`login.html` + `login.ts`) to the futuristic **"Aurora Petrol"** look, matching the
rest of the app. This is a **visual restyle**. Keep the `Login` component's logic,
signals (`username`, `password`, `loading`, `error`), the `submit()` flow, PrimeNG
form controls (or replace with styled native inputs — your call), and the
`AuthService.login()` call **unchanged**. Keep all Uzbek copy and the demo hint
(`admin` / `Admin!2026`).

## Art direction
Two-column full-height layout on desktop; on mobile show the form column only.
Calm **petrol-slate** dark base with a faint animated **neural-network canvas**
behind everything, and a delicate **aurora** accent sweep (aqua → mint → iris →
coral). Aqua is the futuristic highlight (brand mark, input focus ring, primary
button, live dot, orb core). Elegant, restrained motion.

## Design tokens (reuse the app's global tokens; inline values for reference)
```
--a-rgb: 63 224 197;   /* mint  */   --b-rgb: 142 140 255;  /* iris  */
--c-rgb: 255 122 156;  /* coral */   --d-rgb: 90 226 255;   /* aqua  */
--grad: linear-gradient(100deg, rgb(var(--d-rgb)), rgb(var(--a-rgb)) 34%, rgb(var(--b-rgb)) 68%, rgb(var(--c-rgb)));
--bg: #0f1311;
--panel-1: rgba(28,34,32,.62);  --panel-2: rgba(17,21,20,.50);
--border: rgba(150,180,168,.14);
--chip: rgba(255,255,255,.03);   --chip-bd: rgba(150,180,168,.13);
--text: #e8ede9; --text-dim: #9daba3; --text-mut: #66716b;
--inset: inset 0 1px 0 rgba(255,255,255,.05);
--ok-ink: #03241d;   /* text on a mint/aqua button */
```
Fonts: **Space Grotesk** (headings, brand, button, numbers), **Sora** (body/inputs),
**JetBrains Mono** (mono chips like the demo credentials & the eyebrow badge).
Radii: inputs 12, buttons 13, cards 22, pills 999.

## Layout
`display:grid; grid-template-columns:1fr 1fr; min-height:100vh`. Below `md`: single
column, hide the right brand panel. Full-viewport `<canvas>` (opacity .6) +
radial-vignette overlay behind both columns (`position:fixed; z-index:0`); content
`z-index:2`.

### LEFT — form column (centred, max-width ~430px, `sq-rise` fade-in)
- **Brand block** (centred): 60px conic-gradient (aqua→mint→iris→coral) rounded
  square with a ~2.5px inset knocked to `#121614` and a gradient bolt glyph; glow
  `0 12px 34px -8px rgba(var(--d-rgb),.7)`. Below: "smart-queue" (Space Grotesk
  28/700) + "Aqlli navbat boshqaruvi" (13.5px, `--text-dim`).
- **Glass card**: radius 22, `background: linear-gradient(160deg,var(--panel-1),var(--panel-2))`,
  `1px var(--border)`, `backdrop-filter: blur(20px)`, big soft drop shadow + `--inset`.
  Contains the form:
  - **Login** field: label (12/600), native input 48px tall, radius 12, `--chip` bg,
    `--chip-bd` border, `--text` colour. Bind to `username` signal, prefill "admin".
  - **Parol** field: same input with right padding for an **eye toggle** button
    (36px, ghost, hover → aqua tint) that switches `type` password↔text. Bind to
    `password`, prefill "Admin!2026" (demo). Use PrimeNG `p-password toggleMask` if
    you prefer — just match the visual.
  - **Focus state** (both inputs): `border-color: rgba(var(--d-rgb),.6)`,
    `box-shadow: 0 0 0 3px rgba(var(--d-rgb),.14)`, slightly lighter bg — the aqua
    focus ring is the signature detail.
  - **Error** (bound to `error()`): hidden by default; coral-tinted row
    (`rgba(var(--c-rgb),.1)` bg, `.3` border, coral text) with an alert icon.
  - **Submit button** "Kirish": 50px, `--grad` bg, `--ok-ink` text, Space Grotesk
    600, login icon; hover lift 2px + aqua glow; on `loading()` show a spinner and
    "Kirilmoqda..."; keep it wired to `submit()`.
- **Demo hint** below the card: "Demo uchun:" + two mono `<code>` chips
  (`admin` / `Admin!2026`) styled with `--chip` bg, `--chip-bd` border, mint text.

### RIGHT — brand panel (`max-md:hidden`)
- Background: aurora tint over petrol —
  `linear-gradient(150deg, rgba(var(--a-rgb),.16), rgba(var(--b-rgb),.10) 55%, rgba(var(--c-rgb),.12)), linear-gradient(160deg,#111917,#0e1512)`,
  left border `--border`. Add two large soft radial glows (aqua top-right, coral
  bottom-left) as absolutely-positioned circles.
- **Eyebrow badge**: pill, aqua-tinted, mono uppercase "AI-powered · LightGBM" with
  a pulsing aqua dot.
- **Headline** (Space Grotesk ~38/700, tight leading): line 1 "Bashorat qiladi." in
  `--text`; line 2 "Boshqaradi. Maslahat beradi." in `--grad` clipped text.
- **Feature list** (3 rows, 15px): each a 42px gradient icon chip + label —
  aqua chart icon "Mijoz oqimini oldindan ko'radi", mint sitemap icon "Kassalarni
  real vaqtda optimallashtiradi", coral chat icon "O'zbek tilida aniq tavsiya beradi".
- **Mini stat card** (glass): a small dual counter-rotating gradient orb with a
  pulsing aqua core + "Bugungi bashorat aniqligi" + big number "94.2%" + an
  aqua→coral sparkline. (Decorative — static is fine.)

## Motion
- Neural background: ~52 drifting nodes coloured aqua/mint/iris/coral, links fade by
  distance (<150px), occasional light pulses travelling node→node. Gate behind
  `prefers-reduced-motion`.
- Card fade+rise on load (.8s). Button hover lift + aqua glow. Live dot & orb pulse.
- Input aqua focus-ring transition (.3s).

## Definition of done
- Login matches the prototype (`Login.dc.html`) visually; form still binds to the
  `Login` component signals and calls `AuthService.login()`; error and loading
  states render in the new style; eye toggle works; demo hint present.
- Uses the token values above (no invented colours). Type-safe, OnPush, no console
  errors. Looks correct at desktop (2-col) and mobile (form only).

## Reference
Prototype file in this bundle: `Login.dc.html` — open it in a browser to see the
exact look, the aqua focus ring, the eye toggle, and the submit → success animation.
