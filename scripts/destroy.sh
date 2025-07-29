#!/bin/bash

# Script para Destruir Recursos de MediVoiceAI
# ⚠️ PELIGRO: Este script eliminará TODOS los recursos de AWS
# Solo usar en ambientes de desarrollo/prueba

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

# Función de confirmación
confirm_destruction() {
    echo "========================================"
    echo "    ⚠️  DESTRUCCIÓN DE RECURSOS AWS  ⚠️"
    echo "========================================"
    echo ""
    log_warning "Este script eliminará PERMANENTEMENTE:"
    echo "• Buckets S3 y su contenido"
    echo "• Tablas DynamoDB y datos"
    echo "• Funciones Lambda"
    echo "• User Pool de Cognito"
    echo "• API Gateway"
    echo "• Logs de CloudWatch"
    echo ""
    log_error "⚠️  ESTA ACCIÓN NO SE PUEDE DESHACER  ⚠️"
    echo ""
    echo "Escribe 'DELETE-ALL' para confirmar:"
    read -r confirmation
    
    if [ "$confirmation" != "DELETE-ALL" ]; then
        log_info "Destrucción cancelada"
        exit 0
    fi
    
    echo ""
    log_warning "Última oportunidad para cancelar..."
    echo "Presiona Ctrl+C para cancelar o Enter para continuar..."
    read -r
}

# Función para verificar prerrequisitos
check_prerequisites() {
    log_info "Verificando prerrequisitos..."
    
    # Verificar AWS CLI
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI no está instalado"
        exit 1
    fi
    
    # Verificar configuración de AWS
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        log_error "AWS CLI no está configurado"
        exit 1
    fi
    
    # Verificar Terraform
    if ! command -v terraform >/dev/null 2>&1; then
        log_error "Terraform no está instalado"
        exit 1
    fi
    
    # Verificar Serverless
    if ! command -v serverless >/dev/null 2>&1; then
        log_error "Serverless Framework no está instalado"
        exit 1
    fi
    
    log_success "Prerrequisitos verificados"
}

# Función para eliminar funciones Lambda (Serverless)
destroy_serverless() {
    log_info "Eliminando funciones Lambda con Serverless..."
    
    if [ -d "backend" ]; then
        cd backend
        
        # Verificar si existe un deploy de Serverless
        if serverless info >/dev/null 2>&1; then
            log_info "Eliminando stack de Serverless..."
            serverless remove --verbose
            log_success "Stack de Serverless eliminado"
        else
            log_info "No se encontró stack de Serverless para eliminar"
        fi
        
        cd ..
    else
        log_warning "Directorio backend no encontrado"
    fi
}

# Función para eliminar buckets S3 con contenido
empty_and_delete_s3_buckets() {
    log_info "Eliminando buckets S3..."
    
    # Lista de buckets a eliminar basada en el patrón del proyecto
    local bucket_patterns=(
        "medivoice-ai-dev-audio"
        "medivoice-ai-dev-pdfs"
        "medivoice-ai-prod-audio"
        "medivoice-ai-prod-pdfs"
        "medivoice-terraform-state"
    )
    
    for pattern in "${bucket_patterns[@]}"; do
        # Buscar buckets que coincidan con el patrón
        local buckets=$(aws s3 ls | grep "$pattern" | awk '{print $3}' || true)
        
        for bucket in $buckets; do
            if [ -n "$bucket" ]; then
                log_info "Vaciando bucket: $bucket"
                
                # Eliminar todas las versiones de objetos
                aws s3api list-object-versions --bucket "$bucket" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text | while read -r key version_id; do
                    if [ -n "$key" ] && [ -n "$version_id" ]; then
                        aws s3api delete-object --bucket "$bucket" --key "$key" --version-id "$version_id" >/dev/null 2>&1 || true
                    fi
                done
                
                # Eliminar marcadores de eliminación
                aws s3api list-object-versions --bucket "$bucket" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output text | while read -r key version_id; do
                    if [ -n "$key" ] && [ -n "$version_id" ]; then
                        aws s3api delete-object --bucket "$bucket" --key "$key" --version-id "$version_id" >/dev/null 2>&1 || true
                    fi
                done
                
                # Vaciar bucket de forma simple
                aws s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true
                
                # Eliminar bucket
                log_info "Eliminando bucket: $bucket"
                aws s3 rb "s3://$bucket" --force >/dev/null 2>&1 || true
                
                log_success "Bucket eliminado: $bucket"
            fi
        done
    done
}

