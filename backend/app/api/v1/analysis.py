from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel
import httpx
import re

router = APIRouter()


class TechDetectionRequest(BaseModel):
    repoFullName: str
    branch: str


async def _get_github_file_content(
    repo_full_name: str, branch: str, file_path: str, gh_token: str
) -> str | None:
    """Fetch file content from GitHub API."""
    url = f"https://api.github.com/repos/{repo_full_name}/contents/{file_path}"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params={"ref": branch},
        )
        if res.status_code == 200:
            data = res.json()
            if data.get("type") == "file" and "content" in data:
                import base64

                return base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
    return None


async def _list_repo_files(
    repo_full_name: str, branch: str, path: str, gh_token: str
) -> list[str]:
    """List files in a repository directory."""
    url = f"https://api.github.com/repos/{repo_full_name}/contents/{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params={"ref": branch},
        )
        if res.status_code == 200:
            items = res.json()
            return [item["name"] for item in items if isinstance(item, dict) and "name" in item]
    return []


@router.post("/tech-detection")
async def tech_detection(
    payload: TechDetectionRequest, gh_token: str | None = Cookie(default=None)
):
    """
    Real repository scanning and technology detection using GitHub API.
    Detects language, framework, build tools, and infrastructure files.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    repo_full_name = payload.repoFullName
    branch = payload.branch

    # Initialize detection results
    detected = {
        "language": None,
        "framework": None,
        "buildTool": None,
        "hasDockerfile": False,
        "hasHelm": False,
        "hasTerraform": False,
    }

    # Check root directory files
    root_files = await _list_repo_files(repo_full_name, branch, "", gh_token)

    # Recursively scan for key files in subdirectories (up to 2 levels deep)
    async def recursive_file_search(paths, depth=2):
        found_files = set(paths)
        if depth == 0:
            return found_files
        for path in list(paths):
            sub_files = await _list_repo_files(repo_full_name, branch, path, gh_token)
            for f in sub_files:
                full_path = f"{path}/{f}" if path else f
                found_files.add(full_path)
                # Only recurse into directories (skip files with extensions)
                if "." not in f:
                    found_files |= await recursive_file_search([full_path], depth-1)
        return found_files

    all_files = await recursive_file_search([""], depth=2)
    all_files_lower = [f.lower() for f in all_files]

    # Detect language and build tools from files anywhere in the repo
    if any(f.endswith("package.json") for f in all_files_lower):
        detected["language"] = "javascript"
        detected["buildTool"] = "npm"
        # Try to detect framework from package.json content
        for f in all_files:
            if f.endswith("package.json"):
                pkg_json = await _get_github_file_content(repo_full_name, branch, f, gh_token)
                if pkg_json:
                    if '"react"' in pkg_json or '"react-dom"' in pkg_json:
                        detected["framework"] = "react"
                    elif '"next"' in pkg_json:
                        detected["framework"] = "nextjs"
                    elif '"vue"' in pkg_json:
                        detected["framework"] = "vue"
                    elif '"angular"' in pkg_json:
                        detected["framework"] = "angular"
                    elif '"express"' in pkg_json:
                        detected["framework"] = "express"
    elif any(f.endswith("requirements.txt") or f.endswith("pyproject.toml") for f in all_files_lower):
        detected["language"] = "python"
        if any(f.endswith("pyproject.toml") for f in all_files_lower):
            detected["buildTool"] = "poetry"
            for f in all_files:
                if f.endswith("pyproject.toml"):
                    pyproject = await _get_github_file_content(repo_full_name, branch, f, gh_token)
                    if pyproject:
                        if "fastapi" in pyproject.lower():
                            detected["framework"] = "fastapi"
                        elif "flask" in pyproject.lower():
                            detected["framework"] = "flask"
                        elif "django" in pyproject.lower():
                            detected["framework"] = "django"
        else:
            detected["buildTool"] = "pip"
    elif any(f.endswith("pom.xml") for f in all_files_lower):
        detected["language"] = "java"
        detected["buildTool"] = "maven"
        for f in all_files:
            if f.endswith("pom.xml"):
                pom_xml = await _get_github_file_content(repo_full_name, branch, f, gh_token)
                if pom_xml and "spring-boot" in pom_xml.lower():
                    detected["framework"] = "spring-boot"
    elif any(f.endswith("build.gradle") or f.endswith("build.gradle.kts") for f in all_files_lower):
        detected["language"] = "java"
        detected["buildTool"] = "gradle"
    elif any(f.endswith("go.mod") for f in all_files_lower):
        detected["language"] = "go"
        detected["buildTool"] = "go"
    elif any(f.endswith("cargo.toml") for f in all_files_lower):
        detected["language"] = "rust"
        detected["buildTool"] = "cargo"
    elif any(f.endswith("gemfile") for f in all_files_lower):
        detected["language"] = "ruby"
        detected["buildTool"] = "bundler"
    elif any(f.endswith(".csproj") for f in all_files_lower):
        detected["language"] = "csharp"
        detected["buildTool"] = "dotnet"

    # Check for Dockerfile
    if any(f.endswith("dockerfile") for f in all_files_lower):
        detected["hasDockerfile"] = True

    # Check for Helm charts
    if any("charts" in f or "helm" in f for f in all_files_lower) or any(f.endswith("chart.yaml") for f in all_files_lower):
        detected["hasHelm"] = True

    # Check for Terraform files
    if any(f.endswith(".tf") or f.endswith(".tfvars") for f in all_files_lower):
        detected["hasTerraform"] = True

    # Default to Python if nothing detected
    if not detected["language"]:
        detected["language"] = "python"
        detected["buildTool"] = "pip"

    return detected