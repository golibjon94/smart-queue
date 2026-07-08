# Dashboard — Frontend arxitekturasi

`smart-queue` boshqaruv paneli. Zamonaviy, signal-asosidagi, kengayishga
mo'ljallangan Angular ilovasi.

---

## 1. Texnologiyalar

| Qatlam | Texnologiya | Versiya |
| --- | --- | --- |
| Framework | Angular (standalone, **zoneless**) | 22 |
| UI kutubxona | PrimeNG (Aura preset) | 21 |
| Styling | Tailwind CSS v4 + `tailwindcss-primeui` | 4.3 |
| Grafika | Chart.js (PrimeNG `p-chart` orqali) | 4.5 |
| Ikonlar | PrimeIcons | 7 |
| Build | `@angular/build` (esbuild/Vite) | 22 |

**Asosiy tanlovlar:**

- **Zoneless change detection** — Angular 21+ da standart. `zone.js` yo'q,
  `provideZonelessChangeDetection()` `app.config` da aniq ko'rsatilgan. Butun
  reaktivlik **signal**larga quriladi.
- **Standalone komponentlar** — NgModule yo'q. Har bir komponent o'z `imports`iga ega.
- **OnPush** — barcha komponentlarda (zoneless bilan mos, subtree'larni tejaydi).

---

## 2. Papka tuzilmasi

```
src/
├── environments/                 # muhit konfiguratsiyasi (fileReplacements)
│   ├── environment.ts            #   production (default)
│   ├── environment.development.ts#   dev (ng serve almashtiradi)
│   └── environment.model.ts      #   umumiy tip (almashtirilmaydi)
│
├── styles.scss                   # global reset (minimal — preflight qoladi)
├── tailwind.css                  # Tailwind entry + primeui + dark variant
├── main.ts                       # bootstrap
│
└── app/
    ├── app.config.ts             # provayderlar (router, http, primeng, zoneless...)
    ├── app.routes.ts             # route'lar (login + shell + children)
    ├── app.ts                    # ildiz komponent (<router-outlet> + <p-toast>)
    │
    ├── core/                     # butun ilova bo'ylab singletonlar
    │   ├── auth/                 #   JWT auth: service, guard, interceptor, models
    │   ├── layout/               #   app-shell (sidebar + topbar + outlet)
    │   │   ├── app-shell/
    │   │   ├── sidebar/
    │   │   ├── shell-topbar/
    │   │   ├── layout.service.ts #   sidebar collapse holati
    │   │   └── nav.ts            #   sidebar navigatsiya modeli (data)
    │   ├── theme/                #   dark/light mode (ThemeService, data-theme)
    │   ├── realtime/             #   SignalR client (RealtimeService) — Faza 1
    │   └── notifications/        #   toast wrapper (NotificationService)
    │       (layout ichida: neural-background — to'liq ekran neyron-to'r canvas)
    │
    ├── features/                 # biznes bo'limlari (har biri o'zicha mustaqil)
    │   ├── dashboard/
    │   │   ├── dashboard.ts      #   container (smart) — store'ni o'qiydi
    │   │   ├── dashboard.html
    │   │   ├── data/             #   data-access qatlami
    │   │   │   ├── dashboard-api.ts   # stateless HTTP + DTO→model mapping
    │   │   │   └── dashboard-store.ts # signal store (holat + real-vaqt + action)
    │   │   ├── models/           #   DTO (transport) + view-model (app) + barrel
    │   │   └── ui/               #   presentational (dumb) komponentlar
    │   │       ├── dashboard-header/
    │   │       ├── kpi-cards/
    │   │       ├── counters-panel/
    │   │       ├── queues-table/
    │   │       ├── forecast-chart/
    │   │       ├── recommendations-panel/
    │   │       └── anomalies-panel/   # EWMA anomaliyalar — Faza 1
    │   └── login/                #   login sahifasi
    │
    └── shared/                   # bir nechta feature ishlatadigan umumiy
        ├── placeholder/          #   "Tez orada" sahifasi
        └── count-up/             #   raqamlarni animatsiya bilan sanaydigan direktiva
```

**Qatlamlar mas'uliyati:**

- **`core/`** — ilova bo'ylab bitta nusxada yashaydigan narsalar (auth, layout,
  theme, notifications). `providedIn: 'root'`.
