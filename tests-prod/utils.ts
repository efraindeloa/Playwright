import { Page, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from './config';

export async function safeFill(page: Page, label: string, value: string, timeout = 12000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const input = page.getByLabel(label, { exact: false });
      await input.waitFor({ state: 'visible', timeout: 1000 });
      await input.fill(value);
      return;
    } catch {
      await page.waitForTimeout(200);
    }
  }

  throw new Error(`safeFill: No se pudo llenar el input con label "${label}" en ${timeout}ms`);
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(DEFAULT_BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();

  await page.waitForTimeout(500);

  await safeFill(page, 'Correo', email);
  await safeFill(page, 'Contraseña', password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/dashboard/i);
  await page.waitForTimeout(1500);
}

export function uniqueSuffix(prefix: string) {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}


