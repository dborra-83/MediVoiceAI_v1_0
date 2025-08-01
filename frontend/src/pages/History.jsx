import { useState, useEffect } from 'react'
import axios from 'axios'
import config from '../config'
import { formatListDate, formatMedicalDate, formatRelativeTime } from '../utils/dateUtils'

function History() {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedConsultation, setSelectedConsultation] = useState(null)

  useEffect(() => {
    loadConsultations()
  }, [])

  const loadConsultations = async () => {
    try {
      setLoading(true)
      
      const response = await axios.get(config.endpoints.getHistory)
      
      
      if (response.data && response.data.consultations) {
        const consultationsData = response.data.consultations.map(consultation => ({
          id: consultation.consultationId,
          date: consultation.createdAt,
          patient: consultation.patientName || consultation.patientId || 'Sin identificar',
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
                                  alert(`Consulta: ${consultation.id}\nPaciente: ${consultation.patient}`)
                                }}
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