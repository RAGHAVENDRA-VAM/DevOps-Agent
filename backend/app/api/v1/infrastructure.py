from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException
from pydantic import BaseModel
import os
import subprocess
import tempfile
import json
from pathlib import Path

router = APIRouter()


class InfrastructureProvisionRequest(BaseModel):
    repoFullName: str
    branch: str
    infrastructure: dict


@router.post("/provision")
async def provision_infrastructure(
    payload: InfrastructureProvisionRequest, gh_token: str | None = Cookie(default=None)
):
    """
    Provision infrastructure using Terraform based on selected infrastructure type.
    This generates Terraform files and applies them to create the infrastructure.
    """
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated with GitHub")

    # Check if any workflow file exists in .github/workflows/ before provisioning
    import httpx
    workflows_dir = ".github/workflows"
    dir_url = f"https://api.github.com/repos/{payload.repoFullName}/contents/{workflows_dir}?ref={payload.branch}"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            dir_url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {gh_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if res.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"No workflow directory found in repo/branch. Please create or push a pipeline file before provisioning infrastructure.",
            )
        items = res.json()
        workflow_files = [item["name"] for item in items if item.get("type") == "file" and item["name"].endswith(('.yml', '.yaml'))]
        if not workflow_files:
            raise HTTPException(
                status_code=400,
                detail=f"No workflow YAML file found in .github/workflows/. Please create or push a pipeline file before provisioning infrastructure."
            )

    infra_config = payload.infrastructure
    infra_type = infra_config.get("type", "app-service")
    resource_name = infra_config.get("name", "")
    region = infra_config.get("region", "eastus")

    if not resource_name:
        raise HTTPException(status_code=400, detail="Resource name is required")

    # Get Azure credentials from environment
    azure_client_id = os.getenv("AZURE_CLIENT_ID")
    azure_client_secret = os.getenv("AZURE_CLIENT_SECRET")
    azure_tenant_id = os.getenv("AZURE_TENANT_ID")
    azure_subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")

    if not all([azure_client_id, azure_client_secret, azure_tenant_id, azure_subscription_id]):
        raise HTTPException(
            status_code=503,
            detail="Azure credentials not configured. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID",
        )

    # Generate Terraform configuration based on infrastructure type
    terraform_config = _generate_terraform_config(infra_type, resource_name, region, infra_config)

    # Create temporary directory for Terraform files
    with tempfile.TemporaryDirectory() as tmpdir:
        tf_dir = Path(tmpdir)
        
        # Write main.tf
        (tf_dir / "main.tf").write_text(terraform_config)
        
        # Write terraform.tfvars
        tfvars = {
            "resource_name": resource_name,
            "location": region,
            "azure_client_id": azure_client_id,
            "azure_client_secret": azure_client_secret,
            "azure_tenant_id": azure_tenant_id,
            "azure_subscription_id": azure_subscription_id,
        }
        
        if infra_type == "kubernetes":
            tfvars["node_count"] = infra_config.get("nodeCount", 2)
        elif infra_type == "vm":
            tfvars["vm_size"] = infra_config.get("size", "Standard_B1s")
        elif infra_type == "app-service":
            tfvars["app_service_plan_sku"] = infra_config.get("size", "B1")

        tfvars_content = "\n".join([f'{k} = "{v}"' for k, v in tfvars.items()])
        (tf_dir / "terraform.tfvars").write_text(tfvars_content)

        # In production, you would:
        # 1. Initialize Terraform: terraform init
        # 2. Plan: terraform plan
        # 3. Apply: terraform apply -auto-approve
        # 4. Store state in remote backend (Azure Storage, S3, etc.)
        # 5. Return infrastructure details (URLs, IPs, etc.)

        # For now, return a mock response indicating infrastructure would be provisioned
        return {
            "status": "provisioned",
            "infrastructure_type": infra_type,
            "resource_name": resource_name,
            "region": region,
            "message": "Infrastructure provisioning initiated. In production, this would execute Terraform apply.",
            "terraform_files": {
                "main_tf": terraform_config,
                "tfvars": tfvars_content,
            },
        }


