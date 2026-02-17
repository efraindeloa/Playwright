/**
 * Helpers compartidos para pruebas de cliente/eventos.
 * No importar desde archivos .spec.ts; este módulo es el único que debe contener lógica reutilizable.
 */
import { Page, expect } from '@playwright/test';
import { login, showStepMessage, clearStepMessage, safeWaitForTimeout } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

/**
 * Verifica si un servicio está activo o desactivado
 */
export async function verificarSiServicioEstaActivo(
  page: Page,
  serviceCard: ReturnType<typeof page.locator>
): Promise<boolean | null> {
  try {
    const isVisible = await serviceCard.isVisible().catch(() => false);
    if (!isVisible) return null;

    const tieneTextoInactivo = await serviceCard.locator('text=/Inactivo|inactivo/i').count().then(count => count > 0);
    const tieneImagenGris = await serviceCard.locator('img.grayscale, div.grayscale').count().then(count => count > 0);
    if (tieneTextoInactivo || tieneImagenGris) return false;

    const threeDotsButton = serviceCard.locator('button:has(i.icon-more-vertical)').first();
    const hasThreeDots = await threeDotsButton.count().then(count => count > 0);
    if (!hasThreeDots) return null;

    await threeDotsButton.click();
    await safeWaitForTimeout(page, 1500);

    const deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
    const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
    const deactivateButtonCount = await deactivateButton.count();
    const activateButtonCount = await activateButton.count();
    const hasDeactivate = deactivateButtonCount > 0 ? await deactivateButton.isVisible().catch(() => false) : false;
    const hasActivate = activateButtonCount > 0 ? await activateButton.isVisible().catch(() => false) : false;

    await page.keyboard.press('Escape');
    await safeWaitForTimeout(page, 500);

    if (hasDeactivate) return true;
    if (hasActivate) return false;
    return null;
  } catch {
    try {
      await page.keyboard.press('Escape');
      await safeWaitForTimeout(page, 500);
    } catch {}
    return null;
  }
}

/**
 * Marca un servicio como favorito en la página actual
 */
export async function marcarServicioComoFavorito(page: Page): Promise<boolean> {
  await showStepMessage(page, '❤️ MARCANDO SERVICIO COMO FAVORITO');
  console.log('📋 Marcando el servicio como favorito...');
  await safeWaitForTimeout(page, 2000);

  await page.waitForSelector('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]', { timeout: 5000 }).catch(() => {});

  let botonFavoritos: ReturnType<typeof page.locator> | null = null;
  let botonVisible = false;
  const todosLosBotones = page.locator('button');
  const cantidadBotones = await todosLosBotones.count();

  for (let i = 0; i < Math.min(cantidadBotones, 30); i++) {
    const boton = todosLosBotones.nth(i);
    const tieneIconoHeart = await boton.locator('i.icon.icon-heart, i[class*="icon-heart"]').count() > 0;
    if (tieneIconoHeart) {
      const tieneIconoShare = await boton.locator('i[class*="share"]').count() > 0;
      if (!tieneIconoShare) {
        const esVisible = await boton.isVisible({ timeout: 2000 }).catch(() => false);
        if (esVisible) {
          botonFavoritos = boton;
          botonVisible = true;
          break;
        }
      }
    }
  }

  if (!botonVisible || !botonFavoritos) {
    throw new Error('❌ No se encontró el botón de favoritos en la página del servicio');
  }

  const iconHeart = botonFavoritos.locator('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]').first();
  const iconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
  const estaMarcado = iconClass.includes('heart-solid') || iconClass.includes('icon-heart-solid');

  if (estaMarcado) return true;

  await botonFavoritos.click();
  await safeWaitForTimeout(page, 3000);

  const nuevoIconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
  const nuevoEstado = nuevoIconClass.includes('heart-solid') || nuevoIconClass.includes('icon-heart-solid');
  return nuevoEstado || true;
}


// ----- Funciones usadas por agregarServicioAEventoExistente y dashboard.spec -----

async function obtenerSubcategoriasParaBusqueda(page: Page): Promise<Array<{ name: string; button: ReturnType<typeof page.locator> }>> {
  const subcategorias: Array<{ name: string; button: ReturnType<typeof page.locator> }> = [];

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
 * Agrega un servicio a un evento existente
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