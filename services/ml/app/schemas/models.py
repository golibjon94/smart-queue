"""API kirish/chiqish modellari (Pydantic)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from recommend.config import DEFAULT_LOOKBACK_HOURS


# --- /forecast ---

class ForecastRequest(BaseModel):
    branch_id: int
    hours: int = Field(default=24, ge=1, le=168)
    service_type_id: int | None = None  # None -> filial jami


class ForecastPoint(BaseModel):
    target_time: datetime
    predicted_arrivals: float
    lower_ci: float
    upper_ci: float


class ForecastResponse(BaseModel):
    branch_id: int
    service_type_id: int | None
    model_name: str | None
    model_version: str | None
    points: list[ForecastPoint]


# --- /recommendations ---

class ServiceStateIn(BaseModel):
    service_type_id: int
    waiting: int = Field(ge=0)
    open_counters: int = Field(ge=0)
    arrivals_per_hour: float | None = None


class CounterStateIn(BaseModel):
    counter_id: int
    number: int
    status: str = "idle"                        # serving | idle | closed
    supported_service_types: list[int] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    branch_id: int
    services: list[ServiceStateIn]
    counters: list[CounterStateIn] | None = None   # JIQ uchun (ixtiyoriy)


class RecommendationOut(BaseModel):
    rec_id: int
    action_type: str
    action: str
    reason: str
    expected_benefit: dict
    action_payload: dict
    status: str
    generated_at: str


class RecommendationResponse(BaseModel):
    branch_id: int
    recommendations: list[RecommendationOut]


# --- /anomalies ---

class AnomalyRequest(BaseModel):
    branch_id: int
    lookback_hours: int = Field(default=DEFAULT_LOOKBACK_HOURS, ge=1, le=168)


class AnomalyOut(BaseModel):
    branch_id: int
    type: str                              # slow_operator | backlog | surge
    severity: str                          # warning | serious | critical
    service_type_id: int | None = None
    counter_id: int | None = None
    message: str
    metric: float | None = None
    expected: float | None = None
    detected_at: datetime


class AnomalyResponse(BaseModel):
    branch_id: int
    anomalies: list[AnomalyOut]


# --- /simulate (What-if simulyatsiya, §4) ---

class SimulateScenarioIn(BaseModel):
    open_counters: int = Field(ge=1, le=60)       # menejer slayderda tanlagan kassa soni
    arrivals_per_hour: float | None = None        # None -> forecast'dan
    avg_service_sec: float | None = None          # None -> tarixiy o'rtachadan


class SimulateRequest(BaseModel):
    branch_id: int
    service_type_id: int | None = None            # None -> filial jami
    scenario: SimulateScenarioIn


class SimulateSnapshot(BaseModel):
    open_counters: int
    avg_wait_sec: int
    utilization: float
    prob_wait: float


class SimulateDelta(BaseModel):
    wait_reduction_sec: int
    wait_reduction_pct: int


class SimulateResponse(BaseModel):
    branch_id: int
    service_type_id: int | None
    baseline: SimulateSnapshot
    scenario: SimulateSnapshot
    delta: SimulateDelta


# --- /eta (QR virtual navbat ETA, §5.5) ---

class EtaRequest(BaseModel):
    branch_id: int
    service_type_id: int | None = None
    position: int = Field(ge=1)                    # navbatdagi o'rin (1 = keyingi)
    open_counters: int = Field(default=1, ge=1)
    avg_service_sec: float | None = None           # None -> service_types'dan
    arrivals_next_hour: float | None = None        # None -> forecast'dan


class EtaResponse(BaseModel):
    position: int
    eta_sec: int
    base_eta_sec: int                              # forecast tuzatishisiz baza
    forecast_factor: float                         # >= 1.0 (peak tuzatishi)


# --- /classify-feedback (Sentiment tasniflash, §6.2) ---

class ClassifyFeedbackRequest(BaseModel):
    comments: list[str]


class FeedbackResult(BaseModel):
    sentiment: str                                 # positive | negative | neutral
    score: float
    topics: list[str]


class ClassifyFeedbackResponse(BaseModel):
    results: list[FeedbackResult]
