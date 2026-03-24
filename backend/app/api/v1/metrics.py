from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class DeploymentFrequencyPoint(BaseModel):
    date: str
    count: int


class LeadTimePoint(BaseModel):
    date: str
    hours: float


class ChangeFailureRatePoint(BaseModel):
    date: str
    rate: float  # 0.0 – 1.0


class MttrPoint(BaseModel):
    date: str
    hours: float


class DoraMetricsResponse(BaseModel):
    deployment_frequency: list[DeploymentFrequencyPoint]
    lead_time: list[LeadTimePoint]
    change_failure_rate: list[ChangeFailureRatePoint]
    mttr: list[MttrPoint]
    # Elite / High / Medium / Low classification per DORA research
    deployment_frequency_band: Literal["elite", "high", "medium", "low"] = "low"
    lead_time_band: Literal["elite", "high", "medium", "low"] = "low"
    change_failure_rate_band: Literal["elite", "high", "medium", "low"] = "low"
    mttr_band: Literal["elite", "high", "medium", "low"] = "low"


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

@router.get("/dora", response_model=DoraMetricsResponse)
async def get_dora_metrics() -> DoraMetricsResponse:
    """
    DORA metrics endpoint.

    Returns the four key DORA metrics with performance band classification.

    Real implementation should:
    - Aggregate deployment events from the approvals store (or a DB).
    - Calculate lead time from first commit to production deploy.
    - Track change failure rate from failed pipeline conclusions.
    - Calculate MTTR from failure detection to recovery deploy.

    Currently returns empty series — wire to a persistent store (PostgreSQL /
    SQLite via SQLAlchemy) to populate real data.
    """
    return DoraMetricsResponse(
        deployment_frequency=[],
        lead_time=[],
        change_failure_rate=[],
        mttr=[],
    )
