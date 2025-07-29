const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log('Get History Lambda - Event:', JSON.stringify(event, null, 2));
        
        // Obtener información del usuario
        const userSub = event.requestContext?.authorizer?.claims?.sub || 'anonymous';
        const doctorEmail = event.requestContext?.authorizer?.claims?.email || 'unknown';
        
        // Parsear parámetros de consulta
        const queryParams = event.queryStringParameters || {};
        const limit = parseInt(queryParams.limit) || 20;
        const lastKey = queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : null;
        const filterType = queryParams.type || 'all'; // 'all', 'consultations', 'prescriptions'
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;
        
        let result = {};
        
        switch (filterType) {
            case 'consultations':
                result = await getConsultations(doctorEmail, userSub, limit, lastKey, startDate, endDate);
                break;
            case 'prescriptions':
                result = await getPrescriptions(doctorEmail, userSub, limit, lastKey, startDate, endDate);
                break;
            case 'all':
            default:
                // Obtener ambos tipos de datos
                const consultationsResult = await getConsultations(doctorEmail, userSub, Math.ceil(limit/2), null, startDate, endDate);
                const prescriptionsResult = await getPrescriptions(doctorEmail, userSub, Math.ceil(limit/2), null, startDate, endDate);
                
                result = {
                    consultations: consultationsResult.items,
                    prescriptions: prescriptionsResult.items,
                    lastKeys: {
                        consultations: consultationsResult.lastKey,
                        prescriptions: prescriptionsResult.lastKey
                    }
                };
                break;
        }
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            body: JSON.stringify({
                message: 'History retrieved successfully',
                data: result,
                filters: {
                    type: filterType,
                    limit: limit,
                    startDate: startDate,
                    endDate: endDate
                },
                userInfo: {
                    userSub: userSub,
                    doctorEmail: doctorEmail
                }
            })
        };
        
    } catch (error) {
        console.error('Error getting history:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Función auxiliar para obtener consultas
async function getConsultations(doctorEmail, userSub, limit, lastKey, startDate, endDate) {
    try {
        const params = {
            TableName: process.env.CONSULTATIONS_TABLE,
            IndexName: 'doctor-date-index', // Asumiendo que existe este GSI
            KeyConditionExpression: 'doctor_id = :doctor_id',
            ExpressionAttributeValues: {
                ':doctor_id': doctorEmail
            },
            ScanIndexForward: false, // Orden descendente (más recientes primero)
            Limit: limit
        };
        
        // Añadir filtro de fechas si se proporciona
        if (startDate && endDate) {
            params.FilterExpression = 'created_at BETWEEN :start_date AND :end_date';
            params.ExpressionAttributeValues[':start_date'] = startDate;
            params.ExpressionAttributeValues[':end_date'] = endDate;
        } else if (startDate) {
            params.FilterExpression = 'created_at >= :start_date';
            params.ExpressionAttributeValues[':start_date'] = startDate;
        } else if (endDate) {
            params.FilterExpression = 'created_at <= :end_date';
            params.ExpressionAttributeValues[':end_date'] = endDate;
        }
        
        // Añadir paginación
        if (lastKey) {
            params.ExclusiveStartKey = lastKey;
        }
        
        console.log('Querying consultations with params:', JSON.stringify(params, null, 2));
        const result = await dynamodb.query(params).promise();
        
        // Procesar items para remover información sensible si es necesario
        const processedItems = result.Items.map(item => ({
            consultation_id: item.consultation_id,
            patient_id: item.patient_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            status: item.status,
            // Incluir transcripción truncada para vista previa
            transcription_preview: item.transcription ? item.transcription.substring(0, 200) + '...' : '',
            // Incluir análisis truncado
            ai_analysis_preview: item.ai_analysis ? item.ai_analysis.substring(0, 300) + '...' : '',
            // Información del doctor
            doctor_info: item.doctor_info,
            // Información de PDF si existe
            prescription_pdf: item.prescription_pdf ? {
                pdf_id: item.prescription_pdf.pdf_id,
                created_at: item.prescription_pdf.created_at
            } : null
        }));
        
        return {
            items: processedItems,
            lastKey: result.LastEvaluatedKey,
            count: result.Count,
            scannedCount: result.ScannedCount
        };
        
    } catch (error) {
        console.error('Error querying consultations:', error);
        
        // Si no existe el índice, hacer un scan (menos eficiente)
        const scanParams = {
            TableName: process.env.CONSULTATIONS_TABLE,
            FilterExpression: 'doctor_id = :doctor_id',
            ExpressionAttributeValues: {
                ':doctor_id': doctorEmail
            },
            Limit: limit
        };
        
        if (lastKey) {
            scanParams.ExclusiveStartKey = lastKey;
        }
        
        const scanResult = await dynamodb.scan(scanParams).promise();
        
        // Ordenar por fecha (más recientes primero)
        const sortedItems = scanResult.Items.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        const processedItems = sortedItems.map(item => ({
            consultation_id: item.consultation_id,
            patient_id: item.patient_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            status: item.status,
            transcription_preview: item.transcription ? item.transcription.substring(0, 200) + '...' : '',
            ai_analysis_preview: item.ai_analysis ? item.ai_analysis.substring(0, 300) + '...' : '',
            doctor_info: item.doctor_info,
            prescription_pdf: item.prescription_pdf ? {
                pdf_id: item.prescription_pdf.pdf_id,
                created_at: item.prescription_pdf.created_at
            } : null
        }));
        
        return {
            items: processedItems,
            lastKey: scanResult.LastEvaluatedKey,
            count: scanResult.Count,
            scannedCount: scanResult.ScannedCount
        };
    }
}

// Función auxiliar para obtener recetas/PDFs
async function getPrescriptions(doctorEmail, userSub, limit, lastKey, startDate, endDate) {
    try {
        // Buscar consultas que tengan PDFs asociados
        const params = {
            TableName: process.env.CONSULTATIONS_TABLE,
            FilterExpression: 'doctor_id = :doctor_id AND attribute_exists(prescription_pdf)',
            ExpressionAttributeValues: {
                ':doctor_id': doctorEmail
            },
            Limit: limit
        };
        
        // Añadir filtro de fechas si se proporciona
        if (startDate && endDate) {
            params.FilterExpression += ' AND created_at BETWEEN :start_date AND :end_date';
            params.ExpressionAttributeValues[':start_date'] = startDate;
            params.ExpressionAttributeValues[':end_date'] = endDate;
        } else if (startDate) {
            params.FilterExpression += ' AND created_at >= :start_date';
            params.ExpressionAttributeValues[':start_date'] = startDate;
        } else if (endDate) {
            params.FilterExpression += ' AND created_at <= :end_date';
            params.ExpressionAttributeValues[':end_date'] = endDate;
        }
        
        if (lastKey) {
            params.ExclusiveStartKey = lastKey;
        }
        
        console.log('Scanning prescriptions with params:', JSON.stringify(params, null, 2));
        const result = await dynamodb.scan(params).promise();
        
        // Procesar items para extraer información de prescripciones
        const processedItems = result.Items
            .filter(item => item.prescription_pdf) // Asegurar que tienen PDF
            .map(item => ({
                consultation_id: item.consultation_id,
                patient_id: item.patient_id,
                created_at: item.created_at,
                prescription_pdf: item.prescription_pdf,
                doctor_info: item.doctor_info,
                // Información básica de la consulta
                transcription_preview: item.transcription ? item.transcription.substring(0, 100) + '...' : '',
                ai_analysis_preview: item.ai_analysis ? item.ai_analysis.substring(0, 200) + '...' : ''
            }))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Ordenar por fecha
        
        return {
            items: processedItems,
            lastKey: result.LastEvaluatedKey,
            count: result.Count,
            scannedCount: result.ScannedCount
        };
        
    } catch (error) {
        console.error('Error querying prescriptions:', error);
        throw error;
    }
} 