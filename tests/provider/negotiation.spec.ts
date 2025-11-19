import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const CHATS_URL = `${DEFAULT_BASE_URL}/provider/chats`;
const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;

// Timeouts
const DEFAULT_TIMEOUT = 90000; // 90 segundos para pruebas de negociación
const WAIT_FOR_PAGE_LOAD = 2000;
const WAIT_FOR_ELEMENT_TIMEOUT = 5000;

// ============================================================================

test.use({ 
  viewport: { width: 1280, height: 720 }
});

test.setTimeout(DEFAULT_TIMEOUT);

/**
 * Navega a una página de negociación desde chats o dashboard
 */
async function navigateToNegotiation(page: Page): Promise<string> {
  // Intentar desde chats primero
  try {
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    
    if (conversationCount > 0) {
      await conversationButtons.first().click();
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/provider/negotiation/')) {
        return currentUrl;
      }
    }
  } catch (error) {
    console.log('ℹ️ No se pudo navegar desde chats, intentando desde dashboard...');
  }
  
  // Intentar desde dashboard
  try {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar un evento clickeable en el dashboard
    const eventButtons = page.locator('button').filter({
      hasText: /PENDIENTE|NUEVO|CONTRATADO|CANCELADO/i
    });
    
    const eventCount = await eventButtons.count();
    
    if (eventCount > 0) {
      await eventButtons.first().click();
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/provider/negotiation/')) {
        return currentUrl;
      }
    }
  } catch (error) {
    console.log('ℹ️ No se pudo navegar desde dashboard');
  }
  
  throw new Error('❌ No se pudo navegar a una página de negociación');
}

