// ProcessAudio simplificado sin dependencias externas
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  }

  console.log('=== PROCESS AUDIO SIMPLIFICADO ===')
  console.log('httpMethod:', event.httpMethod)
  console.log('body:', event.body)

  try {
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request for processAudio')
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      }
    }

    // Handle POST - versión simplificada
    if (event.httpMethod === 'POST') {
      console.log('Handling POST request for processAudio - SIMPLIFICADO')
      
      // Parsear body
      let body
      try {
        body = JSON.parse(event.body)
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ error: 'Body inválido' })
        }
      }

      const { audioKey, patientId = 'patient-demo', doctorId = 'doctor-demo', specialty = 'general' } = body

      if (!audioKey) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'audioKey es requerido' 
          })
        }
      }

      // Simular procesamiento
      const consultationId = `consultation-${Date.now()}`
      const timestamp = new Date().toISOString()

      console.log(`Simulando transcripción médica: ${audioKey}`)

      // Simular transcripción basada en el audioKey
      const transcriptionText = `El paciente presenta síntomas médicos según la consulta grabada en ${audioKey}. Se observa un patrón de síntomas que requiere atención médica profesional.`

      console.log('Transcripción simulada completada, procesando con IA...')

      // Simular análisis de IA
      const aiAnalysis = `ANÁLISIS MÉDICO SIMULADO:

1. RESUMEN CLÍNICO:
- Motivo de consulta: Evaluación de síntomas
- Síntomas principales: Según transcripción
- Antecedentes: Por evaluar
- Examen físico: Pendiente

2. IMPRESIÓN DIAGNÓSTICA:
- Diagnóstico principal: Requiere evaluación presencial
- Diagnósticos diferenciales: Por determinar

3. PLAN TERAPÉUTICO:
- Evaluación médica presencial recomendada
- Exámenes complementarios según necesidad
- Seguimiento médico regular

NOTA: Este es un análisis simulado. Para análisis real, se requiere implementar Amazon Transcribe Medical y Amazon Bedrock.`

      console.log('Análisis de IA simulado completado')

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          success: true,
          consultationId,
          transcription: transcriptionText,
          aiAnalysis,
          timestamp,
          patientId,
          doctorId,
          specialty,
          services: {
            transcription: "Amazon Transcribe Medical (SIMULADO)",
            analysis: "Amazon Bedrock Claude 3 Sonnet (SIMULADO)"
          }
        })
      }
    }

    // Other methods
    console.log('Method not allowed:', event.httpMethod)
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        error: 'Method not allowed',
        method: event.httpMethod
      })
    }

  } catch (error) {
    console.error('PROCESS AUDIO SIMPLIFICADO ERROR:', error)
    console.error('Stack:', error.stack)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
} 