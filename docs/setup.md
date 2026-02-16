Setup Guide
===========

This guide explains how to run the **DevOps Agent Platform** locally and how to configure
environment variables for GitHub, SonarQube, OWASP ZAP, Azure, and your container registry.

The design is fully parameterized: **no real secrets are stored in the repository**.

## AI-Powered Pipeline Error Analysis

The platform includes **AI-powered analysis of failed pipelines** using Google Gemini. When a pipeline fails, the system:

1. Fetches error logs from GitHub Actions
2. Detects the technology stack (language, framework, build tool)
3. Sends error + tech stack to AI (Google Gemini) for analysis
4. Returns actionable reason and resolution steps
5. Displays all failed pipelines in a dedicated page with AI insights

**To enable AI analysis** (optional):
- Get a Gemini API key from https://makersuite.google.com/app/apikey
- Add to `backend/.env`:
  ```
  GEMINI_API_KEY=your-gemini-api-key
  GEMINI_MODEL=gemini-2.5-flash  # Optional: defaults to gemini-2.5-flash
  ```
- Without this, the platform still works but shows generic error messages

**View failed pipelines**: Navigate to `/failed-pipelines` in the UI

## 1. Backend (FastAPI) – Local Setup

### 1.1. Install dependencies

Prerequisites:

- Python 3.11+
- Poetry (`pip install poetry` or follow official docs)

From the `backend` directory:

```bash
cd backend
poetry install
```

### 1.2. Configure environment variables

Use the provided example file as a reference:

```bash
cd backend
cp env.example .env
```

Then open `.env` and set values for your environment:

- **GitHub**
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `GITHUB_OAUTH_CALLBACK_URL` (e.g., `http://localhost:4000/api/auth/github/callback`)
  - `GITHUB_PERSONAL_ACCESS_TOKEN` (optional – used for API calls if needed)
- **SonarQube**
  - `SONAR_HOST_URL` (e.g., `https://sonarqube.your-org.com`)
  - `SONAR_TOKEN`
  - `SONAR_PROJECT_KEY_PREFIX` (prefix used when generating project keys)
- **OWASP ZAP**
  - `ZAP_API_KEY`
  - `ZAP_BASE_URL`
- **Azure**
  - `AZURE_CLIENT_ID`
  - `AZURE_CLIENT_SECRET`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`
- **Container Registry**
  - `REGISTRY_URL`
  - `REGISTRY_USERNAME`
  - `REGISTRY_PASSWORD`
- **AI Analysis (Optional)**
  - `GEMINI_API_KEY` - Google Gemini API key for pipeline error analysis (get from https://makersuite.google.com/app/apikey)
  - `GEMINI_MODEL` - Model to use (default: `gemini-2.5-flash`)

> In production, load these from a secret manager (Azure Key Vault, AWS Secrets Manager, Vault, etc.)
> instead of `.env` files.

### 1.3. Run the API with Uvicorn

From the `backend` directory:

```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

OAuth callback path:

- The backend must expose `GET /api/auth/github/callback`.
- Your GitHub OAuth App “Authorization callback URL” must be:
  - `http://localhost:4000/api/auth/github/callback`

The API will be available at:

- Base URL: `http://localhost:4000/api`
- Swagger UI: `http://localhost:4000/api/docs`

### 1.4. Background work model

For now, long-running work (e.g., repo scans, Terraform apply) can be:

- Run synchronously in the request for simple/small use cases, **or**
- Offloaded using FastAPI `BackgroundTasks` so the HTTP response can return quickly while work
  continues in-process.

The architecture is intentionally simple to start with, but you can later introduce a proper queue
system (Celery, RQ, etc.) without changing the public API.

## 2. Frontend (React + Vite) – Local Setup

From the `frontend` directory:

```bash
cd frontend
npm install
```

Create a `frontend/.env` file (or `.env.local`) with:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
VITE_GITHUB_OAUTH_CLIENT_ID=your-github-client-id
```

Then run the dev server:

```bash
npm run dev
```

The UI will be available at `http://localhost:5173` and proxied to the backend via Vite.

## 3. GitHub Actions – Wiring Secrets & Variables

For the sample workflow in `templates/github-actions/ci-python-fastapi.yml`, configure the
following **secrets** in your GitHub repository settings (Settings → Secrets and variables → Actions):

- `SONAR_HOST_URL`
- `SONAR_TOKEN`
- `REGISTRY_URL`
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `APP_BASE_URL` (public URL of the deployed app, e.g., Terraform output)

Configure the following **variables** (Settings → Secrets and variables → Actions → Variables):

- `ENABLE_SAST` = `true` or `false`
- `ENABLE_DAST` = `true` or `false`
- `SONAR_PROJECT_KEY_PREFIX` (matches your SonarQube convention)

The DevOps Agent backend can be extended to **write or validate these settings via the GitHub API**
instead of requiring manual configuration.

## 4. Terraform – Azure Deployment

The Terraform starter in `templates/terraform/main.tf` is parameterized and **does not** hardcode
credentials.

To apply it manually:

```bash
cd templates/terraform
terraform init
terraform apply \
  -var="azure_client_id=$AZURE_CLIENT_ID" \
  -var="azure_client_secret=$AZURE_CLIENT_SECRET" \
  -var="azure_tenant_id=$AZURE_TENANT_ID" \
  -var="azure_subscription_id=$AZURE_SUBSCRIPTION_ID" \
  -var="app_name=devops-agent-demo" \
  -var="container_image=$REGISTRY_URL/your-repo:your-tag"
```

On success, Terraform will output `app_fqdn`, which you can use:

- As `APP_BASE_URL` in GitHub Actions secrets for OWASP ZAP.
- In the DevOps Agent UI to show environment endpoints.

## 5. Security and Production Considerations

- **Never commit real secrets**: `.env` files are for local development only and must be gitignored.
- **Use secret managers** in non-dev environments.
- **Audit logging**: extend the backend to log OAuth flows, pipeline creation, and infra changes.
- **Feature flags**: keep SAST/DAST behind flags (as modeled by `ENABLE_SAST`, `ENABLE_DAST`) and
  optionally use a feature-flag service for per-environment control.

This setup gives you a fully parameterized local environment while keeping all credentials external
to the codebase.

