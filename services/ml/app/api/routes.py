"""API endpointlari: /health, /forecast, /recommendations."""
from __future__ import annotations

from pathlib import Path

import joblib
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from recommend.anomaly import detect_anomalies
from recommend.config import (
    SIM_DEFAULT_ARRIVALS_PER_HOUR,
    SIM_DEFAULT_AVG_SERVICE_SEC,
    SIM_DEFAULT_OPEN_COUNTERS,
)
from recommend.engine import CounterState, ServiceState, make_recommendations
from recommend.eta import estimate_eta, peak_factor
from recommend.simulate import simulate_scenario
from sentiment import get_provider

from ..core.db import get_conn
from ..schemas.models import (
    AnomalyOut,
    AnomalyRequest,
    AnomalyResponse,
    ClassifyFeedbackRequest,
    ClassifyFeedbackResponse,
    EtaRequest,
    EtaResponse,
    FeedbackResult,
    ForecastPoint,
    ForecastRequest,
    ForecastResponse,
    RecommendationOut,
    RecommendationRequest,
    RecommendationResponse,
    SimulateRequest,
    SimulateResponse,
)

router = APIRouter()

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"


def _model_version() -> str | None:
    try:
        return joblib.load(MODELS_DIR / "latest.joblib")["version"]
    except Exception:
        return None


@router.get("/health")
def health(conn: psycopg.Connection = Depends(get_conn)) -> dict:
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
        cur.fetchone()
    return {
        "status": "ok",
        "db": "ok",
        "model_version": _model_version(),
    }


@router.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest,
             conn: psycopg.Connection = Depends(get_conn)) -> ForecastResponse:
    """forecasts jadvalidan bashorat o'qish (predict.py oldindan to'ldiradi)."""
    with conn.cursor() as cur:
        cur.execute(
            """SELECT target_time, predicted_arrivals, lower_ci, upper_ci,
                      model_name, model_version
               FROM forecasts
               WHERE branch_id = %s
                 AND (service_type_id = %s OR (%s::int IS NULL AND service_type_id IS NULL))
                 AND target_time >= now()
                 AND target_time < now() + make_interval(hours => %s)
               ORDER BY target_time""",
            (req.branch_id, req.service_type_id, req.service_type_id, req.hours),
        )
        rows = cur.fetchall()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Bashorat topilmadi — 'python -m forecasting.predict' ishga tushirilganmi?",
        )

    return ForecastResponse(
        branch_id=req.branch_id,
        service_type_id=req.service_type_id,
        model_name=rows[0][4],
        model_version=rows[0][5],
        points=[
            ForecastPoint(target_time=r[0], predicted_arrivals=float(r[1]),
                          lower_ci=float(r[2]), upper_ci=float(r[3]))
            for r in rows
        ],
    )


@router.post("/recommendations", response_model=RecommendationResponse)
def recommendations(req: RecommendationRequest,
                    conn: psycopg.Connection = Depends(get_conn)) -> RecommendationResponse:
    """Joriy navbat holatiga ko'ra tavsiyalar (ACTION + REASON + BENEFIT)."""
    states = [
        ServiceState(
            service_type_id=s.service_type_id,
            waiting=s.waiting,
            open_counters=s.open_counters,
            arrivals_per_hour=s.arrivals_per_hour,
        )
        for s in req.services
    ]
    counters = [
        CounterState(
            counter_id=c.counter_id,
            number=c.number,
            status=c.status,
            supported_service_types=c.supported_service_types,
        )
        for c in (req.counters or [])
    ]
    recs = make_recommendations(conn, req.branch_id, states, counters)
    return RecommendationResponse(
        branch_id=req.branch_id,
        recommendations=[RecommendationOut(**r) for r in recs],
    )


@router.post("/anomalies", response_model=AnomalyResponse)
def anomalies(req: AnomalyRequest,
              conn: psycopg.Connection = Depends(get_conn)) -> AnomalyResponse:
    """EWMA anomaliya aniqlash (surge / backlog / slow_operator)."""
    found = detect_anomalies(conn, req.branch_id, req.lookback_hours)
    return AnomalyResponse(
        branch_id=req.branch_id,
        anomalies=[AnomalyOut(**a) for a in found],
    )


# --- Faza 2: DB'dan zaxira qiymatlarni o'qish (best-effort, demo buzilmasin) ---

def _lookup_avg_service_sec(conn, service_type_id: int | None) -> float | None:
    """service_types'dan o'rtacha xizmat vaqti (service_type_id=None -> filial o'rtachasi)."""
    try:
        with conn.cursor() as cur:
            if service_type_id is None:
                cur.execute("SELECT avg(avg_service_time_sec) FROM service_types")
            else:
                cur.execute(
                    "SELECT avg_service_time_sec FROM service_types WHERE service_type_id = %s",
                    (service_type_id,),
                )
            row = cur.fetchone()
        return float(row[0]) if row and row[0] is not None else None
    except Exception:
        return None


