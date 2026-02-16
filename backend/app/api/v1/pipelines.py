from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel
import httpx
import base64
import yaml

from app.services.pipeline_monitor import (
    get_failed_workflow_runs,
    get_workflow_run_logs,
    get_workflow_run_jobs,
    extract_error_from_logs,
)
from app.services.ai_analyzer import analyze_pipeline_error

router = APIRouter()


class PipelinePreviewRequest(BaseModel):
    tech: dict
    enableSast: bool = True
    enableDast: bool = True


class PipelineCreateRequest(BaseModel):
    tech: dict
    enableSast: bool = True
    enableDast: bool = True


def _generate_pipeline_yaml(
    repo_full_name: str, branch: str, tech: dict, enable_sast: bool, enable_dast: bool
) -> str:
    """Generate GitHub Actions YAML based on detected technology."""
    language = tech.get("language", "python")
    build_tool = tech.get("buildTool", "pip")
    framework = tech.get("framework", "")

    # Build steps based on language
    build_steps = []
    if language == "python":
        if build_tool == "poetry":
            build_steps = [
                "- uses: actions/checkout@v4",
                "- uses: actions/setup-python@v5",
                "  with:",
                "    python-version: '3.11'",
                "- name: Install Poetry",
                "  uses: snok/install-poetry@v1",
                "- name: Install dependencies",
                "  run: poetry install --no-interaction --no-ansi",
                "- name: Run tests",
                "  run: poetry run pytest",
            ]
        else:
            build_steps = [
                "- uses: actions/checkout@v4",
                "- uses: actions/setup-python@v5",
                "  with:",
                "    python-version: '3.11'",
                "- name: Install dependencies",
                "  run: pip install -r requirements.txt",
                "- name: Run tests",
                "  run: pytest",
            ]
    elif language == "javascript":
        build_steps = [
            "- uses: actions/checkout@v4",
            "- uses: actions/setup-node@v4",
            "  with:",
            "    node-version: '20'",
            "- name: Install dependencies",
            "  run: npm ci",
            "- name: Run tests",
            "  run: npm test",
        ]
    elif language == "java":
        if build_tool == "maven":
            build_steps = [
                "- uses: actions/checkout@v4",
                "- uses: actions/setup-java@v4",
                "  with:",
                "    distribution: 'temurin'",
                "    java-version: '17'",
                "- name: Build with Maven",
                "  run: mvn clean test",
            ]
        else:  # gradle
            build_steps = [
                "- uses: actions/checkout@v4",
                "- uses: actions/setup-java@v4",
                "  with:",
                "    distribution: 'temurin'",
                "    java-version: '17'",
                "- name: Build with Gradle",
                "  run: ./gradlew test",
            ]
    else:
        # Generic fallback
        build_steps = [
            "- uses: actions/checkout@v4",
            "- name: Build and test",
            "  run: echo 'Add build steps for your language'",
        ]

    yaml_content = f"""name: CI/CD Pipeline

on:
  push:
    branches: [{branch}]
  pull_request:
    branches: [{branch}]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
"""
    for step in build_steps:
        yaml_content += f"      {step}\n"

    if enable_sast:
        yaml_content += """
  sast-sonarqube:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@v2
        env:
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_PROJECT_KEY: {repo_full_name.replace('/', '_')}
"""

    if tech.get("hasDockerfile"):
        yaml_content += """
  build-and-push:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t ${{ secrets.REGISTRY_URL }}/${{ github.repository }}:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login ${{ secrets.REGISTRY_URL }} -u ${{ secrets.REGISTRY_USERNAME }} --password-stdin
          docker push ${{ secrets.REGISTRY_URL }}/${{ github.repository }}:${{ github.sha }}
"""

    if enable_dast:
        yaml_content += """
  dast-zap:
    needs: build-and-push
    if: success()
    runs-on: ubuntu-latest
    steps:
      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: ${{ secrets.APP_BASE_URL }}
          token: ${{ secrets.GITHUB_TOKEN }}
"""

    return yaml_content


