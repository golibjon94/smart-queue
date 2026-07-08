# Faza 1 — bajarish paketi (3 IDE / 3 chat)

Bu papka Faza 1'ni **uch alohida Claude chatida** (har biri o'z IDE'sida) sifatli va
nazoratli bajarish uchun tayyor materiallar. Hammasi bitta kontrakt orqali bog'langan.

## Fayllar

| Fayl | Kim uchun | Vazifa |
|------|-----------|--------|
| **`FAZA1_UMUMIY.md`** | Hammasi | Servislararo kontrakt — **har uch chat avval shuni o'qiydi** |
| `FAZA1_ML_PROMPT.md` | PyCharm chat | Python/AI: JIQ + EWMA anomaliya + `/anomalies` |
| `FAZA1_GATEWAY_PROMPT.md` | Rider chat | .NET: SignalR hub + pusher + anomaliya proxy |
| `FAZA1_FRONTEND_PROMPT.md` | WebStorm chat | Angular: SignalR client + anomaliya paneli |

## Qanday ishlatish

1. **Har IDE'da mos loyihani och** (PyCharm→`services/ml`, Rider→`services/gateway`,
   WebStorm→`apps/dashboard`).
2. Har chatda tegishli `*_PROMPT.md` ichidagi **"PROMPT (nusxalab yuboring)"** blokini
   to'liq nusxalab, birinchi xabar sifatida yubor.
3. Har chat avtomatik ravishda `FAZA1_UMUMIY.md`ni o'qiydi (promptda ko'rsatilgan) — shu
   sababli uchtasi bir xil shakllarga quriladi.

## Tavsiya etilgan tartib

Parallel ishlash mumkin (kontrakt tayyor), lekin integratsiya uchun eng silliq yo'l:

```
1) ML       — /anomalies + route_queue (Gateway shunga tayanadi)
2) Gateway  — SignalR hub + pusher + proxy (Frontend shunga tayanadi)
3) Frontend — SignalR client + anomaliya paneli
```

Har qism o'zini mustaqil tekshira oladi (ML→curl, Gateway→test client, Frontend→mavjud API),
so'ng **yakuniy integratsiya** `docker compose up -d --build` bilan uchtasi birga.

## Yakuniy qabul (butun Faza 1)

- [ ] Dashboardда **polling yo'q** — real-vaqt WebSocket push (Network tab'da WS)
- [ ] Demo cho'qqi bosilganda holat + tavsiya + anomaliya **jonli** yangilanadi
- [ ] JIQ (`route_queue`) tavsiyalari ko'rinadi
- [ ] EWMA anomaliyalar (sekin operator / backlog / portlash) paneli ishlaydi
- [ ] Uch `ARCHITECTURE.md` va `LOYIHA_HOLATI.md` Faza 1 bilan yangilangan

## Kontrakt o'zgarsa

Agar ishlash jarayonida biror shaklni o'zgartirish zarur bo'lsa — **avval `FAZA1_UMUMIY.md`ni
yangilang**, keyin uch chatning har biriga o'zgarishni yetkazing. Bu — divergensiyaning oldini
oladi (uch servis bir xil haqiqatga quriladi).