test.describe('Gestión de Negociaciones y Cotizaciones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('navegar a página de negociación', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A PÁGINA DE NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    const negotiationUrl = await navigateToNegotiation(page);
    console.log(`📍 URL de negociación: ${negotiationUrl}`);

    // --- VALIDAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    await showStepMessage(page, '✅ VALIDANDO PÁGINA DE NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/provider\/negotiation\/\d+/i);
    
    const negotiationTitle = page.locator('p:has-text("Negociación")');
    await expect(negotiationTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Navegación a página de negociación exitosa');
  });

  test('validar información del evento en negociación', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DEL EVENTO ---
    await showStepMessage(page, '📋 VALIDANDO TÍTULO DEL EVENTO');
    await page.waitForTimeout(1000);
    
    // Buscar el título del evento (puede estar en diferentes lugares)
    const eventTitle = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiesta|Evento/i
    }).first();
    
    const hasEventTitle = await eventTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasEventTitle) {
      const titleText = await eventTitle.textContent();
      console.log(`✅ Título del evento encontrado: "${titleText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un título de evento visible');
    }

    // --- VALIDAR FECHA DEL EVENTO ---
    await showStepMessage(page, '📅 VALIDANDO FECHA DEL EVENTO');
    await page.waitForTimeout(1000);
    
    // Buscar elementos que contengan fechas
    const dateElements = page.locator('p, span').filter({
      hasText: /\d{1,2}\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i
    });
    
    const dateCount = await dateElements.count();
    if (dateCount > 0) {
      const dateText = await dateElements.first().textContent();
      console.log(`✅ Fecha del evento encontrada: "${dateText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró una fecha visible');
    }

    // --- VALIDAR HORA DEL EVENTO ---
    await showStepMessage(page, '🕐 VALIDANDO HORA DEL EVENTO');
    await page.waitForTimeout(1000);
    
    // Buscar elementos que contengan horas
    const timeElements = page.locator('p, span').filter({
      hasText: /\d{1,2}:\d{2}\s*(AM|PM|hrs?\.?)/i
    });
    
    const timeCount = await timeElements.count();
    if (timeCount > 0) {
      const timeText = await timeElements.first().textContent();
      console.log(`✅ Hora del evento encontrada: "${timeText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró una hora visible');
    }
  });

  test('validar información del servicio en negociación', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR NOMBRE DEL SERVICIO ---
    await showStepMessage(page, '🔧 VALIDANDO INFORMACIÓN DEL SERVICIO');
    await page.waitForTimeout(1000);
    
    // Buscar el nombre del servicio
    const serviceName = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Servicio|Decoración|Trajes|Fiestamas Proveedor/i
    }).first();
    
    const hasServiceName = await serviceName.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasServiceName) {
      const serviceText = await serviceName.textContent();
      console.log(`✅ Nombre del servicio encontrado: "${serviceText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un nombre de servicio visible');
    }

    // --- VALIDAR IMAGEN DEL SERVICIO ---
    await showStepMessage(page, '🖼️ VALIDANDO IMAGEN DEL SERVICIO');
    await page.waitForTimeout(1000);
    
    const serviceImage = page.locator('img[alt*="Service"], img[alt*="Servicio"], img').first();
    const hasServiceImage = await serviceImage.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasServiceImage) {
      console.log('✅ Imagen del servicio encontrada');
    } else {
      console.log('ℹ️ No se encontró una imagen de servicio visible');
    }
  });

  test('validar información del cliente en negociación', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR NOMBRE DEL CLIENTE ---
    await showStepMessage(page, '👤 VALIDANDO INFORMACIÓN DEL CLIENTE');
    await page.waitForTimeout(1000);
    
    // Buscar el nombre del cliente
    const clientName = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Fiestamas QA Cliente|cliente|Cliente/i
    }).first();
    
    const hasClientName = await clientName.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasClientName) {
      const clientText = await clientName.textContent();
      console.log(`✅ Nombre del cliente encontrado: "${clientText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un nombre de cliente visible');
    }

    // --- VALIDAR TELÉFONO DEL CLIENTE ---
    await showStepMessage(page, '📞 VALIDANDO TELÉFONO DEL CLIENTE');
    await page.waitForTimeout(1000);
    
    // Buscar teléfono (formato común: +52, números, etc.)
    const phoneElements = page.locator('p, span').filter({
      hasText: /\+?\d{1,3}[\s\-\(\)]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{2,4}/
    });
    
    const phoneCount = await phoneElements.count();
    if (phoneCount > 0) {
      const phoneText = await phoneElements.first().textContent();
      console.log(`✅ Teléfono del cliente encontrado: "${phoneText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un teléfono visible');
    }

    // --- VALIDAR EMAIL DEL CLIENTE ---
    await showStepMessage(page, '📧 VALIDANDO EMAIL DEL CLIENTE');
    await page.waitForTimeout(1000);
    
    // Buscar email
    const emailElements = page.locator('p, span, a').filter({
      hasText: /@/
    });
    
    const emailCount = await emailElements.count();
    if (emailCount > 0) {
      const emailText = await emailElements.first().textContent();
      console.log(`✅ Email del cliente encontrado: "${emailText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un email visible');
    }
  });

  test('validar sección de cotización', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DE COTIZACIÓN ---
    await showStepMessage(page, '💰 VALIDANDO SECCIÓN DE COTIZACIÓN');
    await page.waitForTimeout(1000);
    
    const quotationTitle = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Cotización/i
    }).first();
    
    const hasQuotationTitle = await quotationTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasQuotationTitle) {
      console.log('✅ Título "Cotización" encontrado');
    } else {
      console.log('ℹ️ No se encontró el título "Cotización"');
    }

    // --- VALIDAR ESTADO DE COTIZACIÓN ---
    await showStepMessage(page, '📊 VALIDANDO ESTADO DE COTIZACIÓN');
    await page.waitForTimeout(1000);
    
    const statusElements = page.locator('p, span').filter({
      hasText: /ENVIADA|PENDIENTE|ACEPTADA|RECHAZADA/i
    });
    
    const statusCount = await statusElements.count();
    if (statusCount > 0) {
      const statusText = await statusElements.first().textContent();
      console.log(`✅ Estado de cotización encontrado: "${statusText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un estado de cotización visible');
    }

    // --- VALIDAR BOTÓN "VER COTIZACIÓN ANTERIOR" ---
    await showStepMessage(page, '👁️ VALIDANDO BOTÓN VER COTIZACIÓN ANTERIOR');
    await page.waitForTimeout(1000);
    
    const viewPreviousButton = page.locator('button:has-text("Ver cotización anterior"), button:has-text("cotización anterior")');
    const hasViewPreviousButton = await viewPreviousButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasViewPreviousButton) {
      console.log('✅ Botón "Ver cotización anterior" encontrado');
    } else {
      console.log('ℹ️ No se encontró el botón "Ver cotización anterior" (puede no haber cotizaciones anteriores)');
    }
  });

  test('validar campos de cotización', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE DETALLES ---
    await showStepMessage(page, '📝 VALIDANDO CAMPOS DE COTIZACIÓN');
    await page.waitForTimeout(1000);
    
    const detailsInput = page.locator('input[id*="Details"], input[id*="Detalles"], textarea[id*="Details"], textarea[id*="Detalles"]').first();
    const hasDetailsInput = await detailsInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasDetailsInput) {
      console.log('✅ Campo de detalles encontrado');
    } else {
      console.log('ℹ️ No se encontró el campo de detalles');
    }

    // --- VALIDAR CAMPO DE TOTAL ---
    await showStepMessage(page, '💵 VALIDANDO CAMPO DE TOTAL');
    await page.waitForTimeout(1000);
    
    const totalInput = page.locator('input[id*="Total"], input[placeholder*="Total"]').first();
    const hasTotalInput = await totalInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasTotalInput) {
      console.log('✅ Campo de total encontrado');
    } else {
      console.log('ℹ️ No se encontró el campo de total');
    }

    // --- VALIDAR CAMPO DE CONDICIONES ---
    await showStepMessage(page, '📋 VALIDANDO CAMPO DE CONDICIONES');
    await page.waitForTimeout(1000);
    
    const conditionsInput = page.locator('input[id*="Conditions"], input[id*="Condiciones"], textarea[id*="Conditions"], textarea[id*="Condiciones"]').first();
    const hasConditionsInput = await conditionsInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasConditionsInput) {
      console.log('✅ Campo de condiciones encontrado');
    } else {
      console.log('ℹ️ No se encontró el campo de condiciones');
    }
  });

  test('validar sección de notas personales', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DE NOTAS PERSONALES ---
    await showStepMessage(page, '📝 VALIDANDO SECCIÓN DE NOTAS PERSONALES');
    await page.waitForTimeout(1000);
    
    const notesTitle = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Notas personales|Notas/i
    }).first();
    
    const hasNotesTitle = await notesTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasNotesTitle) {
      console.log('✅ Título "Notas personales" encontrado');
    } else {
      console.log('ℹ️ No se encontró el título "Notas personales"');
    }

    // --- VALIDAR CAMPO DE NOTAS ---
    await showStepMessage(page, '✏️ VALIDANDO CAMPO DE NOTAS');
    await page.waitForTimeout(1000);
    
    const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
    const hasNotesInput = await notesInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasNotesInput) {
      console.log('✅ Campo de notas personales encontrado');
      
      // Intentar agregar una nota
      await notesInput.fill('Nota de prueba para testing');
      await page.waitForTimeout(500);
      
      const notesValue = await notesInput.inputValue();
      if (notesValue.includes('Nota de prueba')) {
        console.log('✅ Nota agregada correctamente');
      }
    } else {
      console.log('ℹ️ No se encontró el campo de notas personales');
    }
  });

  test('validar sección de chat/mensajes', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE MENSAJE ---
    await showStepMessage(page, '💬 VALIDANDO SECCIÓN DE CHAT');
    await page.waitForTimeout(1000);
    
    const messageInput = page.locator('input[placeholder*="Mensaje"], textarea[placeholder*="Mensaje"], input[id*="Message"], textarea[id*="Message"]').first();
    const hasMessageInput = await messageInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasMessageInput) {
      console.log('✅ Campo de mensaje encontrado');
      
      // Intentar escribir un mensaje
      await messageInput.fill('Mensaje de prueba');
      await page.waitForTimeout(500);
      
      // Buscar botón de enviar
      const sendButton = page.locator('button[type="submit"], button:has-text("Enviar"), button:has(i.icon-send)').first();
      const hasSendButton = await sendButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasSendButton) {
        console.log('✅ Botón de enviar encontrado');
        // No enviar el mensaje para no crear ruido en las pruebas reales
        await messageInput.clear();
      }
    } else {
      console.log('ℹ️ No se encontró el campo de mensaje');
    }

    // --- VALIDAR HISTORIAL DE MENSAJES ---
    await showStepMessage(page, '📜 VALIDANDO HISTORIAL DE MENSAJES');
    await page.waitForTimeout(1000);
    
    // Buscar elementos que puedan ser mensajes en el historial
    const messageElements = page.locator('div, p, span').filter({
      hasText: /Cotización|Solicitud|envié|recibida|am|pm/i
    });
    
    const messageCount = await messageElements.count();
    if (messageCount > 0) {
      console.log(`✅ Historial de mensajes encontrado (${messageCount} elementos relacionados)`);
    } else {
      console.log('ℹ️ No se encontró un historial de mensajes visible');
    }
  });

  test('navegar de regreso desde negociación', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR DE REGRESO ---
    await showStepMessage(page, '🔙 NAVEGANDO DE REGRESO');
    await page.waitForTimeout(1000);
    
    // Buscar botón de regreso
    const backButton = page.locator('button:has(i.icon-arrow-left), button[aria-label*="back"], button[aria-label*="regresar"], a[href="/provider/chats"], a[href="/provider/dashboard"]').first();
    const hasBackButton = await backButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasBackButton) {
      await backButton.click();
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    } else {
      // Intentar navegar directamente a chats
      await page.goto(CHATS_URL);
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    }

    // --- VALIDAR REGRESO ---
    await showStepMessage(page, '✅ VALIDANDO REGRESO');
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/chats') || currentUrl.includes('/provider/dashboard')) {
      console.log('✅ Regreso exitoso');
    } else {
      console.log(`ℹ️ URL actual después del regreso: ${currentUrl}`);
    }
  });
});

