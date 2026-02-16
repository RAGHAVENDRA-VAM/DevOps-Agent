from fastapi import APIRouter

router = APIRouter()


@router.get("/sast")
async def sast_results():
    """
    Stub endpoint for SAST results from SonarQube.
    """
    return {"issues": [], "qualityGate": "UNKNOWN"}


@router.get("/dast")
async def dast_results():
    """
    Stub endpoint for DAST results from OWASP ZAP.
    """
    return {"alerts": []}

