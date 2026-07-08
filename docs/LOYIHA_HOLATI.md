# LOYIHA HOLATI — Handoff / davom ettirish uchun

> Loyiha: `smart-queue` · Sana: 2026-07-08 · Branch: `main`
> **Bu hujjat nima uchun:** yangi suhbatda (yoki boshqa dasturchi) ishni tez tushunib
> davom ettirishi uchun butun loyihaning holati bir joyda. Birinchi shu faylni o'qing,
> keyin kerakli batafsil hujjatga o'ting (§7 xaritasi).

---

## 1. Loyiha bir qarashda

Mavjud bank navbat tizimini (iQueue.uz) **"aqlli"** qiladigan AI qo'shimcha modul.
Statik "keyingi talon → keyingi bo'sh kassa"ni **bashorat qiladigan + boshqaradigan +
maslahat beradigan** tizimga aylantiradi. O'rtacha kutishni ~30 daq → ~15 daq gacha
kamaytirish maqsadi, **yangi xodim yollamasdan**.

Uch qatlam: **Bashorat** (kelajakni ko'radi) · **Orkestratsiya** (hozirni boshqaradi) ·
**Yordamchi** (o'zbekcha tavsiya beradi).

---

## 2. Hozirgi holat: FAZA 0 TO'LIQ TAYYOR ✅

Mock (sintetik) ma'lumotda ishlaydigan **to'liq end-to-end demo** tayyor va Docker'da
ishlaydi. Faza 0 rejasidagi B0–B7 bloklari + qo'shimcha auth va professional UI bajarilgan.

**Nima ishlaydi (tekshirilgan):**
- ✅ Sintetik generator — 270 kun, ~152k talon (NHPP + navbat simulyatsiyasi)
- ✅ LightGBM bashorat — filial-soat **MAPE 13.67%** (maqsad ≤15%, nazariy minimal 12.42%)
- ✅ Erlang-C tavsiya dvigateli — ACTION + REASON + BENEFIT
- ✅ FastAPI ML servisi — `/health`, `/forecast`, `/recommendations`
- ✅ .NET 10 Gateway — JWT auth, ML proxy, demo holat, audit izi (vertical-slice arxitektura)
- ✅ Angular 22 dashboard — PrimeNG + Tailwind, login, sidebar, dark mode, real-vaqt polling
- ✅ Login/parol autentifikatsiya (default admin)
- ✅ Butun stack Docker Compose'da (5 servis)
- ✅ Brauzerda e2e: login → dashboard → demo cho'qqi → tavsiya qabul → audit → logout

**Faza 0 muvaffaqiyat mezoni bajarildi:** `docker compose up` bilan ko'tariladi, MAPE ≤15%,
demo "tushlik cho'qqisi" tugmasi jonli ishlaydi.

---

## 3. Servislar va portlar

| Servis | Texnologiya | Konteyner | Host port | Izoh |
|--------|-------------|-----------|-----------|------|
| Dashboard | Angular 22 + nginx | `sq-dashboard` | **4300** | (4200 EMAS — o'zgartirilgan) |
| Gateway | .NET 10 | `sq-gateway` | **5080** | tashqi kirish nuqtasi |
| ML servisi | Python 3.11 + FastAPI | `sq-python-ml` | **8000** | Swagger: `:8000/docs` |
| Ma'lumotlar bazasi | PostgreSQL 17 + TimescaleDB | `sq-timescaledb` | **5433** | (lokal PG18'ga tegmaydi) |
| Kesh/backplane | Redis 7 | `sq-redis` | **6379** | (SignalR — Faza 1) |

> **Port o'zgartirish:** dashboard porti `.env` dagi `DASHBOARD_PORT` orqali. Compose ham,
> gateway CORS'i ham o'sha o'zgaruvchidan oladi — faqat `up -d` qayta ko'tarish kifoya.

---

## 4. Kirish ma'lumotlari

```
Dashboard:  http://localhost:4300
Login:      admin
Parol:      Admin!2026
```

Default admin gateway birinchi startup'ida avtomatik yaratiladi (`.env` dagi
`DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`). BCrypt bilan hash qilinadi,
`users` jadvalida saqlanadi. JWT (HS256, 8 soat).

---

## 5. Ishga tushirish

### Docker (to'liq stack — tavsiya etiladi)
```powershell
cd C:\Users\g.turaqulov\Desktop\smart-queue
docker compose -f infra/docker-compose.yml --env-file .env up -d --build

# Holat
docker compose -f infra/docker-compose.yml ps
# To'xtatish (DB volume saqlanadi)
docker compose -f infra/docker-compose.yml down
```

> **DB volume (`timescale_data`) saqlanadi** — sintetik ma'lumot, bashoratlar, admin
> foydalanuvchi qayta ishga tushirishlarda ham qoladi. Toza boshlash uchun: `down -v`.

### Development rejimi (hot-reload, Docker'siz)
DB/Redis Docker'da qoladi, uch servis lokal:
```powershell
# Gateway
cd services/gateway/src/SmartQueue.Gateway; dotnet run --urls http://localhost:5080
# ML
cd services/ml; .\.venv\Scripts\python -m uvicorn app.main:app --port 8000
# Dashboard (ng serve default endi 4300)
cd apps/dashboard; ng serve
```

### Ma'lumot/model qayta yaratish (kerak bo'lsa)
```powershell
# Migratsiya + seed
.\scripts\migrate.ps1 -Seed
# Sintetik data + model + bashorat
cd services/ml
.\.venv\Scripts\python -m simulation.generate --days 270 --seed 42 --replace
.\.venv\Scripts\python -m forecasting.train
.\.venv\Scripts\python -m forecasting.predict --hours 72 --replace
```

---

## 6. Texnologiyalar (to'liq stek)

| Qatlam | Texnologiya |
|--------|-------------|
| Dashboard | Angular 22 (standalone, **zoneless**, signals), PrimeNG 21 (Aura), Tailwind v4, Chart.js |
| Gateway | .NET 10, ASP.NET Core MVC, Npgsql (raw ADO.NET), JWT, BCrypt, Options pattern |
| ML | Python 3.11, FastAPI, LightGBM, NumPy, pandas, psycopg 3 |
| DB | PostgreSQL 17 + TimescaleDB (hypertable, continuous aggregate) |
| Infra | Docker Compose, nginx (dashboard), Redis |

---

## 7. Hujjatlar xaritasi (qayerda nima)

| Hujjat | Nima haqida |
|--------|-------------|
| **[`LOYIHA_HOLATI.md`](LOYIHA_HOLATI.md)** | ← shu fayl: umumiy holat, handoff |
| [`README.md`](README.md) *(loyiha nomi, tamoyillar)* | Loyiha g'oyasi, uch qatlam, tamoyillar |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Umumiy tizim arxitekturasi (miya/yuz, data flow, integratsiya) |
| [`TECH_STACK.md`](TECH_STACK.md) | Texnologiya tanlovlari asoslash bilan (ML modellari, TTS) |
| [`DATABASE.md`](DATABASE.md) | To'liq DB sxema, DDL, TimescaleDB |
| [`ROADMAP.md`](ROADMAP.md) | Fazalar 0→3, deliverable, metrika, vaqt |
| [`PLAN.md`](PLAN.md) | Faza 0 mayda vazizalar (B0–B7) |
| [`DEMO_SCENARIO.md`](DEMO_SCENARIO.md) | 5 qadamli demo ssenariysi (sotuv uchun) |
| [`PYTHON_AI_HISOBOT.md`](PYTHON_AI_HISOBOT.md) | **Python/AI qismi** — generator, LightGBM, Erlang-C, natijalar |
| [`../services/gateway/ARCHITECTURE.md`](../services/gateway/ARCHITECTURE.md) | **Gateway (.NET)** — vertical-slice, qatlamlar, refactoring |
| [`../apps/dashboard/ARCHITECTURE.md`](../apps/dashboard/ARCHITECTURE.md) | **Dashboard (Angular)** — signal store, layout, styling, routing |

> Root `../README.md` — tez boshlash qo'llanmasi (o'rnatish, portlar, login).

