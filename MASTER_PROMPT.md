# MediVoice AI - Master Prompt for AI Development

## 📋 DESCRIPCIÓN DEL PROYECTO

**MediVoice AI** es una aplicación web de transcripción médica inteligente que permite a profesionales de la salud grabar consultas médicas, transcribirlas automáticamente con separación de hablantes, y generar análisis clínicos estructurados mediante IA.

### Propósito Principal
- Automatizar la documentación médica mediante transcripción de audio
- Separar automáticamente las voces de doctor y paciente
- Generar análisis clínicos estructurados con IA
- Mantener historial seguro de consultas
- Exportar reportes en PDF

---

## 🎯 REQUERIMIENTOS FUNCIONALES

### Core Features - OBLIGATORIOS
1. **Formulario de Datos del Paciente**
   - Captura obligatoria antes de la grabación
   - Campos: Nombre (obligatorio), ID/Documento, Edad, Género
   - Especialidad médica (10 opciones disponibles)
   - Tipo de consulta y notas adicionales
   - Validación de datos antes de proceder

2. **Grabación de Audio**
   - Grabación directa desde navegador (WebRTC)
   - Soporte para archivos de audio (.wav, .mp3, .webm)
   - Límite máximo: 10MB por archivo
   - Duración máxima: 3 minutos por grabación

3. **Transcripción Inteligente con Separación de Hablantes**
   - Transcripción automática en español (es-ES)
   - Separación optimizada para MÁXIMO 2 hablantes (Doctor/Paciente)
   - Algoritmo heurístico de identificación basado en terminología médica
   - Etiquetado inteligente: Doctor vs Paciente automático
   - Formato de salida estructurado con timestamps

4. **Análisis Clínico con IA**
   - Análisis automático de la transcripción
   - Generación de: Resumen clínico, Impresión diagnóstica, Plan terapéutico, Observaciones
   - Uso exclusivo de Claude 3.5 Sonnet
   - Formato médico profesional

5. **Gestión de Historial con Nombres Reales**
   - Almacenamiento seguro de consultas con nombre del paciente
   - Búsqueda por doctor, paciente, especialidad, fecha
   - Visualización de nombres reales (no solo IDs)
   - Acceso a transcripciones completas
   - Integración completa entre formulario y base de datos

6. **Exportación PDF**
   - Generación de reportes médicos en PDF
   - Formato profesional con header/footer
   - Incluye transcripción y análisis completo

### Features Opcionales - DESEABLES
- Autenticación de usuarios (AWS Cognito)
- Múltiples especialidades médicas
- Integración con sistemas hospitalarios
- Notificaciones en tiempo real

---

## 🛠 STACK TECNOLÓGICO RECOMENDADO

### Frontend - OBLIGATORIO
```yaml
Framework: React 18+ con Vite
Lenguaje: JavaScript (ES6+)
UI Library: Bootstrap 5 o Material-UI
Estado: React Hooks (useState, useEffect)
HTTP Client: Axios
Audio: MediaRecorder API (nativo)
```

### Backend - OBLIGATORIO
```yaml
Runtime: Node.js 18+
Framework: AWS Lambda (Serverless)
Deployment: Serverless Framework 3+
Package Manager: npm
```

### AWS Services - OBLIGATORIO
```yaml
Compute: AWS Lambda
API: API Gateway REST
Storage: Amazon S3
Database: Amazon DynamoDB
Transcription: Amazon Transcribe (español)
AI: Amazon Bedrock (Claude 3.5 Sonnet)
Auth: AWS Cognito (opcional)
```

### DevOps - RECOMENDADO
```yaml
IaC: Serverless Framework + CloudFormation
CI/CD: GitHub Actions (opcional)
Monitoring: CloudWatch
Environment: Variables con valores por defecto
```

---

## 🏗 ARQUITECTURA Y MEJORES PRÁCTICAS

