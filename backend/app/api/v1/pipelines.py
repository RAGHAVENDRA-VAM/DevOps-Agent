from __future__ import annotations

<<<<<<< HEAD
<<<<<<< HEAD
import asyncio
import base64
import json
import logging
import os

import httpx
import yaml
from fastapi import APIRouter, Cookie, HTTPException
from nacl import encoding
from nacl import public as nacl_public
from pydantic import BaseModel

from app.services.ai_analyzer import analyze_pipeline_error
from app.services.pipeline_monitor import (
    extract_error_from_logs,
    get_failed_workflow_runs,
    get_workflow_run_jobs,
    get_workflow_run_logs,
)
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
import os
import json
from fastapi import APIRouter, Cookie, HTTPException
import logging
from pydantic import BaseModel
import httpx
import base64
import yaml
from nacl import encoding, public as nacl_public

from app.services.pipeline_monitor import (
    get_failed_workflow_runs,
    get_workflow_run_logs,
    get_workflow_run_jobs,
    extract_error_from_logs,
)
from app.services.ai_analyzer import analyze_pipeline_error
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

router = APIRouter()
logger = logging.getLogger(__name__)

<<<<<<< HEAD
<<<<<<< HEAD
_GITHUB_API = "https://api.github.com"
_GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

class PipelinePreviewRequest(BaseModel):
    repoFullName: str
    branch: str
    tech: dict
    enableSast: bool = True
    enableDast: bool = True


class PipelineCreateRequest(BaseModel):
    repoFullName: str
    branch: str
    tech: dict
    enableSast: bool = True
    enableDast: bool = True
<<<<<<< HEAD
<<<<<<< HEAD
    deploy: dict | None = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _auth_headers(gh_token: str) -> dict[str, str]:
    return {**_GITHUB_HEADERS, "Authorization": f"Bearer {gh_token}"}


async def _find_build_file(
    repo_full_name: str,
    branch: str,
    gh_token: str,
    filename: str,
    max_depth: int = 3,
) -> str | None:
    """
    Recursively search for a build file by name in the repository tree.
    Returns the relative path of the first match, or None.
    """
    async def _search(path: str, depth: int) -> str | None:
        if depth < 0:
            return None
        url = f"{_GITHUB_API}/repos/{repo_full_name}/contents/{path}"
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                url,
                headers=_auth_headers(gh_token),
                params={"ref": branch},
            )
        if res.status_code != 200:
            return None
        for item in res.json():
            # Never descend into node_modules, vendor, or hidden dirs
            name = item.get("name", "")
            if name in ("node_modules", "vendor", ".git", ".github", "__pycache__", ".venv", "venv"):
                continue
            if item.get("name", "").lower() == filename.lower():
                return item.get("path", "")
            if item.get("type") == "dir":
                found = await _search(item.get("path", ""), depth - 1)
                if found:
                    return found
        return None

    return await _search("", max_depth)


async def _set_github_secret(
    repo_full_name: str,
    secret_name: str,
    secret_value: str,
    gh_token: str,
) -> None:
    """Encrypt and push a GitHub Actions secret to the repository using libsodium."""
    async with httpx.AsyncClient(timeout=15) as client:
        key_res = await client.get(
            f"{_GITHUB_API}/repos/{repo_full_name}/actions/secrets/public-key",
            headers=_auth_headers(gh_token),
        )
        if key_res.status_code != 200:
            logger.warning("Could not fetch repo public key for secret '%s': %s", secret_name, key_res.text)
            return

        key_data = key_res.json()
        public_key_b64: str = key_data["key"]
        key_id: str = key_data["key_id"]

        pk = nacl_public.PublicKey(public_key_b64.encode(), encoding.Base64Encoder)
        box = nacl_public.SealedBox(pk)
        encrypted_b64 = base64.b64encode(box.encrypt(secret_value.encode())).decode()

        put_res = await client.put(
            f"{_GITHUB_API}/repos/{repo_full_name}/actions/secrets/{secret_name}",
            headers=_auth_headers(gh_token),
            json={"encrypted_value": encrypted_b64, "key_id": key_id},
        )

    if put_res.status_code in (201, 204):
        logger.info("Secret '%s' set on repo %s", secret_name, repo_full_name)
    else:
        logger.warning("Failed to set secret '%s': %s", secret_name, put_res.text)


async def _generate_pipeline_yaml(
    repo_full_name: str,
    branch: str,
    tech: dict,
    enable_sast: bool,  # noqa: ARG001 — reserved for future SAST stage injection
    enable_dast: bool,  # noqa: ARG001 — reserved for future DAST stage injection
    gh_token: str,
    deploy: dict | None = None,
) -> str:
    """Build and serialise a GitHub Actions CI/CD workflow as YAML."""
    language: str = tech.get("language", "python")
    build_tool: str = tech.get("buildTool", "pip")

    working_dir = ""
    artifact_path = "build/"

    # Resolve working directory from build file location
    if language == "python":
        artifact_path = "dist/"
        lookup = "pyproject.toml" if build_tool == "poetry" else "requirements.txt"
        found = await _find_build_file(repo_full_name, branch, gh_token, lookup)
        if found and "/" in found:
            working_dir = found.rsplit("/", 1)[0]
            artifact_path = f"{working_dir}/dist/"

    elif language == "javascript":
        artifact_path = "dist/"
        found = await _find_build_file(repo_full_name, branch, gh_token, "package.json")
        if found and "/" in found:
            working_dir = found.rsplit("/", 1)[0]
            artifact_path = f"{working_dir}/dist/"

    elif language == "java":
        lookup = "pom.xml" if build_tool == "maven" else "build.gradle"
        found = await _find_build_file(repo_full_name, branch, gh_token, lookup)
        if found and "/" in found:
            working_dir = found.rsplit("/", 1)[0]
        if build_tool == "maven":
            artifact_path = f"{working_dir}/target/*.jar" if working_dir else "target/*.jar"
        else:
            artifact_path = f"{working_dir}/build/libs/*.jar" if working_dir else "build/libs/*.jar"

    # Language-specific build steps (no cd prefix — use defaults instead)
    lang_steps: list[dict] = _build_lang_steps(language, build_tool)

    build_steps: list[dict] = [
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    deploy: dict | None = None  # infra details from provisioning


async def _set_github_secret(repo_full_name: str, secret_name: str, secret_value: str, gh_token: str):
    """Encrypt and set a GitHub Actions secret on the repository."""
    async with httpx.AsyncClient(timeout=15) as client:
        # Get repo public key for encryption
        key_res = await client.get(
            f"https://api.github.com/repos/{repo_full_name}/actions/secrets/public-key",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if key_res.status_code != 200:
            logger.warning("Could not fetch repo public key: %s", key_res.text)
            return

        key_data = key_res.json()
        public_key = key_data["key"]
        key_id = key_data["key_id"]

        # Encrypt the secret using libsodium (PyNaCl)
        pk = nacl_public.PublicKey(public_key.encode(), encoding.Base64Encoder)
        box = nacl_public.SealedBox(pk)
        encrypted = box.encrypt(secret_value.encode())
        encrypted_b64 = base64.b64encode(encrypted).decode()

        # Set the secret
        put_res = await client.put(
            f"https://api.github.com/repos/{repo_full_name}/actions/secrets/{secret_name}",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"encrypted_value": encrypted_b64, "key_id": key_id},
        )
        if put_res.status_code in [201, 204]:
            logger.info("Secret '%s' set on repo %s", secret_name, repo_full_name)
        else:
            logger.warning("Failed to set secret '%s': %s", secret_name, put_res.text)



    """Search for a build file in the repository recursively."""
    async def search_dir(path: str, depth: int = 3) -> str | None:
        if depth == 0:
            return None
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
                for item in items:
                    if item.get("name", "").lower() == filename.lower():
                        return item.get("path", "")
                    if item.get("type") == "dir":
                        result = await search_dir(item.get("path", ""), depth - 1)
                        if result:
                            return result
        return None
    return await search_dir("", depth=3)


async def _generate_pipeline_yaml(
    repo_full_name: str, branch: str, tech: dict, enable_sast: bool, enable_dast: bool,
    gh_token: str, deploy: dict | None = None
) -> str:
    """Generate a combined CI+CD GitHub Actions YAML."""
    language = tech.get("language", "python")
    build_tool = tech.get("buildTool", "pip")
    working_dir = ""
    artifact_path = ""

    # Determine working directory and artifact path
    if language == "python":
        artifact_path = "dist/"
        if build_tool == "poetry":
            p = await _find_build_file(repo_full_name, branch, gh_token, "pyproject.toml")
        else:
            p = await _find_build_file(repo_full_name, branch, gh_token, "requirements.txt")
        if p and "/" in p:
            working_dir = p.rsplit("/", 1)[0]
            artifact_path = f"{working_dir}/dist/"
    elif language == "javascript":
        artifact_path = "build/"
        p = await _find_build_file(repo_full_name, branch, gh_token, "package.json")
        if p and "/" in p:
            working_dir = p.rsplit("/", 1)[0]
            artifact_path = f"{working_dir}/build/"
    elif language == "java":
        if build_tool == "maven":
            p = await _find_build_file(repo_full_name, branch, gh_token, "pom.xml")
            artifact_path = f"{working_dir}/target/*.jar" if working_dir else "target/*.jar"
        else:
            p = await _find_build_file(repo_full_name, branch, gh_token, "build.gradle")
            artifact_path = f"{working_dir}/build/libs/*.jar" if working_dir else "build/libs/*.jar"
        if p and "/" in p:
            working_dir = p.rsplit("/", 1)[0]
            artifact_path = f"{working_dir}/target/*.jar" if build_tool == "maven" else f"{working_dir}/build/libs/*.jar"
    else:
        artifact_path = "build/"

    cd = f"cd {working_dir} && " if working_dir else ""

    # Build language-specific steps as proper dicts
    if language == "python":
        if build_tool == "poetry":
            lang_steps = [
                {"uses": "actions/setup-python@v5", "with": {"python-version": "3.11"}},
                {"uses": "snok/install-poetry@v1"},
                {"name": "Install dependencies", "run": f"{cd}poetry install --no-interaction --no-ansi"},
                {"name": "Build", "run": f"{cd}poetry build"},
            ]
        else:
            lang_steps = [
                {"uses": "actions/setup-python@v5", "with": {"python-version": "3.11"}},
                {"name": "Install dependencies", "run": f"{cd}pip install -r requirements.txt"},
                {"name": "Build", "run": f"{cd}pip install build && python -m build"},
            ]
    elif language == "javascript":
        lang_steps = [
            {"uses": "actions/setup-node@v4", "with": {"node-version": "20"}},
            {"name": "Install dependencies", "run": f"{cd}npm ci"},
            {"name": "Build", "run": f"{cd}npm run build"},
        ]
    elif language == "java":
        build_cmd = f"{cd}mvn clean package -DskipTests" if build_tool == "maven" else f"{cd}./gradlew build -x test"
        lang_steps = [
            {"uses": "actions/setup-java@v4", "with": {"distribution": "temurin", "java-version": "17"}},
            {"name": "Build", "run": build_cmd},
        ]
    else:
        lang_steps = [
            {"name": "Build", "run": "echo 'Add build steps for your language'"},
        ]

    build_steps = [
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        {"uses": "actions/checkout@v4"},
        *lang_steps,
        {
            "name": "Upload artifact",
            "uses": "actions/upload-artifact@v4",
<<<<<<< HEAD
<<<<<<< HEAD
            "with": {
                "name": "build-artifact",
                "path": artifact_path,
                "retention-days": 7,
            },
        },
    ]

    build_job: dict = {"runs-on": "ubuntu-latest", "steps": build_steps}
    if working_dir:
        build_job["defaults"] = {"run": {"working-directory": working_dir}}
        # checkout must run from repo root, so override its working-directory
        build_steps[0] = {"uses": "actions/checkout@v4"}

    deploy_steps: list[dict] = _build_deploy_steps(deploy) if deploy else []

=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
            "with": {"name": "build-artifact", "path": artifact_path, "retention-days": 7},
        },
    ]

    # Deploy steps per target
    deploy_steps = []
    if deploy:
        infra_type = deploy.get("infrastructure_type", "")
        resource_name = deploy.get("resource_name", "")
        resource_group = deploy.get("resource_group", "")
        public_ip = deploy.get("public_ip", "")
        admin_user = deploy.get("admin_user", "azureuser")

        azure_login = {
            "name": "Azure Login",
            "uses": "azure/login@v1",
            "with": {"creds": "${{ secrets.AZURE_CREDENTIALS }}"},
        }

        if infra_type == "azure-web-app":
            deploy_steps = [
                {"uses": "actions/checkout@v4"},
                {"name": "Download artifact", "uses": "actions/download-artifact@v4", "with": {"name": "build-artifact"}},
                azure_login,
                {"name": "Deploy to Azure Web App", "uses": "azure/webapps-deploy@v3", "with": {"app-name": resource_name, "package": "."}},
            ]
        elif infra_type == "aks":
            deploy_steps = [
                {"uses": "actions/checkout@v4"},
                azure_login,
                {"name": "Set AKS context", "uses": "azure/aks-set-context@v3", "with": {"resource-group": resource_group, "cluster-name": resource_name}},
                {"name": "Deploy to AKS", "run": "kubectl apply -f k8s/ || echo 'No k8s manifests found'"},
            ]
        elif infra_type == "vm":
            deploy_steps = [
                {"uses": "actions/checkout@v4"},
                {"name": "Download artifact", "uses": "actions/download-artifact@v4", "with": {"name": "build-artifact"}},
                {
                    "name": "Deploy to VM via SSH",
                    "uses": "appleboy/ssh-action@v1",
                    "with": {
                        "host": public_ip,
                        "username": admin_user,
                        "key": "${{ secrets.VM_SSH_PRIVATE_KEY }}",
                        "script": "mkdir -p ~/app && cd ~/app && echo 'Deployment complete'",
                    },
                },
            ]

    # Build the full workflow dict and serialize to YAML properly
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    workflow: dict = {
        "name": "CI/CD Pipeline",
        "on": {
            "push": {"branches": [branch]},
            "pull_request": {"branches": [branch]},
        },
        "jobs": {
<<<<<<< HEAD
<<<<<<< HEAD
            "build": build_job,
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
            "build": {
                "runs-on": "ubuntu-latest",
                "steps": build_steps,
            }
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        },
    }

    if deploy_steps:
        workflow["jobs"]["deploy"] = {
            "runs-on": "ubuntu-latest",
            "needs": "build",
<<<<<<< HEAD
<<<<<<< HEAD
            "if": f"github.ref == 'refs/heads/{branch}' && needs.build.result == 'success'",
=======
            "if": f"github.ref == 'refs/heads/{branch}'",
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
            "if": f"github.ref == 'refs/heads/{branch}'",
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
            "steps": deploy_steps,
        }

    return yaml.dump(workflow, default_flow_style=False, sort_keys=False, allow_unicode=True)


