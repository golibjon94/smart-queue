"""Erlang-C formulalarini ma'lum qiymatlar bilan tekshirish."""
import math

import pytest

from recommend.erlang import avg_wait_sec, erlang_c, required_counters


def test_erlang_c_known_value():
    """Klassik misol: a = lam/mu = 2 Erlang, c = 3 -> P(wait) = 4/9."""
    lam, mu, c = 2.0, 1.0, 3
    assert erlang_c(lam, mu, c) == pytest.approx(4.0 / 9.0, rel=1e-9)


def test_avg_wait_matches_formula():
    """Wq = ErlangC / (c*mu - lam)."""
    lam, mu, c = 2.0, 1.0, 3
    assert avg_wait_sec(lam, mu, c) == pytest.approx((4.0 / 9.0) / 1.0, rel=1e-9)


def test_saturated_system():
    assert erlang_c(5.0, 1.0, 3) == 1.0
    assert avg_wait_sec(5.0, 1.0, 3) == math.inf


def test_more_counters_less_wait():
    lam, mu = 0.02, 0.01
    w3, w4 = avg_wait_sec(lam, mu, 3), avg_wait_sec(lam, mu, 4)
    assert w4 < w3


def test_required_counters():
    lam, mu = 2.0, 1.0
    # c=3 da Wq=0.444s; maqsad 0.5s -> 3 yetadi
    assert required_counters(lam, mu, target_wait_sec=0.5) == 3
    # juda qattiq maqsad -> ko'proq kassa
    assert required_counters(lam, mu, target_wait_sec=0.05) > 3
