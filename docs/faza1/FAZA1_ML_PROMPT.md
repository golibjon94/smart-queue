# FAZA 1 — ML/AI qismi uchun PROMPT (PyCharm + Claude)

> **Ishlatish:** PyCharm'da `services/ml/` ochib, yangi Claude chat oching va quyidagi
> promptni to'liq nusxalab yuboring. (Pastdagi "PROMPT" bloki — aynan yuboriladigan matn.)

---

## PROMPT (nusxalab yuboring)

Sen `smart-queue` loyihasining **Python/AI servisi** (`services/ml/`) ustida ishlaysan.
Bu polyglot loyihaning "miyasi" — bashorat va tavsiya algoritmlari. Biz **Faza 1**ni
bajarmoqdamiz. Sen **faqat ML qismini** qilasan; Gateway (.NET) va Frontend (Angular)
alohida chatlarda parallel ishlanmoqda, shuning uchun **umumiy kontraktga qat'iy amal qil**.

### 1. Avval o'qi (majburiy, shu tartibda)
1. `docs/LOYIHA_HOLATI.md` — loyiha umumiy holati
2. `docs/faza1/FAZA1_UMUMIY.md` — **servislararo kontrakt (yagona haqiqat manbai)**
3. `docs/PYTHON_AI_HISOBOT.md` — ML qismi hozir nima qilgani
4. `services/ml/recommend/engine.py`, `services/ml/recommend/erlang.py`,
   `services/ml/app/api/routes.py`, `services/ml/app/schemas/models.py` — mavjud kod uslubi

### 2. Vazifalar (Faza 1 — ML)

**A. JIQ marshrutlash (Join-the-Idle-Queue)** — `recommend/` ichida
- `/recommendations` so'roviga qo'shiladigan `counters` massivini qabul qil (FAZA1_UMUMIY §5.2).
- Bo'sh (`idle`) va ko'nikmasi mos kassa bo'lsa, kutayotgan navbatni o'sha kassaga yo'naltirish
  tavsiyasini `action_type = "route_queue"` bilan chiqar (payload: `service_type_id`,
  `to_counter_id`, `to_counter_number`). Foydani Erlang-C/Little bilan hisobla.
- Mavjud `open_counter`/`close_counter` qoidalari saqlanadi; JIQ ular bilan ziddiyatsiz ishlasin.

**B. EWMA anomaliya aniqlash** — yangi `recommend/anomaly.py` (yoki `forecasting/anomaly.py`)
- FAZA1_UMUMIY §6.2 bo'yicha: prognoz qoldig'i (`actual − forecast`) ustida EWMA control chart
  (λ≈0.3, L≈3). `surge` va `backlog` signallari.
- `slow_operator`: kassa o'rtacha `service_time_sec` shu xizmatning bazaviy qiymatidan sezilarli
  yuqori bo'lsa.
- Har anomaliya `type`, `severity`, o'zbekcha `message`, `metric`, `expected` bilan (§7.3 shakli).

**C. Yangi endpoint** — `POST /anomalies` (`app/api/routes.py` + `app/schemas/models.py`)
- So'rov: `{ branch_id, lookback_hours? }`. `queue_events` + `forecasts` jadvalidan o'qiydi.
- Javob: `{ branch_id, anomalies: [...] }` (snake_case).
- Pydantic modellari bilan validatsiya.

### 3. Kontrakt (qat'iy)
- Barcha shakllar **FAZA1_UMUMIY.md §5, §6, §7**da. **Snake_case** (ML tomoni).
- Mavjud `/recommendations` va `/forecast` shakli **buzilmaydi** — faqat `counters` qo'shiladi (ixtiyoriy).
- `route_queue` va `Anomaly` shakllarini aynan kontraktdagidek qil.

### 4. Uslub qoidalari
- `services/ml`'ning mavjud uslubiga mos: modullar toza ajratilgan, Pydantic sxemalar,
  psycopg bilan DB, konfiguratsiya `simulation/config.py`'da.
- Yangi "sozlanadigan raqamlar" (EWMA λ, L, JIQ chegaralari) — konfiguratsiya konstantalari sifatida, sochib yuborma.

### 5. Testlar (majburiy)
- `tests/` ga: JIQ marshrutlash (bo'sh kassaga to'g'ri yo'naltirish, skill mosligi),
  EWMA (ma'lum qoldiq seriyasida signal berishi/bermasligi) unit testlar.
- `python -m pytest tests -q` — hammasi yashil.

### 6. Verifikatsiya
- ML servisni ishga tushir: `.\.venv\Scripts\python -m uvicorn app.main:app --port 8000`
- `curl`/Swagger (`:8000/docs`) bilan `/anomalies` va kengaytirilgan `/recommendations`ni sina.
  (DB va model bo'lishi kerak — kerak bo'lsa `simulation.generate` + `forecasting.train` + `forecasting.predict` ishga tushir.)

### 7. Tayyor bo'lish mezoni (DoD)
- [ ] `/anomalies` ishlaydi, realistik anomaliyalar qaytadi
- [ ] `/recommendations` `route_queue` tavsiyalarini beradi (JIQ)
- [ ] Barcha yangi kod testlar bilan qoplangan, `pytest` yashil
- [ ] `docs/PYTHON_AI_HISOBOT.md` yangilandi (Faza 1 bo'limi qo'shildi)
- [ ] O'zgarishlar commit qilindi

### 8. Boshqa qismlar bilan bog'liqlik
- **Sen ta'minlaysan:** `/anomalies` endpoint + `route_queue` tavsiyalar → **Gateway** proxy qiladi.
- **Kontrakt** (`FAZA1_UMUMIY.md`) — agar shaklni o'zgartirish zarur bo'lsa, **avval o'sha faylni yangila**
  va menga ayt (men Gateway/Frontend chatlariga ham xabar beraman). Bir tomonlama o'zgartirma.

Ishni boshla: avval yuqoridagi fayllarni o'qi, keyin reja tuzib, so'ng bajar. Har bosqichda
verifikatsiya qil. Savol tug'ilsa — mavjud kod va kontraktdan javob izla, bo'lmasa mendan so'ra.
