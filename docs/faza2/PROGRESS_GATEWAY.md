# PROGRESS_GATEWAY — Faza 2 Gateway qismi (bajarildi)

> Qamrov: `services/gateway/src/SmartQueue.Gateway` (.NET 10, vertical-slice). Uch funksiyaning
> Gateway tomoni tayyor. Faza 0-1 endpointlari va SignalR hodisalariga tegilmadi — faqat kengaytirildi.
> ML tomoni `PROGRESS_ML.md` da; Frontend qismi alohida chatda.

## Bajarilgan ishlar

### VAZIFA 1 — What-if simulyatsiya proxy (`POST /api/simulate`) ✅
- `Features/Simulate/` — `SimulateController.cs` + `SimulateContracts.cs` (prompt bo'yicha, service yo'q).
- JWT bilan himoyalangan. Angular **camelCase** yuboradi → Gateway ML **snake_case**'ga o'giradi
  (`Infrastructure/Ml/MlClient.SimulateAsync` + `Ml*` kontraktlar) → javobni yana **camelCase** qilib
  qaytaradi (`SimulateResult`). Side-effektsiz, **DB yozuvi yo'q** (faqat hisob).
- ML yetib bo'lmasa/xato bo'lsa `502 Bad Gateway` + `{error}` (mavjud `ErrorResponse` shakli).

### VAZIFA 2 — QR virtual navbat (lifecycle + SignalR) ✅
- `Features/VirtualQueue/` — `VqController.cs`, `VqService.cs`, `VqRepository.cs`, `VqContracts.cs`,
  `VqRateLimiter.cs`, `VqPositionPusher.cs`.
