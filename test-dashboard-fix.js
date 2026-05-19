/**
 * ============================================
 * SCRIPT DE PRUEBA: Dashboard Fix
 * ============================================
 * Uso: node test-dashboard-fix.js
 * 
 * Valida que el error de "RegistroDiario" ha sido corregido
 * Prueba endpoints de dashboard y reportes con:
 * 1. Fechas válidas
 * 2. Fechas inválidas (para verificar que rechaza)
 * 3. Sin fechas (para verificar que requiere)
 */

const http = require('http');

// Configuración
const BASE_URL = 'http://localhost:5000/api/v1';
const TOKEN = 'TU_TOKEN_AQUI'; // Reemplaza con token real

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Función para hacer request HTTP
 */
function makeRequest(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

/**
 * Pruebas
 */
async function runTests() {
  console.log(`\n${colors.blue}=====================================`);
  console.log('PRUEBAS: Dashboard Fix - Validación de Fechas');
  console.log(`=====================================${colors.reset}\n`);

  // Test 1: Dashboard con fechas válidas
  console.log(`${colors.blue}TEST 1: Dashboard con fechas VÁLIDAS${colors.reset}`);
  try {
    const response = await makeRequest(
      'GET',
      `/reportes/dashboard?fecha_inicio=2026-05-01&fecha_fin=2026-05-31`
    );
    
    if (response.status === 200) {
      console.log(`${colors.green}✓ ÉXITO (200)${colors.reset}`);
      console.log(`  - Avance Metas: ${response.data.data?.avance_metas ? 'OK' : 'Falta'}`);
      console.log(`  - Por Actividad: ${response.data.data?.por_actividad ? 'OK' : 'Falta'}`);
      console.log(`  - Nómina General: ${response.data.data?.nomina_general ? 'OK' : 'Falta'}`);
    } else {
      console.log(`${colors.red}✗ FALLO (${response.status})${colors.reset}`);
      console.log(`  Mensaje: ${response.data.message}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ ERROR: ${err.message}${colors.reset}`);
  }

  // Test 2: Dashboard SIN fechas (debe rechazar)
  console.log(`\n${colors.blue}TEST 2: Dashboard SIN fechas (debe rechazar con 400)${colors.reset}`);
  try {
    const response = await makeRequest('GET', '/reportes/dashboard');
    
    if (response.status === 400) {
      console.log(`${colors.green}✓ CORRECTO (400 - Rechazó)${colors.reset}`);
      console.log(`  Mensaje: ${response.data.message}`);
    } else {
      console.log(`${colors.red}✗ FALLO: Debería rechazar con 400, recibió ${response.status}${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ ERROR: ${err.message}${colors.reset}`);
  }

  // Test 3: Dashboard con fechas INVÁLIDAS (como "RegistroDiario")
  console.log(`\n${colors.blue}TEST 3: Dashboard con fecha_inicio="RegistroDiario" (debe rechazar)${colors.reset}`);
  try {
    const response = await makeRequest(
      'GET',
      `/reportes/dashboard?fecha_inicio=RegistroDiario&fecha_fin=2026-05-31`
    );
    
    if (response.status === 400 || response.status === 500) {
      console.log(`${colors.green}✓ RECHAZADO (${response.status})${colors.reset}`);
      console.log(`  Mensaje: ${response.data.message}`);
      
      // Verificar que NO contiene el error de Mongoose Cast
      if (response.data.message.includes('Cast to Date failed')) {
        console.log(`${colors.red}✗ PROBLEMA: Aún contiene error de Mongoose Cast${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ NO CONTIENE error de Mongoose Cast${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}! Recibió ${response.status}${colors.reset}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ ERROR: ${err.message}${colors.reset}`);
  }

  // Test 4: Resumen nómina general con fechas válidas
  console.log(`\n${colors.blue}TEST 4: Resumen nómina general con fechas VÁLIDAS${colors.reset}`);
  try {
    const response = await makeRequest(
      'GET',
      `/reportes/nomina-general?fecha_inicio=2026-05-01&fecha_fin=2026-05-31`
    );
    
    if (response.status === 200) {
      console.log(`${colors.green}✓ ÉXITO (200)${colors.reset}`);
      console.log(`  - Total trabajadores: ${response.data.data?.resumen_general?.total_trabajadores}`);
      console.log(`  - Nómina total: ${response.data.data?.resumen_general?.nomina_total}`);
    } else {
      console.log(`${colors.red}✗ FALLO (${response.status})${colors.reset}`);
      console.log(`  Mensaje: ${response.data.message}`);
    }
  } catch (err) {
    console.log(`${colors.red}✗ ERROR: ${err.message}${colors.reset}`);
  }

  // Test 5: Resumen nómina general con fechas INVÁLIDAS
  console.log(`\n${colors.blue}TEST 5: Resumen nómina con fecha_fin="RegistroDiario" (debe rechazar)${colors.reset}`);
  try {
    const response = await makeRequest(
      'GET',
      `/reportes/nomina-general?fecha_inicio=2026-05-01&fecha_fin=RegistroDiario`
    );
    
    if (response.status === 400 || response.status === 500) {
      console.log(`${colors.green}✓ RECHAZADO (${response.status})${colors.reset}`);
      console.log(`  Mensaje: ${response.data.message}`);
      
      if (response.data.message.includes('Cast to Date failed')) {
        console.log(`${colors.red}✗ PROBLEMA: Aún contiene error de Mongoose Cast${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ NO CONTIENE error de Mongoose Cast${colors.reset}`);
      }
    }
  } catch (err) {
    console.log(`${colors.red}✗ ERROR: ${err.message}${colors.reset}`);
  }

  console.log(`\n${colors.blue}=====================================`);
  console.log('PRUEBAS COMPLETADAS');
  console.log(`=====================================${colors.reset}\n`);
}

// Ejecutar pruebas
runTests().catch(console.error);
