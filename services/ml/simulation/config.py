"""Sintetik generator parametrlari.

Barcha "biznes raqamlari" shu yerda — Mobile Solutions real raqam berganda
faqat shu fayl o'zgartiriladi.
"""
from dataclasses import dataclass

TIMEZONE = "Asia/Tashkent"


@dataclass(frozen=True)
class ServiceParams:
    service_type_id: int
    share: float            # kunlik oqimdagi ulushi (yig'indisi 1.0)
    mean_service_sec: int   # o'rtacha xizmat vaqti
    cv: float = 0.5         # variatsiya koeffitsiyenti (log-normal uchun)


@dataclass(frozen=True)
class BranchProfile:
    branch_id: int
    daily_customers: float  # oddiy ish kunidagi o'rtacha mijozlar soni


# Xizmat turlari taqsimoti (seed_reference.sql dagi id'larga mos)
SERVICES = [
    ServiceParams(1, share=0.40, mean_service_sec=240),  # To'lovlar
    ServiceParams(2, share=0.15, mean_service_sec=300),  # Pul o'tkazmalari
    ServiceParams(3, share=0.15, mean_service_sec=420),  # Plastik karta
    ServiceParams(4, share=0.10, mean_service_sec=600),  # Kredit
    ServiceParams(5, share=0.20, mean_service_sec=180),  # Ma'lumot
]

BRANCHES = [
    BranchProfile(branch_id=1, daily_customers=350.0),
    BranchProfile(branch_id=2, daily_customers=240.0),
]

# Soatlik shakl (yig'indisi 1.0): tushlik cho'qqisi 12-13, ish oxiri 16 da ko'tarilish
HOURLY_SHAPE = {
    9: 0.07, 10: 0.10, 11: 0.11, 12: 0.14, 13: 0.15,
    14: 0.11, 15: 0.09, 16: 0.12, 17: 0.11,
}

# Hafta kuni koeffitsiyenti (0=Dushanba ... 6=Yakshanba)
WEEKDAY_FACTOR = {0: 1.25, 1: 1.05, 2: 0.95, 3: 0.95, 4: 1.15, 5: 0.70, 6: 0.0}
SATURDAY_LAST_HOUR = 13   # shanba: 9:00-13:00 (qisqartirilgan kun)

# Maosh kuni / oy oxiri cho'qqilari
PAYDAY_EARLY_DAYS = 3     # oyning 1-3 kunlari
PAYDAY_EARLY_FACTOR = 1.5
MONTH_END_FROM_DAY = 28   # 28-kundan oy oxirigacha
MONTH_END_FACTOR = 1.25

# Kunlik tasodifiy shovqin (log-normal sigma)
DAILY_NOISE_SIGMA = 0.08

# Navbat xulq-atvori
WALK_SEC_RANGE = (20, 60)      # chaqirilgandan kassagacha yurish
NO_SHOW_PROB = 0.03            # chaqirilganda kelmaslik ehtimoli
NO_SHOW_HOLD_SEC = 90          # kassa kutib turadigan vaqt
PATIENCE_MEAN_SEC = 1500       # o'rtacha sabr (25 daq, eksponensial)
