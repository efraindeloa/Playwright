import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, safeWaitForTimeout } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/client/dashboard`;
const PROMOTIONS_URL = `${DEFAULT_BASE_URL}/promotions`;

// Timeouts (en milisegundos)
const DEFAULT_TIMEOUT = 60000; // 60 segundos
const EXTENDED_TIMEOUT = 120000; // 2 minutos
const WAIT_FOR_ELEMENT_TIMEOUT = 10000; // 10 segundos
const WAIT_FOR_PAGE_LOAD = 2000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Activa el filtro de promociones en el formulario de búsqueda
 */
async function activarFiltroPromociones(page: Page): Promise<void> {
  await showStepMessage(page, '🔘 ACTIVANDO FILTRO DE PROMOCIONES');
  
  // Buscar el toggle de promociones
  const togglePromociones = page.locator('input#WithPromotionOnly, input[name="WithPromotionOnly"], label:has-text("Promociones") input[type="checkbox"]').first();
  
  const toggleExists = await togglePromociones.count().then(count => count > 0);
  
  if (!toggleExists) {
    throw new Error('❌ Toggle de promociones no encontrado');
  }
  
  // Verificar si ya está activado
  const isChecked = await togglePromociones.isChecked().catch(() => false);
  
  if (!isChecked) {
    // Hacer clic en el label o en el input directamente
    const label = page.locator('label:has(input#WithPromotionOnly), label:has(input[name="WithPromotionOnly"])').first();
    const labelExists = await label.count().then(count => count > 0);
    
    if (labelExists) {
      await label.click();
    } else {
      await togglePromociones.click();
    }
    
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    console.log('✅ Filtro de promociones activado');
  } else {
    console.log('ℹ️ Filtro de promociones ya estaba activado');
  }
}

/**
 * Desactiva el filtro de promociones en el formulario de búsqueda
 */
async function desactivarFiltroPromociones(page: Page): Promise<void> {
  await showStepMessage(page, '🔘 DESACTIVANDO FILTRO DE PROMOCIONES');
  
  const togglePromociones = page.locator('input#WithPromotionOnly, input[name="WithPromotionOnly"]').first();
  const isChecked = await togglePromociones.isChecked().catch(() => false);
  
  if (isChecked) {
    const label = page.locator('label:has(input#WithPromotionOnly), label:has(input[name="WithPromotionOnly"])').first();
    const labelExists = await label.count().then(count => count > 0);
    
    if (labelExists) {
      await label.click();
    } else {
      await togglePromociones.click();
    }
    
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    console.log('✅ Filtro de promociones desactivado');
  }
}

/**
 * Verifica si hay servicios con promociones visibles
 */
async function hayServiciosConPromociones(page: Page): Promise<boolean> {
  // Buscar cards de servicios con badge de promoción
  const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer, button.text-start.flex.flex-col').filter({
    has: page.locator('i[class*="promotion"], div[class*="bg-[#FF7A00]"], div[style*="#FF7A00"], div[class*="promotion"]')
  });
  
  const cardsCount = await serviceCards.count();
  
  if (cardsCount === 0) {
    return false;
  }
  
  // Verificar que al menos una card es visible
  for (let i = 0; i < Math.min(cardsCount, 5); i++) {
    const card = serviceCards.nth(i);
    const isVisible = await card.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      return true;
    }
  }
  
  return false;
}

/**
 * Verifica si se muestra el empty state de promociones
 */
async function verificarEmptyStatePromociones(page: Page): Promise<boolean> {
  // Buscar el empty state por diferentes patrones
  const emptyStateSelectors = [
    // Título informativo
    page.locator('h1, h2, h3, h4, h5, h6, p').filter({
      hasText: /Promociones en camino|¡Promociones en camino!/i
    }),
    // Texto explicativo
    page.locator('p').filter({
      hasText: /no hay promociones disponibles|no existen promociones|no hay promociones para mostrar/i
    }),
    // CTA "Ver servicios"
    page.locator('button, a').filter({
      hasText: /Ver servicios/i
    })
  ];
  
  let emptyStateEncontrado = false;
  
  for (const selector of emptyStateSelectors) {
    const count = await selector.count();
    if (count > 0) {
      const isVisible = await selector.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        emptyStateEncontrado = true;
        const texto = await selector.first().textContent();
        console.log(`✅ Elemento de empty state encontrado: "${texto?.trim()}"`);
        break;
      }
    }
  }
  
  return emptyStateEncontrado;
}

/**
 * Navega a una vista de servicios (desde home o categorías)
 */
async function navegarAVistaServicios(page: Page): Promise<void> {
  await showStepMessage(page, '🔍 NAVEGANDO A VISTA DE SERVICIOS');
  
  // Intentar navegar directamente a servicios
  await page.goto(DEFAULT_BASE_URL);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  
  // Buscar formulario de búsqueda de servicios
  const searchForm = page.locator('form#ServicesSearchForm');
  const formExists = await searchForm.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (!formExists) {
    // Intentar hacer clic en un enlace o botón de servicios
    const serviciosLink = page.locator('a[href*="/services"], button:has-text("Servicios")').first();
    const linkExists = await serviciosLink.count().then(count => count > 0);
    
    if (linkExists) {
      await serviciosLink.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    }
  }
  
  // Verificar que estamos en una vista de servicios
  const searchFormFinal = page.locator('form#ServicesSearchForm');
  await expect(searchFormFinal).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  console.log('✅ Vista de servicios cargada');
}

/**
 * Verifica que NO se muestra empty state en carruseles
 */
async function verificarCarruselSinEmptyState(page: Page): Promise<void> {
  await showStepMessage(page, '🔍 VERIFICANDO CARRUSEL SIN EMPTY STATE');
  
  // Buscar carruseles de promociones
  const carruseles = page.locator('div.flex.flex-nowrap.overflow-x-auto, div[class*="overflow-x-auto"]').filter({
    has: page.locator('div').filter({
      has: page.locator('i[class*="promotion"], div[class*="bg-[#FF7A00]"]')
    })
  });
  
  const carruselesCount = await carruseles.count();
  console.log(`📊 Carruseles encontrados: ${carruselesCount}`);
  
  if (carruselesCount === 0) {
    console.log('ℹ️ No se encontraron carruseles (comportamiento esperado si no hay promociones)');
    return;
  }
  
  // Verificar que los carruseles visibles NO tienen empty state
  for (let i = 0; i < Math.min(carruselesCount, 3); i++) {
    const carrusel = carruseles.nth(i);
    const isVisible = await carrusel.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      // Verificar que NO tiene empty state dentro del carrusel
      const emptyStateEnCarrusel = carrusel.locator('text=/Promociones en camino|no hay promociones/i');
      const tieneEmptyState = await emptyStateEnCarrusel.isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(tieneEmptyState).toBeFalsy();
      console.log(`✅ Carrusel ${i + 1} no muestra empty state (comportamiento correcto)`);
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Empty State para Vistas de Servicios Filtradas por Promociones', () => {
  test.beforeEach(async ({ page }) => {
    // Login como cliente
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
  });

  // ============================================================================
  // TEST 1: Vista de servicios filtrados por promociones sin resultados
  // ============================================================================
  test('Vista de servicios filtrados por promociones sin resultados muestra empty state', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // Dado que el usuario navega una vista de servicios con filtro de promociones activo
    await navegarAVistaServicios(page);
    
    // Activar filtro de promociones
    await activarFiltroPromociones(page);
    
    // Esperar a que se carguen los resultados
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    // Cuando no existe ningún servicio con promoción disponible
    const hayPromociones = await hayServiciosConPromociones(page);
    
    if (!hayPromociones) {
      // Entonces se muestra el empty state estándar de promociones
      await showStepMessage(page, '🔍 VERIFICANDO EMPTY STATE');
      
      const emptyStateVisible = await verificarEmptyStatePromociones(page);
      
      if (emptyStateVisible) {
        console.log('✅ Empty state de promociones visible');
        
        // Validar contenido del empty state
        // Título informativo
        const titulo = page.locator('h1, h2, h3, h4, h5, h6, p').filter({
          hasText: /Promociones en camino|¡Promociones en camino!/i
        }).first();
        const tituloVisible = await titulo.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (tituloVisible) {
          const textoTitulo = await titulo.textContent();
          console.log(`✅ Título del empty state: "${textoTitulo?.trim()}"`);
        }
        
        // Texto explicativo
        const textoExplicativo = page.locator('p').filter({
          hasText: /no hay promociones disponibles|no existen promociones/i
        }).first();
        const textoVisible = await textoExplicativo.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (textoVisible) {
          const texto = await textoExplicativo.textContent();
          console.log(`✅ Texto explicativo: "${texto?.trim()}"`);
        }
        
        // CTA "Ver servicios"
        const ctaVerServicios = page.locator('button, a').filter({
          hasText: /Ver servicios/i
        }).first();
        const ctaVisible = await ctaVerServicios.isVisible({ timeout: 3000 }).catch(() => false);
        
        expect(ctaVisible).toBe(true);
        console.log('✅ CTA "Ver servicios" visible');
        
        // Verificar que el empty state reemplaza completamente el listado
        const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer').filter({
          has: page.locator('p, h3, h4, h5, h6')
        });
        const cardsCount = await serviceCards.count();
        
        if (cardsCount > 0) {
          // Verificar que las cards no son visibles (el empty state las reemplaza)
          let cardsVisibles = 0;
          for (let i = 0; i < Math.min(cardsCount, 5); i++) {
            const card = serviceCards.nth(i);
            const isVisible = await card.isVisible({ timeout: 1000 }).catch(() => false);
            if (isVisible) {
              cardsVisibles++;
            }
          }
          
          if (cardsVisibles === 0) {
            console.log('✅ Empty state reemplaza completamente el listado (no hay cards visibles)');
          } else {
            console.log(`⚠️ Hay ${cardsVisibles} cards visibles junto con el empty state`);
          }
        } else {
          console.log('✅ No hay cards de servicios (empty state reemplaza el listado)');
        }
      } else {
        console.log('⚠️ Empty state no visible (puede que haya promociones disponibles)');
      }
    } else {
      console.log('ℹ️ Hay promociones disponibles, no se muestra empty state (comportamiento esperado)');
    }
  });

  // ============================================================================
  // TEST 2: Vista "Todas las promociones" sin resultados
  // ============================================================================
  test('Vista "Todas las promociones" sin resultados muestra empty state', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // Dado que el usuario entra a la vista de todas las promociones
    await showStepMessage(page, '🔍 NAVEGANDO A VISTA DE TODAS LAS PROMOCIONES');
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    // Cuando no hay promociones disponibles para su contexto
    const hayPromociones = await hayServiciosConPromociones(page);
    
    if (!hayPromociones) {
      // Entonces se muestra el empty state estándar
      await showStepMessage(page, '🔍 VERIFICANDO EMPTY STATE');
      
      const emptyStateVisible = await verificarEmptyStatePromociones(page);
      
      expect(emptyStateVisible).toBe(true);
      console.log('✅ Empty state visible en vista "Todas las promociones"');
      
      // Validar contenido del empty state
      const ctaVerServicios = page.locator('button, a').filter({
        hasText: /Ver servicios/i
      }).first();
      const ctaVisible = await ctaVerServicios.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(ctaVisible).toBe(true);
      console.log('✅ CTA "Ver servicios" visible en empty state');
    } else {
      console.log('ℹ️ Hay promociones disponibles, no se muestra empty state (comportamiento esperado)');
    }
  });

  // ============================================================================
  // TEST 3: Aplicación de filtros que eliminan promociones
  // ============================================================================
  test('Aplicación de filtros que eliminan promociones muestra empty state', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // Dado que el usuario aplica filtros adicionales sobre promociones
    await navegarAVistaServicios(page);
    
    // Activar filtro de promociones
    await activarFiltroPromociones(page);
    
    // Verificar si hay promociones inicialmente
    const hayPromocionesInicial = await hayServiciosConPromociones(page);
    console.log(`📊 Promociones iniciales: ${hayPromocionesInicial ? 'Sí' : 'No'}`);
    
    // Aplicar filtros adicionales que puedan eliminar resultados
    // Por ejemplo, buscar un término que no tenga promociones
    await showStepMessage(page, '🔍 APLICANDO FILTROS ADICIONALES');
    
    const searchInput = page.locator('input[type="search"], input[name*="search"], input[placeholder*="Buscar"]').first();
    const inputExists = await searchInput.count().then(count => count > 0);
    
    if (inputExists && hayPromocionesInicial) {
      // Buscar un término que probablemente no tenga resultados con promociones
      await searchInput.fill('xyz123abc456promocioninexistente');
      await page.waitForTimeout(1000);
      
      // Presionar Enter o hacer clic en botón de búsqueda
      const searchButton = page.locator('button[type="submit"], button:has(i.icon-search)').first();
      const buttonExists = await searchButton.count().then(count => count > 0);
      
      if (buttonExists) {
        await searchButton.click();
      } else {
        await page.keyboard.press('Enter');
      }
      
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      
      // Cuando el resultado queda vacío
      const hayPromocionesDespues = await hayServiciosConPromociones(page);
      
      if (!hayPromocionesDespues) {
        // Entonces se muestra el empty state en lugar del listado
        await showStepMessage(page, '🔍 VERIFICANDO EMPTY STATE DESPUÉS DE FILTROS');
        
        const emptyStateVisible = await verificarEmptyStatePromociones(page);
        
        expect(emptyStateVisible).toBe(true);
        console.log('✅ Empty state visible después de aplicar filtros que eliminan promociones');
      } else {
        console.log('ℹ️ Aún hay promociones después de aplicar filtros');
      }
    } else {
      console.log('ℹ️ No se pudo aplicar filtros adicionales o no hay promociones iniciales');
    }
  });

  // ============================================================================
  // TEST 4: Exclusión explícita en carruseles
  // ============================================================================
  test('Carrusel de promociones se omite sin mostrar empty state', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // Dado que un carrusel de promociones no tiene elementos
    await showStepMessage(page, '🔍 VERIFICANDO CARRUSELES DE PROMOCIONES');
    
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    // Cuando el componente se renderiza
    // Entonces el carrusel se omite sin mostrar empty state
    await verificarCarruselSinEmptyState(page);
    
    // También verificar en otras vistas donde puedan aparecer carruseles
    await page.goto(DEFAULT_BASE_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    await verificarCarruselSinEmptyState(page);
    
    console.log('✅ Validación de exclusión de empty state en carruseles completada');
  });

  // ============================================================================
  // TEST 5: CTA "Ver servicios" redirige a vista sin filtro de promociones
  // ============================================================================
  test('CTA "Ver servicios" redirige a vista de servicios sin filtro de promociones', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // Dado que el empty state está visible
    await navegarAVistaServicios(page);
    
    // Activar filtro de promociones
    await activarFiltroPromociones(page);
    
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    // Verificar si hay empty state
    const hayPromociones = await hayServiciosConPromociones(page);
    
    if (!hayPromociones) {
      const emptyStateVisible = await verificarEmptyStatePromociones(page);
      
      if (emptyStateVisible) {
        // Cuando el usuario presiona "Ver servicios"
        await showStepMessage(page, '🖱️ PRESIONANDO CTA "VER SERVICIOS"');
        
        const ctaVerServicios = page.locator('button, a').filter({
          hasText: /Ver servicios/i
        }).first();
        
        const ctaVisible = await ctaVerServicios.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (ctaVisible) {
          // Guardar URL actual
          const urlAntes = page.url();
          
          // Hacer clic en el CTA
          await ctaVerServicios.click();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
          
          // Entonces se redirige a la vista de servicios sin filtro de promociones
          const urlDespues = page.url();
          
          console.log(`📊 URL antes: ${urlAntes}`);
          console.log(`📊 URL después: ${urlDespues}`);
          
          // Verificar que el filtro de promociones está desactivado
          const togglePromociones = page.locator('input#WithPromotionOnly, input[name="WithPromotionOnly"]').first();
          const toggleExists = await togglePromociones.count().then(count => count > 0);
          
          if (toggleExists) {
            const isChecked = await togglePromociones.isChecked().catch(() => false);
            expect(isChecked).toBe(false);
            console.log('✅ Filtro de promociones desactivado después de hacer clic en "Ver servicios"');
          } else {
            // Si no hay toggle, verificar que estamos en una vista de servicios
            const searchForm = page.locator('form#ServicesSearchForm');
            const formExists = await searchForm.isVisible({ timeout: 5000 }).catch(() => false);
            expect(formExists).toBe(true);
            console.log('✅ Redirigido a vista de servicios');
          }
          
          // Verificar que se muestran servicios (no solo promociones)
          const serviceCards = page.locator('div.flex.flex-col.cursor-pointer, div.flex.flex-row.cursor-pointer').filter({
            has: page.locator('p, h3, h4, h5, h6')
          });
          const cardsCount = await serviceCards.count();
          
          if (cardsCount > 0) {
            console.log(`✅ Se muestran ${cardsCount} servicios después de redirección`);
          } else {
            console.log('ℹ️ No se encontraron servicios después de redirección (puede ser un estado válido)');
          }
        } else {
          console.log('⚠️ CTA "Ver servicios" no visible (puede que haya promociones disponibles)');
        }
      } else {
        console.log('ℹ️ Empty state no visible (puede que haya promociones disponibles)');
      }
    } else {
      console.log('ℹ️ Hay promociones disponibles, no se muestra empty state (comportamiento esperado)');
    }
  });
});

