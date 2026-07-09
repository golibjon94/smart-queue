# PLAN.md — Loyiha Tuzilishi va Faza 0 Ish Rejasi

> Loyiha: `smart-queue` · Bu hujjat ROADMAP.md dagi Faza 0 ni bajariladigan mayda vazifalarga aylantiradi.
> Manba hujjatlar: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`TECH_STACK.md`](TECH_STACK.md) · [`DATABASE.md`](DATABASE.md) · [`ROADMAP.md`](ROADMAP.md)

---

## 1. Taklif qilinadigan papka tuzilishi (monorepo)

Arxitekturadagi "miya/yuz ajratilgan" tamoyilga mos: har bir servis o'z papkasida, mustaqil ishga tushadi, lekin bitta repo — bitta `docker-compose` bilan ko'tariladi.

```
smart-queue/
├── docs/                          # Hujjatlar (mavjud)
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DATABASE.md
│   ├── ROADMAP.md
│   ├── PLAN.md                    # ← shu fayl
│   ├── DEMO_SCENARIO.md           # (mavjud)
│   └── BUSINESS_DEAL.md           # (hali yozilmagan — keyin)
│
├── db/
│   ├── migrations/                # Tartiblangan SQL migratsiyalar
│   │   ├── 001_reference_tables.sql      # branches, counters, operators, service_types...
│   │   ├── 002_queue_events_hypertable.sql
│   │   ├── 003_continuous_aggregates.sql # hourly_arrivals
│   │   └── 004_forecasts_recommendations.sql
│   └── seed/
│       └── seed_reference.sql     # 2-3 filial, kassalar, xizmat turlari
│
├── services/
│   ├── ml/                        # "MIYA" — Python + FastAPI
│   │   ├── app/
│   │   │   ├── main.py            # FastAPI kirish nuqtasi
│   │   │   ├── api/               # /health, /forecast, /recommendations, /train
│   │   │   ├── core/              # config, DB ulanish
│   │   │   └── schemas/           # Pydantic modellari
│   │   ├── forecasting/           # LightGBM: features, train, predict, backtest
│   │   ├── recommend/             # Erlang-C / qoidalar dvigateli (Faza 0: sodda)
│   │   ├── simulation/            # Sintetik ma'lumot generatori (NHPP + thinning)
│   │   ├── tests/
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   │
│   └── gateway/                   # Gateway — .NET 10
│       ├── src/SmartQueue.Gateway/
│       │   ├── Controllers/       # proxy: forecast, recommendations, queue-state
│       │   ├── Hubs/              # SignalR (Faza 1 da to'ldiriladi)
│       │   └── Services/          # ML servis HTTP klienti, kesh
│       ├── tests/
│       └── Dockerfile
│
├── apps/
│   └── dashboard/                 # "YUZ" — Angular
│       ├── src/app/
│       │   ├── features/
│       │   │   ├── queue-status/  # jonli navbat holati ekrani
│       │   │   ├── forecast/      # bashorat grafigi
│       │   │   └── recommendations/ # ACTION+REASON+BENEFIT kartalar
│       │   ├── core/              # API klient servislari
│       │   └── shared/            # umumiy komponentlar
│       └── Dockerfile             # nginx bilan statik
│
├── infra/
│   ├── docker-compose.yml         # timescaledb, redis, ml, gateway, dashboard
│   └── timescaledb/
│       └── init/                  # birinchi ishga tushishda migratsiyalarni yuklash
│
├── scripts/                       # yordamchi skriptlar (generate-data, train, demo)
├── .env.example
├── .gitignore
└── README.md                      # qisqa root README → docs/ ga yo'naltiradi
```

**Asoslash:**
- `services/` va `apps/` ajratilgan — "miya" (sotiladigan yadro) va "yuz" (almashinadigan qatlam) chegarasi papka darajasida ham ko'rinadi (Rejim A/B/C ga tayyor).
- `db/migrations/` DATABASE.md §6 dagi migratsiya tartibiga aynan mos raqamlangan.
- Sintetik generator `services/ml/simulation/` ichida — u ML bilan bir xil DB modellarini va Python muhitini ishlatadi, alohida loyiha shart emas.
- `infra/` alohida — deployment mantiqni kod papkalaridan ajratadi.

---

## 2. Faza 0 — umumiy manzara

**Maqsad (ROADMAP.md):** mock ma'lumotda ishlaydigan to'liq demo.

Bajarish tartibi qat'iy ketma-ket — har blok keyingisining poydevori:

```
B0 Skelet ──► B1 DB ──► B2 Generator ──► B3 Bashorat ──► B4 ML API ──► B5 Gateway ──► B6 Dashboard ──► B7 Demo yig'ish
```

