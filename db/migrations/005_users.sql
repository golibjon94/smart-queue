-- 005: Foydalanuvchilar (autentifikatsiya)
-- Parol hash'i BCrypt bilan Gateway startup'ida yoziladi (SQL'da plain hash saqlanmaydi).

CREATE TABLE users (
  user_id       BIGSERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'manager',  -- admin | manager | operator
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users (username);
