import { test, Page } from '@playwright/test';
import {
  DEFAULT_BASE_URL,
  DEFAULT_ACCOUNT_PASSWORD,
  REGISTRATION_EMAIL_DEFAULT
} from '../config';

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
    // Esperar a que el usuario ingrese el código de verificación
    console.log('\n⏸️  Por favor ingresa el código de verificación');
    console.log('   El test esperará hasta que detecte que el último dígito del código fue ingresado.\n');
    
    // Localizar el último input de código de verificación (VerificationCode_5)
    const lastCodeInput = page.locator('input[id="VerificationCode_5"]');
    
    // Esperar hasta que el último input tenga un valor numérico
    const maxWaitTime = 300000; // 5 minutos
    const checkInterval = 20000; // Verificar cada 2 segundos (menos intrusivo)
    const startTime = Date.now();
    let codeEntered = false;
    let lastStatusMessage = Date.now();
    
    console.log('   Esperando a que se ingrese el código de verificación...\n');
    console.log('   Puedes ingresar el código ahora. El test verificará cada 2 segundos.\n');
    
    // Bucle que espera hasta que el último input tenga un valor
    while (Date.now() - startTime < maxWaitTime && !codeEntered) {
      try {
        // Verificar que el input existe y está visible
        const isInputVisible = await lastCodeInput.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (isInputVisible) {
          // Usar getAttribute('value') en lugar de inputValue() para ser menos intrusivo
          // Esto evita interferir con la entrada del usuario
          const inputValue = await lastCodeInput.getAttribute('value').catch(() => '') || '';
          
          // Verificar si el valor es un número (no vacío y es un dígito)
          if (inputValue && /^\d$/.test(inputValue.trim())) {
            codeEntered = true;
            console.log('\n✓ Código de verificación ingresado completamente. Continuando...\n');
            break;
          }
        }
        
        // Mostrar mensaje de espera cada 10 segundos
        if (Date.now() - lastStatusMessage > 10000) {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          console.log(`   ⏳ Esperando código de verificación... (${elapsedSeconds}s transcurridos)`);
          lastStatusMessage = Date.now();
        }
      } catch (error) {
        // Si hay un error, continuar esperando sin mostrar mensaje para no interferir
      }
      
      // Esperar antes de verificar nuevamente (intervalo más largo para no interferir)
      await page.waitForTimeout(checkInterval);
    }
    
    // Si después del bucle no se ingresó el código, fallar
    if (!codeEntered) {
      // Verificar si el input todavía está vacío (usar getAttribute para ser menos intrusivo)
      const lastInputValue = await lastCodeInput.getAttribute('value').catch(() => '') || '';
      const isInputEmpty = !lastInputValue || !/^\d$/.test(lastInputValue.trim());
      
      if (isInputEmpty) {
        console.error('\n❌ ERROR CRÍTICO: El código de verificación NO fue ingresado completamente.');
        console.error('   El último dígito del código no tiene un valor numérico.');
        console.error('   La prueba FALLA porque no se puede continuar sin el código completo.');
        throw new Error('❌ FALLO: Código de verificación no ingresado completamente. El último dígito no tiene un valor numérico.');
      } else {
        console.error('\n❌ ERROR CRÍTICO: Timeout esperando el código de verificación.');
        console.error('   No se pudo detectar que el código fue ingresado correctamente.');
        console.error('   La prueba FALLA porque no se puede continuar.');
        throw new Error('❌ FALLO: Timeout esperando código de verificación. El código no fue ingresado o validado correctamente.');
      }
    }
    
    // Esperar un momento para que se procese el código
    await page.waitForTimeout(2000);
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
  
  // Esperar a que aparezca el formulario de datos personales
  await page.waitForTimeout(2000);
  
  // Paso 9: Ingresar el nombre
  const nameInput = page.locator('input[id="Name"]');
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill('Carlos');
  console.log('✓ Nombre ingresado: Carlos');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 10: Ingresar el apellido
  const lastNameInput = page.locator('input[id="LastName"]');
  await lastNameInput.waitFor({ state: 'visible', timeout: 10000 });
  await lastNameInput.fill('González');
  console.log('✓ Apellido ingresado: González');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 11: Ingresar el número de teléfono
  const phoneInput = page.locator('input[id="PhoneNumber"]');
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill('5559876543');
  console.log('✓ Teléfono ingresado: 5559876543');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 11.1: Esperar a que se complete la verificación de Cloudflare Turnstile
  console.log('⏳ Esperando a que se complete la verificación de Cloudflare Turnstile...');
  
  try {
    // Verificar si aparece el mensaje de verificación humana
    const humanCheckMsg = page.getByText('Por favor verifica que eres humano', { exact: false });
    const humanCheckVisible = await humanCheckMsg.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (humanCheckVisible) {
      console.log('⚠ Mensaje de verificación humana detectado, esperando a que se complete...');
      
      // Esperar a que el mensaje desaparezca o que aparezca "Success!" del Turnstile
      await humanCheckMsg.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {
        console.log('⚠ El mensaje de verificación no desapareció en 60 segundos');
      });
      
      // Esperar a que aparezca "Success!" en el widget Turnstile
      const successText = page.locator('#success-text');
      const successVisible = await successText.waitFor({ state: 'visible', timeout: 60000 }).catch(() => false);
      
      if (successVisible) {
        console.log('✓ Verificación completada exitosamente (Success! visible)');
      } else {
        console.log('⚠ No se pudo confirmar la verificación, pero continuando...');
      }
    } else {
      // Si no hay mensaje de verificación, esperar directamente a que aparezca "Success!"
      console.log('✓ No hay mensaje de verificación, verificando estado del Turnstile...');
      const successText = page.locator('#success-text');
      const successVisible = await successText.waitFor({ state: 'visible', timeout: 10000 }).catch(() => false);
      
      if (successVisible) {
        console.log('✓ Turnstile ya está validado (Success! visible)');
      } else {
        console.log('ℹ Turnstile aún no validado, continuando de todos modos');
      }
    }
  } catch (e) {
    console.log('⚠ Error al esperar validación Turnstile, continuando:', e);
  }
  
  // Dar un momento adicional después de la verificación
  await page.waitForTimeout(1000);

  // Paso 12: Hacer clic en el botón "Finalizar"
  const finalizarButton = page.locator('button[type="submit"][form="RegisterPersonalDataForm"]').filter({
    hasText: 'Finalizar'
  });
  
  await finalizarButton.waitFor({ state: 'visible', timeout: 10000 });
  await finalizarButton.click();
  console.log('✓ Botón "Finalizar" presionado');
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
