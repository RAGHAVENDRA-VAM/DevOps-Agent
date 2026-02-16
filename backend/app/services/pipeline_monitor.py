"""
Pipeline monitoring service to track GitHub Actions workflow runs and detect failures.
"""

from __future__ import annotations

import httpx
from datetime import datetime, timedelta
from typing import Optional
import io
import zipfile


async def get_workflow_runs(
    repo_full_name: str, gh_token: str, status: Optional[str] = None, limit: int = 100
) -> list[dict]:
    """
    Fetch GitHub Actions workflow runs for a repository.
    
    Args:
        repo_full_name: Repository in format "owner/repo"
        gh_token: GitHub OAuth token
        status: Filter by status (queued, in_progress, completed, etc.)
        limit: Maximum number of runs to fetch
    
    Returns:
        List of workflow run objects
    """
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs"
    params = {"per_page": min(limit, 100)}
    if status:
        params["status"] = status

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params=params,
        )

        if res.status_code != 200:
            return []

        data = res.json()
        return data.get("workflow_runs", [])


async def get_failed_workflow_runs(
    repo_full_name: str, gh_token: str, days: int = 7, limit: int = 50
) -> list[dict]:
    """
    Get failed workflow runs for a repository within the last N days.
    
    Args:
        repo_full_name: Repository in format "owner/repo"
        gh_token: GitHub OAuth token
        days: Number of days to look back
        limit: Maximum number of runs to fetch
    
    Returns:
        List of failed workflow runs with details
    """
    # Get completed runs and filter for failures
    all_runs = await get_workflow_runs(repo_full_name, gh_token, status="completed", limit=limit)
    
    failed_runs = []
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    for run in all_runs:
        if run.get("conclusion") == "failure":
            # Check if run is within date range
            created_at = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
            if created_at.replace(tzinfo=None) >= cutoff_date:
                failed_runs.append(run)
    
    return failed_runs


async def get_workflow_run_logs(
    repo_full_name: str, run_id: int, gh_token: str
) -> Optional[str]:
    """
    Fetch logs for a specific workflow run.
    
    Args:
        repo_full_name: Repository in format "owner/repo"
        run_id: Workflow run ID
        gh_token: GitHub OAuth token
    
    Returns:
        Log content as string, or None if unavailable
    """
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}/logs"
    
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            follow_redirects=True,
        )

        if res.status_code == 200:
            # The response is a ZIP file, not plain text
            try:
                with zipfile.ZipFile(io.BytesIO(res.content)) as z:
                    log_texts = []
                    for name in z.namelist():
                        if name.endswith(".txt"):
                            with z.open(name) as f:
                                try:
                                    log_texts.append(f.read().decode("utf-8", errors="replace"))
                                except Exception:
                                    pass
                    return "\n\n".join(log_texts) if log_texts else None
            except Exception:
                return None
        return None


async def get_workflow_run_jobs(
    repo_full_name: str, run_id: int, gh_token: str
) -> list[dict]:
    """
    Get jobs for a workflow run to identify which job failed.
    
    Args:
        repo_full_name: Repository in format "owner/repo"
        run_id: Workflow run ID
        gh_token: GitHub OAuth token
    
    Returns:
        List of job objects
    """
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}/jobs"
    
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

        if res.status_code == 200:
            data = res.json()
            return data.get("jobs", [])
        return []


def extract_error_from_logs(logs: str, max_length: int = 2000) -> str:
    """
    Extract error messages from workflow logs.
    Focuses on the last portion of logs which typically contains the error.
    
    Args:
        logs: Full log content
        max_length: Maximum length of error excerpt to return
    
    Returns:
        Error excerpt from logs
    """
    if not logs:
        return "No logs available"
    
    # Get the last portion of logs (where errors usually appear)
    lines = logs.split("\n")
    
    # Look for error indicators
    error_lines = []
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if any(
            indicator in line_lower
            for indicator in ["error", "failed", "failure", "exception", "traceback"]
        ):
            # Include context (5 lines before and after)
            start = max(0, i - 5)
            end = min(len(lines), i + 10)
            error_lines.extend(lines[start:end])
    
    if error_lines:
        error_text = "\n".join(error_lines[-50:])  # Last 50 relevant lines
    else:
        # Fallback: last portion of logs
        error_text = "\n".join(lines[-100:])
    
    # Truncate if too long
    if len(error_text) > max_length:
        error_text = error_text[-max_length:]
    
    return error_text
