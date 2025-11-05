import { test, Page, expect } from '@playwright/test';

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
 * Función para hacer clic en el botón de registro, seleccionar "Cliente" y continuar.
 */
export async function register(page: Page) {
  // Paso 1: Hacer clic en el botón "Regístrate"
  const registerButton = page.locator('button[type="button"].font-bold.underline.text-primary-neutral').filter({
    hasText: 'Regístrate'
  });
  await registerButton.waitFor({ state: 'visible', timeout: 10000 });
  await registerButton.click();
  
  // Esperar a que aparezca la página de selección de tipo de usuario
  await page.waitForTimeout(2000);
  
  // Paso 2: Seleccionar "Cliente"
  // Buscar el botón que contiene el texto "Cliente" y tiene el ícono icon-smile
  const clienteButton = page.locator('button[type="button"]').filter({
    has: page.locator('p.text-medium.font-extrabold').filter({ hasText: 'Cliente' })
  }).filter({
    has: page.locator('i.icon-smile')
  });
  
  await clienteButton.waitFor({ state: 'visible', timeout: 10000 });
  await clienteButton.click();
  console.log('✓ Opción "Cliente" seleccionada');
  
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
  await emailInput.fill('fiestamasqa+11@gmail.com');
  console.log('✓ Email ingresado: fiestamasqa+10@gmail.com');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 5: Hacer clic en el botón "Siguiente"
  const siguienteButton = page.locator('button[type="submit"][form="RegisterEmailForm"]').filter({
    hasText: 'Siguiente'
  });
  
  await siguienteButton.waitFor({ state: 'visible', timeout: 10000 });
  await siguienteButton.click();
  console.log('✓ Botón "Siguiente" presionado');
  
  // Esperar a que aparezca el formulario de contraseña
  await page.waitForTimeout(2000);
  
  // Paso 6: Ingresar la contraseña
  const passwordInput = page.locator('input[id="Password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill('Fiesta2025$');
  console.log('✓ Contraseña ingresada');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 7: Confirmar la contraseña
  const repeatPasswordInput = page.locator('input[id="RepeatPassword"]');
  await repeatPasswordInput.waitFor({ state: 'visible', timeout: 10000 });
  await repeatPasswordInput.fill('Fiesta2025$');
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
  await nameInput.fill('Juan');
  console.log('✓ Nombre ingresado: Juan');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 10: Ingresar el apellido
  const lastNameInput = page.locator('input[id="LastName"]');
  await lastNameInput.waitFor({ state: 'visible', timeout: 10000 });
  await lastNameInput.fill('Pérez');
  console.log('✓ Apellido ingresado: Pérez');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 11: Ingresar el número de teléfono
  const phoneInput = page.locator('input[id="PhoneNumber"]');
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill('5551234567');
  console.log('✓ Teléfono ingresado: 5551234567');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(1000);
  
  // Paso 11.1: Esperar a que se complete la verificación de Cloudflare Turnstile
  console.log('⏳ Esperando a que se complete la verificación de Cloudflare Turnstile...');
  
  try {
    // Verificar si aparece el mensaje de verificación humana
    const humanCheckMsg = page.getByText('Por favor verifica que eres humano', { exact: false });
    const humanCheckVisible = await humanCheckMsg.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (humanCheckVisible) {
      console.log('⚠ Mensaje de verificación humana detectado, esperando a que se complete...');
      
      // Esperar a que el mensaje desaparezca o que aparezca "Success!" del Turnstile
      // Opción 1: Esperar a que desaparezca el mensaje de verificación
      await humanCheckMsg.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {
        console.log('⚠ El mensaje de verificación no desapareció en 60 segundos');
      });
      
      // Opción 2: Esperar a que aparezca "Success!" en el widget Turnstile
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

  // Esperar y tomar screenshot de la última pantalla
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'registro-final.png', fullPage: true });
  console.log('📸 Screenshot guardado: registro-final.png');
}

/**
 * Función para hacer clic en el botón de registro, seleccionar "Proveedor" y continuar.
 */
export async function registerProvider(page: Page, email: string = 'fiestamasqa+12@gmail.com') {
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
  
  // Esperar a que aparezca el formulario de contraseña
  await page.waitForTimeout(2000);
  
  // Paso 6: Ingresar la contraseña
  const passwordInput = page.locator('input[id="Password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill('Fiesta2025$');
  console.log('✓ Contraseña ingresada');
  
  // Esperar un momento para que el formulario se actualice
  await page.waitForTimeout(500);
  
  // Paso 7: Confirmar la contraseña
  const repeatPasswordInput = page.locator('input[id="RepeatPassword"]');
  await repeatPasswordInput.waitFor({ state: 'visible', timeout: 10000 });
  await repeatPasswordInput.fill('Fiesta2025$');
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
  await page.waitForTimeout(1000);
  
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

  // Esperar y tomar screenshot de la última pantalla
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'registro-proveedor-final.png', fullPage: true });
  console.log('📸 Screenshot guardado: registro-proveedor-final.png');
}

/**
 * Test de registro de nuevo usuario como Cliente
 */
test('Registrar nuevo Cliente', async ({ page }) => {
  // Navegar a la página principal
  await page.goto('https://staging.fiestamas.com/login');
  
  // Ejecutar el flujo de registro
  await register(page);
  
  // Aquí puedes agregar más validaciones según sea necesario
  // Por ejemplo, verificar que se haya avanzado al siguiente paso
});

/**
 * Test de registro de nuevo usuario como Proveedor
 */
test('Registrar nuevo Proveedor', async ({ page }) => {
  // Navegar a la página de registro
  await page.goto('https://staging.fiestamas.com/login');
  
  // Ejecutar el flujo de registro como proveedor
  await registerProvider(page);
  
  // Aquí puedes agregar más validaciones según sea necesario
  // Por ejemplo, verificar que se haya completado el registro exitosamente
});
