# 📋 Manual de Deploy - MediVoice AI

## 🎯 Guía Completa para Principiantes en AWS

Esta guía te llevará paso a paso desde cero hasta tener MediVoice AI funcionando completamente en AWS, **sin necesidad de experiencia previa en AWS**.

---

## 📑 Índice

1. [Prerrequisitos](#-prerrequisitos)
2. [Configuración de AWS](#-configuración-de-aws)
3. [Configuración del Proyecto](#-configuración-del-proyecto)
4. [Deploy Automático](#-deploy-automático)
5. [Deploy Manual (Paso a Paso)](#-deploy-manual-paso-a-paso)
6. [Configuración Post-Deploy](#-configuración-post-deploy)
7. [Verificación y Pruebas](#-verificación-y-pruebas)
8. [Troubleshooting](#-troubleshooting)
9. [Gestión de Costos](#-gestión-de-costos)
10. [Mantenimiento](#-mantenimiento)

---

## 🔧 Prerrequisitos

### Software Necesario

1. **Node.js** (versión 18 o superior)
   - Descarga: https://nodejs.org/
   - Verificar: `node --version`

2. **Git** 
   - Descarga: https://git-scm.com/
   - Verificar: `git --version`

3. **Editor de código** (recomendado: VS Code)
   - Descarga: https://code.visualstudio.com/

### Cuenta de AWS

1. **Crear cuenta AWS**
   - Ve a: https://aws.amazon.com/
   - Haz clic en "Crear cuenta de AWS"
   - Completa el proceso (necesitarás tarjeta de crédito)
   - **⚠️ Importante**: AWS tiene capa gratuita para nuevos usuarios

2. **Habilitar servicios necesarios**
   - Amazon Bedrock (para IA)
   - Amazon Transcribe Medical (para transcripción)
   - Todos los demás servicios están habilitados por defecto

---

## ☁️ Configuración de AWS

### Paso 1: Instalar AWS CLI

#### Windows:
```bash
# Descargar el instalador MSI desde:
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
```

#### macOS:
```bash
brew install awscli
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install awscli
```

### Paso 2: Verificar instalación
```bash
aws --version
```

### Paso 3: Configurar credenciales

1. **Crear usuario IAM**:
   - Ve a: https://console.aws.amazon.com/iam/
   - Usuarios → Añadir usuario
   - Nombre: `medivoice-deploy`
   - Tipo de acceso: Programático ✅
   - Permisos: Adjuntar políticas existentes → `AdministratorAccess`
   - **⚠️ Guarda Access Key ID y Secret Access Key**

2. **Configurar AWS CLI**:
```bash
aws configure
```
```
AWS Access Key ID: [Tu Access Key ID]
AWS Secret Access Key: [Tu Secret Access Key]
Default region name: us-east-1
Default output format: json
```

### Paso 4: Verificar configuración
```bash
aws sts get-caller-identity
```

### Paso 5: Habilitar Amazon Bedrock

1. Ve a: https://console.aws.amazon.com/bedrock/
2. En la región **us-east-1** (Norte de Virginia)
3. Ve a "Model access" en el menú izquierdo
4. Haz clic en "Manage model access"
5. Habilita **Claude 3 Sonnet** de Anthropic
6. Envía la solicitud (puede tardar unos minutos)

---

## 🛠️ Configuración del Proyecto

### Paso 1: Clonar o descargar el proyecto
```bash
# Si usas Git
git clone [URL-del-repositorio]
cd MediVoiceAI_v1_0

# O descomprime el archivo ZIP descargado
```

### Paso 2: Configuración inicial automatizada
```bash
# Hacer el script ejecutable (Linux/macOS)
chmod +x scripts/setup.sh

# Ejecutar configuración inicial
./scripts/setup.sh
```

**En Windows (PowerShell):**
```powershell
# Instalar Node.js y dependencias manualmente
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### Paso 3: Instalar Terraform

#### Windows:
1. Descarga desde: https://www.terraform.io/downloads.html
2. Extrae a `C:\terraform\`
3. Añade `C:\terraform\` al PATH

#### macOS:
```bash
brew install terraform
```

#### Linux:
```bash
wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### Paso 4: Verificar instalaciones
```bash
terraform --version
node --version
npm --version
aws --version
```

---

## 🚀 Deploy Automático

### Opción Recomendada para Principiantes

1. **Configurar variables**:
```bash
# Editar archivo de configuración
nano infra/terraform.tfvars
# O usar tu editor favorito
```

2. **Configuración mínima necesaria**:
```hcl
# infra/terraform.tfvars
aws_region = "us-east-1"
environment = "dev"
project_name = "medivoice-ai"
cognito_domain_prefix = "medivoice-tu-nombre-unico"
```

3. **Ejecutar deploy automático**:
```bash
# Hacer ejecutable (Linux/macOS)
chmod +x scripts/deploy.sh

# Ejecutar deploy completo
./scripts/deploy.sh
```

**En Windows:**
```powershell
# Ejecutar deploy manual (ver siguiente sección)
```

---

## 📋 Deploy Manual (Paso a Paso)

### Paso 1: Crear bucket para estado de Terraform
```bash
aws s3 mb s3://medivoice-terraform-state
aws s3api put-bucket-versioning --bucket medivoice-terraform-state --versioning-configuration Status=Enabled
```

### Paso 2: Deploy de infraestructura
```bash
cd infra
terraform init
terraform plan
terraform apply
```
**⚠️ Escribe `yes` cuando te lo pida**

### Paso 3: Guardar outputs de Terraform
```bash
terraform output -json > ../terraform-outputs.json
cd ..
```

### Paso 4: Configurar variables de entorno
```bash
# Extraer variables de terraform outputs
export AUDIO_BUCKET_NAME=$(grep -o '"audio_bucket_name"[^,]*' terraform-outputs.json | cut -d'"' -f4)
export PDF_BUCKET_NAME=$(grep -o '"pdf_bucket_name"[^,]*' terraform-outputs.json | cut -d'"' -f4)
export CONSULTATIONS_TABLE=$(grep -o '"consultations_table_name"[^,]*' terraform-outputs.json | cut -d'"' -f4)
export PROMPTS_TABLE=$(grep -o '"prompts_table_name"[^,]*' terraform-outputs.json | cut -d'"' -f4)
export DOCTORS_TABLE=$(grep -o '"doctors_table_name"[^,]*' terraform-outputs.json | cut -d'"' -f4)
export COGNITO_USER_POOL_ARN=$(grep -o '"cognito_user_pool_arn"[^,]*' terraform-outputs.json | cut -d'"' -f4)
```

### Paso 5: Deploy del backend
```bash
cd backend
npm install
npx serverless deploy
cd ..
```

### Paso 6: Configurar frontend
```bash
cd frontend
npm install

# Crear archivo de configuración
cat > src/config.js << EOF
export const awsConfig = {
  region: 'us-east-1',
  userPoolId: '${COGNITO_USER_POOL_ID}',
  userPoolWebClientId: '${COGNITO_CLIENT_ID}',
  apiGatewayUrl: '${API_GATEWAY_URL}'
}
EOF

# Construir frontend
npm run build
cd ..
```

---

## ⚙️ Configuración Post-Deploy

### Paso 1: Crear usuario médico de prueba

1. Ve a: https://console.aws.amazon.com/cognito/
2. Selecciona tu User Pool
3. Ve a "Users and groups"
4. Crear usuario:
   - Username: `doctor@test.com`
   - Email: `doctor@test.com`
   - Temporary password: `TempPass123!`
   - ✅ Send an invitation to this new user?

### Paso 2: Configurar datos de doctor en DynamoDB

```bash
aws dynamodb put-item \
    --table-name medivoice-ai-dev-doctors \
    --item '{
        "doctor_id": {"S": "doctor@test.com"},
        "email": {"S": "doctor@test.com"},
        "name": {"S": "Dr. Juan Pérez"},
        "license_number": {"S": "MED12345"},
        "specialty": {"S": "Medicina General"},
        "institution": {"S": "Clínica Demo"},
        "phone": {"S": "+1234567890"}
    }'
```

### Paso 3: Verificar permisos de Bedrock

```bash
aws bedrock list-foundation-models --region us-east-1
```

Si ves errores, ve a la consola de Bedrock y verifica que Claude 3 Sonnet esté habilitado.

---

## ✅ Verificación y Pruebas

### Paso 1: Iniciar frontend en desarrollo
```bash
cd frontend
npm run dev
```

### Paso 2: Abrir aplicación
- URL: http://localhost:5173
- Login con: `doctor@test.com` / `TempPass123!`

### Paso 3: Probar funcionalidades

1. **Login**:
   - Inicia sesión con el usuario creado
   - Cambia la contraseña temporal

2. **Grabación de audio**:
   - Ve a "Grabación"
   - Permite permisos de micrófono
   - Graba un audio de prueba (simula consulta médica)

3. **Procesamiento**:
   - Sube el audio
   - Verifica que se transcribe
   - Verifica que se genera análisis de IA

4. **Generación de PDF**:
   - Genera receta médica en PDF
   - Descarga y verifica el contenido

5. **Historial**:
   - Ve a "Historial"
   - Verifica que aparecen las consultas

---

## 🐛 Troubleshooting

### Error: "Access Denied" en Bedrock
**Solución:**
1. Ve a consola de Bedrock
2. Verifica que estés en región `us-east-1`
3. Habilita modelos de Claude 3
4. Espera aprobación (puede tardar hasta 24 horas)

### Error: "Table not found" en DynamoDB
**Solución:**
```bash
# Verificar que las tablas existen
aws dynamodb list-tables --region us-east-1

# Si no existen, re-ejecutar Terraform
cd infra
terraform apply
```

### Error: "Bucket not found" en S3
**Solución:**
```bash
# Verificar buckets
aws s3 ls

# Verificar región
aws configure get region
```

### Frontend no conecta con backend
**Solución:**
1. Verificar URLs en `frontend/src/config.js`
2. Verificar CORS en API Gateway
3. Verificar certificados SSL

### Errores de transcripción
**Solución:**
1. Verificar que el audio esté en formato WAV
2. Verificar permisos de Transcribe Medical
3. Verificar que el archivo se subió correctamente a S3

---

## 💰 Gestión de Costos

### Costos Estimados (mensual)

#### Capa Gratuita (primeros 12 meses):
- **S3**: 5GB gratis
- **Lambda**: 1M invocaciones gratis
- **DynamoDB**: 25GB gratis
- **Cognito**: 50,000 MAU gratis
- **API Gateway**: 1M llamadas gratis

#### Después de capa gratuita:
- **Transcribe Medical**: $1.44/hora de audio
- **Bedrock (Claude 3 Sonnet)**: $3/1M tokens input, $15/1M tokens output
- **S3**: $0.023/GB/mes
- **Lambda**: $0.20/1M invocaciones
- **DynamoDB**: $0.25/GB/mes

#### Estimación para uso demo (100 consultas/mes):
- **Total aproximado**: $10-30/mes

### Optimización de costos:

1. **Eliminar recursos no usados**:
```bash
# Eliminar infraestructura completa
cd infra
terraform destroy
```

2. **Configurar alertas de billing**:
   - Ve a: https://console.aws.amazon.com/billing/
   - Configurar alertas de presupuesto

3. **Usar lifecycle policies en S3**:
   - Automáticamente configuradas en el proyecto
   - Archivos de audio se mueven a Glacier después de 30 días

---

## 🔧 Mantenimiento

### Actualizaciones de seguridad

1. **Actualizar dependencias**:
```bash
# Backend
cd backend
npm audit fix
npm update

# Frontend
cd frontend
npm audit fix
npm update
```

2. **Actualizar Terraform**:
```bash
cd infra
terraform plan
terraform apply
```

### Monitoring y logs

1. **CloudWatch Logs**:
   - Ve a: https://console.aws.amazon.com/cloudwatch/
   - Logs → Log groups
   - Busca: `/aws/lambda/medivoice-ai-*`

2. **Métricas importantes**:
   - Errores de Lambda
   - Costos de Bedrock
   - Uso de almacenamiento S3

### Backup y recuperación

1. **DynamoDB**:
   - Backups automáticos habilitados
   - Restauración point-in-time disponible

2. **S3**:
   - Versionado habilitado
   - Replicación cross-región recomendada para producción

### Seguridad

1. **Rotar credenciales**:
```bash
# Crear nuevas claves IAM cada 90 días
aws iam create-access-key --user-name medivoice-deploy
```

2. **Revisar políticas IAM**:
   - Principio de menor privilegio
   - Revisar permisos cada 6 meses

3. **Habilitar CloudTrail**:
   - Auditoría de todas las acciones
   - Detección de actividad sospechosa

---

## 📞 Soporte

### Recursos de ayuda:

1. **Documentación AWS**:
   - https://docs.aws.amazon.com/
   
2. **Terraform**:
   - https://registry.terraform.io/providers/hashicorp/aws/

3. **Problemas comunes**:
   - Revisar logs en CloudWatch
   - Verificar permisos IAM
   - Verificar configuración de región

### Contacto técnico:
- Email: soporte@medivoice.ai
- Documentación: docs/
- Issues: GitHub Issues

---

## 🎉 ¡Felicidades!

Has desplegado exitosamente MediVoice AI en AWS. El sistema está listo para procesar consultas médicas, generar transcripciones automáticas y crear recetas médicas con IA.

**Próximos pasos sugeridos:**
1. Personalizar prompts médicos por especialidad
2. Configurar monitoreo avanzado
3. Implementar CI/CD para futuras actualizaciones
4. Configurar entorno de producción separado

---

*Manual actualizado: Diciembre 2024*
*Versión: 1.0* 