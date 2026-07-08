# Gateway — Arxitektura va Bajarilgan Ishlar

> Servis: **SmartQueue.Gateway** (`services/gateway/src/SmartQueue.Gateway`)
> Platforma: **.NET 10** · ASP.NET Core Web API (MVC controllers)
> Roli: tizimning "miyasi" — yagona kirish nuqtasi (auth, orkestratsiya, ML proxy)

Bu hujjat Gateway'ning ichki arxitekturasini, qatlamlarini va 2026-07-08 da
o'tkazilgan qayta tuzish (refactoring) ishlarini tavsiflaydi. Umumiy tizim
arxitekturasi uchun: [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

---

## 1. Roli va mas'uliyati

Gateway tashqi dunyoning yagona kirish nuqtasi ("miya"). U:

- **Autentifikatsiya/avtorizatsiya** — JWT (HS256), login validatsiyasi, default admin seed.
- **Python ML servisiga proxy** — bashorat va tavsiya so'rovlarini uzatish.
- **Demo navbat holati** — Faza 0 uchun xotiradagi jonli holat (keyin real iQueue ma'lumoti egallaydi).
- **Menejer qarorlari** — tavsiya qabul/rad qilish va audit izi (DB).

```
Angular Dashboard ──REST/JSON──► Gateway ──HTTP──► Python ML (FastAPI)
                                    │
                                    └──ADO.NET──► PostgreSQL + TimescaleDB
```

---

## 2. Texnologiyalar

| Qatlam | Tanlov | Izoh |
|--------|--------|------|
| Framework | ASP.NET Core (.NET 10) | Web API, MVC controllers |
| API uslubi | **MVC Controllers** (`[ApiController]`) | Standart, tanish, attribute routing |
| DB kirish | **Npgsql** (raw ADO.NET) | Yengil, ORM'siz — Gateway asosan proxy |
| Auth | `Microsoft.AspNetCore.Authentication.JwtBearer` | JWT bearer |
| Parol | **BCrypt.Net-Next** | Parol hash'lash |
| Konfiguratsiya | **Options pattern** (`IOptions<T>`) | Typed + startup validatsiya |
| Xatolar | `IExceptionHandler` + **ProblemDetails** (RFC 7807) | Markazlashgan xato javobi |

---

## 3. Arxitektura uslubi: Vertical Slice (feature-folder)

Har bir biznes imkoniyati (feature) o'z papkasida — controller, service,
repository va contract'lar birga turadi. Bu Angular tomonidagi
`features/<feature>/{data,models,ui}` yondashuviga ataylab mos qilingan.

Har feature ichidagi **texnik qatlamlar**:

```
Controller  →  Service  →  Repository  →  DB / ML
(API)          (mantiq)     (data-access)
```

- **Controller** — HTTP kirishi: routing, model binding, avtorizatsiya, javob shakli. Biznes-mantiq yo'q.
- **Service** — orkestratsiya va biznes qoidalari. HTTP'ni bilmaydi.
- **Repository** — barcha SQL shu yerda kapsulalanadi. Boshqa joyda raw SQL yo'q.
- **Contracts** — DTO record'lar (so'rov/javob) va persistence yozuvlari.

---

## 4. Papka strukturasi

```
SmartQueue.Gateway/
├── Program.cs                      # Yupqa composition root (~17 qator)
│
├── Configuration/                  # Options pattern (typed sozlamalar)
│   ├── DatabaseOptions.cs          #   PostgreSQL ulanishi + validatsiya
│   ├── JwtOptions.cs               #   JWT kalit/issuer/audience/muddat
│   ├── MlServiceOptions.cs         #   ML servis URL + timeout
│   └── AdminOptions.cs             #   Default admin login/parol
│
├── Extensions/                     # Program.cs'ni yupqa saqlash
│   ├── ServiceCollectionExtensions.cs   #  AddGateway* (DI ro'yxati)
│   └── WebApplicationExtensions.cs      #  UseGatewayPipeline, MapControllers, seed
│
├── Common/                         # Cross-cutting
│   ├── ErrorResponse.cs            #   { "error": "..." } shakli
│   └── GlobalExceptionHandler.cs   #   IExceptionHandler → ProblemDetails
│
├── Infrastructure/
│   └── Ml/
│       ├── MlClient.cs             #   Typed HttpClient (ML proxy)
│       └── MlContracts.cs          #   snake_case wire-kontraktlar
│
└── Features/                       # Vertical slice'lar
    ├── Auth/
    │   ├── AuthController.cs        #   POST /api/auth/login, GET /api/auth/me
    │   ├── AuthService.cs          #   login validatsiyasi, admin seed
    │   ├── JwtTokenGenerator.cs    #   JWT chiqarish
    │   ├── UserRepository.cs       #   users jadvali (SQL)
    │   └── AuthContracts.cs        #   LoginRequest/Response, UserInfo, ...
    ├── Queue/
    │   ├── QueueController.cs       #   GET /api/queue-state, POST /api/demo/scenario
    │   ├── DemoStateService.cs     #   thread-safe xotira holati
    │   ├── ReferenceDataRepository.cs  # branches/counters/service_types (SQL)
    │   └── QueueContracts.cs       #   BranchState, CounterState, ...
    ├── Forecast/
    │   └── ForecastController.cs    #   GET /api/forecast (ML proxy)
    ├── Recommendations/
    │   ├── RecommendationsController.cs  # refresh / list / respond
    │   ├── RecommendationService.cs      # orkestratsiya
    │   ├── RecommendationRepository.cs   # recommendations jadvali (SQL)
    │   └── RecommendationContracts.cs    # RespondRequest, RecommendationRow, ...
    └── Health/
        └── HealthController.cs      #   GET /health (ochiq)
```

---

## 5. So'rov hayotiy sikli (request lifecycle)

```
HTTP so'rov
   │
   ▼
UseExceptionHandler ──► ushlanmagan istisno bo'lsa → ProblemDetails (500)
   │
   ▼
UseCors ──► dashboard origin tekshiruvi
   │
   ▼
UseAuthentication ──► JWT tekshiruvi (imzo, muddat, issuer, audience)
   │
   ▼
UseAuthorization ──► [Authorize] / [AllowAnonymous]
   │
   ▼
Controller (action) ──► Service ──► Repository ──► DB / ML
   │
   ▼
JSON javob (camelCase)
```

`Program.cs` bu zanjirni to'liq aks ettiradi:

```csharp
builder.Services
    .AddGatewayConfiguration(builder.Configuration)
    .AddGatewayDatabase()
    .AddGatewayServices()
    .AddGatewayAuthentication()
    .AddGatewayCors(builder.Configuration)
    .AddGatewayErrorHandling();

var app = builder.Build();
await app.SeedDefaultAdminAsync();
app.UseGatewayPipeline();
app.MapGatewayEndpoints();   // → app.MapControllers()
app.Run();
```

---

## 6. API endpoint'lari (Angular kontrakti)

Barcha javoblar **camelCase JSON**. `[Authorize]` ustunidagi ✔ — JWT talab qilinadi.

| Metod | Yo'l | Auth | Tavsif |
|-------|------|:----:|--------|
| `GET`  | `/health` | — | DB va ML holati: `{status, db, ml}` |
| `POST` | `/api/auth/login` | — | Login → `{token, expiresAt, user}` |
| `GET`  | `/api/auth/me` | ✔ | Joriy foydalanuvchi (token'dan) |
| `GET`  | `/api/queue-state?branchId=` | ✔ | Filial navbat holati |
| `POST` | `/api/demo/scenario` | ✔ | Ssenariy almashtirish (`normal` \| `lunch_peak`) |
| `GET`  | `/api/forecast?branchId=&hours=` | ✔ | Bashorat (ML passthrough) |
| `POST` | `/api/recommendations/refresh?branchId=` | ✔ | Yangi tavsiya hisoblash (ML) |
| `GET`  | `/api/recommendations?branchId=&status=` | ✔ | Tavsiyalar ro'yxati (DB) |
| `POST` | `/api/recommendations/{recId}/respond` | ✔ | Qabul/rad (audit izi) |

> **Muhim:** refactoring API kontraktini o'zgartirmagan — Angular hech qanday
> moslashuvsiz ishlaydi.

---

## 7. Cross-cutting yechimlar

### 7.1 Konfiguratsiya (Options pattern)

Flat env kalitlari (`POSTGRES_HOST`, `JWT_KEY`, `ML_SERVICE_URL`, ...) typed
Options'ga bog'lanadi va startup'da tekshiriladi (`ValidateDataAnnotations().ValidateOnStart()`).
Bu docker-compose / `.env` bilan mosligini saqlaydi, lekin `int.Parse` crash
riskini `int.TryParse` bilan yo'q qiladi.

### 7.2 Dependency Injection lifetime'lari

| Servis | Lifetime | Sabab |
|--------|----------|-------|
| `NpgsqlDataSource` | Singleton | Connection pooling |
| Repozitoriylar (`User`, `ReferenceData`, `Recommendation`) | Singleton | Holatsiz, faqat `NpgsqlDataSource`'ga bog'liq |
| `JwtTokenGenerator` | Singleton | Holatsiz |
| `DemoStateService` | Singleton | Xotirada jonli holat saqlaydi |
| `AuthService`, `RecommendationService` | Scoped | Har so'rov konteksti |
| `MlClient` | Transient (`AddHttpClient`) | `HttpClientFactory` boshqaradi |

> **Captive dependency yo'q:** singleton `DemoStateService` faqat singleton
> `ReferenceDataRepository`'ga bog'liq — DI grafi startup'da tekshiriladi.

### 7.3 Autentifikatsiya

JWT `TokenValidationParameters` typed `JwtOptions`'dan sozlanadi
(`IConfigureOptions<JwtBearerOptions>` orqali). Issuer, audience, muddat va imzo
tekshiriladi; `ClockSkew` 30 soniya.

### 7.4 Xato ishlash

`GlobalExceptionHandler` ushlanmagan istisnolarni RFC 7807 ProblemDetails
ko'rinishida qaytaradi. Ichki tafsilotlar mijozga oshkor qilinmaydi (faqat log).
Validatsiya/auth xatolari `{ "error": "..." }` shaklida (dashboard shuni kutadi).

### 7.5 Thread-safety (DemoStateService)

Singleton bo'lgani uchun holat mutatsiyasi himoyalangan:
- **Yuklash** — `SemaphoreSlim` (double-checked) orqali bir marta.
- **Mutatsiya** (jitter, ssenariy) — har filial uchun `Lock` ostida.
- **Tasodifiylik** — `Random.Shared` (thread-safe).

---

## 8. Qayta tuzishda tuzatilgan muammolar

Eski holat (`Program.cs` 217 qator + `Models/` + `Services/`) → yangi vertical-slice.

| # | Muammo (oldin) | Yechim (hozir) |
|---|----------------|----------------|
| 1 | Barcha endpoint/SQL/config `Program.cs`da (217 qator) | Yupqa root + feature controller'lar + extension'lar |
| 2 | Raw SQL hamma joyda (Program, servislar) | **Repository qatlami** — SQL faqat repozitoriylarda |
| 3 | `cfg["..."]` + `int.Parse` (crash riski) | **Options pattern** + `int.TryParse` + `ValidateOnStart` |
| 4 | `GetAwaiter().GetResult()` (deadlock riski) | To'liq **async**, `SemaphoreSlim` |
| 5 | Singleton'da lock'siz mutatsiya | **Thread-safe** (`Lock` + `Random.Shared`) |
| 6 | Anonim obyektlar (javoblar) | Aniq **DTO record**'lar |
| 7 | `service_type_id` snake C# maydonlari | PascalCase + `[JsonPropertyName]` |
| 8 | `respondedBy` request body'dan | **JWT claim'idan** (audit uchun ishonchli) |
| 9 | Exception handling yo'q | `IExceptionHandler` + ProblemDetails |

---

## 9. Muhim dizayn qarorlari

**Nega MVC Controller (Minimal API emas)?**
Standart, tanish uslub va jamoa konvensiyasi. Pastki qatlamlar (Service,
Repository, DTO) uslub tanlovidan mustaqil — kelajakda kerak bo'lsa qayta
o'tkazish arzon.

**Nega ORM (EF Core) emas, raw Npgsql?**
Gateway asosan proxy va sodda o'qish/yozish qiladi. TimescaleDB (JSONB, array,
hypertable) bilan to'g'ridan-to'g'ri SQL yengilroq va shaffofroq. ORM keyingi
fazalarda (murakkab domen paydo bo'lsa) qo'shilishi mumkin.

**Nega `DemoStateService` singleton?**
Faza 0 da "jonli" navbat holati xotirada simulyatsiya qilinadi. Faza 2 da bu
servis o'rnini real iQueue ETL ma'lumoti egallaydi — interfeys o'zgarmaydi.

---

## 10. Build va ishga tushirish

```bash
# Loyiha papkasi
cd services/gateway/src/SmartQueue.Gateway

# Build
dotnet build -c Release

# Lokal ishga tushirish (launchSettings.json → http://localhost:5143)
dotnet run

# Docker (butun stack)
cd ../../../../infra && docker compose up dotnet-gateway
```

Konfiguratsiya `.env` / docker-compose orqali (flat kalitlar):
`POSTGRES_*`, `JWT_KEY`, `JWT_EXPIRY_HOURS`, `ML_SERVICE_URL`,
`DASHBOARD_ORIGIN`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`.

---

## 11. Keyingi qadamlar

- [ ] **Birlik testlar** (`services/gateway/tests/`) — controller/service/repository.
- [ ] **SignalR real-vaqt push** (`Features/Realtime/`) — dashboard'ga jonli holat/tavsiya.
- [ ] **Redis** — SignalR backplane + ML javoblarini keshlash.
- [ ] **OpenAPI/Swagger** — `AddOpenApi()` + `MapOpenApi()` (dev'da API hujjati).
- [ ] Rate limiting va HTTPS majburiy (prod).
```
