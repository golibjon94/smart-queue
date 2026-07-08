# FAZA 1 — Gateway (.NET) qismi uchun PROMPT (Rider + Claude)

> **Ishlatish:** Rider'da `services/gateway/` (yoki butun repo) ochib, yangi Claude chat
> oching va quyidagi "PROMPT" blokini to'liq nusxalab yuboring.

---

## PROMPT (nusxalab yuboring)

Sen `smart-queue` loyihasining **.NET 10 Gateway** servisi
(`services/gateway/src/SmartQueue.Gateway`) ustida ishlaysan. Bu tizimning "miyasi" —
yagona kirish nuqtasi (auth, ML proxy, real-vaqt push). Biz **Faza 1**ni bajarmoqdamiz.
Sen **faqat Gateway qismini** qilasan; ML (Python) va Frontend (Angular) alohida chatlarda
parallel ishlanmoqda — **umumiy kontraktga qat'iy amal qil**.

### 1. Avval o'qi (majburiy, shu tartibda)
1. `docs/LOYIHA_HOLATI.md` — loyiha umumiy holati
2. `docs/faza1/FAZA1_UMUMIY.md` — **servislararo kontrakt (yagona haqiqat manbai)**
3. `services/gateway/ARCHITECTURE.md` — Gateway ichki arxitektura (vertical-slice, qatlamlar)
4. Mavjud kod: `Program.cs`, `Extensions/`, `Features/Queue/`, `Features/Recommendations/`,
   `Infrastructure/Ml/`, `Configuration/`

### 2. Vazifalar (Faza 1 — Gateway)

**A. SignalR Hub** — yangi `Features/Realtime/` slice
- `/hubs/queue` hub (FAZA1_UMUMIY §4): `JoinBranch(int)`, `LeaveBranch(int)` metodlari,
  `branch-{id}` guruhlari. Hodisalar: `queueStateUpdated`, `recommendationCreated`, `anomalyDetected`.
- **JWT-over-WebSocket:** hub yo'li uchun `access_token` query-string'dan token o'qishga sozla
  (`JwtBearerOptions.Events.OnMessageReceived`). Yaroqsiz token → ulanish rad.
- Redis backplane: `sq-redis` bilan `AddSignalR().AddStackExchangeRedis(...)` (masshtablash).

**B. Background pusher** — `IHostedService`/`BackgroundService`
- Har faol filial guruhiga davriy (default 4s) `queueStateUpdated` yubor (DemoStateService'dan).
- Bu dashboarddagi HTTP pollingni **almashtiradi** — endi jonli push.
- Ssenariy o'zgarganda / tavsiya paydo bo'lganda tegishli hodisani darhol yubor.

**C. Anomaliya proxy** — `Features/Anomalies/` (yoki mavjud slice'ga)
- `GET /api/anomalies?branchId=` → ML `POST /anomalies`'ga proxy (mavjud `MlClient` uslubi).
- Anomaliyalarni `anomalyDetected` orqali SignalR'ga ham push qil.
- ML snake_case → Frontend camelCase moslashtir (mavjud `MlContracts` mapping uslubi).

**D. `route_queue` tavsiya turi**
- ML endi `route_queue` action turini qaytaradi — Gateway uni Frontend'ga o'zgarishsiz o'tkazsin
  (recommendations proxy allaqachon passthrough bo'lsa, tekshir; payload camelCase bo'lsin).

### 3. Kontrakt (qat'iy)
- SignalR hub shakli, hodisa nomlari va payloadlar **FAZA1_UMUMIY §4, §7, §8**da.
- Frontend'ga **camelCase JSON**. Mavjud `BranchState`/`Recommendation` shakli buzilmaydi.
- `Anomaly` shaklini aynan §7.3 (camelCase) qil.

### 4. Uslub qoidalari
- `ARCHITECTURE.md`'dagi **vertical-slice** pattern: Controller/Hub → Service → Repository.
  Har yangi imkoniyat o'z `Features/<name>/` papkasida.
- **Options pattern** (`IOptions<T>`) yangi sozlamalar uchun (masalan pusher intervali, Redis).
- DI lifetime'lariga e'tibor (hub'lar transient, hosted service singleton). Thread-safety saqla.
- Xato ishlash mavjud `GlobalExceptionHandler` orqali.

### 5. Verifikatsiya
- `dotnet build -c Release` — xatosiz.
- Gateway'ni ishga tushir (`dotnet run --urls http://localhost:5080`).
- Hub'ga test client (yoki Frontend) ulanib `queueStateUpdated` kelishini ko'r.
- ML ishlab turgani holda `GET /api/anomalies?branchId=1` javob bersin.

### 6. Tayyor bo'lish mezoni (DoD)
- [ ] `/hubs/queue` ishlaydi, JWT bilan himoyalangan, guruhlar bo'yicha push qiladi
- [ ] Background pusher davriy `queueStateUpdated` yuboradi (polling o'rnini bosadi)
- [ ] `/api/anomalies` proxy + `anomalyDetected` push ishlaydi
- [ ] `route_queue` tavsiyalar Frontend'ga to'g'ri o'tadi
- [ ] `dotnet build` xatosiz; Redis backplane sozlangan
- [ ] `services/gateway/ARCHITECTURE.md` yangilandi (Faza 1 / Realtime bo'limi)
- [ ] O'zgarishlar commit qilindi

### 7. Boshqa qismlar bilan bog'liqlik
- **Sen muhtojsan:** ML `/anomalies` endpointiga (Anomaliya push uchun). ML tayyor bo'lmasa,
  proxy'ni yozib, ML ko'tarilganda test qil.
- **Sen ta'minlaysan:** `/hubs/queue` + hodisalar → **Frontend** ulanadi.
- **Kontrakt** o'zgarishi kerak bo'lsa — **avval `FAZA1_UMUMIY.md`ni yangila** va menga ayt.

Ishni boshla: fayllarni o'qi, reja tuz, bajar, har bosqichda verifikatsiya qil.
`.env` / docker-compose'ga yangi o'zgaruvchilar (Redis, pusher intervali) kerak bo'lsa qo'sh.
