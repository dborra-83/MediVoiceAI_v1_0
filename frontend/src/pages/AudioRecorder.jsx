import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import config from '../config'
import Swal from 'sweetalert2'

function AudioRecorder() {
  // Estados del formulario pre-grabación
  const [showPatientForm, setShowPatientForm] = useState(true)
  const [patientData, setPatientData] = useState({
    patientName: '',
    patientId: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    specialty: 'general',
    consultationType: 'consulta',
    notes: ''
  })
  
  // Estados de grabación y procesamiento
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcription, setTranscription] = useState('')
  const [transcriptionWithSpeakers, setTranscriptionWithSpeakers] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [consultationId, setConsultationId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [shouldAutoProcess, setShouldAutoProcess] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  // Auto-process when audioBlob is ready after recording
  useEffect(() => {
    if (audioBlob && shouldAutoProcess && !processing) {
      setShouldAutoProcess(false) // Reset flag
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        processAudio()
      }, 100)
    }
  }, [audioBlob, shouldAutoProcess, processing])

  // Auto-save function with SweetAlert2
  const performAutoSave = async () => {
    if (!transcription || !analysis || !autoSaveEnabled) return

    try {
      // Show loading alert
      Swal.fire({
        title: 'Guardando consulta...',
        text: 'Por favor espera mientras guardamos tu consulta',
        icon: 'info',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading()
        }
      })

      // The consultation should already be saved during processing,
      // but we can verify it was saved correctly
      if (consultationId) {
        // Show success with option to go to dashboard
        const result = await Swal.fire({
          title: '¡Consulta guardada exitosamente!',
          text: '¿Te gustaría ir al dashboard para ver el historial de consultas?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Ir al Dashboard',
          cancelButtonText: 'Continuar aquí',
          timer: 5000,
          timerProgressBar: true
        })

        if (result.isConfirmed) {
          // Redirect to dashboard
          window.location.href = '/dashboard'
        }
      } else {
        // If no consultationId, try manual save
        const saveResponse = await axios.post(
          config.endpoints.processAudio,
          {
            transcription: transcription,
            transcriptionWithSpeakers: transcriptionWithSpeakers,
            aiAnalysis: analysis,
            doctorId: 'anonymous',
            patientId: patientData.patientId || patientData.patientName,
            patientName: patientData.patientName,
            patientDocument: patientData.patientId,
            age: patientData.age,
            gender: patientData.gender,
            phone: patientData.phone || '',
            email: patientData.email || '',
            address: patientData.address || '',
            emergencyContact: patientData.emergencyContact || '',
            medicalHistory: patientData.medicalHistory || '',
            allergies: patientData.allergies || '',
            medications: patientData.medications || '',
            specialty: patientData.specialty,
            saveOnly: true
          },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )

        if (saveResponse.data.success) {
          setConsultationId(saveResponse.data.consultationId)
          
          const result = await Swal.fire({
            title: '¡Consulta guardada exitosamente!',
            text: '¿Te gustaría ir al dashboard para ver el historial de consultas?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ir al Dashboard',
            cancelButtonText: 'Continuar aquí',
            timer: 5000,
            timerProgressBar: true
          })

          if (result.isConfirmed) {
            window.location.href = '/dashboard'
          }
        }
      }
    } catch (error) {
      console.error('Error en auto-save:', error)
      Swal.fire({
        title: 'Error al guardar',
        text: 'Hubo un problema al guardar la consulta automáticamente. Puedes intentar guardarla manualmente.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      })
    }
  }

  // Función para verificar el estado del procesamiento periódicamente
  const pollForCompletion = async (audioKey, consultationId) => {
    const maxAttempts = 60 // Máximo 10 minutos (60 intentos * 10 segundos)
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        // Verificando estado del procesamiento
        setProcessingStatus(`Verificando transcripción... (${attempts + 1}/${maxAttempts})`)
        
        const statusResponse = await axios.post(
          config.endpoints.processAudio,
          {
            audioKey: audioKey,
            consultationId: consultationId,
            checkStatus: true
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 15000
          }
        )
        
        
        if (statusResponse.data.success) {
          // ¡Completado!
          setTranscription(statusResponse.data.transcription)
          setTranscriptionWithSpeakers(statusResponse.data.transcriptionWithSpeakers || statusResponse.data.transcription)
          setAnalysis(statusResponse.data.aiAnalysis)
          setProcessing(false)
          
          // Trigger auto-save after a short delay to ensure state is updated
          setTimeout(() => {
            performAutoSave()
          }, 500)
          
          return
        } else if (statusResponse.data.status === 'failed') {
          throw new Error(statusResponse.data.error || 'Procesamiento falló')
        }
        
        // Aún procesando, esperar y reintentar
        await new Promise(resolve => setTimeout(resolve, 10000))
        attempts++
        
      } catch (error) {
        console.error('Error verificando estado:', error)
        attempts++
        
        if (attempts >= maxAttempts) {
          throw new Error('Timeout esperando procesamiento')
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }
    
    throw new Error('Timeout: El procesamiento está tomando más tiempo del esperado')
  }

  const startRecording = async () => {
    try {
      setError('')
      
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })
      
      streamRef.current = stream
      
      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      const audioChunks = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        
        // Detener el stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      // Iniciar grabación
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Timer para mostrar tiempo de grabación
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      
    } catch (error) {
      console.error('Error accediendo al micrófono:', error)
      setError('Error: No se pudo acceder al micrófono. Verifica los permisos.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setShouldAutoProcess(true) // Set flag for auto-processing
      
      // Limpiar timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
    }
  }

  const processAudio = async () => {
    if (!audioBlob) return
    
    // Ensure we have a valid patient name first
    const cleanPatientName = patientData.patientName?.trim()
    if (!cleanPatientName) {
      setError('Error crítico: Nombre del paciente está vacío. No se puede procesar.')
      return
    }
    
    // DEBUG: Validate patient data before sending
    console.log('🔍 DEBUG - Validación final antes de enviar:', {
      patientNameOriginal: patientData.patientName,
      patientNameTrimmed: cleanPatientName,
      patientNameLength: cleanPatientName.length,
      isEmpty: cleanPatientName === '',
      isUndefined: patientData.patientName === undefined,
      isNull: patientData.patientName === null
    })
    console.log('🔍 VALORES RAW:', 'Original:', `"${patientData.patientName}"`, 'Clean:', `"${cleanPatientName}"`)
    
    setProcessing(true)
    setError('')
    
    try {
      
      // Convertir audio blob a base64 para enviar como JSON
      const reader = new FileReader()
      const audioBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(audioBlob)
      })
      
      // 1. Subir audio a S3
      
      // DEBUG: Log upload data
      const uploadPayload = {
        audioData: 'BASE64_DATA_HIDDEN',
        fileName: 'recording.webm',
        contentType: 'audio/webm',
        doctorId: 'anonymous',
        patientId: patientData.patientId || cleanPatientName,
        patientName: cleanPatientName
      }
      if (config.isDevelopment) {
        console.log('Upload data:', uploadPayload)
      }
      // Ready to upload audio to S3
      
      const uploadResponse = await axios.post(
        config.endpoints.uploadAudio, 
        {
          audioData: audioBase64,
          fileName: 'recording.webm',
          contentType: 'audio/webm',
          doctorId: 'anonymous', // Will be replaced with real Cognito user ID
          patientId: patientData.patientId || cleanPatientName,
          patientName: cleanPatientName
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // Aquí irían los headers de autenticación Cognito
          }
        }
      )
      
      const audioKey = uploadResponse.data.audioKey
      
      // 2. Procesar audio con IA REAL (Amazon Transcribe + Bedrock Claude 3) - ASÍNCRONO
      setProcessingStatus('Iniciando procesamiento...')
      
      // Patient name validation already done at the beginning of the function
      
      // DEBUG: Log patient data being sent
      console.log('🚨 DIAGNÓSTICO CRÍTICO - Datos del paciente que se envían:', {
        patientName: cleanPatientName,
        patientNameLength: cleanPatientName.length,
        patientId: patientData.patientId,
        age: patientData.age,
        gender: patientData.gender,
        specialty: patientData.specialty,
        fullPatientData: patientData
      })
      
      // Debug logging for development (remove in production)
      if (config.isDevelopment) {
        console.log('🔍 Patient data validation:', { cleanPatientName, patientId: patientData.patientId })
      }
      
      const processResponse = await axios.post(
        config.endpoints.processAudio,
        {
          audioKey: audioKey,
          doctorId: 'anonymous', // Will be replaced with real Cognito user ID
          patientId: patientData.patientId || cleanPatientName,
          patientName: cleanPatientName,
          patientDocument: patientData.patientId,
          age: patientData.age,
          gender: patientData.gender,
          phone: patientData.phone || '',
          email: patientData.email || '',
          address: patientData.address || '',
          emergencyContact: patientData.emergencyContact || '',
          medicalHistory: patientData.medicalHistory || '',
          allergies: patientData.allergies || '',
          medications: patientData.medications || '',
          specialty: patientData.specialty
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000 // Reduced to 30 seconds for initial processing
        }
      )
      
      
      // Debug logging for development
      if (config.isDevelopment) {
        console.log('Backend response:', processResponse.data)
      }
      
      if (processResponse.data.success) {
        // Processing completed immediately
        setTranscription(processResponse.data.transcription)
        setTranscriptionWithSpeakers(processResponse.data.transcriptionWithSpeakers || processResponse.data.transcription)
        setAnalysis(processResponse.data.aiAnalysis)
        setConsultationId(processResponse.data.consultationId)
        setProcessing(false)
        
        // Trigger auto-save after a short delay to ensure state is updated
        setTimeout(() => {
          performAutoSave()
        }, 500)
      } else if (processResponse.data.status === 'processing') {
        // Start polling for completion
        setConsultationId(processResponse.data.consultationId)
        setProcessingStatus('Transcribiendo audio con Amazon Transcribe...')
        
        // Poll for completion
        await pollForCompletion(audioKey, processResponse.data.consultationId)
      } else {
        throw new Error(processResponse.data.error || 'Error en procesamiento')
      }
      
    } catch (error) {
      console.error('Error procesando audio:', error)
      
      if (error.response) {
        setError(`Error del servidor: ${error.response.status} - ${error.response.data?.message || 'Error desconocido'}`)
      } else if (error.request) {
        setError('Error de conexión: No se pudo conectar con el servidor AWS')
      } else {
        setError(`Error: ${error.message}`)
      }
      
      setProcessing(false)
    }
  }

  const generatePDF = async () => {
    if (!transcription) return
    
    try {
      
      // Usar el consultationId real del procesamiento
      const response = await axios.post(
        config.endpoints.generatePDF,
        {
          consultationId: consultationId || `consultation-${Date.now()}`, // Usar el ID real o fallback
          doctorId: 'anonymous' // Must match the doctorId used in processAudio for development
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      
      if (response.data.downloadUrl) {
        // Si el PDF está en S3, abrir URL
        window.open(response.data.downloadUrl, '_blank')
      } else if (response.data.pdfKey) {
        // Construir URL de descarga
        const downloadUrl = `${config.apiUrl}/api/pdf/download?key=${response.data.pdfKey}`
        window.open(downloadUrl, '_blank')
      }
      
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      if (error.response?.data?.message) {
        setError('Error generando PDF: ' + error.response.data.message)
      } else {
        setError('Error generando PDF: ' + error.message)
      }
    }
  }

  const saveToHistory = async () => {
    if (!transcription || !analysis) {
      Swal.fire({
        title: 'No hay datos para guardar',
        text: 'Primero debes procesar el audio antes de guardar la consulta',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      })
      return
    }
    
    try {
      
      // La consulta ya debería estar guardada automáticamente en DynamoDB
      // durante el procesamiento, pero vamos a verificar
      if (consultationId) {
        // Verificar que se guardó correctamente
        const historyResponse = await axios.get(config.endpoints.getHistory)
        
        setError('')
        Swal.fire({
          title: '¡Consulta guardada exitosamente!',
          text: 'La consulta ya estaba guardada en el historial',
          icon: 'success',
          confirmButtonText: 'Perfecto'
        })
      } else {
        // Si no hay consultationId, crear entrada manual
        const saveResponse = await axios.post(
          config.endpoints.processAudio,
          {
            transcription: transcription,
            transcriptionWithSpeakers: transcriptionWithSpeakers,
            aiAnalysis: analysis,
            doctorId: 'anonymous', // Will be replaced with real Cognito user ID
            patientId: patientData.patientId || patientData.patientName,
            patientName: patientData.patientName,
            specialty: patientData.specialty,
            saveOnly: true
          },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )
        
        setConsultationId(saveResponse.data.consultationId)
        Swal.fire({
          title: '¡Consulta guardada exitosamente!',
          text: 'La consulta ha sido guardada en el historial',
          icon: 'success',
          confirmButtonText: 'Perfecto'
        })
      }
      
    } catch (error) {
      console.error('Error guardando en historial:', error)
      Swal.fire({
        title: 'Error al guardar',
        text: 'Hubo un problema al guardar la consulta en el historial: ' + error.message,
        icon: 'error',
        confirmButtonText: 'Entendido'
      })
    }
  }

  // Función para manejar cambios en el formulario del paciente
  const handlePatientDataChange = (field, value) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función para validar y proceder con la grabación
  const startConsultation = () => {
    if (!patientData.patientName.trim()) {
      setError('Por favor ingresa el nombre del paciente')
      return
    }
    
    // DEBUG: Log patient data when starting consultation
    console.log('🔍 DEBUG - Datos del paciente al iniciar consulta:', patientData)
    console.log('🔍 NOMBRE ESPECÍFICO:', patientData.patientName, 'LONGITUD:', patientData.patientName?.length)
    
    // Generar ID único si no existe y actualizar estado de forma síncrona
    const updatedPatientData = {
      ...patientData,
      patientId: patientData.patientId.trim() || `PAT-${Date.now()}`
    }
    
    setPatientData(updatedPatientData)
    
    // DEBUG: Log updated patient data
    console.log('🔍 DEBUG - Datos actualizados del paciente:', updatedPatientData)
    console.log('🔍 NOMBRE ACTUALIZADO:', updatedPatientData.patientName, 'ID:', updatedPatientData.patientId)
    
    setShowPatientForm(false)
    setError('')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-recorder">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">🎙️ Grabación de Consulta</h1>
          <p className="text-muted">
            Graba la consulta médica para transcripción y análisis automático con IA
          </p>
          {config.isDevelopment && (
            <div className="alert alert-info">
              <strong>API Endpoint:</strong> {config.apiUrl}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Formulario de datos del paciente */}
      {showPatientForm && (
        <div className="row mb-4">
          <div className="col-md-8 mx-auto">
            <div className="card">
              <div className="card-header">
                <h5>👤 Información del Paciente</h5>
                <small className="text-muted">Complete los datos antes de iniciar la grabación</small>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-8">
                    <label className="form-label">Nombre del Paciente *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={patientData.patientName}
                      onChange={(e) => handlePatientDataChange('patientName', e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">ID/Documento</label>
                    <input
                      type="text"
                      className="form-control"
                      value={patientData.patientId}
                      onChange={(e) => handlePatientDataChange('patientId', e.target.value)}
                      placeholder="Ej: 12345678"
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Edad</label>
                    <input
                      type="number"
                      className="form-control"
                      value={patientData.age}
                      onChange={(e) => handlePatientDataChange('age', e.target.value)}
                      placeholder="Ej: 35"
                      min="0"
                      max="120"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Género</label>
                    <select
                      className="form-select"
                      value={patientData.gender}
                      onChange={(e) => handlePatientDataChange('gender', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Especialidad</label>
                    <select
                      className="form-select"
                      value={patientData.specialty}
                      onChange={(e) => handlePatientDataChange('specialty', e.target.value)}
                    >
                      <option value="general">Medicina General</option>
                      <option value="cardiologia">Cardiología</option>
                      <option value="pediatria">Pediatría</option>
                      <option value="neurologia">Neurología</option>
                      <option value="dermatologia">Dermatología</option>
                      <option value="ginecologia">Ginecología</option>
                      <option value="traumatologia">Traumatología</option>
                      <option value="psiquiatria">Psiquiatría</option>
                      <option value="oftalmologia">Oftalmología</option>
                      <option value="otorrinolaringologia">Otorrinolaringología</option>
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Tipo de Consulta</label>
                    <select
                      className="form-select"
                      value={patientData.consultationType}
                      onChange={(e) => handlePatientDataChange('consultationType', e.target.value)}
                    >
                      <option value="consulta">Consulta</option>
                      <option value="control">Control</option>
                      <option value="emergencia">Emergencia</option>
                      <option value="seguimiento">Seguimiento</option>
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Notas Adicionales</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={patientData.notes}
                    onChange={(e) => handlePatientDataChange('notes', e.target.value)}
                    placeholder="Motivo de consulta, síntomas previos, alergias conocidas..."
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="autoSaveCheck"
                        checked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="autoSaveCheck">
                        <i className="fas fa-save me-2"></i>
                        Guardar automáticamente la consulta después del procesamiento con IA
                      </label>
                      <small className="form-text text-muted d-block">
                        Se mostrará una notificación con opción de ir al dashboard
                      </small>
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startConsultation}
                  >
                    <i className="fas fa-arrow-right me-2"></i>
                    Continuar a Grabación
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interfaz de grabación - solo se muestra después del formulario */}
      {!showPatientForm && (
        <>
          {/* Información del paciente - barra superior */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card border-primary">
                <div className="card-body py-2">
                  <div className="row align-items-center">
                    <div className="col-md-3">
                      <strong>👤 {patientData.patientName}</strong>
                      {patientData.patientId && (
                        <small className="text-muted d-block">ID: {patientData.patientId}</small>
                      )}
                    </div>
                    <div className="col-md-2">
                      {patientData.age && (
                        <small>
                          <strong>Edad:</strong> {patientData.age} años
                        </small>
                      )}
                    </div>
                    <div className="col-md-2">
                      {patientData.gender && (
                        <small>
                          <strong>Género:</strong> {patientData.gender}
                        </small>
                      )}
                    </div>
                    <div className="col-md-3">
                      <span className="badge bg-primary">
                        {patientData.specialty.charAt(0).toUpperCase() + patientData.specialty.slice(1)}
                      </span>
                      <span className="badge bg-secondary ms-1">
                        {patientData.consultationType.charAt(0).toUpperCase() + patientData.consultationType.slice(1)}
                      </span>
                    </div>
                    <div className="col-md-2 text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setShowPatientForm(true)}
                        disabled={isRecording || processing}
                      >
                        <i className="fas fa-edit"></i> Editar
                      </button>
                    </div>
                  </div>
                  {patientData.notes && (
                    <div className="row mt-2">
                      <div className="col-12">
                        <small className="text-muted">
                          <strong>Notas:</strong> {patientData.notes}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8 mx-auto">
              <div className="card">
            <div className="card-body text-center">
              <div className="mb-4">
                {!isRecording ? (
                  <div className="mb-3">
                    <i className="fas fa-microphone fa-4x text-muted"></i>
                    <p className="mt-2">Presiona el botón para comenzar la grabación</p>
                    {audioBlob && (
                      <div className="alert alert-success">
                        <i className="fas fa-check-circle me-2"></i>
                        Grabación completada ({formatTime(recordingTime)})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <i className="fas fa-microphone fa-4x text-danger pulse"></i>
                    <p className="mt-2 text-danger">
                      🔴 Grabando... {formatTime(recordingTime)}
                    </p>
                    <small className="text-muted">Máximo 3 minutos</small>
                  </div>
                )}
              </div>

              <div className="d-grid gap-2 mb-3">
                {!isRecording ? (
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={startRecording}
                    disabled={processing}
                  >
                    <i className="fas fa-play me-2"></i>
                    Iniciar Grabación
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger btn-lg"
                    onClick={stopRecording}
                  >
                    <i className="fas fa-stop me-2"></i>
                    Detener Grabación
                  </button>
                )}
              </div>

              {audioBlob && !isRecording && (
                <div className="mb-3">
                  {shouldAutoProcess && !processing && (
                    <div className="alert alert-info mb-3">
                      <i className="fas fa-magic me-2"></i>
                      ¡Iniciando procesamiento automático con IA!
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={processAudio}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {processingStatus || 'Procesando automáticamente con IA...'}
                      </>
                    ) : transcription ? (
                      <>
                        <i className="fas fa-redo me-2"></i>
                        Reprocesar con IA (AWS)
                      </>
                    ) : (
                      <>
                        <i className="fas fa-brain me-2"></i>
                        Procesando automáticamente...
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(transcription || analysis) && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5>📝 Resultados del Análisis con IA</h5>
                <span className="badge bg-success">Claude 3.5 Sonnet</span>
              </div>
              <div className="card-body">
                {transcription && (
                  <div className="alert alert-info">
                    <h6><i className="fas fa-microphone me-2"></i>Transcripción (Amazon Transcribe):</h6>
                    {transcriptionWithSpeakers && transcriptionWithSpeakers !== transcription ? (
                      <div>
                        <div className="mb-3">
                          <strong>🎭 Con identificación de hablantes:</strong>
                          <div className="mt-2 p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>
                            {transcriptionWithSpeakers.split('\n').map((line, index) => {
                              if (line.trim().startsWith('**')) {
                                // Speaker line
                                return <div key={index} className="fw-bold text-primary mt-2">{line.replace(/\*\*/g, '')}</div>
                              } else if (line.trim()) {
                                // Speech content
                                return <div key={index} className="ms-3">{line}</div>
                              }
                              return <div key={index}></div>
                            })}
                          </div>
                        </div>
                        <details>
                          <summary className="text-muted" style={{ cursor: 'pointer' }}>
                            📄 Ver transcripción completa (sin separación)
                          </summary>
                          <div className="mt-2 p-2 bg-light rounded small">
                            {transcription}
                          </div>
                        </details>
                      </div>
                    ) : (
                      <p className="mb-0">{transcription}</p>
                    )}
                  </div>
                )}
                
                {analysis && (
                  <div className="alert alert-primary">
                    <h6><i className="fas fa-stethoscope me-2"></i>Análisis Médico (Amazon Bedrock):</h6>
                    <div>
                      {typeof analysis === 'string' ? (
                        <div dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br>') }} />
                      ) : (
                        <div>
                          <p><strong>Diagnóstico:</strong> {analysis.diagnosis}</p>
                          <p><strong>Síntomas:</strong> {analysis.symptoms?.join(', ')}</p>
                          <p><strong>Signos Vitales:</strong> Temperatura: {analysis.vitalSigns?.temperature}</p>
                          <div><strong>Recomendaciones:</strong>
                            <ul>
                              {analysis.recommendations?.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={generatePDF}
                  >
                    <i className="fas fa-file-pdf me-2"></i>
                    Generar Receta PDF
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={saveToHistory}
                  >
                    <i className="fas fa-save me-2"></i>
                    Guardar en Historial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6>ℹ️ Información de Uso</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li>• El sistema transcribe automáticamente el audio usando Amazon Transcribe Medical</li>
                <li>• La IA analiza la consulta y genera recomendaciones usando Amazon Bedrock</li>
                <li>• Los datos se almacenan de forma segura en AWS</li>
                <li>• Puedes generar PDFs de las recetas médicas automáticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pulse {
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
        </>
      )}
    </div>
  )
}

export default AudioRecorder 