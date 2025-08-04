import { useState, useEffect } from 'react'
import axios from 'axios'
import config from '../config'
import { formatListDate, formatMedicalDate, formatRelativeTime } from '../utils/dateUtils'

function History() {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [detailView, setDetailView] = useState(false)
  const [patientDetails, setPatientDetails] = useState(null)

  useEffect(() => {
    loadConsultations()
    
    // Check if we should show a specific consultation
    const urlParams = new URLSearchParams(window.location.search)
    const consultationId = urlParams.get('id')
    if (consultationId) {
      setDetailView(true)
      // Will load the specific consultation after consultations are loaded
    }
  }, [])

  useEffect(() => {
    // If we have consultations and need to show detail view
    if (consultations.length > 0 && detailView) {
      const urlParams = new URLSearchParams(window.location.search)
      const consultationId = urlParams.get('id')
      if (consultationId) {
        const consultation = consultations.find(c => c.id === consultationId)
        if (consultation) {
          setSelectedConsultation(consultation)
          loadPatientDetails(consultation)
        }
      }
    }
  }, [consultations, detailView])

  const loadPatientDetails = async (consultation) => {
    try {
      // Since we don't have a separate patients endpoint yet, 
      // we'll extract patient info from the consultation data
      // or make a call to the managePatients function
      
      if (consultation.patientId && consultation.patientId.startsWith('patient-')) {
        // Try to get patient details from the managePatients endpoint
        const response = await axios.post(`${config.apiUrl}/api/patients`, {
          action: 'get',
          patientId: consultation.patientId
        })
        
        if (response.data.success && response.data.patient) {
          setPatientDetails(response.data.patient)
        } else {
          setPatientDetails(null)
        }
      } else {
        // For now, set patient details to null if we can't find them
        setPatientDetails(null)
      }
    } catch (error) {
      console.log(`No se encontraron detalles para el paciente: ${consultation.patient}`)
      setPatientDetails(null)
    }
  }

  const loadConsultations = async () => {
    try {
      setLoading(true)
      
      const response = await axios.get(config.endpoints.getHistory)
      
      
      if (response.data && response.data.consultations) {
        // Debug logging for development
        if (config.isDevelopment) {
          console.log('History data received:', response.data.consultations.length, 'consultations')
        }
        
        const consultationsData = response.data.consultations.map(consultation => ({
          id: consultation.consultationId,
          date: consultation.createdAt,
          patient: consultation.patientName && consultation.patientName !== consultation.patientId ? consultation.patientName : 'Sin identificar',
          patientId: consultation.patientId,
          type: consultation.specialty || 'General',
          status: consultation.status || 'completed',
          transcription: consultation.transcription || consultation.summary || 'Sin transcripción disponible',
          transcriptionWithSpeakers: consultation.transcriptionWithSpeakers,
          aiAnalysis: consultation.aiAnalysis || consultation.summary,
          pdfUrl: null,
          hasTranscription: consultation.hasTranscription,
          hasAiAnalysis: consultation.hasAiAnalysis
        }))
        setConsultations(consultationsData)
      } else {
        setConsultations([])
      }
      
    } catch (error) {
      console.error('❌ Error cargando historial:', error)
      setConsultations([])
    } finally {
      setLoading(false)
    }
  }

  const filteredConsultations = consultations.filter(consultation => {
    if (filter === 'all') return true
    return consultation.status === filter
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge bg-success">Completada</span>
      case 'processing':
        return <span className="badge bg-warning">Procesando</span>
      case 'pending':
        return <span className="badge bg-secondary">Pendiente</span>
      default:
        return <span className="badge bg-light text-dark">Desconocido</span>
    }
  }

  // Remove old formatDate function - now using dateUtils

  // Show detailed view if we have a selected consultation
  if (detailView && selectedConsultation) {
    return (
      <div className="consultation-detail">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h2">📋 Detalle de Consulta</h1>
                <p className="text-muted">
                  Consulta del {formatMedicalDate(selectedConsultation.date)}
                </p>
              </div>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => {
                  setDetailView(false)
                  setSelectedConsultation(null)
                  setPatientDetails(null)
                  window.history.pushState({}, '', '/history')
                }}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Volver al Historial
              </button>
            </div>
          </div>
        </div>

        {/* Patient Information Card */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5>👤 Información del Paciente</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="mb-3">
                      <strong>{selectedConsultation.patient}</strong>
                    </h6>
                    {patientDetails ? (
                      <div>
                        {patientDetails.age && (
                          <p className="mb-2">
                            <i className="fas fa-birthday-cake me-2 text-muted"></i>
                            <strong>Edad:</strong> {patientDetails.age} años
                          </p>
                        )}
                        {patientDetails.gender && (
                          <p className="mb-2">
                            <i className="fas fa-user me-2 text-muted"></i>
                            <strong>Género:</strong> {patientDetails.gender}
                          </p>
                        )}
                        {patientDetails.patient_document && (
                          <p className="mb-2">
                            <i className="fas fa-id-card me-2 text-muted"></i>
                            <strong>Documento:</strong> {patientDetails.patient_document}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted">No se encontró información adicional del paciente</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    {patientDetails && (
                      <div>
                        {patientDetails.phone && (
                          <p className="mb-2">
                            <i className="fas fa-phone me-2 text-muted"></i>
                            <strong>Teléfono:</strong> {patientDetails.phone}
                          </p>
                        )}
                        {patientDetails.email && (
                          <p className="mb-2">
                            <i className="fas fa-envelope me-2 text-muted"></i>
                            <strong>Email:</strong> {patientDetails.email}
                          </p>
                        )}
                        {patientDetails.address && (
                          <p className="mb-2">
                            <i className="fas fa-map-marker-alt me-2 text-muted"></i>
                            <strong>Dirección:</strong> {patientDetails.address}
                          </p>
                        )}
                        {patientDetails.emergency_contact && (
                          <p className="mb-2">
                            <i className="fas fa-phone-alt me-2 text-muted"></i>
                            <strong>Contacto de Emergencia:</strong> {patientDetails.emergency_contact}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {patientDetails && (patientDetails.medical_history || patientDetails.allergies || patientDetails.medications) && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <hr />
                      <h6>📋 Información Médica</h6>
                      {patientDetails.medical_history && (
                        <p className="mb-2">
                          <strong>Historial Médico:</strong> {patientDetails.medical_history}
                        </p>
                      )}
                      {patientDetails.allergies && (
                        <p className="mb-2">
                          <strong>Alergias:</strong> {patientDetails.allergies}
                        </p>
                      )}
                      {patientDetails.medications && (
                        <p className="mb-2">
                          <strong>Medicamentos:</strong> {patientDetails.medications}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Consultation Details */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>📄 Transcripción</h5>
              </div>
              <div className="card-body">
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedConsultation.transcriptionWithSpeakers ? (
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                      {selectedConsultation.transcriptionWithSpeakers}
                    </pre>
                  ) : (
                    <p>{selectedConsultation.transcription}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>🤖 Análisis con IA</h5>
              </div>
              <div className="card-body">
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedConsultation.aiAnalysis ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                      {selectedConsultation.aiAnalysis}
                    </div>
                  ) : (
                    <p className="text-muted">No hay análisis de IA disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <h6>Acciones</h6>
                <div className="btn-group mb-3">
                  <button className="btn btn-success">
                    <i className="fas fa-file-pdf me-2"></i>
                    Generar PDF
                  </button>
                  <button className="btn btn-primary">
                    <i className="fas fa-edit me-2"></i>
                    Editar Información del Paciente
                  </button>
                  <button className="btn btn-info">
                    <i className="fas fa-share me-2"></i>
                    Compartir
                  </button>
                </div>
                
                {/* Audio access section */}
                <div className="border-top pt-3">
                  <h6 className="text-muted">🎧 Audio de la Consulta</h6>
                  {selectedConsultation && (
                    <div className="row justify-content-center">
                      <div className="col-md-8">
                        <div className="alert alert-info">
                          <p className="mb-2">
                            <strong>ID de Audio:</strong> {selectedConsultation.patientId || 'No disponible'}
                          </p>
                          <p className="mb-2">
                            <strong>Fecha de grabación:</strong> {formatMedicalDate(selectedConsultation.date)}
                          </p>
                          <button 
                            className="btn btn-warning btn-sm"
                            onClick={() => {
                              alert('Función de descarga de audio en desarrollo.\n\nEn la versión completa, aquí podrás:\n• Descargar el archivo de audio original\n• Reproducir el audio directamente\n• Compartir el enlace de audio seguro')
                            }}
                          >
                            <i className="fas fa-download me-2"></i>
                            Descargar Audio (En desarrollo)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="history">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">📋 Historial de Consultas</h1>
          <p className="text-muted">Registro completo de consultas médicas procesadas</p>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>📊 Estadísticas</h6>
              <div className="row text-center">
                <div className="col-4">
                  <h4 className="text-primary">{consultations.length}</h4>
                  <small>Total</small>
                </div>
                <div className="col-4">
                  <h4 className="text-success">
                    {consultations.filter(c => c.status === 'completed').length}
                  </h4>
                  <small>Completadas</small>
                </div>
                <div className="col-4">
                  <h4 className="text-warning">
                    {consultations.filter(c => c.status === 'processing').length}
                  </h4>
                  <small>Procesando</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>🔍 Filtros</h6>
              <div className="btn-group w-100" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="filter"
                  id="all"
                  checked={filter === 'all'}
                  onChange={() => setFilter('all')}
                />
                <label className="btn btn-outline-primary" htmlFor="all">
                  Todas
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="filter"
                  id="completed"
                  checked={filter === 'completed'}
                  onChange={() => setFilter('completed')}
                />
                <label className="btn btn-outline-success" htmlFor="completed">
                  Completadas
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="filter"
                  id="processing"
                  checked={filter === 'processing'}
                  onChange={() => setFilter('processing')}
                />
                <label className="btn btn-outline-warning" htmlFor="processing">
                  Procesando
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Consultas ({filteredConsultations.length})</h5>
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-download me-2"></i>
                Exportar
              </button>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2">Cargando historial...</p>
                </div>
              ) : filteredConsultations.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No hay consultas que coincidan con el filtro seleccionado</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Paciente</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConsultations.map((consultation) => (
                        <tr key={consultation.id}>
                          <td>
                            <small>{formatListDate(consultation.date)}</small>
                          </td>
                          <td>
                            <strong>{consultation.patient}</strong>
                            {consultation.patientId && consultation.patientId !== consultation.patient && (
                              <small className="text-muted d-block">ID: {consultation.patientId}</small>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-info">{consultation.type}</span>
                          </td>
                          <td>
                            {getStatusBadge(consultation.status)}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => {
                                  setSelectedConsultation(consultation)
                                  setDetailView(true)
                                  loadPatientDetails(consultation)
                                  window.history.pushState({}, '', `/history?id=${consultation.id}`)
                                }}
                                title="Ver detalles"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              {consultation.pdfUrl && (
                                <button className="btn btn-outline-success">
                                  <i className="fas fa-file-pdf"></i>
                                </button>
                              )}
                              <button className="btn btn-outline-secondary">
                                <i className="fas fa-download"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modales para ver detalles */}
      {filteredConsultations.map((consultation) => (
        <div
          key={consultation.id}
          className="modal fade"
          id={`modal-${consultation.id}`}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Consulta - {consultation.patient}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Fecha:</strong> {formatMedicalDate(consultation.date)}
                  </div>
                  <div className="col-md-6">
                    <strong>Tipo:</strong> {consultation.type}
                  </div>
                </div>

                <div className="mb-3">
                  <h6>📝 Transcripción:</h6>
                  {consultation.transcriptionWithSpeakers && consultation.transcriptionWithSpeakers !== consultation.transcription ? (
                    <div>
                      <div className="bg-light p-3 rounded mb-2">
                        <strong>🎭 Con identificación de hablantes:</strong>
                        <div className="mt-2" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>
                          {consultation.transcriptionWithSpeakers.split('\n').map((line, index) => {
                            if (line.trim().startsWith('**')) {
                              return <div key={index} className="fw-bold text-primary mt-2">{line.replace(/\*\*/g, '')}</div>
                            } else if (line.trim()) {
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
                        <div className="bg-light p-2 rounded mt-2">
                          <small>{consultation.transcription}</small>
                        </div>
                      </details>
                    </div>
                  ) : (
                    <div className="bg-light p-3 rounded">
                      <small>{consultation.transcription}</small>
                    </div>
                  )}
                </div>

                {consultation.aiAnalysis && (
                  <div className="mb-3">
                    <h6>🤖 Análisis de IA:</h6>
                    <div className="bg-info bg-opacity-10 p-3 rounded">
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>
                        {typeof consultation.aiAnalysis === 'string' ? 
                          consultation.aiAnalysis.split('\n').map((line, index) => (
                            <div key={index}>
                              {line.startsWith('##') ? (
                                <strong className="text-primary d-block mt-3 mb-2">{line.replace('##', '').trim()}</strong>
                              ) : line.startsWith('-') ? (
                                <div className="ms-3">• {line.replace('-', '').trim()}</div>
                              ) : line.trim() ? (
                                <div>{line}</div>
                              ) : (
                                <div></div>
                              )}
                            </div>
                          )) : 
                          consultation.aiAnalysis
                        }
                      </div>
                    </div>
                  </div>
                )}

                {consultation.pdfUrl && (
                  <div className="mb-3">
                    <h6>📄 Receta Médica:</h6>
                    <a href={consultation.pdfUrl} className="btn btn-success btn-sm">
                      <i className="fas fa-file-pdf me-2"></i>
                      Descargar PDF
                    </a>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary">
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default History 