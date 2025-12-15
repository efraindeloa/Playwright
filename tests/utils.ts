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

/**
 * Espera a que el backdrop de Material-UI desaparezca antes de hacer click
 * Esto evita errores de "element intercepts pointer events"
 */
export async function waitForBackdropToDisappear(page: Page, timeout = 10000) {
  try {
    if (page.isClosed()) {
      return;
    }
    
    const backdropSelectors = [
      '.MuiBackdrop-root',
      '[class*="MuiBackdrop-root"]',
      '[class*="mui-"]:has-text("")',
      'div[aria-hidden="true"].MuiBackdrop-root'
    ];
    
    // Verificar si hay algún backdrop visible
    let backdropFound = false;
    for (const selector of backdropSelectors) {
      try {
        const backdrop = page.locator(selector).first();
        const count = await backdrop.count();
        if (count > 0) {
          const isVisible = await backdrop.isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            backdropFound = true;
            // Esperar a que desaparezca
            try {
              await backdrop.waitFor({ state: 'hidden', timeout });
            } catch {
              // Si no desaparece, intentar cerrarlo con ESC
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
              // Verificar nuevamente
              const stillVisible = await backdrop.isVisible({ timeout: 1000 }).catch(() => false);
              if (stillVisible) {
                console.log('⚠️ Backdrop aún visible después de presionar ESC');
              }
            }
            break;
          }
        }
      } catch {
        // Continuar con el siguiente selector
        continue;
      }
    }
    
    if (!backdropFound) {
      // No hay backdrop visible, continuar normalmente
      return;
    }
    
    // Esperar un poco más para asegurar que el backdrop desapareció completamente
    await page.waitForTimeout(300);
  } catch (error) {
    // Si la página se cerró, ignorar el error
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      return;
    }
    // Para otros errores, solo loguear pero no fallar
    console.log('⚠️ Error al esperar backdrop:', error);
  }
}

/**
 * Cierra el modal de "Registra tu servicio" si está visible
 * Este modal aparece ocasionalmente y puede bloquear interacciones
 */
export async function closeRegistrationModal(page: Page, timeout = 5000) {
  try {
    if (page.isClosed()) {
      return;
    }
    
    // Buscar el modal por su texto característico o el botón de cerrar
    const modalText = page.getByText('Registra tu servicio en Fiestamas', { exact: false });
    const modalVisible = await modalText.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (modalVisible) {
      console.log('🔍 Modal de registro detectado, intentando cerrarlo...');
      
      // Buscar el botón de cerrar (ícono X) dentro del modal
      const closeButton = page.locator('button:has(i.icon-x), button:has(.icon-x)').first();
      const buttonVisible = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (buttonVisible) {
        await closeButton.click({ timeout: 3000 });
        await safeWaitForTimeout(page, 500);
        console.log('✅ Modal cerrado exitosamente');
        
        // Verificar que el modal desapareció
        const stillVisible = await modalText.isVisible({ timeout: 1000 }).catch(() => false);
        if (stillVisible) {
          console.log('⚠️ Modal aún visible después de cerrar, intentando con ESC...');
          await page.keyboard.press('Escape');
          await safeWaitForTimeout(page, 500);
        }
        return;
      }
    }
    
    // También buscar directamente el botón de cerrar si el texto no está disponible
    const closeButtonDirect = page.locator('div:has-text("Registra tu servicio") button:has(i.icon-x), div:has-text("Registra tu servicio") button:has(.icon-x)').first();
    const buttonDirectVisible = await closeButtonDirect.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (buttonDirectVisible) {
      console.log('🔍 Botón de cerrar modal encontrado directamente');
      await closeButtonDirect.click({ timeout: 3000 });
      await safeWaitForTimeout(page, 500);
      console.log('✅ Modal cerrado exitosamente');
    }
  } catch (error) {
    // Si la página se cerró, ignorar el error
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      return;
    }
    // Para otros errores, solo loguear pero no fallar
    console.log('⚠️ Error al cerrar modal de registro:', error);
  }
}

/**
 * Mapea la estructura completa de categorías y subcategorías de servicios desde el home.
 * Explora recursivamente todas las categorías principales y sus subcategorías hasta encontrar cards de servicios.
 * 
 * @param page - Instancia de Page de Playwright
 * @param baseUrl - URL base del sitio (por defecto usa DEFAULT_BASE_URL)
 * @returns Mapa completo con la estructura de categorías, rutas, y cantidad de cards encontradas
 */
