# ROADMAP.md — MVP Ishlab Chiqish Yo'l Xaritasi

> Loyiha: `smart-queue` · Fazalar bo'yicha, deliverable + metrika bilan

---

## Umumiy mantiq

```
Faza 0 ──► Faza 1 ──► Faza 2 ──► Faza 3 (ixtiyoriy)
Mock       Ekranda    Real data    Kamera/
demo       tavsiya    + ovoz       Face-ID
(hardware yo'q)        (hardware yo'q)  (yangi hardware)
```

**Kalit strategiya:** Faza 0 va 1 — Mobile Solutions bilan uchrashishdan **oldin** tayyorlanadi (mock data bilan). Bu muzokarada eng kuchli kozir. Real data faqat Faza 2'da so'raladi.

---

## FAZA 0 — Sintetik ma'lumot + yadro
**Maqsad:** mock ma'lumotda ishlaydigan to'liq demo.

### Deliverable
- ✅ Sintetik ma'lumot generatori (non-homogeneous Poisson + mavsumiylik)
- ✅ DB sxema (TimescaleDB) o'rnatilgan
- ✅ LightGBM bashorat modeli ishlaydi
- ✅ Oddiy Angular dashboard (navbat holati + bashorat grafigi)
- ✅ Tavsiya displeyi (ACTION + REASON + BENEFIT)

### Texnologiyalar
Python (SimPy/NumPy, LightGBM, FastAPI), PostgreSQL+TimescaleDB, Angular, .NET gateway.

### Sintetik generator detali
- **Non-homogeneous Poisson** (thinning usuli): doimiy λ* bilan homogen jarayon, har arrival λ(t)/λ* ehtimol bilan qabul.
- Mavsumiylik: soatlik cho'qqilar (tushlik, ish oxiri), hafta kuni, **maosh kuni / oy oxiri** cho'qqilari.
- Xizmat vaqtlari: **eksponensial yoki log-normal** taqsimot.

### Muvaffaqiyat metrikasi
- Bashorat **MAPE ≤ 15%**
- Demo tugma bosilganda "tushlik peak" ssenariysi jonli ishlaydi

### Vaqt (taxminiy)
~3–4 hafta

---

## FAZA 1 — Ekranda tavsiya MVP (hardware yo'q)
**Maqsad:** operator/menejerga real-vaqt aqlli tavsiyalar.

### Deliverable
- ✅ Real-vaqt tavsiyalar (SignalR push)
- ✅ Erlang-C / M/M/c + JIQ qoidalar dvigateli
- ✅ Har tavsiya: ACTION + REASON + EXPECTED BENEFIT
- ✅ Menejer tasdiqlash (advisory — majburiy emas)
- ✅ Audit izi (tavsiya → qabul/rad → natija)

### Hardware
**Yangi qurilma: 0 dona.** Faqat dasturiy kirish (yoki mock).

### Muvaffaqiyat metrikasi
- Simulyatsiyada kutish vaqti sezilarli kamayishi (30→15 daq maqsad)
- Tavsiya qabul darajasi (acceptance rate) kuzatiladi
- Benchmark: to'g'ri prognoz bilan 15–25% samaraliroq smena rejalashtirish (retail me'yori)

### Vaqt (taxminiy)
~4–6 hafta

### Demo bog'lanishi
Bu faza [`DEMO_SCENARIO.md`](DEMO_SCENARIO.md) dagi "o'z-o'ziga javob beruvchi" demoni to'liq ishlatadi.

---

## FAZA 2 — Real-vaqt orkestratsiya + mavjud ovoz/tablo + real ma'lumot
**Maqsad:** real bank ma'lumotida ishlash, mavjud apparatni "aqlli" boshqarish.

### Deliverable
- ✅ iQueue'dan real ma'lumot ingestion (read-only DB access yoki REST API)
- ✅ Mavjud ovoz-e'lon + tablo qayta ishlatiladi (yangi hardware yo'q)
- ✅ Inkremental retraining (kunlik/haftalik)
- ✅ Drift monitoring (MAPE kuzatuvi, chegaradan oshsa signal)
- ✅ Ovoz: oldindan yozilgan segment konkatenatsiyasi (raqam + kassa + ibora)

