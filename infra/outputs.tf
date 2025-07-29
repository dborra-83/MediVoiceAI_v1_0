# Outputs de Cognito
output "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "ID del App Client de Cognito"
  value       = module.cognito.client_id
}

output "cognito_user_pool_arn" {
  description = "ARN del User Pool de Cognito"
  value       = module.cognito.user_pool_arn
}

output "cognito_domain" {
  description = "Dominio de Cognito"
  value       = module.cognito.domain
}

output "cognito_identity_pool_id" {
  description = "ID del Identity Pool de Cognito"
  value       = module.cognito.identity_pool_id
}

# Outputs de S3
output "audio_bucket_name" {
  description = "Nombre del bucket de audio"
  value       = module.s3.audio_bucket_name
}

output "pdf_bucket_name" {
  description = "Nombre del bucket de PDFs"
  value       = module.s3.pdf_bucket_name
}

# Outputs de DynamoDB
output "consultations_table_name" {
  description = "Nombre de la tabla de consultas"
  value       = module.dynamodb.consultations_table_name
}

output "prompts_table_name" {
  description = "Nombre de la tabla de prompts"
  value       = module.dynamodb.prompts_table_name
}

output "doctors_table_name" {
  description = "Nombre de la tabla de doctores"
  value       = module.dynamodb.doctors_table_name
}

# Outputs de API Gateway
output "api_gateway_id" {
  description = "ID de la API Gateway"
  value       = module.api_gateway.api_id
}

output "api_gateway_url" {
  description = "URL base de la API Gateway"
  value       = module.api_gateway.api_url
}

output "api_gateway_authorizer_id" {
  description = "ID del Authorizer de Cognito"
  value       = module.api_gateway.authorizer_id
}

# Outputs de Lambda
output "lambda_functions" {
  description = "ARNs de las funciones Lambda"
  value       = module.lambda.function_arns
}

# Outputs de Bedrock
output "bedrock_model_arn" {
  description = "ARN del modelo de Bedrock"
  value       = module.bedrock.model_arn
}

# Outputs de configuración para frontend
output "frontend_config" {
  description = "Configuración para el frontend"
  value = {
    region              = var.aws_region
    user_pool_id        = module.cognito.user_pool_id
    client_id           = module.cognito.client_id
    identity_pool_id    = module.cognito.identity_pool_id
    api_url             = module.api_gateway.api_url
    audio_bucket        = module.s3.audio_bucket_name
    pdf_bucket          = module.s3.pdf_bucket_name
  }
}

# Outputs de URLs importantes
output "cognito_hosted_ui_url" {
  description = "URL de la UI hospedada de Cognito"
  value       = "https://${module.cognito.domain}.auth.${var.aws_region}.amazoncognito.com/login?client_id=${module.cognito.client_id}&response_type=code&scope=openid+email+profile&redirect_uri=${var.cognito_callback_urls[0]}"
}

output "api_documentation_url" {
  description = "URL de documentación de la API"
  value       = "${module.api_gateway.api_url}/docs"
} 