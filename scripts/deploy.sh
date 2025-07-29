#!/bin/bash

# Script de Deploy Automatizado para MediVoiceAI
# Autor: MediVoice AI Team
# Versión: 1.0

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes con colores
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

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log_info "Verificando prerrequisitos..."
    
    # Verificar AWS CLI
    if ! command_exists aws; then
        log_error "AWS CLI no está instalado. Por favor instálalo primero."
        echo "Guía: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    # Verificar configuración de AWS
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS CLI no está configurado. Ejecuta 'aws configure' primero."
        exit 1
    fi
    
    # Verificar Terraform
    if ! command_exists terraform; then
        log_error "Terraform no está instalado. Por favor instálalo primero."
        echo "Guía: https://learn.hashicorp.com/tutorials/terraform/install-cli"
        exit 1
    fi
    
    # Verificar Node.js
    if ! command_exists node; then
        log_error "Node.js no está instalado. Por favor instálalo primero."
        echo "Guía: https://nodejs.org/en/download/"
        exit 1
    fi
    
    # Verificar npm
    if ! command_exists npm; then
        log_error "npm no está instalado. Por favor instálalo primero."
        exit 1
    fi
    
    # Verificar Serverless Framework
    if ! command_exists serverless; then
        log_info "Instalando Serverless Framework..."
        npm install -g serverless
    fi
    
    log_success "Todos los prerrequisitos están instalados"
}

# Función para configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    if [ ! -f "infra/terraform.tfvars" ]; then
        log_warning "Archivo terraform.tfvars no encontrado. Copiando desde el ejemplo..."
        cp infra/terraform.tfvars.example infra/terraform.tfvars
        log_warning "Por favor edita infra/terraform.tfvars con tus valores antes de continuar."
        log_warning "Presiona Enter cuando hayas terminado de editar el archivo..."
        read -r
    fi
    
    # Cargar variables de terraform.tfvars
    source scripts/load_terraform_vars.sh
    
    log_success "Variables de entorno configuradas"
}

# Función para crear bucket de estado de Terraform
create_terraform_state_bucket() {
    log_info "Verificando bucket de estado de Terraform..."
    
    local bucket_name="medivoice-terraform-state"
    local region="${AWS_REGION:-us-east-1}"
    
    # Verificar si el bucket existe
    if ! aws s3 ls "s3://$bucket_name" >/dev/null 2>&1; then
        log_info "Creando bucket de estado de Terraform: $bucket_name"
        
        if [ "$region" = "us-east-1" ]; then
            aws s3 mb "s3://$bucket_name"
        else
            aws s3 mb "s3://$bucket_name" --region "$region"
        fi
        
        # Habilitar versionado
        aws s3api put-bucket-versioning \
            --bucket "$bucket_name" \
            --versioning-configuration Status=Enabled
        
        # Habilitar encriptación
        aws s3api put-bucket-encryption \
            --bucket "$bucket_name" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        log_success "Bucket de estado creado: $bucket_name"
    else
        log_success "Bucket de estado ya existe: $bucket_name"
    fi
}

# Función para desplegar infraestructura
deploy_infrastructure() {
    log_info "Desplegando infraestructura con Terraform..."
    
    cd infra
    
    # Inicializar Terraform
    log_info "Inicializando Terraform..."
    terraform init
    
    # Validar configuración
    log_info "Validando configuración de Terraform..."
    terraform validate
    
    # Planificar cambios
    log_info "Planificando cambios..."
    terraform plan -out=tfplan
    
    # Aplicar cambios
    log_info "Aplicando cambios..."
    terraform apply tfplan
    
    # Obtener outputs
    log_info "Obteniendo outputs de Terraform..."
    terraform output -json > ../terraform-outputs.json
    
    cd ..
    
    log_success "Infraestructura desplegada exitosamente"
}

# Función para instalar dependencias del backend
install_backend_dependencies() {
    log_info "Instalando dependencias del backend..."
    
    cd backend
    npm install
    cd ..
    
    log_success "Dependencias del backend instaladas"
}

# Función para configurar variables de entorno del backend
setup_backend_environment() {
    log_info "Configurando variables de entorno del backend..."
    
    # Leer outputs de Terraform
    if [ -f "terraform-outputs.json" ]; then
        # Extraer valores usando jq
        export AUDIO_BUCKET_NAME=$(cat terraform-outputs.json | grep -o '"audio_bucket_name"[^,]*' | cut -d'"' -f4)
        export PDF_BUCKET_NAME=$(cat terraform-outputs.json | grep -o '"pdf_bucket_name"[^,]*' | cut -d'"' -f4)
        export CONSULTATIONS_TABLE=$(cat terraform-outputs.json | grep -o '"consultations_table_name"[^,]*' | cut -d'"' -f4)
        export PROMPTS_TABLE=$(cat terraform-outputs.json | grep -o '"prompts_table_name"[^,]*' | cut -d'"' -f4)
        export DOCTORS_TABLE=$(cat terraform-outputs.json | grep -o '"doctors_table_name"[^,]*' | cut -d'"' -f4)
        export COGNITO_USER_POOL_ARN=$(cat terraform-outputs.json | grep -o '"cognito_user_pool_arn"[^,]*' | cut -d'"' -f4)
        
        log_success "Variables de entorno del backend configuradas"
    else
        log_error "No se encontraron los outputs de Terraform. Ejecuta la infraestructura primero."
        exit 1
    fi
}

