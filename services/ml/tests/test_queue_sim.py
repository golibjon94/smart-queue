"""Navbat simulyatsiyasi: hodisalar hayotiy tsikli mantiqan to'g'riligini tekshirish."""
from collections import defaultdict
from datetime import date

import numpy as np

from simulation.config import ServiceParams
from simulation.queue_sim import CounterInfo, simulate_day

SERVICES = {
    1: ServiceParams(1, share=0.5, mean_service_sec=240),
    2: ServiceParams(2, share=0.5, mean_service_sec=400),
}
COUNTERS = [
    CounterInfo(counter_id=1, operator_id=10, supported=frozenset({1})),
    CounterInfo(counter_id=2, operator_id=11, supported=frozenset({1, 2})),
]


def _run(seed: int = 5, n: int = 80):
    rng = np.random.default_rng(seed)
    issued = np.sort(rng.uniform(9 * 3600, 17 * 3600, n))
    stypes = rng.choice([1, 2], size=n)
    arrivals = [(float(t), int(s)) for t, s in zip(issued, stypes)]
    return simulate_day(date(2026, 6, 1), 1, arrivals, COUNTERS, SERVICES,
                        close_sec=18 * 3600, ticket_id_start=0, rng=rng)


def test_lifecycle_order_and_values():
    rows = _run()
    by_ticket = defaultdict(list)
    for r in rows:
        by_ticket[r.ticket_id].append(r)

    assert len(by_ticket) == 80
    for ticket, events in by_ticket.items():
        types = [e.event_type for e in events]
        times = [e.event_time for e in events]
        assert types[0] == "issued"
        assert times == sorted(times), f"Talon {ticket}: vaqtlar tartibsiz"
        assert types in (
            ["issued", "called", "served_start", "completed"],
            ["issued", "called", "no_show"],
            ["issued", "abandoned"],
        ), f"Talon {ticket}: noto'g'ri tsikl {types}"

        for e in events:
            if e.event_type == "called":
                assert e.wait_time_sec is not None and e.wait_time_sec >= 0
                assert e.counter_id in (1, 2)
            if e.event_type == "completed":
                assert e.service_time_sec is not None and e.service_time_sec > 0


def test_skill_routing():
    """2-xizmat faqat 2-kassada (skill mos kelmagan kassaga tushmasligi kerak)."""
    rows = _run(seed=11, n=120)
    for r in rows:
        if r.service_type_id == 2 and r.counter_id is not None:
            assert r.counter_id == 2


def test_counter_no_overlap():
    """Bitta kassada xizmatlar ustma-ust tushmaydi."""
    rows = _run(seed=3, n=150)
    intervals = defaultdict(list)
    starts = {}
    for r in sorted(rows, key=lambda x: x.event_time):
        if r.event_type == "served_start":
            starts[r.ticket_id] = r.event_time
        elif r.event_type == "completed":
            intervals[r.counter_id].append((starts[r.ticket_id], r.event_time))

    for cid, ivals in intervals.items():
        ivals.sort()
        for (s1, e1), (s2, e2) in zip(ivals, ivals[1:]):
            assert s2 >= e1, f"Kassa {cid}: {e1} tugamasdan {s2} boshlangan"
