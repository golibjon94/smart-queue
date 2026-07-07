-- 004: Bashorat, tavsiya va fikr-mulohaza jadvallari (DATABASE.md §2.4)

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

CREATE INDEX idx_fc_branch_target ON forecasts (branch_id, target_time DESC);

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

CREATE INDEX idx_rec_branch_status ON recommendations (branch_id, status);

-- Fikr-mulohaza / CSI (QR baholash)
CREATE TABLE feedback_csi (
  feedback_id  BIGSERIAL PRIMARY KEY,
  ticket_id    BIGINT,
  branch_id    INT NOT NULL,
  rating       INT,             -- 1-5
  comment      TEXT,            -- o'zbekcha ochiq matn (kelajakda NLP)
  created_at   TIMESTAMPTZ DEFAULT now()
);
