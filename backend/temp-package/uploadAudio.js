const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

exports.handler = async (event) => {
  console.log('=== UPLOAD AUDIO REAL - AMAZON S3 ===')
  console.log('Event:', JSON.stringify(event, null, 2))

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  }

  try {
    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      }
    }

    // Handle POST with real S3 upload
    if (event.httpMethod === 'POST') {
      console.log('Handling POST request for uploadAudio - REAL S3')
      
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

      const { audioData, fileName, contentType, doctorId = 'doctor-demo' } = body

      if (!audioData) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'audioData es requerido' 
          })
        }
      }

      // Generar key único para S3
      const audioKey = `audio/${doctorId}/${uuidv4()}-${fileName || 'recording.wav'}`
      const timestamp = new Date().toISOString()

      console.log(`Subiendo audio REAL a S3: ${audioKey}`)

      // Decodificar audio de base64
      const audioBuffer = Buffer.from(audioData, 'base64')
      
      // Validar tamaño (máximo 10MB)
      if (audioBuffer.length > 10 * 1024 * 1024) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'Archivo demasiado grande (máximo 10MB)' 
          })
        }
      }

      // Subir a S3 REAL
      const s3Params = {
        Bucket: process.env.AUDIO_BUCKET_NAME,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: contentType || 'audio/wav',
        Metadata: {
          doctorId: doctorId,
          uploadedAt: timestamp,
          originalFileName: fileName || 'recording.wav'
        }
      }

      const s3Response = await s3Client.send(new PutObjectCommand(s3Params))
      console.log('Audio subido exitosamente a S3 REAL:', s3Response.ETag)

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          success: true,
          audioKey: audioKey,
          fileName: fileName || 'recording.wav',
          size: audioBuffer.length,
          uploadedAt: timestamp,
          doctorId: doctorId,
          s3ETag: s3Response.ETag,
          services: {
            storage: "Amazon S3 (REAL)"
          }
        })
      }
    }

    // Other methods
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
    console.error('UPLOAD AUDIO REAL ERROR:', error)
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