<<<<<<< HEAD
<<<<<<< HEAD
def _build_lang_steps(language: str, build_tool: str) -> list[dict]:
    """Return language-specific CI steps (working-directory is set via job defaults)."""
    if language == "python":
        if build_tool == "poetry":
            return [
                {"uses": "actions/setup-python@v5", "with": {"python-version": "3.11"}},
                {"uses": "snok/install-poetry@v1"},
                {"name": "Install dependencies", "run": "poetry install --no-interaction --no-ansi"},
                {"name": "Build", "run": "poetry build"},
            ]
        return [
            {"uses": "actions/setup-python@v5", "with": {"python-version": "3.11"}},
            {"name": "Install dependencies", "run": "pip install -r requirements.txt"},
            # Zip the whole app for Azure zip-deploy (no wheel needed)
            {"name": "Package app", "run": "zip -r app.zip . -x '*.git*' '__pycache__/*' '*.pyc'"},
        ]

    if language == "javascript":
        return [
            {"uses": "actions/setup-node@v4", "with": {"node-version": "20"}},
            {"name": "Install dependencies", "run": "rm -rf node_modules && npm install"},
            {"name": "Build", "run": "npm run build"},
        ]

    if language == "java":
        if build_tool == "maven":
            return [
                {"uses": "actions/setup-java@v4", "with": {"distribution": "temurin", "java-version": "17"}},
                {"name": "Build", "run": "mvn clean package -DskipTests"},
            ]
        return [
            {"uses": "actions/setup-java@v4", "with": {"distribution": "temurin", "java-version": "17"}},
            {"name": "Build", "run": "./gradlew build -x test"},
        ]

    if language == "go":
        return [
            {"uses": "actions/setup-go@v5", "with": {"go-version": "1.21"}},
            {"name": "Build", "run": "go build -o main ./..."},
        ]

    if language == "dotnet":
        return [
            {"uses": "actions/setup-dotnet@v4", "with": {"dotnet-version": "8.0.x"}},
            {"name": "Build", "run": "dotnet publish -c Release -o publish/"},
        ]

    return [{"name": "Build", "run": "echo 'Add build steps for your language'"}]


