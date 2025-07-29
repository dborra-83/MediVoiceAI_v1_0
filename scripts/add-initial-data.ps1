# Script para agregar datos iniciales a DynamoDB - MediVoice AI
# Ejecutar desde el directorio raiz del proyecto

Write-Host "🏥 Agregando datos iniciales a MediVoice AI..." -ForegroundColor Green

# Verificar que AWS CLI este configurado
try {
    $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    Write-Host "✅ AWS configurado - Usuario: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS no esta configurado. Ejecuta: aws configure" -ForegroundColor Red
    exit 1
}

# Variables de configuracion
$REGION = "us-east-1"
$DOCTORS_TABLE = "medivoice-ai-dev-doctors"
$PROMPTS_TABLE = "medivoice-ai-dev-prompts"

Write-Host "📊 Agregando doctor de ejemplo..." -ForegroundColor Blue

# Agregar doctor de ejemplo
$doctorItem = '{
    "email": {"S": "doctor@medivoice.ai"},
    "doctor_id": {"S": "doctor@medivoice.ai"},
    "name": {"S": "Dr. Carlos Mendoza"},
    "license_number": {"S": "MED12345"},
    "specialty": {"S": "Medicina General"},
    "institution": {"S": "Clinica MediVoice AI"},
    "phone": {"S": "+1234567890"},
    "address": {"S": "Av. Principal 123, Ciudad"},
    "signature": {"S": "Dr. Carlos Mendoza"},
    "created_at": {"S": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"},
    "updated_at": {"S": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"}
}'

try {
    aws dynamodb put-item --table-name $DOCTORS_TABLE --item $doctorItem --region $REGION
    Write-Host "✅ Doctor agregado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Error agregando doctor - puede que ya exista: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "🧠 Agregando prompts medicos..." -ForegroundColor Blue

# Prompt medico general - usando escape para caracteres especiales
$promptContent1 = "Eres un asistente medico especializado. Analiza la siguiente transcripcion de una consulta medica y genera:\n\n1. RESUMEN CLINICO:\n- Motivo de consulta\n- Sintomas principales\n- Antecedentes relevantes\n- Examen fisico cuando aplique\n\n2. IMPRESION DIAGNOSTICA:\n- Diagnostico principal\n- Diagnosticos diferenciales\n\n3. PLAN TERAPEUTICO:\n- Medicamentos con dosis exactas\n- Duracion del tratamiento\n- Indicaciones especiales\n- Controles sugeridos\n\nTranscripcion: {transcription}"

$promptGeneral = '{
    "prompt_id": {"S": "default-medical-prompt"},
    "specialty": {"S": "general"},
    "is_active": {"S": "true"},
    "title": {"S": "Prompt Medico General"},
    "content": {"S": "' + $promptContent1.Replace('"', '\"').Replace('\n', '\\n') + '"},
    "created_at": {"S": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"},
    "updated_at": {"S": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"}
}'

try {
    aws dynamodb put-item --table-name $PROMPTS_TABLE --item $promptGeneral --region $REGION
    Write-Host "✅ Prompt general agregado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Error agregando prompt general - $($_.Exception.Message)" -ForegroundColor Yellow
}

# Prompt cardiologico
$promptContent2 = "Eres un cardiologo especializado. Analiza la siguiente transcripcion de una consulta cardiologica y genera:\n\n1. RESUMEN CLINICO:\n- Motivo de consulta cardiologica\n- Sintomas cardiovasculares\n- Antecedentes cardiacos\n- Examen cardiovascular\n\n2. IMPRESION DIAGNOSTICA:\n- Diagnostico cardiologico principal\n- Diagnosticos diferenciales\n- Factores de riesgo cardiovascular\n\n3. PLAN TERAPEUTICO:\n- Medicamentos cardiovasculares con dosis\n- Duracion del tratamiento\n- Indicaciones especiales\n- Controles cardiologicos sugeridos\n- Recomendaciones de estilo de vida\n\nTranscripcion: {transcription}"

$promptCardio = '{
    "prompt_id": {"S": "cardiology-prompt"},
    "specialty": {"S": "cardiology"},
    "is_active": {"S": "true"},
    "title": {"S": "Prompt Cardiologico"},
    "content": {"S": "' + $promptContent2.Replace('"', '\"').Replace('\n', '\\n') + '"},
    "created_at": {"S": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"},
    "updated_at": {"S": "' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"}
}'

try {
    aws dynamodb put-item --table-name $PROMPTS_TABLE --item $promptCardio --region $REGION
    Write-Host "✅ Prompt cardiologico agregado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Error agregando prompt cardiologico - $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "🎉 Datos iniciales agregados exitosamente!" -ForegroundColor Green
Write-Host "" 
Write-Host "📋 Datos creados:" -ForegroundColor Blue
Write-Host "   👨‍⚕️ Doctor: doctor@medivoice.ai (password: password)" -ForegroundColor Gray
Write-Host "   🧠 Prompt General: Medicina General" -ForegroundColor Gray
Write-Host "   ❤️ Prompt Cardiologico: Cardiologia" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Proximo paso: Ejecutar el frontend" -ForegroundColor Blue
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray 