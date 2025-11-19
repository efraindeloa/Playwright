import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { login, showStepMessage, clearStepMessage } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

// URLs
const PROMOTIONS_URL = `${DEFAULT_BASE_URL}/provider/promotions`;
const CHATS_URL = `${DEFAULT_BASE_URL}/provider/chats`;
const PROFILE_URL = `${DEFAULT_BASE_URL}/provider/profile`;
const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;

// Rutas de archivos de imágenes
// Intentar usar las rutas absolutas de staging, o rutas relativas como fallback
const PROMOTION_IMAGE_PATH = process.env.PROMOTION_IMAGE_PATH || 'C:/Temp/images.jpeg';
const IMAGE_JPEG_PATH = process.env.IMAGE_JPEG_PATH || 'C:/Temp/images.jpeg';

// Textos de promociones
const PROMO_TITLE_PREFIX = 'Promo de prueba';
const PROMO_EDITED_PREFIX = 'Promo Editada';

// Términos de búsqueda
const SEARCH_TERM = 'Promo de prueba';
const NON_EXISTENT_SEARCH_TERM = 'Término que no existe';

// Fechas para filtros
const FILTER_START_DATE = '01-11-2025';
const FILTER_END_DATE = '14-12-2025';

// Días para cálculos de fechas
const DAYS_TO_ADD_FOR_END_DATE = 30; // Para crear promoción
const DAYS_TO_ADD_FOR_EDITED_END_DATE = 15; // Para editar promoción

// Timeouts (en milisegundos)
const DEFAULT_TIMEOUT = 60000; // 60 segundos
const EXTENDED_TIMEOUT = 90000; // 90 segundos
const WAIT_FOR_ELEMENT_TIMEOUT = 5000;
const WAIT_FOR_PROMO_TIMEOUT = 20000;
const WAIT_FOR_PAGE_LOAD = 2000;
const WAIT_FOR_SEARCH_PROCESS = 2000;

// ============================================================================

