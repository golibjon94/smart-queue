"""DB bilan ishlash: referens ma'lumot o'qish, hodisalarni COPY bilan yozish."""
from __future__ import annotations

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

from .queue_sim import CounterInfo

# Repo ildizidagi .env ni yuklash (services/ml/simulation -> 3 pog'ona yuqori)
_REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_REPO_ROOT / ".env")

COPY_COLUMNS = (
    "event_time, ticket_id, branch_id, service_type_id, counter_id, "
    "operator_id, event_type, wait_time_sec, service_time_sec, source"
)


def dsn() -> str:
    return (
        f"host={os.getenv('POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('POSTGRES_PORT', '5433')} "
        f"user={os.getenv('POSTGRES_USER', 'smartqueue')} "
        f"password={os.getenv('POSTGRES_PASSWORD', 'change_me_dev_only')} "
        f"dbname={os.getenv('POSTGRES_DB', 'smartqueue')}"
    )


def connect() -> psycopg.Connection:
    return psycopg.connect(dsn())


def fetch_counters(conn: psycopg.Connection, branch_id: int) -> list[CounterInfo]:
    """Faol kassalar + har biriga mos operator (skill kesishuvi bo'yicha)."""
    with conn.cursor() as cur:
        cur.execute(
            """SELECT counter_id, supported_service_types
               FROM counters WHERE branch_id = %s AND is_active
               ORDER BY number""",
            (branch_id,),
        )
        counters = cur.fetchall()
        cur.execute(
            """SELECT operator_id, skill_set FROM operators
               WHERE branch_id = %s ORDER BY operator_id""",
            (branch_id,),
        )
        operators = cur.fetchall()

    result: list[CounterInfo] = []
    used: set[int] = set()
    for counter_id, supported in counters:
        supported_set = frozenset(supported or [])
        op_id = None
        for oid, skills in operators:
            if oid not in used and supported_set & set(skills or []):
                op_id = oid
                used.add(oid)
                break
        result.append(CounterInfo(counter_id, op_id, supported_set))
    return result


def delete_synthetic(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM queue_events WHERE source = 'synthetic'")
        deleted = cur.rowcount
    conn.commit()
    return deleted


def copy_events(conn: psycopg.Connection, rows: list[tuple]) -> None:
    with conn.cursor() as cur:
        with cur.copy(f"COPY queue_events ({COPY_COLUMNS}) FROM STDIN") as copy:
            for row in rows:
                copy.write_row(row)
    conn.commit()


def refresh_hourly_aggregate(conn: psycopg.Connection) -> None:
    """Tarixiy yozuvdan keyin continuous aggregate'ni to'liq yangilash.

    Transaksiya ichida chaqirib bo'lmaydi — autocommit talab qilinadi.
    """
    old = conn.autocommit
    conn.autocommit = True
    try:
        conn.execute("CALL refresh_continuous_aggregate('hourly_arrivals', NULL, NULL)")
    finally:
        conn.autocommit = old
