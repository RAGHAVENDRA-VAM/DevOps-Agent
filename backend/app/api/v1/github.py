from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException
import httpx

router = APIRouter()


@router.get("/repositories")
async def list_repositories(gh_token: str | None = Cookie(default=None)):
    """
    List GitHub repositories for the authenticated user.
    This is a stub that should call the GitHub REST API using an OAuth access token.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to fetch repositories from GitHub")

    # Return only fields the UI currently expects.
    repos = res.json()
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "default_branch": r.get("default_branch", "main"),
        }
        for r in repos
    ]

