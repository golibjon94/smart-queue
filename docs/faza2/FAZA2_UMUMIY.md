# FAZA 2 — Umumiy Kontrakt va Koordinatsiya (Demo Kuchaytirish Paketi)

> **Uchala chat ham (ML, Gateway, Frontend) ishni boshlashdan oldin shu faylni o'qishi SHART.**
> Bu hujjat — servislararo **yagona haqiqat manbai** (source of truth). Wire-format
> (endpoint shakllari, SignalR hodisalari, JSON kalitlari) shu yerda belgilangan.
> Faza 1 kontrakti (`faza1/FAZA1_UMUMIY.md`) kuchida qoladi — bu uni **kengaytiradi**, buzmaydi.

---

## 1. Faza 2 maqsadi

Mavjud demoni sotuv muzokarasi uchun **"wow"** darajaga ko'tarish. Dunyo bozori tadqiqotidan
tanlangan **3 ta yuqori ta'sirli, apparatsiz (software-only)** funksiya qo'shiladi:

1. **What-if simulyatsiya** — menejer "yana 1 kassa ochsam?" slayderini suradi, kutish vaqti
   real-vaqtda X→Y ga o'zgaradi (Erlang-C yadrosidan). *Eng oson, yadro tayyor.*
2. **QR virtual navbat + jonli ETA** — mijoz telefonda QR skanlab masofadan navbatga qo'shiladi,
   "Siz 4-o'rindasiz, ~7 daqiqa" jonli yangilanadi (SignalR + forecast-ETA). *Eng ko'p yangi qism.*
3. **O'zbekcha sentiment-feedback** — mijoz baho + izoh qoldiradi; izohlar sentiment (ijobiy/salbiy/
   neytral) va mavzu (navbat/xodim/tezlik...) bo'yicha tasniflanadi; muammoli filial "qizil". *NLP
   provayder (Muxlisa/Aisha) keyin ulanadi — MVP'da qoida-asosli fallback.*

**Tamoyillar (Faza 0-1 dan meros, o'zgarmaydi):**
- API-birinchi: "miya" (ML) "yuz"dan (Angular) ajratilgan.
- Advisory: tizim tavsiya beradi, qaror menejerники.
- Apparatsiz: yangi qurilma **yo'q**; QR — oddiy veb-sahifa (ilova shart emas).
- Mock-birinchi: hammasi sintetik ma'lumotda ishlaydi, real data so'ralmaydi.

---

## 2. Kim nima qiladi (3 ish oqimi)

| Qism | IDE / chat | Mas'uliyat (3 funksiya bo'yicha) |
|------|-----------|----------------------------------|
| **ML** (`services/ml`) | PyCharm | What-if: `/simulate` endpoint (Erlang-C ssenariy hisobi). QR: ETA hisoblash (forecast + navbat holati). Sentiment: qoida-asosli tasniflagich + provayder-adapter interfeysi |
| **Gateway** (`services/gateway`) | Rider | What-if: `/api/simulate` proxy. QR: virtual-ticket lifecycle (`/api/vq/*`), QR token, SignalR `vqPositionUpdated`. Sentiment: `/api/feedback` yozish/o'qish, ML tasniflagichga proxy |
| **Frontend** (`apps/dashboard`) | WebStorm | What-if: slayder paneli. QR: mijoz veb-sahifasi (`/q/{token}`) + jonli pozitsiya. Sentiment: feedback dashboard paneli + filial "issiqlik" ko'rsatkichi |

Har qism uchun alohida prompt: `FAZA2_ML_PROMPT.md`, `FAZA2_GATEWAY_PROMPT.md`, `FAZA2_FRONTEND_PROMPT.md`.

---

## 3. Integratsiya tartibi

```
ML (endpointlar + algoritm)  ─┐
                              ├─► Gateway (proxy + lifecycle + SignalR) ─► Frontend (UI)
Kontrakt (shu fayl)          ─┘
```

**Tavsiya etilgan ketma-ketlik (osondan murakkabga):**
1. **What-if** (ML `/simulate` → Gateway proxy → slayder UI) — bir kunlik, yadro tayyor.
2. **QR virtual navbat** (ML ETA → Gateway lifecycle+SignalR → mijoz sahifasi) — eng katta qism.
3. **Sentiment** (ML tasniflagich → Gateway feedback → dashboard panel) — NLP keyin ulanadi.

