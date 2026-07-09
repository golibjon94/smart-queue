# FAZA 2 — Demo Kuchaytirish Paketi (README)

> Loyiha: `smart-queue` · 3 ta yuqori ta'sirli, apparatsiz funksiya qo'shish

## Bu papkada nima bor

| Fayl | Nima uchun | Kim o'qiydi |
|------|-----------|-------------|
| **`FAZA2_UMUMIY.md`** | Servislararo kontrakt (source of truth) — **avval shu** | Hamma (ML, Gateway, Frontend) |
| `FAZA2_ML_PROMPT.md` | ML qismi prompti (PyCharm) | ML chat |
| `FAZA2_GATEWAY_PROMPT.md` | Gateway qismi prompti (Rider) | Gateway chat |
| `FAZA2_FRONTEND_PROMPT.md` | Frontend qismi prompti (WebStorm) | Frontend chat |

## 3 ta funksiya

1. **What-if simulyatsiya** — kassa slayderi, kutish X→Y jonli (Erlang-C tayyor). *Eng oson, eng wow.*
2. **QR virtual navbat + jonli ETA** — telefonда QR, masofadan navbat, jonli pozitsiya. *Eng katta qism.*
3. **O'zbekcha sentiment-feedback** — izoh tahlili, muammoli filial "qizil". *NLP keyin ulanadi (Muxlisa/Aisha).*

## Qanday ishlatish (sizning uslubingizda)

1. **Avval `FAZA2_UMUMIY.md` ni o'qing** — kontraktни tushuning.
2. **Tartib (osondan murakkabga):** What-if → QR navbat → Sentiment.
3. **Har funksiya uchun 3 chat** (ML → Gateway → Frontend), yoki bitta funksiyani to'liq (ML+Gw+Fe)
   tugatib, keyingisiga o'ting — o'zingizga qulay tartibda.
4. Har qismni tugatgach `docs/faza2/PROGRESS_{QISM}.md` hisobot yozib, yangi chat oching.
5. Uchala funksiya tayyor bo'lgach — `DEMO_SCENARIO.md` v2 (3 yangi qadam) yangilanadi.

## Muhim eslatmalar

- **NLP bloklamaydi:** sentiment demo'да qoida-asosli fallback bilan ishlaydi. Muxlisa/Aisha keyin,
  faqat adapter almashadi.
- **Apparatsiz:** QR — oddiy veb-sahifa, ilova shart emas, yangi qurilma yo'q.
- **Faza 1 tegilmaydi:** hamma narsa orqaga mos, faqat kengaytiriladi.
- **Zaxira taklif:** qurilma integratsiyasi (ovoz/TTS, kamera, face-ID) va qolgan software funksiyalar
  (heatmap, coaching, SLA-alert, callback, VIP routing) — muzokara natijasiga qarab keyin.
