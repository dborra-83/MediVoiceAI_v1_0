const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();

exports.handler = async (event) => {
    try {
        console.log('Upload Audio Lambda - Event:', JSON.stringify(event, null, 2));
        
        // Parsear el cuerpo de la petición
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        // Validar datos requeridos
        if (!body.audioData || !body.fileName) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'Missing required fields: audioData, fileName'
                })
            };
        }
        
        // Obtener información del usuario desde el token de Cognito
        const userSub = event.requestContext?.authorizer?.claims?.sub || 'anonymous';
        
        // Generar ID único para el archivo
        const fileId = uuidv4();
        const timestamp = new Date().toISOString();
        const bucketName = process.env.AUDIO_BUCKET_NAME;
        const key = `audio/${userSub}/${fileId}.webm`;
        
        // Decodificar audio base64
        const audioBuffer = Buffer.from(body.audioData, 'base64');
        
        // Validar tamaño del archivo (max 50MB)
        if (audioBuffer.length > 50 * 1024 * 1024) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'File too large. Maximum size is 50MB'
                })
            };
        }
        
        // Subir archivo a S3
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: audioBuffer,
            ContentType: 'audio/webm',
            Metadata: {
                'user-id': userSub,
                'original-filename': body.fileName,
                'upload-timestamp': timestamp,
                'file-id': fileId
            }
        };
        
        const uploadResult = await s3.upload(uploadParams).promise();
        
        console.log('Audio uploaded successfully:', uploadResult.Location);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                message: 'Audio uploaded successfully',
                fileId: fileId,
                location: uploadResult.Location,
                bucket: bucketName,
                key: key,
                timestamp: timestamp
            })
        };
        
    } catch (error) {
        console.error('Error uploading audio:', error);
        
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