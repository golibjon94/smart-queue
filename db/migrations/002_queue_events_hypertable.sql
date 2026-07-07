-- 002: Navbat hodisalari — TimescaleDB hypertable (DATABASE.md §2.2)

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
