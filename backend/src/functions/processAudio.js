const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { TranscribeClient, StartMedicalTranscriptionJobCommand, GetMedicalTranscriptionJobCommand } = require('@aws-sdk/client-transcribe')
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')
const { v4: uuidv4 } = require('uuid')

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || 'us-east-1' })
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }))

// Función auxiliar para esperar completación de transcripción
const waitForTranscription = async (jobName, maxAttempts = 30) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await transcribeClient.send(
      new GetMedicalTranscriptionJobCommand({ MedicalTranscriptionJobName: jobName })
    )
    
    const status = response.MedicalTranscriptionJob.TranscriptionJobStatus
    
    if (status === 'COMPLETED') {
      return response.MedicalTranscriptionJob
    } else if (status === 'FAILED') {
      throw new Error(`Transcripción falló: ${response.MedicalTranscriptionJob.FailureReason}`)
    }
    
    // Esperar 10 segundos antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
  
  throw new Error('Timeout esperando completación de transcripción')
}

// Función auxiliar para obtener prompt personalizado
const getPromptBySpecialty = async (specialty = 'general') => {
  try {
    const response = await dynamoClient.send(new GetCommand({
      TableName: process.env.PROMPTS_TABLE,
      Key: {
        prompt_id: `${specialty}-prompt`,
        specialty: specialty
      }
    }))
    
    return response.Item?.content || getDefaultPrompt()
  } catch (error) {
    console.error('Error obteniendo prompt:', error)
    return getDefaultPrompt()
  }
}

const getDefaultPrompt = () => {
  return `Eres un asistente médico especializado. Analiza la siguiente transcripción de una consulta médica y genera:

1. RESUMEN CLÍNICO:
- Motivo de consulta
- Síntomas principales
- Antecedentes relevantes
- Examen físico (si aplica)

2. IMPRESIÓN DIAGNÓSTICA:
- Diagnóstico principal
- Diagnósticos diferenciales

3. PLAN TERAPÉUTICO:
- Medicamentos con dosis exactas
- Duración del tratamiento
- Indicaciones especiales
- Controles sugeridos

Transcripción: {transcription}`
}

exports.handler = async (event) => {
  try {
    console.log('Iniciando procesamiento de audio:', JSON.stringify(event, null, 2))
    
    // Verificar autenticación
    const user = event.requestContext.authorizer?.claims
    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'No autorizado' })
      }
    }

    // Parsear body
    let body
    try {
      body = JSON.parse(event.body)
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'Body inválido' })
      }
    }

    const { audioKey, patientId, doctorId, specialty = 'general' } = body

    if (!audioKey || !patientId || !doctorId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'audioKey, patientId y doctorId son requeridos' 
        })
      }
    }

    // Generar IDs únicos
    const consultationId = uuidv4()
    const transcriptionJobName = `medivoice-${consultationId}-${Date.now()}`
    const timestamp = new Date().toISOString()

    console.log(`Iniciando transcripción médica: ${transcriptionJobName}`)

    // Iniciar transcripción médica
    const transcriptionParams = {
      MedicalTranscriptionJobName: transcriptionJobName,
      LanguageCode: 'es-ES',
      MediaFormat: 'wav',
      Media: {
        MediaFileUri: `s3://${process.env.AUDIO_BUCKET_NAME}/${audioKey}`
      },
      OutputBucketName: process.env.AUDIO_BUCKET_NAME,
      OutputKey: `transcriptions/${consultationId}/`,
      Specialty: 'PRIMARYCARE',
      Type: 'CONVERSATION',
      Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 2,
        ShowAlternatives: false
      }
    }

    await transcribeClient.send(new StartMedicalTranscriptionJobCommand(transcriptionParams))
    console.log('Trabajo de transcripción iniciado exitosamente')

    // Esperar completación de transcripción
    const completedJob = await waitForTranscription(transcriptionJobName)
    console.log('Transcripción completada, obteniendo resultado...')

    // Obtener transcripción desde S3
    const transcriptionKey = completedJob.Transcript.TranscriptFileUri.split('.amazonaws.com/')[1]
    const transcriptionResponse = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.AUDIO_BUCKET_NAME,
      Key: transcriptionKey
    }))

    const transcriptionData = JSON.parse(await transcriptionResponse.Body.transformToString())
    const transcriptionText = transcriptionData.results.transcripts[0].transcript

    console.log('Transcripción obtenida, procesando con IA...')

    // Obtener prompt personalizado
    const promptTemplate = await getPromptBySpecialty(specialty)
    const prompt = promptTemplate.replace('{transcription}', transcriptionText)

    // Procesar con Bedrock (Claude)
    const bedrockParams = {
      modelId: process.env.BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    }

    const bedrockResponse = await bedrockClient.send(new InvokeModelCommand(bedrockParams))
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body))
    const aiAnalysis = responseBody.content[0].text

    console.log('Análisis de IA completado, guardando en base de datos...')

    // Guardar consulta en DynamoDB
    const consultationData = {
      consultation_id: consultationId,
      doctor_id: doctorId,
      patient_id: patientId,
      audio_key: audioKey,
      transcription: transcriptionText,
      ai_analysis: aiAnalysis,
      specialty: specialty,
      created_at: timestamp,
      updated_at: timestamp,
      status: 'completed',
      transcription_job_name: transcriptionJobName,
      user_id: user.sub
    }

    await dynamoClient.send(new PutCommand({
      TableName: process.env.CONSULTATIONS_TABLE,
      Item: consultationData
    }))

    console.log(`Consulta guardada exitosamente: ${consultationId}`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        consultationId,
        transcription: transcriptionText,
        aiAnalysis,
        timestamp,
        patientId,
        doctorId,
        specialty
      })
    }

  } catch (error) {
    console.error('Error procesando audio:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
} 