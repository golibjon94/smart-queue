"""What-if simulyatsiya (recommend/simulate.py) uchun unit testlar.

simulate_scenario sof funksiya — DB'siz tekshiriladi.
"""
from recommend.config import WAIT_CAP_SEC
from recommend.simulate import simulate_scenario

# Namunaviy tizim: lam=0.02 mijoz/sek (72/soat), mu=1/210 sek (avg_service=210s)
LAM = 85 / 3600.0
MU = 1.0 / 210.0


def test_more_counters_less_wait():
    """Kassa oshsa kutish kamayadi (monotonlik)."""
    res = simulate_scenario(LAM, MU, baseline_counters=4, scenario_counters=6)
    assert res["scenario"]["avg_wait_sec"] < res["baseline"]["avg_wait_sec"]
    assert res["delta"]["wait_reduction_sec"] > 0
    assert res["delta"]["wait_reduction_pct"] > 0


def test_monotonic_across_counters():
    """Kassa sonini bosqichma-bosqich oshirsak kutish kamayib boradi."""
    waits = [
        simulate_scenario(LAM, MU, 4, c)["scenario"]["avg_wait_sec"]
        for c in range(4, 9)
    ]
    assert waits == sorted(waits, reverse=True)


def test_saturated_wait_is_capped():
    """To'yingan tizimda (rho>=1) kutish inf emas, WAIT_CAP_SEC bilan cheklanadi."""
    # 1 kassa, og'ir yuklama -> to'yingan
    res = simulate_scenario(LAM, MU, baseline_counters=1, scenario_counters=6)
    assert res["baseline"]["avg_wait_sec"] == WAIT_CAP_SEC
    # scenario (6 kassa) esa cheklovdan past bo'lishi kerak
    assert res["scenario"]["avg_wait_sec"] < WAIT_CAP_SEC


def test_delta_matches_snapshots():
    """delta baseline va scenario ayirmasiga mos."""
    res = simulate_scenario(LAM, MU, 4, 6)
    expected = res["baseline"]["avg_wait_sec"] - res["scenario"]["avg_wait_sec"]
    assert res["delta"]["wait_reduction_sec"] == expected


def test_no_reduction_when_same_counters():
    """Bir xil kassa soni -> o'zgarish yo'q."""
    res = simulate_scenario(LAM, MU, 5, 5)
    assert res["delta"]["wait_reduction_sec"] == 0
    assert res["delta"]["wait_reduction_pct"] == 0


def test_utilization_drops_with_more_counters():
    res = simulate_scenario(LAM, MU, 4, 6)
    assert res["scenario"]["utilization"] < res["baseline"]["utilization"]
