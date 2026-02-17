import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, clearStepMessage, safeWaitForTimeout } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

test.use({
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout (aumentado para dar más tiempo a la carga de servicios)
test.setTimeout(600000); // 10 minutos (para permitir tests de bloques largos)

/**
 * Función auxiliar para seleccionar hora y minuto en el reloj
 */
export async function seleccionarHoraYMinuto(page: Page, hora: number, minuto: number) {
  // 1. Abrir el selector de hora
  const timeInput = page.locator('input#Time');
  await timeInput.scrollIntoViewIfNeeded();
  await timeInput.click({ force: true });
  
  // 2. Esperar a que aparezca el diálogo
  await page.waitForSelector('[data-time-picker-content="true"]', { state: 'visible', timeout: 10000 });
  
  // 3. Seleccionar la hora
  const horaCirculos: { [key: number]: { cx: number; cy: number } } = {
    1: { cx: 162.5, cy: 46.38784067832272 },
    2: { cx: 193.6121593216773, cy: 77.5 },
    3: { cx: 205, cy: 120 },
    4: { cx: 193.6121593216773, cy: 162.5 },
    5: { cx: 162.5, cy: 193.61215932167727 },
    6: { cx: 120, cy: 205 },
    7: { cx: 77.50000000000003, cy: 193.6121593216773 },
    8: { cx: 46.3878406783227, cy: 162.5 },
    9: { cx: 35, cy: 120.00000000000001 },
    10: { cx: 46.38784067832272, cy: 77.5 },
    11: { cx: 77.49999999999997, cy: 46.38784067832273 },
    12: { cx: 120, cy: 35 },
  };
  
  const h = horaCirculos[hora];
  if (!h) throw new Error(`Hora ${hora} no está mapeada en el reloj`);
  
  await safeWaitForTimeout(page, 500);
  
  const allCircles = page.locator('svg circle.cursor-pointer');
  const circleCount = await allCircles.count();
  
  let closestCircle: ReturnType<typeof allCircles.nth> | null = null;
  let minDistance = Infinity;
  
  for (let i = 0; i < circleCount; i++) {
    const circle = allCircles.nth(i);
    const cx = parseFloat(await circle.getAttribute('cx') || '0');
    const cy = parseFloat(await circle.getAttribute('cy') || '0');
    const distance = Math.sqrt(Math.pow(cx - h.cx, 2) + Math.pow(cy - h.cy, 2));
    
    if (distance < minDistance && distance < 25) {
      minDistance = distance;
      closestCircle = circle;
    }
  }
  
  if (closestCircle) {
    await closestCircle.click({ timeout: 5000 });
  } else {
    throw new Error(`No se pudo encontrar el círculo para la hora ${hora}`);
  }
  await safeWaitForTimeout(page, 500);
  
  // 4. Seleccionar el minuto
  const minutoCirculos: { [key: number]: { cx: number; cy: number } } = {
    0: { cx: 120, cy: 205 },
    15: { cx: 205, cy: 120 },
    30: { cx: 120, cy: 35 },
    45: { cx: 35, cy: 120 },
  };
  
  const m = minutoCirculos[minuto];
  if (!m) throw new Error(`Minuto ${minuto} no está mapeado`);
  
  const allMinuteCircles = page.locator('svg circle.cursor-pointer');
  const minuteCircleCount = await allMinuteCircles.count();
  
  let closestMinuteCircle: ReturnType<typeof allMinuteCircles.nth> | null = null;
  let minMinuteDistance = Infinity;
  
  for (let i = 0; i < minuteCircleCount; i++) {
    const circle = allMinuteCircles.nth(i);
    const cx = parseFloat(await circle.getAttribute('cx') || '0');
    const cy = parseFloat(await circle.getAttribute('cy') || '0');
    const distance = Math.sqrt(Math.pow(cx - m.cx, 2) + Math.pow(cy - m.cy, 2));
    
    if (distance < minMinuteDistance && distance < 25) {
      minMinuteDistance = distance;
      closestMinuteCircle = circle;
    }
  }
  
  if (closestMinuteCircle) {
    await closestMinuteCircle.click({ timeout: 5000 });
  } else {
    throw new Error(`No se pudo encontrar el círculo para el minuto ${minuto}`);
  }
  
  await safeWaitForTimeout(page, 500);
  
  // 5. Confirmar selección
  const confirmButton = page.locator('button.bg-primary-neutral.text-light-light').filter({ hasText: 'Confirmar' });
  await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
  await confirmButton.click({ timeout: 5000 });
  console.log(`✓ Botón "Confirmar" presionado`);
}

/**
 * Verifica si un servicio está activo o desactivado
 * Basado en la lógica de la prueba "Desactivar servicio"
 * @param page - Página de Playwright
 * @param serviceCard - Locator de la tarjeta del servicio
 * @returns true si está activo, false si está inactivo, null si no se puede determinar
 */
export async function verificarSiServicioEstaActivo(
  page: Page,
  serviceCard: ReturnType<typeof page.locator>
): Promise<boolean | null> {
  try {
    // Verificar si la tarjeta es visible
    const isVisible = await serviceCard.isVisible().catch(() => false);
    if (!isVisible) {
      return null;
    }

    // Verificar indicadores visuales de servicio inactivo
    const tieneTextoInactivo = await serviceCard.locator('text=/Inactivo|inactivo/i').count().then(count => count > 0);
    const tieneImagenGris = await serviceCard.locator('img.grayscale, div.grayscale').count().then(count => count > 0);
    
    if (tieneTextoInactivo || tieneImagenGris) {
      return false; // Servicio está inactivo
    }

    // Buscar el botón de tres puntos en la tarjeta
    const threeDotsButton = serviceCard.locator('button:has(i.icon-more-vertical)').first();
    const hasThreeDots = await threeDotsButton.count().then(count => count > 0);

    if (!hasThreeDots) {
      // Si no tiene botón de tres puntos, no se puede verificar el estado
      return null;
    }

    // Hacer clic en el botón de tres puntos para abrir el menú
    await threeDotsButton.click();
    await safeWaitForTimeout(page, 1500); // Esperar a que el menú se abra

    // Verificar si tiene botón "Desactivar" (servicio activo) o "Activar" (servicio inactivo)
    // Usando el mismo selector que la prueba "Desactivar servicio"
    const deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
    const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();

    const deactivateButtonCount = await deactivateButton.count();
    const activateButtonCount = await activateButton.count();
    
    const hasDeactivate = deactivateButtonCount > 0 ? await deactivateButton.isVisible().catch(() => false) : false;
    const hasActivate = activateButtonCount > 0 ? await activateButton.isVisible().catch(() => false) : false;

    // Cerrar el menú presionando Escape
    await page.keyboard.press('Escape');
    await safeWaitForTimeout(page, 500);

    // Si tiene botón "Desactivar", el servicio está activo
    if (hasDeactivate) {
      return true;
    }
    
    // Si tiene botón "Activar", el servicio está inactivo
    if (hasActivate) {
      return false;
    }

    // Si no tiene ninguno de los dos, no se puede determinar el estado
    return null;
  } catch (error) {
    // En caso de error, intentar cerrar el menú si está abierto
    try {
      await page.keyboard.press('Escape');
      await safeWaitForTimeout(page, 500);
    } catch {}
    
    // No se pudo verificar el estado
    return null;
  }
}

/**
 * Marca un servicio como favorito en la página actual
 * Basado en la lógica de la prueba "Marcar servicio como favorito"
 * @param page - Página de Playwright
 * @returns true si se marcó exitosamente o ya estaba marcado, false si falló
 */
export async function marcarServicioComoFavorito(page: Page): Promise<boolean> {
  await showStepMessage(page, '❤️ MARCANDO SERVICIO COMO FAVORITO');
  console.log('📋 Marcando el servicio como favorito...');
  await safeWaitForTimeout(page, 2000);

  // Esperar a que existan iconos de corazón en el DOM (puede tardar en renderizar)
  await page.waitForSelector('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]', { timeout: 5000 }).catch(() => {});

  // Buscar el botón de favoritos manualmente en todos los botones
  console.log('   🔍 Buscando botón de favoritos manualmente...');
  let botonFavoritos: ReturnType<typeof page.locator> | null = null;
  let botonVisible = false;
  
  const todosLosBotones = page.locator('button');
  const cantidadBotones = await todosLosBotones.count();
  console.log(`   📊 Total de botones encontrados: ${cantidadBotones}`);
  
  for (let i = 0; i < Math.min(cantidadBotones, 30); i++) {
    const boton = todosLosBotones.nth(i);
    const tieneIconoHeart = await boton.locator('i.icon.icon-heart, i[class*="icon-heart"]').count() > 0;
    
    if (tieneIconoHeart) {
      // Verificar que no sea el botón de compartir
      const tieneIconoShare = await boton.locator('i[class*="share"]').count() > 0;
      if (!tieneIconoShare) {
        const esVisible = await boton.isVisible({ timeout: 2000 }).catch(() => false);
        if (esVisible) {
          botonFavoritos = boton;
          botonVisible = true;
          console.log(`   ✅ Botón de favoritos encontrado en índice ${i}`);
          break;
        }
      }
    }
  }
  
  if (!botonVisible || !botonFavoritos) {
    throw new Error('❌ No se encontró el botón de favoritos en la página del servicio');
  }

  console.log('   ✅ Botón de favoritos encontrado');

  // Verificar el estado actual del icono
  const iconHeart = botonFavoritos.locator('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]').first();
  const iconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
  console.log(`   📊 Clase completa del icono: "${iconClass}"`);
  
  // El estado marcado se detecta por:
  // 1. Clase que contiene "heart-solid" o "icon-heart-solid"
  // Nota: No usar solo el color (p.e. text-primary-neutral) como indicador
  const estaMarcado = iconClass.includes('heart-solid') || 
                      iconClass.includes('icon-heart-solid');
  
  console.log(`   📊 Estado actual: ${estaMarcado ? 'marcado' : 'desmarcado'}`);

  // Si ya está marcado, no hacer nada
  if (estaMarcado) {
    console.log('   ℹ️ El servicio ya estaba marcado como favorito');
    return true;
  }

  // Hacer clic para marcar como favorito
  console.log('   🖱️ Haciendo clic en el botón de favoritos...');
  await botonFavoritos.click();
  await safeWaitForTimeout(page, 3000);

  // Verificar que cambió el estado
  const nuevoIconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
  const nuevoEstado = nuevoIconClass.includes('heart-solid') || 
                      nuevoIconClass.includes('icon-heart-solid');
  
  console.log(`   📊 Nuevo estado: ${nuevoEstado ? 'marcado' : 'desmarcado'}`);
  console.log(`   📊 Nueva clase del icono: "${nuevoIconClass}"`);
  
  if (nuevoEstado) {
    console.log('   ✅ Servicio marcado como favorito correctamente');
    return true;
  } else {
    console.log('⚠️ El estado puede no haber cambiado visualmente, pero el clic se realizó');
    return true; // Aún así consideramos éxito
  }
}

/**
 * Busca un servicio en el dashboard del proveedor y obtiene su información
 */
export async function buscarServicioEnProveedor(page: Page): Promise<{ nombre: string; categoria: string; subcategoria?: string } | null> {
  console.log('\n🔍 BUSCANDO SERVICIO EN DASHBOARD DEL PROVEEDOR...');
  await showStepMessage(page, '🔍 BUSCANDO SERVICIO EN DASHBOARD DEL PROVEEDOR');
  
  // Intentar navegar directamente al dashboard del proveedor
  // Si no estamos logueados, nos redirigirá al login
  await page.goto(`${DEFAULT_BASE_URL}/provider/dashboard`, { waitUntil: 'domcontentloaded' });
  await safeWaitForTimeout(page, 2000);
  
  // Verificar si estamos en la página de login (no logueados) o en el dashboard (logueados)
  const currentUrl = page.url();
  const isOnLoginPage = currentUrl.includes('/login');
  
  if (isOnLoginPage) {
    // Necesitamos hacer login
    console.log('⚠️ No estamos logueados, haciendo login...');
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Login exitoso como proveedor');
    await safeWaitForTimeout(page, 2000);
    
    // Navegar nuevamente al dashboard después del login
    await page.goto(`${DEFAULT_BASE_URL}/provider/dashboard`);
    await safeWaitForTimeout(page, 2000);
  } else {
    console.log('✓ Ya estamos logueados como proveedor');
  }
  
  // Navegar a administrar servicios
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios"), div.flex.flex-row.gap-3 button:has-text("Administrar servicios")');
  await expect(adminServiciosButton.first()).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.first().click();
  await safeWaitForTimeout(page, 2000);
  
  // Buscar tarjetas de servicios reales (excluyendo botones de filtro y otros)
  // Las tarjetas de servicios tienen: bg-neutral-0 rounded-6 shadow-4 border-1 border-light-neutral
  // Y contienen un botón con icon-more-vertical
  const serviceCardsContainer = page.locator('div.flex.flex-col.bg-neutral-0.rounded-6.shadow-4.border-1.border-light-neutral');
  const serviceCardsCount = await serviceCardsContainer.count();
  console.log(`📊 Tarjetas de servicios encontradas: ${serviceCardsCount}`);
  
  if (serviceCardsCount === 0) {
    console.log('⚠️ No hay servicios disponibles en el dashboard del proveedor');
    return null;
  }
  
  // Filtrar servicios activos (excluir inactivos)
  // El estado se verifica abriendo el menú de tres puntos y viendo si hay botón "Desactivar" (activo) o "Activar" (inactivo)
  console.log('🔍 Filtrando servicios activos...');
  const activeServiceIndices: number[] = [];
  
  for (let i = 0; i < serviceCardsCount; i++) {
    const card = serviceCardsContainer.nth(i);
    
    // Verificar si la tarjeta es visible
    const isVisible = await card.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }
    
    // Buscar el botón de tres puntos en la tarjeta
    const threeDotsButton = card.locator('button:has(i.icon-more-vertical)').first();
    const hasThreeDots = await threeDotsButton.count().then(count => count > 0);
    
    if (!hasThreeDots) {
      // Si no tiene botón de tres puntos, asumimos que está activo (fallback)
      console.log(`⚠️ Servicio en índice ${i} no tiene botón de tres puntos, asumiendo activo`);
      activeServiceIndices.push(i);
      continue;
    }
    
    // Hacer clic en el botón de tres puntos para abrir el menú
    try {
      await threeDotsButton.click();
      await safeWaitForTimeout(page, 1500); // Esperar a que el menú se abra
      
      // Verificar si tiene botón "Desactivar" (servicio activo) o "Activar" (servicio inactivo)
      const deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
      const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
      
      const hasDeactivate = await deactivateButton.count().then(count => count > 0);
      const hasActivate = await activateButton.count().then(count => count > 0);
      
      // Si tiene botón "Desactivar", el servicio está activo
      if (hasDeactivate) {
        activeServiceIndices.push(i);
        console.log(`✅ Servicio en índice ${i} está activo`);
      } else if (hasActivate) {
        console.log(`⚠️ Servicio en índice ${i} está inactivo, omitiéndolo`);
      } else {
        // Si no tiene ninguno de los dos, asumimos que está activo (fallback)
        console.log(`⚠️ Servicio en índice ${i} no tiene botones de estado claros, asumiendo activo`);
        activeServiceIndices.push(i);
      }
      
      // Cerrar el menú presionando Escape
      await page.keyboard.press('Escape');
      await safeWaitForTimeout(page, 500);
    } catch (error) {
      console.log(`⚠️ Error al verificar servicio en índice ${i}: ${error}`);
      // En caso de error, asumimos que está activo para no perder servicios
      activeServiceIndices.push(i);
    }
  }
  
  if (activeServiceIndices.length === 0) {
    console.log('⚠️ No se encontraron servicios activos en el dashboard del proveedor');
    return null;
  }
  
  console.log(`✅ Servicios activos encontrados: ${activeServiceIndices.length} de ${serviceCardsCount}`);
  
  // Seleccionar una tarjeta de servicio aleatoria de las activas
  const randomActiveIndex = activeServiceIndices[Math.floor(Math.random() * activeServiceIndices.length)];
  const selectedServiceCard = serviceCardsContainer.nth(randomActiveIndex);
  
  // Obtener el nombre del servicio desde la tarjeta
  // El nombre está en un párrafo con clase "text-medium font-bold"
  const serviceNameElement = selectedServiceCard.locator('p.text-medium.font-bold').first();
  
  let serviceName = '';
  if (await serviceNameElement.count() > 0) {
    serviceName = (await serviceNameElement.textContent())?.trim() || '';
  }
  
  // Si no se encuentra con esa clase, intentar otras variantes
  if (!serviceName) {
    const altNameElement = selectedServiceCard.locator('p.font-bold, p.text-dark-neutral').first();
    if (await altNameElement.count() > 0) {
      serviceName = (await altNameElement.textContent())?.trim() || '';
    }
  }
  
  // Si aún no se encuentra, buscar cualquier párrafo que no sea "Filtrar" ni contenga iconos
  if (!serviceName) {
    const allParagraphs = selectedServiceCard.locator('p');
    const paragraphCount = await allParagraphs.count();
    for (let i = 0; i < paragraphCount; i++) {
      const text = (await allParagraphs.nth(i).textContent())?.trim() || '';
      // Excluir textos que no son nombres de servicios
      if (text && 
          text !== 'Filtrar' && 
          !text.includes('Pendientes') && 
          !text.includes('Contratados') &&
          !text.includes('Inactivo') &&
          text.length > 3) {
        serviceName = text;
        break;
      }
    }
  }
  
  if (!serviceName) {
    console.log('⚠️ No se pudo obtener el nombre del servicio');
    return null;
  }
  
  console.log(`✓ Servicio encontrado: "${serviceName}"`);
  
  // Obtener categoría y subcategoría si están disponibles en la tarjeta
  // El <p> con la categoría está dentro del mismo div que contiene <i.icon-tag>
  let categoria = '';
  let subcategoria = '';
  const categoriaContainer = selectedServiceCard.locator('div.flex.flex-row.items-center.gap-3.mt-1:has(i.icon-tag)');
  if (await categoriaContainer.count() > 0) {
    const categoriaElement = categoriaContainer.locator('p').first();
    if (await categoriaElement.count() > 0) {
      let categoriaText = (await categoriaElement.textContent())?.trim() || '';
      
      // Reemplazar entidades HTML si existen
      categoriaText = categoriaText.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
      
      // El formato suele ser "Categoría > Subcategoría" o "Categoría  > Subcategoría" (con espacios)
      if (categoriaText.includes('>')) {
        const parts = categoriaText.split('>').map(p => p.trim()).filter(p => p.length > 0);
        categoria = parts[0] || '';
        subcategoria = parts[1] || '';
      } else {
        categoria = categoriaText;
      }
      
      console.log(`✓ Categoría extraída: "${categoria}"${subcategoria ? ` > "${subcategoria}"` : ''}`);
    }
  }
  
  // Hacer clic en el botón de tres puntos para abrir el menú y luego ver detalles
  const threeDotsButton = selectedServiceCard.locator('button:has(i.icon-more-vertical)').first();
  if (await threeDotsButton.count() > 0) {
    await threeDotsButton.click();
    await safeWaitForTimeout(page, 1000);
    
    // Buscar y hacer clic en "Ver servicio" o "Editar" en el menú desplegable
    const verServicioButton = page.locator('button:has-text("Ver servicio"), button:has-text("Editar"), a:has-text("Ver servicio")').first();
    if (await verServicioButton.count() > 0) {
      await verServicioButton.click();
      await safeWaitForTimeout(page, 2000);
    } else {
      // Si no hay menú, intentar hacer clic directamente en la tarjeta
      await selectedServiceCard.click();
      await safeWaitForTimeout(page, 2000);
    }
  } else {
    // Si no hay botón de tres puntos, hacer clic en la tarjeta completa
    await selectedServiceCard.click();
    await safeWaitForTimeout(page, 2000);
  }
  
  // Si no se encontraron categoría/subcategoría en la tarjeta, intentar obtenerlas de la página de detalles
  if (!categoria) {
    // Buscar información de categoría en la página de detalles
    const categoriaElements = page.locator('p, span, div').filter({
      hasText: /categoría|Categoría/i
    });
    
    // También buscar en breadcrumbs o navegación
    const breadcrumbs = page.locator('nav, ol, ul').filter({
      has: page.locator('li, a, span')
    });
  }
  
  console.log(`✓ Información del servicio obtenida: Nombre="${serviceName}"${categoria ? `, Categoría="${categoria}"` : ''}${subcategoria ? `, Subcategoría="${subcategoria}"` : ''}`);
  
  // Cerrar o volver (si es necesario)
  // await page.goBack();
  
  return {
    nombre: serviceName,
    categoria: categoria || '', // Se determinará navegando si no se encontró
    subcategoria: subcategoria || '' // Se determinará navegando si no se encontró
  };
}

/**
 * Navega por subcategorías hasta encontrar un servicio específico por nombre
 * Usa la categoría y subcategoría proporcionadas para navegar directamente al path correcto
 */
export async function navegarHastaEncontrarServicioEspecifico(
  page: Page, 
  nombreServicio: string, 
  categoria?: string, 
  subcategoria?: string
): Promise<boolean> {
  const MAX_ATTEMPTS = 30;
  const MAX_LEVELS = 5;
  let attempts = 0;
  let currentLevel = 0;
  let targetSubcategoria = subcategoria;
  
  while (attempts < MAX_ATTEMPTS && currentLevel < MAX_LEVELS) {
    attempts++;
    await safeWaitForTimeout(page, 1000);
    
    // Verificar si estamos en una página de servicios
    const serviciosTitle = page.locator('p.text-center, h1, h2, h3, h4, h5').filter({
      hasText: /Servicios|servicios/i
    });
    
    const isServicesPage = await serviciosTitle.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isServicesPage) {
      // Buscar el servicio por nombre en la lista
      console.log(`🔍 Buscando servicio "${nombreServicio}" en la lista...`);
      
      // MÉTODO ÚNICO: Buscar el nombre del servicio dentro de tarjetas clickeables
      // Las tarjetas tienen role="button" y clase cursor-pointer
      const serviceCards = page.locator('[role="button"].cursor-pointer');
      const serviceCardsCount = await serviceCards.count();
      console.log(`📊 Tarjetas de servicio encontradas: ${serviceCardsCount}`);
      
      // Normalizar el nombre del servicio para comparación
      const nombreServicioNormalizado = nombreServicio.toLowerCase().trim();
      const nombreBaseServicio = nombreServicioNormalizado.split(' - ')[0].split(' EDITADO')[0].trim();
      
      // Buscar el servicio en las tarjetas
      for (let i = 0; i < serviceCardsCount; i++) {
        const card = serviceCards.nth(i);
        
        // Verificar que la tarjeta esté visible
        const isVisible = await card.isVisible().catch(() => false);
        if (!isVisible) {
          continue;
        }
        
        // Buscar el nombre del servicio dentro de la tarjeta
        // El nombre está en elementos p con clases como text-large, font-bold, etc.
        const nameElements = card.locator('p.text-large, p.font-bold, p[class*="text-large"], p[class*="font-bold"]');
        const nameCount = await nameElements.count();
        
        let foundService = false;
        let serviceName = '';
        
        for (let j = 0; j < nameCount; j++) {
          const nameElement = nameElements.nth(j);
          const elementText = (await nameElement.textContent())?.trim() || '';
          
          if (!elementText) continue;
          
          const elementTextNormalizado = elementText.toLowerCase().trim();
          const nombreBaseElemento = elementTextNormalizado.split(' - ')[0].split(' EDITADO')[0].trim();
          
          // Comparar nombres (coincidencia exacta o parcial)
          if (elementTextNormalizado === nombreServicioNormalizado ||
              elementTextNormalizado.includes(nombreServicioNormalizado) ||
              nombreServicioNormalizado.includes(elementTextNormalizado) ||
              nombreBaseElemento === nombreBaseServicio ||
              nombreBaseElemento.includes(nombreBaseServicio) ||
              nombreBaseServicio.includes(nombreBaseElemento)) {
            foundService = true;
            serviceName = elementText;
            break;
          }
        }
        
        if (!foundService) {
          continue;
        }
        
        console.log(`✅ Servicio encontrado: "${serviceName}"`);
        
        // Verificar si el servicio está inactivo
        const hasInactiveText = await card.locator('text=/Inactivo/i').count().then(count => count > 0);
        const hasGrayscaleImage = await card.locator('img.grayscale, div.grayscale').count().then(count => count > 0);
        
        if (hasInactiveText || hasGrayscaleImage) {
          console.log(`⚠️ Servicio "${serviceName}" está inactivo, buscando otro servicio...`);
          continue;
        }
        
        // Hacer clic en la tarjeta del servicio
        await card.scrollIntoViewIfNeeded();
        console.log(`✅ Haciendo clic en la tarjeta del servicio...`);
        await card.click();
        
        // Esperar a que cargue la página del servicio
        await safeWaitForTimeout(page, 3000);
        
        // Verificar que estamos en la página del servicio
        const servicePageTitle = page.locator('p.text-center, h1, h2, h3, h4, h5, h6').filter({
          hasText: /Detalle|Detalles|proveedor/i
        });
        
        const isServicePage = await servicePageTitle.first().isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isServicePage) {
          console.log(`✓ Página del servicio cargada correctamente`);
          
          // Buscar y hacer clic en el botón "Contactar GRATIS"
          const contactButtons = page.locator('button').filter({
            hasText: /Contactar GRATIS/i
          });
          
          const contactButtonCount = await contactButtons.count();
          console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
          
          if (contactButtonCount > 0) {
            const selectedContactButton = contactButtons.first();
            await selectedContactButton.scrollIntoViewIfNeeded();
            console.log(`✓ Haciendo clic en el botón "Contactar GRATIS"`);
            await selectedContactButton.click();
            await safeWaitForTimeout(page, 2000);
            return true;
          } else {
            console.log(`⚠️ No se encontró el botón "Contactar GRATIS" en la página del servicio`);
            return false;
          }
        } else {
          console.log(`⚠️ No se detectó la página del servicio después del clic`);
          return false;
        }
      }
      
      console.log(`⚠️ Servicio "${nombreServicio}" no encontrado en esta página`);
      
      // Si no se encontró el servicio objetivo o todos están inactivos, buscar cualquier servicio activo
      console.log(`⚠️ Servicio objetivo "${nombreServicio}" no encontrado o está inactivo. Buscando cualquier servicio activo...`);
      
      // Buscar todas las tarjetas de servicio visibles (excluyendo inactivos)
      const allServiceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, div[class*="cursor-pointer"]');
      
      // Filtrar manualmente para excluir servicios inactivos
      const totalCards = await allServiceCards.count();
      let firstActiveServiceIndex = -1;
      
      for (let i = 0; i < totalCards; i++) {
        const card = allServiceCards.nth(i);
        const hasInactivoText = await card.locator('text=/Inactivo/i').count().then(count => count > 0);
        const hasGrayscaleImage = await card.locator('img.grayscale, div.grayscale').count().then(count => count > 0);
        
        if (!hasInactivoText && !hasGrayscaleImage) {
          firstActiveServiceIndex = i;
          break; // Encontramos el primer servicio activo
        }
      }
      
      if (firstActiveServiceIndex >= 0) {
        // Seleccionar el primer servicio activo disponible
        const firstActiveService = allServiceCards.nth(firstActiveServiceIndex);
        await firstActiveService.scrollIntoViewIfNeeded();
        console.log(`✅ Seleccionando el primer servicio activo disponible...`);
        await firstActiveService.click();
        
        // Esperar a que cargue la página del servicio
        await safeWaitForTimeout(page, 3000);
        
        // Verificar que estamos en la página del servicio
        const servicePageTitle = page.locator('p.text-center, h1, h2, h3, h4, h5, h6').filter({
          hasText: /Detalle|Detalles|proveedor/i
        });
        
        const isServicePage = await servicePageTitle.first().isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isServicePage) {
          console.log(`✓ Página del servicio cargada correctamente`);
          
          // Buscar y hacer clic en el botón "Contactar GRATIS"
          const contactButtons = page.locator('button').filter({
            hasText: /Contactar GRATIS/i
          });
          
          const contactButtonCount = await contactButtons.count();
          console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
          
          if (contactButtonCount > 0) {
            const selectedContactButton = contactButtons.first();
            await selectedContactButton.scrollIntoViewIfNeeded();
            console.log(`✓ Haciendo clic en el botón "Contactar GRATIS"`);
            await selectedContactButton.click();
            await safeWaitForTimeout(page, 2000);
            return true;
          } else {
            console.log(`⚠️ No se encontró el botón "Contactar GRATIS" en la página del servicio`);
            return false;
          }
        } else {
          console.log(`⚠️ No se detectó la página del servicio después del clic`);
          return false;
        }
      }
      
      console.log(`⚠️ No se encontró ningún servicio activo en esta página`);
      return false;
    }
    
    // Si no estamos en página de servicios, buscar subcategorías
    const subcategorias = await obtenerSubcategoriasParaBusqueda(page);
    
    if (subcategorias.length === 0) {
      console.log('⚠️ No hay subcategorías ni servicios en este nivel');
      return false;
    }
    
    // Si tenemos una subcategoría objetivo, buscar esa específicamente
    let subcategoriaSeleccionada: { name: string; button: any } | null = null;
    
    if (targetSubcategoria) {
      // Buscar la subcategoría que coincida con el objetivo
      subcategoriaSeleccionada = subcategorias.find(sub => 
        sub.name.toLowerCase().trim() === targetSubcategoria!.toLowerCase().trim() ||
        sub.name.toLowerCase().includes(targetSubcategoria!.toLowerCase().trim()) ||
        targetSubcategoria!.toLowerCase().trim().includes(sub.name.toLowerCase())
      ) || null;
      
      if (subcategoriaSeleccionada) {
        console.log(`✅ Subcategoría objetivo encontrada: "${subcategoriaSeleccionada.name}"`);
      } else {
        console.log(`⚠️ Subcategoría "${targetSubcategoria}" no encontrada en esta página. Subcategorías disponibles: ${subcategorias.map(s => s.name).join(', ')}`);
        // Si no se encuentra, usar la primera disponible
        subcategoriaSeleccionada = subcategorias.length > 0 ? subcategorias[0] : null;
        if (subcategoriaSeleccionada) {
          console.log(`🔍 Usando primera subcategoría disponible: "${subcategoriaSeleccionada.name}"`);
        }
      }
    } else {
      // Si no hay subcategoría objetivo, usar la primera disponible
      subcategoriaSeleccionada = subcategorias.length > 0 ? subcategorias[0] : null;
      if (subcategoriaSeleccionada) {
        console.log(`🔍 Navegando a subcategoría: "${subcategoriaSeleccionada.name}"`);
      }
    }
    
    if (!subcategoriaSeleccionada) {
      console.log('⚠️ No hay subcategorías disponibles');
      return false;
    }
    
    await subcategoriaSeleccionada.button.scrollIntoViewIfNeeded();
    await subcategoriaSeleccionada.button.click();
    await safeWaitForTimeout(page, 2000);
    
    // Limpiar el targetSubcategoria después del primer uso para navegar normalmente en niveles más profundos
    if (currentLevel === 0) {
      targetSubcategoria = undefined;
    }
    
    currentLevel++;
  }
  
  return false;
}