### Arquitectura del Sistema
```
Frontend (React) → API Gateway → Lambda Functions → AWS Services
                                      ↓
                              S3 + DynamoDB + Transcribe + Bedrock
```

### Estructura de Directorios - OBLIGATORIA
```
medivoice-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── config/
│   │   └── utils/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   │   └── functions/
│   │       ├── uploadAudio.js
│   │       ├── processAudio.js
│   │       ├── getHistory.js
│   │       └── generatePDF.js
│   ├── serverless.yml
│   └── package.json
└── README.md
```

### Patrones de Código - OBLIGATORIOS

#### 1. Manejo de Errores
```javascript
// Todas las funciones Lambda deben incluir:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

try {
  // Lógica principal
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify({ success: true, data: result })
  };
} catch (error) {
  console.error('Error:', error);
  return {
    statusCode: 500,
    headers: corsHeaders,
    body: JSON.stringify({
      error: 'Error interno del servidor',
      message: error.message
    })
  };
}
```

#### 2. Validación de Entrada
```javascript
// Validar siempre los parámetros de entrada
if (!audioKey || !patientId) {
  return {
    statusCode: 400,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Parámetros requeridos faltantes' })
  };
}
```

#### 3. Configuración de AWS SDK
```javascript
// Usar AWS SDK v3 con configuración regional
const { S3Client } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});
```

### Seguridad - OBLIGATORIO
1. **CORS configurado correctamente** en todas las funciones
2. **Validación de entrada** en todos los endpoints
3. **Variables de entorno** para configuración sensible
4. **Timeouts apropiados** (30s para API Gateway)
5. **Logging estructurado** sin información sensible

### UX/UI - OBLIGATORIO
1. **Feedback visual** para todas las operaciones
2. **Estados de carga** durante transcripción
3. **Manejo de errores** con mensajes comprensibles
4. **Diseño responsive** para dispositivos móviles
5. **Interfaz intuitiva** para profesionales médicos

---

## 📝 CRITERIOS DE ACEPTACIÓN

### Funcionalidad Core
- [ ] Usuario puede grabar audio de máximo 3 minutos
- [ ] Sistema transcribe audio en español automáticamente
- [ ] Transcripción separa correctamente hablantes (Doctor/Paciente)
- [ ] IA genera análisis médico estructurado
- [ ] Usuario puede ver historial de consultas
- [ ] Sistema permite exportar PDF del análisis

### Calidad Técnica
- [ ] Todas las funciones Lambda responden en <30 segundos
- [ ] CORS configurado correctamente para desarrollo
- [ ] Manejo de errores implementado en todos los endpoints
- [ ] Logs estructurados sin información sensible
- [ ] Variables de entorno con valores por defecto

### Usuario Experience
- [ ] Interfaz responsive en dispositivos móviles
- [ ] Feedback visual durante operaciones largas
- [ ] Mensajes de error comprensibles para usuarios médicos
- [ ] Carga inicial <3 segundos
- [ ] Procesamiento de audio con indicador de progreso

---

## 🔧 CONFIGURACIÓN TÉCNICA

### Variables de Entorno - Backend
```yaml
AWS_REGION: us-east-1
AUDIO_BUCKET_NAME: medivoice-audio-storage-dev
CONSULTATIONS_TABLE: medivoice-consultations-dev
BEDROCK_MODEL_ID: anthropic.claude-3-5-sonnet-20240620-v1:0
```

### Serverless Configuration
```yaml
service: medivoice-ai-backend
frameworkVersion: '3'
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  timeout: 30
  memorySize: 1024
```

### Permisos IAM Requeridos
```yaml
- S3: GetObject, PutObject, ListBucket
- DynamoDB: GetItem, PutItem, Query, Scan
- Transcribe: StartTranscriptionJob, GetTranscriptionJob
- Bedrock: InvokeModel (Claude 3.5 Sonnet)
```

