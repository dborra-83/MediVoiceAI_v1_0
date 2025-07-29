output "upload_audio_function_arn" {
  description = "ARN de la función Lambda para subida de audio"
  value       = aws_lambda_function.upload_audio.arn
}

output "upload_audio_invoke_arn" {
  description = "ARN de invocación de la función Lambda para subida de audio"
  value       = aws_lambda_function.upload_audio.invoke_arn
}

output "process_audio_function_arn" {
  description = "ARN de la función Lambda para procesamiento de audio"
  value       = aws_lambda_function.process_audio.arn
}

output "process_audio_invoke_arn" {
  description = "ARN de invocación de la función Lambda para procesamiento de audio"
  value       = aws_lambda_function.process_audio.invoke_arn
}

output "generate_pdf_function_arn" {
  description = "ARN de la función Lambda para generación de PDF"
  value       = aws_lambda_function.generate_pdf.arn
}

output "generate_pdf_invoke_arn" {
  description = "ARN de invocación de la función Lambda para generación de PDF"
  value       = aws_lambda_function.generate_pdf.invoke_arn
}

output "get_history_function_arn" {
  description = "ARN de la función Lambda para historial"
  value       = aws_lambda_function.get_history.arn
}

output "get_history_invoke_arn" {
  description = "ARN de invocación de la función Lambda para historial"
  value       = aws_lambda_function.get_history.invoke_arn
}

output "function_arns" {
  description = "ARNs de todas las funciones Lambda"
  value = {
    upload_audio  = aws_lambda_function.upload_audio.arn
    process_audio = aws_lambda_function.process_audio.arn
    generate_pdf  = aws_lambda_function.generate_pdf.arn
    get_history   = aws_lambda_function.get_history.arn
  }
}

output "lambda_role_arn" {
  description = "ARN del rol de IAM para Lambda"
  value       = aws_iam_role.lambda_role.arn
} 