# smart-queue

> Vaqtinchalik ishchi nom. Mavjud bank navbat tizimini (iQueue.uz) **"aqlli"** qiluvchi AI qo'shimcha modul: bashorat (LightGBM) + real-vaqt tavsiyalar (Erlang-C) + o'zbekcha dashboard.

**Holat: Faza 0 tayyor** — sintetik ma'lumotda ishlaydigan to'liq demo (bashorat MAPE 13.7%, maqsad ≤15%).

## Hujjatlar

| Hujjat | Mazmun |
|--------|--------|
| [`docs/README.md`](docs/README.md) | Loyiha nima, tamoyillar |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Texnik arxitektura |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Texnologiyalar va asoslash |
| [`docs/DATABASE.md`](docs/DATABASE.md) | DB sxema (TimescaleDB) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Fazalar 0→3 |
| [`docs/PLAN.md`](docs/PLAN.md) | Faza 0 vazifalar rejasi |
| [`docs/DEMO_SCENARIO.md`](docs/DEMO_SCENARIO.md) | 5 qadamli demo ssenariysi |

## Tuzilish

```
db/               SQL migratsiyalar + seed (2 filial, 11 kassa, 5 xizmat)
services/ml/      Python 3.11: sintetik generator, LightGBM, FastAPI, Erlang-C
services/gateway/ .NET 10 minimal API: auth, proxy, demo-ssenariy, audit
apps/dashboard/   Angular 22 + Chart.js: navbat, bashorat, tavsiyalar
infra/            docker-compose (5 servis)
scripts/          migrate.ps1
```

## Noldan to'liq ko'tarish

Talablar: Docker Desktop, Python 3.11, .NET 10 SDK, Node 24 + Angular CLI.

```powershell
# 1. Environment
Copy-Item .env.example .env    # qiymatlarni tekshiring

# 2. DB + Redis
docker compose -f infra/docker-compose.yml --env-file .env up -d timescaledb redis

# 3. Migratsiya + seed
.\scripts\migrate.ps1 -Seed

# 4. Python muhiti (bir marta)
cd services/ml
py -3.11 -m venv .venv
.\.venv\Scripts\pip install -e ".[dev]"

# 5. Sintetik tarix (270 kun) + model + bashorat
.\.venv\Scripts\python -m simulation.generate --days 270 --seed 42 --replace
.\.venv\Scripts\python -m forecasting.train
.\.venv\Scripts\python -m forecasting.predict --hours 72 --replace
cd ../..

# 6. Barcha servislar (Docker)
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

Dashboard: **http://localhost:4300** · Gateway: `:5080` · ML API (Swagger): `:8000/docs`

**Kirish (default admin):** `admin` / `Admin!2026` — birinchi startup'da avtomatik
yaratiladi (`.env` orqali o'zgartiriladi). Login sahifasi JWT bilan himoyalangan.

> Lokal PostgreSQL'ga tegilmaydi — loyiha DB'si Docker'da **5433**-portda.
> Dashboard bog'liqliklari: PrimeNG 21 Angular 22 bilan `--legacy-peer-deps` talab qiladi.

## Development rejimi (Docker'siz, hot-reload)

```powershell
# DB/Redis Docker'da qoladi, servislar lokal:
cd services/ml;  .\.venv\Scripts\python -m uvicorn app.main:app --port 8000
cd services/gateway/src/SmartQueue.Gateway;  dotnet run --urls http://localhost:5080
cd apps/dashboard;  ng serve   # birinchi marta: npm install --legacy-peer-deps
```

## Testlar va hisobotlar

```powershell
cd services/ml
.\.venv\Scripts\python -m pytest tests -q      # 11 test: NHPP, sim, Erlang-C
.\.venv\Scripts\python -m simulation.validate  # sintetik ma'lumot grafiklari
```

Bashorat sifati: `services/ml/reports/backtest_report.json` + `backtest.png`
(rolling day-ahead, 14 kun holdout — filial-soat MAPE **13.67%**, baseline 18.92%).

## Demo

[`docs/DEMO_SCENARIO.md`](docs/DEMO_SCENARIO.md) — dashboard'dagi **"Demo: tushlik cho'qqisi"**
tugmasi navbatni portlatadi, tizim 2-3 soniyada "6-kassani oching (+sabab, +foyda)"
tavsiyasini chiqaradi, menejer qabul qiladi, hammasi audit izida qoladi.
