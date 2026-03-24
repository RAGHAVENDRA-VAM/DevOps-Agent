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
variable "sku"            { type = string; default = "B1" }
variable "runtime"        { type = string; default = "NODE|20-lts" }

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

resource "azurerm_service_plan" "plan" {
  name                = "${var.app_name}-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = var.sku
}

resource "azurerm_linux_web_app" "app" {
  name                = var.app_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
  }
}

output "app_url" {
  value       = "https://${azurerm_linux_web_app.app.default_hostname}"
  description = "Public URL of the deployed web app"
}

output "resource_group" {
  value = azurerm_resource_group.rg.name
}
