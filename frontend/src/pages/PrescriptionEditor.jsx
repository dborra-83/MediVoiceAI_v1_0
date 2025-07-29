import React, { useState } from 'react'
import { FileText, Download, Save, Plus, Trash2, User, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const PrescriptionEditor = () => {
  const [prescription, setPrescription] = useState({
    patientName: '',
    patientAge: '',
    patientId: '',
    diagnosis: '',
    medications: [
      {
        id: 1,
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }
    ],
    doctorName: 'Dr. Juan Pérez',
    doctorLicense: 'MED12345',
    doctorSpecialty: 'Medicina General',
    institution: 'Clínica MediVoice',
    date: new Date().toISOString().split('T')[0],
    additionalNotes: ''
  })

  const [loading, setLoading] = useState(false)

  // Agregar medicamento
  const addMedication = () => {
    setPrescription(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          id: Date.now(),
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: ''
        }
      ]
    }))
  }

  // Eliminar medicamento
  const removeMedication = (id) => {
    if (prescription.medications.length > 1) {
      setPrescription(prev => ({
        ...prev,
        medications: prev.medications.filter(med => med.id !== id)
      }))
    }
  }

  // Actualizar medicamento
  const updateMedication = (id, field, value) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    }))
  }

  // Actualizar campo general
  const updateField = (field, value) => {
    setPrescription(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Generar PDF
  const generatePDF = async () => {
    setLoading(true)
    
    try {
      // Simular generación de PDF
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Crear contenido del PDF
      const pdfContent = `
        RECETA MÉDICA
        
        Fecha: ${prescription.date}
        Médico: ${prescription.doctorName}
        Licencia: ${prescription.doctorLicense}
        Especialidad: ${prescription.doctorSpecialty}
        Institución: ${prescription.institution}
        
        PACIENTE:
        Nombre: ${prescription.patientName}
        Edad: ${prescription.patientAge}
        ID: ${prescription.patientId}
        
        DIAGNÓSTICO:
        ${prescription.diagnosis}
        
        MEDICAMENTOS:
        ${prescription.medications.map(med => `
          - ${med.name} ${med.dosage}
            Frecuencia: ${med.frequency}
            Duración: ${med.duration}
            Instrucciones: ${med.instructions}
        `).join('\n')}
        
        NOTAS ADICIONALES:
        ${prescription.additionalNotes}
        
        Firma: _________________
        ${prescription.doctorName}
      `
      
      // Simular descarga
      const blob = new Blob([pdfContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receta_${prescription.patientName}_${prescription.date}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('PDF generado exitosamente')
    } catch (error) {
      console.error('Error al generar PDF:', error)
      toast.error('Error al generar PDF')
    } finally {
      setLoading(false)
    }
  }

  // Guardar receta
  const savePrescription = async () => {
    setLoading(true)
    
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Receta guardada exitosamente')
    } catch (error) {
      console.error('Error al guardar receta:', error)
      toast.error('Error al guardar receta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editor de Recetas Médicas</h1>
        <p className="text-gray-600">
          Cree y edite recetas médicas profesionales
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información del médico */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Médico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="medical-form-label">Nombre del Médico</label>
                <input
                  type="text"
                  value={prescription.doctorName}
                  onChange={(e) => updateField('doctorName', e.target.value)}
                  className="input-medical"
                />
              </div>
              <div>
                <label className="medical-form-label">Número de Licencia</label>
                <input
                  type="text"
                  value={prescription.doctorLicense}
                  onChange={(e) => updateField('doctorLicense', e.target.value)}
                  className="input-medical"
                />
              </div>
              <div>
                <label className="medical-form-label">Especialidad</label>
                <input
                  type="text"
                  value={prescription.doctorSpecialty}
                  onChange={(e) => updateField('doctorSpecialty', e.target.value)}
                  className="input-medical"
                />
              </div>
              <div>
                <label className="medical-form-label">Institución</label>
                <input
                  type="text"
                  value={prescription.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  className="input-medical"
                />
              </div>
            </div>
          </div>

          {/* Información del paciente */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="medical-form-label">Nombre del Paciente</label>
                <input
                  type="text"
                  value={prescription.patientName}
                  onChange={(e) => updateField('patientName', e.target.value)}
                  className="input-medical"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="medical-form-label">Edad</label>
                <input
                  type="number"
                  value={prescription.patientAge}
                  onChange={(e) => updateField('patientAge', e.target.value)}
                  className="input-medical"
                  placeholder="Años"
                />
              </div>
              <div>
                <label className="medical-form-label">ID del Paciente</label>
                <input
                  type="text"
                  value={prescription.patientId}
                  onChange={(e) => updateField('patientId', e.target.value)}
                  className="input-medical"
                  placeholder="Número de identificación"
                />
              </div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Diagnóstico</h3>
            <textarea
              value={prescription.diagnosis}
              onChange={(e) => updateField('diagnosis', e.target.value)}
              className="input-medical"
              rows={3}
              placeholder="Describa el diagnóstico del paciente..."
            />
          </div>

          {/* Medicamentos */}
          <div className="card-medical">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Medicamentos</h3>
              <button
                onClick={addMedication}
                className="btn-medical-secondary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Medicamento
              </button>
            </div>
            
            <div className="space-y-4">
              {prescription.medications.map((medication, index) => (
                <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Medicamento {index + 1}</h4>
                    {prescription.medications.length > 1 && (
                      <button
                        onClick={() => removeMedication(medication.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="medical-form-label">Nombre del Medicamento</label>
                      <input
                        type="text"
                        value={medication.name}
                        onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                        className="input-medical"
                        placeholder="Ej: Paracetamol"
                      />
                    </div>
                    <div>
                      <label className="medical-form-label">Dosis</label>
                      <input
                        type="text"
                        value={medication.dosage}
                        onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                        className="input-medical"
                        placeholder="Ej: 500mg"
                      />
                    </div>
                    <div>
                      <label className="medical-form-label">Frecuencia</label>
                      <input
                        type="text"
                        value={medication.frequency}
                        onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                        className="input-medical"
                        placeholder="Ej: Cada 8 horas"
                      />
                    </div>
                    <div>
                      <label className="medical-form-label">Duración</label>
                      <input
                        type="text"
                        value={medication.duration}
                        onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                        className="input-medical"
                        placeholder="Ej: 7 días"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="medical-form-label">Instrucciones Especiales</label>
                      <textarea
                        value={medication.instructions}
                        onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                        className="input-medical"
                        rows={2}
                        placeholder="Instrucciones específicas para el paciente..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notas Adicionales</h3>
            <textarea
              value={prescription.additionalNotes}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              className="input-medical"
              rows={3}
              placeholder="Observaciones adicionales, recomendaciones, etc..."
            />
          </div>
        </div>

        {/* Vista previa */}
        <div className="space-y-6">
          {/* Fecha */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fecha de Consulta</h3>
            <input
              type="date"
              value={prescription.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="input-medical"
            />
          </div>

          {/* Acciones */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
            <div className="space-y-3">
              <button
                onClick={savePrescription}
                disabled={loading}
                className="btn-medical w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Receta'}
              </button>
              
              <button
                onClick={generatePDF}
                disabled={loading}
                className="btn-medical-secondary w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Generando...' : 'Generar PDF'}
              </button>
            </div>
          </div>

          {/* Vista previa rápida */}
          <div className="card-medical">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="space-y-2">
                <div>
                  <strong>Paciente:</strong> {prescription.patientName || 'No especificado'}
                </div>
                <div>
                  <strong>Diagnóstico:</strong> {prescription.diagnosis || 'No especificado'}
                </div>
                <div>
                  <strong>Medicamentos:</strong> {prescription.medications.length}
                </div>
                <div>
                  <strong>Fecha:</strong> {prescription.date}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionEditor 