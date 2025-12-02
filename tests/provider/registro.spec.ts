import { test, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  DEFAULT_BASE_URL,
  DEFAULT_ACCOUNT_PASSWORD,
  REGISTRATION_EMAIL_DEFAULT
} from '../config';
import { waitForVerificationCode } from '../utils/gmail-helper';

// Configurar viewport para que la página se muestre correctamente
test.use({
  viewport: { width: 1280, height: 720 }
});

// Aumentar timeout general del test para flujos con retos de seguridad
test.setTimeout(90000);

/**
 * Llenar un input de forma segura, esperando que esté visible y editable.
 */
export async function safeFill(page: Page, label: string, value: string, timeout = 10000) {
  const start = Date.now();
  
  while (true) {
    try {
      const input = page.getByLabel(label);
      await input.waitFor({ state: 'visible', timeout: 1000 });
      await input.fill(value);
      return;
    } catch (err) {
      if (Date.now() - start > timeout) {
        throw new Error(`safeFill: No se pudo llenar el input con label "${label}" en ${timeout}ms`);
      }
      await page.waitForTimeout(200);
    }
  }
}

/**
 * Función para hacer clic en el botón de registro, seleccionar "Proveedor" y continuar.
 */
export async function registerProvider(page: Page, email: string = REGISTRATION_EMAIL_DEFAULT) {
  // Paso 1: Hacer clic en el botón "Regístrate"
  const registerButton = page.locator('button[type="button"].font-bold.underline.text-primary-neutral').filter({
    hasText: 'Regístrate'
  });
  await registerButton.waitFor({ state: 'visible', timeout: 10000 });
  await registerButton.click();
  
  // Esperar a que aparezca la página de selección de tipo de usuario
  await page.waitForTimeout(2000);
  
  // Paso 2: Seleccionar "Proveedor"
  // Buscar el botón que contiene el texto "Proveedor" y tiene el ícono icon-briefcase
  const proveedorButton = page.locator('button[type="button"]').filter({
    has: page.locator('p.text-medium.font-extrabold').filter({ hasText: 'Proveedor' })
  }).filter({
    has: page.locator('i.icon-briefcase')
  });
  
  await proveedorButton.waitFor({ state: 'visible', timeout: 10000 });
  await proveedorButton.click();
  console.log('✓ Opción "Proveedor" seleccionada');
  
  // Esperar un momento para que se actualice el estado
  await page.waitForTimeout(500);
  
  // Paso 3: Hacer clic en el botón "Continuar"
  const continuarButton = page.locator('button').filter({
    hasText: 'Continuar'
  }).filter({
    has: page.locator('span.font-bold')
  });
  
  await continuarButton.waitFor({ state: 'visible', timeout: 10000 });
  await continuarButton.click();
  console.log('✓ Botón "Continuar" presionado');
  
  // Esperar a que aparezca el formulario de email
  await page.waitForTimeout(2000);
  
  // Paso 4: Ingresar el email
  const emailInput = page.locator('input[id="Email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);
  console.log(`✓ Email ingresado: ${email}`);
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 5: Hacer clic en el botón "Siguiente"
  const siguienteButton = page.locator('button[type="submit"][form="RegisterEmailForm"]').filter({
    hasText: 'Siguiente'
  });
  
  await siguienteButton.waitFor({ state: 'visible', timeout: 10000 });
  await siguienteButton.click();
  console.log('✓ Botón "Siguiente" presionado');
  
  // Esperar a que aparezca la página de código de verificación
  await page.waitForTimeout(2000);
  
  // Verificar si estamos en la página de código de verificación
  // Verificamos si el primer input de código está presente y visible
  const firstCodeInput = page.locator('input[id="VerificationCode_0"]');
  const isOnVerificationPage = await firstCodeInput.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isOnVerificationPage) {
    // Obtener el código de verificación automáticamente desde Gmail
    console.log('\n📧 Obteniendo código de verificación desde Gmail...');
    console.log(`   Email: ${email}`);
    
    try {
      // Obtener el código de verificación desde Gmail (timeout: 2 minutos)
      const verificationCode = await waitForVerificationCode(email, 120000);
      
      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error(`Código de verificación inválido: ${verificationCode}`);
      }
      
      console.log(`✅ Código de verificación obtenido: ${verificationCode}`);
      
      // Ingresar el código automáticamente en los campos
      const codeDigits = verificationCode.split('');
      for (let i = 0; i < 6; i++) {
        const codeInput = page.locator(`input[id="VerificationCode_${i}"]`);
        await codeInput.waitFor({ state: 'visible', timeout: 10000 });
        await codeInput.fill(codeDigits[i]);
        await page.waitForTimeout(200); // Pequeña pausa entre dígitos
      }
      
      console.log('✓ Código de verificación ingresado automáticamente en todos los campos');
      
      // Esperar un momento para que se procese el código
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('\n❌ ERROR: No se pudo obtener el código de verificación desde Gmail');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('   La prueba fallará porque no se puede continuar sin el código.');
      throw new Error(`❌ FALLO: No se pudo obtener el código de verificación desde Gmail. ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('⚠️  No se detectó la página de código de verificación. Asumiendo que ya se ingresó el código.');
  }
  
  // Obtener el input de contraseña y esperar a que esté visible
  const passwordInput = page.locator('input[id="Password"]');
  
  // Verificación final: asegurarnos de que el formulario de contraseña está visible
  // Esto confirma que el código fue ingresado y validado correctamente
  try {
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Formulario de contraseña visible. El código de verificación fue validado correctamente.');
  } catch (timeoutError) {
    // Verificar si todavía estamos en la página de código de verificación
    const verificationPageIndicators = [
      page.locator('text=/código.*verificación|verificación.*código/i'),
      page.locator('input[placeholder*="código" i]'),
      page.locator('input[placeholder*="code" i]'),
      page.locator('input[placeholder*="verificación" i]')
    ];
    
    let stillOnVerificationPage = false;
    for (const indicator of verificationPageIndicators) {
      const isVisible = await indicator.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        stillOnVerificationPage = true;
        break;
      }
    }
    
    // La prueba FALLA si el código no fue ingresado
    if (stillOnVerificationPage) {
      console.error('\n❌ ERROR CRÍTICO: El código de verificación NO fue ingresado.');
      console.error('   La prueba permanece en la página de código de verificación.');
      console.error('   La prueba FALLA porque no se puede continuar sin el código.');
      throw new Error('❌ FALLO: Código de verificación no ingresado. La prueba no puede continuar sin el código de verificación.');
    } else {
      // Si no estamos en la página de verificación pero tampoco vemos el formulario de contraseña,
      // algo salió mal
      console.error('\n❌ ERROR CRÍTICO: Timeout esperando el formulario de contraseña.');
      console.error('   No se pudo detectar que el código fue ingresado correctamente.');
      console.error('   La prueba FALLA porque no se puede continuar.');
      throw new Error('❌ FALLO: Timeout esperando código de verificación. El código no fue ingresado o validado correctamente.');
    }
  }
  
  // Verificación adicional: asegurarnos de que realmente avanzamos a la página de contraseña
  // Si no está visible, la prueba debe fallar
  const isPasswordInputVisible = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (!isPasswordInputVisible) {
    throw new Error('❌ FALLO: El formulario de contraseña no está visible. El código de verificación puede no haber sido validado correctamente.');
  }
  
  // Esperar un momento adicional para asegurar que la página se haya actualizado
  await page.waitForTimeout(2000);
  
  // Paso 6: Ingresar la contraseña
  // passwordInput ya está declarado arriba y ya esperamos a que esté visible
  await passwordInput.fill(DEFAULT_ACCOUNT_PASSWORD);
  console.log('✓ Contraseña ingresada');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 7: Confirmar la contraseña
  const repeatPasswordInput = page.locator('input[id="RepeatPassword"]');
  await repeatPasswordInput.waitFor({ state: 'visible', timeout: 10000 });
  await repeatPasswordInput.fill(DEFAULT_ACCOUNT_PASSWORD);
  console.log('✓ Contraseña confirmada');
  
  // Esperar un momento para que se validen los requisitos de contraseña
  await page.waitForTimeout(1000);
  
  // Paso 8: Hacer clic en el botón "Siguiente" del formulario de contraseña
  const siguientePasswordButton = page.locator('button[type="submit"][form="CreatePasswordForm"]').filter({
    hasText: 'Siguiente'
  });
  
  await siguientePasswordButton.waitFor({ state: 'visible', timeout: 10000 });
  await siguientePasswordButton.click();
  console.log('✓ Botón "Siguiente" del formulario de contraseña presionado');
  
  // Esperar a que aparezca el siguiente formulario (Step 4: Datos del negocio)
  await page.waitForTimeout(2000);
  
  // Paso 9: Verificar que estamos en el formulario de datos del negocio (Step_4)
  const businessNameInput = page.locator('input[id="BusinessName"]');
  const isBusinessFormVisible = await businessNameInput.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (isBusinessFormVisible) {
    console.log('✓ Formulario de datos del negocio detectado');
    
    // Paso 9.0: Agregar foto de perfil (opcional pero lo probamos)
    const profilePictureInput = page.locator('input[id="UserProfilePicture"]');
    const isProfilePictureVisible = await profilePictureInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isProfilePictureVisible) {
      try {
        // Intentar usar profile.png si existe, si no, usar infantil.jpg como alternativa
        const profilePath = path.join(__dirname, '../profile.png');
        const alternativePath = path.join(__dirname, '../infantil.jpg');
        
        let filePath: string = '';
        if (fs.existsSync(profilePath)) {
          filePath = profilePath;
        } else if (fs.existsSync(alternativePath)) {
          filePath = alternativePath;
        } else {
          // No se encontró imagen de prueba, continuar sin foto
        }
        
        if (filePath) {
          await profilePictureInput.setInputFiles(filePath);
          console.log(`✓ Foto de perfil agregada: ${path.basename(filePath)}`);
          await page.waitForTimeout(1000); // Esperar a que se procese la imagen
        }
      } catch (error) {
        // Error al agregar foto, continuar sin foto (es opcional)
      }
    }
    
    // Paso 9.1: Ingresar nombre del negocio
    await businessNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await businessNameInput.fill('Fiestas Carlos');
    console.log('✓ Nombre del negocio ingresado: Fiestas Carlos');
    
    await page.waitForTimeout(500);
    
    // Paso 9.2: Ingresar dirección del negocio y seleccionar de la lista
    // IMPORTANTE: El campo de dirección NO tiene id="BusinessAddress", solo el label tiene for="BusinessAddress"
    // El campo tiene data-gtm-form-interact-field-id="16" y está dentro del formulario BusinessDataForm
    let businessAddressInput: ReturnType<typeof page.locator>;
    let isAddressVisible = false;
    
    // Estrategia 1: Buscar por el atributo data-gtm-form-interact-field-id="16" (más específico y único)
    businessAddressInput = page.locator('input[data-gtm-form-interact-field-id="16"]');
    isAddressVisible = await businessAddressInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isAddressVisible) {
      // Estrategia 2: Buscar el input asociado al label con for="BusinessAddress"
      // El label y el input están en el mismo div contenedor
      const addressLabel = page.locator('label[for="BusinessAddress"]');
      const labelExists = await addressLabel.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (labelExists) {
        // Buscar el input que está en el mismo div contenedor que el label
        // El label está dentro de un div, y el input está en el mismo nivel o dentro del mismo div padre
        businessAddressInput = addressLabel.locator('..').locator('input').first();
        isAddressVisible = await businessAddressInput.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (!isAddressVisible) {
          // Intentar buscar el input que está después del label en el mismo contenedor padre
          businessAddressInput = addressLabel.locator('..').locator('..').locator('input').filter({
            hasNot: page.locator('[id="BusinessName"]')
          }).first();
          isAddressVisible = await businessAddressInput.isVisible({ timeout: 2000 }).catch(() => false);
        }
      }
    }
    
    if (!isAddressVisible) {
      // Estrategia 3: Buscar dentro del formulario BusinessDataForm, excluyendo el campo BusinessName
      // Buscar inputs que NO tengan id="BusinessName"
      businessAddressInput = page.locator('form[id="BusinessDataForm"]').locator('input').filter({
        hasNot: page.locator('[id="BusinessName"]')
      }).first();
      isAddressVisible = await businessAddressInput.isVisible({ timeout: 2000 }).catch(() => false);
    }
    
    if (isAddressVisible) {
      await businessAddressInput.waitFor({ state: 'visible', timeout: 10000 });
      
      // Verificación crítica: asegurarse de que NO es el campo de nombre del negocio
      const inputId = await businessAddressInput.getAttribute('id').catch(() => null);
      const valorActual = await businessAddressInput.inputValue().catch(() => '');
      
      // Verificar que no es el campo de nombre del negocio
      if (inputId === 'BusinessName' || valorActual === 'Fiestas Carlos') {
        // Buscar el campo correcto: el que tiene data-gtm-form-interact-field-id="16"
        businessAddressInput = page.locator('input[data-gtm-form-interact-field-id="16"]');
        const correctoVisible = await businessAddressInput.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (!correctoVisible) {
          // Último recurso: buscar el segundo input del formulario (después de BusinessName)
          const todosLosInputs = page.locator('form[id="BusinessDataForm"]').locator('input');
          const cantidadInputs = await todosLosInputs.count();
          
          if (cantidadInputs >= 2) {
            businessAddressInput = todosLosInputs.nth(1);
            const segundoInputVisible = await businessAddressInput.isVisible({ timeout: 2000 }).catch(() => false);
            if (!segundoInputVisible) {
              throw new Error('❌ FALLO: No se pudo encontrar el campo de dirección correcto después de múltiples intentos');
            }
          } else {
            throw new Error('❌ FALLO: No se encontraron suficientes inputs en el formulario para identificar el campo de dirección');
          }
        }
      }
      
      // Escribir una dirección para que aparezcan las sugerencias de Google
      const direccionEscrita = 'Av. Insurgentes Sur 1647, Ciudad de México';
      await businessAddressInput.fill(direccionEscrita);
      console.log(`✓ Dirección escrita: "${direccionEscrita}"`);
      console.log('⏳ Esperando sugerencias de Google Places...');
      
      // Esperar a que aparezcan las opciones de Google Places (intentar hasta 5 veces)
      let opcionesVisible = false;
      let todasLasOpciones = page.locator('ul li.cursor-pointer');
      
      for (let intento = 1; intento <= 5; intento++) {
        await page.waitForTimeout(2000); // Esperar a que aparezcan las sugerencias
        
        opcionesVisible = await todasLasOpciones.first().isVisible({ timeout: 3000 }).catch(() => false);
        
        if (opcionesVisible) {
          break;
        }
      }
      
      if (!opcionesVisible) {
        throw new Error('❌ FALLO: No aparecieron opciones de dirección de Google Places. La prueba no puede continuar sin seleccionar una dirección válida.');
      }
      
      // Obtener todas las opciones disponibles
      const cantidadOpciones = await todasLasOpciones.count();
      
      if (cantidadOpciones === 0) {
        throw new Error('❌ FALLO: No se encontraron opciones de dirección para seleccionar. La prueba no puede continuar sin seleccionar una dirección válida.');
      }
      
      // Seleccionar la primera opción
      const primeraOpcion = todasLasOpciones.first();
      const textoOpcion = await primeraOpcion.textContent();
      
      // Guardar el valor antes de hacer clic para verificar que cambió
      const valorAntes = await businessAddressInput.inputValue();
      
      await primeraOpcion.click();
      await page.waitForTimeout(2000);
      
      // Verificar que la dirección cambió después de seleccionar
      const valorDespues = await businessAddressInput.inputValue();
      
      if (valorDespues === valorAntes || valorDespues === direccionEscrita) {
        // Intentar hacer clic nuevamente o verificar si hay algún error
        await page.waitForTimeout(1000);
        const valorFinal = await businessAddressInput.inputValue();
        if (valorFinal === direccionEscrita || valorFinal === valorAntes) {
          throw new Error(`❌ FALLO: La dirección no se seleccionó correctamente. Valor final: "${valorFinal}". La prueba no puede continuar sin una dirección válida seleccionada.`);
        }
      }
      
      console.log(`✓ Dirección seleccionada: "${textoOpcion?.trim()}"`);
    } else {
      throw new Error('❌ FALLO: Campo de dirección no encontrado. La prueba no puede continuar sin este campo.');
    }
    
    // Paso 9.3: Hacer clic en "Siguiente" del formulario de datos del negocio
    const siguienteBusinessButton = page.locator('button[type="submit"][form="BusinessDataForm"]').filter({
      hasText: 'Siguiente'
    });
    await siguienteBusinessButton.waitFor({ state: 'visible', timeout: 10000 });
    await siguienteBusinessButton.click();
    console.log('✓ Botón "Siguiente" del formulario de datos del negocio presionado');
    
    // Esperar a que aparezca el formulario de datos de contacto
    await page.waitForTimeout(2000);
  }
  
  // Paso 10: Ingresar el nombre (en el formulario de datos de contacto - Step_5)
  const nameInput = page.locator('input[id="Name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill('Carlos');
  console.log('✓ Nombre ingresado: Carlos');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 11: Ingresar el apellido
  const lastNameInput = page.locator('input[id="LastName"]');
  await lastNameInput.waitFor({ state: 'visible', timeout: 10000 });
  await lastNameInput.fill('González');
  console.log('✓ Apellido ingresado: González');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 12: Ingresar el número de teléfono personal
  const personalPhoneInput = page.locator('input[id="PersonalPhoneNumber"]');
  await personalPhoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await personalPhoneInput.fill('5559876543');
  console.log('✓ Teléfono personal ingresado: 5559876543');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 13: Ingresar el teléfono del negocio (opcional pero lo llenamos)
  const landlineInput = page.locator('input[id="Landline"]');
  const isLandlineVisible = await landlineInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLandlineVisible) {
    await landlineInput.fill('5551234567');
    console.log('✓ Teléfono del negocio ingresado: 5551234567');
    await page.waitForTimeout(500);
  }
  
  // Paso 14: Hacer clic en el botón "Siguiente" del formulario de datos de contacto
  const siguienteContactButton = page.locator('button[type="submit"][form="BusinessContactDataForm"]').filter({
    hasText: 'Siguiente'
  });
  const isSiguienteVisible = await siguienteContactButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (isSiguienteVisible) {
    await siguienteContactButton.waitFor({ state: 'visible', timeout: 10000 });
    await siguienteContactButton.click();
    console.log('✓ Botón "Siguiente" del formulario de datos de contacto presionado');
    await page.waitForTimeout(2000);
  }
  
  // Paso 15: Llenar aleatoriamente campos del formulario de presencia digital (Step_6)
  const businessRFCInput = page.locator('input[id="BusinessRFC"]');
  const facebookInput = page.locator('input[id="Facebook"]');
  const instagramInput = page.locator('input[id="Instagram"]');
  const tiktokInput = page.locator('input[id="Tiktok"]');
  const websiteInput = page.locator('input[id="WebSite"]');
  
  // Verificar que estamos en el formulario de presencia digital
  const isSocialFormVisible = await businessRFCInput.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (isSocialFormVisible) {
    console.log('✓ Formulario de presencia digital detectado');
    
    // Generar valores aleatorios para los campos
    const camposParaLlenar: Array<{ input: typeof businessRFCInput, valor: string, nombre: string }> = [];
    
    // RFC (opcional) - 50% de probabilidad de llenarlo
    if (Math.random() > 0.5) {
      const rfc = `ABC${Math.floor(Math.random() * 90000000000) + 10000000000}`.substring(0, 13);
      camposParaLlenar.push({ input: businessRFCInput, valor: rfc, nombre: 'RFC' });
    }
    
    // Facebook - 70% de probabilidad
    if (Math.random() > 0.3) {
      const facebookUsernames = ['fiestas.carlos', 'carlos.fiestas', 'fiestas.mx', 'eventos.carlos'];
      camposParaLlenar.push({ 
        input: facebookInput, 
        valor: `https://facebook.com/${facebookUsernames[Math.floor(Math.random() * facebookUsernames.length)]}`, 
        nombre: 'Facebook' 
      });
    }
    
    // Instagram - 80% de probabilidad
    if (Math.random() > 0.2) {
      const instagramUsernames = ['fiestas_carlos', 'carlos_fiestas', 'fiestas_mx', 'eventos_carlos'];
      camposParaLlenar.push({ 
        input: instagramInput, 
        valor: `https://instagram.com/${instagramUsernames[Math.floor(Math.random() * instagramUsernames.length)]}`, 
        nombre: 'Instagram' 
      });
    }
    
    // TikTok - 60% de probabilidad
    if (Math.random() > 0.4) {
      const tiktokUsernames = ['@fiestascarlos', '@carlosfiestas', '@fiestasmx', '@eventoscarlos'];
      camposParaLlenar.push({ 
        input: tiktokInput, 
        valor: `https://tiktok.com/${tiktokUsernames[Math.floor(Math.random() * tiktokUsernames.length)]}`, 
        nombre: 'TikTok' 
      });
    }
    
    // Sitio web - 70% de probabilidad
    if (Math.random() > 0.3) {
      const websites = ['https://fiestascarlos.com', 'https://www.fiestascarlos.mx', 'https://carlosfiestas.com.mx'];
      camposParaLlenar.push({ 
        input: websiteInput, 
        valor: websites[Math.floor(Math.random() * websites.length)], 
        nombre: 'Sitio web' 
      });
    }
    
    // Llenar los campos seleccionados aleatoriamente
    for (const campo of camposParaLlenar) {
      try {
        await campo.input.waitFor({ state: 'visible', timeout: 5000 });
        await campo.input.fill(campo.valor);
        console.log(`✓ ${campo.nombre} ingresado: ${campo.valor}`);
        await page.waitForTimeout(300);
      } catch (error) {
        // Silenciar errores al llenar campos opcionales
      }
    }
    
    await page.waitForTimeout(500);
  } else {
    // Formulario de presencia digital no encontrado
  }
  
  // Paso 16: Presionar el botón "Finalizar"
  // Esperar un momento adicional para que el formulario se procese completamente
  await page.waitForTimeout(1500);
  
  // El botón está fuera del formulario pero tiene form="BusinessSocialPresenceForm"
  // Intentar múltiples estrategias para encontrar el botón
  
  // Estrategia 1: Buscar por atributo form (más específico)
  let finalizarButton = page.locator('button[type="submit"][form="BusinessSocialPresenceForm"]');
  let isButtonVisible = await finalizarButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isButtonVisible) {
    // Estrategia 2: Buscar solo por form sin type
    finalizarButton = page.locator('button[form="BusinessSocialPresenceForm"]');
    isButtonVisible = await finalizarButton.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  if (!isButtonVisible) {
    // Estrategia 3: Buscar por texto usando getByRole
    finalizarButton = page.getByRole('button', { name: 'Finalizar' });
    isButtonVisible = await finalizarButton.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  if (!isButtonVisible) {
    // Estrategia 4: Buscar por texto dentro del span
    finalizarButton = page.locator('button').filter({
      has: page.locator('span:has-text("Finalizar")')
    });
    isButtonVisible = await finalizarButton.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  if (!isButtonVisible) {
    // Estrategia 5: Hacer scroll hacia abajo y buscar nuevamente
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    finalizarButton = page.locator('button[type="submit"][form="BusinessSocialPresenceForm"]');
    isButtonVisible = await finalizarButton.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  if (isButtonVisible) {
    await finalizarButton.waitFor({ state: 'visible', timeout: 10000 });
    await finalizarButton.click();
    console.log('✓ Botón "Finalizar" presionado');
  } else {
    throw new Error('❌ No se pudo encontrar el botón "Finalizar" después de intentar múltiples estrategias');
  }
}

/**
 * Test de registro de nuevo usuario como Proveedor
 */
test('Registrar nuevo Proveedor', async ({ page }) => {
  // Navegar a la página de registro
  await page.goto(`${DEFAULT_BASE_URL}/login`);
  
  // Ejecutar el flujo de registro como proveedor
  await registerProvider(page);
  
  // Aquí puedes agregar más validaciones según sea necesario
  // Por ejemplo, verificar que se haya completado el registro exitosamente
});
