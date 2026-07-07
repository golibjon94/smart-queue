"""λ(t) — kelish intensivligi profili (soatlik, filial + xizmat turi kesimida)."""
from __future__ import annotations

from datetime import date

from .config import (
    HOURLY_SHAPE,
    MONTH_END_FACTOR,
    MONTH_END_FROM_DAY,
    PAYDAY_EARLY_DAYS,
    PAYDAY_EARLY_FACTOR,
    SATURDAY_LAST_HOUR,
    WEEKDAY_FACTOR,
    BranchProfile,
    ServiceParams,
)


def payday_factor(d: date) -> float:
    if d.day <= PAYDAY_EARLY_DAYS:
        return PAYDAY_EARLY_FACTOR
    if d.day >= MONTH_END_FROM_DAY:
        return MONTH_END_FACTOR
    return 1.0


def business_hours(d: date) -> list[int]:
    """Ish soatlari ro'yxati (soat boshlari). Yakshanba — yopiq."""
    wd = d.weekday()
    if wd == 6:
        return []
    if wd == 5:
        return [h for h in sorted(HOURLY_SHAPE) if h < SATURDAY_LAST_HOUR]
    return sorted(HOURLY_SHAPE)


def hourly_lambda(
    branch: BranchProfile,
    service: ServiceParams,
    d: date,
    noise: float = 1.0,
) -> dict[int, float]:
    """Berilgan kun uchun {soat: kutilayotgan kelishlar soni} xaritasi."""
    wf = WEEKDAY_FACTOR[d.weekday()]
    if wf == 0.0:
        return {}
    pf = payday_factor(d)
    return {
        h: branch.daily_customers * service.share * HOURLY_SHAPE[h] * wf * pf * noise
        for h in business_hours(d)
    }