### Estructura DynamoDB
```yaml
Tabla: medivoice-consultations-dev
Partition Key: consultation_id (String)
Atributos:
  - doctor_id: String
  - patient_id: String
  - patient_name: String  # NUEVO - Nombre real del paciente
  - audio_key: String
  - transcription: String
  - transcription_with_speakers: String
  - ai_analysis: String
  - specialty: String
  - status: String
  - created_at: String
  - updated_at: String
```

---

## 💡 EJEMPLOS DE USO

### 1. Flujo Completo de Usuario (ACTUALIZADO)
```
1. Usuario abre aplicación
2. Completa formulario de datos del paciente:
   - Nombre del paciente (obligatorio)
   - ID/Documento, edad, género
   - Especialidad médica
   - Tipo de consulta y notas
3. Hace clic en "Continuar a Grabación"
4. Ve información del paciente en barra superior
5. Hace clic en "Grabar Audio"
6. Habla durante consulta médica (máximo 2 hablantes)
7. Detiene grabación
8. Sistema procesa automáticamente:
   - Sube audio a S3
   - Inicia transcripción optimizada (2 hablantes)
   - Aplica algoritmo heurístico de identificación
   - Procesa con Claude 3.5 para análisis
   - Guarda en DynamoDB con nombre del paciente
9. Usuario ve transcripción con Doctor/Paciente separados
10. Usuario ve análisis médico estructurado
11. Usuario puede exportar PDF
12. Historial muestra nombres reales de pacientes
```

### 2. Formato de Transcripción Esperado
```
**Doctor:** Buenos días, ¿cómo se encuentra hoy?

**Paciente:** Bien doctor, pero tengo un dolor en el pecho que me preocupa.

**Doctor:** ¿Desde cuándo siente este dolor? ¿Puede describir las características?

**Paciente:** Comenzó hace tres días, es como una presión que viene y va.
```

### 3. Algoritmo Heurístico de Identificación de Hablantes
```javascript
// Implementación obligatoria en processAudio.js
const medicalTerms = [
  'diagnóstico', 'tratamiento', 'medicamento', 'prescribir', 
  'síntomas', 'examen', 'receta', 'dosis'
];
const patientTerms = [
  'dolor', 'siento', 'me duele', 'molestia', 
  'desde hace', 'me pasa', 'tengo'
];

// Lógica de identificación
const segmentLower = segmentText.toLowerCase();
const hasMedicalTerms = medicalTerms.some(term => segmentLower.includes(term));
const hasPatientTerms = patientTerms.some(term => segmentLower.includes(term));

switch(speakerLabel) {
  case 'spk_0':
    // Primer hablante - generalmente doctor
    speakerName = hasMedicalTerms || !hasPatientTerms ? 'Doctor' : 'Paciente';
    break;
  case 'spk_1':
    // Segundo hablante - generalmente paciente
    speakerName = hasPatientTerms || !hasMedicalTerms ? 'Paciente' : 'Doctor';
    break;
}
```

### 4. Configuración Optimizada de Amazon Transcribe
```javascript
// Configuración OBLIGATORIA para consultas médicas
const transcribeCommand = new StartTranscriptionJobCommand({
  TranscriptionJobName: jobName,
  LanguageCode: 'es-ES',
  Media: { MediaFileUri: s3Uri },
  Settings: {
    ShowSpeakerLabels: true,
    MaxSpeakerLabels: 2,  // MÁXIMO 2 hablantes para precisión
    ChannelIdentification: false,
    VocabularyName: undefined, // Vocabulario médico personalizado opcional
    VocabularyFilterName: undefined
  }
});
```