def _azure_runtime(tech: dict) -> tuple[str, str]:
    """
    Returns (az_runtime, startup_command) for `az webapp create --runtime`
    and `az webapp config set --startup-file`.
    """
    lang = tech.get("language", "javascript").lower()
    build_tool = tech.get("buildTool", "").lower()
    framework = (tech.get("framework") or "").lower()

    if lang == "python":
        # FastAPI/Flask: uvicorn; Django: gunicorn
        if framework in ("fastapi", "starlette"):
            return "PYTHON:3.11", "uvicorn app:app --host 0.0.0.0 --port $PORT"
        if framework == "django":
            return "PYTHON:3.11", "gunicorn app.wsgi:application --bind 0.0.0.0:$PORT"
        return "PYTHON:3.11", "uvicorn app:app --host 0.0.0.0 --port $PORT"

    if lang == "java":
        if build_tool == "maven":
            return "JAVA:17-java17", "java -jar target/*.jar"
        return "JAVA:17-java17", "java -jar build/libs/*.jar"

    if lang in ("typescript", "javascript"):
        is_static = framework in (None, "", "react", "vue", "angular", "vite")
        if is_static:
            return "NODE:20-lts", "npm start"  # package.json injected with serve
        return "NODE:20-lts", "npm start"

    if lang == "go":
        return "GO:1.21", "./main"

    if lang == "dotnet":
        return "DOTNETCORE:8.0", ""

    return "NODE:20-lts", "npm start"


def _is_static_app(deploy: dict) -> bool:
    """True when deploying a pure static frontend (no server runtime needed)."""
    return deploy.get("app_type", "") == "static"


def _build_deploy_steps(deploy: dict) -> list[dict]:
    """Return deploy job steps based on infrastructure type."""
    infra_type: str = deploy.get("infrastructure_type", "")
    resource_name: str = deploy.get("resource_name", "")
    resource_group: str = deploy.get("resource_group", "")
    public_ip: str = deploy.get("public_ip", "")
    admin_user: str = deploy.get("admin_user", "azureuser")

    azure_login = {
        "name": "Azure Login",
        "uses": "azure/login@v2",
        "with": {"creds": "${{ secrets.AZURE_CREDENTIALS }}"},
    }

    if infra_type == "azure-web-app":
        rg = deploy.get("resource_group", "devops-rg")
        sku = deploy.get("sku", "B1")
        is_static = _is_static_app(deploy)
        tech = deploy.get("tech", {})
        runtime, startup_cmd = _azure_runtime(tech)
        lang = tech.get("language", "javascript").lower()
        # Artifact download path and zip source vary by language
        dl_path = "artifact"
        zip_cmd = f"cd {dl_path} && zip -r ../release.zip . && cd .."
        if lang == "python":
            dl_path = "."
            zip_cmd = ""  # artifact is already app.zip
        elif lang in ("java",):
            dl_path = "artifact"
            zip_cmd = f"cd {dl_path} && zip -r ../release.zip . && cd .."
        elif lang == "dotnet":
            dl_path = "publish"
            zip_cmd = f"cd {dl_path} && zip -r ../release.zip . && cd .."
        elif lang == "go":
            dl_path = "."
            zip_cmd = "zip release.zip main"
        else:  # js/ts static
            dl_path = "dist"
            zip_cmd = "cd dist && zip -r ../release.zip . && cd .."

        static_inject = (
            'echo \'{"name":"app","scripts":{"start":"npx serve -s . -l $PORT"}}\''
            " > dist/package.json"
        )
        steps: list[dict] = [
            {"name": "Download artifact", "uses": "actions/download-artifact@v4",
             "with": {"name": "build-artifact", "path": dl_path}},
        ]
        if is_static:
            steps.append({"name": "Inject serve package.json", "run": static_inject})
        if zip_cmd:
            steps.append({"name": "Zip artifact", "run": zip_cmd})
        else:
            steps.append({"name": "Use pre-zipped artifact", "run": "mv app.zip release.zip"})
        steps += [
            azure_login,
            {"name": "Provision Resource Group",
             "run": f"az group create --name {rg} --location eastus"},
            {"name": "Provision App Service Plan",
             "run": f"az appservice plan create --name ${{{{ secrets.AZURE_WEBAPP_NAME }}}}-plan --resource-group {rg} --sku {sku} --is-linux"},
            {"name": "Provision Web App",
             "run": f"az webapp create --name ${{{{ secrets.AZURE_WEBAPP_NAME }}}} --resource-group {rg} --plan ${{{{ secrets.AZURE_WEBAPP_NAME }}}}-plan --runtime '{runtime}'"},
        ]
        if startup_cmd:
            steps.append({
                "name": "Set startup command",
                "run": f"az webapp config set --name ${{{{ secrets.AZURE_WEBAPP_NAME }}}} --resource-group {rg} --startup-file '{startup_cmd}'",
            })
        steps.append({
            "name": "Deploy to Azure Web App",
            "run": "az webapp deploy --name ${{ secrets.AZURE_WEBAPP_NAME }} --resource-group " + rg + " --src-path release.zip --type zip",
        })
        return steps

    if infra_type == "aks":
        return [
            {"uses": "actions/checkout@v4"},
            azure_login,
            {
                "name": "Set AKS context",
                "uses": "azure/aks-set-context@v3",
                "with": {"resource-group": resource_group, "cluster-name": resource_name},
            },
            {"name": "Deploy to AKS", "run": "kubectl apply -f k8s/ || echo 'No k8s manifests found'"},
        ]

    if infra_type == "vm":
        return [
            {"name": "Download artifact", "uses": "actions/download-artifact@v4", "with": {"name": "build-artifact"}},
            {
                "name": "Deploy to VM via SSH",
                "uses": "appleboy/ssh-action@v1",
                "with": {
                    "host": public_ip,
                    "username": admin_user,
                    "key": "${{ secrets.VM_SSH_PRIVATE_KEY }}",
                    "script": "mkdir -p ~/app && cd ~/app && echo 'Deployment complete'",
                },
            },
        ]

    return []


