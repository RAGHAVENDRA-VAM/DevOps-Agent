from fastapi import APIRouter

router = APIRouter()


@router.get("/dora")
async def get_dora_metrics():
    """
    Stub endpoint for DORA metrics.
    Real implementation should aggregate data from pipeline and deployment events.
    """
    return {
        "deploymentFrequency": [],
        "leadTime": [],
        "changeFailureRate": [],
        "mttr": [],
    }