---

## 8. Repozitoriy tuzilishi (yuqori daraja)

```
smart-queue/
├── docs/            # barcha hujjatlar (yuqoridagi xarita)
├── db/
│   ├── migrations/  # 001..005 SQL (referens, hypertable, agg, forecasts, users)
│   └── seed/        # 2 filial, 11 kassa, 14 operator, 5 xizmat turi
├── services/
│   ├── ml/          # Python: simulation/ forecasting/ recommend/ app/ tests/
│   └── gateway/     # .NET: Features/ Configuration/ Extensions/ Infrastructure/
├── apps/
│   └── dashboard/   # Angular: core/ features/ shared/ environments/
├── infra/
│   └── docker-compose.yml   # 5 servis
├── scripts/         # migrate.ps1
├── .env / .env.example
└── README.md
```

---

## 9. Git holati

- **Branch:** `main`
- **Commit tarixi:** B0→B7 bloklar, A1 (backend auth), A2–A5 (PrimeNG/login),
  port o'zgartirish, Docker tuzatish, hujjatlar. `git log --oneline` bilan ko'ring.
- **Diqqat:** `services/gateway/ARCHITECTURE.md` va `apps/dashboard/ARCHITECTURE.md`
  hali commit qilinmagan bo'lishi mumkin (tekshiring: `git status`).
- **Remote yo'q** — faqat lokal repo. Kerak bo'lsa GitHub/GitLab'ga push qilinadi.

