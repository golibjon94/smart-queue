# TECH_STACK.md — Texnologiyalar va Kutubxonalar

> Loyiha: `smart-queue` · Har bir tanlov asoslangan holda

---

## 1. Umumiy stack (polyglot)

| Qatlam | Texnologiya | Nega |
|--------|-------------|------|
| Dashboard | **Angular** | Foydalanuvchi tanlovi; boy komponent ekotizimi |
| ML / bashorat | **Python + FastAPI** | ML ekotizimi (LightGBM, StatsForecast, Prophet) faqat Pythonda yetuk |
| Orkestratsiya / Gateway | **.NET 8** | Kuchli API, SignalR real-vaqt, foydalanuvchi tajribasi |
| Ma'lumotlar bazasi | **PostgreSQL 16 + TimescaleDB** | Navbat hodisalari = yuqori hajmli vaqt-qatori |
| Real-vaqt | **SignalR** | WebSocket + avtomatik fallback |
| Deployment | **Docker Compose** | MVP uchun bitta VPS yetarli |
| Kesh / backplane | **Redis** | SignalR masshtablash + kesh |

**Nega polyglot?** Har bir qatlam uchun eng yaxshi vosita. ML ni .NET'da qilish = vaqt isrofi (ekotizim Pythonda). Foydalanuvchi aniq "eng yaxshi yechim" so'radi, bitta tilga majburlash emas.

---

## 2. ML / Bashorat modeli

### 2.1 Default: LightGBM global modeli
Kuchli kunlik/haftalik/oylik (maosh kuni) mavsumiylik va cheklangan boshlang'ich ma'lumot uchun eng amaliy.

**Xususiyatlar (features):**
- Lag: t−1 soat, t−24 soat (kunlik), t−168 soat (haftalik)
- Rolling: harakatlanuvchi o'rtacha va standart og'ish
- Kalendar: soat, hafta kuni, oy kuni, **maosh-kuni bayrog'i**, bayramlar
- Kategoriyalar: filial, xizmat turi

**Nega global model?** Barcha filial/xizmat turini bitta modelda o'rgatish (data pooling) — kam ma'lumotli seriyalar uchun foydali; daraxt-ansambl xilma-xil pattern va anomaliyalarni yaxshi umumlashtiradi.

**Multi-step:** rekursiv strategiya (bashorat qiymatini keyingi qadam uchun lag sifatida qayta ishlatish).

### 2.2 Fallback / baseline: StatsForecast + Prophet
- **StatsForecast (Nixtla):** AutoARIMA, AutoETS, Theta — juda tez, statistik, kam ma'lumotda ishonchli. Yangi filiallar uchun.
- **Prophet (Meta):** kuchli mavsumiylik + maosh kuni regressor, interpretatsiya oson.
- **Champion-challenger:** backtest orqali default vs fallback avtomatik tanlanadi.

