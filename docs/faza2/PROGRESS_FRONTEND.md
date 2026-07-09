# PROGRESS_FRONTEND — Faza 2 Frontend qismi (bajarildi)

> Qamrov: `apps/dashboard` (Angular 22 zoneless + signals, PrimeNG 21 Aura, Tailwind v4,
> @microsoft/signalr). Uch funksiyaning Frontend tomoni tayyor. Faza 0-1 komponentlariga
> tegilmadi — faqat qo'shildi. Barcha UI matni o'zbekcha (kirill aralashmagan). Mavjud
> "Aurora Obsidian" dizayn tili (tokenlar, `sq-*` klasslar, CountUp) izchil ishlatilgan.

## Bajarilgan ishlar

### VAZIFA 1 — What-if simulyatsiya slayderi ✅
- `features/dashboard/ui/whatif-panel/whatif-panel.ts` (standalone, OnPush).
- PrimeNG `Slider` (1..10 kassa). Slayder o'zgarganda **~150ms debounce** bilan
  `POST /api/simulate` chaqiriladi (store orqali).
- **Baseline vs scenario yonma-yon:** "Hozir: ~N daq" | "Slayder: ~M daq". Raqamlar
  animatsiyali (`sqCountUp` shared direktivi qayta ishlatildi).
- **Delta ta'kidlash:** "Kutish X daqiqa kamayadi (Y%)" — yashil (yaxshilansa) / qizil
  (yomonlashsa). `waitReductionSec ≥ 0` bo'lsa "kamayadi", aks holda "oshadi".
- Dashboard'da o'ng ustun tepasida (forecast/recommendations yaqinida). Panel ochilganda
  joriy ochiq kassalar bo'yicha bir marta avtomatik simulyatsiya (baseline ko'rinishi uchun).

### VAZIFA 2 — QR mijoz sahifasi + jonli pozitsiya ✅
Yangi **public** feature: `features/virtual-queue/` (login yo'q, shell yo'q, mobil-birinchi).
- **Route'lar** (`app.routes.ts`, authGuard/AppShell'dan **tashqarida**):
  - `/q/join` — `QueueJoin` (default export). `branch`/`service`/`label` query param'lari
    `withComponentInputBinding` orqali input'larga bog'lanadi. Tasdiqlagach
    `POST /api/vq/join` → `/q/{token}`'ga o'tadi.
  - `/q/:token` — `QueueTicket` (default export). Katta raqamli **"Siz N-o'rindasiz"** +
    **"~M daqiqa"** + status pill + **"Navbatdan chiqish"** (`/api/vq/leave/{token}`).
- **SignalR (jonli, polling yo'q):** `VqRealtimeService` — menejer `RealtimeService`'idan
  **alohida**, yengil, auth'siz ulanish. `JoinTicket(token)` → `vq-{token}` guruhi,
  `vqPositionUpdated` push → pozitsiya/ETA jonli yangilanadi. Boshlang'ich holat bir martalik
  `GET /api/vq/status/{token}`.
- **Talon lifecycle UI:** `waiting`/`called` → jonli pozitsiya ekrani; `serving`/`completed`/
  `abandoned` → tegishli yakuniy ekran. `completed`'da **baho + izoh formasi** (sentiment demo,
  `POST /api/feedback`).
- **QR generatsiya (menejer tomoni):** `features/dashboard/ui/qr-join-card/qr-join-card.ts` —
  xizmat turini tanlash + QR tasvir (oddiy QR API, apparatsiz). QR →
  `{origin}/q/join?branch=&service=&label=`. Havola ekranda ham ko'rsatiladi.
- **Menejer ko'rinishi:** `features/dashboard/ui/virtual-tickets-panel/virtual-tickets-panel.ts` —
  faol virtual talonlar ro'yxati, har biri **"virtual"** belgisi bilan (fizik talonlardan farq).
  `GET /api/vq/tickets?branchId=` + qo'lda yangilash tugmasi (menejer mijoz guruhlariga
  obuna emas, shuning uchun HTTP + refresh).

### VAZIFA 3 — Sentiment-feedback dashboard paneli ✅
- `features/dashboard/ui/feedback-panel/feedback-panel.ts`.
- `GET /api/feedback/summary` dan: **sentiment donut** (ijobiy/neytral/salbiy — yashil/amber/
  qizil, SVG stroke-dasharray), foizlar + sonlar, o'rtacha baho, **top mavzular** (bar bilan).
- **Filial "issiqlik" ko'rsatkichi:** `heat` (green/yellow/red) → panel yuqorisida rangli
  badge ("Barqaror" / "E'tibor" / "Muammoli"), qizilda pulslaydigan nuqta.
