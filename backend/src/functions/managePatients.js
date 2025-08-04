const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { v4: uuidv4 } = require('uuid')

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

exports.handler = async (event) => {
  try {
    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      }
    }

    // Parse request body for POST/PUT
    let body = {}
    if (event.body) {
      try {
        body = JSON.parse(event.body)
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ error: 'Invalid JSON body' })
        }
      }
    }

    const { pathParameters, httpMethod, queryStringParameters } = event
    const patientId = pathParameters?.patientId
    const queryParams = queryStringParameters || {}

    switch (httpMethod) {
      case 'POST':
        return await createOrUpdatePatient(body)
      
      case 'GET':
        if (patientId) {
          return await getPatient(patientId)
        } else {
          return await searchPatients(queryParams)
        }
      
      case 'PUT':
        if (!patientId) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            body: JSON.stringify({ error: 'Patient ID required for update' })
          }
        }
        return await updatePatient(patientId, body)
      
      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

  } catch (error) {
    console.error('Error in managePatients:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// Crear o obtener paciente existente
async function createOrUpdatePatient(patientData) {
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
  } = patientData

  if (!patientName || patientName.trim() === '') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Patient name is required' })
    }
  }

  // Primero buscar si ya existe un paciente con este nombre
  try {
    const searchCommand = new QueryCommand({
      TableName: process.env.PATIENTS_TABLE,
      IndexName: 'PatientNameIndex',
      KeyConditionExpression: 'patient_name = :name',
      ExpressionAttributeValues: {
        ':name': patientName.trim()
      },
      Limit: 1
    })

    const existingPatient = await dynamoClient.send(searchCommand)
    
    if (existingPatient.Items && existingPatient.Items.length > 0) {
      // Paciente existe, actualizar información
      const patient = existingPatient.Items[0]
      const updateCommand = new UpdateCommand({
        TableName: process.env.PATIENTS_TABLE,
        Key: { patient_id: patient.patient_id },
        UpdateExpression: `SET 
          patient_document = :doc,
          age = :age,
          gender = :gender,
          phone = :phone,
          email = :email,
          address = :address,
          emergency_contact = :emergency,
          medical_history = :history,
          allergies = :allergies,
          medications = :medications,
          updated_at = :updated`,
        ExpressionAttributeValues: {
          ':doc': patientDocument,
          ':age': age,
          ':gender': gender,
          ':phone': phone,
          ':email': email,
          ':address': address,
          ':emergency': emergencyContact,
          ':history': medicalHistory,
          ':allergies': allergies,
          ':medications': medications,
          ':updated': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      })

      const result = await dynamoClient.send(updateCommand)
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({
          success: true,
          patient: result.Attributes,
          message: 'Patient information updated'
        })
      }
    } else {
      // Paciente no existe, crear nuevo
      const patientId = `patient-${uuidv4()}`
      const timestamp = new Date().toISOString()
      
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
      }

      const putCommand = new PutCommand({
        TableName: process.env.PATIENTS_TABLE,
        Item: newPatient
      })

      await dynamoClient.send(putCommand)

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({
          success: true,
          patient: newPatient,
          message: 'New patient created'
        })
      }
    }

  } catch (error) {
    console.error('Error creating/updating patient:', error)
    throw error
  }
}

// Obtener paciente por ID
async function getPatient(patientId) {
  try {
    const getCommand = new GetCommand({
      TableName: process.env.PATIENTS_TABLE,
      Key: { patient_id: patientId }
    })

    const result = await dynamoClient.send(getCommand)

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'Patient not found' })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({
        success: true,
        patient: result.Item
      })
    }

  } catch (error) {
    console.error('Error getting patient:', error)
    throw error
  }
}

// Buscar pacientes por nombre
async function searchPatients(queryParams) {
  const { name, limit = '20' } = queryParams

  try {
    if (name) {
      // Buscar por nombre específico
      const searchCommand = new QueryCommand({
        TableName: process.env.PATIENTS_TABLE,
        IndexName: 'PatientNameIndex',
        KeyConditionExpression: 'patient_name = :name',
        ExpressionAttributeValues: {
          ':name': name
        },
        Limit: parseInt(limit)
      })

      const result = await dynamoClient.send(searchCommand)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({
          success: true,
          patients: result.Items || [],
          count: result.Items ? result.Items.length : 0
        })
      }
    } else {
      // Listar todos los pacientes (con límite)
      const scanCommand = new ScanCommand({
        TableName: process.env.PATIENTS_TABLE,
        Limit: parseInt(limit)
      })

      const result = await dynamoClient.send(scanCommand)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({
          success: true,
          patients: result.Items || [],
          count: result.Items ? result.Items.length : 0
        })
      }
    }

  } catch (error) {
    console.error('Error searching patients:', error)
    throw error
  }
}

// Actualizar paciente
async function updatePatient(patientId, updateData) {
  try {
    // Primero verificar que el paciente existe
    const getCommand = new GetCommand({
      TableName: process.env.PATIENTS_TABLE,
      Key: { patient_id: patientId }
    })

    const existingPatient = await dynamoClient.send(getCommand)

    if (!existingPatient.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'Patient not found' })
      }
    }

    // Actualizar campos proporcionados
    const updateExpression = []
    const expressionAttributeValues = {}
    
    const allowedFields = [
      'patient_name', 'patient_document', 'age', 'gender', 
      'phone', 'email', 'address', 'emergency_contact',
      'medical_history', 'allergies', 'medications'
    ]

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateExpression.push(`${field} = :${field}`)
        expressionAttributeValues[`:${field}`] = updateData[field]
      }
    })

    if (updateExpression.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'No valid fields to update' })
      }
    }

    updateExpression.push('updated_at = :updated_at')
    expressionAttributeValues[':updated_at'] = new Date().toISOString()

    const updateCommand = new UpdateCommand({
      TableName: process.env.PATIENTS_TABLE,
      Key: { patient_id: patientId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    })

    const result = await dynamoClient.send(updateCommand)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({
        success: true,
        patient: result.Attributes,
        message: 'Patient updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
}