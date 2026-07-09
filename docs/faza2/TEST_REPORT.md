# FAZA 2 — To'liq Test Hisoboti (E2E)

> Sana: 2026-07-09 · Branch: `feature/faza2-demo-boost` · Muhit: Docker Compose (lokal)
> Qamrov: uchala funksiya (What-if · QR virtual navbat · Sentiment) uchidan-uchiga (ML ↔ Gateway ↔ Angular)
> tekshirildi — kodda, API'da, DB'da va real brauzerda.

## Xulosa

**Natija: ✅ HAMMASI ISHLAYDI.** Faza 2 ning uchala funksiyasi uchala qatlamda to'g'ri ishlaydi.
Test paytida **1 ta deploy xatosi** topildi va tuzatildi (Dockerfile — quyida). Faza 0-1 oqimlari
tegilmagan (backward compatible).

---

## 0. Topilgan va tuzatilgan xato

| # | Xato | Ta'sir | Tuzatish | Commit |
|---|------|--------|----------|--------|
| 1 | `services/ml/Dockerfile` yangi `sentiment/` paketini `COPY` qilmagan | ML konteyner ishga tushishda `ModuleNotFoundError: No module named 'sentiment'` → restart loop | `COPY sentiment ./sentiment` qo'shildi | `04f1cdd fix(ml)` |

> Kontekst: stack `-Build`siz ko'tarilgani uchun eski Faza 1 image'lar ishlab turgan edi.
> Uchala servis Faza 2 kodi bilan qayta qurildi (`docker compose build python-ml dotnet-gateway angular-nginx`).

---

## 1. Migratsiyalar — ✅ to'g'ri