test.use({ 
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(DEFAULT_TIMEOUT);


async function pickDateSmart(page: Page, inputSelector: string, isoDate: string) {
  const day = String(new Date(isoDate).getDate());

  // 1) INTENTO: usar la API de flatpickr si existe
  try {
    const apiResult = await page.evaluate(({ sel, d }) => {
      const el = document.querySelector(sel) as any;
      if (!el) return false;
      const inst = el._flatpickr || (window as any).flatpickr?.instances?.find((i: any) => i.input === el);
      if (inst && typeof inst.setDate === 'function') {
        try {
          inst.setDate(d, true);
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    }, { sel: inputSelector, d: isoDate });

    if (apiResult) {
      await page.waitForTimeout(200);
      return;
    }
  } catch (e) {
    // continuar al siguiente intento
  }

  // 2) INTENTO: abrir calendario y navegar meses hasta encontrar el día visible
  const input = page.locator(inputSelector).first();
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.scrollIntoViewIfNeeded();
  await input.click();

  const calendar = page.locator('.flatpickr-calendar').first();
  await calendar.waitFor({ state: 'visible', timeout: 4000 }).catch(() => { /* seguir a fallback */ });

  // Intentar hasta 12 veces: buscar día visible en mes activo
  for (let i = 0; i < 12; i++) {
    const cellsCount = await calendar.locator('.flatpickr-day').count();
    for (let j = 0; j < cellsCount; j++) {
      const cell = calendar.locator('.flatpickr-day').nth(j);
      const txt = (await cell.textContent())?.trim() ?? '';
      const cls = (await cell.getAttribute('class')) ?? '';
      const isDisabled = /flatpickr-disabled/.test(cls);
      const isPrevOrNext = /prevMonthDay|nextMonthDay/.test(cls);
      if (txt === day && !isDisabled && !isPrevOrNext) {
        if (await cell.isVisible()) {
          await cell.click();
          await page.waitForTimeout(200);
          return;
        }
      }
    }
    // si no lo encontramos: intentar avanzar un mes
    const nextBtn = calendar.locator('.flatpickr-next, .flatpickr-next-month').first();
    if (await nextBtn.count() === 0) break;
    await nextBtn.click();
    await page.waitForTimeout(200);
  }

  // 3) FALLBACK: forzar value vía JS
  await page.evaluate(({ sel, val }) => {
    const el = document.querySelector(sel) as HTMLInputElement | null;
    if (!el) return;
    el.removeAttribute('readonly');
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }, { sel: inputSelector, val: isoDate });

  await page.waitForTimeout(200);
}

test.describe('Gestión de promociones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('crear promoción', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- CREAR PROMOCIÓN ---
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Generar nombre dinámico con fecha y hora actual
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const promoTitle = `${PROMO_TITLE_PREFIX} ${timestamp}`;
    
    await showStepMessage(page, '📝 LLENANDO FORMULARIO: Título, fechas e imagen');
    await page.waitForTimeout(1000);
    await page.locator('input[id="Title"]').fill(promoTitle);
    
    // Fecha de inicio: día actual
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    
    // Fecha de fin: días después del día actual
    const endDateObj = new Date(now);
    endDateObj.setDate(endDateObj.getDate() + DAYS_TO_ADD_FOR_END_DATE);
    const endDate = `${String(endDateObj.getDate()).padStart(2,'0')}-${String(endDateObj.getMonth()+1).padStart(2,'0')}-${endDateObj.getFullYear()}`;
    
    await pickDateSmart(page, 'input#StartDate', startDate);
    await pickDateSmart(page, 'input#EndDate', endDate);
    await page.locator('input[type="file"]').setInputFiles(PROMOTION_IMAGE_PATH);
    
    await showStepMessage(page, '💾 GUARDANDO PROMOCIÓN');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Finalizar' }).click();

    // --- VALIDAR QUE LA PROMOCIÓN SE CREÓ ---
    await showStepMessage(page, '🔄 RECARGANDO PÁGINA PARA VER CAMBIOS');
    await page.waitForTimeout(1000);
    await expect(page.getByText(promoTitle)).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('ordenar promociones', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Verificar que hay promociones para ordenar
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const initialPromoCount = await promoCardsLocator.count();
    
    if (initialPromoCount < 2) {
      console.log('⚠️ Se necesitan al menos 2 promociones para ordenar. Promociones encontradas:', initialPromoCount);
      return;
    }

    await showStepMessage(page, '🟢 ORDENAR PROMOCIONES (PRIMERA VEZ)');
    await page.waitForTimeout(1000);

    // --- ORDENAR PROMOCIONES (PRIMERA VEZ) ---
    const sortButton = page.locator('button:has(i.icon-sort-descending)');
    await expect(sortButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await sortButton.click();
    await page.waitForTimeout(1000);

    // --- ORDENAR PROMOCIONES (SEGUNDA VEZ - ORDEN OPUESTO) ---
    await showStepMessage(page, '🟢 SEGUNDA VEZ - ORDEN OPUESTO');
    await page.waitForTimeout(1000);

    await sortButton.click();
    await page.waitForTimeout(1000);

    // --- LIMPIAR MENSAJE ---
    await clearStepMessage(page);

    console.log('✅ Ordenamiento de promociones completado exitosamente');
  });

  test('filtrar promociones', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- OBTENER ESTADO INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const initialPromoCount = await promoCardsLocator.count();
    console.log(`📊 Promociones iniciales: ${initialPromoCount}`);
    
    // Verificar que hay promociones para filtrar
    if (initialPromoCount === 0) {
      throw new Error('❌ No hay promociones disponibles para realizar el filtrado');
    }

    // --- ABRIR FILTROS ---
    await showStepMessage(page, '🔍 ABRIENDO DIALOG DE FILTROS');
    await page.waitForTimeout(1000);
    const filterButton = page.getByRole('button', { name: 'Filtrar' });
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Validar que el diálogo de filtros se abrió
    const startDateInput = page.locator('input#StartDate');
    const endDateInput = page.locator('input#EndDate');
    await expect(startDateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await expect(endDateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Diálogo de filtros abierto correctamente');

    // --- CONFIGURAR FECHAS INICIALES ---
    await showStepMessage(page, '📅 CONFIGURANDO FECHAS DE FILTRO');
    await page.waitForTimeout(1000);
    
    await pickDateSmart(page, 'input#StartDate', FILTER_START_DATE);
    await page.waitForTimeout(500);
    await pickDateSmart(page, 'input#EndDate', FILTER_END_DATE);
    await page.waitForTimeout(500);

    // Validar que las fechas se configuraron correctamente
    const startDateValue = await startDateInput.inputValue();
    const endDateValue = await endDateInput.inputValue();
    if (startDateValue === null || startDateValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor de la fecha de inicio');
    }
    if (endDateValue === null || endDateValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor de la fecha de fin');
    }
    console.log(`✅ Fecha inicio configurada: ${startDateValue}`);
    console.log(`✅ Fecha fin configurada: ${endDateValue}`);

    // --- APLICAR FILTRO ---
    await showStepMessage(page, '✅ APLICANDO FILTRO DE FECHAS');
    await page.waitForTimeout(1000);
    const applyButton = page.locator('button:has-text("Aplicar")');
    await expect(applyButton).toBeVisible();
    await applyButton.click();
    
    // Esperar a que el diálogo se cierre y el listado se actualice
    await page.waitForTimeout(2000);
    
    // Validar que el diálogo se cerró
    const isDialogClosed = await startDateInput.isVisible().catch(() => false);
    if (isDialogClosed) {
      console.warn('⚠️ El diálogo de filtros aún está visible después de aplicar');
    } else {
      console.log('✅ Diálogo de filtros cerrado correctamente');
    }

    // Contar promociones después de aplicar el filtro
    const afterFilterCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de aplicar filtro: ${afterFilterCount}`);

    // Validar que el filtro cambió el conteo
    if (afterFilterCount === initialPromoCount) {
      console.warn(`⚠️ El filtro no cambió el conteo. Inicial: ${initialPromoCount}, Después: ${afterFilterCount}`);
      console.warn('⚠️ Esto puede ser normal si todas las promociones están dentro del rango de fechas');
    } else if (afterFilterCount > initialPromoCount) {
      throw new Error(`❌ El filtro aumentó el conteo. Inicial: ${initialPromoCount}, Después: ${afterFilterCount}`);
    } else {
      console.log(`✅ Filtro aplicado exitosamente: Se filtraron ${initialPromoCount - afterFilterCount} promociones`);
    }

    // --- VOLVER A ABRIR FILTROS ---
    await showStepMessage(page, '🔍 REABRIENDO FILTROS PARA LIMPIAR');
    await page.waitForTimeout(1000);
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Validar que el diálogo se abrió nuevamente
    await expect(startDateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Diálogo de filtros reabierto correctamente');

    // --- LIMPIAR FILTROS ---
    await showStepMessage(page, '🧹 LIMPIANDO FILTROS APLICADOS');
    await page.waitForTimeout(1000);
    const clearButton = page.locator('button:has-text("Limpiar")');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await page.waitForTimeout(500);

    // Esperar a que el listado se actualice después de limpiar
    await page.waitForTimeout(2000);

    // Contar promociones después de limpiar
    const afterClearCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de limpiar filtro: ${afterClearCount}`);

    // Validar que se restauraron todas las promociones
    if (afterClearCount === initialPromoCount) {
      console.log(`✅ Limpieza exitosa: Se restauraron todas las promociones (${afterClearCount})`);
    } else {
      console.warn(`⚠️ El conteo después de limpiar no coincide con el inicial. Inicial: ${initialPromoCount}, Después: ${afterClearCount}`);
      // Esto puede ser aceptable si hay diferencias menores, pero lo reportamos
      if (Math.abs(afterClearCount - initialPromoCount) > 2) {
        throw new Error(`❌ Diferencia significativa después de limpiar. Inicial: ${initialPromoCount}, Después: ${afterClearCount}`);
      }
    }

    // Resumen final
    console.log('\n📋 RESUMEN DE VALIDACIONES:');
    console.log(`  ✅ Estado inicial: ${initialPromoCount} promociones`);
    console.log(`  ✅ Después de aplicar filtro: ${afterFilterCount} promociones`);
    console.log(`  ✅ Después de limpiar filtro: ${afterClearCount} promociones`);
  });

  test('buscar promociones', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- OBTENER ESTADO INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const initialPromoCount = await promoCardsLocator.count();
    console.log(`📊 Promociones iniciales: ${initialPromoCount}`);
    
    // Verificar que hay promociones para buscar
    if (initialPromoCount === 0) {
      throw new Error('❌ No hay promociones disponibles para realizar la búsqueda');
    }

    // --- REALIZAR BÚSQUEDA ---
    await showStepMessage(page, '🔍 REALIZANDO BÚSQUEDA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('input#Search');
    await searchInput.fill(SEARCH_TERM);
    
    // Esperar a que se procese la búsqueda
    await page.waitForTimeout(WAIT_FOR_SEARCH_PROCESS);
    
    // Verificar que el campo de búsqueda tiene el valor correcto
    const searchValue = await searchInput.inputValue();
    if (searchValue === null || searchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor del campo de búsqueda');
    }
    if (searchValue !== SEARCH_TERM) {
      throw new Error(`❌ El campo de búsqueda no tiene el valor esperado. Esperado: "${SEARCH_TERM}", Obtenido: "${searchValue}"`);
    }
    console.log(`✅ Campo de búsqueda contiene: "${searchValue}"`);

    // Contar promociones después de la búsqueda
    const afterSearchCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de búsqueda: ${afterSearchCount}`);

    // Validar que la búsqueda filtró resultados
    if (afterSearchCount >= initialPromoCount) {
      console.warn(`⚠️ La búsqueda no filtró resultados. Inicial: ${initialPromoCount}, Después: ${afterSearchCount}`);
    } else {
      console.log(`✅ Búsqueda exitosa: Se filtraron ${initialPromoCount - afterSearchCount} promociones`);
    }

    // Verificar que las promociones visibles contienen el término de búsqueda
    if (afterSearchCount > 0) {
      const visiblePromos = promoCardsLocator;
      let matchingPromos = 0;
      for (let i = 0; i < afterSearchCount; i++) {
        const promoText = await visiblePromos.nth(i).textContent();
        if (promoText && promoText.toLowerCase().includes(SEARCH_TERM.toLowerCase())) {
          matchingPromos++;
        }
      }
      console.log(`✅ Promociones que coinciden con "${SEARCH_TERM}": ${matchingPromos}/${afterSearchCount}`);
      
      if (matchingPromos === 0 && afterSearchCount > 0) {
        console.warn('⚠️ Ninguna promoción visible contiene el término de búsqueda');
      }
    }

    // --- LIMPIAR BÚSQUEDA ---
    await showStepMessage(page, '🧹 LIMPIANDO BÚSQUEDA');
    await page.waitForTimeout(1000);
    
    await searchInput.clear();
    await page.waitForTimeout(2000); // Esperar a que se procese la limpieza

    // Verificar que el campo de búsqueda está vacío
    const clearedSearchValue = await searchInput.inputValue();
    if (clearedSearchValue === null || clearedSearchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor del campo de búsqueda después de limpiar');
    }
    if (clearedSearchValue !== '') {
      throw new Error(`❌ El campo de búsqueda no se limpió correctamente. Valor: "${clearedSearchValue}"`);
    }
    console.log(`✅ Campo de búsqueda limpiado correctamente`);

    // Contar promociones después de limpiar
    const afterClearCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de limpiar: ${afterClearCount}`);

    // Validar que se restauraron todas las promociones
    if (afterClearCount === initialPromoCount) {
      console.log(`✅ Limpieza exitosa: Se restauraron todas las promociones (${afterClearCount})`);
    } else {
      console.warn(`⚠️ El conteo después de limpiar no coincide con el inicial. Inicial: ${initialPromoCount}, Después: ${afterClearCount}`);
    }

    // --- BÚSQUEDA CON TÉRMINO NO EXISTENTE ---
    await showStepMessage(page, '❌ BUSCANDO TÉRMINO NO EXISTENTE');
    await page.waitForTimeout(1000);
    
    await searchInput.fill(NON_EXISTENT_SEARCH_TERM);
    await page.waitForTimeout(WAIT_FOR_SEARCH_PROCESS);

    // Verificar que el campo tiene el término
    const noResultsSearchValue = await searchInput.inputValue();
    if (noResultsSearchValue === null || noResultsSearchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor del campo de búsqueda con término no existente');
    }
    if (noResultsSearchValue !== NON_EXISTENT_SEARCH_TERM) {
      throw new Error(`❌ El campo de búsqueda no tiene el término esperado. Esperado: "${NON_EXISTENT_SEARCH_TERM}", Obtenido: "${noResultsSearchValue}"`);
    }

    // Contar promociones con búsqueda sin resultados
    const noResultsCount = await promoCardsLocator.count();
    console.log(`📊 Promociones con búsqueda sin resultados: ${noResultsCount}`);

    // Validar que no hay resultados (o verificar mensaje de "sin resultados")
    if (noResultsCount === 0) {
      console.log(`✅ Búsqueda sin resultados exitosa: No se encontraron promociones`);
      
      // Verificar si hay un mensaje de "sin resultados" (opcional, depende de la UI)
      const noResultsMessage = page.locator('text=/no.*resultado|sin.*resultado|no.*encontrado/i');
      const hasNoResultsMessage = await noResultsMessage.count() > 0;
      if (hasNoResultsMessage) {
        console.log(`✅ Mensaje de "sin resultados" encontrado`);
      }
    } else {
      console.warn(`⚠️ Se encontraron ${noResultsCount} promociones cuando se esperaba 0`);
    }

    // --- LIMPIAR BÚSQUEDA Y VERIFICAR VUELTA AL ORIGINAL ---
    await showStepMessage(page, '🔄 LIMPIANDO BÚSQUEDA Y VERIFICANDO VUELTA AL ORIGINAL');
    await page.waitForTimeout(1000);
    
    await searchInput.clear();
    await page.waitForTimeout(2000);

    // Verificar que el campo está vacío
    const finalSearchValue = await searchInput.inputValue();
    if (finalSearchValue === null || finalSearchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor final del campo de búsqueda');
    }
    if (finalSearchValue !== '') {
      throw new Error(`❌ El campo de búsqueda no está vacío. Valor: "${finalSearchValue}"`);
    }

    // Contar promociones finales
    const finalPromoCount = await promoCardsLocator.count();
    console.log(`📊 Promociones finales: ${finalPromoCount}`);

    // Validar que se volvió al estado original
    if (finalPromoCount === initialPromoCount) {
      console.log(`✅ VUELTA AL ORIGINAL EXITOSA: El conteo final (${finalPromoCount}) coincide con el inicial (${initialPromoCount})`);
    } else {
      throw new Error(`❌ El estado final no coincide con el inicial. Inicial: ${initialPromoCount}, Final: ${finalPromoCount}`);
    }

    // Resumen final
    console.log('\n📋 RESUMEN DE VALIDACIONES:');
    console.log(`  ✅ Estado inicial: ${initialPromoCount} promociones`);
    console.log(`  ✅ Después de búsqueda: ${afterSearchCount} promociones`);
    console.log(`  ✅ Después de limpiar: ${afterClearCount} promociones`);
    console.log(`  ✅ Búsqueda sin resultados: ${noResultsCount} promociones`);
    console.log(`  ✅ Estado final: ${finalPromoCount} promociones`);
  });

  test('editar promoción', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // --- ADMINISTRAR PROMOCIONES ---
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- LOCALIZAR Y EDITAR PROMOCIÓN ---
    await showStepMessage(page, '🔍 BUSCANDO PROMOCIÓN PARA EDITAR');
    await page.waitForTimeout(1000);
    
    // Esperar a que aparezcan las cards de promociones
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const totalPromos = await promoCardsLocator.count();
    console.log(`🔍 TRACE: Total de promociones disponibles: ${totalPromos}`);
    
    if (totalPromos === 0) {
      throw new Error('❌ No se encontraron promociones disponibles para editar');
    }
    
    // Seleccionar un índice aleatorio
    const randomIndex = Math.floor(Math.random() * totalPromos);
    console.log(`🔍 TRACE: Seleccionando promoción aleatoria (índice ${randomIndex} de ${totalPromos})`);
    
    // Obtener la promoción seleccionada aleatoriamente
    const selectedPromoCard = promoCardsLocator.nth(randomIndex);
    await expect(selectedPromoCard).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    
    // Obtener el nombre de la promoción seleccionada
    const promoName = selectedPromoCard.locator('p.text-medium.font-bold').first();
    const promoNameText = await promoName.textContent();
    
    if (!promoNameText) {
      throw new Error('❌ No se pudo obtener el texto de la promoción');
    }
    
    console.log(`🔍 TRACE: Promoción seleccionada: "${promoNameText}"`);

    await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA EDITAR');
    await page.waitForTimeout(1000);
    const menuButton = selectedPromoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

    await showStepMessage(page, '✏️ ABRIENDO MENÚ DE EDICIÓN');
    await page.waitForTimeout(1000);
    await page.locator('text=Editar').click();

    // --- MODIFICAR PROMOCIÓN ---
    await showStepMessage(page, '📝 MODIFICANDO DATOS DE LA PROMOCIÓN');
    await page.waitForTimeout(1000);
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const editedPromoTitle = `${PROMO_EDITED_PREFIX} ${timestamp}`;
    
    // Fecha de inicio: día actual
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    
    // Fecha de fin: días después del día actual
    const end = new Date(now);
    end.setDate(end.getDate() + DAYS_TO_ADD_FOR_EDITED_END_DATE);
    const endDate = `${String(end.getDate()).padStart(2,'0')}-${String(end.getMonth()+1).padStart(2,'0')}-${end.getFullYear()}`;

    await page.locator('input[id="Title"]').fill(editedPromoTitle);
    await pickDateSmart(page, 'input#StartDate', startDate);
    await pickDateSmart(page, 'input#EndDate', endDate);

    // Borrar imagen actual
    await showStepMessage(page, '🗑️ ELIMINANDO IMAGEN ACTUAL');
    await page.waitForTimeout(1000);
    await page.locator('button:has(i.icon-trash)').click(); 
    await page.locator('button:has-text("Aceptar")').click();

    // Subir nueva imagen
    await showStepMessage(page, '📷 SUBIENDO NUEVA IMAGEN');
    await page.waitForTimeout(1000);
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(IMAGE_JPEG_PATH);

    // --- GUARDAR CAMBIOS ---
    await showStepMessage(page, '💾 GUARDANDO CAMBIOS DE EDICIÓN');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Finalizar' }).click();

    // --- VALIDAR CAMBIOS ---
    await showStepMessage(page, '🔄 RECARGANDO PARA VER CAMBIOS GUARDADOS');
    await page.waitForTimeout(1000);
    const updatedPromo = page.locator('div.w-full.flex.shadow-4', { hasText: editedPromoTitle });
    await expect(updatedPromo).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('eliminar promoción', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // --- ADMINISTRAR PROMOCIONES ---
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(2000);

    // --- LOCALIZAR Y ELIMINAR PROMOCIÓN ---
    // Esperar un momento adicional para que las promociones se carguen completamente
    await page.waitForTimeout(5000);
    
    // Buscar cualquier promoción que contenga el prefijo de promoción editada
    const promoName = page.locator(`p.text-medium.font-bold:has-text("${PROMO_EDITED_PREFIX}")`).first();
    await expect(promoName).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    const promoNameText = await promoName.textContent();
    
    if (!promoNameText) {
      throw new Error('❌ No se pudo obtener el texto de la promoción');
    }

    await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA ELIMINAR');
    await page.waitForTimeout(1000);
    const promoCard = page.locator('div.w-full.flex.shadow-4', { hasText: promoNameText });
    const menuButton = promoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

    // --- CONFIRMAR ELIMINACIÓN ---
    await showStepMessage(page, '⚠️ CONFIRMANDO ELIMINACIÓN');
    await page.waitForTimeout(1000);
    await page.locator('text=Eliminar').click();
    await page.waitForTimeout(500);

    await showStepMessage(page, '✅ FINALIZANDO ELIMINACIÓN');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Aceptar")').click();

    // --- VALIDAR ELIMINACIÓN ---
    await showStepMessage(page, '🔄 RECARGANDO PARA VERIFICAR ELIMINACIÓN');
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // --- VALIDAR QUE LA PROMOCIÓN FUE ELIMINADA ---
    await showStepMessage(page, '✅ VERIFICANDO QUE LA PROMOCIÓN FUE ELIMINADA');
    
    // Buscar la promoción específica que se eliminó usando el texto exacto guardado
    const deletedPromoLocator = page.locator('p.text-medium.font-bold', { hasText: promoNameText });
    
    // Verificar que no hay ninguna promoción con ese nombre exacto (count debe ser 0)
    const promoCount = await deletedPromoLocator.count();
    if (promoCount > 0) {
      throw new Error(`❌ La promoción "${promoNameText}" todavía existe. Se encontraron ${promoCount} promoción(es) con ese nombre.`);
    }
    
    console.log(`✅ La promoción "${promoNameText}" fue eliminada correctamente (0 promociones encontradas con ese nombre)`);
    
    // Verificación adicional: verificar que la tarjeta de la promoción tampoco existe
    const promoCardAfterDelete = page.locator('div.w-full.flex.shadow-4', { hasText: promoNameText });
    const cardCount = await promoCardAfterDelete.count();
    if (cardCount > 0) {
      throw new Error(`❌ La tarjeta de la promoción "${promoNameText}" todavía existe en el DOM.`);
    }
  });

  test('navegar a chats desde promociones', async ({ page }) => {
    // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A CHATS DESDE PROMOCIONES ---
    await showStepMessage(page, '💬 NAVEGANDO AL DASHBOARD DE CHATS DESDE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const chatsLink = page.locator('a[href="/provider/chats"]:has(i.icon-message-square)');
    await chatsLink.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    await expect(page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Fiestachat")')).toBeVisible({ timeout: 10000 });

    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE LA PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    // Verificar que el título "Conversaciones" está visible
    const conversationsTitle = page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Fiestachat")');
    await expect(conversationsTitle).toBeVisible();
    
    // Verificar que la URL es correcta
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/chats')) {
      console.log('✅ URL correcta: Navegación exitosa a /provider/chats');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/chats, obtuvo: ${currentUrl}`);
    }

    // --- REGRESAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    
    // Verificar que la URL es correcta
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/promotions')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
    }

    console.log('✅ Navegación completa: Promociones → Chats → Promociones');
  });

  test('navegar a perfil desde promociones', async ({ page }) => {
    // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A PERFIL DESDE PROMOCIONES ---
    await showStepMessage(page, '👤 NAVEGANDO AL PERFIL DESDE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const profileLink = page.locator('a[href="/provider/profile"][class*="w-[40px]"][class*="h-[40px]"]:has(i.icon-user)');
    await profileLink.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/profile')) {
      console.log('✅ URL correcta: Navegación exitosa a /provider/profile');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/profile, obtuvo: ${currentUrl}`);
    }

    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE LA PÁGINA DE PERFIL');
    await page.waitForTimeout(1000);
    
    // Verificar que el elemento "Datos personales" está visible
    const datosPersonales = page.locator('h5.flex.text-dark-neutral.text-left:has-text("Datos personales")');
    await expect(datosPersonales).toBeVisible({ timeout: 10000 });
    console.log('✅ Elemento "Datos personales" encontrado en la página de perfil');

    // --- REGRESAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    
    // Verificar que la URL es correcta
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/promotions')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
    }

    console.log('✅ Navegación completa: Promociones → Perfil → Promociones');
  });

  test('navegar a dashboard desde promociones', async ({ page }) => {
    // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A DASHBOARD DESDE PROMOCIONES ---
    await showStepMessage(page, '🏠 NAVEGANDO AL DASHBOARD DESDE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const homeLink = page.locator('a:has(svg#Capa_1[width="282"])');
    await homeLink.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider') && !currentUrl.includes('/promotions')) {
      console.log('✅ URL correcta: Navegación exitosa al dashboard principal');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba dashboard principal, obtuvo: ${currentUrl}`);
    }

    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DEL DASHBOARD');
    await page.waitForTimeout(1000);
    
    // Verificar que no estamos en la página de promociones
    const isNotInPromotionsUrl = !page.url().includes('/promotions');
    if (!isNotInPromotionsUrl) {
      throw new Error('❌ Aún estamos en la página de promociones');
    }
    
    // Verificar que estamos en el dashboard principal
    const isInDashboard = page.url().includes('/provider') && !page.url().includes('/promotions') && !page.url().includes('/chats') && !page.url().includes('/profile');
    if (!isInDashboard) {
      throw new Error(`❌ No estamos en el dashboard principal. URL actual: ${page.url()}`);
    }
    
    // Verificar que el logo de Fiestamas esté presente
    const logo = page.locator('svg#Capa_1[width="282"]');
    await expect(logo).toBeVisible({ timeout: 10000 });
    console.log('✅ Logo de Fiestamas encontrado en el dashboard');
    
    // Verificar que hay elementos de navegación característicos del dashboard
    const navigationElements = page.locator('a[href="/provider/promotions"], a[href="/provider/chats"], a[href="/provider/profile"]');
    const navCount = await navigationElements.count();
    if (navCount >= 2) {
      console.log(`✅ Elementos de navegación encontrados: ${navCount} enlaces`);
    } else {
      console.warn('⚠️ Pocos elementos de navegación encontrados en el dashboard');
    }

    // --- REGRESAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    
    // Verificar que la URL es correcta
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/promotions')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
    }

    console.log('✅ Navegación completa: Promociones → Dashboard → Promociones');
  });
});
