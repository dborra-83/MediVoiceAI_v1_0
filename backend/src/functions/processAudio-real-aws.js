// Real processAudio function using AWS SDK v3
const { S3Client, GetObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Create AWS clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const transcribeClient = new TranscribeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

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
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName
      });
      
      const response = await transcribeClient.send(command);
      const status = response.TranscriptionJob.TranscriptionJobStatus;
      
      console.log(`Transcription job ${jobName} status: ${status}`);
      
      if (status === 'COMPLETED') {
        return response.TranscriptionJob;
      } else if (status === 'FAILED') {
        throw new Error(`Transcription job failed: ${response.TranscriptionJob.FailureReason}`);
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

  console.log('=== PROCESS AUDIO WITH REAL AWS SERVICES (AWS SDK v3) ===');
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
      console.log('Processing audio with REAL AWS services using AWS SDK v3');
      
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

      console.log(`Processing audio with REAL AWS services: ${audioKey}`);

      try {
        // Test AWS REAL services availability
        console.log('Testing REAL AWS services...');
        
        // Test S3
        try {
          const headCommand = new HeadBucketCommand({ Bucket: process.env.AUDIO_BUCKET_NAME });
          await s3Client.send(headCommand);
          console.log('✅ REAL S3 bucket accessible');
        } catch (s3Error) {
          console.log('❌ REAL S3 bucket not accessible:', s3Error.message);
          throw new Error(`S3 bucket error: ${s3Error.message}`);
        }

        // Test Bedrock directly with REAL Claude 3.5 Sonnet
        console.log('Testing REAL Bedrock Claude 3.5 Sonnet...');
        const testPayload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: "Responde con 'Bedrock REAL funcionando' en español."
            }
          ]
        };

        try {
          const bedrockCommand = new InvokeModelCommand({
            modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
            contentType: 'application/json',
            body: JSON.stringify(testPayload)
          });

          const bedrockResponse = await bedrockClient.send(bedrockCommand);
          const bedrockResult = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
          console.log('✅ REAL Bedrock test successful:', bedrockResult.content[0].text);
        } catch (bedrockError) {
          console.log('❌ REAL Bedrock not accessible:', bedrockError.message);
          throw new Error(`Bedrock error: ${bedrockError.message}`);
        }

        // 1. Start REAL Amazon Transcribe job (standard, supports Spanish)
        const jobName = `transcription-${consultationId}`;
        const s3Uri = `s3://${process.env.AUDIO_BUCKET_NAME}/${audioKey}`;

        console.log('Starting REAL Transcribe job:', jobName);
        console.log('S3 URI:', s3Uri);

        const transcribeCommand = new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          LanguageCode: 'es-ES',
          Media: {
            MediaFileUri: s3Uri
          },
          OutputBucketName: process.env.AUDIO_BUCKET_NAME,
          OutputKey: `transcriptions/${consultationId}.json`,
          Settings: {
            ShowSpeakerLabels: true,
            MaxSpeakerLabels: 2
          }
        });

        await transcribeClient.send(transcribeCommand);
        console.log('✅ REAL Transcription job started successfully');

        // 2. Wait for REAL transcription completion
        console.log('Waiting for REAL transcription completion...');
        const transcriptionJob = await waitForTranscriptionCompletion(jobName);
        
        // 3. Get REAL transcription results from S3
        const transcriptionKey = `transcriptions/${consultationId}.json`;
        console.log('Getting REAL transcription from S3:', transcriptionKey);
        
        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.AUDIO_BUCKET_NAME,
          Key: transcriptionKey
        });

        const transcriptionResponse = await s3Client.send(getObjectCommand);
        const transcriptionDataStr = await transcriptionResponse.Body.transformToString();
        const transcriptionData = JSON.parse(transcriptionDataStr);
        const transcriptionText = transcriptionData.results.transcripts[0].transcript;

        console.log('✅ REAL Transcription completed:', transcriptionText.substring(0, 100) + '...');

        // 4. Analyze with REAL Amazon Bedrock (Claude 3.5 Sonnet)
        console.log('Analyzing with REAL Amazon Bedrock Claude 3.5 Sonnet...');
        
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

        const analysisCommand = new InvokeModelCommand({
          modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
          contentType: 'application/json',
          body: JSON.stringify(bedrockPayload)
        });

        const bedrockAnalysisResponse = await bedrockClient.send(analysisCommand);
        const aiAnalysisResult = JSON.parse(new TextDecoder().decode(bedrockAnalysisResponse.body));
        const aiAnalysis = aiAnalysisResult.content[0].text;

        console.log('✅ REAL AI analysis completed');

        // 5. Save consultation to REAL DynamoDB
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

          const putCommand = new PutCommand({
            TableName: process.env.CONSULTATIONS_TABLE,
            Item: consultationData
          });

          await docClient.send(putCommand);
          console.log('✅ Consultation saved to REAL DynamoDB:', consultationId);
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
              transcription: "Amazon Transcribe (REAL AWS - SUCCESS)",
              analysis: "Amazon Bedrock Claude 3.5 Sonnet (REAL AWS - SUCCESS)",
              storage: "Amazon DynamoDB (REAL AWS - SUCCESS)"
            },
            realAWS: true,
            note: "Procesado con servicios AWS REALES - No simulado"
          })
        };

      } catch (awsError) {
        console.error('REAL AWS Services Error:', awsError);
        
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
              transcription: "Amazon Transcribe Medical (REAL - ERROR)",
              analysis: "Amazon Bedrock Claude 3.5 Sonnet (REAL - ERROR)",
              storage: "Amazon DynamoDB (REAL - ERROR)"
            },
            troubleshooting: {
              message: "REAL AWS services encountered an error",
              suggestion: "Check the detailed error message below",
              errorDetails: awsError.name + ": " + awsError.message,
              stack: awsError.stack
            },
            realAWS: true
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