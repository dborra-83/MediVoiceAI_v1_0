// Real uploadAudio function using AWS SDK v3
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Create S3 client
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1'
});

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

exports.handler = async (event) => {
  console.log('=== UPLOAD AUDIO TO REAL S3 (AWS SDK v3) ===');
  console.log('Event:', JSON.stringify(event, null, 2));

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  try {
    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Handle POST request
    if (event.httpMethod === 'POST') {
      console.log('Handling POST request for uploadAudio - REAL S3 with AWS SDK v3');
      
      // Parse request body
      let body;
      try {
        body = JSON.parse(event.body);
      } catch (error) {
        console.error('Error parsing body:', error);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ error: 'Invalid JSON body' })
        };
      }

      const { audioData, fileName, contentType, doctorId } = body;

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
        };
      }

      // Get user info from authorizer (if available)
      const user = event.requestContext?.authorizer?.claims;
      const userId = user?.sub || 'anonymous';
      const currentDoctorId = doctorId || userId;

      // Convert base64 to buffer
      let audioBuffer;
      try {
        audioBuffer = Buffer.from(audioData, 'base64');
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ error: 'Invalid base64 audio data' })
        };
      }
      
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
        };
      }

      // Generate unique S3 key
      const fileExtension = fileName ? fileName.split('.').pop() : 'webm';
      const audioKey = `audio/${currentDoctorId}/${Date.now()}-${generateUUID()}.${fileExtension}`;
      const timestamp = new Date().toISOString();

      console.log(`Uploading to REAL S3: ${audioKey}`);

      // Upload to S3 using AWS SDK v3
      try {
        const uploadCommand = new PutObjectCommand({
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
        });

        const uploadResult = await s3Client.send(uploadCommand);
        
        console.log('✅ REAL S3 Upload successful:', uploadResult);

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
            s3Location: `https://s3.amazonaws.com/${process.env.AUDIO_BUCKET_NAME}/${audioKey}`,
            services: {
              storage: "Amazon S3 (REAL AWS - SUCCESS)"
            },
            realAWS: true
          })
        };
      } catch (s3Error) {
        console.error('REAL S3 upload error:', s3Error);
        
        // Return detailed error
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({
            success: false,
            error: s3Error.message,
            audioKey: audioKey,
            fileName: fileName || 'recording.webm',
            size: audioBuffer.length,
            uploadedAt: timestamp,
            doctorId: currentDoctorId,
            services: {
              storage: "Amazon S3 (ERROR: " + s3Error.message + ")"
            },
            troubleshooting: {
              message: "Real S3 upload failed",
              suggestion: "Check S3 bucket permissions and configuration",
              errorDetails: s3Error.name + ": " + s3Error.message
            }
          })
        };
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
    };

  } catch (error) {
    console.error('UPLOAD AUDIO ERROR:', error);
    console.error('Stack:', error.stack);
    
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
    };
  }
};