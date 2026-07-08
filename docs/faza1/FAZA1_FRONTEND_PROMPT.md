# FAZA 1 — Frontend (Angular) qismi uchun PROMPT (WebStorm + Claude)

> **Ishlatish:** WebStorm'da `apps/dashboard/` ochib, yangi Claude chat oching va quyidagi
> "PROMPT" blokini to'liq nusxalab yuboring.

---

## PROMPT (nusxalab yuboring)

Sen `smart-queue` loyihasining **Angular 22 dashboard** (`apps/dashboard/`) ustida ishlaysan.
Bu tizimning "yuzi" — professional boshqaruv paneli (PrimeNG + Tailwind, zoneless, signals).
Biz **Faza 1**ni bajarmoqdamiz. Sen **faqat Frontend qismini** qilasan; ML (Python) va
Gateway (.NET) alohida chatlarda parallel ishlanmoqda — **umumiy kontraktga qat'iy amal qil**.

### 1. Avval o'qi (majburiy, shu tartibda)
1. `docs/LOYIHA_HOLATI.md` — loyiha umumiy holati
2. `docs/faza1/FAZA1_UMUMIY.md` — **servislararo kontrakt (yagona haqiqat manbai)**
3. `apps/dashboard/ARCHITECTURE.md` — Frontend ichki arxitektura (signal store, layout, styling)
4. Mavjud kod: `features/dashboard/data/dashboard-store.ts` (**polling shu yerda**),
   `features/dashboard/data/dashboard-api.ts`, `core/auth/`, `features/dashboard/ui/`

### 2. Vazifalar (Faza 1 — Frontend)

**A. SignalR client** — yangi `core/realtime/realtime.service.ts`
- `@microsoft/signalr` paketini o'rnat (`--legacy-peer-deps` bilan, PrimeNG21/Angular22 sababli).
- Gateway hub'iga ulan: `/hubs/queue` + JWT `access_token` query (FAZA1_UMUMIY §4).
- `JoinBranch(branchId)` chaqir; `queueStateUpdated`, `recommendationCreated`, `anomalyDetected`
  hodisalarini **signal**larga o'tkaz (zoneless, OnPush bilan mos).
- Ulanish uzilsa avtomatik qayta ulanish (`withAutomaticReconnect`).

**B. Polling → real-vaqt** — `dashboard-store.ts`
- Mavjud `timer(...).pipe(switchMap...)` HTTP pollingni **olib tashla**, o'rniga `RealtimeService`
  signallariga ulan (queue holati endi push orqali keladi).
- Boshlang'ich yuklash uchun bir martalik HTTP so'rov qolishi mumkin (initial state), keyin push.
- Ssenariy toggle / tavsiya qabul-rad mantiqi saqlanadi.

**C. Anomaliya paneli** — yangi `features/dashboard/ui/anomalies-panel/`
- `anomalyDetected` push'idan kelgan anomaliyalarni ko'rsat (PrimeNG `Message`/`Tag`,
  severity ranglari: warning/serious/critical). Turlar: sekin operator, backlog, portlash.
- `Anomaly` shakli — FAZA1_UMUMIY §7.3 (camelCase).

**D. `route_queue` tavsiya turi** — `recommendations-panel` + models
- Yangi `actionType = "route_queue"` tavsiyalarini to'g'ri ko'rsat (ikonka/matn: «navbatni
  N-kassaga yo'naltiring»). `recommendation.model.ts` DTO→view-model mapping'ni kengaytir.

### 3. Kontrakt (qat'iy)
- Hub yo'li, hodisa nomlari, payload shakllari **FAZA1_UMUMIY §4, §7**da. Keladigan JSON **camelCase**.
- `BranchState` shakli o'zgarmaydi (SignalR ham aynan shuni yuboradi) — mavjud model qayta ishlatiladi.

### 4. Uslub qoidalari
- `ARCHITECTURE.md`'dagi pattern: **signal-first**, holat store'da, smart/dumb ajratish,
  DTO chegarada, presentational komponentlar `OnPush` + `input()/output()`.
- **Zoneless** — RxJS faqat data/realtime qatlamida; UI signal'lar bilan.
- Styling: Tailwind utility + PrimeNG; komponent SCSS yo'q; dark-mode `dark:` variantlari bilan.
- `environment.model.ts`'ga kerak bo'lsa `hubUrl` qo'sh (hardcode qilma).

### 5. Verifikatsiya
- `ng build` — xatosiz.
- Gateway + ML ishlab turgan holda `ng serve` (yoki Docker) → brauzerda:
  - Network tab'da **WebSocket** ulanishi bor, takroriy HTTP polling **yo'q**.
  - "Demo: tushlik cho'qqisi" bosilganda holat/tavsiya/anomaliya **jonli** (so'rovsiz) yangilanadi.
  - Anomaliya paneli signal kelganda ko'rinadi.

### 6. Tayyor bo'lish mezoni (DoD)
- [ ] SignalR ulanishi ishlaydi (JWT bilan), qayta ulanish bor
- [ ] Polling olib tashlangan, queue holati push orqali yangilanadi
- [ ] Anomaliya paneli push'dan ishlaydi
- [ ] `route_queue` tavsiyalar to'g'ri ko'rinadi
- [ ] `ng build` xatosiz; professional ko'rinish saqlangan
- [ ] `apps/dashboard/ARCHITECTURE.md` yangilandi (Faza 1 / realtime bo'limi)
- [ ] O'zgarishlar commit qilindi

### 7. Boshqa qismlar bilan bog'liqlik
- **Sen muhtojsan:** Gateway `/hubs/queue` hub'iga (real-vaqt) va `route_queue`/`anomaly`
  ma'lumotlariga. Gateway tayyor bo'lmasa, mavjud HTTP endpointlarga qarshi qismini yozib,
  hub ulanishini Gateway ko'tarilganda test qil.
- **Kontrakt** o'zgarishi kerak bo'lsa — **avval `FAZA1_UMUMIY.md`ni yangila** va menga ayt.

Ishni boshla: fayllarni o'qi, reja tuz, bajar, har bosqichda verifikatsiya qil.
Autentifikatsiya interceptor'i HTTP uchun; SignalR uchun token'ni query orqali uzat.
