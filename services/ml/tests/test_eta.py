"""QR virtual navbat ETA (recommend/eta.py) uchun unit testlar."""
from recommend.eta import estimate_eta, peak_factor

AVG = 210.0   # avg_service_sec


def test_position_increases_eta():
    """Navbatda orqada tursa (position katta) -> ETA oshadi."""
    e1 = estimate_eta(1, AVG, open_counters=3)
    e5 = estimate_eta(5, AVG, open_counters=3)
    assert e5 > e1


def test_more_counters_reduce_eta():
    """Kassa ko'p bo'lsa navbat tezroq eriydi -> ETA kamayadi."""
    few = estimate_eta(6, AVG, open_counters=2)
    many = estimate_eta(6, AVG, open_counters=6)
    assert many < few


def test_peak_raises_eta_above_base():
    """Peak yaqin (kelish > quvvat) bo'lsa ETA baza'dan katta."""
    # 3 kassa, 210s xizmat -> quvvat = 3*3600/210 ≈ 51 mijoz/soat
    base = estimate_eta(4, AVG, open_counters=3, arrivals_next_hour=None)
    peak = estimate_eta(4, AVG, open_counters=3, arrivals_next_hour=120)
    assert peak > base


def test_no_peak_when_below_capacity():
    """Kelish quvvatdan past bo'lsa tuzatish yo'q (factor=1.0)."""
    assert peak_factor(AVG, open_counters=3, arrivals_next_hour=10) == 1.0


def test_peak_factor_capped():
    """Juda katta oqimda ham koeffitsiyent 1.5 dan oshmaydi."""
    f = peak_factor(AVG, open_counters=1, arrivals_next_hour=100000)
    assert f == 1.5


def test_eta_is_int_seconds():
    assert isinstance(estimate_eta(3, AVG, 3), int)
