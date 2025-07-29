const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        console.log('Generate PDF Lambda - Event:', JSON.stringify(event, null, 2));
        
        // Parsear el cuerpo de la petición
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        // Validar datos requeridos
        if (!body.consultationId || !body.medications) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'Missing required fields: consultationId, medications'
                })
            };
        }
        
        // Obtener información del usuario
        const userSub = event.requestContext?.authorizer?.claims?.sub || 'anonymous';
        const doctorEmail = event.requestContext?.authorizer?.claims?.email || 'unknown';
        
        // 1. Obtener datos de la consulta
        const consultationResult = await dynamodb.get({
            TableName: process.env.CONSULTATIONS_TABLE,
            Key: {
                consultation_id: body.consultationId
            }
        }).promise();
        
        if (!consultationResult.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'Consultation not found'
                })
            };
        }
        
        const consultation = consultationResult.Item;
        
        // 2. Obtener información del doctor
        const doctorData = await getDoctorData(doctorEmail);
        
        // 3. Parsear medicamentos del análisis de IA
        const medications = parseMedications(body.medications);
        
        // 4. Generar contenido HTML del PDF
        const pdfContent = generatePrescriptionHTML({
            consultation,
            doctorData,
            medications,
            patientInfo: body.patientInfo || {},
            observations: body.observations || '',
            additionalNotes: body.additionalNotes || ''
        });
        
        // 5. Para una implementación simple, generaremos el HTML y lo guardaremos
        // En producción, usarías una librería como Puppeteer o similar para generar PDF real
        const pdfId = uuidv4();
        const timestamp = new Date().toISOString();
        const bucketName = process.env.PDF_BUCKET_NAME;
        const key = `prescriptions/${userSub}/${pdfId}.html`;
        
        // Subir HTML a S3 (en producción sería un PDF real)
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: pdfContent,
            ContentType: 'text/html',
            Metadata: {
                'doctor-id': doctorEmail,
                'patient-id': userSub,
                'consultation-id': body.consultationId,
                'pdf-id': pdfId,
                'created-timestamp': timestamp
            }
        };
        
        const uploadResult = await s3.upload(uploadParams).promise();
        
        // 6. Actualizar consulta con referencia al PDF
        await dynamodb.update({
            TableName: process.env.CONSULTATIONS_TABLE,
            Key: {
                consultation_id: body.consultationId
            },
            UpdateExpression: 'SET prescription_pdf = :pdf, updated_at = :updated',
            ExpressionAttributeValues: {
                ':pdf': {
                    pdf_id: pdfId,
                    location: uploadResult.Location,
                    bucket: bucketName,
                    key: key,
                    created_at: timestamp
                },
                ':updated': timestamp
            }
        }).promise();
        
        console.log('PDF generated and saved:', uploadResult.Location);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                message: 'PDF generated successfully',
                pdfId: pdfId,
                location: uploadResult.Location,
                bucket: bucketName,
                key: key,
                consultationId: body.consultationId,
                timestamp: timestamp
            })
        };
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        
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
    
    return {
        name: 'Dr. Usuario',
        license_number: 'N/A',
        specialty: 'Medicina General',
        institution: 'MediVoice AI',
        email: doctorEmail,
        phone: 'N/A',
        address: 'N/A'
    };
}

// Función auxiliar para parsear medicamentos
function parseMedications(medicationsText) {
    // Implementación simple de parsing
    // En producción, usarías NLP más sofisticado
    const medications = [];
    
    if (typeof medicationsText === 'string') {
        const lines = medicationsText.split('\n');
        for (const line of lines) {
            if (line.trim() && (line.includes('mg') || line.includes('ml') || line.includes('tab'))) {
                const parts = line.split('-');
                medications.push({
                    name: parts[0]?.trim() || 'Medicamento',
                    dosage: parts[1]?.trim() || 'Según indicación médica',
                    frequency: parts[2]?.trim() || 'Según indicación médica',
                    duration: parts[3]?.trim() || '7 días'
                });
            }
        }
    } else if (Array.isArray(medicationsText)) {
        return medicationsText;
    }
    
    if (medications.length === 0) {
        medications.push({
            name: 'Medicamento según análisis',
            dosage: 'Según indicación médica',
            frequency: 'Según indicación médica',
            duration: '7 días'
        });
    }
    
    return medications;
}

