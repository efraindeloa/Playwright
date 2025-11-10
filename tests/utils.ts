import { Page, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from './config';

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
 * Login completo: navega a la página, abre el formulario de login, llena los campos y valida el acceso.
 */
export async function login(page: Page, email: string, password: string) {
  // --- HOME ---
  await page.goto(DEFAULT_BASE_URL);
  await page.waitForTimeout(2000);

  // --- LOGIN ---
  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();
  
  // Screenshot de la página de login
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'login02-login.png', fullPage: true });
  
  // Llenar campos y hacer login
  await safeFill(page, 'Correo', email);
  await safeFill(page, 'Contraseña', password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  
  // Validar que se redirigió al dashboard
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(2000);
}
