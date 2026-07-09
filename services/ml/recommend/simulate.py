"""What-if simulyatsiya — "kassa sonini o'zgartirsam kutish qanday o'zgaradi?"

Erlang-C yadrosidan (erlang.py) foydalanadi — formulani qayta yozmaydi, faqat
baseline (joriy holat) va scenario (menejer slayderi) ssenariylarini solishtiradi.
Side-effektsiz, DB yozuvsiz — faqat hisob (read-only).
"""
from __future__ import annotations

from .config import WAIT_CAP_SEC
from .erlang import avg_wait_sec, erlang_c, offered_load


def _capped(sec: float) -> float:
    """To'yingan tizimda ∞ ni JSON'ga chiqarmaslik uchun cheklash."""
    return min(sec, float(WAIT_CAP_SEC))


def _snapshot(lam: float, mu: float, counters: int) -> dict:
    """Bitta ssenariy ko'rsatkichlari: kutish, yuklama (utilization), kutish ehtimoli.

    utilization = a/c (a = lam/mu). To'yingan tizimda 1.0 dan katta chiqishi mumkin —
    bu haqiqiy holat (100%+ yuklama), UI cheklaydi.
    """
    a = offered_load(lam, mu)
    util = a / counters if counters > 0 else float("inf")
    return {
        "open_counters": counters,
        "avg_wait_sec": round(_capped(avg_wait_sec(lam, mu, counters))),
        "utilization": round(util, 2),
        "prob_wait": round(erlang_c(lam, mu, counters), 2),
    }


def simulate_scenario(lam: float, mu: float, baseline_counters: int,
                      scenario_counters: int) -> dict:
    """baseline va scenario uchun ko'rsatkichlar + ular orasidagi delta.

    lam - kelish tezligi (mijoz/sekund).
    mu  - xizmat tezligi (mijoz/sekund, ya'ni 1/avg_service_sec).
    baseline_counters - joriy ochiq kassa soni.
    scenario_counters - menejer slayderda tanlagan kassa soni.

    Qaytadi: {"baseline": {...}, "scenario": {...}, "delta": {...}} — shakl
    FAZA2_UMUMIY.md §4 dagidek.
    """
    baseline = _snapshot(lam, mu, baseline_counters)
    scenario = _snapshot(lam, mu, scenario_counters)

    reduction = baseline["avg_wait_sec"] - scenario["avg_wait_sec"]
    pct = (round(reduction / baseline["avg_wait_sec"] * 100)
           if baseline["avg_wait_sec"] > 0 else 0)

    return {
        "baseline": baseline,
        "scenario": scenario,
        "delta": {
            "wait_reduction_sec": reduction,
            "wait_reduction_pct": pct,
        },
    }
