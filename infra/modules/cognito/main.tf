# User Pool de Cognito
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  username_attributes = ["email"]
  username_configuration {
    case_sensitive = false
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-user-pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

# App Client de Cognito
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  supported_identity_providers = ["COGNITO"]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  prevent_user_existence_errors = "ENABLED"
}

# Dominio personalizado de Cognito
resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# Identity Pool de Cognito
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name = "${var.project_name}-${var.environment}-identity-pool"

  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-identity-pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Role para usuarios autenticados (temporalmente deshabilitado)
# resource "aws_iam_role" "authenticated" {
#   name = "${var.project_name}-${var.environment}-cognito-authenticated-role"
# 
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRoleWithWebIdentity"
#         Effect = "Allow"
#         Principal = {
#           Federated = "cognito-identity.amazonaws.com"
#         }
#         Condition = {
#           StringEquals = {
#             "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
#           }
#           "ForAnyValue:StringLike" = {
#             "cognito-identity.amazonaws.com:amr" = "authenticated"
#           }
#         }
#       }
#     ]
#   })
# 
#   tags = {
#     Name        = "${var.project_name}-${var.environment}-cognito-authenticated-role"
#     Environment = var.environment
#     Project     = var.project_name
#   }
# }

# IAM Role para usuarios no autenticados (temporalmente deshabilitado)
# resource "aws_iam_role" "unauthenticated" {
#   name = "${var.project_name}-${var.environment}-cognito-unauthenticated-role"
# 
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRoleWithWebIdentity"
#         Effect = "Allow"
#         Principal = {
#           Federated = "cognito-identity.amazonaws.com"
#         }
#         Condition = {
#           StringEquals = {
#             "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
#           }
#           "ForAnyValue:StringLike" = {
#             "cognito-identity.amazonaws.com:amr" = "unauthenticated"
#           }
#         }
#       }
#     ]
#   })
# 
#   tags = {
#     Name        = "${var.project_name}-${var.environment}-cognito-unauthenticated-role"
#     Environment = var.environment
#     Project     = var.project_name
#   }
# }

# Attach roles al Identity Pool (temporalmente deshabilitado)
# resource "aws_cognito_identity_pool_roles_attachment" "main" {
#   identity_pool_id = aws_cognito_identity_pool.main.id
# 
#   roles = {
#     authenticated   = aws_iam_role.authenticated.arn
#     unauthenticated = aws_iam_role.unauthenticated.arn
#   }
# }

# Política para usuarios autenticados (temporalmente deshabilitada)
# resource "aws_iam_role_policy" "authenticated" {
#   name = "${var.project_name}-${var.environment}-authenticated-policy"
#   role = aws_iam_role.authenticated.id
# 
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "s3:GetObject",
#           "s3:PutObject",
#           "s3:DeleteObject"
#         ]
#         Resource = [
#           "arn:aws:s3:::${var.project_name}-${var.environment}-audio/*",
#           "arn:aws:s3:::${var.project_name}-${var.environment}-pdfs/*"
#         ]
#       },
#       {
#         Effect = "Allow"
#         Action = [
#           "execute-api:Invoke"
#         ]
#         Resource = [
#           "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/*/*"
#         ]
#       }
#     ]
#   })
# }

# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {} 