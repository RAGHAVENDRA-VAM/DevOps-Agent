from __future__ import annotations

import os
<<<<<<< HEAD
<<<<<<< HEAD
from dataclasses import dataclass, field
from functools import lru_cache
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

from dotenv import load_dotenv


def load_env() -> None:
    """
<<<<<<< HEAD
<<<<<<< HEAD
    Load variables from a .env file for local development only.
    Production must use real environment variables or a secret manager.
    Does not override already-set environment variables.
    """
    load_dotenv()


def get_required_env(name: str) -> str:
    """Return env var value or raise if missing."""
    value = os.getenv(name)
    if not value:
        raise EnvironmentError(f"Required environment variable '{name}' is not set.")
    return value


def get_env(name: str, default: str = "") -> str:
    """Return env var value with optional default."""
    return os.getenv(name, default)


@dataclass(frozen=True)
class AppSettings:
    """
    Centralised, immutable application settings.
    All values are read from environment variables at startup.
    Use get_settings() to obtain the singleton instance.
    """

    # Server
    frontend_url: str = field(default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5173"))
    cookie_secure: bool = field(default_factory=lambda: os.getenv("COOKIE_SECURE", "").lower() == "true")
    cors_origins: list[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if o.strip()
        ]
    )

    # GitHub OAuth
    github_client_id: str = field(default_factory=lambda: os.getenv("GITHUB_CLIENT_ID", ""))
    github_client_secret: str = field(default_factory=lambda: os.getenv("GITHUB_CLIENT_SECRET", ""))
    github_oauth_callback_url: str = field(default_factory=lambda: os.getenv("GITHUB_OAUTH_CALLBACK_URL", ""))
    github_pat: str = field(default_factory=lambda: os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN", ""))

    # Azure
    azure_client_id: str = field(default_factory=lambda: os.getenv("AZURE_CLIENT_ID", ""))
    azure_client_secret: str = field(default_factory=lambda: os.getenv("AZURE_CLIENT_SECRET", ""))
    azure_tenant_id: str = field(default_factory=lambda: os.getenv("AZURE_TENANT_ID", ""))
    azure_subscription_id: str = field(default_factory=lambda: os.getenv("AZURE_SUBSCRIPTION_ID", ""))

    # AI
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))

    # Security tools
    sonar_host_url: str = field(default_factory=lambda: os.getenv("SONAR_HOST_URL", ""))
    sonar_token: str = field(default_factory=lambda: os.getenv("SONAR_TOKEN", ""))
    sonar_project_key_prefix: str = field(default_factory=lambda: os.getenv("SONAR_PROJECT_KEY_PREFIX", ""))
    zap_api_key: str = field(default_factory=lambda: os.getenv("ZAP_API_KEY", ""))
    zap_base_url: str = field(default_factory=lambda: os.getenv("ZAP_BASE_URL", ""))

    # GitHub Webhook
    github_webhook_secret: str = field(default_factory=lambda: os.getenv("GITHUB_WEBHOOK_SECRET", ""))

    # Poller
    approval_poll_interval: int = field(
        default_factory=lambda: int(os.getenv("APPROVAL_POLL_INTERVAL", "60"))
    )

    # Database
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./devops_agent.db")
    )


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    """Return the cached application settings singleton."""
    return AppSettings()
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    Local-dev convenience: load variables from a .env file if present.
    Production should use real environment variables / secret managers instead.
    """
    # Only loads if file exists; does not override already-set environment variables by default.
    load_dotenv()


def get_env(name: str) -> str | None:
    return os.getenv(name)

<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
