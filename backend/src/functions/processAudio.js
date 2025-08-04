// Optimized processAudio function for handling long audio files
const { S3Client, GetObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

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

// Check if transcription is complete (non-blocking)
const checkTranscriptionStatus = async (jobName) => {
  try {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName
    });
    
    const response = await transcribeClient.send(command);
    const status = response.TranscriptionJob.TranscriptionJobStatus;
    
    console.log(`Transcription job ${jobName} status: ${status}`);
    return {
      status,
      job: response.TranscriptionJob
    };
  } catch (error) {
    console.error('Error checking transcription status:', error);
    return { status: 'ERROR', error: error.message };
  }
};

// Create or update patient information
const createOrUpdatePatient = async (patientData) => {
  const {
    patientName,
    patientDocument = '',
    age = '',
    gender = '',
    phone = '',
    email = '',
    address = '',
    emergencyContact = '',
    medicalHistory = '',
    allergies = '',
    medications = ''
  } = patientData;

  if (!patientName || patientName.trim() === '') {
    throw new Error('Patient name is required');
  }

  try {
    // First check if patient already exists by name
    const searchCommand = new QueryCommand({
      TableName: process.env.PATIENTS_TABLE,
      IndexName: 'PatientNameIndex',
      KeyConditionExpression: 'patient_name = :name',
      ExpressionAttributeValues: {
        ':name': patientName.trim()
      },
      Limit: 1
    });

    const existingPatient = await docClient.send(searchCommand);
    
    if (existingPatient.Items && existingPatient.Items.length > 0) {
      // Patient exists, return existing patient
      return existingPatient.Items[0];
    } else {
      // Patient doesn't exist, create new one
      const patientId = `patient-${generateUUID()}`;
      const timestamp = new Date().toISOString();
      
      const newPatient = {
        patient_id: patientId,
        patient_name: patientName.trim(),
        patient_document: patientDocument,
        age,
        gender,
        phone,
        email,
        address,
        emergency_contact: emergencyContact,
        medical_history: medicalHistory,
        allergies,
        medications,
        created_at: timestamp,
        updated_at: timestamp
      };

      const putCommand = new PutCommand({
        TableName: process.env.PATIENTS_TABLE,
        Item: newPatient
      });

      await docClient.send(putCommand);
      return newPatient;
    }

  } catch (error) {
    console.error('Error creating/updating patient:', error);
    throw error;
  }
};