async def _verify_repo_access(
    repo_full_name: str, branch: str, gh_token: str
) -> str:
    """
    Verify the token has push access to the repo and the branch exists.
    Returns the resolved branch name (defaults to repo default branch).
    """
    async with httpx.AsyncClient(timeout=20) as client:
        repo_res = await client.get(
            f"{_GITHUB_API}/repos/{repo_full_name}",
            headers=_auth_headers(gh_token),
        )
        if repo_res.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail=f"Repository '{repo_full_name}' not found or inaccessible.",
            )
        repo_data = repo_res.json()
        permissions: dict = repo_data.get("permissions", {})
        if not permissions.get("push", False):
            raise HTTPException(
                status_code=403,
                detail=f"No write access to '{repo_full_name}'. Ensure you are the owner or have push permission.",
            )

        default_branch: str = repo_data.get("default_branch", "main")
        resolved_branch = branch if branch == default_branch else default_branch
        if resolved_branch != branch:
            logger.warning(
                "Requested branch '%s' differs from default '%s'; using default.",
                branch,
                default_branch,
            )

        branch_res = await client.get(
            f"{_GITHUB_API}/repos/{repo_full_name}/branches/{resolved_branch}",
            headers=_auth_headers(gh_token),
        )
        if branch_res.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail=f"Branch '{resolved_branch}' not found in '{repo_full_name}'.",
            )

    return resolved_branch


async def _commit_file(
    repo_full_name: str,
    branch: str,
    path: str,
    content: str,
    commit_message: str,
    gh_token: str,
    max_retries: int = 3,
) -> dict:
    """Commit any file to the repo at the given path with SHA-conflict retry."""
    url = f"{_GITHUB_API}/repos/{repo_full_name}/contents/{path}"
    encoded = base64.b64encode(content.encode()).decode()

    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=20) as client:
            get_res = await client.get(url, headers=_auth_headers(gh_token), params={"ref": branch})
            body: dict = {"message": commit_message, "content": encoded, "branch": branch}
            if get_res.status_code == 200:
                body["sha"] = get_res.json().get("sha")
            put_res = await client.put(url, headers=_auth_headers(gh_token), json=body)

        if put_res.status_code in (200, 201):
            return put_res.json()
        if put_res.status_code == 409 and attempt < max_retries - 1:
            logger.warning("SHA conflict on attempt %d for %s, retrying…", attempt + 1, path)
            await asyncio.sleep(0.5)
            continue
        try:
            error_msg = put_res.json().get("message", put_res.text)
        except Exception:
            error_msg = put_res.text
        raise HTTPException(status_code=400, detail=f"GitHub API error committing {path}: {error_msg}")

    raise HTTPException(status_code=409, detail=f"File conflict after max retries for {path}.")


async def _commit_workflow(
    repo_full_name: str,
    branch: str,
    yaml_content: str,
    gh_token: str,
    max_retries: int = 3,
) -> dict:
    """Commit the workflow YAML to .github/workflows/ci.yml (backwards compat)."""
    return await _commit_file(
        repo_full_name, branch,
        ".github/workflows/ci.yml",
        yaml_content,
        "chore: add CI/CD pipeline via DevOps Agent",
        gh_token, max_retries,
    )


def _generate_ci_yaml(branch: str, tech: dict) -> str:
    """Generate CI-only workflow — build + test + upload artifact. No deploy."""
    language: str = tech.get("language", "python")
    build_tool: str = tech.get("buildTool", "pip")
    lang_steps = _build_lang_steps(language, build_tool)

    artifact_paths: dict[str, str] = {
        "javascript": "dist/",
        "typescript": "dist/",
        "python":     "app.zip",
        "java":       "target/*.jar" if build_tool == "maven" else "build/libs/*.jar",
        "go":         "main",
        "dotnet":     "publish/",
    }
    artifact_path = artifact_paths.get(language, "dist/")

    workflow = {
        "name": "CI",
        "on": {
            "push": {"branches": [branch]},
            "pull_request": {"branches": [branch]},
        },
        "jobs": {
            "build": {
                "runs-on": "ubuntu-latest",
                "steps": [
                    {"uses": "actions/checkout@v4"},
                    *lang_steps,
                    {
                        "name": "Upload artifact",
                        "uses": "actions/upload-artifact@v4",
                        "with": {
                            "name": "build-artifact",
                            "path": artifact_path,
                            "retention-days": 7,
                        },
                    },
                ],
            }
        },
    }
    return yaml.dump(workflow, default_flow_style=False, sort_keys=False, allow_unicode=True)


