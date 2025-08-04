import { useState, useEffect } from 'react'
import axios from 'axios'
import config from '../config'
import { formatListDate, formatRelativeTime } from '../utils/dateUtils'

function Dashboard() {
  const [stats, setStats] = useState({
    totalConsultations: 0,
    todayConsultations: 0,
    pendingReports: 0
  })
  const [recentConsultations, setRecentConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [enrichedConsultations, setEnrichedConsultations] = useState([])
  const [patientStats, setPatientStats] = useState({
    totalPatients: 0,
    newPatientsToday: 0,
    patientsWithCompleteInfo: 0
  })

  useEffect(() => {
    loadRecentConsultations()
  }, [])

  // Function to fetch patient details
  const fetchPatientDetails = async (patientName) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/patients`, {
        params: { name: patientName }
      })
      
      if (response.data.success && response.data.patients.length > 0) {
        return response.data.patients[0]
      }
    } catch (error) {
      console.log(`No se encontraron detalles para el paciente: ${patientName}`)
    }
    return null
  }

  const loadRecentConsultations = async () => {
    try {
      setLoading(true)
      console.log('🔄 Cargando consultas recientes desde API real...')
      
      const response = await axios.get(config.endpoints.getHistory, {
        params: { limit: 5 } // Solo las 5 más recientes
      })
      
      console.log('✅ Consultas recientes cargadas:', response.data)
      
      if (response.data && response.data.consultations) {
        const consultations = response.data.consultations
        setRecentConsultations(consultations)
        
        // Enrich consultations with patient details
        const enrichedConsultationsData = await Promise.all(
          consultations.map(async (consultation) => {
            if (consultation.patientName && consultation.patientName !== 'Sin nombre') {
              const patientDetails = await fetchPatientDetails(consultation.patientName)
              return {
                ...consultation,
                patientDetails: patientDetails
              }
            }
            return consultation
          })
        )
        
        setEnrichedConsultations(enrichedConsultationsData)
        
        // Calcular estadísticas reales
        const today = new Date().toDateString()
        const todayCount = consultations.filter(c => 
          new Date(c.createdAt).toDateString() === today
        ).length
        
        setStats({
          totalConsultations: response.data.count || consultations.length,
          todayConsultations: todayCount,
          pendingReports: consultations.filter(c => c.status === 'processing').length
        })

        // Calcular estadísticas de pacientes
        const uniquePatients = new Set()
        const newPatientsToday = new Set()
        let patientsWithCompleteInfo = 0

        enrichedConsultationsData.forEach(consultation => {
          if (consultation.patientName && consultation.patientName !== 'Sin nombre') {
            uniquePatients.add(consultation.patientName)
            
            // Check if consultation was created today and add to new patients
            if (new Date(consultation.createdAt).toDateString() === today) {
              newPatientsToday.add(consultation.patientName)
            }
            
            // Check if patient has complete information
            if (consultation.patientDetails && 
                consultation.patientDetails.age && 
                consultation.patientDetails.gender && 
                consultation.patientDetails.phone) {
              patientsWithCompleteInfo++
            }
          }
        })

        setPatientStats({
          totalPatients: uniquePatients.size,
          newPatientsToday: newPatientsToday.size,
          patientsWithCompleteInfo: Math.min(patientsWithCompleteInfo, uniquePatients.size)
        })
      }
      
    } catch (error) {
      console.error('❌ Error cargando consultas recientes:', error)
      // Fallback a datos simulados si falla el API
      setRecentConsultations([])
      setStats({
        totalConsultations: 0,
        todayConsultations: 0,
        pendingReports: 0
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">🏥 Dashboard - MediVoice AI</h1>
          <p className="text-muted">Bienvenido al sistema de asistencia médica con IA</p>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="card-title">{stats.totalConsultations}</h4>
                  <p className="card-text">Total Consultas</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-chart-bar fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card text-white bg-success">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="card-title">{stats.todayConsultations}</h4>
                  <p className="card-text">Consultas Hoy</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-calendar-day fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card text-white bg-warning">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="card-title">{stats.pendingReports}</h4>
                  <p className="card-text">Reportes Pendientes</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-clock fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Statistics Row */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-white bg-info">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="card-title">{patientStats.totalPatients}</h4>
                  <p className="card-text">Total Pacientes</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-users fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card text-white bg-secondary">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="card-title">{patientStats.newPatientsToday}</h4>
                  <p className="card-text">Pacientes Nuevos Hoy</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-user-plus fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card text-white bg-dark">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h4 className="card-title">{patientStats.patientsWithCompleteInfo}</h4>
                  <p className="card-text">Con Info Completa</p>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-user-check fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>🎤 Acciones Rápidas</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <a href="/recorder" className="btn btn-primary">
                  🎙️ Nueva Grabación
                </a>
                <a href="/history" className="btn btn-outline-primary">
                  📋 Ver Historial
                </a>
                <a href="/settings" className="btn btn-outline-secondary">
                  ⚙️ Configuración
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>📊 Estado del Sistema</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>API Gateway:</span>
                  <span className="badge bg-success">Activo</span>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Amazon Bedrock:</span>
                  <span className="badge bg-success">Conectado</span>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>Transcribe Medical:</span>
                  <span className="badge bg-success">Disponible</span>
                </div>
              </div>
              <div className="mb-3">
                <small className="text-muted">
                  Endpoint: {config.apiUrl}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>📋 Consultas Recientes</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2">Cargando consultas recientes...</p>
                </div>
              ) : recentConsultations.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No hay consultas recientes</p>
                  <a href="/recorder" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Nueva Consulta
                  </a>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Información del Paciente</th>
                        <th>Especialidad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(enrichedConsultations.length > 0 ? enrichedConsultations : recentConsultations).slice(0, 5).map((consultation) => (
                        <tr key={consultation.consultationId}>
                          <td>
                            <div>
                              <small className="text-muted">
                                {formatListDate(consultation.createdAt)}
                              </small>
                              <br />
                              <small className="text-primary">
                                {formatRelativeTime(consultation.createdAt)}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong className="d-block">
                                {consultation.patientName || 
                                 (consultation.patientId?.startsWith('patient-') ? 
                                  'Paciente Sin Nombre' : 
                                  consultation.patientId) || 
                                 'Sin Identificar'}
                              </strong>
                              
                              {consultation.patientDetails && (
                                <div className="mt-1">
                                  {consultation.patientDetails.age && (
                                    <small className="text-muted me-3">
                                      <i className="fas fa-birthday-cake me-1"></i>
                                      {consultation.patientDetails.age} años
                                    </small>
                                  )}
                                  {consultation.patientDetails.gender && (
                                    <small className="text-muted me-3">
                                      <i className="fas fa-user me-1"></i>
                                      {consultation.patientDetails.gender}
                                    </small>
                                  )}
                                  {consultation.patientDetails.phone && (
                                    <small className="text-muted d-block">
                                      <i className="fas fa-phone me-1"></i>
                                      {consultation.patientDetails.phone}
                                    </small>
                                  )}
                                  {consultation.patientDetails.patient_document && (
                                    <small className="text-muted d-block">
                                      <i className="fas fa-id-card me-1"></i>
                                      Doc: {consultation.patientDetails.patient_document}
                                    </small>
                                  )}
                                </div>
                              )}
                              
                              {!consultation.patientDetails && consultation.patientName && consultation.patientId !== consultation.patientName && (
                                <small className="text-muted d-block">ID: {consultation.patientId}</small>
                              )}
                              {!consultation.patientDetails && !consultation.patientName && consultation.patientId?.startsWith('patient-') && (
                                <small className="text-muted d-block">ID: {consultation.patientId}</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {consultation.specialty || 'General'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${consultation.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                              {consultation.status === 'completed' ? 'Completada' : 'Procesando'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => window.location.href = `/history?id=${consultation.consultationId}`}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              {consultation.hasAiAnalysis && (
                                <button 
                                  className="btn btn-outline-success"
                                  title="Generar PDF"
                                >
                                  <i className="fas fa-file-pdf"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {recentConsultations.length > 0 && (
                <div className="text-center mt-3">
                  <a href="/history" className="btn btn-outline-primary">
                    <i className="fas fa-list me-2"></i>
                    Ver Historial Completo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 