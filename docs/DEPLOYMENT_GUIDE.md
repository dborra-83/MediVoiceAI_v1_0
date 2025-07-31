# 🚀 Guía de Deployment - MediVoice AI

## 📋 Prerrequisitos

### 1. Herramientas Requeridas
- **AWS CLI** configurado con credenciales apropiadas
- **Node.js** 18+ y npm
- **Terraform** 1.5+
- **Serverless Framework** 3.0+

### 2. Permisos AWS Requeridos
- Administrador de IAM (o permisos específicos para crear roles)
- S3 Full Access
- DynamoDB Full Access
- Lambda Full Access
- API Gateway Full Access
- Transcribe Full Access
- Bedrock Full Access (necesario habilitar Claude 3 Sonnet en la consola)
- Cognito Full Access

## 🔧 Configuración Inicial

### 1. Habilitar Amazon Bedrock Claude 3
```bash
# Ir a la consola de AWS Bedrock
https://console.aws.amazon.com/bedrock/

# En "Model access", habilitar:
- Claude 3 Sonnet
- Claude 3 Haiku (opcional)
```

### 2. Configurar Variables de Terraform
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Editar `terraform.tfvars`:
```hcl
# Configuración del proyecto
project_name = "medivoice-ai"
environment  = "dev"  # dev, staging, prod

# Configuración AWS
aws_region = "us-east-1"

# Configuración de buckets
audio_bucket_suffix = "audio-bucket-unique-suffix"
pdf_bucket_suffix   = "pdf-bucket-unique-suffix"

# Configuración de tablas
consultations_table = "medivoice-consultations"
doctors_table      = "medivoice-doctors"
prompts_table      = "medivoice-prompts"
```

### 3. Configurar Variables del Frontend
```bash
cd frontend
cp .env.example .env.local
```

Editar `.env.local`:
```env
# Se actualizará automáticamente después del deploy de infraestructura
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_APP_CLIENT_ID=XXXXXXXXXXXXXXXXXX
```

## 🏗️ Deployment Paso a Paso

### Paso 1: Deploy de Infraestructura
```bash
cd infra

# Inicializar Terraform
terraform init

# Planificar el deploy
terraform plan

# Aplicar la infraestructura
terraform apply

# Guardar los outputs
terraform output > ../deployment-outputs.txt
```

### Paso 2: Actualizar Variables del Frontend
Después del deploy de Terraform, actualizar `.env.local` con los valores reales:
```bash
# Obtener API Gateway URL
terraform output api_gateway_url

# Obtener Cognito Pool ID
terraform output cognito_user_pool_id

# Obtener Cognito App Client ID  
terraform output cognito_app_client_id
```

### Paso 3: Deploy del Backend (Serverless)
```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno para Serverless
export AUDIO_BUCKET_NAME=$(cd ../infra && terraform output -raw audio_bucket_name)
export PDF_BUCKET_NAME=$(cd ../infra && terraform output -raw pdf_bucket_name)
export CONSULTATIONS_TABLE=$(cd ../infra && terraform output -raw consultations_table_name)
export DOCTORS_TABLE=$(cd ../infra && terraform output -raw doctors_table_name)
export PROMPTS_TABLE=$(cd ../infra && terraform output -raw prompts_table_name)
export COGNITO_USER_POOL_ARN=$(cd ../infra && terraform output -raw cognito_user_pool_arn)

# Deploy con Serverless
sls deploy --stage dev
```

### Paso 4: Deploy del Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Build para producción
npm run build

# Deploy a S3 + CloudFront (opcional)
# O servir localmente para desarrollo
npm run dev
```

## 🔍 Verificación del Deployment

### 1. Verificar Servicios AWS
```bash
# Verificar buckets S3
aws s3 ls | grep medivoice

# Verificar tablas DynamoDB
aws dynamodb list-tables | grep medivoice

# Verificar funciones Lambda
aws lambda list-functions | grep medivoice

# Verificar API Gateway
aws apigateway get-rest-apis
```

### 2. Verificar Conectividad
```bash
# Test del endpoint de upload
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/api/audio \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar CORS
curl -X OPTIONS https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/api/audio \
  -H "Origin: http://localhost:5173"
```

## 🔧 Configuración Post-Deployment

### 1. Poblar Datos Iniciales
```bash
# Ejecutar script para datos iniciales
cd scripts
./add-initial-data.ps1  # Windows
# o
./add-initial-data.sh   # Linux/Mac
```

### 2. Configurar Cognito (Opcional)
Si quieres habilitar autenticación:
```bash
# Crear usuario de prueba
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username doctor@test.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

## 🚨 Troubleshooting

### Problema: Error de permisos Bedrock
```bash
# Verificar modelos habilitados
aws bedrock list-foundation-models --region us-east-1

# Si no están habilitados, ir a la consola
https://console.aws.amazon.com/bedrock/
```

### Problema: CORS en desarrollo
```bash
# Verificar proxy en vite.config.js
# Asegurar que VITE_API_URL está configurado correctamente
```

### Problema: Lambda timeout
```bash
# Aumentar timeout en serverless.yml
timeout: 300  # 5 minutos para processAudio
```

### Problema: DynamoDB access denied
```bash
# Verificar que las políticas IAM incluyen los nombres de tabla correctos
terraform plan  # Ver si hay cambios pendientes
```

## 🔄 Updates y Mantenimiento

### Actualizar Código Lambda
```bash
cd backend
sls deploy function -f uploadAudio
sls deploy function -f processAudio
```

### Actualizar Frontend
```bash
cd frontend
npm run build
# Re-deploy a S3 o reiniciar dev server
```

### Actualizar Infraestructura
```bash
cd infra
terraform plan
terraform apply
```

## 💰 Monitoreo de Costos

### Ver Costos AWS
```bash
# Costos del último mes
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Optimizar Costos
- Configurar lifecycle policies en S3
- Usar DynamoDB on-demand
- Ajustar memory/timeout de Lambda
- Implementar alertas de presupuesto

## 🗑️ Cleanup (Desarrollo)

### Eliminar Recursos
```bash
# CUIDADO: Elimina TODOS los recursos
cd infra
terraform destroy

# Eliminar funciones Serverless
cd backend
sls remove
```

## 📚 Referencias

- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Serverless Framework](https://www.serverless.com/framework/docs/)
- [Amazon Bedrock Claude 3](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)