from __future__ import annotations

<<<<<<< HEAD
import base64
import logging

import httpx
from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

_GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
=======
from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel
import httpx
import re

router = APIRouter()
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374


class TechDetectionRequest(BaseModel):
    repoFullName: str
    branch: str


<<<<<<< HEAD
def _auth_headers(gh_token: str) -> dict[str, str]:
    return {**_GITHUB_HEADERS, "Authorization": f"Bearer {gh_token}"}


async def _get_file_content(
    repo: str, branch: str, path: str, gh_token: str
) -> str | None:
    """Fetch and decode a single file from the GitHub Contents API."""
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(url, headers=_auth_headers(gh_token), params={"ref": branch})
    if res.status_code != 200:
        return None
    data = res.json()
    if data.get("type") == "file" and "content" in data:
        return base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
    return None


async def _list_dir(
    repo: str, branch: str, path: str, gh_token: str
) -> list[dict]:
    """List items in a repository directory."""
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(url, headers=_auth_headers(gh_token), params={"ref": branch})
    if res.status_code != 200:
        return []
    items = res.json()
    return items if isinstance(items, list) else []


async def _collect_all_files(
    repo: str, branch: str, gh_token: str, max_depth: int = 2
) -> set[str]:
    """
    Recursively collect all file paths up to max_depth levels deep.
    Returns a set of lowercase relative paths.
    """
    collected: set[str] = set()

    async def _recurse(path: str, depth: int) -> None:
        if depth < 0:
            return
        items = await _list_dir(repo, branch, path, gh_token)
        for item in items:
            item_path: str = item.get("path", "")
            item_type: str = item.get("type", "")
            if item_type == "file":
                collected.add(item_path.lower())
            elif item_type == "dir":
                await _recurse(item_path, depth - 1)

    await _recurse("", max_depth)
    return collected


def _detect_framework_from_package_json(content: str) -> str | None:
    """Detect JS framework from package.json content."""
    checks = [
        ('"next"', "nextjs"),
        ('"react"', "react"),
        ('"react-dom"', "react"),
        ('"vue"', "vue"),
        ('"@angular/core"', "angular"),
        ('"express"', "express"),
    ]
    for marker, framework in checks:
        if marker in content:
            return framework
    return None


def _detect_framework_from_pyproject(content: str) -> str | None:
    """Detect Python framework from pyproject.toml content."""
    lower = content.lower()
    if "fastapi" in lower:
        return "fastapi"
    if "flask" in lower:
        return "flask"
    if "django" in lower:
        return "django"
    return None
=======
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
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374


@router.post("/tech-detection")
async def tech_detection(
<<<<<<< HEAD
    payload: TechDetectionRequest,
    gh_token: str | None = Cookie(default=None),
) -> dict:
    """
    Scan a GitHub repository and detect its technology stack.
    Returns language, framework, build tool, and infrastructure file presence.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    repo = payload.repoFullName
    branch = payload.branch

    result: dict[str, str | bool | None] = {
=======
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
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        "language": None,
        "framework": None,
        "buildTool": None,
        "hasDockerfile": False,
        "hasHelm": False,
        "hasTerraform": False,
    }

<<<<<<< HEAD
    all_files = await _collect_all_files(repo, branch, gh_token, max_depth=2)

    # --- Language & build tool detection (priority order) ---
    if any(f.endswith("package.json") and "node_modules" not in f for f in all_files):
        result["language"] = "javascript"
        result["buildTool"] = "npm"
        for f in all_files:
            if f.endswith("package.json") and "node_modules" not in f:
                content = await _get_file_content(repo, branch, f, gh_token)
                if content:
                    result["framework"] = _detect_framework_from_package_json(content)
                break

    elif any(f.endswith("pyproject.toml") for f in all_files):
        result["language"] = "python"
        result["buildTool"] = "poetry"
        for f in all_files:
            if f.endswith("pyproject.toml"):
                content = await _get_file_content(repo, branch, f, gh_token)
                if content:
                    result["framework"] = _detect_framework_from_pyproject(content)
                break

    elif any(f.endswith("requirements.txt") for f in all_files):
        result["language"] = "python"
        result["buildTool"] = "pip"

    elif any(f.endswith("pom.xml") for f in all_files):
        result["language"] = "java"
        result["buildTool"] = "maven"
        for f in all_files:
            if f.endswith("pom.xml"):
                content = await _get_file_content(repo, branch, f, gh_token)
                if content and "spring-boot" in content.lower():
                    result["framework"] = "spring-boot"
                break

    elif any(f.endswith("build.gradle") or f.endswith("build.gradle.kts") for f in all_files):
        result["language"] = "java"
        result["buildTool"] = "gradle"

    elif any(f.endswith("go.mod") for f in all_files):
        result["language"] = "go"
        result["buildTool"] = "go"

    elif any(f.endswith("cargo.toml") for f in all_files):
        result["language"] = "rust"
        result["buildTool"] = "cargo"

    elif any(f.endswith("gemfile") for f in all_files):
        result["language"] = "ruby"
        result["buildTool"] = "bundler"

    elif any(f.endswith(".csproj") for f in all_files):
        result["language"] = "csharp"
        result["buildTool"] = "dotnet"

    # Default fallback
    if not result["language"]:
        result["language"] = "python"
        result["buildTool"] = "pip"

    # --- Infrastructure file detection ---
    result["hasDockerfile"] = any(
        f.endswith("dockerfile") or f.split("/")[-1] == "dockerfile"
        for f in all_files
    )
    result["hasHelm"] = any(
        "charts/" in f or "helm/" in f or f.endswith("chart.yaml")
        for f in all_files
    )
    result["hasTerraform"] = any(
        f.endswith(".tf") or f.endswith(".tfvars")
        for f in all_files
    )

    # Sanitize repo/branch before logging to prevent log injection (CWE-117)
    safe_repo   = repo.replace('\n', '').replace('\r', '')[:100]
    safe_branch = branch.replace('\n', '').replace('\r', '')[:100]
    logger.info("Tech detection for %s@%s: %s", safe_repo, safe_branch, result)
    return result
=======
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
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
