# PYTHON / AI QISMI — Bajarilgan ishlar hisoboti

> Loyiha: `smart-queue` · Modul: `services/ml/` (Python 3.11 + FastAPI)
> Bu hujjat "miya" — ML/AI servisida qilingan barcha ishni bir joyda jamlaydi.
> Manba kod: [`services/ml/`](../services/ml/)

---

## 1. Qisqacha mazmun

`services/ml/` — loyihaning **"aqli"**. U uch vazifani bajaradi:

| Vazifa | Modul | Texnika |
|--------|-------|---------|
| **Sintetik ma'lumot** yaratish (real datani kutmasdan) | `simulation/` | Non-homogeneous Poisson (thinning) + navbat simulyatsiyasi |
| **Bashorat** (kelasi soatlarda nechta mijoz keladi) | `forecasting/` | LightGBM global model (Poisson) + rekursiv multi-step |
| **Tavsiya** (nechta kassa ochilsin) | `recommend/` | Erlang-C / M/M/c navbat nazariyasi |

Uchalasi **FastAPI** (`app/`) orqali `.NET` gateway'ga xizmat qiladi.

**Asosiy natija:** filial-soat kesimida bashorat aniqligi **MAPE 13.67%** — maqsad ≤15% dan yaxshi, oddiy baseline'dan (18.92%) sezilarli ustun, va nazariy minimalga (12.42%) juda yaqin.

---

## 2. Texnologik stek

