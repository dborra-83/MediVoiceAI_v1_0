import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import config from './config.js'

// Componentes básicos
import Dashboard from './pages/Dashboard'
import AudioRecorder from './pages/AudioRecorder'
import History from './pages/History'
import Settings from './pages/Settings'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <Router>
      <div className="App">
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <div className="container">
            <a className="navbar-brand" href="/">
              🏥 MediVoice AI
            </a>
            <div className="navbar-nav">
              <a className="nav-link text-white" href="/dashboard">Dashboard</a>
              <a className="nav-link text-white" href="/recorder">Grabar</a>
              <a className="nav-link text-white" href="/history">Historial</a>
              <a className="nav-link text-white" href="/settings">Configuración</a>
            </div>
          </div>
        </nav>

        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/recorder" element={<AudioRecorder />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>

        <footer className="bg-light text-center py-3 mt-5">
          <div className="container">
            <p className="mb-0">MediVoice AI - Asistente Médico con IA</p>
            <small className="text-muted">
              API: {config.apiUrl}
            </small>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App 