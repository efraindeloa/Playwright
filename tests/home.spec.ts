import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 1280, height: 720 },
});

test('Registrar como proveedor', async ({ page }) => {
  // 1. Abrir página
  await page.goto('https://staging.fiestamas.com/');

  // 2. Abrir login/registro
  await page.locator('button:has(i.icon-user)').click();
  await expect(page.getByText('Inicia Sesión')).toBeVisible();

  // 3. Iniciar registro
  await page.locator('button:has-text("Regístrate")').click();

  // 4. Seleccionar tipo proveedor
  const proveedorButton = page.locator('button:has-text("Proveedor")');
  await expect(proveedorButton).toBeVisible();
  await proveedorButton.click();

  // 5. Ingresar email
  const emailInput = page.locator('#Email');
  await expect(emailInput).toBeVisible();
  await emailInput.fill('fiestamasqa+4@gmail.com');

  // 6. Click continuar
  const continueButton = page.locator('button:has-text("Continuar")');
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  // 7. Validar página de código de verificación
  await expect(page.getByText('Ingresa tu código de verificación')).toBeVisible({ timeout: 10000 });
  
  // 8. Ingresar código de verificación estático
  const verificationCode = '123456';
  
  // Ingresar el código en los campos
  for (let i = 0; i < 6; i++) {
    const input = page.locator(`#VerificationCode_${i}`);
    await input.fill(verificationCode[i]);
  }

  // 9. Continuar automáticamente después del último dígito
  await page.locator('button:has-text("Verificar")').click();

  // 10. Validar que se redirige al dashboard (o página siguiente)
  await expect(page).toHaveURL(/.*dashboard/);
});
