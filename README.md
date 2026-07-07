# smart-queue

> Vaqtinchalik ishchi nom. Mavjud bank navbat tizimini (iQueue.uz) **"aqlli"** qiluvchi AI qo'shimcha modul: bashorat + real-vaqt boshqaruv + o'zbekcha tavsiyalar.

## Hujjatlar

Loyihaning to'liq tavsifi [`docs/`](docs/) papkasida:

| Hujjat | Mazmun |
|--------|--------|
| [`docs/README.md`](docs/README.md) | Loyiha nima, tamoyillar, navigatsiya |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Texnik arxitektura |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Texnologiyalar va asoslash |
| [`docs/DATABASE.md`](docs/DATABASE.md) | DB sxema (TimescaleDB) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Fazalar 0→3 |
| [`docs/PLAN.md`](docs/PLAN.md) | Papka tuzilishi + Faza 0 vazifalari |

## Tuzilish

```
db/         SQL migratsiyalar + seed
services/   ml (Python+FastAPI) · gateway (.NET)
apps/       dashboard (Angular)
infra/      docker-compose, DB init
scripts/    yordamchi skriptlar
```

## Tez boshlash (development)

Talablar: Docker Desktop, Python 3.11, .NET 10 SDK, Node 24 + Angular CLI.

```bash
# 1. Environment sozlash
cp .env.example .env        # qiymatlarni tekshiring

# 2. Infratuzilma (TimescaleDB 5433-portda + Redis)
docker compose -f infra/docker-compose.yml --env-file .env up -d

# Keyingi qadamlar Faza 0 davomida qo'shiladi (docs/PLAN.md → B1..B7)
```

> Lokal PostgreSQL 18 (5432) ga tegilmaydi — loyiha DB'si Docker'da **5433**-portda ishlaydi.
