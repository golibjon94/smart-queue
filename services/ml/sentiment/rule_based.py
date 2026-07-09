"""Qoida-asosli sentiment tasniflagich (MVP fallback).

O'zbek/rus kalit-so'z leksikoni asosida ijobiy/salbiy balansni hisoblaydi va
mavzuni aniqlaydi. Tashqi API'ga bog'liq emas — demo uchun yetarli. Muxlisa/Aisha
AI keyin ulanganda faqat provayder almashadi, endpoint tegilmaydi.
"""
from __future__ import annotations

from .provider import SentimentProvider

# --- Leksikon (kichik harfda solishtiriladi) ---
# Salbiy signal so'zlari
NEGATIVE_WORDS = [
    "sekin", "uzun", "kutdim", "kutdik", "qo'pol", "qopol", "yomon", "muammo",
    "xafa", "jahl", "kech", "kechik", "asab", "noqulay", "yoqmadi", "ketdi vaqt",
    "juda uzoq", "uzoq", "charchadim", "aralashib", "tartibsiz", "bezor",
    "медленно", "долго", "грубо", "плохо", "очередь большая",
]
# Ijobiy signal so'zlari
POSITIVE_WORDS = [
    "rahmat", "zo'r", "zor", "tez", "yaxshi", "qulay", "mamnun", "ajoyib",
    "tuzuk", "a'lo", "alo", "xush", "xushmuomala", "professional", "rozi",
    "yoqdi", "kladno", "спасибо", "быстро", "хорошо", "удобно", "отлично",
]

# --- Mavzu kalit-so'zlari (mavzu -> unga tegishli so'zlar) ---
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "navbat": ["navbat", "qator", "o'rin", "orin", "uzun", "очередь"],
    "xodim": ["xodim", "operator", "muomala", "qo'pol", "qopol", "xushmuomala",
              "kassir", "yigit", "qiz", "сотрудник", "оператор"],
    "tezlik": ["tez", "sekin", "kutdim", "kutdik", "kech", "vaqt", "tezlik",
               "быстро", "медленно"],
    "infratuzilma": ["joy", "kassa", "oyna", "issiq", "sovuq", "havo", "kondensioner",
                     "stul", "жарко", "холодно"],
}


class RuleBasedProvider(SentimentProvider):
    """Leksikon asosidagi tasniflagich (tashqi bog'liqliksiz)."""

    def classify(self, text: str) -> dict:
        t = (text or "").lower()

        pos = sum(1 for w in POSITIVE_WORDS if w in t)
        neg = sum(1 for w in NEGATIVE_WORDS if w in t)

        if pos > neg:
            sentiment, strength = "positive", pos
        elif neg > pos:
            sentiment, strength = "negative", neg
        else:
            sentiment, strength = "neutral", 0

        topics = self._topics(t)
        score = self._score(sentiment, strength)
        return {"sentiment": sentiment, "score": score, "topics": topics}

    @staticmethod
    def _topics(t: str) -> list[str]:
        """Matnda uchraydigan mavzular (birinchi topilgan tartibida, takrorsiz)."""
        found: list[str] = []
        for topic, words in TOPIC_KEYWORDS.items():
            if any(w in t for w in words):
                found.append(topic)
        return found

    @staticmethod
    def _score(sentiment: str, strength: int) -> float:
        """Ishonch darajasi (0.5..0.97). Signal so'z ko'proq bo'lsa ishonch ortadi."""
        if sentiment == "neutral":
            return 0.5
        return round(min(0.97, 0.6 + 0.14 * strength), 2)
