"""Sentiment provayder sozlamasi.

Provayderni almashtirish uchun faqat shu qiymat o'zgaradi (yoki SENTIMENT_PROVIDER
muhit o'zgaruvchisi). Qolgan kod (factory, endpoint, Gateway) tegilmaydi.
"""
from __future__ import annotations

import os

# "rule_based" (MVP fallback) | "muxlisa" | "aisha" (keyin ulanadi)
SENTIMENT_PROVIDER = os.getenv("SENTIMENT_PROVIDER", "rule_based")
