"""NHPP thinning: soatlik o'rtacha kelishlar λ(t) ga mos kelishini tekshirish."""
from datetime import date

import numpy as np

from simulation.arrivals import nhpp_arrivals
from simulation.config import BRANCHES, SERVICES
from simulation.intensity import hourly_lambda


def test_hourly_means_match_lambda():
    """Ko'p replikatsiya o'rtachasi har soatda λ(t) dan ±10% ichida."""
    rng = np.random.default_rng(123)
    branch = BRANCHES[0]
    svc = SERVICES[0]                      # to'lovlar — eng katta oqim
    d = date(2026, 6, 1)                   # dushanba, maosh kuni
    lam = hourly_lambda(branch, svc, d)

    n_reps = 300
    counts = {h: 0 for h in lam}
    for _ in range(n_reps):
        for t in nhpp_arrivals(lam, rng):
            counts[int(t // 3600)] += 1

    for h, expected in lam.items():
        mean = counts[h] / n_reps
        assert abs(mean - expected) / expected < 0.10, (
            f"Soat {h}: kutilgan {expected:.1f}, olingan {mean:.1f}"
        )


def test_sunday_empty():
    branch = BRANCHES[0]
    d = date(2026, 6, 7)  # yakshanba
    assert hourly_lambda(branch, SERVICES[0], d) == {}


def test_arrivals_within_business_hours():
    rng = np.random.default_rng(7)
    lam = hourly_lambda(BRANCHES[0], SERVICES[0], date(2026, 6, 6))  # shanba 9-13
    times = nhpp_arrivals(lam, rng)
    assert len(times) > 0
    assert times.min() >= 9 * 3600
    assert times.max() < 13 * 3600
