const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb')
const jsPDF = require('jspdf')
const { v4: uuidv4 } = require('uuid')

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }))

// Función auxiliar para obtener datos del doctor
const getDoctorData = async (doctorId) => {
  try {
    const response = await dynamoClient.send(new GetCommand({
      TableName: process.env.DOCTORS_TABLE,
      Key: { doctor_id: doctorId }
    }))
    
    return response.Item || {
      name: 'Dr. Sin Nombre',
      license_number: 'N/A',
      specialty: 'Medicina General',
      institution: 'Institución Médica',
      phone: 'N/A',
      address: 'Dirección no disponible'
    }
  } catch (error) {
    console.error('Error obteniendo datos del doctor:', error)
    return {
      name: 'Dr. Sin Nombre',
      license_number: 'N/A',
      specialty: 'Medicina General',
      institution: 'Institución Médica',
      phone: 'N/A',
      address: 'Dirección no disponible'
    }
  }
}

// Función auxiliar para parsear el análisis de IA y extraer medicamentos
const parseMedications = (aiAnalysis) => {
  const medications = []
  
  try {
    // Buscar sección de medicamentos en el análisis
    const lines = aiAnalysis.split('\n')
    let inMedicationSection = false
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Detectar inicio de sección de medicamentos
      if (trimmedLine.toLowerCase().includes('medicament') || 
          trimmedLine.toLowerCase().includes('tratamiento') ||
          trimmedLine.toLowerCase().includes('prescripción')) {
        inMedicationSection = true
        continue
      }
      
      // Detectar fin de sección de medicamentos
      if (inMedicationSection && (
          trimmedLine.toLowerCase().includes('control') ||
          trimmedLine.toLowerCase().includes('seguimiento') ||
          trimmedLine.toLowerCase().includes('observaciones'))) {
        break
      }
      
      // Extraer medicamentos si estamos en la sección correcta
      if (inMedicationSection && trimmedLine.length > 0 && 
          (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.match(/^\d+\./))) {
        
        let medication = trimmedLine.replace(/^[-•\d.\s]+/, '').trim()
        
        if (medication.length > 0) {
          medications.push(medication)
        }
      }
    }
    
    // Si no se encontraron medicamentos en formato estructurado, buscar patrones comunes
    if (medications.length === 0) {
      const medicationPatterns = [
        /([A-Za-z]+\s*\d+\s*mg)/g,
        /([A-Za-z]+\s+\d+mg)/g,
        /(Paracetamol|Ibuprofeno|Amoxicilina|Aspirina|Omeprazol)[^.]*\./gi
      ]
      
      for (const pattern of medicationPatterns) {
        const matches = aiAnalysis.match(pattern)
        if (matches) {
          medications.push(...matches.slice(0, 5)) // Máximo 5 medicamentos
          break
        }
      }
    }
    
  } catch (error) {
    console.error('Error parseando medicamentos:', error)
  }
  
  // Medicamentos por defecto si no se encuentran
  if (medications.length === 0) {
    medications.push('Consultar análisis completo para medicamentos específicos')
  }
  
  return medications.slice(0, 10) // Máximo 10 medicamentos
}

