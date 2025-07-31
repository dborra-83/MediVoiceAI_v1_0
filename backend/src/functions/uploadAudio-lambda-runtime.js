// Real uploadAudio function using Lambda's built-in AWS SDK v2
const AWS = require('aws-sdk');

// Create S3 client using Lambda runtime SDK
const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

exports.handler = async (event) => {
  console.log('=== UPLOAD AUDIO TO REAL S3 (Lambda Runtime) ===');
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
      console.log('Handling POST request for uploadAudio - REAL S3 with Lambda Runtime');
      
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

      console.log(`Uploading to S3: ${audioKey}`);

      // Upload to S3 using Lambda runtime SDK
      try {
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
        };

        const uploadResult = await s3.upload(uploadParams).promise();
        
        console.log('✅ Upload successful to S3:', uploadResult);

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
            s3Location: uploadResult.Location,
            services: {
              storage: "Amazon S3 (REAL - SUCCESS)"
            }
          })
        };
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        
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
              message: "S3 upload failed",
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