"""FastAPI uchun DB ulanish dependency'si."""
from __future__ import annotations

from collections.abc import Generator

import psycopg

from simulation.db import dsn


def get_conn() -> Generator[psycopg.Connection, None, None]:
    conn = psycopg.connect(dsn())
    try:
        yield conn
    finally:
        conn.close()
