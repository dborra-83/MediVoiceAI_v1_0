# Data sources para obtener información del AWS actual
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# IAM Role para las funciones Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Política para permisos básicos de Lambda
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Política para permisos de S3
resource "aws_iam_role_policy" "lambda_s3" {
  name = "${var.project_name}-${var.environment}-lambda-s3-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.audio_bucket_name}",
          "arn:aws:s3:::${var.audio_bucket_name}/*",
          "arn:aws:s3:::${var.pdf_bucket_name}",
          "arn:aws:s3:::${var.pdf_bucket_name}/*"
        ]
      }
    ]
  })
}

# Política para permisos de DynamoDB
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-${var.environment}-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.consultations_table}",
          "arn:aws:dynamodb:*:*:table/${var.consultations_table}/index/*",
          "arn:aws:dynamodb:*:*:table/${var.prompts_table}",
          "arn:aws:dynamodb:*:*:table/${var.prompts_table}/index/*",
          "arn:aws:dynamodb:*:*:table/${var.doctors_table}",
          "arn:aws:dynamodb:*:*:table/${var.doctors_table}/index/*"
        ]
      }
    ]
  })
}

# Política para permisos de Transcribe
resource "aws_iam_role_policy" "lambda_transcribe" {
  name = "${var.project_name}-${var.environment}-lambda-transcribe-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartMedicalTranscriptionJob",
          "transcribe:GetMedicalTranscriptionJob",
          "transcribe:ListMedicalTranscriptionJobs"
        ]
        Resource = "*"
      }
    ]
  })
}

# Política para permisos de Bedrock
resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "${var.project_name}-${var.environment}-lambda-bedrock-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
        ]
      }
    ]
  })
}

# Nota: Las funciones Lambda no necesitan permisos para invocar API Gateway
# ya que es API Gateway quien invoca a Lambda, no al revés

# CloudWatch Log Group para Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Archive files para crear ZIPs automáticamente
data "archive_file" "upload_audio" {
  type        = "zip"
  source_dir  = "${path.module}/functions/upload-audio"
  output_path = "${path.module}/functions/upload-audio.zip"
}

data "archive_file" "process_audio" {
  type        = "zip"
  source_dir  = "${path.module}/functions/process-audio"
  output_path = "${path.module}/functions/process-audio.zip"
}

data "archive_file" "generate_pdf" {
  type        = "zip"
  source_dir  = "${path.module}/functions/generate-pdf"
  output_path = "${path.module}/functions/generate-pdf.zip"
}

data "archive_file" "get_history" {
  type        = "zip"
  source_dir  = "${path.module}/functions/get-history"
  output_path = "${path.module}/functions/get-history.zip"
}

# Función Lambda para subida de audio
resource "aws_lambda_function" "upload_audio" {
  filename         = data.archive_file.upload_audio.output_path
  function_name    = "${var.project_name}-${var.environment}-upload-audio"
  role            = aws_iam_role.lambda_role.arn
  handler         = "uploadAudio.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512
  source_code_hash = data.archive_file.upload_audio.output_base64sha256

  environment {
    variables = {
      AUDIO_BUCKET_NAME = var.audio_bucket_name
      ENVIRONMENT       = var.environment
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-upload-audio"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Función Lambda para procesamiento de audio
resource "aws_lambda_function" "process_audio" {
  filename         = data.archive_file.process_audio.output_path
  function_name    = "${var.project_name}-${var.environment}-process-audio"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300
  memory_size     = 1024
  source_code_hash = data.archive_file.process_audio.output_base64sha256

  environment {
    variables = {
      AUDIO_BUCKET_NAME      = var.audio_bucket_name
      PDF_BUCKET_NAME        = var.pdf_bucket_name
      CONSULTATIONS_TABLE    = var.consultations_table
      PROMPTS_TABLE          = var.prompts_table
      DOCTORS_TABLE          = var.doctors_table
      ENVIRONMENT            = var.environment
      BEDROCK_MODEL_ID      = "anthropic.claude-3-sonnet-20240229-v1:0"
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-process-audio"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Función Lambda para generación de PDF
resource "aws_lambda_function" "generate_pdf" {
  filename         = data.archive_file.generate_pdf.output_path
  function_name    = "${var.project_name}-${var.environment}-generate-pdf"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 512
  source_code_hash = data.archive_file.generate_pdf.output_base64sha256

  environment {
    variables = {
      PDF_BUCKET_NAME     = var.pdf_bucket_name
      CONSULTATIONS_TABLE = var.consultations_table
      DOCTORS_TABLE       = var.doctors_table
      ENVIRONMENT         = var.environment
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-generate-pdf"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Función Lambda para historial
resource "aws_lambda_function" "get_history" {
  filename         = data.archive_file.get_history.output_path
  function_name    = "${var.project_name}-${var.environment}-get-history"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512
  source_code_hash = data.archive_file.get_history.output_base64sha256

  environment {
    variables = {
      CONSULTATIONS_TABLE = var.consultations_table
      DOCTORS_TABLE       = var.doctors_table
      ENVIRONMENT         = var.environment
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-get-history"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Permisos para que API Gateway invoque las funciones Lambda
# Las Lambda permissions se manejan en el módulo API Gateway para evitar dependencias circulares 