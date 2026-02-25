from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException
from starlette.responses import RedirectResponse, Response

router = APIRouter()


@router.get("/github")
async def github_oauth_start():
    """
    Initiate GitHub OAuth flow.
    Production should generate and validate a `state` parameter to prevent CSRF.
    """
    client_id = os.getenv("GITHUB_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")

    redirect_uri = os.getenv("GITHUB_OAUTH_CALLBACK_URL", "")
    params = f"client_id={client_id}&redirect_uri={redirect_uri}&scope=repo%20workflow%20read:user"
    url = f"https://github.com/login/oauth/authorize?{params}"
    return RedirectResponse(url)


@router.get("/github/callback")
async def github_oauth_callback(code: str):
    """
    GitHub OAuth callback handler.

    Exchanges `code` for an access token and stores it in an HttpOnly cookie (local-dev).

    Production guidance:
    - Store tokens server-side (DB/session) or encrypted at rest.
    - Validate `state` parameter to prevent CSRF.
    - Consider GitHub App auth for org-grade access.
    """
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="GitHub OAuth not configured")

    token_url = "https://github.com/login/oauth/access_token"
    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            token_url,
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
        )

    if token_res.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to exchange GitHub OAuth code")

    payload = token_res.json()
    access_token = payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="GitHub OAuth token missing in response")

    response = RedirectResponse(url="http://localhost:5173/repos", status_code=302)
    response.set_cookie(
        key="gh_token",
        value=access_token,
        httponly=True,
        secure=False,  # set True behind HTTPS
        samesite="lax",
        max_age=60 * 60,
    )
    return response


@router.get("/me")
async def get_current_user():
    """
    Placeholder for returning the current authenticated user.
    In production, this would validate a session/JWT and fetch user info from GitHub or DB.
    """
    return {"username": "demo-user", "provider": "github"}


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # Avoid noisy 404s when the browser requests /favicon.ico from the backend during OAuth redirects.
    return Response(status_code=204)

