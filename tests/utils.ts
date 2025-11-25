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
 * Verifica si el usuario ya está autenticado basándose en la URL y elementos de la página.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  
  // Si estamos en una URL de cliente (dashboard, profile, chats, etc.), probablemente estamos autenticados
  if (currentUrl.includes('/client/') && !currentUrl.includes('/login')) {
    // Verificar si hay elementos que solo aparecen cuando estás autenticado
    try {
      // Buscar elementos comunes del dashboard autenticado con timeouts más cortos
      const checks = [
        page.locator('nav').isVisible({ timeout: 1000 }).catch(() => false),
        page.locator('a[href*="/client/chats"]').isVisible({ timeout: 1000 }).catch(() => false),
        page.locator('a[href*="/client/profile"]').isVisible({ timeout: 1000 }).catch(() => false),
        page.locator('a[href*="/client/dashboard"]').isVisible({ timeout: 1000 }).catch(() => false),
        // Verificar si hay un botón de logout o perfil visible (indicador de autenticación)
        page.locator('button:has(i.icon-user), a:has(i.icon-user)').isVisible({ timeout: 1000 }).catch(() => false),
      ];
      
      const results = await Promise.all(checks);
      const hasAuthenticatedElements = results.some(visible => visible);
      
      if (hasAuthenticatedElements) {
        return true;
      }
      
      // Verificación adicional: si estamos en /client/dashboard o /client/profile, asumir autenticado
      if (currentUrl.includes('/client/dashboard') || currentUrl.includes('/client/profile')) {
        return true;
      }
    } catch (e) {
      // Si estamos en una URL de cliente y no es login, probablemente estamos autenticados
      if (currentUrl.includes('/client/dashboard') || currentUrl.includes('/client/profile')) {
        return true;
      }
    }
  } else if (currentUrl === 'about:blank' || currentUrl === DEFAULT_BASE_URL) {
    return false;
  }
  
  return false;
}

/**
 * Login completo: navega a la página, abre el formulario de login, llena los campos y valida el acceso.
 * Si ya está autenticado, omite el proceso de login.
 */
export async function login(page: Page, email: string, password: string) {
  // Verificar si ya está autenticado
  const yaAutenticado = await isAuthenticated(page);
  if (yaAutenticado) {
    return;
  }
  
  const currentUrl = page.url();
  const isAlreadyOnLoginPage = currentUrl.includes('/login');
  
  if (!isAlreadyOnLoginPage) {
    // Navegar a la página principal y abrir el formulario de login
    await page.goto(DEFAULT_BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const loginButton = page.locator('button:has(i.icon-user)');
    const loginButtonVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (loginButtonVisible) {
      await loginButton.click();
      await page.waitForTimeout(1000);
      
      // Verificar si después del clic estamos en la página de login o en otra página
      const urlDespuesClick = page.url();
      
      // Si no estamos en /login, puede que ya estemos autenticados y el botón nos llevó al perfil
      if (!urlDespuesClick.includes('/login')) {
        const yaAutenticadoDespues = await isAuthenticated(page);
        if (yaAutenticadoDespues) {
          return;
        } else {
          await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1500);
        }
      }
    } else {
      // Si el botón no está visible, intentar navegar directamente al login
      await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
    }
  } else {
    // Ya estamos en la página de login, solo esperar a que se cargue
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }
  
  // Verificar una vez más antes de intentar llenar los campos
  const urlAntesFill = page.url();
  
  if (!urlAntesFill.includes('/login')) {
    const yaAutenticado = await isAuthenticated(page);
    if (yaAutenticado) {
      return;
    }
  }

  // Llenar los campos de login
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
  try {
    // Verificar que la página esté abierta
    if (page.isClosed()) {
      return;
    }
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
  } catch (error) {
    // Si la página se cerró, ignorar el error
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      return;
    }
    // Para otros errores, solo loguear pero no fallar
    console.log(`⚠️ No se pudo mostrar mensaje: ${message}`);
  }
}

// Función para limpiar el mensaje de paso
export async function clearStepMessage(page: Page) {
  try {
    await page.evaluate(() => {
      const box = document.getElementById('__playwright_step_overlay');
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    });
  } catch (error) {
    // Ignorar errores si la página se cerró
  }
}

/**
 * Espera de forma segura, verificando que la página esté abierta
 */
export async function safeWaitForTimeout(page: Page, timeout: number) {
  try {
    // Verificar que la página esté abierta
    if (page.isClosed()) {
      return;
    }
    await page.waitForTimeout(timeout);
  } catch (error) {
    // Si la página se cerró, ignorar el error
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      return;
    }
    throw error;
  }
}
