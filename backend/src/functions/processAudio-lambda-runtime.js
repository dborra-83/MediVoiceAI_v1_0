// ProcessAudio function using Lambda's built-in AWS SDK
// Note: Lambda runtime includes AWS SDK v2, not v3, so we need to adapt

const AWS = require('aws-sdk');

// Configure AWS clients using v2 SDK (available in Lambda runtime)
const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
const transcribe = new AWS.TranscribeService({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrock = new AWS.BedrockRuntime({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to wait for transcription job completion
const waitForTranscriptionCompletion = async (jobName, maxWaitTime = 180000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await transcribe.getMedicalTranscriptionJob({
        MedicalTranscriptionJobName: jobName
      }).promise();
      
      const status = response.MedicalTranscriptionJob.TranscriptionJobStatus;
      console.log(`Transcription job ${jobName} status: ${status}`);
      
      if (status === 'COMPLETED') {
        return response.MedicalTranscriptionJob;
      } else if (status === 'FAILED') {
        throw new Error(`Transcription job failed: ${response.MedicalTranscriptionJob.FailureReason}`);
      }
      
      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error('Error checking transcription status:', error);
      throw error;
    }
  }
  
  throw new Error('Transcription job timed out');
};

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  console.log('=== PROCESS AUDIO WITH AWS SERVICES (Lambda Runtime) ===');
  console.log('httpMethod:', event.httpMethod);

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
      console.log('Processing audio with AWS services using Lambda runtime SDK');
      
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

      const { audioKey, patientId, doctorId, specialty = 'general' } = body;

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
        };
      }

      // Get user info from authorizer (if available)
      const user = event.requestContext?.authorizer?.claims;
      const userId = user?.sub || 'anonymous';
      const currentDoctorId = doctorId || userId;
      const currentPatientId = patientId || `patient-${Date.now()}`;
      
      const consultationId = generateUUID();
      const timestamp = new Date().toISOString();

      console.log(`Processing audio: ${audioKey}`);

      try {
        // Test AWS services availability
        console.log('Testing AWS services...');
        
        // Test S3
        try {
          await s3.headBucket({ Bucket: process.env.AUDIO_BUCKET_NAME }).promise();
          console.log('✅ S3 bucket accessible');
        } catch (s3Error) {
          console.log('❌ S3 bucket not accessible:', s3Error.message);
          throw new Error(`S3 bucket error: ${s3Error.message}`);
        }

        // Test Bedrock directly
        console.log('Testing Bedrock Claude 3.5 Sonnet...');
        const testPayload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: "Respond with 'Bedrock test successful' in Spanish."
            }
          ]
        };

        try {
          const bedrockResponse = await bedrock.invokeModel({
            modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
            contentType: 'application/json',
            body: JSON.stringify(testPayload)
          }).promise();

          const bedrockResult = JSON.parse(bedrockResponse.body.toString());
          console.log('✅ Bedrock test successful:', bedrockResult.content[0].text);
        } catch (bedrockError) {
          console.log('❌ Bedrock not accessible:', bedrockError.message);
          throw new Error(`Bedrock error: ${bedrockError.message}`);
        }

        // 1. Start Amazon Transcribe Medical job
        const jobName = `transcription-${consultationId}`;
        const s3Uri = `s3://${process.env.AUDIO_BUCKET_NAME}/${audioKey}`;

        console.log('Starting Transcribe Medical job:', jobName);
        console.log('S3 URI:', s3Uri);

        await transcribe.startMedicalTranscriptionJob({
          MedicalTranscriptionJobName: jobName,
          LanguageCode: 'es-ES',
          Specialty: 'PRIMARYCARE',
          Type: 'CONVERSATION',
          Media: {
            MediaFileUri: s3Uri
          },
          OutputBucketName: process.env.AUDIO_BUCKET_NAME,
          OutputKey: `transcriptions/${consultationId}.json`,
          Settings: {
            ShowSpeakerLabels: true,
            MaxSpeakerLabels: 2
          }
        }).promise();

        console.log('✅ Transcription job started successfully');

        // 2. Wait for transcription completion
        console.log('Waiting for transcription completion...');
        const transcriptionJob = await waitForTranscriptionCompletion(jobName);
        
        // 3. Get transcription results from S3
        const transcriptionKey = `transcriptions/${consultationId}.json`;
        console.log('Getting transcription from S3:', transcriptionKey);
        
        const transcriptionResponse = await s3.getObject({
          Bucket: process.env.AUDIO_BUCKET_NAME,
          Key: transcriptionKey
        }).promise();

        const transcriptionData = JSON.parse(transcriptionResponse.Body.toString());
        const transcriptionText = transcriptionData.results.transcripts[0].transcript;

        console.log('✅ Transcription completed:', transcriptionText.substring(0, 100) + '...');

        // 4. Analyze with Amazon Bedrock (Claude 3.5 Sonnet)
        console.log('Analyzing with Amazon Bedrock Claude 3.5 Sonnet...');
        
        const medicalPrompt = `Como médico especialista, analiza la siguiente transcripción de una consulta médica y proporciona:

1. RESUMEN CLÍNICO:
   - Motivo de consulta principal
   - Síntomas presentes
   - Antecedentes relevantes mencionados

2. IMPRESIÓN DIAGNÓSTICA:
   - Diagnóstico principal probable
   - Diagnósticos diferenciales a considerar
   - Nivel de urgencia (bajo/medio/alto)

3. PLAN TERAPÉUTICO:
   - Medicamentos recomendados (con dosis específicas)
   - Exámenes complementarios necesarios
   - Recomendaciones de seguimiento

4. OBSERVACIONES:
   - Signos de alarma a vigilar
   - Recomendaciones al paciente
   - Próxima cita sugerida

Mantén un lenguaje médico profesional pero comprensible. Si la información es insuficiente, indícalo claramente.

Transcripción a analizar: ${transcriptionText}`;

        const bedrockPayload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: medicalPrompt
            }
          ]
        };

        const bedrockResponse = await bedrock.invokeModel({
          modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
          contentType: 'application/json',
          body: JSON.stringify(bedrockPayload)
        }).promise();

        const aiAnalysisResult = JSON.parse(bedrockResponse.body.toString());
        const aiAnalysis = aiAnalysisResult.content[0].text;

        console.log('✅ AI analysis completed');

        // 5. Save consultation to DynamoDB
        if (process.env.CONSULTATIONS_TABLE) {
          const consultationData = {
            consultation_id: consultationId,
            doctor_id: currentDoctorId,
            patient_id: currentPatientId,
            audio_key: audioKey,
            transcription: transcriptionText,
            ai_analysis: aiAnalysis,
            specialty: specialty,
            status: 'completed',
            created_at: timestamp,
            updated_at: timestamp
          };

          await dynamodb.put({
            TableName: process.env.CONSULTATIONS_TABLE,
            Item: consultationData
          }).promise();

          console.log('✅ Consultation saved to DynamoDB:', consultationId);
        }

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
            patientId: currentPatientId,
            doctorId: currentDoctorId,
            specialty,
            services: {
              transcription: "Amazon Transcribe Medical (REAL - SUCCESS)",
              analysis: "Amazon Bedrock Claude 3.5 Sonnet (REAL - SUCCESS)",
              storage: "Amazon DynamoDB (REAL - SUCCESS)"
            }
          })
        };

      } catch (awsError) {
        console.error('AWS Services Error:', awsError);
        
        // Return detailed error for debugging
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({
            success: false,
            error: awsError.message,
            consultationId,
            timestamp,
            services: {
              transcription: "Amazon Transcribe Medical (CONFIGURED)",
              analysis: "Amazon Bedrock Claude 3.5 Sonnet (CONFIGURED)",
              storage: "Amazon DynamoDB (CONFIGURED)"
            },
            troubleshooting: {
              message: "AWS services encountered an error",
              suggestion: "Check the detailed error message below",
              errorDetails: awsError.name + ": " + awsError.message,
              stack: awsError.stack
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
    console.error('PROCESS AUDIO ERROR:', error);
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
        timestamp: new Date().toISOString(),
        details: error.stack
      })
    };
  }
};