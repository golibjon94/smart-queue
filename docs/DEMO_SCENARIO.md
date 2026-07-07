# DEMO_SCENARIO.md — "O'z-o'ziga javob beruvchi" demo ssenariysi

> Loyiha: `smart-queue` · Maqsad: 3-5 daqiqada Mobile Solutions'ga "statik navbat
> tizimi" va "aqlli tizim" farqini his qildirish. Demo mock (sintetik) ma'lumotda
> ishlaydi — real ma'lumot so'ralmaydi.

---

## Tayyorgarlik (demo oldidan, 15 daqiqa)

1. `docker compose up` — barcha servislar ko'tarilgan (DB, ML, gateway, dashboard).
2. Sintetik tarix yuklangan (270 kun), model o'qitilgan, 72 soatlik bashorat `forecasts`da.
3. Dashboard brauzerda ochiq: `http://localhost:4200`, **Filial 1**, ssenariy "normal".
4. Zaxira: skrinshotlar papkasi (agar jonli demo texnik muammoga uchrasa).

---

## Ssenariy oqimi (3-5 daqiqa)

### 1-qadam — Oddiy kun (30 soniya)
Ekranda: kassalar panel (5 ochiq, 1 zaxira yopiq), navbatlar kichik (0-4 kishi),
o'rtacha kutish ~2-3 daqiqa. **Gap:** "Bu iQueue ko'rsatadigan holat — hozir nima
bo'layotgani. Biz esa *keyin nima bo'lishini* ko'rsatamiz."

### 2-qadam — Bashorat grafigi (60 soniya)
Bashorat panelida ertangi kun egri chizig'i: 12:00-14:00 tushlik cho'qqisi aniq
ko'rinadi, ishonch oralig'i bilan. Agar demo oy boshiga to'g'ri kelsa — maosh
cho'qqisi ham. **Gap:** "Model 9 oylik tarixdan o'rgangan: tushlik, hafta kuni,
maosh kuni. MAPE ~14% — retail bashorat me'yoridan yaxshi. Bu grafik har kuni
avtomatik yangilanadi."

### 3-qadam — "Tushlik cho'qqisi" tugmasi (90 soniya) ⭐ kulminatsiya
Tugma bosiladi → dashboard jonli o'zgaradi: To'lovlar navbati 13-14 kishiga
sakraydi, taxminiy kutish ~20+ daqiqa, karta rangi ogohlantirishga o'tadi.
2-3 soniyada **tavsiya kartasi** paydo bo'ladi:

> **6-kassani oching**
> Sabab: «To'lovlar» navbatida 14 kishi, taxminiy kutish ~28 daqiqa
> Kutilayotgan foyda: kutish ~8 daqiqaga kamayadi (28 → 20)

**Gap:** "Tizim shunchaki statistika ko'rsatmadi — *nima qilish kerakligini* aytdi,
*nega* va *qancha foyda* bilan. Bu Erlang-C navbat nazariyasi, taxmin emas."

### 4-qadam — Menejer qarori + audit (45 soniya)
"Qabul qilish" bosiladi → tavsiya statusi `accepted`, audit iziga yoziladi.
**Gap:** "Har tavsiya → qabul/rad → natija bazada saqlanadi. Oy oxirida ROI
raqamda: nechta tavsiya, nechtasi qabul, kutish qancha kamaydi. Advisory rejim —
oxirgi so'z doim menejerda."

### 5-qadam — Yopish (30 soniya)
Normal ssenariyga qaytish. **Gap:** "Bularning hammasi sizning mavjud iQueue
ma'lumotingiz ustida ishlaydi — yangi qurilma kerak emas, read-only kirish yetadi.
Uch xil integratsiya: tayyor dashboard, API, yoki iframe."

---

## Texnik xarita (qaysi tugma nimani chaqiradi)

| Demo harakati | API chaqiruv |
|---|---|
| "Tushlik cho'qqisi" tugmasi | `POST /api/demo/scenario {branchId, scenario:"lunch_peak"}` |
| Tavsiya paydo bo'lishi | `POST /api/recommendations/refresh?branchId=1` (dashboard avtomatik chaqiradi) |
| Qabul qilish | `POST /api/recommendations/{id}/respond {status:"accepted"}` |
| Normal holatga qaytish | `POST /api/demo/scenario {scenario:"normal"}` |

## Kutilayotgan savollar va javoblar

- **"Bu real ma'lumotmi?"** — Yo'q, sintetik: bank navbatining real statistik
  xususiyatlari (Poisson oqim, tushlik/maosh cho'qqilari) bilan yaratilgan.
  Sizning ma'lumotingizda model 2-4 haftada qayta o'qitiladi — sxema tayyor.
- **"Aniqligi qancha?"** — Filial-soat kesimida MAPE ~14% (nazariy minimal ~12%,
  oddiy baseline ~19%). Real ma'lumotda maqsad: ≤15%.
- **"Bizning tizimga qanday ulanadi?"** — Read-only DB yoki REST — bir kunlik ish.
  Yozish (tablo/ovoz) huquqi bo'lmasa ham ishlaydi (advisory rejim).