- **Public endpointlar** (login yo'q, token bilan) — `[AllowAnonymous]` + `[EnableCors("public")]`:
  - `POST /api/vq/join` `{branchId, serviceTypeId}` → token yaratadi, `virtual_tickets`'ga `waiting`
    yozadi, pozitsiya + ETA hisoblaydi.
  - `GET /api/vq/status/{token}` → joriy pozitsiya + ETA + status (qayta hisoblanadi).
  - `POST /api/vq/leave/{token}` → `status='abandoned'`.
- **Menejer endpoint** (JWT): `GET /api/vq/tickets?branchId=` → filialning faol virtual talonlari
  (dashboardda fizik talonlar bilan birga ko'rsatish uchun).
- **Token:** 8-belgi base62, `RandomNumberGenerator` bilan (taxmin qilib bo'lmaydi), DB'da unikal
  (5 martagacha qayta urinish).
- **Pozitsiya hisobi:** `position = fizik_kutayotgan (demo holatidan) + oldingi_virtual_waiting + 1`.
  Virtual + fizik birga sanaladi. `joined_at` bo'yicha tartib.
- **ETA:** ML `POST /eta` orqali (forecast bilan tuzatilgan, §5.5). ML yetib bo'lmasa baza formulasi
  (`position × avg_service_sec / open_counters`) — demo hech qachon buzilmaydi.
- **SignalR:** `QueueHub` kengaytirildi — `JoinTicket(token)`/`LeaveTicket(token)` → `vq-{token}` guruhi.
  Hub avtorizatsiyasi endi **metod darajasida** (`JoinBranch`/`LeaveBranch` — `[Authorize]`; ticket
  metodlari — public). `VqPositionPusher` (BackgroundService, `QueueStatePusher` uslubida, interval
  `PUSHER_INTERVAL_SECONDS`) har N soniyada barcha `waiting` talonlarni qayta hisoblab `vqPositionUpdated`
  push qiladi.
- **Rate limiting:** `VqRateLimiter` (singleton) — IP+filial bo'yicha soniyada 1 `join` (429 aks holda).
- **CORS:** yangi `"public"` siyosati (`AllowAnyOrigin`) public endpointlar uchun — QR veb-sahifasi boshqa
  origin'dan kelsa ham ishlaydi. Standart (dashboard origin + credentials) SignalR uchun o'zgarmadi.

### VAZIFA 3 — Sentiment-feedback (`/api/feedback`) ✅
- `Features/Feedback/` — `FeedbackController.cs`, `FeedbackService.cs`, `FeedbackRepository.cs`,
  `FeedbackContracts.cs`.
- `POST /api/feedback` `{branchId, ticketId?, rating, comment}` — public (`[EnableCors("public")]`).
  `rating` 1..5 validatsiya. Izoh bo'lsa ML `POST /classify-feedback`'ga yuboradi va natijani
  (`sentiment, sentiment_score, topics`) **shu qatorga** yozadi (`feedback_csi`). ML yetib bo'lmasa
  feedback baribir tasnifsiz saqlanadi (sinxron MVP, xato bloklamaydi).
- `GET /api/feedback/summary?branchId=&from=&to=` — JWT. Jamlaydi: sentiment taqsimoti (son + %),
  o'rtacha baho, top mavzular (count bo'yicha), salbiy ulush (`negativeShare`) va **"issiqlik"**
  darajasi (`heat`: green/yellow/red — salbiy ulushi ≥0.5 qizil, ≥0.25 sariq).

## DB migratsiyasi (006)
`db/migrations/006_faza2.sql`:
- `virtual_tickets` jadvali (`token` PK, `ticket_number`, `branch_id`, `service_type_id`, `status`,
  `joined_at`, `updated_at`, `source`) + `(branch_id, service_type_id, status, joined_at)` indeks.
- `feedback_csi`'ga `ADD COLUMN IF NOT EXISTS`: `sentiment`, `sentiment_score`, `topics TEXT[]`
  + `(branch_id, created_at DESC)` indeks.
- `scripts/migrate.ps1` `db/migrations/*.sql`'ni avtomatik globlaydi — 006 o'zgarishsiz ko'rinadi.

## O'zgargan/yangi fayllar
```
db/migrations/006_faza2.sql                              (yangi)
Infrastructure/Ml/MlContracts.cs                         (+Simulate/Eta/Classify snake_case kontraktlar)
Infrastructure/Ml/MlClient.cs                            (+SimulateAsync, EtaAsync, ClassifyFeedbackAsync)
Features/Simulate/SimulateController.cs                  (yangi)
Features/Simulate/SimulateContracts.cs                   (yangi)
Features/VirtualQueue/VqController.cs                    (yangi)
Features/VirtualQueue/VqService.cs                       (yangi)
Features/VirtualQueue/VqRepository.cs                    (yangi)
Features/VirtualQueue/VqContracts.cs                     (yangi)
Features/VirtualQueue/VqRateLimiter.cs                   (yangi)
Features/VirtualQueue/VqPositionPusher.cs                (yangi, BackgroundService)
Features/Feedback/FeedbackController.cs                  (yangi)
Features/Feedback/FeedbackService.cs                     (yangi)
Features/Feedback/FeedbackRepository.cs                  (yangi)
Features/Feedback/FeedbackContracts.cs                   (yangi)
Features/Realtime/RealtimeEvents.cs                      (+VqPositionUpdated)
Features/Realtime/RealtimeNotifier.cs                    (+VqPositionUpdatedAsync)
Features/Realtime/QueueHub.cs                            (+JoinTicket/LeaveTicket, metod-daraja auth)
Extensions/ServiceCollectionExtensions.cs               (DI: repos/servislar/pusher + "public" CORS)
```

## Testlar / tekshiruv holati
`dotnet build` → **0 xato, 0 ogohlantirish**. Gateway lokal ishga tushirilib (`:5090`, real DB `:5433`
+ ML `:8000`) tekshirildi:
- `POST /api/vq/join` → token+pozitsiya+ETA qaytdi; `GET /status/{token}` mos; `POST /leave` → abandoned;
  noma'lum token → 404; ikkinchi tez `join` → **429** (rate limiter ishladi).
- `POST /api/feedback` → yozildi; `GET /summary` → to'g'ri jamladi (heat/taqsimot/%).
- `POST /api/simulate` (JWT) → ML eski image (Faza 2 endpointsiz) tufayli **502 `{error}`** — graceful.
- ETA/sentiment ML yo'qligida baza formulasi / tasnifsiz saqlash bilan **degradatsiya to'g'ri ishladi**.

> **Eslatma:** hozir ishlab turgan `sq-python-ml` va `sq-gateway` konteynerlari **eski (Faza 1) image**.
> To'liq oqim (real simulate natijasi + izoh sentimenti) uchun ML va Gateway konteynerlarini Faza 2
> kodi bilan qayta build qilish kerak. Migratsiya 006 DB'ga qo'llandi va `schema_migrations`'ga yozildi.

## Frontend uchun aniq wire-format (camelCase)

**`POST /api/simulate`** (JWT)
```jsonc
// so'rov
{ "branchId": 1, "serviceTypeId": 2,           // serviceTypeId null -> filial jami
  "scenario": { "openCounters": 6, "arrivalsPerHour": 85, "avgServiceSec": 210 } }  // oxirgi ikkitasi null bo'lishi mumkin
// javob
{ "branchId": 1, "serviceTypeId": 2,
  "baseline": { "openCounters": 4, "avgWaitSec": 1680, "utilization": 0.94, "probWait": 0.82 },
  "scenario": { "openCounters": 6, "avgWaitSec": 540,  "utilization": 0.63, "probWait": 0.31 },
  "delta":    { "waitReductionSec": 1140, "waitReductionPct": 68 } }
```

**`POST /api/vq/join`** (public) → **`{token, ticketNumber, branchId, serviceTypeId, position, etaSec, status}`**
**`GET /api/vq/status/{token}`** (public) → **`{token, ticketNumber, branchId, serviceTypeId, position, etaSec, status}`**
**`POST /api/vq/leave/{token}`** (public) → yuqoridagi shakl, `status="abandoned"`, `position/etaSec = 0`
**`GET /api/vq/tickets?branchId=`** (JWT) → `[{token, ticketNumber, branchId, serviceTypeId, status, joinedAt}]`

**SignalR** `/hubs/queue`:
- Mijoz: ulanadi (token/login shart emas) → `JoinTicket("<token>")` chaqiradi → `vq-<token>` guruhiga kiradi.
- Hodisa `vqPositionUpdated` payload: `{token, ticketNumber, branchId, serviceTypeId, position, etaSec, status}`.
- Menejer (Faza 1 kabi): JWT bilan ulanib `JoinBranch(branchId)` — `queueStateUpdated` va h.k. o'zgarmadi.

**`POST /api/feedback`** (public)
```jsonc
// so'rov
{ "branchId": 1, "ticketId": null, "rating": 2, "comment": "navbat juda uzun edi" }
// javob
{ "feedbackId": 12, "branchId": 1, "rating": 2, "comment": "...",
  "sentiment": "negative", "sentimentScore": 0.88, "topics": ["navbat","kutish"] }
// izoh yo'q yoki ML yetib bo'lmasa: sentiment=null, sentimentScore=null, topics=[]
```

**`GET /api/feedback/summary?branchId=&from=&to=`** (JWT) — `from/to` ixtiyoriy ISO-8601
```jsonc
{ "branchId": 1, "total": 25, "avgRating": 3.2,
  "distribution": { "positive": 6, "negative": 14, "neutral": 5,
                    "positivePct": 24, "negativePct": 56, "neutralPct": 20 },
  "topTopics": [ {"topic": "navbat", "count": 9}, {"topic": "tezlik", "count": 6} ],
  "negativeShare": 0.56, "heat": "red", "from": null, "to": null }
```
