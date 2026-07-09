# PROGRESS_ML — Faza 2 ML/AI qismi (bajarildi)

> Qamrov: `services/ml` (Python 3.11 + FastAPI). Uch funksiya ML tomoni tayyor.
> Gateway va Frontend qismlari alohida chatlarda bajariladi. Faza 0-1 kodiga tegilmadi.

## Bajarilgan ishlar

### VAZIFA 1 — What-if simulyatsiya (`/simulate`) ✅
- `recommend/simulate.py`: `simulate_scenario(lam, mu, baseline_counters, scenario_counters)`
  — mavjud Erlang-C yadrosini (`erlang.py`) import qiladi, qayta yozmaydi.
  baseline/scenario uchun `avg_wait_sec`, `utilization` (a/c), `prob_wait` (erlang_c) hisoblab
  `delta` qaytaradi. To'yingan tizimda (rho≥1) kutish `WAIT_CAP_SEC` (3600s) bilan cheklanadi.
- Endpoint `POST /simulate` (`app/api/routes.py`) — side-effektsiz, DB **yozuvsiz**. Kirish
  parametrlari (avg_service_sec, arrivals, joriy kassa) so'rovda bo'lmasa DB'dan (service_types,
  forecasts, counters) o'qiladi; ular ham topilmasa `SIM_DEFAULT_*` zaxira qiymatlari — demo
  hech qachon buzilmaydi.

### VAZIFA 2 — QR virtual navbat ETA ✅
- `recommend/eta.py`: `estimate_eta(position, avg_service_sec, open_counters, arrivals_next_hour=None)`
  — baza `position × avg_service_sec / open_counters`, **forecast bilan tuzatilgan**:
  kelish keyingi soatda quvvatdan oshsa peak koeffitsiyenti (≤ `ETA_PEAK_MAX_FACTOR`=1.5) qo'llanadi.
- `peak_factor(...)` alohida sof funksiya (test qilinadi, endpoint qayta ishlatadi).
- Endpoint `POST /eta` ham qo'shildi (Gateway to'g'ridan-to'g'ri chaqirishi uchun) — javobda
  `eta_sec`, `base_eta_sec`, `forecast_factor`.

### VAZIFA 3 — O'zbekcha sentiment tasniflash (`/classify-feedback`) ✅
- `sentiment/` paketi (almashtiriladigan provayder arxitekturasi):
  - `provider.py` — `SentimentProvider(ABC)` interfeysi: `classify(text) -> {sentiment, score, topics}`.
  - `rule_based.py` — MVP fallback: o'zbek/rus salbiy/ijobiy leksikon + mavzu kalit-so'zlari
    (navbat / xodim / tezlik / infratuzilma). Tashqi API'siz.
  - `muxlisa.py`, `aisha.py` — STUB adapterlar (interfeysni implement qiladi, `NotImplementedError`
    + TODO). **NLP provayder tanlovi bloklamaydi.**
  - `config.py` — `SENTIMENT_PROVIDER` (env yoki standart `rule_based`).
  - `__init__.py` — `get_provider()` factory; noma'lum/ulanmagan provayder → rule_based fallback.
- Endpoint `POST /classify-feedback` (`app/api/routes.py`), shakl §6.2 dagidek.

## O'zgargan/yangi fayllar
```
services/ml/recommend/simulate.py        (yangi)
services/ml/recommend/eta.py             (yangi)
services/ml/recommend/config.py          (+SIM_DEFAULT_*, ETA_PEAK_MAX_FACTOR)
services/ml/sentiment/__init__.py        (yangi)
services/ml/sentiment/provider.py        (yangi)
services/ml/sentiment/rule_based.py      (yangi)
services/ml/sentiment/config.py          (yangi)
services/ml/sentiment/muxlisa.py         (yangi, stub)
services/ml/sentiment/aisha.py           (yangi, stub)
services/ml/app/schemas/models.py        (+Simulate/Eta/ClassifyFeedback modellar)
services/ml/app/api/routes.py            (+/simulate, /eta, /classify-feedback + DB helperlar)
services/ml/pyproject.toml               (packages.find += sentiment*)
services/ml/tests/test_simulate.py       (yangi)
services/ml/tests/test_eta.py            (yangi)
services/ml/tests/test_sentiment.py      (yangi)
```

## Testlar holati
`python -m pytest tests/ -q` → **45 passed** (21 tasi Faza 2 uchun yangi). DB talab qilmaydi
(sof funksiyalar test qilinadi). Router import + endpoint ro'yxati smoke-test o'tdi.

## Endpoint kontraktlari (Gateway uchun)

| Metod | ML path | So'rov | Javob |
|-------|---------|--------|-------|
| POST | `/simulate` | `{branch_id, service_type_id?, scenario:{open_counters, arrivals_per_hour?, avg_service_sec?}}` | `{branch_id, service_type_id, baseline{}, scenario{}, delta{}}` (§4) |
| POST | `/eta` | `{branch_id, service_type_id?, position, open_counters, avg_service_sec?, arrivals_next_hour?}` | `{position, eta_sec, base_eta_sec, forecast_factor}` |
| POST | `/classify-feedback` | `{comments:[str]}` | `{results:[{sentiment, score, topics}]}` (§6.2) |

## Keyingi qadam (Gateway chati)
1. **What-if:** `POST /api/simulate` (JWT) → ML `/simulate`'ga proxy. Yangi DB yozuv yo'q.
2. **QR ETA:** `/api/vq/join` va `/api/vq/status/{token}` da ML `/eta`'ni chaqirib `etaSec` to'ldiring
   (`position` — navbatdagi o'rin, `open_counters` — filialning joriy ochiq kassasi). SignalR
   `vqPositionUpdated` payload'ida shu `etaSec` ketadi.
3. **Sentiment:** `/api/feedback` yozganda ML `/classify-feedback`'ni chaqirib `sentiment/score/topics`ni
   `feedback_csi`ga saqlang (migratsiya 006 ustunlari), `/api/feedback/summary` shulardan jamlaydi.

> **Eslatma:** DB migratsiya 006 (`virtual_tickets` jadvali + `feedback_csi`ga
> `sentiment/sentiment_score/topics` ustunlari, §7) Gateway ish oqimida yaratiladi — ML faqat
> hisoblaydi/tasniflaydi, yozuvni Gateway boshqaradi.
