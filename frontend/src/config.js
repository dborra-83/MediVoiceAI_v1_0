// Configuración del frontend con soporte para múltiples ambientes
const isDevelopment = import.meta.env.MODE === 'development'
const isProduction = import.meta.env.MODE === 'production'

const config = {
  // Environment detection
  isDevelopment,
  isProduction,
  
  // API Configuration - se puede usar proxy en desarrollo o URL directa en producción
  apiUrl: import.meta.env.VITE_API_URL || (isDevelopment ? '' : 'https://api.medivoice.com'),
  
  // AWS Cognito Configuration - usar variables de entorno cuando están disponibles
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_CHANGEME',
  cognitoAppClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID || 'CHANGEME',
  cognitoIdentityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || 'us-east-1:CHANGEME',
  cognitoHostedUIUrl: import.meta.env.VITE_COGNITO_HOSTED_UI_URL || 'https://medivoice-ai-dev.auth.us-east-1.amazoncognito.com',
  
  // AWS Region
  awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  
  // API Endpoints - relatives for proxy, absolute for production
  endpoints: {
    uploadAudio: '/api/audio',
    processAudio: '/api/audio/process',
    generatePDF: '/api/pdf',
    getHistory: '/api/history'
  },
  
  // Application Settings
  maxRecordingTime: 180, // 3 minutes in seconds
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedAudioFormats: ['audio/webm', 'audio/wav', 'audio/mp3'],
  
  // Feature Flags
  features: {
    authentication: import.meta.env.VITE_ENABLE_AUTH === 'true',
    realTimeTranscription: import.meta.env.VITE_ENABLE_REALTIME === 'true',
    advancedAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
  },
  
  // Debug Configuration
  debug: {
    showApiEndpoints: isDevelopment,
    enableConsoleLogging: isDevelopment,
    showNetworkRequests: isDevelopment
  }
}

// Validate required configuration in production
if (isProduction) {
  const requiredVars = [
    'VITE_COGNITO_USER_POOL_ID',
    'VITE_COGNITO_APP_CLIENT_ID',
    'VITE_API_URL'
  ]
  
  const missingVars = requiredVars.filter(varName => 
    !import.meta.env[varName] || import.meta.env[varName].includes('CHANGEME')
  )
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars)
    console.error('Please configure these variables for production deployment')
  }
}

// Log configuration in development
if (isDevelopment && config.debug.enableConsoleLogging) {
  console.log('🔧 MediVoice AI Configuration:', {
    mode: import.meta.env.MODE,
    apiUrl: config.apiUrl,
    authEnabled: config.features.authentication,
    cognitoConfigured: !config.cognitoUserPoolId.includes('CHANGEME')
  })
}

export default config 