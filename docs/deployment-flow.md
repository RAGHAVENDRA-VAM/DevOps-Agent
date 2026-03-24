# Complete Deployment Flow Implementation Plan

## Overview
This document outlines the complete CI/CD and deployment flow from build to infrastructure provisioning to deployment.

---

## Flow Diagram

```
1. Repo Selection → 2. Tech Detection → 3. CI YAML Creation → 4. Build Execution
                                                                        ↓
8. Deploy Artifact ← 7. Show Infrastructure ← 6. Create Infrastructure ← 5. Deployment Selection
```

---

## Detailed Steps

### **Step 1-3: Already Implemented ✅**
- User selects repository
- System detects tech stack
- Creates CI YAML with build + artifact upload

### **Step 4: Monitor Build Execution** (NEW)

**Backend API Endpoints:**
```python
GET /api/pipelines/{repo}/runs
GET /api/pipelines/{repo}/runs/{run_id}
GET /api/pipelines/{repo}/runs/{run_id}/logs
GET /api/pipelines/{repo}/runs/{run_id}/artifacts
```

**What to Show in UI:**
- Build status: queued, in_progress, completed, failed
- Real-time logs from GitHub Actions
- Build duration
- Artifact download link
- Commit SHA and branch

**Data Needed from User:** None (automatic)

---

### **Step 5: Deployment Target Selection** (NEW)

**UI Page:** `DeploymentSelectionPage.tsx`

**User Selects:**
1. **Deployment Type:**
   - Azure VM
   - Azure AKS (Kubernetes)
   - Azure App Service
   - Azure Container Instances

2. **Environment:**
   - Development
   - Staging
   - Production

**Backend API:**
```python
GET /api/infrastructure/list?type=vm&environment=dev
POST /api/deployment/select
```

---

### **Step 6: Infrastructure Management** (NEW)

#### **6A: Check Existing Infrastructure**

**Backend API:**
```python
GET /api/infrastructure/azure/vms
GET /api/infrastructure/azure/aks-clusters
GET /api/infrastructure/azure/app-services
```

**Response:**
```json
{
  "vms": [
    {
      "id": "/subscriptions/.../vm1",
      "name": "app-vm-dev",
      "status": "running",
      "ip": "20.10.5.100",
      "size": "Standard_B2s",
      "location": "eastus"
    }
  ],
  "aks_clusters": [...],
  "app_services": [...]
}
```

**UI Shows:**
- List of existing infrastructure
- Status (running/stopped)
- Resource details
- "Select" button for each resource

#### **6B: Create New Infrastructure**

**UI Form Fields Needed:**

**For Azure VM:**
```typescript
{
  name: string;              // e.g., "app-vm-prod"
  size: string;              // e.g., "Standard_B2s"
  location: string;          // e.g., "eastus"
  osType: "Linux" | "Windows";
  adminUsername: string;
  sshPublicKey: string;      // For Linux
  resourceGroup: string;     // New or existing
  vnetName: string;          // Virtual network
  subnetName: string;
  openPorts: number[];       // e.g., [80, 443, 22]
}
```

**For Azure AKS:**
```typescript
{
  clusterName: string;       // e.g., "app-aks-prod"
  location: string;
  nodeCount: number;         // e.g., 3
  nodeSize: string;          // e.g., "Standard_DS2_v2"
  kubernetesVersion: string; // e.g., "1.28"
  resourceGroup: string;
  enableAutoScaling: boolean;
  minNodes: number;
  maxNodes: number;
}
```

**For Azure App Service:**
```typescript
{
  appName: string;           // e.g., "myapp-prod"
  location: string;
  sku: string;               // e.g., "B1", "P1v2"
  runtime: string;           // e.g., "PYTHON|3.11", "NODE|20"
  resourceGroup: string;
}
```

**Backend API:**
```python
POST /api/infrastructure/create
{
  "type": "vm" | "aks" | "app_service",
  "config": { ...fields above... }
}
```

