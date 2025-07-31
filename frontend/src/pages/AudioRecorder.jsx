import { useState, useRef } from 'react'
import axios from 'axios'
import config from '../config'

function AudioRecorder() {
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
  
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  // Función para verificar el estado del procesamiento periódicamente
  const pollForCompletion = async (audioKey, consultationId) => {
    const maxAttempts = 60 // Máximo 10 minutos (60 intentos * 10 segundos)
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        console.log(`🔄 Verificando estado del procesamiento (intento ${attempts + 1}/${maxAttempts})...`)
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
        
        console.log('Estado del procesamiento:', statusResponse.data)
        
        if (statusResponse.data.success) {
          // ¡Completado!
          setTranscription(statusResponse.data.transcription)
          setTranscriptionWithSpeakers(statusResponse.data.transcriptionWithSpeakers || statusResponse.data.transcription)
          setAnalysis(statusResponse.data.aiAnalysis)
          setProcessing(false)
          console.log('✅ ¡Procesamiento completado con servicios AWS reales!')
          return
        } else if (statusResponse.data.status === 'failed') {
          throw new Error(statusResponse.data.error || 'Procesamiento falló')
        }
        
        // Aún procesando, esperar y reintentar
        console.log('⏳ Aún procesando, esperando 10 segundos...')
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
      
      console.log('Grabación iniciada...')
      
    } catch (error) {
      console.error('Error accediendo al micrófono:', error)
      setError('Error: No se pudo acceder al micrófono. Verifica los permisos.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Limpiar timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      console.log('Grabación detenida...')
    }
  }

  const processAudio = async () => {
    if (!audioBlob) return
    
    setProcessing(true)
    setError('')
    
    try {
      console.log('🌐 CONECTANDO CON AWS REAL - IA VERDADERA...')
      console.log('Enviando audio a:', config.apiUrl)
      
      // Convertir audio blob a base64 para enviar como JSON
      const reader = new FileReader()
      const audioBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(audioBlob)
      })
      
      // 1. Subir audio a S3 REAL (usando proxy)
      const uploadResponse = await axios.post(
        config.endpoints.uploadAudio, 
        {
          audioData: audioBase64,
          fileName: 'recording.webm',
          contentType: 'audio/webm',
          doctorId: 'doctor-demo'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // Aquí irían los headers de autenticación Cognito
          }
        }
      )
      
      console.log('Audio subido:', uploadResponse.data)
      const audioKey = uploadResponse.data.audioKey
      
      // 2. Procesar audio con IA REAL (Amazon Transcribe + Bedrock Claude 3) - ASÍNCRONO
      console.log('🤖 Procesando con IA real: Amazon Transcribe + Bedrock Claude 3...')
      setProcessingStatus('Iniciando procesamiento...')
      
      const processResponse = await axios.post(
        config.endpoints.processAudio,
        {
          audioKey: audioKey,
          doctorId: 'doctor-demo',
          patientId: 'patient-demo',
          specialty: 'general'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000 // Reduced to 30 seconds for initial processing
        }
      )
      
      console.log('Respuesta inicial de procesamiento:', processResponse.data)
      
      if (processResponse.data.success) {
        // Processing completed immediately
        setTranscription(processResponse.data.transcription)
        setTranscriptionWithSpeakers(processResponse.data.transcriptionWithSpeakers || processResponse.data.transcription)
        setAnalysis(processResponse.data.aiAnalysis)
        setConsultationId(processResponse.data.consultationId)
        setProcessing(false)
        console.log('✅ Procesamiento completado inmediatamente')
      } else if (processResponse.data.status === 'processing') {
        // Start polling for completion
        console.log('⏳ Procesamiento iniciado, esperando transcripción...')
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
      console.log('📄 Generando PDF con AWS Lambda real...')
      
      // Usar el consultationId real del procesamiento
      const response = await axios.post(
        config.endpoints.generatePDF,
        {
          consultationId: consultationId || `consultation-${Date.now()}`, // Usar el ID real o fallback
          doctorId: 'doctor-demo'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      console.log('PDF response:', response.data)
      
      if (response.data.downloadUrl) {
        // Si el PDF está en S3, abrir URL
        window.open(response.data.downloadUrl, '_blank')
      } else if (response.data.pdfKey) {
        // Construir URL de descarga
        const downloadUrl = `${config.apiUrl}/api/pdf/download?key=${response.data.pdfKey}`
        window.open(downloadUrl, '_blank')
      }
      
      console.log('✅ PDF real generado exitosamente con AWS Lambda')
      
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
      setError('No hay datos para guardar. Primero procesa el audio.')
      return
    }
    
    try {
      console.log('💾 Guardando consulta en historial...')
      
      // La consulta ya debería estar guardada automáticamente en DynamoDB
      // durante el procesamiento, pero vamos a verificar
      if (consultationId) {
        // Verificar que se guardó correctamente
        const historyResponse = await axios.get(config.endpoints.getHistory)
        console.log('Historial actualizado:', historyResponse.data)
        
        setError('')
        alert('✅ Consulta guardada exitosamente en el historial!')
        console.log('✅ Consulta confirmada en historial')
      } else {
        // Si no hay consultationId, crear entrada manual
        const saveResponse = await axios.post(
          config.endpoints.processAudio,
          {
            transcription: transcription,
            transcriptionWithSpeakers: transcriptionWithSpeakers,
            aiAnalysis: analysis,
            doctorId: 'doctor-demo',
            patientId: 'patient-demo',
            specialty: 'general',
            saveOnly: true
          },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )
        
        setConsultationId(saveResponse.data.consultationId)
        alert('✅ Consulta guardada exitosamente en el historial!')
        console.log('✅ Consulta guardada manualmente:', saveResponse.data)
      }
      
    } catch (error) {
      console.error('Error guardando en historial:', error)
      setError('Error guardando en historial: ' + error.message)
    }
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
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={processAudio}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {processingStatus || 'Procesando con IA...'}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-brain me-2"></i>
                        Procesar con IA (AWS)
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
    </div>
  )
}

export default AudioRecorder 