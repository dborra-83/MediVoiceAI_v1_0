variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "cognito_pool_arn" {
  description = "ARN del User Pool de Cognito"
  type        = string
}

variable "upload_audio_lambda_invoke_arn" {
  description = "ARN de invocación de la función Lambda para subida de audio"
  type        = string
}

variable "process_audio_lambda_invoke_arn" {
  description = "ARN de invocación de la función Lambda para procesamiento de audio"
  type        = string
}

variable "generate_pdf_lambda_invoke_arn" {
  description = "ARN de invocación de la función Lambda para generación de PDF"
  type        = string
}

variable "get_history_lambda_invoke_arn" {
  description = "ARN de invocación de la función Lambda para historial"
  type        = string
}

# Function ARNs (para permissions)
variable "upload_audio_lambda_function_arn" {
  description = "ARN de la función Lambda para subida de audio"
  type        = string
}

variable "process_audio_lambda_function_arn" {
  description = "ARN de la función Lambda para procesamiento de audio"
  type        = string
}

variable "generate_pdf_lambda_function_arn" {
  description = "ARN de la función Lambda para generación de PDF"
  type        = string
}

variable "get_history_lambda_function_arn" {
  description = "ARN de la función Lambda para historial"
  type        = string
} 