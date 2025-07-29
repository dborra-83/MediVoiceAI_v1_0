#!/bin/bash

# Script de Configuración Inicial para MediVoiceAI
# Este script configura el entorno de desarrollo

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

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Configuración inicial
setup_initial_config() {
    log_info "Configurando MediVoice AI - Setup Inicial"
    echo ""
    
    # Crear directorio de scripts si no existe
    mkdir -p scripts
    
    # Hacer scripts ejecutables
    chmod +x scripts/*.sh 2>/dev/null || true
    
    log_success "Configuración inicial completada"
}

# Verificar e instalar prerrequisitos
install_prerequisites() {
    log_info "Verificando e instalando prerrequisitos..."
    
    # Verificar Node.js
    if ! command_exists node; then
        log_error "Node.js no está instalado."
        log_info "Por favor instala Node.js desde: https://nodejs.org/"
        log_info "Versión recomendada: 18.x o superior"
        exit 1
    else
        node_version=$(node --version)
        log_success "Node.js instalado: $node_version"
    fi
    
    # Verificar npm
    if ! command_exists npm; then
        log_error "npm no está instalado."
        exit 1
    else
        npm_version=$(npm --version)
        log_success "npm instalado: v$npm_version"
    fi
    
    # Instalar Serverless Framework globalmente si no está instalado
    if ! command_exists serverless; then
        log_info "Instalando Serverless Framework..."
        npm install -g serverless
        log_success "Serverless Framework instalado"
    else
        sls_version=$(serverless --version | head -n1)
        log_success "Serverless Framework: $sls_version"
    fi
    
    # Verificar AWS CLI
    if ! command_exists aws; then
        log_warning "AWS CLI no está instalado."
        log_info "Instalación recomendada:"
        echo "  - Windows: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        echo "  - macOS: brew install awscli"
        echo "  - Linux: sudo apt install awscli (Ubuntu/Debian) o sudo yum install awscli (RHEL/CentOS)"
        echo ""
        log_warning "Continuando sin AWS CLI. Podrás instalarlo más tarde."
    else
        aws_version=$(aws --version)
        log_success "AWS CLI instalado: $aws_version"
        
        # Verificar configuración de AWS
        if aws sts get-caller-identity >/dev/null 2>&1; then
            log_success "AWS CLI configurado correctamente"
        else
            log_warning "AWS CLI no está configurado. Ejecuta 'aws configure' para configurarlo."
        fi
    fi
    
    # Verificar Terraform
    if ! command_exists terraform; then
        log_warning "Terraform no está instalado."
        log_info "Instalación recomendada:"
        echo "  - Windows: https://learn.hashicorp.com/tutorials/terraform/install-cli"
        echo "  - macOS: brew install terraform"
        echo "  - Linux: Descarga desde https://www.terraform.io/downloads.html"
        echo ""
        log_warning "Continuando sin Terraform. Podrás instalarlo más tarde."
    else
        tf_version=$(terraform --version | head -n1)
        log_success "Terraform instalado: $tf_version"
    fi
}

# Configurar archivos de configuración
setup_config_files() {
    log_info "Configurando archivos de configuración..."
    
    # Copiar terraform.tfvars.example si no existe terraform.tfvars
    if [ ! -f "infra/terraform.tfvars" ]; then
        log_info "Copiando terraform.tfvars.example a terraform.tfvars"
        cp infra/terraform.tfvars.example infra/terraform.tfvars
        log_success "Archivo terraform.tfvars creado"
        log_warning "Recuerda editar infra/terraform.tfvars con tus valores específicos antes del deploy"
    else
        log_success "terraform.tfvars ya existe"
    fi
    
    # Crear archivo .env.example para el frontend
    if [ ! -f "frontend/.env.example" ]; then
        cat > frontend/.env.example << EOF
# Variables de entorno para el frontend de MediVoice AI
# Copia este archivo a .env y configura los valores

VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=tu_user_pool_id
VITE_COGNITO_CLIENT_ID=tu_client_id
VITE_API_GATEWAY_URL=https://tu-api-gateway-url
VITE_AUDIO_BUCKET=tu-audio-bucket
VITE_PDF_BUCKET=tu-pdf-bucket
EOF
        log_success "Archivo .env.example creado para el frontend"
    fi
}

# Instalar dependencias
install_dependencies() {
    log_info "Instalando dependencias del proyecto..."
    
    # Backend
    if [ -d "backend" ]; then
        log_info "Instalando dependencias del backend..."
        cd backend
        npm install
        cd ..
        log_success "Dependencias del backend instaladas"
    fi
    
    # Frontend
    if [ -d "frontend" ]; then
        log_info "Instalando dependencias del frontend..."
        cd frontend
        npm install
        cd ..
        log_success "Dependencias del frontend instaladas"
    fi
}

# Crear estructura de directorios adicionales
create_directory_structure() {
    log_info "Creando estructura de directorios..."
    
    # Crear directorios necesarios
    mkdir -p docs
    mkdir -p logs
    mkdir -p temp
    
    # Crear .gitignore si no existe
    if [ ! -f ".gitignore" ]; then
        cat > .gitignore << EOF
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.production

# Terraform
*.tfstate
*.tfstate.*
.terraform/
terraform-outputs.json

# Logs
logs/
*.log

# Temporary files
temp/
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build outputs
dist/
build/
coverage/

# AWS
.aws/
EOF
        log_success ".gitignore creado"
    fi
}

# Mostrar resumen de configuración
show_setup_summary() {
    echo ""
    log_success "🎉 Configuración inicial completada!"
    echo ""
    echo "=== RESUMEN ==="
    echo "✅ Estructura de proyecto configurada"
    echo "✅ Dependencias instaladas"
    echo "✅ Archivos de configuración creados"
    echo ""
    echo "=== PRÓXIMOS PASOS ==="
    echo "1. Configura AWS CLI: aws configure"
    echo "2. Edita infra/terraform.tfvars con tus valores"
    echo "3. Ejecuta el deploy: ./scripts/deploy.sh"
    echo ""
    echo "=== DESARROLLO LOCAL ==="
    echo "• Frontend: cd frontend && npm run dev"
    echo "• Backend: cd backend && npm run dev (después del deploy)"
    echo ""
    echo "📚 Consulta el manual completo en docs/MANUAL_DEPLOY.md"
}

# Función principal
main() {
    echo "========================================"
    echo "   MediVoice AI - Configuración Inicial "
    echo "========================================"
    echo ""
    
    setup_initial_config
    install_prerequisites
    setup_config_files
    install_dependencies
    create_directory_structure
    show_setup_summary
}

# Ejecutar script principal
main "$@" 