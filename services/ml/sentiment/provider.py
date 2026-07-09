"""Sentiment provayder abstrakt interfeysi.

Barcha tasniflagichlar (qoida-asosli fallback, kelajakda Muxlisa/Aisha AI) shu
interfeysni implement qiladi. Shunda provayderni almashtirish uchun faqat factory
o'zgaradi, qolgan kod (Gateway, endpoint) tegilmaydi.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class SentimentProvider(ABC):
    """Bitta o'zbekcha izohni sentiment + mavzu bo'yicha tasniflaydigan interfeys."""

    @abstractmethod
    def classify(self, text: str) -> dict:
        """Izohni tasniflaydi.

        Qaytadi: {"sentiment": "positive|negative|neutral",
                  "score": 0.0..1.0,          # ishonch darajasi
                  "topics": ["navbat", ...]}   # aniqlangan mavzular
        """
        raise NotImplementedError

    def classify_many(self, texts: list[str]) -> list[dict]:
        """Bir nechta izohni ketma-ket tasniflash (adapter'lar zarurat bo'lsa
        batch API bilan qayta yozishi mumkin)."""
        return [self.classify(t) for t in texts]