// Función auxiliar para generar HTML de la receta
function generatePrescriptionHTML(data) {
    const { consultation, doctorData, medications, patientInfo, observations, additionalNotes } = data;
    
    const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receta Médica - MediVoice AI</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .prescription {
            background: white;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 28px;
        }
        .header h2 {
            color: #64748b;
            margin: 5px 0 0 0;
            font-size: 16px;
            font-weight: normal;
        }
        .doctor-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .doctor-info h3 {
            color: #1e293b;
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .patient-info {
            background: #fefce8;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #eab308;
        }
        .prescription-section {
            margin-bottom: 30px;
        }
        .prescription-section h3 {
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .medication {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            border-left: 4px solid #3b82f6;
        }
        .medication h4 {
            color: #1e293b;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .medication-details {
            color: #64748b;
            font-size: 14px;
            line-height: 1.5;
        }
        .observations {
            background: #fef2f2;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ef4444;
            margin-bottom: 30px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            width: 200px;
            margin: 20px auto;
            height: 1px;
        }
        .generated-by {
            color: #64748b;
            font-size: 12px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="prescription">
        <div class="header">
            <h1>RECETA MÉDICA</h1>
            <h2>Generada por MediVoice AI</h2>
        </div>
        
        <div class="doctor-info">
            <h3>Información del Médico</h3>
            <div class="info-row">
                <span><strong>Nombre:</strong> ${doctorData.name || 'Dr. Usuario'}</span>
                <span><strong>Fecha:</strong> ${currentDate}</span>
            </div>
            <div class="info-row">
                <span><strong>Especialidad:</strong> ${doctorData.specialty || 'Medicina General'}</span>
                <span><strong>Reg. Médico:</strong> ${doctorData.license_number || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span><strong>Institución:</strong> ${doctorData.institution || 'MediVoice AI'}</span>
                <span><strong>Teléfono:</strong> ${doctorData.phone || 'N/A'}</span>
            </div>
        </div>
        
        <div class="patient-info">
            <h3>Información del Paciente</h3>
            <div class="info-row">
                <span><strong>Nombre:</strong> ${patientInfo.name || 'Paciente'}</span>
                <span><strong>Edad:</strong> ${patientInfo.age || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span><strong>ID Consulta:</strong> ${consultation.consultation_id}</span>
                <span><strong>Fecha Consulta:</strong> ${new Date(consultation.created_at).toLocaleDateString('es-ES')}</span>
            </div>
        </div>
        
        <div class="prescription-section">
            <h3>PRESCRIPCIÓN MÉDICA</h3>
            ${medications.map(med => `
                <div class="medication">
                    <h4>${med.name}</h4>
                    <div class="medication-details">
                        <strong>Dosis:</strong> ${med.dosage}<br>
                        <strong>Frecuencia:</strong> ${med.frequency}<br>
                        <strong>Duración:</strong> ${med.duration}
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${observations ? `
        <div class="observations">
            <h3>Observaciones Especiales</h3>
            <p>${observations}</p>
        </div>
        ` : ''}
        
        ${additionalNotes ? `
        <div class="prescription-section">
            <h3>Notas Adicionales</h3>
            <p>${additionalNotes}</p>
        </div>
        ` : ''}
        
        <div class="footer">
            <p><strong>Firma del Médico</strong></p>
            <div class="signature-line"></div>
            <p>${doctorData.name || 'Dr. Usuario'}</p>
            <p><strong>Reg. Médico:</strong> ${doctorData.license_number || 'N/A'}</p>
            
            <div class="generated-by">
                <p>Documento generado automáticamente por MediVoice AI</p>
                <p>ID del documento: ${data.pdfId || uuidv4()}</p>
                <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
} 