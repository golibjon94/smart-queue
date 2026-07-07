# smart-queue

> **Vaqtinchalik ishchi nom.** Yakuniy loyiha nomi keyinroq belgilanadi va barcha fayllarga singdiriladi.

Mavjud bank navbat tizimini (iQueue.uz / Mobile Solutions) **"aqlli"** qiluvchi AI qo'shimcha modul. Statik "keyingi talon → keyingi bo'sh kassa" tizimini **bashorat qiladigan, o'ylaydigan va harakatga chorlaydigan** tizimga aylantiradi.

---

## Loyiha bir jumlada

iQueue mavjud navbat ma'lumotlaridan foydalanib, mijozlar oqimini oldindan bashorat qiladi, real vaqtda kassalarni optimal boshqaradi va operator/menejerga o'zbek tilida aniq tavsiyalar beradi — natijada o'rtacha kutish vaqti ~30 daqiqadan ~15 daqiqagacha kamayadi, **yangi xodim yollamasdan**.

---

## Uch qatlam (mahsulotning "aqli")

| Qatlam | Vazifasi | Misol |
|--------|----------|-------|
| **1. Bashorat (Predict)** | Kelajakni ko'radi | "Ertaga 14:00da portlash — 40 mijoz kutilmoqda" |
| **2. Real-vaqt boshqaruv (Orchestrate)** | Hozirni boshqaradi | "3-kassa bo'sh, A navbatini o'sha yerga yo'naltir" |
| **3. Yordamchi (Assist)** | Qarorni odamga yetkazadi | Ekranda / ovozda: "4-kassani oching (kutish 13 daq kamayadi)" |

---

## Asosiy tamoyillar (o'zgarmas qarorlar)

- **API-birinchi:** "miya" (ML + tavsiya dvigateli) "yuz"dan (Angular dashboard) ajratilgan. Bu bir mahsulotni uch xil sotish imkonini beradi.
- **Uch yetkazish rejimi:** (a) mustaqil dashboard, (b) mijoz tizimiga API-integratsiya, (c) micro-frontend / iframe. **Mijoz tanlaydi.**
- **Mock-birinchi:** MVP sintetik ma'lumot bilan boshlanadi va qiymatni **real ma'lumotdan oldin** isbotlaydi.
- **Hardware'siz start:** Faza 1 va 2 uchun yangi qurilma **kerak emas** — mavjud terminal, tablo va karnay qayta ishlatiladi.
- **Advisory, majburiy emas:** tizim tavsiya beradi, oxirgi qaror menejerники.

---

## Hujjatlar navigatsiyasi

| Hujjat | Nima haqida | Kim uchun |
|--------|-------------|-----------|
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Texnik arxitektura, stack, komponentlar oqimi, integratsiya patternlari | Dasturchi |
| [`TECH_STACK.md`](docs/TECH_STACK.md) | Texnologiyalar, kutubxonalar, ML modellari, TTS tanlovi | Dasturchi |
| [`DATABASE.md`](docs/DATABASE.md) | To'liq DB sxema, DDL, TimescaleDB | Dasturchi |
| [`ROADMAP.md`](docs/ROADMAP.md) | Fazalar (0→3), deliverable, vaqt, metrika | Dasturchi + biznes |
| [`DEMO_SCENARIO.md`](docs/DEMO_SCENARIO.md) | "O'z-o'ziga javob beruvchi" demo ssenariysi | Sotuv + dasturchi |
| [`BUSINESS_DEAL.md`](docs/BUSINESS_DEAL.md) | Mobile Solutions bilan muzokara, revenue-share | Biznes / muzokara |

> **Muzokara uchun:** `BUSINESS_DEAL.md` va `DEMO_SCENARIO.md` asosida alohida PDF taqdimot tayyorlanadi.

---

## Hozir nima qilish kerak (keyingi qadam)

1. **Faza 0** ni boshlash: sintetik ma'lumot generatori + DB sxema + LightGBM bashorat + Angular demo. Batafsil: [`ROADMAP.md`](docs/ROADMAP.md).
2. Ishlaydigan demo tayyor bo'lgach → Mobile Solutions bilan uchrashuv (mock data bilan, real data so'rashdan oldin).

---

## Texnologiya (qisqacha)

`Angular` (dashboard) · `Python + FastAPI` (ML/bashorat) · `.NET 8` (orkestratsiya + SignalR) · `PostgreSQL 16 + TimescaleDB` (navbat hodisalari) · `Docker Compose` (deployment)

To'liq: [`TECH_STACK.md`](docs/TECH_STACK.md).
