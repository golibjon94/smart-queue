"""API kirish/chiqish modellari (Pydantic)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


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


class RecommendationRequest(BaseModel):
    branch_id: int
    services: list[ServiceStateIn]


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