exports.handler = async (event) => {
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

      const { 
        audioKey, 
        patientId, 
        doctorId, 
        specialty = 'general', 
        checkStatus = false, 
        consultationId: existingId, 
        saveOnly = false, 
        transcription, 
        transcriptionWithSpeakers, 
        aiAnalysis, 
        patientName,
        patientDocument,
        age,
        gender,
        phone,
        email,
        address,
        emergencyContact,
        medicalHistory,
        allergies,
        medications
      } = body;

      // DEBUG: Log received patient data
      console.log('🔍 DEBUG - processAudio recibió datos del paciente:', {
        patientName,
        patientNameType: typeof patientName,
        patientNameLength: patientName ? patientName.length : 0,
        patientNameTrimmed: patientName ? patientName.trim() : '',
        patientNameTrimmedLength: patientName ? patientName.trim().length : 0,
        patientId,
        age,
        gender,
        specialty,
        saveOnly,
        audioKey: audioKey ? 'presente' : 'ausente'
      });
      
      // Additional validation for patient name
      if (!patientName || typeof patientName !== 'string' || patientName.trim() === '') {
        console.error('❌ ERROR - Invalid patient name received:', {
          patientName,
          type: typeof patientName,
          isEmpty: patientName === '',
          isUndefined: patientName === undefined,
          isNull: patientName === null
        });
        
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'Patient name is required and cannot be empty',
            received: {
              patientName,
              type: typeof patientName
            }
          })
        };
      }

      if (!audioKey && !saveOnly) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            error: 'audioKey is required for processing (not required for saveOnly)' 
          })
        };
      }

      // Get user info from authorizer (if available)
      const user = event.requestContext?.authorizer?.claims;
      const userId = user?.sub || 'anonymous';
      const currentDoctorId = doctorId || userId;
      const cleanPatientName = patientName.trim();
      const currentPatientId = patientId || cleanPatientName || `patient-${Date.now()}`;
      
      const consultationId = existingId || generateUUID();
      const timestamp = new Date().toISOString();
      
      // DEBUG: Log processed patient data
      console.log('🔍 DEBUG - Datos procesados del paciente:', {
        cleanPatientName,
        currentPatientId,
        currentDoctorId
      });


      try {
        // Handle save-only request (manual save to history)
        if (saveOnly && transcription && aiAnalysis) {
          
          // Create or update patient information if patients table exists
          let patientInfo = null;
          if (process.env.PATIENTS_TABLE && cleanPatientName) {
            try {
              patientInfo = await createOrUpdatePatient({
                patientName: cleanPatientName,
                patientDocument,
                age,
                gender,
                phone,
                email,
                address,
                emergencyContact,
                medicalHistory,
                allergies,
                medications
              });
              console.log('Patient info created/updated:', patientInfo.patient_id);
            } catch (error) {
              console.error('Error creating/updating patient:', error);
              // Continue with consultation save even if patient creation fails
            }
          }
          
          if (process.env.CONSULTATIONS_TABLE) {
            const consultationData = {
              consultation_id: consultationId,
              doctor_id: currentDoctorId,
              patient_id: patientInfo ? patientInfo.patient_id : (patientId || currentPatientId),
              patient_name: cleanPatientName,
              audio_key: audioKey || `manual-save-${Date.now()}`,
              transcription: transcription,
              transcription_with_speakers: transcriptionWithSpeakers || transcription,
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
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              },
              body: JSON.stringify({
                success: true,
                consultationId,
                message: 'Consulta guardada exitosamente en el historial',
                timestamp,
                patientId: currentPatientId,
                doctorId: currentDoctorId,
                specialty,
                realAWS: true
              })
            };
          } else {
            throw new Error('CONSULTATIONS_TABLE not configured');
          }
        }

        // If this is a status check, check transcription status
        if (checkStatus && existingId) {
          const jobName = `transcription-${existingId}`;
          const statusResult = await checkTranscriptionStatus(jobName);
          
          if (statusResult.status === 'COMPLETED') {
            // Get transcription results and process with Bedrock
            try {
              const transcriptionKey = `transcriptions/${existingId}.json`;
              
              const getObjectCommand = new GetObjectCommand({
                Bucket: process.env.AUDIO_BUCKET_NAME,
                Key: transcriptionKey
              });

              const transcriptionResponse = await s3Client.send(getObjectCommand);
              const transcriptionDataStr = await transcriptionResponse.Body.transformToString();
              const transcriptionData = JSON.parse(transcriptionDataStr);
              
              // Extract full transcript
              const transcriptionText = transcriptionData.results.transcripts[0].transcript;
              
              // Process speaker segments for better formatting
              let speakerTranscription = '';
              let currentSpeaker = null;
              
              if (transcriptionData.results.speaker_labels && transcriptionData.results.speaker_labels.segments) {
                
                // Build a map of word timestamps to items
                const wordMap = new Map();
                if (transcriptionData.results.items) {
                  transcriptionData.results.items.forEach((item, index) => {
                    if (item.start_time) {
                      wordMap.set(parseFloat(item.start_time), {
                        index,
                        content: item.alternatives[0].content,
                        type: item.type
                      });
                    }
                  });
                }
                
                for (const segment of transcriptionData.results.speaker_labels.segments) {
                  const speakerLabel = segment.speaker_label;
                  const startTime = parseFloat(segment.start_time);
                  const endTime = parseFloat(segment.end_time);
                  
                  
                  // Get words within this time segment
                  const segmentWords = [];
                  
                  // Method 1: Use the items array directly based on time
                  if (transcriptionData.results.items) {
                    for (const item of transcriptionData.results.items) {
                      if (item.start_time && item.end_time) {
                        const itemStart = parseFloat(item.start_time);
                        const itemEnd = parseFloat(item.end_time);
                        
                        // Check if word falls within speaker segment
                        if (itemStart >= startTime && itemEnd <= endTime) {
                          if (item.type === 'pronunciation') {
                            segmentWords.push(item.alternatives[0].content);
                          } else if (item.type === 'punctuation') {
                            segmentWords.push(item.alternatives[0].content);
                          }
                        }
                      }
                    }
                  }
                  
                  const segmentText = segmentWords.join(' ').trim();
                  
                  if (segmentText && currentSpeaker !== speakerLabel) {
                    // New speaker - intelligent mapping optimizado para consultas médicas
                    let speakerName;
                    
                    // Análisis heurístico para identificar doctor vs paciente
                    const medicalTerms = ['diagnóstico', 'tratamiento', 'medicamento', 'prescribir', 'síntomas', 'examen', 'receta', 'dosis'];
                    const patientTerms = ['dolor', 'siento', 'me duele', 'molestia', 'desde hace', 'me pasa', 'tengo'];
                    
                    const segmentLower = segmentText.toLowerCase();
                    const hasMedicalTerms = medicalTerms.some(term => segmentLower.includes(term));
                    const hasPatientTerms = patientTerms.some(term => segmentLower.includes(term));
                    
                    switch(speakerLabel) {
                      case 'spk_0':
                        // Primer hablante - generalmente doctor (quien inicia la consulta)
                        speakerName = hasMedicalTerms || !hasPatientTerms ? 'Doctor' : 'Paciente';
                        break;
                      case 'spk_1':
                        // Segundo hablante - generalmente paciente
                        speakerName = hasPatientTerms || !hasMedicalTerms ? 'Paciente' : 'Doctor';
                        break;
                      default:
                        // Fallback para casos excepcionales
                        speakerName = `Hablante ${speakerLabel.replace('spk_', '')}`;
                    }
                    
                    speakerTranscription += `\n\n**${speakerName}:** `;
                    currentSpeaker = speakerLabel;
                  }
                  
                  if (segmentText) {
                    speakerTranscription += segmentText + ' ';
                  }
                }
              } else {
                speakerTranscription = transcriptionText;
              }


              // Process with REAL Amazon Bedrock (Claude 3.5 Sonnet)
              
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


              // Create or update patient information if patients table exists
              let patientInfo = null;
              if (process.env.PATIENTS_TABLE && cleanPatientName) {
                try {
                  patientInfo = await createOrUpdatePatient({
                    patientName: cleanPatientName,
                    patientDocument,
                    age,
                    gender,
                    phone,
                    email,
                    address,
                    emergencyContact,
                    medicalHistory,
                    allergies,
                    medications
                  });
                  console.log('Patient info created/updated during processing:', patientInfo.patient_id);
                } catch (error) {
                  console.error('Error creating/updating patient during processing:', error);
                  // Continue with consultation save even if patient creation fails
                }
              }

              // Save consultation to REAL DynamoDB
              if (process.env.CONSULTATIONS_TABLE) {
                const consultationData = {
                  consultation_id: consultationId,
                  doctor_id: currentDoctorId,
                  patient_id: patientInfo ? patientInfo.patient_id : currentPatientId,
                  patient_name: cleanPatientName,
                  audio_key: audioKey,
                  transcription: transcriptionText,
                  transcription_with_speakers: speakerTranscription,
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
                  transcriptionWithSpeakers: speakerTranscription,
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
                  note: "Procesado con servicios AWS REALES - Completado"
                })
              };
            } catch (processError) {
              console.error('Error processing completed transcription:', processError);
              return {
                statusCode: 200,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                },
                body: JSON.stringify({
                  success: false,
                  status: 'processing_error',
                  consultationId,
                  error: processError.message,
                  realAWS: true
                })
              };
            }
          } else if (statusResult.status === 'FAILED') {
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              },
              body: JSON.stringify({
                success: false,
                status: 'failed',
                consultationId,
                error: 'Transcription failed',
                realAWS: true
              })
            };
          } else {
            // Still processing
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              },
              body: JSON.stringify({
                success: false,
                status: 'processing',
                consultationId,
                message: 'Transcription still in progress. Please check again in a few moments.',
                realAWS: true,
                services: {
                  transcription: `Amazon Transcribe (REAL AWS - ${statusResult.status})`
                }
              })
            };
          }
        }

        // Initial processing - start transcription job
        
        // Test S3 first
        try {
          const headCommand = new HeadBucketCommand({ Bucket: process.env.AUDIO_BUCKET_NAME });
          await s3Client.send(headCommand);
        } catch (s3Error) {
          console.error('S3 bucket not accessible:', s3Error.message);
          throw new Error(`S3 bucket error: ${s3Error.message}`);
        }

        // Start REAL Amazon Transcribe job (async)
        const jobName = `transcription-${consultationId}`;
        const s3Uri = `s3://${process.env.AUDIO_BUCKET_NAME}/${audioKey}`;


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
            MaxSpeakerLabels: 2,  // Optimizado para doctor y paciente únicamente
            ChannelIdentification: false,
            VocabularyName: undefined, // Podemos agregar vocabulario médico personalizado
            VocabularyFilterName: undefined
          }
        });

        await transcribeClient.send(transcribeCommand);

        // Return immediately with processing status
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({
            success: false,
            status: 'processing',
            consultationId,
            message: 'Audio uploaded successfully. Transcription started. This may take a few minutes for longer audio files.',
            timestamp,
            patientId: currentPatientId,
            doctorId: currentDoctorId,
            specialty,
            services: {
              transcription: "Amazon Transcribe (REAL AWS - STARTED)",
              analysis: "Amazon Bedrock Claude 3.5 Sonnet (REAL AWS - WAITING)",
              storage: "Amazon DynamoDB (REAL AWS - READY)"
            },
            realAWS: true,
            note: "Procesamiento iniciado con servicios AWS REALES. Use checkStatus=true para verificar progreso.",
            checkStatusUrl: `/api/audio/process`,
            checkStatusPayload: {
              audioKey,
              consultationId,
              checkStatus: true
            }
          })
        };

      } catch (awsError) {
        console.error('REAL AWS Services Error:', awsError);
        
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
              transcription: "Amazon Transcribe (REAL - ERROR)",
              analysis: "Amazon Bedrock Claude 3.5 Sonnet (REAL - ERROR)",
              storage: "Amazon DynamoDB (REAL - ERROR)"
            },
            troubleshooting: {
              message: "REAL AWS services encountered an error",
              suggestion: "Check the detailed error message below",
              errorDetails: awsError.name + ": " + awsError.message
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
        timestamp: new Date().toISOString()
      })
    };
  }
};