@router.post("/preview")
async def preview_pipeline(payload: PipelinePreviewRequest, gh_token: str | None = Cookie(default=None)):
    """
    Generate a GitHub Actions YAML preview based on tech and feature flags.
    The repo and branch are determined from the user's selected repo (default branch).
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Get user's selected repo (first in list for now)
    async with httpx.AsyncClient(timeout=20) as client:
        repos_res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if repos_res.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch repositories from GitHub")
        repos = repos_res.json()
        if not repos:
            raise HTTPException(status_code=404, detail="No repositories found for user")
        repo = repos[0]  # Select the first repo (or implement selection logic as needed)
        repo_full_name = repo["full_name"]
        branch = repo["default_branch"]

    yaml_content = _generate_pipeline_yaml(
        repo_full_name,
        branch,
        payload.tech,
        payload.enableSast,
        payload.enableDast,
    )
    return {"yaml": yaml_content}


@router.post("/create")
async def create_pipeline(
    payload: PipelineCreateRequest, gh_token: str | None = Cookie(default=None)
):
    """
    Generate and commit the GitHub Actions workflow file to the selected repository's default branch.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Get user's selected repo (first in list for now)
    async with httpx.AsyncClient(timeout=20) as client:
        repos_res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if repos_res.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch repositories from GitHub")
        repos = repos_res.json()
        if not repos:
            raise HTTPException(status_code=404, detail="No repositories found for user")
        repo = repos[0]  # Select the first repo (or implement selection logic as needed)
        repo_full_name = repo["full_name"]
        branch = repo["default_branch"]

    # Check if .github/workflows exists in the repo (list contents of .github/workflows)
    async with httpx.AsyncClient(timeout=20) as client:
        dir_url = f"https://api.github.com/repos/{repo_full_name}/contents/.github/workflows?ref={branch}"
        dir_res = await client.get(
            dir_url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if dir_res.status_code == 404:
            # Directory does not exist, create a .gitkeep file to force directory creation
            create_gitkeep_url = f"https://api.github.com/repos/{repo_full_name}/contents/.github/workflows/.gitkeep"
            encoded_gitkeep = base64.b64encode(b"").decode("utf-8")
            put_gitkeep = await client.put(
                create_gitkeep_url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {gh_token}",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                json={
                    "message": "chore: create .github/workflows directory",
                    "content": encoded_gitkeep,
                    "branch": branch
                },
            )
            if put_gitkeep.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=502, detail=f"Failed to create .github/workflows directory: {put_gitkeep.text}"
                )

    # Generate YAML
    yaml_content = _generate_pipeline_yaml(
        repo_full_name, branch, payload.tech, payload.enableSast, payload.enableDast
    )

    # Use GitHub's contents API for workflow file creation (simpler and more reliable)
    contents_url = f"https://api.github.com/repos/{repo_full_name}/contents/.github/workflows/ci.yml"
    encoded_content = base64.b64encode(yaml_content.encode("utf-8")).decode("utf-8")
    async with httpx.AsyncClient(timeout=20) as client:
        put_res = await client.put(
            contents_url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={
                "message": "chore: add CI/CD pipeline via DevOps Agent",
                "content": encoded_content,
                "branch": branch
            },
        )
        if put_res.status_code not in [200, 201]:
            raise HTTPException(
                status_code=502, detail=f"Failed to create or update workflow file: {put_res.text}"
            )
        result = put_res.json()
    return {
        "status": "created",
        "repo": repo_full_name,
        "branch": branch,
        "workflow_path": ".github/workflows/ci.yml",
        "commit_sha": result.get("commit", {}).get("sha", "")
    }


