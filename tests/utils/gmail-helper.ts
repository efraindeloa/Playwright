import { ImapFlow } from 'imapflow';

/**
 * Configuración de Gmail para acceso IMAP
 * 
 * NOTA: Gmail puede requerir una contraseña de aplicación si:
 * 1. La cuenta tiene verificación en dos pasos habilitada
 * 2. Google ha bloqueado el acceso de aplicaciones "menos seguras"
 * 
 * Si tu contraseña normal no funciona, tienes dos opciones:
 * 
 * OPCIÓN 1: Usar contraseña de aplicación (Recomendado)
 * - Ve a: https://myaccount.google.com/apppasswords
 * - Genera una contraseña de aplicación para "Correo"
 * - Usa esa contraseña aquí
 * 
 * OPCIÓN 2: Habilitar acceso de aplicaciones menos seguras (No recomendado)
 * - Ve a: https://myaccount.google.com/security
 * - Busca "Acceso de aplicaciones menos seguras"
 * - Actívalo (si está disponible)
 * - Nota: Google está deshabilitando esta opción gradualmente
 */
/**
 * Configuración de Gmail para acceso IMAP usando imapflow
 */
const GMAIL_CONFIG = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'fiestamasqaprv@gmail.com',
    // ⚠️ IMPORTANTE: La contraseña de aplicación debe tener exactamente 16 caracteres SIN ESPACIOS
    pass: 'jewlcrqnvvjstmvz', // Contraseña de aplicación de Gmail (sin espacios)
  }
};

/**
 * Conecta a Gmail usando IMAP (imapflow) y busca el código de verificación más reciente
 * @param emailAddress - Dirección de email para buscar el código (opcional, busca en todos los emails si no se proporciona)
 * @param maxWaitTime - Tiempo máximo de espera en milisegundos (default: 2 minutos)
 * @param checkInterval - Intervalo entre verificaciones en milisegundos (default: 5 segundos)
 * @param maxEmailAge - Edad máxima del email en milisegundos (default: 5 minutos) - solo emails más recientes que esto serán considerados
 * @returns El código de verificación de 6 dígitos o null si no se encuentra
 */
