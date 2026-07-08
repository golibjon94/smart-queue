"""EWMA anomaliya aniqlash sof funksiyalari uchun unit testlar."""
from recommend.anomaly import ewma_control_chart, wait_rising


def test_stable_series_no_breach():
    """Nol atrofida tebranuvchi qoldiqlar -> signal yo'q."""
    residuals = [0.5, -0.5, 0.4, -0.6, 0.5, -0.4, 0.6, -0.5]
    chart = ewma_control_chart(residuals)
    assert chart is not None
    assert not chart.breach_up
    assert not chart.breach_down


def test_sustained_surge_breaches_up():
    """Oxiriga kelib barqaror musbat siljish -> yuqori chegaradan oshadi (surge)."""
    residuals = [0.5, -0.5, 0.4, -0.6, 5.0, 6.0, 7.0, 8.0]
    chart = ewma_control_chart(residuals)
    assert chart is not None
    assert chart.breach_up
    assert chart.exceedance >= 1.0


def test_too_few_points_returns_none():
    assert ewma_control_chart([1.0, -1.0, 1.0, -1.0]) is None


def test_zero_variance_returns_none():
    assert ewma_control_chart([3.0, 3.0, 3.0, 3.0, 3.0, 3.0]) is None


def test_wait_rising_true():
    assert wait_rising([60, 60, 70, 80, 200, 250, 300]) is True


def test_wait_rising_flat_is_false():
    assert wait_rising([100, 100, 100, 100, 100, 100]) is False


def test_wait_rising_needs_enough_points():
    assert wait_rising([100, 300, 400]) is False
