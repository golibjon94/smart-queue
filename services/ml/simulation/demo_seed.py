"""Demo uchun anomaliya in'ektsiyasi (Faza 1 anomaliya panelini jonli ko'rsatish).

Statik sintetik ma'lumotda tabiiy anomaliya yo'q (xizmat vaqtlari bazaga yaqin,
kelish oqimi bashoratga mos). Bu skript oxirgi ish soatlariga:
  1. kelish oqimi portlashi (surge) — qo'shimcha 'issued' hodisalar,
  2. bitta sekin kassa (slow_operator) — yuqori service_time_sec bilan 'completed',
qo'shadi va hourly_arrivals'ni yangilaydi.

Idempotent — har ishga tushganda avvalgi in'ektsiyani (metadata->>'demo'='anomaly') o'chiradi.

Muhim tartib: avval toza data + train + predict (--overlap-hours), SO'NG shu skript —
shunda bashorat "normal"ni kutadi, in'ektsiya esa undan chetlashadi (qoldiq -> anomaliya).

Ishlatish (services/ml ichidan):
    python -m simulation.demo_seed
"""
from __future__ import annotations

from datetime import timedelta

from psycopg.types.json import Jsonb

from . import db

BRANCH_ID = 1
SURGE_SERVICE = 1         # To'lovlar (eng katta oqim)
SLOW_COUNTER_NUMBER = 2   # branch 1, To'lovlar kassasi
SURGE_LAST_HOUR = 45      # oxirgi arrival soatiga qo'shiladigan qo'shimcha kelishlar
SURGE_PREV_HOUR = 30      # bir soat oldingiga
SLOW_COUNT = 30           # sekin kassaga qo'shiladigan tugatilgan xizmatlar
SLOW_RATIO = 2.5          # baza xizmat vaqtiga nisbatan (2.5x sekin)
_META = {"demo": "anomaly"}


def _spread(hour_start, count):
    """Soat ichida `count` ta vaqtni teng taqsimlaydi."""
    step = 59 / max(count - 1, 1)
    return [hour_start + timedelta(minutes=round(i * step)) for i in range(count)]


def main() -> None:
    conn = db.connect()
    try:
        with conn.cursor() as cur:
            # 0. Avvalgi in'ektsiyani tozalash (idempotent)
            cur.execute("DELETE FROM queue_events WHERE metadata->>'demo' = 'anomaly'")

            # 1. Oxirgi ARRIVAL soati (issued) — anchor
            cur.execute(
                """SELECT max(date_trunc('hour', event_time))
                   FROM queue_events
                   WHERE branch_id = %s AND event_type = 'issued'""",
                (BRANCH_ID,),
            )
            last_hour = cur.fetchone()[0]
            if last_hour is None:
                raise SystemExit("queue_events bo'sh — avval generator ishga tushirilsin.")
            prev_hour = last_hour - timedelta(hours=1)

            cur.execute(
                "SELECT avg_service_time_sec FROM service_types WHERE service_type_id = %s",
                (SURGE_SERVICE,),
            )
            base_sec = int(cur.fetchone()[0])
            slow_sec = int(base_sec * SLOW_RATIO)

            cur.execute(
                "SELECT counter_id FROM counters WHERE branch_id = %s AND number = %s",
                (BRANCH_ID, SLOW_COUNTER_NUMBER),
            )
            counter_id = cur.fetchone()[0]

            rows: list[tuple] = []
            tid = 9_000_000

            # 2. Surge — qo'shimcha 'issued'
            for hour, count in ((prev_hour, SURGE_PREV_HOUR), (last_hour, SURGE_LAST_HOUR)):
                for ts in _spread(hour, count):
                    tid += 1
                    rows.append((ts, tid, BRANCH_ID, SURGE_SERVICE, None, None,
                                 "issued", None, None, "synthetic", Jsonb(_META)))

            # 3. Slow operator — yuqori service_time bilan 'completed'
            for ts in _spread(prev_hour, SLOW_COUNT) + _spread(last_hour, SLOW_COUNT // 2):
                tid += 1
                rows.append((ts, tid, BRANCH_ID, SURGE_SERVICE, counter_id, None,
                             "completed", None, slow_sec, "synthetic", Jsonb(_META)))

            cur.executemany(
                """INSERT INTO queue_events
                   (event_time, ticket_id, branch_id, service_type_id, counter_id,
                    operator_id, event_type, wait_time_sec, service_time_sec, source, metadata)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                rows,
            )
        conn.commit()
        db.refresh_hourly_aggregate(conn)
        print(f"In'ektsiya: surge (+{SURGE_PREV_HOUR + SURGE_LAST_HOUR} kelish) "
              f"@ {prev_hour:%m-%d %H:%M}..{last_hour:%H:%M}, "
              f"slow_operator (kassa {SLOW_COUNTER_NUMBER}, {slow_sec}s ~ {SLOW_RATIO}x). "
              f"hourly_arrivals yangilandi.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
