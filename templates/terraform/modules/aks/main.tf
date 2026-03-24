terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

variable "app_name"       { type = string }
variable "location"       { type = string; default = "eastus" }
variable "node_count"     { type = number; default = 2 }
variable "node_size"      { type = string; default = "Standard_D2s_v3" }

variable "azure_client_id"       { type = string }
variable "azure_client_secret"   { type = string; sensitive = true }
variable "azure_tenant_id"       { type = string }
variable "azure_subscription_id" { type = string }

provider "azurerm" {
  features {}
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.app_name}-rg"
  location = var.location
}

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${var.app_name}-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = var.app_name

  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.node_size
  }

  identity {
    type = "SystemAssigned"
  }
}

output "app_url" {
  value       = "https://${azurerm_kubernetes_cluster.aks.fqdn}"
  description = "AKS API server FQDN"
}

output "resource_group" {
  value = azurerm_resource_group.rg.name
}
