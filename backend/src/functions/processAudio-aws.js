// Real processAudio function with AWS services
const { S3 } = require('@aws-sdk/client-s3');
const { TranscribeService } = require('@aws-sdk/client-transcribe');
const { BedrockRuntime } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
let s3Client, transcribeClient, bedrockClient, dynamoClient;

try {
  const region = process.env.AWS_REGION || 'us-east-1';
  s3Client = new S3({ region });
  transcribeClient = new TranscribeService({ region });
  bedrockClient = new BedrockRuntime({ region });
  dynamoClient = DynamoDBDocument.from(new DynamoDB({ region }));
} catch (error) {
  console.warn('AWS clients initialization error:', error);
}

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
      const response = await transcribeClient.getMedicalTranscriptionJob({
        MedicalTranscriptionJobName: jobName
      });
      
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

  console.log('=== PROCESS AUDIO WITH REAL AWS SERVICES ===');
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
      console.log('Processing audio with real AWS Transcribe Medical and Bedrock');
      
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

      // Check if we have the necessary services configured
      if (!transcribeClient || !bedrockClient || !s3Client) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({
            success: true,
            consultationId,
            transcription: "AWS services not fully configured. Using simulated transcription for testing.",
            aiAnalysis: `ANÁLISIS MÉDICO (SIMULADO - AWS LISTO):

1. RESUMEN CLÍNICO:
   - AudioKey procesado: ${audioKey}
   - Paciente: ${currentPatientId}
   - Doctor: ${currentDoctorId}
   - Especialidad: ${specialty}

2. ESTADO DEL SISTEMA:
   - Amazon S3: ${s3Client ? 'CONFIGURADO' : 'NO CONFIGURADO'}
   - Amazon Transcribe Medical: ${transcribeClient ? 'CONFIGURADO' : 'NO CONFIGURADO'}
   - Amazon Bedrock: ${bedrockClient ? 'CONFIGURADO' : 'NO CONFIGURADO'}
   - Amazon DynamoDB: ${dynamoClient ? 'CONFIGURADO' : 'NO CONFIGURADO'}

3. PRÓXIMOS PASOS:
   - Habilitar acceso a Amazon Bedrock Claude 3 Sonnet
   - Configurar permisos IAM apropiados
   - Verificar configuración de buckets S3

El sistema está técnicamente listo para servicios AWS reales.`,
            timestamp,
            patientId: currentPatientId,
            doctorId: currentDoctorId,
            specialty,
            services: {
              transcription: transcribeClient ? "Amazon Transcribe Medical (READY)" : "Amazon Transcribe Medical (NOT CONFIGURED)",
              analysis: bedrockClient ? "Amazon Bedrock Claude 3 Sonnet (READY)" : "Amazon Bedrock (NOT CONFIGURED)",
              storage: dynamoClient ? "Amazon DynamoDB (READY)" : "Amazon DynamoDB (NOT CONFIGURED)"
            }
          })
        };
      }

      // Real AWS implementation
      try {
        // 1. Start Amazon Transcribe Medical job
        const jobName = `transcription-${consultationId}`;
        const s3Uri = `s3://${process.env.AUDIO_BUCKET_NAME}/${audioKey}`;

        console.log('Starting Transcribe Medical job:', jobName);

        await transcribeClient.startMedicalTranscriptionJob({
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
        });

        // 2. Wait for transcription completion
        console.log('Waiting for transcription completion...');
        const transcriptionJob = await waitForTranscriptionCompletion(jobName);
        
        // 3. Get transcription results from S3
        const transcriptionKey = `transcriptions/${consultationId}.json`;
        const transcriptionResponse = await s3Client.getObject({
          Bucket: process.env.AUDIO_BUCKET_NAME,
          Key: transcriptionKey
        });

        const transcriptionData = JSON.parse(await transcriptionResponse.Body.transformToString());
        const transcriptionText = transcriptionData.results.transcripts[0].transcript;

        console.log('Transcription completed:', transcriptionText.substring(0, 100) + '...');

        // 4. Analyze with Amazon Bedrock (Claude 3 Sonnet)
        console.log('Analyzing with Amazon Bedrock Claude 3 Sonnet...');
        
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

        const bedrockResponse = await bedrockClient.invokeModel({
          modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
          contentType: 'application/json',
          body: JSON.stringify(bedrockPayload)
        });

        const aiAnalysisResult = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        const aiAnalysis = aiAnalysisResult.content[0].text;

        console.log('AI analysis completed');

        // 5. Save consultation to DynamoDB (if configured)
        if (dynamoClient && process.env.CONSULTATIONS_TABLE) {
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

          await dynamoClient.put({
            TableName: process.env.CONSULTATIONS_TABLE,
            Item: consultationData
          });

          console.log('Consultation saved to DynamoDB:', consultationId);
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
              transcription: "Amazon Transcribe Medical (REAL)",
              analysis: "Amazon Bedrock Claude 3 Sonnet (REAL)",
              storage: "Amazon DynamoDB (REAL)"
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
              transcription: "Amazon Transcribe Medical (ERROR)",
              analysis: "Amazon Bedrock Claude 3 Sonnet (ERROR)",
              storage: "Amazon DynamoDB (ERROR)"
            },
            troubleshooting: {
              message: "AWS services encountered an error",
              suggestion: "Check IAM permissions, Bedrock model access, and S3 bucket configuration",
              errorDetails: awsError.name + ": " + awsError.message
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
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};