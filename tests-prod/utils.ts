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

// Función para mostrar mensajes explicativos durante la ejecución de pruebas
export async function showStepMessage(page: Page, message: string) {
  await page.evaluate((msg) => {
    let box = document.getElementById('__playwright_step_overlay');
    if (!box) {
      box = document.createElement('div');
      box.id = '__playwright_step_overlay';
      box.style.position = 'fixed';
      box.style.top = '50%';
      box.style.left = '50%';
      box.style.transform = 'translate(-50%, -50%)';
      box.style.zIndex = '999999';
      box.style.padding = '15px 25px';
      box.style.background = 'rgba(243, 130, 246, 0.9)';
      box.style.color = 'white';
      box.style.fontSize = '24px';
      box.style.borderRadius = '12px';
      box.style.fontFamily = 'monospace';
      box.style.fontWeight = 'bold';
      box.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      box.style.textAlign = 'center';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    
    // Auto-eliminar después de 2 segundos
    setTimeout(() => {
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    }, 2000);
  }, message);
}

// Función para limpiar el mensaje de paso
export async function clearStepMessage(page: Page) {
  await page.evaluate(() => {
    const box = document.getElementById('__playwright_step_overlay');
    if (box && box.parentNode) {
      box.parentNode.removeChild(box);
    }
  });
}

