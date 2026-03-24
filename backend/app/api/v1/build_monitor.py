from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, Set

from fastapi import APIRouter, Cookie, HTTPException, WebSocket, WebSocketDisconnect

from app.services.pipeline_monitor import get_workflow_run_logs, get_workflow_runs

router = APIRouter()
logger = logging.getLogger(__name__)

_RUN_STATUS_MAP: dict[str, str] = {
    "in_progress": "building",
    "queued": "queued",
}


class ConnectionManager:
    """Manages active WebSocket connections grouped by repository key."""

    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, repo_key: str) -> None:
        await websocket.accept()
        self._connections.setdefault(repo_key, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, repo_key: str) -> None:
        if repo_key in self._connections:
            self._connections[repo_key].discard(websocket)
            if not self._connections[repo_key]:
                del self._connections[repo_key]

    def has_connections(self, repo_key: str) -> bool:
        return bool(self._connections.get(repo_key))

    async def broadcast(self, repo_key: str, message: dict) -> None:
        """Send a JSON message to all connections for a repo; prune stale ones."""
        if repo_key not in self._connections:
            return
        stale: list[WebSocket] = []
        for ws in list(self._connections[repo_key]):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:  # noqa: BLE001
                stale.append(ws)
        for ws in stale:
            self._connections[repo_key].discard(ws)


manager = ConnectionManager()


def _format_run(run: dict) -> dict:
    """Extract and normalise fields from a raw GitHub workflow run dict."""
    return {
        "id": run["id"],
        "status": run["status"],
        "conclusion": run.get("conclusion"),
        "workflow_name": run.get("name", "Unknown"),
        "branch": run.get("head_branch", "unknown"),
        "commit_sha": run.get("head_sha", "")[:7],
        "created_at": run.get("created_at"),
        "updated_at": run.get("updated_at"),
        "html_url": run.get("html_url"),
    }


def _overall_status(run: dict) -> str:
    raw = run.get("status", "")
    if raw in _RUN_STATUS_MAP:
        return _RUN_STATUS_MAP[raw]
    if raw == "completed":
        conclusion = run.get("conclusion", "")
        if conclusion == "success":
            return "success"
        if conclusion == "failure":
            return "failed"
        return "completed"
    return "unknown"


@router.websocket("/ws/{repo_owner}/{repo_name}")
async def websocket_endpoint(
    websocket: WebSocket, repo_owner: str, repo_name: str
) -> None:
    """Accept and maintain a WebSocket connection for a repository."""
    repo_key = f"{repo_owner}/{repo_name}"
    await manager.connect(websocket, repo_key)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, repo_key)


@router.get("/{repo_owner}/{repo_name}/status")
async def get_build_status(
    repo_owner: str,
    repo_name: str,
    gh_token: str | None = Cookie(default=None),
) -> dict:
    """Return the current build status for a repository."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    repo_full_name = f"{repo_owner}/{repo_name}"
    runs = await get_workflow_runs(repo_full_name, gh_token, limit=10)

    if not runs:
        return {"status": "no_runs", "runs": []}

    processed = [_format_run(r) for r in runs]
    return {
        "status": _overall_status(runs[0]),
        "latest_run": processed[0],
        "runs": processed,
    }


@router.get("/{repo_owner}/{repo_name}/runs/{run_id}/logs")
async def get_run_logs(
    repo_owner: str,
    repo_name: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None),
) -> dict:
    """Return logs for a specific workflow run."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    logs = await get_workflow_run_logs(f"{repo_owner}/{repo_name}", run_id, gh_token)
    return {"logs": logs or "No logs available."}


async def _monitor_repository_builds(repo_full_name: str, gh_token: str) -> None:
    """Background task: poll GitHub every 10 s and broadcast status changes."""
    last_run_id: int | None = None

    while manager.has_connections(repo_full_name):
        try:
            runs = await get_workflow_runs(repo_full_name, gh_token, limit=1)
            if runs:
                current = runs[0]
                if current["id"] != last_run_id:
                    await manager.broadcast(
                        repo_full_name,
                        {"type": "status_update", "run": _format_run(current)},
                    )
                    last_run_id = current["id"]
            await asyncio.sleep(10)
        except Exception as exc:  # noqa: BLE001
            logger.error("Error monitoring %s: %s", repo_full_name, exc)
            await asyncio.sleep(30)


@router.post("/{repo_owner}/{repo_name}/monitor/start")
async def start_monitoring(
    repo_owner: str,
    repo_name: str,
    gh_token: str | None = Cookie(default=None),
) -> dict:
    """Start a background polling task for a repository's builds."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    repo_full_name = f"{repo_owner}/{repo_name}"
    asyncio.create_task(_monitor_repository_builds(repo_full_name, gh_token))
    return {"status": "monitoring_started", "repo": repo_full_name}
