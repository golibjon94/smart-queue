# FAZA2_ML_PROMPT.md — ML qismi (PyCharm / Python)

> **Avval `FAZA2_UMUMIY.md` ni to'liq o'qing** — u servislararo kontrakt (endpoint shakllari,
> JSON kalitlari). Bu prompt faqat ML (`services/ml`) qismini bajaradi. Barcha kod izohlari va
> chiqishlar **o'zbekcha** (kirill aralashmasin).

## Kontekst

Sen `smart-queue` loyihasining ML servisida (`services/ml`, Python 3.11 + FastAPI) ishlayapsan.
Mavjud: sintetik generator, LightGBM forecast, Erlang-C (`recommend/erlang.py`: `avg_wait_sec`,
`required_counters`, `erlang_c`), JIQ tavsiya dvigateli, EWMA anomaliya. Faza 2 da 3 funksiyaga
ML tomonini qo'shasan: **what-if simulyatsiya**, **QR ETA hisoblash**, **sentiment tasniflash**.

Mavjud kod uslubi: `from __future__ import annotations`, Pydantic schemas (`app/schemas/models.py`),
router (`app/api/routes.py`), toza funksiyalar, pytest testlar (`tests/`). Shu uslubga rioya qil.

---

## VAZIFA 1 — What-if simulyatsiya (`/simulate`) — BIRINCHI, ENG OSON

**Maqsad:** menejer "kassa sonini o'zgartirsam kutish qanday o'zgaradi?" degan savolga aniq raqam.

**Amalga oshirish:**
1. `recommend/simulate.py` yarat. Erlang-C (`avg_wait_sec`, `erlang_c`) allaqachon bor — qayta yozma, import qil.
2. Funksiya: `simulate_scenario(lam, mu, baseline_counters, scenario_counters) -> dict` — baseline va
   scenario uchun `avg_wait_sec`, utilization (`a/c`), `prob_wait` (`erlang_c`) hisoblab, delta qaytaradi.
3. `lam` (kelish/sek) forecast'dan yoki so'rovdagi `arrivals_per_hour`dan; `mu = 1/avg_service_sec`.
4. Pydantic modellar (`SimulateRequest`, `SimulateResponse`) `app/schemas/models.py` ga — shakl
   aynan `FAZA2_UMUMIY.md §4` dagidek (baseline/scenario/delta).
5. Router: `POST /simulate` (`app/api/routes.py`).

**Muhim:** bu side-effektsiz, DB yozuvsiz — faqat hisob. To'yingan tizimda (`rho>=1`) `avg_wait_sec`
`inf` qaytaradi — buni katta lekin chekli songa (masalan `WAIT_CAP_SEC`) cheklab, UI buzilmasin.

**Test (`tests/test_simulate.py`):** kassa oshsa kutish kamayadi (monotonlik); `rho>=1` da inf
cheklanadi; delta to'g'ri hisoblanadi.

---

## VAZIFA 2 — QR virtual navbat uchun ETA hisoblash

**Maqsad:** virtual talonning navbatdagi o'rniga ko'ra kutish vaqti (ETA), forecast bilan tuzatilgan.

**Amalga oshirish:**
1. `recommend/eta.py` yarat. Funksiya: `estimate_eta(position, avg_service_sec, open_counters,
   arrivals_next_hour=None) -> int` (sekundlarda).
2. Baza: `eta = position × avg_service_sec / max(open_counters, 1)`.
3. **Forecast tuzatishi (bizning ustunlik):** agar `arrivals_next_hour` joriy xizmat quvvatidan
   (`open_counters × 3600/avg_service_sec`) yuqori bo'lsa — peak yaqinlashmoqda, ETA'ni koeffitsiyent
   bilan oshir (masalan `min(1.5, arrivals/capacity)`). Sabab: peak'da navbat sekinroq eriydi.
4. Endpoint shart emas — Gateway `/api/vq/*` da chaqiradi; lekin ML'da toza funksiya + test bo'lsin.
   (Agar arxitektura ML-endpoint talab qilsa: `POST /eta`.)

**Test (`tests/test_eta.py`):** position oshsa ETA oshadi; peak'da ETA baza'dan katta; open_counters
oshsa ETA kamayadi.

---

## VAZIFA 3 — Sentiment tasniflash (`/classify-feedback`)

**Maqsad:** o'zbekcha izohlarni sentiment + mavzu bo'yicha tasniflash. NLP provayder (Muxlisa/Aisha)
**keyin** ulanadi — hozir qoida-asosli fallback, lekin **almashtiriladigan interfeys** bilan.

**Amalga oshirish:**
1. `sentiment/` papka yarat: `provider.py` (abstrakt interfeys), `rule_based.py` (fallback),
   `__init__.py` (factory — config'ga qarab provayder tanlaydi).
2. **Interfeys** (`provider.py`): `class SentimentProvider(ABC)` → `classify(text: str) -> dict`
   (`{sentiment, score, topics}`).
3. **Qoida-asosli** (`rule_based.py`): o'zbek/rus kalit-so'z leksikoni.
   - Salbiy: "sekin, uzun, kutdim, qo'pol, yomon, muammo, xafa, navbat katta, kech, jahl"
   - Ijobiy: "rahmat, zo'r, tez, yaxshi, qulay, mamnun, ajoyib, tuzuk"
   - Mavzu kalit-so'zlari: navbat/kutish → "navbat"; xodim/operator/muomala → "xodim";
     tez/sekin → "tezlik"; joy/kassa → "infratuzilma".
   - Sentiment = ijobiy vs salbiy so'z balansiga qarab; hech biri bo'lmasa "neutral".
4. **Factory:** `config.py` da `SENTIMENT_PROVIDER = "rule_based"` (kelajakda "muxlisa"|"aisha").
   Adapter fayllar (`muxlisa.py`, `aisha.py`) — hozir bo'sh stub, interfeysni implement qiladi, TODO
   bilan (API kalit keyin). **Bu bloklamaydi — demo rule_based bilan ishlaydi.**
5. Endpoint: `POST /classify-feedback` (`app/api/routes.py`), shakl `FAZA2_UMUMIY.md §6.2` dagidek.

**Test (`tests/test_sentiment.py`):** salbiy izoh → negative + to'g'ri mavzu; ijobiy → positive;
aralash/bo'sh → neutral; provayder interfeysi almashishi mumkinligi (rule_based factory'dan keladi).

---

## Umumiy talablar

- Har uch funksiya uchun toza funksiya + pytest test. `python -m pytest tests/ -q` yashil bo'lsin.
- Pydantic modellar `app/schemas/models.py` ga, kontraktdagi aniq shaklda.
- Router `app/api/routes.py` — mavjud uslubda (`@router.post(...)`).
- Kod izohlari o'zbekcha, kirill aralashmasin.
- Mavjud Faza 0-1 kodiga tegma (forecast/recommendation/anomaly).

## Yakunda

`docs/faza2/PROGRESS_ML.md` yoz: nima qilinди, qaysi fayllar, testlar holati, keyingi qadam
(Gateway ML endpointlarini qanday chaqirishi). Keyin yangi chatda Gateway qismi boshlanadi.
