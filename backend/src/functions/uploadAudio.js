const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2))
    
    // Verificar que el usuario esté autenticado
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
        body: JSON.stringify({
          error: 'No autorizado'
        })
      }
    }

    // Parsear el body
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
        body: JSON.stringify({
          error: 'Body inválido'
        })
      }
    }

    const { audioData, fileName, contentType } = body

    if (!audioData || !fileName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          error: 'audioData y fileName son requeridos'
        })
      }
    }

    // Generar ID único para el archivo
    const fileId = uuidv4()
    const timestamp = new Date().toISOString()
    const key = `audio/${user.sub}/${fileId}/${fileName}`

    // Decodificar audio base64
    const audioBuffer = Buffer.from(audioData, 'base64')

    // Validar tamaño del archivo (máximo 50MB)
    if (audioBuffer.length > 50 * 1024 * 1024) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          error: 'El archivo es demasiado grande. Máximo 50MB.'
        })
      }
    }

    // Subir a S3
    const uploadParams = {
      Bucket: process.env.AUDIO_BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: contentType || 'audio/wav',
      Metadata: {
        'user-id': user.sub,
        'upload-time': timestamp,
        'original-filename': fileName
      }
    }

    await s3Client.send(new PutObjectCommand(uploadParams))

    console.log(`Audio subido exitosamente: ${key}`)

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
        fileId,
        fileName,
        key,
        uploadTime: timestamp,
        size: audioBuffer.length
      })
    }

  } catch (error) {
    console.error('Error en uploadAudio:', error)
    
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
        message: error.message
      })
    }
  }
} 