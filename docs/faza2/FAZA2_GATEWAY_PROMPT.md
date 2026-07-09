# FAZA2_GATEWAY_PROMPT.md — Gateway qismi (Rider / .NET)

> **Avval `FAZA2_UMUMIY.md` ni to'liq o'qing** — servislararo kontrakt shu yerda. Bu prompt faqat
> Gateway (`services/gateway`, .NET) qismini bajaradi. Barcha matn/izoh **o'zbekcha** (kirill aralashmasin).

## Kontekst

Sen `smart-queue` Gateway'ida (`services/gateway/src/SmartQueue.Gateway`, .NET, vertical-slice
arxitektura) ishlayapsan. Mavjud: JWT auth, ML proxy (`Infrastructure/Ml/MlClient.cs`), demo holat
(`Features/Queue/DemoStateService.cs`), SignalR hub (`Features/Realtime/QueueHub.cs`, Redis backplane),
anomaliya proxy, audit izi. Faza 2 da 3 funksiyaga Gateway tomonini qo'shasan.

Mavjud uslub: `Features/{Nom}/` papkasi (Controller + Service + Contracts + Repository), Options
pattern, Npgsql raw ADO.NET, `ErrorResponse`/`GlobalExceptionHandler`. Shu uslubga rioya qil.

---

## VAZIFA 1 — What-if simulyatsiya proxy (`/api/simulate`) — BIRINCHI

**Amalga oshirish:**
1. `Features/Simulate/` papka: `SimulateController.cs`, `SimulateContracts.cs`.
2. `POST /api/simulate` — JWT bilan himoyalangan. So'rovni ML `/simulate`'ga uzatadi (`MlClient`
   kengaytiriladi yoki yangi metod), javobni qaytaradi. Shakl `FAZA2_UMUMIY.md §4`.
3. Side-effektsiz — DB yozuvi yo'q, faqat proxy.

**Test/tekshiruv:** `curl` bilan `/api/simulate` to'g'ri javob qaytaradi (ML ishlab turганда).

---

## VAZIFA 2 — QR virtual navbat (lifecycle + SignalR) — ENG KATTA QISM

**Amalga oshirish:**
1. `Features/VirtualQueue/` papka: `VqController.cs`, `VqService.cs`, `VqRepository.cs`, `VqContracts.cs`.
2. **Public endpointlar** (mijoz autentifikatsiyasiz — token bilan), `FAZA2_UMUMIY.md §5.2`:
   - `POST /api/vq/join` `{branchId, serviceTypeId}` → token yaratadi, `virtual_tickets` ga yozadi
     (`status='waiting'`), pozitsiya + ETA hisoblaydi (ETA uchun ML `eta`/hisob), qaytaradi.
   - `GET /api/vq/status/{token}` → joriy pozitsiya + ETA + status.
   - `POST /api/vq/leave/{token}` → `status='abandoned'`.
3. **Token:** qisqa, taxmin qilib bo'lmaydigan (8-belgi base62 yoki qisqa imzolangan token). Public
   endpointlar JWT talab qilmaydi, lekin token to'g'ri bo'lishi shart.
4. **Pozitsiya hisobi:** shu filial+xizmat turidagi `waiting` talonlar orasida `joined_at` bo'yicha
   tartib. Virtual + fizik talonlar birga hisoblanadi (demo holatidan).
5. **SignalR** (`QueueHub` kengaytiriladi): mijoz `vq-{token}` guruhiga qo'shiladi; pozitsiya/ETA
   o'zgarganda `vqPositionUpdated` push. Background pusher (Faza 1 `QueueStatePusher` uslubida)
   virtual navbatni ham yangilaydi.
6. **Rate limiting/abuse:** `join` uchun oddiy himoya (masalan IP/branch bo'yicha soniyada 1) —
   demo uchun yengil, lekin cheksiz talon yaratishning oldini olsin.

**CORS:** mijoz veb-sahifasi (`/q/{token}`) boshqa origin'dan kelishi mumkin — public `/api/vq/*`
uchun CORS to'g'ri sozlansin.

**Test/tekshiruv:** join → status → leave oqimi `curl` bilan; SignalR `vqPositionUpdated` keladi.

---

## VAZIFA 3 — Sentiment-feedback (`/api/feedback`)

**Amalga oshirish:**
1. `Features/Feedback/` papka: `FeedbackController.cs`, `FeedbackService.cs`, `FeedbackRepository.cs`,
   `FeedbackContracts.cs`.
2. `POST /api/feedback` `{branchId, ticketId?, rating, comment}` — `feedback_csi` ga yozadi. Agar
   `comment` bo'lsa, ML `/classify-feedback`'ga yuboradi, natijani (`sentiment, score, topics`) o'sha
   qatorga yozadi. Public yoki token (mijoz qoldiradi).
3. `GET /api/feedback/summary?branchId=&from=&to=` — JWT bilan. Filial bo'yicha: sentiment taqsimoti
   (%), top mavzular (count bo'yicha), "issiqlik" darajasi (salbiy ulushiga qarab). Shakl §6.
4. ML tasniflash sinxron bo'lishi shart emas — MVP'da sinxron oddiy; keyin navbatga (queue) ko'chsa bo'ladi.

**Test/tekshiruv:** feedback yoziladi va tasniflanadi; summary to'g'ri jamlaydi.

---

## DB migratsiyasi (006)

`db/migrations/006_faza2.sql` yarat (`FAZA2_UMUMIY.md §7`):
- `virtual_tickets` jadvali (token PK, status, joined_at, source).
- `feedback_csi` ga `sentiment`, `sentiment_score`, `topics` ustunlari (`ADD COLUMN IF NOT EXISTS`).
- Migratsiya skripti (`scripts/migrate.ps1`) 006 ni ko'rsin.

---

## Umumiy talablar

- Vertical-slice uslubi: har funksiya `Features/{Nom}/` da.
- Options pattern konfiguratsiya uchun; ML URL mavjud `MlServiceOptions` dan.
- Faza 1 endpointlari va hub hodisalariga tegma — faqat kengaytir.
- Xato boshqaruvi mavjud `GlobalExceptionHandler` orqali.
- Barcha matn/izoh o'zbekcha.

## Yakunda

`docs/faza2/PROGRESS_GATEWAY.md` yoz: endpointlar, SignalR hodisalari, DB o'zgarishi, testlar,
Frontend uchun aniq wire-format eslatmasi. Keyin yangi chatda Frontend qismi.
