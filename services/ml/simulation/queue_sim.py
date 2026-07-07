"""Bir kunlik navbat simulyatsiyasi.

Har talon uchun to'liq hayotiy tsikl hodisalari yaratiladi:
  issued -> called -> served_start -> completed
  yoki issued -> abandoned (sabr tugadi / kun yopildi)
  yoki issued -> called -> no_show

Model: har talon chiqarilish tartibida o'ziga mos (skill-based) kassalar
ichidan eng erta bo'shaydiganiga biriktiriladi (G/G/c yaqinlashuvi, FIFO).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import numpy as np

from .config import (
    NO_SHOW_HOLD_SEC,
    NO_SHOW_PROB,
    PATIENCE_MEAN_SEC,
    TIMEZONE,
    WALK_SEC_RANGE,
    ServiceParams,
)

TZ = ZoneInfo(TIMEZONE)


@dataclass(frozen=True)
class CounterInfo:
    counter_id: int
    operator_id: int | None
    supported: frozenset[int]  # xizmat turi id'lari


@dataclass
class EventRow:
    event_time: datetime
    ticket_id: int
    branch_id: int
    service_type_id: int
    counter_id: int | None
    operator_id: int | None
    event_type: str
    wait_time_sec: int | None
    service_time_sec: int | None

    def as_tuple(self) -> tuple:
        return (
            self.event_time, self.ticket_id, self.branch_id, self.service_type_id,
            self.counter_id, self.operator_id, self.event_type,
            self.wait_time_sec, self.service_time_sec, "synthetic",
        )


def _lognormal_service(mean_sec: float, cv: float, rng: np.random.Generator) -> float:
    """O'rtachasi mean_sec, CV'si cv bo'lgan log-normal namuna."""
    sigma2 = np.log(1.0 + cv * cv)
    mu = np.log(mean_sec) - sigma2 / 2.0
    return float(rng.lognormal(mu, np.sqrt(sigma2)))


def simulate_day(
    d: date,
    branch_id: int,
    arrivals: list[tuple[float, int]],       # (issued_sec, service_type_id), vaqt bo'yicha tartiblangan
    counters: list[CounterInfo],
    services: dict[int, ServiceParams],
    close_sec: float,
    ticket_id_start: int,
    rng: np.random.Generator,
) -> list[EventRow]:
    midnight = datetime.combine(d, datetime.min.time(), tzinfo=TZ)

    def ts(sec: float) -> datetime:
        return midnight + timedelta(seconds=round(sec))

    free_at: dict[int, float] = {}
    open_sec = min(a[0] for a in arrivals) if arrivals else 0.0
    for c in counters:
        free_at[c.counter_id] = open_sec
    by_id = {c.counter_id: c for c in counters}

    rows: list[EventRow] = []
    ticket_id = ticket_id_start

    for issued_sec, stype in arrivals:
        ticket_id += 1
        rows.append(EventRow(ts(issued_sec), ticket_id, branch_id, stype,
                             None, None, "issued", None, None))

        eligible = [cid for cid, c in by_id.items() if stype in c.supported]
        if not eligible:
            continue  # konfiguratsiya xatosi — bunday bo'lmasligi kerak

        cid = min(eligible, key=lambda x: free_at[x])
        counter = by_id[cid]
        called_sec = max(issued_sec, free_at[cid])
        wait = called_sec - issued_sec

        # Sabr tugadi — mijoz chaqirilishidan oldin ketib qoldi
        patience = rng.exponential(PATIENCE_MEAN_SEC)
        if wait > patience:
            rows.append(EventRow(ts(issued_sec + patience), ticket_id, branch_id, stype,
                                 None, None, "abandoned", None, None))
            continue

        # Kun yopildi — chaqirilmagan talonlar bekor
        if called_sec >= close_sec:
            rows.append(EventRow(ts(close_sec), ticket_id, branch_id, stype,
                                 None, None, "abandoned", None, None))
            continue

        rows.append(EventRow(ts(called_sec), ticket_id, branch_id, stype,
                             cid, counter.operator_id, "called", round(wait), None))

        # Chaqirildi, lekin kelmadi
        if rng.random() < NO_SHOW_PROB:
            free_at[cid] = called_sec + NO_SHOW_HOLD_SEC
            rows.append(EventRow(ts(free_at[cid]), ticket_id, branch_id, stype,
                                 cid, counter.operator_id, "no_show", None, None))
            continue

        walk = rng.uniform(*WALK_SEC_RANGE)
        served_start = called_sec + walk
        service = _lognormal_service(services[stype].mean_service_sec,
                                     services[stype].cv, rng)
        completed = served_start + service
        free_at[cid] = completed

        rows.append(EventRow(ts(served_start), ticket_id, branch_id, stype,
                             cid, counter.operator_id, "served_start", None, None))
        rows.append(EventRow(ts(completed), ticket_id, branch_id, stype,
                             cid, counter.operator_id, "completed", None, round(service)))

    return rows
