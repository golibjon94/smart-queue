"""Erlang-C / M/M/c navbat nazariyasi hisoblari.

Belgilar:
  lam - kelish tezligi (mijoz/sekund)
  mu  - xizmat tezligi (mijoz/sekund, ya'ni 1/o'rtacha_xizmat_vaqti)
  c   - parallel kassalar soni
"""
from __future__ import annotations

import math


def offered_load(lam: float, mu: float) -> float:
    """a = lam/mu (Erlang)."""
    return lam / mu


def erlang_c(lam: float, mu: float, c: int) -> float:
    """P(kutish > 0) — mijoz navbatda kutish ehtimoli.

    Tizim to'yingan bo'lsa (rho >= 1) 1.0 qaytadi.
    """
    if c <= 0:
        return 1.0
    a = offered_load(lam, mu)
    rho = a / c
    if rho >= 1.0:
        return 1.0
    # P_wait = (a^c/c!) / ((1-rho) * sum_{k<c} a^k/k! + a^c/c!)
    term = 1.0  # a^k/k!, k=0
    s = 0.0
    for k in range(c):
        if k > 0:
            term *= a / k
        s += term
    top = term * a / c  # a^c/c!
    return top / ((1.0 - rho) * s + top)


def avg_wait_sec(lam: float, mu: float, c: int) -> float:
    """Wq — navbatdagi o'rtacha kutish (sekund). To'yingan tizimda inf."""
    if c <= 0 or lam <= 0:
        return 0.0 if lam <= 0 else math.inf
    if lam >= c * mu:
        return math.inf
    return erlang_c(lam, mu, c) / (c * mu - lam)


def required_counters(lam: float, mu: float, target_wait_sec: float,
                      c_max: int = 30) -> int:
    """Berilgan kutish maqsadiga yetish uchun minimal kassa soni."""
    for c in range(1, c_max + 1):
        if lam < c * mu and avg_wait_sec(lam, mu, c) <= target_wait_sec:
            return c
    return c_max
