import { Page, expect, Browser, BrowserContext } from '@playwright/test';
import { chromium } from '@playwright/test';
import fs from 'fs';
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
  await page.waitForTimeout(1000);
  
  // Llenar campos y hacer login
  await safeFill(page, 'Correo', email);
  await safeFill(page, 'Contraseña', password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  
  // Validar que se redirigió al dashboard
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(2000);
}

/**
 * Extrae el DOM completo de la página y lo guarda en un archivo JSON.
 * @param page - Instancia de Page de Playwright
 * @param outputPath - Ruta del archivo JSON de salida (por defecto: 'dom-dump.json')
 */
export async function extractDOMToJSON(page: Page, outputPath: string = 'dom-dump.json') {
  await page.waitForLoadState('networkidle');

  // Evaluar el DOM completo en el navegador
  const domData = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).map(el => {
      const attrs: Record<string, string> = {};
      for (const attr of el.getAttributeNames()) {
        attrs[attr] = el.getAttribute(attr) || '';
      }
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        class: el.className || null,
        text: el.textContent?.trim().slice(0, 100) || null, // hasta 100 caracteres
        attributes: attrs
      };
    });
  });

  // Guardar en archivo JSON
  fs.writeFileSync(outputPath, JSON.stringify(domData, null, 2), 'utf-8');

  console.log(`✅ DOM exportado a ${outputPath}`);
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

/**
 * Crea una sesión autenticada y guarda su estado en un archivo JSON.
 * @param loginUrl - URL de la página de login
 * @param email - Email para el login
 * @param password - Contraseña para el login
 * @param emailSelector - Selector del campo de email (por defecto: '#email')
 * @param passwordSelector - Selector del campo de contraseña (por defecto: '#password')
 * @param submitButtonText - Texto del botón de submit (por defecto: 'Entrar')
 * @param outputPath - Ruta del archivo JSON de salida (por defecto: 'state.json')
 */
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
