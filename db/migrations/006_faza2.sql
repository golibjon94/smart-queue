-- 006: Faza 2 — QR virtual navbat + sentiment-feedback (FAZA2_UMUMIY §7)

-- Virtual navbat talonlari (QR orqali masofadan qo'shilgan mijozlar).
-- Fizik talonlar demo holatida (DemoStateService) yashaydi; bu jadval faqat
-- virtual talonlarni saqlaydi — pozitsiya hisobida ikkalasi birga qo'shiladi.
CREATE TABLE IF NOT EXISTS virtual_tickets (
  token           TEXT PRIMARY KEY,             -- qisqa, taxmin qilib bo'lmaydigan (base62)
  ticket_number   TEXT NOT NULL,                -- ko'rsatish uchun raqam (masalan "V007")
  branch_id       INT NOT NULL,
  service_type_id INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'waiting',  -- waiting|called|serving|completed|abandoned
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  source          TEXT DEFAULT 'synthetic'
);

-- Pozitsiya hisobi shu indeks bo'yicha tez ishlaydi (waiting talonlarni joined_at bo'yicha tartiblash).
CREATE INDEX IF NOT EXISTS idx_vt_branch_service_status
  ON virtual_tickets (branch_id, service_type_id, status, joined_at);

-- Feedback (mavjud feedback_csi kengaytiriladi — sentiment tasnifi ustunlari).
ALTER TABLE feedback_csi
  ADD COLUMN IF NOT EXISTS sentiment       TEXT,      -- positive|negative|neutral
  ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC,
  ADD COLUMN IF NOT EXISTS topics          TEXT[];

-- Summary so'rovlari filial + vaqt bo'yicha filtrlaydi.
CREATE INDEX IF NOT EXISTS idx_feedback_branch_created
  ON feedback_csi (branch_id, created_at DESC);
