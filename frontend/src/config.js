// Configuración generada automáticamente desde Terraform
const config = {
  // API Gateway
  apiUrl: 'https://49g5qi2w6k.execute-api.us-east-1.amazonaws.com/dev',
  
  // Cognito Authentication
  cognitoUserPoolId: 'us-east-1_uem9yWZFM',
  cognitoAppClientId: '5gjfc31u4b8hb5uuqg2s0c50ej',
  cognitoIdentityPoolId: 'us-east-1:823d012e-ae0f-4c27-918b-5553d4319c86',
  cognitoDomain: 'medivoice',
  cognitoHostedUIUrl: 'https://medivoice.auth.us-east-1.amazoncognito.com/login?client_id=5gjfc31u4b8hb5uuqg2s0c50ej&response_type=code&scope=openid+email+profile&redirect_uri=http://localhost:3000/callback',
  
  // AWS Configuration
  region: 'us-east-1',
  
  // S3 Buckets
  audioBucket: 'medivoice-ai-dev-audio',
  pdfBucket: 'medivoice-ai-dev-pdfs',
  
  // DynamoDB Tables
  consultationsTable: 'medivoice-ai-dev-consultations',
  doctorsTable: 'medivoice-ai-dev-doctors',
  promptsTable: 'medivoice-ai-dev-prompts',
  
  // Lambda Functions
  lambdaFunctions: {
    uploadAudio: 'arn:aws:lambda:us-east-1:520754296204:function:medivoice-ai-dev-upload-audio',
    processAudio: 'arn:aws:lambda:us-east-1:520754296204:function:medivoice-ai-dev-process-audio',
    generatePdf: 'arn:aws:lambda:us-east-1:520754296204:function:medivoice-ai-dev-generate-pdf',
    getHistory: 'arn:aws:lambda:us-east-1:520754296204:function:medivoice-ai-dev-get-history'
  },
  
  // Development settings
  isDevelopment: process.env.NODE_ENV === 'development',
  enableDebugLogs: true,
  
  // API Endpoints
  endpoints: {
    uploadAudio: '/audio',
    processAudio: '/process', 
    generatePdf: '/pdf',
    getHistory: '/history'
  }
};

export default config; 