# ARCHITECTURE.md — Texnik Arxitektura

> Loyiha: `smart-queue` (vaqtinchalik nom) · Mavjud iQueue navbat tizimi uchun AI qatlami

---

## 1. Umumiy tamoyil: "Miya" va "Yuz" ajratilgan

Butun arxitektura bitta qarorga asoslangan: **biznes-mantiq (miya) taqdimotdan (yuz) ajratilishi kerak.** Bu bir mahsulotni uch xil shaklda sotish imkonini beradi.

```
                         ┌──────────────────────────┐
                         │      "YUZ" (almashadi)    │
                         │  Angular Dashboard        │
                         │  yoki mijoz tizimi        │
                         │  yoki iframe/micro-front  │
                         └────────────┬─────────────┘
                                      │ REST + WebSocket (SignalR)
                         ┌────────────▼─────────────┐
                         │   "MIYA" (doim sizniki)   │
                         │                           │
                         │  .NET 8 API Gateway       │
                         │  (auth, orkestratsiya,    │
                         │   real-vaqt push)         │
                         └────────────┬─────────────┘
                                      │ HTTP (internal)
                         ┌────────────▼─────────────┐
                         │  Python + FastAPI (ML)    │
                         │  bashorat + tavsiya       │
                         └────────────┬─────────────┘
                                      │
                         ┌────────────▼─────────────┐
                         │  PostgreSQL + TimescaleDB │
                         │  navbat hodisalari,       │
                         │  bashorat, tavsiyalar     │
                         └────────────┬─────────────┘
                                      │ read-only ETL
                         ┌────────────▼─────────────┐
                         │  iQueue mavjud tizimi     │
                         │  (Mobile Solutions)       │
                         └───────────────────────────┘
```

---

## 2. Komponentlar

### 2.1 "Miya" — Python + FastAPI (ML servisi)
Bashorat, tavsiya generatsiyasi va anomaliya aniqlashning yadrosi.

**Mas'uliyat:**
- Kelish tezligi (arrival rate) bashorati — filial va xizmat turi bo'yicha, soatlik.
- Tavsiya hisoblash (Erlang-C/JIQ) — nechta kassa, qaysi navbat qayerga.
- Anomaliya aniqlash (EWMA control chart) — sekin operator, navbat to'planishi.
- Model o'qitish/qayta o'qitish (retraining).

**Endpointlar (asosiy):**
- `GET /health` — holat.
- `POST /forecast` — filial+vaqt oralig'i uchun bashorat + ishonch oralig'i.
- `POST /recommendations` — joriy holatga ko'ra harakat tavsiyalari.
- `POST /train` — model qayta o'qitish (yoki alohida batch job).

### 2.2 Orkestratsiya + Gateway — .NET 8
Tashqi dunyoning yagona kirish nuqtasi.

**Mas'uliyat:**
- Autentifikatsiya/avtorizatsiya (JWT, API-key, iframe uchun guest token).
- Python ML servisiga proksi va natijalarni keshlash.
- **Real-vaqt push (SignalR)** — dashboard'ga jonli navbat holati va tavsiyalar.
- Menejer qarorlarini qabul qilish (tavsiya qabul/rad) va audit izi.

### 2.3 "Yuz" — Angular Dashboard
Operator va menejer paneli. **API'ning birinchi mijozi** — ya'ni hech qanday biznes-mantiq ichida qotirilmaydi, hammasi API'dan keladi.

**Ekranlar:**
- Real-vaqt navbat holati (kassalar, navbatlar, kutish vaqti).
- Bashorat grafigi (bugun/ertaga oqim).
- Tavsiyalar oqimi (ACTION + REASON + BENEFIT + qabul/rad tugmasi).
- Menejer tahlili (before/after, ROI, tavsiya qabul darajasi).

### 2.4 Ma'lumotlar bazasi — PostgreSQL 16 + TimescaleDB
Navbat hodisalari hypertable'da; bashorat va tavsiyalar audit izi bilan. Batafsil: [`DATABASE.md`](DATABASE.md).

---

## 3. Ma'lumot oqimi (data flow)

