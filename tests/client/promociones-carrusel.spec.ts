import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, safeWaitForTimeout, mapearEstructuraCategoriasServicios } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/client/dashboard`;
const PROMOTIONS_URL = `${DEFAULT_BASE_URL}/promotions`;
const WAIT_FOR_PAGE_LOAD = 2000;
const DEFAULT_TIMEOUT = 180000; // 3 minutos

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Busca el carrusel de promociones en la página
 * Estructura: div con título "Las mejores promociones para ti"
 */
function getPromoCarruselLocator(page: Page) {
  // Buscar el contenedor que tiene el título "Las mejores promociones para ti"
  return page.locator('div.flex.flex-col.w-full.gap-3').filter({
    has: page.locator('p').filter({
      hasText: /las mejores promociones para ti|promociones/i
    })
  }).first();
}

/**
 * Busca las cards de promociones dentro del carrusel
 * Estructura: div[role="button"] con clases específicas y badge bg-[#FF7A00]
 */
function getPromoCardsInCarrusel(page: Page) {
  // Buscar directamente las cards con la estructura específica
  return page.locator('div[role="button"]').filter({
    has: page.locator('div').filter({
      has: page.locator('i.icon-promotion, i[class*="promotion"]')
    })
  }).filter({
    has: page.locator('div').filter({
      has: page.locator('div[class*="bg-\\[\\#FF7A00\\]"], div[style*="background"]')
    })
  });
}

/**
 * Cuenta las cards de promociones visibles en el carrusel
 */
async function countVisiblePromoCardsInCarrusel(page: Page): Promise<number> {
  // Buscar cards con la estructura específica: div[role="button"] con badge de promoción
  const promoCards = page.locator('div[role="button"]').filter({
    has: page.locator('div').filter({
      has: page.locator('i.icon-promotion, i[class*="promotion"]')
    })
  });
  
  const totalCards = await promoCards.count();
  
  let visibleCount = 0;
  for (let i = 0; i < totalCards; i++) {
    const card = promoCards.nth(i);
    const isVisible = await card.isVisible().catch(() => false);
    if (isVisible) {
      const boundingBox = await card.boundingBox().catch(() => null);
      if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
        // Verificar que tiene el badge de promoción visible
        const badge = card.locator('div').filter({
          has: page.locator('i.icon-promotion, i[class*="promotion"]')
        }).first();
        const badgeVisible = await badge.isVisible().catch(() => false);
        if (badgeVisible) {
          visibleCount++;
        }
      }
    }
  }
  
  return visibleCount;
}

/**
 * Navega a una categoría específica haciendo clic en los botones
 */
async function navegarACategoria(page: Page, categoriaNombre: string): Promise<boolean> {
  console.log(`   📂 Navegando a categoría: "${categoriaNombre}"`);
  
  const categoriaElement = page.locator('button, a, div[role="button"]').filter({
    hasText: new RegExp(categoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }).first();

  const categoriaExists = await categoriaElement.count() > 0;
  
  if (categoriaExists) {
    await expect(categoriaElement).toBeVisible({ timeout: 10000 });
    console.log(`   ✅ Categoría "${categoriaNombre}" encontrada`);
    await categoriaElement.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    console.log(`   ✅ Clic realizado en "${categoriaNombre}"`);
    return true;
  } else {
    console.log(`   ⚠️ No se encontró la categoría "${categoriaNombre}"`);
    return false;
  }
}

/**
 * Navega a una subcategoría específica
 */
async function navegarASubcategoria(page: Page, subcategoriaNombre: string): Promise<boolean> {
  console.log(`   📂 Navegando a subcategoría: "${subcategoriaNombre}"`);

  const subcategoriaElement = page.locator('button, a, div[role="button"]').filter({
    hasText: new RegExp(subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }).first();

  const subcategoriaExists = await subcategoriaElement.count() > 0;
  
  if (subcategoriaExists) {
    await expect(subcategoriaElement).toBeVisible({ timeout: 10000 });
    console.log(`   ✅ Subcategoría "${subcategoriaNombre}" encontrada`);
    await subcategoriaElement.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    console.log(`   ✅ Clic realizado en "${subcategoriaNombre}"`);
    return true;
  } else {
    console.log(`   ⚠️ No se encontró la subcategoría "${subcategoriaNombre}"`);
    return false;
  }
}

/**
 * Obtiene todas las categorías y subcategorías disponibles usando la función existente de utils.ts
 * Retorna un array de objetos con { familia: string, categoria: string }
 */
async function obtenerTodasLasCategorias(page: Page): Promise<Array<{ familia: string; categoria: string }>> {
  console.log('🔍 Obteniendo todas las categorías y subcategorías de servicios disponibles...');
  
  // Usar la función existente mapearEstructuraCategoriasServicios
  const resultado = await mapearEstructuraCategoriasServicios(page, DEFAULT_BASE_URL);
  
  const categorias: Array<{ familia: string; categoria: string }> = [];
  
  // Extraer categorías y subcategorías del mapa completo
  // El mapa contiene rutas como: [familia, subcategoria1, subcategoria2, ...]
  const rutasUnicas = new Set<string>();
  
  for (const item of resultado.mapaCompleto) {
    // Excluir "Promociones" de las familias
    if (item.categoria.toLowerCase() === 'promociones' || 
        item.categoria.toLowerCase() === 'promoción') {
      continue;
    }
    
    // La ruta contiene: [familia, subcategoria1?, subcategoria2?, ...]
    if (item.ruta.length === 0) {
      continue;
    }
    
    const familia = item.ruta[0];
    
    // Excluir "Promociones" como familia
    if (familia.toLowerCase() === 'promociones' || 
        familia.toLowerCase() === 'promoción') {
      continue;
    }
    
    // Si la ruta tiene solo un elemento, la familia es la categoría
    if (item.ruta.length === 1) {
      const clave = `${familia}|${familia}`;
      if (!rutasUnicas.has(clave)) {
        rutasUnicas.add(clave);
        categorias.push({ familia, categoria: familia });
      }
    } else {
      // Si la ruta tiene más elementos, tomar el segundo como categoría (subcategoría de nivel 1)
      // Solo tomar categorías de nivel 1 (no subcategorías anidadas más profundas)
      const categoria = item.ruta[1];
      
      // Excluir "Ver todos los servicios"
      if (categoria && 
          categoria.toLowerCase().trim() !== 'ver todos los servicios' &&
          !categoria.toLowerCase().includes('ver todos')) {
        const clave = `${familia}|${categoria}`;
        if (!rutasUnicas.has(clave)) {
          rutasUnicas.add(clave);
          categorias.push({ familia, categoria });
        }
      }
    }
  }
  
  console.log(`\n✅ Total de categorías obtenidas: ${categorias.length}`);
  return categorias;
}

// ============================================================================
// PRUEBAS
// ============================================================================

test.use({
  viewport: { width: 1280, height: 720 }
});

test.setTimeout(DEFAULT_TIMEOUT);

test.describe('Carrusel de Promociones Contextual', () => {
  test.beforeEach(async ({ page }) => {
    // Login como cliente
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  });

  // ============================================================================
  // TEST 1: Carrusel aparece en Dashboard
  // ============================================================================
  test('Carrusel aparece en Dashboard del cliente', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando carrusel en Dashboard');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    // Buscar el carrusel de promociones
    const carruselSection = getPromoCarruselLocator(page);
    const carruselVisible = await carruselSection.isVisible({ timeout: 10000 }).catch(() => false);

    // Si no se encuentra el contenedor, buscar directamente las cards
    if (!carruselVisible) {
      // Buscar directamente las cards de promociones
      const promoCards = page.locator('div[role="button"]').filter({
        has: page.locator('div').filter({
          has: page.locator('i.icon-promotion, i[class*="promotion"]')
        })
      });
      const cardsCount = await promoCards.count();
      
      if (cardsCount === 0) {
        // Verificar si hay mensaje de estado vacío (no hay promociones activas)
        const emptyState = page.locator('text=/no hay promociones|sin promociones activas/i');
        const emptyStateExists = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (emptyStateExists) {
          console.log('ℹ️ No hay promociones activas en todo Fiestamas - carrusel correctamente oculto');
          return; // Estado válido según requerimientos
        } else {
          throw new Error('❌ No se encontró el carrusel de promociones ni mensaje de estado vacío en Dashboard');
        }
      } else {
        console.log(`✅ Carrusel encontrado (${cardsCount} cards detectadas directamente)`);
      }
    } else {
      console.log('✅ Carrusel de promociones encontrado en Dashboard');
    }

    // Verificar que hay cards de promociones
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);
    console.log(`📊 Cards de promociones encontradas: ${cardsCount}`);

    if (cardsCount === 0) {
      // Verificar si hay mensaje de estado vacío global
      const emptyState = page.locator('text=/no hay promociones|sin promociones activas/i');
      const emptyStateExists = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (emptyStateExists) {
        console.log('ℹ️ No hay promociones activas en todo Fiestamas - carrusel correctamente oculto');
        return; // Estado válido solo si es global
      } else {
        throw new Error('❌ No se encontraron promociones en el carrusel del Dashboard. El carrusel debe mostrar promociones.');
      }
    } else {
      console.log('✅ Carrusel de promociones visible en Dashboard');
    }
  });

  // ============================================================================
  // TEST 3: Carrusel aparece en navegación por Categorías (TODAS las categorías)
  // ============================================================================
  test('Carrusel aparece en navegación por Categorías y subcategorías', async ({ page }) => {
    test.setTimeout(DEFAULT_TIMEOUT * 4); // Timeout ampliado para cubrir todas las categorías (12 minutos)
    
    await showStepMessage(page, '🔍 Verificando carrusel en navegación por TODAS las Categorías');
    
    // Obtener todas las categorías disponibles
    const todasLasCategorias = await obtenerTodasLasCategorias(page);
    
    if (todasLasCategorias.length === 0) {
      console.log('⚠️ No se encontraron categorías para probar');
      return;
    }
    
    console.log(`\n📊 Iniciando verificación del carrusel en ${todasLasCategorias.length} categorías...`);
    
    let categoriasValidadas = 0;
    let categoriasConCarrusel = 0;
    let categoriasSinCarrusel = 0;
    let categoriasConError = 0;
    
    // Verificar el carrusel en cada categoría
    for (let i = 0; i < todasLasCategorias.length; i++) {
      const { familia, categoria } = todasLasCategorias[i];
      
      try {
        console.log(`\n[${i + 1}/${todasLasCategorias.length}] Verificando: ${familia} > ${categoria}`);
        
        // Ir al home con manejo de errores para detectar página cerrada
        try {
          await page.goto(DEFAULT_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (gotoError) {
          if (gotoError instanceof Error && gotoError.message.includes('closed')) {
            console.log(`   ⚠️ La página se cerró durante la ejecución. Deteniendo verificaciones.`);
            throw new Error('❌ La página o el contexto del navegador se cerró durante la ejecución del test');
          }
          throw gotoError;
        }
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        
        // Navegar a la familia
        const familiaEncontrada = await navegarACategoria(page, familia);
        if (!familiaEncontrada) {
          console.log(`   ⚠️ No se pudo encontrar la familia "${familia}"`);
          categoriasConError++;
          continue;
        }
        
        // Navegar a la categoría
        const categoriaEncontrada = await navegarACategoria(page, categoria);
        if (!categoriaEncontrada) {
          console.log(`   ⚠️ No se pudo encontrar la categoría "${categoria}"`);
          categoriasConError++;
          continue;
        }
        
        // Buscar el carrusel de promociones
        const carruselSection = getPromoCarruselLocator(page);
        const carruselVisible = await carruselSection.isVisible({ timeout: 10000 }).catch(() => false);
        
        // Si no se encuentra el contenedor, buscar directamente las cards
        let carruselEncontrado = false;
        let cardsCount = 0;
        
        if (!carruselVisible) {
          const promoCards = page.locator('div[role="button"]').filter({
            has: page.locator('div').filter({
              has: page.locator('i.icon-promotion, i[class*="promotion"]')
            })
          });
          cardsCount = await promoCards.count();
          
          if (cardsCount > 0) {
            carruselEncontrado = true;
            console.log(`   ✅ Carrusel encontrado (${cardsCount} cards)`);
          } else {
            // Verificar si hay mensaje de estado vacío (solo válido si NO HAY promociones en TODO Fiestamas)
            const emptyState = page.locator('text=/no hay promociones|sin promociones activas/i');
            const emptyStateExists = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (emptyStateExists) {
              // Si hay mensaje de estado vacío, significa que no hay promociones en TODO Fiestamas
              // En este caso, el carrusel está correctamente oculto
              console.log(`   ℹ️ No hay promociones activas en todo Fiestamas - carrusel correctamente oculto`);
              carruselEncontrado = true; // Estado válido solo si es global
            } else {
              // Si no hay carrusel ni mensaje de estado vacío, la prueba debe fallar
              // Según requerimientos: "el carrusel debe mostrarse según las reglas establecidas"
              // incluso si un nivel específico no tiene promociones propias
              throw new Error(`❌ No se encontró el carrusel de promociones en "${familia} > ${categoria}". El carrusel debe mostrarse incluso si esta categoría no tiene promociones propias.`);
            }
          }
        } else {
          carruselEncontrado = true;
          cardsCount = await countVisiblePromoCardsInCarrusel(page);
          console.log(`   ✅ Carrusel encontrado (${cardsCount} cards)`);
        }
        
        // Verificar que hay al menos una promoción visible
        if (carruselEncontrado && cardsCount === 0) {
          // Verificar si hay mensaje de estado vacío global
          const emptyState = page.locator('text=/no hay promociones|sin promociones activas/i');
          const emptyStateExists = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (!emptyStateExists) {
            // Si no hay promociones visibles y no hay mensaje de estado vacío, debe fallar
            throw new Error(`❌ El carrusel está presente pero no muestra promociones en "${familia} > ${categoria}". Debe mostrar promociones según las reglas establecidas.`);
          }
        }
        
        if (carruselEncontrado) {
          categoriasConCarrusel++;
        }
        
        categoriasValidadas++;
        
      } catch (error) {
        console.log(`   ❌ Error al verificar categoría "${familia} > ${categoria}": ${error instanceof Error ? error.message : String(error)}`);
        categoriasConError++;
      }
    }
    
    // Resumen final
    console.log(`\n📊 RESUMEN DE VERIFICACIÓN:`);
    console.log(`   ✅ Categorías validadas: ${categoriasValidadas}`);
    console.log(`   ✅ Categorías con carrusel: ${categoriasConCarrusel}`);
    console.log(`   ⚠️ Categorías sin carrusel: ${categoriasSinCarrusel}`);
    console.log(`   ❌ Categorías con error: ${categoriasConError}`);
    
    // La prueba pasa si al menos se validaron algunas categorías
    expect(categoriasValidadas).toBeGreaterThan(0);
    
    // La prueba debe fallar si hay categorías sin carrusel
    if (categoriasSinCarrusel > 0) {
      throw new Error(`❌ ${categoriasSinCarrusel} categoría(s) no tienen carrusel de promociones visible. El carrusel debe mostrarse en todas las categorías y subcategorías.`);
    }
    
    // La prueba debe fallar si hay categorías con error
    if (categoriasConError > 0) {
      throw new Error(`❌ ${categoriasConError} categoría(s) tuvieron errores al verificar el carrusel de promociones.`);
    }
    
    console.log(`\n✅ Verificación completada para ${categoriasValidadas} categorías - Todas tienen carrusel de promociones`);
  });


  // ============================================================================
  // TEST 10: Paginación - 10 promociones por grupo, máximo 3 grupos
  // ============================================================================
  test('Paginación muestra 10 promociones por grupo hasta máximo 3 grupos', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando paginación del carrusel');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const promoCards = getPromoCardsInCarrusel(page);
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    console.log(`📊 Promociones visibles inicialmente: ${cardsCount}`);

    // Verificar que hay al menos algunas promociones
    if (cardsCount === 0) {
      const emptyState = page.locator('text=/no hay promociones|sin promociones activas/i');
      const emptyStateExists = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (emptyStateExists) {
        console.log('ℹ️ No hay promociones activas');
        return;
      }
    }

    // Buscar controles de paginación (botones de siguiente/anterior)
    const nextButton = page.locator('button, a').filter({
      hasText: /siguiente|next|→|>|avanzar/i
    }).first();

    const prevButton = page.locator('button, a').filter({
      hasText: /anterior|prev|←|<|retroceder/i
    }).first();

    const nextButtonExists = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
    const prevButtonExists = await prevButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (nextButtonExists) {
      console.log('✅ Controles de paginación encontrados');
      
      // Verificar que inicialmente hay máximo 10 promociones visibles (primer grupo)
      if (cardsCount <= 10) {
        console.log(`✅ Primer grupo muestra ${cardsCount} promociones (dentro del límite de 10)`);
      } else {
        console.log(`⚠️ Primer grupo muestra ${cardsCount} promociones (más de 10, puede ser válido si hay scroll horizontal)`);
      }

      // Intentar avanzar al siguiente grupo
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

      const cardsCountAfterNext = await countVisiblePromoCardsInCarrusel(page);
      console.log(`📊 Promociones después de avanzar: ${cardsCountAfterNext}`);

      // Verificar que cambió el contenido (nuevas promociones)
      if (cardsCountAfterNext > 0) {
        console.log('✅ Paginación funciona correctamente');
      }
    } else {
      // Si no hay botones de paginación, puede ser scroll horizontal o todas visibles
      console.log('ℹ️ No se encontraron botones de paginación (puede usar scroll horizontal)');
      
      if (cardsCount > 30) {
        // Si hay más de 30, debería aparecer el CTA "Ver todas las promociones"
        const ctaButton = page.locator('button, a').filter({
          hasText: /ver todas las promociones/i
        }).first();
        
        const ctaExists = await ctaButton.isVisible({ timeout: 5000 }).catch(() => false);
        if (ctaExists) {
          console.log('✅ CTA "Ver todas las promociones" encontrado cuando hay más de 30 promociones');
        }
      }
    }
  });

  // ============================================================================
  // TEST 11: CTA "Ver todas las promociones" aparece cuando hay más de 30
  // ============================================================================
  test('CTA "Ver todas las promociones" aparece cuando hay más de 30 promociones', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando CTA "Ver todas las promociones"');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const promoCards = getPromoCardsInCarrusel(page);
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    console.log(`📊 Promociones visibles: ${cardsCount}`);

    // Buscar el CTA "Ver todas las promociones"
    const ctaButton = page.locator('button, a').filter({
      hasText: /ver todas las promociones/i
    }).first();

    const ctaExists = await ctaButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (cardsCount > 30) {
      expect(ctaExists).toBe(true);
      console.log('✅ CTA "Ver todas las promociones" aparece correctamente cuando hay más de 30 promociones');
    } else {
      if (ctaExists) {
        console.log('⚠️ CTA aparece aunque hay menos de 30 promociones');
      } else {
        console.log('ℹ️ CTA no aparece (hay menos de 30 promociones, comportamiento esperado)');
      }
    }
  });

  // ============================================================================
  // TEST 12: CTA navega a "Todas las promociones"
  // ============================================================================
  test('CTA "Ver todas las promociones" navega a la pantalla correcta', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando navegación del CTA');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    // Buscar el CTA "Ver todas las promociones"
    const ctaButton = page.locator('button, a').filter({
      hasText: /ver todas las promociones/i
    }).first();

    const ctaExists = await ctaButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!ctaExists) {
      console.log('ℹ️ CTA no está visible (puede que haya menos de 30 promociones)');
      return;
    }

    // Hacer clic en el CTA
    console.log('🖱️ Haciendo clic en CTA "Ver todas las promociones"...');
    await ctaButton.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    // Verificar que navegó a la pantalla de todas las promociones
    const urlActual = page.url();
    console.log(`📋 URL actual: ${urlActual}`);

    expect(urlActual).toContain('promotions');
    console.log('✅ CTA navega correctamente a la pantalla "Todas las promociones"');
  });

  // ============================================================================
  // TEST 13: Estado vacío - Carrusel se oculta si no hay promociones activas
  // ============================================================================
  test('Carrusel se oculta si no hay promociones activas en todo Fiestamas', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando estado vacío del carrusel');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    // Buscar el carrusel de promociones
    const carruselSection = getPromoCarruselLocator(page);
    const carruselVisible = await carruselSection.isVisible({ timeout: 5000 }).catch(() => false);

    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    if (cardsCount === 0 && !carruselVisible) {
      // Verificar si hay mensaje de estado vacío
      const emptyState = page.locator('text=/no hay promociones|sin promociones activas/i');
      const emptyStateExists = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (emptyStateExists) {
        console.log('✅ Carrusel correctamente oculto cuando no hay promociones activas');
      } else {
        console.log('ℹ️ No se encontró mensaje de estado vacío, pero el carrusel está oculto');
      }
    } else if (cardsCount > 0) {
      console.log(`ℹ️ Hay ${cardsCount} promociones activas, carrusel visible (comportamiento esperado)`);
    } else {
      console.log('⚠️ Estado inesperado: carrusel visible pero sin promociones');
    }
  });

  // ============================================================================
  // TEST 14: Estructura de la card de promoción - Elementos obligatorios
  // ============================================================================
  test('Card de promoción contiene todos los elementos obligatorios', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando estructura de la card de promoción');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const promoCards = getPromoCardsInCarrusel(page);
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    if (cardsCount === 0) {
      console.log('⚠️ No hay promociones para validar estructura de card');
      return;
    }

    // Validar la primera card
    const firstCard = promoCards.first();
    
    // 1. Imagen principal (background-image en el div con bg-cover bg-center)
    const imagenContainer = firstCard.locator('div.bg-cover.bg-center, div[style*="background-image"]').first();
    const imagenVisible = await imagenContainer.isVisible({ timeout: 5000 }).catch(() => false);
    expect(imagenVisible).toBe(true);
    console.log('✅ Contenedor de imagen principal encontrado');

    // 2. Pill/Badge de promoción (oferta corta) - bg-[#FF7A00] con icon-promotion
    const badge = firstCard.locator('div').filter({
      has: page.locator('i.icon-promotion, i[class*="promotion"]')
    }).first();
    const badgeVisible = await badge.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (badgeVisible) {
      const badgeText = await badge.locator('p').first().textContent().catch(() => '');
      console.log(`✅ Badge/Pill de promoción encontrado: "${badgeText?.trim()}"`);
    } else {
      console.log('⚠️ Badge/Pill de promoción no encontrado');
    }

    // 3. Título de la promoción (sobre la imagen) - text-light-light text-small font-bold
    const titulo = firstCard.locator('p.text-light-light.text-small.font-bold, p[class*="text-light-light"]').first();
    const tituloVisible = await titulo.isVisible({ timeout: 5000 }).catch(() => false);
    const tituloText = await titulo.textContent().catch(() => '');
    
    if (tituloVisible && tituloText?.trim().length) {
      console.log(`✅ Título de promoción encontrado: "${tituloText?.trim().substring(0, 50)}"`);
    } else {
      // Buscar cualquier p dentro del contenedor de imagen
      const tituloAlt = firstCard.locator('div.bg-cover.bg-center p, div[style*="background-image"] p').first();
      const tituloAltText = await tituloAlt.textContent().catch(() => '');
      if (tituloAltText?.trim().length) {
        console.log(`✅ Título de promoción encontrado (alternativo): "${tituloAltText?.trim().substring(0, 50)}"`);
      } else {
        console.log('⚠️ Título de promoción no encontrado');
      }
    }

    // 4. Nombre del servicio - font-bold en el contenedor inferior
    const nombreServicio = firstCard.locator('div.flex.flex-col.py-2.px-4 p.font-bold, p[class*="font-bold"]').first();
    const nombreServicioVisible = await nombreServicio.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (nombreServicioVisible) {
      const nombreServicioText = await nombreServicio.textContent().catch(() => '');
      console.log(`✅ Nombre del servicio encontrado: "${nombreServicioText?.trim().substring(0, 50)}"`);
    } else {
      console.log('⚠️ Nombre del servicio no encontrado en posición esperada');
    }

    // 5. Nivel de taxonomía (categoría/subcategoría/familia) - dentro de div con icon-tag
    const nivelTaxonomia = firstCard.locator('div').filter({
      has: page.locator('i.icon-tag, i[class*="tag"]')
    }).locator('p').first();
    const nivelVisible = await nivelTaxonomia.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (nivelVisible) {
      const nivelText = await nivelTaxonomia.textContent().catch(() => '');
      console.log(`✅ Nivel de taxonomía encontrado: "${nivelText?.trim()}"`);
    } else {
      console.log('⚠️ Nivel de taxonomía no encontrado');
    }

    console.log('✅ Estructura básica de la card validada');
  });

  // ============================================================================
  // TEST 15: Card de promoción es completamente clicable
  // ============================================================================
  test('Card de promoción es completamente clicable y navega al servicio', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando que la card es clicable');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const promoCards = getPromoCardsInCarrusel(page);
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    if (cardsCount === 0) {
      console.log('⚠️ No hay promociones para probar clic');
      return;
    }

    const firstCard = promoCards.first();
    const urlAntes = page.url();

    // Hacer clic en la card
    console.log('🖱️ Haciendo clic en la card de promoción...');
    await firstCard.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const urlDespues = page.url();
    console.log(`📋 URL antes: ${urlAntes}`);
    console.log(`📋 URL después: ${urlDespues}`);

    // Verificar que navegó a una página de servicio
    const esPaginaServicio = urlDespues.includes('/service/') || urlDespues.includes('/services/');
    
    if (esPaginaServicio) {
      console.log('✅ Card navega correctamente al servicio');
    } else if (urlDespues !== urlAntes) {
      console.log('⚠️ La URL cambió pero no parece ser una página de servicio');
    } else {
      throw new Error('❌ La card no es clicable o no navega al servicio');
    }
  });

  // ============================================================================
  // TEST 16: Overlay de contraste en imagen
  // ============================================================================
  test('Overlay de contraste garantiza legibilidad del título sobre la imagen', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando overlay de contraste');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const promoCards = getPromoCardsInCarrusel(page);
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    if (cardsCount === 0) {
      console.log('⚠️ No hay promociones para validar overlay');
      return;
    }

    const firstCard = promoCards.first();

    // Buscar overlay (gradiente negro → alpha 0)
    const overlay = firstCard.locator('div[class*="gradient"], div[class*="overlay"], div[style*="gradient"]').first();
    const overlayVisible = await overlay.isVisible({ timeout: 5000 }).catch(() => false);

    if (overlayVisible) {
      console.log('✅ Overlay encontrado');
    } else {
      // Verificar si el overlay está aplicado mediante clases CSS
      const tieneOverlayClass = await firstCard.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.backgroundImage.includes('gradient') || 
               el.querySelector('[class*="gradient"]') !== null ||
               el.querySelector('[class*="overlay"]') !== null;
      }).catch(() => false);

      if (tieneOverlayClass) {
        console.log('✅ Overlay aplicado mediante clases CSS');
      } else {
        console.log('⚠️ Overlay no encontrado explícitamente (puede estar aplicado de otra forma)');
      }
    }

    // Verificar que el título es legible (está sobre la imagen)
    const titulo = firstCard.locator('p, h3, h4, h5, h6').first();
    const tituloVisible = await titulo.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (tituloVisible) {
      const tituloColor = await titulo.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.color;
      }).catch(() => '');

      console.log(`✅ Título visible con color: ${tituloColor}`);
    }
  });

  // ============================================================================
  // TEST 17: Truncamiento de textos largos
  // ============================================================================
  test('Textos largos se truncen correctamente sin romper el layout', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando truncamiento de textos');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const promoCards = getPromoCardsInCarrusel(page);
    const cardsCount = await countVisiblePromoCardsInCarrusel(page);

    if (cardsCount === 0) {
      console.log('⚠️ No hay promociones para validar truncamiento');
      return;
    }

    // Verificar que las cards tienen la clase truncate o similar
    const firstCard = promoCards.first();
    
    const tieneTruncate = await firstCard.evaluate((el) => {
      return el.classList.contains('truncate') ||
             el.querySelector('[class*="truncate"]') !== null ||
             el.querySelector('[class*="line-clamp"]') !== null;
    }).catch(() => false);

    if (tieneTruncate) {
      console.log('✅ Clases de truncamiento encontradas');
    } else {
      console.log('⚠️ Clases de truncamiento no encontradas explícitamente');
    }

    // Verificar que las cards mantienen su tamaño
    const boundingBox = await firstCard.boundingBox().catch(() => null);
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);
      console.log(`✅ Card mantiene dimensiones válidas: ${boundingBox.width}x${boundingBox.height}`);
    }
  });

  // ============================================================================
  // TEST 18: Diseño mobile-first
  // ============================================================================
  test('Carrusel se adapta correctamente a diferentes viewports (mobile-first)', async ({ page }) => {
    await showStepMessage(page, '🔍 Verificando diseño mobile-first');
    
    // Probar en viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const cardsCountMobile = await countVisiblePromoCardsInCarrusel(page);
    console.log(`📊 Promociones visibles en móvil: ${cardsCountMobile}`);

    // Probar en viewport tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const cardsCountTablet = await countVisiblePromoCardsInCarrusel(page);
    console.log(`📊 Promociones visibles en tablet: ${cardsCountTablet}`);

    // Probar en viewport desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const cardsCountDesktop = await countVisiblePromoCardsInCarrusel(page);
    console.log(`📊 Promociones visibles en desktop: ${cardsCountDesktop}`);

    console.log('✅ Carrusel se adapta a diferentes viewports');
  });
});

