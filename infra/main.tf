terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
  
  backend "s3" {
    bucket = "medivoice-terraform-state"
    key    = "medivoice-ai/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "MediVoiceAI"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Módulo de Cognito
module "cognito" {
  source = "./modules/cognito"
  
  environment   = var.environment
  project_name  = var.project_name
  domain_prefix = var.cognito_domain_prefix
  callback_urls = var.cognito_callback_urls
  logout_urls   = var.cognito_logout_urls
}

# Módulo de S3
module "s3" {
  source = "./modules/s3"
  
  environment  = var.environment
  project_name = var.project_name
}

# Módulo de DynamoDB
module "dynamodb" {
  source = "./modules/dynamodb"
  
  environment  = var.environment
  project_name = var.project_name
}

# Módulo de Lambda (crear primero para obtener ARNs)
module "lambda" {
  source = "./modules/lambda"
  
  environment         = var.environment
  project_name        = var.project_name
  audio_bucket_name   = module.s3.audio_bucket_name
  pdf_bucket_name     = module.s3.pdf_bucket_name
  consultations_table = module.dynamodb.consultations_table_name
  prompts_table       = module.dynamodb.prompts_table_name
  doctors_table       = module.dynamodb.doctors_table_name
}

# Módulo de API Gateway (crear después para usar ARNs de Lambda)
module "api_gateway" {
  source = "./modules/api-gateway"
  
  environment                       = var.environment
  project_name                      = var.project_name
  cognito_pool_arn                  = module.cognito.user_pool_arn
  upload_audio_lambda_invoke_arn    = module.lambda.upload_audio_invoke_arn
  process_audio_lambda_invoke_arn   = module.lambda.process_audio_invoke_arn
  generate_pdf_lambda_invoke_arn    = module.lambda.generate_pdf_invoke_arn
  get_history_lambda_invoke_arn     = module.lambda.get_history_invoke_arn
  upload_audio_lambda_function_arn  = module.lambda.upload_audio_function_arn
  process_audio_lambda_function_arn = module.lambda.process_audio_function_arn
  generate_pdf_lambda_function_arn  = module.lambda.generate_pdf_function_arn
  get_history_lambda_function_arn   = module.lambda.get_history_function_arn
}

# Módulo de Bedrock
module "bedrock" {
  source = "./modules/bedrock"
  
  environment  = var.environment
  project_name = var.project_name
} 