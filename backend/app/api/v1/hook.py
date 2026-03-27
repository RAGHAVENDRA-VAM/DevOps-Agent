import re
import requests
from fastapi import APIRouter
from json import loads

router = APIRouter()


def check_config(commits):
    pattern = re.compile(r'.*config.*\.py$')

    for commit in commits:
        for file in commit.get("modified", []):
            if pattern.match(file):
                return file  # return matching file path
    return None
import re
import os
import httpx
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()

_CONFIG_PATTERN = re.compile(r'.*config.*\.py$')

def _find_config_file(commits: list) -> str | None:
    for commit in commits:
        for file in commit.get("modified", []) + commit.get("added", []):
            if _CONFIG_PATTERN.search(file):
                return file
    return None


@router.post("/run_flow2")
async def run_flow2(data: dict):
    commits = data.get("commits", [])
    repo_name = data.get("repository", {}).get("full_name", "")
    ref = data.get("ref", "").replace("refs/heads/", "")
    head_commit = data.get("head_commit", {})

    config_file = _find_config_file(commits)
    if not config_file:
        return {"message": "No config file found"}

    raw_url = f"https://raw.githubusercontent.com/{repo_name}/{ref}/{config_file}"

    token = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN", "")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(raw_url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Failed to fetch config file: {response.status_code}")

    return {
        "message": "Config file found",
        "repo": repo_name,
        "branch": ref,
        "commit_id": head_commit.get("id", ""),
        "commit_message": head_commit.get("message", ""),
        "committed_at": head_commit.get("timestamp", ""),
        "file_path": config_file,
        "file_content": response.text,
    }


@router.post("/run_flow")
def run_flow(data: dict):  # FastAPI already parses JSON
    commits = data.get("commits", [])

    repo_name = data.get("repository", {}).get("full_name", "")
    ref = data.get("ref", "").replace("refs/heads/", "")

    checker = check_config(commits)

    # Safely get commit info
    head_commit = data.get("head_commit", {})
    commit_id = head_commit.get("id", "")
    commit_message = head_commit.get("message", "")
    commit_timestamp = head_commit.get("timestamp", "")

    if not checker:
        return {"message": "No config file found"}

    # Build correct raw GitHub URL
    raw_git = f"https://raw.githubusercontent.com/{repo_name}/{ref}/{checker}"


    response = requests.get(raw_git)
    print(response)

    # if response.status_code != 200:
    #     return {"error": "Failed to fetch file"}

    file_content = response.text

    return {
        "message": "Config file found",
        "file_path": checker,
        "file_content": file_content
    }