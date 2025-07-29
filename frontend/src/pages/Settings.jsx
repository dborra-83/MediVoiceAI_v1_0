import { useState } from 'react'
import config from '../config'

function Settings() {
  const [doctorInfo, setDoctorInfo] = useState({
    name: 'Dr. Carlos Mendoza',
    email: 'doctor@medivoice.ai',
    license: 'MED12345',
    specialty: 'Medicina General',
    institution: 'Clínica MediVoice AI',
    phone: '+1234567890',
    address: 'Av. Principal 123, Ciudad'
  })

  const [preferences, setPreferences] = useState({
    language: 'es',
    timezone: 'America/Santiago',
    autoSave: true,
    notifications: true,
    audioQuality: 'high',
    transcriptionLanguage: 'es-ES'
  })

  const [apiSettings, setApiSettings] = useState({
    region: config.region,
    apiUrl: config.apiUrl,
    cognitoUserPoolId: config.cognitoUserPoolId,
    cognitoAppClientId: config.cognitoAppClientId
  })

  const handleDoctorInfoChange = (field, value) => {
    setDoctorInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePreferencesChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveSettings = () => {
    // Aquí se guardarían las configuraciones
    alert('Configuraciones guardadas exitosamente')
  }

  const testConnection = async () => {
    try {
      console.log('Probando conexión a:', config.apiUrl)
      // Aquí se probaría la conexión real
      alert('Conexión exitosa con la API')
    } catch (error) {
      alert('Error de conexión: ' + error.message)
    }
  }

  return (
    <div className="settings">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">⚙️ Configuración</h1>
          <p className="text-muted">Gestiona tu perfil y preferencias del sistema</p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          {/* Información del Doctor */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>👨‍⚕️ Información del Doctor</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={doctorInfo.name}
                    onChange={(e) => handleDoctorInfoChange('name', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={doctorInfo.email}
                    onChange={(e) => handleDoctorInfoChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Número de Matrícula</label>
                  <input
                    type="text"
                    className="form-control"
                    value={doctorInfo.license}
                    onChange={(e) => handleDoctorInfoChange('license', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Especialidad</label>
                  <select
                    className="form-select"
                    value={doctorInfo.specialty}
                    onChange={(e) => handleDoctorInfoChange('specialty', e.target.value)}
                  >
                    <option value="Medicina General">Medicina General</option>
                    <option value="Cardiología">Cardiología</option>
                    <option value="Pediatría">Pediatría</option>
                    <option value="Ginecología">Ginecología</option>
                    <option value="Traumatología">Traumatología</option>
                    <option value="Neurología">Neurología</option>
                  </select>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Institución</label>
                  <input
                    type="text"
                    className="form-control"
                    value={doctorInfo.institution}
                    onChange={(e) => handleDoctorInfoChange('institution', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={doctorInfo.phone}
                    onChange={(e) => handleDoctorInfoChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Dirección</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={doctorInfo.address}
                  onChange={(e) => handleDoctorInfoChange('address', e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Preferencias */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>🎛️ Preferencias</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Idioma</label>
                  <select
                    className="form-select"
                    value={preferences.language}
                    onChange={(e) => handlePreferencesChange('language', e.target.value)}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Zona Horaria</label>
                  <select
                    className="form-select"
                    value={preferences.timezone}
                    onChange={(e) => handlePreferencesChange('timezone', e.target.value)}
                  >
                    <option value="America/Santiago">Santiago (GMT-3)</option>
                    <option value="America/Lima">Lima (GMT-5)</option>
                    <option value="America/Mexico_City">México (GMT-6)</option>
                    <option value="America/New_York">Nueva York (GMT-5)</option>
                  </select>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Calidad de Audio</label>
                  <select
                    className="form-select"
                    value={preferences.audioQuality}
                    onChange={(e) => handlePreferencesChange('audioQuality', e.target.value)}
                  >
                    <option value="high">Alta (recomendado)</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Idioma de Transcripción</label>
                  <select
                    className="form-select"
                    value={preferences.transcriptionLanguage}
                    onChange={(e) => handlePreferencesChange('transcriptionLanguage', e.target.value)}
                  >
                    <option value="es-ES">Español</option>
                    <option value="en-US">English (US)</option>
                    <option value="pt-BR">Português (Brasil)</option>
                  </select>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="autoSave"
                      checked={preferences.autoSave}
                      onChange={(e) => handlePreferencesChange('autoSave', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="autoSave">
                      Guardar automáticamente las grabaciones
                    </label>
                  </div>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notifications"
                      checked={preferences.notifications}
                      onChange={(e) => handlePreferencesChange('notifications', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="notifications">
                      Recibir notificaciones del sistema
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración API */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>🔗 Configuración API</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                Esta configuración se establece automáticamente durante el despliegue.
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Región AWS</label>
                  <input
                    type="text"
                    className="form-control"
                    value={apiSettings.region}
                    readOnly
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">User Pool ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={apiSettings.cognitoUserPoolId}
                    readOnly
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">URL de API</label>
                <input
                  type="text"
                  className="form-control"
                  value={apiSettings.apiUrl}
                  readOnly
                />
              </div>

              <button
                className="btn btn-outline-primary"
                onClick={testConnection}
              >
                <i className="fas fa-wifi me-2"></i>
                Probar Conexión
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Estado del Sistema */}
          <div className="card mb-4">
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
                <div className="d-flex justify-content-between">
                  <span>DynamoDB:</span>
                  <span className="badge bg-success">Conectado</span>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <span>S3 Storage:</span>
                  <span className="badge bg-success">Disponible</span>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>🔧 Acciones</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary"
                  onClick={saveSettings}
                >
                  <i className="fas fa-save me-2"></i>
                  Guardar Configuración
                </button>
                <button className="btn btn-outline-secondary">
                  <i className="fas fa-download me-2"></i>
                  Exportar Configuración
                </button>
                <button className="btn btn-outline-warning">
                  <i className="fas fa-undo me-2"></i>
                  Restablecer por Defecto
                </button>
              </div>
            </div>
          </div>

          {/* Información de Versión */}
          <div className="card">
            <div className="card-header">
              <h5>ℹ️ Información</h5>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <strong>Versión:</strong> 1.0.0
              </div>
              <div className="mb-2">
                <strong>Build:</strong> 2024.07.28
              </div>
              <div className="mb-2">
                <strong>Último Deploy:</strong> Hoy
              </div>
              <div className="mb-2">
                <strong>Región:</strong> {config.region}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 