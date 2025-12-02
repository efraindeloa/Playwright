/**
 * Script detallado para verificar la contraseña de aplicación de Gmail
 * Ejecutar con: node tests/utils/verificar-app-password.js
 */

const { ImapFlow } = require('imapflow');

// Configuración
const USER = 'fiestamasqaprv@gmail.com';
const APP_PASSWORD = 'jewlcrqnvvjstmvz'; // Contraseña de aplicación

console.log('='.repeat(60));
console.log('VERIFICACIÓN DE CONTRASEÑA DE APLICACIÓN DE GMAIL');
console.log('='.repeat(60));
console.log(`\nUsuario: ${USER}`);
console.log(`Contraseña de aplicación: ${APP_PASSWORD}`);
console.log(`Longitud: ${APP_PASSWORD.length} caracteres`);
console.log(`Tiene espacios: ${APP_PASSWORD.includes(' ') ? 'SÍ ❌' : 'NO ✅'}`);
console.log(`Solo letras minúsculas: ${/^[a-z]+$/.test(APP_PASSWORD) ? 'SÍ ✅' : 'NO ❌'}`);
console.log(`Es exactamente 16 caracteres: ${APP_PASSWORD.length === 16 ? 'SÍ ✅' : 'NO ❌'}\n`);

// Verificar formato
if (APP_PASSWORD.length !== 16) {
  console.error('❌ ERROR: La contraseña debe tener exactamente 16 caracteres');
  console.error(`   Longitud actual: ${APP_PASSWORD.length} caracteres\n`);
  process.exit(1);
}

if (APP_PASSWORD.includes(' ')) {
  console.error('❌ ERROR: La contraseña no debe tener espacios');
  console.error(`   Contraseña con espacios: "${APP_PASSWORD}"`);
  console.error(`   Debe ser: "${APP_PASSWORD.replace(/\s/g, '')}"\n`);
  process.exit(1);
}

if (!/^[a-z]+$/.test(APP_PASSWORD)) {
  console.error('❌ ERROR: La contraseña debe contener solo letras minúsculas');
  console.error(`   Contraseña actual: "${APP_PASSWORD}"\n`);
  process.exit(1);
}

console.log('✅ Formato de contraseña correcto\n');

// Intentar conectar
console.log('🔌 Intentando conectar a Gmail IMAP...\n');

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: USER,
    pass: APP_PASSWORD
  },
  logger: false // Desactivar logs detallados para mejor legibilidad
});

(async () => {
  try {
    console.log('📡 Estableciendo conexión TCP...');
    await client.connect();
    console.log('✅ Conexión TCP establecida\n');
    
    console.log('🔐 Intentando autenticación...');
    // La autenticación ocurre automáticamente en connect()
    console.log('✅ Autenticación exitosa!\n');
    
    console.log('📂 Abriendo bandeja de entrada...');
    const mailbox = await client.mailboxOpen('INBOX');
    console.log('✅ Bandeja de entrada abierta\n');
    
    console.log(`📊 Información de la bandeja:`);
    console.log(`   Total de mensajes: ${mailbox.exists || 'N/A'}`);
    console.log(`   Mensajes recientes: ${mailbox.recent || 'N/A'}\n`);
    
    // Buscar emails de verificación
    console.log('🔍 Buscando emails con subject "Código de verificación"...');
    const searchResults = await client.search({
      subject: 'Código de verificación'
    });
    
    console.log(`✅ Encontrados ${searchResults.length} emails de verificación\n`);
    
    if (searchResults.length > 0) {
      console.log('📧 Procesando el email más reciente...');
      const latestEmail = searchResults[searchResults.length - 1];
      const message = await client.download(latestEmail);
      
      if (message && message.content) {
        let emailText = '';
        for await (const chunk of message.content) {
          emailText += chunk.toString();
        }
        
        // Buscar código
        const codeMatch = emailText.match(/\b(\d{6})\b/);
        if (codeMatch) {
          console.log(`✅ Código encontrado en el email: ${codeMatch[1]}\n`);
        } else {
          console.log('⚠️ Email encontrado pero no se pudo extraer el código\n');
        }
      }
    }
    
    await client.logout();
    console.log('='.repeat(60));
    console.log('✅ VERIFICACIÓN EXITOSA');
    console.log('='.repeat(60));
    console.log('\nLa contraseña de aplicación es correcta y funciona correctamente.');
    console.log('Puedes usar esta configuración en tus pruebas.\n');
    
  } catch (err) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ ERROR DE CONEXIÓN');
    console.log('='.repeat(60));
    
    // Obtener información detallada del error
    const errorMessage = err.message || String(err);
    const errorResponse = err.response || '';
    const errorCode = err.serverResponseCode || '';
    
    console.log(`\nMensaje de error: ${errorMessage}`);
    if (errorResponse) console.log(`Respuesta del servidor: ${errorResponse}`);
    if (errorCode) console.log(`Código de error: ${errorCode}`);
    console.log('');
    
    // Análisis detallado del error
    const fullError = (errorMessage + ' ' + errorResponse + ' ' + errorCode).toLowerCase();
    
    if (fullError.includes('invalid credentials') || fullError.includes('authenticationfailed') || fullError.includes('authentication failed')) {
      console.log('📋 DIAGNÓSTICO: Error de autenticación\n');
      console.log('Posibles causas:');
      console.log('1. ❌ La contraseña de aplicación es incorrecta');
      console.log('2. ❌ La contraseña tiene espacios o caracteres incorrectos');
      console.log('3. ❌ La contraseña no es para "Correo"');
      console.log('4. ❌ La contraseña fue generada para otra cuenta');
      console.log('5. ⏳ La contraseña acaba de generarse (espera 1-2 minutos)\n');
      
      console.log('📋 PASOS PARA RESOLVER:');
      console.log('1. Ve a: https://myaccount.google.com/apppasswords');
      console.log('2. Verifica que la contraseña mostrada sea exactamente:');
      console.log(`   "${APP_PASSWORD}"`);
      console.log('3. Si es diferente, copia la correcta y actualiza el código');
      console.log('4. Si es la misma, genera una nueva contraseña');
      console.log('5. Espera 1-2 minutos después de generarla\n');
      
    } else if (err.message.includes('Application-specific password')) {
      console.log('📋 DIAGNÓSTICO: Se requiere contraseña de aplicación\n');
      console.log('La cuenta tiene verificación en dos pasos habilitada.');
      console.log('Debes usar una contraseña de aplicación, no tu contraseña normal.\n');
      
    } else {
      console.log('📋 DIAGNÓSTICO: Error de conexión\n');
      console.log('Verifica:');
      console.log('- Tu conexión a internet');
      console.log('- Que el puerto 993 no esté bloqueado');
      console.log('- Que IMAP esté habilitado en Gmail\n');
    }
    
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
})();