def _generate_cd_yaml(branch: str, deploy: dict) -> str:
    """Generate CD-only workflow — triggered after CI passes on the branch."""
    infra_type: str = deploy.get("infrastructure_type", "azure-web-app")
    rg: str = deploy.get("resource_group", "devops-rg")
    app_name: str = deploy.get("resource_name", "devops-app")
    public_ip: str = deploy.get("public_ip", "")
    admin_user: str = deploy.get("admin_user", "azureuser")

    azure_login = {
        "name": "Azure Login",
        "uses": "azure/login@v2",
        "with": {"creds": "${{ secrets.AZURE_CREDENTIALS }}"},
    }

    if infra_type == "azure-web-app":
        is_static = _is_static_app(deploy)
        tech = deploy.get("tech", {})
        _, startup_cmd = _azure_runtime(tech)
        lang = tech.get("language", "javascript").lower()
        dl_path = "dist" if lang in ("javascript", "typescript") else "artifact"
        if lang == "python":  dl_path = "."
        elif lang == "dotnet": dl_path = "publish"
        elif lang == "go":     dl_path = "."
        zip_cmd = f"cd {dl_path} && zip -r ../release.zip . && cd .." if lang not in ("python",) else "mv app.zip release.zip"
        if lang == "go": zip_cmd = "zip release.zip main"
        if lang in ("javascript", "typescript"): zip_cmd = "cd dist && zip -r ../release.zip . && cd .."
        static_inject = (
            'echo \'{"name":"app","scripts":{"start":"npx serve -s . -l $PORT"}}\''
            " > dist/package.json"
        )
        cd_steps: list[dict] = [
            {"uses": "actions/checkout@v4"},
            {"name": "Download artifact", "uses": "actions/download-artifact@v4",
             "with": {"name": "build-artifact", "path": dl_path,
                      "github-token": "${{ secrets.GITHUB_TOKEN }}",
                      "run-id": "${{ github.event.workflow_run.id }}"}},
        ]
        if is_static:
            cd_steps.append({"name": "Inject serve package.json", "run": static_inject})
        cd_steps += [
            {"name": "Zip artifact", "run": zip_cmd},
            azure_login,
        ]
        if startup_cmd:
            cd_steps.append({
                "name": "Set startup command",
                "run": f"az webapp config set --name {app_name} --resource-group {rg} --startup-file '{startup_cmd}'",
            })
        cd_steps.append({
            "name": "Deploy to Azure Web App",
            "run": f"az webapp deploy --name {app_name} --resource-group {rg} --src-path release.zip --type zip",
        })
        deploy_steps = cd_steps
    elif infra_type == "aks":
        deploy_steps = [
            {"uses": "actions/checkout@v4"},
            azure_login,
            {"name": "Set AKS context", "uses": "azure/aks-set-context@v3",
             "with": {"resource-group": rg, "cluster-name": app_name}},
            {"name": "Deploy to AKS", "run": "kubectl apply -f k8s/ || echo 'No k8s manifests found'"},
        ]
    elif infra_type == "vm":
        deploy_steps = [
            {"name": "Download artifact", "uses": "actions/download-artifact@v4",
             "with": {"name": "build-artifact", "github-token": "${{ secrets.GITHUB_TOKEN }}",
                      "run-id": "${{ github.event.workflow_run.id }}"}},
            {"name": "Deploy via SSH", "uses": "appleboy/ssh-action@v1",
             "with": {"host": public_ip, "username": admin_user,
                      "key": "${{ secrets.VM_SSH_PRIVATE_KEY }}",
                      "script": "mkdir -p ~/app && cd ~/app && echo 'Deployment complete'"}},
        ]
    else:
        deploy_steps = [{"name": "Deploy", "run": "echo 'No deploy target configured'"}]

    workflow = {
        "name": "CD",
        "on": {
            "workflow_run": {
                "workflows": ["CI"],
                "types": ["completed"],
                "branches": [branch],
            }
        },
        "jobs": {
            "deploy": {
                "runs-on": "ubuntu-latest",
                "if": "github.event.workflow_run.conclusion == 'success'",
                "steps": deploy_steps,
            }
        },
    }
    return yaml.dump(workflow, default_flow_style=False, sort_keys=False, allow_unicode=True)


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

@router.post("/preview")
async def preview_pipeline(
    payload: PipelinePreviewRequest,
    gh_token: str | None = Cookie(default=None),
) -> dict[str, str]:
    """Return a YAML preview of the generated pipeline without committing."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    safe_repo   = payload.repoFullName.replace('\n', '').replace('\r', '')[:100]
    safe_branch = payload.branch.replace('\n', '').replace('\r', '')[:100]
    logger.info("Pipeline preview: repo=%s branch=%s", safe_repo, safe_branch)
    yaml_content = await _generate_pipeline_yaml(
        payload.repoFullName,
        payload.branch,
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
@router.post("/preview")
async def preview_pipeline(payload: PipelinePreviewRequest, gh_token: str | None = Cookie(default=None)):
    """
    Generate a GitHub Actions YAML preview based on tech and feature flags.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Use the repo and branch from the request payload
    repo_full_name = payload.repoFullName
    branch = payload.branch
    logger.info("Generating preview for repo=%s branch=%s", repo_full_name, branch)

    yaml_content = await _generate_pipeline_yaml(
        repo_full_name,
        branch,
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        payload.tech,
        payload.enableSast,
        payload.enableDast,
        gh_token,
    )
    return {"yaml": yaml_content}


