"""Faza 1 tavsiya/anomaliya sozlamalari.

Barcha yangi "sozlanadigan raqamlar" (JIQ chegaralari, EWMA λ/L, slow_operator
nisbatlari) shu yerda — kodga sochilmasin. simulation/config.py bilan bir uslubda.
"""

# --- JIQ (Join-the-Idle-Queue) marshrutlash ---
JIQ_MIN_WAITING = 1          # yo'naltirish uchun navbatda kamida shuncha kishi bo'lsin
JIQ_MIN_BENEFIT_SEC = 60     # tavsiya faqat >= 1 daqiqa kutish yutug'i bersa

# --- EWMA control chart (surge / backlog) ---
EWMA_LAMBDA = 0.3            # silliqlash koeffitsiyenti (λ)
EWMA_L = 3.0                 # nazorat chegarasi (sigma birligida, L)
EWMA_MIN_POINTS = 5          # ishonchli chart uchun minimal qoldiq nuqtalari
EWMA_BASELINE_HOURS = 48     # sigma bahosi uchun kamida shuncha soatlik tarix olinadi
DEFAULT_LOOKBACK_HOURS = 6   # /anomalies so'rovi standarti (§5.1)

# EWMA breach og'irligi: oxirgi nuqta chegaradan necha marta oshgani
SEVERITY_SERIOUS = 1.5
SEVERITY_CRITICAL = 2.0

# backlog: kutish o'sib borishini tasdiqlash
WAIT_RISE_RATIO = 1.25       # oxirgi kutish bazadan shu marta yuqori bo'lsa "o'sib bormoqda"
WAIT_RISE_FLOOR_SEC = 120    # va mutlaq qiymatda kamida 2 daqiqa bo'lsa

# --- slow_operator ---
SLOW_OPERATOR_RATIO = 1.30       # kassa o'rtacha xizmati bazadan 30%+ sekin bo'lsa
SLOW_OPERATOR_MIN_SAMPLES = 5    # ishonch uchun minimal tugatilgan xizmatlar soni
SLOW_SERIOUS_RATIO = 1.60
SLOW_CRITICAL_RATIO = 2.00

# Kutishni hisobotda cheklash (∞ ni JSON'ga chiqarmaslik uchun)
WAIT_CAP_SEC = 3600
