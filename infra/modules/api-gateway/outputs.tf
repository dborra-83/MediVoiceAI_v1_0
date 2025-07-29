output "api_id" {
  description = "ID de la API Gateway"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_url" {
  description = "URL base de la API Gateway"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}"
}

output "api_execution_arn" {
  description = "ARN de ejecución de la API Gateway"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "authorizer_id" {
  description = "ID del authorizer de Cognito"
  value       = aws_api_gateway_authorizer.cognito.id
}

output "stage_name" {
  description = "Nombre del stage de la API"
  value       = aws_api_gateway_stage.main.stage_name
} 