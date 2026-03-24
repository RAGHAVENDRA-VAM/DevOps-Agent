from __future__ import annotations

<<<<<<< HEAD
import logging
import os
import secrets

import httpx
from fastapi import APIRouter, HTTPException, Request
from starlette.responses import RedirectResponse, Response

router = APIRouter()
logger = logging.getLogger(__name__)

_GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GITHUB_SCOPES = "repo workflow read:user"

# Read once at startup — never hardcoded
_COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "").lower() == "true"
_FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _get_oauth_config() -> tuple[str, str, str]:
    """Return (client_id, client_secret, callback_url) or raise 503."""
    client_id = os.getenv("GITHUB_CLIENT_ID", "")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET", "")
    callback_url = os.getenv("GITHUB_OAUTH_CALLBACK_URL", "")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="GitHub OAuth is not configured.")
    return client_id, client_secret, callback_url


@router.get("/github")
async def github_oauth_start(request: Request) -> RedirectResponse:  # noqa: ARG001
    """
    Initiate GitHub OAuth flow.
    Generates a random state token stored in a short-lived HttpOnly cookie to prevent CSRF.
    """
    client_id, _, callback_url = _get_oauth_config()
    state = secrets.token_urlsafe(32)

    params = (
        f"client_id={client_id}"
        f"&redirect_uri={callback_url}"
        f"&scope={_GITHUB_SCOPES.replace(' ', '%20')}"
        f"&state={state}"
    )
    redirect = RedirectResponse(f"{_GITHUB_AUTHORIZE_URL}?{params}")
    redirect.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
        max_age=300,
    )
    return redirect


@router.get("/github/callback")
async def github_oauth_callback(code: str, state: str, request: Request) -> RedirectResponse:
    """
    GitHub OAuth callback.
    Validates CSRF state, exchanges code for access token, stores in HttpOnly cookie.
    """
    client_id, client_secret, _ = _get_oauth_config()

    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state — possible CSRF attack.")

    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            _GITHUB_TOKEN_URL,
=======
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
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
        )

    if token_res.status_code >= 400:
<<<<<<< HEAD
        raise HTTPException(status_code=502, detail="Failed to exchange GitHub OAuth code.")
=======
        raise HTTPException(status_code=502, detail="Failed to exchange GitHub OAuth code")
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

    payload = token_res.json()
    access_token = payload.get("access_token")
    if not access_token:
<<<<<<< HEAD
        raise HTTPException(status_code=502, detail="GitHub OAuth token missing in response.")

    # After successful OAuth set cookie and redirect user to the Approvals page
    response = RedirectResponse(url=f"{_FRONTEND_URL}/approvals", status_code=302)
=======
        raise HTTPException(status_code=502, detail="GitHub OAuth token missing in response")

    response = RedirectResponse(url="http://localhost:5173/repos", status_code=302)
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    response.set_cookie(
        key="gh_token",
        value=access_token,
        httponly=True,
<<<<<<< HEAD
        secure=_COOKIE_SECURE,
        samesite="lax",
        max_age=3600,
    )
    response.delete_cookie("oauth_state")
=======
        secure=False,  # set True behind HTTPS
        samesite="lax",
        max_age=60 * 60,
    )
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    return response


@router.get("/me")
<<<<<<< HEAD
async def get_current_user() -> dict[str, str]:
    """Return the current authenticated user identity (stub)."""
=======
async def get_current_user():
    """
    Placeholder for returning the current authenticated user.
    In production, this would validate a session/JWT and fetch user info from GitHub or DB.
    """
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    return {"username": "demo-user", "provider": "github"}


@router.get("/favicon.ico", include_in_schema=False)
<<<<<<< HEAD
async def favicon() -> Response:
    """Suppress noisy 404s from browser favicon requests during OAuth redirects."""
    return Response(status_code=204)
=======
async def favicon():
    # Avoid noisy 404s when the browser requests /favicon.ico from the backend during OAuth redirects.
    return Response(status_code=204)

>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