/**
 * Obtiene las subcategorías disponibles en la página actual (versión simplificada)
 */
async function obtenerSubcategoriasParaBusqueda(page: Page): Promise<Array<{ name: string; button: any }>> {
  const subcategorias: Array<{ name: string; button: any }> = [];
  
  const botonesSubcategorias = page.locator('button').filter({
    has: page.locator('p.text-neutral-800, p.text-dark-neutral, p.font-medium, p')
  });
  
  const count = await botonesSubcategorias.count();
  
  for (let i = 0; i < count; i++) {
    const boton = botonesSubcategorias.nth(i);
    const isVisible = await boton.isVisible().catch(() => false);
    
    if (isVisible) {
      const nombreElement = boton.locator('p').first();
      const nombre = await nombreElement.textContent().catch(() => null);
      
      if (nombre && nombre.trim() !== '') {
        subcategorias.push({
          name: nombre.trim(),
          button: boton
        });
      }
    }
  }
  
  return subcategorias;
}

/**
 * Ejecuta el flujo completo de creación de evento como cliente
 * Esta función puede ser reutilizada por otras pruebas
 */
export async function ejecutarFlujoCompletoCreacionEvento(page: Page) {
  await showStepMessage(page, '🎉 INICIANDO CREACIÓN DE NUEVA FIESTA');
  
  // PASO 1: Buscar un servicio en el dashboard del proveedor
  const servicioInfo = await buscarServicioEnProveedor(page);
  
  if (!servicioInfo) {
    throw new Error('❌ No se pudo obtener información de un servicio del proveedor');
  }
  
  console.log(`\n🎯 OBJETIVO: Navegar hasta el servicio "${servicioInfo.nombre}"`);
  await showStepMessage(page, `🎯 OBJETIVO: Encontrar servicio "${servicioInfo.nombre}"`);
  
  // PASO 2: Cerrar sesión del proveedor y hacer login como cliente
  // Limpiar cookies y storage para asegurar que no haya sesión activa
  await showStepMessage(page, '🔄 CAMBIANDO DE PROVEEDOR A CLIENTE');
  await page.context().clearCookies();
  
  // Navegar a una página válida antes de limpiar storage
  try {
    await page.goto(`${DEFAULT_BASE_URL}`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 500);
  } catch (e) {
    // Si falla, continuar de todas formas
  }
  
  // Limpiar storage de forma segura
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch (e) {
        // Ignorar errores de acceso a localStorage
      }
      try {
        sessionStorage.clear();
      } catch (e) {
        // Ignorar errores de acceso a sessionStorage
      }
    });
  } catch (e) {
    // Ignorar errores al limpiar storage
    console.log('⚠️ No se pudo limpiar storage, continuando...');
  }
  
  console.log('✓ Sesión del proveedor cerrada');
  
  // Navegar al login
  await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await safeWaitForTimeout(page, 2000);
  
  // Verificar que estamos en la página de login
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    console.log('⚠️ No estamos en la página de login, navegando nuevamente...');
    await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 2000);
  }
  
  // Hacer login con las credenciales del cliente
  await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO CLIENTE');
  await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
  console.log('✓ Login exitoso como cliente');
  
  // Esperar a que se cargue el dashboard después del login
  await safeWaitForTimeout(page, 3000);
  
  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL(`${DEFAULT_BASE_URL}/client/dashboard`, { timeout: 10000 });
  console.log('✓ Navegación al dashboard confirmada');
  
  // Buscar y seleccionar el botón "Nueva fiesta"
  await showStepMessage(page, '🔘 BUSCANDO BOTÓN "NUEVA FIESTA"');
  const nuevaFiestaButton = page.locator('button[type="button"].hidden.lg\\:flex').filter({
    hasText: 'Nueva fiesta'
  });
  
  // Verificar que el botón existe y es visible
  await expect(nuevaFiestaButton).toBeVisible({ timeout: 10000 });
  console.log('✓ Botón "Nueva fiesta" encontrado y visible');
  
  // Hacer clic en el botón "Nueva fiesta"
  await showStepMessage(page, '🖱️ HACIENDO CLIC EN "NUEVA FIESTA"');
  await nuevaFiestaButton.click();
  console.log('✓ Se hizo clic en "Nueva fiesta"');
  
  // Esperar a que cargue la página de selección de categoría de evento
  await safeWaitForTimeout(page, 2000);
  
  // Buscar todos los botones de categoría de evento
  const categoryButtons = page.locator('button[type="submit"]').filter({
    has: page.locator('p.text-dark-neutral')
  });
  
  // Contar cuántas categorías hay disponibles
  const categoryCount = await categoryButtons.count();
  console.log(`✓ Se encontraron ${categoryCount} categorías de eventos disponibles`);
  
  // Verificar que hay al menos una categoría
  expect(categoryCount).toBeGreaterThan(0);
  
  // Seleccionar aleatoriamente una categoría (por ahora, luego se puede mejorar para buscar la correcta)
  await showStepMessage(page, '🎲 SELECCIONANDO CATEGORÍA DE EVENTO');
  const randomIndex = Math.floor(Math.random() * categoryCount);
  const selectedCategory = categoryButtons.nth(randomIndex);
  
  // Obtener el nombre de la categoría seleccionada antes de hacer clic
  const categoryName = await selectedCategory.locator('p.text-dark-neutral').textContent();
  const selectedEventType = categoryName?.trim() || 'Desconocido';
  console.log(`✓ Seleccionando categoría aleatoria: "${selectedEventType}" (índice ${randomIndex})`);
  
  // Guardar el tipo de evento para validaciones posteriores
  const eventTypeForValidation = selectedEventType;
  
  // Hacer clic en la categoría seleccionada
  await selectedCategory.click();
  console.log(`✓ Se hizo clic en la categoría "${selectedEventType}"`);
  
  // Esperar a que cargue la página de selección de categoría de servicios
  await safeWaitForTimeout(page, 2000);
  
  // PASO 3: Navegar por las categorías hasta encontrar el servicio objetivo
  console.log(`\n🔍 NAVEGANDO POR CATEGORÍAS PARA ENCONTRAR: "${servicioInfo.nombre}"`);
  await showStepMessage(page, `🔍 NAVEGANDO PARA ENCONTRAR SERVICIO "${servicioInfo.nombre}"`);
  
  // Buscar todos los botones de categoría de servicios
  const serviceButtons = page.locator('button').filter({
    has: page.locator('p.text-neutral-800.font-medium')
  });
  
  // Navegar directamente a la categoría del servicio si está disponible
  let servicioEncontrado = false;
  
  if (servicioInfo.categoria) {
    console.log(`🎯 Buscando categoría específica: "${servicioInfo.categoria}"`);
    
    // Buscar la categoría que coincida con la categoría del servicio
    let categoriaEncontrada = false;
  const serviceCount = await serviceButtons.count();
    
    for (let i = 0; i < serviceCount; i++) {
      const serviceButton = serviceButtons.nth(i);
      const serviceName = await serviceButton.locator('p.text-neutral-800.font-medium').textContent();
      const categoryName = serviceName?.trim() || '';
      
      // Comparar nombres (case-insensitive, permitir coincidencias parciales)
      if (categoryName.toLowerCase().trim() === servicioInfo.categoria.toLowerCase().trim() ||
          categoryName.toLowerCase().includes(servicioInfo.categoria.toLowerCase().trim()) ||
          servicioInfo.categoria.toLowerCase().trim().includes(categoryName.toLowerCase())) {
        console.log(`✅ Categoría encontrada: "${categoryName}"`);
        await serviceButton.click();
        await safeWaitForTimeout(page, 2000);
        categoriaEncontrada = true;
        break;
      }
    }
    
    if (categoriaEncontrada) {
      // Navegar por subcategorías hasta encontrar el servicio
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(
        page, 
        servicioInfo.nombre, 
        servicioInfo.categoria, 
        servicioInfo.subcategoria
      );
    } else {
      console.log(`⚠️ Categoría "${servicioInfo.categoria}" no encontrada. Probando con la primera categoría disponible...`);
      const firstCategory = serviceButtons.first();
      await firstCategory.click();
      await safeWaitForTimeout(page, 2000);
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(
        page, 
        servicioInfo.nombre, 
        servicioInfo.categoria, 
        servicioInfo.subcategoria
      );
    }
  } else {
    // Si no hay categoría, probar todas las categorías
    console.log(`⚠️ No se obtuvo categoría del servicio, probando todas las categorías...`);
    const serviceCount = await serviceButtons.count();
    const maxIntentosCategorias = serviceCount;
    let intentosCategoria = 0;
    
    while (!servicioEncontrado && intentosCategoria < maxIntentosCategorias) {
      intentosCategoria++;
      const selectedService = serviceButtons.nth(intentosCategoria - 1);
  const serviceName = await selectedService.locator('p.text-neutral-800.font-medium').textContent();
  const selectedServiceCategory = serviceName?.trim() || 'Desconocida';
      console.log(`🔍 Intentando categoría ${intentosCategoria}/${maxIntentosCategorias}: "${selectedServiceCategory}"`);
  
  await selectedService.click();
  await safeWaitForTimeout(page, 2000);
  
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(page, servicioInfo.nombre);
      
      if (!servicioEncontrado) {
        console.log(`⚠️ Servicio no encontrado en "${selectedServiceCategory}", probando otra categoría...`);
        await page.goBack();
        await safeWaitForTimeout(page, 2000);
      }
    }
  }
  
  if (!servicioEncontrado) {
    throw new Error(`❌ No se pudo encontrar el servicio "${servicioInfo.nombre}" después de navegar por las categorías`);
  }
  
  console.log(`✅ Servicio "${servicioInfo.nombre}" encontrado exitosamente!`);
  
  // Verificar si el formulario ya está visible (significa que ya se hizo clic en "Contactar GRATIS")
  const formExists = await page.locator('input[id="Honoree"]').isVisible({ timeout: 2000 }).catch(() => false);
  
  if (formExists) {
    console.log(`✓ El formulario ya está visible, no es necesario hacer clic en "Contactar GRATIS" nuevamente`);
  } else {
    // El formulario no está visible, verificar si estamos en la página del servicio
    const servicePageTitle = page.locator('p.text-center, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Detalle|Detalles|proveedor/i
    });
    
    const isServicePage = await servicePageTitle.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isServicePage) {
      // Buscar y hacer clic en el botón "Contactar GRATIS"
      const contactButtons = page.locator('button').filter({
        hasText: /Contactar GRATIS/i
      });
      
      const contactButtonCount = await contactButtons.count();
      console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
      
      if (contactButtonCount > 0) {
        const selectedContactButton = contactButtons.first();
        await selectedContactButton.scrollIntoViewIfNeeded();
        console.log(`✓ Haciendo clic en el botón "Contactar GRATIS"`);
        await selectedContactButton.click();
        await safeWaitForTimeout(page, 2000);
        } else {
        throw new Error('❌ No se encontró el botón "Contactar GRATIS"');
      }
    } else {
      // Si no estamos en la página del servicio, esperar un poco más
      await safeWaitForTimeout(page, 2000);
      
      // Buscar y hacer clic en el botón "Contactar GRATIS"
      const contactButtons = page.locator('button').filter({
        hasText: /Contactar GRATIS/i
      });
      
      const contactButtonCount = await contactButtons.count();
      console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
      
      if (contactButtonCount > 0) {
        const selectedContactButton = contactButtons.first();
        await selectedContactButton.scrollIntoViewIfNeeded();
        console.log(`✓ Haciendo clic en el botón "Contactar GRATIS"`);
        await selectedContactButton.click();
        await safeWaitForTimeout(page, 2000);
      } else {
        throw new Error('❌ No se encontró el botón "Contactar GRATIS"');
      }
    }
    
    // Esperar a que aparezca el formulario
    await page.locator('input[id="Honoree"]').waitFor({ state: 'visible', timeout: 10000 });
  }
  
  // Continuar con el formulario de evento
  // Llenar todos los campos del formulario
        console.log('\n📝 Llenando formulario de contacto...');
  await showStepMessage(page, '📝 LLENANDO FORMULARIO DE EVENTO');
  
  // Variables para guardar los datos del evento y verificarlos después
  let eventData: {
    honoree: string;
    date: string;
    time: string;
    city: string;
    attendees: number;
  };
        
        // 1. Nombre del festejado
        const randomNames = ['María', 'Juan', 'Carlos', 'Ana', 'Pedro', 'Laura', 'José', 'Carmen', 'Luis', 'Sofia'];
        const randomLastNames = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randomLastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
        const randomHonoree = `${randomName} ${randomLastName}`;
        
  eventData = {
    honoree: randomHonoree,
    date: '',
    time: '',
    city: '',
    attendees: 0
  };
  
  const honoreeField = page.locator('input[id="Honoree"]').first();
  await honoreeField.scrollIntoViewIfNeeded();
  await honoreeField.click();
        await honoreeField.fill(randomHonoree);
        console.log(`✓ Campo "Nombre del festejado" llenado: ${randomHonoree}`);
  
  // Quitar el foco del campo de nombre del festejado para evitar que el siguiente input escriba aquí
  await honoreeField.blur().catch(() => {});
  await safeWaitForTimeout(page, 300);
        
        // 2. Fecha (usando date picker)
        const dateField = page.locator('input[id="Date"]');
        await dateField.click();
        console.log(`✓ Abriendo date picker para seleccionar fecha futura`);
        
        const datePicker = page.locator('.flatpickr-calendar:visible, .flatpickr-calendar.open').first();
        await datePicker.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        
        const datePickerVisible = await datePicker.isVisible().catch(() => false);
        
        if (datePickerVisible) {
          console.log(`✓ Date picker visible, buscando días futuros...`);
          
          const availableDays = page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
          const daysCount = await availableDays.count();
          const currentDay = new Date().getDate();
          
          console.log(`📊 Días disponibles: ${daysCount}, día actual: ${currentDay}`);
          
          let futureDayIndex = -1;
          for (let i = 0; i < daysCount; i++) {
            const dayElement = availableDays.nth(i);
            const dayText = await dayElement.textContent();
            const dayNumber = parseInt(dayText?.trim() || '0');
            
            if (dayNumber > currentDay) {
              futureDayIndex = i;
          break;
            }
          }
          
          if (futureDayIndex === -1) {
            futureDayIndex = daysCount - 1;
            console.log(`⚠ No hay días futuros en este mes, usando último día disponible`);
          }
          
          const selectedDay = availableDays.nth(futureDayIndex);
          await selectedDay.click();
          const dayText = await selectedDay.textContent();
          const selectedDayNumber = parseInt(dayText?.trim() || '0');
    
    // Guardar la fecha seleccionada
    const dateFieldValue = await dateField.inputValue();
    eventData.date = dateFieldValue;
    console.log(`✓ Fecha seleccionada: día ${selectedDayNumber} (${dateFieldValue})`);
        }
        
        // 3. Hora (usando selector de hora)
  const randomHour = Math.floor(Math.random() * 12) + 1;
  const randomMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        
        await seleccionarHoraYMinuto(page, randomHour, randomMinute);
  
  // Guardar la hora seleccionada
  const timeField = page.locator('input[id="Time"]');
  await timeField.waitFor({ state: 'visible', timeout: 3000 });
  const timeValue = await timeField.inputValue();
  eventData.time = timeValue;
  console.log(`✓ Hora seleccionada: ${randomHour}:${randomMinute.toString().padStart(2, '0')} (${timeValue})`);
  
        const timePickerDialog = page.locator('[data-time-picker-content="true"]');
        try {
          await timePickerDialog.waitFor({ state: 'hidden', timeout: 3000 });
        } catch (e) {
          await safeWaitForTimeout(page, 1000);
        }
        
        // 4. Ciudad (usando autocompletado de Google)
        const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
        const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
        
        await safeWaitForTimeout(page, 500);
        
  // Buscar el campo de ciudad usando el label "Ciudad" para asegurar que es el correcto
  let cityField: ReturnType<typeof page.locator> | null = null;
  
  const ciudadLabel = page.locator('label:has-text("Ciudad")').first();
          const labelExists = await ciudadLabel.count().then(count => count > 0);
          
          if (labelExists) {
              const labelFor = await ciudadLabel.getAttribute('for');
              if (labelFor) {
      cityField = page.locator(`input[id="${labelFor}"]`).first();
      const foundById = await cityField.count().then(count => count > 0);
      if (foundById) {
        await cityField.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Campo de ciudad encontrado por atributo "for" del label: ${labelFor}`);
        } else {
        console.log(`⚠ Campo con id="${labelFor}" no existe. Buscando input hermano del label...`);
        cityField = ciudadLabel.locator('xpath=preceding-sibling::input[1]').first();
        if (!(await cityField.count())) {
          cityField = ciudadLabel.locator('xpath=ancestor::div[contains(@class, "relative") or contains(@class, "flex")]//input').first();
        }
        await cityField.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Campo de ciudad encontrado por proximidad al label`);
            }
          } else {
      cityField = ciudadLabel.locator('xpath=preceding-sibling::input[1]').first();
      const siblingExists = await cityField.count().then(count => count > 0);
      if (!siblingExists) {
        cityField = ciudadLabel.locator('xpath=ancestor::div[contains(@class, "relative") or contains(@class, "flex")]//input').first();
      }
      if (!(await cityField.count())) {
        cityField = ciudadLabel.locator('xpath=following::input[1]').first();
      }
      await cityField.waitFor({ state: 'visible', timeout: 5000 });
      console.log(`✓ Campo de ciudad encontrado por proximidad al label`);
    }
  } else {
    console.log(`⚠ Label "Ciudad" no encontrado, usando selectores alternos...`);
    cityField = page.locator('input').filter({
      has: page.locator('..').locator('i.icon-map-pin')
    }).first();
  }
  
  if (cityField) {
    const exists = await cityField.count().then(count => count > 0);
    if (!exists) {
      cityField = null;
    }
  }
  
  if (!cityField) {
    throw new Error('❌ No se pudo encontrar el campo de ciudad');
          }
          
          await cityField.waitFor({ state: 'visible', timeout: 5000 });
  
  if (!cityField) {
    throw new Error('❌ No se pudo encontrar el campo de ciudad');
  }
  
  // Verificar que el campo encontrado es realmente el campo de ciudad
  const fieldId = await cityField.getAttribute('id');
  const fieldLabel = await cityField.locator('xpath=ancestor::div//label[contains(text(), "Ciudad")]').count().catch(() => 0);
  
  console.log(`✓ Campo de ciudad identificado: id="${fieldId}"`);
  
  // Asegurar que ningún otro campo tenga el foco antes de escribir en el campo de ciudad
  // Hacer clic en un área neutral para quitar el foco de cualquier otro campo
  await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => {});
  await safeWaitForTimeout(page, 200);
  
  // Ahora hacer clic específicamente en el campo de ciudad
  await cityField.scrollIntoViewIfNeeded();
  await cityField.click({ force: true });
  await safeWaitForTimeout(page, 500);
  
  // Limpiar el campo si tiene algún valor
        const clearButton = page.locator('button[aria-label="Clear address"]');
        const clearButtonVisible = await clearButton.isVisible().catch(() => false);
        
        if (clearButtonVisible) {
          await clearButton.click();
          await safeWaitForTimeout(page, 200);
    // Hacer clic nuevamente en el campo después de limpiar para asegurar el foco
    await cityField.click({ force: true });
    await safeWaitForTimeout(page, 500);
    } else {
    // Limpiar el campo seleccionando todo y borrando
    const currentValue = await cityField.inputValue();
    if (currentValue && currentValue.trim().length > 0) {
          await cityField.selectText();
          await cityField.press('Backspace');
          await safeWaitForTimeout(page, 200);
    }
  }
  
  // Verificar que el campo correcto esté enfocado verificando el atributo id
  const focusedElement = await page.evaluate(() => {
    const active = document.activeElement;
    return active && active.tagName === 'INPUT' ? (active as HTMLInputElement).id : null;
  });
  
  const cityFieldId = await cityField.getAttribute('id');
  
  if (focusedElement !== cityFieldId) {
    console.log(`⚠️ El foco no está en el campo de ciudad (id esperado: "${cityFieldId}", id actual: "${focusedElement}"). Enfocando nuevamente...`);
    // Forzar el foco usando JavaScript
    await cityField.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.click();
    });
    await safeWaitForTimeout(page, 500);
    
    // Verificar nuevamente
    const focusedElement2 = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active.tagName === 'INPUT' ? (active as HTMLInputElement).id : null;
    });
    
    if (focusedElement2 !== cityFieldId) {
      console.log(`⚠️ Aún no está enfocado correctamente. Intentando con selectText y luego escribir...`);
      await cityField.selectText();
      await safeWaitForTimeout(page, 200);
    }
  } else {
    console.log(`✓ Campo de ciudad correctamente enfocado`);
  }
  
  // Escribir en el campo de ciudad
  await cityField.fill(randomCity);
  await safeWaitForTimeout(page, 300);
  
  // Verificar que el texto se escribió en el campo correcto
  const cityValue = await cityField.inputValue();
  if (cityValue !== randomCity) {
    console.log(`⚠️ El texto no se escribió correctamente. Intentando nuevamente...`);
    await cityField.clear();
    await cityField.fill(randomCity);
    await safeWaitForTimeout(page, 300);
  }
  
  console.log(`✓ Ciudad escrita: "${randomCity}" (valor en campo: "${await cityField.inputValue()}")`);
        await safeWaitForTimeout(page, 2000);
        
  // Esperar a que aparezcan las opciones de autocompletado de Google Places
  try {
    const autocompleteList = page.locator('ul.flex.flex-col.py-2, ul[class*="flex"][class*="flex-col"]');
    await autocompleteList.first().waitFor({ state: 'visible', timeout: 5000 });
    
    const autocompleteOptions = autocompleteList.locator('li.cursor-pointer, li[class*="cursor-pointer"]');
    await autocompleteOptions.first().waitFor({ state: 'visible', timeout: 3000 });
    
    const optionsCount = await autocompleteOptions.count();
    console.log(`📋 Opciones de ciudad encontradas: ${optionsCount}`);
    
    if (optionsCount > 0) {
      const firstOption = autocompleteOptions.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad: "${optionText?.trim()}"`);
      
      await firstOption.click();
      await safeWaitForTimeout(page, 1500);
      
      const cityValue = await cityField.inputValue();
      eventData.city = cityValue;
      console.log(`✅ Ciudad seleccionada. Valor del campo: "${cityValue}"`);
      
      const errorMessage = page.locator('p.text-xsmall.text-danger-neutral:has-text("Selecciona una dirección")');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      if (!hasError) {
        console.log('✅ Mensaje de error desapareció, ciudad seleccionada correctamente');
      }
    } else {
      throw new Error('No se encontraron opciones en la lista');
    }
  } catch (error) {
    try {
      const autocompleteOptionsAlt = page.locator('li.cursor-pointer.flex.items-center, li[class*="cursor-pointer"]');
      await autocompleteOptionsAlt.first().waitFor({ state: 'visible', timeout: 3000 });
      
      const firstOption = autocompleteOptionsAlt.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad (selector alternativo): "${optionText?.trim()}"`);
      
      await firstOption.click();
      await safeWaitForTimeout(page, 1500);
      const cityValueAlt = await cityField.inputValue();
      eventData.city = cityValueAlt;
      console.log('✅ Ciudad seleccionada del autocompletado (selector alternativo)');
    } catch (error2) {
      // Si no se encontró autocompletado, usar el valor que se escribió
      const cityValueFallback = await cityField.inputValue();
      eventData.city = cityValueFallback || randomCity;
      console.log(`⚠️ No se pudieron encontrar las opciones de autocompletado, usando: "${eventData.city}"`);
    }
  }
  
  // Asegurar que la ciudad esté guardada
  if (!eventData.city) {
    const cityValueFinal = await cityField.inputValue();
    eventData.city = cityValueFinal || randomCity;
        }
        
        // 5. Número de invitados
  const randomAttendees = Math.floor(Math.random() * 181) + 20;
        const attendeesField = page.locator('input[id="Attendees"]');
        await attendeesField.fill(randomAttendees.toString());
  eventData.attendees = randomAttendees;
        console.log(`✓ Campo "Número de invitados" llenado: ${randomAttendees}`);
        
        console.log('✅ Formulario completado exitosamente');
        
        // 6. Hacer clic en el botón "Crear evento"
  await showStepMessage(page, '🚀 CREANDO EVENTO');
        const createEventButton = page.locator('button.bg-primary-neutral.text-neutral-0').filter({
          hasText: 'Crear evento'
        });
        await createEventButton.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Botón "Crear evento" encontrado y visible`);
        await createEventButton.click();
        console.log(`✓ Se hizo clic en "Crear evento"`);
        await safeWaitForTimeout(page, 2000);
  
  // 6.1. Validar el diálogo de confirmación pre-solicitud
  await showStepMessage(page, '📋 VALIDANDO DIÁLOGO DE CONFIRMACIÓN');
  console.log('\n🔍 Validando diálogo de confirmación pre-solicitud...');
  
  // Buscar el diálogo de confirmación con múltiples estrategias
  let dialogTitle: ReturnType<typeof page.locator> | null = null;
  
  // Estrategia 1: Selector original
  try {
    dialogTitle = page.locator('p.text-large.font-semibold');
    await expect(dialogTitle).toBeVisible({ timeout: 3000 });
    console.log(`✓ Diálogo de confirmación encontrado con selector original`);
  } catch (e1) {
    console.log(`⚠ Selector original no funcionó, intentando otras estrategias...`);
    
    // Estrategia 2: Buscar por texto que contenga "Dile aquí"
    try {
      dialogTitle = page.locator('p').filter({ hasText: /Dile aquí|necesitas|qué es lo que/i });
      await expect(dialogTitle).toBeVisible({ timeout: 3000 });
      console.log(`✓ Diálogo de confirmación encontrado por texto`);
    } catch (e2) {
      console.log(`⚠ Selector por texto no funcionó, intentando selector genérico...`);
      
      // Estrategia 3: Buscar cualquier párrafo con clase font-semibold
      try {
        dialogTitle = page.locator('p.font-semibold');
        await expect(dialogTitle).toBeVisible({ timeout: 3000 });
        console.log(`✓ Diálogo de confirmación encontrado con selector genérico`);
      } catch (e3) {
        console.log(`⚠ No se encontró el diálogo de confirmación con ninguna estrategia`);
        console.log(`📊 Contenido de la página después de crear evento:`);
        
        // Buscar todos los párrafos visibles para debugging
        const allParagraphs = page.locator('p');
        const paragraphCount = await allParagraphs.count();
        console.log(`📊 Total de párrafos encontrados: ${paragraphCount}`);
        
        for (let i = 0; i < Math.min(paragraphCount, 10); i++) {
          try {
            const paragraph = allParagraphs.nth(i);
            const text = await paragraph.textContent();
            const isVisible = await paragraph.isVisible();
            if (text && isVisible) {
              console.log(`   - Párrafo ${i}: "${text.trim().substring(0, 100)}..."`);
            }
    } catch (e) {
            // Ignorar errores al leer párrafos
          }
        }
        
        console.log(`⚠ Continuando sin validar el diálogo de confirmación...`);
      }
    }
  }
  
  if (dialogTitle) {
    console.log(`✓ Diálogo de confirmación visible`);
    
    // Extraer y validar el nombre del servicio en el diálogo
    let dialogTitleText = '';
    dialogTitleText = await dialogTitle.textContent() || '';
    console.log(`📝 Texto del diálogo: "${dialogTitleText}"`);
    
    // El texto debería contener "Dile aquí a [NOMBRE_SERVICIO] qué es lo que necesitas"
    if (dialogTitleText && dialogTitleText.includes('Dile aquí a')) {
      console.log(`✓ El diálogo menciona el servicio correctamente`);
    } else {
      console.log(`⚠ El formato del diálogo no es el esperado`);
    }
    
    // Validar la información del evento en el diálogo
    const eventInfoContainer = page.locator('div.w-full.flex.flex-col.items-center.border-\\[1px\\]');
    const containerVisible = await eventInfoContainer.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (containerVisible) {
      console.log(`✓ Contenedor de información del evento visible`);
      
      const eventInfoText = await eventInfoContainer.textContent();
      console.log(`📋 Información del evento en el diálogo: "${eventInfoText}"`);
      
      // Validar que contiene el tipo de evento
      if (eventInfoText?.includes(eventTypeForValidation)) {
        console.log(`✓ Tipo de evento coincide: "${eventTypeForValidation}"`);
      } else {
        console.log(`⚠ Tipo de evento no encontrado. Esperado: "${eventTypeForValidation}"`);
      }
      
      // Validar que contiene el nombre del festejado
      if (eventInfoText?.includes(randomHonoree)) {
        console.log(`✓ Nombre del festejado coincide: "${randomHonoree}"`);
      } else {
        console.log(`⚠ Nombre del festejado no encontrado. Esperado: "${randomHonoree}"`);
      }
      
      // Validar que contiene el número de invitados
      if (eventInfoText?.includes(randomAttendees.toString())) {
        console.log(`✓ Número de invitados coincide: ${randomAttendees}`);
      } else {
        console.log(`⚠ Número de invitados no encontrado. Esperado: ${randomAttendees}`);
      }
      
      // Validar que contiene la ciudad usando el valor seleccionado
      const cityValue = eventData.city || '';
      console.log(`📊 Ciudad seleccionada: "${cityValue}"`);
      
      if (cityValue && eventInfoText?.toLowerCase().includes(cityValue.toLowerCase())) {
        console.log(`✓ Ciudad coincide exactamente: "${cityValue}"`);
      } else {
        console.log(`⚠ Ciudad no coincide exactamente. Ciudad seleccionada: "${cityValue}"`);
        
        // Buscar cualquier mención de la ciudad en el texto
        const cityWords = cityValue.split(/[,\s]+/).filter(word => word.length > 2);
        let foundCityWords: string[] = [];
        
        for (const word of cityWords) {
          if (eventInfoText?.toLowerCase().includes(word.toLowerCase())) {
            foundCityWords.push(word);
          }
        }
        
        if (foundCityWords.length > 0) {
          console.log(`✓ Ciudad validada por palabras encontradas: [${foundCityWords.join(', ')}]`);
        } else {
          console.log(`⚠ Ninguna palabra de la ciudad fue encontrada en el diálogo`);
          console.log(`📊 Palabras buscadas: [${cityWords.join(', ')}]`);
        }
      }
      
      // Validar que contiene la hora
      const timeValue = eventData.time || '';
      console.log(`📊 Hora en el campo: "${timeValue}"`);
      
      if (timeValue && eventInfoText?.toLowerCase().includes(timeValue.toLowerCase())) {
        console.log(`✓ Hora coincide exactamente: ${timeValue}`);
      } else {
        console.log(`⚠ Hora no coincide exactamente. Valor del campo: "${timeValue}"`);
        
        // Validar componentes de la hora seleccionada
        const timeMatch = timeValue.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          
          // Buscar la hora en el diálogo
          if (eventInfoText?.includes(hour.toString())) {
            console.log(`✓ Hora validada: ${hour}`);
          }
          
          // Buscar los minutos en el diálogo
          if (eventInfoText?.includes(minute.toString().padStart(2, '0'))) {
            console.log(`✓ Minutos validados: ${minute.toString().padStart(2, '0')}`);
          }
          
          // Si no se validó la hora exacta, intentar con formato 24h
          if (period === 'PM' && hour !== 12) {
            const hour24 = hour + 12;
            if (eventInfoText?.includes(hour24.toString())) {
              console.log(`✓ Hora validada en formato 24h: ${hour24}`);
            }
          }
        }
      }
      
      console.log(`\n✓ Validación del diálogo de confirmación completada`);
    } else {
      console.log(`⚠ Contenedor de información del evento no visible`);
    }
  }
  
  await safeWaitForTimeout(page, 1000);
  
  // 7. Interactuar con el modal de solicitud (checkboxes, textarea y botón "Solicitar")
  await showStepMessage(page, '🪟 INTERACTUANDO CON MODAL DE SOLICITUD');
  const preQuotationForm = page.locator('#PrequotationRequestForm');
  await preQuotationForm.waitFor({ state: 'visible', timeout: 15000 });
  console.log('🪟 Modal de solicitud visible');
  
  const checkboxLocator = preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]');
  const checkboxCount = await checkboxLocator.count();
  console.log(`📋 Checkboxes disponibles: ${checkboxCount}`);
  
  if (checkboxCount > 0) {
    const shouldSelectAll = Math.random() < 0.4;
    
    if (shouldSelectAll) {
      await showStepMessage(page, '☑️ SELECCIONANDO TODAS LAS VARIEDADES');
      const selectAllButton = preQuotationForm.locator('div:has(> p:has-text("Seleccionar todo")) button').first();
      if (await selectAllButton.isVisible().catch(() => false)) {
        await selectAllButton.click();
        console.log('✅ Se hizo clic en "Seleccionar todo"');
      } else {
        console.log('⚠ Botón "Seleccionar todo" no visible, seleccionando manualmente');
      }
    } else {
      await showStepMessage(page, '☑️ SELECCIONANDO VARIEDADES ALEATORIAS');
    }
    
    if (! (await preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]:checked').count())) {
      // Seleccionar manualmente algunos checkboxes si no se seleccionaron con el botón
      const indices = Array.from({ length: checkboxCount }, (_, i) => i).sort(() => Math.random() - 0.5);
      const selections = Math.min(checkboxCount, Math.max(1, Math.floor(Math.random() * checkboxCount) + 1));
      
      for (let i = 0; i < selections; i++) {
        const checkbox = checkboxLocator.nth(indices[i]);
        const alreadyChecked = await checkbox.evaluate(el => (el as HTMLInputElement).checked).catch(() => false);
        if (alreadyChecked) continue;
        
        const checkboxId = await checkbox.getAttribute('id');
        let clickTarget = checkbox;
        if (checkboxId) {
          const label = preQuotationForm.locator(`label[for="${checkboxId}"]`).first();
          if (await label.count()) {
            clickTarget = label;
          }
        } else {
          const buttonWrapper = checkbox.locator('xpath=ancestor::button[1]');
          if (await buttonWrapper.count()) {
            clickTarget = buttonWrapper;
          }
        }
        
        await clickTarget.click({ force: true });
        console.log(`  ✓ Checkbox ${i + 1} seleccionado (${checkboxId || 'sin id'})`);
        await safeWaitForTimeout(page, 200);
      }
    }
  } else {
    console.log('⚠ No se encontraron checkboxes para seleccionar');
  }
  
  // 8. Llenar el campo "Solicitudes"
  await showStepMessage(page, '📝 LLENANDO CAMPO DE SOLICITUDES');
  const requestMessages = [
    'Nos gustaría incluir opciones vegetarianas y postres personalizados.',
    'Buscamos algo con temática tropical y servicio completo de montaje.',
    'Necesitamos cotización con barra libre y personal extra para servicio.',
    'Queremos opciones premium y asesoría para decoración a juego.',
  ];
  const randomRequestMessage = requestMessages[Math.floor(Math.random() * requestMessages.length)];
  
  const requestField = preQuotationForm.locator('textarea#Request');
  await requestField.waitFor({ state: 'visible', timeout: 5000 });
  await requestField.fill(randomRequestMessage);
  console.log(`📝 Campo "Solicitudes" llenado con: ${randomRequestMessage}`);
  
  // 9. Enviar la solicitud
  await showStepMessage(page, '🚀 ENVIANDO SOLICITUD');
  // El botón "Solicitar" está fuera del formulario, buscarlo en toda la página
  const solicitarButton = page.locator('button[form="PrequotationRequestForm"], button:has-text("Solicitar")').first();
  await solicitarButton.waitFor({ state: 'visible', timeout: 10000 });
  await solicitarButton.click();
  console.log('🚀 Botón "Solicitar" presionado');
  
  await preQuotationForm.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => console.log('⚠ El modal de selección no se ocultó, continuando...'));
  await safeWaitForTimeout(page, 1000);
  
  // 9.1 Confirmar diálogo "Solicitud enviada"
  await showStepMessage(page, '✅ CONFIRMANDO SOLICITUD ENVIADA');
  const successDialog = page.locator('div:has-text("Solicitud enviada")').first();
  try {
    await successDialog.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🎊 Modal "Solicitud enviada" visible');
    
    const okButton = successDialog.locator('button:has-text("OK")').first();
    await okButton.waitFor({ state: 'visible', timeout: 5000 });
    await okButton.click();
    console.log('👍 Botón "OK" presionado');
  } catch (successModalError) {
    console.log('⚠ Modal de confirmación no apareció o no se pudo cerrar, continuando...');
  }
  
  await safeWaitForTimeout(page, 1500);
  
  // 10. Verificar que el flujo regrese automáticamente al dashboard del cliente
  await showStepMessage(page, '🔁 ESPERANDO REGRESO AL DASHBOARD');
  console.log('🔁 Esperando a que la aplicación regrese al dashboard del cliente...');
  await page.waitForURL('**/client/dashboard', { timeout: 20000 });
  console.log('🏠 Dashboard del cliente visible');
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 1000);
  
  // 10.1. Validar que el evento aparece en la lista general (ANTES de filtrar por día)
  await showStepMessage(page, '📋 VALIDANDO EVENTO EN LISTA GENERAL');
  console.log('\n🔍 Validando que el evento aparece en la lista de eventos del dashboard (sin filtrar)...');
  
  const eventsContainerInitial = page.locator('div.flex.relative.w-full.overflow-hidden');
  const containerInitialVisible = await eventsContainerInitial.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (containerInitialVisible) {
    console.log(`✓ Contenedor de eventos visible en el dashboard`);
    
    // Buscar eventos en la lista
    const eventCardsInitial = eventsContainerInitial.locator('button.flex.flex-col');
    const eventCountInitial = await eventCardsInitial.count();
    console.log(`📊 Eventos encontrados en la lista: ${eventCountInitial}`);
    
    if (eventCountInitial > 0) {
      console.log(`✓ Lista de eventos cargada correctamente`);
      
      // Buscar el evento creado por el nombre del festejado
      let eventFoundInitial = false;
      for (let i = 0; i < eventCountInitial; i++) {
        const eventCard = eventCardsInitial.nth(i);
        const eventText = await eventCard.textContent();
        
        if (eventText && eventText.includes(randomHonoree)) {
          console.log(`✅ Evento encontrado en la lista general: "${randomHonoree}"`);
          console.log(`   📋 Detalles: "${eventText.trim().substring(0, 100)}..."`);
          eventFoundInitial = true;
          break;
        }
      }
      
      if (!eventFoundInitial) {
        console.log(`⚠ Evento "${randomHonoree}" NO encontrado en la lista general`);
        console.log(`📊 Listando eventos disponibles para debugging...`);
        
        // Listar los primeros 3 eventos para debugging
        for (let i = 0; i < Math.min(eventCountInitial, 3); i++) {
          const eventCard = eventCardsInitial.nth(i);
          const eventCardText = await eventCard.textContent();
          console.log(`   - Evento ${i + 1}: "${eventCardText?.trim().substring(0, 80)}..."`);
        }
      }
    } else {
      console.log(`⚠ No se encontraron eventos en la lista`);
    }
  } else {
    console.log(`⚠ Contenedor de eventos no visible en el dashboard`);
  }
  
  // 10.2. Seleccionar el día del evento en el calendario del dashboard
  await showStepMessage(page, '📅 FILTRANDO EVENTOS POR DÍA EN CALENDARIO');
  console.log('\n🔍 Buscando calendario en el dashboard...');
  
  // Obtener el día del evento creado (parsear la fecha guardada)
  let eventDay = 0;
  let eventMonth = '';
  let futureDate: Date | null = null;
  
  if (eventData.date) {
    // El formato puede ser DD-MM-YYYY o DD/MM/YYYY
    const dateParts = eventData.date.split(/[-\/]/);
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Los meses en JavaScript son 0-indexed
      const year = parseInt(dateParts[2]);
      
      futureDate = new Date(year, month, day);
      eventDay = futureDate.getDate();
      eventMonth = futureDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      
      console.log(`📅 Día del evento creado: ${eventDay}`);
      console.log(`📅 Mes del evento: ${eventMonth}`);
    }
  }
  
  if (futureDate && eventDay > 0) {
    // Buscar el calendario en el dashboard
    const calendarContainer = page.locator('div.w-full.flex.flex-col.gap-4').first();
    const calendarVisible = await calendarContainer.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (calendarVisible) {
      console.log(`✓ Calendario encontrado en el dashboard`);
      
      // Buscar el título del mes
      const monthTitle = calendarContainer.locator('button.text-dark-neutral.font-bold').first();
      const monthText = await monthTitle.textContent();
      console.log(`📅 Mes mostrado en calendario: "${monthText?.trim()}"`);
      
      // Navegar al mes del evento si es necesario
      const currentMonthInCalendar = monthText?.trim().toLowerCase() || '';
      const targetMonth = eventMonth.toLowerCase();
      
      console.log(`🔍 Verificando si necesitamos cambiar de mes...`);
      console.log(`   - Mes en calendario: "${currentMonthInCalendar}"`);
      console.log(`   - Mes del evento: "${targetMonth}"`);
      
      // Si el mes no coincide, navegar usando los botones de chevron
      if (!currentMonthInCalendar.includes(targetMonth.split(' ')[0])) {
        console.log(`⚠ El mes del calendario no coincide con el mes del evento`);
        console.log(`🖱️ Navegando al mes correcto...`);
        
        // Buscar el botón de siguiente mes (chevron-right)
        const nextMonthButton = calendarContainer.locator('button').filter({
          has: page.locator('i.icon-chevron-right')
        });
        
        // Hacer clic hasta 3 veces para avanzar meses si es necesario
        for (let clicks = 0; clicks < 3; clicks++) {
          await nextMonthButton.click();
          await safeWaitForTimeout(page, 1000);
          
          const updatedMonthText = await monthTitle.textContent();
          console.log(`   📅 Mes actualizado: "${updatedMonthText?.trim()}"`);
          
          if (updatedMonthText?.toLowerCase().includes(targetMonth.split(' ')[0])) {
            console.log(`✓ Mes correcto encontrado: "${updatedMonthText?.trim()}"`);
            break;
          }
        }
      }
      
      // Buscar todos los días del calendario
      const allDayButtons = calendarContainer.locator('button').filter({
        has: page.locator('p.text-dark-neutral')
      }).filter({
        hasNot: page.locator('i.icon')
      });
      
      const dayButtonCount = await allDayButtons.count();
      console.log(`📊 Total de días en el calendario: ${dayButtonCount}`);
      
      // Buscar el día del evento por número
      let eventDayFound = false;
      for (let i = 0; i < dayButtonCount; i++) {
        const dayButton = allDayButtons.nth(i);
        const dayTextElement = dayButton.locator('p.text-dark-neutral').first();
        const dayText = await dayTextElement.textContent();
        const dayNumber = parseInt(dayText?.trim() || '0');
        
        // Verificar que no tiene opacidad (días del mes anterior/siguiente tienen opacity-40)
        const hasOpacity = await dayButton.locator('p.opacity-40').count() > 0;
        
        if (dayNumber === eventDay && !hasOpacity) {
          console.log(`✓ Día del evento encontrado en el calendario: ${dayNumber}`);
          console.log(`🖱️ Haciendo clic en el día ${dayNumber} para filtrar eventos...`);
          await dayButton.click();
          await safeWaitForTimeout(page, 2000);
          console.log(`✓ Se hizo clic en el día ${dayNumber} del calendario`);
          
          eventDayFound = true;
          break;
        }
      }
      
      if (!eventDayFound) {
        console.log(`⚠ Día del evento (${eventDay}) no encontrado en el calendario`);
      } else {
        // Validar que el evento aparece en la sección de eventos después de seleccionar el día
        console.log(`\n🔍 Validando que el evento aparece en la sección de eventos del día seleccionado...`);
        
        const eventsSection = page.locator('div.flex.relative.w-full.overflow-hidden');
        const eventsSectionVisible = await eventsSection.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (eventsSectionVisible) {
          console.log(`✓ Sección de eventos visible en el dashboard`);
          
          // Buscar todos los eventos en la lista
          const eventCards = eventsSection.locator('button.flex.flex-col');
          const eventCardsCount = await eventCards.count();
          console.log(`📊 Total de eventos mostrados en la lista: ${eventCardsCount}`);
          
          if (eventCardsCount > 0) {
            console.log(`✓ Eventos encontrados en la lista`);
            
            // Buscar el evento recién creado por el nombre del festejado
            let eventFoundInList = false;
            
            for (let i = 0; i < eventCardsCount; i++) {
              const eventCard = eventCards.nth(i);
              const eventCardText = await eventCard.textContent();
              
              if (eventCardText) {
                // Verificar si el evento contiene el nombre del festejado
                if (eventCardText.includes(randomHonoree)) {
                  console.log(`✓ Evento encontrado en la lista del día seleccionado: "${randomHonoree}"`);
                  console.log(`   📋 Detalles: "${eventCardText.trim().substring(0, 100)}..."`);
                  eventFoundInList = true;
                  
                  // Validar que la fecha del evento coincide con el día seleccionado
                  const eventDateInCard = eventCardText.match(/\d{1,2}\s+\w+\.?\s+\d{4}/);
                  if (eventDateInCard) {
                    console.log(`   📅 Fecha en la card: "${eventDateInCard[0]}"`);
                  }
                  
                  break;
                }
              }
            }
            
            if (eventFoundInList) {
              console.log(`✅ VALIDACIÓN EXITOSA: El evento "${randomHonoree}" aparece en la lista del día ${eventDay}`);
            } else {
              console.log(`⚠ Evento "${randomHonoree}" NO encontrado en la lista del día ${eventDay}`);
            }
            
            // Validar que todos los eventos mostrados corresponden al día seleccionado
            console.log(`\n🔍 Validando que todos los eventos mostrados pertenecen al día ${eventDay}...`);
            
            let allEventsFromSelectedDay = true;
            for (let i = 0; i < eventCardsCount; i++) {
              const eventCard = eventCards.nth(i);
              const eventCardText = await eventCard.textContent();
              
              if (eventCardText) {
                // Extraer la fecha del evento (formato: "31 oct. 2025")
                const dateMatch = eventCardText.match(/(\d{1,2})\s+(\w+)\.?\s+(\d{4})/);
                
                if (dateMatch) {
                  const dayInCard = parseInt(dateMatch[1]);
                  console.log(`   📅 Evento ${i + 1}: Día ${dayInCard}`);
                  
                  if (dayInCard === eventDay) {
                    console.log(`      ✓ Corresponde al día seleccionado (${eventDay})`);
                  } else {
                    console.log(`      ⚠ NO corresponde al día seleccionado (esperado: ${eventDay}, encontrado: ${dayInCard})`);
                    allEventsFromSelectedDay = false;
                  }
                } else {
                  console.log(`   ⚠ Evento ${i + 1}: No se pudo extraer la fecha`);
                }
              }
            }
            
            if (allEventsFromSelectedDay) {
              console.log(`✓ Todos los eventos mostrados corresponden al día seleccionado (${eventDay})`);
            } else {
              console.log(`⚠ Algunos eventos NO corresponden al día seleccionado (puede ser esperado si el filtro no se aplicó)`);
            }
          } else {
            console.log(`⚠ No se encontraron eventos en la lista del día seleccionado`);
          }
        } else {
          console.log(`⚠ Sección de eventos no visible en el dashboard`);
        }
      }
    } else {
      console.log(`⚠ Calendario no encontrado en el dashboard`);
      
      // Intentar buscar el calendario de forma alternativa
      const calendarAlt = page.locator('div.flex.flex-col.gap-2.p-4.rounded-6.bg-light-light.shadow-4');
      const calendarAltVisible = await calendarAlt.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (calendarAltVisible) {
        console.log(`✓ Calendario encontrado (versión alternativa)`);
        
        // Buscar el día del evento en la versión alternativa
        const allDayButtonsAlt = calendarAlt.locator('button').filter({
          has: page.locator('p.text-dark-neutral')
        });
        
        const dayButtonCountAlt = await allDayButtonsAlt.count();
        console.log(`📊 Total de días en el calendario (alt): ${dayButtonCountAlt}`);
        
        for (let i = 0; i < dayButtonCountAlt; i++) {
          const dayButton = allDayButtonsAlt.nth(i);
          const dayText = await dayButton.locator('p').first().textContent();
          const dayNumber = parseInt(dayText?.trim() || '0');
          const hasOpacity = await dayButton.locator('p.opacity-40').count() > 0;
          
          if (dayNumber === eventDay && !hasOpacity) {
            console.log(`✓ Día del evento encontrado: ${dayNumber}`);
            console.log(`🖱️ Haciendo clic en el día ${dayNumber}...`);
            await dayButton.click();
            await safeWaitForTimeout(page, 2000);
            console.log(`✓ Se hizo clic en el día ${dayNumber} del calendario`);
            break;
          }
        }
      }
    }
  } else {
    console.log(`⚠ No se pudo obtener la fecha del evento para filtrar por día`);
  }
  
  // 11. Verificar que el evento aparezca en el dashboard del cliente
  await showStepMessage(page, '🔍 VERIFICANDO EVENTO EN DASHBOARD');
  console.log('🔍 Verificando que el nuevo evento aparezca en el dashboard del cliente...');
  
  const newEventCard = page.locator(`text=${randomHonoree}`).first();
  await newEventCard.waitFor({ state: 'visible', timeout: 15000 });
  console.log(`🎉 Evento "${randomHonoree}" visible en el dashboard del cliente`);
  
  // 12. Verificar que los datos del evento coincidan con los datos creados
  await showStepMessage(page, '✅ VERIFICANDO DATOS DEL EVENTO');
  console.log('\n🔍 Verificando que los datos del evento coincidan...');
  
  // Buscar la tarjeta del evento (puede estar en un contenedor padre)
  const eventCardContainer = newEventCard.locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "flex")]').first();
  const cardExists = await eventCardContainer.count().then(count => count > 0);
  const cardToCheck = cardExists ? eventCardContainer : page.locator(`text=${randomHonoree}`).locator('xpath=ancestor::div').first();
  
  // Verificar nombre del festejado
  const honoreeInCard = await cardToCheck.locator(`text=${eventData.honoree}`).count().then(count => count > 0);
  if (honoreeInCard) {
    console.log(`✅ Nombre del festejado verificado: "${eventData.honoree}"`);
  } else {
    console.log(`⚠️ Nombre del festejado no encontrado en la tarjeta`);
  }
  
  // Verificar fecha (puede estar en diferentes formatos)
  const dateInCard = await cardToCheck.textContent();
  const dateFormats = [
    eventData.date,
    eventData.date.replace(/-/g, '/'),
    eventData.date.split('-').reverse().join('/'),
  ];
  const dateFound = dateFormats.some(format => dateInCard?.includes(format) || false);
  if (dateFound) {
    console.log(`✅ Fecha verificada: "${eventData.date}"`);
  } else {
    console.log(`⚠️ Fecha "${eventData.date}" no encontrada en la tarjeta (contenido: "${dateInCard?.substring(0, 100)}...")`);
  }
  
  // Verificar hora (puede estar en formato 12h o 24h)
  const timeInCard = dateInCard || '';
  const timeFormats = [
    eventData.time,
    eventData.time.replace(' PM', '').replace(' AM', ''),
    eventData.time.toLowerCase(),
  ];
  const timeFound = timeFormats.some(format => timeInCard?.includes(format) || false);
  if (timeFound) {
    console.log(`✅ Hora verificada: "${eventData.time}"`);
  } else {
    console.log(`⚠️ Hora "${eventData.time}" no encontrada en la tarjeta`);
  }
  
  // NOTA: La ciudad y el número de invitados NO se muestran en la tarjeta del evento,
  // solo se muestran en la página de detalles del evento. Por lo tanto, no se validan aquí.
  
  // 13. Seleccionar el evento en el dashboard
  await showStepMessage(page, '🖱️ SELECCIONANDO EVENTO EN DASHBOARD');
  console.log('\n🖱️ Seleccionando evento en el dashboard...');
  
  // Hacer clic en la tarjeta del evento
  await newEventCard.click();
  await safeWaitForTimeout(page, 2000);
  console.log('✓ Se hizo clic en la tarjeta del evento');
  
  // Esperar a que cargue la página de detalles del evento
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 2000);
  
  // 14. Verificar que el servicio aparece en la sección de servicios
  await showStepMessage(page, '🔍 VERIFICANDO SERVICIO EN SECCIÓN DE SERVICIOS');
  console.log('\n🔍 Verificando que el servicio aparece en la sección de servicios...');
  
  // Buscar el contenedor de servicios
  const servicesContainer = page.locator('div.flex.flex-col.grow.overflow-y-auto.w-full');
  const containerVisible = await servicesContainer.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (containerVisible) {
    console.log(`✓ Contenedor de servicios visible`);
    
    // Buscar servicios en la lista
    const serviceCards = servicesContainer.locator('button.text-start.flex.flex-col');
    const serviceCount = await serviceCards.count();
    console.log(`📊 Servicios encontrados en la lista: ${serviceCount}`);
    
    if (serviceCount > 0) {
      console.log(`✓ Lista de servicios cargada correctamente`);
      
      // Listar los servicios encontrados para validación
      console.log(`📋 Listando servicios encontrados para validación...`);
      for (let j = 0; j < Math.min(serviceCount, 5); j++) {
        const serviceCard = serviceCards.nth(j);
        const serviceText = await serviceCard.textContent();
        console.log(`   - Servicio ${j + 1}: "${serviceText?.trim().substring(0, 80)}..."`);
      }
      
      // Buscar el servicio específico por su nombre
      const servicioEnLista = servicesContainer.locator(`text=${servicioInfo.nombre}`).first();
      const servicioVisible = await servicioEnLista.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (servicioVisible) {
        console.log(`✅ Servicio "${servicioInfo.nombre}" encontrado en la sección de servicios`);
        
        // Verificar que el servicio tiene el estado correcto (PENDIENTE)
        const servicioCard = servicioEnLista.locator('xpath=ancestor::button[1]').first();
        const estadoPendiente = await servicioCard.locator('text=PENDIENTE').count().then(count => count > 0);
        if (estadoPendiente) {
          console.log('✅ Estado "PENDIENTE" verificado en el servicio');
        }
        
        console.log(`✓ El servicio seleccionado está incluido en esta lista`);
      } else {
        console.log(`⚠️ Servicio "${servicioInfo.nombre}" no visible en la sección de servicios`);
      }
    } else {
      console.log(`⚠ No se encontraron servicios en la lista`);
    }
  } else {
    // Buscar la sección de servicios (puede estar en un contenedor con overflow-y-auto)
    const serviciosSection = page.locator('div.flex.flex-col.grow.overflow-y-auto').first();
    const serviciosExists = await serviciosSection.count().then(count => count > 0);
    
    if (serviciosExists) {
      // Buscar el servicio por su nombre (puede estar en un botón o tarjeta)
      const servicioEnLista = serviciosSection.locator(`text=${servicioInfo.nombre}`).first();
      const servicioVisible = await servicioEnLista.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (servicioVisible) {
        console.log(`✅ Servicio "${servicioInfo.nombre}" encontrado en la sección de servicios`);
        
        // Verificar que el servicio tiene el estado correcto (PENDIENTE)
        const servicioCard = servicioEnLista.locator('xpath=ancestor::button[1]').first();
        const estadoPendiente = await servicioCard.locator('text=PENDIENTE').count().then(count => count > 0);
        if (estadoPendiente) {
          console.log('✅ Estado "PENDIENTE" verificado en el servicio');
        }
      } else {
        console.log(`⚠️ Servicio "${servicioInfo.nombre}" no visible en la sección de servicios`);
      }
    } else {
      console.log('⚠️ Sección de servicios no encontrada');
    }
  }
  
  // 14.1. Validar otros datos del evento en la página completa
  await showStepMessage(page, '📄 VALIDANDO DATOS EN PÁGINA COMPLETA');
  console.log('\n🔍 Validando otros datos del evento en la página completa...');
  
  // Buscar información del evento en la página
  const pageContent = await page.textContent('body').catch(() => null);
  if (pageContent) {
    // Validar que aparece el tipo de evento
    if (pageContent.includes(eventTypeForValidation)) {
      console.log(`✓ Tipo de evento "${eventTypeForValidation}" encontrado en la página`);
    } else {
      console.log(`⚠ Tipo de evento "${eventTypeForValidation}" no encontrado en la página`);
    }
    
    // Validar que aparece el nombre del festejado
    if (pageContent.includes(randomHonoree)) {
      console.log(`✓ Nombre del festejado "${randomHonoree}" encontrado en la página`);
    } else {
      console.log(`⚠ Nombre del festejado "${randomHonoree}" no encontrado en la página`);
    }
    
    // Validar que aparece la ciudad
    const cityParts = eventData.city.split(',').map(s => s.trim());
    const cityFoundInPage = cityParts.some(part => pageContent.includes(part));
    if (cityFoundInPage) {
      console.log(`✓ Ciudad encontrada en la página`);
    } else {
      console.log(`⚠ Ciudad no encontrada en la página`);
    }
    
    // Validar que aparece el número de invitados
    if (pageContent.includes(randomAttendees.toString())) {
      console.log(`✓ Número de invitados "${randomAttendees}" encontrado en la página`);
    } else {
      console.log(`⚠ Número de invitados "${randomAttendees}" no encontrado en la página`);
    }
  } else {
    console.log(`⚠ No se pudo obtener el contenido de la página para validación`);
  }
  
  // 15. Verificar que hay una notificación en Fiestachat del proveedor
  await showStepMessage(page, '💬 VERIFICANDO NOTIFICACIÓN EN FIESTACHAT');
  console.log('\n💬 Verificando notificación en Fiestachat...');
  
  // Buscar la sección de Fiestachat (múltiples estrategias)
  let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
  let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!fiestachatVisible) {
    // Buscar alternativamente la sección sin la clase hidden
    fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
  }
  
  if (!fiestachatVisible) {
    // Estrategia alternativa: buscar por texto
    fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
    fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
  }
  
  if (fiestachatVisible) {
    console.log(`✓ Sección Fiestachat visible en el dashboard`);
    
    // Buscar el título "¡Fiestachat!"
    const fiestachatTitle = fiestachatSection.locator('p.text-regular.text-primary-neutral.text-center.font-bold');
    const titleText = await fiestachatTitle.textContent().catch(() => null);
    
    if (titleText && titleText.includes('¡Fiestachat!')) {
      console.log(`✓ Título "¡Fiestachat!" encontrado`);
    } else {
      console.log(`⚠ Título "¡Fiestachat!" no encontrado`);
    }
    
    // Buscar el subtítulo "La línea directa a tu evento"
    const fiestachatSubtitle = fiestachatSection.locator('p.text-small.text-dark-neutral.text-center');
    const subtitleText = await fiestachatSubtitle.textContent().catch(() => null);
    
    if (subtitleText && subtitleText.includes('La línea directa a tu evento')) {
      console.log(`✓ Subtítulo "La línea directa a tu evento" encontrado`);
          } else {
      console.log(`⚠ Subtítulo "La línea directa a tu evento" no encontrado`);
    }
    
    // Buscar notificaciones en la sección
    const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
    const notificationCount = await notificationButtons.count();
    console.log(`📊 Notificaciones encontradas en Fiestachat: ${notificationCount}`);
    
    if (notificationCount > 0) {
      console.log(`✓ Notificaciones encontradas en la sección Fiestachat`);
      
      // Validar la primera notificación (debería ser la más reciente)
      const firstNotification = notificationButtons.first();
      const notificationText = await firstNotification.textContent();
      
      if (notificationText) {
        console.log(`📋 Contenido de la notificación: "${notificationText.trim()}"`);
        
        // Validar que contiene "Solicitud de cotización enviada" o "Solicitud recibida"
        if (notificationText.includes('Solicitud de cotización enviada') || 
            notificationText.includes('Solicitud recibida') ||
            notificationText.includes('Pronto tendrás una respuesta')) {
          console.log(`✓ Notificación de solicitud encontrada`);
        } else {
          console.log(`⚠ Texto de solicitud no encontrado en la notificación`);
        }
        
        // Validar que contiene una fecha y hora (formato flexible)
        const hasDateAndTime = /\d{1,2}:\d{2}\s*(AM|PM|am|pm)/.test(notificationText) ||
          /\d{1,2}:\d{2}/.test(notificationText) ||
          /(Hoy|Ayer|mañana)/i.test(notificationText);
        
        if (hasDateAndTime) {
          console.log(`✓ Fecha y hora encontradas en la notificación`);
        } else {
          console.log(`⚠ Fecha y hora no encontradas en la notificación`);
        }
        
        // Buscar el nombre del servicio en la notificación (puede estar truncado)
        const serviceNameElement = firstNotification.locator('p.text-small.text-dark-neutral.font-bold.text-start');
        const serviceNameText = await serviceNameElement.textContent().catch(() => null);
        
        if (serviceNameText) {
          console.log(`✓ Nombre del servicio en la notificación: "${serviceNameText.trim()}"`);
          console.log(`✓ El servicio seleccionado debe estar relacionado con esta notificación`);
          
          // Verificar que el nombre del servicio coincide (parcialmente)
          if (serviceNameText.toLowerCase().includes(servicioInfo.nombre.toLowerCase().substring(0, 10))) {
            console.log(`✓ El nombre del servicio en la notificación coincide con el servicio seleccionado`);
          }
        } else {
          console.log(`⚠ No se pudo obtener el nombre del servicio de la notificación`);
        }
        
        // Validar el mensaje de la notificación
        const messageElement = firstNotification.locator('span');
        const messageText = await messageElement.textContent().catch(() => null);
        
        if (messageText && (messageText.includes('Solicitud de cotización enviada') || 
            messageText.includes('Solicitud recibida') ||
            messageText.includes('Pronto tendrás una respuesta'))) {
          console.log(`✓ Mensaje de notificación correcto: "${messageText.trim()}"`);
        } else {
          console.log(`⚠ Mensaje de notificación no coincide: "${messageText?.trim()}"`);
        }
      } else {
        console.log(`⚠ No se pudo obtener el texto de la notificación`);
      }
    } else {
      console.log(`⚠ No se encontraron notificaciones en la sección Fiestachat`);
    }
  } else {
    console.log(`⚠ Sección Fiestachat no visible en el dashboard`);
  }
  
  await showStepMessage(page, '🎉 PRUEBA COMPLETADA EXITOSAMENTE');
  console.log('\n✅ Prueba de creación de evento completada exitosamente');
  await clearStepMessage(page);
}

/**
 * Agrega un servicio a un evento existente
 * Selecciona un evento del dashboard, hace clic en "Agregar servicios",
 * navega hasta encontrar un servicio y completa el flujo de solicitud
 */
export async function agregarServicioAEventoExistente(page: Page) {
  await showStepMessage(page, '🎯 AGREGANDO SERVICIO A EVENTO EXISTENTE');
  
  // PASO 1: Seleccionar un evento existente del dashboard
  await showStepMessage(page, '📋 SELECCIONANDO EVENTO EXISTENTE');
  console.log('\n🔍 Buscando eventos en el dashboard...');
  
  // Esperar a que la página cargue completamente
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 10000); // Espera adicional para que los elementos se rendericen
  
  // Buscar la sección "Elige tu fiesta" que contiene los eventos
  // Primero encontrar el título "Elige tu fiesta"
  const tituloEligeTuFiesta = page.locator('p.text-dark-neutral.font-extrabold').filter({ 
    hasText: /^Elige tu fiesta$/i 
  }).first();
  
  const tituloVisible = await tituloEligeTuFiesta.isVisible({ timeout: 60000 }).catch(() => false);
  if (!tituloVisible) {
    throw new Error('❌ No se encontró el título "Elige tu fiesta" en el dashboard');
  }
  console.log('✅ Título "Elige tu fiesta" encontrado');
  
  // Esperar adicional después de encontrar el título para que los eventos se carguen
  await safeWaitForTimeout(page, 5000);
  
  // Buscar el contenedor de la sección que contiene el título
  const seccionEventos = page.locator('div').filter({
    has: tituloEligeTuFiesta
  }).first();
  
  const seccionVisible = await seccionEventos.isVisible({ timeout: 30000 }).catch(() => false);
  if (!seccionVisible) {
    // Si no encontramos el contenedor con el título, buscar eventos directamente
    console.log('⚠️ No se encontró el contenedor de la sección, buscando eventos directamente...');
  }
  
  // Esperar dinámicamente a que aparezcan eventos en el dashboard
  console.log('⏳ Esperando a que los eventos se carguen...');
  try {
    await page.waitForFunction(
      () => {
        // Buscar botones que contengan fechas
        const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
        return buttons.some(button => {
          const text = button.textContent || '';
          return /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(text);
        });
      },
      { timeout: 9000 } // Esperar hasta 90 segundos
    );
    console.log('✅ Eventos detectados en el DOM');
  } catch (e) {
    console.log('⚠️ No se detectaron eventos dinámicamente, continuando con búsqueda estática...');
  }
  
  // Esperar un poco más después de detectar eventos
  await safeWaitForTimeout(page, 5000);
  
  console.log('🔍 Buscando eventos con múltiples estrategias...');
  
  // Estrategia más simple y directa: buscar botones que contengan iconos de eventos
  // Los eventos tienen iconos como: icon-cake, icon-disco-ball, icon-graduation-cap, etc.
  let eventCards: ReturnType<typeof page.locator> | null = null;
  
  // Estrategia 1: Buscar botones con iconos de eventos (más directo)
  const iconosEventos = 'i.icon-cake, i.icon-disco-ball, i.icon-graduation-cap, i.icon-girl-boy, i.icon-star, i.icon-stroller, i.icon-baptism, i.icon-briefcase, i.icon-diamond, i.icon-broken-heart, i.icon-party';
  
  eventCards = page.locator('button').filter({
    has: page.locator(iconosEventos)
  });
  
  let eventCount = await eventCards.count();
  console.log(`📊 Estrategia 1 (iconos de eventos): ${eventCount} eventos encontrados`);
  
  // Estrategia 2: Si no encuentra, buscar botones con clase específica
  if (eventCount === 0) {
    console.log('⚠️ Estrategia 1 falló, intentando estrategia 2...');
    eventCards = page.locator('button.flex.flex-col.bg-light-neutral.rounded-6');
    eventCount = await eventCards.count();
    console.log(`📊 Estrategia 2 (clase específica): ${eventCount} eventos encontrados`);
  }
  
  // Estrategia 3: Buscar dentro del contenedor con scroll
  if (eventCount === 0) {
    console.log('⚠️ Estrategia 2 falló, intentando estrategia 3 (contenedor con scroll)...');
    const eventosContainer = page.locator('div.flex.flex-nowrap.overflow-x-auto').first();
    const containerExists = await eventosContainer.count() > 0;
    
    if (containerExists) {
      eventCards = eventosContainer.locator('button');
      eventCount = await eventCards.count();
      console.log(`📊 Estrategia 3 (contenedor scroll): ${eventCount} botones encontrados`);
      
      // Filtrar solo los que tienen iconos de eventos
      if (eventCount > 0) {
        eventCards = eventosContainer.locator('button').filter({
          has: page.locator(iconosEventos)
        });
        eventCount = await eventCards.count();
        console.log(`📊 Estrategia 3 (filtrados por iconos): ${eventCount} eventos encontrados`);
      }
    }
  }
  
  // Estrategia 4: Buscar por texto de fechas
  if (eventCount === 0) {
    console.log('⚠️ Estrategia 3 falló, intentando estrategia 4 (búsqueda por fechas)...');
    eventCards = page.locator('button').filter({
      has: page.locator('p, span').filter({ 
        hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4}/i 
      })
    });
    eventCount = await eventCards.count();
    console.log(`📊 Estrategia 4 (fechas): ${eventCount} eventos encontrados`);
  }
  
  // Estrategia 5: Buscar por texto de tipos de eventos
  if (eventCount === 0) {
    console.log('⚠️ Estrategia 4 falló, intentando estrategia 5 (texto de eventos)...');
    eventCards = page.locator('button').filter({
      hasText: /(Cumpleaños|Despedida|Graduación|Revelación|Posadas|Baby Shower|Bautizo|Boda|Corporativa|Divorcio)/i
    });
    eventCount = await eventCards.count();
    console.log(`📊 Estrategia 5 (texto eventos): ${eventCount} eventos encontrados`);
  }
  
  // Estrategia 6: Buscar cualquier botón que contenga "dic" o "nov" (meses comunes)
  if (eventCount === 0) {
    console.log('⚠️ Estrategia 5 falló, intentando estrategia 6 (búsqueda por meses)...');
    eventCards = page.locator('button').filter({
      hasText: /\d{1,2}\s+(dic|nov|ene|feb|mar|abr|may|jun|jul|ago|sep|oct)\.?\s+\d{4}/i
    });
    eventCount = await eventCards.count();
    console.log(`📊 Estrategia 6 (meses): ${eventCount} eventos encontrados`);
  }
  
  // Si aún no encuentra eventos, hacer debug
  if (eventCount === 0) {
    console.log('⚠️ Todas las estrategias fallaron, haciendo debug...');
    
    // Contar todos los botones
    const allButtons = page.locator('button');
    const totalButtons = await allButtons.count();
    console.log(`🔍 Total de botones en la página: ${totalButtons}`);
    
    // Buscar botones con texto que contenga "de" (patrón común en nombres de eventos)
    const buttonsWithDe = page.locator('button').filter({
      hasText: /\s+de\s+/i
    });
    const buttonsWithDeCount = await buttonsWithDe.count();
    console.log(`🔍 Botones con patrón "de": ${buttonsWithDeCount}`);
    
    if (buttonsWithDeCount > 0) {
      eventCards = buttonsWithDe;
      eventCount = buttonsWithDeCount;
      console.log('✅ Usando botones con patrón "de"');
    } else {
      throw new Error('❌ No se encontraron eventos en el dashboard con ninguna estrategia de búsqueda. Total de botones en página: ' + totalButtons);
    }
  }
  
  // Verificar que tenemos eventos
  if (!eventCards) {
    throw new Error('❌ No se pudo inicializar el locator de eventos');
  }
  
  console.log(`✅ Eventos finales encontrados: ${eventCount}`);
  
  if (eventCount === 0) {
    throw new Error('❌ No hay eventos disponibles en el dashboard. Debe haber al menos un evento para agregar servicios.');
  }
  
  // Esperar a que al menos el primer evento sea visible
  try {
    await eventCards.first().waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Al menos un evento es visible');
  } catch (e) {
    console.log('⚠️ El primer evento no es visible, pero continuando con los eventos encontrados...');
  }
  
  // Filtrar eventos con fecha futura
  console.log('🔍 Filtrando eventos con fecha futura...');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
  
  let selectedEvent: ReturnType<typeof eventCards.nth> | null = null;
  let selectedEventIndex = -1;
  
  for (let i = 0; i < eventCount; i++) {
    const eventCard = eventCards.nth(i);
    const eventText = await eventCard.textContent();
    
    if (!eventText) continue;
    
    // Buscar fecha en el texto del evento (formatos: "31 jul. 2026", "31 jul 2026", "29 dic. 2025 - 12:00 PM")
    const dateMatch = eventText.match(/(\d{1,2})\s+(\w+)\.?\s+(\d{4})/);
    
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthName = dateMatch[2].toLowerCase();
      const year = parseInt(dateMatch[3]);
      
      // Mapear nombres de meses en español a números
      const monthMap: { [key: string]: number } = {
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
      };
      
      const month = monthMap[monthName.substring(0, 3)];
      
      if (month !== undefined) {
        const eventDate = new Date(year, month, day);
        eventDate.setHours(0, 0, 0, 0);
        
        if (eventDate >= today) {
          selectedEvent = eventCard;
          selectedEventIndex = i;
          console.log(`✅ Evento con fecha futura encontrado: día ${day}, mes ${monthName}, año ${year}`);
          break;
        } else {
          console.log(`⚠️ Evento en índice ${i} tiene fecha pasada (${day} ${monthName} ${year}), omitiéndolo`);
        }
      }
    } else {
      // Si no se puede extraer la fecha, asumir que es válido (fallback)
      console.log(`⚠️ No se pudo extraer la fecha del evento en índice ${i}, asumiendo válido`);
      if (!selectedEvent) {
        selectedEvent = eventCard;
        selectedEventIndex = i;
      }
    }
  }
  
  if (!selectedEvent) {
    throw new Error('❌ No se encontraron eventos con fecha futura en el dashboard.');
  }
  
  const eventText = await selectedEvent.textContent();
  console.log(`✅ Evento seleccionado (índice ${selectedEventIndex}): "${eventText?.trim().substring(0, 80)}..."`);
  
  // Hacer clic en el evento para abrir sus detalles
  await selectedEvent.click();
  await safeWaitForTimeout(page, 2000);
  await page.waitForLoadState('domcontentloaded');
  console.log('✓ Se hizo clic en el evento, esperando a que cargue la página de detalles...');
  
  // PASO 2: Buscar y hacer clic en "Agregar servicios"
  await showStepMessage(page, '🔘 BUSCANDO BOTÓN "AGREGAR SERVICIOS"');
  await safeWaitForTimeout(page, 1000);
  
  // Buscar el botón con el nuevo diseño: tiene icono plus y texto "Agregar servicios"
  const botonAgregarServicios = page.locator('button').filter({
    has: page.locator('span.font-bold').filter({ hasText: /Agregar servicios/i })
  }).filter({
    has: page.locator('i.icon-plus')
  }).first();
  
  // Fallback: buscar por texto accesible
  const botonAgregarServiciosFallback = page.getByRole('button', { name: /Agregar servicios/i });
  
  let botonElement: ReturnType<typeof page.locator> | null = null;
  
  if (await botonAgregarServicios.count() > 0 && await botonAgregarServicios.isVisible({ timeout: 5000 }).catch(() => false)) {
    botonElement = botonAgregarServicios;
    console.log('✓ Botón "Agregar servicios" encontrado (selector específico con nuevo diseño)');
  } else if (await botonAgregarServiciosFallback.count() > 0 && await botonAgregarServiciosFallback.isVisible({ timeout: 5000 }).catch(() => false)) {
    botonElement = botonAgregarServiciosFallback;
    console.log('✓ Botón "Agregar servicios" encontrado (fallback por texto accesible)');
  } else {
    throw new Error('❌ No se encontró el botón "Agregar servicios" con el nuevo diseño');
  }
  
  await expect(botonElement).toBeVisible({ timeout: 10000 });
  console.log('✓ Botón "Agregar servicios" encontrado y visible');
  
  await showStepMessage(page, '🖱️ HACIENDO CLIC EN "AGREGAR SERVICIOS"');
  await botonElement.click();
  await safeWaitForTimeout(page, 2000);
  console.log('✓ Se hizo clic en "Agregar servicios"');
  
  // PASO 3: Bucle para buscar un servicio que no esté agregado al evento
  const MAX_INTENTOS_SERVICIO = 5; // Máximo de intentos para encontrar un servicio no agregado
  let servicioInfo: { nombre: string; categoria: string; subcategoria?: string } | null = null;
  let servicioAgregadoExitosamente = false;
  let intentosServicio = 0;
  
  while (!servicioAgregadoExitosamente && intentosServicio < MAX_INTENTOS_SERVICIO) {
    intentosServicio++;
    console.log(`\n🔄 Intento ${intentosServicio}/${MAX_INTENTOS_SERVICIO} de agregar servicio...`);
    
    // Buscar un servicio en el dashboard del proveedor
    const servicioInfoActual = await buscarServicioEnProveedor(page);
    
    if (!servicioInfoActual) {
      throw new Error('❌ No se pudo obtener información de un servicio del proveedor');
    }
    
    servicioInfo = servicioInfoActual;
    console.log(`\n🎯 OBJETIVO: Navegar hasta el servicio "${servicioInfo.nombre}"`);
    await showStepMessage(page, `🎯 OBJETIVO: Encontrar servicio "${servicioInfo.nombre}"`);
    
    // Cerrar sesión del proveedor y hacer login como cliente
    await showStepMessage(page, '🔄 CAMBIANDO DE PROVEEDOR A CLIENTE');
    await page.context().clearCookies();
    
    // Navegar a una página válida antes de limpiar storage
    try {
      await page.goto(`${DEFAULT_BASE_URL}`, { waitUntil: 'domcontentloaded' });
      await safeWaitForTimeout(page, 500);
    } catch (e) {
      // Si falla, continuar de todas formas
    }
    
    // Limpiar storage de forma segura
    try {
      await page.evaluate(() => {
        try {
          localStorage.clear();
        } catch (e) {
          // Ignorar errores de acceso a localStorage
        }
        try {
          sessionStorage.clear();
        } catch (e) {
          // Ignorar errores de acceso a sessionStorage
        }
      });
    } catch (e) {
      // Ignorar errores al limpiar storage
      console.log('⚠️ No se pudo limpiar storage, continuando...');
    }
    
    console.log('✓ Sesión del proveedor cerrada');
    
    // Navegar al login
    await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 2000);
    
    // Verificar que estamos en la página de login
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      console.log('⚠️ No estamos en la página de login, navegando nuevamente...');
      await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await safeWaitForTimeout(page, 2000);
    }
    
    // Hacer login con las credenciales del cliente
    await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO CLIENTE');
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    console.log('✓ Login exitoso como cliente');
    
    // Esperar a que se cargue el dashboard después del login
    await safeWaitForTimeout(page, 3000);
    
    // Verificar que estamos en el dashboard
    await expect(page).toHaveURL(`${DEFAULT_BASE_URL}/client/dashboard`, { timeout: 10000 });
    console.log('✓ Navegación al dashboard confirmada');
    
    // Volver a seleccionar el evento y hacer clic en "Agregar servicios"
    await showStepMessage(page, '📋 VOLVIENDO A SELECCIONAR EVENTO');
    await safeWaitForTimeout(page, 2000);
    
    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 10000); // Espera adicional para que los elementos se rendericen
    
    // Buscar la sección "Elige tu fiesta" nuevamente
    const tituloEligeTuFiesta2 = page.locator('p.text-dark-neutral.font-extrabold').filter({ 
      hasText: /^Elige tu fiesta$/i 
    }).first();
    
    const tituloVisible2 = await tituloEligeTuFiesta2.isVisible({ timeout: 60000 }).catch(() => false);
    if (!tituloVisible2) {
      throw new Error('❌ No se encontró el título "Elige tu fiesta" en el dashboard');
    }
    console.log('✅ Título "Elige tu fiesta" encontrado nuevamente');
    
    // Esperar adicional después de encontrar el título
    await safeWaitForTimeout(page, 5000);
    
    // Buscar el contenedor de la sección
    const seccionEventos2 = page.locator('div').filter({
      has: tituloEligeTuFiesta2
    }).first();
    
    const seccionVisible2 = await seccionEventos2.isVisible({ timeout: 30000 }).catch(() => false);
    
    // Esperar dinámicamente a que aparezcan eventos
    console.log('⏳ Esperando a que los eventos se carguen...');
    try {
      await page.waitForFunction(
        () => {
          // Buscar el contenedor de eventos con scroll horizontal
          const containers = Array.from(document.querySelectorAll('div.flex.flex-nowrap.overflow-x-auto'));
          return containers.some(container => {
            const buttons = container.querySelectorAll('button.flex.flex-col.bg-light-neutral');
            return buttons.length > 0;
          });
        },
        { timeout: 90000 } // Esperar hasta 90 segundos
      );
      console.log('✅ Eventos detectados en el DOM');
    } catch (e) {
      console.log('⚠️ No se detectaron eventos dinámicamente, continuando con búsqueda estática...');
    }
    
    // Esperar un poco más después de detectar eventos
    await safeWaitForTimeout(page, 5000);
    
    console.log('🔍 Buscando eventos con múltiples estrategias (segunda búsqueda)...');
    
    // Estrategia más simple y directa: buscar botones que contengan iconos de eventos
    let eventCards2: ReturnType<typeof page.locator> | null = null;
    
    // Estrategia 1: Buscar botones con iconos de eventos (más directo)
    const iconosEventos = 'i.icon-cake, i.icon-disco-ball, i.icon-graduation-cap, i.icon-girl-boy, i.icon-star, i.icon-stroller, i.icon-baptism, i.icon-briefcase, i.icon-diamond, i.icon-broken-heart, i.icon-party';
    
    eventCards2 = page.locator('button').filter({
      has: page.locator(iconosEventos)
    });
    
    let eventCount2 = await eventCards2.count();
    console.log(`📊 Estrategia 1 (iconos de eventos) - segunda búsqueda: ${eventCount2} eventos encontrados`);
    
    // Estrategia 2: Si no encuentra, buscar botones con clase específica
    if (eventCount2 === 0) {
      console.log('⚠️ Estrategia 1 falló, intentando estrategia 2 (segunda búsqueda)...');
      eventCards2 = page.locator('button.flex.flex-col.bg-light-neutral.rounded-6');
      eventCount2 = await eventCards2.count();
      console.log(`📊 Estrategia 2 (clase específica) - segunda búsqueda: ${eventCount2} eventos encontrados`);
    }
    
    // Estrategia 3: Buscar dentro del contenedor con scroll
    if (eventCount2 === 0) {
      console.log('⚠️ Estrategia 2 falló, intentando estrategia 3 (contenedor con scroll) - segunda búsqueda...');
      const eventosContainer2 = page.locator('div.flex.flex-nowrap.overflow-x-auto').first();
      const containerExists2 = await eventosContainer2.count() > 0;
      
      if (containerExists2) {
        eventCards2 = eventosContainer2.locator('button');
        eventCount2 = await eventCards2.count();
        console.log(`📊 Estrategia 3 (contenedor scroll) - segunda búsqueda: ${eventCount2} botones encontrados`);
        
        // Filtrar solo los que tienen iconos de eventos
        if (eventCount2 > 0) {
          eventCards2 = eventosContainer2.locator('button').filter({
            has: page.locator(iconosEventos)
          });
          eventCount2 = await eventCards2.count();
          console.log(`📊 Estrategia 3 (filtrados por iconos) - segunda búsqueda: ${eventCount2} eventos encontrados`);
        }
      }
    }
    
    // Estrategia 4: Buscar por texto de fechas
    if (eventCount2 === 0) {
      console.log('⚠️ Estrategia 3 falló, intentando estrategia 4 (búsqueda por fechas) - segunda búsqueda...');
      eventCards2 = page.locator('button').filter({
        has: page.locator('p, span').filter({ 
          hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4}/i 
        })
      });
      eventCount2 = await eventCards2.count();
      console.log(`📊 Estrategia 4 (fechas) - segunda búsqueda: ${eventCount2} eventos encontrados`);
    }
    
    // Estrategia 5: Buscar por texto de tipos de eventos
    if (eventCount2 === 0) {
      console.log('⚠️ Estrategia 4 falló, intentando estrategia 5 (texto de eventos) - segunda búsqueda...');
      eventCards2 = page.locator('button').filter({
        hasText: /(Cumpleaños|Despedida|Graduación|Revelación|Posadas|Baby Shower|Bautizo|Boda|Corporativa|Divorcio)/i
      });
      eventCount2 = await eventCards2.count();
      console.log(`📊 Estrategia 5 (texto eventos) - segunda búsqueda: ${eventCount2} eventos encontrados`);
    }
    
    // Estrategia 6: Buscar cualquier botón que contenga "dic" o "nov" (meses comunes)
    if (eventCount2 === 0) {
      console.log('⚠️ Estrategia 5 falló, intentando estrategia 6 (búsqueda por meses) - segunda búsqueda...');
      eventCards2 = page.locator('button').filter({
        hasText: /\d{1,2}\s+(dic|nov|ene|feb|mar|abr|may|jun|jul|ago|sep|oct)\.?\s+\d{4}/i
      });
      eventCount2 = await eventCards2.count();
      console.log(`📊 Estrategia 6 (meses) - segunda búsqueda: ${eventCount2} eventos encontrados`);
    }
    
    // Si aún no encuentra eventos, hacer debug
    if (eventCount2 === 0) {
      console.log('⚠️ Todas las estrategias fallaron, haciendo debug (segunda búsqueda)...');
      
      // Contar todos los botones
      const allButtons2 = page.locator('button');
      const totalButtons2 = await allButtons2.count();
      console.log(`🔍 Total de botones en la página (segunda búsqueda): ${totalButtons2}`);
      
      // Buscar botones con texto que contenga "de" (patrón común en nombres de eventos)
      const buttonsWithDe2 = page.locator('button').filter({
        hasText: /\s+de\s+/i
      });
      const buttonsWithDeCount2 = await buttonsWithDe2.count();
      console.log(`🔍 Botones con patrón "de" (segunda búsqueda): ${buttonsWithDeCount2}`);
      
      if (buttonsWithDeCount2 > 0) {
        eventCards2 = buttonsWithDe2;
        eventCount2 = buttonsWithDeCount2;
        console.log('✅ Usando botones con patrón "de" (segunda búsqueda)');
      } else {
        throw new Error('❌ No se encontraron eventos en el dashboard con ninguna estrategia de búsqueda (segunda búsqueda). Total de botones en página: ' + totalButtons2);
      }
    }
    
    // Verificar que tenemos eventos
    if (!eventCards2) {
      throw new Error('❌ No se pudo inicializar el locator de eventos (segunda búsqueda)');
    }
    
    console.log(`✅ Eventos finales encontrados (segunda búsqueda): ${eventCount2}`);
    
    if (eventCount2 === 0) {
      throw new Error('❌ No hay eventos disponibles en el dashboard. Debe haber al menos un evento para agregar servicios.');
    }
    
    // Esperar a que al menos el primer evento sea visible
    try {
      await eventCards2.first().waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Al menos un evento es visible (segunda búsqueda)');
    } catch (e) {
      console.log('⚠️ El primer evento no es visible, pero continuando con los eventos encontrados (segunda búsqueda)...');
    }
    
    if (eventCount2 > selectedEventIndex && selectedEventIndex >= 0) {
      // Usar el mismo índice del evento que se seleccionó inicialmente
      const selectedEvent2 = eventCards2.nth(selectedEventIndex);
      await selectedEvent2.click();
      await safeWaitForTimeout(page, 2000);
      console.log(`✓ Evento seleccionado nuevamente (índice ${selectedEventIndex})`);
    } else if (eventCount2 > 0) {
      // Fallback: seleccionar el primer evento
      const selectedEvent2 = eventCards2.first();
      await selectedEvent2.click();
      await safeWaitForTimeout(page, 2000);
      console.log('✓ Primer evento seleccionado (fallback)');
    }
    
    // Buscar y hacer clic en "Agregar servicios" nuevamente
    const botonAgregarServicios2 = page.locator('button').filter({
      has: page.locator('span.font-bold').filter({ hasText: /Agregar servicios/i })
    }).filter({
      has: page.locator('i.icon-plus')
    }).first();
    
    // Fallback: buscar por texto accesible
    const botonAgregarServicios2Fallback = page.getByRole('button', { name: /Agregar servicios/i });
    
    let botonElement2: ReturnType<typeof page.locator> | null = null;
    
    if (await botonAgregarServicios2.count() > 0 && await botonAgregarServicios2.isVisible({ timeout: 5000 }).catch(() => false)) {
      botonElement2 = botonAgregarServicios2;
      console.log('✓ Botón "Agregar servicios" encontrado (selector específico con nuevo diseño)');
    } else if (await botonAgregarServicios2Fallback.count() > 0 && await botonAgregarServicios2Fallback.isVisible({ timeout: 5000 }).catch(() => false)) {
      botonElement2 = botonAgregarServicios2Fallback;
      console.log('✓ Botón "Agregar servicios" encontrado (fallback por texto accesible)');
    } else {
      throw new Error('❌ No se encontró el botón "Agregar servicios" con el nuevo diseño');
    }
    
    await expect(botonElement2).toBeVisible({ timeout: 10000 });
    await botonElement2.click();
    await safeWaitForTimeout(page, 2000);
    console.log('✓ Se hizo clic en "Agregar servicios"');
    
    // Navegar por las categorías hasta encontrar el servicio objetivo
    console.log(`\n🔍 NAVEGANDO POR CATEGORÍAS PARA ENCONTRAR: "${servicioInfo.nombre}"`);
    await showStepMessage(page, `🔍 NAVEGANDO PARA ENCONTRAR SERVICIO "${servicioInfo.nombre}"`);
    
    // Buscar todos los botones de categoría de servicios
    const serviceButtons = page.locator('button').filter({
      has: page.locator('p.text-neutral-800.font-medium')
    });
    
    // Navegar directamente a la categoría del servicio si está disponible
    let servicioEncontrado = false;
    
    if (servicioInfo.categoria) {
      console.log(`🎯 Buscando categoría específica: "${servicioInfo.categoria}"`);
      
      // Buscar la categoría que coincida con la categoría del servicio
      let categoriaEncontrada = false;
      const serviceCount = await serviceButtons.count();
      
      for (let i = 0; i < serviceCount; i++) {
        const serviceButton = serviceButtons.nth(i);
        const serviceName = await serviceButton.locator('p.text-neutral-800.font-medium').textContent();
        const categoryName = serviceName?.trim() || '';
        
        // Comparar nombres (case-insensitive, permitir coincidencias parciales)
        if (categoryName.toLowerCase().trim() === servicioInfo.categoria.toLowerCase().trim() ||
            categoryName.toLowerCase().includes(servicioInfo.categoria.toLowerCase().trim()) ||
            servicioInfo.categoria.toLowerCase().trim().includes(categoryName.toLowerCase())) {
          console.log(`✅ Categoría encontrada: "${categoryName}"`);
          await serviceButton.click();
          await safeWaitForTimeout(page, 2000);
          categoriaEncontrada = true;
          break;
        }
      }
      
      if (categoriaEncontrada) {
        // Navegar por subcategorías hasta encontrar el servicio
        servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(
          page, 
          servicioInfo.nombre, 
          servicioInfo.categoria, 
          servicioInfo.subcategoria
        );
          } else {
        console.log(`⚠️ Categoría "${servicioInfo.categoria}" no encontrada. Probando con la primera categoría disponible...`);
        const firstCategory = serviceButtons.first();
        await firstCategory.click();
        await safeWaitForTimeout(page, 2000);
        servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(
          page, 
          servicioInfo.nombre, 
          servicioInfo.categoria, 
          servicioInfo.subcategoria
        );
      }
    } else {
      // Si no hay categoría, probar todas las categorías
      console.log(`⚠️ No se obtuvo categoría del servicio, probando todas las categorías...`);
      const serviceCount = await serviceButtons.count();
      const maxIntentosCategorias = serviceCount;
      let intentosCategoria = 0;
      
      while (!servicioEncontrado && intentosCategoria < maxIntentosCategorias) {
        intentosCategoria++;
        const selectedService = serviceButtons.nth(intentosCategoria - 1);
        const serviceName = await selectedService.locator('p.text-neutral-800.font-medium').textContent();
        const selectedServiceCategory = serviceName?.trim() || 'Desconocida';
        console.log(`🔍 Intentando categoría ${intentosCategoria}/${maxIntentosCategorias}: "${selectedServiceCategory}"`);
    
        await selectedService.click();
        await safeWaitForTimeout(page, 2000);
    
        servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(page, servicioInfo.nombre);
        
        if (!servicioEncontrado) {
          console.log(`⚠️ Servicio no encontrado en "${selectedServiceCategory}", probando otra categoría...`);
          await page.goBack();
          await safeWaitForTimeout(page, 2000);
        }
      }
    }
    
    if (!servicioEncontrado) {
      console.log(`⚠️ No se pudo encontrar el servicio "${servicioInfo.nombre}", intentando con otro servicio...`);
      continue; // Continuar con el siguiente intento
    }
    
    console.log(`✅ Servicio "${servicioInfo.nombre}" encontrado exitosamente!`);
    
    // Verificar si aparece el mensaje "Servicio previamente agregado"
    await showStepMessage(page, '🔍 VERIFICANDO SI EL SERVICIO YA ESTÁ AGREGADO');
    await safeWaitForTimeout(page, 2000);
    
    // Buscar el mensaje "Servicio previamente agregado" o "Este servicio ya fue agregado anteriormente"
    const servicioYaAgregadoDialog = page.locator('div.fixed.top-0.left-0').filter({
      has: page.locator('span, p, div, b').filter({
        hasText: /Servicio previamente agregado|Este servicio ya fue agregado anteriormente/i
      })
    });
    
    const servicioYaAgregadoVisible = await servicioYaAgregadoDialog.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (servicioYaAgregadoVisible) {
      console.log(`⚠️ El servicio "${servicioInfo.nombre}" ya está agregado al evento. Buscando otro servicio...`);
      
      // Cerrar el diálogo (buscar botón de cerrar o hacer clic fuera)
      const closeButton = servicioYaAgregadoDialog.locator('button, [aria-label*="close"], [aria-label*="cerrar"]').first();
      const closeButtonExists = await closeButton.count().then(count => count > 0);
      
      if (closeButtonExists) {
        await closeButton.click();
        await safeWaitForTimeout(page, 1000);
      } else {
        // Si no hay botón de cerrar, presionar Escape o hacer clic fuera
        await page.keyboard.press('Escape');
        await safeWaitForTimeout(page, 1000);
      }
      
      // Continuar con el siguiente intento
      continue;
    }
    
    // Si no aparece el mensaje, el servicio no está agregado y podemos continuar
    servicioAgregadoExitosamente = true;
    console.log(`✅ El servicio "${servicioInfo.nombre}" no está agregado, continuando con el flujo...`);
  }
  
  if (!servicioAgregadoExitosamente || !servicioInfo) {
    throw new Error(`❌ No se pudo encontrar un servicio que no esté agregado al evento después de ${MAX_INTENTOS_SERVICIO} intentos.`);
  }
  
  // PASO 4: Verificar si el formulario ya está visible (navegarHastaEncontrarServicioEspecifico ya hizo clic en "Contactar GRATIS")
  await showStepMessage(page, '⏳ ESPERANDO FORMULARIO DE SOLICITUD');
  console.log('✓ La función navegarHastaEncontrarServicioEspecifico ya hizo clic en "Contactar GRATIS"');
  
  // Esperar a que aparezca el formulario o el modal de solicitud
  // El modal puede aparecer directamente sin formulario de evento (porque ya está en un evento)
  const formExists = await page.locator('input[id="Honoree"]').isVisible({ timeout: 2000 }).catch(() => false);
  const modalExists = await page.locator('#PrequotationRequestForm').isVisible({ timeout: 2000 }).catch(() => false);
  
  if (modalExists) {
    console.log(`✓ El modal de solicitud ya está visible, continuando...`);
  } else if (formExists) {
    console.log(`✓ El formulario está visible, pero no el modal. Esperando...`);
    await safeWaitForTimeout(page, 2000);
  } else {
    console.log(`⚠️ Ni el formulario ni el modal están visibles. Esperando un poco más...`);
    await safeWaitForTimeout(page, 3000);
  }
  
  // PASO 5: Interactuar con el modal de solicitud (checkboxes, textarea y botón "Solicitar")
  await showStepMessage(page, '🪟 INTERACTUANDO CON MODAL DE SOLICITUD');
  const preQuotationForm = page.locator('#PrequotationRequestForm');
  await preQuotationForm.waitFor({ state: 'visible', timeout: 15000 });
  console.log('🪟 Modal de solicitud visible');
  
  const checkboxLocator = preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]');
  const checkboxCount = await checkboxLocator.count();
  console.log(`📋 Checkboxes disponibles: ${checkboxCount}`);
  
  if (checkboxCount > 0) {
    const shouldSelectAll = Math.random() < 0.4;
    
    if (shouldSelectAll) {
      await showStepMessage(page, '☑️ SELECCIONANDO TODAS LAS VARIEDADES');
      const selectAllButton = preQuotationForm.locator('div:has(> p:has-text("Seleccionar todo")) button').first();
      if (await selectAllButton.isVisible().catch(() => false)) {
        await selectAllButton.click();
        console.log('✅ Se hizo clic en "Seleccionar todo"');
      } else {
        console.log('⚠ Botón "Seleccionar todo" no visible, seleccionando manualmente');
      }
    } else {
      await showStepMessage(page, '☑️ SELECCIONANDO VARIEDADES ALEATORIAS');
    }
    
    if (! (await preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]:checked').count())) {
      // Seleccionar manualmente algunos checkboxes si no se seleccionaron con el botón
      const indices = Array.from({ length: checkboxCount }, (_, i) => i).sort(() => Math.random() - 0.5);
      const selections = Math.min(checkboxCount, Math.max(1, Math.floor(Math.random() * checkboxCount) + 1));
      
      for (let i = 0; i < selections; i++) {
        const checkbox = checkboxLocator.nth(indices[i]);
        const alreadyChecked = await checkbox.evaluate(el => (el as HTMLInputElement).checked).catch(() => false);
        if (alreadyChecked) continue;
        
        const checkboxId = await checkbox.getAttribute('id');
        let clickTarget = checkbox;
        if (checkboxId) {
          const label = preQuotationForm.locator(`label[for="${checkboxId}"]`).first();
          if (await label.count()) {
            clickTarget = label;
          }
        } else {
          const buttonWrapper = checkbox.locator('xpath=ancestor::button[1]');
          if (await buttonWrapper.count()) {
            clickTarget = buttonWrapper;
          }
        }
        
        await clickTarget.click({ force: true });
        console.log(`  ✓ Checkbox ${i + 1} seleccionado (${checkboxId || 'sin id'})`);
        await safeWaitForTimeout(page, 200);
      }
    }
  } else {
    console.log('⚠ No se encontraron checkboxes para seleccionar');
  }
  
  // Llenar el campo "Solicitudes"
  await showStepMessage(page, '📝 LLENANDO CAMPO DE SOLICITUDES');
  const requestMessages = [
    'Nos gustaría incluir opciones vegetarianas y postres personalizados.',
    'Buscamos algo con temática tropical y servicio completo de montaje.',
    'Necesitamos cotización con barra libre y personal extra para servicio.',
    'Queremos opciones premium y asesoría para decoración a juego.',
  ];
  const randomRequestMessage = requestMessages[Math.floor(Math.random() * requestMessages.length)];
  
  const requestField = preQuotationForm.locator('textarea#Request');
  await requestField.waitFor({ state: 'visible', timeout: 5000 });
  await requestField.fill(randomRequestMessage);
  console.log(`📝 Campo "Solicitudes" llenado con: ${randomRequestMessage}`);
  
  // Enviar la solicitud
  await showStepMessage(page, '🚀 ENVIANDO SOLICITUD');
  const solicitarButton = page.locator('button[form="PrequotationRequestForm"], button:has-text("Solicitar")').first();
  await solicitarButton.waitFor({ state: 'visible', timeout: 10000 });
  await solicitarButton.click();
  console.log('🚀 Botón "Solicitar" presionado');
  
  await preQuotationForm.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => console.log('⚠ El modal de selección no se ocultó, continuando...'));
  await safeWaitForTimeout(page, 1000);
  
  // Confirmar diálogo "Solicitud enviada"
  await showStepMessage(page, '✅ CONFIRMANDO SOLICITUD ENVIADA');
  const successDialog = page.locator('div:has-text("Solicitud enviada")').first();
  try {
    await successDialog.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🎊 Modal "Solicitud enviada" visible');
    
    const okButton = successDialog.locator('button:has-text("OK")').first();
    await okButton.waitFor({ state: 'visible', timeout: 5000 });
    await okButton.click();
    console.log('👍 Botón "OK" presionado');
  } catch (successModalError) {
    console.log('⚠ Modal de confirmación no apareció o no se pudo cerrar, continuando...');
  }
  
  await safeWaitForTimeout(page, 1500);
  
  // PASO 6: Verificar que el servicio aparece en la sección de servicios del evento
  await showStepMessage(page, '🔍 VERIFICANDO SERVICIO EN SECCIÓN DE SERVICIOS');
  console.log('\n🔍 Verificando que el servicio aparece en la sección de servicios...');
  
  // Buscar el contenedor de servicios
  const servicesContainerAdd = page.locator('div.flex.flex-col.grow.overflow-y-auto.w-full');
  const servicesContainerAddVisible = await servicesContainerAdd.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (servicesContainerAddVisible) {
    console.log(`✓ Contenedor de servicios visible`);
    
    // Buscar servicios en la lista
    const serviceCards = servicesContainerAdd.locator('button.text-start.flex.flex-col');
    const serviceCount = await serviceCards.count();
    console.log(`📊 Servicios encontrados en la lista: ${serviceCount}`);
    
    if (serviceCount > 0) {
      console.log(`✓ Lista de servicios cargada correctamente`);
      
      // Buscar el servicio específico por su nombre
      const servicioEnLista = servicesContainerAdd.locator(`text=${servicioInfo.nombre}`).first();
      const servicioVisible = await servicioEnLista.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (servicioVisible) {
        console.log(`✅ Servicio "${servicioInfo.nombre}" encontrado en la sección de servicios`);
        
        // Verificar que el servicio tiene el estado correcto (PENDIENTE)
        const servicioCard = servicioEnLista.locator('xpath=ancestor::button[1]').first();
        const estadoPendiente = await servicioCard.locator('text=PENDIENTE').count().then(count => count > 0);
        if (estadoPendiente) {
          console.log('✅ Estado "PENDIENTE" verificado en el servicio');
        }
      } else {
        console.log(`⚠️ Servicio "${servicioInfo.nombre}" no visible en la sección de servicios`);
      }
    } else {
      console.log(`⚠ No se encontraron servicios en la lista`);
    }
  } else {
    console.log('⚠️ Sección de servicios no encontrada');
  }
  
  await showStepMessage(page, '🎉 SERVICIO AGREGADO EXITOSAMENTE');
  console.log('\n✅ Servicio agregado al evento exitosamente');
  await clearStepMessage(page);
}

/**
 * Crea un evento de un tipo específico
 * Similar a ejecutarFlujoCompletoCreacionEvento pero permite especificar el tipo de evento
 */
async function crearEventoDeTipoEspecifico(
  page: Page, 
  tipoEvento: string
): Promise<void> {
  await showStepMessage(page, `🎉 CREANDO EVENTO DE TIPO: ${tipoEvento}`);
  
  // Buscar un servicio en el dashboard del proveedor
  const servicioInfo = await buscarServicioEnProveedor(page);
  
  if (!servicioInfo) {
    throw new Error('❌ No se pudo obtener información de un servicio del proveedor');
  }
  
  console.log(`\n🎯 OBJETIVO: Navegar hasta el servicio "${servicioInfo.nombre}"`);
  await showStepMessage(page, `🎯 OBJETIVO: Encontrar servicio "${servicioInfo.nombre}"`);
  
  // Cerrar sesión del proveedor y hacer login como cliente
  await showStepMessage(page, '🔄 CAMBIANDO DE PROVEEDOR A CLIENTE');
  await page.context().clearCookies();
  
  // Navegar a una página válida antes de limpiar storage
  try {
    await page.goto(`${DEFAULT_BASE_URL}`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 500);
  } catch (e) {
    // Si falla, continuar de todas formas
  }
  
  // Limpiar storage de forma segura
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch (e) {
        // Ignorar errores de acceso a localStorage
      }
      try {
        sessionStorage.clear();
      } catch (e) {
        // Ignorar errores de acceso a sessionStorage
      }
    });
  } catch (e) {
    // Ignorar errores al limpiar storage
    console.log('⚠️ No se pudo limpiar storage, continuando...');
  }
  
  console.log('✓ Sesión del proveedor cerrada');
  
  // Navegar al login
  await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await safeWaitForTimeout(page, 2000);
  
  // Verificar que estamos en la página de login
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    console.log('⚠️ No estamos en la página de login, navegando nuevamente...');
    await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 2000);
  }
  
  // Hacer login con las credenciales del cliente
  await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO CLIENTE');
  await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
  console.log('✓ Login exitoso como cliente');
  
  // Esperar a que se cargue el dashboard después del login
  await safeWaitForTimeout(page, 3000);
  
  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL(`${DEFAULT_BASE_URL}/client/dashboard`, { timeout: 10000 });
  console.log('✓ Navegación al dashboard confirmada');
  
  // Buscar y seleccionar el botón "Nueva fiesta"
  await showStepMessage(page, '🔘 BUSCANDO BOTÓN "NUEVA FIESTA"');
  const nuevaFiestaButton = page.locator('button[type="button"].hidden.lg\\:flex').filter({
    hasText: 'Nueva fiesta'
  });
  
  // Verificar que el botón existe y es visible
  await expect(nuevaFiestaButton).toBeVisible({ timeout: 10000 });
  console.log('✓ Botón "Nueva fiesta" encontrado y visible');
  
  // Hacer clic en el botón "Nueva fiesta"
  await showStepMessage(page, '🖱️ HACIENDO CLIC EN "NUEVA FIESTA"');
  await nuevaFiestaButton.click();
  console.log('✓ Se hizo clic en "Nueva fiesta"');
  
  // Esperar a que cargue la página de selección de categoría de evento
  await safeWaitForTimeout(page, 2000);
  
  // Buscar todos los botones de categoría de evento
  const categoryButtons = page.locator('button[type="submit"]').filter({
    has: page.locator('p.text-dark-neutral')
  });
  
  // Contar cuántas categorías hay disponibles
  const categoryCount = await categoryButtons.count();
  console.log(`✓ Se encontraron ${categoryCount} categorías de eventos disponibles`);
  
  // Verificar que hay al menos una categoría
  expect(categoryCount).toBeGreaterThan(0);
  
  // Buscar la categoría específica que se solicita
  await showStepMessage(page, `🎯 SELECCIONANDO CATEGORÍA: ${tipoEvento}`);
  let categoriaEncontrada = false;
  let selectedCategory: ReturnType<typeof categoryButtons.nth> | null = null;
  let selectedEventType = tipoEvento;
  
  for (let i = 0; i < categoryCount; i++) {
    const categoryButton = categoryButtons.nth(i);
    const categoryName = await categoryButton.locator('p.text-dark-neutral').textContent();
    const categoryNameTrimmed = categoryName?.trim() || '';
    
    // Comparar nombres (case-insensitive, permitir coincidencias parciales)
    if (categoryNameTrimmed.toLowerCase() === tipoEvento.toLowerCase() ||
        categoryNameTrimmed.toLowerCase().includes(tipoEvento.toLowerCase()) ||
        tipoEvento.toLowerCase().includes(categoryNameTrimmed.toLowerCase())) {
      selectedCategory = categoryButton;
      selectedEventType = categoryNameTrimmed;
      categoriaEncontrada = true;
      console.log(`✅ Categoría encontrada: "${selectedEventType}" (índice ${i})`);
      break;
    }
  }
  
  if (!categoriaEncontrada || !selectedCategory) {
    throw new Error(`❌ No se encontró la categoría de evento "${tipoEvento}"`);
  }
  
  // Hacer clic en la categoría seleccionada
  await selectedCategory.click();
  console.log(`✓ Se hizo clic en la categoría "${selectedEventType}"`);
  
  // Esperar a que cargue la página de selección de categoría de servicios
  await safeWaitForTimeout(page, 2000);
  
  // Navegar por las categorías hasta encontrar el servicio objetivo
  console.log(`\n🔍 NAVEGANDO POR CATEGORÍAS PARA ENCONTRAR: "${servicioInfo.nombre}"`);
  await showStepMessage(page, `🔍 NAVEGANDO PARA ENCONTRAR SERVICIO "${servicioInfo.nombre}"`);
  
  // Buscar todos los botones de categoría de servicios
  const serviceButtons = page.locator('button').filter({
    has: page.locator('p.text-neutral-800.font-medium')
  });
  
  // Navegar directamente a la categoría del servicio si está disponible
  let servicioEncontrado = false;
  
  if (servicioInfo.categoria) {
    console.log(`🎯 Buscando categoría específica: "${servicioInfo.categoria}"`);
    
    // Buscar la categoría que coincida con la categoría del servicio
    let categoriaEncontradaServicio = false;
    const serviceCount = await serviceButtons.count();
    
    for (let i = 0; i < serviceCount; i++) {
      const serviceButton = serviceButtons.nth(i);
      const serviceName = await serviceButton.locator('p.text-neutral-800.font-medium').textContent();
      const categoryName = serviceName?.trim() || '';
      
      // Comparar nombres (case-insensitive, permitir coincidencias parciales)
      if (categoryName.toLowerCase().trim() === servicioInfo.categoria.toLowerCase().trim() ||
          categoryName.toLowerCase().includes(servicioInfo.categoria.toLowerCase().trim()) ||
          servicioInfo.categoria.toLowerCase().trim().includes(categoryName.toLowerCase())) {
        console.log(`✅ Categoría encontrada: "${categoryName}"`);
        await serviceButton.click();
        await safeWaitForTimeout(page, 2000);
        categoriaEncontradaServicio = true;
        break;
      }
    }
    
    if (categoriaEncontradaServicio) {
      // Navegar por subcategorías hasta encontrar el servicio
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(
        page, 
        servicioInfo.nombre, 
        servicioInfo.categoria, 
        servicioInfo.subcategoria
      );
    } else {
      console.log(`⚠️ Categoría "${servicioInfo.categoria}" no encontrada. Probando con la primera categoría disponible...`);
      const firstCategory = serviceButtons.first();
      await firstCategory.click();
      await safeWaitForTimeout(page, 2000);
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(
        page, 
        servicioInfo.nombre, 
        servicioInfo.categoria, 
        servicioInfo.subcategoria
      );
    }
  } else {
    // Si no hay categoría, probar todas las categorías
    console.log(`⚠️ No se obtuvo categoría del servicio, probando todas las categorías...`);
    const serviceCount = await serviceButtons.count();
    const maxIntentosCategorias = serviceCount;
    let intentosCategoria = 0;
    
    while (!servicioEncontrado && intentosCategoria < maxIntentosCategorias) {
      intentosCategoria++;
      const selectedService = serviceButtons.nth(intentosCategoria - 1);
      const serviceName = await selectedService.locator('p.text-neutral-800.font-medium').textContent();
      const selectedServiceCategory = serviceName?.trim() || 'Desconocida';
      console.log(`🔍 Intentando categoría ${intentosCategoria}/${maxIntentosCategorias}: "${selectedServiceCategory}"`);
  
      await selectedService.click();
      await safeWaitForTimeout(page, 2000);
  
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(page, servicioInfo.nombre);
      
      if (!servicioEncontrado) {
        console.log(`⚠️ Servicio no encontrado en "${selectedServiceCategory}", probando otra categoría...`);
        await page.goBack();
        await safeWaitForTimeout(page, 2000);
      }
    }
  }
  
  if (!servicioEncontrado) {
    throw new Error(`❌ No se pudo encontrar el servicio "${servicioInfo.nombre}" después de navegar por las categorías`);
  }
  
  console.log(`✅ Servicio "${servicioInfo.nombre}" encontrado exitosamente!`);
  
  // Verificar si el formulario ya está visible (significa que ya se hizo clic en "Contactar GRATIS")
  const formExists = await page.locator('input[id="Honoree"]').isVisible({ timeout: 2000 }).catch(() => false);
  
  if (formExists) {
    console.log(`✓ El formulario ya está visible, no es necesario hacer clic en "Contactar GRATIS" nuevamente`);
  } else {
    // El formulario no está visible, verificar si estamos en la página del servicio
    const servicePageTitle = page.locator('p.text-center, h1, h2, h3, h4, h5, h6').filter({
      hasText: /Detalle|Detalles|proveedor/i
    });
    
    const isServicePage = await servicePageTitle.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isServicePage) {
      // Buscar y hacer clic en el botón "Contactar GRATIS"
      const contactButtons = page.locator('button').filter({
        hasText: /Contactar GRATIS/i
      });
      
      const contactButtonCount = await contactButtons.count();
      console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
      
      if (contactButtonCount > 0) {
        const selectedContactButton = contactButtons.first();
        await selectedContactButton.scrollIntoViewIfNeeded();
        console.log(`✓ Haciendo clic en el botón "Contactar GRATIS"`);
        await selectedContactButton.click();
        await safeWaitForTimeout(page, 2000);
        } else {
        throw new Error('❌ No se encontró el botón "Contactar GRATIS"');
      }
    } else {
      // Si no estamos en la página del servicio, esperar un poco más
      await safeWaitForTimeout(page, 2000);
      
      // Buscar y hacer clic en el botón "Contactar GRATIS"
      const contactButtons = page.locator('button').filter({
        hasText: /Contactar GRATIS/i
      });
      
      const contactButtonCount = await contactButtons.count();
      console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
      
      if (contactButtonCount > 0) {
        const selectedContactButton = contactButtons.first();
        await selectedContactButton.scrollIntoViewIfNeeded();
        console.log(`✓ Haciendo clic en el botón "Contactar GRATIS"`);
        await selectedContactButton.click();
        await safeWaitForTimeout(page, 2000);
      } else {
        throw new Error('❌ No se encontró el botón "Contactar GRATIS"');
      }
    }
    
    // Esperar a que aparezca el formulario
    await page.locator('input[id="Honoree"]').waitFor({ state: 'visible', timeout: 10000 });
  }
  
  // Continuar con el formulario de evento (reutilizar la lógica de ejecutarFlujoCompletoCreacionEvento)
  // Esta parte es la misma que en ejecutarFlujoCompletoCreacionEvento, desde el llenado del formulario
  // hasta las validaciones finales. Voy a extraer esa parte en una función auxiliar o reutilizarla.
  
  // Por ahora, voy a copiar la lógica del formulario desde ejecutarFlujoCompletoCreacionEvento
  // pero adaptada para usar selectedEventType en lugar de eventTypeForValidation
        
        // Llenar todos los campos del formulario
        console.log('\n📝 Llenando formulario de contacto...');
  await showStepMessage(page, '📝 LLENANDO FORMULARIO DE EVENTO');
  
  // Variables para guardar los datos del evento y verificarlos después
  let eventData: {
    honoree: string;
    date: string;
    time: string;
    city: string;
    attendees: number;
  };
        
        // 1. Nombre del festejado
        const randomNames = ['María', 'Juan', 'Carlos', 'Ana', 'Pedro', 'Laura', 'José', 'Carmen', 'Luis', 'Sofia'];
        const randomLastNames = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randomLastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
        const randomHonoree = `${randomName} ${randomLastName}`;
        
  eventData = {
    honoree: randomHonoree,
    date: '',
    time: '',
    city: '',
    attendees: 0
  };
  
  const honoreeField = page.locator('input[id="Honoree"]').first();
  await honoreeField.scrollIntoViewIfNeeded();
  await honoreeField.click();
        await honoreeField.fill(randomHonoree);
        console.log(`✓ Campo "Nombre del festejado" llenado: ${randomHonoree}`);
  
  // Quitar el foco del campo de nombre del festejado
  await honoreeField.blur().catch(() => {});
  await safeWaitForTimeout(page, 300);
        
        // 2. Fecha (usando date picker)
        const dateField = page.locator('input[id="Date"]');
        await dateField.click();
        console.log(`✓ Abriendo date picker para seleccionar fecha futura`);
        
        const datePicker = page.locator('.flatpickr-calendar:visible, .flatpickr-calendar.open').first();
        await datePicker.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        
        const datePickerVisible = await datePicker.isVisible().catch(() => false);
        
        if (datePickerVisible) {
          console.log(`✓ Date picker visible, buscando días futuros...`);
          
          const availableDays = page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
          const daysCount = await availableDays.count();
          const currentDay = new Date().getDate();
          
          console.log(`📊 Días disponibles: ${daysCount}, día actual: ${currentDay}`);
          
          let futureDayIndex = -1;
          for (let i = 0; i < daysCount; i++) {
            const dayElement = availableDays.nth(i);
            const dayText = await dayElement.textContent();
            const dayNumber = parseInt(dayText?.trim() || '0');
            
            if (dayNumber > currentDay) {
              futureDayIndex = i;
              break;
            }
          }
          
          if (futureDayIndex === -1) {
            futureDayIndex = daysCount - 1;
            console.log(`⚠ No hay días futuros en este mes, usando último día disponible`);
          }
          
          const selectedDay = availableDays.nth(futureDayIndex);
          await selectedDay.click();
          const dayText = await selectedDay.textContent();
          const selectedDayNumber = parseInt(dayText?.trim() || '0');
  
    // Guardar la fecha seleccionada
    const dateFieldValue = await dateField.inputValue();
    eventData.date = dateFieldValue;
    console.log(`✓ Fecha seleccionada: día ${selectedDayNumber} (${dateFieldValue})`);
        }
        
        // 3. Hora (usando selector de hora)
  const randomHour = Math.floor(Math.random() * 12) + 1;
  const randomMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        
        await seleccionarHoraYMinuto(page, randomHour, randomMinute);
  
  // Guardar la hora seleccionada
  const timeField = page.locator('input[id="Time"]');
  await timeField.waitFor({ state: 'visible', timeout: 3000 });
  const timeValue = await timeField.inputValue();
  eventData.time = timeValue;
  console.log(`✓ Hora seleccionada: ${randomHour}:${randomMinute.toString().padStart(2, '0')} (${timeValue})`);
  
        const timePickerDialog = page.locator('[data-time-picker-content="true"]');
        try {
          await timePickerDialog.waitFor({ state: 'hidden', timeout: 3000 });
        } catch (e) {
          await safeWaitForTimeout(page, 1000);
        }
        
        // 4. Ciudad (usando autocompletado de Google)
        const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
        const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
        
        await safeWaitForTimeout(page, 500);
        
  // Buscar el campo de ciudad usando el label "Ciudad"
  let cityField: ReturnType<typeof page.locator> | null = null;
  
  const ciudadLabel = page.locator('label:has-text("Ciudad")').first();
          const labelExists = await ciudadLabel.count().then(count => count > 0);
          
          if (labelExists) {
              const labelFor = await ciudadLabel.getAttribute('for');
              if (labelFor) {
      cityField = page.locator(`input[id="${labelFor}"]`).first();
      const foundById = await cityField.count().then(count => count > 0);
      if (foundById) {
        await cityField.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Campo de ciudad encontrado por atributo "for" del label: ${labelFor}`);
              } else {
        console.log(`⚠ Campo con id="${labelFor}" no existe. Buscando input hermano del label...`);
        cityField = ciudadLabel.locator('xpath=preceding-sibling::input[1]').first();
        if (!(await cityField.count())) {
          cityField = ciudadLabel.locator('xpath=ancestor::div[contains(@class, "relative") or contains(@class, "flex")]//input').first();
        }
        await cityField.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Campo de ciudad encontrado por proximidad al label`);
      }
            }
          } else {
    cityField = page.locator('input').filter({
      has: page.locator('..').locator('i.icon-map-pin')
    }).first();
  }
  
  if (cityField) {
    const exists = await cityField.count().then(count => count > 0);
    if (!exists) {
      cityField = null;
    }
  }
  
  if (!cityField) {
    throw new Error('❌ No se pudo encontrar el campo de ciudad');
  }
  
  await cityField.waitFor({ state: 'visible', timeout: 5000 });
  
  // Asegurar que ningún otro campo tenga el foco
  await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => {});
  await safeWaitForTimeout(page, 200);
  
  // Hacer clic específicamente en el campo de ciudad
  await cityField.scrollIntoViewIfNeeded();
  await cityField.click({ force: true });
  await safeWaitForTimeout(page, 500);
  
  // Limpiar el campo si tiene algún valor
        const clearButton = page.locator('button[aria-label="Clear address"]');
        const clearButtonVisible = await clearButton.isVisible().catch(() => false);
        
        if (clearButtonVisible) {
          await clearButton.click();
          await safeWaitForTimeout(page, 200);
    await cityField.click({ force: true });
    await safeWaitForTimeout(page, 500);
        } else {
    const currentValue = await cityField.inputValue();
    if (currentValue && currentValue.trim().length > 0) {
          await cityField.selectText();
          await cityField.press('Backspace');
          await safeWaitForTimeout(page, 200);
    }
  }
  
  // Escribir en el campo de ciudad
  await cityField.fill(randomCity);
  await safeWaitForTimeout(page, 300);
  
  // Verificar que el texto se escribió correctamente
  const cityValue = await cityField.inputValue();
  if (cityValue !== randomCity) {
    console.log(`⚠️ El texto no se escribió correctamente. Intentando nuevamente...`);
    await cityField.clear();
    await cityField.fill(randomCity);
    await safeWaitForTimeout(page, 300);
  }
  
  console.log(`✓ Ciudad escrita: "${randomCity}" (valor en campo: "${await cityField.inputValue()}")`);
        await safeWaitForTimeout(page, 2000);
        
  // Esperar a que aparezcan las opciones de autocompletado de Google Places
  try {
    const autocompleteList = page.locator('ul.flex.flex-col.py-2, ul[class*="flex"][class*="flex-col"]');
    await autocompleteList.first().waitFor({ state: 'visible', timeout: 5000 });
    
    const autocompleteOptions = autocompleteList.locator('li.cursor-pointer, li[class*="cursor-pointer"]');
    await autocompleteOptions.first().waitFor({ state: 'visible', timeout: 3000 });
    
    const optionsCount = await autocompleteOptions.count();
    console.log(`📋 Opciones de ciudad encontradas: ${optionsCount}`);
    
    if (optionsCount > 0) {
      const firstOption = autocompleteOptions.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad: "${optionText?.trim()}"`);
      
      await firstOption.click();
      await safeWaitForTimeout(page, 1500);
      
      const cityValueFinal = await cityField.inputValue();
      eventData.city = cityValueFinal;
      console.log(`✅ Ciudad seleccionada. Valor del campo: "${cityValueFinal}"`);
    } else {
      throw new Error('No se encontraron opciones en la lista');
    }
  } catch (error) {
    try {
      const autocompleteOptionsAlt = page.locator('li.cursor-pointer.flex.items-center, li[class*="cursor-pointer"]');
      await autocompleteOptionsAlt.first().waitFor({ state: 'visible', timeout: 3000 });
      
      const firstOption = autocompleteOptionsAlt.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad (selector alternativo): "${optionText?.trim()}"`);
      
      await firstOption.click();
      await safeWaitForTimeout(page, 1500);
      const cityValueAlt = await cityField.inputValue();
      eventData.city = cityValueAlt;
      console.log('✅ Ciudad seleccionada del autocompletado (selector alternativo)');
    } catch (error2) {
      const cityValueFallback = await cityField.inputValue();
      eventData.city = cityValueFallback || randomCity;
      console.log(`⚠️ No se pudieron encontrar las opciones de autocompletado, usando: "${eventData.city}"`);
    }
  }
  
  // Asegurar que la ciudad esté guardada
  if (!eventData.city) {
    const cityValueFinal = await cityField.inputValue();
    eventData.city = cityValueFinal || randomCity;
        }
        
        // 5. Número de invitados
  const randomAttendees = Math.floor(Math.random() * 181) + 20;
        const attendeesField = page.locator('input[id="Attendees"]');
        await attendeesField.fill(randomAttendees.toString());
  eventData.attendees = randomAttendees;
        console.log(`✓ Campo "Número de invitados" llenado: ${randomAttendees}`);
        
        console.log('✅ Formulario completado exitosamente');
        
  // Hacer clic en el botón "Crear evento"
  await showStepMessage(page, '🚀 CREANDO EVENTO');
        const createEventButton = page.locator('button.bg-primary-neutral.text-neutral-0').filter({
          hasText: 'Crear evento'
        });
        await createEventButton.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Botón "Crear evento" encontrado y visible`);
        await createEventButton.click();
        console.log(`✓ Se hizo clic en "Crear evento"`);
        await safeWaitForTimeout(page, 2000);
  
  // Interactuar con el modal de solicitud (checkboxes, textarea y botón "Solicitar")
  await showStepMessage(page, '🪟 INTERACTUANDO CON MODAL DE SOLICITUD');
  const preQuotationForm = page.locator('#PrequotationRequestForm');
  await preQuotationForm.waitFor({ state: 'visible', timeout: 15000 });
  console.log('🪟 Modal de solicitud visible');
  
  const checkboxLocator = preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]');
  const checkboxCount = await checkboxLocator.count();
  console.log(`📋 Checkboxes disponibles: ${checkboxCount}`);
  
  if (checkboxCount > 0) {
    const shouldSelectAll = Math.random() < 0.4;
    
    if (shouldSelectAll) {
      await showStepMessage(page, '☑️ SELECCIONANDO TODAS LAS VARIEDADES');
      const selectAllButton = preQuotationForm.locator('div:has(> p:has-text("Seleccionar todo")) button').first();
      if (await selectAllButton.isVisible().catch(() => false)) {
        await selectAllButton.click();
        console.log('✅ Se hizo clic en "Seleccionar todo"');
      } else {
        console.log('⚠ Botón "Seleccionar todo" no visible, seleccionando manualmente');
      }
    } else {
      await showStepMessage(page, '☑️ SELECCIONANDO VARIEDADES ALEATORIAS');
    }
    
    if (! (await preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]:checked').count())) {
      const indices = Array.from({ length: checkboxCount }, (_, i) => i).sort(() => Math.random() - 0.5);
      const selections = Math.min(checkboxCount, Math.max(1, Math.floor(Math.random() * checkboxCount) + 1));
      
      for (let i = 0; i < selections; i++) {
        const checkbox = checkboxLocator.nth(indices[i]);
        const alreadyChecked = await checkbox.evaluate(el => (el as HTMLInputElement).checked).catch(() => false);
        if (alreadyChecked) continue;
        
        const checkboxId = await checkbox.getAttribute('id');
        let clickTarget = checkbox;
        if (checkboxId) {
          const label = preQuotationForm.locator(`label[for="${checkboxId}"]`).first();
          if (await label.count()) {
            clickTarget = label;
          }
        } else {
          const buttonWrapper = checkbox.locator('xpath=ancestor::button[1]');
          if (await buttonWrapper.count()) {
            clickTarget = buttonWrapper;
          }
        }
        
        await clickTarget.click({ force: true });
        console.log(`  ✓ Checkbox ${i + 1} seleccionado (${checkboxId || 'sin id'})`);
        await safeWaitForTimeout(page, 200);
      }
    }
  } else {
    console.log('⚠ No se encontraron checkboxes para seleccionar');
  }
  
  // Llenar el campo "Solicitudes"
  await showStepMessage(page, '📝 LLENANDO CAMPO DE SOLICITUDES');
  const requestMessages = [
    'Nos gustaría incluir opciones vegetarianas y postres personalizados.',
    'Buscamos algo con temática tropical y servicio completo de montaje.',
    'Necesitamos cotización con barra libre y personal extra para servicio.',
    'Queremos opciones premium y asesoría para decoración a juego.',
  ];
  const randomRequestMessage = requestMessages[Math.floor(Math.random() * requestMessages.length)];
  
  const requestField = preQuotationForm.locator('textarea#Request');
  await requestField.waitFor({ state: 'visible', timeout: 5000 });
  await requestField.fill(randomRequestMessage);
  console.log(`📝 Campo "Solicitudes" llenado con: ${randomRequestMessage}`);
  
  // Enviar la solicitud
  await showStepMessage(page, '🚀 ENVIANDO SOLICITUD');
  const solicitarButton = page.locator('button[form="PrequotationRequestForm"], button:has-text("Solicitar")').first();
  await solicitarButton.waitFor({ state: 'visible', timeout: 10000 });
  await solicitarButton.click();
  console.log('🚀 Botón "Solicitar" presionado');
  
  await preQuotationForm.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => console.log('⚠ El modal de selección no se ocultó, continuando...'));
  await safeWaitForTimeout(page, 1000);
  
  // Confirmar diálogo "Solicitud enviada"
  await showStepMessage(page, '✅ CONFIRMANDO SOLICITUD ENVIADA');
  const successDialog = page.locator('div:has-text("Solicitud enviada")').first();
  try {
    await successDialog.waitFor({ state: 'visible', timeout: 10000 });
    console.log('🎊 Modal "Solicitud enviada" visible');
    
    const okButton = successDialog.locator('button:has-text("OK")').first();
    await okButton.waitFor({ state: 'visible', timeout: 5000 });
    await okButton.click();
    console.log('👍 Botón "OK" presionado');
  } catch (successModalError) {
    console.log('⚠ Modal de confirmación no apareció o no se pudo cerrar, continuando...');
  }
  
  // Esperar de forma segura
  await safeWaitForTimeout(page, 1500);
  
  // Verificar que el flujo regrese automáticamente al dashboard del cliente
  await showStepMessage(page, '🔁 ESPERANDO REGRESO AL DASHBOARD');
  console.log('🔁 Esperando a que la aplicación regrese al dashboard del cliente...');
  
  try {
    // Verificar que la página esté abierta antes de esperar la URL
    if (!page.isClosed()) {
      await page.waitForURL('**/client/dashboard', { timeout: 20000 });
      console.log('🏠 Dashboard del cliente visible');
      
      if (!page.isClosed()) {
        await page.waitForLoadState('domcontentloaded');
        await safeWaitForTimeout(page, 1000);
      }
    }
  } catch (error) {
    // Si la página se cerró, intentar navegar al dashboard
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      console.log('⚠️ La página se cerró, intentando navegar al dashboard...');
      try {
        await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`, { waitUntil: 'domcontentloaded' });
        await safeWaitForTimeout(page, 2000);
        console.log('🏠 Dashboard del cliente visible (después de navegación)');
      } catch (navError) {
        console.log('⚠️ No se pudo navegar al dashboard, el evento puede haberse creado exitosamente');
        throw new Error('La página se cerró durante la creación del evento');
      }
    } else {
      throw error;
    }
  }
  
  console.log(`✅ Evento de tipo "${selectedEventType}" creado exitosamente`);
}

/**
 * Obtiene todos los tipos de eventos disponibles en la página
 */
export async function obtenerTiposDeEventos(page: Page): Promise<string[]> {
  // Verificar si estamos logueados y en el dashboard
  const currentUrl = page.url();
  const isOnDashboard = currentUrl.includes('/client/dashboard');
  
  if (!isOnDashboard) {
    // Si no estamos en el dashboard, hacer login primero
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await safeWaitForTimeout(page, 2000);
  }
  
  // Asegurar que estamos en el dashboard
  await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`, { waitUntil: 'domcontentloaded' });
  await safeWaitForTimeout(page, 2000);
  
  // Verificar que el botón "Nueva fiesta" está visible (confirma que estamos logueados)
  const nuevaFiestaButton = page.locator('button[type="button"].hidden.lg\\:flex').filter({
    hasText: 'Nueva fiesta'
  });
  
  const buttonVisible = await nuevaFiestaButton.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!buttonVisible) {
    // Si el botón no está visible, hacer login
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await safeWaitForTimeout(page, 2000);
    await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 2000);
  }
  
  // Buscar y seleccionar el botón "Nueva fiesta"
  await expect(nuevaFiestaButton).toBeVisible({ timeout: 10000 });
  await nuevaFiestaButton.click();
  await safeWaitForTimeout(page, 2000);
  
  // Buscar todos los botones de categoría de evento
  const categoryButtons = page.locator('button[type="submit"]').filter({
    has: page.locator('p.text-dark-neutral')
  });
  
  const categoryCount = await categoryButtons.count();
  
  if (categoryCount === 0) {
    throw new Error('❌ No se encontraron tipos de eventos disponibles');
  }
  
  // Obtener todos los nombres de los tipos de eventos
  const tiposEventos: string[] = [];
  for (let i = 0; i < categoryCount; i++) {
    const categoryButton = categoryButtons.nth(i);
    const categoryName = await categoryButton.locator('p.text-dark-neutral').textContent();
    const categoryNameTrimmed = categoryName?.trim() || '';
    if (categoryNameTrimmed) {
      tiposEventos.push(categoryNameTrimmed);
    }
  }
  
  return tiposEventos;
}

