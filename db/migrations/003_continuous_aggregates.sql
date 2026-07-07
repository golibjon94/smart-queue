-- 003: Soatlik rollup — continuous aggregate (DATABASE.md §2.3)
-- Eslatma: tarixiy ma'lumot yozilgandan keyin bir marta qo'lda yangilash kerak:
--   CALL refresh_continuous_aggregate('hourly_arrivals', NULL, NULL);

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
GROUP BY bucket, branch_id, service_type_id
WITH NO DATA;

-- Yangi kelayotgan hodisalar uchun avtomatik inkremental yangilash
SELECT add_continuous_aggregate_policy('hourly_arrivals',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '30 minutes');
