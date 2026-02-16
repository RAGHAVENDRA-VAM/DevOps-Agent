from fastapi import APIRouter

from app.api.v1 import auth, github, analysis, pipelines, metrics, security, infrastructure

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(github.router, prefix="/github", tags=["github"])
router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
router.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
router.include_router(security.router, prefix="/security", tags=["security"])
router.include_router(infrastructure.router, prefix="/infrastructure", tags=["infrastructure"])

