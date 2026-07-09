# DATABASE.md — Ma'lumotlar Bazasi Arxitekturasi

> Loyiha: `smart-queue` · PostgreSQL 17 + TimescaleDB

---

## 1. Asos tanlovi

**PostgreSQL 17 + TimescaleDB kengaytmasi.** Navbat hodisalari yuqori hajmli vaqt-qatori bo'lgani uchun `queue_events` **hypertable** qilinadi:
- Avtomatik vaqt bo'yicha chunking (bo'laklash).
- Chunk exclusion → vaqt-oraliqli so'rovlarda 10–100x tezlanish.
- Continuous aggregates → soatlik/kunlik rollup'lar fon rejimda inkremental.
- Compression + retention policy → katta hajmda 90%+ storage tejash.

---

## 2. Jadvallar tuzilishi

### 2.1 Referens / master jadvallar (oddiy Postgres)

```sql
-- Filiallar
CREATE TABLE branches (
  branch_id   SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  timezone    TEXT DEFAULT 'Asia/Tashkent',
  address     TEXT,
  open_time   TIME,
  close_time  TIME
);

-- Kassalar / oynalar
CREATE TABLE counters (
  counter_id             SERIAL PRIMARY KEY,
  branch_id              INT NOT NULL REFERENCES branches(branch_id),
  number                 INT NOT NULL,          -- oyna raqami (tabloda ko'rinadigan)
  name                   TEXT,
  is_active              BOOLEAN DEFAULT TRUE,
  supported_service_types INT[]                 -- qaysi xizmatlarni bajaradi
);

-- Operatorlar
CREATE TABLE operators (
  operator_id  SERIAL PRIMARY KEY,
  branch_id    INT NOT NULL REFERENCES branches(branch_id),
  name         TEXT NOT NULL,
  skill_set    INT[],                           -- qaysi xizmatlarni biladi
  hire_date    DATE
);

-- Xizmat turlari
CREATE TABLE service_types (
  service_type_id     SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,            -- to'lov, kredit, ma'lumot...
  avg_service_time_sec INT,                     -- o'rtacha xizmat vaqti
  priority            INT DEFAULT 0
);

-- Operator sessiyalari (kim qaysi kassada qachon ishlagani)
CREATE TABLE operator_sessions (
  session_id   BIGSERIAL PRIMARY KEY,
  operator_id  INT NOT NULL REFERENCES operators(operator_id),
  counter_id   INT NOT NULL REFERENCES counters(counter_id),
  login_time   TIMESTAMPTZ NOT NULL,
  logout_time  TIMESTAMPTZ
);

-- Xodim jadvallari (smena rejasi)
CREATE TABLE staff_schedules (
  schedule_id     BIGSERIAL PRIMARY KEY,
  operator_id     INT NOT NULL REFERENCES operators(operator_id),
  branch_id       INT NOT NULL REFERENCES branches(branch_id),
  shift_start     TIMESTAMPTZ NOT NULL,
  shift_end       TIMESTAMPTZ NOT NULL,
  planned_counter INT REFERENCES counters(counter_id)
);
```

### 2.2 Vaqt-qatori / hodisa jadvali (TimescaleDB hypertable)

```sql
CREATE TABLE queue_events (
  event_time       TIMESTAMPTZ NOT NULL,
  ticket_id        BIGINT NOT NULL,
  branch_id        INT NOT NULL,
  service_type_id  INT NOT NULL,
  counter_id       INT,
  operator_id      INT,
  event_type       TEXT NOT NULL,   -- issued, called, served_start, completed, abandoned, no_show
  wait_time_sec    INT,             -- issued -> called
  service_time_sec INT,             -- served_start -> completed
  source           TEXT DEFAULT 'synthetic',  -- 'synthetic' | 'real' (BIR XIL SXEMA!)
  metadata         JSONB
);

-- Hypertable, kunlik chunk
SELECT create_hypertable('queue_events', by_range('event_time', INTERVAL '1 day'));

-- Indekslar
CREATE INDEX idx_qe_branch_time ON queue_events (branch_id, event_time DESC);
CREATE INDEX idx_qe_time_brin  ON queue_events USING BRIN (event_time);
```

**Muhim:** `source` ustuni sintetik va real ma'lumotni bir xil sxemada saqlaydi. Real ma'lumot keyin `source='real'` bilan aynan shu jadvalga slot'lanadi — **migratsiya kerak emas.**

**Hodisa turlari (event_type) hayotiy tsikli:**
```
issued (talon olindi)
  → called (chaqirildi)      [wait_time_sec = called - issued]
  → served_start (xizmat boshi)
  → completed (tugadi)        [service_time_sec = completed - served_start]
  yoki
  → abandoned (ketib qoldi) / no_show (kelmadi)
```

### 2.3 Continuous aggregate (soatlik rollup)

```sql
CREATE MATERIALIZED VIEW hourly_arrivals
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', event_time) AS bucket,
  branch_id,
  service_type_id,
  count(*) FILTER (WHERE event_type = 'issued') AS arrivals,
  avg(wait_time_sec)    FILTER (WHERE event_type = 'called')    AS avg_wait,
  avg(service_time_sec) FILTER (WHERE event_type = 'completed') AS avg_service
FROM queue_events
GROUP BY bucket, branch_id, service_type_id;
```
Bu dashboard va ML feature hisoblashni tezlashtiradi (oddiy materialized view'dan farqli — to'liq qayta qurmaydi, inkremental yangilanadi).

