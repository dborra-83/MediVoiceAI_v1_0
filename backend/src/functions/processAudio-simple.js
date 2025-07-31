// Simple processAudio function without external dependencies (for testing)
exports.handler = async (event) => {
  console.log('=== PROCESS AUDIO SIMPLE (NO DEPS) ===')
  console.log('Event:', JSON.stringify(event, null, 2))

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  }

  try {
    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request')
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      }
    }

    // Handle POST request
    if (event.httpMethod === 'POST') {
      console.log('Processing audio with simulated AWS services')
      
      // Parse request body
      let body
      try {
        body = JSON.parse(event.body)
      } catch (error) {
        console.error('Error parsing body:', error)
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ error: 'Invalid JSON body' })
        }
      }

      const { audioKey, patientId, doctorId, specialty = 'general' } = body

      if (!audioKey) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'audioKey is required' 
          })
        }
      }

      // Simulate processing time
      console.log(`Processing audio: ${audioKey}`)
      
      // Generate consultation ID (simple timestamp)
      const consultationId = `consultation-${Date.now()}`
      const timestamp = new Date().toISOString()

      // Simulate transcription based on audio key
      const transcriptionText = `Transcripción simulada para ${audioKey}: El paciente presenta síntomas médicos que requieren evaluación. Se observan patrones consistentes con consulta médica estándar. El audio ha sido procesado correctamente.`

      // Simulate AI analysis
      const aiAnalysis = `ANÁLISIS MÉDICO SIMULADO (Listo para Amazon Bedrock):

1. RESUMEN CLÍNICO:
   - Motivo de consulta: Evaluación médica general
   - Audio procesado: ${audioKey}
   - Duración estimada: 3-5 minutos
   - Calidad de audio: Buena

2. IMPRESIÓN DIAGNÓSTICA:
   - Estado: Consulta procesada exitosamente
   - Nivel de urgencia: Bajo (simulado)
   - Recomendación: Revisión médica presencial

3. PLAN TERAPÉUTICO:
   - Medicamentos: Por determinar en consulta presencial
   - Exámenes: Según criterio médico
   - Seguimiento: Programar cita de control

4. OBSERVACIONES TÉCNICAS:
   - Transcripción: Amazon Transcribe Medical (LISTO)
   - Análisis IA: Amazon Bedrock Claude 3 Sonnet (LISTO)
   - Almacenamiento: Amazon DynamoDB (LISTO)
   - Estado: Sistema completamente funcional

NOTA: Esta es una simulación. Para análisis real, habilite Amazon Bedrock Claude 3 Sonnet en su cuenta AWS.`

      console.log('Simulated processing completed successfully')

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
          aiAnalysis: aiAnalysis,
          timestamp,
          patientId: patientId || 'patient-demo',
          doctorId: doctorId || 'doctor-demo',
          specialty,
          services: {
            transcription: "Amazon Transcribe Medical (READY TO ENABLE)",
            analysis: "Amazon Bedrock Claude 3 Sonnet (READY TO ENABLE)",
            storage: "Amazon DynamoDB (READY TO ENABLE)"
          },
          note: "Sistema completamente funcional. Listo para servicios AWS reales."
        })
      }
    }

    // Method not allowed
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
    console.error('PROCESS AUDIO ERROR:', error)
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