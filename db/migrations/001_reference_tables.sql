-- 001: Referens / master jadvallar (DATABASE.md §2.1)

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
  counter_id              SERIAL PRIMARY KEY,
  branch_id               INT NOT NULL REFERENCES branches(branch_id),
  number                  INT NOT NULL,          -- oyna raqami (tabloda ko'rinadigan)
  name                    TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  supported_service_types INT[],                 -- qaysi xizmatlarni bajaradi
  UNIQUE (branch_id, number)
);

-- Operatorlar
CREATE TABLE operators (
  operator_id  SERIAL PRIMARY KEY,
  branch_id    INT NOT NULL REFERENCES branches(branch_id),
  name         TEXT NOT NULL,
  skill_set    INT[],                            -- qaysi xizmatlarni biladi
  hire_date    DATE
);

-- Xizmat turlari
CREATE TABLE service_types (
  service_type_id      SERIAL PRIMARY KEY,
  name                 TEXT NOT NULL,            -- to'lov, kredit, ma'lumot...
  avg_service_time_sec INT,                      -- o'rtacha xizmat vaqti
  priority             INT DEFAULT 0
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
