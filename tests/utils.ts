import { Page } from '@playwright/test';

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
 * Login seguro usando los campos de correo y contraseña.
 */
export async function login(page: Page, email: string, password: string) {
  await safeFill(page, 'Correo', email);
  await safeFill(page, 'Contraseña', password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}