- **`features/`** — biznes bo'limlari. Har biri o'z `data/`, `models/`, `ui/`,
  container komponentiga ega. Lazy-load qilinadi.
- **`shared/`** — bir nechta feature qayta ishlatadigan komponent/util.

---

## 3. Feature ichidagi qatlamlar (dashboard misolida)

Har bir feature 4 qatlamga bo'linadi:

```
                    ┌──────────────────────────┐
   HTTP  ◀────────  │  data/<feature>-api.ts   │   stateless
   (Gateway)        │  DTO → view-model map     │   providedIn: 'root'
                    └────────────┬─────────────┘
                                 │ Observable
                    ┌────────────▼─────────────┐
                    │  data/<feature>-store.ts │   signal store
                    │  holat, polling, action  │   feature-scoped
                    └────────────┬─────────────┘   (component providers)
                                 │ signal'lar
                    ┌────────────▼─────────────┐
                    │  <feature>.ts (container)│   smart — store'ni inject
                    └────────────┬─────────────┘
                                 │ input() / output()
                    ┌────────────▼─────────────┐
                    │  ui/*  (presentational)  │   dumb — holatsiz, OnPush
                    └──────────────────────────┘
```

### 3.1. Models — DTO va view-model ajratiladi

Transport formatlar (snake_case ML, camelCase .NET) **DTO** sifatida faqat data
qatlamida qoladi; ilova ichida toza **view-model** ishlatiladi.

- `branch-state.model.ts` — Gateway camelCase (to'g'ridan view-model).
- `forecast.model.ts` — `ForecastResponseDto` (snake_case) → `Forecast` (camelCase).
- `recommendation.model.ts` — ikkita manba DTO (refresh snake / DB camel) → yagona
  `Recommendation`.
- `index.ts` — barrel (import qulayligi uchun).

### 3.2. `DashboardApi` — data-access

Stateless. HTTP chaqiruvlar va **pure** `map...` funksiyalar bilan DTO → view-model.
Auth header `authInterceptor` orqali avtomatik qo'shiladi. `providedIn: 'root'`.

### 3.3. `DashboardStore` — signal store

Butun feature holati va logikasi shu yerda:

- **Yozib bo'ladigan** `private _signal`, tashqariga `.asReadonly()`.
- **Hosila** qiymatlar `computed()` (masalan `isPeak`, `openCounters`, `proposedCount`).
- **Polling** — `timer(0, pollIntervalMs).pipe(switchMap, catchError, takeUntilDestroyed)`.
  `OnDestroy` ishlatilmaydi — `takeUntilDestroyed(destroyRef)` avtomatik tozalaydi.
- **Action**lar — `toggleScenario()`, `respond()`.
- **Feature-scoped** — `@Injectable()` (root emas), container `providers` da beriladi.
  Shu sabab store va uning polling'i route hayotiy sikliga bog'lanadi.

### 3.4. Container va presentational

- **Container** (`dashboard.ts`) — yupqa. `DashboardStore` ni inject qiladi, UI
  komponentlariga signal qiymatlarni uzatadi, output'larni store action'lariga bog'laydi.
- **Presentational** (`ui/*`) — holatsiz. `input()` / `output()` signal API, `OnPush`,
  inline template + Tailwind utility. Biznes logikasi yo'q.

---

## 3.5. Real-vaqt (Faza 1 — SignalR)

Faza 1'da HTTP **polling olib tashlandi**. Ma'lumot oqimi:

```
  Boshlang'ich (bir martalik HTTP)          Real-vaqt (uzluksiz)
  ────────────────────────────────          ─────────────────────
  getQueueState  ─┐                          Gateway /hubs/queue (WebSocket)
  getForecast     ├─►  DashboardStore  ◀──── queueStateUpdated
  getRecommend.   │    (signal holat)         recommendationCreated
  getAnomalies   ─┘                          anomalyDetected
```

