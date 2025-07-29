variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "callback_urls" {
  description = "URLs de callback para Cognito"
  type        = list(string)
}

variable "logout_urls" {
  description = "URLs de logout para Cognito"
  type        = list(string)
}

variable "domain_prefix" {
  description = "Prefijo para el dominio de Cognito"
  type        = string
} 