**Muvaffaqiyat mezoni (Faza 0 yopilishi):**
1. `docker compose up` bilan butun tizim ko'tariladi.
2. Bashorat backtest'da **MAPE ≤ 15%** (baseline moving average'dan yaxshi).
3. Dashboard'da "tushlik peak" ssenariysi tugma bosilganda jonli ishlaydi.

---

## 3. Faza 0 — mayda ketma-ket vazifalar

### B0. Loyiha skeleti va infratuzilma (~1-2 kun)

| # | Vazifa | Tayyor bo'lish sharti (DoD) |
|---|--------|------------------------------|
| 0.1 | Git repo init, `.gitignore` (Python, .NET, Angular, IDE), root `README.md` | `git log` da birinchi commit |
| 0.2 | Yuqoridagi papka skeletini yaratish (bo'sh papkalar + placeholder fayllar) | Tuzilish PLAN.md §1 ga mos |
| 0.3 | `.env.example` — DB parol, portlar, servis URL'lari | Barcha kerakli o'zgaruvchilar ro'yxati bor |
| 0.4 | `infra/docker-compose.yml` v1: faqat `timescaledb` + `redis` | `docker compose up -d` → ikkala konteyner healthy |
| 0.5 | TimescaleDB'ga ulanishni tekshirish (`psql`), `timescaledb` extension yoqilganini tasdiqlash | `SELECT extversion FROM pg_extension` natija beradi |

### B1. Ma'lumotlar bazasi sxemasi (~1-2 kun)

DATABASE.md dagi DDL aynan ishlatiladi, migratsiya tartibi §6 bo'yicha.

| # | Vazifa | DoD |
|---|--------|-----|
| 1.1 | `001_reference_tables.sql` — branches, counters, operators, service_types, operator_sessions, staff_schedules | Migratsiya xatosiz o'tadi |
| 1.2 | `002_queue_events_hypertable.sql` — jadval + `create_hypertable` (kunlik chunk) + 2 indeks | `SELECT * FROM timescaledb_information.hypertables` da ko'rinadi |
| 1.3 | `003_continuous_aggregates.sql` — `hourly_arrivals` | View yaratiladi, bo'sh so'rov ishlaydi |
| 1.4 | `004_forecasts_recommendations.sql` — forecasts, recommendations, feedback_csi | Migratsiya xatosiz o'tadi |
| 1.5 | `seed_reference.sql` — 2 filial, filialiga 5-6 kassa, 6-8 operator, 4-5 xizmat turi (to'lov, kredit, ma'lumot, plastik karta...) realistik `avg_service_time_sec` bilan | Seed'dan keyin SELECT'lar to'g'ri sonlarni qaytaradi |
| 1.6 | Migratsiyalarni avtomatik yuritish yo'li: `infra/timescaledb/init/` yoki oddiy `scripts/migrate` skripti | Toza konteynerda bitta buyruq bilan to'liq sxema ko'tariladi |

> Compression/retention policy (DATABASE.md §4) — MVP'da **ixtiyoriy**, Faza 0 da qilinmaydi.

### B2. Sintetik ma'lumot generatori (~3-4 kun)

TECH_STACK.md §6: NumPy, non-homogeneous Poisson (thinning usuli).

| # | Vazifa | DoD |
|---|--------|-----|
| 2.1 | Python loyiha skeleti: `pyproject.toml`, virtualenv, `numpy`, `pandas`, `psycopg`/`sqlalchemy` | `pytest` bo'sh o'tadi, lint sozlangan |
| 2.2 | λ(t) intensivlik profili moduli: soatlik shakl (ertalab ko'tarilish, **tushlik cho'qqisi**, ish oxiri), hafta kuni koeffitsiyenti, **maosh kuni / oy oxiri** ko'paytiruvchisi, bayram kunlari | Profil grafigi chizilib ko'z bilan tekshirilgan (notebook yoki PNG) |
| 2.3 | NHPP thinning algoritmi: λ* homogen jarayon → λ(t)/λ* ehtimol bilan qabul → kelish vaqtlari (`issued` hodisalar) | Unit test: soatlik o'rtacha arrival soni λ(t) ga ±10% mos |
| 2.4 | Navbat simulyatsiyasi: har talon uchun to'liq hayotiy tsikl — `issued → called → served_start → completed` (yoki `abandoned`/`no_show` kichik ehtimol bilan), xizmat vaqti **log-normal**, kassa bandligi hisobga olinadi (FIFO, xizmat turiga mos kassa) | Hodisalar ketma-ketligi mantiqan to'g'ri: `wait_time_sec`, `service_time_sec` musbat va realistik |
| 2.5 | DB'ga yozish: `queue_events` ga `source='synthetic'` bilan batch insert | 90 kunlik ma'lumot < 1-2 daqiqada yoziladi |
| 2.6 | CLI interfeys: `python -m simulation.generate --days 90 --branches 2 --seed 42` | Takrorlanuvchan (seed bilan bir xil natija) |
| 2.7 | Validatsiya: `hourly_arrivals` dan haftalik/kunlik pattern grafigi — tushlik cho'qqisi, maosh kuni cho'qqisi aniq ko'rinadi | Grafik(lar) saqlanadi, ko'z bilan tasdiqlangan |

### B3. LightGBM bashorat modeli (~4-5 kun)

TECH_STACK.md §2: global model, rekursiv multi-step.

| # | Vazifa | DoD |
|---|--------|-----|
| 3.1 | Feature engineering moduli: `hourly_arrivals` dan — lag (t−1, t−24, t−168), rolling mean/std, kalendar (soat, hafta kuni, oy kuni, maosh-kuni bayrog'i), kategoriya (filial, xizmat turi) | Feature jadvali NaN'siz, unit test bilan |
| 3.2 | Baseline model: moving average (solishtirish uchun) | Baseline MAPE hisoblangan (kutilma: ~20-30%) |
| 3.3 | LightGBM global model training skripti | Model o'qitiladi, `joblib` bilan saqlanadi (versiya nomi bilan) |
| 3.4 | Backtest: oxirgi 14 kun holdout, soatlik bashorat, **rekursiv** 24-72 soat ufq | MAPE hisoboti filial+xizmat turi kesimida |
| 3.5 | Aniqlik iteratsiyasi: **MAPE ≤ 15%** ga yetgunча feature/parametr sozlash | MAPE ≤ 15% va baseline'dan yaxshi — hisobot saqlangan |
| 3.6 | Predict funksiyasi: model yuklash → kelasi N soat bashorati + oddiy ishonch oralig'i → `forecasts` jadvaliga yozish | `forecasts` da yozuvlar model_name/model_version bilan |

> Prophet/StatsForecast fallback va champion-challenger — **Faza 2** ga qoldiriladi (ROADMAP bo'yicha). MAPE 15% dan tushmasa, gibrid variantga (TECH_STACK §2.3) qaytamiz.

### B4. FastAPI ML servisi (~2-3 kun)

| # | Vazifa | DoD |
|---|--------|-----|
| 4.1 | FastAPI skelet: config (env'dan), DB ulanish, `GET /health` | `curl /health` → 200 |
| 4.2 | `POST /forecast` — filial + vaqt oralig'i → bashorat + ishonch oralig'i (forecasts jadvalidan yoki jonli predict) | Swagger'da ishlaydi, Pydantic validatsiya |
| 4.3 | `POST /recommendations` — joriy holat (navbat uzunligi, ochiq kassalar) → sodda qoida + Erlang-C hisobi bilan tavsiya: **ACTION + REASON + EXPECTED_BENEFIT** formatida, `recommendations` jadvaliga yoziladi | Demo ssenariyda "4-kassani oching (sabab..., foyda...)" ko'rinishidagi javob qaytadi |
| 4.4 | Erlang-C hisob moduli: λ, μ, c → kutish ehtimoli/vaqti; "nechta kassa kerak" | Unit test: ma'lum qiymatlar bilan formula tekshirilgan |
| 4.5 | Dockerfile + docker-compose'ga `python-ml` servisini qo'shish | Konteynerda `/health` ishlaydi |

> To'liq JIQ marshrutlash va real-vaqt tavsiya oqimi — **Faza 1**. Faza 0 da tavsiya bitta so'rov-javob darajasida (demo uchun yetarli).

### B5. .NET 10 Gateway — minimal (~2-3 kun)

| # | Vazifa | DoD |
|---|--------|-----|
| 5.1 | .NET 10 Web API skelet, config, `GET /health` | Ishga tushadi, health 200 |
| 5.2 | ML servisga proxy endpointlar: `/api/forecast`, `/api/recommendations` (typed HttpClient) | Gateway orqali chaqirish ML natijasini qaytaradi |
| 5.3 | `/api/queue-state` — joriy mock navbat holati (DB'dagi oxirgi hodisalardan yoki demo-holat xizmatidan) | Dashboard uchun yetarli JSON |
| 5.4 | CORS sozlash (dashboard origin), oddiy API-key middleware (to'liq JWT — Faza 1) | Dashboard'dan so'rovlar o'tadi |
| 5.5 | Dockerfile + compose'ga qo'shish | Konteynerda ishlaydi |

> SignalR hub skeleti yaratiladi, lekin real-vaqt push **Faza 1** deliverable — Faza 0 da dashboard oddiy polling bilan ishlashi mumkin.

### B6. Angular dashboard (~4-5 kun)

| # | Vazifa | DoD |
|---|--------|-----|
| 6.1 | Angular loyiha skeleti, routing, API klient servisi (environment'dan gateway URL) | Bo'sh sahifa gateway `/health` ni chaqirib ko'rsatadi |
| 6.2 | **Navbat holati ekrani:** kassalar (ochiq/yopiq/band), navbatlar uzunligi, joriy kutish vaqti | Mock holat jonli ko'rinadi (polling) |
| 6.3 | **Bashorat grafigi:** bugun/ertaga soatlik kutilayotgan oqim + ishonch oralig'i (chart kutubxonasi) | `/api/forecast` ma'lumoti grafikda |
| 6.4 | **Tavsiyalar paneli:** karta ko'rinishida ACTION + REASON + BENEFIT + Qabul/Rad tugmalari (bosilganda status DB'da yangilanadi) | Tavsiya kartasi to'liq formatda ko'rinadi, tugmalar ishlaydi |
| 6.5 | **Demo tugmasi:** "Tushlik peak" ssenariysini ishga tushirish — navbat keskin o'sadi → tizim tavsiya chiqaradi | Tugma bosilganda ssenariy boshdan-oxir ko'rinadi |
| 6.6 | UI matnlari o'zbek tilida, sodda toza ko'rinish | Ekranlar skrinshotga tayyor |
| 6.7 | Dockerfile (nginx) + compose'ga qo'shish | Konteynerdan ochiladi |

### B7. Demo yig'ish va Faza 0 yopilishi (~2-3 kun)

| # | Vazifa | DoD |
|---|--------|-----|
| 7.1 | End-to-end tekshiruv: toza mashinada `docker compose up` → migratsiya → generator → training → dashboard | Bitta yo'riqnoma bo'yicha 15-20 daqiqada to'liq ko'tariladi |
| 7.2 | "Tushlik peak" demo ssenariysini repetitsiya qilish va sozlash (raqamlar ishonarli bo'lsin) | Ssenariy 3-5 daqiqada silliq o'tadi |
| 7.3 | MAPE yakuniy hisoboti (baseline vs LightGBM) — grafik bilan | MAPE ≤ 15% hujjatlashtirilgan |
| 7.4 | Root `README.md` — o'rnatish va demo qo'llanmasi | Yangi odam mustaqil ko'tara oladi |
| 7.5 | `docs/DEMO_SCENARIO.md` yozish (README'da havola bor, fayl hali yo'q) | Demo qadamlari hujjatda |

---

## 4. Faza 0 dan ataylab chiqarilganlar (scope himoyasi)

Bular ROADMAP bo'yicha keyingi fazalarga tegishli — Faza 0 da qilinMAYdi:

- SignalR real-vaqt push, menejer tasdig'ining to'liq audit oqimi → **Faza 1**
- To'liq JIQ marshrutlash, EWMA anomaliya aniqlash → **Faza 1**
- Prophet/StatsForecast fallback, champion-challenger, retraining scheduler → **Faza 2**
- Real ma'lumot ETL, ovoz/TTS, tablo integratsiyasi → **Faza 2**
- Kamera/Face-ID → **Faza 3**
- JWT to'liq auth, iframe/postMessage integratsiyasi → **Faza 1-2**
- Compression/retention policy → prod'da

---

## 5. Taxminiy vaqt jamlanmasi

| Blok | Vaqt |
|------|------|
| B0 Skelet | 1-2 kun |
| B1 DB | 1-2 kun |
| B2 Generator | 3-4 kun |
| B3 Bashorat | 4-5 kun |
| B4 ML API | 2-3 kun |
| B5 Gateway | 2-3 kun |
| B6 Dashboard | 4-5 kun |
| B7 Demo | 2-3 kun |
| **Jami** | **~19-27 ish kuni (≈3-4 hafta)** — ROADMAP bahosiga mos ✅ |

---

## 6. Ochiq savollar (kod boshlashdan oldin hal qilinadigan)

1. **Python versiyasi va paket menejeri** — taklif: Python 3.12 + `uv`.
2. **Angular versiyasi** — taklif: eng so'nggi LTS (v20), standalone komponentlar.
3. **Chart kutubxonasi** — taklif: `ngx-charts` yoki `Chart.js` (yengil, yetarli).
4. **Demo "tushlik peak" mexanizmi** — variant A: oldindan yozilgan ssenariy ma'lumotini tezlashtirilgan replay qilish (soddaroq, ishonchli — **taklif shu**); variant B: jonli simulyatsiya.
5. **Migratsiya vositasi** — taklif: MVP'da oddiy raqamlangan SQL + skript (Alembic/Flyway keyinroq).
