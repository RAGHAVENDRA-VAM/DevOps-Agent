from __future__ import annotations

<<<<<<< HEAD
<<<<<<< HEAD
import logging

import httpx
from fastapi import APIRouter, Cookie, HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)

_GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def _auth_headers(gh_token: str) -> dict[str, str]:
    return {**_GITHUB_HEADERS, "Authorization": f"Bearer {gh_token}"}


@router.get("/repositories")
async def list_repositories(
    gh_token: str | None = Cookie(default=None),
) -> list[dict]:
    """List GitHub repositories for the authenticated user."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
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
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
<<<<<<< HEAD
<<<<<<< HEAD
            headers=_auth_headers(gh_token),
        )

    if res.status_code >= 400:
        logger.error("GitHub repos fetch failed: status=%s", res.status_code)
        raise HTTPException(status_code=502, detail="Failed to fetch repositories from GitHub.")

=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
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
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    return [
        {
            "id": r.get("id"),
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "default_branch": r.get("default_branch", "main"),
<<<<<<< HEAD
<<<<<<< HEAD
            "language": r.get("language"),
            "private": r.get("private", False),
        }
        for r in res.json()
    ]
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        }
        for r in repos
    ]

<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
