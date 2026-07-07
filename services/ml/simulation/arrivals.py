"""Non-homogeneous Poisson jarayoni — thinning (Lewis-Shedler) usuli."""
from __future__ import annotations

import numpy as np


def nhpp_arrivals(lam_by_hour: dict[int, float], rng: np.random.Generator) -> np.ndarray:
    """Kun ichidagi kelish vaqtlari (yarim tundan boshlab sekundlarda).

    lam_by_hour: {soat: shu soatdagi kutilayotgan kelishlar soni}.
    Thinning: doimiy λ* bilan homogen jarayon, har nomzod λ(t)/λ* ehtimol
    bilan qabul qilinadi.
    """
    if not lam_by_hour:
        return np.array([])

    open_sec = min(lam_by_hour) * 3600.0
    close_sec = (max(lam_by_hour) + 1) * 3600.0
    lam_star = max(lam_by_hour.values()) / 3600.0  # sekundiga maksimal intensivlik

    times: list[float] = []
    t = open_sec
    while True:
        t += rng.exponential(1.0 / lam_star)
        if t >= close_sec:
            break
        lam_t = lam_by_hour.get(int(t // 3600), 0.0) / 3600.0
        if rng.random() < lam_t / lam_star:
            times.append(t)
    return np.array(times)
