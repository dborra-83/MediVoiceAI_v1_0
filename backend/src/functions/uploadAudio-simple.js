// Simple UploadAudio function without external dependencies (for testing)
exports.handler = async (event) => {
  console.log('=== UPLOAD AUDIO SIMPLE (NO DEPS) ===')
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
      console.log('Handling POST request for uploadAudio (simplified)')
      
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

      // Simulate successful upload (for testing)
      const audioKey = `audio/${doctorId || 'demo'}/${Date.now()}-${fileName || 'recording.webm'}`
      const timestamp = new Date().toISOString()

      console.log(`Simulating upload to S3: ${audioKey}`)

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
          size: audioData.length,
          uploadedAt: timestamp,
          doctorId: doctorId || 'demo',
          s3ETag: 'simulated-etag-' + Date.now(),
          services: {
            storage: "Amazon S3 (READY FOR REAL IMPLEMENTATION)"
          },
          note: "This is a simplified version for testing. Full S3 upload ready to be enabled."
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