import { useState } from 'react'
import config from '../config'

function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcription, setTranscription] = useState('')
  const [processing, setProcessing] = useState(false)

  const startRecording = () => {
    setIsRecording(true)
    // Aquí se implementaría la grabación real
    console.log('Iniciando grabación...')
  }

  const stopRecording = () => {
    setIsRecording(false)
    // Aquí se detendría la grabación y se obtendría el blob
    console.log('Deteniendo grabación...')
    
    // Simular audio blob
    setAudioBlob(new Blob(['audio data'], { type: 'audio/wav' }))
  }

  const processAudio = async () => {
    if (!audioBlob) return
    
    setProcessing(true)
    try {
      // Aquí se enviaría el audio a la API
      console.log('Enviando audio a:', config.apiUrl)
      
      // Simular procesamiento
      setTimeout(() => {
        setTranscription('Ejemplo de transcripción: El paciente presenta dolor abdominal...')
        setProcessing(false)
      }, 3000)
      
    } catch (error) {
      console.error('Error procesando audio:', error)
      setProcessing(false)
    }
  }

  return (
    <div className="audio-recorder">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">🎙️ Grabación de Consulta</h1>
          <p className="text-muted">Graba la consulta médica para transcripción automática</p>
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
                  </div>
                ) : (
                  <div className="mb-3">
                    <i className="fas fa-microphone fa-4x text-danger pulse"></i>
                    <p className="mt-2 text-danger">🔴 Grabando...</p>
                  </div>
                )}
              </div>

              <div className="d-grid gap-2 mb-3">
                {!isRecording ? (
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={startRecording}
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
                  <div className="alert alert-success">
                    <i className="fas fa-check-circle me-2"></i>
                    Grabación completada exitosamente
                  </div>
                  
                  <button 
                    className="btn btn-success"
                    onClick={processAudio}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-brain me-2"></i>
                        Procesar con IA
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {transcription && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5>📝 Transcripción y Análisis</h5>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <h6>Transcripción:</h6>
                  <p>{transcription}</p>
                </div>
                
                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button className="btn btn-outline-primary">
                    <i className="fas fa-file-pdf me-2"></i>
                    Generar PDF
                  </button>
                  <button className="btn btn-primary">
                    <i className="fas fa-save me-2"></i>
                    Guardar Consulta
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

      <style jsx>{`
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