# Función para desplegar backend
deploy_backend() {
    log_info "Desplegando backend con Serverless..."
    
    cd backend
    
    # Desplegar funciones Lambda
    serverless deploy --verbose
    
    cd ..
    
    log_success "Backend desplegado exitosamente"
}

# Función para instalar dependencias del frontend
install_frontend_dependencies() {
    log_info "Instalando dependencias del frontend..."
    
    cd frontend
    npm install
    cd ..
    
    log_success "Dependencias del frontend instaladas"
}

# Función para configurar frontend
setup_frontend_configuration() {
    log_info "Configurando frontend..."
    
    cd frontend
    
    # Crear archivo de configuración
    cat > src/config.js << EOF
// Configuración de AWS para MediVoice AI
// Generado automáticamente por el script de deploy

export const awsConfig = {
  region: '${AWS_REGION:-us-east-1}',
  userPoolId: '${COGNITO_USER_POOL_ID}',
  userPoolWebClientId: '${COGNITO_CLIENT_ID}',
  apiGatewayUrl: '${API_GATEWAY_URL}',
  audioBucket: '${AUDIO_BUCKET_NAME}',
  pdfBucket: '${PDF_BUCKET_NAME}'
}

export default awsConfig
EOF
    
    cd ..
    
    log_success "Frontend configurado"
}

# Función para construir frontend
build_frontend() {
    log_info "Construyendo frontend..."
    
    cd frontend
    npm run build
    cd ..
    
    log_success "Frontend construido exitosamente"
}

# Función para desplegar frontend a S3 (opcional)
deploy_frontend() {
    log_info "¿Deseas desplegar el frontend a S3? (y/n)"
    read -r deploy_choice
    
    if [ "$deploy_choice" = "y" ] || [ "$deploy_choice" = "Y" ]; then
        log_info "Desplegando frontend a S3..."
        
        cd frontend
        
        # Subir archivos a S3
        aws s3 sync dist/ "s3://${FRONTEND_BUCKET_NAME}" --delete
        
        cd ..
        
        log_success "Frontend desplegado a S3"
        log_info "URL del frontend: https://${FRONTEND_BUCKET_NAME}.s3-website-${AWS_REGION}.amazonaws.com"
    else
        log_info "Frontend no desplegado. Puedes ejecutar 'npm run dev' en la carpeta frontend para desarrollo local."
    fi
}

# Función para mostrar resumen del deploy
show_deployment_summary() {
    log_success "🎉 Deploy completado exitosamente!"
    echo ""
    echo "=== RESUMEN DEL DEPLOY ==="
    echo "Región AWS: ${AWS_REGION:-us-east-1}"
    echo "Ambiente: ${ENVIRONMENT:-dev}"
    echo ""
    echo "=== RECURSOS CREADOS ==="
    echo "• Buckets S3:"
    echo "  - Audio: ${AUDIO_BUCKET_NAME}"
    echo "  - PDFs: ${PDF_BUCKET_NAME}"
    echo ""
    echo "• Tablas DynamoDB:"
    echo "  - Consultas: ${CONSULTATIONS_TABLE}"
    echo "  - Prompts: ${PROMPTS_TABLE}"
    echo "  - Doctores: ${DOCTORS_TABLE}"
    echo ""
    echo "• Cognito User Pool: ${COGNITO_USER_POOL_ID}"
    echo "• API Gateway: ${API_GATEWAY_URL}"
    echo ""
    echo "=== PRÓXIMOS PASOS ==="
    echo "1. Configura usuarios en Cognito"
    echo "2. Inicia el frontend: cd frontend && npm run dev"
    echo "3. Accede a la aplicación en http://localhost:5173"
    echo ""
    echo "📚 Consulta el manual en docs/MANUAL_DEPLOY.md para más detalles"
}

# Función principal
main() {
    echo "========================================"
    echo "    MediVoice AI - Deploy Automático    "
    echo "========================================"
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "README.md" ] || [ ! -d "infra" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto MediVoiceAI_v1_0"
        exit 1
    fi
    
    # Ejecutar pasos del deploy
    check_prerequisites
    setup_environment
    create_terraform_state_bucket
    deploy_infrastructure
    install_backend_dependencies
    setup_backend_environment
    deploy_backend
    install_frontend_dependencies
    setup_frontend_configuration
    build_frontend
    deploy_frontend
    show_deployment_summary
}

# Ejecutar script principal
main "$@" 