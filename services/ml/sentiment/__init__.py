"""Sentiment tasniflash paketi + provayder factory.

Ishlatish:
    from sentiment import get_provider
    provider = get_provider()               # config'dagi standart (rule_based)
    result = provider.classify("navbat juda uzun edi")

Provayderni almashtirish: SENTIMENT_PROVIDER config qiymatini o'zgartiring —
qolgan kod tegilmaydi.
"""
from __future__ import annotations

from .config import SENTIMENT_PROVIDER
from .provider import SentimentProvider
from .rule_based import RuleBasedProvider

__all__ = ["SentimentProvider", "RuleBasedProvider", "get_provider"]


def get_provider(name: str | None = None) -> SentimentProvider:
    """Factory: config (yoki `name`) bo'yicha provayder qaytaradi.

    Noma'lum yoki hali ulanmagan provayder — rule_based fallback'ga qaytadi,
    shunda demo hech qachon buzilmaydi.
    """
    chosen = (name or SENTIMENT_PROVIDER).lower()

    if chosen == "rule_based":
        return RuleBasedProvider()
    if chosen == "muxlisa":
        from .muxlisa import MuxlisaProvider
        return MuxlisaProvider()
    if chosen == "aisha":
        from .aisha import AishaProvider
        return AishaProvider()

    # Noma'lum nom -> xavfsiz fallback
    return RuleBasedProvider()