@router.get("/failed")
async def get_failed_pipelines(
    days: int = 7, gh_token: str | None = Cookie(default=None)
):
    """
    Get all failed pipeline runs across all repositories the user has access to.
    Includes AI analysis for each failure.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Get user's repositories
    async with httpx.AsyncClient(timeout=20) as client:
        repos_res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

        if repos_res.status_code != 200:
            raise HTTPException(
                status_code=502, detail="Failed to fetch repositories from GitHub"
            )

        repos = repos_res.json()

    # Collect failed runs from all repos
    all_failed_runs = []

    for repo in repos:
        repo_full_name = repo["full_name"]
        failed_runs = await get_failed_workflow_runs(repo_full_name, gh_token, days=days)

        for run in failed_runs:
            # Get jobs to identify which job failed
            jobs = await get_workflow_run_jobs(repo_full_name, run["id"], gh_token)
            failed_job = next((j for j in jobs if j.get("conclusion") == "failure"), None)

            # Get error logs
            logs = await get_workflow_run_logs(repo_full_name, run["id"], gh_token)
            error_excerpt = extract_error_from_logs(logs)

            # Try to get tech stack - in production, store this when pipeline is created
            # For now, we'll use a basic detection or defaults
            # TODO: Store tech stack in database when pipeline is created
            tech_stack = {
                "language": "unknown",
                "framework": None,
                "buildTool": None,
                "hasDockerfile": False,
                "hasHelm": False,
                "hasTerraform": False,
            }
            
            # Try to detect tech stack from repo (quick check)
            # In production, you'd query a database where tech stack is stored
            try:
                from app.api.v1.analysis import tech_detection
                from app.api.v1.analysis import TechDetectionRequest
                
                detection_req = TechDetectionRequest(
                    repoFullName=repo_full_name,
                    branch=run.get("head_branch", "main"),
                )
                detected_tech = await tech_detection(detection_req, gh_token)
                tech_stack = detected_tech
            except Exception:
                # If detection fails, use defaults
                pass

            # Get AI analysis (synchronous call, but we're in async context)
            import asyncio
            ai_analysis = await asyncio.to_thread(analyze_pipeline_error, error_excerpt, tech_stack)

            all_failed_runs.append(
                {
                    "id": run["id"],
                    "repo": repo_full_name,
                    "workflow_name": run.get("name", "Unknown"),
                    "branch": run.get("head_branch", "unknown"),
                    "commit_sha": run.get("head_sha", "")[:7],
                    "failed_at": run.get("updated_at", run.get("created_at")),
                    "failed_job": failed_job.get("name") if failed_job else "Unknown",
                    "error_excerpt": error_excerpt[:500],  # First 500 chars
                    "ai_reason": ai_analysis.get("reason", ""),
                    "ai_resolution": ai_analysis.get("resolution", ""),
                    "run_url": run.get("html_url", ""),
                }
            )

    # Sort by most recent first
    all_failed_runs.sort(key=lambda x: x["failed_at"], reverse=True)

    return {"failed_runs": all_failed_runs, "total": len(all_failed_runs)}


@router.get("/{repo_full_name}/runs/{run_id}/analyze")
async def analyze_pipeline_run(
    repo_full_name: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None),
):
    """
    Get detailed AI analysis for a specific failed pipeline run.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Get run details
    async with httpx.AsyncClient(timeout=20) as client:
        run_res = await client.get(
            f"https://api.github.com/repos/{repo_full_name}/actions/runs/{run_id}",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

        if run_res.status_code != 200:
            raise HTTPException(status_code=404, detail="Pipeline run not found")

        run = run_res.json()

        if run.get("conclusion") != "failure":
            raise HTTPException(
                status_code=400, detail="This pipeline run did not fail"
            )

    # Get logs and extract error
    logs = await get_workflow_run_logs(repo_full_name, run_id, gh_token)
    error_excerpt = extract_error_from_logs(logs)

    # Get tech stack (try to get from analysis endpoint or use defaults)
    # In production, you'd store tech stack when pipeline is created
    tech_stack = {
        "language": "unknown",
        "framework": None,
        "buildTool": None,
        "hasDockerfile": False,
        "hasHelm": False,
        "hasTerraform": False,
    }

    # Get AI analysis (synchronous call, but we're in async context)
    import asyncio
    ai_analysis = await asyncio.to_thread(analyze_pipeline_error, error_excerpt, tech_stack)

    return {
        "run_id": run_id,
        "repo": repo_full_name,
        "workflow_name": run.get("name", "Unknown"),
        "branch": run.get("head_branch", "unknown"),
        "commit_sha": run.get("head_sha", ""),
        "failed_at": run.get("updated_at", run.get("created_at")),
        "error_logs": error_excerpt,
        "ai_analysis": ai_analysis,
        "run_url": run.get("html_url", ""),
    }

