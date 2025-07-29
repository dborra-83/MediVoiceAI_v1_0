# Política de IAM para acceso a Bedrock
resource "aws_iam_policy" "bedrock_access" {
  name        = "${var.project_name}-${var.environment}-bedrock-access"
  description = "Política para acceso a Amazon Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-opus-20240229-v1:0"
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-bedrock-access"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Política para acceso a Transcribe Medical
resource "aws_iam_policy" "transcribe_medical_access" {
  name        = "${var.project_name}-${var.environment}-transcribe-medical-access"
  description = "Política para acceso a Amazon Transcribe Medical"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartMedicalTranscriptionJob",
          "transcribe:GetMedicalTranscriptionJob",
          "transcribe:ListMedicalTranscriptionJobs",
          "transcribe:DeleteMedicalTranscriptionJob"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-transcribe-medical-access"
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch Log Group para Bedrock
resource "aws_cloudwatch_log_group" "bedrock" {
  name              = "/aws/bedrock/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-bedrock-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Role para logging de Bedrock (temporalmente deshabilitado)
# resource "aws_iam_role" "bedrock_logging" {
#   name = "${var.project_name}-${var.environment}-bedrock-logging-role"
# 
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "bedrock.amazonaws.com"
#         }
#       }
#     ]
#   })
# 
#   tags = {
#     Name        = "${var.project_name}-${var.environment}-bedrock-logging-role"
#     Environment = var.environment
#     Project     = var.project_name
#   }
# }

# Política para CloudWatch Logs (temporalmente deshabilitada)
# resource "aws_iam_role_policy" "bedrock_cloudwatch" {
#   name = "${var.project_name}-${var.environment}-bedrock-cloudwatch-policy"
#   role = aws_iam_role.bedrock_logging.id
# 
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:PutLogEvents"
#         ]
#         Resource = [
#           "arn:aws:logs:*:*:log-group:/aws/bedrock/${var.project_name}-${var.environment}",
#           "arn:aws:logs:*:*:log-group:/aws/bedrock/${var.project_name}-${var.environment}:*"
#         ]
#       }
#     ]
#   })
# }

# Política para S3 (temporalmente deshabilitada)
# resource "aws_iam_role_policy" "bedrock_s3" {
#   name = "${var.project_name}-${var.environment}-bedrock-s3-policy"
#   role = aws_iam_role.bedrock_logging.id
# 
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "s3:PutObject",
#           "s3:GetObject",
#           "s3:ListBucket"
#         ]
#         Resource = [
#           "arn:aws:s3:::${var.project_name}-${var.environment}-bedrock-logs",
#           "arn:aws:s3:::${var.project_name}-${var.environment}-bedrock-logs/*"
#         ]
#       }
#     ]
#   })
# }

# Bucket S3 para logs de Bedrock
resource "aws_s3_bucket" "bedrock_logs" {
  bucket = "${var.project_name}-${var.environment}-bedrock-logs"

  tags = {
    Name        = "${var.project_name}-${var.environment}-bedrock-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Configuración de encriptación para bucket de logs
resource "aws_s3_bucket_server_side_encryption_configuration" "bedrock_logs" {
  bucket = aws_s3_bucket.bedrock_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Configuración de versioning para bucket de logs
resource "aws_s3_bucket_versioning" "bedrock_logs" {
  bucket = aws_s3_bucket.bedrock_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configuración de lifecycle para bucket de logs
resource "aws_s3_bucket_lifecycle_configuration" "bedrock_logs" {
  bucket = aws_s3_bucket.bedrock_logs.id

  rule {
    id     = "bedrock-logs-lifecycle"
    status = "Enabled"
    
    filter {
      prefix = ""
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
} 