export async function getVerificationCodeFromGmail(
  emailAddress?: string,
  maxWaitTime: number = 120000, // 2 minutos
  checkInterval: number = 5000, // 5 segundos
  maxEmailAge: number = 60000 // 1 minuto - solo considerar emails recibidos en los últimos 60 segundos
): Promise<string | null> {
  const startTime = Date.now();
  const searchStartTime = Date.now(); // Timestamp de cuando empezamos a buscar

  while (Date.now() - startTime < maxWaitTime) {
    try {
      console.log(`🔌 Intentando conectar a Gmail IMAP (${GMAIL_CONFIG.auth.user})...`);
      
      const client = new ImapFlow(GMAIL_CONFIG);
      
      await client.connect();
      console.log(`✅ Conexión IMAP establecida exitosamente`);
      
      await client.mailboxOpen('INBOX');
      console.log(`📂 Bandeja de entrada abierta exitosamente`);

      // Buscar emails con subject "Código de verificación"
      const searchCriteria = {
        subject: 'Código de verificación'
      };

      const searchResults = await client.search(searchCriteria);
      
      if (!searchResults || searchResults.length === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.floor((maxWaitTime - (Date.now() - startTime)) / 1000);
        console.log(`⏳ No se encontraron emails con subject "Código de verificación" (${elapsed}s transcurridos, ${remaining}s restantes)`);
        console.log(`   El correo aún no ha llegado, esperando...`);
        await client.logout();
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        continue;
      }

      console.log(`📧 Encontrados ${searchResults.length} emails de verificación (buscando solo los muy recientes, últimos ${maxEmailAge / 1000}s)...`);

      // Procesar los emails más recientes primero (los últimos en el array)
      const recentEmails = searchResults.slice(-10).reverse();
      let emailsRechazados = 0;
      let emailsRevisados = 0;

      for (const seq of recentEmails) {
        try {
          // Primero obtener el envelope para verificar la fecha del email
          const envelope = await client.fetchOne(seq, { envelope: true });
          if (!envelope) continue;

          // Verificar que el email sea muy reciente
          const emailDate = envelope.envelope?.date ? new Date(envelope.envelope.date) : null;
          const currentTime = Date.now();
          
          if (emailDate) {
            const emailAge = currentTime - emailDate.getTime();
            
            emailsRevisados++;
            
            // Solo considerar emails recibidos en los últimos maxEmailAge milisegundos (1 minuto)
            if (emailAge > maxEmailAge) {
              emailsRechazados++;
              console.log(`⏭️ Email ignorado: recibido hace ${Math.floor(emailAge / 1000)}s (más de ${Math.floor(maxEmailAge / 1000)}s, correo antiguo de ejecución anterior)`);
              continue;
            }
            
            // Asegurarse de que el email sea más reciente que cuando empezamos a buscar (con un buffer de 30 segundos)
            const searchBuffer = 30000; // 30 segundos de buffer
            if (emailDate.getTime() < (searchStartTime - searchBuffer)) {
              emailsRechazados++;
              console.log(`⏭️ Email ignorado: recibido antes de iniciar la búsqueda (${emailDate.toLocaleTimeString()}, correo antiguo)`);
              continue;
            }
            
            console.log(`✅ Email reciente encontrado: recibido hace ${Math.floor(emailAge / 1000)}s (${emailDate.toLocaleTimeString()})`);
          } else {
            console.log(`⚠️ No se pudo obtener la fecha del email, continuando...`);
          }

          // Ahora descargar el contenido del email
          const message = await client.download(seq);
          if (!message) continue;

          let emailText = '';
          
          // Leer el contenido del email desde el stream
          if (message.content) {
            for await (const chunk of message.content) {
              emailText += chunk.toString();
            }
          }

          // Buscar el código de 6 dígitos en el texto
          // Formato esperado: "Verifica tu correo\n\n938170\n\nEs el código..."
          
          // Estrategia 1: Buscar líneas con exactamente 6 dígitos
          const lines = emailText.split(/\r?\n/).map(line => line.trim());
          let codeFound: string | null = null;
          
          for (const line of lines) {
            const exactMatch = line.match(/^\s*(\d{6})\s*$/);
            if (exactMatch) {
              codeFound = exactMatch[1];
              console.log(`✅ Código encontrado en línea de texto: ${codeFound}`);
              break;
            }
          }

          // Estrategia 2: Buscar después de "Verifica tu correo"
          if (!codeFound) {
            const afterVerificaMatch = emailText.match(/Verifica tu correo\s+(\d{6})/i);
            if (afterVerificaMatch) {
              codeFound = afterVerificaMatch[1];
              console.log(`✅ Código encontrado después de "Verifica tu correo": ${codeFound}`);
            }
          }

          // Estrategia 3: Buscar cualquier código de 6 dígitos
          if (!codeFound) {
            const anyMatch = emailText.match(/\b(\d{6})\b/);
            if (anyMatch) {
              const potentialCode = anyMatch[1];
              if (/^\d{6}$/.test(potentialCode)) {
                codeFound = potentialCode;
                console.log(`✅ Código encontrado (patrón general): ${codeFound}`);
              }
            }
          }

          // Si encontramos el código, retornarlo
          if (codeFound && /^\d{6}$/.test(codeFound)) {
            // Verificar destinatario si se proporcionó emailAddress
            if (emailAddress) {
              const emailLower = emailAddress.toLowerCase();
              if (!emailText.toLowerCase().includes(emailLower) && 
                  !emailText.toLowerCase().includes(emailAddress.split('+')[0].toLowerCase())) {
                console.log(`⚠️ Email encontrado pero no es para ${emailAddress}, continuando búsqueda...`);
                continue;
              }
              console.log(`📧 Email de verificación encontrado para ${emailAddress}`);
            }
            
            console.log(`✅ Código de verificación encontrado: ${codeFound}`);
            await client.logout();
            return codeFound;
          }
        } catch (err: any) {
          console.log(`⚠️ Error al procesar email: ${err.message}`);
          continue;
        }
      }

      // Si no encontramos el código en estos emails, reintentar
      await client.logout();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((maxWaitTime - (Date.now() - startTime)) / 1000);
      if (emailsRevisados > 0) {
        console.log(`⏳ Revisados ${emailsRevisados} emails (${emailsRechazados} rechazados por ser antiguos), no se encontró código reciente.`);
        console.log(`   El correo aún no ha llegado, esperando... (${elapsed}s transcurridos, ${remaining}s restantes)`);
      } else {
        console.log(`⏳ No se encontraron emails recientes (últimos ${maxEmailAge / 1000}s).`);
        console.log(`   El correo aún no ha llegado, esperando... (${elapsed}s transcurridos, ${remaining}s restantes)`);
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));

    } catch (err: any) {
      const errorMessage = err.message || String(err);
      console.log(`⚠️ Error de conexión IMAP: ${errorMessage}`);
      
      // Si requiere contraseña de aplicación, fallar inmediatamente
      if (errorMessage.includes('Application-specific password') || errorMessage.includes('application-specific')) {
        console.log(`\n❌ ERROR: Gmail requiere autenticación adicional`);
        console.log(`   Genera una contraseña de aplicación en: https://myaccount.google.com/apppasswords\n`);
        throw new Error(
          `Gmail requiere autenticación adicional. ` +
          `Genera una contraseña de aplicación en https://myaccount.google.com/apppasswords ` +
          `y actualiza GMAIL_CONFIG.auth.pass en tests/utils/gmail-helper.ts`
        );
      }
      
      // Si son credenciales inválidas, mostrar información detallada
      if (errorMessage.includes('authentication') || errorMessage.includes('Invalid credentials') || errorMessage.includes('AUTHENTICATIONFAILED')) {
        console.log(`\n❌ ERROR: Credenciales inválidas`);
        console.log(`   Usuario: ${GMAIL_CONFIG.auth.user}`);
        console.log(`   Contraseña configurada: ${GMAIL_CONFIG.auth.pass}`);
        console.log(`   Longitud: ${GMAIL_CONFIG.auth.pass.length} caracteres`);
        console.log(`\n📋 Verifica:`);
        console.log(`   1. Que la contraseña de aplicación sea exactamente la que Google mostró`);
        console.log(`   2. Que no tenga espacios (debe ser 16 caracteres continuos)`);
        console.log(`   3. Que la hayas copiado correctamente desde Google`);
        console.log(`   4. Si acabas de generar la contraseña, espera 1-2 minutos`);
        console.log(`   5. Genera una nueva en: https://myaccount.google.com/apppasswords\n`);
        
        // Después de 3 intentos, fallar
        const attempts = Math.floor((Date.now() - startTime) / checkInterval) + 1;
        if (attempts >= 3) {
          throw new Error(
            `Credenciales inválidas después de ${attempts} intentos. ` +
            `Por favor, verifica que la contraseña de aplicación sea correcta. ` +
            `Usuario: ${GMAIL_CONFIG.auth.user}, ` +
            `Contraseña (primeros 4): ${GMAIL_CONFIG.auth.pass.substring(0, 4)}****`
          );
        }
      }
      
      // Reintentar después del intervalo
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  // Timeout alcanzado
  return null;
}

/**
 * Obtiene el código de verificación de Gmail con reintentos y espera automática
 * Solo considera emails muy recientes (últimos 5 minutos por defecto)
 * @param emailAddress - Dirección de email para buscar el código
 * @param maxWaitTime - Tiempo máximo de espera en milisegundos (default: 2 minutos)
 * @param maxEmailAge - Edad máxima del email en milisegundos (default: 5 minutos)
 * @returns El código de verificación de 6 dígitos
 * @throws Error si no se encuentra el código en el tiempo límite
 */
export async function waitForVerificationCode(
  emailAddress: string,
  maxWaitTime: number = 120000,
  maxEmailAge: number = 60000 // 1 minuto - solo emails muy recientes
): Promise<string> {
  console.log(`📧 Buscando código de verificación en Gmail para: ${emailAddress}`);
  console.log(`⏳ Tiempo máximo de espera: ${maxWaitTime / 1000} segundos`);
  console.log(`📅 Solo considerando emails recibidos en los últimos ${maxEmailAge / 1000} segundos (muy recientes)`);
  console.log(`⏳ Esperando a que llegue el correo...`);

  const code = await getVerificationCodeFromGmail(emailAddress, maxWaitTime, 5000, maxEmailAge);

  if (!code) {
    throw new Error(`❌ No se encontró el código de verificación en Gmail después de ${maxWaitTime / 1000} segundos. ` +
      `El correo no llegó o no fue recibido en los últimos ${maxEmailAge / 1000} segundos. ` +
      `Verifica que el correo haya sido enviado correctamente.`);
  }

  return code;
}

