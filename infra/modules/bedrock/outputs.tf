output "bedrock_access_policy_arn" {
  description = "ARN de la política de acceso a Bedrock"
  value       = aws_iam_policy.bedrock_access.arn
}

output "transcribe_medical_policy_arn" {
  description = "ARN de la política de acceso a Transcribe Medical"
  value       = aws_iam_policy.transcribe_medical_access.arn
}

# output "bedrock_logging_role_arn" {
#   description = "ARN del rol de logging de Bedrock"
#   value       = aws_iam_role.bedrock_logging.arn
# }

output "model_arn" {
  description = "ARN del modelo de Bedrock"
  value       = "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
}

output "bedrock_logs_bucket_name" {
  description = "Nombre del bucket de logs de Bedrock"
  value       = aws_s3_bucket.bedrock_logs.bucket
}

output "bedrock_log_group_name" {
  description = "Nombre del grupo de logs de Bedrock"
  value       = aws_cloudwatch_log_group.bedrock.name
} 