Har funksiya mustaqil — biri tugamay ikkinchisi boshlanishi mumkin, chunki kontrakt tayyor.

---

## 4. KONTRAKT — What-if simulyatsiya

**Endpoint (ML):** `POST /simulate`
```jsonc
// So'rov
{
  "branch_id": 1,
  "service_type_id": 2,        // null -> filial jami
  "scenario": {
    "open_counters": 6,        // menejer slayderda tanlagan kassa soni
    "arrivals_per_hour": 85,   // null -> joriy forecast'dan olinadi
    "avg_service_sec": 210     // null -> tarixiy o'rtachadan
  }
}
// Javob
{
  "branch_id": 1,
  "service_type_id": 2,
  "baseline": {                // joriy holat (o'zgartirishsiz)
    "open_counters": 4,
    "avg_wait_sec": 1680,      // ~28 daq
    "utilization": 0.94,
    "prob_wait": 0.82
  },
  "scenario": {                // slayder qiymati bilan
    "open_counters": 6,
    "avg_wait_sec": 540,       // ~9 daq
    "utilization": 0.63,
    "prob_wait": 0.31
  },
  "delta": {
    "wait_reduction_sec": 1140, // ~19 daq kamayish
    "wait_reduction_pct": 68
  }
}
```

**Gateway:** `POST /api/simulate` — ML `/simulate`'ga proxy, JWT bilan himoyalangan.
Yangi apparat/DB yozuvi yo'q — bu faqat hisob (read-only, side-effektsiz).

---

## 5. KONTRAKT — QR Virtual Navbat

### 5.1 Lifecycle (holat mashinasi)
```
[QR skan] -> issued -> waiting -> called -> serving -> completed
                          │
                          └-> abandoned (mijoz "chiqaman" bossa yoki timeout)
```

### 5.2 Endpointlar (Gateway hostlaydi — mijoz autentifikatsiyasiz, token bilan)
| Endpoint | Metod | Auth | Vazifa |
|----------|-------|------|--------|
| `/api/vq/join` | POST | Yo'q (public) | Yangi virtual talon: `{branchId, serviceTypeId}` → `{token, ticketNumber, position, etaSec}` |
| `/api/vq/status/{token}` | GET | Token | Joriy holat: `{position, etaSec, status}` |
| `/api/vq/leave/{token}` | POST | Token | Mijoz navbatdan chiqadi → `abandoned` |

> **Token:** qisqa, taxmin qilib bo'lmaydigan (masalan 8-belgi base62 yoki qisqa JWT).
> Mijoz sahifasi `/q/{token}` — token orqali kiradi, login yo'q.

### 5.3 QR oqimi
```
Kiosk/tablo/plakatda QR -> /q/join?branch=1&service=2 (veb-sahifa)
  -> mijoz xizmat turini tasdiqlaydi -> /api/vq/join -> token oladi
  -> /q/{token} sahifasi: jonli pozitsiya + ETA (SignalR)
```

### 5.4 SignalR (Faza 1 hub'ini kengaytiradi — `/hubs/queue`)
| Hodisa | Payload | Qachon |
|--------|---------|--------|
| `vqPositionUpdated` | `{token, position, etaSec, status}` | Mijozning navbatdagi o'rni yoki ETA o'zgarganda |

Mijoz sahifasi `token` bo'yicha guruhga (`vq-{token}`) obuna bo'ladi. Menejer dashboardida
virtual va fizik talonlar birga ko'rinadi (virtual — belgi bilan).

### 5.5 ETA hisoblash (ML)
`etaSec = position × (avg_service_sec / open_counters)`, lekin **forecast bilan tuzatilgan**:
agar keyingi soatda kelish tezligi oshsa (peak yaqin), ETA konservativ oshiriladi. Bu bizning
LightGBM ustunligimiz — raqiblar oddiy o'rtacha ishlatadi, biz forecast'ni qo'shamiz.

---