- **Demo uchun izoh kiritish:** panel ichida yulduz baho + izoh maydoni →
  `POST /api/feedback` → jamlanma qayta yuklanadi (salbiy izoh → panel jonli "qizil"ga o'tadi).
  Toast: sentiment natijasiga qarab (salbiy/ijobiy/neytral).
- iQueue CSI'dan farq: panel subtitr va mavzular ro'yxati **sabab/mavzuni** ko'rsatadi.

## O'zgargan/yangi fayllar
```
src/app/app.routes.ts                                   (+ /q/join, /q/:token public route)
src/app/features/dashboard/dashboard.ts                 (+ 4 panel import + handlerlar)
src/app/features/dashboard/dashboard.html               (+ whatif/qr/virtual/feedback panellar)
src/app/features/dashboard/data/dashboard-api.ts        (+ simulate, vq/tickets, feedback summary/post)
src/app/features/dashboard/data/dashboard-store.ts      (+ simulation/feedback/virtualTickets holati va action)
src/app/features/dashboard/models/simulate.model.ts     (yangi)
src/app/features/dashboard/models/feedback.model.ts     (yangi)
src/app/features/dashboard/models/index.ts              (+ re-export)
src/app/features/dashboard/ui/whatif-panel/whatif-panel.ts            (yangi)
src/app/features/dashboard/ui/qr-join-card/qr-join-card.ts            (yangi)
src/app/features/dashboard/ui/virtual-tickets-panel/virtual-tickets-panel.ts (yangi)
src/app/features/dashboard/ui/feedback-panel/feedback-panel.ts        (yangi)
src/app/features/virtual-queue/models/vq.model.ts                     (yangi)
src/app/features/virtual-queue/data/vq-api.ts                         (yangi)
src/app/features/virtual-queue/data/vq-realtime.service.ts            (yangi)
src/app/features/virtual-queue/ui/queue-join/queue-join.ts            (yangi, default export)
src/app/features/virtual-queue/ui/queue-ticket/queue-ticket.ts        (yangi, default export)
```

## SignalR o'zgarishi
- Faza 1 `RealtimeService` (menejer, branch guruhi) **tegilmadi**.
- Yangi `VqRealtimeService` (mijoz, `vq-{token}` guruhi) — auth'siz, `JoinTicket`/`LeaveTicket`
  hub metodlarini chaqiradi, `vqPositionUpdated` hodisasini tinglaydi. Polling yo'q.

## Zoneless + signals izchilligi
- Barcha yangi komponentlar `ChangeDetectionStrategy.OnPush`, `signal()`/`computed()`/`effect()`,
  `inject()`. RxJS faqat data qatlamida (`*-api.ts`), `takeUntilDestroyed` bilan.
- Store (`DashboardStore`, feature-scoped) yangi Faza 2 holatini boshqaradi; komponentlar faqat
  signal o'qiydi va output emit qiladi.

## Test / tekshiruv holati
- `npm run build` (production) → **muvaffaqiyatli**, 0 xato. Lazy chunk'lar to'g'ri ajraldi
  (`dashboard`, `queue-ticket`, `queue-join`).
- Dev serverda (`ng serve`) brauzerda tekshirildi:
  - **Login / dashboard** — barcha 4 yangi panel to'g'ri joylashdi va aurora dizayniga mos
    render bo'ldi; PrimeNG slayder dizaynga integratsiyalashgan; QR jonli generatsiya bo'ldi.
  - **`/q/join`** — xizmat labeli query param'dan to'g'ri ("Kredit xizmati"), mobil karta.
  - **`/q/:token`** — jonli pozitsiya ekrani ("A-042 · 4-o'rin · ~7 daq · Kutilmoqda")
    CountUp animatsiyasi bilan; noma'lum tokenda graceful "Talon topilmadi" holati.
  - Konsolda faqat kutilgan SignalR/CORS xatolari (dev origin gateway CORS ro'yxatida emas);
    Angular komponent/template xatolari **yo'q**.

> **Eslatma (bek-uchi bilan to'liq oqim):** hozir ishlab turgan `sq-gateway` va `sq-python-ml`
> konteynerlari **Faza 1 image**. To'liq E2E (real simulate/ETA/sentiment natijalari) uchun ML va
> Gateway konteynerlarini Faza 2 kodi bilan qayta build qilish kerak (`PROGRESS_GATEWAY.md`,
> `PROGRESS_ML.md` eslatmasi). Frontend Faza 2 endpoint yo'qligida **graceful degradatsiya**
> qiladi (baseline "—", jamlanma bo'sh, virtual ro'yxat bo'sh) — demo hech qachon buzilmaydi.

## Demo uchun qanday ko'rsatish
1. **What-if:** dashboard o'ng ustun tepasidagi slayderni suring → "Hozir" vs "Slayder" kutish
   vaqti va yashil delta jonli o'zgaradi.
2. **QR:** "Masofadan navbat (QR)" kartadan xizmatni tanlab QR ni telefonда skanlang →
   `/q/join` → "Navbatga qo'shilish" → telefonда jonli pozitsiya/ETA. Menejer ekranida
   "Masofadan navbat" panelida talon "virtual" belgisi bilan paydo bo'ladi.
3. **Sentiment:** "Mijoz kayfiyati" panelida yulduz + salbiy izoh ("navbat juda uzun edi")
   yuboring → jamlanma qayta yuklanadi, "issiqlik" badge "Muammoli" (qizil)ga o'tadi, top mavzu
   ko'rinadi. (Yoki mijoz sahifasida xizmatdan keyin baho.)

> Keyingi qadam: uchala funksiya tayyor bo'lgach `docs/DEMO_SCENARIO.md` v2 (3 yangi qadam)
> yangilanadi.
