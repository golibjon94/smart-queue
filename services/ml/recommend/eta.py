"""QR virtual navbat uchun ETA (taxminiy kutish vaqti) hisoblash.

Baza: eta = position × avg_service_sec / open_counters.
Bizning ustunlik: forecast bilan tuzatish — agar keyingi soatda kelish tezligi
joriy quvvatdan oshsa (peak yaqin), navbat sekinroq eriydi, shuning uchun ETA'ni
konservativ oshiramiz. Raqiblar oddiy o'rtacha ishlatadi, biz forecast qo'shamiz.
"""
from __future__ import annotations

from .config import ETA_PEAK_MAX_FACTOR


def peak_factor(avg_service_sec: float, open_counters: int,
                arrivals_next_hour: float | None) -> float:
    """Forecast tuzatish koeffitsiyenti (>= 1.0).

    Joriy quvvat = open_counters × 3600 / avg_service_sec (soatiga xizmat qila
    oladigan mijoz). Kelayotgan oqim quvvatdan oshsa — koeffitsiyent oshadi,
    lekin ETA_PEAK_MAX_FACTOR bilan cheklanadi (mijozga real, qo'rqitmaydigan raqam).
    """
    if not arrivals_next_hour or arrivals_next_hour <= 0 or avg_service_sec <= 0:
        return 1.0
    capacity = max(open_counters, 1) * 3600.0 / avg_service_sec
    if capacity <= 0 or arrivals_next_hour <= capacity:
        return 1.0
    return min(ETA_PEAK_MAX_FACTOR, arrivals_next_hour / capacity)


def estimate_eta(position: int, avg_service_sec: float, open_counters: int,
                 arrivals_next_hour: float | None = None) -> int:
    """Navbatdagi `position` o'rin uchun taxminiy kutish (sekundlarda, butun son).

    position=1 -> keyingi chaqiriladigan. open_counters kamida 1 deb olinadi.
    """
    base = position * avg_service_sec / max(open_counters, 1)
    factor = peak_factor(avg_service_sec, open_counters, arrivals_next_hour)
    return int(round(base * factor))
