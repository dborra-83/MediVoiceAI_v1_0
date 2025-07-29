import { useState, useEffect } from 'react'
import config from '../config'

function Dashboard() {
  const [stats, setStats] = useState({
    totalConsultations: 0,
    todayConsultations: 0,
    pendingReports: 0
  })

  useEffect(() => {
    // Simular carga de estadísticas
    setStats({
      totalConsultations: 127,
      todayConsultations: 8,
      pendingReports: 3
    })
  }, [])

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
              <div className="table-responsive">
                <table className="table table-striped">
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
                    <tr>
                      <td>28/07/2024 09:30</td>
                      <td>Juan Pérez</td>
                      <td>Consulta General</td>
                      <td><span className="badge bg-success">Completada</span></td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary">Ver</button>
                      </td>
                    </tr>
                    <tr>
                      <td>28/07/2024 10:15</td>
                      <td>María González</td>
                      <td>Cardiología</td>
                      <td><span className="badge bg-warning">Procesando</span></td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary">Ver</button>
                      </td>
                    </tr>
                    <tr>
                      <td>28/07/2024 11:00</td>
                      <td>Carlos Silva</td>
                      <td>Consulta General</td>
                      <td><span className="badge bg-success">Completada</span></td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary">Ver</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 