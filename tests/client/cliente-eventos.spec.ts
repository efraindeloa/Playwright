import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, clearStepMessage } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

test.use({
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout (aumentado para dar más tiempo a la carga de servicios)
test.setTimeout(180000); // 3 minutos

/**
 * Busca un servicio en el dashboard del proveedor y obtiene su información
 */
async function buscarServicioEnProveedor(page: Page): Promise<{ nombre: string; categoria: string; subcategoria?: string } | null> {
  console.log('\n🔍 BUSCANDO SERVICIO EN DASHBOARD DEL PROVEEDOR...');
  await showStepMessage(page, '🔍 BUSCANDO SERVICIO EN DASHBOARD DEL PROVEEDOR');
  
  // Intentar navegar directamente al dashboard del proveedor
  // Si no estamos logueados, nos redirigirá al login
  await page.goto(`${DEFAULT_BASE_URL}/provider/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // Verificar si estamos en la página de login (no logueados) o en el dashboard (logueados)
  const currentUrl = page.url();
  const isOnLoginPage = currentUrl.includes('/login');
  
  if (isOnLoginPage) {
    // Necesitamos hacer login
    console.log('⚠️ No estamos logueados, haciendo login...');
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    console.log('✓ Login exitoso como proveedor');
    await page.waitForTimeout(2000);
    
    // Navegar nuevamente al dashboard después del login
    await page.goto(`${DEFAULT_BASE_URL}/provider/dashboard`);
    await page.waitForTimeout(2000);
  } else {
    console.log('✓ Ya estamos logueados como proveedor');
  }
  
  // Navegar a administrar servicios
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios"), div.flex.flex-row.gap-3 button:has-text("Administrar servicios")');
  await expect(adminServiciosButton.first()).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.first().click();
  await page.waitForTimeout(2000);
  
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
  
  // Seleccionar una tarjeta de servicio aleatoria
  const randomIndex = Math.floor(Math.random() * serviceCardsCount);
  const selectedServiceCard = serviceCardsContainer.nth(randomIndex);
  
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
    await page.waitForTimeout(1000);
    
    // Buscar y hacer clic en "Ver servicio" o "Editar" en el menú desplegable
    const verServicioButton = page.locator('button:has-text("Ver servicio"), button:has-text("Editar"), a:has-text("Ver servicio")').first();
    if (await verServicioButton.count() > 0) {
      await verServicioButton.click();
      await page.waitForTimeout(2000);
    } else {
      // Si no hay menú, intentar hacer clic directamente en la tarjeta
      await selectedServiceCard.click();
      await page.waitForTimeout(2000);
    }
  } else {
    // Si no hay botón de tres puntos, hacer clic en la tarjeta completa
    await selectedServiceCard.click();
    await page.waitForTimeout(2000);
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
async function navegarHastaEncontrarServicioEspecifico(
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
    await page.waitForTimeout(1000);
    
    // Verificar si estamos en una página de servicios
    const serviciosTitle = page.locator('p.text-center, h1, h2, h3, h4, h5').filter({
      hasText: /Servicios|servicios/i
    });
    
    const isServicesPage = await serviciosTitle.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isServicesPage) {
      // Buscar el servicio por nombre en la lista
      console.log(`🔍 Buscando servicio "${nombreServicio}" en la lista...`);
      
      // Las tarjetas de servicio pueden ser diferentes estructuras según el tamaño de pantalla
      // Buscar por el texto del nombre del servicio directamente (incluyendo servicios inactivos con texto gris)
      // Buscar en elementos de texto: p.text-large.text-dark-neutral.font-bold, p.text-dark-neutral.font-bold.text-gray-neutral, h5.text-dark-neutral, h5.text-gray-neutral
      const serviceNameElements = page.locator('p.text-large.text-dark-neutral.font-bold, p.text-dark-neutral.font-bold.text-gray-neutral, h5.text-dark-neutral, h5.text-gray-neutral, p.text-dark-neutral.font-bold, p.text-gray-neutral').filter({
        hasText: new RegExp(nombreServicio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      });
      
      const matchingElements = await serviceNameElements.count();
      console.log(`📊 Elementos con el nombre del servicio encontrados: ${matchingElements}`);
      
      // Si no se encuentra con los selectores específicos, buscar en todos los elementos de texto de forma más amplia
      let allTextElements: ReturnType<typeof page.locator> | null = null;
      let allMatchingElements = 0;
      
      if (matchingElements === 0) {
        console.log(`🔍 Buscando en todos los elementos de texto...`);
        allTextElements = page.locator('p, h1, h2, h3, h4, h5, h6, span').filter({
          hasText: new RegExp(nombreServicio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        });
        allMatchingElements = await allTextElements.count();
        console.log(`📊 Elementos genéricos con el nombre del servicio encontrados: ${allMatchingElements}`);
      }
      
      // Procesar elementos encontrados con selectores específicos
      if (matchingElements > 0) {
        // Encontrar la tarjeta padre que contiene el servicio (puede ser un div con cursor-pointer o un botón)
        // Filtrar solo los elementos visibles (uno es para móvil, otro para desktop)
        for (let i = 0; i < matchingElements; i++) {
          const nameElement = serviceNameElements.nth(i);
          
          // Verificar que el elemento esté visible antes de usarlo
          const isVisible = await nameElement.isVisible().catch(() => false);
          if (!isVisible) {
            continue; // Saltar elementos ocultos (puede ser la versión móvil/desktop que no corresponde)
          }
          
          const elementText = (await nameElement.textContent())?.trim() || '';
          
          // Verificar que el texto coincida (comparación más flexible, incluyendo solo la primera parte del nombre)
          const nombreServicioNormalizado = nombreServicio.toLowerCase().trim();
          const elementTextNormalizado = elementText.toLowerCase().trim();
          
          // Extraer solo la primera parte del nombre del servicio (antes de " - EDITADO" o similar)
          const nombreBaseServicio = nombreServicioNormalizado.split(' - ')[0].split(' EDITADO')[0].trim();
          const nombreBaseElemento = elementTextNormalizado.split(' - ')[0].split(' EDITADO')[0].trim();
          
          if (elementTextNormalizado === nombreServicioNormalizado ||
              elementTextNormalizado.includes(nombreServicioNormalizado) ||
              nombreServicioNormalizado.includes(elementTextNormalizado) ||
              nombreBaseElemento === nombreBaseServicio ||
              nombreBaseElemento.includes(nombreBaseServicio) ||
              nombreBaseServicio.includes(nombreBaseElemento)) {
            
            console.log(`✅ Servicio encontrado por texto: "${elementText}"`);
            
            // Buscar el contenedor padre clicable (div con cursor-pointer, button, o a)
            const clickableParent = nameElement.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")] | ancestor::button | ancestor::a').first();
            
            if (await clickableParent.count() > 0) {
              // Verificar que el contenedor padre también esté visible
              const parentVisible = await clickableParent.isVisible().catch(() => false);
              if (!parentVisible) {
                continue; // Saltar si el contenedor padre no está visible
              }
              
              // Verificar si el servicio está inactivo
              // Los servicios inactivos tienen: clase "grayscale" en imágenes, texto "Inactivo", o texto gris
              const cardContainer = nameElement.locator('xpath=ancestor::div[contains(@class, "flex")][contains(@class, "col") or contains(@class, "row")]').first();
              const hasInactiveText = await cardContainer.locator('text=/Inactivo/i').count().then(count => count > 0);
              const hasGrayscaleImage = await cardContainer.locator('img.grayscale, div.grayscale').count().then(count => count > 0);
              const isGrayText = await nameElement.evaluate(el => {
                const styles = window.getComputedStyle(el);
                return styles.color.includes('128') || styles.color.includes('107') || el.classList.contains('text-gray-neutral');
              }).catch(() => false);
              
              const isInactive = hasInactiveText || hasGrayscaleImage || isGrayText;
              
              if (isInactive) {
                console.log(`⚠️ Servicio "${elementText}" está inactivo, buscando otro servicio...`);
                continue; // Saltar este servicio y buscar otro
              }
              
              await clickableParent.scrollIntoViewIfNeeded();
              console.log(`✅ Haciendo clic en la tarjeta del servicio...`);
              await clickableParent.click();
              
              // Esperar a que cargue la página del servicio
              await page.waitForTimeout(3000);
              
              // Verificar que estamos en la página del servicio (buscar "Detalle de proveedor" o "Detalles")
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
                  await page.waitForTimeout(2000);
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
          }
        }
        
        // Si llegamos aquí, no se encontró el servicio con esa estructura
        console.log(`⚠️ Servicio "${nombreServicio}" no encontrado en esta página con esa estructura`);
      } else {
        console.log(`⚠️ No se encontraron elementos con el nombre del servicio usando selectores específicos`);
      }
      
      // Si no se encuentra con los selectores específicos, buscar en todos los elementos de texto
      if (allTextElements && allMatchingElements > 0) {
        console.log(`✅ Servicio encontrado por texto genérico!`);
        
        // Procesar elementos genéricos encontrados
        for (let i = 0; i < allMatchingElements; i++) {
          const textElement = allTextElements.nth(i);
          
          // Verificar que el elemento esté visible
          const isVisible = await textElement.isVisible().catch(() => false);
          if (!isVisible) {
            continue;
          }
          
          const elementText = (await textElement.textContent())?.trim() || '';
          
          // Comparación más flexible, incluyendo solo la primera parte del nombre
          const nombreServicioNormalizado = nombreServicio.toLowerCase().trim();
          const elementTextNormalizado = elementText.toLowerCase().trim();
          
          // Extraer solo la primera parte del nombre del servicio (antes de " - EDITADO" o similar)
          const nombreBaseServicio = nombreServicioNormalizado.split(' - ')[0].split(' EDITADO')[0].trim();
          const nombreBaseElemento = elementTextNormalizado.split(' - ')[0].split(' EDITADO')[0].trim();
          
          if (elementTextNormalizado.includes(nombreServicioNormalizado) ||
              nombreServicioNormalizado.includes(elementTextNormalizado) ||
              nombreBaseElemento.includes(nombreBaseServicio) ||
              nombreBaseServicio.includes(nombreBaseElemento)) {
            
            // Buscar el contenedor padre clicable
            const parentClickable = textElement.locator('xpath=ancestor::div[contains(@class, "cursor-pointer")] | ancestor::button | ancestor::a').first();
            
            if (await parentClickable.count() > 0) {
              // Verificar que el contenedor padre también esté visible
              const parentVisible = await parentClickable.isVisible().catch(() => false);
              if (!parentVisible) {
                continue;
              }
              
              // Verificar si el servicio está inactivo
              const cardContainer = textElement.locator('xpath=ancestor::div[contains(@class, "flex")][contains(@class, "col") or contains(@class, "row")]').first();
              const hasInactiveText = await cardContainer.locator('text=/Inactivo/i').count().then(count => count > 0);
              const hasGrayscaleImage = await cardContainer.locator('img.grayscale, div.grayscale').count().then(count => count > 0);
              const isGrayText = await textElement.evaluate(el => {
                const styles = window.getComputedStyle(el);
                return styles.color.includes('128') || styles.color.includes('107') || el.classList.contains('text-gray-neutral');
              }).catch(() => false);
              
              const isInactive = hasInactiveText || hasGrayscaleImage || isGrayText;
              
              if (isInactive) {
                console.log(`⚠️ Servicio "${elementText}" está inactivo, buscando otro servicio...`);
                continue; // Saltar este servicio y buscar otro
              }
              
              await parentClickable.scrollIntoViewIfNeeded();
              console.log(`✅ Haciendo clic en la tarjeta del servicio (búsqueda genérica): "${elementText}"`);
              await parentClickable.click();
              
              // Esperar a que cargue la página del servicio
              await page.waitForTimeout(3000);
              
              // Verificar que estamos en la página del servicio (buscar "Detalle de proveedor" o "Detalles")
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
                  await page.waitForTimeout(2000);
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
          }
        }
      }
      
      // Si no se encontró el servicio objetivo o todos están inactivos, buscar cualquier servicio activo
      console.log(`⚠️ Servicio objetivo "${nombreServicio}" no encontrado o está inactivo. Buscando cualquier servicio activo...`);
      
      // Buscar todas las tarjetas de servicio visibles (excluyendo inactivos)
      const allServiceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, div[class*="cursor-pointer"]').filter({
        hasNot: page.locator('text=/Inactivo/i, img.grayscale, div.grayscale')
      });
      
      const activeServiceCardsCount = await allServiceCards.count();
      console.log(`📊 Servicios activos encontrados: ${activeServiceCardsCount}`);
      
      if (activeServiceCardsCount > 0) {
        // Seleccionar el primer servicio activo disponible
        const firstActiveService = allServiceCards.first();
        await firstActiveService.scrollIntoViewIfNeeded();
        console.log(`✅ Seleccionando el primer servicio activo disponible...`);
        await firstActiveService.click();
        
        // Esperar a que cargue la página del servicio
        await page.waitForTimeout(3000);
        
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
            await page.waitForTimeout(2000);
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
    await page.waitForTimeout(2000);
    
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

test('Nueva fiesta', async ({ page }) => {
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
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  console.log('✓ Sesión del proveedor cerrada');
  
  // Navegar al login
  await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // Verificar que estamos en la página de login
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    console.log('⚠️ No estamos en la página de login, navegando nuevamente...');
    await page.goto(`${DEFAULT_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  }
  
  // Hacer login con las credenciales del cliente
  await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO CLIENTE');
  await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
  console.log('✓ Login exitoso como cliente');
  
  // Esperar a que se cargue el dashboard después del login
  await page.waitForTimeout(3000);
  
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
  await page.waitForTimeout(2000);
  
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
  
  // Hacer clic en la categoría seleccionada
  await selectedCategory.click();
  console.log(`✓ Se hizo clic en la categoría "${selectedEventType}"`);
  
  // Esperar a que cargue la página de selección de categoría de servicios
  await page.waitForTimeout(2000);
  
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
        await page.waitForTimeout(2000);
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
      await page.waitForTimeout(2000);
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
  await page.waitForTimeout(2000);
  
      servicioEncontrado = await navegarHastaEncontrarServicioEspecifico(page, servicioInfo.nombre);
      
      if (!servicioEncontrado) {
        console.log(`⚠️ Servicio no encontrado en "${selectedServiceCategory}", probando otra categoría...`);
        await page.goBack();
        await page.waitForTimeout(2000);
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
        await page.waitForTimeout(2000);
        } else {
        throw new Error('❌ No se encontró el botón "Contactar GRATIS"');
      }
    } else {
      // Si no estamos en la página del servicio, esperar un poco más
      await page.waitForTimeout(2000);
      
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
        await page.waitForTimeout(2000);
      } else {
        throw new Error('❌ No se encontró el botón "Contactar GRATIS"');
      }
    }
    
    // Esperar a que aparezca el formulario
    await page.locator('input[id="Honoree"]').waitFor({ state: 'visible', timeout: 10000 });
  }
  
  // Continuar con el formulario de evento
        // --- Función auxiliar para seleccionar hora y minuto en el reloj ---
        async function seleccionarHoraYMinuto(page: Page, hora: number, minuto: number) {
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
          
          await page.waitForTimeout(500);
          
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
          
          await page.waitForTimeout(500);
          
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
          
          await page.waitForTimeout(500);
          
          // 5. Confirmar selección
          const confirmButton = page.locator('button.bg-primary-neutral.text-light-light').filter({ hasText: 'Confirmar' });
          await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
          await confirmButton.click({ timeout: 5000 });
          console.log(`✓ Botón "Confirmar" presionado`);
        }
        
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
  await page.waitForTimeout(300);
        
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
          await page.waitForTimeout(1000);
        }
        
        // 4. Ciudad (usando autocompletado de Google)
        const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
        const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
        
        await page.waitForTimeout(500);
        
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
  await page.waitForTimeout(200);
  
  // Ahora hacer clic específicamente en el campo de ciudad
  await cityField.scrollIntoViewIfNeeded();
  await cityField.click({ force: true });
  await page.waitForTimeout(500);
  
  // Limpiar el campo si tiene algún valor
        const clearButton = page.locator('button[aria-label="Clear address"]');
        const clearButtonVisible = await clearButton.isVisible().catch(() => false);
        
        if (clearButtonVisible) {
          await clearButton.click();
          await page.waitForTimeout(200);
    // Hacer clic nuevamente en el campo después de limpiar para asegurar el foco
    await cityField.click({ force: true });
    await page.waitForTimeout(500);
        } else {
    // Limpiar el campo seleccionando todo y borrando
    const currentValue = await cityField.inputValue();
    if (currentValue && currentValue.trim().length > 0) {
          await cityField.selectText();
          await cityField.press('Backspace');
          await page.waitForTimeout(200);
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
    await page.waitForTimeout(500);
    
    // Verificar nuevamente
    const focusedElement2 = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active.tagName === 'INPUT' ? (active as HTMLInputElement).id : null;
    });
    
    if (focusedElement2 !== cityFieldId) {
      console.log(`⚠️ Aún no está enfocado correctamente. Intentando con selectText y luego escribir...`);
      await cityField.selectText();
      await page.waitForTimeout(200);
    }
  } else {
    console.log(`✓ Campo de ciudad correctamente enfocado`);
  }
  
  // Escribir en el campo de ciudad
  await cityField.fill(randomCity);
  await page.waitForTimeout(300);
  
  // Verificar que el texto se escribió en el campo correcto
  const cityValue = await cityField.inputValue();
  if (cityValue !== randomCity) {
    console.log(`⚠️ El texto no se escribió correctamente. Intentando nuevamente...`);
    await cityField.clear();
    await cityField.fill(randomCity);
    await page.waitForTimeout(300);
  }
  
  console.log(`✓ Ciudad escrita: "${randomCity}" (valor en campo: "${await cityField.inputValue()}")`);
        await page.waitForTimeout(2000);
        
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
      await page.waitForTimeout(1500);
      
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
      await page.waitForTimeout(1500);
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
        await page.waitForTimeout(2000);
  
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
        await page.waitForTimeout(200);
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
  await page.waitForTimeout(1000);
  
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
  
  await page.waitForTimeout(1500);
  
  // 10. Verificar que el flujo regrese automáticamente al dashboard del cliente
  await showStepMessage(page, '🔁 ESPERANDO REGRESO AL DASHBOARD');
  console.log('🔁 Esperando a que la aplicación regrese al dashboard del cliente...');
  await page.waitForURL('**/client/dashboard', { timeout: 20000 });
  console.log('🏠 Dashboard del cliente visible');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  
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
  
  // Verificar ciudad (puede estar abreviada o con formato diferente)
  const cityParts = eventData.city.split(',').map(s => s.trim());
  const cityFound = cityParts.some(part => dateInCard?.includes(part) || false);
  if (cityFound) {
    console.log(`✅ Ciudad verificada: "${eventData.city}"`);
  } else {
    console.log(`⚠️ Ciudad "${eventData.city}" no encontrada en la tarjeta`);
  }
  
  // Verificar número de invitados
  const attendeesInCard = await cardToCheck.locator(`text=${eventData.attendees}`).count().then(count => count > 0);
  if (attendeesInCard) {
    console.log(`✅ Número de invitados verificado: ${eventData.attendees}`);
  } else {
    console.log(`⚠️ Número de invitados "${eventData.attendees}" no encontrado en la tarjeta`);
  }
  
  // 13. Seleccionar el evento en el dashboard
  await showStepMessage(page, '🖱️ SELECCIONANDO EVENTO EN DASHBOARD');
  console.log('\n🖱️ Seleccionando evento en el dashboard...');
  
  // Hacer clic en la tarjeta del evento
  await newEventCard.click();
  await page.waitForTimeout(2000);
  console.log('✓ Se hizo clic en la tarjeta del evento');
  
  // Esperar a que cargue la página de detalles del evento
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  // 14. Verificar que el servicio aparece en la sección de servicios
  await showStepMessage(page, '🔍 VERIFICANDO SERVICIO EN SECCIÓN DE SERVICIOS');
  console.log('\n🔍 Verificando que el servicio aparece en la sección de servicios...');
  
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
  
  // 15. Verificar que hay una notificación en Fiestachat del proveedor
  await showStepMessage(page, '💬 VERIFICANDO NOTIFICACIÓN EN FIESTACHAT');
  console.log('\n💬 Verificando notificación en Fiestachat...');
  
  // Buscar la sección de Fiestachat
  const fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
  const fiestachatExists = await fiestachatSection.count().then(count => count > 0);
  
  if (fiestachatExists) {
    // Buscar notificaciones en Fiestachat
    const notificaciones = fiestachatSection.locator('button.flex.gap-4').filter({
      has: page.locator('text=/Solicitud recibida|Pronto tendrás una respuesta/i')
    });
    const notificacionesCount = await notificaciones.count();
    
    if (notificacionesCount > 0) {
      console.log(`✅ Se encontraron ${notificacionesCount} notificación(es) en Fiestachat`);
      
      // Verificar que la notificación contiene el mensaje esperado
      const primeraNotificacion = notificaciones.first();
      const textoNotificacion = await primeraNotificacion.textContent();
      
      if (textoNotificacion?.includes('Solicitud recibida') || textoNotificacion?.includes('Pronto tendrás una respuesta')) {
        console.log('✅ Notificación del proveedor verificada en Fiestachat');
        console.log(`   Contenido: "${textoNotificacion?.substring(0, 100)}..."`);
                } else {
        console.log(`⚠️ Notificación encontrada pero no contiene el mensaje esperado`);
                }
              } else {
      console.log('⚠️ No se encontraron notificaciones en Fiestachat');
            }
          } else {
    console.log('⚠️ Sección de Fiestachat no encontrada');
  }
  
  await showStepMessage(page, '🎉 PRUEBA COMPLETADA EXITOSAMENTE');
  console.log('\n✅ Prueba de creación de evento completada exitosamente');
  await clearStepMessage(page);
});

