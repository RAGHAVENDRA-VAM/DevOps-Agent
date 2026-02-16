from __future__ import annotations

import os

from dotenv import load_dotenv


def load_env() -> None:
    """
    Local-dev convenience: load variables from a .env file if present.
    Production should use real environment variables / secret managers instead.
    """
    # Only loads if file exists; does not override already-set environment variables by default.
    load_dotenv()


def get_env(name: str) -> str | None:
    return os.getenv(name)

