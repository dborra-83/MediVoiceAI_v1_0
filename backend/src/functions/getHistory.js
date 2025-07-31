const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }))

// Función auxiliar para formatear fecha
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return dateString
  }
}

// Función auxiliar para extraer resumen del análisis de IA
const extractSummary = (aiAnalysis, maxLength = 200) => {
  if (!aiAnalysis) return 'Sin análisis disponible'
  
  try {
    // Buscar la sección de resumen clínico
    const lines = aiAnalysis.split('\n')
    let summary = ''
    let inSummarySection = false
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.toLowerCase().includes('resumen') || 
          trimmedLine.toLowerCase().includes('motivo')) {
        inSummarySection = true
        continue
      }
      
      if (inSummarySection && trimmedLine.toLowerCase().includes('diagnóstico')) {
        break
      }
      
      if (inSummarySection && trimmedLine.length > 0 && 
          !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-')) {
        summary += trimmedLine + ' '
        
        if (summary.length > maxLength) {
          break
        }
      }
    }
    
    // Si no se encontró resumen estructurado, tomar las primeras líneas
    if (!summary.trim()) {
      summary = aiAnalysis.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3)
        .join(' ')
    }
    
    // Truncar y limpiar
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength).trim() + '...'
    }
    
    return summary.trim() || 'Sin resumen disponible'
    
  } catch (error) {
    console.error('Error extrayendo resumen:', error)
    return 'Error procesando análisis'
  }
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  }

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    console.log('Obteniendo historial:', JSON.stringify(event, null, 2))
    
    // Verificar autenticación (temporal: permitir sin auth para testing)
    const user = event.requestContext?.authorizer?.claims || { sub: 'anonymous' }
    console.log('User context:', user)

    // Obtener parámetros de query
    const queryParams = event.queryStringParameters || {}
    const {
      doctorId,
      patientId,
      limit = '20',
      startKey,
      specialty,
      dateFrom,
      dateTo
    } = queryParams

    let queryCommand
    let items = []

    if (doctorId) {
      // Buscar por doctor usando el índice DateIndex
      const queryParams = {
        TableName: process.env.CONSULTATIONS_TABLE,
        IndexName: 'DateIndex',
        KeyConditionExpression: 'doctor_id = :doctorId',
        ExpressionAttributeValues: {
          ':doctorId': doctorId
        },
        ScanIndexForward: false, // Ordenar por fecha descendente
        Limit: parseInt(limit)
      }

      // Agregar filtros adicionales
      if (startKey) {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey))
      }

      if (patientId || specialty || dateFrom || dateTo) {
        const filterExpressions = []
        
        if (patientId) {
          queryParams.ExpressionAttributeValues[':patientId'] = patientId
          filterExpressions.push('patient_id = :patientId')
        }
        
        if (specialty) {
          queryParams.ExpressionAttributeValues[':specialty'] = specialty
          filterExpressions.push('specialty = :specialty')
        }
        
        if (dateFrom) {
          queryParams.ExpressionAttributeValues[':dateFrom'] = dateFrom
          filterExpressions.push('created_at >= :dateFrom')
        }
        
        if (dateTo) {
          queryParams.ExpressionAttributeValues[':dateTo'] = dateTo
          filterExpressions.push('created_at <= :dateTo')
        }
        
        if (filterExpressions.length > 0) {
          queryParams.FilterExpression = filterExpressions.join(' AND ')
        }
      }

      const response = await dynamoClient.send(new QueryCommand(queryParams))
      items = response.Items || []
      
      // Preparar respuesta con paginación
      const result = {
        consultations: items.map(item => ({
          consultationId: item.consultation_id,
          doctorId: item.doctor_id,
          patientId: item.patient_id,
          specialty: item.specialty || 'General',
          createdAt: item.created_at,
          formattedDate: formatDate(item.created_at),
          status: item.status || 'completed',
          summary: extractSummary(item.ai_analysis),
          hasTranscription: !!item.transcription,
          hasAiAnalysis: !!item.ai_analysis,
          audioKey: item.audio_key
        })),
        count: items.length,
        lastEvaluatedKey: response.LastEvaluatedKey ? 
          encodeURIComponent(JSON.stringify(response.LastEvaluatedKey)) : null
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result)
      }

    } else if (patientId) {
      // Buscar por paciente usando el índice PatientIndex
      const queryParams = {
        TableName: process.env.CONSULTATIONS_TABLE,
        IndexName: 'PatientIndex',
        KeyConditionExpression: 'patient_id = :patientId',
        ExpressionAttributeValues: {
          ':patientId': patientId
        },
        ScanIndexForward: false, // Ordenar por fecha descendente
        Limit: parseInt(limit)
      }

      if (startKey) {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey))
      }

      const response = await dynamoClient.send(new QueryCommand(queryParams))
      items = response.Items || []

      const result = {
        consultations: items.map(item => ({
          consultationId: item.consultation_id,
          doctorId: item.doctor_id,
          patientId: item.patient_id,
          specialty: item.specialty || 'General',
          createdAt: item.created_at,
          formattedDate: formatDate(item.created_at),
          status: item.status || 'completed',
          summary: extractSummary(item.ai_analysis),
          hasTranscription: !!item.transcription,
          hasAiAnalysis: !!item.ai_analysis,
          audioKey: item.audio_key
        })),
        count: items.length,
        lastEvaluatedKey: response.LastEvaluatedKey ? 
          encodeURIComponent(JSON.stringify(response.LastEvaluatedKey)) : null
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result)
      }

    } else {
      // Escaneo general (solo para administradores o casos especiales)
      const scanParams = {
        TableName: process.env.CONSULTATIONS_TABLE,
        Limit: parseInt(limit)
      }

      if (startKey) {
        scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey))
      }

      // Agregar filtros si se proporcionan
      if (specialty || dateFrom || dateTo) {
        const filterExpressions = []
        scanParams.ExpressionAttributeValues = {}
        
        if (specialty) {
          scanParams.ExpressionAttributeValues[':specialty'] = specialty
          filterExpressions.push('specialty = :specialty')
        }
        
        if (dateFrom) {
          scanParams.ExpressionAttributeValues[':dateFrom'] = dateFrom
          filterExpressions.push('created_at >= :dateFrom')
        }
        
        if (dateTo) {
          scanParams.ExpressionAttributeValues[':dateTo'] = dateTo
          filterExpressions.push('created_at <= :dateTo')
        }
        
        if (filterExpressions.length > 0) {
          scanParams.FilterExpression = filterExpressions.join(' AND ')
        }
      }

      const response = await dynamoClient.send(new ScanCommand(scanParams))
      items = response.Items || []

      // Ordenar por fecha de creación descendente
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      const result = {
        consultations: items.map(item => ({
          consultationId: item.consultation_id,
          doctorId: item.doctor_id,
          patientId: item.patient_id,
          specialty: item.specialty || 'General',
          createdAt: item.created_at,
          formattedDate: formatDate(item.created_at),
          status: item.status || 'completed',
          summary: extractSummary(item.ai_analysis),
          hasTranscription: !!item.transcription,
          hasAiAnalysis: !!item.ai_analysis,
          audioKey: item.audio_key
        })),
        count: items.length,
        lastEvaluatedKey: response.LastEvaluatedKey ? 
          encodeURIComponent(JSON.stringify(response.LastEvaluatedKey)) : null
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result)
      }
    }

  } catch (error) {
    console.error('Error obteniendo historial:', error)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
} 