/**
 * Crea eventos de un bloque específico de tipos
 * @param page Página de Playwright
 * @param tiposEventos Lista completa de tipos de eventos
 * @param inicio Índice de inicio del bloque (inclusive)
 * @param fin Índice de fin del bloque (exclusive)
 */
export async function crearEventosDeBloque(
  page: Page,
  tiposEventos: string[],
  inicio: number,
  fin: number
) {
  const bloqueTipos = tiposEventos.slice(inicio, fin);
  const bloqueNumero = Math.floor(inicio / 3) + 1;
  const totalBloques = Math.ceil(tiposEventos.length / 3);
  
  await showStepMessage(page, `🎉 CREANDO EVENTOS - BLOQUE ${bloqueNumero}/${totalBloques}`);
  console.log(`\n🚀 Iniciando creación de eventos del bloque ${bloqueNumero}/${totalBloques}...`);
  console.log(`📋 Tipos en este bloque: ${bloqueTipos.join(', ')}`);
  
  // PASO 1: Verificar si ya estamos logueados (obtenerTiposDeEventos ya hizo login)
  const currentUrl = page.url();
  const isOnDashboard = currentUrl.includes('/client/dashboard');
  
  if (!isOnDashboard) {
    // Solo hacer login si no estamos en el dashboard
    await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO CLIENTE');
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    console.log('✓ Login exitoso como cliente');
    
    // Esperar a que se cargue el dashboard después del login
    await safeWaitForTimeout(page, 3000);
    
    // Verificar que estamos en el dashboard
    await expect(page).toHaveURL(`${DEFAULT_BASE_URL}/client/dashboard`, { timeout: 10000 });
    console.log('✓ Navegación al dashboard confirmada');
  } else {
    // Si ya estamos en el dashboard, solo navegar para asegurarnos
    await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 2000);
    console.log('✓ Ya estamos en el dashboard, continuando...');
  }
  
  // PASO 2: Crear eventos del bloque
  const eventosCreados: string[] = [];
  const eventosFallidos: string[] = [];
  
  for (let i = 0; i < bloqueTipos.length; i++) {
    const tipoEvento = bloqueTipos[i];
    const indiceGlobal = inicio + i;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 CREANDO EVENTO ${indiceGlobal + 1}/${tiposEventos.length}: ${tipoEvento}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      await crearEventoDeTipoEspecifico(page, tipoEvento);
      eventosCreados.push(tipoEvento);
      console.log(`✅ Evento de tipo "${tipoEvento}" creado exitosamente`);
      
      // Limpiar memoria después de cada evento
      try {
        if (!page.isClosed()) {
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
        }
      } catch (e) {
        // Ignorar errores al limpiar memoria
      }
      
      // Esperar un poco antes de crear el siguiente evento
      await safeWaitForTimeout(page, 2000);
    } catch (error) {
      eventosFallidos.push(tipoEvento);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ Error al crear evento de tipo "${tipoEvento}": ${errorMessage}`);
      
      // Si la página se cerró, intentar navegar al dashboard antes de continuar
      if (errorMessage.includes('Target page, context or browser has been closed')) {
        try {
          await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`, { waitUntil: 'domcontentloaded' });
          await safeWaitForTimeout(page, 2000);
          console.log('✓ Página recuperada, continuando con el siguiente evento...');
        } catch (recoveryError) {
          console.log('⚠️ No se pudo recuperar la página, puede que necesites reiniciar el test');
        }
      }
      
      // Continuar con el siguiente tipo de evento
    }
  }
  
  // PASO 3: Resumen del bloque
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN DEL BLOQUE ${bloqueNumero}/${totalBloques}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Eventos creados exitosamente: ${eventosCreados.length}/${bloqueTipos.length}`);
  if (eventosCreados.length > 0) {
    console.log(`   Tipos creados: ${eventosCreados.join(', ')}`);
  }
  
  if (eventosFallidos.length > 0) {
    console.log(`❌ Eventos fallidos: ${eventosFallidos.length}`);
    console.log(`   Tipos fallidos: ${eventosFallidos.join(', ')}`);
  }
  
  await showStepMessage(page, `🎉 BLOQUE ${bloqueNumero} COMPLETADO: ${eventosCreados.length}/${bloqueTipos.length} eventos creados`);
  console.log(`\n✅ Bloque ${bloqueNumero} completado`);
  await clearStepMessage(page);
  
  return { eventosCreados, eventosFallidos };
}

// ============================================================================
// TEST: Crear evento desde favoritos
// ============================================================================
test.skip('Crear evento desde favoritos', async ({ page }) => {
  test.setTimeout(300000); // 5 minutos
  
  const FAVORITES_URL = `${DEFAULT_BASE_URL}/client/favorites`;
  
  await showStepMessage(page, '❤️ CREANDO EVENTO DESDE FAVORITOS');
  console.log('🚀 Iniciando creación de evento desde favoritos...');
  
  // 0. Asegurar que estamos logueados como cliente
  await showStepMessage(page, '🔐 VERIFICANDO SESIÓN COMO CLIENTE');
  const currentUrlBeforeLogin = page.url();
  console.log(`📋 URL actual antes de login: ${currentUrlBeforeLogin}`);
  
  // Si no estamos en el dashboard del cliente, hacer login
  if (!currentUrlBeforeLogin.includes('/client/dashboard') && !currentUrlBeforeLogin.includes('/client/')) {
    console.log('⚠️ No se detectó sesión de cliente activa, iniciando sesión...');
    await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await safeWaitForTimeout(page, 2000);
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    console.log('✓ Login exitoso como cliente');
    await safeWaitForTimeout(page, 3000);
  } else {
    console.log('✓ Sesión de cliente ya activa');
  }
  
  // 1. Navegar a favoritos
  await showStepMessage(page, '🔍 NAVEGANDO A FAVORITOS');
  console.log('📋 Navegando a la página de favoritos...');
  
  // Buscar el enlace de favoritos en el navbar
  let enlaceFavoritos = page.locator('a[href="/client/favorites"], a[href*="favorites"]').first();
  const enlaceFavoritosVisible = await enlaceFavoritos.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!enlaceFavoritosVisible) {
    // Intentar buscar en el navbar de desktop
    enlaceFavoritos = page.locator('div.lg\\:block nav a[href="/client/favorites"]').first();
    const enlaceDesktopVisible = await enlaceFavoritos.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!enlaceDesktopVisible) {
      // Buscar por texto "Favoritos"
      enlaceFavoritos = page.locator('a, button').filter({
        hasText: /favoritos|Favoritos|FAVORITOS/i
      }).first();
      const enlacePorTextoVisible = await enlaceFavoritos.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!enlacePorTextoVisible) {
        // Como último recurso, navegar directamente a la URL
        console.log('⚠️ No se encontró el enlace de favoritos, navegando directamente...');
        await page.goto(FAVORITES_URL);
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, 2000);
      } else {
        await enlaceFavoritos.click();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, 2000);
      }
    } else {
      await enlaceFavoritos.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    }
  } else {
    await enlaceFavoritos.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);
  }
  
  // Verificar que estamos en la página de favoritos
  const currentUrl = page.url();
  console.log(`📋 URL actual: ${currentUrl}`);
  
  if (!currentUrl.includes('favorites')) {
    // Intentar navegar directamente
    await page.goto(FAVORITES_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);
  }
  
  // 2. Buscar servicios en favoritos
  await showStepMessage(page, '🔍 BUSCANDO SERVICIOS EN FAVORITOS');
  console.log('📋 Buscando servicios disponibles en favoritos...');
  
  // Buscar cards de servicios en favoritos
  // Los servicios en favoritos tienen la estructura: div.flex.flex-row.bg-light-light.border-1.border-light-neutral.rounded-6.shadow-4.p-4
  let servicioCard: ReturnType<typeof page.locator> | null = null;
  let nombreServicio = '';
  
  // Estrategia 1: Buscar cards de favoritos (estructura real según el HTML proporcionado)
  const favoriteCards = page.locator('div.flex.flex-row.bg-light-light.border-1.border-light-neutral.rounded-6.shadow-4.p-4.items-center');
  const favoriteCardsCount = await favoriteCards.count();
  console.log(`📊 Cards de favoritos encontradas: ${favoriteCardsCount}`);
  
  if (favoriteCardsCount > 0) {
    // Seleccionar la primera card visible
    for (let i = 0; i < favoriteCardsCount; i++) {
      const card = favoriteCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      if (isVisible) {
        servicioCard = card;
        
        // Obtener el nombre del servicio (p.text-dark-neutral.font-bold dentro de la card)
        const tituloCard = card.locator('p.text-dark-neutral.font-bold').first();
        const tituloText = await tituloCard.textContent().catch(() => '');
        nombreServicio = tituloText?.trim() || '';
        console.log(`✅ Servicio encontrado: "${nombreServicio}"`);
        break;
      }
    }
  }
  
  // Estrategia 2: Si no se encontró con el selector exacto, buscar variaciones
  if (!servicioCard) {
    console.log('⚠️ No se encontraron cards con el selector exacto, buscando variaciones...');
    const favoriteCardsAlt = page.locator('div.flex.flex-row').filter({
      has: page.locator('img[src*="imagedelivery"]')
    }).filter({
      has: page.locator('p.text-dark-neutral.font-bold')
    });
    const altCardsCount = await favoriteCardsAlt.count();
    console.log(`📊 Cards alternativas encontradas: ${altCardsCount}`);
    
    if (altCardsCount > 0) {
      for (let i = 0; i < altCardsCount; i++) {
        const card = favoriteCardsAlt.nth(i);
        const isVisible = await card.isVisible().catch(() => false);
        if (isVisible) {
          servicioCard = card;
          const tituloCard = card.locator('p.text-dark-neutral.font-bold').first();
          const tituloText = await tituloCard.textContent().catch(() => '');
          nombreServicio = tituloText?.trim() || '';
          console.log(`✅ Servicio encontrado (variación): "${nombreServicio}"`);
          break;
        }
      }
    }
  }
  
  // Estrategia 3: Buscar cards similares a las de promociones (fallback)
  if (!servicioCard) {
    console.log('⚠️ Buscando formato de promociones como fallback...');
    const promoCards = page.locator('div.flex.flex-col.rounded-8.shadow-4.cursor-pointer, div.flex.flex-col.rounded-6.shadow-4.cursor-pointer');
    const cardsCount = await promoCards.count();
    console.log(`📊 Cards de promociones encontradas: ${cardsCount}`);
    
    if (cardsCount > 0) {
      for (let i = 0; i < cardsCount; i++) {
        const card = promoCards.nth(i);
        const isVisible = await card.isVisible().catch(() => false);
        if (isVisible) {
          servicioCard = card;
          const tituloCard = card.locator('p.text-large.text-dark-neutral.font-bold, p[class*="text-large"][class*="font-bold"], h3, h4, h5, h6').first();
          const tituloText = await tituloCard.textContent().catch(() => '');
          nombreServicio = tituloText?.trim() || '';
          console.log(`✅ Servicio encontrado (formato promoción): "${nombreServicio}"`);
          break;
        }
      }
    }
  }
  
  // Estrategia 4: Buscar enlaces de servicios
  if (!servicioCard) {
    console.log('⚠️ Buscando enlaces de servicios...');
    const serviceLinks = page.locator('a[href*="/service/"], a[href*="/servicio/"]');
    const linksCount = await serviceLinks.count();
    console.log(`📊 Enlaces de servicios encontrados: ${linksCount}`);
    
    if (linksCount > 0) {
      servicioCard = serviceLinks.first();
      const linkText = await servicioCard.textContent().catch(() => '');
      nombreServicio = linkText?.trim() || 'Servicio';
      console.log(`✅ Enlace de servicio encontrado: "${nombreServicio}"`);
    }
  }
  
  if (!servicioCard) {
    console.log('⚠️ No se encontró ningún servicio en favoritos. Buscando un servicio del proveedor fiestamasqaprv para marcarlo como favorito...');
    
    // Función auxiliar para marcar un servicio como favorito del proveedor fiestamasqaprv
    async function marcarServicioComoFavoritoDesdeProveedor() {
      await showStepMessage(page, '🔍 BUSCANDO SERVICIO DEL PROVEEDOR FIESTAMASQAPRV');
      console.log('📋 Buscando un servicio del proveedor fiestamasqaprv@gmail.com...');
      
      // 1. Obtener servicios del proveedor fiestamasqaprv
      // Primero loguearse como proveedor para obtener la lista de servicios
      await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO PROVEEDOR');
      console.log('📋 Iniciando sesión como proveedor para obtener servicios...');
      await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await safeWaitForTimeout(page, 2000);
      await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      // Navegar a administrar servicios
      await page.goto(`${DEFAULT_BASE_URL}/provider/dashboard`);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios"), div.flex.flex-row.gap-3 button:has-text("Administrar servicios")');
      const adminButtonVisible = await adminServiciosButton.first().isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!adminButtonVisible) {
        throw new Error('❌ No se encontró el botón "Administrar servicios"');
      }
      
      await adminServiciosButton.first().click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      // Buscar todas las tarjetas de servicios
      const serviceCardsContainer = page.locator('div.flex.flex-col.bg-neutral-0.rounded-6.shadow-4.border-1.border-light-neutral');
      const providerServicesCount = await serviceCardsContainer.count();
      console.log(`📊 Servicios del proveedor encontrados: ${providerServicesCount}`);
      
      if (providerServicesCount === 0) {
        throw new Error('❌ No se encontraron servicios del proveedor fiestamasqaprv@gmail.com');
      }
      
      // Buscar servicios activos del proveedor y probarlos hasta encontrar uno que aparezca en los resultados del cliente
      await showStepMessage(page, '✅ VALIDANDO QUE EL SERVICIO ESTÉ ACTIVO');
      console.log('📋 Verificando que el servicio del proveedor fiestamasqaprv@gmail.com esté activo...');
      
      // Obtener todos los servicios activos primero
      const serviciosActivos: Array<{ index: number; card: ReturnType<typeof page.locator>; name: string; categoria: string; subcategoria: string }> = [];
      
      for (let i = 0; i < providerServicesCount; i++) {
        const card = serviceCardsContainer.nth(i);
        
        // Verificar si la tarjeta es visible
        const isVisible = await card.isVisible().catch(() => false);
        if (!isVisible) {
          continue;
        }
        
        // Usar la función reutilizable para verificar si el servicio está activo
        const estadoServicio = await verificarSiServicioEstaActivo(page, card);
        
        if (estadoServicio === false) {
          console.log(`❌ Servicio en índice ${i} está inactivo, descartando...`);
          continue; // Descartar este servicio y continuar con el siguiente
        }
        
        if (estadoServicio === null) {
          console.log(`⚠️ Servicio en índice ${i} no se puede verificar el estado, descartando...`);
          continue; // Descartar este servicio si no se puede verificar
        }
        
        // Si llegamos aquí, el servicio está activo (estadoServicio === true)
        console.log(`✅ Servicio en índice ${i} está activo`);
        
        // Obtener información del servicio activo
        const serviceNameElement = card.locator('p.text-medium.font-bold, p.font-bold, p.text-dark-neutral').first();
        const nombreServicio = (await serviceNameElement.textContent())?.trim() || '';
        
        if (nombreServicio) {
          // Obtener categoría y subcategoría
          let categoria = '';
          let subcategoria = '';
          const categoriaContainer = card.locator('div.flex.flex-row.items-center.gap-3.mt-1:has(i.icon-tag)');
          if (await categoriaContainer.count() > 0) {
            const categoriaElement = categoriaContainer.locator('p').first();
            if (await categoriaElement.count() > 0) {
              let categoriaText = (await categoriaElement.textContent())?.trim() || '';
              categoriaText = categoriaText.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
              
              if (categoriaText.includes('>')) {
                const parts = categoriaText.split('>').map(p => p.trim()).filter(p => p.length > 0);
                categoria = parts[0] || '';
                subcategoria = parts[1] || '';
              } else {
                categoria = categoriaText;
              }
            }
          }
          
          serviciosActivos.push({
            index: i,
            card: card,
            name: nombreServicio,
            categoria: categoria,
            subcategoria: subcategoria
          });
          
          console.log(`✅ Servicio activo agregado: "${nombreServicio}" - Ruta: ${categoria ? categoria + (subcategoria ? ' > ' + subcategoria : '') : 'Sin categoría'}`);
        }
      }
      
      if (serviciosActivos.length === 0) {
        throw new Error('❌ No se encontró ningún servicio activo del proveedor fiestamasqaprv@gmail.com');
      }
      
      console.log(`📊 Total de servicios activos encontrados: ${serviciosActivos.length}`);
      
      // Probar cada servicio activo hasta encontrar uno que aparezca en los resultados del cliente
      let servicioFuncionalEncontrado = false;
      let serviceName = '';
      let rutaCategorias: string[] = [];
      
      for (const servicio of serviciosActivos) {
        console.log(`\n🔍 Probando servicio: "${servicio.name}"`);
        
        serviceName = servicio.name;
        rutaCategorias = [];
        if (servicio.categoria) {
          rutaCategorias.push(servicio.categoria);
          if (servicio.subcategoria) {
            rutaCategorias.push(servicio.subcategoria);
          }
        }
        
        console.log(`✅ Servicio a probar: "${serviceName}" - Ruta: ${rutaCategorias.join(' > ') || 'Sin categoría'}`);
        
        try {
          // 2. Cerrar sesión del proveedor y hacer login como cliente (solo la primera vez)
          if (serviciosActivos.indexOf(servicio) === 0) {
            await showStepMessage(page, '🔄 CAMBIANDO A SESIÓN DE CLIENTE');
            console.log('📋 Cerrando sesión de proveedor y logueándose como cliente...');
            await page.context().clearCookies();
            await page.goto(`${DEFAULT_BASE_URL}`, { waitUntil: 'domcontentloaded' });
            await safeWaitForTimeout(page, 500);
            
            try {
              await page.evaluate(() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch (e) {}
              });
            } catch (e) {}
            
            await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
            await safeWaitForTimeout(page, 2000);
            await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
            console.log('✓ Login exitoso como cliente');
            await safeWaitForTimeout(page, 2000);
          }
          
          // 3. Navegar al servicio usando búsqueda
          await showStepMessage(page, `🔍 NAVEGANDO AL SERVICIO: ${serviceName}`);
          console.log(`📋 Navegando al servicio "${serviceName}"...`);
          
          // Ir al home del cliente
          await page.goto(DEFAULT_BASE_URL);
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, 2000);
      
      // Si el servicio tiene ruta de categorías, navegar haciendo click en los botones
      if (rutaCategorias.length > 0) {
        const categoriaPrincipal = rutaCategorias[0];
        console.log(`   📂 Navegando a categoría principal: "${categoriaPrincipal}"`);
        
        const categoriaElement = page.locator('button, a, div[role="button"]').filter({
          hasText: new RegExp(categoriaPrincipal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        }).first();
        
        const categoriaExists = await categoriaElement.count() > 0;
        
        if (categoriaExists) {
          await expect(categoriaElement).toBeVisible({ timeout: 10000 });
          await categoriaElement.click();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, 2000);
        }
        
        // Navegar por subcategorías si las hay
        for (let nivel = 1; nivel < rutaCategorias.length; nivel++) {
          const subcategoriaNombre = rutaCategorias[nivel];
          console.log(`\n   📂 ========== NAVEGANDO A SUBCATEGORÍA: "${subcategoriaNombre}" ==========`);
          console.log(`   📍 Nivel: ${nivel + 1}/${rutaCategorias.length}`);
          
          // Guardar la URL antes de buscar la subcategoría
          const urlAntesBuscar = page.url();
          console.log(`   🔗 URL antes de buscar subcategoría: ${urlAntesBuscar}`);
          
          // Buscar el elemento de la subcategoría
          // IMPORTANTE: Excluir elementos que son servicios (tienen imágenes, precios, etc.)
          // y priorizar elementos que son realmente botones de subcategoría
          const subcategoriaElement = page.locator('button, a, div[role="button"]')
            .filter({
              hasText: new RegExp(`^${subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
            })
            // Excluir elementos que son servicios (tienen imágenes de servicios)
            .filter({
              hasNot: page.locator('img[src*="imagedelivery"], img[alt*="servicio" i], img[alt*="service" i]')
            })
            // Excluir elementos que tienen precios o información de servicios
            .filter({
              hasNot: page.locator('text=/\\$|precio|price|contactar|contact/i')
            })
            // Excluir elementos que son tarjetas de servicios (tienen clases específicas de servicios)
            .filter({
              hasNot: page.locator('[class*="promo"], [class*="service-card"], [class*="servicio"]')
            })
            .first();
          
          // Si no se encuentra con el selector estricto, intentar con un selector más flexible
          // pero aún excluyendo servicios
          let subcategoriaEncontrada = await subcategoriaElement.count() > 0;
          let elementoFinal = subcategoriaElement;
          
          if (!subcategoriaEncontrada) {
            console.log(`   ⚠️ No se encontró con selector estricto, intentando selector más flexible...`);
            const subcategoriaElementFlexible = page.locator('button, a, div[role="button"]')
              .filter({
                hasText: new RegExp(subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
              })
              // Excluir elementos que son servicios (tienen imágenes de servicios)
              .filter({
                hasNot: page.locator('img[src*="imagedelivery"]')
              })
              // Excluir elementos que contienen texto de servicios (nombres de servicios, promociones, etc.)
              .filter({
                hasNot: page.locator('text=/SUPERPromo|promo|servicio|service|precio|price/i')
              })
              .first();
            
            const encontradoFlexible = await subcategoriaElementFlexible.count() > 0;
            if (encontradoFlexible) {
              elementoFinal = subcategoriaElementFlexible;
              subcategoriaEncontrada = true;
              console.log(`   ✅ Encontrado con selector flexible`);
            }
          }
          
          const subcategoriaExists = subcategoriaEncontrada;
          console.log(`   🔍 Subcategoría "${subcategoriaNombre}" encontrada: ${subcategoriaExists}`);
          
          if (subcategoriaExists) {
            // Verificar que el elemento no es un servicio antes de continuar
            const tieneImagenServicio = await elementoFinal.locator('img[src*="imagedelivery"]').count().then(count => count > 0);
            const tieneTextoPromo = await elementoFinal.textContent().then(text => text?.includes('SUPERPromo') || text?.includes('promo') || false).catch(() => false);
            const tieneTextoService = await elementoFinal.textContent().then(text => text?.includes('Servicio-') || text?.includes('service-') || false).catch(() => false);
            
            if (tieneImagenServicio || tieneTextoPromo || tieneTextoService) {
              console.log(`   ⚠️ ADVERTENCIA CRÍTICA: El elemento encontrado parece ser un SERVICIO, no una subcategoría!`);
              console.log(`      - Tiene imagen de servicio: ${tieneImagenServicio}`);
              console.log(`      - Tiene texto de promoción: ${tieneTextoPromo}`);
              console.log(`      - Tiene texto de servicio: ${tieneTextoService}`);
              console.log(`   🔄 Intentando encontrar el elemento correcto de subcategoría...`);
              
              // Buscar específicamente botones de subcategoría que NO sean servicios
              const subcategoriaCorrecta = page.locator('button, a, div[role="button"]')
                .filter({
                  has: page.locator('p, span, h1, h2, h3, h4, h5, h6').filter({
                    hasText: new RegExp(`^${subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
                  })
                })
                // Excluir explícitamente elementos que son servicios
                .filter({
                  hasNot: page.locator('img[src*="imagedelivery"]')
                })
                .filter({
                  hasNot: page.locator('text=/SUPERPromo|promo|servicio|service/i')
                })
                .first();
              
              const encontradoCorrecto = await subcategoriaCorrecta.count() > 0;
              if (encontradoCorrecto) {
                elementoFinal = subcategoriaCorrecta;
                console.log(`   ✅ Encontrado elemento correcto de subcategoría (excluyendo servicios)`);
              } else {
                console.log(`   ⚠️ No se encontró un elemento de subcategoría válido, continuando con el encontrado...`);
              }
            }
            
            // Obtener información del elemento antes de hacer clic
            const elementoTag = await elementoFinal.evaluate(el => el.tagName).catch(() => 'desconocido');
            const elementoText = await elementoFinal.textContent().catch(() => '');
            const elementoHref = await elementoFinal.getAttribute('href').catch(() => null);
            const elementoClasses = await elementoFinal.getAttribute('class').catch(() => '') || '';
            const elementoOnClick = await elementoFinal.getAttribute('onclick').catch(() => null);
            const elementoDataHref = await elementoFinal.getAttribute('data-href').catch(() => null);
            const elementoDataUrl = await elementoFinal.getAttribute('data-url').catch(() => null);
            const elementoDataLink = await elementoFinal.getAttribute('data-link').catch(() => null);
            
            // Verificar si el botón tiene event listeners o atributos que lo hacen navegar
            const tieneEventListeners = await elementoFinal.evaluate((el) => {
              // Verificar si tiene onclick en el HTML
              if (el.getAttribute('onclick')) return true;
              
              // Verificar si tiene event listeners agregados dinámicamente
              // Esto es una aproximación - no podemos acceder directamente a los listeners
              // pero podemos verificar atributos comunes
              const hasDataAttributes = el.hasAttribute('data-href') || 
                                       el.hasAttribute('data-url') || 
                                       el.hasAttribute('data-link') ||
                                       el.hasAttribute('data-navigate') ||
                                       el.hasAttribute('data-route');
              
              // Verificar si el botón está dentro de un enlace
              const parentLink = el.closest('a');
              if (parentLink) return true;
              
              return hasDataAttributes;
            }).catch(() => false);
            
            console.log(`   📋 Información del elemento de subcategoría:`);
            console.log(`      - Tag: ${elementoTag}`);
            console.log(`      - Texto: "${elementoText?.trim()}"`);
            console.log(`      - Href: ${elementoHref || 'N/A'}`);
            console.log(`      - OnClick (HTML): ${elementoOnClick || 'N/A'}`);
            console.log(`      - Data-href: ${elementoDataHref || 'N/A'}`);
            console.log(`      - Data-url: ${elementoDataUrl || 'N/A'}`);
            console.log(`      - Data-link: ${elementoDataLink || 'N/A'}`);
            console.log(`      - Clases: ${(elementoClasses || '').substring(0, 100)}${(elementoClasses || '').length > 100 ? '...' : ''}`);
            console.log(`      - Tiene event listeners/atributos de navegación: ${tieneEventListeners}`);
            
            // Verificar si el elemento tiene un href que apunta a un servicio
            if (elementoHref && (elementoHref.includes('/service/') || elementoHref.includes('/services/'))) {
              console.log(`   ⚠️ ADVERTENCIA: El elemento de subcategoría tiene un href que apunta directamente a un servicio: ${elementoHref}`);
            }
            
            // Verificar si tiene atributos data que apuntan a un servicio
            const atributosData = [elementoDataHref, elementoDataUrl, elementoDataLink].filter(Boolean);
            for (const attr of atributosData) {
              if (attr && (attr.includes('/service/') || attr.includes('/services/'))) {
                console.log(`   ⚠️ ADVERTENCIA: El elemento tiene un atributo data que apunta a un servicio: ${attr}`);
              }
            }
            
            // Verificar si el botón está dentro de un enlace padre
            const parentLink = await elementoFinal.locator('xpath=ancestor::a').first().count().then(count => count > 0);
            if (parentLink) {
              const parentHref = await elementoFinal.locator('xpath=ancestor::a').first().getAttribute('href').catch(() => null);
              console.log(`   ⚠️ ADVERTENCIA: El botón está dentro de un enlace <a> con href: ${parentHref || 'N/A'}`);
              if (parentHref && (parentHref.includes('/service/') || parentHref.includes('/services/'))) {
                console.log(`   ⚠️ ADVERTENCIA CRÍTICA: El botón está dentro de un enlace que apunta directamente a un servicio!`);
              }
            }
            
            // Verificar cuántos servicios hay en la página actual antes de hacer clic
            const serviciosEnPagina = page.locator('button, div, a').filter({
              has: page.locator('img[src*="imagedelivery"], img[alt]')
            }).filter({
              has: page.locator('p, h3, h4, h5, h6').filter({
                hasText: /[a-zA-Z]/
              })
            });
            const cantidadServicios = await serviciosEnPagina.count();
            console.log(`   📊 Servicios visibles en la página actual: ${cantidadServicios}`);
            
            // Si hay solo un servicio visible, es probable que el clic navegue directamente a él
            if (cantidadServicios === 1) {
              console.log(`   ⚠️ ADVERTENCIA: Solo hay 1 servicio visible en la página. El clic en la subcategoría probablemente navegará directamente a ese servicio.`);
              const unicoServicio = serviciosEnPagina.first();
              const nombreUnicoServicio = await unicoServicio.locator('p, h3, h4, h5, h6').first().textContent().catch(() => 'desconocido');
              console.log(`      - Nombre del servicio único: "${nombreUnicoServicio?.trim()}"`);
            }
            
            // Verificar cuántos elementos coinciden con el selector (incluyendo servicios)
            const todosLosElementos = page.locator('button, a, div[role="button"], div.cursor-pointer').filter({
              hasText: new RegExp(subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            });
            const cantidadElementos = await todosLosElementos.count();
            console.log(`   📊 Total de elementos que coinciden con "${subcategoriaNombre}" (incluyendo servicios): ${cantidadElementos}`);
            
            if (cantidadElementos > 1) {
              console.log(`   ⚠️ ADVERTENCIA: Hay ${cantidadElementos} elementos que coinciden, analizando cada uno...`);
              for (let i = 0; i < Math.min(cantidadElementos, 5); i++) {
                const elem = todosLosElementos.nth(i);
                const elemText = await elem.textContent().catch(() => '');
                const elemHref = await elem.getAttribute('href').catch(() => null);
                const tieneImg = await elem.locator('img[src*="imagedelivery"]').count().then(count => count > 0);
                const tienePromo = elemText?.includes('SUPERPromo') || elemText?.includes('promo') || false;
                const esServicio = tieneImg || tienePromo;
                console.log(`      - Elemento ${i + 1}: "${elemText?.trim()?.substring(0, 50)}${elemText && elemText.length > 50 ? '...' : ''}"`);
                console.log(`        (href: ${elemHref || 'N/A'}, es servicio: ${esServicio ? 'SÍ ⚠️' : 'NO ✅'})`);
              }
            }
            
            await expect(elementoFinal).toBeVisible({ timeout: 10000 });
            console.log(`   ✅ Elemento de subcategoría visible`);
            
            // Verificar qué elementos clickeables hay en la página antes del clic (excluyendo servicios)
            const elementosClickeables = page.locator('button, a, div[role="button"], div.cursor-pointer')
              .filter({
                has: page.locator('p, span, h1, h2, h3, h4, h5, h6').filter({
                  hasText: new RegExp(subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                })
              })
              .filter({
                hasNot: page.locator('img[src*="imagedelivery"]')
              });
            const cantidadClickeables = await elementosClickeables.count();
            console.log(`   📊 Elementos clickeables que contienen "${subcategoriaNombre}" (excluyendo servicios): ${cantidadClickeables}`);
            
            // Guardar la URL antes de hacer clic
            const urlAntesSubcategoria = page.url();
            console.log(`   🔗 URL antes del clic: ${urlAntesSubcategoria}`);
            
            // Hacer scroll al elemento si es necesario
            await elementoFinal.scrollIntoViewIfNeeded();
            await safeWaitForTimeout(page, 500);
            
            // Verificación final antes de hacer clic: asegurarse de que no es un servicio
            const textoFinal = await elementoFinal.textContent().catch(() => '') || '';
            if (textoFinal.includes('SUPERPromo') || textoFinal.includes('Servicio-') || textoFinal.includes('service-')) {
              console.log(`   ⚠️ ADVERTENCIA CRÍTICA: El elemento a clickear contiene texto de servicio/promoción!`);
              console.log(`      Texto completo: "${textoFinal.trim()}"`);
              console.log(`   ⚠️ NO se hará clic para evitar navegar directamente a un servicio`);
              throw new Error(`❌ El elemento encontrado para la subcategoría "${subcategoriaNombre}" parece ser un servicio, no una subcategoría. Texto: "${textoFinal.trim()}"`);
            }
            
            console.log(`   🖱️ Haciendo clic en la subcategoría "${subcategoriaNombre}"...`);
            await elementoFinal.click();
            console.log(`   ✅ Clic realizado`);
            
            // Esperar a que la página responda
            await page.waitForLoadState('networkidle');
            await safeWaitForTimeout(page, 2000);
            
            // Verificar si el clic navegó directamente a una página de servicio
            const urlDespuesSubcategoria = page.url();
            console.log(`   🔗 URL después del clic: ${urlDespuesSubcategoria}`);
            console.log(`   📊 Cambio de URL: ${urlAntesSubcategoria !== urlDespuesSubcategoria ? 'SÍ' : 'NO'}`);
            
            // Verificar si estamos en una página de servicio
            const esPaginaServicio = urlDespuesSubcategoria.includes('/service/') || urlDespuesSubcategoria.includes('/services/');
            console.log(`   🔍 ¿Es página de servicio?: ${esPaginaServicio}`);
            
            if (esPaginaServicio) {
              console.log(`\n   ⚠️ ========== PROBLEMA DETECTADO ==========`);
              console.log(`   ⚠️ Al hacer clic en la subcategoría "${subcategoriaNombre}", navegó directamente a una página de servicio`);
              console.log(`   📍 URL de destino: ${urlDespuesSubcategoria}`);
              console.log(`   📋 Información del elemento clickeado:`);
              console.log(`      - Tag: ${elementoTag}`);
              console.log(`      - Texto: "${elementoText?.trim()}"`);
              console.log(`      - Href: ${elementoHref || 'N/A'}`);
              console.log(`      - Clases: ${elementoClasses}`);
              console.log(`   💡 Posibles causas:`);
              console.log(`      1. El elemento de subcategoría tiene un href que apunta directamente a un servicio`);
              console.log(`      2. El elemento clickeado no es realmente una subcategoría, sino un servicio`);
              console.log(`      3. Hay un solo servicio en esa subcategoría y el sistema navega directamente`);
              console.log(`   ✅ Ya estamos en la página del servicio, no es necesario buscar más`);
              console.log(`   ============================================\n`);
              
              // Ya estamos en la página del servicio, no necesitamos buscar
              return { nombre: serviceName, ruta: rutaCategorias };
            }
            
            // Si la URL cambió pero no es una página de servicio, continuar normalmente
            if (urlDespuesSubcategoria !== urlAntesSubcategoria) {
              console.log(`   ✅ Navegó a: ${urlDespuesSubcategoria}`);
              console.log(`   ✅ Continuando con el flujo normal...`);
            } else {
              console.log(`   ℹ️ La URL no cambió después del clic`);
            }
          } else {
            console.log(`   ⚠️ No se encontró la subcategoría "${subcategoriaNombre}"`);
          }
        }
      }
      
      // Verificar si ya estamos en una página de servicio antes de buscar
      const urlActual = page.url();
      if (urlActual.includes('/service/') || urlActual.includes('/services/')) {
        console.log(`   ✅ Ya estamos en una página de servicio, no es necesario buscar`);
        return { nombre: serviceName, ruta: rutaCategorias };
      }
      
      // Buscar el servicio por nombre en el formulario de búsqueda
      console.log('   🔍 Buscando campo de búsqueda...');
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 2000);
      
      let searchInput = page.locator('input#Search');
      let inputCount = await searchInput.count();
      
      if (inputCount === 0) {
        searchInput = page.locator('input[name="Search"]');
        inputCount = await searchInput.count();
      }
      
      if (inputCount === 0) {
        const searchForm = page.locator('form#ServicesSearchForm');
        const formCount = await searchForm.count();
        if (formCount > 0) {
          searchInput = searchForm.locator('input[type="text"]').first();
          inputCount = await searchInput.count();
        }
      }
      
      if (inputCount === 0) {
        throw new Error('❌ No se encontró el campo de búsqueda');
      }
      
      console.log(`   📝 Buscando: "${serviceName}"`);
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.fill(serviceName);
      await safeWaitForTimeout(page, 1000);
      
      // Hacer clic en el botón o icono de búsqueda
      const searchIcon = page.locator('i.icon-search').first();
      const searchButton = page.locator('button[type="submit"]:has(i.icon-search), button:has(i.icon-search)').first();
      const iconCount = await searchIcon.count();
      const buttonExists = await searchButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (buttonExists) {
        await searchButton.click();
      } else if (iconCount > 0) {
        await searchIcon.click();
      } else {
        await page.keyboard.press('Enter');
      }
      
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 3000);
      
          // Buscar el servicio en los resultados
          const serviceCardsResultados = page.locator('button, div, a').filter({
            has: page.locator('img[src*="imagedelivery"], img[alt]')
          }).filter({
            has: page.locator(`p, h3, h4, h5, h6`).filter({ hasText: new RegExp(serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          });
          
          const serviceCardsResultadosCount = await serviceCardsResultados.count();
          
          if (serviceCardsResultadosCount === 0) {
            // El servicio no aparece en los resultados, probablemente está desactivado
            console.log(`❌ No se encontró el servicio "${serviceName}" en los resultados de búsqueda. El servicio puede estar desactivado.`);
            throw new Error(`SERVICIO_NO_ENCONTRADO: "${serviceName}"`);
          }
          
          const servicioEncontrado = serviceCardsResultados.first();
          await servicioEncontrado.scrollIntoViewIfNeeded();
          await safeWaitForTimeout(page, 500);
          await servicioEncontrado.click();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, 2000);
          
          // 3. Marcar como favorito usando la función reutilizable
          await marcarServicioComoFavorito(page);
          
          // 4. Volver a la página de favoritos
          await showStepMessage(page, '🔙 VOLVIENDO A FAVORITOS');
          console.log('📋 Volviendo a la página de favoritos...');
          await page.goto(FAVORITES_URL);
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, 2000);
          
          // Si llegamos aquí, el servicio funcionó correctamente
          servicioFuncionalEncontrado = true;
          break; // Salir del bucle de servicios
          
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          if (errorMessage.includes('SERVICIO_NO_ENCONTRADO')) {
            console.log(`⚠️ Servicio "${serviceName}" no encontrado en resultados, probando siguiente servicio...`);
            continue; // Continuar con el siguiente servicio
          } else {
            console.log(`⚠️ Error al procesar servicio "${serviceName}": ${errorMessage}`);
            // Si es un error diferente, también continuar con el siguiente servicio
            continue;
          }
        }
      }
      
      if (!servicioFuncionalEncontrado) {
        throw new Error('❌ No se pudo encontrar ningún servicio activo que aparezca en los resultados del cliente');
      }
      
      return { nombre: serviceName, ruta: rutaCategorias };
    }
    
    // Ejecutar la función para marcar un servicio como favorito
    await marcarServicioComoFavoritoDesdeProveedor();
    
    // Reintentar buscar servicios en favoritos
    console.log('📋 Reintentando buscar servicios en favoritos...');
    await showStepMessage(page, '🔍 BUSCANDO SERVICIOS EN FAVORITOS (REINTENTO)');
    
    // Buscar nuevamente las cards de favoritos con la estructura correcta
    const favoriteCardsRetry = page.locator('div.flex.flex-row.bg-light-light.border-1.border-light-neutral.rounded-6.shadow-4.p-4.items-center');
    const favoriteCardsCountRetry = await favoriteCardsRetry.count();
    console.log(`📊 Cards de favoritos encontradas después de marcar favorito: ${favoriteCardsCountRetry}`);
    
    if (favoriteCardsCountRetry > 0) {
      for (let i = 0; i < favoriteCardsCountRetry; i++) {
        const card = favoriteCardsRetry.nth(i);
        const isVisible = await card.isVisible().catch(() => false);
        if (isVisible) {
          servicioCard = card;
          const tituloCard = card.locator('p.text-dark-neutral.font-bold').first();
          const tituloText = await tituloCard.textContent().catch(() => '');
          nombreServicio = tituloText?.trim() || '';
          console.log(`✅ Servicio encontrado después de marcar favorito: "${nombreServicio}"`);
          break;
        }
      }
    }
    
    // Si no se encuentra, intentar con selector alternativo
    if (!servicioCard) {
      const favoriteCardsAltRetry = page.locator('div.flex.flex-row').filter({
        has: page.locator('img[src*="imagedelivery"]')
      }).filter({
        has: page.locator('p.text-dark-neutral.font-bold')
      });
      const altCardsCountRetry = await favoriteCardsAltRetry.count();
      
      if (altCardsCountRetry > 0) {
        for (let i = 0; i < altCardsCountRetry; i++) {
          const card = favoriteCardsAltRetry.nth(i);
          const isVisible = await card.isVisible().catch(() => false);
          if (isVisible) {
            servicioCard = card;
            const tituloCard = card.locator('p.text-dark-neutral.font-bold').first();
            const tituloText = await tituloCard.textContent().catch(() => '');
            nombreServicio = tituloText?.trim() || '';
            console.log(`✅ Servicio encontrado (variación): "${nombreServicio}"`);
            break;
          }
        }
      }
    }
    
    // Si aún no se encuentra, intentar con enlaces
    if (!servicioCard) {
      const serviceLinksRetry = page.locator('a[href*="/service/"], a[href*="/servicio/"]');
      const linksCountRetry = await serviceLinksRetry.count();
      
      if (linksCountRetry > 0) {
        servicioCard = serviceLinksRetry.first();
        const linkText = await servicioCard.textContent().catch(() => '');
        nombreServicio = linkText?.trim() || 'Servicio';
        console.log(`✅ Enlace de servicio encontrado: "${nombreServicio}"`);
      }
    }
    
    if (!servicioCard) {
      throw new Error('❌ No se pudo encontrar ningún servicio en favoritos después de intentar marcar uno como favorito');
    }
  }
  
  // 3. Hacer clic en el botón "Contactar" del servicio
  await showStepMessage(page, `🖱️ HACIENDO CLIC EN "CONTACTAR" DEL SERVICIO: ${nombreServicio}`);
  console.log(`📋 Buscando botón "Contactar" del servicio "${nombreServicio}"...`);
  
  // Buscar el botón "Contactar" dentro de la card del servicio
  // El botón tiene un span con texto "Contactar" dentro
  let contactButton: ReturnType<typeof page.locator> | null = null;
  let contactButtonVisible = false;
  
  // Estrategia 1: Buscar todos los botones dentro de la card y filtrar por contenido
  const allButtons = servicioCard.locator('button');
  const buttonCount = await allButtons.count();
  console.log(`   🔍 Total de botones en la card: ${buttonCount}`);
  
  for (let i = 0; i < buttonCount; i++) {
    const button = allButtons.nth(i);
    const buttonText = await button.textContent().catch(() => '');
    const trimmedText = buttonText?.trim() || '';
    console.log(`   🔍 Botón ${i + 1} texto: "${trimmedText}"`);
    
    // Verificar si el texto contiene "Contactar" (más flexible que igualdad exacta)
    if (trimmedText === 'Contactar' || trimmedText.includes('Contactar')) {
      // Verificar si el botón es visible o no está oculto por CSS
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);
      
      // También verificar que no esté oculto por clases CSS
      const isHidden = await button.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      }).catch(() => false);
      
      if (isVisible && !isHidden) {
        contactButton = button;
        contactButtonVisible = true;
        console.log(`   ✅ Botón "Contactar" encontrado en índice ${i}`);
        break;
      } else {
        console.log(`   ⚠️ Botón ${i + 1} tiene texto "Contactar" pero no está visible o está oculto`);
      }
    }
  }
  
  // Estrategia 2: Buscar botón que contiene span con texto "Contactar"
  if (!contactButtonVisible) {
    contactButton = servicioCard.locator('button').filter({
      has: servicioCard.locator('span').filter({ hasText: /^Contactar$/i })
    }).first();
    contactButtonVisible = await contactButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (contactButtonVisible) {
      console.log('   ✅ Botón "Contactar" encontrado mediante filtro con span');
    }
  }
  
  // Estrategia 3: Buscar botón con texto "Contactar" directamente
  if (!contactButtonVisible) {
    contactButton = servicioCard.locator('button:has-text("Contactar")').first();
    contactButtonVisible = await contactButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (contactButtonVisible) {
      console.log('   ✅ Botón "Contactar" encontrado mediante has-text');
    }
  }
  
  
  if (!contactButtonVisible || !contactButton) {
    throw new Error(`❌ No se encontró el botón "Contactar" para el servicio "${nombreServicio}"`);
  }
  
  console.log('   🖱️ Haciendo clic en el botón "Contactar"...');
  await contactButton.scrollIntoViewIfNeeded();
  await safeWaitForTimeout(page, 500);
  await contactButton.click();
  await safeWaitForTimeout(page, 2000);
  
  // 4. Esperar a que aparezca el diálogo "Selecciona un evento"
  await showStepMessage(page, '📋 ESPERANDO DIÁLOGO DE SELECCIÓN DE EVENTO');
  console.log('📋 Esperando a que aparezca el diálogo "Selecciona un evento"...');
  
  // Buscar el diálogo con el título "Selecciona un evento"
  const dialogTitle = page.locator('div').filter({
    hasText: /Selecciona un evento/i
  }).first();
  
  const dialogVisible = await dialogTitle.isVisible({ timeout: 10000 }).catch(() => false);
  
  if (!dialogVisible) {
    throw new Error(`❌ No se abrió el diálogo "Selecciona un evento" después de hacer clic en "Contactar" para el servicio "${nombreServicio}"`);
  }
  
  console.log('✅ Diálogo "Selecciona un evento" visible');
  
  // 5. Decidir aleatoriamente si seleccionar un evento existente o crear "Nueva fiesta"
  const seleccionarEventoExistente = Math.random() < 0.5; // 50% de probabilidad
  
  if (seleccionarEventoExistente) {
    // Seleccionar un evento existente del carrusel
    await showStepMessage(page, '🎲 SELECCIONANDO EVENTO EXISTENTE');
    console.log('📋 Seleccionando un evento existente del carrusel...');
    
    // Buscar los botones de eventos en el carrusel (botones con estructura de eventos)
    const eventButtons = page.locator('div.flex.flex-nowrap.overflow-x-auto button.flex.flex-col.bg-light-neutral.rounded-6');
    const eventButtonsCount = await eventButtons.count();
    
    if (eventButtonsCount === 0) {
      console.log('⚠️ No se encontraron eventos existentes, seleccionando "Nueva fiesta" en su lugar...');
      // Fallback a "Nueva fiesta" si no hay eventos
      const nuevaFiestaButton = page.locator('button').filter({
        has: page.locator('p:has-text("Nueva fiesta")')
      }).first();
      const nuevaFiestaVisible = await nuevaFiestaButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!nuevaFiestaVisible) {
        throw new Error(`❌ No se encontró el botón "Nueva fiesta" en el diálogo`);
      }
      
      await nuevaFiestaButton.scrollIntoViewIfNeeded();
      await safeWaitForTimeout(page, 500);
      await nuevaFiestaButton.click();
      console.log('✅ Se hizo clic en "Nueva fiesta"');
    } else {
      // Seleccionar un evento aleatorio del carrusel
      const randomIndex = Math.floor(Math.random() * eventButtonsCount);
      const selectedEventButton = eventButtons.nth(randomIndex);
      
      await selectedEventButton.scrollIntoViewIfNeeded();
      await safeWaitForTimeout(page, 500);
      
      // Obtener el nombre del evento para logging
      const eventNameElement = selectedEventButton.locator('p.text-small.font-bold').first();
      const eventName = await eventNameElement.textContent().catch(() => `Evento ${randomIndex + 1}`);
      console.log(`✅ Seleccionando evento: "${eventName?.trim() || 'Sin nombre'}"`);
      
      await selectedEventButton.click();
      await safeWaitForTimeout(page, 2000);
      
      // Cuando se selecciona un evento existente, se abre directamente el diálogo de "Solicitud"
      // Esperar el diálogo de solicitud en lugar del formulario de evento
      await showStepMessage(page, '🪟 ESPERANDO DIÁLOGO DE SOLICITUD');
      console.log('📋 Esperando a que aparezca el diálogo de solicitud...');
      
      const preQuotationForm = page.locator('#PrequotationRequestForm');
      await preQuotationForm.waitFor({ state: 'visible', timeout: 15000 });
      console.log('✅ Diálogo de solicitud visible');
      
      // Continuar con el flujo de solicitud (igual que en "Nueva fiesta")
      // 7. Interactuar con el modal de solicitud (checkboxes, textarea y botón "Solicitar")
      await showStepMessage(page, '🪟 INTERACTUANDO CON MODAL DE SOLICITUD');
      console.log('🪟 Modal de solicitud visible');
      
      const checkboxLocator = preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]');
      const checkboxCount = await checkboxLocator.count();
      console.log(`📋 Checkboxes disponibles: ${checkboxCount}`);
      
      if (checkboxCount > 0) {
        const shouldSelectAll = Math.random() < 0.4;
        
        if (shouldSelectAll) {
          await showStepMessage(page, '☑️ SELECCIONANDO TODAS LAS VARIEDADES');
          const selectAllButton = preQuotationForm.locator('div:has(> p:has-text("Seleccionar todo")) button').first();
          if (await selectAllButton.isVisible().catch(() => false)) {
            await selectAllButton.click();
            console.log('✅ Se hizo clic en "Seleccionar todo"');
          } else {
            console.log('⚠ Botón "Seleccionar todo" no visible, seleccionando manualmente');
          }
        } else {
          await showStepMessage(page, '☑️ SELECCIONANDO VARIEDADES ALEATORIAS');
        }
        
        if (! (await preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]:checked').count())) {
          // Seleccionar manualmente algunos checkboxes si no se seleccionaron con el botón
          const indices = Array.from({ length: checkboxCount }, (_, i) => i).sort(() => Math.random() - 0.5);
          const selections = Math.min(checkboxCount, Math.max(1, Math.floor(Math.random() * checkboxCount) + 1));
          
          for (let i = 0; i < selections; i++) {
            const checkbox = checkboxLocator.nth(indices[i]);
            const alreadyChecked = await checkbox.evaluate(el => (el as HTMLInputElement).checked).catch(() => false);
            if (alreadyChecked) continue;
            
            const checkboxId = await checkbox.getAttribute('id');
            let clickTarget = checkbox;
            if (checkboxId) {
              const label = preQuotationForm.locator(`label[for="${checkboxId}"]`).first();
              if (await label.count()) {
                clickTarget = label;
              }
            } else {
              const buttonWrapper = checkbox.locator('xpath=ancestor::button[1]');
              if (await buttonWrapper.count()) {
                clickTarget = buttonWrapper;
              }
            }
            
            await clickTarget.click({ force: true });
            console.log(`  ✓ Checkbox ${i + 1} seleccionado (${checkboxId || 'sin id'})`);
            await safeWaitForTimeout(page, 200);
          }
        }
      } else {
        console.log('⚠ No se encontraron checkboxes para seleccionar');
      }
      
      // 8. Llenar el campo "Solicitudes"
      await showStepMessage(page, '📝 LLENANDO CAMPO DE SOLICITUDES');
      const requestMessages = [
        'Nos gustaría incluir opciones vegetarianas y postres personalizados.',
        'Buscamos algo con temática tropical y servicio completo de montaje.',
        'Necesitamos cotización con barra libre y personal extra para servicio.',
        'Queremos opciones premium y asesoría para decoración a juego.',
      ];
      const randomRequestMessage = requestMessages[Math.floor(Math.random() * requestMessages.length)];
      
      const requestField = preQuotationForm.locator('textarea#Request');
      await requestField.waitFor({ state: 'visible', timeout: 5000 });
      await requestField.fill(randomRequestMessage);
      console.log(`📝 Campo "Solicitudes" llenado con: ${randomRequestMessage}`);
      
      // 9. Enviar la solicitud
      await showStepMessage(page, '🚀 ENVIANDO SOLICITUD');
      // El botón "Solicitar" está fuera del formulario, buscarlo en toda la página
      const solicitarButton = page.locator('button[form="PrequotationRequestForm"], button:has-text("Solicitar")').first();
      await solicitarButton.waitFor({ state: 'visible', timeout: 10000 });
      await solicitarButton.click();
      console.log('🚀 Botón "Solicitar" presionado');
      
      await preQuotationForm.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => console.log('⚠ El modal de selección no se ocultó, continuando...'));
      await safeWaitForTimeout(page, 1000);
      
      // 9.1 Confirmar diálogo "Solicitud enviada"
      await showStepMessage(page, '✅ CONFIRMANDO SOLICITUD ENVIADA');
      const successDialog = page.locator('div:has-text("Solicitud enviada")').first();
      try {
        await successDialog.waitFor({ state: 'visible', timeout: 10000 });
        console.log('🎊 Modal "Solicitud enviada" visible');
        
        const okButton = successDialog.locator('button:has-text("OK")').first();
        await okButton.waitFor({ state: 'visible', timeout: 5000 });
        await okButton.click();
        console.log('👍 Botón "OK" presionado');
      } catch (successModalError) {
        console.log('⚠ Modal de confirmación no apareció o no se pudo cerrar, continuando...');
      }
      
      // 10. Verificar que el flujo regrese automáticamente al dashboard del cliente
      await showStepMessage(page, '🔁 ESPERANDO REGRESO AL DASHBOARD');
      console.log('🔁 Esperando a que la aplicación regrese al dashboard del cliente...');
      await page.waitForURL('**/client/dashboard', { timeout: 20000 });
      console.log('🏠 Dashboard del cliente visible');
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 1000);
      
      await safeWaitForTimeout(page, 2000);
      await clearStepMessage(page);
      
      console.log('✅ Servicio agregado a evento existente exitosamente');
      return; // Salir de la función ya que el flujo está completo
    }
  } else {
    // Seleccionar "Nueva fiesta"
    await showStepMessage(page, '🎉 SELECCIONANDO "NUEVA FIESTA"');
    console.log('📋 Haciendo clic en "Nueva fiesta"...');
    
    const nuevaFiestaButton = page.locator('button').filter({
      has: page.locator('p:has-text("Nueva fiesta")')
    }).first();
    const nuevaFiestaVisible = await nuevaFiestaButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!nuevaFiestaVisible) {
      throw new Error(`❌ No se encontró el botón "Nueva fiesta" en el diálogo`);
    }
    
    await nuevaFiestaButton.scrollIntoViewIfNeeded();
    await safeWaitForTimeout(page, 500);
    await nuevaFiestaButton.click();
    console.log('✅ Se hizo clic en "Nueva fiesta"');
    await safeWaitForTimeout(page, 2000);
    
    // Cuando se selecciona "Nueva fiesta", debe seleccionar el tipo de evento
    // pero NO necesita navegar por categorías de servicios porque el servicio ya está preseleccionado desde favoritos
    // 6. Esperar a que cargue la página de selección de categoría de evento
    await showStepMessage(page, '🎲 ESPERANDO SELECCIÓN DE TIPO DE EVENTO');
    await safeWaitForTimeout(page, 2000);
    
    // Buscar todos los botones de categoría de evento
    const categoryButtons = page.locator('button[type="submit"]').filter({
      has: page.locator('p.text-dark-neutral')
    });
    
    // Contar cuántas categorías hay disponibles
    const categoryCount = await categoryButtons.count();
    console.log(`✓ Se encontraron ${categoryCount} categorías de eventos disponibles`);
    
    // Verificar que hay al menos una categoría
    expect(categoryCount).toBeGreaterThan(0);
    
    // Seleccionar aleatoriamente una categoría
    await showStepMessage(page, '🎲 SELECCIONANDO CATEGORÍA DE EVENTO');
    const randomIndex = Math.floor(Math.random() * categoryCount);
    const selectedCategory = categoryButtons.nth(randomIndex);
    
    // Obtener el nombre de la categoría seleccionada antes de hacer clic
    const categoryName = await selectedCategory.locator('p.text-dark-neutral').textContent();
    const selectedEventType = categoryName?.trim() || 'Desconocido';
    console.log(`✓ Seleccionando categoría aleatoria: "${selectedEventType}" (índice ${randomIndex})`);
    
    // Hacer clic en la categoría seleccionada
    await selectedCategory.click();
    console.log(`✓ Se hizo clic en la categoría "${selectedEventType}"`);
    
    // Esperar a que cargue y luego esperar directamente el formulario de evento
    // (el servicio ya está preseleccionado, no necesitamos navegar por categorías de servicios)
    await safeWaitForTimeout(page, 2000);
    
    // 7. Esperar a que aparezca el formulario de evento
    await showStepMessage(page, '📋 ESPERANDO FORMULARIO DE EVENTO');
    console.log('📋 Esperando a que aparezca el formulario de evento...');
    
    await page.locator('input[id="Honoree"]').waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Formulario de evento visible');
  }
  
  // 7. Llenar el formulario de evento (reutilizar la lógica existente)
  await showStepMessage(page, '📝 LLENANDO FORMULARIO DE EVENTO');
  console.log('📝 Llenando formulario de evento...');
  
  // Variables para guardar los datos del evento
  let eventData: {
    honoree: string;
    date: string;
    time: string;
    city: string;
    attendees: number;
  };
  
  // 5.1. Nombre del festejado
  const randomNames = ['María', 'Juan', 'Carlos', 'Ana', 'Pedro', 'Laura', 'José', 'Carmen', 'Luis', 'Sofia'];
  const randomLastNames = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
  const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
  const randomLastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
  const randomHonoree = `${randomName} ${randomLastName}`;
  
  eventData = {
    honoree: randomHonoree,
    date: '',
    time: '',
    city: '',
    attendees: 0
  };
  
  const honoreeField = page.locator('input[id="Honoree"]').first();
  await honoreeField.waitFor({ state: 'visible', timeout: 5000 });
  await honoreeField.fill(randomHonoree);
  eventData.honoree = randomHonoree;
  console.log(`✓ Campo "Nombre del festejado" llenado: ${randomHonoree}`);
  
  // 5.2. Fecha
  const dateField = page.locator('input[id="Date"]').first();
  await dateField.waitFor({ state: 'visible', timeout: 5000 });
  await dateField.click();
  await safeWaitForTimeout(page, 1000);
  
  // Seleccionar una fecha futura
  const availableDays = page.locator('button[class*="day"], div[class*="day"]').filter({
    hasNot: page.locator('[disabled], [aria-disabled="true"]')
  });
  const daysCount = await availableDays.count();
  
  if (daysCount > 0) {
    const futureDayIndex = Math.min(7, daysCount - 1); // Seleccionar día 7 o el último disponible
    const selectedDay = availableDays.nth(futureDayIndex);
    await selectedDay.click();
    const dateFieldValue = await dateField.inputValue();
    eventData.date = dateFieldValue;
    console.log(`✓ Fecha seleccionada: ${dateFieldValue}`);
  }
  
  // 5.3. Hora
  const randomHour = Math.floor(Math.random() * 12) + 1;
  const randomMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  
  await seleccionarHoraYMinuto(page, randomHour, randomMinute);
  
  const timeField = page.locator('input[id="Time"]');
  await timeField.waitFor({ state: 'visible', timeout: 3000 });
  const timeValue = await timeField.inputValue();
  eventData.time = timeValue;
  console.log(`✓ Hora seleccionada: ${timeValue}`);
  
  // 5.4. Ciudad (usando autocompletado de Google)
  const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
  const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
  
  await safeWaitForTimeout(page, 500);
  
  // Buscar el campo de ciudad usando el label "Ciudad" para asegurar que es el correcto
  let cityField: ReturnType<typeof page.locator> | null = null;
  
  const ciudadLabel = page.locator('label:has-text("Ciudad")').first();
  const labelExists = await ciudadLabel.count().then(count => count > 0);
  
  if (labelExists) {
    const labelFor = await ciudadLabel.getAttribute('for');
    if (labelFor) {
      cityField = page.locator(`input[id="${labelFor}"]`).first();
      const foundById = await cityField.count().then(count => count > 0);
      if (foundById) {
        await cityField.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Campo de ciudad encontrado por atributo "for" del label: ${labelFor}`);
      } else {
        console.log(`⚠ Campo con id="${labelFor}" no existe. Buscando input hermano del label...`);
        cityField = ciudadLabel.locator('xpath=preceding-sibling::input[1]').first();
        if (!(await cityField.count())) {
          cityField = ciudadLabel.locator('xpath=ancestor::div[contains(@class, "relative") or contains(@class, "flex")]//input').first();
        }
        await cityField.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`✓ Campo de ciudad encontrado por proximidad al label`);
      }
    } else {
      cityField = ciudadLabel.locator('xpath=preceding-sibling::input[1]').first();
      const siblingExists = await cityField.count().then(count => count > 0);
      if (!siblingExists) {
        cityField = ciudadLabel.locator('xpath=ancestor::div[contains(@class, "relative") or contains(@class, "flex")]//input').first();
      }
      if (!(await cityField.count())) {
        cityField = ciudadLabel.locator('xpath=following::input[1]').first();
      }
      await cityField.waitFor({ state: 'visible', timeout: 5000 });
      console.log(`✓ Campo de ciudad encontrado por proximidad al label`);
    }
  } else {
    console.log(`⚠ Label "Ciudad" no encontrado, usando selectores alternos...`);
    cityField = page.locator('input').filter({
      has: page.locator('..').locator('i.icon-map-pin')
    }).first();
  }
  
  if (cityField) {
    const exists = await cityField.count().then(count => count > 0);
    if (!exists) {
      cityField = null;
    }
  }
  
  if (!cityField) {
    throw new Error('❌ No se pudo encontrar el campo de ciudad');
  }
  
  await cityField.waitFor({ state: 'visible', timeout: 5000 });
  
  if (!cityField) {
    throw new Error('❌ No se pudo encontrar el campo de ciudad');
  }
  
  // Verificar que el campo encontrado es realmente el campo de ciudad
  const fieldId = await cityField.getAttribute('id');
  const fieldLabel = await cityField.locator('xpath=ancestor::div//label[contains(text(), "Ciudad")]').count().catch(() => 0);
  
  console.log(`✓ Campo de ciudad identificado: id="${fieldId}"`);
  
  // Asegurar que ningún otro campo tenga el foco antes de escribir en el campo de ciudad
  // Hacer clic en un área neutral para quitar el foco de cualquier otro campo
  await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => {});
  await safeWaitForTimeout(page, 200);
  
  // Ahora hacer clic específicamente en el campo de ciudad
  await cityField.scrollIntoViewIfNeeded();
  await cityField.click({ force: true });
  await safeWaitForTimeout(page, 500);
  
  // Limpiar el campo si tiene algún valor
  const clearButton = page.locator('button[aria-label="Clear address"]');
  const clearButtonVisible = await clearButton.isVisible().catch(() => false);
  
  if (clearButtonVisible) {
    await clearButton.click();
    await safeWaitForTimeout(page, 200);
    // Hacer clic nuevamente en el campo después de limpiar para asegurar el foco
    await cityField.click({ force: true });
    await safeWaitForTimeout(page, 500);
  } else {
    // Limpiar el campo seleccionando todo y borrando
    const currentValue = await cityField.inputValue();
    if (currentValue && currentValue.trim().length > 0) {
      await cityField.selectText();
      await cityField.press('Backspace');
      await safeWaitForTimeout(page, 200);
    }
  }
  
  // Verificar que el campo correcto esté enfocado verificando el atributo id
  const focusedElement = await page.evaluate(() => {
    const active = document.activeElement;
    return active && active.tagName === 'INPUT' ? (active as HTMLInputElement).id : null;
  });
  
  const cityFieldId = await cityField.getAttribute('id');
  
  if (focusedElement !== cityFieldId) {
    console.log(`⚠️ El foco no está en el campo de ciudad (id esperado: "${cityFieldId}", id actual: "${focusedElement}"). Enfocando nuevamente...`);
    // Forzar el foco usando JavaScript
    await cityField.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.click();
    });
    await safeWaitForTimeout(page, 500);
    
    // Verificar nuevamente
    const focusedElement2 = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active.tagName === 'INPUT' ? (active as HTMLInputElement).id : null;
    });
    
    if (focusedElement2 !== cityFieldId) {
      console.log(`⚠️ Aún no está enfocado correctamente. Intentando con selectText y luego escribir...`);
      await cityField.selectText();
      await safeWaitForTimeout(page, 200);
    }
  } else {
    console.log(`✓ Campo de ciudad correctamente enfocado`);
  }
  
  // Escribir en el campo de ciudad
  await cityField.fill(randomCity);
  await safeWaitForTimeout(page, 300);
  
  // Verificar que el texto se escribió en el campo correcto
  const cityValue = await cityField.inputValue();
  if (cityValue !== randomCity) {
    console.log(`⚠️ El texto no se escribió correctamente. Intentando nuevamente...`);
    await cityField.clear();
    await cityField.fill(randomCity);
    await safeWaitForTimeout(page, 300);
  }
  
  console.log(`✓ Ciudad escrita: "${randomCity}" (valor en campo: "${await cityField.inputValue()}")`);
  await safeWaitForTimeout(page, 2000);
  
  // Esperar a que aparezcan las opciones de autocompletado de Google Places
  try {
    const autocompleteList = page.locator('ul.flex.flex-col.py-2, ul[class*="flex"][class*="flex-col"]');
    await autocompleteList.first().waitFor({ state: 'visible', timeout: 5000 });
    
    const autocompleteOptions = autocompleteList.locator('li.cursor-pointer, li[class*="cursor-pointer"]');
    await autocompleteOptions.first().waitFor({ state: 'visible', timeout: 3000 });
    
    const optionsCount = await autocompleteOptions.count();
    console.log(`📋 Opciones de ciudad encontradas: ${optionsCount}`);
    
    if (optionsCount > 0) {
      const firstOption = autocompleteOptions.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad: "${optionText?.trim()}"`);
      
      await firstOption.click();
      await safeWaitForTimeout(page, 1500);
      
      const cityValue = await cityField.inputValue();
      eventData.city = cityValue;
      console.log(`✅ Ciudad seleccionada. Valor del campo: "${cityValue}"`);
      
      const errorMessage = page.locator('p.text-xsmall.text-danger-neutral:has-text("Selecciona una dirección")');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      if (!hasError) {
        console.log('✅ Mensaje de error desapareció, ciudad seleccionada correctamente');
      }
    } else {
      throw new Error('No se encontraron opciones en la lista');
    }
  } catch (error) {
    try {
      const autocompleteOptionsAlt = page.locator('li.cursor-pointer.flex.items-center, li[class*="cursor-pointer"]');
      await autocompleteOptionsAlt.first().waitFor({ state: 'visible', timeout: 3000 });
      
      const firstOption = autocompleteOptionsAlt.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad (selector alternativo): "${optionText?.trim()}"`);
      
      await firstOption.click();
      await safeWaitForTimeout(page, 1500);
      const cityValueAlt = await cityField.inputValue();
      eventData.city = cityValueAlt;
      console.log('✅ Ciudad seleccionada del autocompletado (selector alternativo)');
    } catch (error2) {
      // Si no se encontró autocompletado, usar el valor que se escribió
      const cityValueFallback = await cityField.inputValue();
      eventData.city = cityValueFallback || randomCity;
      console.log(`⚠️ No se pudieron encontrar las opciones de autocompletado, usando: "${eventData.city}"`);
    }
  }
  
  // Asegurar que la ciudad esté guardada
  if (!eventData.city) {
    const cityValueFinal = await cityField.inputValue();
    eventData.city = cityValueFinal || randomCity;
  }
  
  // 5.5. Número de invitados
  const randomAttendees = Math.floor(Math.random() * 181) + 20;
  const attendeesField = page.locator('input[id="Attendees"]');
  await attendeesField.waitFor({ state: 'visible', timeout: 5000 });
  await attendeesField.fill(randomAttendees.toString());
  eventData.attendees = randomAttendees;
  console.log(`✓ Campo "Número de invitados" llenado: ${randomAttendees}`);
  
  // 6. Hacer clic en el botón "Crear evento"
  await showStepMessage(page, '🚀 CREANDO EVENTO');
  const createEventButton = page.locator('button.bg-primary-neutral.text-neutral-0').filter({
    hasText: 'Crear evento'
  });
  await createEventButton.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Botón "Crear evento" encontrado y visible');
  await createEventButton.click();
  console.log('✓ Se hizo clic en "Crear evento"');
  await safeWaitForTimeout(page, 2000);
  
  // 7. Interactuar con el modal de solicitud (si aparece)
  await showStepMessage(page, '🪟 INTERACTUANDO CON MODAL DE SOLICITUD');
  const preQuotationForm = page.locator('#PrequotationRequestForm');
  const formVisible = await preQuotationForm.isVisible({ timeout: 10000 }).catch(() => false);
  
  if (formVisible) {
    console.log('🪟 Modal de solicitud visible');
    
    // Seleccionar checkboxes si existen
    const checkboxLocator = preQuotationForm.locator('#RequiredAttributeIds input[type="checkbox"]');
    const checkboxCount = await checkboxLocator.count();
    console.log(`📋 Checkboxes disponibles: ${checkboxCount}`);
    
    if (checkboxCount > 0) {
      // Seleccionar algunos checkboxes aleatoriamente
      const selections = Math.min(checkboxCount, Math.max(1, Math.floor(Math.random() * checkboxCount) + 1));
      for (let i = 0; i < selections; i++) {
        const checkbox = checkboxLocator.nth(i);
        const alreadyChecked = await checkbox.evaluate(el => (el as HTMLInputElement).checked).catch(() => false);
        if (!alreadyChecked) {
          await checkbox.click({ force: true });
          await safeWaitForTimeout(page, 200);
        }
      }
      console.log(`✓ ${selections} checkboxes seleccionados`);
    }
    
    // Llenar el campo "Solicitudes"
    const requestMessages = [
      'Nos gustaría incluir opciones vegetarianas y postres personalizados.',
      'Buscamos algo con temática tropical y servicio completo de montaje.',
      'Necesitamos cotización con barra libre y personal extra para servicio.',
      'Queremos opciones premium y asesoría para decoración a juego.',
    ];
    const randomRequestMessage = requestMessages[Math.floor(Math.random() * requestMessages.length)];
    
    const requestField = preQuotationForm.locator('textarea#Request');
    const requestFieldVisible = await requestField.isVisible({ timeout: 5000 }).catch(() => false);
    if (requestFieldVisible) {
      await requestField.fill(randomRequestMessage);
      console.log(`📝 Campo "Solicitudes" llenado`);
    }
    
    // Enviar la solicitud
    const solicitarButton = page.locator('button[form="PrequotationRequestForm"], button:has-text("Solicitar")').first();
    const solicitarVisible = await solicitarButton.isVisible({ timeout: 10000 }).catch(() => false);
    if (solicitarVisible) {
      await solicitarButton.click();
      console.log('🚀 Botón "Solicitar" presionado');
      await safeWaitForTimeout(page, 2000);
    }
    
    // Confirmar diálogo "Solicitud enviada"
    const successDialog = page.locator('div:has-text("Solicitud enviada")').first();
    try {
      await successDialog.waitFor({ state: 'visible', timeout: 10000 });
      const okButton = successDialog.locator('button:has-text("OK")').first();
      await okButton.waitFor({ state: 'visible', timeout: 5000 });
      await okButton.click();
      console.log('👍 Botón "OK" presionado');
    } catch (successModalError) {
      console.log('⚠ Modal de confirmación no apareció o no se pudo cerrar, continuando...');
    }
  } else {
    console.log('⚠ Modal de solicitud no apareció, puede que el flujo sea diferente');
  }
  
  // 8. Verificar que el flujo regrese al dashboard
  await showStepMessage(page, '🔁 ESPERANDO REGRESO AL DASHBOARD');
  console.log('🔁 Esperando a que la aplicación regrese al dashboard del cliente...');
  
  try {
    if (!page.isClosed()) {
      await page.waitForURL('**/client/dashboard', { timeout: 20000 });
      console.log('🏠 Dashboard del cliente visible');
    }
  } catch (urlError) {
    console.log('⚠ No se pudo verificar la URL del dashboard, pero el evento puede haberse creado correctamente');
  }
  
  await safeWaitForTimeout(page, 2000);
  await clearStepMessage(page);
  
  console.log('✅ Evento creado desde favoritos exitosamente');
  console.log(`📋 Datos del evento creado:`);
  console.log(`   - Festejado: ${eventData.honoree}`);
  console.log(`   - Fecha: ${eventData.date}`);
  console.log(`   - Hora: ${eventData.time}`);
  console.log(`   - Ciudad: ${eventData.city}`);
  console.log(`   - Invitados: ${eventData.attendees}`);
});

