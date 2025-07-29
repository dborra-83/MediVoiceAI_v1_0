#!/bin/bash

# Script de Deploy Optimizado para AWS Cloud9
# Resuelve problemas comunes de permisos y configuración

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

# Función para configurar npm en Cloud9
setup_npm_cloud9() {
    log_info "Configurando npm para Cloud9..."
    
    # Crear directorio para paquetes globales
    if [ ! -d "$HOME/.npm-global" ]; then
        mkdir -p "$HOME/.npm-global"
        npm config set prefix "$HOME/.npm-global"
        
        # Añadir al PATH si no está
        if ! echo "$PATH" | grep -q "$HOME/.npm-global/bin"; then
            echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
            export PATH="$HOME/.npm-global/bin:$PATH"
        fi
        
        log_success "npm configurado para Cloud9"
    fi
}

# Función para configurar Terraform en Cloud9
setup_terraform_cloud9() {
    log_info "Configurando Terraform..."
    
    # Verificar si tfenv está disponible
    if command -v tfenv >/dev/null 2>&1; then
        log_info "tfenv detectado, configurando versión de Terraform..."
        
        # Instalar versión específica si no existe
        if ! tfenv list | grep -q "1.6.6"; then
            log_info "Instalando Terraform 1.6.6..."
            tfenv install 1.6.6
        fi
        
        # Usar la versión
        tfenv use 1.6.6
        log_success "Terraform 1.6.6 configurado"
        
    elif ! command -v terraform >/dev/null 2>&1; then
        log_info "Instalando Terraform manualmente..."
        
        # Crear directorio local para binarios
        mkdir -p "$HOME/.local/bin"
        
        # Descargar Terraform
        cd /tmp
        wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
        unzip terraform_1.6.6_linux_amd64.zip
        mv terraform "$HOME/.local/bin/"
        
        # Añadir al PATH
        if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
            echo 'export PATH=~/.local/bin:$PATH' >> ~/.bashrc
            export PATH="$HOME/.local/bin:$PATH"
        fi
        
        # Verificar instalación
        if "$HOME/.local/bin/terraform" --version >/dev/null 2>&1; then
            log_success "Terraform instalado en $HOME/.local/bin/"
        else
            log_error "Error instalando Terraform"
            exit 1
        fi
        
        cd -
    else
        log_success "Terraform ya está configurado"
    fi
    
    # Verificar versión final
    terraform_version=$(terraform --version | head -n1)
    log_success "Terraform disponible: $terraform_version"
}

# Función para instalar Serverless
install_serverless_cloud9() {
    log_info "Verificando Serverless Framework..."
    
    if ! command -v serverless >/dev/null 2>&1; then
        log_info "Instalando Serverless Framework..."
        
        # Intentar instalación global primero
        if npm install -g serverless >/dev/null 2>&1; then
            log_success "Serverless instalado globalmente"
        else
            log_warning "Instalación global falló, usando npx..."
            # Crear alias para usar npx
            echo 'alias serverless="npx serverless"' >> ~/.bashrc
            echo 'alias sls="npx serverless"' >> ~/.bashrc
            source ~/.bashrc
        fi
    else
        log_success "Serverless Framework ya disponible"
    fi
    
    # Verificar que funciona
    if command -v serverless >/dev/null 2>&1; then
        sls_version=$(serverless --version | head -n1)
        log_success "Serverless disponible: $sls_version"
    else
        log_warning "Usando npx serverless para este deploy"
    fi
}