@router.post("/create")
async def create_pipeline(
<<<<<<< HEAD
<<<<<<< HEAD
    payload: PipelineCreateRequest,
    gh_token: str | None = Cookie(default=None),
) -> dict:
    """Generate and commit the GitHub Actions workflow file to the repository."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    safe_repo   = payload.repoFullName.replace('\n', '').replace('\r', '')[:100]
    safe_branch = payload.branch.replace('\n', '').replace('\r', '')[:100]
    logger.info("Pipeline create: repo=%s branch=%s", safe_repo, safe_branch)

    resolved_branch = await _verify_repo_access(payload.repoFullName, payload.branch, gh_token)

    yaml_content = await _generate_pipeline_yaml(
        payload.repoFullName,
        resolved_branch,
        payload.tech,
        payload.enableSast,
        payload.enableDast,
        gh_token,
        deploy=payload.deploy,
    )

    await _commit_workflow(payload.repoFullName, resolved_branch, yaml_content, gh_token)

    if payload.deploy:
        azure_creds = json.dumps({
            "clientId": os.getenv("AZURE_CLIENT_ID", ""),
            "clientSecret": os.getenv("AZURE_CLIENT_SECRET", ""),
            "tenantId": os.getenv("AZURE_TENANT_ID", ""),
            "subscriptionId": os.getenv("AZURE_SUBSCRIPTION_ID", ""),
        })
        await _set_github_secret(payload.repoFullName, "AZURE_CREDENTIALS", azure_creds, gh_token)

    return {
        "status": "created",
        "repo": payload.repoFullName,
        "branch": resolved_branch,
        "workflow_path": ".github/workflows/ci.yml",
        "secrets_configured": bool(payload.deploy),
    }
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
    payload: PipelineCreateRequest, gh_token: str | None = Cookie(default=None)
):
    """
    Generate and commit the GitHub Actions workflow file to the selected repository's default branch.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Use the repo and branch from the request payload
    repo_full_name = payload.repoFullName
    branch = payload.branch
    logger.info("Creating pipeline in repo=%s branch=%s", repo_full_name, branch)
    logger.info("Tech payload: %s", payload.tech)
    
    # Check token permissions first
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            # Check user permissions on the repo
            perm_url = f"https://api.github.com/repos/{repo_full_name}"
            perm_res = await client.get(
                perm_url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {gh_token}",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if perm_res.status_code == 200:
                repo_data = perm_res.json()
                permissions = repo_data.get("permissions", {})
                logger.info("Repository permissions: %s", permissions)
                
                if not permissions.get("push", False):
                    raise HTTPException(
                        status_code=403,
                        detail=f"You don't have write access to '{repo_full_name}'. Please make sure you're the owner or have push access."
                    )
            else:
                logger.error("Failed to check permissions: %s", perm_res.text)
                raise HTTPException(
                    status_code=404,
                    detail=f"Repository '{repo_full_name}' not found or you don't have access"
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error checking permissions: %s", e)
        raise HTTPException(status_code=500, detail=f"Error checking permissions: {str(e)}")
    
    # Verify the repository and branch exist
    repo_data = None
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            repo_url = f"https://api.github.com/repos/{repo_full_name}"
            logger.info("Verifying repository: %s", repo_url)
            repo_res = await client.get(
                repo_url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {gh_token}",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if repo_res.status_code != 200:
                logger.error("Repository not found or no access: %s", repo_res.text)
                raise HTTPException(
                    status_code=404, 
                    detail=f"Repository '{repo_full_name}' not found or you don't have access to it"
                )
            repo_data = repo_res.json()
            default_branch = repo_data.get("default_branch", "main")
            logger.info("Repository default branch: %s, requested branch: %s", default_branch, branch)
            
            # If requested branch is not the default, use default branch instead
            if branch != default_branch:
                logger.warning("Requested branch '%s' is not default branch '%s'. Using default branch.", branch, default_branch)
                branch = default_branch
            
            # Verify branch exists
            branch_url = f"https://api.github.com/repos/{repo_full_name}/branches/{branch}"
            logger.info("Verifying branch: %s", branch_url)
            branch_res = await client.get(
                branch_url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {gh_token}",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if branch_res.status_code != 200:
                logger.error("Branch not found: %s", branch_res.text)
                raise HTTPException(
                    status_code=404, 
                    detail=f"Branch '{branch}' not found in repository '{repo_full_name}'"
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error verifying repository/branch: %s", e)
        raise HTTPException(status_code=500, detail=f"Error verifying repository: {str(e)}")

    # Generate YAML
    yaml_content = await _generate_pipeline_yaml(
        repo_full_name, branch, payload.tech, payload.enableSast, payload.enableDast, gh_token,
        deploy=payload.deploy
    )

    # Use GitHub's contents API for workflow file creation
    contents_url = f"https://api.github.com/repos/{repo_full_name}/contents/.github/workflows/ci.yml"
    logger.info("Uploading workflow to: %s", contents_url)
    encoded_content = base64.b64encode(yaml_content.encode("utf-8")).decode("utf-8")
    
    # Retry logic for handling SHA conflicts
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                # Get the latest file SHA each time to avoid conflicts
                get_res = await client.get(
                    contents_url,
                    headers={
                        "Accept": "application/vnd.github+json",
                        "Authorization": f"Bearer {gh_token}",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                    params={"ref": branch}
                )
                
                file_sha = None
                if get_res.status_code == 200:
                    # File exists, get its SHA for update
                    file_sha = get_res.json().get("sha")
                    logger.info("Attempt %d: File exists, will update with SHA: %s", attempt + 1, file_sha)
                else:
                    logger.info("Attempt %d: File doesn't exist, will create new", attempt + 1)
                
                # Prepare the request body
                request_body = {
                    "message": "chore: add CI/CD pipeline via DevOps Agent",
                    "content": encoded_content
                }
                if file_sha:
                    request_body["sha"] = file_sha
                
                put_res = await client.put(
                    contents_url,
                    headers={
                        "Accept": "application/vnd.github+json",
                        "Authorization": f"Bearer {gh_token}",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                    json=request_body,
                )

                if put_res.status_code in [200, 201]:
                    result = put_res.json()
                    logger.info("Successfully created/updated workflow file on attempt %d", attempt + 1)

                    # Auto-set AZURE_CREDENTIALS secret if deploy config present
                    if payload.deploy:
                        azure_creds = json.dumps({
                            "clientId": os.getenv("AZURE_CLIENT_ID", ""),
                            "clientSecret": os.getenv("AZURE_CLIENT_SECRET", ""),
                            "tenantId": os.getenv("AZURE_TENANT_ID", ""),
                            "subscriptionId": os.getenv("AZURE_SUBSCRIPTION_ID", ""),
                        })
                        await _set_github_secret(repo_full_name, "AZURE_CREDENTIALS", azure_creds, gh_token)

                    return {
                        "status": "created",
                        "repo": repo_full_name,
                        "branch": branch,
                        "workflow_path": ".github/workflows/ci.yml",
                        "commit_sha": result.get("commit", {}).get("sha", ""),
                        "secrets_configured": bool(payload.deploy),
                    }
                elif put_res.status_code == 409:
                    # SHA conflict - retry with fresh SHA
                    logger.warning("Attempt %d: SHA conflict (409), retrying...", attempt + 1)
                    if attempt < max_retries - 1:
                        import asyncio
                        await asyncio.sleep(0.5)  # Brief delay before retry
                        continue
                    else:
                        raise HTTPException(
                            status_code=409,
                            detail="File was modified by another process. Please try again."
                        )
                else:
                    error_detail = put_res.text
                    logger.error(
                        "Commit failed on attempt %d: status=%s, body=%s",
                        attempt + 1,
                        put_res.status_code,
                        error_detail,
                    )
                    
                    # Parse error message for better user feedback
                    try:
                        error_json = put_res.json()
                        error_msg = error_json.get("message", error_detail)
                    except:
                        error_msg = error_detail
                        
                    raise HTTPException(
                        status_code=400, 
                        detail=f"GitHub API error: {error_msg}. Make sure you have write access to the repository."
                    )
        except HTTPException:
            raise
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning("Attempt %d failed with error: %s, retrying...", attempt + 1, str(e))
                import asyncio
                await asyncio.sleep(0.5)
                continue
            else:
                logger.exception("All attempts failed: %s", e)
                raise HTTPException(status_code=500, detail=f"Failed after {max_retries} attempts: {str(e)}")
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374


@router.get("/failed")
async def get_failed_pipelines(
<<<<<<< HEAD
<<<<<<< HEAD
    days: int = 7,
    gh_token: str | None = Cookie(default=None),
) -> dict:
    """Return all failed pipeline runs across the user's repositories with AI analysis."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    async with httpx.AsyncClient(timeout=20) as client:
        repos_res = await client.get(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
            headers=_auth_headers(gh_token),
        )
    if repos_res.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch repositories from GitHub.")

    all_failed: list[dict] = []

    for repo in repos_res.json():
        repo_name: str = repo["full_name"]
        failed_runs = await get_failed_workflow_runs(repo_name, gh_token, days=days)

        for run in failed_runs:
            jobs = await get_workflow_run_jobs(repo_name, run["id"], gh_token)
            failed_job = next((j for j in jobs if j.get("conclusion") == "failure"), None)
            logs = await get_workflow_run_logs(repo_name, run["id"], gh_token)
            error_excerpt = extract_error_from_logs(logs or "")

            tech_stack: dict = {
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
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
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
                "language": "unknown",
                "framework": None,
                "buildTool": None,
                "hasDockerfile": False,
                "hasHelm": False,
                "hasTerraform": False,
            }
<<<<<<< HEAD
<<<<<<< HEAD
            try:
                from app.api.v1.analysis import TechDetectionRequest, tech_detection  # noqa: PLC0415
                detected = await tech_detection(
                    TechDetectionRequest(
                        repoFullName=repo_name,
                        branch=run.get("head_branch", "main"),
                    ),
                    gh_token,
                )
                tech_stack = detected
            except Exception as exc:  # noqa: BLE001 — tech detection is non-critical
                logger.debug("Tech detection skipped for %s: %s", repo_name, exc)

            ai_analysis: dict = await asyncio.to_thread(
                analyze_pipeline_error, error_excerpt, tech_stack
            )

            all_failed.append({
                "id": run["id"],
                "repo": repo_name,
                "workflow_name": run.get("name", "Unknown"),
                "branch": run.get("head_branch", "unknown"),
                "commit_sha": run.get("head_sha", "")[:7],
                "failed_at": run.get("updated_at", run.get("created_at")),
                "failed_job": failed_job.get("name") if failed_job else "Unknown",
                "error_excerpt": error_excerpt[:500],
                "ai_reason": ai_analysis.get("reason", ""),
                "ai_resolution": ai_analysis.get("resolution", ""),
                "run_url": run.get("html_url", ""),
            })

    all_failed.sort(key=lambda x: x["failed_at"], reverse=True)
    return {"failed_runs": all_failed, "total": len(all_failed)}


@router.get("/{repo_full_name:path}/runs/{run_id}/analyze")
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
            
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
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
async def analyze_pipeline_run(
    repo_full_name: str,
    run_id: int,
    gh_token: str | None = Cookie(default=None),
<<<<<<< HEAD
<<<<<<< HEAD
) -> dict:
    """Return detailed AI analysis for a specific failed pipeline run."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub.")

    async with httpx.AsyncClient(timeout=20) as client:
        run_res = await client.get(
            f"{_GITHUB_API}/repos/{repo_full_name}/actions/runs/{run_id}",
            headers=_auth_headers(gh_token),
        )
    if run_res.status_code != 200:
        raise HTTPException(status_code=404, detail="Pipeline run not found.")

    run = run_res.json()
    if run.get("conclusion") != "failure":
        raise HTTPException(status_code=400, detail="This pipeline run did not fail.")

    logs = await get_workflow_run_logs(repo_full_name, run_id, gh_token)
    error_excerpt = extract_error_from_logs(logs or "")

    tech_stack: dict = {
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
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
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
        "language": "unknown",
        "framework": None,
        "buildTool": None,
        "hasDockerfile": False,
        "hasHelm": False,
        "hasTerraform": False,
    }
<<<<<<< HEAD
<<<<<<< HEAD
    ai_analysis: dict = await asyncio.to_thread(analyze_pipeline_error, error_excerpt, tech_stack)
=======
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

    # Get AI analysis (synchronous call, but we're in async context)
    import asyncio
    ai_analysis = await asyncio.to_thread(analyze_pipeline_error, error_excerpt, tech_stack)
<<<<<<< HEAD
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======
>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374

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
<<<<<<< HEAD
<<<<<<< HEAD
=======

>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
=======

>>>>>>> 3a7c3ddc753b8fc8e40879fb1da83561691d7374