### Bashorat oqimi (batch, tunlik)
```
iQueue DB ──(read-only ETL)──► queue_events (source='real')
                                     │
                          (Prefect/cron retrain)
                                     │
                         LightGBM global model
                                     │
                              forecasts jadvali
```

### Real-vaqt oqimi (jonli)
```
Joriy navbat holati ──► .NET Gateway ──► Python (tavsiya hisobla)
                                              │
                                        recommendations jadvali
                                              │
                         SignalR push ──► Angular dashboard (jonli)
                                              │
                         Menejer tasdiqlaydi ──► audit + observed_outcome
```

---

## 4. Integratsiya patternlari (uch yetkazish rejimi)

### Rejim A — Mustaqil dashboard (standalone)
To'liq paket: Angular + .NET + Python + DB. O'z auth (JWT). **Mijozda tizim yo'q yoki mustaqil xohlaganda.**

### Rejim B — API-integratsiya
Mijoz o'z UI'sidan bizning REST API'ni chaqiradi. **Mobile Solutions o'z iQueue interfeysiga singdirganda.**
- Auth: JWT yoki API-key.
- CORS to'g'ri sozlangan.
- Bizning dashboard kerak emas — faqat "miya".

### Rejim C — Micro-frontend / iframe
Bizning Angular dashboard mijoz panelida iframe sifatida chaqiriladi. **Mijozda tizim bor, lekin bizning tayyor UI'ni xohlaganda.**

**Xavfsiz iframe integratsiyasi (muhim):**
- Backend qisqa muddatli **embed/guest JWT** yaratadi (private key bilan imzolangan).
- Token iframe'ga **`postMessage`** orqali uzatiladi (cookie'ga bog'liq emas — uchinchi-tomon cookie cheklovlaridan mustaqil).
- Parent origin `frame-ancestors` CSP'da whitelisted.
- Har `postMessage` da **`origin` validatsiya** majburiy.
- Kalit rotatsiyasi, token qisqa muddat.

**Iframe vs web-component:** iframe = kuchli izolyatsiya (sandbox), tez integratsiya, oddiy "ko'rsatish" uchun ideal. Web-component = yaxshiroq singish, lekin kamroq izolyatsiya. **MVP uchun iframe + postMessage yetarli.** Chuqur ikki tomonlama integratsiya (ularning navbat tugmasini bosish) kerak bo'lsa — API rejimiga o'tiladi.

---

## 5. Real-vaqt transport tanlovi

| Variant | Qachon | Izoh |
|---------|--------|------|
| **SignalR** ✅ | Asosiy tanlov | WebSocket ustidagi abstraktsiya; avtomatik SSE/long-polling fallback; ikki tomonlama (menejer tasdig'i); Redis backplane bilan masshtablanadi |
| SSE | Faqat bir yo'nalishli push | Yengilroq, HTTP-native; .NET 10 native qo'llab-quvvatlaydi |
| Polling | ❌ | Resurs isrofi |

---

## 6. Deployment arxitekturasi (MVP)

```
docker-compose:
  ├── angular-nginx   (dashboard, statik)
  ├── dotnet-gateway  (API + SignalR)
  ├── python-ml       (FastAPI + LightGBM)
  ├── timescaledb     (PostgreSQL + TimescaleDB)
  └── redis           (SignalR backplane + kesh)
```
MVP uchun bitta Ubuntu VPS yetarli. Observability: strukturaviy logging, `/health` endpointlar, Prometheus/Grafana (TimescaleDB Grafana bilan native mos).

---

## 7. Xavfsizlik va maxfiylik (qisqacha)

- **Navbat ma'lumoti** odatda shaxsiy emas (talon raqami, vaqt, xizmat turi) — past risk.
- **Faza 3 (kamera/Face-ID)** — biometrik ma'lumot. O'zbekiston O'RQ-547 qonuni: mahalliy saqlash + subyekt roziligi. **Anonim odam-sanash afzal** (biometrikasiz).
- API: JWT qisqa muddat, HTTPS majburiy, rate limiting.

Batafsil qonuniy jihatlar: [`ROADMAP.md`](ROADMAP.md) → Faza 3.