# Función para verificar configuración de AWS
check_aws_config() {
    log_info "Verificando configuración de AWS..."
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS CLI no está configurado correctamente"
        log_info "En Cloud9, las credenciales deberían estar automáticamente configuradas"
        log_info "Si no funcionan, ejecuta: aws configure"
        exit 1
    fi
    
    local aws_identity=$(aws sts get-caller-identity)
    local account_id=$(echo $aws_identity | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
    local user_arn=$(echo $aws_identity | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
    
    log_success "AWS configurado correctamente"
    log_info "Account ID: $account_id"
    log_info "User ARN: $user_arn"
}

# Función para configurar variables de entorno
setup_environment_vars() {
    log_info "Configurando variables de entorno..."
    
    # Verificar terraform.tfvars
    if [ ! -f "infra/terraform.tfvars" ]; then
        log_warning "terraform.tfvars no encontrado, copiando desde ejemplo..."
        cp infra/terraform.tfvars.example infra/terraform.tfvars
        
        log_warning "IMPORTANTE: Edita infra/terraform.tfvars antes de continuar"
        log_warning "Especialmente cambia: cognito_domain_prefix"
        echo ""
        echo "¿Deseas editar el archivo ahora? (y/n)"
        read -r edit_choice
        
        if [ "$edit_choice" = "y" ] || [ "$edit_choice" = "Y" ]; then
            # Usar el editor disponible en Cloud9
            if command -v nano >/dev/null 2>&1; then
                nano infra/terraform.tfvars
            elif command -v vim >/dev/null 2>&1; then
                vim infra/terraform.tfvars
            else
                log_info "Abre Cloud9 IDE y edita: infra/terraform.tfvars"
                log_info "Presiona Enter cuando hayas terminado..."
                read -r
            fi
        fi
    fi
    
    # Cargar variables desde terraform.tfvars
    if [ -f "scripts/load_terraform_vars.sh" ]; then
        source scripts/load_terraform_vars.sh
    fi
}

# Función para crear bucket de Terraform state
create_terraform_bucket() {
    log_info "Verificando bucket de estado de Terraform..."
    
    local bucket_name="medivoice-terraform-state"
    local region="${AWS_REGION:-us-east-1}"
    
    if ! aws s3 ls "s3://$bucket_name" >/dev/null 2>&1; then
        log_info "Creando bucket de estado: $bucket_name"
        
        if [ "$region" = "us-east-1" ]; then
            aws s3 mb "s3://$bucket_name"
        else
            aws s3 mb "s3://$bucket_name" --region "$region"
        fi
        
        # Configurar versionado y encriptación
        aws s3api put-bucket-versioning \
            --bucket "$bucket_name" \
            --versioning-configuration Status=Enabled
            
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
        
        log_success "Bucket de estado creado"
    else
        log_success "Bucket de estado ya existe"
    fi
}

# Función para deploy de infraestructura
deploy_infrastructure() {
    log_info "Desplegando infraestructura..."
    
    cd infra
    
    # Inicializar Terraform
    terraform init
    
    # Validar configuración
    terraform validate
    
    # Plan
    terraform plan -out=tfplan
    
    log_warning "¿Continuar con el apply? Los recursos se crearán en AWS (y/n)"
    read -r apply_choice
    
    if [ "$apply_choice" = "y" ] || [ "$apply_choice" = "Y" ]; then
        # Apply
        terraform apply tfplan
        
        # Generar outputs
        terraform output -json > ../terraform-outputs.json
        
        log_success "Infraestructura desplegada"
    else
        log_info "Deploy de infraestructura cancelado"
        exit 0
    fi
    
    cd ..
    
    # Configurar variables de entorno automáticamente
    log_info "Configurando variables de entorno desde Terraform outputs..."
    if [ -f "scripts/setup-env-vars.sh" ]; then
        source scripts/setup-env-vars.sh
    else
        log_warning "Script setup-env-vars.sh no encontrado, configurando manualmente..."
        source scripts/load_terraform_vars.sh 2>/dev/null || true
    fi
}

# Función para deploy del backend
deploy_backend() {
    log_info "Desplegando backend..."
    
    cd backend
    
    # Instalar dependencias localmente
    npm install
    
    # Deploy con serverless
    if command -v serverless >/dev/null 2>&1; then
        serverless deploy --verbose
    else
        log_info "Usando npx serverless..."
        npx serverless deploy --verbose
    fi
    
    cd ..
    
    log_success "Backend desplegado"
}

# Función para configurar frontend
setup_frontend() {
    log_info "Configurando frontend..."
    
    cd frontend
    
    # Instalar dependencias
    npm install
    
    # Crear configuración (simplificada para Cloud9)
    if [ -f "../terraform-outputs.json" ]; then
        log_info "Creando configuración del frontend..."
        
        cat > src/config.js << 'EOF'
// Configuración AWS para MediVoice AI
// Esta será rellenada por el script de deploy

export const awsConfig = {
  region: 'us-east-1',
  // Estos valores se configurarán después del deploy completo
  userPoolId: 'TU_USER_POOL_ID',
  userPoolWebClientId: 'TU_CLIENT_ID',
  apiGatewayUrl: 'TU_API_GATEWAY_URL'
}

export default awsConfig
EOF
        
        log_success "Configuración del frontend creada"
        log_warning "Actualiza src/config.js con los valores de terraform-outputs.json"
    fi
    
    cd ..
}

# Función principal
main() {
    echo "========================================"
    echo "  MediVoice AI - Deploy para Cloud9    "
    echo "========================================"
    echo ""
    
    # Verificar directorio
    if [ ! -f "README.md" ] || [ ! -d "infra" ]; then
        log_error "Ejecuta este script desde el directorio raíz de MediVoiceAI_v1_0"
        exit 1
    fi
    
    # Configuración específica de Cloud9
    setup_npm_cloud9
    setup_terraform_cloud9
    install_serverless_cloud9
    check_aws_config
    setup_environment_vars
    
    # Deploy
    create_terraform_bucket
    deploy_infrastructure
    deploy_backend
    setup_frontend
    
    # Resumen final
    echo ""
    log_success "🎉 Deploy completado para Cloud9!"
    echo ""
    echo "=== PRÓXIMOS PASOS ==="
    echo "1. Edita frontend/src/config.js con los valores de terraform-outputs.json"
    echo "2. Ejecuta: cd frontend && npm run dev"
    echo "3. Ve a Preview -> Preview Running Application en Cloud9"
    echo ""
    echo "=== ARCHIVOS IMPORTANTES ==="
    echo "• terraform-outputs.json - Valores de infraestructura"
    echo "• docs/MANUAL_DEPLOY.md - Documentación completa"
    echo ""
}

# Ejecutar
main "$@" 