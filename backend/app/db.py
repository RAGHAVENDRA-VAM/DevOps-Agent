from __future__ import annotations

import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./devops_agent.db")

engine = create_async_engine(
    _DATABASE_URL,
    echo=False,
    # For SQLite only — ignored by Postgres
    connect_args={"check_same_thread": False} if "sqlite" in _DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all tables on startup (idempotent)."""
    async with engine.begin() as conn:
        from app import models as _  # noqa: F401 — ensure models are imported before create_all
        await conn.run_sync(Base.metadata.create_all)
        # Ensure new columns added to existing SQLite DB (SQLite doesn't alter tables with create_all)
        from sqlalchemy import text

        def _ensure_columns(sync_conn):
            # Ensure all expected columns exist on the approvals table.
            res = sync_conn.execute(text("PRAGMA table_info('approvals')")).fetchall()
            existing = [r[1] for r in res]

            expected: dict[str, tuple[str, str]] = {
                # column: (sql_type, default_literal)
                'changed_files': ('TEXT', "'[]'"),
                'config': ('TEXT', "'{}'"),
                'detected_tech': ('TEXT', "'{}'"),
                'pipeline_stage': ('INTEGER', '0'),
                'stage_logs': ('TEXT', "'{}'"),
                'status': ('TEXT', "'pending'"),
                'logs': ('TEXT', "'[]'"),
                'terraform_url': ('TEXT', 'NULL'),
                'deployed_url': ('TEXT', 'NULL'),
                'actions_run_url': ('TEXT', 'NULL'),
                'created_at': ('REAL', '0'),
            }

            for col, (col_type, default_val) in expected.items():
                if col in existing:
                    continue
                try:
                    # Try to add column with a sensible default
                    if default_val == 'NULL':
                        sync_conn.execute(text(f"ALTER TABLE approvals ADD COLUMN {col} {col_type}"))
                    else:
                        sync_conn.execute(text(f"ALTER TABLE approvals ADD COLUMN {col} {col_type} DEFAULT {default_val}"))
                except Exception:
                    # Last resort: try adding as plain TEXT without default
                    try:
                        sync_conn.execute(text(f"ALTER TABLE approvals ADD COLUMN {col} TEXT"))
                    except Exception:
                        # If this fails, continue — we'll surface errors later when accessing the column
                        pass

        await conn.run_sync(_ensure_columns)