### 2.4 Bashorat va tavsiya jadvallari (ROI audit izi)

```sql
-- Bashoratlar
CREATE TABLE forecasts (
  forecast_id        BIGSERIAL PRIMARY KEY,
  branch_id          INT NOT NULL,
  service_type_id    INT,
  target_time        TIMESTAMPTZ NOT NULL,
  predicted_arrivals NUMERIC,
  lower_ci           NUMERIC,
  upper_ci           NUMERIC,
  model_name         TEXT,
  model_version      TEXT,
  generated_at       TIMESTAMPTZ DEFAULT now()
);

-- Tavsiyalar (ROI isboti uchun eng muhim jadval)
CREATE TABLE recommendations (
  rec_id           BIGSERIAL PRIMARY KEY,
  branch_id        INT NOT NULL,
  generated_at     TIMESTAMPTZ DEFAULT now(),
  action_type      TEXT NOT NULL,   -- open_counter, close_counter, route_queue, reassign_operator
  action_payload   JSONB,           -- {counter_id: 4, service_type: "to'lov", ...}
  reason           TEXT,            -- "A navbati 12 kishiga yetdi"
  expected_benefit JSONB,           -- {wait_reduction_min: 13, ...}
  status           TEXT DEFAULT 'proposed',  -- proposed, accepted, rejected, expired
  responded_by     INT,             -- qaysi menejer
  responded_at     TIMESTAMPTZ,
  observed_outcome JSONB            -- keyingi natija: haqiqiy kutish o'zgarishi
);

-- Fikr-mulohaza / CSI (QR baholash)
CREATE TABLE feedback_csi (
  feedback_id  BIGSERIAL PRIMARY KEY,
  ticket_id    BIGINT,
  branch_id    INT NOT NULL,
  rating       INT,             -- 1-5
  comment      TEXT,            -- o'zbekcha ochiq matn (kelajakda NLP)
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

**`recommendations` jadvali — ROI isbotining yuragi:**
`status` + `observed_outcome` ustunlari "nima tavsiya qilindi → qabul qilindimi → natija qanday bo'ldi" zanjirini saqlaydi. Bu mijozga qiymatni **raqamlarda** ko'rsatish imkonini beradi ("bu oy 47 ta tavsiya, 38 tasi qabul qilindi, o'rtacha kutish 11 daqiqa kamaydi").

### 2.5 Foydalanuvchilar (autentifikatsiya)

```sql
-- Foydalanuvchilar — dashboard login (JWT auth)
CREATE TABLE users (
  user_id       BIGSERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,            -- BCrypt hash (plain parol saqlanmaydi)
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'manager',  -- admin | manager | operator
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users (username);
```

Gateway JWT (HS256) autentifikatsiyasi shu jadvalga tayanadi. Parollar **BCrypt** bilan
hash qilinadi (SQL'da plain hash saqlanmaydi). Default admin gateway birinchi startup'ida
`.env` qiymatlaridan yaratiladi.

---

## 3. Indekslash strategiyasi

| Maqsad | Indeks |
|--------|--------|
| Filial + vaqt oralig'i so'rovlari | `(branch_id, event_time DESC)` composite |
| Katta vaqt-skanlar | BRIN `(event_time)` — juda samarali, kam joy |
| Tavsiya holati bo'yicha | `(branch_id, status)` recommendations'da |

**Chunk interval:** kunlik (bank ish hajmi uchun mos; chunk shared_buffers'dan kichik bo'lishi kerak).

---

## 4. Compression va retention (katta hajmda)

```sql
-- 7 kundan eski chunklarni siqish
ALTER TABLE queue_events SET (timescaledb.compress,
  timescaledb.compress_segmentby = 'branch_id');
SELECT add_compression_policy('queue_events', INTERVAL '7 days');

-- Masalan 2 yildan eski xom hodisalarni o'chirish (rollup qoladi)
SELECT add_retention_policy('queue_events', INTERVAL '2 years');
```

---

## 5. Sxema diagrammasi (matnda)

```
branches ──┬── counters ──── operator_sessions
           ├── operators ──┬─ operator_sessions
           │               └─ staff_schedules
           └── service_types

queue_events (hypertable) ──► hourly_arrivals (continuous agg)
       │
       ├──► forecasts
       └──► recommendations ──► (audit: status, observed_outcome)

feedback_csi ──► (kelajak: o'zbekcha NLP sentiment)
```

---

## 6. Migratsiya tartibi (MVP)

1. Referens jadvallar (branches, counters, operators, service_types).
2. `queue_events` hypertable + indekslar.
3. Continuous aggregate (hourly_arrivals).
4. forecasts, recommendations, feedback_csi.
5. `users` (autentifikatsiya — `005_users.sql`).
6. Compression/retention policy (faqat prod, MVP'da ixtiyoriy).

> **Mock → real o'tish:** sintetik generator `source='synthetic'` bilan yozadi. Mobile Solutions real ma'lumot bergач, ETL `source='real'` bilan aynan shu jadvalga yozadi. Model ikkalasini ham o'qiydi. Hech narsa buzilmaydi.