### Hardware
**Yangi qurilma: 0 dona.** Mavjud karnay, tablo, server qayta ishlatiladi.

### Integratsiya sharti (Mobile Solutions bilan hal qilinadi)
- Birinchi savol: "QMS bazasiga read-only kirish yoki REST API bormi? Tablo/ovozga komanda yubora olamanmi?"
- DB kirishi eng tez yo'l.
- Agar write (komanda) huquqi berilmasa → tavsiya faqat "operatorga ko'rsatish" darajasida (operator qo'lda bosadi).

### Muvaffaqiyat metrikasi
- Real MAPE (o'z ma'lumotida validatsiya)
- Staff-hour / overtime tejash
- Walkout (ketib qolish) kamayishi

### Vaqt (taxminiy)
~6–8 hafta

---

## FAZA 3 — Kamera / people-counting / Face-ID (IXTIYORIY)
**Maqsad:** to'liq "aql" — kirish oqimi bashoratini yaxshilash.

### Deliverable (agar mijoz so'rasa)
- Computer-vision odam-sanash (kirish oqimi → aniqroq bashorat)
- Ixtiyoriy: Face-ID (VIP/takroriy mijoz marshruti)

### Hardware (filialga)
| Qurilma | Miqdor | Taxminiy narx |
|---------|--------|---------------|
| People-counting kamera (V-Count / FootfallCam / Milesight) | 1 ta (kirish) | ~$250–500+ |
| Face-ID terminal (Hikvision MinMoe) — ixtiyoriy | 1 ta (kiosk) | ~$377–500 |

### ⚠️ Huquqiy ogohlantirish (muhim)
- **Face-ID = biometrik ma'lumot.** O'zbekiston O'RQ-547 qonuni: mahalliy saqlash + subyekt roziligi shart.
- 2026-yil 27-martdan kuchga kirgan o'zgartirish: biometrik, genetik ma'lumot O'zbekistonda saqlanishi shart.
- **Anonim odam-sanash** (biometrikasiz, shaxsni aniqlamaydigan) ancha xavfsiz — **tavsiya etiladi.**
- Face-ID loyihasidan oldin huquqiy audit.

### Vaqt (taxminiy)
~8+ hafta (hardware xarajati bilan)

### Muhim
Bu faza **MVP uchun kerak emas.** MVP'ni "wow" qiladigan narsa dastur, apparat emas. Faqat mijoz aniq so'raganda taklif qilinadi.

---

## Umumiy vaqt jadvali (taxminiy)

| Faza | Vaqt | Hardware | Mobile Solutions bilan |
|------|------|----------|------------------------|
| 0 | 3–4 hafta | Yo'q | Oldin (mock) |
| 1 | 4–6 hafta | Yo'q | Oldin (mock) |
| 2 | 6–8 hafta | Yo'q | Real data + integratsiya |
| 3 | 8+ hafta | Bor | Faqat so'ralsa |

> Faza 0 + 1 (~7–10 hafta) = **muzokaraga tayyor ishlaydigan demo.**

---

## Ma'lumot ingestion & inkremental o'rganish (Faza 2 detali)

```
iQueue DB ──(read-only, davriy)──► queue_events (source='real')
                                          │
                              (Prefect/cron: tunlik)
                                          │
                          Retrain (reja yoki drift'da)
                                          │
                    Champion-challenger backtest (default vs fallback)
                                          │
                                  Yangilangan model
```

- **Orkestratsiya:** MVP'da cron/APScheduler; o'sishda Prefect.
- **Retrain triggeri:** rejaga ko'ra (tunlik) yoki drift'da (MAPE chegaradan oshsa).

---

## O'zgarish chegaralari (thresholds — rejani qayta ko'rish nuqtalari)

- Real **MAPE > 20%** → ko'proq xususiyat / Prophet-LightGBM gibrid / ko'proq ma'lumot.
- Kutish vaqti **20% dan kam** kamaysa → model va orkestratsiya qoidalarini qayta ko'rish.
- Tavsiya **qabul darajasi past** → sabab/foyda tushuntirishni yaxshilash.
- Write huquqi **berilmasa** → Faza 2 "advisory only" rejimida qoladi.
- Hodisa hajmi **juda katta** → TimescaleDB compression + retention policy yoqish.