- **`core/realtime/realtime.service.ts`** — `@microsoft/signalr` bilan Gateway hub'iga
  ulanadi (`/hubs/queue`, JWT `accessTokenFactory` orqali). Hub hodisalarini
  (camelCase payload) signal'larga o'tkazadi: `queueState`, `recommendation`, `anomaly`,
  `connected`.
- **Zoneless mos:** hub callback'i "zona"dan tashqarida ishlasa ham, signal write o'zi
  change detection'ni ishga tushiradi — qo'shimcha `NgZone.run` shart emas.
- **Qayta ulanish ikki bosqichda:** `withAutomaticReconnect` (o'rnatilgan ulanish uzilsa)
  + `startWithRetry` (dastlabki ulanish muvaffaqiyatsiz — hub hali ko'tarilmagan bo'lsa,
  har 15s qayta urinadi).
- **Store bog'lash:** `DashboardStore` boshlang'ich holatni bir martalik HTTP bilan yuklaydi,
  keyin `effect()` orqali `RealtimeService` signallariga reaksiya bildiradi (tavsiya/anomaliya
  push'lari `untracked` ichida ro'yxatga qo'shiladi — effect o'z-o'ziga bog'lanib qolmasligi uchun).
- **Graceful degradation:** Gateway/hub tayyor bo'lmasa (503/404/tarmoq xatosi) — boshlang'ich
  HTTP fallback ishlaydi, "Aloqa yo'q" ko'rsatiladi, SignalR fonda qayta urinaveradi; hub
  ko'tarilganda `queueStateUpdated` push holatni to'ldiradi.

**Anomaliyalar** — `anomalyDetected` push (va boshlang'ich `GET /api/anomalies`) →
`ui/anomalies-panel`. Turlari: `slow_operator` / `backlog` / `surge`; severity:
`warning` / `serious` / `critical` (rang + PrimeNG Tag bilan).

**`route_queue` (JIQ)** tavsiyasi — `recommendation.model.ts` `ActionType` kengaytirildi;
`dashboard-api.ts` label mapping va `recommendations-panel` tur bo'yicha ikonka qo'shildi.

> Wire-kontrakt (hub yo'li, hodisa nomlari, payload shakllari): `docs/faza1/FAZA1_UMUMIY.md`.

---

## 4. Layout shell

Autentifikatsiyadan o'tgan barcha sahifalar **`AppShell`** ichida:

```
┌───────────────────────────────────────────────────┐
│ Sidebar │  ShellTopbar (hamburger, dark, user)     │
│ (nav)   ├──────────────────────────────────────────┤
│         │  <router-outlet>  ← Dashboard / boshqalar │
│         │                                            │
└─────────┴──────────────────────────────────────────┘
```

- **`Sidebar`** — brand + data-driven nav (`nav.ts` → `NAV_ITEMS`). Active holat
  `routerLinkActive` + `ngClass`. `LayoutService.sidebarCollapsed` bilan yig'iladi.
  `md:` dan pastda yashirin.
- **`ShellTopbar`** — hamburger (sidebar toggle), dark-mode toggle, user menu + chiqish.
- **`LayoutService`** — `sidebarCollapsed` signali.
- Dashboard'ga xos chrome (filial nomi + connection tag + demo tugma) → `DashboardHeader`
  (feature ichida, shell'da emas).

### Dark mode — `ThemeService`

- Holat `signal<'light'|'dark'>`, `localStorage` (`sq_theme`) da saqlanadi.
- Birinchi yuklashda `prefers-color-scheme` ga qaraydi.
- `effect()` `<html>` ga **`data-theme="light|dark"`** atributini (Aurora tokenlar uchun,
  yagona manba) VA `.app-dark` klassini (PrimeNG toast/login uchun) parallel qo'yadi.

---

## 5. Styling — "Aurora Obsidian" + Tailwind v4 + PrimeNG

**Aurora Obsidian dizayn tizimi** (`src/aurora-tokens.css`) — mint-teal + iris + coral-pink
palitrasi, glassmorphism kartalar, neyron-to'r fon. Dark standart; `data-theme="light"`
override qiladi. Barcha ranglar/radiuslar/soyalar CSS custom property (`--accent-a/b/c`,
`--panel-1/2`, `--grad`, `--text/-dim/-mut`, `--r-*`) — bitta atribut butun ilovani qayta bo'yaydi.
Ranglar RGB triplet (`--a-rgb`) sifatida saqlanadi → `rgba(var(--a-rgb), .18)` bilan alfa qo'shiladi.

- **Shriftlar:** Space Grotesk (display + raqamlar), Sora (body), JetBrains Mono (label/mono).
  `index.html`'da Google Fonts, `tailwind.css` `@theme`'da `--font-display/-sans/-mono`.
- **Neyron fon:** `core/layout/neural-background` — 58 nuqta, distansiya bo'yicha bog'lanish,
  tasodifiy impulslar; theme bo'yicha qayta bo'yaladi; `prefers-reduced-motion`'da statik kadr.
  `app-shell`'da router-outlet ortida (+ radial glow + vignette).
- **Animatsiyalar:** `sq-rise` (staggered kirish), `sq-card`/`sq-btn`/`sq-rec` hover, `sq-pulse`/
  `sq-spin` (AI orblar/dotlar), `count-up` (KPI), chart `stroke-dashoffset` draw-in. Hammasi
  `prefers-reduced-motion`'da o'chadi.
- **Forecast** — custom SVG (p-chart o'rniga): smooth line, iris ishonch bandi, pulslovchi peak.
- **Komponentlar** aurora token'larini bevosita `[style]`/inline'da ishlatadi (gradient/var uchun
  Tailwind yetmaydi); layout/spacing Tailwind utility'da qoladi.

---

### PrimeNG bilan aloqasi (eski struktura)

Ikkalasi **bir-birini to'ldiradi**, raqib emas:

- **PrimeNG** — murakkab komponentlar (table, chart, menu, toast, input, button).
- **Tailwind** — layout, spacing, custom kartalar (utility class'lar template'da).

**Sozlash:**

- `src/tailwind.css` — layer tartibi + import + dark variant:
  ```css
  @layer theme, base, primeng, components, utilities;
  @import "tailwindcss";
  @import "tailwindcss-primeui";
  @custom-variant dark (&:where(.app-dark, .app-dark *));
  ```
- `.postcssrc.json` — `@tailwindcss/postcss` plagini.
- `angular.json` styles: `tailwind.css` birinchi.
- Layer tartibi PrimeNG `cssLayer { name: 'primeng', order: 'theme, base, primeng' }`
  bilan mos — Tailwind utility'lari PrimeNG'ni override qila oladi.

**Rang konvensiyasi:**

- Theme-aware fon/matn/border — `surface`/`primary` tokenlari + `dark:` variant:
  `bg-surface-0 dark:bg-surface-900`, `text-surface-500`, `border-surface-200`,
  `bg-primary-50`, `from-primary-500`.
- Status ranglari — Tailwind default palitrasi: `blue/amber/green/violet/red-{50,600}`.

**Qoidalar:**

- **Komponent SCSS yo'q** — hamma stil template'da utility. `:host` uchun
  `host: { class: '...' }` metadata.
- **Dinamik/holatga bog'liq class** — `[ngClass]` variant metodi orqali; base'da
  conflict beruvchi rang qo'yilmaydi (Tailwind'da bir xil xususiyatli 2 class
  tartibga bog'liq bo'ladi).
- **PrimeNG'ni override** — `styleClass` da `!` important (`!bg-primary`).
- **PrimeNG overlaylar** — `providePrimeNG({ overlayAppendTo: 'body' })` global.
  Aks holda popup sticky topbar ichida inline render bo'lib, gorizontal overflow
  hosil qiladi va content'ni siljitadi.

---

## 6. Muhit (Environments)

Hardcode URL yo'q. `angular.json` `fileReplacements` orqali dev/prod ajratiladi.

```ts
// environment.model.ts — umumiy tip (fileReplacements almashtirmaydi)
export interface Environment {
  production: boolean;
  gatewayUrl: string;
  branchId: number;
  pollIntervalMs: number;
  forecastHours: number;
}
```

- `environment.ts` — production (default build).
- `environment.development.ts` — `ng serve` da almashtiriladi.

---

## 7. Routing va Auth

```ts
routes = [
  { path: 'login', → Login },
  { path: '', canActivate: [authGuard], → AppShell, children: [
      { path: '',          → Dashboard },
      { path: 'analytics', data: { title }, → PlaceholderPage },
      { path: 'settings',  data: { title }, → PlaceholderPage },
  ]},
  { path: '**', redirectTo: '' },
];
```

- **`authGuard`** — `AuthService.isAuthenticated()` (signal + expiry) tekshiradi,
  aks holda `/login`.
- **`authInterceptor`** — Bearer token qo'shadi; 401 da logout + login redirect.
- **`AuthService`** — signal-based (`user`, `isAuthenticated` computed),
  token/expiry `localStorage` da.
- **`withComponentInputBinding()`** — route `data.title` to'g'ridan komponent
  `input()` ga bog'lanadi (`PlaceholderPage` misolida).

Barcha route'lar **lazy-load** (`loadComponent`).

---

## 8. `app.config.ts` provayderlari

| Provayder | Vazifa |
| --- | --- |
| `provideZonelessChangeDetection()` | Zoneless (aniq hujjatlash) |
| `provideBrowserGlobalErrorListeners()` | Global xato tutish |
| `provideRouter(routes, withComponentInputBinding(), withViewTransitions({skipInitialTransition:true}), withInMemoryScrolling(...))` | Router + feature'lar |
| `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` | Fetch backend + auth |
| `providePrimeNG({ overlayAppendTo:'body', theme:{ preset:Aura, options:{ darkModeSelector:'.app-dark', cssLayer } } })` | PrimeNG |
| `MessageService` | Toast (NotificationService o'raydi) |

> `@angular/animations` **ishlatilmaydi** — PrimeNG 21 CSS-animatsiyaga o'tgan.

---

## 9. Yangi feature qo'shish (qadamlar)

1. `features/<name>/models/` — DTO + view-model + `index.ts`.
2. `features/<name>/data/<name>-api.ts` — HTTP + mapping (`providedIn: 'root'`).
3. `features/<name>/data/<name>-store.ts` — signal store (`@Injectable()`,
   container `providers` da).
4. `features/<name>/ui/*` — presentational komponentlar (`OnPush`, `input/output`).
5. `features/<name>/<name>.ts` — container.
6. `app.routes.ts` — `AppShell` children'iga `loadComponent` qo'shing.
7. `core/layout/nav.ts` — `NAV_ITEMS` ga sidebar elementi qo'shing.

---

## 10. Buyruqlar

```bash
npm start        # dev server (ng serve)
npm run build    # production build
npm run build -- --configuration development   # dev build (fileReplacements)
```

> **Eslatma:** Dev serverni WSL ichida ishlatib, fayllarni Windows tomonidan
> tahrirlasangiz, HMR o'zgarishlarni ko'rmasligi mumkin (WSL `/mnt/c` inotify
> muammosi). Bunday holda serverni Windows tomonidan qayta ishga tushiring.

---

## 11. Arxitektura tamoyillari (qisqacha)

- **Signal-first** — reaktivlik signal/computed/effect orqali; RxJS faqat data qatlamida.
- **Holat store'da** — komponentlar signal o'qiydi, action chaqiradi; qo'lda `subscribe` yo'q.
- **Smart/dumb ajratish** — container holatni ulaydi, presentational faqat ko'rsatadi.
- **DTO chegarada** — transport formatlar app ichiga oqib kirmaydi.
- **Feature-scoped DI** — store route lifecycle'ga bog'lanadi, tozalash avtomatik.
- **Utility-first styling** — Tailwind layout, PrimeNG komponent; bitta design token tizimi.
- **Konfiguratsiya environmentda** — kodda hardcode qiymat yo'q.
```
