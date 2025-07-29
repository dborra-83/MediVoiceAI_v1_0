# Script de Deploy para Windows - MediVoice AI
# Ejecutar como Administrador

Write-Host "🚀 Iniciando deploy de MediVoice AI..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (!(Test-Path "infra") -or !(Test-Path "backend") -or !(Test-Path "frontend")) {
    Write-Host "❌ Error: Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Verificar herramientas instaladas
Write-Host "🔧 Verificando herramientas..." -ForegroundColor Blue

try {
    $awsVersion = aws --version 2>$null
    Write-Host "✅ AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI no está instalado" -ForegroundColor Red
    exit 1
}

try {
    $terraformVersion = terraform version 2>$null
    Write-Host "✅ Terraform: $terraformVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Terraform no está instalado" -ForegroundColor Red
    exit 1
}

try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar credenciales AWS
Write-Host "🔐 Verificando credenciales AWS..." -ForegroundColor Blue
try {
    $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    Write-Host "✅ AWS Configurado - Usuario: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS no está configurado correctamente" -ForegroundColor Red
    Write-Host "Ejecuta: aws configure" -ForegroundColor Yellow
    exit 1
}

# Deploy de infraestructura
Write-Host "🏗️ Desplegando infraestructura..." -ForegroundColor Blue
cd infra

# Verificar terraform.tfvars
if (!(Test-Path "terraform.tfvars")) {
    Write-Host "❌ Error: terraform.tfvars no encontrado" -ForegroundColor Red
    Write-Host "Copia terraform.tfvars.example a terraform.tfvars y configúralo" -ForegroundColor Yellow
    exit 1
}

terraform init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en terraform init" -ForegroundColor Red
    exit 1
}

terraform validate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en terraform validate" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Mostrando plan de Terraform..." -ForegroundColor Blue
terraform plan

$response = Read-Host "¿Deseas continuar con el deploy? (yes/no)"
if ($response -ne "yes") {
    Write-Host "❌ Deploy cancelado por el usuario" -ForegroundColor Yellow
    exit 0
}

terraform apply -auto-approve
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en terraform apply" -ForegroundColor Red
    exit 1
}

# Obtener outputs de Terraform
Write-Host "📊 Obteniendo outputs de Terraform..." -ForegroundColor Blue
terraform output -json > terraform-outputs.json

# Deploy del backend
Write-Host "⚙️ Desplegando backend..." -ForegroundColor Blue
cd ..\backend

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias del backend" -ForegroundColor Red
    exit 1
}

# Verificar si Serverless está instalado globalmente
try {
    sls --version 2>$null
} catch {
    Write-Host "🔧 Instalando Serverless Framework..." -ForegroundColor Blue
    npm install -g serverless
}

sls deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en deploy de Serverless" -ForegroundColor Red
    exit 1
}

# Configurar frontend
Write-Host "🌐 Configurando frontend..." -ForegroundColor Blue
cd ..\frontend

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias del frontend" -ForegroundColor Red
    exit 1
}

# Crear archivo de configuración del frontend desde outputs de Terraform
Write-Host "📝 Creando configuración del frontend..." -ForegroundColor Blue
$terraformOutputs = Get-Content ..\infra\terraform-outputs.json | ConvertFrom-Json

$frontendConfig = @"
// Configuración generada automáticamente desde Terraform
const config = {
  apiUrl: '$($terraformOutputs.api_url.value)',
  cognitoUserPoolId: '$($terraformOutputs.cognito_user_pool_id.value)',
  cognitoAppClientId: '$($terraformOutputs.cognito_app_client_id.value)',
  cognitoDomain: '$($terraformOutputs.cognito_domain.value)',
  region: '$($terraformOutputs.aws_region.value)',
  audioBucket: '$($terraformOutputs.audio_bucket_name.value)',
  pdfBucket: '$($terraformOutputs.pdf_bucket_name.value)'
};

export default config;
"@

$frontendConfig | Out-File -FilePath "src\config.js" -Encoding UTF8

Write-Host "✅ Deploy completado exitosamente!" -ForegroundColor Green
Write-Host "🌐 Para ejecutar el frontend:" -ForegroundColor Blue
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "" 
Write-Host "📊 URLs importantes:" -ForegroundColor Blue
Write-Host "   API: $($terraformOutputs.api_url.value)" -ForegroundColor Gray
Write-Host "   Cognito: $($terraformOutputs.cognito_domain.value)" -ForegroundColor Gray

cd .. 