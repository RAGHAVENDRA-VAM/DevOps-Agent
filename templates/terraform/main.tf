terraform {
  required_version = ">= 1.7.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}

  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
  tenant_id       = var.azure_tenant_id
  subscription_id = var.azure_subscription_id
}

variable "azure_client_id" {
  type        = string
  description = "Azure AD application (client) ID"
}

variable "azure_client_secret" {
  type        = string
  description = "Azure AD application client secret"
  sensitive   = true
}

variable "azure_tenant_id" {
  type        = string
  description = "Azure AD tenant ID"
}

variable "azure_subscription_id" {
  type        = string
  description = "Azure subscription ID"
}

variable "app_name" {
  type        = string
  description = "Base name for app resources"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

resource "azurerm_resource_group" "rg" {
  name     = "${var.app_name}-rg"
  location = var.location
}

resource "azurerm_container_group" "app" {
  name                = "${var.app_name}-acg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  ip_address_type     = "Public"
  os_type             = "Linux"

  container {
    name   = "app"
    image  = var.container_image
    cpu    = 1
    memory = 1.5

    ports {
      port     = 80
      protocol = "TCP"
    }
  }
}

variable "container_image" {
  type        = string
  description = "Container image to deploy"
}

output "app_fqdn" {
  value       = azurerm_container_group.app.fqdn
  description = "Public FQDN of the deployed app"
}

