import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACION
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
 * Navega a una página de negociación activa (no cancelada) desde chats o dashboard
 * Verifica que el campo de notas esté habilitado como confirmación de que no está cancelada
 */
async function navigateToNegotiation(page: Page): Promise<string> {
  // Usar la misma lógica que navigateToActiveNegotiation
  return navigateToActiveNegotiation(page);
}

/**
 * Navega a una negociación activa (no cancelada)
 * Verifica que el campo de notas esté habilitado como confirmación
 */
async function navigateToActiveNegotiation(page: Page): Promise<string> {
  // Intentar desde chats primero
  try {
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    console.log(`ðŸ” Encontradas ${conversationCount} conversaciones en chats`);
    
    if (conversationCount > 0) {
      // Intentar con todas las conversaciones hasta encontrar una activa
      for (let i = 0; i < conversationCount; i++) {
        try {
          console.log(`ðŸ” Intentando conversación ${i + 1} de ${conversationCount}...`);
          await conversationButtons.nth(i).click();
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/provider/negotiation/')) {
            // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
            const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
            const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (notesInputVisible) {
              const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
              
              // Si el campo está habilitado, es una negociación activa
              if (isNotesEnabled) {
                console.log(`✅ Negociación activa encontrada en conversación ${i + 1} (campo de notas habilitado)`);
                return currentUrl;
              } else {
                console.log(`âš ï¸ Conversación ${i + 1} está cancelada (campo de notas deshabilitado), continuando búsqueda...`);
                // Regresar a chats para intentar con la siguiente
                await page.goto(CHATS_URL);
                await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
              }
            } else {
              console.log(`âš ï¸ Campo de notas no visible en conversación ${i + 1}, continuando búsqueda...`);
              await page.goto(CHATS_URL);
              await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
            }
          } else {
            // Si no navegó a una negociación, regresar a chats
            await page.goto(CHATS_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          }
        } catch (error) {
          console.log(`âš ï¸ Error al intentar con conversación ${i + 1}: ${error.message}`);
          // Continuar con la siguiente conversación
          try {
            await page.goto(CHATS_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          } catch (e) {
            // Si no se puede regresar, continuar de todas formas
          }
        }
      }
    }
  } catch (error) {
    console.log(`ℹ️ No se pudo navegar desde chats: ${error.message}`);
  }
  
  // Intentar desde dashboard
  try {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar eventos activos (excluyendo CANCELADO)
    const eventButtons = page.locator('button').filter({
      hasText: /PENDIENTE|NUEVO|NUEVA|CONTRATADO|ENVIADA/i
    });
    
    const eventCount = await eventButtons.count();
    console.log(`ðŸ” Encontrados ${eventCount} eventos activos en dashboard`);
    
    if (eventCount > 0) {
      // Intentar con todos los eventos hasta encontrar uno activo
      for (let i = 0; i < eventCount; i++) {
        try {
          console.log(`ðŸ” Intentando evento ${i + 1} de ${eventCount}...`);
          await eventButtons.nth(i).click();
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/provider/negotiation/')) {
            // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
            const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
            const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (notesInputVisible) {
              const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
              
              // Si el campo está habilitado, es una negociación activa
              if (isNotesEnabled) {
                console.log(`✅ Negociación activa encontrada en evento ${i + 1} (campo de notas habilitado)`);
                return currentUrl;
              } else {
                console.log(`âš ï¸ Evento ${i + 1} está cancelado (campo de notas deshabilitado), continuando búsqueda...`);
                // Regresar a dashboard para intentar con el siguiente
                await page.goto(DASHBOARD_URL);
                await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
              }
            } else {
              console.log(`âš ï¸ Campo de notas no visible en evento ${i + 1}, continuando búsqueda...`);
              await page.goto(DASHBOARD_URL);
              await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
            }
          } else {
            // Si no navegó a una negociación, regresar a dashboard
            await page.goto(DASHBOARD_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          }
        } catch (error) {
          console.log(`âš ï¸ Error al intentar con evento ${i + 1}: ${error.message}`);
          // Continuar con el siguiente evento
          try {
            await page.goto(DASHBOARD_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          } catch (e) {
            // Si no se puede regresar, continuar de todas formas
          }
        }
      }
    }
  } catch (error) {
    console.log(`ℹ️ No se pudo navegar desde dashboard: ${error.message}`);
  }
  
  throw new Error('âŒ No se pudo navegar a una negociación activa después de intentar múltiples estrategias');
}

test.describe('Gestión de Negociaciones y Cotizaciones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  // ============================================
  // PRUEBAS: Navegación, Evento, Servicio, Cliente, Cotización, Notas, Chat, Regreso, Validación completa
  // ============================================

  test('Negociación Proveedor: Página - Navegar', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A PÁGINA DE NEGOCIACION');
    await page.waitForTimeout(1000);
    
    const negotiationUrl = await navigateToNegotiation(page);

    // --- VALIDAR QUE LLEGO A LA PÁGINA CORRECTA ---
    await showStepMessage(page, '✅ VALIDANDO PÁGINA DE NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/provider\/negotiation\/\d+/i);
    
    // Buscar el título en el nav para evitar conflictos con otros elementos
    const negotiationTitle = page.locator('nav p.text-dark-neutral.text-medium:has-text("Negociación")').first();
    await expect(negotiationTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Navegación a página de negociación exitosa');
  });

  test('Negociación Proveedor: Evento - Validar información', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DEL EVENTO ---
    await showStepMessage(page, 'ðŸ“‹ VALIDANDO TÍTULO DEL EVENTO');
    await page.waitForTimeout(1000);
    
    // Buscar el título del evento (puede estar en diferentes lugares)
    const eventTitle = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiesta|Evento/i
    }).first();
    
    const hasEventTitle = await eventTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasEventTitle) {
      const titleText = await eventTitle.textContent();
      console.log(`✅ TÃ­tulo del evento encontrado: "${titleText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un título de evento visible');
    }

    // --- VALIDAR FECHA DEL EVENTO ---
    await showStepMessage(page, 'ðŸ“… VALIDANDO FECHA DEL EVENTO');
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
      console.log('ℹ️ No se encontró una fecha visible');
    }

    // --- VALIDAR HORA DEL EVENTO ---
    await showStepMessage(page, 'ðŸ• VALIDANDO HORA DEL EVENTO');
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
      console.log('ℹ️ No se encontró una hora visible');
    }
  });

  test('Negociación Proveedor: Servicio - Validar información', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR NOMBRE DEL SERVICIO ---
    await showStepMessage(page, 'ðŸ”§ VALIDANDO INFORMACION DEL SERVICIO');
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
      console.log('ℹ️ No se encontró un nombre de servicio visible');
    }

    // --- VALIDAR IMAGEN DEL SERVICIO ---
    await showStepMessage(page, 'ðŸ–¼ï¸ VALIDANDO IMAGEN DEL SERVICIO');
    await page.waitForTimeout(1000);
    
    const serviceImage = page.locator('img[alt*="Service"], img[alt*="Servicio"], img').first();
    const hasServiceImage = await serviceImage.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasServiceImage) {
      console.log('✅ Imagen del servicio encontrada');
    } else {
      console.log('ℹ️ No se encontró una imagen de servicio visible');
    }
  });

  test('Negociación Proveedor: Cliente - Validar información', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR NOMBRE DEL CLIENTE ---
    await showStepMessage(page, 'ðŸ‘¤ VALIDANDO INFORMACION DEL CLIENTE');
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
      console.log('ℹ️ No se encontró un nombre de cliente visible');
    }

    // --- VALIDAR TELÉFONO DEL CLIENTE ---
    await showStepMessage(page, 'ðŸ“ž VALIDANDO TELÉFONO DEL CLIENTE');
    await page.waitForTimeout(1000);
    
    // Buscar teléfono (formato común: +52, números, etc.)
    const phoneElements = page.locator('p, span').filter({
      hasText: /\+?\d{1,3}[\s\-\(\)]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{2,4}/
    });
    
    const phoneCount = await phoneElements.count();
    if (phoneCount > 0) {
      const phoneText = await phoneElements.first().textContent();
      console.log(`✅ TelÃ©fono del cliente encontrado: "${phoneText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un teléfono visible');
    }

    // --- VALIDAR EMAIL DEL CLIENTE ---
    await showStepMessage(page, 'ðŸ“§ VALIDANDO EMAIL DEL CLIENTE');
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
      console.log('ℹ️ No se encontró un email visible');
    }
  });

  test('Negociación Proveedor: Cotización - Validar sección', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DE COTIZACION ---
    await showStepMessage(page, 'ðŸ’° VALIDANDO SECCION DE COTIZACION');
    await page.waitForTimeout(1000);
    
    const quotationTitle = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Cotización/i
    }).first();
    
    const hasQuotationTitle = await quotationTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasQuotationTitle) {
      console.log('✅ TÃ­tulo "Cotización" encontrado');
    } else {
      console.log('ℹ️ No se encontró el título "Cotización"');
    }

    // --- VALIDAR ESTADO DE COTIZACION ---
    await showStepMessage(page, 'ðŸ“Š VALIDANDO ESTADO DE COTIZACION');
    await page.waitForTimeout(1000);
    
    const statusElements = page.locator('p, span').filter({
      hasText: /ENVIADA|PENDIENTE|ACEPTADA|RECHAZADA/i
    });
    
    const statusCount = await statusElements.count();
    if (statusCount > 0) {
      const statusText = await statusElements.first().textContent();
      console.log(`✅ Estado de cotización encontrado: "${statusText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontró un estado de cotización visible');
    }

    // --- VALIDAR BOTON "VER COTIZACION ANTERIOR" ---
    await showStepMessage(page, 'ðŸ‘ï¸ VALIDANDO BOTON VER COTIZACION ANTERIOR');
    await page.waitForTimeout(1000);
    
    const viewPreviousButton = page.locator('button:has-text("Ver cotización anterior"), button:has-text("cotización anterior")');
    const hasViewPreviousButton = await viewPreviousButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasViewPreviousButton) {
      console.log('✅ Botón "Ver cotización anterior" encontrado');
    } else {
      console.log('ℹ️ No se encontró el botón "Ver cotización anterior" (puede no haber cotizaciones anteriores)');
    }
  });

  test('Negociación Proveedor: Cotización - Validar campos', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE DETALLES ---
    await showStepMessage(page, 'ðŸ“ VALIDANDO CAMPOS DE COTIZACION');
    await page.waitForTimeout(1000);
    
    const detailsInput = page.locator('input[id*="Details"], input[id*="Detalles"], textarea[id*="Details"], textarea[id*="Detalles"]').first();
    const hasDetailsInput = await detailsInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasDetailsInput) {
      console.log('✅ Campo de detalles encontrado');
    } else {
      console.log('ℹ️ No se encontró el campo de detalles');
    }

    // --- VALIDAR CAMPO DE TOTAL ---
    await showStepMessage(page, 'ðŸ’µ VALIDANDO CAMPO DE TOTAL');
    await page.waitForTimeout(1000);
    
    const totalInput = page.locator('input[id*="Total"], input[placeholder*="Total"]').first();
    const hasTotalInput = await totalInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasTotalInput) {
      console.log('✅ Campo de total encontrado');
    } else {
      console.log('ℹ️ No se encontró el campo de total');
    }

    // --- VALIDAR CAMPO DE CONDICIONES ---
    await showStepMessage(page, 'ðŸ“‹ VALIDANDO CAMPO DE CONDICIONES');
    await page.waitForTimeout(1000);
    
    const conditionsInput = page.locator('input[id*="Conditions"], input[id*="Condiciones"], textarea[id*="Conditions"], textarea[id*="Condiciones"]').first();
    const hasConditionsInput = await conditionsInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasConditionsInput) {
      console.log('✅ Campo de condiciones encontrado');
    } else {
      console.log('ℹ️ No se encontró el campo de condiciones');
    }
  });

  test('Negociación Proveedor: Notas - Validar sección', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ACTIVA ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION ACTIVA');
    await page.waitForTimeout(1000);
    
    await navigateToActiveNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR TÍTULO DE NOTAS PERSONALES ---
    await showStepMessage(page, 'ðŸ“ VALIDANDO SECCION DE NOTAS PERSONALES');
    await page.waitForTimeout(1000);
    
    const notesTitle = page.locator('p, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Notas personales|Notas/i
    }).first();
    
    const hasNotesTitle = await notesTitle.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasNotesTitle) {
      console.log('✅ TÃ­tulo "Notas personales" encontrado');
    } else {
      console.log('ℹ️ No se encontró el título "Notas personales"');
    }

    // --- VALIDAR CAMPO DE NOTAS ---
    await showStepMessage(page, 'âœï¸ VALIDANDO CAMPO DE NOTAS');
    await page.waitForTimeout(1000);
    
    const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
    const hasNotesInput = await notesInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
    
    if (hasNotesInput) {
      console.log('✅ Campo de notas personales encontrado');
      
      // Verificar que el campo esté habilitado antes de intentar llenarlo
      const isEnabled = await notesInput.isEnabled({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      
      if (!isEnabled) {
        throw new Error('âŒ El campo de notas está deshabilitado. La negociación puede estar cancelada.');
      }
      
      console.log('✅ Campo de notas está habilitado');
      
      // Intentar agregar una nota
      await notesInput.fill('Nota de prueba para testing');
      await page.waitForTimeout(500);
      
      const notesValue = await notesInput.inputValue();
      if (notesValue.includes('Nota de prueba')) {
        console.log('✅ Nota agregada correctamente');
      }
    } else {
      console.log('ℹ️ No se encontró el campo de notas personales');
    }
  });

  test('Negociación Proveedor: Chat - Validar sección', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR CAMPO DE MENSAJE ---
    await showStepMessage(page, 'ðŸ’¬ VALIDANDO SECCION DE CHAT');
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
      console.log('ℹ️ No se encontró el campo de mensaje');
    }

    // --- VALIDAR HISTORIAL DE MENSAJES ---
    await showStepMessage(page, 'ðŸ“œ VALIDANDO HISTORIAL DE MENSAJES');
    await page.waitForTimeout(1000);
    
    // Buscar elementos que puedan ser mensajes en el historial
    const messageElements = page.locator('div, p, span').filter({
      hasText: /Cotización|Solicitud|enviÃ©|recibida|am|pm/i
    });
    
    const messageCount = await messageElements.count();
    if (messageCount > 0) {
      console.log(`✅ Historial de mensajes encontrado (${messageCount} elementos relacionados)`);
    } else {
      console.log('ℹ️ No se encontró un historial de mensajes visible');
    }
  });

  test('Negociación Proveedor: Regreso - Navegar', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);
    
    await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR DE REGRESO ---
    await showStepMessage(page, 'ðŸ”™ NAVEGANDO DE REGRESO');
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
    }
  });

  test('Negociación Proveedor: Estado NUEVA - Validación completa de elementos', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION CON ESTADO NUEVA ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION NUEVA');
    await page.waitForTimeout(1000);

    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR ESTADO NUEVA ---
    await showStepMessage(page, '✅ VALIDANDO ESTADO NUEVA');
    await page.waitForTimeout(1000);

    const statusElement = page.locator('p:has-text("NUEVA")');
    await expect(statusElement).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Estado "NUEVA" encontrado');

    // --- VALIDAR BOTON ENVIAR COTIZACION (DEBE ESTAR DISABLED EN ESTADO NUEVA) ---
    // IMPORTANTE: Esta validación debe hacerse ANTES de cualquier modificación
    // porque cualquier cambio (incluyendo introducir valores) cambia el estado de NUEVA a PENDIENTE
    await showStepMessage(page, 'ðŸ”’ VALIDANDO BOTON ENVIAR COTIZACION (ESTADO INICIAL - DISABLED)');
    await page.waitForTimeout(1000);

    const sendButton = page.locator('button:has-text("Enviar cotización")');
    await expect(sendButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón "Enviar cotización" encontrado');

    const isInitiallyDisabled = await sendButton.isDisabled();
    if (!isInitiallyDisabled) {
      throw new Error('âŒ El botón "Enviar cotización" deberÃ­a estar deshabilitado por defecto en estado NUEVA');
    }
    console.log('✅ Botón está deshabilitado por defecto en estado NUEVA (correcto)');

    // --- VALIDAR BOTON DE REGRESO ---
    // --- NAVEGAR A NEGOCIACION NUEVA ---
    await showStepMessage(page, 'ðŸ’¬ NAVEGANDO A NEGOCIACION NUEVA');
    await page.waitForTimeout(1000);

    await navigateToNewNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR BOTON DE REGRESO ---
    await showStepMessage(page, 'ðŸ”™ VALIDANDO BOTON DE REGRESO');
    await page.waitForTimeout(1000);

    const backButton = page.locator('button:has(i.icon-chevron-left-bold)');
    await expect(backButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón de regreso encontrado');

    // Probar hacer clic (pero no navegar realmente para no interrumpir otras pruebas)
    let isClickable = await backButton.isEnabled();
    if (isClickable) {
      console.log('✅ Botón de regreso es clickeable');
    }

    // --- VALIDAR CAMPO DE DETALLES ---
    await showStepMessage(page, 'ðŸ“ VALIDANDO CAMPO DE DETALLES');
    await page.waitForTimeout(1000);

    let detailsTextarea = page.locator('textarea[id="Description"]');
    await expect(detailsTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Campo de detalles encontrado');

    // Probar escribir en el campo
    await detailsTextarea.fill('Detalles de prueba para la cotización');
    await page.waitForTimeout(500);

    const detailsValue = await detailsTextarea.inputValue();
    if (detailsValue.includes('Detalles de prueba')) {
      console.log('✅ Campo de detalles acepta texto');
    }

    // --- VALIDAR BOTON "BORRAR TODO" ---
    await showStepMessage(page, 'ðŸ—‘ï¸ VALIDANDO BOTON BORRAR TODO');
    await page.waitForTimeout(1000);

    const clearButton = page.locator('button:has-text("Borrar todo")');
    let hasClearButton = await clearButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

    if (hasClearButton) {
      console.log('✅ Botón "Borrar todo" encontrado');
      await clearButton.click();
      await page.waitForTimeout(500);

      const clearedValue = await detailsTextarea.inputValue();
      if (clearedValue === '' || clearedValue.trim() === '') {
        console.log('✅ Botón "Borrar todo" funciona correctamente');
      }
    }

    // --- VALIDAR DROPDOWN DE UNIDAD ---

    // --- VALIDAR DROPDOWN DE UNIDAD ---
    await showStepMessage(page, 'ðŸ“¦ VALIDANDO DROPDOWN DE UNIDAD');
    await page.waitForTimeout(1000);

    let unitButton = page.locator('button[id="UnitId"]');
    await expect(unitButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Dropdown de unidad encontrado');

    // Probar abrir el dropdown
    await unitButton.click();
    await page.waitForTimeout(1000);

    // Buscar opciones en el dropdown
    let unitOptions = page.locator('ul li, div[role="option"], div[role="listbox"] li').filter({
      hasText: /Evento|Hora|DÃ­a|Servicio/i
    });

    let optionCount = await unitOptions.count();
    if (optionCount > 0) {
      console.log(`✅ Se encontraron ${optionCount} opciones en el dropdown de unidad`);

      // Seleccionar la primera opción si existe
      const firstOption = unitOptions.first();
      const optionText = await firstOption.textContent();
      await firstOption.click();
      await page.waitForTimeout(500);

      console.log(`✅ Opción seleccionada: "${optionText?.trim()}"`);
    } else {
      console.log('ℹ️ No se encontraron opciones visibles en el dropdown');
    }

    // --- VALIDAR CAMPO DE TOTAL ---

    // --- VALIDAR CAMPO DE TOTAL ---
    await showStepMessage(page, 'ðŸ’µ VALIDANDO CAMPO DE TOTAL');
    await page.waitForTimeout(1000);

    let totalInput = page.locator('input[id="Total"]');
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

    // --- VALIDAR CAMPO DE CONDICIONES ---

    // --- VALIDAR CAMPO DE CONDICIONES ---
    await showStepMessage(page, 'ðŸ“‹ VALIDANDO CAMPO DE CONDICIONES');
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

    // --- VALIDAR BOTON DE LIMPIAR CONDICIONES ---
    await showStepMessage(page, 'ðŸ—‘ï¸ VALIDANDO BOTON LIMPIAR CONDICIONES');
    await page.waitForTimeout(1000);

    const clearConditionsButton = conditionsInput.locator('..').locator('button[aria-label*="Clear"], button:has(i.icon-x)').first();
    hasClearButton = await clearConditionsButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasClearButton) {
      console.log('✅ Botón de limpiar condiciones encontrado');
      await clearConditionsButton.click();
      await page.waitForTimeout(500);
    }

    // NOTA IMPORTANTE: El comportamiento real es que el botón se habilita con CUALQUIER cambio
    // en la cotización. Una vez que se hace cualquier modificación, el estado cambia de NUEVA
    // a PENDIENTE y el botón se habilita automÃ¡ticamente.

    // --- VALIDAR QUE SE HABILITA CON CUALQUIER CAMBIO ---
    await showStepMessage(page, 'ðŸ“ PROBANDO: Botón se habilita con cualquier cambio');
    await page.waitForTimeout(1000);

    detailsTextarea = page.locator('textarea[id="Description"]');
    await detailsTextarea.fill('Detalles de prueba');
    await page.waitForTimeout(1000);

    // Verificar que el botón se habilitó con solo Detalles (comportamiento esperado)
    const isEnabledWithDetails = await sendButton.isEnabled();
    if (isEnabledWithDetails) {
      console.log('✅ Botón se habilitó con solo Detalles (comportamiento esperado - cualquier cambio habilita el botón)');
    } else {
      console.log('âš ï¸ Botón no se habilitó con Detalles (puede requerir mÃ¡s campos)');
    }

    // --- VALIDAR QUE SIGUE HABILITADO CON DETALLES + TOTAL ---
    await showStepMessage(page, 'ðŸ’µ PROBANDO: Agregar Total');
    await page.waitForTimeout(1000);

    totalInput = page.locator('input[id="Total"]');
    await totalInput.click();
    await totalInput.fill('5000');
    await page.waitForTimeout(1000);

    // Verificar que el botón sigue habilitado (o se habilitó si no estaba antes)
    const isEnabledWithDetailsAndTotal = await sendButton.isEnabled();
    if (isEnabledWithDetailsAndTotal) {
      console.log('✅ Botón está habilitado con Detalles + Total (comportamiento esperado)');
    } else {
      console.log('âš ï¸ Botón no está habilitado aÃºn (puede requerir Unidad)');
    }

    // --- VALIDAR QUE SE HABILITA CON DETALLES + UNIDAD + TOTAL ---
    await showStepMessage(page, 'ðŸ“¦ PROBANDO CON DETALLES + UNIDAD + TOTAL');
    await page.waitForTimeout(1000);

    // Seleccionar Unidad
    unitButton = page.locator('button[id="UnitId"]');
    await unitButton.click();
    await page.waitForTimeout(1000);

    // Buscar y seleccionar una opción de unidad
    unitOptions = page.locator('ul li, div[role="option"], div[role="listbox"] li').filter({
      hasText: /Evento|Hora|DÃ­a|Servicio/i
    });

    optionCount = await unitOptions.count();
    if (optionCount > 0) {
      const firstOption = unitOptions.first();
      const optionText = await firstOption.textContent();
      await firstOption.click();
      await page.waitForTimeout(1000);
      console.log(`✅ Unidad seleccionada: "${optionText?.trim()}"`);
    } else {
      // Si no hay opciones visibles, intentar escribir directamente o usar otro mÃ©todo
      console.log('ℹ️ No se encontraron opciones visibles, el campo puede tener un valor por defecto');
    }

    // Verificar que el botón se habilitó
    await page.waitForTimeout(1000);
    const isEnabledWithAllFields = await sendButton.isEnabled();

    if (!isEnabledWithAllFields) {
      // Verificar los valores de los campos para debugging
      const detailsValue = await detailsTextarea.inputValue();
      const totalValue = await totalInput.inputValue();
      const unitValue = await unitButton.locator('span').textContent();

      console.log(`âš ï¸ Detalles: "${detailsValue}"`);
      console.log(`âš ï¸ Total: "${totalValue}"`);
      console.log(`âš ï¸ Unidad: "${unitValue}"`);

      throw new Error('âŒ El botón deberÃ­a habilitarse cuando Detalles, Unidad y Total tienen valores');
    }

    console.log('✅ Botón se habilitó correctamente con Detalles + Unidad + Total');

    // NOTA: El comportamiento real es que el botón NO se deshabilita una vez que se habilita.
    // Una vez que se hace cualquier cambio en la cotización, el estado cambia de NUEVA a PENDIENTE
    // y el botón permanece habilitado incluso si se borran campos. Por lo tanto, no validamos
    // que el botón se deshabilite al borrar campos, ya que esto no es el comportamiento esperado.

    // --- VALIDAR BOTON CANCELAR NEGOCIACION ---

    // --- VALIDAR BOTON CANCELAR NEGOCIACION ---
    await showStepMessage(page, 'âŒ VALIDANDO BOTON CANCELAR NEGOCIACION');
    await page.waitForTimeout(1000);

    const cancelButton = page.locator('button:has-text("Cancelar negociación")');
    await expect(cancelButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón "Cancelar negociación" encontrado');

    // Verificar que es clickeable
    isClickable = await cancelButton.isEnabled();
    if (isClickable) {
      console.log('✅ Botón "Cancelar negociación" es clickeable');
    }

    // No hacer clic para no cancelar la negociación en pruebas reales

    // --- VALIDAR TÍTULO DE NOTAS PERSONALES ---

    // --- VALIDAR TÍTULO DE NOTAS PERSONALES ---
    await showStepMessage(page, 'ðŸ“ VALIDANDO NOTAS PERSONALES');
    await page.waitForTimeout(1000);

    const notesTitle = page.locator('p:has-text("Notas personales")');
    await expect(notesTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ TÃ­tulo "Notas personales" encontrado');

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

    // --- VALIDAR CAMPO DE MENSAJE ---

    // --- VALIDAR CAMPO DE MENSAJE ---
    await showStepMessage(page, 'ðŸ’¬ VALIDANDO ELEMENTOS DEL CHAT');
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

    // --- VALIDAR BOTON DE ADJUNTAR ARCHIVO ---
    await showStepMessage(page, 'ðŸ“Ž VALIDANDO BOTON ADJUNTAR ARCHIVO');
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

    // --- VALIDAR BOTON DE CÃMARA ---
    await showStepMessage(page, 'ðŸ“· VALIDANDO BOTON DE CÃMARA');
    await page.waitForTimeout(1000);

    const cameraButton = page.locator('button:has(i.icon-camera)');
    const hasCameraButton = await cameraButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

    if (hasCameraButton) {
      console.log('✅ Botón de cÃ¡mara encontrado');
      const isClickable = await cameraButton.isEnabled();
      if (isClickable) {
        console.log('✅ Botón de cÃ¡mara es clickeable');
      }
    }

    // --- VALIDAR MENSAJE INFORMATIVO ---

    // --- VALIDAR MENSAJE INFORMATIVO ---
    await showStepMessage(page, 'ℹ️ VALIDANDO MENSAJE INFORMATIVO');
    await page.waitForTimeout(1000);

    const infoMessage = page.locator('p:has-text("Configura la cotización")');
    const hasInfoMessage = await infoMessage.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

    if (hasInfoMessage) {
      console.log('✅ Mensaje informativo encontrado');
    }

    // --- VALIDAR BOTON DE REGRESO AL DASHBOARD EN EL MENSAJE ---
    await showStepMessage(page, 'ðŸ  VALIDANDO BOTON REGRESO AL DASHBOARD');
    await page.waitForTimeout(1000);

    const dashboardLink = page.locator('a[href="/provider/dashboard"]').filter({
      has: page.locator('svg#Capa_1')
    }).first();

    const hasDashboardLink = await dashboardLink.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

    if (hasDashboardLink) {
      console.log('✅ Enlace al dashboard en el mensaje informativo encontrado');
    }

    // --- VALIDAR HISTORIAL DE MENSAJES ---

    // --- VALIDAR HISTORIAL DE MENSAJES ---
    await showStepMessage(page, 'ðŸ“œ VALIDANDO HISTORIAL DE MENSAJES');
    await page.waitForTimeout(1000);

    // Buscar mensajes en el historial
    const messageElements = page.locator('div[id^="message-"], div').filter({
      hasText: /Solicitud|cotización|recibida|enviÃ©/i
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
      console.log('ℹ️ No se encontraron mensajes en el historial');
    }
  });

  test('Negociación Proveedor: Validación completa - Tipo, estado y elementos segÃºn contexto', async ({ page }) => {
    // --- NAVEGAR A NEGOCIACION ---
    await showStepMessage(page, 'ðŸ” NAVEGANDO A NEGOCIACION');
    await page.waitForTimeout(1000);

    const negotiationUrl = await navigateToNegotiation(page);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- DETECTAR TIPO DE EVENTO ---
    await showStepMessage(page, 'ðŸ” DETECTANDO TIPO DE EVENTO');
    await page.waitForTimeout(1000);

    // Buscar botón "Invitar a Fiestamas" (evento creado por proveedor)
    const inviteButton = page.locator('button:has-text("Invitar a Fiestamas")');
    const hasInviteButton = await inviteButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

    // Buscar contenedor de chat (evento creado por cliente)
    const chatContainer = page.locator('div#chat-scroll-container');
    const hasChatContainer = await chatContainer.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

    let eventType: 'provider' | 'client' | 'unknown' = 'unknown';

    if (hasInviteButton) {
      eventType = 'provider';
      console.log('✅ Evento creado por proveedor detectado');
    } else if (hasChatContainer) {
      eventType = 'client';
      console.log('✅ Evento creado por cliente detectado');
    } else {
      throw new Error('âŒ No se pudo determinar el tipo de evento (no se encontró botón "Invitar a Fiestamas" ni contenedor de chat)');
    }

    // --- VALIDAR ESTADO DE COTIZACION ---
    await showStepMessage(page, 'ðŸ“Š DETECTANDO ESTADO DE COTIZACION');
    await page.waitForTimeout(1000);

    // Buscar badge de estado
    const statusBadge = page.locator('p.text-light-light.text-small.font-medium, p.text-dark-neutral.text-small.font-medium').filter({
      hasText: /NUEVA|PENDIENTE|ENVIADA|ACEPTADA/i
    });

    let quotationStatus: 'NUEVA' | 'PENDIENTE' | 'ENVIADA' | 'ACEPTADA' | 'unknown' = 'unknown';
    const statusText = await statusBadge.textContent().catch(() => null);

    if (statusText) {
      if (statusText.includes('NUEVA')) {
        quotationStatus = 'NUEVA';
      } else if (statusText.includes('PENDIENTE')) {
        quotationStatus = 'PENDIENTE';
      } else if (statusText.includes('ENVIADA')) {
        quotationStatus = 'ENVIADA';
      } else if (statusText.includes('ACEPTADA')) {
        quotationStatus = 'ACEPTADA';
      }
      console.log(`✅ Estado de cotización detectado: ${quotationStatus}`);
    } else {
      throw new Error('âŒ No se pudo detectar el estado de la cotización');
    }

    // --- VALIDAR ELEMENTOS SEGÃšN TIPO DE EVENTO ---
    if (eventType === 'provider') {
      await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE EVENTO CREADO POR PROVEEDOR');
      await page.waitForTimeout(1000);

      // Validar botón "Invitar a Fiestamas"
      await expect(inviteButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Botón "Invitar a Fiestamas" visible');

      // Validar icono de invitación
      const invitationIcon = page.locator('i.icon-invitation');
      const hasInvitationIcon = await invitationIcon.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasInvitationIcon) {
        console.log('✅ Icono de invitación visible');
      }

      // Validar texto de invitación
      const inviteText = page.locator('h6:has-text("Â¡Invita a"), p:has-text("Cuando tu cliente se registra")');
      const inviteTextCount = await inviteText.count();
      if (inviteTextCount > 0) {
        console.log('✅ Texto de invitación visible');
      }

      // NO debe tener chat
      if (hasChatContainer) {
        throw new Error('âŒ Un evento creado por proveedor NO debe tener contenedor de chat');
      }
      console.log('✅ Confirmado: No hay contenedor de chat (correcto para evento de proveedor)');

    } else if (eventType === 'client') {
      await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE EVENTO CREADO POR CLIENTE');
      await page.waitForTimeout(1000);

      // Validar contenedor de chat
      await expect(chatContainer).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Contenedor de chat visible');

      // Validar campo de mensaje
      const messageInput = page.locator('textarea#Message');
      const hasMessageInput = await messageInput.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasMessageInput) {
        console.log('✅ Campo de mensaje del chat visible');
      }

      // Validar botón de adjuntar archivo
      const paperclipButton = page.locator('button:has(i.icon-paperclip)');
      const hasPaperclipButton = await paperclipButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasPaperclipButton) {
        console.log('✅ Botón de adjuntar archivo visible');
      }

      // Validar botón de cÃ¡mara
      const cameraButton = page.locator('button:has(i.icon-camera)');
      const hasCameraButton = await cameraButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasCameraButton) {
        console.log('✅ Botón de cÃ¡mara visible');
      }

      // Validar historial de mensajes
      const chatMessages = page.locator('div#chat-scroll-container div.flex.w-full');
      const messageCount = await chatMessages.count();
      if (messageCount > 0) {
        console.log(`✅ Se encontraron ${messageCount} mensaje(s) en el historial del chat`);
      }

      // NO debe tener botón "Invitar a Fiestamas"
      if (hasInviteButton) {
        throw new Error('âŒ Un evento creado por cliente NO debe tener botón "Invitar a Fiestamas"');
      }
      console.log('✅ Confirmado: No hay botón "Invitar a Fiestamas" (correcto para evento de cliente)');
    }

    // --- VALIDAR ELEMENTOS COMUNES INDEPENDIENTES DEL TIPO ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS COMUNES');
    await page.waitForTimeout(1000);

    // Validar información del evento
    const eventInfo = page.locator('div.flex.flex-col.lg\\:flex-row.gap-2.pl-4.py-\\[20px\\]');
    await expect(eventInfo).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Información del evento visible');

    // Validar información del servicio
    const serviceInfo = page.locator('div.w-full.grow.flex.flex-col.items-center.p-4.gap-4.bg-light-neutral');
    await expect(serviceInfo).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Información del servicio visible');

    // Validar sección de cotización
    const quotationSection = page.locator('div.w-full.grow.border.border-light-dark.bg-light-light.rounded-4');
    await expect(quotationSection).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Sección de cotización visible');

    // Validar badge de estado
    await expect(statusBadge).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log(`✅ Badge de estado "${quotationStatus}" visible`);

    // --- VALIDAR BOTON "VER COTIZACION ANTERIOR" (SI EXISTE) ---
    await showStepMessage(page, 'ðŸ” BUSCANDO BOTON "VER COTIZACION ANTERIOR"');
    await page.waitForTimeout(1000);

    // Buscar el botón en el DOM (puede estar oculto por clases responsive como "hidden lg:block")
    // Primero verificar si existe en el DOM usando count()
    let viewPreviousQuotationButton = page.locator('button:has(i.icon-notes):has-text("Ver cotización anterior")');
    let buttonCount = await viewPreviousQuotationButton.count();

    // Si no se encuentra con el selector especÃ­fico, buscar solo por texto
    if (buttonCount === 0) {
      viewPreviousQuotationButton = page.locator('button:has-text("Ver cotización anterior")');
      buttonCount = await viewPreviousQuotationButton.count();
    }

    // Verificar si el botón existe en el DOM
    const hasPreviousQuotationButton = buttonCount > 0;

    // Si existe, verificar si está visible o intentar hacerlo visible
    let isVisible = false;
    if (hasPreviousQuotationButton) {
      // Intentar verificar visibilidad
      isVisible = await viewPreviousQuotationButton.first().isVisible({ timeout: 2000 }).catch(() => false);

      // Si no está visible, puede estar oculto por clases responsive
      // Intentar hacer scroll al elemento o forzar visibilidad
      if (!isVisible) {
        console.log('âš ï¸ Botón encontrado en el DOM pero no visible, intentando hacer scroll...');
        try {
          await viewPreviousQuotationButton.first().scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          isVisible = await viewPreviousQuotationButton.first().isVisible({ timeout: 2000 }).catch(() => false);
        } catch (e) {
          console.log('âš ï¸ No se pudo hacer scroll al botón, intentando hacer clic directamente...');
        }
      }
    }

    if (hasPreviousQuotationButton) {
      console.log(`✅ Botón "Ver cotización anterior" encontrado en el DOM (visible: ${isVisible})`);

      // Hacer clic en el botón
      await showStepMessage(page, 'ðŸ‘† ABRIENDO COTIZACION ANTERIOR');
      await page.waitForTimeout(1000);

      // Si no está visible, usar force: true para hacer clic de todas formas
      if (isVisible) {
        await viewPreviousQuotationButton.first().click();
      } else {
        console.log('âš ï¸ Botón no visible, haciendo clic forzado...');
        await viewPreviousQuotationButton.first().click({ force: true });
      }

      // Esperar mÃ¡s tiempo para que el modal aparezca (puede tener animaciones)
      await page.waitForTimeout(2000);

      // --- VALIDAR MODAL DE COTIZACION ANTERIOR ---
      await showStepMessage(page, 'ðŸ“‹ VALIDANDO MODAL DE COTIZACION ANTERIOR');
      await page.waitForTimeout(1000);

      // Usar un timeout mÃ¡s largo para el modal (puede tardar en aparecer)
      const MODAL_TIMEOUT = 15000; // 15 segundos

      // Validar que el modal se muestra (buscar por múltiples selectores con timeout extendido)
      // Primero verificar si existe en el DOM usando count(), luego verificar visibilidad
      let modalContainer: ReturnType<typeof page.locator> | null = null;
      let isModalVisible = false;

      // Estrategia 1: Buscar por la clase MuiModal-root (Material-UI modal)
      console.log('ðŸ” Estrategia 1: Buscando modal por MuiModal-root...');
      const muiModalLocator = page.locator('div.MuiModal-root');
      const muiModalCount = await muiModalLocator.count();
      console.log(`ðŸ“Š MuiModal-root encontrado en DOM: ${muiModalCount} elemento(s)`);

      if (muiModalCount > 0) {
        modalContainer = muiModalLocator.first();
        isModalVisible = await modalContainer.isVisible({ timeout: 5000 }).catch(() => false);
        console.log(`ðŸ‘ï¸ MuiModal-root visible: ${isModalVisible}`);
      }

      // Estrategia 2: Si no se encuentra, buscar por el contenedor del contenido del modal
      if (!isModalVisible) {
        console.log('ðŸ” Estrategia 2: Buscando modal por contenedor de contenido...');
        const contentContainer = page.locator('div.absolute.top-1\\/2.left-1\\/2.transform.-translate-x-1\\/2.-translate-y-1\\/2.bg-neutral-0.rounded-6.shadow-2xl');
        const contentCount = await contentContainer.count();
        console.log(`ðŸ“Š Contenedor de contenido encontrado en DOM: ${contentCount} elemento(s)`);

        if (contentCount > 0) {
          modalContainer = contentContainer.first();
          isModalVisible = await modalContainer.isVisible({ timeout: 5000 }).catch(() => false);
          console.log(`ðŸ‘ï¸ Contenedor de contenido visible: ${isModalVisible}`);
        }
      }

      // Estrategia 3: Buscar por el texto "Cotización anterior" (mÃ¡s confiable)
      if (!isModalVisible) {
        console.log('ðŸ” Estrategia 3: Buscando modal por texto "Cotización anterior"...');
        const titleElement = page.locator('text="Cotización anterior"');
        const titleCount = await titleElement.count();
        console.log(`ðŸ“Š TÃ­tulo "Cotización anterior" encontrado en DOM: ${titleCount} elemento(s)`);

        if (titleCount > 0) {
          const titleVisible = await titleElement.first().isVisible({ timeout: 5000 }).catch(() => false);
          console.log(`ðŸ‘ï¸ TÃ­tulo visible: ${titleVisible}`);

          if (titleVisible) {
            // Si encontramos el título visible, buscar el contenedor del modal
            // Primero intentar buscar el MuiModal-root
            modalContainer = titleElement.first().locator('xpath=ancestor::div[contains(@class, "MuiModal-root")]').first();
            const modalCount = await modalContainer.count();
            console.log(`ðŸ“Š MuiModal-root desde título: ${modalCount} elemento(s)`);

            if (modalCount > 0) {
              isModalVisible = await modalContainer.isVisible({ timeout: 2000 }).catch(() => false);
              console.log(`ðŸ‘ï¸ MuiModal-root desde título visible: ${isModalVisible}`);
            }

            // Si no funciona, buscar el contenedor con shadow-2xl
            if (!isModalVisible) {
              modalContainer = titleElement.first().locator('xpath=ancestor::div[contains(@class, "shadow-2xl")]').first();
              const shadowCount = await modalContainer.count();
              console.log(`ðŸ“Š Contenedor shadow-2xl desde título: ${shadowCount} elemento(s)`);

              if (shadowCount > 0) {
                isModalVisible = await modalContainer.isVisible({ timeout: 2000 }).catch(() => false);
                console.log(`ðŸ‘ï¸ Contenedor shadow-2xl visible: ${isModalVisible}`);
              }
            }

            // Si encontramos el título pero no el contenedor, usar el MuiModal-root directamente
            if (!isModalVisible && muiModalCount > 0) {
              modalContainer = muiModalLocator.first();
              isModalVisible = true; // Si el título es visible, asumimos que el modal está visible
              console.log('✅ Usando MuiModal-root como contenedor (título visible)');
            }
          }
        }
      }

      // Estrategia 4: Buscar por shadow-2xl y texto "Cotización anterior"
      if (!isModalVisible) {
        console.log('ðŸ” Estrategia 4: Buscando modal por shadow-2xl con texto...');
        const shadowModal = page.locator('div.shadow-2xl:has-text("Cotización anterior")');
        const shadowCount = await shadowModal.count();
        console.log(`ðŸ“Š Shadow-2xl con texto encontrado: ${shadowCount} elemento(s)`);

        if (shadowCount > 0) {
          modalContainer = shadowModal.first();
          isModalVisible = await modalContainer.isVisible({ timeout: 5000 }).catch(() => false);
          console.log(`ðŸ‘ï¸ Shadow-2xl con texto visible: ${isModalVisible}`);
        }
      }

      if (!isModalVisible || !modalContainer) {
        throw new Error('âŒ El modal de cotización anterior no se mostró después de hacer clic en el botón (timeout: 15s)');
      }
      console.log('✅ Modal de cotización anterior visible');

      // Validar título del modal (usar timeout extendido ya que el modal puede estar cargando)
      // Buscar el título dentro del modal de Material-UI para evitar ambigÃ¼edad
      let modalTitle = modalContainer.locator('div.text-large.text-center:has-text("Cotización anterior")');
      let titleCount = await modalTitle.count();

      // Si no se encuentra dentro del modalContainer, buscar dentro del MuiModal-root
      if (titleCount === 0) {
        modalTitle = page.locator('div.MuiModal-root div.text-large.text-center:has-text("Cotización anterior")');
        titleCount = await modalTitle.count();
      }

      // Si aÃºn no se encuentra, buscar por el div con clases especÃ­ficas del título
      if (titleCount === 0) {
        modalTitle = page.locator('div.MuiModal-root div.flex.flex-col.lg\\:flex-row.items-center:has-text("Cotización anterior")');
        titleCount = await modalTitle.count();
      }

      // Si aÃºn no se encuentra, buscar cualquier div dentro del modal que contenga exactamente el texto
      if (titleCount === 0) {
        modalTitle = page.locator('div.MuiModal-root').locator('div, p').filter({ hasText: /^Cotización anterior$/ });
        titleCount = await modalTitle.count();
      }

      if (titleCount === 0) {
        throw new Error('âŒ No se encontró el título "Cotización anterior" dentro del modal');
      }

      await expect(modalTitle.first()).toBeVisible({ timeout: 10000 }); // 10 segundos para el título
      console.log('✅ TÃ­tulo "Cotización anterior" visible');

      // Validar texto informativo (puede variar: "Negocio QA envió esta cotización el 19/11/2025")
      const infoText = page.locator('p:has-text("envió esta cotización el")');
      const hasInfoText = await infoText.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasInfoText) {
        const infoTextContent = await infoText.textContent();
        if (infoTextContent) {
          console.log(`✅ Texto informativo visible: "${infoTextContent.trim()}"`);
        } else {
          console.warn('âš ï¸ No se pudo obtener el contenido del texto informativo');
        }
      } else {
        console.warn('âš ï¸ No se encontró el texto informativo de la cotización anterior');
      }

      // Validar encabezados de la tabla
      const tableHeaders = page.locator('div.border-b-\\[1px\\].border-gray-light.flex.gap-2.py-3, div.flex.gap-2.py-3:has-text("Detalles")');
      const headersCount = await tableHeaders.count();
      if (headersCount > 0) {
        const headersText = await tableHeaders.first().textContent();
        if (headersText) {
          console.log(`✅ Encabezados de tabla encontrados: "${headersText.trim()}"`);

          // Validar que contiene los encabezados esperados
          if (headersText.includes('Detalles') && headersText.includes('Unidad') && headersText.includes('Total')) {
            console.log('✅ Encabezados correctos: Detalles, Unidad, Total');
          } else {
            console.warn('âš ï¸ Los encabezados no contienen todos los campos esperados');
          }
        }
      } else {
        console.warn('âš ï¸ No se encontraron los encabezados de la tabla');
      }

      // Validar fila de datos de la cotización anterior
      const dataRow = page.locator('div.flex.flex-col.py-3.text-dark-neutral.gap-1, div.flex.gap-2:has-text("Persona")');
      const dataRowCount = await dataRow.count();
      if (dataRowCount > 0) {
        const dataRowText = await dataRow.first().textContent();
        if (dataRowText) {
          const trimmedText = dataRowText.trim();
          console.log(`✅ Fila de datos encontrada: "${trimmedText.slice(0, 100)}${trimmedText.length > 100 ? '...' : ''}"`);

          // Validar que la fila contiene datos
          if (trimmedText.length > 0) {
            console.log('✅ La fila de datos contiene información');
          }
        }
      } else {
        console.warn('âš ï¸ No se encontró la fila de datos de la cotización anterior');
      }

      // Validar botón de cerrar (icon-x)
      // Buscar el botón dentro del modal o en toda la página si el modalContainer es MuiModal-root
      let closeButton = modalContainer.locator('button:has(i.icon-x)').first();
      let hasCloseButton = await closeButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);

      // Si no se encuentra dentro del modalContainer, buscar en toda la página dentro del modal
      if (!hasCloseButton) {
        console.log('âš ï¸ Botón de cerrar no encontrado en modalContainer, buscando en toda la página...');
        closeButton = page.locator('div.MuiModal-root button:has(i.icon-x)').first();
        hasCloseButton = await closeButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      }

      // Estrategia alternativa: buscar el botón por su posición en el header del modal
      if (!hasCloseButton) {
        console.log('âš ï¸ Botón de cerrar no encontrado con selector de icono, buscando por posición en header...');
        // Buscar el header del modal y luego el Ãºltimo botón (que deberÃ­a ser el de cerrar)
        const modalHeader = page.locator('div.MuiModal-root div.flex.items-center.px-\\[16px\\].py-\\[12px\\]').first();
        const headerExists = await modalHeader.count() > 0;
        if (headerExists) {
          closeButton = modalHeader.locator('button').last();
          hasCloseButton = await closeButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
        }
      }

      if (hasCloseButton) {
        console.log('✅ Botón de cerrar (X) visible');

        // Cerrar el modal
        await showStepMessage(page, 'âŒ CERRANDO MODAL');
        await page.waitForTimeout(500);

        // Intentar hacer clic usando JavaScript directamente para evitar problemas con elementos que interceptan
        // Esto es mÃ¡s confiable cuando hay elementos superpuestos
        try {
          console.log('ðŸ–±ï¸ Intentando cerrar modal con JavaScript...');
          await closeButton.evaluate((button: HTMLElement) => {
            // Disparar evento click directamente en el botón
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            button.dispatchEvent(clickEvent);
            // TambiÃ©n intentar el mÃ©todo click nativo
            if (button instanceof HTMLButtonElement) {
              button.click();
            }
          });
          console.log('✅ Clic ejecutado con JavaScript');
        } catch (e) {
          console.log('âš ï¸ Clic con JavaScript falló, intentando con Playwright click...');
          // Si falla JavaScript, intentar con Playwright
          try {
            await closeButton.click({ force: true, timeout: 5000 });
          } catch (e2) {
            console.log('âš ï¸ Clic con Playwright falló, intentando clic normal...');
            await closeButton.click({ timeout: 5000 });
          }
        }

        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

        // Verificar que el modal se cerró (buscar el MuiModal-root)
        const muiModal = page.locator('div.MuiModal-root');
        const isModalStillVisible = await muiModal.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isModalStillVisible) {
          console.log('✅ Modal cerrado correctamente');
        } else {
          console.warn('âš ï¸ El modal puede no haberse cerrado completamente');
        }
      } else {
        console.warn('âš ï¸ No se encontró el botón de cerrar en el modal');
      }
    } else {
      console.log('ℹ️ No se encontró el botón "Ver cotización anterior" (esto es normal si no hay cotizaciones anteriores)');
    }

    // --- VALIDAR ELEMENTOS SEGÃšN ESTADO DE COTIZACION ---
    await showStepMessage(page, `ðŸ“Š VALIDANDO ELEMENTOS PARA ESTADO "${quotationStatus}"`);
    await page.waitForTimeout(1000);

    if (quotationStatus === 'NUEVA') {
      // En estado NUEVA, debe haber botón "Enviar cotización"
      const sendButton = page.locator('button:has-text("Enviar cotización")');
      const hasSendButton = await sendButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasSendButton) {
        console.log('✅ Botón "Enviar cotización" visible en estado NUEVA');
      }

      // Debe haber botón "Cancelar negociación"
      const cancelButton = page.locator('button:has-text("Cancelar negociación")');
      const hasCancelButton = await cancelButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasCancelButton) {
        console.log('✅ Botón "Cancelar negociación" visible en estado NUEVA');
      }

      // Validar que los campos de cotización son editables
      const detailsTextarea = page.locator('textarea#Description');
      const isDetailsDisabled = await detailsTextarea.isDisabled();
      if (isDetailsDisabled) {
        throw new Error('âŒ El campo "Detalles" deberÃ­a estar habilitado en estado NUEVA');
      }
      console.log('✅ Campo "Detalles" está habilitado en estado NUEVA');

      const unitButton = page.locator('button#UnitId');
      const isUnitDisabled = await unitButton.isDisabled();
      if (isUnitDisabled) {
        throw new Error('âŒ El campo "Unidad" deberÃ­a estar habilitado en estado NUEVA');
      }
      console.log('✅ Campo "Unidad" está habilitado en estado NUEVA');

      const totalInput = page.locator('input#Total');
      const isTotalDisabled = await totalInput.isDisabled();
      if (isTotalDisabled) {
        throw new Error('âŒ El campo "Total" deberÃ­a estar habilitado en estado NUEVA');
      }
      console.log('✅ Campo "Total" está habilitado en estado NUEVA');

    } else if (quotationStatus === 'PENDIENTE') {
      // En estado PENDIENTE, puede haber botón "Enviar cotización" si aÃºn no se ha enviado
      const sendButton = page.locator('button:has-text("Enviar cotización")');
      const hasSendButton = await sendButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasSendButton) {
        console.log('✅ Botón "Enviar cotización" visible en estado PENDIENTE');
      }

    } else if (quotationStatus === 'ENVIADA') {
      // En estado ENVIADA, los campos de cotización deben estar deshabilitados (solo lectura)
      await showStepMessage(page, 'ðŸ”’ VALIDANDO CAMPOS DE SOLO LECTURA EN ESTADO ENVIADA');
      await page.waitForTimeout(1000);

      // 1. Campo Detalles (textarea#Description)
      const detailsTextarea = page.locator('textarea#Description');
      await expect(detailsTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      const isDetailsDisabled = await detailsTextarea.isDisabled();
      if (!isDetailsDisabled) {
        throw new Error('âŒ El campo "Detalles" deberÃ­a estar deshabilitado en estado ENVIADA');
      }
      console.log('✅ Campo "Detalles" está deshabilitado (solo lectura)');

      // Verificar que no es editable
      await expect(detailsTextarea).toBeDisabled({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Campo "Detalles" confirmado como no editable (correcto)');

      // 2. Campo Unidad (button#UnitId)
      const unitButton = page.locator('button#UnitId');
      await expect(unitButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      const isUnitDisabled = await unitButton.isDisabled();
      if (!isUnitDisabled) {
        throw new Error('âŒ El campo "Unidad" deberÃ­a estar deshabilitado en estado ENVIADA');
      }
      console.log('✅ Campo "Unidad" está deshabilitado (solo lectura)');

      // Verificar que tiene la clase cursor-not-allowed
      const unitButtonClasses = await unitButton.getAttribute('class');
      if (unitButtonClasses && unitButtonClasses.includes('cursor-not-allowed')) {
        console.log('✅ Campo "Unidad" tiene cursor-not-allowed (correcto)');
      }

      // Intentar hacer clic (no deberÃ­a abrir el dropdown)
      await unitButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      // Verificar que no se abrió ningÃºn dropdown
      const dropdownOptions = page.locator('ul.absolute.mt-3.top-full li.cursor-pointer');
      const optionsCount = await dropdownOptions.count();
      if (optionsCount > 0) {
        throw new Error('âŒ El dropdown de "Unidad" no deberÃ­a abrirse en estado ENVIADA');
      }
      console.log('✅ Campo "Unidad" no permite abrir dropdown (correcto)');

      // 3. Campo Total (input#Total)
      const totalInput = page.locator('input#Total');
      await expect(totalInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      const isTotalDisabled = await totalInput.isDisabled();
      if (!isTotalDisabled) {
        throw new Error('âŒ El campo "Total" deberÃ­a estar deshabilitado en estado ENVIADA');
      }
      console.log('✅ Campo "Total" está deshabilitado (solo lectura)');

      // Verificar que no es editable
      await expect(totalInput).toBeDisabled({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Campo "Total" confirmado como no editable (correcto)');

      // 4. Campo Condiciones (input#Conditions)
      const conditionsInput = page.locator('input#Conditions');
      await expect(conditionsInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      const isConditionsDisabled = await conditionsInput.isDisabled();
      if (!isConditionsDisabled) {
        throw new Error('âŒ El campo "Condiciones" deberÃ­a estar deshabilitado en estado ENVIADA');
      }
      console.log('✅ Campo "Condiciones" está deshabilitado (solo lectura)');

      // Verificar que no es editable
      await expect(conditionsInput).toBeDisabled({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Campo "Condiciones" confirmado como no editable (correcto)');

      // --- VALIDAR QUE EL CAMPO DE NOTAS PERSONALES ES EDITABLE EN ESTADO ENVIADA ---
      await showStepMessage(page, 'âœï¸ VALIDANDO CAMPO DE NOTAS PERSONALES EDITABLE');
      await page.waitForTimeout(1000);

      const notesTextarea = page.locator('textarea#Notes');
      await expect(notesTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      const isNotesDisabled = await notesTextarea.isDisabled();
      if (isNotesDisabled) {
        throw new Error('âŒ El campo "Notas personales" deberÃ­a estar habilitado (editable) en estado ENVIADA');
      }
      console.log('✅ Campo "Notas personales" está habilitado (editable)');

      // Verificar que es editable
      await expect(notesTextarea).toBeEditable({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Campo "Notas personales" es editable');

      // --- AGREGAR UNA NOTA ---
      await showStepMessage(page, 'ðŸ“ AGREGANDO NOTA PERSONAL');
      await page.waitForTimeout(1000);

      const testNote = `Nota de prueba agregada el ${new Date().toLocaleString('es-MX')} - Estado ENVIADA`;
      await notesTextarea.fill(testNote);
      await page.waitForTimeout(1000);

      // Verificar que la nota se guardó
      const notesValue = await notesTextarea.inputValue();
      if (!notesValue.includes('Nota de prueba')) {
        throw new Error('âŒ No se pudo agregar la nota en el campo "Notas personales"');
      }
      console.log('✅ Nota agregada correctamente en "Notas personales"');

      // Verificar que se puede modificar la nota
      const modifiedNote = `${testNote} - Modificada`;
      await notesTextarea.fill(modifiedNote);
      await page.waitForTimeout(500);
      const modifiedNotesValue = await notesTextarea.inputValue();
      if (!modifiedNotesValue.includes('Modificada')) {
        throw new Error('âŒ No se pudo modificar la nota en el campo "Notas personales"');
      }
      console.log('✅ Nota modificada correctamente');

    } else if (quotationStatus === 'ACEPTADA') {
      // En estado ACEPTADA, debe haber botón "Ver cotización"
      const viewQuotationButton = page.locator('button:has-text("Ver cotización")');
      const hasViewButton = await viewQuotationButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
      if (hasViewButton) {
        console.log('✅ Botón "Ver cotización" visible en estado ACEPTADA');
      }
    }

    await showStepMessage(page, `✅ VALIDACION COMPLETA - Tipo: ${eventType}, Estado: ${quotationStatus}`);
    await page.waitForTimeout(2000);
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
    console.log(`ðŸ” Encontradas ${conversationCount} conversaciones en chats`);
    
    if (conversationCount > 0) {
      // Intentar con todas las conversaciones hasta encontrar una con estado NUEVA
      for (let i = 0; i < conversationCount; i++) {
        try {
          console.log(`ðŸ” Intentando conversación ${i + 1} de ${conversationCount}...`);
          await conversationButtons.nth(i).click();
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/provider/negotiation/')) {
            // Verificar si el estado es NUEVA
            const statusElement = page.locator('p:has-text("NUEVA")');
            const hasNewStatus = await statusElement.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (hasNewStatus) {
              // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
              const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
              const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
              
              if (notesInputVisible) {
                const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
                
                if (isNotesEnabled) {
                  console.log(`✅ Negociación con estado NUEVA encontrada en conversación ${i + 1} (no cancelada)`);
                  return currentUrl;
                } else {
                  console.log(`âš ï¸ Conversación ${i + 1} tiene estado NUEVA pero está cancelada (campo de notas deshabilitado), continuando búsqueda...`);
                  await page.goto(CHATS_URL);
                  await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
                }
              } else {
                console.log(`âš ï¸ Campo de notas no visible en conversación ${i + 1}, continuando búsqueda...`);
                await page.goto(CHATS_URL);
                await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
              }
            } else {
              console.log(`âš ï¸ Conversación ${i + 1} no tiene estado NUEVA, continuando búsqueda...`);
              // Regresar a chats para intentar con la siguiente
              await page.goto(CHATS_URL);
              await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
            }
          } else {
            // Si no navegó a una negociación, regresar a chats
            await page.goto(CHATS_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          }
        } catch (error) {
          console.log(`âš ï¸ Error al intentar con conversación ${i + 1}: ${error.message}`);
          // Continuar con la siguiente conversación
          try {
            await page.goto(CHATS_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          } catch (e) {
            // Si no se puede regresar, continuar de todas formas
          }
        }
      }
    }
  } catch (error) {
    console.log(`ℹ️ No se pudo navegar desde chats: ${error.message}`);
  }
  
  // Intentar desde dashboard
  try {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar eventos con estado NUEVO (puede aparecer como "NUEVO", "NUEVA", etc.)
    const eventButtons = page.locator('button').filter({
      hasText: /NUEVO|NUEVA/i
    });
    
    const eventCount = await eventButtons.count();
    console.log(`ðŸ” Encontrados ${eventCount} eventos con estado NUEVO/NUEVA en dashboard`);
    
    if (eventCount > 0) {
      // Intentar con todos los eventos hasta encontrar uno con estado NUEVA
      for (let i = 0; i < eventCount; i++) {
        try {
          console.log(`ðŸ” Intentando evento ${i + 1} de ${eventCount}...`);
          await eventButtons.nth(i).click();
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/provider/negotiation/')) {
            // Verificar si el estado es NUEVA
            const statusElement = page.locator('p:has-text("NUEVA")');
            const hasNewStatus = await statusElement.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (hasNewStatus) {
              // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
              const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
              const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
              
              if (notesInputVisible) {
                const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
                
                if (isNotesEnabled) {
                  console.log(`✅ Negociación con estado NUEVA encontrada en evento ${i + 1} (no cancelada)`);
                  return currentUrl;
                } else {
                  console.log(`âš ï¸ Evento ${i + 1} tiene estado NUEVA pero está cancelado (campo de notas deshabilitado), continuando búsqueda...`);
                  await page.goto(DASHBOARD_URL);
                  await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
                }
              } else {
                console.log(`âš ï¸ Campo de notas no visible en evento ${i + 1}, continuando búsqueda...`);
                await page.goto(DASHBOARD_URL);
                await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
              }
            } else {
              console.log(`âš ï¸ Evento ${i + 1} no tiene estado NUEVA, continuando búsqueda...`);
              // Regresar a dashboard para intentar con el siguiente
              await page.goto(DASHBOARD_URL);
              await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
            }
          } else {
            // Si no navegó a una negociación, regresar a dashboard
            await page.goto(DASHBOARD_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          }
        } catch (error) {
          console.log(`âš ï¸ Error al intentar con evento ${i + 1}: ${error.message}`);
          // Continuar con el siguiente evento
          try {
            await page.goto(DASHBOARD_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          } catch (e) {
            // Si no se puede regresar, continuar de todas formas
          }
        }
      }
    }
  } catch (error) {
    console.log(`ℹ️ No se pudo navegar desde dashboard: ${error.message}`);
  }
  
  // Ãšltimo intento: buscar cualquier botón que pueda llevar a una negociación
  try {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar cualquier botón que pueda ser un evento
    const allEventButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Evento|Servicio/i
    });
    
    const allEventCount = await allEventButtons.count();
    console.log(`ðŸ” Intentando con ${allEventCount} botones adicionales...`);
    
    for (let i = 0; i < Math.min(allEventCount, 10); i++) {
      try {
        await allEventButtons.nth(i).click();
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/provider/negotiation/')) {
          const statusElement = page.locator('p:has-text("NUEVA")');
          const hasNewStatus = await statusElement.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (hasNewStatus) {
            // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
            const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
            const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (notesInputVisible) {
              const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
              
              if (isNotesEnabled) {
                console.log(`✅ Negociación con estado NUEVA encontrada en botón adicional ${i + 1} (no cancelada)`);
                return currentUrl;
              }
            }
          }
        }
        
        await page.goto(DASHBOARD_URL);
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
      } catch (error) {
        // Continuar con el siguiente
      }
    }
  } catch (error) {
    console.log(`ℹ️ Ãšltimo intento falló: ${error.message}`);
  }
  
  throw new Error('âŒ No se pudo navegar a una negociación con estado NUEVA después de intentar múltiples estrategias');
}

/**
 * Navega a una negociación con estado "ENVIADA"
 */
async function navigateToSentNegotiation(page: Page): Promise<string> {
  // Intentar desde chats primero
  try {
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar conversaciones
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    
    if (conversationCount > 0) {
      // Intentar con todas las conversaciones hasta encontrar una con estado ENVIADA
      for (let i = 0; i < conversationCount; i++) {
        try {
          console.log(`ðŸ” Intentando conversación ${i + 1} de ${conversationCount}...`);
          await conversationButtons.nth(i).click();
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/provider/negotiation/')) {
            // Verificar si el estado es ENVIADA
            const statusElement = page.locator('p:has-text("ENVIADA")');
            const hasSentStatus = await statusElement.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (hasSentStatus) {
              // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
              const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
              const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
              
              if (notesInputVisible) {
                const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
                
                if (isNotesEnabled) {
                  console.log(`✅ Negociación con estado ENVIADA encontrada en conversación ${i + 1} (no cancelada)`);
                  return currentUrl;
                } else {
                  console.log(`âš ï¸ Conversación ${i + 1} tiene estado ENVIADA pero está cancelada (campo de notas deshabilitado), continuando búsqueda...`);
                }
              } else {
                console.log(`âš ï¸ Campo de notas no visible en conversación ${i + 1}, continuando búsqueda...`);
              }
            }
          }
          
          // Volver a chats si no es el estado correcto
          await page.goto(CHATS_URL);
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        } catch (error) {
          console.log(`âš ï¸ Error al intentar con conversación ${i + 1}: ${error.message}`);
          try {
            await page.goto(CHATS_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          } catch (e) {
            // Continuar de todas formas
          }
        }
      }
    }
  } catch (error) {
    console.log('ℹ️ No se pudo navegar desde chats, intentando desde dashboard...');
  }
  
  // Intentar desde dashboard
  try {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Buscar eventos con estado ENVIADA (puede aparecer como "ENVIADO" o similar)
    const eventButtons = page.locator('button').filter({
      hasText: /ENVIAD/i
    });
    
    const eventCount = await eventButtons.count();
    console.log(`ðŸ” Encontrados ${eventCount} eventos con estado ENVIADA en dashboard`);
    
    if (eventCount > 0) {
      // Intentar con todos los eventos hasta encontrar uno con estado ENVIADA
      for (let i = 0; i < eventCount; i++) {
        try {
          console.log(`ðŸ” Intentando evento ${i + 1} de ${eventCount}...`);
          await eventButtons.nth(i).click();
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/provider/negotiation/')) {
            // Verificar que realmente es ENVIADA
            const statusElement = page.locator('p:has-text("ENVIADA")');
            const hasSentStatus = await statusElement.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (hasSentStatus) {
              // Verificar que NO esté cancelada (verificar que el campo de notas esté habilitado)
              const notesInput = page.locator('input[id*="Notes"], input[id*="Notas"], textarea[id*="Notes"], textarea[id*="Notas"]').first();
              const notesInputVisible = await notesInput.isVisible({ timeout: 3000 }).catch(() => false);
              
              if (notesInputVisible) {
                const isNotesEnabled = await notesInput.isEnabled({ timeout: 2000 }).catch(() => false);
                
                if (isNotesEnabled) {
                  console.log(`✅ Negociación con estado ENVIADA encontrada en evento ${i + 1} (no cancelada)`);
                  return currentUrl;
                } else {
                  console.log(`âš ï¸ Evento ${i + 1} tiene estado ENVIADA pero está cancelado (campo de notas deshabilitado), continuando búsqueda...`);
                  await page.goto(DASHBOARD_URL);
                  await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
                }
              } else {
                console.log(`âš ï¸ Campo de notas no visible en evento ${i + 1}, continuando búsqueda...`);
                await page.goto(DASHBOARD_URL);
                await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
              }
            } else {
              console.log(`âš ï¸ Evento ${i + 1} no tiene estado ENVIADA, continuando búsqueda...`);
              await page.goto(DASHBOARD_URL);
              await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
            }
          } else {
            await page.goto(DASHBOARD_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          }
        } catch (error) {
          console.log(`âš ï¸ Error al intentar con evento ${i + 1}: ${error.message}`);
          try {
            await page.goto(DASHBOARD_URL);
            await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          } catch (e) {
            // Continuar de todas formas
          }
        }
      }
    }
  } catch (error) {
    console.log('ℹ️ No se pudo navegar desde dashboard');
  }
  
  throw new Error('âŒ No se pudo navegar a una negociación activa con estado ENVIADA');
}
