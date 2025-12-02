/**
 * Script para probar diferentes variaciones de la contraseña
 * y diagnosticar el problema exacto
 */

const { ImapFlow } = require('imapflow');

const USER = 'fiestamasqaprv@gmail.com';
const APP_PASSWORD = 'jewlcrqnvvjstmvz';

console.log('🔍 DIAGNÓSTICO DETALLADO DE CONTRASEÑA DE APLICACIÓN\n');
console.log(`Usuario: ${USER}`);
console.log(`Contraseña actual: ${APP_PASSWORD}\n`);

// Función para probar conexión
async function probarConexion(password, descripcion) {
  console.log(`\n📝 Probando: ${descripcion}`);
  console.log(`   Contraseña: ${password}`);
  console.log(`   Longitud: ${password.length} caracteres`);
  
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: USER,
      pass: password
    },
    logger: false
  });

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');
    await client.logout();
    console.log(`   ✅ ÉXITO: Esta contraseña funciona!`);
    return true;
  } catch (err) {
    const errorMsg = err.message || String(err);
    const errorResponse = err.response || '';
    
    if (errorMsg.includes('Invalid credentials') || errorResponse.includes('AUTHENTICATIONFAILED')) {
      console.log(`   ❌ FALLO: Credenciales inválidas`);
    } else {
      console.log(`   ❌ FALLO: ${errorMsg}`);
    }
    return false;
  }
}

(async () => {
  console.log('='.repeat(70));
  
  // Probar la contraseña actual
  const resultado1 = await probarConexion(APP_PASSWORD, 'Contraseña actual (sin espacios)');
  
  // Probar con espacios (por si acaso Google los acepta)
  const conEspacios = APP_PASSWORD.match(/.{1,4}/g)?.join(' ') || APP_PASSWORD;
  if (conEspacios !== APP_PASSWORD) {
    await probarConexion(conEspacios, 'Contraseña con espacios (formato Google)');
  }
  
  // Probar variaciones comunes de error
  const variaciones = [
    { pass: APP_PASSWORD.toUpperCase(), desc: 'Contraseña en MAYÚSCULAS' },
    { pass: APP_PASSWORD.trim(), desc: 'Contraseña con trim()' },
    { pass: APP_PASSWORD.replace(/\s/g, ''), desc: 'Contraseña sin espacios (forzado)' },
  ];
  
  for (const variacion of variaciones) {
    if (variacion.pass !== APP_PASSWORD) {
      await probarConexion(variacion.pass, variacion.desc);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📋 CONCLUSIÓN:');
  
  if (!resultado1) {
    console.log('❌ La contraseña de aplicación NO funciona.');
    console.log('\n📋 ACCIÓN REQUERIDA:');
    console.log('1. Ve a: https://myaccount.google.com/apppasswords');
    console.log('2. Verifica que la contraseña mostrada sea EXACTAMENTE:');
    console.log(`   "${APP_PASSWORD}"`);
    console.log('3. Si es diferente, copia la correcta');
    console.log('4. Si es la misma pero no funciona:');
    console.log('   a. Elimina esta contraseña');
    console.log('   b. Genera una NUEVA contraseña de aplicación');
    console.log('   c. Asegúrate de seleccionar "Correo" como aplicación');
    console.log('   d. Copia la nueva contraseña SIN ESPACIOS');
    console.log('   e. Espera 1-2 minutos después de generarla');
    console.log('   f. Prueba nuevamente\n');
  } else {
    console.log('✅ La contraseña funciona correctamente!\n');
  }
})();

