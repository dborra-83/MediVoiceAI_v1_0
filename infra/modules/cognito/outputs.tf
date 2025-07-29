output "user_pool_id" {
  description = "ID del User Pool de Cognito"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN del User Pool de Cognito"
  value       = aws_cognito_user_pool.main.arn
}

output "client_id" {
  description = "ID del App Client de Cognito"
  value       = aws_cognito_user_pool_client.main.id
}

output "domain" {
  description = "Dominio de Cognito"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "identity_pool_id" {
  description = "ID del Identity Pool de Cognito"
  value       = aws_cognito_identity_pool.main.id
}

# output "authenticated_role_arn" {
#   description = "ARN del rol para usuarios autenticados"
#   value       = aws_iam_role.authenticated.arn
# }

# output "unauthenticated_role_arn" {
#   description = "ARN del rol para usuarios no autenticados"
#   value       = aws_iam_role.unauthenticated.arn
# } 