| Kutubxona | Versiya | Nima uchun |
|-----------|---------|------------|
| **NumPy** | ≥1.26 | NHPP thinning, tasodifiy generatsiya |
| **pandas** | ≥2.1 | feature engineering, vaqt-qatori |
| **LightGBM** | ≥4.3 | asosiy bashorat modeli (gradient boosting) |
| **psycopg** | ≥3.1 | PostgreSQL/TimescaleDB (COPY batch, so'rovlar) |
| **FastAPI + uvicorn** | ≥0.110 | REST API servisi |
| **matplotlib** | ≥3.8 | validatsiya va backtest grafiklari |
| **joblib** | ≥1.3 | model saqlash/yuklash |
| **pytest** | ≥8.0 | 11 ta unit test |

Barchasi [`services/ml/pyproject.toml`](../services/ml/pyproject.toml) da. Python **3.11** (LightGBM wheel'lari uchun ishonchli; 3.14 emas).

---

## 3. Modul 1 — Sintetik ma'lumot generatori (`simulation/`)

**Muammo:** MVP'ni ko'rsatish uchun bank navbat ma'lumoti kerak, lekin real data hali yo'q. Yechim — statistik jihatdan **realistik** sun'iy ma'lumot yaratish.

### 3.1 Konfiguratsiya — `config.py`
Barcha "biznes raqamlari" bitta faylda (real data kelganda faqat shu joy o'zgaradi):

- **5 xizmat turi** ulush va o'rtacha xizmat vaqti bilan: To'lovlar (40%, 4 daq), Pul o'tkazmalari (15%, 5 daq), Plastik karta (15%, 7 daq), Kredit (10%, 10 daq), Ma'lumot (20%, 3 daq).
- **2 filial:** kuniga o'rtacha 350 va 300 mijoz.
- **Soatlik shakl:** 12:00–13:00 **tushlik cho'qqisi**, 16:00 ish-oxiri ko'tarilishi.
- **Hafta kuni koeffitsiyenti:** dushanba eng gavjum (×1.25), shanba qisqa kun (9–13), yakshanba yopiq.
- **Maosh kuni effekti:** oyning 1–3 kunlari ×1.5, oy oxiri (28+) ×1.25.

### 3.2 Kelish jarayoni — `arrivals.py`
**Non-homogeneous Poisson jarayoni (NHPP)** — thinning (Lewis–Shedler) usuli bilan:
1. Doimiy maksimal intensivlik λ* bilan homogen Poisson nomzodlari generatsiya qilinadi.
2. Har nomzod λ(t)/λ* ehtimol bilan qabul qilinadi.
3. Natija — intensivligi kun davomida o'zgarib turadigan realistik kelish oqimi.

Bu usul mijozlar oqimining tabiiy "portlash" xususiyatini (tushlik, maosh kuni) to'g'ri modellashtiradi.

### 3.3 Navbat simulyatsiyasi — `queue_sim.py`
Har talon uchun **to'liq hayotiy tsikl** hodisalari yaratiladi:
```
issued → called → served_start → completed
   yoki → abandoned (sabr tugadi / kun yopildi)
   yoki → called → no_show (chaqirilib, kelmadi)
```
Modelning realizmi:
- **Skill-based marshrutlash:** har xizmat faqat mos kassaga (kassaning `supported_service_types`).
- **G/G/c yaqinlashuvi:** talon eng erta bo'shaydigan mos kassaga biriktiriladi (FIFO).
- **Log-normal xizmat vaqti** (o'rtacha config'dan, CV=0.5).
- **Sabr (abandonment):** eksponensial taqsimot, o'rtacha 25 daqiqa — kutish undan oshsa mijoz ketadi.
- **No-show:** 3% ehtimol.

### 3.4 DB'ga yozish — `db.py` + `generate.py`
- `queue_events` jadvaliga **COPY** (psycopg) orqali tez batch insert, `source='synthetic'`.
- Yozilgach `hourly_arrivals` continuous aggregate to'liq yangilanadi.
- CLI: `python -m simulation.generate --days 270 --seed 42 --replace` (takrorlanuvchan, seed bilan).

**Yaratilgan hajm:** 270 kun × 2 filial = **~152 000 talon / ~560 000 hodisa**.

### 3.5 Validatsiya — `validate.py`
4 panelli grafik (`reports/synthetic_validation.png`) + statistika: soatlik cho'qqi, hafta kuni, oy kuni (maosh cho'qqisi) pattern'lari ko'z bilan tekshiriladi. Statistika: ~13.5% abandonment, o'rtacha kutish ~3 daqiqa.

---

## 4. Modul 2 — Bashorat modeli (`forecasting/`)

**Maqsad:** filial + xizmat turi kesimida, kelasi soatlar uchun kelish sonini bashorat qilish.

### 4.1 Feature engineering — `features.py`
`hourly_arrivals`'dan xususiyatlar quriladi:
- **To'liq soatlik panjara:** yopiq soatlar ham 0 bilan to'ldiriladi (lag'lar to'g'ri hisoblanishi uchun).
- **Lag'lar:** t−24 soat (kunlik), t−168 soat (haftalik). *(t−1 ataylab olib tashlangan — rekursiv bashoratda o'z xatosini kompaundlamasligi uchun.)*
- **Rolling:** 24 va 168 soatlik harakatlanuvchi o'rtacha.
- **`swh_mean_4w`** — o'tgan 4 haftaning bir xil (hafta kuni + soat) o'rtachasi. **Eng kuchli xususiyat** — kunlik shovqinni tekislaydi.
- **Kalendar:** soat, hafta kuni, oy kuni, **maosh-kuni bayroqlari** (payday_early, month_end).

### 4.2 Model — LightGBM (Poisson)
**Ikkita global model** o'qitiladi:
| Model | Nima uchun | MAPE |
|-------|-----------|------|
| **Filial-soat** | asosiy metrika (katta λ, barqaror) | **13.67%** |
| **Xizmat-soat** | marshrutlash/Erlang-C uchun (mayda λ) | 38.71% |

- **Poisson objective** — hisoblash (count) ma'lumoti uchun to'g'ri taqsimot.
- **Global model (data pooling):** barcha filial/xizmat bitta modelda — kam ma'lumotli seriyalar uchun foydali.
- **Rekursiv multi-step** (`recursive.py`): kunlik gorizontda bashorat.

### 4.3 Baseline va backtest
- **Baseline** (`baseline.py`): mavsumiy moving average (o'tgan 4 hafta, bir xil kun-soat).
- **Backtest** (`train.py`): **rolling-origin, kunlik gorizont** — "bugungi aktuallar bilan ertangi kunni bashorat qil" (mahsulot rejimiga mos). Holdout aktuallari o'qitishda **ishlatilmaydi** (data leakage yo'q).
- **14 kunlik holdout** ustida baholanadi.

### 4.4 Natijalar (`reports/backtest_report.json`)

**Filial-soat darajasi (asosiy):**
| Metrika | LightGBM | Baseline | Nazariy minimal |
|---------|----------|----------|-----------------|
| MAPE | **13.67%** | 18.92% | 12.42% (Poisson floor) |
| WAPE | 12.60% | 20.09% | — |

> **Poisson floor** — mukammal model ham Poisson shovqinidan qutulolmaydi (E\|X−λ\|/λ ≈ √(2/πλ)). Bizning 13.67% shu nazariy 12.42% ga deyarli teng — ya'ni model **deyarli maksimal aniqlikda**, qolgan xato tasodifiy shovqin.

### 4.5 Bashoratni saqlash — `predict.py`
Model kelasi N soat (default 72) bashoratini + **80% ishonch oralig'i**ni hisoblab, `forecasts` jadvaliga yozadi. FastAPI shu jadvaldan o'qiydi. Model `joblib` bilan versiya nomi ostida saqlanadi (`models/latest.joblib` — ikkala booster + qoldiq std).

---

## 5. Modul 3 — Tavsiya dvigateli (`recommend/`)

**Maqsad:** joriy navbat holatiga qarab menejerga aniq harakat taklif qilish.

### 5.1 Erlang-C navbat nazariyasi — `erlang.py`
- **Erlang-C formulasi:** P(kutish>0) — mijoz navbatda kutish ehtimoli.
- **Wq:** o'rtacha kutish vaqti.
- **`required_counters`:** berilgan kutish maqsadiga yetish uchun minimal kassa soni.
- 5 ta unit test bilan ma'lum qiymatlarga tekshirilgan (masalan a=2, c=3 → P=4/9).

### 5.2 Qoidalar dvigateli — `engine.py`
Joriy holatni tahlil qilib **ACTION + REASON + EXPECTED BENEFIT** formatida tavsiya beradi:
- **QOIDA 1 — kassa ochish:** kutish 10 daqiqadan oshsa va zaxira kassa bo'lsa → ochishni taklif qiladi. Foyda Erlang-C bilan miqdoriy hisoblanadi.
- **QOIDA 2 — kassa yopish:** navbat bo'sh va ortiqcha kassa bo'lsa → boshqa ishga o'tkazishni taklif qiladi.

Namuna:
> **6-kassani oching** — sabab: «To'lovlar» navbatida 14 kishi, kutish ~28 daq; foyda: kutish ~8 daqiqaga kamayadi (28 → 20).

Har tavsiya `recommendations` jadvaliga `proposed` statusi bilan yoziladi (ROI audit izi).

---

## 6. FastAPI servisi (`app/`)

Tashqi dunyoga (aslida .NET gateway'ga) REST interfeys:

| Endpoint | Vazifa |
|----------|--------|
| `GET /health` | holat + DB tekshiruvi + model versiyasi |
| `POST /forecast` | filial+vaqt oralig'i uchun bashorat + ishonch oralig'i (`forecasts` jadvalidan) |
| `POST /recommendations` | joriy holat → tavsiyalar (ACTION+REASON+BENEFIT) |

- Pydantic modellari bilan kirish/chiqish validatsiyasi (`app/schemas/`).
- DB ulanish dependency injection orqali (`app/core/db.py`).
- Docker: `python:3.11-slim` + `libgomp1` (LightGBM OpenMP uchun).

---

## 7. Testlar (`tests/`)

**11 ta unit test**, `pytest` bilan:
- **NHPP aniqligi** — 300 replikatsiyada soatlik o'rtacha λ(t) ga ±10% mos.
- **Ish soatlari** — yakshanba bo'sh, shanba 9–13 oralig'ida.
- **Hayotiy tsikl** — hodisalar tartibi to'g'ri, vaqtlar o'suvchi, `wait/service_time` musbat.
- **Skill marshrutlash** — xizmat faqat mos kassaga tushadi.
- **Kassa overlap yo'qligi** — bitta kassada xizmatlar ustma-ust tushmaydi.
- **Erlang-C formulalari** — ma'lum analitik qiymatlarga mos.

---

## 8. Ishga tushirish (qo'llanma)

```powershell
cd services/ml
py -3.11 -m venv .venv
.\.venv\Scripts\pip install -e ".[dev]"

# 1. Sintetik tarix (270 kun)
.\.venv\Scripts\python -m simulation.generate --days 270 --seed 42 --replace

# 2. Model o'qitish + backtest
.\.venv\Scripts\python -m forecasting.train

# 3. 72 soatlik bashorat -> forecasts jadvali
.\.venv\Scripts\python -m forecasting.predict --hours 72 --replace

# 4. Servis
.\.venv\Scripts\python -m uvicorn app.main:app --port 8000

# Testlar / validatsiya
.\.venv\Scripts\python -m pytest tests -q
.\.venv\Scripts\python -m simulation.validate
```

Docker'da bu servis `python-ml` konteyneri sifatida avtomatik ishlaydi (Swagger: `:8000/docs`).

---

## 9. Keyingi fazalarga qoldirilgan (scope)

Bular ataylab **Faza 0**ga kiritilmagan (ROADMAP bo'yicha):
- **Prophet / StatsForecast** fallback va champion-challenger tanlash → Faza 2.
- **Retraining scheduler** (APScheduler/Prefect), drift monitoring → Faza 2.
- **EWMA anomaliya aniqlash** (sekin operator, backlog) → Faza 1.
- **To'liq JIQ marshrutlash**, OR-Tools/LP optimallashtirish → Faza 1+.
- **Real ma'lumot ETL** (`source='real'`, migratsiya kerak emas) → Faza 2.
- **ONNX** eksport (2–10x tezlik) → o'sishda.

---

## 10. Nima uchun bu "wow" beradi

iQueue hozir **statistika ko'rsatadi** (descriptive). smart-queue esa:
- **bashorat qiladi** (predictive) — MAPE ~14%, nazariy minimalga yaqin;
- **hisoblab tavsiya beradi** (prescriptive) — Erlang-C bilan aniq raqamli foyda;
- **o'zbekcha, tushunarli** — ACTION + REASON + BENEFIT.

Bu farq — statik "keyingi talon → keyingi bo'sh kassa"dan aqlli, bashoratga asoslangan boshqaruvga o'tish.
