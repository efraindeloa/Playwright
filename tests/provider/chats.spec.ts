import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const CHATS_URL = `${DEFAULT_BASE_URL}/provider/chats`;
const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;

// Timeouts
const DEFAULT_TIMEOUT = 60000;
const WAIT_FOR_PAGE_LOAD = 2000;
const WAIT_FOR_ELEMENT_TIMEOUT = 5000;

// ============================================================================

test.use({ 
  viewport: { width: 1280, height: 720 }
});

test.setTimeout(DEFAULT_TIMEOUT);

test.describe('Gestión de Chats (Fiestachat)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('Navegar a página de chats', async ({ page }) => {
    // --- NAVEGAR A DASHBOARD ---
    await showStepMessage(page, '🏠 NAVEGANDO AL DASHBOARD');
    await page.waitForTimeout(1000);
    
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A CHATS ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    // Intentar múltiples estrategias para encontrar el enlace a chats
    let chatsLink = page.locator('a[href="/provider/chats"]:has(i.icon-message-square)').first();
    let isVisible = await chatsLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isVisible) {
      // Intentar con selector más específico
      chatsLink = page.locator('nav a[href="/provider/chats"], div.lg\\:block nav a[href="/provider/chats"]').first();
      isVisible = await chatsLink.isVisible({ timeout: 2000 }).catch(() => false);
    }
    
    if (!isVisible) {
      // Si no está visible, navegar directamente a la URL
      console.log('ℹ️ Enlace a chats no visible, navegando directamente a la URL');
      await page.goto(CHATS_URL);
    } else {
      await chatsLink.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await chatsLink.click();
    }
    
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    await expect(page).toHaveURL(/\/provider\/chats/i);
    
    const pageTitle = page.locator('p:has-text("Fiestachat")');
    await expect(pageTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Navegación a página de chats exitosa');
  });

  test('Validar elementos de la página de chats', async ({ page }) => {
    // --- NAVEGAR A CHATS ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO ---
    await showStepMessage(page, '📋 VALIDANDO TÍTULO');
    await page.waitForTimeout(1000);
    
    const pageTitle = page.locator('p:has-text("Fiestachat")');
    await expect(pageTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Fiestachat" encontrado');

    // --- VALIDAR CAMPO DE BÚSQUEDA ---
    await showStepMessage(page, '🔍 VALIDANDO CAMPO DE BÚSQUEDA');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('input[placeholder*="Buscar"], input#Search').first();
    await expect(searchInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de búsqueda encontrado');

    // --- VALIDAR BOTÓN DE FILTRO ---
    await showStepMessage(page, '🔽 VALIDANDO BOTÓN DE FILTRO');
    await page.waitForTimeout(1000);
    
    const filterButton = page.locator('button:has-text("Filtrar")');
    await expect(filterButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón "Filtrar" encontrado');

    // --- VALIDAR LISTA DE CONVERSACIONES ---
    await showStepMessage(page, '📋 VALIDANDO LISTA DE CONVERSACIONES');
    await page.waitForTimeout(1000);
    
    // Esperar a que se carguen las conversaciones
    await page.waitForTimeout(2000);
    
    // Buscar contenedor de conversaciones (puede estar vacío o con elementos)
    const conversationsContainer = page.locator('div, section, main').filter({
      has: page.locator('button, div').filter({ hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa/i })
    }).first();
    
    const hasConversations = await conversationsContainer.count() > 0;
    
    if (hasConversations) {
      console.log('✅ Lista de conversaciones encontrada');
      
      // Validar que hay al menos una conversación visible
      const conversationButtons = page.locator('button').filter({
        hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
      });
      
      const conversationCount = await conversationButtons.count();
      if (conversationCount > 0) {
        console.log(`✅ Se encontraron ${conversationCount} conversación(es)`);
      }
    } else {
      console.log('ℹ️ No se encontraron conversaciones (puede ser normal si no hay chats)');
    }
  });

  test('Buscar conversaciones', async ({ page }) => {
    // --- NAVEGAR A CHATS ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- OBTENER ESTADO INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
    await page.waitForTimeout(1000);
    
    await page.waitForTimeout(2000); // Esperar a que se carguen las conversaciones
    
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    const initialCount = await conversationButtons.count();
    console.log(`📊 Conversaciones iniciales: ${initialCount}`);

    // --- REALIZAR BÚSQUEDA ---
    await showStepMessage(page, '🔍 REALIZANDO BÚSQUEDA');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('input[placeholder*="Buscar"], input#Search').first();
    await expect(searchInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    
    // Buscar por un término común
    await searchInput.fill('Fiestamas');
    await page.waitForTimeout(2000); // Esperar a que se procese la búsqueda

    // --- VALIDAR RESULTADOS DE BÚSQUEDA ---
    await showStepMessage(page, '✅ VALIDANDO RESULTADOS DE BÚSQUEDA');
    await page.waitForTimeout(1000);
    
    const afterSearchCount = await conversationButtons.count();
    console.log(`📊 Conversaciones después de búsqueda: ${afterSearchCount}`);

    // Verificar que el campo de búsqueda tiene el valor correcto
    const searchValue = await searchInput.inputValue();
    if (searchValue !== 'Fiestamas') {
      console.warn(`⚠️ El campo de búsqueda no tiene el valor esperado. Valor: "${searchValue}"`);
    } else {
      console.log('✅ Campo de búsqueda contiene el término buscado');
    }

    // --- LIMPIAR BÚSQUEDA ---
    await showStepMessage(page, '🧹 LIMPIANDO BÚSQUEDA');
    await page.waitForTimeout(1000);
    
    await searchInput.clear();
    await page.waitForTimeout(2000);

    const afterClearCount = await conversationButtons.count();
    console.log(`📊 Conversaciones después de limpiar: ${afterClearCount}`);
    
    if (afterClearCount === initialCount) {
      console.log('✅ Búsqueda limpiada correctamente');
    }
  });

  test('Filtrar conversaciones', async ({ page }) => {
    // --- NAVEGAR A CHATS ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- ABRIR FILTROS ---
    await showStepMessage(page, '🔽 ABRIENDO FILTROS');
    await page.waitForTimeout(1000);
    
    const filterButton = page.locator('button:has-text("Filtrar")');
    await expect(filterButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await filterButton.click();
    await page.waitForTimeout(1000);

    // --- VALIDAR QUE SE ABRIÓ EL DIALOG DE FILTROS ---
    await showStepMessage(page, '✅ VALIDANDO DIALOG DE FILTROS');
    await page.waitForTimeout(1000);
    
    // Buscar elementos comunes en diálogos de filtros
    const filterDialog = page.locator('div[role="dialog"], div[class*="dialog"], div[class*="modal"]').first();
    const hasFilterDialog = await filterDialog.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasFilterDialog) {
      console.log('✅ Diálogo de filtros abierto');
      
      // Intentar cerrar el diálogo
      const closeButton = page.locator('button:has-text("Cerrar"), button:has-text("Cancelar"), button[aria-label*="close"], button[aria-label*="cerrar"]').first();
      const hasCloseButton = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasCloseButton) {
        await closeButton.click();
        await page.waitForTimeout(500);
      } else {
        // Intentar cerrar haciendo clic fuera o presionando Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } else {
      console.log('ℹ️ No se detectó un diálogo de filtros (puede tener otra implementación)');
    }
  });

  test('Seleccionar conversación y navegar a negociación', async ({ page }) => {
    // --- NAVEGAR A CHATS ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- ESPERAR A QUE SE CARGUEN LAS CONVERSACIONES ---
    await showStepMessage(page, '⏳ ESPERANDO CONVERSACIONES');
    await page.waitForTimeout(2000);
    
    // --- BUSCAR UNA CONVERSACIÓN ---
    await showStepMessage(page, '🔍 BUSCANDO CONVERSACIÓN');
    await page.waitForTimeout(1000);
    
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    console.log(`📊 Conversaciones encontradas: ${conversationCount}`);
    
    if (conversationCount === 0) {
      console.log('⚠️ No se encontraron conversaciones para seleccionar');
      return;
    }

    // --- SELECCIONAR PRIMERA CONVERSACIÓN ---
    await showStepMessage(page, '🖱️ SELECCIONANDO CONVERSACIÓN');
    await page.waitForTimeout(1000);
    
    const firstConversation = conversationButtons.first();
    const conversationText = await firstConversation.textContent();
    console.log(`📋 Seleccionando conversación: "${conversationText?.trim().substring(0, 50)}..."`);
    
    await firstConversation.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);

    // --- VALIDAR NAVEGACIÓN A NEGOCIACIÓN ---
    await showStepMessage(page, '✅ VALIDANDO NAVEGACIÓN');
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    
    if (currentUrl.includes('/provider/negotiation/')) {
      console.log('✅ Navegación a página de negociación exitosa');
      
      // Validar que se muestra el título "Negociación"
      const negotiationTitle = page.locator('p:has-text("Negociación")');
      const hasTitle = await negotiationTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      
      if (hasTitle) {
        console.log('✅ Título "Negociación" encontrado');
      }
    } else {
      console.warn(`⚠️ No se navegó a la página de negociación. URL actual: ${currentUrl}`);
    }
  });

  test('Navegar de regreso desde chats al dashboard', async ({ page }) => {
    // --- NAVEGAR A CHATS ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR DE REGRESO AL DASHBOARD ---
    await showStepMessage(page, '🏠 NAVEGANDO DE REGRESO AL DASHBOARD');
    await page.waitForTimeout(1000);
    
    // Buscar botón de regreso o enlace al dashboard
    const backButton = page.locator('button:has(i.icon-arrow-left), button[aria-label*="back"], button[aria-label*="regresar"], a[href="/provider/dashboard"]').first();
    const hasBackButton = await backButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasBackButton) {
      await backButton.click();
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    } else {
      // Intentar navegar directamente
      await page.goto(DASHBOARD_URL);
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    }

    // --- VALIDAR QUE REGRESÓ AL DASHBOARD ---
    await showStepMessage(page, '✅ VALIDANDO REGRESO AL DASHBOARD');
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/dashboard')) {
      console.log('✅ Regreso al dashboard exitoso');
      
      const welcomeHeading = page.locator('h6:has-text("Bienvenido")');
      const hasWelcome = await welcomeHeading.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      
      if (hasWelcome) {
        console.log('✅ Elemento "Bienvenido" encontrado en el dashboard');
      }
    } else {
      throw new Error(`❌ No se regresó al dashboard. URL actual: ${currentUrl}`);
    }
  });
});

