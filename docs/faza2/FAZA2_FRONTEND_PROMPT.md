# FAZA2_FRONTEND_PROMPT.md — Frontend qismi (WebStorm / Angular)

> **Avval `FAZA2_UMUMIY.md` ni to'liq o'qing** — servislararo kontrakt shu yerda. Bu prompt faqat
> Frontend (`apps/dashboard`, Angular) qismini bajaradi. Barcha UI matni **o'zbekcha** (kirill aralashmasin).

## Kontekst

Sen `smart-queue` dashboard'ida (`apps/dashboard`, Angular 22 zoneless + signals, PrimeNG 21 Aura,
Tailwind v4, @microsoft/signalr) ishlayapsan. Mavjud: login, sidebar, dashboard (KPI cards, counters,
queues, forecast chart, recommendations panel, anomalies panel), signal store (`dashboard-store.ts`),
real-time service (`core/realtime/realtime.service.ts`), aurora design tokens/theme switcher.

Mavjud uslub: standalone komponentlar, `export default class`, `ChangeDetectionStrategy.OnPush`,
`signal()`/`inject()`, signal store pattern, PrimeNG + Tailwind. Shu uslubga rioya qil.

---

## VAZIFA 1 — What-if simulyatsiya slayderi — BIRINCHI, ENG "WOW"

**Maqsad:** menejer kassa sonini slayderда o'zgartiradi, kutish vaqti jonli X→Y.

**Amalga oshirish:**
1. `features/dashboard/ui/whatif-panel/whatif-panel.ts` yarat (standalone, OnPush).
2. PrimeNG `Slider` — kassa soni (masalan 1..10). Slayder o'zgarganda (debounce ~150ms)
   `POST /api/simulate` chaqiriladi.
3. Ko'rsatish: **baseline vs scenario yonma-yon** — "Hozir: ~28 daq (4 kassa)" | "Slayder: ~9 daq
   (6 kassa)". Katta, animatsiyali raqam (`count-up` mavjud shared komponentdan foydalanish mumkin).
4. Delta ta'kidlash: "↓ 19 daqiqa kamayadi (68%)" — yashil, kuchli vizual.
5. Panel dashboard'ga qo'shiladi (`dashboard.html`), forecast/recommendations yaqinida.

**Demo qiymati:** bu eng interaktiv "o'yna-ko'r" momenti — bank rahbari o'zi slayderni suradi.
Silliq, tez, animatsiyali bo'lishi shart.

---

## VAZIFA 2 — QR mijoz sahifasi + jonli pozitsiya — ENG KATTA QISM

**Maqsad:** mijoz telefonda QR skanlab navbatga qo'shiladi, jonli pozitsiya/ETA ko'radi.

**Amalga oshirish:**
1. **Mijoz sahifasi** — dashboard'dan **alohida**, oddiy, mobil-birinchi (mijoz uchun, login yo'q):
   - Route: `/q/join` (branch/service query param bilan) va `/q/:token`.
   - `/q/join`: xizmat turini tasdiqlash → `POST /api/vq/join` → tokenli sahifaga o'tadi.
   - `/q/:token`: katta raqamli **"Siz 4-o'rindasiz"** + **"~7 daqiqa"** + status; "Chiqish" tugmasi
     (`/api/vq/leave`). SignalR `vqPositionUpdated` orqali jonli yangilanadi (polling yo'q).
   - Dizayn: sodda, katta shrift, mobil ekran uchun. Aurora token'lardan foydalan, lekin yengil.
2. **QR generatsiya** (demo uchun): dashboard'da yoki alohida sahifada QR kod ko'rsatish (masalan
   `angularx-qrcode` yoki oddiy QR API) — taqdimotchi telefonда skanlaydi. QR → `/q/join?branch=1&service=2`.
3. **Menejer dashboardida:** virtual talonlar fizik talonlar bilan birga ko'rinsin (queues-table'ga
   "virtual" belgisi qo'shish) — menejer masofadan kelayotganlarni ko'radi.

**Muhim:** mijoz sahifasi dashboard auth'iga bog'liq emas — public route. SignalR ulanishi token bilan.

**Demo qiymati:** telefon + katta ekran birga jonlanishi — vizual jihatdan eng ta'sirli moment.

---

## VAZIFA 3 — Sentiment-feedback dashboard paneli

**Maqsad:** izohlar sentiment/mavzu bo'yicha, muammoli filial "qizil".

**Amalga oshirish:**
1. `features/dashboard/ui/feedback-panel/feedback-panel.ts` (yoki alohida feedback route).
2. `GET /api/feedback/summary` dan: sentiment taqsimoti (donut yoki bar — ijobiy/salbiy/neytral %),
   top salbiy mavzular ro'yxati ("sekin xizmat 40%, uzun navbat 25%").
3. **Filial "issiqlik" ko'rsatkichi:** salbiy ulushiga qarab rang (yashil→sariq→qizil). Agar ko'p
   filial bo'lsa — kichik "issiqlik xaritasi" (filiallar ro'yxati rang bilan).
4. **Demo uchun feedback kiritish:** oddiy forma (baho + izoh) yoki mijoz sahifasida xizmatdan keyin —
   taqdimotchi salbiy izoh kiritadi, panel jonli "qizil"ga o'tadi.
5. iQueue CSI'dan farqni ta'kidlash: u faqat 1-5 ball; biz **sabab va mavzuni** ko'rsatamiz.

**Demo qiymati:** "iQueue faqat 3.2 yulduz deydi; biz nega 3.2 ekanini aytamiz."

---

## Umumiy talablar

- Zoneless + signals; RxJS faqat data qatlamida.
- SignalR: mavjud `realtime.service.ts` kengaytiriladi (`vqPositionUpdated`), polling yo'q.
- PrimeNG + Tailwind + aurora token; mavjud dizayn tili bilan izchil.
- Barcha UI matni o'zbekcha (kirill aralashmasin).
- Mijoz sahifasi (`/q/*`) — alohida, mobil-birinchi, auth'siz.
- Faza 0-1 komponentlariga tegma — faqat qo'sh.

## Yakunda

`docs/faza2/PROGRESS_FRONTEND.md` yoz: qo'shilgan komponentlar/route'lar, SignalR o'zgarishi, demo
uchun qanday ko'rsatish. Keyin `DEMO_SCENARIO.md` v2 yangilanadi (3 yangi qadam bilan).
