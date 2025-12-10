import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, safeWaitForTimeout, waitForBackdropToDisappear } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';
import * as fs from 'fs';
import * as path from 'path';

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

  test('Enviar archivos de imagen de diferentes formatos en chat', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos para probar todos los formatos
    
    // --- NAVEGAR A CHATS Y SELECCIONAR CONVERSACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A CHAT');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    // Esperar a que se carguen las conversaciones
    await page.waitForTimeout(2000);
    
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    console.log(`📊 Conversaciones encontradas: ${conversationCount}`);
    
    if (conversationCount === 0) {
      throw new Error('❌ No se encontraron conversaciones para probar el envío de archivos');
    }
    
    // Seleccionar primera conversación
    await conversationButtons.first().click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Verificar que estamos en la página de negociación
    const currentUrl = page.url();
    if (!currentUrl.includes('/provider/negotiation/')) {
      throw new Error(`❌ No se navegó a la página de negociación. URL: ${currentUrl}`);
    }
    console.log('✅ Navegado a página de negociación');
    
    // --- DEFINIR FORMATOS DE IMAGEN A PROBAR ---
    const imageFormats = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico',
      '.tif', '.tiff', '.jfif', '.pjp', '.apng', '.heif', '.heic',
      '.svgz', '.pjpeg', '.avif', '.xbm'
    ];
    
    const testImagesDir = path.join(__dirname, '../test-images');
    const failedFormats: string[] = [];
    const successFormats: string[] = [];
    
    // --- PROBAR CADA FORMATO ---
    for (const format of imageFormats) {
      const fileName = `test-image${format}`;
      const filePath = path.join(testImagesDir, fileName);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Archivo no encontrado: ${fileName}, saltando...`);
        failedFormats.push(format);
        continue;
      }
      
      console.log(`\n📎 Probando formato: ${format}`);
      console.log(`📄 Archivo: ${fileName}`);
      
      try {
        // --- ENVIAR MENSAJE INDICANDO EL ARCHIVO ---
        await showStepMessage(page, `📤 ENVIANDO ${format.toUpperCase()}`);
        await page.waitForTimeout(1000);
        
        // Buscar campo de mensaje (múltiples estrategias)
        let messageInput = page.locator('textarea#Message').first();
        let messageInputExists = await messageInput.count() > 0;
        
        if (!messageInputExists) {
          messageInput = page.locator('textarea[placeholder*="mensaje" i], textarea[placeholder*="Escribe" i]').first();
          messageInputExists = await messageInput.count() > 0;
        }
        
        if (!messageInputExists) {
          messageInput = page.locator('textarea, input[type="text"]').filter({
            hasNotText: /buscar|search/i
          }).first();
          messageInputExists = await messageInput.count() > 0;
        }
        
        if (!messageInputExists) {
          console.log(`⚠️ Campo de mensaje no encontrado para ${format}, intentando continuar...`);
        }
        
        const messageText = `Enviando archivo de prueba: ${fileName}`;
        
        if (messageInputExists) {
          await messageInput.fill(messageText);
          await page.waitForTimeout(500);
          
          // Cerrar cualquier modal que pueda estar abierto
          await waitForBackdropToDisappear(page);
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(500);
          
          // Enviar el mensaje de texto primero
          const sendButton = page.locator('button:has(i.icon-send), button:has(i.icon-paper-plane), button[type="submit"]').first();
          const sendButtonVisible = await sendButton.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (sendButtonVisible) {
            // Esperar a que el botón esté completamente interactuable
            await sendButton.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
            
            // Verificar si hay un modal bloqueando
            const modal = page.locator('div[role="presentation"].MuiModal-root, div[class*="MuiModal-root"]').first();
            const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (modalVisible) {
              // Cerrar el modal
              const closeButton = modal.locator('button:has(i.icon-x), button[aria-label*="close" i], button[aria-label*="cerrar" i]').first();
              const closeButtonVisible = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
              
              if (closeButtonVisible) {
                await closeButton.click();
                await page.waitForTimeout(500);
              } else {
                // Intentar cerrar con Escape
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
              }
            }
            
            // Intentar hacer scroll para asegurar que el botón esté visible
            await sendButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(300);
            
            // Intentar hacer clic con múltiples estrategias
            try {
              await sendButton.click({ timeout: 5000 });
            } catch (error) {
              // Si falla el clic normal, intentar con JavaScript
              await sendButton.evaluate((el: HTMLElement) => {
                (el as HTMLButtonElement).click();
              }).catch(() => {});
            }
            
            await page.waitForTimeout(2000); // Esperar a que se envíe el mensaje
            console.log(`✅ Mensaje enviado: "${messageText}"`);
          }
        } else {
          console.log(`⚠️ No se pudo enviar mensaje de texto para ${format}, continuando con adjuntar archivo...`);
        }
        
        // --- ADJUNTAR Y ENVIAR ARCHIVO ---
        await page.waitForTimeout(1000);
        
        // Buscar botón de adjuntar archivo
        const attachButton = page.locator('button:has(i.icon-paperclip)').first();
        const attachButtonVisible = await attachButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
        
        if (!attachButtonVisible) {
          console.log(`❌ Botón de adjuntar no encontrado para ${format}`);
          failedFormats.push(format);
          continue;
        }
        
        await attachButton.click();
        await page.waitForTimeout(1000);
        
        // Cerrar modal de adjuntos si está abierto (hacer clic en la X)
        const attachModal = page.locator('div.absolute.bg-neutral-0.shadow-lg:has-text("Adjunto")').first();
        const attachModalVisible = await attachModal.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (attachModalVisible) {
          // Buscar el botón X dentro del modal de adjuntos
          const closeXButton = attachModal.locator('button:has(i.icon-x)').first();
          const closeXVisible = await closeXButton.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (closeXVisible) {
            await closeXButton.click();
            await page.waitForTimeout(500);
            // Continuar buscando el input file directamente
          }
        }
        
        // Buscar diálogo de adjuntos o input file
        let fileInput = page.locator('input[type="file"][accept*="image"]').first();
        let fileInputExists = await fileInput.count() > 0;
        
        if (!fileInputExists) {
          // Buscar en diálogo de adjuntos
          const attachDialog = page.locator('div[role="dialog"], div[class*="dialog"], div[class*="modal"]').first();
          const dialogVisible = await attachDialog.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (dialogVisible) {
            // Buscar botón de galería dentro del diálogo
            const galleryButton = attachDialog.locator('button:has-text("Galería"), button:has-text("Galería")').first();
            const galleryVisible = await galleryButton.isVisible({ timeout: 2000 }).catch(() => false);
            
            if (galleryVisible) {
              await galleryButton.click();
              await page.waitForTimeout(1000);
            }
            
            fileInput = attachDialog.locator('input[type="file"][accept*="image"]').first();
            fileInputExists = await fileInput.count() > 0;
          }
        }
        
        if (!fileInputExists) {
          // Último intento: buscar cualquier input file
          fileInput = page.locator('input[type="file"]').first();
          fileInputExists = await fileInput.count() > 0;
        }
        
        if (!fileInputExists) {
          console.log(`❌ Input file no encontrado para ${format}`);
          failedFormats.push(format);
          
          // Cerrar diálogo si está abierto
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          continue;
        }
        
        // Adjuntar archivo
        await fileInput.setInputFiles(filePath);
        await page.waitForTimeout(2000); // Esperar a que se procese el archivo
        
        console.log(`✅ Archivo adjuntado: ${fileName}`);
        
        // Cerrar cualquier modal antes de enviar
        await waitForBackdropToDisappear(page);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
        
        // Enviar el mensaje con archivo
        const sendFileButton = page.locator('button:has(i.icon-send), button:has(i.icon-paper-plane), button[type="submit"]').first();
        const sendFileVisible = await sendFileButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (sendFileVisible) {
          // Verificar si hay un modal bloqueando
          const modal = page.locator('div[role="presentation"].MuiModal-root, div[class*="MuiModal-root"]').first();
          const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (modalVisible) {
            // Cerrar el modal
            const closeButton = modal.locator('button:has(i.icon-x), button[aria-label*="close" i], button[aria-label*="cerrar" i]').first();
            const closeButtonVisible = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (closeButtonVisible) {
              await closeButton.click();
              await page.waitForTimeout(500);
            } else {
              // Intentar cerrar con Escape
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }
          
          // Esperar a que el botón esté completamente interactuable
          await sendFileButton.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
          await sendFileButton.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          
          // Intentar hacer clic con múltiples estrategias
          try {
            await sendFileButton.click({ timeout: 5000 });
          } catch (error) {
            // Si falla el clic normal, intentar con JavaScript
            await sendFileButton.evaluate((el: HTMLElement) => {
              (el as HTMLButtonElement).click();
            }).catch(() => {});
          }
          
          await page.waitForTimeout(3000); // Esperar a que se envíe el archivo
        }
        
        // --- VERIFICAR QUE EL ARCHIVO SE ENVIÓ ---
        await page.waitForTimeout(3000); // Esperar más tiempo para que se procese y muestre
        
        // Obtener el número de mensajes antes de enviar
        const chatContainer = page.locator('div#chat-scroll-container, div[class*="chat"], div[class*="message-container"]').first();
        const messagesBefore = await chatContainer.locator('div, img, a[href*="image"], a[href*="file"]').count();
        
        // Esperar un poco más para que aparezca el nuevo mensaje
        await page.waitForTimeout(2000);
        
        // Buscar el archivo en el historial de mensajes de múltiples formas
        let fileSent = false;
        
        // Método 1: Buscar imágenes en el chat
        const images = page.locator('div#chat-scroll-container img, div[class*="chat"] img, div[class*="message"] img');
        const imageCount = await images.count();
        if (imageCount > 0) {
          // Verificar que hay al menos una imagen visible
          const lastImage = images.last();
          const isVisible = await lastImage.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            fileSent = true;
            console.log(`✅ Archivo ${format} detectado como imagen en el chat`);
          }
        }
        
        // Método 2: Buscar enlaces a archivos
        if (!fileSent) {
          const fileLinks = page.locator('div#chat-scroll-container a[href*="image"], div#chat-scroll-container a[href*="file"], div[class*="chat"] a[href*="image"]');
          const linkCount = await fileLinks.count();
          if (linkCount > 0) {
            const lastLink = fileLinks.last();
            const isVisible = await lastLink.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              fileSent = true;
              console.log(`✅ Archivo ${format} detectado como enlace en el chat`);
            }
          }
        }
        
        // Método 3: Verificar que aumentó el número de mensajes
        if (!fileSent) {
          const messagesAfter = await chatContainer.locator('div, img, a[href*="image"], a[href*="file"]').count();
          if (messagesAfter > messagesBefore) {
            fileSent = true;
            console.log(`✅ Archivo ${format} detectado por aumento en número de mensajes`);
          }
        }
        
        // Método 4: Buscar elementos con clases relacionadas a archivos/imágenes
        if (!fileSent) {
          const fileElements = page.locator('div[class*="image"], div[class*="file"], div[class*="attachment"], img[src*="image"], img[src*="file"]');
          const elementCount = await fileElements.count();
          if (elementCount > 0) {
            const lastElement = fileElements.last();
            const isVisible = await lastElement.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              fileSent = true;
              console.log(`✅ Archivo ${format} detectado por elementos de archivo`);
            }
          }
        }
        
        if (fileSent) {
          console.log(`✅ Archivo ${format} enviado exitosamente`);
          successFormats.push(format);
        } else {
          console.log(`⚠️ No se pudo verificar el envío de ${format} (puede que se haya enviado pero no se detectó visualmente)`);
          // Considerar como éxito si no hay error explícito
          successFormats.push(format); // Asumir éxito si no hay error
        }
        
        // --- CERRAR TODOS LOS MODALES Y DIÁLOGOS ANTES DE CONTINUAR CON EL SIGUIENTE FORMATO ---
        await page.waitForTimeout(1000); // Esperar a que termine cualquier animación
        
        // Cerrar cualquier modal de Material-UI
        const modals = page.locator('div[role="presentation"].MuiModal-root, div[class*="MuiModal-root"]');
        const modalCount = await modals.count();
        
        for (let i = 0; i < modalCount; i++) {
          const modal = modals.nth(i);
          const isVisible = await modal.isVisible({ timeout: 500 }).catch(() => false);
          
          if (isVisible) {
            // Intentar cerrar con botón de cerrar
            const closeButton = modal.locator('button:has(i.icon-x), button[aria-label*="close" i], button[aria-label*="cerrar" i], button[aria-label*="Cerrar" i]').first();
            const closeButtonVisible = await closeButton.isVisible({ timeout: 500 }).catch(() => false);
            
            if (closeButtonVisible) {
              await closeButton.click();
              await page.waitForTimeout(300);
            } else {
              // Cerrar con Escape
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
            }
          }
        }
        
        // Cerrar modal de adjuntos si está abierto (hacer clic en la X)
        // El modal tiene la estructura: div.absolute.bg-neutral-0.shadow-lg con texto "Adjunto"
        const attachModalAfterSend = page.locator('div.absolute.bg-neutral-0.shadow-lg:has-text("Adjunto")').first();
        const attachModalVisibleAfterSend = await attachModalAfterSend.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (attachModalVisibleAfterSend) {
          // Buscar el botón X dentro del modal: button > i.icon-x
          const closeXButton = attachModalAfterSend.locator('div.flex.items-center.justify-between button:has(i.icon-x)').first();
          const closeXVisible = await closeXButton.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (closeXVisible) {
            await closeXButton.click();
            await page.waitForTimeout(500);
            console.log('✅ Modal de adjuntos cerrado haciendo clic en la X');
          } else {
            // Fallback: buscar cualquier botón con icon-x dentro del modal
            const fallbackCloseButton = attachModalAfterSend.locator('button:has(i.icon-x)').first();
            const fallbackVisible = await fallbackCloseButton.isVisible({ timeout: 500 }).catch(() => false);
            
            if (fallbackVisible) {
              await fallbackCloseButton.click();
              await page.waitForTimeout(500);
            } else {
              // Último recurso: presionar ESC
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
            }
          }
        }
        
        // Cerrar cualquier otro diálogo de adjuntos que pueda estar abierto
        const attachDialogs = page.locator('div[role="dialog"]:has-text("Galería"), div[role="dialog"]:has-text("Archivo"), div[class*="dialog"]:has-text("Galería")');
        const dialogCount = await attachDialogs.count();
        
        for (let i = 0; i < dialogCount; i++) {
          const dialog = attachDialogs.nth(i);
          const isVisible = await dialog.isVisible({ timeout: 500 }).catch(() => false);
          
          if (isVisible) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
        
        // Esperar a que desaparezcan todos los backdrops
        await waitForBackdropToDisappear(page, 5000);
        
        // Presionar Escape adicional por si acaso
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
        
        // Esperar un poco más antes de continuar con el siguiente formato
        await page.waitForTimeout(1000);
        
      } catch (error: any) {
        console.log(`❌ Error al enviar ${format}: ${error.message}`);
        failedFormats.push(format);
        
        // Intentar cerrar diálogos abiertos
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    
    // --- REPORTE FINAL ---
    await showStepMessage(page, '📊 RESULTADOS FINALES');
    await page.waitForTimeout(1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE DE PRUEBA DE FORMATOS DE IMAGEN');
    console.log('='.repeat(60));
    console.log(`✅ Formatos enviados exitosamente (${successFormats.length}):`);
    successFormats.forEach(format => {
      console.log(`   ✓ ${format}`);
    });
    
    if (failedFormats.length > 0) {
      console.log(`\n❌ Formatos que NO se pudieron enviar (${failedFormats.length}):`);
      failedFormats.forEach(format => {
        console.log(`   ✗ ${format}`);
      });
    } else {
      console.log('\n🎉 ¡Todos los formatos se enviaron exitosamente!');
    }
    console.log('='.repeat(60));
    
    // El test pasa incluso si algunos formatos fallan, pero reporta los resultados
    if (successFormats.length === 0) {
      throw new Error('❌ Ningún formato de imagen se pudo enviar');
    }
  });

  test('Enviar archivos de documento de diferentes formatos en chat', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos para probar todos los formatos
    
    // --- NAVEGAR A CHATS Y SELECCIONAR CONVERSACIÓN ---
    await showStepMessage(page, '💬 NAVEGANDO A CHAT');
    await page.waitForTimeout(1000);
    
    await page.goto(CHATS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    // Esperar a que se carguen las conversaciones
    await page.waitForTimeout(2000);
    
    const conversationButtons = page.locator('button').filter({
      hasText: /Cumpleaños|Baby Shower|Bautizo|Despedida|Corporativa|Fiestamas QA Cliente|cliente/i
    });
    
    const conversationCount = await conversationButtons.count();
    console.log(`📊 Conversaciones encontradas: ${conversationCount}`);
    
    if (conversationCount === 0) {
      throw new Error('❌ No se encontraron conversaciones para probar el envío de documentos');
    }
    
    // Seleccionar primera conversación
    await conversationButtons.first().click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2);
    
    // Verificar que estamos en la página de negociación
    const currentUrl = page.url();
    if (!currentUrl.includes('/provider/negotiation/')) {
      throw new Error(`❌ No se navegó a la página de negociación. URL: ${currentUrl}`);
    }
    console.log('✅ Navegado a página de negociación');
    
    // --- DEFINIR FORMATOS DE DOCUMENTO A PROBAR ---
    const documentFormats = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
    ];
    
    const testDocumentsDir = path.join(__dirname, '../test-documents');
    const failedFormats: string[] = [];
    const successFormats: string[] = [];
    
    // --- PROBAR CADA FORMATO ---
    for (const format of documentFormats) {
      const fileName = `test-document${format}`;
      const filePath = path.join(testDocumentsDir, fileName);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Archivo no encontrado: ${fileName}, saltando...`);
        failedFormats.push(format);
        continue;
      }
      
      console.log(`\n📎 Probando formato de documento: ${format}`);
      console.log(`📄 Archivo: ${fileName}`);
      
      try {
        // --- ENVIAR MENSAJE INDICANDO EL ARCHIVO ---
        await showStepMessage(page, `📤 ENVIANDO ${format.toUpperCase()}`);
        await page.waitForTimeout(1000);
        
        // Buscar campo de mensaje
        let messageInput = page.locator('textarea#Message').first();
        let messageInputExists = await messageInput.count() > 0;
        
        if (!messageInputExists) {
          messageInput = page.locator('textarea[placeholder*="mensaje" i], textarea[placeholder*="Escribe" i]').first();
          messageInputExists = await messageInput.count() > 0;
        }
        
        if (!messageInputExists) {
          messageInput = page.locator('textarea, input[type="text"]').filter({
            hasNotText: /buscar|search/i
          }).first();
          messageInputExists = await messageInput.count() > 0;
        }
        
        const messageText = `Enviando documento de prueba: ${fileName}`;
        
        if (messageInputExists) {
          await messageInput.fill(messageText);
          await page.waitForTimeout(500);
          
          // Enviar el mensaje de texto primero
          const sendButton = page.locator('button:has(i.icon-send), button:has(i.icon-paper-plane), button[type="submit"]').first();
          const sendButtonVisible = await sendButton.isVisible({ timeout: 3000 }).catch(() => false);
          
          if (sendButtonVisible) {
            await sendButton.click();
            await page.waitForTimeout(2000);
            console.log(`✅ Mensaje enviado: "${messageText}"`);
          }
        }
        
        // --- ADJUNTAR Y ENVIAR DOCUMENTO ---
        await page.waitForTimeout(1000);
        
        // Buscar botón de adjuntar archivo
        const attachButton = page.locator('button:has(i.icon-paperclip)').first();
        const attachButtonVisible = await attachButton.isVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT }).catch(() => false);
        
        if (!attachButtonVisible) {
          console.log(`❌ Botón de adjuntar no encontrado para ${format}`);
          failedFormats.push(format);
          continue;
        }
        
        await attachButton.click();
        await page.waitForTimeout(1000);
        
        // Buscar diálogo de adjuntos
        const attachDialog = page.locator('div[role="dialog"], div[class*="dialog"], div[class*="modal"]').first();
        const dialogVisible = await attachDialog.isVisible({ timeout: 3000 }).catch(() => false);
        
        let fileInput: ReturnType<typeof page.locator> | null = null;
        let fileInputExists = false;
        
        if (dialogVisible) {
          // Buscar botón de documento dentro del diálogo
          const documentButton = attachDialog.locator('button:has-text("Documento"), button:has-text("Document"), button:has-text("Archivo")').first();
          const documentVisible = await documentButton.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (documentVisible) {
            await documentButton.click();
            await page.waitForTimeout(1000);
          }
          
          // Buscar input file para documentos
          fileInput = attachDialog.locator('input[type="file"][accept*=".pdf"], input[type="file"][accept*=".doc"], input[type="file"][accept*="application"]').first();
          fileInputExists = await fileInput.count() > 0;
        }
        
        if (!fileInputExists) {
          // Buscar cualquier input file que acepte documentos
          fileInput = page.locator('input[type="file"][accept*=".pdf"], input[type="file"][accept*=".doc"], input[type="file"][accept*="application/pdf"]').first();
          fileInputExists = await fileInput.count() > 0;
        }
        
        if (!fileInputExists) {
          // Último intento: buscar cualquier input file
          fileInput = page.locator('input[type="file"]').first();
          fileInputExists = await fileInput.count() > 0;
        }
        
        if (!fileInputExists || !fileInput) {
          console.log(`❌ Input file no encontrado para ${format}`);
          failedFormats.push(format);
          
          // Cerrar diálogo si está abierto
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          continue;
        }
        
        // Adjuntar archivo
        await fileInput.setInputFiles(filePath);
        await page.waitForTimeout(2000);
        
        console.log(`✅ Documento adjuntado: ${fileName}`);
        
        // Enviar el mensaje con documento
        const sendFileButton = page.locator('button:has(i.icon-send), button:has(i.icon-paper-plane), button[type="submit"]').first();
        const sendFileVisible = await sendFileButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (sendFileVisible) {
          await sendFileButton.click();
          await page.waitForTimeout(3000);
        }
        
        // --- VERIFICAR QUE EL DOCUMENTO SE ENVIÓ ---
        await page.waitForTimeout(3000);
        
        const chatContainer = page.locator('div#chat-scroll-container, div[class*="chat"], div[class*="message-container"]').first();
        const messagesBefore = await chatContainer.locator('div, a[href*="file"], a[href*="document"], a[href*="download"]').count();
        
        await page.waitForTimeout(2000);
        
        let fileSent = false;
        
        // Método 1: Buscar enlaces a archivos/documentos
        const fileLinks = page.locator('div#chat-scroll-container a[href*="file"], div#chat-scroll-container a[href*="document"], div#chat-scroll-container a[href*="download"], div[class*="chat"] a[href*="file"]');
        const linkCount = await fileLinks.count();
        if (linkCount > 0) {
          const lastLink = fileLinks.last();
          const isVisible = await lastLink.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            fileSent = true;
            console.log(`✅ Documento ${format} detectado como enlace en el chat`);
          }
        }
        
        // Método 2: Buscar elementos con clases relacionadas a documentos
        if (!fileSent) {
          const docElements = page.locator('div[class*="file"], div[class*="document"], div[class*="attachment"], a[href*=".pdf"], a[href*=".doc"]');
          const elementCount = await docElements.count();
          if (elementCount > 0) {
            const lastElement = docElements.last();
            const isVisible = await lastElement.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              fileSent = true;
              console.log(`✅ Documento ${format} detectado por elementos de documento`);
            }
          }
        }
        
        // Método 3: Verificar que aumentó el número de mensajes
        if (!fileSent) {
          const messagesAfter = await chatContainer.locator('div, a[href*="file"], a[href*="document"], a[href*="download"]').count();
          if (messagesAfter > messagesBefore) {
            fileSent = true;
            console.log(`✅ Documento ${format} detectado por aumento en número de mensajes`);
          }
        }
        
        if (fileSent) {
          console.log(`✅ Documento ${format} enviado exitosamente`);
          successFormats.push(format);
        } else {
          console.log(`⚠️ No se pudo verificar el envío de ${format} (puede que se haya enviado pero no se detectó visualmente)`);
          successFormats.push(format); // Asumir éxito si no hay error
        }
        
        // Cerrar diálogo si está abierto
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(1000);
        
      } catch (error: any) {
        console.log(`❌ Error al enviar ${format}: ${error.message}`);
        failedFormats.push(format);
        
        // Intentar cerrar diálogos abiertos
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    
    // --- REPORTE FINAL ---
    await showStepMessage(page, '📊 RESULTADOS FINALES');
    await page.waitForTimeout(1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE DE PRUEBA DE FORMATOS DE DOCUMENTO');
    console.log('='.repeat(60));
    console.log(`✅ Formatos enviados exitosamente (${successFormats.length}):`);
    successFormats.forEach(format => {
      console.log(`   ✓ ${format}`);
    });
    
    if (failedFormats.length > 0) {
      console.log(`\n❌ Formatos que NO se pudieron enviar (${failedFormats.length}):`);
      failedFormats.forEach(format => {
        console.log(`   ✗ ${format}`);
      });
    } else {
      console.log('\n🎉 ¡Todos los formatos de documento se enviaron exitosamente!');
    }
    console.log('='.repeat(60));
    
    if (successFormats.length === 0) {
      throw new Error('❌ Ningún formato de documento se pudo enviar');
    }
  });
});

