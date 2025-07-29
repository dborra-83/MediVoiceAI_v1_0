const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();
const bedrock = new AWS.BedrockRuntime();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log('Process Audio Lambda - Event:', JSON.stringify(event, null, 2));
        
        // Parsear el cuerpo de la petición
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        // Validar datos requeridos
        if (!body.fileId || !body.bucket || !body.key) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'Missing required fields: fileId, bucket, key'
                })
            };
        }
        
        // Obtener información del usuario
        const userSub = event.requestContext?.authorizer?.claims?.sub || 'anonymous';
        const doctorEmail = event.requestContext?.authorizer?.claims?.email || 'unknown';
        
        // 1. Iniciar transcripción médica con Amazon Transcribe
        const transcriptionJobName = `medical-transcription-${body.fileId}`;
        const audioFileUri = `s3://${body.bucket}/${body.key}`;
        
        const transcribeParams = {
            TranscriptionJobName: transcriptionJobName,
            LanguageCode: 'es-ES',
            MediaFormat: 'webm',
            Media: {
                MediaFileUri: audioFileUri
            },
            OutputBucketName: body.bucket,
            OutputKey: `transcriptions/${body.fileId}.json`,
            Settings: {
                ShowSpeakerLabels: true,
                MaxSpeakerLabels: 2
            },
            JobExecutionSettings: {
                AllowDeferredExecution: false
            }
        };
        
        console.log('Starting transcription job:', transcribeParams);
        await transcribe.startTranscriptionJob(transcribeParams).promise();
        
        // 2. Esperar a que termine la transcripción (polling)
        let transcriptionResult;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutos máximo
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
            
            const jobStatus = await transcribe.getTranscriptionJob({
                TranscriptionJobName: transcriptionJobName
            }).promise();
            
            console.log(`Transcription attempt ${attempts + 1}, status: ${jobStatus.TranscriptionJob.TranscriptionJobStatus}`);
            
            if (jobStatus.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
                // Descargar resultado de transcripción desde S3
                const transcriptionKey = `transcriptions/${body.fileId}.json`;
                const transcriptionObject = await s3.getObject({
                    Bucket: body.bucket,
                    Key: transcriptionKey
                }).promise();
                
                transcriptionResult = JSON.parse(transcriptionObject.Body.toString());
                break;
            } else if (jobStatus.TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
                throw new Error('Transcription job failed');
            }
            
            attempts++;
        }
        
        if (!transcriptionResult) {
            throw new Error('Transcription timeout');
        }
        
        // 3. Extraer texto de la transcripción
        const transcriptText = transcriptionResult.results.transcripts[0].transcript;
        console.log('Transcription completed:', transcriptText.substring(0, 200) + '...');
        
        // 4. Obtener prompt médico personalizado
        const prompt = await getPromptBySpecialty('general'); // Por defecto general
        
        // 5. Procesar con Amazon Bedrock (Claude 3 Sonnet)
        const bedrockPayload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [
                {
                    role: "user",
                    content: prompt.replace('{transcription}', transcriptText)
                }
            ]
        };
        
        const bedrockParams = {
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(bedrockPayload)
        };
        
        console.log('Calling Bedrock with payload:', JSON.stringify(bedrockPayload, null, 2));
        const bedrockResponse = await bedrock.invokeModel(bedrockParams).promise();
        const bedrockResult = JSON.parse(bedrockResponse.body.toString());
        
        const aiAnalysis = bedrockResult.content[0].text;
        console.log('Bedrock analysis completed:', aiAnalysis.substring(0, 200) + '...');
        
        // 6. Obtener información del doctor
        const doctorData = await getDoctorData(doctorEmail);
        
        // 7. Guardar consulta en DynamoDB
        const consultationId = uuidv4();
        const consultation = {
            consultation_id: consultationId,
            doctor_id: doctorEmail,
            patient_id: userSub,
            audio_file_id: body.fileId,
            audio_location: audioFileUri,
            transcription: transcriptText,
            ai_analysis: aiAnalysis,
            doctor_info: doctorData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'completed'
        };
        
        await dynamodb.put({
            TableName: process.env.CONSULTATIONS_TABLE,
            Item: consultation
        }).promise();
        
        console.log('Consultation saved to DynamoDB:', consultationId);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                message: 'Audio processed successfully',
                consultationId: consultationId,
                transcription: transcriptText,
                aiAnalysis: aiAnalysis,
                doctorInfo: doctorData,
                fileId: body.fileId
            })
        };
        
    } catch (error) {
        console.error('Error processing audio:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Función auxiliar para obtener prompt por especialidad
async function getPromptBySpecialty(specialty) {
    try {
        const result = await dynamodb.get({
            TableName: process.env.PROMPTS_TABLE,
            Key: {
                specialty: specialty,
                is_active: 'true'
            }
        }).promise();
        
        if (result.Item) {
            return result.Item.content;
        }
    } catch (error) {
        console.error('Error getting prompt:', error);
    }
    
    // Prompt por defecto si no se encuentra
    return `Eres un asistente médico especializado. Analiza la siguiente transcripción de una consulta médica y genera:

1. RESUMEN CLÍNICO:
- Motivo de consulta
- Síntomas principales
- Antecedentes relevantes
- Examen físico (si aplica)

2. IMPRESIÓN DIAGNÓSTICA:
- Diagnóstico principal
- Diagnósticos diferenciales

3. PLAN TERAPÉUTICO:
- Medicamentos con dosis exactas
- Duración del tratamiento
- Indicaciones especiales
- Controles sugeridos

Transcripción: {transcription}`;
}

// Función auxiliar para obtener datos del doctor
async function getDoctorData(doctorEmail) {
    try {
        const result = await dynamodb.get({
            TableName: process.env.DOCTORS_TABLE,
            Key: {
                email: doctorEmail
            }
        }).promise();
        
        if (result.Item) {
            return result.Item;
        }
    } catch (error) {
        console.error('Error getting doctor data:', error);
    }
    
    // Datos por defecto si no se encuentra
    return {
        name: 'Dr. Usuario',
        license_number: 'N/A',
        specialty: 'Medicina General',
        institution: 'MediVoice AI',
        email: doctorEmail
    };
} 