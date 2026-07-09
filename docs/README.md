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
| [`LOYIHA_HOLATI.md`](LOYIHA_HOLATI.md) | **Handoff / umumiy holat — davom ettirish uchun avval shuni o'qing** | Hamma |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Texnik arxitektura, stack, komponentlar oqimi, integratsiya patternlari | Dasturchi |
| [`TECH_STACK.md`](TECH_STACK.md) | Texnologiyalar, kutubxonalar, ML modellari, TTS tanlovi | Dasturchi |
| [`DATABASE.md`](DATABASE.md) | To'liq DB sxema, DDL, TimescaleDB | Dasturchi |
| [`ROADMAP.md`](ROADMAP.md) | Fazalar (0→3), deliverable, vaqt, metrika | Dasturchi + biznes |
| [`PLAN.md`](PLAN.md) | Faza 0 mayda vazifalar rejasi (B0–B7) | Dasturchi |
| [`DEMO_SCENARIO.md`](DEMO_SCENARIO.md) | "O'z-o'ziga javob beruvchi" demo ssenariysi | Sotuv + dasturchi |
| [`PYTHON_AI_HISOBOT.md`](PYTHON_AI_HISOBOT.md) | Python/AI qismi — generator, LightGBM, Erlang-C, natijalar | Dasturchi |
| [`faza1/`](faza1/) | Faza 1 bajarish paketi (servislararo kontrakt + IDE promptlari) | Dasturchi |
| [`../services/gateway/ARCHITECTURE.md`](../services/gateway/ARCHITECTURE.md) | Gateway (.NET) ichki arxitektura | Dasturchi |
| [`../apps/dashboard/ARCHITECTURE.md`](../apps/dashboard/ARCHITECTURE.md) | Dashboard (Angular) ichki arxitektura | Dasturchi |

> **Muzokara uchun:** `DEMO_SCENARIO.md` asosida alohida PDF taqdimot tayyorlanadi.

---

## Hozir nima qilish kerak (keyingi qadam)

**Faza 0 va Faza 1 tugagan** ✅ — sintetik ma'lumotdagi to'liq demo tayyor: bashorat, real-vaqt
SignalR push, JIQ marshrutlash, EWMA anomaliya paneli. Joriy holat: [`LOYIHA_HOLATI.md`](LOYIHA_HOLATI.md).

1. Ishlaydigan demo bilan → Mobile Solutions bilan uchrashuv (mock data, real data so'rashdan oldin).
2. **Faza 2** ni tayyorlash: real iQueue ETL (`source='real'`), inkremental retraining + drift monitoring, mavjud ovoz/tablo integratsiyasi. Batafsil: [`ROADMAP.md`](ROADMAP.md).

---

## Texnologiya (qisqacha)

`Angular` (dashboard) · `Python + FastAPI` (ML/bashorat) · `.NET 10` (orkestratsiya + SignalR) · `PostgreSQL 17 + TimescaleDB` (navbat hodisalari) · `Docker Compose` (deployment)

To'liq: [`TECH_STACK.md`](TECH_STACK.md).
