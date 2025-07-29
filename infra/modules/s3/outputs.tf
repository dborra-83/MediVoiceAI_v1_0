output "audio_bucket_name" {
  description = "Nombre del bucket de audio"
  value       = aws_s3_bucket.audio.bucket
}

output "audio_bucket_arn" {
  description = "ARN del bucket de audio"
  value       = aws_s3_bucket.audio.arn
}

output "pdf_bucket_name" {
  description = "Nombre del bucket de PDFs"
  value       = aws_s3_bucket.pdfs.bucket
}

output "pdf_bucket_arn" {
  description = "ARN del bucket de PDFs"
  value       = aws_s3_bucket.pdfs.arn
} 