**Terraform Module Structure:**
```
templates/terraform/modules/
├── azure-vm/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── azure-aks/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── azure-app-service/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

---

### **Step 7: Show Created Infrastructure** (NEW)

**After Terraform Apply:**

**Backend Returns:**
```json
{
  "status": "success",
  "infrastructure": {
    "type": "vm",
    "name": "app-vm-prod",
    "id": "/subscriptions/.../vm1",
    "publicIp": "20.10.5.100",
    "privateIp": "10.0.1.4",
    "fqdn": "app-vm-prod.eastus.cloudapp.azure.com",
    "status": "running",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "terraform": {
    "stateFile": "s3://bucket/terraform.tfstate",
    "outputs": {
      "vm_id": "...",
      "public_ip": "20.10.5.100"
    }
  }
}
```

**UI Shows:**
- Infrastructure details card
- Connection information
- Status indicator
- "Deploy Now" button

---

### **Step 8: Deploy Artifact** (NEW)

**Deployment Methods by Type:**

#### **Azure VM Deployment:**
```python
POST /api/deployment/deploy
{
  "infrastructureId": "vm-123",
  "artifactUrl": "https://github.com/.../artifacts/123",
  "deploymentMethod": "ssh" | "ansible"
}
```

**Process:**
1. Download artifact from GitHub
2. SSH into VM
3. Copy artifact
4. Run deployment script
5. Start application

#### **Azure AKS Deployment:**
```python
POST /api/deployment/deploy
{
  "infrastructureId": "aks-123",
  "artifactUrl": "...",
  "deploymentMethod": "kubectl"
}
```

**Process:**
1. Build Docker image from artifact
2. Push to Azure Container Registry
3. Apply Kubernetes manifests
4. Deploy to AKS cluster

#### **Azure App Service Deployment:**
```python
POST /api/deployment/deploy
{
  "infrastructureId": "app-service-123",
  "artifactUrl": "...",
  "deploymentMethod": "zip_deploy"
}
```

**Process:**
1. Download artifact
2. Package as ZIP
3. Deploy via Azure App Service API

---

## Database Schema (Store State)

```sql
-- Pipelines
CREATE TABLE pipelines (
  id UUID PRIMARY KEY,
  repo_full_name VARCHAR,
  branch VARCHAR,
  tech_stack JSONB,
  created_at TIMESTAMP
);

-- Build Runs
CREATE TABLE build_runs (
  id UUID PRIMARY KEY,
  pipeline_id UUID REFERENCES pipelines(id),
  run_id BIGINT,  -- GitHub Actions run ID
  status VARCHAR,
  artifact_url VARCHAR,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Infrastructure
CREATE TABLE infrastructure (
  id UUID PRIMARY KEY,
  name VARCHAR,
  type VARCHAR,  -- vm, aks, app_service
  provider VARCHAR,  -- azure, aws, gcp
  config JSONB,
  terraform_state TEXT,
  status VARCHAR,
  created_at TIMESTAMP
);

-- Deployments
CREATE TABLE deployments (
  id UUID PRIMARY KEY,
  build_run_id UUID REFERENCES build_runs(id),
  infrastructure_id UUID REFERENCES infrastructure(id),
  status VARCHAR,
  deployed_at TIMESTAMP,
  deployment_url VARCHAR
);
```

---

## UI Pages to Create

### 1. **BuildStatusPage.tsx**
- Shows build progress
- Real-time logs
- Artifact download link
- "Proceed to Deployment" button

### 2. **DeploymentSelectionPage.tsx**
- Radio buttons for deployment type
- Environment selector
- "Check Existing" or "Create New" tabs

### 3. **InfrastructureListPage.tsx**
- Shows existing infrastructure
- Filter by type/environment
- Select button for each

### 4. **InfrastructureCreatePage.tsx**
- Dynamic form based on selected type
- Validation
- "Create Infrastructure" button
- Progress indicator

### 5. **InfrastructureDetailsPage.tsx**
- Shows created infrastructure
- Connection details
- Status monitoring
- "Deploy Application" button

### 6. **DeploymentPage.tsx**
- Deployment progress
- Logs
- Success/failure status
- Application URL

---

## Implementation Priority

### **Phase 1: Build Monitoring** (Week 1)
- ✅ Simplified CI YAML (done)
- Backend: GitHub Actions API integration
- Frontend: BuildStatusPage

### **Phase 2: Infrastructure List** (Week 2)
- Backend: Azure SDK integration
- Frontend: DeploymentSelectionPage
- Frontend: InfrastructureListPage

### **Phase 3: Infrastructure Creation** (Week 3)
- Backend: Terraform module execution
- Frontend: InfrastructureCreatePage
- Frontend: InfrastructureDetailsPage

### **Phase 4: Deployment** (Week 4)
- Backend: Deployment automation
- Frontend: DeploymentPage
- End-to-end testing

---

## Next Steps

1. **Implement Build Monitoring APIs**
2. **Create BuildStatusPage UI**
3. **Test artifact upload in GitHub Actions**
4. **Implement Azure infrastructure listing**
5. **Create Terraform modules for each infrastructure type**
