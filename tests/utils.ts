import { Page, chromium, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_BASE_URL } from './config';

/**
 * Llenar un input de forma segura, esperando que esté visible y editable.
 */
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

/**
 * Login completo: navega a la página, abre el formulario de login, llena los campos y valida el acceso.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(DEFAULT_BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();

  await page.waitForTimeout(500);

  await safeFill(page, 'Correo', email);
  await safeFill(page, 'Contraseña', password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

export async function extractDOMToJSON(page: Page, outputPath: string = 'dom.json') {
  const dom = await page.evaluate(() => {
    return {
      html: document.documentElement.outerHTML,
      url: window.location.href,
      title: document.title
    };
  });
  
  fs.writeFileSync(outputPath, JSON.stringify(dom, null, 2));
  console.log(`DOM extraído y guardado en: ${outputPath}`);
}

/**
 * Guarda el estado de la sesión (cookies, localStorage, etc.) en un archivo JSON.
 * Útil para reutilizar sesiones autenticadas en otros tests.
 * @param context - BrowserContext de Playwright
 * @param outputPath - Ruta del archivo JSON de salida (por defecto: 'state.json')
 */
export async function saveSessionState(context: BrowserContext, outputPath: string = 'state.json') {
  await context.storageState({ path: outputPath });
  console.log(`✅ Estado de sesión guardado en ${outputPath}`);
}

export async function createAndSaveSession(
  loginUrl: string,
  email: string,
  password: string,
  emailSelector: string = '#email',
  passwordSelector: string = '#password',
  submitButtonText: string = 'Entrar',
  outputPath: string = 'state.json'
) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(loginUrl);
    await page.fill(emailSelector, email);
    await page.fill(passwordSelector, password);
    await page.click(`text=${submitButtonText}`);
    
    // Esperar a que se complete el login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Guardar el estado de la sesión
    await saveSessionState(context, outputPath);
  } finally {
    await browser.close();
  }
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
