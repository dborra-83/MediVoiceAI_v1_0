// Script de prueba para las APIs de MediVoice AI
import axios from 'axios';

const API_BASE_URL = 'https://49g5qi2w6k.execute-api.us-east-1.amazonaws.com/dev';

console.log('🧪 Iniciando pruebas de APIs de MediVoice AI...\n');

// Función para probar endpoint
async function testEndpoint(method, endpoint, data = null, headers = {}) {
  try {
    console.log(`🔄 Probando ${method.toUpperCase()} ${endpoint}...`);
    
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log(`✅ ${endpoint} - Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...\n`);
    
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      console.log(`❌ ${endpoint} - Error ${error.response.status}: ${error.response.statusText}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}\n`);
    } else {
      console.log(`❌ ${endpoint} - Error: ${error.message}\n`);
    }
    
    return { success: false, error: error.message };
  }
}

// Ejecutar pruebas
async function runTests() {
  const results = [];
  
  // 1. Probar OPTIONS (CORS)
  console.log('🌐 === PROBANDO CORS (OPTIONS) ===');
  results.push(await testEndpoint('OPTIONS', '/audio'));
  results.push(await testEndpoint('OPTIONS', '/process'));
  results.push(await testEndpoint('OPTIONS', '/pdf'));
  results.push(await testEndpoint('OPTIONS', '/history'));
  
  // 2. Probar endpoints sin autenticación (deberían devolver error 401)
  console.log('🔒 === PROBANDO AUTENTICACIÓN ===');
  results.push(await testEndpoint('POST', '/audio', { test: 'data' }));
  results.push(await testEndpoint('POST', '/process', { test: 'data' }));
  results.push(await testEndpoint('POST', '/pdf', { test: 'data' }));
  results.push(await testEndpoint('GET', '/history'));
  
  // 3. Probar con datos inválidos
  console.log('📝 === PROBANDO VALIDACIÓN DE DATOS ===');
  const mockAuthHeaders = {
    'Authorization': 'Bearer mock-token-for-testing'
  };
  
  results.push(await testEndpoint('POST', '/audio', {}, mockAuthHeaders));
  results.push(await testEndpoint('POST', '/process', {}, mockAuthHeaders));
  results.push(await testEndpoint('POST', '/pdf', {}, mockAuthHeaders));
  
  // 4. Resumen de resultados
  console.log('📊 === RESUMEN DE PRUEBAS ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Pruebas exitosas: ${successful}`);
  console.log(`❌ Pruebas fallidas: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  
  console.log('\n🔍 === ANÁLISIS ===');
  console.log('• OPTIONS requests should return 200 (CORS enabled)');
  console.log('• POST/GET requests should return 401 (authentication required)');
  console.log('• Invalid data should return 400 (validation working)');
  
  console.log('\n🚀 === SIGUIENTE PASO ===');
  console.log('Si las APIs responden correctamente (incluso con errores de auth),');
  console.log('significa que la infraestructura está funcionando.');
  console.log('\nPara probar completamente:');
  console.log('1. cd frontend');
  console.log('2. npm install');
  console.log('3. npm run dev');
  console.log('4. Abrir http://localhost:5173');
}

// Ejecutar
runTests().catch(error => {
  console.error('💥 Error ejecutando pruebas:', error);
}); 