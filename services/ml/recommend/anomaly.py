"""EWMA control-chart asosidagi anomaliya aniqlash (Faza 1).

Uch tur anomaliya (FAZA1_UMUMIY §6.2, §7.3):
  surge         - kelish oqimi bashoratdan keskin yuqori (musbat qoldiq portlashi)
  backlog       - navbat to'planib, kutish me'yordan barqaror o'sib borishi
  slow_operator - kassa o'rtacha xizmat vaqti baza qiymatidan sezilarli sekin

surge/backlog markazi: prognoz qoldig'i z_t = actual − forecast (forecasts jadvalidan)
ustida EWMA nazorat chartasi. slow_operator: queue_events'dagi xizmat vaqtlari ustida.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from simulation.config import TIMEZONE

from .config import (
    EWMA_BASELINE_HOURS,
    EWMA_L,
    EWMA_LAMBDA,
    EWMA_MIN_POINTS,
    SEVERITY_CRITICAL,
    SEVERITY_SERIOUS,
    SLOW_CRITICAL_RATIO,
    SLOW_OPERATOR_MIN_SAMPLES,
    SLOW_OPERATOR_RATIO,
    SLOW_SERIOUS_RATIO,
    WAIT_RISE_FLOOR_SEC,
    WAIT_RISE_RATIO,
)

TZ = ZoneInfo(TIMEZONE)


# --------------------------------------------------------------------------- #
# EWMA nazorat chartasi (sof funksiya — DB'siz testlanadi)
# --------------------------------------------------------------------------- #

@dataclass
class EwmaChart:
    ewma: list[float]   # har nuqtadagi EWMA statistikasi S_t
    sigma: float        # qoldiqlarning standart chetlanishi (shovqin darajasi)
    limit: float        # nazorat chegarasi kengligi: L·σ·√(λ/(2−λ))
    last: float         # oxirgi S_t
    breach_up: bool     # oxirgi nuqta yuqori chegaradan oshdimi
    breach_down: bool   # oxirgi nuqta pastki chegaradan oshdimi

    @property
    def exceedance(self) -> float:
        """Oxirgi nuqta chegaradan necha marta oshgani (breach bo'lsa ≥1)."""
        if self.limit <= 0:
            return 0.0
        return abs(self.last) / self.limit


def ewma_control_chart(residuals: list[float],
                       lam: float = EWMA_LAMBDA,
                       L: float = EWMA_L) -> EwmaChart | None:
    """Qoldiqlar (target=0) ustida EWMA nazorat chartasi.

    S_t = λ·z_t + (1−λ)·S_{t−1};  chegara = ±L·σ·√(λ/(2−λ)).
    None qaytadi — nuqtalar yetarli emas yoki dispersiya nol.
    """
    n = len(residuals)
    if n < EWMA_MIN_POINTS:
        return None
    mean = sum(residuals) / n
    sigma = (sum((z - mean) ** 2 for z in residuals) / n) ** 0.5
    if sigma <= 0:
        return None

    s = 0.0
    ewma: list[float] = []
    for z in residuals:
        s = lam * z + (1.0 - lam) * s
        ewma.append(s)

    limit = L * sigma * (lam / (2.0 - lam)) ** 0.5
    last = ewma[-1]
    return EwmaChart(ewma, sigma, limit, last,
                     breach_up=last > limit, breach_down=last < -limit)


def wait_rising(waits: list[float]) -> bool:
    """Kutish seriyasi oxiriga kelib barqaror o'sib borganini tekshiradi."""
    if len(waits) < 4:
        return False
    k = max(1, len(waits) // 3)
    recent = sum(waits[-k:]) / k
    base = sum(waits[:k]) / k
    return recent > base * WAIT_RISE_RATIO and recent > WAIT_RISE_FLOOR_SEC


def _severity(exceedance: float) -> str:
    if exceedance >= SEVERITY_CRITICAL:
        return "critical"
    if exceedance >= SEVERITY_SERIOUS:
        return "serious"
    return "warning"


def _severity_by_ratio(ratio: float) -> str:
    if ratio >= SLOW_CRITICAL_RATIO:
        return "critical"
    if ratio >= SLOW_SERIOUS_RATIO:
        return "serious"
    return "warning"


def _anomaly(type_: str, severity: str, branch_id: int, *, message: str,
             metric: float | None, expected: float | None,
             detected_at: datetime, service_type_id: int | None = None,
             counter_id: int | None = None) -> dict:
    """Anomaly DTO (snake_case, §7.3)."""
    return {
        "branch_id": branch_id,
        "type": type_,
        "severity": severity,
        "service_type_id": service_type_id,
        "counter_id": counter_id,
        "message": message,
        "metric": metric,
        "expected": expected,
        "detected_at": detected_at.astimezone(TZ),
    }


# --------------------------------------------------------------------------- #
# DB'dan o'qiydigan detektorlar
# --------------------------------------------------------------------------- #

def detect_anomalies(conn, branch_id: int, lookback_hours: int) -> list[dict]:
    """Filial uchun barcha anomaliyalarni yig'ib qaytaradi."""
    anomalies: list[dict] = []
    anomalies.extend(_detect_arrival_anomalies(conn, branch_id, lookback_hours))
    anomalies.extend(_detect_slow_operators(conn, branch_id, lookback_hours))
    return anomalies


def _detect_arrival_anomalies(conn, branch_id: int, lookback_hours: int) -> list[dict]:
    """surge / backlog — kelish qoldig'i (actual−forecast) EWMA chartasi.

    Oyna eng so'nggi mavjud soatga bog'lanadi ("oxirgi hodisalar") — bu soat
    devoridan mustaqil va ma'lumot eskirsa ham to'g'ri ishlaydi.
    """
    window = max(lookback_hours, EWMA_BASELINE_HOURS)
    with conn.cursor() as cur:
        cur.execute(
            """SELECT bucket,
                      sum(arrivals) AS arrivals,
                      sum(COALESCE(avg_wait, 0) * arrivals)
                          / NULLIF(sum(arrivals), 0) AS wait_sec
               FROM hourly_arrivals
               WHERE branch_id = %s
                 AND bucket > (SELECT max(bucket) FROM hourly_arrivals
                               WHERE branch_id = %s) - make_interval(hours => %s)
               GROUP BY bucket
               ORDER BY bucket""",
            (branch_id, branch_id, window),
        )
        actual_rows = cur.fetchall()
        cur.execute(
            """SELECT target_time, predicted_arrivals
               FROM forecasts
               WHERE branch_id = %s AND service_type_id IS NULL""",
            (branch_id,),
        )
        forecast = {r[0]: float(r[1]) for r in cur.fetchall()}

    # actual ↔ forecast bir xil soatga tekislanadi (faqat ikkalasi bor bucketlar)
    series = [
        (bucket, float(arr), (float(wait) if wait is not None else None),
         forecast[bucket])
        for (bucket, arr, wait) in actual_rows if bucket in forecast
    ]
    if len(series) < EWMA_MIN_POINTS:
        return []

    residuals = [arr - fc for (_, arr, _, fc) in series]
    chart = ewma_control_chart(residuals)
    if chart is None or not chart.breach_up:
        return []  # oqim bashoratdan yuqori emas -> muammo yo'q

    last_bucket, last_arr, _, last_fc = series[-1]
    severity = _severity(chart.exceedance)
    waits = [wait for (_, _, wait, _) in series if wait is not None]

    # Kutish o'sib borsa -> backlog, aks holda toza surge
    if wait_rising(waits):
        k = max(1, len(waits) // 3)
        recent = sum(waits[-k:]) / k
        base = sum(waits[:k]) / k
        return [_anomaly(
            "backlog", severity, branch_id,
            message=(f"Navbat to'planmoqda — kutish ~{recent / 60:.0f} daqiqa "
                     f"(odatdagi ~{base / 60:.0f} daqiqa)"),
            metric=round(recent / 60, 1), expected=round(base / 60, 1),
            detected_at=last_bucket,
        )]

    pct = round((last_arr - last_fc) / last_fc * 100) if last_fc > 0 else 0
    return [_anomaly(
        "surge", severity, branch_id,
        message=(f"Kelish oqimi bashoratdan ~{pct}% yuqori — kutilmagan portlash"),
        metric=round(last_arr, 1), expected=round(last_fc, 1),
        detected_at=last_bucket,
    )]


def _detect_slow_operators(conn, branch_id: int, lookback_hours: int) -> list[dict]:
    """slow_operator — kassa o'rtacha xizmat vaqti baza qiymatidan sezilarli sekin."""
    with conn.cursor() as cur:
        cur.execute(
            """SELECT qe.counter_id, qe.service_type_id,
                      count(*) AS n,
                      avg(qe.service_time_sec) AS obs,
                      st.avg_service_time_sec AS base,
                      max(qe.event_time) AS last_time
               FROM queue_events qe
               JOIN service_types st ON st.service_type_id = qe.service_type_id
               WHERE qe.branch_id = %s
                 AND qe.event_type = 'completed'
                 AND qe.counter_id IS NOT NULL
                 AND qe.service_time_sec IS NOT NULL
                 AND qe.event_time > (SELECT max(event_time) FROM queue_events
                                      WHERE branch_id = %s) - make_interval(hours => %s)
               GROUP BY qe.counter_id, qe.service_type_id, st.avg_service_time_sec""",
            (branch_id, branch_id, lookback_hours),
        )
        rows = cur.fetchall()
        cur.execute(
            "SELECT counter_id, number FROM counters WHERE branch_id = %s",
            (branch_id,),
        )
        numbers = {r[0]: r[1] for r in cur.fetchall()}

    # Kassa darajasida jamlash (baza bilan tortilgan o'rtacha)
    per_counter: dict[int, dict] = {}
    for counter_id, service_type_id, n, obs, base, last_time in rows:
        agg = per_counter.setdefault(
            counter_id,
            {"n": 0, "obs_sum": 0.0, "base_sum": 0.0,
             "top": (0, None), "last": last_time},
        )
        agg["n"] += n
        agg["obs_sum"] += float(obs) * n
        agg["base_sum"] += float(base) * n
        if last_time > agg["last"]:
            agg["last"] = last_time
        if n > agg["top"][0]:
            agg["top"] = (n, service_type_id)

    out: list[dict] = []
    for counter_id, agg in per_counter.items():
        if agg["n"] < SLOW_OPERATOR_MIN_SAMPLES or agg["base_sum"] <= 0:
            continue
        obs = agg["obs_sum"] / agg["n"]
        base = agg["base_sum"] / agg["n"]
        ratio = obs / base
        if ratio < SLOW_OPERATOR_RATIO:
            continue
        number = numbers.get(counter_id, counter_id)
        pct = round((ratio - 1.0) * 100)
        out.append(_anomaly(
            "slow_operator", _severity_by_ratio(ratio), branch_id,
            message=f"{number}-kassa o'rtacha xizmati me'yordan {pct}% sekin",
            metric=round(obs / 60, 1), expected=round(base / 60, 1),
            detected_at=agg["last"], service_type_id=agg["top"][1],
            counter_id=counter_id,
        ))
    return out
