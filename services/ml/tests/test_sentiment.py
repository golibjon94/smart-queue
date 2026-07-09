"""Sentiment tasniflash (sentiment/) uchun unit testlar."""
from sentiment import RuleBasedProvider, SentimentProvider, get_provider


def test_negative_comment():
    """Salbiy izoh -> negative + to'g'ri mavzu."""
    r = RuleBasedProvider().classify("navbat juda uzun edi, uzoq kutdim")
    assert r["sentiment"] == "negative"
    assert "navbat" in r["topics"]
    assert r["score"] > 0.5


def test_positive_comment():
    """Ijobiy izoh -> positive."""
    r = RuleBasedProvider().classify("rahmat, juda tez va yaxshi xizmat")
    assert r["sentiment"] == "positive"
    assert "tezlik" in r["topics"]
    assert r["score"] > 0.5


def test_empty_is_neutral():
    r = RuleBasedProvider().classify("")
    assert r["sentiment"] == "neutral"
    assert r["score"] == 0.5
    assert r["topics"] == []


def test_no_signal_is_neutral():
    """Signal so'z yo'q -> neutral."""
    r = RuleBasedProvider().classify("bugun havo issiq")
    assert r["sentiment"] == "neutral"


def test_balanced_is_neutral():
    """Teng ijobiy/salbiy -> neutral."""
    r = RuleBasedProvider().classify("xizmat yaxshi lekin navbat uzun")
    assert r["sentiment"] == "neutral"


def test_score_grows_with_signal():
    """Ko'proq salbiy so'z -> yuqori ishonch."""
    one = RuleBasedProvider().classify("sekin")
    many = RuleBasedProvider().classify("sekin, uzun, qo'pol, yomon")
    assert many["score"] > one["score"]


def test_factory_returns_provider():
    """Factory rule_based provayderni qaytaradi va u interfeysni implement qiladi."""
    p = get_provider()
    assert isinstance(p, SentimentProvider)
    assert isinstance(p, RuleBasedProvider)


def test_factory_unknown_falls_back():
    """Noma'lum/ulanmagan provayder -> xavfsiz rule_based fallback."""
    assert isinstance(get_provider("nomavjud"), RuleBasedProvider)


def test_classify_many():
    results = RuleBasedProvider().classify_many(
        ["navbat juda uzun edi", "rahmat, tez xizmat"]
    )
    assert results[0]["sentiment"] == "negative"
    assert results[1]["sentiment"] == "positive"
