// Configuración para desarrollo con proxy de Vite
const config = {
  // URLs relativas que usarán el proxy de Vite
  apiUrl: '', // URL base vacía para usar proxy
  cognitoUserPoolId: 'us-east-1_1234567890',
  cognitoAppClientId: '1234567890abcdef',
  cognitoIdentityPoolId: 'us-east-1:1234567890-1234-1234-1234-1234567890ab',
  cognitoHostedUIUrl: 'https://medivoice-ai-dev.auth.us-east-1.amazoncognito.com',
  
  // Configuración de endpoints
  endpoints: {
    uploadAudio: '/api/audio',
    processAudio: '/api/audio/process',
    generatePDF: '/api/pdf',
    getHistory: '/api/history'
  }
}

export default config 