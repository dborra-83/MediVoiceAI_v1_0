# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "API Gateway para MediVoice AI"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Authorizer de Cognito
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${var.project_name}-${var.environment}-cognito-authorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  provider_arns = [var.cognito_pool_arn]
}

# Recurso raíz
resource "aws_api_gateway_resource" "root" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

# Recurso para audio
resource "aws_api_gateway_resource" "audio" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.root.id
  path_part   = "audio"
}

# Recurso para procesamiento
resource "aws_api_gateway_resource" "process" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.audio.id
  path_part   = "process"
}

# Recurso para PDFs
resource "aws_api_gateway_resource" "pdf" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.root.id
  path_part   = "pdf"
}

# Recurso para historial
resource "aws_api_gateway_resource" "history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.root.id
  path_part   = "history"
}

# Método POST para subida de audio
resource "aws_api_gateway_method" "upload_audio" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.audio.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# Método POST para procesamiento de audio
resource "aws_api_gateway_method" "process_audio" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.process.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# Método POST para generación de PDF
resource "aws_api_gateway_method" "generate_pdf" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.pdf.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# Método GET para historial
resource "aws_api_gateway_method" "get_history" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# Método OPTIONS para CORS (subida de audio)
resource "aws_api_gateway_method" "options_audio" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.audio.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Método OPTIONS para CORS (procesamiento)
resource "aws_api_gateway_method" "options_process" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.process.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Método OPTIONS para CORS (PDF)
resource "aws_api_gateway_method" "options_pdf" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.pdf.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Método OPTIONS para CORS (historial)
resource "aws_api_gateway_method" "options_history" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integración Lambda para subida de audio
resource "aws_api_gateway_integration" "upload_audio" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.audio.id
  http_method = aws_api_gateway_method.upload_audio.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.upload_audio_lambda_invoke_arn
}

# Integración Lambda para procesamiento de audio
resource "aws_api_gateway_integration" "process_audio" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_audio.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.process_audio_lambda_invoke_arn
}

# Integración Lambda para generación de PDF
resource "aws_api_gateway_integration" "generate_pdf" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pdf.id
  http_method = aws_api_gateway_method.generate_pdf.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.generate_pdf_lambda_invoke_arn
}

# Integración Lambda para historial
resource "aws_api_gateway_integration" "get_history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.get_history.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.get_history_lambda_invoke_arn
}

# Respuestas CORS para OPTIONS (una por recurso)
resource "aws_api_gateway_method_response" "options_audio_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.audio.id
  http_method = aws_api_gateway_method.options_audio.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "options_process_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.options_process.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "options_pdf_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pdf.id
  http_method = aws_api_gateway_method.options_pdf.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "options_history_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.options_history.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Integraciones CORS para OPTIONS (una por recurso)
resource "aws_api_gateway_integration" "options_audio" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.audio.id
  http_method = aws_api_gateway_method.options_audio.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "options_process" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.options_process.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "options_pdf" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pdf.id
  http_method = aws_api_gateway_method.options_pdf.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "options_history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.options_history.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Respuestas de integración CORS
resource "aws_api_gateway_integration_response" "options_audio" {
  depends_on = [aws_api_gateway_integration.options_audio]
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.audio.id
  http_method = aws_api_gateway_method.options_audio.http_method
  status_code = aws_api_gateway_method_response.options_audio_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "options_process" {
  depends_on = [aws_api_gateway_integration.options_process]
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.options_process.http_method
  status_code = aws_api_gateway_method_response.options_process_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "options_pdf" {
  depends_on = [aws_api_gateway_integration.options_pdf]
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.pdf.id
  http_method = aws_api_gateway_method.options_pdf.http_method
  status_code = aws_api_gateway_method_response.options_pdf_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "options_history" {
  depends_on = [aws_api_gateway_integration.options_history]
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.options_history.http_method
  status_code = aws_api_gateway_method_response.options_history_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Deployment de la API
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.upload_audio,
    aws_api_gateway_integration.process_audio,
    aws_api_gateway_integration.generate_pdf,
    aws_api_gateway_integration.get_history,
    aws_api_gateway_integration.options_audio,
    aws_api_gateway_integration.options_process,
    aws_api_gateway_integration.options_pdf,
    aws_api_gateway_integration.options_history
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  lifecycle {
    create_before_destroy = true
  }
}

# Stage de la API
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-stage"
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch Log Group para API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${aws_api_gateway_rest_api.main.name}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-gateway-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Role para CloudWatch Logs (temporalmente deshabilitado)
# resource "aws_iam_role" "cloudwatch" {
#   name = "${var.project_name}-${var.environment}-cloudwatch-role"
# 
#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "apigateway.amazonaws.com"
#         }
#       }
#     ]
#   })
# }

# Política para CloudWatch Logs (temporalmente deshabilitada)
# resource "aws_iam_role_policy" "cloudwatch" {
#   name = "${var.project_name}-${var.environment}-cloudwatch-policy"
#   role = aws_iam_role.cloudwatch.id
# 
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect = "Allow"
#         Action = [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:DescribeLogGroups",
#           "logs:DescribeLogStreams",
#           "logs:PutLogEvents",
#           "logs:GetLogEvents",
#           "logs:FilterLogEvents"
#         ]
#         Resource = "*"
#       }
#     ]
#   })
# }

# Data sources para obtener información de AWS
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Lambda permissions para que API Gateway pueda invocar las funciones
resource "aws_lambda_permission" "upload_audio" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.upload_audio_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.main.id}/*/*"
}

resource "aws_lambda_permission" "process_audio" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.process_audio_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.main.id}/*/*"
}

resource "aws_lambda_permission" "generate_pdf" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.generate_pdf_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.main.id}/*/*"
}

resource "aws_lambda_permission" "get_history" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.get_history_lambda_function_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.main.id}/*/*"
} 