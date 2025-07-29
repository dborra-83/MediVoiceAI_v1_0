output "consultations_table_name" {
  description = "Nombre de la tabla de consultas"
  value       = aws_dynamodb_table.consultations.name
}

output "consultations_table_arn" {
  description = "ARN de la tabla de consultas"
  value       = aws_dynamodb_table.consultations.arn
}

output "prompts_table_name" {
  description = "Nombre de la tabla de prompts"
  value       = aws_dynamodb_table.prompts.name
}

output "prompts_table_arn" {
  description = "ARN de la tabla de prompts"
  value       = aws_dynamodb_table.prompts.arn
}

output "doctors_table_name" {
  description = "Nombre de la tabla de doctores"
  value       = aws_dynamodb_table.doctors.name
}

output "doctors_table_arn" {
  description = "ARN de la tabla de doctores"
  value       = aws_dynamodb_table.doctors.arn
} 