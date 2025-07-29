variable "aws_region" {
  description = "Región de AWS para desplegar recursos"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Ambiente de despliegue (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment debe ser dev, staging o prod."
  }
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "medivoice-ai"
}

variable "cognito_domain_prefix" {
  description = "Prefijo para el dominio de Cognito"
  type        = string
  default     = "medivoice"
}

variable "cognito_callback_urls" {
  description = "URLs de callback para Cognito"
  type        = list(string)
  default     = [
    "http://localhost:3000/callback",
    "http://localhost:5173/callback",
    "https://medivoice-ai-dev.s3-website-us-east-1.amazonaws.com/callback"
  ]
}

variable "cognito_logout_urls" {
  description = "URLs de logout para Cognito"
  type        = list(string)
  default     = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://medivoice-ai-dev.s3-website-us-east-1.amazonaws.com"
  ]
}

variable "lambda_timeout" {
  description = "Timeout para funciones Lambda (segundos)"
  type        = number
  default     = 300
}

variable "lambda_memory_size" {
  description = "Memoria para funciones Lambda (MB)"
  type        = number
  default     = 512
}

variable "api_gateway_rate_limit" {
  description = "Rate limit para API Gateway (requests por segundo)"
  type        = number
  default     = 100
}

variable "bedrock_model_id" {
  description = "ID del modelo de Bedrock a usar"
  type        = string
  default     = "anthropic.claude-3-sonnet-20240229-v1:0"
}

variable "transcribe_medical" {
  description = "Habilitar transcripción médica especializada"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_logs" {
  description = "Habilitar logs de CloudWatch"
  type        = bool
  default     = true
}

variable "enable_xray_tracing" {
  description = "Habilitar tracing con X-Ray"
  type        = bool
  default     = false
} 