---

## 10. Muhim qarorlar va nuanslar (yangi suhbat bilishi shart)

1. **PrimeNG 21 + Angular 22 peer-dep konflikti** — PrimeNG rasman Angular 21 uchun.
   `npm install ... --legacy-peer-deps` ishlatiladi (Docker'da ham). Ishlaydi, muammo yo'q.
2. **Dashboard porti 4300** (4200 emas) — foydalanuvchi so'roviga ko'ra. `.env` da o'zgaradi.
3. **Lokal PostgreSQL 18 ga tegilmaydi** — loyiha DB'si Docker'da 5433-portda. Yonma-yon ishlaydi.
4. **DB volume saqlanadi** — `down` da ma'lumot qolади; `down -v` bilan o'chadi.
5. **Sintetik biznes-raqamlar** — hammasi `services/ml/simulation/config.py` da. Real data
   kelganda faqat shu fayl o'zgaradi (sxema bir xil, `source='synthetic'|'real'`).
6. **Zoneless Angular** — `zone.js` yo'q, hamma reaktivlik signal'larda. RxJS faqat data qatlamida.
7. **Line endings** — Windows (CRLF). Git commit'da LF↔CRLF ogohlantirishlari normal.
8. **WSL HMR** — dev serverni WSL'da ishlatib Windows'dan tahrirlansa, HMR ko'rmasligi mumkin
   (`/mnt/c` inotify). Windows tomonidan ishga tushiring.
9. **API kontrakti barqaror** — gateway refactoring endpointlarni o'zgartirmagan; Angular mos.

---

## 11. Ataylab qoldirilgan (keyingi fazalar)

Faza 0 scope'iga kirmagan (ROADMAP bo'yicha):
- **SignalR real-vaqt push** (hozir polling), Redis backplane → Faza 1
- **To'liq JIQ marshrutlash**, EWMA anomaliya aniqlash → Faza 1
- **Prophet/StatsForecast** fallback, champion-challenger, retraining scheduler, drift → Faza 2
- **Real iQueue ETL** (`source='real'`), ovoz/TTS, tablo integratsiyasi → Faza 2
- **Kamera/Face-ID** (biometrik — huquqiy audit shart) → Faza 3
- **Gateway testlari**, OpenAPI/Swagger, rate limiting, HTTPS → texnik qarz

---

## 11.1 Faza 1 bajarish paketi (tayyor)

Faza 1'ni uch alohida chatda (PyCharm/ML, Rider/Gateway, WebStorm/Frontend) sifatli
bajarish uchun tayyor prompt va kontrakt: **[`faza1/`](faza1/)** papkasi.
- [`faza1/FAZA1_UMUMIY.md`](faza1/FAZA1_UMUMIY.md) — servislararo kontrakt (avval o'qiladi)
- `faza1/FAZA1_{ML,GATEWAY,FRONTEND}_PROMPT.md` — har IDE/chat uchun nusxalanadigan prompt
- [`faza1/README.md`](faza1/README.md) — qanday ishlatish + tartib

---

## 12. Keyingi qadamlar uchun aniq TODO'lar

Har qism o'z ARCHITECTURE.md oxirida batafsil ro'yxatga ega. Eng ustuvorlari:

**Backend (Gateway):**
- [ ] Birlik testlar (`services/gateway/tests/`)
- [ ] SignalR hub (`Features/Realtime/`) + Redis backplane
- [ ] OpenAPI/Swagger (`AddOpenApi()`)

**Frontend (Dashboard):**
- [ ] "Analitika" va "Sozlamalar" sahifalari (hozir "Tez orada" placeholder)
- [ ] SignalR client (polling o'rniga)
- [ ] Foydalanuvchilarni boshqarish UI (admin uchun)

**ML/AI:**
- [ ] Prophet/StatsForecast fallback + champion-challenger
- [ ] Retraining scheduler (APScheduler) + drift monitoring
- [ ] EWMA anomaliya aniqlash

**Umumiy:**
- [ ] Foydalanuvchi rollari (admin/menejer/operator) bo'yicha ruxsatlar
- [ ] Real Mobile Solutions ma'lumotiga ulanish (Faza 2 muzokarasi)

---

## 13. Tez eslatma (cheat sheet)

```
Dashboard:   http://localhost:4300   (admin / Admin!2026)
Gateway:     http://localhost:5080   (/health ochiq)
ML Swagger:  http://localhost:8000/docs
DB:          localhost:5433  (smartqueue / .env dagi parol)

Ko'tarish:   docker compose -f infra/docker-compose.yml --env-file .env up -d --build
To'xtatish:  docker compose -f infra/docker-compose.yml down
Loglar:      docker compose -f infra/docker-compose.yml logs -f <servis>
Testlar:     cd services/ml; .\.venv\Scripts\python -m pytest tests -q
```
