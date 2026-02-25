from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException
import logging
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/{owner}/{repo}/runs")
async def get_workflow_runs(
    owner: str,
    repo: str,
    branch: str = None,
    status: str = None,
    gh_token: str | None = Cookie(default=None)
):
    """Get all workflow runs for a repository."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")
    
    repo_full_name = f"{owner}/{repo}"
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs"
    
    params = {"per_page": 10}
    if branch:
        params["branch"] = branch
    if status:
        params["status"] = status
    
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params=params
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch workflow runs")
        
        data = response.json()
        runs = []
        
        for run in data.get("workflow_runs", []):
            runs.append({
                "id": run["id"],
                "name": run["name"],
                "status": run["status"],
                "conclusion": run.get("conclusion"),
                "branch": run["head_branch"],
                "commit_sha": run["head_sha"][:7],
                "commit_message": run.get("head_commit", {}).get("message", ""),
                "created_at": run["created_at"],
                "updated_at": run["updated_at"],
                "html_url": run["html_url"],
                "run_number": run["run_number"]
            })
        
        return {"runs": runs, "total": len(runs)}


@router.get("/{owner}/{repo}/runs/{run_id}")
async def get_workflow_run(
    owner: str,
    repo: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None)
):
    """Get details of a specific workflow run."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")
    
    repo_full_name = f"{owner}/{repo}"
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}"
    
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Workflow run not found")
        
        run = response.json()
        
        return {
            "id": run["id"],
            "name": run["name"],
            "status": run["status"],
            "conclusion": run.get("conclusion"),
            "branch": run["head_branch"],
            "commit_sha": run["head_sha"],
            "commit_message": run.get("head_commit", {}).get("message", ""),
            "created_at": run["created_at"],
            "updated_at": run["updated_at"],
            "html_url": run["html_url"],
            "run_number": run["run_number"],
            "run_started_at": run.get("run_started_at"),
            "jobs_url": run["jobs_url"]
        }


@router.get("/{owner}/{repo}/runs/{run_id}/jobs")
async def get_workflow_jobs(
    owner: str,
    repo: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None)
):
    """Get jobs for a specific workflow run."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")
    
    repo_full_name = f"{owner}/{repo}"
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}/jobs"
    
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Jobs not found")
        
        data = response.json()
        jobs = []
        
        for job in data.get("jobs", []):
            jobs.append({
                "id": job["id"],
                "name": job["name"],
                "status": job["status"],
                "conclusion": job.get("conclusion"),
                "started_at": job.get("started_at"),
                "completed_at": job.get("completed_at"),
                "html_url": job["html_url"],
                "steps": [
                    {
                        "name": step["name"],
                        "status": step["status"],
                        "conclusion": step.get("conclusion"),
                        "number": step["number"],
                        "started_at": step.get("started_at"),
                        "completed_at": step.get("completed_at")
                    }
                    for step in job.get("steps", [])
                ]
            })
        
        return {"jobs": jobs}


@router.get("/{owner}/{repo}/runs/{run_id}/logs")
async def get_workflow_logs(
    owner: str,
    repo: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None)
):
    """Get logs for a specific workflow run."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")
    
    repo_full_name = f"{owner}/{repo}"
    
    # First get jobs to get individual job logs
    jobs_url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}/jobs"
    
    async with httpx.AsyncClient(timeout=30) as client:
        jobs_response = await client.get(
            jobs_url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        
        if jobs_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Jobs not found")
        
        jobs_data = jobs_response.json()
        logs = []
        
        for job in jobs_data.get("jobs", []):
            job_id = job["id"]
            
            # Get logs for each job
            logs_url = f"https://api.github.com/repos/{repo_full_name}/actions/jobs/{job_id}/logs"
            
            try:
                logs_response = await client.get(
                    logs_url,
                    headers={
                        "Accept": "application/vnd.github+json",
                        "Authorization": f"Bearer {gh_token}",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                    follow_redirects=True
                )
                
                if logs_response.status_code == 200:
                    log_content = logs_response.text
                    logs.append({
                        "job_id": job_id,
                        "job_name": job["name"],
                        "content": log_content[:50000]  # Limit to 50KB per job
                    })
            except Exception as e:
                logger.error(f"Failed to fetch logs for job {job_id}: {e}")
                logs.append({
                    "job_id": job_id,
                    "job_name": job["name"],
                    "content": f"Failed to fetch logs: {str(e)}"
                })
        
        return {"logs": logs}


@router.get("/{owner}/{repo}/runs/{run_id}/artifacts")
async def get_workflow_artifacts(
    owner: str,
    repo: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None)
):
    """Get artifacts for a specific workflow run."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")
    
    repo_full_name = f"{owner}/{repo}"
    url = f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}/artifacts"
    
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Artifacts not found")
        
        data = response.json()
        artifacts = []
        
        for artifact in data.get("artifacts", []):
            artifacts.append({
                "id": artifact["id"],
                "name": artifact["name"],
                "size_in_bytes": artifact["size_in_bytes"],
                "created_at": artifact["created_at"],
                "expired": artifact["expired"],
                "expires_at": artifact["expires_at"],
                "archive_download_url": artifact["archive_download_url"]
            })
        
        return {"artifacts": artifacts, "total": len(artifacts)}