// Función principal para generar PDF
const generatePrescriptionPDF = (consultationData, doctorData) => {
  const doc = new jsPDF()
  
  // Configuración de fuentes y colores
  doc.setFont('helvetica')
  
  // Header con logo y título
  doc.setFontSize(24)
  doc.setTextColor(41, 128, 185) // Azul médico
  doc.text('RECETA MÉDICA', 105, 25, { align: 'center' })
  
  // Línea decorativa
  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(1)
  doc.line(20, 30, 190, 30)
  
  // Información del doctor
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL MÉDICO', 20, 45)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Nombre: ${doctorData.name}`, 20, 55)
  doc.text(`Especialidad: ${doctorData.specialty}`, 20, 62)
  doc.text(`Registro Médico: ${doctorData.license_number}`, 20, 69)
  doc.text(`Institución: ${doctorData.institution}`, 20, 76)
  doc.text(`Teléfono: ${doctorData.phone}`, 20, 83)
  
  // Información del paciente
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('DATOS DEL PACIENTE', 20, 100)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`ID Paciente: ${consultationData.patient_id}`, 20, 110)
  doc.text(`Fecha de Consulta: ${new Date(consultationData.created_at).toLocaleDateString('es-ES')}`, 20, 117)
  doc.text(`Especialidad: ${consultationData.specialty || 'General'}`, 20, 124)
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 135, 190, 135)
  
  // Prescripción médica
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(220, 20, 60) // Rojo médico
  doc.text('PRESCRIPCIÓN MÉDICA', 20, 150)
  
  // Extraer y mostrar medicamentos
  const medications = parseMedications(consultationData.ai_analysis)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  
  let yPosition = 165
  
  medications.forEach((medication, index) => {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 30
    }
    
    doc.setFont('helvetica', 'bold')
    doc.text(`${index + 1}.`, 25, yPosition)
    doc.setFont('helvetica', 'normal')
    
    // Dividir líneas largas
    const splitText = doc.splitTextToSize(medication, 160)
    doc.text(splitText, 35, yPosition)
    
    yPosition += (splitText.length * 7) + 5
  })
  
  // Espacio para análisis completo si hay espacio
  if (yPosition < 220) {
    yPosition += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('OBSERVACIONES MÉDICAS', 20, yPosition)
    
    yPosition += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    // Extraer primeras líneas del análisis
    const analysisLines = consultationData.ai_analysis.split('\n').slice(0, 8)
    analysisLines.forEach(line => {
      if (yPosition > 270) return
      if (line.trim().length > 0) {
        const splitLine = doc.splitTextToSize(line.trim(), 170)
        doc.text(splitLine, 20, yPosition)
        yPosition += splitLine.length * 4
      }
    })
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 20, pageHeight - 20)
  doc.text(`ID Consulta: ${consultationData.consultation_id}`, 20, pageHeight - 15)
  doc.text('Este documento fue generado automáticamente por MediVoice AI', 20, pageHeight - 10)
  
  // Firma del médico (espacio)
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text('_________________________', 130, pageHeight - 40)
  doc.text(`${doctorData.name}`, 130, pageHeight - 30)
  doc.text(`Reg. ${doctorData.license_number}`, 130, pageHeight - 25)
  
  return doc.output('arraybuffer')
}

exports.handler = async (event) => {
  try {
    console.log('Generando PDF:', JSON.stringify(event, null, 2))
    
    // Verificar autenticación
    const user = event.requestContext.authorizer?.claims
    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'No autorizado' })
      }
    }

    // Parsear body
    let body
    try {
      body = JSON.parse(event.body)
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'Body inválido' })
      }
    }

    const { consultationId, doctorId } = body

    if (!consultationId || !doctorId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'consultationId y doctorId son requeridos' 
        })
      }
    }

    // Obtener datos de la consulta
    const consultationResponse = await dynamoClient.send(new GetCommand({
      TableName: process.env.CONSULTATIONS_TABLE,
      Key: { 
        consultation_id: consultationId,
        doctor_id: doctorId
      }
    }))

    if (!consultationResponse.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'Consulta no encontrada' })
      }
    }

    // Obtener datos del doctor
    const doctorData = await getDoctorData(doctorId)

    // Generar PDF
    const pdfBuffer = generatePrescriptionPDF(consultationResponse.Item, doctorData)
    
    // Subir PDF a S3
    const pdfKey = `pdfs/${user.sub}/${consultationId}/receta-${Date.now()}.pdf`
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.PDF_BUCKET_NAME,
      Key: pdfKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        'user-id': user.sub,
        'consultation-id': consultationId,
        'doctor-id': doctorId,
        'generated-at': new Date().toISOString()
      }
    }))

    console.log(`PDF generado exitosamente: ${pdfKey}`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        pdfKey,
        consultationId,
        doctorId,
        generatedAt: new Date().toISOString(),
        downloadUrl: `https://${process.env.PDF_BUCKET_NAME}.s3.amazonaws.com/${pdfKey}`
      })
    }

  } catch (error) {
    console.error('Error generando PDF:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
} 