### 2.3 Gibrid variant (aniqlikni oshirish)
Prophet chiqishlarini (trend, mavsumiylik, ishonch oralig'i) LightGBM uchun **qo'shimcha xususiyat** sifatida ishlatish — amalda aniqlikni oshiradi.

### 2.4 Keyingi bosqich (Faza 2+)
LSTM / NeuralForecast / Darts — faqat ko'p ma'lumot yig'ilgach va murakkab bog'liqliklar bo'lsa.

### 2.5 Aniqlik maqsadi
- MVP: soatlik bashoratda **MAPE ≤ 15%** ("yaxshi"), < 10% ("a'lo").
- Baseline (moving average) odatda MAPE ~20–30%.
- Ufq: 7 kun standart, 30 kungacha erishilishi mumkin.

---

## 3. Real-vaqt orkestratsiya (tavsiya dvigateli)

### 3.1 MVP: qoidalar + navbat nazariyasi
- **Erlang-C / M/M/c:** kerakli kassa sonini hisoblash (λ bashoratdan, μ tarixiy xizmat vaqtidan, kerakli xizmat darajasi).
- **"Knee of the curve":** qo'shimcha kassa foydasi kamayadigan optimal nuqta.
- **Little qonuni (L = λW):** kutish/uzunlik metrikalarini bog'laydi.

### 3.2 Marshrutlash: Join-the-Idle-Queue (JIQ)
Bo'sh kassalar ro'yxatini (I-queue) yuritib, mijozni bo'sh/eng qisqa kassaga yo'naltiradi. Statik "keyingi bo'sh kassa" o'rniga aqlli marshrutlash. Bank kontekstida ko'nikma-asosli (skill-based): xizmat turi → mos kassa.

### 3.3 Tavsiya formati (majburiy)
Har tavsiya: **ACTION + REASON + EXPECTED BENEFIT**
> "4-kassani oching (sabab: A navbati 12 kishiga yetdi, kutish 24 daq; foyda: kutish ~13 daq kamayadi)"

Kutilgan foyda Erlang-C hisobidan miqdoriy chiqadi.

### 3.4 Keyingi bosqich
OR-Tools/LP global optimallashtirish; Reinforcement Learning — faqat katta ma'lumot + isbotlangan qiymatdan keyin.

---

## 4. Anomaliya aniqlash
**EWMA (eksponensial vaznli siljuvchi o'rtacha) control chart** prognoz qoldiqlari ustida. Sekin operator, kassa backlog, kutilmagan to'planishni aniqlaydi. Yengil, kichik shiftlarni ham tutadi. Chart to'g'ridan-to'g'ri metrikaga emas, **prognoz xatoligiga** qo'llaniladi (mavsumiylikni hisobga olish uchun).

---

## 5. O'zbek ovozi / TTS

| Variant | Holat | Tavsiya |
|---------|-------|---------|
| **Oldindan yozilgan audio-segment** ✅ | Eng past risk | **MVP uchun** — raqam + kassa + harakat iborasi bo'laklarini birlashtirish. Nol latentlik, nol so'rov-narxi |
| **Azure Neural TTS** | Ishlaydi | Jonli sintez kerak bo'lsa: `uz-UZ-MadinaNeural` (ayol), `uz-UZ-SardorNeural` (erkak). Latin skript, SSML |
| **Aisha (aisha.group)** | Ishlaydi | Mahalliy REST API, past latentlik, bepul tarif; "Omnichannel AI Banking" mahsuloti bor |
| Muxlisa / UZINFOCOM | STT tasdiq, TTS ochiq emas | To'g'ridan-to'g'ri bog'lanib tekshirish kerak |
| Google Cloud TTS | ❌ | O'zbek tilini **qo'llab-quvvatlamaydi** (faqat STT'da bor) |
| Meta MMS-TTS | Cheklangan | Faqat Kirill skript, API yo'q (o'zi hostlanadi) |

**MVP mantiq:** bank e'lonlari cheklangan lug'atga ega (raqamlar + kassa + qat'iy iboralar). Shuning uchun **oldindan yozilgan segmentlar eng ishonchli va arzon.** Jonli TTS faqat dinamik matn kerak bo'lganda (Faza 2+).

---

## 6. Yordamchi vositalar

| Vazifa | Vosita |
|--------|--------|
| Sintetik ma'lumot | **SimPy** yoki **NumPy** (non-homogeneous Poisson, thinning usuli) |
| Model paketlash | MVP: `joblib`/native; keyin **ONNX + ONNX Runtime** (2–10x tezlik) |
| Retraining rejalashtirish | MVP: **APScheduler / cron**; o'sishda **Prefect** |
| Feature store | MVP: **kerak emas** (TimescaleDB continuous aggregates yetarli) |
| Observability | Prometheus + Grafana (TimescaleDB native mos) |

---

## 7. Nima uchun bu stack "wow" beradi

iQueue hozir: **statistika ko'rsatadi** (descriptive).
smart-queue: **bashorat qiladi + boshqaradi + maslahat beradi** (predictive + prescriptive).

Bu farq — statik e'londan ("keyingi talon → keyingi bo'sh kassa") aqlli marshrutlashga (bashorat + balanslash + tavsiya) o'tish. Aynan shu Mobile Solutions'ni hayron qoldiradi.
