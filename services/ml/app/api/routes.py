"""API endpointlari: /health, /forecast, /recommendations."""
from __future__ import annotations

from pathlib import Path

import joblib
import psycopg
from fastapi import APIRouter, Depends, HTTPException

from recommend.anomaly import detect_anomalies
from recommend.engine import CounterState, ServiceState, make_recommendations

from ..core.db import get_conn
from ..schemas.models import (
    AnomalyOut,
    AnomalyRequest,
    AnomalyResponse,
    ForecastPoint,
    ForecastRequest,
    ForecastResponse,
    RecommendationOut,
    RecommendationRequest,
    RecommendationResponse,
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