## 6. KONTRAKT — O'zbekcha Sentiment-Feedback

### 6.1 Endpointlar
| Endpoint | Metod | Auth | Vazifa |
|----------|-------|------|--------|
| `/api/feedback` | POST | Token/public | Baho + izoh: `{branchId, ticketId?, rating, comment}` |
| `/api/feedback/summary` | GET | JWT | Filial bo'yicha jamlanma: sentiment taqsimoti, top mavzular, "issiqlik" |

### 6.2 ML tasniflash (`POST /classify-feedback`)
```jsonc
// So'rov
{ "comments": ["navbat juda uzun edi", "rahmat, tez xizmat"] }
// Javob
{
  "results": [
    {"sentiment": "negative", "score": 0.88, "topics": ["navbat", "kutish"]},
    {"sentiment": "positive", "score": 0.91, "topics": ["tezlik"]}
  ]
}
```

### 6.3 NLP provayder strategiyasi (MUHIM)
- **Interfeys-birinchi:** `SentimentProvider` abstrakt interfeysi (`classify(text) -> result`).
- **MVP fallback:** qoida-asosli tasniflagich — o'zbek/rus kalit-so'z leksikoni (ijobiy: "rahmat,
  zo'r, tez, yaxshi"; salbiy: "sekin, uzun, qo'pol, kutdim, yomon") + mavzu kalit-so'zlari.
  Demo uchun **yetarli**, tashqi API'ga bog'liq emas.
- **Keyin ulanadi:** Muxlisa AI yoki Aisha AI adapteri — xuddi shu interfeysni implement qiladi.
  Faqat adapter almashadi, qolgan kod tegilmaydi. **NLP provayder tanlovi bloklamaydi.**

### 6.4 Dashboard
- Filial bo'yicha sentiment taqsimoti (ijobiy/salbiy/neytral %).
- Top salbiy mavzular ("sekin xizmat 40%, uzun navbat 25%").
- Filial "issiqlik xaritasi": ko'p salbiy → qizil, ijobiy → yashil.
- iQueue CSI'dan ustunlik: u faqat ball; biz **sabab va mavzuni** ko'rsatamiz.

---

## 7. DB o'zgarishlari (migratsiya 006)

Faza 2 uchun yangi jadvallar (mavjud sxemaga qo'shiladi, `source` uslubi saqlanadi):
```sql
-- Virtual navbat talonlari
CREATE TABLE virtual_tickets (
  token          TEXT PRIMARY KEY,
  ticket_number  TEXT NOT NULL,
  branch_id      INT NOT NULL,
  service_type_id INT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'waiting',  -- waiting|called|serving|completed|abandoned
  joined_at      TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  source         TEXT DEFAULT 'synthetic'
);

-- Feedback (mavjud feedback_csi kengaytiriladi yoki yangi)
ALTER TABLE feedback_csi
  ADD COLUMN IF NOT EXISTS sentiment TEXT,           -- positive|negative|neutral
  ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC,
  ADD COLUMN IF NOT EXISTS topics TEXT[];
```

> Simulyatsiya (what-if) uchun DB yozuvi **kerak emas** — u faqat hisob.

---

## 8. Demo bog'lanishi

Bu 3 funksiya `docs/DEMO_SCENARIO.md`'ga yangi qadamlar qo'shadi:
- **What-if:** menejer slayderni suradi → kutish X→Y jonli o'zgaradi (kulminatsiyadan keyin).
- **QR:** taqdimotchi telefonда QR skanlaydi → navbatga qo'shiladi → ekranda pozitsiya jonli.
- **Sentiment:** salbiy izoh kiritiladi → filial "qizil"ga o'tadi → top mavzu ko'rinadi.

Demo ssenariysi alohida yangilanadi (`DEMO_SCENARIO.md` v2).

---

## 9. Nima o'zgarmaydi (barqarorlik)

- Faza 1 endpointlari va SignalR hodisalari — **tegilmaydi**.
- Mavjud forecast/recommendation/anomaly oqimi — **tegilmaydi**.
- API kontrakti orqaga mos (backward compatible).
- Barcha yangi matn/UI **o'zbekcha** (kirill aralashmasin).
