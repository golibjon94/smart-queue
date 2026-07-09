# COMMANDS — Buyruqlar ma'lumotnomasi

> Barcha buyruqlar loyiha ildizidan (`C:\Users\g.turaqulov\Desktop\smart-queue`) PowerShell'da
> ishga tushiriladi. Docker Desktop ochiq bo'lishi shart.

---

## 1. Eng kerakli (wrapper skriptlar)

| Buyruq | Vazifa |
|--------|--------|
| `.\scripts\up.ps1` | Ishga tushiradi + **bo'sh bazani avtomatik tiklaydi** (migratsiya + admin + demo) |
| `.\scripts\up.ps1 -Build` | **Kod o'zgargandan keyin** — qayta qurib ishga tushiradi |
| `.\scripts\down.ps1` | To'xtatadi (ma'lumot saqlanadi) |
| `.\scripts\down.ps1 -Wipe` | To'xtatadi va **ma'lumotni o'chiradi** (toza boshlash) |
| `.\scripts\status.ps1` | Konteynerlar holati |
| `.\scripts\logs.ps1` | Barcha loglar (jonli) |
| `.\scripts\logs.ps1 gateway` | Bitta servis logi (`gateway`/`python-ml`/`angular-nginx`/`timescaledb`/`redis`) |
| `.\scripts\seed-demo.ps1` | Demo ma'lumotini yangilaydi + anomaliya in'ektsiya qiladi |

**Kirish:** http://localhost:4300 · login `admin` · parol `Admin!2026`

---

## 2. Odatiy ish oqimi

```powershell
# Boshlash (ma'lumot volume'da saqlangan — demo darhol ishlaydi)
.\scripts\up.ps1

# ... ishlash ...

# To'xtatish
.\scripts\down.ps1
```

Kod o'zgartirsangiz, o'zgarishlarni olish uchun `-Build` bilan ko'taring:
```powershell
.\scripts\up.ps1 -Build
```

---

## 3. Manzillar (ochilgach)

| Manzil | Nima |
|--------|------|
| http://localhost:4300 | Dashboard (admin / Admin!2026) |
| http://localhost:5080/health | Gateway holati (`{db, ml}`) |
| http://localhost:8000/docs | ML API (Swagger) |
| `localhost:5433` | TimescaleDB (foydalanuvchi `smartqueue`) |

---

## 4. To'liq docker compose buyruqlari (skriptsiz)

```powershell
# Ishga tushirish
docker compose -f infra/docker-compose.yml --env-file .env up -d --build

# Holat / loglar / to'xtatish
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs -f dotnet-gateway
docker compose -f infra/docker-compose.yml down          # ma'lumot saqlanadi
docker compose -f infra/docker-compose.yml down -v       # ma'lumot o'chadi

# Bitta servisni qayta qurish/ishga tushirish
docker compose -f infra/docker-compose.yml up -d --build python-ml
docker compose -f infra/docker-compose.yml restart dotnet-gateway
```

---

## 5. Ma'lumot va model

**Demo ma'lumotini yangilash (anomaliya paneli uchun) — stack ishlab turganda:**
```powershell
.\scripts\seed-demo.ps1
```

**Toza DB'dan noldan (`down -Wipe` dan keyin):**
`up.ps1` bo'sh bazani **avtomatik** tiklaydi (migratsiya + admin + demo ma'lumot):
```powershell
.\scripts\up.ps1
```
> Faqat model yo'q bo'lsa (toza klon — `services\ml\models\latest.joblib` yo'q) avval host'da
> o'qiting, keyin qayta ko'taring:
> ```powershell
> cd services\ml ; .\.venv\Scripts\python -m forecasting.train ; cd ..\..
> .\scripts\up.ps1
> ```

**DB'ga to'g'ridan-to'g'ri kirish:**
```powershell
docker exec -it sq-timescaledb psql -U smartqueue -d smartqueue
```

---

## 6. Development rejimi (Docker'siz, hot-reload)

DB/Redis Docker'da qoladi (`.\scripts\up.ps1` faqat DB kerak bo'lsa ham ishlaydi), servislar lokal:
```powershell
# Gateway
cd services\gateway\src\SmartQueue.Gateway ; dotnet run --urls http://localhost:5080
# ML
cd services\ml ; .\.venv\Scripts\python -m uvicorn app.main:app --port 8000
# Dashboard (default port 4300)
cd apps\dashboard ; ng serve
```

Birinchi marta ML muhitini o'rnatish:
```powershell
cd services\ml ; py -3.11 -m venv .venv ; .\.venv\Scripts\pip install -e ".[dev]"
```
Dashboard bog'liqliklari (PrimeNG 21 + Angular 22):
```powershell
cd apps\dashboard ; npm install --legacy-peer-deps
```

---

## 7. Test va build

```powershell
# ML testlar
cd services\ml ; .\.venv\Scripts\python -m pytest tests -q
# Gateway build
cd services\gateway\src\SmartQueue.Gateway ; dotnet build -c Release
# Dashboard build
cd apps\dashboard ; ng build
```

---

## 8. Tez tekshiruv (health)

```powershell
# Gateway (DB + ML holati)
Invoke-RestMethod http://localhost:5080/health

# Login (token oladi)
Invoke-RestMethod http://localhost:5080/api/auth/login -Method Post -ContentType "application/json" -Body '{"username":"admin","password":"Admin!2026"}'
```

---

## Eslatmalar

- **DB volume (`timescale_data`)** `down` da saqlanadi — demo ma'lumot, bashorat, anomaliya,
  admin foydalanuvchi qoladi. Faqat `down -Wipe` (yoki `down -v`) o'chiradi.
- **Kod o'zgarsa** `-Build` bilan ko'taring, aks holda eski image ishlaydi.
- **Portlar** `.env` dagi `DASHBOARD_PORT` (4300), `GATEWAY_PORT` (5080), `ML_SERVICE_PORT` (8000),
  `POSTGRES_PORT` (5433) orqali. O'zgartirsangiz `up` qayta ko'taradi.
- Lokal PostgreSQL (5432) ga tegilmaydi — loyiha DB'si Docker'da **5433**.
