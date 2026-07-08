# FAZA 1 — Umumiy kontrakt va koordinatsiya

> **Uchala chat ham (ML, Gateway, Frontend) ishni boshlashdan oldin shu faylni o'qishi SHART.**
> Bu hujjat — servislararo **yagona haqiqat manbai** (source of truth). Wire-format
> (endpoint shakllari, SignalR hodisalari, JSON kalitlari) shu yerda belgilangan.
> Hech bir chat bu kontraktni **bir tomonlama o'zgartirmaydi** — o'zgartirish kerak bo'lsa,
> avval shu faylni yangilab, keyin uch tomon moslashadi.

---

## 1. Faza 1 maqsadi

Faza 0 demoni **real-vaqt** va **aqlliroq** qilish, **yangi hardware'siz**:
1. **SignalR real-vaqt push** — dashboard polling o'rniga jonli itarish (queue holati, tavsiya, anomaliya).
2. **JIQ marshrutlash** (Join-the-Idle-Queue) — navbatni bo'sh/eng qisqa mos kassaga yo'naltirish tavsiyasi.
3. **EWMA anomaliya aniqlash** — sekin operator, backlog to'planishi, kutilmagan portlashni tutish.

---

## 2. Kim nima qiladi (3 ish oqimi)

| Qism | IDE / chat | Mas'uliyat |
|------|-----------|------------|
| **ML** (`services/ml`) | PyCharm | JIQ algoritmi + EWMA anomaliya + `/anomalies` endpoint + `/recommendations` kengaytmasi |
| **Gateway** (`services/gateway`) | Rider | SignalR hub + background pusher + `/api/anomalies` proxy + JWT-over-WebSocket |
| **Frontend** (`apps/dashboard`) | WebStorm | SignalR client (polling o'rniga), anomaliya paneli, tavsiya turlari kengaytmasi |

Har qism uchun alohida prompt: `FAZA1_ML_PROMPT.md`, `FAZA1_GATEWAY_PROMPT.md`, `FAZA1_FRONTEND_PROMPT.md`.

---

## 3. Integratsiya tartibi va bog'liqlik

```
ML (algoritm + endpoint)  ─┐
                           ├─►  Gateway (proxy + SignalR push)  ─►  Frontend (SignalR client)
Kontrakt (shu fayl)       ─┘
```

- **Parallel ishlash mumkin:** har qism shu kontraktdagi shakllarga qurilsa, mustaqil ishlanadi
  (ML'ni `curl` bilan, Gateway'ni stub bilan, Frontend'ni ishlab turgan Gateway'ga qarshi).
- **Yakuniy integratsiya:** `docker compose up -d --build` bilan uchtasi birga ko'tarilib tekshiriladi.
- **Bog'liqlik:** Frontend SignalR uchun Gateway hub'iga muhtoj; Gateway anomaliya push uchun ML `/anomalies`'ga muhtoj. Shuning uchun **ML → Gateway → Frontend** tartibida yakunlash tavsiya etiladi, lekin kontrakt tayyor bo'lgani uchun parallel ham bo'ladi.

---

## 4. KONTRAKT — SignalR Hub (Gateway hostlaydi)

- **Yo'l:** `/hubs/queue`
- **Auth:** JWT `access_token` query-string orqali (SignalR standarti). Gateway JwtBearer'ni
  hub yo'li uchun query'dan token o'qishga sozlaydi. Token yaroqsiz → ulanish rad etiladi.
- **Client → Server metodlari:**
  | Metod | Argument | Vazifa |
  |-------|----------|--------|
  | `JoinBranch` | `int branchId` | `branch-{id}` guruhiga qo'shilish |
  | `LeaveBranch` | `int branchId` | guruhdan chiqish |
- **Server → Client hodisalari** (payload **camelCase JSON**):
  | Hodisa | Payload | Qachon |
  |--------|---------|--------|
  | `queueStateUpdated` | `BranchState` (§7.1) | har N soniyada (default 4s) + ssenariy o'zgarganda |
  | `recommendationCreated` | `Recommendation` (§7.2) | yangi tavsiya paydo bo'lganda |
  | `anomalyDetected` | `Anomaly` (§7.3) | anomaliya aniqlanganda |

> Gateway'da **background service** har filial guruhiga davriy `queueStateUpdated` yuboradi —
> bu dashboarddagi HTTP pollingni **butunlay almashtiradi**.

---

## 5. KONTRAKT — ML yangi/kengaytirilgan endpointlar (snake_case)

### 5.1 `POST /anomalies` (YANGI)
So'rov:
```json
{ "branch_id": 1, "lookback_hours": 6 }
```
Javob:
```json
{ "branch_id": 1, "anomalies": [ /* Anomaly (snake_case), §7.3 */ ] }
```
Mantiq: oxirgi hodisalar + `forecasts` jadvalidan qoldiqlarni olib, **EWMA control chart**
qo'llaydi (quyida §6.2).

### 5.2 `POST /recommendations` (KENGAYTIRILADI)
So'rovga **`counters`** massivi qo'shiladi (JIQ uchun kassa-daraja holati kerak):
```json
{
  "branch_id": 1,
  "services": [{ "service_type_id": 1, "waiting": 14, "open_counters": 2, "arrivals_per_hour": 45 }],
  "counters": [{ "counter_id": 5, "number": 5, "status": "idle", "supported_service_types": [1,2] }]
}
```
`counters` ixtiyoriy (bo'lmasa eski xatti-harakat). `status`: `serving` | `idle` | `closed`.
JIQ tavsiyalari yangi `action_type = "route_queue"` bilan qaytadi (§7.2).

---

## 6. Algoritmlar (ML)

### 6.1 JIQ — Join-the-Idle-Queue
- Bo'sh (`idle`) kassalar ro'yxatini yurit. Navbatida odam kutayotgan xizmat uchun **mos
  ko'nikmali bo'sh kassa** bo'lsa → o'sha navbatni o'sha kassaga yo'naltirishni tavsiya qil.
- Bir nechta bo'sh mos kassa bo'lsa — eng arzon/eng qisqasi. Skill-based (xizmat turi → mos kassa).
- Tavsiya: `route_queue` — «{X} navbatini {N}-kassaga yo'naltiring (bo'sh)». Foyda: kutish kamayishi (Erlang-C/Little).

### 6.2 EWMA anomaliya (prognoz xatoligi ustida)
- **surge/backlog:** har soatlik qoldiq `z_t = actual − forecast` (forecasts jadvalidan).
  EWMA: `S_t = λ·z_t + (1−λ)·S_{t−1}`, `λ ≈ 0.3`. Nazorat chegarasi
  `±L·σ·√(λ/(2−λ))`, `L ≈ 3`. Chegaradan oshsa signal: musbat → `surge`, kutish o'sib borsa → `backlog`.
- **slow_operator:** kassaning (operator) o'rtacha `service_time_sec` shu xizmat turining
  bazaviy (`service_types.avg_service_time_sec`) qiymatidan sezilarli yuqori bo'lsa → `slow_operator`.
- Har anomaliya `type`, `severity`, o'zbekcha `message`, `metric`/`expected` bilan qaytadi.

---

## 7. Umumiy ma'lumot shakllari (DTO)

> **Casing qoidasi:** ML ↔ Gateway = **snake_case**. Gateway ↔ Frontend = **camelCase**.
> Gateway proxy paytida moslashtiradi (mavjud `MlContracts`/mapping uslubi bilan bir xil).

### 7.1 BranchState (Gateway → Frontend, camelCase)
Faza 0'dagi `GET /api/queue-state` shakli **o'zgarmaydi** — SignalR ham aynan shuni yuboradi.
(`branchId, branchName, scenario, updatedAt, counters[], queues[], avgWaitMin, totalWaiting`).

### 7.2 Recommendation (camelCase; ML snake_case)
Mavjud shakl + yangi `route_queue` action turi:
```
recId, actionType, action, reason, benefit{...}, status, generatedAt
```
`actionType ∈ { open_counter, close_counter, route_queue, reassign_operator }`.
`route_queue` payload: `{ serviceTypeId, toCounterId, toCounterNumber }`.

### 7.3 Anomaly (YANGI)
Frontend (camelCase):
```json
{
  "branchId": 1,
  "type": "slow_operator",         // slow_operator | backlog | surge
  "severity": "warning",           // warning | serious | critical
  "serviceTypeId": 1,              // ixtiyoriy
  "counterId": 3,                  // ixtiyoriy (slow_operator uchun)
  "message": "3-kassa o'rtacha xizmati me'yordan 40% sekin",
  "metric": 6.2,                   // kuzatilgan
  "expected": 4.0,                 // kutilgan
  "detectedAt": "2026-07-08T10:15:00+05:00"
}
```
ML (snake_case): `branch_id, type, severity, service_type_id, counter_id, message, metric, expected, detected_at`.

---

## 8. Gateway yangi endpoint + push

| Metod | Yo'l | Auth | Vazifa |
|-------|------|:----:|--------|
| `GET` | `/api/anomalies?branchId=` | ✔ | ML `/anomalies`'ga proxy |
| WS | `/hubs/queue` | ✔ (query token) | real-vaqt push |

Background pusher: davriy `queueStateUpdated` + tavsiya/anomaliya paydo bo'lganda tegishli
hodisa. Redis backplane (`sq-redis`) — bir nechta instansiyada masshtablash uchun.

---

## 9. Tekshirish strategiyasi (har qism)

- **ML:** `pytest` (JIQ + EWMA unit testlar) + `curl` bilan `/anomalies`, `/recommendations`.
- **Gateway:** `dotnet build` + hub'ga test client ulanib hodisalarni ko'rish (yoki Frontend bilan).
- **Frontend:** `ng build` + brauzerda SignalR ulanishi, anomaliya paneli, real-vaqt yangilanish.
- **Yakuniy (integratsiya):** `docker compose up -d --build` → brauzerda: polling yo'q (Network'da
  WS bor), demo cho'qqi bosilganda holat/tavsiya/anomaliya **jonli** (so'rovsiz) yangilanadi.

---

## 10. Muhim qoidalar (uchala chat uchun)

1. **Kontrakt buzilmaydi** — bu fayldagi shakllarga qat'iy amal qil. O'zgarish kerak bo'lsa shu faylni yangila.
2. **Mavjud uslubga mos** — har servis o'z `ARCHITECTURE.md`'sidagi pattern'ga qat'iy (vertical-slice / signal-store / feature-folder).
3. **API kontrakti orqaga mos** — mavjud endpointlar shakli buzilmaydi (faqat qo'shiladi).
4. **Casing** — ML snake, Frontend camel, Gateway o'rtada moslaydi.
5. **Verifikatsiya majburiy** — build + test + jonli ishga tushirib ko'rish.
6. **Ish tugagach** — o'z `ARCHITECTURE.md`'ni yangila (Faza 1 qo'shildi) va commit qil.
