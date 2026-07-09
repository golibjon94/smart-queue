"""Muxlisa AI sentiment adapteri (STUB — keyin ulanadi).

Interfeys tayyor; haqiqiy API chaqiruvi API kaliti kelgach yoziladi. Hozir demo
rule_based bilan ishlaydi — bu adapter bloklamaydi.
"""
from __future__ import annotations

from .provider import SentimentProvider


class MuxlisaProvider(SentimentProvider):
    def classify(self, text: str) -> dict:
        # TODO: Muxlisa AI API chaqiruvi (API kaliti kelgach). Interfeys:
        # {"sentiment": ..., "score": ..., "topics": [...]} qaytarish.
        raise NotImplementedError(
            "Muxlisa AI provayderi hali ulanmagan — SENTIMENT_PROVIDER='rule_based' ishlating"
        )