### 5. Formato de Análisis de IA
```
## RESUMEN CLÍNICO
- Motivo de consulta: Dolor torácico de 3 días de evolución
- Síntomas: Dolor tipo presión, intermitente
- Evolución: Síntoma reciente sin antecedentes relevantes

## IMPRESIÓN DIAGNÓSTICA
- Diagnóstico principal: Dolor torácico atípico
- Diagnósticos diferenciales: Costocondritis, ansiedad
- Nivel de urgencia: Medio

## PLAN TERAPÉUTICO
- Analgésicos: Ibuprofeno 400mg cada 8 horas
- Exámenes: Electrocardiograma, radiografía de tórax
- Seguimiento: Control en 7 días

## OBSERVACIONES
- Signos de alarma: Dolor intenso, dificultad respiratoria
- Recomendaciones: Evitar esfuerzos intensos
- Próxima cita: Una semana
```

---

## ⚙️ PARÁMETROS ADAPTABLES

### Configuración Regional
```javascript
// Cambiar región según necesidades
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const LANGUAGE_CODE = process.env.LANGUAGE_CODE || 'es-ES'
```

### Límites Configurables
```javascript
const MAX_RECORDING_TIME = parseInt(process.env.MAX_RECORDING_TIME) || 180 // segundos
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
const MAX_SPEAKERS = parseInt(process.env.MAX_SPEAKERS) || 4
```

### Modelos de IA Alternativos
```javascript
// Configurar modelo de Bedrock según disponibilidad
const BEDROCK_MODELS = {
  'claude-3.5-sonnet': 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  'claude-3-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
  'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0'
}
```

### Especialidades Médicas
```javascript
const MEDICAL_SPECIALTIES = [
  'medicina-general',
  'cardiologia',
  'neurologia',
  'pediatria',
  'ginecologia',
  'traumatologia'
]
```

---

## 🚀 INSTRUCCIONES DE IMPLEMENTACIÓN

### Orden de Desarrollo RECOMENDADO
1. **Setup inicial**: Crear estructura de directorios
2. **Backend**: Implementar funciones Lambda básicas
3. **AWS Setup**: Configurar servicios AWS necesarios
4. **Frontend**: Crear interfaz básica de grabación
5. **Integración**: Conectar frontend con backend
6. **Testing**: Probar flujo completo
7. **Deploy**: Desplegar a AWS
8. **Refinement**: Optimizar UX/UI

### Comandos Esenciales
```bash
# Backend
npm install serverless -g
serverless create --template aws-nodejs
serverless deploy

# Frontend
npm create vite@latest frontend -- --template react
npm install axios bootstrap
npm run dev
```

### Validación de Completitud
- [ ] Todas las funciones Lambda creadas y desplegadas
- [ ] Frontend conectado correctamente a API
- [ ] Flujo completo de audio a PDF funciona
- [ ] Separación de hablantes operativa
- [ ] Análisis de IA generando resultados correctos
- [ ] Historial mostrando datos reales
- [ ] CORS configurado para desarrollo local

---

## 📚 RECURSOS DE REFERENCIA

### Documentación AWS
- [Amazon Transcribe](https://docs.aws.amazon.com/transcribe/)
- [Amazon Bedrock](https://docs.aws.amazon.com/bedrock/)
- [Serverless Framework](https://www.serverless.com/framework/docs/)

### Patrones de Código
- Usar async/await para operaciones asíncronas
- Implementar retry logic para servicios AWS
- Mantener funciones Lambda stateless
- Usar environment variables para configuración

---

## ⚠️ NOTAS IMPORTANTES

1. **Claude 3.5 Sonnet es OBLIGATORIO** - No usar versiones anteriores
2. **Separación de hablantes es CRÍTICA** - Debe funcionar correctamente
3. **CORS debe permitir desarrollo local** - '*' para desarrollo
4. **Timeouts deben ser apropiados** - 30s máximo para API Gateway
5. **Variables de entorno con defaults** - Para evitar errores de deployment
6. **Logging sin información sensible** - No logear datos médicos
7. **Manejo de errores robusto** - Nunca retornar errores 500 sin manejo

---

*Este master prompt contiene toda la información necesaria para replicar la funcionalidad de MediVoice AI siguiendo las mejores prácticas establecidas durante el desarrollo original.*