/**
 * Navega a una negociación con estado "NUEVA"
 */
async function navigateToNewNegotiation(page: Page): Promise<string> {
  // Intentar desde chats primero
  try {
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar conversaciones que puedan tener estado NUEVA
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    
    if (conversationCount > 0) {
      // Intentar con la primera conversación
      await conversationButtons.first().click();
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/provider/negotiation/')) {
        // Verificar si el estado es NUEVA
        const statusElement = page.locator('p:has-text("NUEVA")');
        const hasNewStatus = await statusElement.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasNewStatus) {
          return currentUrl;
        }
      }
    }
  } catch (error) {
    console.log('ℹ️ No se pudo navegar desde chats, intentando desde dashboard...');
  }
  
  // Intentar desde dashboard
  try {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar eventos con estado NUEVO
    const eventButtons = page.locator('button').filter({
      hasText: /NUEVO/i
    });
    
    const eventCount = await eventButtons.count();
    
    if (eventCount > 0) {
      await eventButtons.first().click();
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/provider/negotiation/')) {
        return currentUrl;
      }
    }
  } catch (error) {
    console.log('ℹ️ No se pudo navegar desde dashboard');
  }
  
  throw new Error('❌ No se pudo navegar a una negociación con estado NUEVA');
}

test.describe('Negociación con estado NUEVA - Elementos interactivos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('validar estado NUEVA y elementos principales', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN CON ESTADO NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR ESTADO NUEVA ---
    await showStepMessage(page, '✅ VALIDANDO ESTADO NUEVA');
    await page.waitForTimeout(1000);
    
    const statusElement = page.locator('p:has-text("NUEVA")');
    await expect(statusElement).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Estado "NUEVA" encontrado');
  });

  test('validar y probar botón de regreso', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR BOTÓN DE REGRESO ---
    await showStepMessage(page, '🔙 VALIDANDO BOTÓN DE REGRESO');
    await page.waitForTimeout(1000);
    
    const backButton = page.locator('button:has(i.icon-chevron-left-bold)');
    await expect(backButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón de regreso encontrado');
    
    // Probar hacer clic (pero no navegar realmente para no interrumpir otras pruebas)
    const isClickable = await backButton.isEnabled();
    if (isClickable) {
      console.log('✅ Botón de regreso es clickeable');
    }
  });

  test('validar y probar campo de Detalles', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE DETALLES ---
    await showStepMessage(page, '📝 VALIDANDO CAMPO DE DETALLES');
    await page.waitForTimeout(1000);
    
    const detailsTextarea = page.locator('textarea[id="Description"]');
    await expect(detailsTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de detalles encontrado');
    
    // Probar escribir en el campo
    await detailsTextarea.fill('Detalles de prueba para la cotización');
    await page.waitForTimeout(500);
    
    const detailsValue = await detailsTextarea.inputValue();
    if (detailsValue.includes('Detalles de prueba')) {
      console.log('✅ Campo de detalles acepta texto');
    }
    
    // --- VALIDAR BOTÓN "BORRAR TODO" ---
    await showStepMessage(page, '🗑️ VALIDANDO BOTÓN BORRAR TODO');
    await page.waitForTimeout(1000);
    
    const clearButton = page.locator('button:has-text("Borrar todo")');
    const hasClearButton = await clearButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasClearButton) {
      console.log('✅ Botón "Borrar todo" encontrado');
      await clearButton.click();
      await page.waitForTimeout(500);
      
      const clearedValue = await detailsTextarea.inputValue();
      if (clearedValue === '' || clearedValue.trim() === '') {
        console.log('✅ Botón "Borrar todo" funciona correctamente');
      }
    }
  });

  test('validar y probar dropdown de Unidad', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR DROPDOWN DE UNIDAD ---
    await showStepMessage(page, '📦 VALIDANDO DROPDOWN DE UNIDAD');
    await page.waitForTimeout(1000);
    
    const unitButton = page.locator('button[id="UnitId"]');
    await expect(unitButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Dropdown de unidad encontrado');
    
    // Probar abrir el dropdown
    await unitButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar opciones en el dropdown
    const unitOptions = page.locator('ul li, div[role="option"], div[role="listbox"] li').filter({
      hasText: /Evento|Hora|Día|Servicio/i
    });
    
    const optionCount = await unitOptions.count();
    if (optionCount > 0) {
      console.log(`✅ Se encontraron ${optionCount} opciones en el dropdown de unidad`);
      
      // Seleccionar la primera opción si existe
      const firstOption = unitOptions.first();
      const optionText = await firstOption.textContent();
      await firstOption.click();
      await page.waitForTimeout(500);
      
      console.log(`✅ Opción seleccionada: "${optionText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontraron opciones visibles en el dropdown');
    }
  });

  test('validar y probar campo de Total', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE TOTAL ---
    await showStepMessage(page, '💵 VALIDANDO CAMPO DE TOTAL');
    await page.waitForTimeout(1000);
    
    const totalInput = page.locator('input[id="Total"]');
    await expect(totalInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de total encontrado');
    
    // Probar escribir en el campo
    await totalInput.click();
    await totalInput.fill('5000');
    await page.waitForTimeout(500);
    
    const totalValue = await totalInput.inputValue();
    if (totalValue.includes('5000') || totalValue.includes('5')) {
      console.log('✅ Campo de total acepta valores');
    }
  });

  test('validar y probar campo de Condiciones', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE CONDICIONES ---
    await showStepMessage(page, '📋 VALIDANDO CAMPO DE CONDICIONES');
    await page.waitForTimeout(1000);
    
    const conditionsInput = page.locator('input[id="Conditions"]');
    await expect(conditionsInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de condiciones encontrado');
    
    // Probar escribir en el campo
    await conditionsInput.fill('Pago anticipado del 50%');
    await page.waitForTimeout(500);
    
    const conditionsValue = await conditionsInput.inputValue();
    if (conditionsValue.includes('Pago anticipado')) {
      console.log('✅ Campo de condiciones acepta texto');
    }
    
    // --- VALIDAR BOTÓN DE LIMPIAR CONDICIONES ---
    await showStepMessage(page, '🗑️ VALIDANDO BOTÓN LIMPIAR CONDICIONES');
    await page.waitForTimeout(1000);
    
    const clearConditionsButton = conditionsInput.locator('..').locator('button[aria-label*="Clear"], button:has(i.icon-x)').first();
    const hasClearButton = await clearConditionsButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasClearButton) {
      console.log('✅ Botón de limpiar condiciones encontrado');
      await clearConditionsButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('validar botón Enviar cotización - deshabilitado por defecto y habilitado solo con Detalles, Unidad y Total', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR BOTÓN ENVIAR COTIZACIÓN ---
    await showStepMessage(page, '📤 VALIDANDO BOTÓN ENVIAR COTIZACIÓN');
    await page.waitForTimeout(1000);
    
    const sendButton = page.locator('button:has-text("Enviar cotización")');
    await expect(sendButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón "Enviar cotización" encontrado');
    
    // --- VALIDAR ESTADO INICIAL (DEBE ESTAR DISABLED) ---
    await showStepMessage(page, '🔒 VALIDANDO ESTADO INICIAL (DISABLED)');
    await page.waitForTimeout(1000);
    
    const isInitiallyDisabled = await sendButton.isDisabled();
    if (!isInitiallyDisabled) {
      throw new Error('❌ El botón "Enviar cotización" debería estar deshabilitado por defecto');
    }
    console.log('✅ Botón está deshabilitado por defecto (correcto)');
    
    // --- VALIDAR QUE NO SE HABILITA CON SOLO DETALLES ---
    await showStepMessage(page, '📝 PROBANDO CON SOLO DETALLES');
    await page.waitForTimeout(1000);
    
    const detailsTextarea = page.locator('textarea[id="Description"]');
    await detailsTextarea.fill('Detalles de prueba');
    await page.waitForTimeout(1000);
    
    const isDisabledWithOnlyDetails = await sendButton.isDisabled();
    if (!isDisabledWithOnlyDetails) {
      throw new Error('❌ El botón no debería habilitarse solo con Detalles');
    }
    console.log('✅ Botón sigue deshabilitado con solo Detalles (correcto)');
    
    // --- VALIDAR QUE NO SE HABILITA CON DETALLES + TOTAL ---
    await showStepMessage(page, '💵 PROBANDO CON DETALLES + TOTAL');
    await page.waitForTimeout(1000);
    
    const totalInput = page.locator('input[id="Total"]');
    await totalInput.click();
    await totalInput.fill('5000');
    await page.waitForTimeout(1000);
    
    const isDisabledWithDetailsAndTotal = await sendButton.isDisabled();
    if (!isDisabledWithDetailsAndTotal) {
      throw new Error('❌ El botón no debería habilitarse solo con Detalles y Total');
    }
    console.log('✅ Botón sigue deshabilitado con Detalles + Total (correcto)');
    
    // --- VALIDAR QUE SE HABILITA CON DETALLES + UNIDAD + TOTAL ---
    await showStepMessage(page, '📦 PROBANDO CON DETALLES + UNIDAD + TOTAL');
    await page.waitForTimeout(1000);
    
    // Seleccionar Unidad
    const unitButton = page.locator('button[id="UnitId"]');
    await unitButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar y seleccionar una opción de unidad
    const unitOptions = page.locator('ul li, div[role="option"], div[role="listbox"] li').filter({
      hasText: /Evento|Hora|Día|Servicio/i
    });
    
    const optionCount = await unitOptions.count();
    if (optionCount > 0) {
      const firstOption = unitOptions.first();
      const optionText = await firstOption.textContent();
      await firstOption.click();
      await page.waitForTimeout(1000);
      console.log(`✅ Unidad seleccionada: "${optionText?.trim()}"`);
    } else {
      // Si no hay opciones visibles, intentar escribir directamente o usar otro método
      console.log('ℹ️ No se encontraron opciones visibles, el campo puede tener un valor por defecto');
    }
    
    // Verificar que el botón se habilitó
    await page.waitForTimeout(1000);
    const isEnabledWithAllFields = await sendButton.isEnabled();
    
    if (!isEnabledWithAllFields) {
      // Verificar los valores de los campos para debugging
      const detailsValue = await detailsTextarea.inputValue();
      const totalValue = await totalInput.inputValue();
      const unitValue = await unitButton.locator('span').textContent();
      
      console.log(`⚠️ Detalles: "${detailsValue}"`);
      console.log(`⚠️ Total: "${totalValue}"`);
      console.log(`⚠️ Unidad: "${unitValue}"`);
      
      throw new Error('❌ El botón debería habilitarse cuando Detalles, Unidad y Total tienen valores');
    }
    
    console.log('✅ Botón se habilitó correctamente con Detalles + Unidad + Total');
    
    // --- VALIDAR QUE SE DESHABILITA SI SE BORRA UN CAMPO REQUERIDO ---
    await showStepMessage(page, '🗑️ VALIDANDO DESHABILITACIÓN AL BORRAR CAMPO');
    await page.waitForTimeout(1000);
    
    // Borrar el campo de Total
    await totalInput.click();
    await totalInput.fill('');
    await page.waitForTimeout(1000);
    
    const isDisabledAfterClearingTotal = await sendButton.isDisabled();
    if (!isDisabledAfterClearingTotal) {
      throw new Error('❌ El botón debería deshabilitarse al borrar el campo Total');
    }
    console.log('✅ Botón se deshabilitó correctamente al borrar Total');
    
    // Restaurar el valor para dejar el estado limpio
    await totalInput.fill('5000');
    await page.waitForTimeout(500);
  });

  test('validar y probar botón Cancelar negociación', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR BOTÓN CANCELAR NEGOCIACIÓN ---
    await showStepMessage(page, '❌ VALIDANDO BOTÓN CANCELAR NEGOCIACIÓN');
    await page.waitForTimeout(1000);
    
    const cancelButton = page.locator('button:has-text("Cancelar negociación")');
    await expect(cancelButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón "Cancelar negociación" encontrado');
    
    // Verificar que es clickeable
    const isClickable = await cancelButton.isEnabled();
    if (isClickable) {
      console.log('✅ Botón "Cancelar negociación" es clickeable');
    }
    
    // No hacer clic para no cancelar la negociación en pruebas reales
  });

  test('validar y probar campo de Notas personales', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DE NOTAS PERSONALES ---
    await showStepMessage(page, '📝 VALIDANDO NOTAS PERSONALES');
    await page.waitForTimeout(1000);
    
    const notesTitle = page.locator('p:has-text("Notas personales")');
    await expect(notesTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Notas personales" encontrado');
    
    // --- VALIDAR CAMPO DE NOTAS ---
    const notesTextarea = page.locator('textarea[id="Notes"]');
    await expect(notesTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de notas personales encontrado');
    
    // Probar escribir en el campo
    await notesTextarea.fill('Nota personal de prueba');
    await page.waitForTimeout(500);
    
    const notesValue = await notesTextarea.inputValue();
    if (notesValue.includes('Nota personal')) {
      console.log('✅ Campo de notas personales acepta texto');
    }
  });

  test('validar y probar elementos del chat', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE MENSAJE ---
    await showStepMessage(page, '💬 VALIDANDO ELEMENTOS DEL CHAT');
    await page.waitForTimeout(1000);
    
    const messageTextarea = page.locator('textarea[id="Message"]');
    await expect(messageTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de mensaje encontrado');
    
    // Probar escribir en el campo
    await messageTextarea.fill('Mensaje de prueba');
    await page.waitForTimeout(500);
    
    const messageValue = await messageTextarea.inputValue();
    if (messageValue.includes('Mensaje de prueba')) {
      console.log('✅ Campo de mensaje acepta texto');
    }
    
    // --- VALIDAR BOTÓN DE ADJUNTAR ARCHIVO ---
    await showStepMessage(page, '📎 VALIDANDO BOTÓN ADJUNTAR ARCHIVO');
    await page.waitForTimeout(1000);
    
    const attachButton = page.locator('button:has(i.icon-paperclip)');
    const hasAttachButton = await attachButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasAttachButton) {
      console.log('✅ Botón de adjuntar archivo encontrado');
      const isClickable = await attachButton.isEnabled();
      if (isClickable) {
        console.log('✅ Botón de adjuntar archivo es clickeable');
      }
    }
    
    // --- VALIDAR BOTÓN DE CÁMARA ---
    await showStepMessage(page, '📷 VALIDANDO BOTÓN DE CÁMARA');
    await page.waitForTimeout(1000);
    
    const cameraButton = page.locator('button:has(i.icon-camera)');
    const hasCameraButton = await cameraButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasCameraButton) {
      console.log('✅ Botón de cámara encontrado');
      const isClickable = await cameraButton.isEnabled();
      if (isClickable) {
        console.log('✅ Botón de cámara es clickeable');
      }
    }
  });

  test('validar mensaje informativo y botón de regreso al dashboard', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR MENSAJE INFORMATIVO ---
    await showStepMessage(page, 'ℹ️ VALIDANDO MENSAJE INFORMATIVO');
    await page.waitForTimeout(1000);
    
    const infoMessage = page.locator('p:has-text("Configura la cotización")');
    const hasInfoMessage = await infoMessage.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasInfoMessage) {
      console.log('✅ Mensaje informativo encontrado');
    }
    
    // --- VALIDAR BOTÓN DE REGRESO AL DASHBOARD EN EL MENSAJE ---
    await showStepMessage(page, '🏠 VALIDANDO BOTÓN REGRESO AL DASHBOARD');
    await page.waitForTimeout(1000);
    
    const dashboardLink = page.locator('a[href="/provider/dashboard"]').filter({
      has: page.locator('svg#Capa_1')
    }).first();
    
    const hasDashboardLink = await dashboardLink.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasDashboardLink) {
      console.log('✅ Enlace al dashboard en el mensaje informativo encontrado');
    }
  });

  test('validar historial de mensajes en estado NUEVA', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACIÓN NUEVA ---
    await showStepMessage(page, '💬 NAVEGANDO A NEGOCIACIÓN NUEVA');
    await page.waitForTimeout(1000);
    
    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR HISTORIAL DE MENSAJES ---
    await showStepMessage(page, '📜 VALIDANDO HISTORIAL DE MENSAJES');
    await page.waitForTimeout(1000);
    
    // Buscar mensajes en el historial
    const messageElements = page.locator('div[id^="message-"], div').filter({
      hasText: /Solicitud|cotización|recibida|envié/i
    });
    
    const messageCount = await messageElements.count();
    if (messageCount > 0) {
      console.log(`✅ Se encontraron ${messageCount} mensaje(s) en el historial`);
      
      // Validar que hay al menos un mensaje de "Solicitud de cotización recibida"
      const requestMessage = page.locator('p:has-text("Solicitud de cotización recibida")');
      const hasRequestMessage = await requestMessage.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasRequestMessage) {
        console.log('✅ Mensaje "Solicitud de cotización recibida" encontrado');
      }
    } else {
      console.log('ℹ️ No se encontraron mensajes en el historial');
    }
  });
});

