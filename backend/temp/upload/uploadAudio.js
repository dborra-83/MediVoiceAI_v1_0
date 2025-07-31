const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

exports.handler = async (event) => {
  console.log('=== UPLOAD AUDIO TO S3 ===')
  console.log('Event:', JSON.stringify(event, null, 2))

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  }

  try {
    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      }
    }

    // Handle POST request
    if (event.httpMethod === 'POST') {
      console.log('Handling POST request for uploadAudio')
      
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

      const { audioData, fileName, contentType, doctorId } = body

      // Validate required fields
      if (!audioData) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'audioData is required' 
          })
        }
      }

      // Get user info from authorizer (if available)
      const user = event.requestContext?.authorizer?.claims
      const userId = user?.sub || 'anonymous'
      const currentDoctorId = doctorId || userId

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64')
      
      // Validate file size (max 10MB)
      if (audioBuffer.length > 10 * 1024 * 1024) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'File too large (maximum 10MB)' 
          })
        }
      }

      // Generate unique S3 key
      const fileExtension = fileName ? fileName.split('.').pop() : 'webm'
      const audioKey = `audio/${currentDoctorId}/${Date.now()}-${uuidv4()}.${fileExtension}`
      const timestamp = new Date().toISOString()

      console.log(`Uploading to S3: ${audioKey}`)

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.AUDIO_BUCKET_NAME,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: contentType || 'audio/webm',
        Metadata: {
          'doctor-id': currentDoctorId,
          'user-id': userId,
          'uploaded-at': timestamp,
          'original-filename': fileName || 'recording.webm'
        },
        ServerSideEncryption: 'AES256'
      }

      const uploadResult = await s3Client.send(new PutObjectCommand(uploadParams))
      
      console.log('Upload successful:', uploadResult)

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          success: true,
          audioKey: audioKey,
          fileName: fileName || 'recording.webm',
          size: audioBuffer.length,
          uploadedAt: timestamp,
          doctorId: currentDoctorId,
          s3ETag: uploadResult.ETag,
          services: {
            storage: "Amazon S3"
          }
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
    console.error('UPLOAD AUDIO ERROR:', error)
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