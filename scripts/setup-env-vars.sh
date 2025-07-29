#!/bin/bash

# Script para configurar variables de entorno desde Terraform outputs
# Usado después del deploy de infraestructura

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para extraer valor de JSON
extract_json_value() {
    local json_file="$1"
    local key="$2"
    
    if [ -f "$json_file" ]; then
        # Usar grep y sed para extraer el valor
        grep "\"$key\"" "$json_file" | head -1 | sed 's/.*"value": "\([^"]*\)".*/\1/'
    else
        echo ""
    fi
}

# Función principal
setup_environment_variables() {
    local outputs_file="terraform-outputs.json"
    
    log_info "Configurando variables de entorno desde Terraform outputs..."
    
    # Verificar que existe el archivo de outputs
    if [ ! -f "$outputs_file" ]; then
        log_error "No se encontró $outputs_file"
        log_info "Ejecuta 'terraform output -json > terraform-outputs.json' desde el directorio infra/"
        exit 1
    fi
    
    # Extraer valores
    export AWS_REGION=$(extract_json_value "$outputs_file" "aws_region")
    export AUDIO_BUCKET_NAME=$(extract_json_value "$outputs_file" "audio_bucket_name")
    export PDF_BUCKET_NAME=$(extract_json_value "$outputs_file" "pdf_bucket_name")
    export CONSULTATIONS_TABLE=$(extract_json_value "$outputs_file" "consultations_table_name")
    export PROMPTS_TABLE=$(extract_json_value "$outputs_file" "prompts_table_name")
    export DOCTORS_TABLE=$(extract_json_value "$outputs_file" "doctors_table_name")
    export COGNITO_USER_POOL_ID=$(extract_json_value "$outputs_file" "cognito_user_pool_id")
    export COGNITO_CLIENT_ID=$(extract_json_value "$outputs_file" "cognito_client_id")
    export COGNITO_USER_POOL_ARN=$(extract_json_value "$outputs_file" "cognito_user_pool_arn")
    export API_GATEWAY_ID=$(extract_json_value "$outputs_file" "api_gateway_id")
    export API_GATEWAY_URL=$(extract_json_value "$outputs_file" "api_gateway_url")
    
    # Usar valores por defecto si están vacíos
    export AWS_REGION=${AWS_REGION:-us-east-1}
    export BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID:-anthropic.claude-3-sonnet-20240229-v1:0}
    export ENVIRONMENT=${ENVIRONMENT:-dev}
    export STAGE=${STAGE:-dev}
    
    log_success "Variables de entorno configuradas:"
    echo "  AWS_REGION: $AWS_REGION"
    echo "  AUDIO_BUCKET_NAME: $AUDIO_BUCKET_NAME"
    echo "  PDF_BUCKET_NAME: $PDF_BUCKET_NAME"
    echo "  CONSULTATIONS_TABLE: $CONSULTATIONS_TABLE"
    echo "  PROMPTS_TABLE: $PROMPTS_TABLE"
    echo "  DOCTORS_TABLE: $DOCTORS_TABLE"
    echo "  COGNITO_USER_POOL_ID: $COGNITO_USER_POOL_ID"
    echo "  COGNITO_CLIENT_ID: $COGNITO_CLIENT_ID"
    echo "  API_GATEWAY_URL: $API_GATEWAY_URL"
    
    # Crear archivo .env para el proyecto
    log_info "Creando archivo .env..."
    
    cat > .env << EOF
# Variables de entorno para MediVoice AI
# Generado automáticamente desde Terraform outputs

# AWS Configuration
AWS_REGION=$AWS_REGION
ENVIRONMENT=$ENVIRONMENT
STAGE=$STAGE

# Cognito
COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
COGNITO_USER_POOL_ARN=$COGNITO_USER_POOL_ARN

# API Gateway
API_GATEWAY_ID=$API_GATEWAY_ID
API_GATEWAY_URL=$API_GATEWAY_URL

# S3 Buckets
AUDIO_BUCKET_NAME=$AUDIO_BUCKET_NAME
PDF_BUCKET_NAME=$PDF_BUCKET_NAME

# DynamoDB Tables
CONSULTATIONS_TABLE=$CONSULTATIONS_TABLE
PROMPTS_TABLE=$PROMPTS_TABLE
DOCTORS_TABLE=$DOCTORS_TABLE

# Bedrock
BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID

# Frontend específico
VITE_AWS_REGION=$AWS_REGION
VITE_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
VITE_API_GATEWAY_URL=$API_GATEWAY_URL
VITE_AUDIO_BUCKET=$AUDIO_BUCKET_NAME
VITE_PDF_BUCKET=$PDF_BUCKET_NAME
EOF
    
    log_success "Archivo .env creado"
    
    # Crear configuración para el frontend
    log_info "Creando configuración del frontend..."
    
    cat > frontend/src/config.js << EOF
// Configuración AWS para MediVoice AI
// Generado automáticamente desde Terraform outputs

export const awsConfig = {
  region: '$AWS_REGION',
  userPoolId: '$COGNITO_USER_POOL_ID',
  userPoolWebClientId: '$COGNITO_CLIENT_ID',
  apiGatewayUrl: '$API_GATEWAY_URL',
  audioBucket: '$AUDIO_BUCKET_NAME',
  pdfBucket: '$PDF_BUCKET_NAME'
}

export default awsConfig
EOF
    
    log_success "Configuración del frontend creada en frontend/src/config.js"
    
    # Verificar que todas las variables importantes estén configuradas
    local missing_vars=()
    
    [ -z "$AUDIO_BUCKET_NAME" ] && missing_vars+=("AUDIO_BUCKET_NAME")
    [ -z "$COGNITO_USER_POOL_ID" ] && missing_vars+=("COGNITO_USER_POOL_ID")
    [ -z "$API_GATEWAY_URL" ] && missing_vars+=("API_GATEWAY_URL")
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Variables faltantes o vacías:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_warning "Verifica que el deploy de Terraform se completó correctamente"
    else
        log_success "✅ Todas las variables críticas están configuradas"
    fi
    
    return 0
}

# Verificar si se ejecuta como script principal
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_environment_variables "$@"
fi 