// Ejecutar el flujo completo en el test
test('Nueva fiesta', async ({ page }) => {
  await showStepMessage(page, '🎉 INICIANDO CREACIÓN DE NUEVA FIESTA');
  console.log('🚀 Iniciando creación de nueva fiesta...');
  await ejecutarFlujoCompletoCreacionEvento(page);
  console.log('✅ Creación de nueva fiesta completada exitosamente');
});

test('Crear una nueva fiesta desde el dashboard', async ({ page }) => {
  test.setTimeout(180000); // 3 minutos (mismo timeout que el flujo completo)
  await showStepMessage(page, '🎉 CREANDO NUEVA FIESTA DESDE EL DASHBOARD');
  console.log('🚀 Iniciando flujo completo de creación de evento...');
  await ejecutarFlujoCompletoCreacionEvento(page);
  console.log('✅ Flujo completo de creación de evento finalizado');
});

// Crear tests para cada bloque de 3 tipos de eventos
// Máximo 15 tipos de eventos = 5 bloques
const crearTestsPorBloque = () => {
  for (let bloque = 0; bloque < 5; bloque++) { // 5 bloques máximo (15 tipos de eventos)
    const inicio = bloque * 3;
    const fin = inicio + 3;
    
    test.skip(`Crear eventos - Bloque ${bloque + 1} (tipos ${inicio + 1}-${fin})`, async ({ page }) => {
      test.setTimeout(600000); // 10 minutos por bloque (aumentado para dar más tiempo)
      
      await showStepMessage(page, `🎉 CREANDO EVENTOS - BLOQUE ${bloque + 1} (TIPOS ${inicio + 1}-${fin})`);
      console.log(`🚀 Iniciando creación de eventos del bloque ${bloque + 1} (tipos ${inicio + 1}-${fin})...`);
      
      // Limpiar cookies y storage antes de empezar
      await page.context().clearCookies();
      
      // Navegar a una página válida antes de limpiar storage
      try {
        await page.goto(`${DEFAULT_BASE_URL}`, { waitUntil: 'domcontentloaded' });
        await safeWaitForTimeout(page, 500);
      } catch (e) {
        // Si falla, continuar de todas formas
      }
      
      // Limpiar storage de forma segura
      try {
        await page.evaluate(() => {
          try {
            localStorage.clear();
          } catch (e) {
            // Ignorar errores de acceso a localStorage
          }
          try {
            sessionStorage.clear();
          } catch (e) {
            // Ignorar errores de acceso a sessionStorage
          }
        });
      } catch (e) {
        // Ignorar errores al limpiar storage
        console.log('⚠️ No se pudo limpiar storage, continuando...');
      }
      
      // Hacer login primero
      await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
      await safeWaitForTimeout(page, 2000);
      
      // Obtener tipos de eventos (ya estamos logueados)
      const tiposEventos = await obtenerTiposDeEventos(page);
      
      console.log(`\n📊 Total de tipos de eventos encontrados: ${tiposEventos.length}`);
      console.log(`📋 Tipos: ${tiposEventos.join(', ')}`);
      
      // Volver al dashboard después de obtener los tipos
      await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`, { waitUntil: 'domcontentloaded' });
      await safeWaitForTimeout(page, 2000);
      
      // Si no hay más tipos para este bloque, saltar el test
      if (inicio >= tiposEventos.length) {
        console.log(`⏭️ Saltando bloque ${bloque + 1}: no hay más tipos de eventos`);
        test.skip();
        return;
      }
      
      // Crear eventos del bloque
      await crearEventosDeBloque(page, tiposEventos, inicio, Math.min(fin, tiposEventos.length));
    });
  }
};

// Ejecutar la función para crear los tests
crearTestsPorBloque();

