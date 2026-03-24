<<<<<<< HEAD
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
import os
from typing import AsyncGenerator

=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
<<<<<<< HEAD
from app.api.v1.approvals import start_poller
from app.config import get_settings, load_env
from app.db import create_tables

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:  # noqa: ARG001
    load_env()
    settings = get_settings()
    await create_tables()
    logger.info("DevOps Agent Platform starting up")
    token_preview = (settings.github_pat[:12] + "...") if settings.github_pat else "NOT SET"
    logger.info("GITHUB_PERSONAL_ACCESS_TOKEN loaded: %s", token_preview)
    poller_task = asyncio.create_task(start_poller())
    yield
    poller_task.cancel()
    logger.info("DevOps Agent Platform shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="DevOps Agent Platform API",
        version="0.1.0",
        description="Enterprise DevOps Agent — CI/CD automation, AI pipeline analysis, Azure provisioning.",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # Ensure frontend origin is allowed; helpful for local dev when FRONTEND_URL is set
    allowed_origins = list(settings.cors_origins or [])
    if settings.frontend_url and settings.frontend_url not in allowed_origins:
        allowed_origins.append(settings.frontend_url)

    logger.info("CORS allowed origins: %s", allowed_origins)

    # For quick local development troubleshooting you can enable DEV_ALLOW_ALL_CORS
    # to allow all origins. Set DEV_ALLOW_ALL_CORS=true in your environment if needed.
    if os.getenv("DEV_ALLOW_ALL_CORS", "").lower() == "true":
        logger.warning("DEV_ALLOW_ALL_CORS is enabled — allowing all origins for development")
        cors_origins = ["*"]
    else:
        cors_origins = allowed_origins

    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
=======
from app.config import load_env


def create_app() -> FastAPI:
    load_env()
    app = FastAPI(
        title="DevOps Agent Platform API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        timeout=900,  # 15 min for long Azure provisioning
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

<<<<<<< HEAD
    application.include_router(api_router, prefix="/api")
    return application


app = create_app()
=======
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()

>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