export async function mapearEstructuraCategoriasServicios(
  page: Page,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<{
  mapaCompleto: Array<{
    categoria: string;
    ruta: string[];
    tieneCards: boolean;
    cardsCount?: number;
    nivel: number;
  }>;
  resumen: {
    categoriasPrincipales: number;
    totalRutas: number;
    rutasConCards: number;
    rutasSinCards: number;
    nivelMaximo: number;
    totalCards: number;
  };
}> {
  const WAIT_FOR_PAGE_LOAD = 2000;
  const MAX_NIVELES = 10;
  const MAX_SUBCATEGORIAS_POR_NIVEL = 10;
  
  // 1. Ir al home
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  
  // 2. Buscar todas las categorías de servicios disponibles
  const categoriasEncontradas: Array<{ 
    nombre: string; 
    selector: string; 
    tipo: string;
    href?: string;
  }> = [];
  
  const categoriaButtons = page.locator('button.flex.flex-col.text-center.items-center').filter({
    has: page.locator('div.flex.flex-row.text-xsmall.mt-2, div.text-xsmall')
  });
  
  const categoriaButtonsCount = await categoriaButtons.count();
  console.log(`📊 Botones de categorías encontrados: ${categoriaButtonsCount}`);
  
  for (let i = 0; i < categoriaButtonsCount; i++) {
    const boton = categoriaButtons.nth(i);
    const isVisible = await boton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isVisible) {
      const textoElement = boton.locator('div.flex.flex-row.text-xsmall.mt-2, div.text-xsmall').first();
      const texto = await textoElement.textContent().catch(() => '');
      const textoTrimmed = texto?.trim() || '';
      
      if (textoTrimmed.length > 0 && textoTrimmed.length < 50) {
        const yaExiste = categoriasEncontradas.some(cat => cat.nombre === textoTrimmed);
        
        if (!yaExiste) {
          const href = await boton.getAttribute('href').catch(() => undefined);
          const tagName = await boton.evaluate(el => el.tagName.toLowerCase()).catch(() => 'button');
          
          categoriasEncontradas.push({
            nombre: textoTrimmed,
            selector: 'button.flex.flex-col.text-center.items-center',
            tipo: tagName,
            href: href || undefined
          });
        }
      }
    }
  }
  
  const botonesServicios = page.locator('button:has-text("Servicios"), button:has-text("Explorar")');
  const botonesServiciosCount = await botonesServicios.count();
  
  for (let i = 0; i < botonesServiciosCount; i++) {
    const boton = botonesServicios.nth(i);
    const isVisible = await boton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isVisible) {
      const texto = await boton.textContent().catch(() => '');
      const textoTrimmed = texto?.trim() || '';
      
      if (textoTrimmed.length > 0) {
        const yaExiste = categoriasEncontradas.some(cat => cat.nombre === textoTrimmed);
        
        if (!yaExiste) {
          const tagName = await boton.evaluate(el => el.tagName.toLowerCase()).catch(() => 'button');
          
          categoriasEncontradas.push({
            nombre: textoTrimmed,
            selector: 'button:has-text',
            tipo: tagName,
            href: undefined
          });
        }
      }
    }
  }
  
  console.log(`\n📊 Categorías de servicios encontradas en el home: ${categoriasEncontradas.length}`);
  
  if (categoriasEncontradas.length > 0) {
    console.log('\n📋 Lista de categorías:');
    categoriasEncontradas.forEach((categoria, index) => {
      console.log(`   ${index + 1}. "${categoria.nombre}" (${categoria.tipo}${categoria.href ? `, href: ${categoria.href}` : ''})`);
    });
  }
  
  // Filtrar categorías principales
  const categoriasPrincipales = categoriasEncontradas.filter(cat => {
    const nombreLower = cat.nombre.toLowerCase();
    const esServiciosGenerico = nombreLower === 'servicios' || nombreLower === 'servicio';
    const esExplorar = nombreLower.includes('explorar');
    const esValida = cat.nombre.length > 0 && cat.nombre.length < 30;
    
    return !esServiciosGenerico && !esExplorar && esValida;
  });
  
  console.log(`\n📋 Categorías principales a explorar: ${categoriasPrincipales.length}`);
  categoriasPrincipales.forEach((cat, index) => {
    console.log(`   ${index + 1}. "${cat.nombre}"`);
  });
  
  const mapaCompletoGlobal: Array<{
    categoria: string;
    ruta: string[];
    tieneCards: boolean;
    cardsCount?: number;
    nivel: number;
  }> = [];
  
  /**
   * Función recursiva para explorar subcategorías hasta encontrar cards
   */
  async function explorarSubcategoriasRecursivamente(
    rutaActual: string[],
    nivel: number,
    botonesSubcategorias: ReturnType<typeof page.locator>,
    indicesVisitados: Set<number>,
    mapaCompleto: Array<{
      ruta: string[];
      tieneCards: boolean;
      cardsCount?: number;
      nivel: number;
    }>
  ): Promise<void> {
    if (nivel >= MAX_NIVELES) {
      console.log(`   ⚠️ Límite de profundidad alcanzado (${MAX_NIVELES} niveles) en: ${rutaActual.join(' -> ')}`);
      return;
    }
    
    const indentacion = '   '.repeat(nivel);
    console.log(`${indentacion}🔍 Nivel ${nivel}: Explorando ${rutaActual.join(' -> ')}`);
    
    const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col, div.hidden.flex-row').filter({
      has: page.locator('p, h3, h4, h5, h6').first()
    });
    const cardsCount = await serviceCards.count();
    
    let cardsVisibles = 0;
    if (cardsCount > 0) {
      for (let i = 0; i < Math.min(cardsCount, 5); i++) {
        const card = serviceCards.nth(i);
        const isVisible = await card.isVisible().catch(() => false);
        if (isVisible) {
          cardsVisibles++;
        }
      }
    }
    
    const tieneCards = cardsVisibles > 0;
    
    if (tieneCards) {
      console.log(`${indentacion}✅ Cards encontradas: ${cardsCount} (${cardsVisibles} visibles)`);
      mapaCompleto.push({
        ruta: [...rutaActual],
        tieneCards: true,
        cardsCount: cardsCount,
        nivel: nivel
      });
      return;
    }
    
    const subcategoriasButtons = page.locator('button.flex.flex-col.items-center.gap-3').filter({
      has: page.locator('p.text-neutral-800.font-medium, p.text-neutral-800')
    });
    const subcategoriasCount = await subcategoriasButtons.count();
    
    if (subcategoriasCount === 0) {
      console.log(`${indentacion}⚠️ No hay cards ni subcategorías en este nivel`);
      mapaCompleto.push({
        ruta: [...rutaActual],
        tieneCards: false,
        nivel: nivel
      });
      return;
    }
    
    const subcategoriasInfo: Array<{ nombre: string; index: number; locator: ReturnType<typeof subcategoriasButtons.nth> }> = [];
    
    for (let i = 0; i < subcategoriasCount; i++) {
      const boton = subcategoriasButtons.nth(i);
      const isVisible = await boton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        const textoElement = boton.locator('p.text-neutral-800.font-medium, p.text-neutral-800').first();
        const texto = await textoElement.textContent().catch(() => '');
        const textoTrimmed = texto?.trim() || '';
        
        if (textoTrimmed.length > 0) {
          subcategoriasInfo.push({
            nombre: textoTrimmed,
            index: i,
            locator: boton
          });
        }
      }
    }
    
    console.log(`${indentacion}📋 Subcategorías encontradas: ${subcategoriasInfo.length}`);
    
    const subcategoriasAExplorar = subcategoriasInfo.slice(0, MAX_SUBCATEGORIAS_POR_NIVEL);
    
    if (subcategoriasInfo.length > MAX_SUBCATEGORIAS_POR_NIVEL) {
      console.log(`${indentacion}⚠️ Limitando exploración a ${MAX_SUBCATEGORIAS_POR_NIVEL} de ${subcategoriasInfo.length} subcategorías`);
    }
    
    for (const subcategoriaInfo of subcategoriasAExplorar) {
      if (rutaActual.includes(subcategoriaInfo.nombre)) {
        console.log(`${indentacion}⏭️ Saltando "${subcategoriaInfo.nombre}" (ya en la ruta)`);
        continue;
      }
      
      console.log(`${indentacion}🔍 Explorando: "${subcategoriaInfo.nombre}"`);
      
      const urlAntes = page.url();
      
      try {
        await subcategoriaInfo.locator.click();
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await safeWaitForTimeout(page, 1000);
        
        const urlDespues = page.url();
        const navego = urlAntes !== urlDespues;
        
        if (navego) {
          console.log(`${indentacion}   ✅ Navegó a: "${subcategoriaInfo.nombre}"`);
        }
        
        const nuevaRuta = [...rutaActual, subcategoriaInfo.nombre];
        await explorarSubcategoriasRecursivamente(nuevaRuta, nivel + 1, subcategoriasButtons, indicesVisitados, mapaCompleto);
        
        if (navego) {
          console.log(`${indentacion}   ↩️ Volviendo atrás desde: "${subcategoriaInfo.nombre}"`);
          await page.goBack();
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await safeWaitForTimeout(page, 1000);
        }
      } catch (e) {
        console.log(`${indentacion}   ❌ Error al explorar "${subcategoriaInfo.nombre}": ${e}`);
        
        try {
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        } catch (backError) {
          // Ignorar error al volver atrás
        }
      }
    }
  }
  
  // Explorar cada categoría principal
  for (const categoriaPrincipal of categoriasPrincipales) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 EXPLORANDO CATEGORÍA: "${categoriaPrincipal.nombre}"`);
    console.log(`${'='.repeat(60)}`);
    
    const urlActual = page.url();
    if (!urlActual.includes(baseUrl) || urlActual !== baseUrl) {
      try {
        await page.goto(baseUrl, { timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await safeWaitForTimeout(page, 1000);
      } catch (e) {
        console.log(`⚠️ Error al volver al home: ${e}`);
        continue;
      }
    }
    
    const botonCategoria = page.locator('button.flex.flex-col.text-center.items-center').filter({
      has: page.locator('div.text-xsmall').filter({
        hasText: new RegExp(categoriaPrincipal.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      })
    }).first();
    
    const botonCategoriaVisible = await botonCategoria.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!botonCategoriaVisible) {
      console.log(`❌ No se encontró el botón de "${categoriaPrincipal.nombre}" para hacer clic`);
      continue;
    }
    
    await botonCategoria.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await safeWaitForTimeout(page, 1000);
    
    console.log(`✅ Clic en categoría "${categoriaPrincipal.nombre}" realizado`);
    
    const subcategoriasButtons = page.locator('button.flex.flex-col.items-center.gap-3').filter({
      has: page.locator('p.text-neutral-800.font-medium, p.text-neutral-800')
    });
    
    const subcategoriasCount = await subcategoriasButtons.count();
    
    console.log(`\n📊 Subcategorías de "${categoriaPrincipal.nombre}" encontradas: ${subcategoriasCount}`);
    
    if (subcategoriasCount === 0) {
      console.log(`⚠️ No se encontraron subcategorías para "${categoriaPrincipal.nombre}"`);
      const serviceCardsDirect = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col, div.hidden.flex-row').filter({
        has: page.locator('p, h3, h4, h5, h6').first()
      });
      const cardsCountDirect = await serviceCardsDirect.count();
      
      if (cardsCountDirect > 0) {
        console.log(`✅ Cards encontradas directamente en "${categoriaPrincipal.nombre}": ${cardsCountDirect}`);
        mapaCompletoGlobal.push({
          categoria: categoriaPrincipal.nombre,
          ruta: [categoriaPrincipal.nombre],
          tieneCards: true,
          cardsCount: cardsCountDirect,
          nivel: 0
        });
      }
      continue;
    }
    
    const subcategoriasEncontradas: Array<{
      nombre: string;
      index: number;
    }> = [];
    
    for (let i = 0; i < subcategoriasCount; i++) {
      const boton = subcategoriasButtons.nth(i);
      const isVisible = await boton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        const textoElement = boton.locator('p.text-neutral-800.font-medium, p.text-neutral-800').first();
        const texto = await textoElement.textContent().catch(() => '');
        const textoTrimmed = texto?.trim() || '';
        
        if (textoTrimmed.length > 0) {
          subcategoriasEncontradas.push({
            nombre: textoTrimmed,
            index: i
          });
        }
      }
    }
    
    console.log(`\n📋 Lista de subcategorías de "${categoriaPrincipal.nombre}":`);
    subcategoriasEncontradas.forEach((subcategoria, index) => {
      console.log(`   ${index + 1}. "${subcategoria.nombre}"`);
    });
    
    console.log(`\n✅ Total de subcategorías listadas: ${subcategoriasEncontradas.length}`);
    
    const mapaCompleto: Array<{
      ruta: string[];
      tieneCards: boolean;
      cardsCount?: number;
      nivel: number;
    }> = [];
    
    console.log(`\n🗺️ Explorando recursivamente hasta encontrar cards...`);
    
    for (const subcategoria of subcategoriasEncontradas) {
      console.log(`\n🔍 Explorando subcategoría principal: "${subcategoria.nombre}"`);
      
      const botonSubcategoria = subcategoriasButtons.nth(subcategoria.index);
      const botonVisible = await botonSubcategoria.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!botonVisible) {
        console.log(`   ⚠️ Botón de "${subcategoria.nombre}" no está visible`);
        continue;
      }
      
      const urlAntes = page.url();
      
      try {
        await botonSubcategoria.click();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        
        const urlDespues = page.url();
        const navego = urlAntes !== urlDespues;
        
        if (navego) {
          console.log(`   ✅ Navegó a: "${subcategoria.nombre}"`);
        }
        
        const rutaInicial = [categoriaPrincipal.nombre, subcategoria.nombre];
        await explorarSubcategoriasRecursivamente(rutaInicial, 1, subcategoriasButtons, new Set(), mapaCompleto);
        
        if (navego) {
          console.log(`   ↩️ Volviendo atrás desde: "${subcategoria.nombre}"`);
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        }
      } catch (e) {
        console.log(`   ❌ Error al explorar "${subcategoria.nombre}": ${e}`);
        
        try {
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        } catch (backError) {
          // Ignorar error al volver atrás
        }
      }
    }
    
    mapaCompleto.forEach(item => {
      mapaCompletoGlobal.push({
        categoria: categoriaPrincipal.nombre,
        ruta: item.ruta,
        tieneCards: item.tieneCards,
        cardsCount: item.cardsCount,
        nivel: item.nivel
      });
    });
    
    const rutasConCardsCategoria = mapaCompleto.filter(item => item.tieneCards);
    const totalCardsCategoria = rutasConCardsCategoria.reduce((sum, item) => sum + (item.cardsCount || 0), 0);
    
    console.log(`\n📊 Resumen de "${categoriaPrincipal.nombre}":`);
    console.log(`   Rutas exploradas: ${mapaCompleto.length}`);
    console.log(`   Rutas con cards: ${rutasConCardsCategoria.length}`);
    console.log(`   Total cards: ${totalCardsCategoria}`);
  }
  
  // Calcular resumen
  const categoriasUnicas = [...new Set(mapaCompletoGlobal.map(item => item.categoria))];
  const rutasConCardsGlobal = mapaCompletoGlobal.filter(item => item.tieneCards);
  const rutasSinCardsGlobal = mapaCompletoGlobal.filter(item => !item.tieneCards);
  const totalCardsGlobal = rutasConCardsGlobal.reduce((sum, item) => sum + (item.cardsCount || 0), 0);
  const nivelMaximoGlobal = Math.max(...mapaCompletoGlobal.map(item => item.nivel), 0);
  
  // Mostrar mapa completo
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗺️ MAPA COMPLETO DE TODAS LAS CATEGORÍAS`);
  console.log(`${'='.repeat(60)}`);
  
  categoriasUnicas.forEach(categoria => {
    console.log(`\n📁 ${categoria}`);
    
    const itemsCategoria = mapaCompletoGlobal.filter(item => item.categoria === categoria);
    
    itemsCategoria.forEach((item) => {
      const rutaStr = item.ruta.slice(1).join(' -> ');
      const nivelStr = '   '.repeat(item.nivel);
      
      if (item.tieneCards) {
        console.log(`   ${nivelStr}└─ ${rutaStr} (${item.cardsCount} cards)`);
      } else {
        console.log(`   ${nivelStr}└─ ${rutaStr} (sin cards)`);
      }
    });
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN ESTADÍSTICO GLOBAL`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Categorías principales exploradas: ${categoriasUnicas.length}`);
  console.log(`   Total de rutas exploradas: ${mapaCompletoGlobal.length}`);
  console.log(`   Rutas que llegaron a cards: ${rutasConCardsGlobal.length}`);
  console.log(`   Rutas sin cards: ${rutasSinCardsGlobal.length}`);
  console.log(`   Nivel máximo alcanzado: ${nivelMaximoGlobal}`);
  console.log(`   Total de cards encontradas: ${totalCardsGlobal}`);
  
  return {
    mapaCompleto: mapaCompletoGlobal,
    resumen: {
      categoriasPrincipales: categoriasUnicas.length,
      totalRutas: mapaCompletoGlobal.length,
      rutasConCards: rutasConCardsGlobal.length,
      rutasSinCards: rutasSinCardsGlobal.length,
      nivelMaximo: nivelMaximoGlobal,
      totalCards: totalCardsGlobal
    }
  };
}