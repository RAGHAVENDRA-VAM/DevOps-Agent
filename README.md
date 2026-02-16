DevOps Agent Platform
======================

This repository contains an opinionated, production-ready skeleton for an **Enterprise DevOps Agent Platform** that:

- Connects to GitHub and discovers repositories
- Detects application technologies
- Generates CI/CD pipelines automatically
- **AI-powered pipeline error analysis** - automatically analyzes failed pipelines using Google Gemini and provides reasons and resolutions
- Real-time pipeline monitoring across all repositories
- Integrates SAST (SonarQube) and DAST (OWASP ZAP)
- Provisions cloud infrastructure using IaC (Terraform)
- Deploys applications to multiple targets
- Tracks DORA metrics
- Provides a modern React + TypeScript web UI

This is a **starter architecture and implementation scaffold**. It is designed to be secure, modular, and extensible while avoiding hardcoded secrets or org-specific values.

## Repository Structure

```text
devops-agent/
├── frontend/
│   ├── src/
│   ├── pages/
│   ├── components/
│   └── services/
├── backend/
│   ├── api/
│   ├── workers/
│   ├── integrations/
│   ├── security/
│   └── metrics/
├── templates/
│   ├── github-actions/
│   ├── azure-pipelines/
│   └── terraform/
├── docs/
│   ├── architecture.md
│   ├── api-contracts.md
│   └── setup.md
└── README.md
```

## High-Level Technology Choices

- **Frontend**: React, TypeScript, Vite, MUI
- **Backend**: Python, FastAPI with modular architecture, REST APIs, and lightweight background tasks (queue-friendly design for Celery/RQ later)
- **CI/CD**: GitHub Actions (primary), with extension points for Azure DevOps
- **IaC**: Terraform (cloud-agnostic with examples for Azure; can be adapted to AWS/GCP)
- **Security Tools**:
  - SAST: SonarQube
  - DAST: OWASP ZAP
- **Auth**: GitHub OAuth (OAuth Apps or GitHub Apps) on the backend, with token storage via secure cookies or session storage on the frontend
- **Metrics**: DORA metrics stored in a backing data store (placeholder abstraction), exposed via REST, visualized in UI

## Secrets & Configuration

All secrets and environment-specific values **must be provided via environment variables or a secret manager**. Nothing in this repo should hardcode sensitive values.

Required environment variables (non-exhaustive, see `docs/setup.md` for more details):

- GitHub:
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `GITHUB_OAUTH_CALLBACK_URL`
  - `GITHUB_PERSONAL_ACCESS_TOKEN` (optional)
- SonarQube:
  - `SONAR_HOST_URL`
  - `SONAR_TOKEN`
  - `SONAR_PROJECT_KEY_PREFIX`
- OWASP ZAP:
  - `ZAP_API_KEY`
  - `ZAP_BASE_URL`
- Azure (example cloud provider):
  - `AZURE_CLIENT_ID`
  - `AZURE_CLIENT_SECRET`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`
- Container Registry:
  - `REGISTRY_URL`
  - `REGISTRY_USERNAME`
  - `REGISTRY_PASSWORD`

No defaults are provided for these values. Use `.env` files for local development only and a secret manager (e.g., Azure Key Vault, AWS Secrets Manager, Vault) for production.

## Getting Started (High-Level)

Detailed instructions are in `docs/setup.md`. At a high level:

1. **Backend**
   - `cd backend`
   - `npm install`
   - Configure environment variables
   - `npm run start:dev`
2. **Frontend**
   - `cd frontend`
   - `npm install`
   - Configure environment variables (see `frontend/.env.example`)
   - `npm run dev`

## Functional Flow (Implemented as Skeleton)

- GitHub OAuth login and token issuance
- Listing and filtering repositories
- Selecting repo + branch
- Backend repo scanning and tech detection (language, framework, build tool, presence of Docker/Helm/IaC)
- Pipeline template selection based on detected tech
- Pipeline YAML preview in UI with toggles for SAST/DAST stages
- Pipeline creation via GitHub Actions workflows (commit or GitHub API)
- **Real-time pipeline monitoring** - track all pipeline runs and failures
- **AI error analysis** - automatic analysis of failed pipelines with tech stack context
- Hooks for:
  - SAST (SonarQube)
  - DAST (OWASP ZAP)
  - Terraform-based infrastructure provisioning
  - Deployment & status reporting
  - DORA metrics capture and calculation

## Non-Functional Considerations

- Clean, modular architecture aligned with SOLID principles
- OpenAPI/Swagger docs generated from backend
- Async job handling for long-running operations (scans, Terraform, deployments)
- Retry & rollback hooks where applicable
- Feature flags for SAST/DAST and other optional features
- Extensibility points for GitLab and other CI/CD tools

Assumptions and additional integration steps are explained in `docs/architecture.md` and `docs/setup.md`.