def _lookup_open_counters(conn, branch_id: int, service_type_id: int | None) -> int | None:
    """Joriy faol (ochiq) kassalar soni — baseline uchun."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT count(*) FROM counters
                   WHERE branch_id = %s AND is_active = TRUE
                     AND (%s::int IS NULL OR %s = ANY(supported_service_types))""",
                (branch_id, service_type_id, service_type_id),
            )
            row = cur.fetchone()
        n = int(row[0]) if row and row[0] is not None else 0
        return n or None
    except Exception:
        return None


def _lookup_next_hour_arrivals(conn, branch_id: int,
                               service_type_id: int | None) -> float | None:
    """forecasts jadvalidan keyingi soat uchun bashorat qilingan kelish soni."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT predicted_arrivals FROM forecasts
                   WHERE branch_id = %s
                     AND (service_type_id = %s OR (%s::int IS NULL AND service_type_id IS NULL))
                     AND target_time >= now()
                   ORDER BY target_time
                   LIMIT 1""",
                (branch_id, service_type_id, service_type_id),
            )
            row = cur.fetchone()
        return float(row[0]) if row and row[0] is not None else None
    except Exception:
        return None


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest,
             conn: psycopg.Connection = Depends(get_conn)) -> SimulateResponse:
    """What-if: kassa sonini o'zgartirsak kutish qanday o'zgaradi (§4).

    Side-effektsiz, DB yozuvsiz — faqat hisob. Kirish parametrlari so'rovda
    berilmasa DB'dan (forecast, service_types, counters) to'ldiriladi; ular ham
    topilmasa oqilona zaxira qiymatlar ishlatiladi (demo hech qachon buzilmaydi).
    """
    sc = req.scenario
    avg_service_sec = (sc.avg_service_sec
                       or _lookup_avg_service_sec(conn, req.service_type_id)
                       or SIM_DEFAULT_AVG_SERVICE_SEC)
    arrivals_hr = (sc.arrivals_per_hour
                   or _lookup_next_hour_arrivals(conn, req.branch_id, req.service_type_id)
                   or SIM_DEFAULT_ARRIVALS_PER_HOUR)
    baseline_counters = (_lookup_open_counters(conn, req.branch_id, req.service_type_id)
                         or SIM_DEFAULT_OPEN_COUNTERS)

    mu = 1.0 / avg_service_sec
    lam = arrivals_hr / 3600.0
    result = simulate_scenario(lam, mu, baseline_counters, sc.open_counters)

    return SimulateResponse(
        branch_id=req.branch_id,
        service_type_id=req.service_type_id,
        **result,
    )


@router.post("/eta", response_model=EtaResponse)
def eta(req: EtaRequest,
        conn: psycopg.Connection = Depends(get_conn)) -> EtaResponse:
    """QR virtual navbat: navbatdagi o'ringa ko'ra ETA, forecast bilan tuzatilgan (§5.5).

    avg_service_sec / arrivals_next_hour so'rovda berilmasa DB'dan to'ldiriladi.
    """
    avg_service_sec = (req.avg_service_sec
                       or _lookup_avg_service_sec(conn, req.service_type_id)
                       or SIM_DEFAULT_AVG_SERVICE_SEC)
    arrivals_next_hour = (req.arrivals_next_hour
                          if req.arrivals_next_hour is not None
                          else _lookup_next_hour_arrivals(conn, req.branch_id,
                                                          req.service_type_id))

    base = int(round(req.position * avg_service_sec / max(req.open_counters, 1)))
    factor = peak_factor(avg_service_sec, req.open_counters, arrivals_next_hour)
    eta_sec = estimate_eta(req.position, avg_service_sec, req.open_counters,
                           arrivals_next_hour)

    return EtaResponse(
        position=req.position,
        eta_sec=eta_sec,
        base_eta_sec=base,
        forecast_factor=round(factor, 2),
    )


@router.post("/classify-feedback", response_model=ClassifyFeedbackResponse)
def classify_feedback(req: ClassifyFeedbackRequest) -> ClassifyFeedbackResponse:
    """Sentiment tasniflash (§6.2): o'zbekcha izohlar -> sentiment + mavzu.

    Provayder config'dan tanlanadi (standart: rule_based). NLP provayder (Muxlisa/
    Aisha) keyin ulanganda faqat SENTIMENT_PROVIDER o'zgaradi — endpoint tegilmaydi.
    """
    provider = get_provider()
    results = [FeedbackResult(**provider.classify(c)) for c in req.comments]
    return ClassifyFeedbackResponse(results=results)