`schema_migrations` jadvalidan (6/6 tartibda qo'llanilgan):
```
001_reference_tables.sql          2026-07-09 12:37
002_queue_events_hypertable.sql   2026-07-09 12:37
003_continuous_aggregates.sql     2026-07-09 12:37
004_forecasts_recommendations.sql 2026-07-09 12:37
005_users.sql                     2026-07-09 12:37
006_faza2.sql                     2026-07-09 14:26
```
`006_faza2.sql` natijasi kontrakt (§7) bilan aynan mos:
- `virtual_tickets` (token PK, ticket_number, branch_id, service_type_id, status, joined_at, updated_at, source)
- `feedback_csi` + ustunlar: `sentiment`, `sentiment_score`, `topics TEXT[]`

---

## 2. Kod / build darajasida — ✅

| Tekshiruv | Buyruq | Natija |
|-----------|--------|--------|
| ML unit testlar | `pytest tests/ -q` | **45 passed** (21 tasi Faza 2) |
| Gateway build | `dotnet build -c Release` | **0 xato, 0 ogohlantirish** |
| Dashboard build | Docker `angular-nginx` image | **muvaffaqiyatli** |
| ML endpoint ro'yxati | `GET /openapi.json` | `/simulate`, `/eta`, `/classify-feedback` mavjud |
| Gateway sog'liq | `GET /health` | `{status:ok, db:ok, ml:ok}` |

---

## 3. API (uchidan-uchiga, real natijalar) — ✅

### 3.1 What-if simulyatsiya
- **ML `POST /simulate`** (`branch 1 / service 2 / 6 kassa`) → `baseline{open:2, wait:3600(cap), util:2.48}`,
  `scenario{open:6, wait:115, util:0.83}`, `delta{−3485s, 97%}`.
- **Gateway `POST /api/simulate`** (JWT) → aynan shu natija, **camelCase** konversiya to'g'ri
  (`avgWaitSec`, `waitReductionPct`).

### 3.2 QR virtual navbat (lifecycle)
| Qadam | So'rov | Natija |
|-------|--------|--------|
| join | `POST /api/vq/join {branchId:1,serviceTypeId:2}` | `token, V002, position:7, etaSec:1050, waiting` ✅ |
| status | `GET /api/vq/status/{token}` | jonli qayta hisoblandi (`position:6, etaSec:900`) ✅ |
| tickets | `GET /api/vq/tickets?branchId=1` (JWT) | faol virtual talon ro'yxati ✅ |
| leave | `POST /api/vq/leave/{token}` | `status=abandoned, position:0, etaSec:0` ✅ |
| noma'lum token | `GET /status/zzzzzzzz` | **404** ✅ |
| rate-limit | 2 ta tez ketma-ket `join` | 1-chi OK, 2-chi **429** ✅ |

- **ML `POST /eta`** (forecast peak tuzatishi): `base 280s → eta 420s, factor 1.5` ✅

### 3.3 Sentiment-feedback
- **`POST /api/feedback`** (salbiy) → `negative / 0.88 / [navbat, tezlik]` ✅
- **`POST /api/feedback`** (ijobiy) → `positive / 0.97 / [tezlik]` ✅
- **`GET /api/feedback/summary`** (JWT) → `total, avgRating, distribution(%), topTopics, negativeShare, heat` to'g'ri
  jamlandi (`heat=yellow` da negativeShare 0.33) ✅
- **ML `POST /classify-feedback`** (3 izoh) → negative/positive/neutral + mavzular to'g'ri ✅

---

## 4. Brauzerda (real Chrome) — ✅

| # | Ssenariy | Kuzatilgan natija |
|---|----------|-------------------|
| 1 | **What-if slayder** (dashboard) | 5→2 kassa da "~1 daq → ~60 daq", qizil delta "59 daqiqa oshadi" jonli o'zgardi |
| 2 | **QR paneli** | QR kod + havola (`/q/join?branch=1&service=1&label=To'lovlar`) generatsiya bo'ldi |
| 3 | **Menejer virtual talonlar paneli** | V003 talon "VIRTUAL" belgisi + "kutmoqda" bilan ko'rindi |
| 4 | **Feedback paneli (UI'dan izoh)** | salbiy izoh → toast "navbat, xodim, tezlik"; panel **jonli** yangilandi: badge **"E'tibor"(sariq) → "Muammoli"(qizil)**, Salbiy 50%, o'rtacha 2.8, top mavzular yangilandi |
| 5 | **Public `/q/join`** (loginsiz) | mobil karta, "Xizmat turi: Pul o'tkazmalari" query param'dan to'g'ri; "Navbatga qo'shilish" → talon sahifasi (**V004, 6-o'rin, ~15 daq**) |
| 6 | **SignalR jonli yangilanish** | pozitsiya **6→11**, ETA **~15→~28 daq** avtomatik yangilandi (polling'siz) |
| 7 | **Navbatdan chiqish** | "Siz navbatdan chiqdingiz" ekrani (abandoned) |

**Tarmoq/konsol:** SignalR `negotiate` → 200, public CORS preflight → 204, `GET /api/vq/status` → 200.
Ilova konsolida **xato yo'q** (faqat brauzer-kengaytma xabarlari).

---

## 5. Commitlar (branch `feature/faza2-demo-boost`)

```
04f1cdd fix(ml): copy sentiment package into Docker image      # test paytida topilgan xato
ed680dc feat(dashboard): Phase 2 what-if, virtual queue, feedback UI
38ce69c feat(gateway): Phase 2 simulate proxy, virtual queue, feedback
939df27 feat(ml): Phase 2 what-if simulation, QR ETA, sentiment classification
```
Barchasi `origin/feature/faza2-demo-boost` ga push qilingan.

---

## 6. Keyingi qadamlar (ixtiyoriy)

- `docs/DEMO_SCENARIO.md` v2 — 3 yangi qadam (what-if · QR · sentiment) qo'shish.
- `feature/faza2-demo-boost` → `main` uchun PR ochish.
- NLP provayder (Muxlisa/Aisha) API kaliti kelганда — faqat `SENTIMENT_PROVIDER` almashadi, kod tegilmaydi.