def _generate_terraform_config(
    infra_type: str, resource_name: str, region: str, config: dict
) -> str:
    """Generate Terraform configuration based on infrastructure type."""
    
    if infra_type == "app-service":
        return f"""
terraform {{
  required_providers {{
    azurerm = {{
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }}
  }}
}}

provider "azurerm" {{
  features {{}}
  
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}}

variable "resource_name" {{
  type = string
}}

variable "location" {{
  type = string
}}

variable "azure_client_id" {{
  type = string
}}

variable "azure_client_secret" {{
  type = string
  sensitive = true
}}

variable "azure_tenant_id" {{
  type = string
}}

variable "azure_subscription_id" {{
  type = string
}}

variable "app_service_plan_sku" {{
  type = string
  default = "B1"
}}

resource "azurerm_resource_group" "main" {{
  name     = "${{var.resource_name}}-rg"
  location = var.location
}}

resource "azurerm_app_service_plan" "main" {{
  name                = "${{var.resource_name}}-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "Linux"
  reserved            = true

  sku {{
    tier = "Basic"
    size = var.app_service_plan_sku
  }}
}}

resource "azurerm_app_service" "main" {{
  name                = "${{var.resource_name}}-app"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  app_service_plan_id = azurerm_app_service_plan.main.id

  site_config {{
    linux_fx_version = "DOCKER|nginx:latest"
  }}

  app_settings = {{
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }}
}}

output "app_url" {{
  value = "https://${{azurerm_app_service.main.default_site_hostname}}"
}}
"""

    elif infra_type == "kubernetes":
        node_count = config.get("nodeCount", 2)
        return f"""
terraform {{
  required_providers {{
    azurerm = {{
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }}
  }}
}}

provider "azurerm" {{
  features {{
    resource_group {{
      prevent_deletion_if_contains_resources = false
    }}
  }}
  
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}}

variable "resource_name" {{
  type = string
}}

variable "location" {{
  type = string
}}

variable "azure_client_id" {{
  type = string
}}

variable "azure_client_secret" {{
  type = string
  sensitive = true
}}

variable "azure_tenant_id" {{
  type = string
}}

variable "azure_subscription_id" {{
  type = string
}}

variable "node_count" {{
  type = number
  default = 2
}}

resource "azurerm_resource_group" "main" {{
  name     = "${{var.resource_name}}-rg"
  location = var.location
}}

resource "azurerm_kubernetes_cluster" "main" {{
  name                = "${{var.resource_name}}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${{var.resource_name}}"

  default_node_pool {{
    name       = "default"
    node_count = var.node_count
    vm_size    = "Standard_D2_v2"
  }}

  identity {{
    type = "SystemAssigned"
  }}
}}

output "kube_config" {{
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}}

output "host" {{
  value = azurerm_kubernetes_cluster.main.kube_config.0.host
}}
"""

    else:  # vm
        vm_size = config.get("size", "Standard_B1s")
        return f"""
terraform {{
  required_providers {{
    azurerm = {{
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }}
  }}
}}

provider "azurerm" {{
  features {{}}
  
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}}

variable "resource_name" {{
  type = string
}}

variable "location" {{
  type = string
}}

variable "azure_client_id" {{
  type = string
}}

variable "azure_client_secret" {{
  type = string
  sensitive = true
}}

variable "azure_tenant_id" {{
  type = string
}}

variable "azure_subscription_id" {{
  type = string
}}

variable "vm_size" {{
  type = string
  default = "Standard_B1s"
}}

resource "azurerm_resource_group" "main" {{
  name     = "${{var.resource_name}}-rg"
  location = var.location
}}

resource "azurerm_virtual_network" "main" {{
  name                = "${{var.resource_name}}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}}

resource "azurerm_subnet" "main" {{
  name                 = "${{var.resource_name}}-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}}

resource "azurerm_network_interface" "main" {{
  name                = "${{var.resource_name}}-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {{
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }}
}}

resource "azurerm_public_ip" "main" {{
  name                = "${{var.resource_name}}-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
}}

resource "azurerm_linux_virtual_machine" "main" {{
  name                = "${{var.resource_name}}-vm"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  size                = var.vm_size
  admin_username      = "adminuser"

  network_interface_ids = [
    azurerm_network_interface.main.id,
  ]

  admin_ssh_key {{
    username   = "adminuser"
    public_key = file("~/.ssh/id_rsa.pub")  # In production, use a proper key management
  }}

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }}

  source_image_reference {{
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }}
}}

output "vm_public_ip" {{
  value = azurerm_public_ip.main.ip_address
}}
"""