# Función para eliminar infraestructura con Terraform
destroy_terraform() {
    log_info "Eliminando infraestructura con Terraform..."
    
    if [ -d "infra" ]; then
        cd infra
        
        # Verificar si existe estado de Terraform
        if [ -f ".terraform/terraform.tfstate" ] || [ -f "terraform.tfstate" ]; then
            log_info "Destruyendo infraestructura con Terraform..."
            
            # Intentar destroy automático
            terraform destroy -auto-approve
            
            log_success "Infraestructura de Terraform destruida"
        else
            log_info "No se encontró estado de Terraform para destruir"
        fi
        
        cd ..
    else
        log_warning "Directorio infra no encontrado"
    fi
}

# Función para limpiar logs de CloudWatch
cleanup_cloudwatch_logs() {
    log_info "Eliminando logs de CloudWatch..."
    
    # Patrones de log groups a eliminar
    local log_patterns=(
        "/aws/lambda/medivoice-ai"
        "/aws/apigateway/medivoice-ai"
    )
    
    for pattern in "${log_patterns[@]}"; do
        # Obtener log groups que coincidan con el patrón
        local log_groups=$(aws logs describe-log-groups --log-group-name-prefix "$pattern" --query 'logGroups[].logGroupName' --output text || true)
        
        for log_group in $log_groups; do
            if [ -n "$log_group" ]; then
                log_info "Eliminando log group: $log_group"
                aws logs delete-log-group --log-group-name "$log_group" >/dev/null 2>&1 || true
                log_success "Log group eliminado: $log_group"
            fi
        done
    done
}

# Función para eliminar datos de DynamoDB (antes de Terraform)
clear_dynamodb_data() {
    log_info "Vaciando tablas de DynamoDB..."
    
    local table_patterns=(
        "medivoice-ai-dev-consultations"
        "medivoice-ai-dev-prompts"
        "medivoice-ai-dev-doctors"
        "medivoice-ai-prod-consultations"
        "medivoice-ai-prod-prompts"
        "medivoice-ai-prod-doctors"
    )
    
    for pattern in "${table_patterns[@]}"; do
        # Verificar si la tabla existe
        if aws dynamodb describe-table --table-name "$pattern" >/dev/null 2>&1; then
            log_info "Vaciando tabla: $pattern"
            
            # Obtener todos los items y eliminarlos
            aws dynamodb scan --table-name "$pattern" --query 'Items[].{id:consultation_id,sort:doctor_id}' --output text | while read -r id sort; do
                if [ -n "$id" ] && [ -n "$sort" ]; then
                    aws dynamodb delete-item --table-name "$pattern" --key "{\"consultation_id\":{\"S\":\"$id\"},\"doctor_id\":{\"S\":\"$sort\"}}" >/dev/null 2>&1 || true
                fi
            done
            
            log_success "Tabla vaciada: $pattern"
        fi
    done
}

# Función para limpiar archivos locales
cleanup_local_files() {
    log_info "Limpiando archivos locales..."
    
    # Eliminar archivos de estado y temporales
    rm -f terraform-outputs.json
    rm -rf infra/.terraform/
    rm -f infra/terraform.tfstate*
    rm -f infra/tfplan
    rm -rf backend/.serverless/
    rm -rf frontend/dist/
    rm -rf logs/
    rm -rf temp/
    
    log_success "Archivos locales limpiados"
}

# Función para mostrar resumen
show_destruction_summary() {
    echo ""
    log_success "🧹 Destrucción completada"
    echo ""
    echo "=== RECURSOS ELIMINADOS ==="
    echo "✅ Funciones Lambda"
    echo "✅ Buckets S3 y contenido"
    echo "✅ Tablas DynamoDB"
    echo "✅ User Pool de Cognito"
    echo "✅ API Gateway"
    echo "✅ Logs de CloudWatch"
    echo "✅ Archivos locales"
    echo ""
    echo "=== VERIFICACIÓN ==="
    echo "• Revisa la consola de AWS para confirmar eliminación"
    echo "• Verifica el billing para confirmar que no hay costos"
    echo "• Guarda backups si necesitas restaurar datos"
    echo ""
    log_warning "Nota: Algunos recursos pueden tardar unos minutos en aparecer como eliminados"
}

# Función principal
main() {
    echo "========================================"
    echo "   MediVoice AI - Destruir Recursos    "
    echo "========================================"
    echo ""
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "README.md" ] || [ ! -d "infra" ]; then
        log_error "Este script debe ejecutarse desde el directorio raíz del proyecto MediVoiceAI_v1_0"
        exit 1
    fi
    
    # Ejecutar pasos de destrucción
    check_prerequisites
    confirm_destruction
    
    log_info "Iniciando destrucción de recursos..."
    echo ""
    
    # Eliminar en orden inverso al deploy
    clear_dynamodb_data
    destroy_serverless
    empty_and_delete_s3_buckets
    destroy_terraform
    cleanup_cloudwatch_logs
    cleanup_local_files
    
    show_destruction_summary
}

# Ejecutar script principal
main "$@" 