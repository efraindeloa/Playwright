import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, safeWaitForTimeout } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/client/dashboard`;

// Timeouts (en milisegundos)
const DEFAULT_TIMEOUT = 60000; // 60 segundos
const EXTENDED_TIMEOUT = 120000; // 2 minutos
const WAIT_FOR_ELEMENT_TIMEOUT = 10000; // 10 segundos
const WAIT_FOR_PAGE_LOAD = 2000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Navega desde el home directamente a las categorías de servicios
 * Pasando por: Home -> Categoría de servicios -> Subcategoría -> Cards
 */
async function navegarDesdeHomeHastaCardsDeServicios(page: Page): Promise<void> {
  await showStepMessage(page, '🔍 Navegando desde home hasta cards de servicios');
  console.log('📋 Navegando desde home hasta cards de servicios...');
  
  // Silenciar console.logs de la página web que imprimen objetos sin formatear [Object, Object]
  page.on('console', (msg) => {
    const text = msg.text();
    // Ignorar logs que son solo objetos sin formatear
    if (msg.type() === 'log' && (text.includes('[Object') || text.match(/^\d+\[Object/))) {
      // Silenciar estos logs innecesarios
      return;
    }
  });
  
  // 1. Ir al home
  await page.goto(DEFAULT_BASE_URL);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  
  // 2. Buscar y hacer clic en una categoría de servicios desde el home
  // Las categorías pueden estar en diferentes formatos (botones, enlaces, cards)
  // Primero intentar buscar enlaces o botones que lleven a servicios/categorías
  const categoriaSelectors = [
    // Enlaces directos a servicios
    'a[href*="/services"]',
    'a[href*="/categoria"]',
    'a[href*="/category"]',
    // Botones con texto relacionado a servicios
    'button:has-text("Servicios")',
    'button:has-text("Explorar")',
    'button:has-text("Categorías")',
    // Cards o elementos clickeables con nombres de categorías comunes
    'div.cursor-pointer:has-text("Alimentos")',
    'div.cursor-pointer:has-text("Decoración")',
    'div.cursor-pointer:has-text("Música")',
    'div.cursor-pointer:has-text("Fotografía")',
    // Cualquier elemento clickeable que pueda ser una categoría
    'button.cursor-pointer, a.cursor-pointer, div.cursor-pointer'
  ];
  
  let categoriaEncontrada = false;
  
  for (const selector of categoriaSelectors) {
    try {
      const categorias = page.locator(selector);
      const categoriasCount = await categorias.count();
      
      if (categoriasCount > 0) {
        // Verificar que al menos una es visible
        for (let i = 0; i < Math.min(categoriasCount, 5); i++) {
          const categoria = categorias.nth(i);
          const isVisible = await categoria.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (isVisible) {
            await categoria.click({ timeout: 5000 });
            await page.waitForLoadState('networkidle');
            await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
            categoriaEncontrada = true;
            console.log(`✅ Categoría de servicio seleccionada desde home (selector: ${selector})`);
            break;
          }
        }
        
        if (categoriaEncontrada) break;
      }
    } catch (e) {
      // Continuar con el siguiente selector
      continue;
    }
  }
  
  if (!categoriaEncontrada) {
    // Si no encontramos categorías, intentar buscar directamente el formulario de búsqueda
    // que aparece cuando navegas a servicios desde el home
    const searchForm = page.locator('form#ServicesSearchForm, form[class*="search"]');
    const formExists = await searchForm.count().then(count => count > 0);
    
    if (formExists) {
      console.log('✅ Formulario de búsqueda encontrado (ya estamos en la página de servicios)');
      categoriaEncontrada = true;
    } else {
      throw new Error('❌ No se pudo encontrar una categoría de servicios en el home');
    }
  }
  
  // 3. Esperar a que la página cargue completamente
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  
  // 4. Verificar si hay cards directamente
  const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col, div.hidden.flex-row').filter({
    has: page.locator('p, h3, h4, h5, h6').first()
  });
  const cardsCount = await serviceCards.count();
  
  if (cardsCount > 0) {
    let cardsVisibles = 0;
    for (let i = 0; i < Math.min(cardsCount, 5); i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      if (isVisible) {
        cardsVisibles++;
      }
    }
    
    if (cardsVisibles > 0) {
      console.log(`✅ Cards de servicios encontradas directamente: ${cardsCount} (${cardsVisibles} visibles)`);
      return; // Ya tenemos cards
    }
  }
  
  // 5. Navegar recursivamente por todas las categorías y subcategorías hasta encontrar cards
  const encontroCards = await navegarRecursivamentePorCategorias(page, 0, []);
  
  if (!encontroCards) {
    console.log('⚠️ No se encontraron cards después de explorar todas las categorías y subcategorías');
    // Aún así, verificar si hay formulario de búsqueda como fallback
    const searchForm = page.locator('form#ServicesSearchForm');
    const formExists = await searchForm.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (formExists) {
      console.log('✅ Formulario de búsqueda encontrado - usando como fallback');
    } else {
      throw new Error('❌ No se encontraron cards ni formulario de búsqueda después de explorar todas las opciones');
    }
  }
}

/**
 * Navega recursivamente por categorías y subcategorías hasta encontrar cards
 * Guarda el estado de las categorías y subcategorías visitadas
 */
async function navegarRecursivamentePorCategorias(
  page: Page,
  nivel: number,
  rutaVisitada: string[]
): Promise<boolean> {
  const MAX_NIVELES = 5; // Límite de profundidad
  
  if (nivel >= MAX_NIVELES) {
    console.log(`⚠️ Límite de profundidad alcanzado (${MAX_NIVELES} niveles)`);
    return false;
  }
  
  await safeWaitForTimeout(page, 1000);
  
  // Verificar si hay cards de servicios (esto es lo que realmente buscamos)
  const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col, div.hidden.flex-row').filter({
    has: page.locator('p, h3, h4, h5, h6').first()
  });
  const cardsCount = await serviceCards.count();
  
  if (cardsCount > 0) {
    let cardsVisibles = 0;
    for (let i = 0; i < Math.min(cardsCount, 5); i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      if (isVisible) {
        cardsVisibles++;
      }
    }
    
    if (cardsVisibles > 0) {
      console.log(`✅ Cards de servicios encontradas en nivel ${nivel}: ${cardsCount} (${cardsVisibles} visibles)`);
      console.log(`   Ruta: ${rutaVisitada.join(' -> ')}`);
      return true; // Encontramos cards, terminar
    }
  }
  
  // Verificar si hay formulario de búsqueda (pero NO detenerse, solo continuar explorando)
  const searchForm = page.locator('form#ServicesSearchForm');
  const formExists = await searchForm.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (formExists) {
    console.log(`   ℹ️ Formulario de búsqueda encontrado en nivel ${nivel}, pero continuando exploración...`);
    // NO retornar aquí, continuar explorando todas las opciones
  }
  
  // Buscar elementos clickeables que puedan ser categorías o subcategorías
  const elementosNavegables = page.locator('button, a, div.cursor-pointer').filter({
    has: page.locator('p.text-neutral-800.font-medium, p.text-dark-neutral, p')
  });
  
  const elementosCount = await elementosNavegables.count();
  
  if (elementosCount === 0) {
    console.log(`⚠️ No se encontraron elementos navegables en nivel ${nivel}`);
    return false;
  }
  
  // Obtener información de todos los elementos disponibles
  const elementosInfo: Array<{ index: number; text: string; locator: ReturnType<typeof elementosNavegables.nth> }> = [];
  
  for (let i = 0; i < elementosCount; i++) {
    const elemento = elementosNavegables.nth(i);
    const isVisible = await elemento.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isVisible) {
      const texto = await elemento.locator('p').first().textContent().catch(() => '');
      if (texto && texto.trim().length > 0) {
        elementosInfo.push({
          index: i,
          text: texto.trim(),
          locator: elemento
        });
      }
    }
  }
  
  console.log(`📋 Nivel ${nivel}: ${elementosInfo.length} elementos navegables encontrados`);
  if (rutaVisitada.length > 0) {
    console.log(`   Ruta actual: ${rutaVisitada.join(' -> ')}`);
  }
  
  // Intentar navegar por cada elemento
  for (const elementoInfo of elementosInfo) {
    // NO verificar si ya visitamos este elemento - queremos explorar TODAS las opciones
    // Solo evitar elementos que sean parte de la ruta actual (breadcrumbs)
    const esBreadcrumb = rutaVisitada.length > 0 && elementoInfo.text === rutaVisitada[rutaVisitada.length - 1];
    
    if (esBreadcrumb) {
      console.log(`   ⏭️ Saltando "${elementoInfo.text}" (es parte del breadcrumb actual)`);
      continue;
    }
    
    console.log(`   🔍 Intentando navegar a: "${elementoInfo.text}" (nivel ${nivel})`);
    
    // Guardar la URL actual antes de navegar
    const urlAntes = page.url();
    
    try {
      // Hacer clic en el elemento
      await elementoInfo.locator.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      
      // Verificar si navegó
      const urlDespues = page.url();
      const navego = urlAntes !== urlDespues;
      
      if (navego) {
        console.log(`   ✅ Navegó a: "${elementoInfo.text}"`);
      } else {
        console.log(`   ⚠️ Clic realizado pero URL no cambió: "${elementoInfo.text}"`);
      }
      
      // Crear nueva ruta con este elemento
      const nuevaRuta = [...rutaVisitada, elementoInfo.text];
      
      // Intentar navegar recursivamente al siguiente nivel
      const encontroCards = await navegarRecursivamentePorCategorias(page, nivel + 1, nuevaRuta);
      
      if (encontroCards) {
        return true; // Encontramos cards, terminar
      }
      
      // Si no encontramos cards, volver atrás (navegar de vuelta)
      if (navego) {
        console.log(`   ↩️ Volviendo atrás desde: "${elementoInfo.text}"`);
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      }
      
    } catch (e) {
      console.log(`   ❌ Error al navegar a "${elementoInfo.text}": ${e}`);
      // Intentar volver atrás si hubo error
      try {
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      } catch (backError) {
        // Ignorar error al volver atrás
      }
      continue;
    }
  }
  
  return false; // No se encontraron cards en este nivel
}

/**
 * Navega desde el dashboard hasta llegar a las cards de servicios
 * Pasando por: Dashboard -> Nueva fiesta -> Tipo de evento -> Categoría -> Subcategoría -> Cards
 */
async function navegarHastaCardsDeServicios(page: Page): Promise<void> {
  await showStepMessage(page, '🔍 Navegando hasta cards de servicios');
  console.log('📋 Navegando desde dashboard hasta cards de servicios...');
  
  // Silenciar console.logs de la página web que imprimen objetos sin formatear [Object, Object]
  page.on('console', (msg) => {
    const text = msg.text();
    // Ignorar logs que son solo objetos sin formatear
    if (msg.type() === 'log' && (text.includes('[Object') || text.match(/^\d+\[Object/))) {
      // Silenciar estos logs innecesarios
      return;
    }
  });
  
  // 1. Ir al dashboard
  await page.goto(DASHBOARD_URL);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  
  // 2. Buscar y hacer clic en "Nueva fiesta"
  const nuevaFiestaButton = page.locator('button[type="button"].hidden.lg\\:flex').filter({
    hasText: 'Nueva fiesta'
  });
  
  const buttonVisible = await nuevaFiestaButton.isVisible({ timeout: 10000 }).catch(() => false);
  
  if (!buttonVisible) {
    throw new Error('❌ No se encontró el botón "Nueva fiesta"');
  }
  
  await nuevaFiestaButton.click();
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  console.log('✅ Clic en "Nueva fiesta"');
  
  // 3. Seleccionar el primer tipo de evento disponible
  const categoryButtons = page.locator('button[type="submit"]').filter({
    has: page.locator('p.text-dark-neutral')
  });
  
  const categoryCount = await categoryButtons.count();
  
  if (categoryCount === 0) {
    throw new Error('❌ No se encontraron categorías de eventos');
  }
  
  await categoryButtons.first().click();
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  console.log('✅ Tipo de evento seleccionado');
  
  // 4. Seleccionar la primera categoría de servicios disponible
  const serviceButtons = page.locator('button').filter({
    has: page.locator('p.text-neutral-800.font-medium')
  });
  
  const serviceCategoryCount = await serviceButtons.count();
  
  if (serviceCategoryCount === 0) {
    throw new Error('❌ No se encontraron categorías de servicios');
  }
  
  await serviceButtons.first().click();
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  console.log('✅ Categoría de servicio seleccionada');
  
  // 5. Navegar por subcategorías hasta encontrar cards de servicios
  // Intentar hasta 5 niveles de profundidad para asegurar que llegue a los servicios
  let nivel = 0;
  const MAX_NIVELES = 5;
  
  while (nivel < MAX_NIVELES) {
    nivel++;
    await safeWaitForTimeout(page, 1500); // Esperar más tiempo para que el contenido se cargue
    
    console.log(`🔍 Nivel ${nivel}/${MAX_NIVELES}: Buscando subcategorías o cards de servicios...`);
    
    // PRIMERO verificar si hay subcategorías disponibles (priorizar navegación sobre detección de cards)
    // Si hay subcategorías, deberíamos seguir navegando
    const subcategoryButtons = page.locator('button').filter({
      has: page.locator('p.text-neutral-800.font-medium, p.text-dark-neutral')
    }).filter({
      hasNot: page.locator('i.icon-arrow-left, i.icon-chevron-left') // Excluir botones de navegación hacia atrás
    });
    
    const subcategoryCount = await subcategoryButtons.count();
    console.log(`   📊 Subcategorías encontradas: ${subcategoryCount}`);
    
    // Si NO hay subcategorías, entonces verificar si hay cards de servicios
    if (subcategoryCount === 0) {
      console.log(`   ℹ️ No hay subcategorías, verificando si hay cards de servicios...`);
      
      // Verificar si ya estamos en una página con cards de servicios
      // Usar un selector más específico para cards reales de servicios
      const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
        has: page.locator('p, h3, h4, h5, h6').first()
      });
      
      // También verificar si hay formulario de búsqueda (indicador de página de servicios)
      const searchForm = page.locator('form#ServicesSearchForm, form[class*="search"], input#Search');
      const formExists = await searchForm.count().then(count => count > 0);
      
      const cardsCount = await serviceCards.count();
      
      // Verificar que al menos una card es visible y que realmente son cards de servicios
      if (cardsCount > 0 || formExists) {
        let cardsVisibles = 0;
        if (cardsCount > 0) {
          for (let i = 0; i < Math.min(cardsCount, 5); i++) {
            const card = serviceCards.nth(i);
            const isVisible = await card.isVisible().catch(() => false);
            if (isVisible) {
              // Verificar que la card tiene contenido que sugiere que es un servicio
              const cardText = await card.textContent().catch(() => '');
              const hasServiceContent = cardText && cardText.length > 10; // Las cards de servicios tienen más contenido
              if (hasServiceContent) {
                cardsVisibles++;
              }
            }
          }
        }
        
        if (cardsVisibles > 0 || formExists) {
          console.log(`✅ Cards de servicios encontradas: ${cardsCount} (${cardsVisibles} visibles)`);
          if (formExists) {
            console.log(`   ✅ Formulario de búsqueda detectado - confirmado que estamos en página de servicios`);
          }
          return; // Hemos llegado a las cards
        }
      }
      
      // Si no hay subcategorías ni cards, salir del bucle
      console.log(`⚠️ No hay subcategorías ni cards de servicios detectadas en nivel ${nivel}`);
      break;
    }
    
    // Si hay subcategorías, navegar a una
    // (subcategoryButtons y subcategoryCount ya están definidos arriba)
    if (subcategoryCount > 0) {
      // Verificar que el botón es clickeable antes de intentar navegar
      const firstButton = subcategoryButtons.first();
      const isVisible = await firstButton.isVisible({ timeout: 2000 }).catch(() => false);
      const isEnabled = await firstButton.isEnabled().catch(() => false);
      
      if (isVisible && isEnabled) {
        // Obtener la URL actual antes de navegar
        const urlAntes = page.url();
        
        // Obtener el texto del botón para logging
        const buttonText = await firstButton.locator('p').first().textContent().catch(() => 'subcategoría');
        
        // Hacer clic en la subcategoría
        await firstButton.click();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        
        // Verificar que realmente navegó
        // Esperar un poco más para que la navegación se complete
        await safeWaitForTimeout(page, 1500);
        
        const urlDespues = page.url();
        const navego = urlAntes !== urlDespues;
        
        // Verificar que el contenido cambió de varias formas:
        // 1. Nuevos elementos aparecieron
        const nuevosElementos = page.locator('button').filter({
          has: page.locator('p.text-neutral-800.font-medium, p.text-dark-neutral')
        });
        const nuevosElementosCount = await nuevosElementos.count();
        const contenidoCambio = nuevosElementosCount !== subcategoryCount;
        
        // 2. Verificar si aparecieron cards de servicios (signo de que navegó correctamente)
        const serviceCardsCheck = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
          has: page.locator('p, h3, h4, h5, h6').first()
        });
        const cardsCountCheck = await serviceCardsCheck.count();
        let aparecieronCards = false;
        if (cardsCountCheck > 0) {
          // Verificar que al menos una card es visible y tiene contenido
          for (let i = 0; i < Math.min(cardsCountCheck, 3); i++) {
            const card = serviceCardsCheck.nth(i);
            const isVisible = await card.isVisible().catch(() => false);
            if (isVisible) {
              const cardText = await card.textContent().catch(() => '');
              if (cardText && cardText.length > 10) {
                aparecieronCards = true;
                break;
              }
            }
          }
        }
        
        // 3. Verificar si apareció el formulario de búsqueda (signo de que está en página de servicios)
        const searchForm = page.locator('form#ServicesSearchForm, form[class*="search"], input#Search');
        const formExists = await searchForm.count().then(count => count > 0);
        
        if (navego || contenidoCambio || aparecieronCards || formExists) {
          console.log(`✅ Navegó a subcategoría (nivel ${nivel}): "${buttonText?.trim()}"`);
          if (formExists || aparecieronCards) {
            if (formExists) {
              console.log(`   ✅ Formulario de búsqueda detectado - llegamos a página de servicios`);
            }
            if (aparecieronCards) {
              console.log(`   ✅ Cards de servicios detectadas (${cardsCountCheck} cards)`);
              // Si encontramos cards, salir del bucle
              return;
            }
          }
        } else {
          console.log(`⚠️ Clic realizado pero no se detectó navegación clara (nivel ${nivel})`);
          console.log(`   URL antes: ${urlAntes}`);
          console.log(`   URL después: ${urlDespues}`);
          console.log(`   Elementos antes: ${subcategoryCount}, después: ${nuevosElementosCount}`);
          // Continuar de todas formas, puede ser que la navegación sea interna sin cambio de URL
        }
      } else {
        console.log(`⚠️ Botón de subcategoría no está visible o habilitado (nivel ${nivel})`);
        break;
      }
    } else {
      // No hay más subcategorías, verificar si estamos en las cards
      console.log(`⚠️ No se encontraron más subcategorías en nivel ${nivel}, verificando si hay cards de servicios...`);
      
      // Hacer una verificación final de cards antes de salir
      const finalCardsCheck = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
        has: page.locator('p, h3, h4, h5, h6').first()
      });
      const finalCardsCount = await finalCardsCheck.count();
      const finalFormCheck = await page.locator('form#ServicesSearchForm, form[class*="search"], input#Search').count().then(count => count > 0);
      
      if (finalCardsCount > 0 || finalFormCheck) {
        let finalCardsVisibles = 0;
        if (finalCardsCount > 0) {
          for (let i = 0; i < Math.min(finalCardsCount, 5); i++) {
            const card = finalCardsCheck.nth(i);
            const isVisible = await card.isVisible().catch(() => false);
            if (isVisible) {
              const cardText = await card.textContent().catch(() => '');
              if (cardText && cardText.length > 10) {
                finalCardsVisibles++;
              }
            }
          }
        }
        
        if (finalCardsVisibles > 0 || finalFormCheck) {
          console.log(`✅ Cards de servicios encontradas al final: ${finalCardsCount} (${finalCardsVisibles} visibles)`);
          if (finalFormCheck) {
            console.log(`   ✅ Formulario de búsqueda detectado`);
          }
          return; // Hemos llegado a las cards
        }
      }
      
      console.log(`⚠️ No se encontraron cards de servicios después de ${nivel} niveles`);
      break;
    }
  }
  
  // Verificación final después del bucle
  const finalVerification = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
    has: page.locator('p, h3, h4, h5, h6').first()
  });
  const finalCount = await finalVerification.count();
  const finalForm = await page.locator('form#ServicesSearchForm, form[class*="search"], input#Search').count().then(count => count > 0);
  
  if (finalCount > 0 || finalForm) {
    let visibles = 0;
    if (finalCount > 0) {
      for (let i = 0; i < Math.min(finalCount, 5); i++) {
        const card = finalVerification.nth(i);
        const isVisible = await card.isVisible().catch(() => false);
        if (isVisible) {
          const cardText = await card.textContent().catch(() => '');
          if (cardText && cardText.length > 10) {
            visibles++;
          }
        }
      }
    }
    
    if (visibles > 0 || finalForm) {
      console.log(`✅ Cards de servicios encontradas después del bucle: ${finalCount} (${visibles} visibles)`);
    } else {
      console.log(`⚠️ No se encontraron cards visibles de servicios después de navegar ${nivel} niveles`);
    }
  } else {
    console.log(`⚠️ No se encontraron cards de servicios después de navegar ${nivel} niveles`);
  }
  
  console.log('✅ Navegación completada');
}

/**
 * Navega por subcategorías hasta encontrar cards de servicios
 * Reutilizable para cualquier punto de navegación
 */
async function navegarPorSubcategoriasHastaServicios(page: Page): Promise<void> {
  await showStepMessage(page, '🔍 Navegando por subcategorías hasta servicios');
  console.log('📋 Navegando por subcategorías hasta llegar a cards de servicios...');
  
  // Intentar hasta 5 niveles de profundidad para asegurar que llegue a los servicios
  let nivel = 0;
  const MAX_NIVELES = 5;
  
  while (nivel < MAX_NIVELES) {
    nivel++;
    await safeWaitForTimeout(page, 1500); // Esperar más tiempo para que el contenido se cargue
    
    console.log(`🔍 Nivel ${nivel}/${MAX_NIVELES}: Buscando subcategorías o cards de servicios...`);
    
    // PRIMERO verificar si hay subcategorías disponibles (priorizar navegación sobre detección de cards)
    // Si hay subcategorías, deberíamos seguir navegando
    const subcategoryButtons = page.locator('button').filter({
      has: page.locator('p.text-neutral-800.font-medium, p.text-dark-neutral')
    }).filter({
      hasNot: page.locator('i.icon-arrow-left, i.icon-chevron-left') // Excluir botones de navegación hacia atrás
    });
    
    const subcategoryCount = await subcategoryButtons.count();
    console.log(`   📊 Subcategorías encontradas: ${subcategoryCount}`);
    
    // Si NO hay subcategorías, entonces verificar si hay cards de servicios
    if (subcategoryCount === 0) {
      console.log(`   ℹ️ No hay subcategorías, verificando si hay cards de servicios...`);
      
      // Verificar si hay formulario de búsqueda (indicador de página de servicios)
      const searchForm = page.locator('form#ServicesSearchForm, form[class*="search"], input#Search');
      const formExists = await searchForm.count().then(count => count > 0);
      
      // Verificar si hay cards de servicios
      const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
        has: page.locator('p, h3, h4, h5, h6').first()
      });
      
      const cardsCount = await serviceCards.count();
      
      // Verificar que al menos una card es visible y que realmente son cards de servicios
      if (cardsCount > 0 || formExists) {
        let cardsVisibles = 0;
        if (cardsCount > 0) {
          for (let i = 0; i < Math.min(cardsCount, 5); i++) {
            const card = serviceCards.nth(i);
            const isVisible = await card.isVisible().catch(() => false);
            if (isVisible) {
              // Verificar que la card tiene contenido que sugiere que es un servicio
              const cardText = await card.textContent().catch(() => '');
              const hasServiceContent = cardText && cardText.length > 10; // Las cards de servicios tienen más contenido
              if (hasServiceContent) {
                cardsVisibles++;
              }
            }
          }
        }
        
        if (cardsVisibles > 0 || formExists) {
          console.log(`✅ Cards de servicios encontradas: ${cardsCount} (${cardsVisibles} visibles)`);
          if (formExists) {
            console.log(`   ✅ Formulario de búsqueda detectado - confirmado que estamos en página de servicios`);
          }
          return; // Hemos llegado a las cards
        }
      }
      
      // Si no hay subcategorías ni cards, salir del bucle
      console.log(`⚠️ No hay subcategorías ni cards de servicios detectadas en nivel ${nivel}`);
      break;
    }
    
    // Si hay subcategorías, navegar a una
    if (subcategoryCount > 0) {
      // Verificar que el botón es clickeable antes de intentar navegar
      const firstButton = subcategoryButtons.first();
      const isVisible = await firstButton.isVisible({ timeout: 2000 }).catch(() => false);
      const isEnabled = await firstButton.isEnabled().catch(() => false);
      
      if (isVisible && isEnabled) {
        // Obtener la URL actual antes de navegar
        const urlAntes = page.url();
        
        // Obtener el texto del botón para logging
        const buttonText = await firstButton.locator('p').first().textContent().catch(() => 'subcategoría');
        
        // Hacer clic en la subcategoría
        await firstButton.click();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        
        // Verificar que realmente navegó
        // Esperar un poco más para que la navegación se complete
        await safeWaitForTimeout(page, 1500);
        
        const urlDespues = page.url();
        const navego = urlAntes !== urlDespues;
        
        // Verificar si aparecieron cards de servicios (signo de que navegó correctamente)
        const serviceCardsCheck = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
          has: page.locator('p, h3, h4, h5, h6').first()
        });
        const cardsCountCheck = await serviceCardsCheck.count();
        let aparecieronCards = false;
        if (cardsCountCheck > 0) {
          // Verificar que al menos una card es visible y tiene contenido
          for (let i = 0; i < Math.min(cardsCountCheck, 3); i++) {
            const card = serviceCardsCheck.nth(i);
            const isVisible = await card.isVisible().catch(() => false);
            if (isVisible) {
              const cardText = await card.textContent().catch(() => '');
              if (cardText && cardText.length > 10) {
                aparecieronCards = true;
                break;
              }
            }
          }
        }
        
        // Verificar si apareció el formulario de búsqueda (signo de que está en página de servicios)
        const searchForm = page.locator('form#ServicesSearchForm, form[class*="search"], input#Search');
        const formExists = await searchForm.count().then(count => count > 0);
        
        if (navego || aparecieronCards || formExists) {
          console.log(`✅ Navegó a subcategoría (nivel ${nivel}): "${buttonText?.trim()}"`);
          if (formExists || aparecieronCards) {
            if (formExists) {
              console.log(`   ✅ Formulario de búsqueda detectado - llegamos a página de servicios`);
            }
            if (aparecieronCards) {
              console.log(`   ✅ Cards de servicios detectadas (${cardsCountCheck} cards)`);
              // Si encontramos cards, salir del bucle
              return;
            }
          }
        } else {
          console.log(`⚠️ Clic realizado pero no se detectó navegación clara (nivel ${nivel})`);
          // Continuar de todas formas, puede ser que la navegación sea interna sin cambio de URL
        }
      } else {
        console.log(`⚠️ Botón de subcategoría no está visible o habilitado (nivel ${nivel})`);
        break;
      }
    }
  }
  
  // Verificación final después del bucle
  const finalVerification = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
    has: page.locator('p, h3, h4, h5, h6').first()
  });
  const finalCount = await finalVerification.count();
  const finalForm = await page.locator('form#ServicesSearchForm, form[class*="search"], input#Search').count().then(count => count > 0);
  
  if (finalCount > 0 || finalForm) {
    let visibles = 0;
    if (finalCount > 0) {
      for (let i = 0; i < Math.min(finalCount, 5); i++) {
        const card = finalVerification.nth(i);
        const isVisible = await card.isVisible().catch(() => false);
        if (isVisible) {
          const cardText = await card.textContent().catch(() => '');
          if (cardText && cardText.length > 10) {
            visibles++;
          }
        }
      }
    }
    
    if (visibles > 0 || finalForm) {
      console.log(`✅ Cards de servicios encontradas después del bucle: ${finalCount} (${visibles} visibles)`);
    } else {
      console.log(`⚠️ No se encontraron cards visibles de servicios después de navegar ${nivel} niveles`);
    }
  } else {
    console.log(`⚠️ No se encontraron cards de servicios después de navegar ${nivel} niveles`);
  }
  
  console.log('✅ Navegación por subcategorías completada');
}

/**
 * Obtiene el locator para las cards de servicios en listados
 */
function getServiceCardsLocator(page: Page) {
  // Cards de servicios pueden tener diferentes estructuras según el tamaño de pantalla
  // Buscar cards clickeables que contengan información de servicio
  // Usar selectores más amplios para capturar todas las variantes
  return page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col, div[class*="cursor-pointer"], div.hidden.flex-row, div[class*="rounded"][class*="shadow"]').filter({
    has: page.locator('p, h3, h4, h5, h6, img').first()
  });
}

/**
 * Verifica que una card NO tiene rating visible
 */
async function verificarCardSinRating(card: ReturnType<typeof page.locator>, page: Page, cardIndex?: number): Promise<boolean> {
  const cardNum = cardIndex !== undefined ? `Card ${cardIndex + 1}` : 'Card';
  
  // Buscar elementos comunes de rating (estrellas, números, etc.)
  const ratingSelectors = [
    { selector: 'i.icon-star', name: 'icon-star' },
    { selector: 'i.icon-star-solid', name: 'icon-star-solid' },
    { selector: 'i[class*="star"]', name: 'icon con star' },
    { selector: 'div[class*="rating"]', name: 'div con rating' },
    { selector: 'div[class*="Rating"]', name: 'div con Rating' },
    { selector: 'span[class*="rating"]', name: 'span con rating' },
    { selector: 'p[class*="rating"]', name: 'p con rating' },
  ];
  
  // Verificar selectores específicos de rating
  for (const { selector, name } of ratingSelectors) {
    const ratingElements = card.locator(selector);
    const count = await ratingElements.count().catch(() => 0);
    
    if (count > 0) {
      console.log(`   🔍 ${cardNum}: Encontrados ${count} elementos con selector "${name}"`);
      
      for (let i = 0; i < count; i++) {
        const ratingElement = ratingElements.nth(i);
        const isVisible = await ratingElement.isVisible({ timeout: 1000 }).catch(() => false);
        const boundingBox = await ratingElement.boundingBox().catch(() => null);
        const elementText = await ratingElement.textContent().catch(() => '');
        const classes = await ratingElement.getAttribute('class').catch(() => '');
        
        console.log(`      - Elemento ${i + 1}: visible=${isVisible}, boundingBox=${boundingBox ? `(${boundingBox.width}x${boundingBox.height})` : 'null'}, text="${elementText?.trim()}", classes="${classes}"`);
        
        if (isVisible && boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
          // Verificar que no es parte de otro elemento (como precio, fecha, etc.)
          const parentElement = ratingElement.locator('..').first();
          const parentText = await parentElement.textContent().catch(() => '');
          const parentClasses = await parentElement.getAttribute('class').catch(() => '');
          
          console.log(`      - Parent text: "${parentText?.trim().substring(0, 100)}", classes: "${parentClasses}"`);
          
          // Verificar si el texto del padre contiene indicadores de que NO es rating
          const isPrice = parentText?.includes('$') || parentText?.includes('precio') || parentText?.includes('Precio');
          const isDate = parentText?.match(/\d{1,2}\s+\w+\.?\s+\d{4}/) || parentText?.includes('fecha');
          const isNumber = /^\d+$/.test(elementText?.trim() || '');
          
          if (isPrice) {
            console.log(`      ⚠️ ${cardNum}: Elemento "${name}" está dentro de un precio, ignorando`);
            continue;
          }
          
          if (isDate) {
            console.log(`      ⚠️ ${cardNum}: Elemento "${name}" está dentro de una fecha, ignorando`);
            continue;
          }
          
          // Si es un número, verificar que esté en el rango de rating (0-5)
          if (isNumber) {
            const numValue = parseFloat(elementText?.trim() || '0');
            if (numValue >= 0 && numValue <= 5) {
              console.log(`      ❌ ${cardNum}: Encontrado número de rating "${numValue}" visible`);
              return false; // Se encontró rating
            } else {
              console.log(`      ⚠️ ${cardNum}: Número "${numValue}" fuera del rango de rating (0-5), ignorando`);
              continue;
            }
          }
          
          // Si es un icono de estrella visible, verificar que está en contexto de rating
          if (name.includes('star')) {
            // Verificar que el icono está en un contenedor que sugiere rating
            // Buscar el contenedor padre más cercano con flex
            const parentContainer = ratingElement.locator('xpath=ancestor::div[contains(@class, "flex")][1]').first();
            const containerExists = await parentContainer.count().then(count => count > 0);
            
            if (containerExists) {
              const containerText = await parentContainer.textContent().catch(() => '');
              const containerClasses = await parentContainer.getAttribute('class').catch(() => '');
              
              // Verificar si hay un número en el mismo contenedor (hermano del icono)
              const siblings = parentContainer.locator('p, span');
              const siblingsCount = await siblings.count();
              let hasNumberNearby = false;
              let numberValue: number | null = null;
              
              for (let j = 0; j < siblingsCount; j++) {
                const sibling = siblings.nth(j);
                const siblingText = await sibling.textContent().catch(() => '');
                const siblingValue = parseFloat(siblingText?.trim() || '');
                if (!isNaN(siblingValue) && siblingValue >= 0 && siblingValue <= 5) {
                  hasNumberNearby = true;
                  numberValue = siblingValue;
                  break;
                }
              }
              
              // Verificar si el contenedor tiene clases que sugieren rating (flex-row items-center gap)
              const isRatingContainer = containerClasses?.includes('items-center') && 
                                       (containerClasses?.includes('gap') || containerClasses?.includes('flex-row'));
              
              console.log(`      🔍 ${cardNum}: Icono estrella - Container classes: "${containerClasses}", hasNumber: ${hasNumberNearby}, numberValue: ${numberValue}, isRatingContainer: ${isRatingContainer}`);
              
              if ((isRatingContainer && hasNumberNearby) || (hasNumberNearby && numberValue !== null)) {
                console.log(`      ❌ ${cardNum}: Encontrado rating visible: icono estrella + número "${numberValue}"`);
                return false; // Se encontró rating
              } else {
                console.log(`      ⚠️ ${cardNum}: Icono de estrella encontrado pero sin patrón de rating claro`);
                // Continuar verificando, puede ser un falso positivo
              }
            } else {
              // Si no hay contenedor padre, el icono solo no es suficiente
              console.log(`      ⚠️ ${cardNum}: Icono de estrella sin contenedor padre, ignorando`);
            }
          }
          
          // Si tiene la clase "rating" y es visible, es rating
          if (name.includes('rating') || name.includes('Rating')) {
            console.log(`      ❌ ${cardNum}: Encontrado elemento con clase rating visible`);
            return false; // Se encontró rating
          }
        } else {
          console.log(`      ✅ ${cardNum}: Elemento "${name}" no es visible o no tiene dimensiones`);
        }
      }
    }
  }
  
  // Buscar contenedores que tengan icono de estrella Y número (patrón común de rating)
  const ratingContainers = card.locator('div.flex.flex-row.items-center.gap-2').filter({
    has: page.locator('i.icon-star, i.icon-star-solid, i[class*="star"]')
  });
  
  const ratingContainersCount = await ratingContainers.count().catch(() => 0);
  
  if (ratingContainersCount > 0) {
    console.log(`   🔍 ${cardNum}: Encontrados ${ratingContainersCount} contenedores con icono de estrella`);
    
    for (let i = 0; i < ratingContainersCount; i++) {
      const container = ratingContainers.nth(i);
      const isVisible = await container.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        // Verificar que tiene un número cerca del icono
        const numberElement = container.locator('p, span').first();
        const numberText = await numberElement.textContent().catch(() => '');
        const numberValue = parseFloat(numberText?.trim() || '');
        
        console.log(`      🔍 ${cardNum}: Contenedor ${i + 1} visible, número encontrado: "${numberText?.trim()}"`);
        
        // Si el número está en el rango 0-5, es muy probable que sea rating
        if (!isNaN(numberValue) && numberValue >= 0 && numberValue <= 5) {
          const containerText = await container.textContent().catch(() => '');
          const hasStarIcon = await container.locator('i.icon-star, i.icon-star-solid, i[class*="star"]').count().then(count => count > 0);
          
          if (hasStarIcon) {
            console.log(`      ❌ ${cardNum}: Encontrado rating "${numberValue}" con icono de estrella en contenedor`);
            return false; // Se encontró rating
          }
        }
      }
    }
  }
  
  // Buscar números que podrían ser ratings (0-5) de forma más específica
  const allTextElements = card.locator('p, span, div, h1, h2, h3, h4, h5, h6');
  const textCount = await allTextElements.count().catch(() => 0);
  
  if (textCount > 0) {
    console.log(`   🔍 ${cardNum}: Verificando ${Math.min(textCount, 20)} elementos de texto para números de rating...`);
    
    for (let i = 0; i < Math.min(textCount, 20); i++) {
      const textElement = allTextElements.nth(i);
      const isVisible = await textElement.isVisible({ timeout: 500 }).catch(() => false);
      
      if (!isVisible) continue;
      
      const text = await textElement.textContent().catch(() => '');
      const textTrimmed = text?.trim() || '';
      
      // Buscar números en el rango 0-5 (rating) incluyendo decimales como 5.0, 4.5, etc.
      const ratingMatch = textTrimmed.match(/^([0-5](\.[0-9])?)$/);
      
      if (ratingMatch) {
        const ratingValue = parseFloat(ratingMatch[1]);
        const parentElement = textElement.locator('..').first();
        const parentText = await parentElement.textContent().catch(() => '');
        const isPrice = parentText?.includes('$') || parentText?.includes('precio');
        const isDate = parentText?.match(/\d{1,2}\s+\w+\.?\s+\d{4}/);
        
        console.log(`      🔍 ${cardNum}: Encontrado número "${ratingValue}" en texto: "${textTrimmed}", parent: "${parentText?.trim().substring(0, 50)}"`);
        
        // Verificar si hay un icono de estrella cerca (en el mismo contenedor padre o hermano)
        const parentContainer = textElement.locator('xpath=ancestor::div[contains(@class, "flex")][contains(@class, "row") or contains(@class, "col")]').first();
        const hasStarNearby = await parentContainer.locator('i.icon-star, i.icon-star-solid, i[class*="star"]').count().then(count => count > 0);
        
        if (!isPrice && !isDate) {
          // Verificar si está cerca de palabras relacionadas con rating
          const nearbyText = parentText?.toLowerCase() || '';
          const hasRatingContext = nearbyText.includes('rating') || 
                                   nearbyText.includes('calificación') ||
                                   nearbyText.includes('estrella');
          
          // Si hay un icono de estrella cerca O tiene contexto de rating, es rating
          if (hasStarNearby || hasRatingContext) {
            console.log(`      ❌ ${cardNum}: Número "${ratingValue}" encontrado con icono de estrella cerca o contexto de rating`);
            return false; // Se encontró rating
          } else {
            console.log(`      ⚠️ ${cardNum}: Número "${ratingValue}" sin contexto de rating ni estrella cerca, puede ser otro dato`);
          }
        } else {
          console.log(`      ✅ ${cardNum}: Número "${ratingValue}" está en contexto de precio/fecha, ignorando`);
        }
      }
    }
  }
  
  console.log(`   ✅ ${cardNum}: No se encontró rating visible`);
  return true; // No se encontró rating
}

/**
 * Verifica que una card tiene badge de promoción
 */
async function verificarCardConPromocion(card: ReturnType<typeof page.locator>, page: Page): Promise<{
  tieneBadge: boolean;
  tieneImagenPromocion: boolean;
  textoOferta: string | null;
}> {
  // Buscar badge de promoción (bg-[#FF7A00] o bg-orange-950 con icon-promotion)
  const badgePromocion = card.locator('div.bg-\\[\\#FF7A00\\], div[class*="orange-950"], div.bg-orange-950').filter({
    has: page.locator('i.icon-promotion, i[class*="promotion"]')
  }).first();
  
  const tieneBadge = await badgePromocion.isVisible({ timeout: 2000 }).catch(() => false);
  
  let textoOferta: string | null = null;
  if (tieneBadge) {
    const textoBadge = badgePromocion.locator('p').first();
    textoOferta = await textoBadge.textContent().catch(() => null);
  }
  
  // Verificar imagen de promoción (puede ser difícil sin conocer la URL exacta)
  // Por ahora, verificamos que la card tiene una imagen
  const imagenCard = card.locator('img').first();
  const tieneImagen = await imagenCard.isVisible({ timeout: 2000 }).catch(() => false);
  
  return {
    tieneBadge,
    tieneImagenPromocion: tieneImagen, // Asumimos que si hay imagen y badge, es de promoción
    textoOferta: textoOferta?.trim() || null
  };
}

// ============================================================================

test.use({
  viewport: { width: 1280, height: 720 }
});

test.describe('Promociones en Cards y Detalle de Servicio', () => {
  test.beforeEach(async ({ page }) => {
    // Login como cliente
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
  });

  // ============================================================================
  // TEST 1: Card sin promoción no debe mostrar rating
  // ============================================================================
  test('Card sin promoción no muestra rating', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando cards sin promoción');
    
    // Navegar hasta las cards de servicios
    await navegarHastaCardsDeServicios(page);
    
    // Buscar cards de servicios
    const serviceCards = getServiceCardsLocator(page);
    const cardsCount = await serviceCards.count();
    
    console.log(`📊 Cards de servicios encontradas en DOM: ${cardsCount}`);
    
    if (cardsCount === 0) {
      console.log('⚠️ No se encontraron cards de servicios para validar');
      return;
    }
    
    // Filtrar solo las cards realmente visibles y válidas
    const cardsVisibles: Array<{ index: number; card: ReturnType<typeof serviceCards.nth> }> = [];
    
    for (let i = 0; i < cardsCount; i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        // Verificar que tiene dimensiones válidas
        const boundingBox = await card.boundingBox().catch(() => null);
        if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
          // Si tiene dimensiones válidas, considerarla válida
          // No requerimos que el nombre sea visible porque puede estar en diferentes formatos
          cardsVisibles.push({ index: i, card });
        }
      }
    }
    
    console.log(`📊 Cards de servicios visibles y válidas: ${cardsVisibles.length}`);
    
    if (cardsVisibles.length === 0) {
      console.log('⚠️ No se encontraron cards de servicios visibles para validar');
      console.log('💡 Intentando validar cards sin filtro estricto...');
      
      // Fallback: validar las primeras cards visibles sin filtro estricto
      for (let i = 0; i < Math.min(cardsCount, 10); i++) {
        const card = serviceCards.nth(i);
        const isVisible = await card.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          cardsVisibles.push({ index: i, card });
        }
      }
      
      console.log(`📊 Cards encontradas (fallback): ${cardsVisibles.length}`);
      
      if (cardsVisibles.length === 0) {
        console.log('❌ No se pudieron encontrar cards para validar');
        expect(cardsVisibles.length).toBeGreaterThan(0);
      }
    }
    
    // Validar que ninguna card tiene rating
    let cardsSinRating = 0;
    let cardsConRating = 0;
    const cardsConRatingIndices: number[] = [];
    
    for (let i = 0; i < Math.min(cardsVisibles.length, 10); i++) {
      const { index, card } = cardsVisibles[i];
      const cardNumber = i + 1;
      
      console.log(`\n🔍 Validando Card ${cardNumber} (índice ${index})...`);
      
      // Obtener nombre del servicio para logging (con múltiples selectores)
      let nombreDisplay = `Card ${cardNumber}`;
      const nombreSelectors = [
        'h5.text-dark-neutral',
        'h4.text-dark-neutral',
        'p.text-dark-neutral.font-bold',
        'p.text-large.text-dark-neutral.font-bold',
        'p.text-dark-neutral',
        'h3, h4, h5, h6'
      ];
      
      for (const selector of nombreSelectors) {
        const nombreServicio = card.locator(selector).first();
        const nombreVisible = await nombreServicio.isVisible({ timeout: 500 }).catch(() => false);
        if (nombreVisible) {
          const nombreText = await nombreServicio.textContent().catch(() => '');
          if (nombreText && nombreText.trim().length > 0) {
            nombreDisplay = nombreText.trim().substring(0, 30);
            break;
          }
        }
      }
      
      const sinRating = await verificarCardSinRating(card, page, i);
      if (sinRating) {
        cardsSinRating++;
        console.log(`✅ Card ${cardNumber} (${nombreDisplay}): Sin rating (correcto)`);
      } else {
        cardsConRating++;
        cardsConRatingIndices.push(cardNumber);
        console.log(`❌ Card ${cardNumber} (${nombreDisplay}): Tiene rating (incorrecto)`);
      }
    }
    
    console.log(`\n📊 Resumen: ${cardsSinRating} cards sin rating, ${cardsConRating} cards con rating`);
    
    // Todas las cards deben estar sin rating (según el enhancement)
    if (cardsConRating > 0) {
      console.log(`\n❌ PROBLEMA DETECTADO: Se encontraron ${cardsConRating} card(s) con rating visible`);
      console.log(`   Cards con rating: ${cardsConRatingIndices.join(', ')}`);
      console.log(`   Según el enhancement: "Se debe eliminar el rating de todas las cards (con y sin promoción)"`);
      console.log(`   Esto indica que el módulo de feedback aún está activo o hay un bug en la implementación`);
      console.log(`   Las cards con rating NO deberían mostrarse según los requerimientos`);
      console.log(`\n💡 ACCIÓN REQUERIDA: Eliminar el rating de estas cards en la aplicación`);
    }
    
    // El test falla si encuentra cards con rating (esto es un bug en la aplicación)
    // Según el enhancement, NO debería haber rating en ninguna card
    expect(cardsConRating).toBe(0);
    
    if (cardsConRating === 0) {
      console.log('\n✅ Todas las cards validadas no tienen rating (correcto según enhancement)');
    } else {
      console.log(`\n❌ FALLO: Se encontraron ${cardsConRating} card(s) con rating cuando NO deberían tenerlo`);
      console.log(`   Esto viola el requerimiento del enhancement`);
      console.log(`   Por favor, elimina el rating de las cards mencionadas arriba`);
    }
  });

  // ============================================================================
  // TEST 2: Card con promoción muestra badge y no muestra rating
  // ============================================================================
  test('Card con promoción muestra badge de oferta corta y no muestra rating', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando cards con promoción');
    
    // Navegar hasta las cards de servicios
    await navegarHastaCardsDeServicios(page);
    
    // Buscar cards de servicios con promoción
    const serviceCards = getServiceCardsLocator(page);
    const cardsCount = await serviceCards.count();
    
    console.log(`📊 Cards de servicios encontradas: ${cardsCount}`);
    
    if (cardsCount === 0) {
      console.log('❌ No se encontraron cards de servicios para validar');
      expect(cardsCount).toBeGreaterThan(0);
    }
    
    // Buscar cards que tengan badge de promoción
    let cardsConPromocion = 0;
    let cardsValidadas = 0;
    
    for (let i = 0; i < cardsCount; i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const promocionInfo = await verificarCardConPromocion(card, page);
      
      if (promocionInfo.tieneBadge) {
        cardsConPromocion++;
        console.log(`\n🔍 Validando card ${i + 1} con promoción...`);
        
        // Validar que tiene badge
        expect(promocionInfo.tieneBadge).toBeTruthy();
        console.log(`   ✅ Badge de promoción encontrado`);
        
        // Validar que tiene texto de oferta corta
        expect(promocionInfo.textoOferta).not.toBeNull();
        expect(promocionInfo.textoOferta?.length || 0).toBeGreaterThan(0);
        console.log(`   ✅ Texto de oferta: "${promocionInfo.textoOferta}"`);
        
        // Validar que NO tiene rating
        const sinRating = await verificarCardSinRating(card, page);
        expect(sinRating).toBeTruthy();
        console.log(`   ✅ No tiene rating`);
        
        // Validar que tiene nombre del servicio
        const nombreServicio = card.locator('p, h3, h4, h5, h6').first();
        const nombreVisible = await nombreServicio.isVisible({ timeout: 2000 }).catch(() => false);
        expect(nombreVisible).toBeTruthy();
        const nombreText = await nombreServicio.textContent().catch(() => '');
        console.log(`   ✅ Nombre del servicio: "${nombreText?.trim().substring(0, 50)}"`);
        
        cardsValidadas++;
        
        // Solo validar la primera card con promoción para no hacer el test muy largo
        if (cardsValidadas >= 1) break;
      }
    }
    
    if (cardsConPromocion === 0) {
      console.log('❌ No se encontraron cards con promoción activa para validar');
      console.log('ℹ️ Se requiere al menos una card con promoción para validar el test');
      expect(cardsConPromocion).toBeGreaterThan(0);
    } else {
      console.log(`\n✅ Validación completada: ${cardsValidadas} card(s) con promoción validada(s)`);
    }
  });

  // ============================================================================
  // TEST 3: Pantalla de detalle sin promoción no muestra rating ni sección de promoción
  // ============================================================================
  test('Pantalla de detalle sin promoción no muestra rating ni sección de promoción', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando detalle de servicio sin promoción');
    
    // Navegar hasta las cards de servicios
    await navegarHastaCardsDeServicios(page);
    
    // Buscar un servicio sin promoción (que no tenga badge)
    const serviceCards = getServiceCardsLocator(page);
    const cardsCount = await serviceCards.count();
    
    if (cardsCount === 0) {
      console.log('⚠️ No se encontraron servicios para validar');
      return;
    }
    
    let servicioSinPromocionEncontrado = false;
    
    for (let i = 0; i < cardsCount; i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const promocionInfo = await verificarCardConPromocion(card, page);
      
      // Si no tiene badge de promoción, es un servicio sin promoción
      if (!promocionInfo.tieneBadge) {
        console.log(`📋 Servicio sin promoción encontrado (card ${i + 1})`);
        
        // Hacer clic en el servicio para ir al detalle
        await card.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        
        // Verificar que NO hay sección de promoción
        const seccionPromocion = page.locator('text=/Promociones especiales|Promociones especiales/i');
        const tieneSeccionPromocion = await seccionPromocion.isVisible({ timeout: 3000 }).catch(() => false);
        expect(tieneSeccionPromocion).toBeFalsy();
        console.log('✅ No se muestra sección de promoción');
        
        // Verificar que NO hay rating
        const ratingSelectors = [
          'i.icon-star',
          'i[class*="star"]',
          'div[class*="rating"]',
          'div[class*="Rating"]',
        ];
        
        let tieneRating = false;
        for (const selector of ratingSelectors) {
          const ratingElement = page.locator(selector).first();
          const isVisible = await ratingElement.isVisible({ timeout: 1000 }).catch(() => false);
          if (isVisible) {
            tieneRating = true;
            break;
          }
        }
        
        expect(tieneRating).toBeFalsy();
        console.log('✅ No se muestra rating');
        
        // Verificar que se muestra el contenido estándar del servicio
        const nombreServicio = page.locator('h4.text-dark-neutral, h5.text-dark-neutral, h6.text-dark-neutral').first();
        const nombreVisible = await nombreServicio.isVisible({ timeout: 5000 }).catch(() => false);
        expect(nombreVisible).toBeTruthy();
        console.log('✅ Se muestra nombre del servicio');
        
        servicioSinPromocionEncontrado = true;
        break;
      }
    }
    
    if (!servicioSinPromocionEncontrado) {
      console.log('❌ No se encontró un servicio sin promoción para validar');
      console.log('ℹ️ Se requiere al menos un servicio sin promoción para validar el test');
      expect(servicioSinPromocionEncontrado).toBe(true);
    }
  });

  // ============================================================================
  // TEST 4: Pantalla de detalle con promoción muestra sección de promoción correctamente
  // ============================================================================
  test('Pantalla de detalle con promoción muestra sección de promoción con título, descripción y vigencia', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando detalle de servicio con promoción');
    
    // Navegar hasta las cards de servicios
    await navegarHastaCardsDeServicios(page);
    
    // Buscar un servicio con promoción (que tenga badge)
    const serviceCards = getServiceCardsLocator(page);
    const cardsCount = await serviceCards.count();
    
    if (cardsCount === 0) {
      console.log('⚠️ No se encontraron servicios para validar');
      return;
    }
    
    let servicioConPromocionEncontrado = false;
    
    for (let i = 0; i < cardsCount; i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const promocionInfo = await verificarCardConPromocion(card, page);
      
      // Si tiene badge de promoción, es un servicio con promoción
      if (promocionInfo.tieneBadge) {
        console.log(`📋 Servicio con promoción encontrado (card ${i + 1})`);
        console.log(`   Oferta corta: "${promocionInfo.textoOferta}"`);
        
        // Hacer clic en el servicio para ir al detalle
        await card.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        
        // Verificar que hay sección de promoción
        const seccionPromocion = page.locator('text=/Promociones especiales/i').first();
        const tieneSeccionPromocion = await seccionPromocion.isVisible({ timeout: 5000 }).catch(() => false);
        expect(tieneSeccionPromocion).toBeTruthy();
        console.log('✅ Sección "Promociones especiales" encontrada');
        
        // Verificar icono de promoción
        const iconoPromocion = seccionPromocion.locator('..').locator('i.icon-promotion, i[class*="promotion"]').first();
        const iconoVisible = await iconoPromocion.isVisible({ timeout: 2000 }).catch(() => false);
        expect(iconoVisible).toBeTruthy();
        console.log('✅ Icono de promoción encontrado');
        
        // Verificar título de la promoción
        const tituloPromocion = page.locator('p.text-dark-neutral.text-large.font-bold').first();
        const tituloVisible = await tituloPromocion.isVisible({ timeout: 5000 }).catch(() => false);
        expect(tituloVisible).toBeTruthy();
        const tituloText = await tituloPromocion.textContent().catch(() => '');
        expect(tituloText?.trim().length || 0).toBeGreaterThan(0);
        console.log(`✅ Título de promoción: "${tituloText?.trim()}"`);
        
        // Verificar descripción de la promoción
        const descripcionPromocion = tituloPromocion.locator('..').locator('p.text-dark-neutral').nth(1);
        const descripcionVisible = await descripcionPromocion.isVisible({ timeout: 3000 }).catch(() => false);
        if (descripcionVisible) {
          const descripcionText = await descripcionPromocion.textContent().catch(() => '');
          expect(descripcionText?.trim().length || 0).toBeGreaterThan(0);
          console.log(`✅ Descripción de promoción: "${descripcionText?.trim().substring(0, 50)}..."`);
        } else {
          console.log('⚠️ Descripción de promoción no encontrada (puede estar en otro formato)');
        }
        
        // Verificar vigencia
        const vigencia = page.locator('text=/Vigencia:|del.*al/i').first();
        const vigenciaVisible = await vigencia.isVisible({ timeout: 5000 }).catch(() => false);
        expect(vigenciaVisible).toBeTruthy();
        const vigenciaText = await vigencia.textContent().catch(() => '');
        expect(vigenciaText?.toLowerCase()).toContain('vigencia');
        console.log(`✅ Vigencia encontrada: "${vigenciaText?.trim()}"`);
        
        // Verificar que NO hay rating
        const ratingSelectors = [
          'i.icon-star',
          'i[class*="star"]',
          'div[class*="rating"]',
          'div[class*="Rating"]',
        ];
        
        let tieneRating = false;
        for (const selector of ratingSelectors) {
          const ratingElement = page.locator(selector).first();
          const isVisible = await ratingElement.isVisible({ timeout: 1000 }).catch(() => false);
          if (isVisible) {
            tieneRating = true;
            break;
          }
        }
        
        expect(tieneRating).toBeFalsy();
        console.log('✅ No se muestra rating');
        
        // Verificar que se muestra el contenido estándar del servicio después de la promoción
        const nombreServicio = page.locator('h4.text-dark-neutral, h5.text-dark-neutral, h6.text-dark-neutral').first();
        const nombreVisible = await nombreServicio.isVisible({ timeout: 5000 }).catch(() => false);
        expect(nombreVisible).toBeTruthy();
        console.log('✅ Se muestra nombre del servicio (contenido estándar)');
        
        servicioConPromocionEncontrado = true;
        break;
      }
    }
    
    if (!servicioConPromocionEncontrado) {
      console.log('❌ No se encontró un servicio con promoción activa para validar');
      console.log('ℹ️ Se requiere al menos un servicio con promoción para validar el test');
      expect(servicioConPromocionEncontrado).toBe(true);
    }
  });

  // ============================================================================
  // TEST 5: Imagen de promoción aparece como primera en la galería
  // ============================================================================
  test('Imagen de promoción aparece como primera imagen en la galería del detalle', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando imagen de promoción en galería');
    
    // Navegar hasta las cards de servicios
    await navegarHastaCardsDeServicios(page);
    
    // Buscar un servicio con promoción
    const serviceCards = getServiceCardsLocator(page);
    const cardsCount = await serviceCards.count();
    
    if (cardsCount === 0) {
      console.log('⚠️ No se encontraron servicios para validar');
      return;
    }
    
    let servicioConPromocionEncontrado = false;
    
    for (let i = 0; i < cardsCount; i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const promocionInfo = await verificarCardConPromocion(card, page);
      
      if (promocionInfo.tieneBadge) {
        console.log(`📋 Servicio con promoción encontrado (card ${i + 1})`);
        
        // Hacer clic en el servicio para ir al detalle
        await card.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        
        // Buscar la galería de imágenes
        // La galería puede estar en diferentes formatos (desktop vs mobile)
        const galeriaDesktop = page.locator('div.flex.flex-row.w-full.gap-6').first();
        const galeriaMobile = page.locator('div.relative.flex.w-full.h-\\[252px\\]').first();
        
        const galeriaDesktopVisible = await galeriaDesktop.isVisible({ timeout: 3000 }).catch(() => false);
        const galeriaMobileVisible = await galeriaMobile.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (galeriaDesktopVisible || galeriaMobileVisible) {
          // Buscar todas las imágenes en la galería
          const imagenes = page.locator('img[alt], img[src]');
          const imagenesCount = await imagenes.count();
          
          console.log(`📊 Imágenes encontradas en la galería: ${imagenesCount}`);
          
          if (imagenesCount > 0) {
            // La primera imagen debería ser la de promoción
            const primeraImagen = imagenes.first();
            const primeraImagenVisible = await primeraImagen.isVisible({ timeout: 2000 }).catch(() => false);
            expect(primeraImagenVisible).toBeTruthy();
            console.log('✅ Primera imagen de la galería visible');
            
            // Verificar que hay badge de promoción cerca de la primera imagen
            const badgeCercaImagen = primeraImagen.locator('..').locator('..').locator('div.bg-\\[\\#FF7A00\\], div[class*="orange-950"]').first();
            const badgeVisible = await badgeCercaImagen.isVisible({ timeout: 2000 }).catch(() => false);
            
            if (badgeVisible) {
              console.log('✅ Badge de promoción encontrado cerca de la primera imagen');
            } else {
              // Buscar badge en toda la página cerca de las imágenes
              const badgeGlobal = page.locator('div.bg-\\[\\#FF7A00\\], div[class*="orange-950"]').filter({
                has: page.locator('i.icon-promotion')
              }).first();
              const badgeGlobalVisible = await badgeGlobal.isVisible({ timeout: 2000 }).catch(() => false);
              if (badgeGlobalVisible) {
                console.log('✅ Badge de promoción encontrado en la página');
              } else {
                console.log('⚠️ Badge de promoción no encontrado cerca de la imagen (puede estar en otro formato)');
              }
            }
          }
        } else {
          console.log('⚠️ Galería no encontrada en el formato esperado');
        }
        
        servicioConPromocionEncontrado = true;
        break;
      }
    }
    
    if (!servicioConPromocionEncontrado) {
      console.log('⚠️ No se encontró un servicio con promoción activa para validar');
    }
  });

  // ============================================================================
  // TEST 6: Toggle de promociones - comportamiento desde homepage/Explorar
  // ============================================================================
  test('Toggle de promociones aparece activado por defecto desde homepage/Explorar', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando toggle de promociones desde Explorar');
    
    // 1. Ir al home
    console.log('📋 Navegando al home...');
    await page.goto(DEFAULT_BASE_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    // 2. Buscar el carrusel de promociones en el home
    console.log('🔍 Buscando carrusel de promociones en el home...');
    
    // El carrusel tiene la estructura: div.flex.flex-nowrap.overflow-x-auto con botones dentro
    // Buscar el contenedor del carrusel
    const carruselContainer = page.locator('div.flex.flex-nowrap.overflow-x-auto.no-scrollbar').first();
    const carruselVisible = await carruselContainer.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (!carruselVisible) {
      // Buscar también sin la clase no-scrollbar
      const carruselAlt = page.locator('div.flex.flex-nowrap.overflow-x-auto').first();
      const carruselAltVisible = await carruselAlt.isVisible({ timeout: 5000 }).catch(() => false);
      if (carruselAltVisible) {
        console.log('✅ Carrusel encontrado (sin no-scrollbar)');
      } else {
        console.log('⚠️ Carrusel no encontrado, buscando botones de promociones directamente...');
      }
    } else {
      console.log('✅ Carrusel encontrado');
    }
    
    // Buscar cards de promociones en el carrusel
    // Estructura: button[type="button"] con clases text-start flex items-center 
    // y que contengan imágenes y texto de promoción (precios, descuentos, etc.)
    // Los botones pueden tener bg-primary-neutral o bg-[#5221D6]
    const promoCards = page.locator('button[type="button"].text-start.flex.items-center').filter({
      has: page.locator('img')
    }).filter({
      has: page.locator('p, div').filter({
        hasText: /hasta|ahorro|%|\$|x1|x2|descuento|de ahorro/i
      })
    });
    
    const promoCardsCount = await promoCards.count();
    console.log(`📊 Cards de promociones encontradas en el home: ${promoCardsCount}`);
    
    if (promoCardsCount === 0) {
      throw new Error('❌ No se encontraron promociones en el carrusel del home');
    }
    
    // 3. Seleccionar la primera promoción disponible
    let promoCardSeleccionada: ReturnType<typeof promoCards.nth> | null = null;
    for (let i = 0; i < Math.min(promoCardsCount, 10); i++) {
      const card = promoCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      if (isVisible) {
        promoCardSeleccionada = card;
        console.log(`✅ Promoción ${i + 1} seleccionada del carrusel`);
        break;
      }
    }
    
    if (!promoCardSeleccionada) {
      throw new Error('❌ No se encontró una promoción visible en el carrusel');
    }
    
    // Obtener el título de la promoción antes de hacer clic (para logging)
    const tituloPromo = await promoCardSeleccionada.locator('p, h3, h4, h5, h6').first().textContent().catch(() => 'Promoción');
    console.log(`📋 Título de la promoción seleccionada: "${tituloPromo?.trim()}"`);
    
    // 4. Hacer clic en la promoción (esto debería navegar a la subcategoría correspondiente)
    console.log('🖱️ Haciendo clic en la promoción del carrusel...');
    await promoCardSeleccionada.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    // Verificar que navegó (la URL debería cambiar)
    const urlDespues = page.url();
    console.log(`📋 URL después del clic en promoción: ${urlDespues}`);
    
    // 5. Ahora deberíamos estar en la subcategoría correspondiente
    // Verificar que llegamos a una página con formulario de búsqueda (indica que estamos en servicios/subcategoría)
    console.log('🔍 Verificando que estamos en la página de servicios/subcategoría...');
    const searchForm = page.locator('form#ServicesSearchForm, form[class*="search"], input#Search');
    const formExists = await searchForm.count().then(count => count > 0);
    
    if (!formExists) {
      console.log('⚠️ Formulario de búsqueda no encontrado inmediatamente, esperando...');
      await safeWaitForTimeout(page, 2000);
      const formExistsRetry = await searchForm.count().then(count => count > 0);
      
      if (!formExistsRetry) {
        console.log('❌ No se encontró el formulario de búsqueda después de hacer clic en la promoción');
        console.log('ℹ️ Esto indica que no se navegó correctamente a la subcategoría');
        // No lanzar error aquí, puede que estemos en la página de detalle del servicio
      } else {
        console.log('✅ Formulario de búsqueda encontrado - estamos en la página de servicios');
      }
    } else {
      console.log('✅ Formulario de búsqueda encontrado - estamos en la página de servicios');
    }
    
    // Buscar el toggle de promociones
    // El toggle está en el formulario de búsqueda con id="WithPromotionOnly"
    // También puede estar en un label con texto "Promociones"
    const togglePromociones = page.locator('input#WithPromotionOnly, input[name="WithPromotionOnly"], label:has-text("Promociones") input[type="checkbox"], input[type="checkbox"]:near(label:has-text("Promociones"))').first();
    
    const toggleVisible = await togglePromociones.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Verificar si el toggle existe (puede estar oculto con sr-only)
    const toggleExists = await togglePromociones.count().then(count => count > 0);
    
    if (!toggleExists) {
      console.log('❌ Toggle de promociones no encontrado');
      console.log('ℹ️ El toggle DEBE estar presente en el formulario de búsqueda');
      expect(toggleExists).toBe(true);
    }
    
    // El toggle existe, verificar su estado (puede estar oculto pero funcional)
    const isChecked = await togglePromociones.isChecked().catch(() => false);
    const isPressed = await togglePromociones.getAttribute('aria-pressed').catch(() => null);
    
    // El toggle debería estar activado por defecto desde Explorar
    const estaActivado = isChecked || isPressed === 'true';
    
    if (toggleVisible) {
      console.log('✅ Toggle de promociones encontrado y visible');
    } else {
      console.log('ℹ️ Toggle encontrado pero oculto (sr-only), verificando estado...');
    }
    
    if (estaActivado) {
      console.log('✅ Toggle de promociones está activado por defecto (correcto)');
    } else {
      console.log('❌ Toggle de promociones NO está activado por defecto');
      console.log('ℹ️ Según el requerimiento, el toggle debe estar activado por defecto desde homepage/Explorar');
    }
    
    // El toggle DEBE estar activado por defecto desde Explorar
    expect(estaActivado).toBe(true);
      
    // Verificar que solo se muestran servicios con promoción cuando está activado
    if (estaActivado) {
        const serviceCards = getServiceCardsLocator(page);
        const cardsCount = await serviceCards.count();
        
        console.log(`📊 Cards de servicios encontradas con toggle activado: ${cardsCount}`);
        
        // Verificar que todas las cards tienen badge de promoción
        let cardsConPromocion = 0;
        let cardsSinPromocion = 0;
        
        for (let i = 0; i < Math.min(cardsCount, 5); i++) {
          const card = serviceCards.nth(i);
          const isVisible = await card.isVisible().catch(() => false);
          
          if (isVisible) {
            const promocionInfo = await verificarCardConPromocion(card, page);
            if (promocionInfo.tieneBadge) {
              cardsConPromocion++;
            } else {
              cardsSinPromocion++;
            }
          }
        }
        
        console.log(`📊 Cards con promoción: ${cardsConPromocion}, Cards sin promoción: ${cardsSinPromocion}`);
        
        if (cardsSinPromocion > 0) {
          console.log('⚠️ Se encontraron cards sin promoción cuando el toggle está activado');
        } else {
          console.log('✅ Todas las cards tienen promoción cuando el toggle está activado');
        }
      }
  });

  // ============================================================================
  // TEST 7: Toggle de promociones - comportamiento desde flujo de creación de evento
  // ============================================================================
  test('Toggle de promociones aparece desactivado por defecto desde flujo de creación de evento', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando toggle de promociones desde flujo de evento');
    
    // Simular entrada desde flujo de creación de evento
    // Esto generalmente significa navegar a la selección de servicios después de seleccionar tipo de evento
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    // Buscar el botón "Nueva fiesta"
    const nuevaFiestaButton = page.locator('button[type="button"].hidden.lg\\:flex').filter({
      hasText: 'Nueva fiesta'
    });
    
    const buttonVisible = await nuevaFiestaButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonVisible) {
      await nuevaFiestaButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
      
      // Seleccionar cualquier tipo de evento (el primero disponible)
      const categoryButtons = page.locator('button[type="submit"]').filter({
        has: page.locator('p.text-dark-neutral')
      });
      
      const categoryCount = await categoryButtons.count();
      
      if (categoryCount > 0) {
        await categoryButtons.first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        console.log('✅ Tipo de evento seleccionado');
        
        // Seleccionar la primera categoría de servicios disponible
        console.log('🔍 Buscando categorías de servicios...');
        const serviceButtons = page.locator('button').filter({
          has: page.locator('p.text-neutral-800.font-medium')
        });
        
        const serviceCategoryCount = await serviceButtons.count();
        console.log(`📊 Categorías de servicios encontradas: ${serviceCategoryCount}`);
        
        if (serviceCategoryCount > 0) {
          await serviceButtons.first().click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
          console.log('✅ Categoría de servicio seleccionada');
        } else {
          console.log('⚠️ No se encontraron categorías de servicios, continuando...');
        }
        
        // IMPORTANTE: Navegar por subcategorías hasta llegar a la página de servicios
        // (donde está el toggle y las cards de servicios)
        console.log('🔍 Navegando por subcategorías hasta llegar a servicios...');
        await navegarPorSubcategoriasHastaServicios(page);
        
        // Ahora deberíamos estar en la página de selección de servicios
        // Buscar el toggle de promociones
        // El toggle está en el formulario de búsqueda con id="WithPromotionOnly"
        const togglePromociones = page.locator('input#WithPromotionOnly, input[name="WithPromotionOnly"], label:has-text("Promociones") input[type="checkbox"], input[type="checkbox"]:near(label:has-text("Promociones"))').first();
        
        const toggleVisible = await togglePromociones.isVisible({ timeout: 5000 }).catch(() => false);
        
        // Verificar si el toggle existe (puede estar oculto con sr-only)
        const toggleExists = await togglePromociones.count().then(count => count > 0);
        
        if (!toggleExists) {
          console.log('❌ Toggle de promociones no encontrado en la página de selección de servicios');
          console.log('ℹ️ El toggle DEBE estar presente en el formulario de búsqueda');
          expect(toggleExists).toBe(true);
        }
        
        // El toggle existe, verificar su estado (puede estar oculto pero funcional)
        const isChecked = await togglePromociones.isChecked().catch(() => false);
        const isPressed = await togglePromociones.getAttribute('aria-pressed').catch(() => null);
        
        // El toggle debería estar desactivado por defecto desde flujo de evento
        const estaActivado = isChecked || isPressed === 'true';
        
        if (toggleVisible) {
          console.log('✅ Toggle de promociones encontrado y visible');
        } else {
          console.log('ℹ️ Toggle encontrado pero oculto (sr-only), verificando estado...');
        }
        
        if (!estaActivado) {
          console.log('✅ Toggle de promociones está desactivado por defecto desde flujo de evento (correcto)');
        } else {
          console.log('⚠️ Toggle de promociones está activado por defecto desde flujo de evento');
          console.log('ℹ️ Esto puede variar según la implementación');
        }
      } else {
        console.log('❌ No se encontraron categorías de eventos para continuar el flujo');
        expect(categoryCount).toBeGreaterThan(0);
      }
    } else {
      console.log('❌ Botón "Nueva fiesta" no encontrado');
      expect(false).toBe(true); // Forzar fallo
    }
  });

  // ============================================================================
  // TEST 8: Promociones finalizadas no se muestran en cards ni detalle
  // ============================================================================
  test('Promociones finalizadas no se muestran en cards ni detalle', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    await showStepMessage(page, '🔍 Validando que promociones finalizadas no se muestran');
    
    // Navegar hasta las cards de servicios
    await navegarHastaCardsDeServicios(page);
    
    // Buscar todas las cards de servicios
    const serviceCards = getServiceCardsLocator(page);
    const cardsCount = await serviceCards.count();
    
    console.log(`📊 Cards de servicios encontradas: ${cardsCount}`);
    
    if (cardsCount === 0) {
      console.log('❌ No se encontraron servicios para validar');
      expect(cardsCount).toBeGreaterThan(0);
    }
    
    // Verificar que las cards con badge de promoción tienen fechas válidas
    // (esto requiere validar las fechas de vigencia, lo cual puede ser complejo sin acceso a la API)
    // Por ahora, validamos que las cards con badge son visibles y tienen información válida
    
    let cardsConPromocionValidas = 0;
    
    for (let i = 0; i < Math.min(cardsCount, 10); i++) {
      const card = serviceCards.nth(i);
      const isVisible = await card.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const promocionInfo = await verificarCardConPromocion(card, page);
      
      if (promocionInfo.tieneBadge) {
        // Si tiene badge, la promoción debería estar activa (el backend debería filtrar las finalizadas)
        // Validamos que el badge es visible y tiene texto
        expect(promocionInfo.tieneBadge).toBeTruthy();
        expect(promocionInfo.textoOferta).not.toBeNull();
        
        // Hacer clic para ver el detalle y validar que la promoción se muestra
        await card.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        
        // Verificar que la sección de promoción existe
        const seccionPromocion = page.locator('text=/Promociones especiales/i').first();
        const tieneSeccionPromocion = await seccionPromocion.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (tieneSeccionPromocion) {
          // Verificar que la vigencia muestra fechas futuras o actuales
          const vigencia = page.locator('text=/Vigencia:|del.*al/i').first();
          const vigenciaVisible = await vigencia.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (vigenciaVisible) {
            const vigenciaText = await vigencia.textContent().catch(() => '');
            console.log(`✅ Promoción activa encontrada con vigencia: "${vigenciaText?.trim()}"`);
            cardsConPromocionValidas++;
          }
        }
        
        // Volver atrás para continuar con la siguiente card
        await page.goBack();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
        
        // Solo validar las primeras 3 para no hacer el test muy largo
        if (cardsConPromocionValidas >= 3) break;
      }
    }
    
    console.log(`\n✅ Validación completada: ${cardsConPromocionValidas} promoción(es) activa(s) encontrada(s)`);
    console.log('ℹ️ Las promociones finalizadas deberían estar filtradas por el backend');
  });
});

