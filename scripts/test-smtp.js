const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env si existe
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          // Solo asignar si hay un valor (no vacío)
          if (key && value) {
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    });
    console.log('✅ Variables de entorno cargadas desde .env\n');
  } else {
    console.log('⚠️  Archivo .env no encontrado en:', envPath);
  }
} catch (error) {
  console.log('⚠️  No se pudo cargar .env:', error.message);
}

// Configuración SMTP
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

const EMAIL_TO = process.env.EMAIL_TO || 'efraindeloa@hotmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'fiestamas-tests@fiestamas.com';

console.log('='.repeat(60));
console.log('📧 PRUEBA DE CONFIGURACIÓN SMTP');
console.log('='.repeat(60));
console.log('');
console.log('Configuración SMTP:');
console.log(`  Host: ${SMTP_CONFIG.host}`);
console.log(`  Port: ${SMTP_CONFIG.port}`);
console.log(`  User: ${SMTP_CONFIG.auth.user || '(no configurado)'}`);
console.log(`  Password: ${SMTP_CONFIG.auth.pass ? '***' + SMTP_CONFIG.auth.pass.slice(-4) : '(no configurado)'}`);
console.log('');
console.log('Email de destino:', EMAIL_TO);
console.log('Email de origen:', EMAIL_FROM);
console.log('');

// Validar configuración
if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
  console.log('❌ ERROR: SMTP_USER y SMTP_PASSWORD deben estar configurados en .env');
  console.log('');
  console.log('Para configurar:');
  console.log('1. Abre el archivo .env');
  console.log('2. Completa las siguientes líneas:');
  console.log('   SMTP_USER=fiestamasqaprv@gmail.com');
  console.log('   SMTP_PASSWORD=tu-contraseña-de-aplicación');
  console.log('');
  console.log('Para Gmail con autenticación de dos factores:');
  console.log('1. Ve a: https://myaccount.google.com/apppasswords');
  console.log('2. Selecciona "Aplicación": Correo');
  console.log('3. Selecciona "Dispositivo": Otro (personalizado)');
  console.log('4. Escribe: "Fiestamas Tests"');
  console.log('5. Genera y copia la contraseña de aplicación');
  console.log('6. Úsala en SMTP_PASSWORD');
  process.exit(1);
}

// Crear transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Verificar conexión
console.log('🔍 Verificando conexión SMTP...');
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Error al verificar conexión SMTP:');
    console.log('   ', error.message);
    console.log('');
    console.log('Posibles soluciones:');
    console.log('1. Verifica que SMTP_USER y SMTP_PASSWORD sean correctos');
    console.log('2. Si usas autenticación de dos factores, usa una contraseña de aplicación');
    console.log('3. Verifica que el firewall permite conexiones SMTP (puerto 587)');
    console.log('4. Para Gmail, asegúrate de usar smtp.gmail.com');
    console.log('5. Verifica que la contraseña de aplicación sea correcta (16 caracteres sin espacios)');
    process.exit(1);
  } else {
    console.log('✅ Conexión SMTP verificada exitosamente');
    console.log('');
    
    // Enviar email de prueba
    console.log('📤 Enviando email de prueba...');
    const mailOptions = {
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: '✅ Prueba de Configuración SMTP - Fiestamas Tests',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4caf50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
            .success { background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Configuración SMTP Exitosa</h1>
            </div>
            <div class="content">
              <div class="success">
                <h2>¡Felicidades!</h2>
                <p>La configuración SMTP está funcionando correctamente.</p>
                <p>Ahora recibirás notificaciones por email cuando las pruebas automatizadas fallen.</p>
              </div>
              <p><strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })}</p>
              <p><strong>Servidor SMTP:</strong> ${SMTP_CONFIG.host}</p>
              <p><strong>Puerto:</strong> ${SMTP_CONFIG.port}</p>
              <p><strong>Email de origen:</strong> ${EMAIL_FROM}</p>
              <p><strong>Email de destino:</strong> ${EMAIL_TO}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Configuración SMTP Exitosa

¡Felicidades! La configuración SMTP está funcionando correctamente.
Ahora recibirás notificaciones por email cuando las pruebas automatizadas fallen.

Fecha y Hora: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })}
Servidor SMTP: ${SMTP_CONFIG.host}
Puerto: ${SMTP_CONFIG.port}
Email de origen: ${EMAIL_FROM}
Email de destino: ${EMAIL_TO}
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Error al enviar email:');
        console.log('   ', error.message);
        console.log('');
        console.log('Posibles soluciones:');
        console.log('1. Verifica que el email de destino sea correcto');
        console.log('2. Verifica que SMTP_USER tenga permisos para enviar emails');
        console.log('3. Revisa la carpeta de spam si no recibes el email');
        process.exit(1);
      } else {
        console.log('✅ Email de prueba enviado exitosamente!');
        console.log('');
        console.log('Detalles:');
        console.log(`  Message ID: ${info.messageId}`);
        console.log(`  Response: ${info.response}`);
        console.log('');
        console.log('📬 Revisa tu bandeja de entrada (y spam) en:', EMAIL_TO);
        console.log('');
        console.log('='.repeat(60));
        console.log('✅ CONFIGURACIÓN SMTP COMPLETADA');
        console.log('='.repeat(60));
        console.log('');
        console.log('Ahora puedes ejecutar las pruebas automatizadas:');
        console.log('  npm run test:smtp');
        console.log('');
        process.exit(0);
      }
    });
  }
});

