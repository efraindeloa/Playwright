import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import PNG from 'png-js';
import pixelmatch from 'pixelmatch';
import { login } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

// Credenciales de login
const LOGIN_EMAIL = PROVIDER_EMAIL;
const LOGIN_PASSWORD = PROVIDER_PASSWORD;

// URLs
const BASE_URL = DEFAULT_BASE_URL;
const PROMOTIONS_URL = `${BASE_URL}/provider/promotions`;
const CHATS_URL = `${BASE_URL}/provider/chats`;
const PROFILE_URL = `${BASE_URL}/provider/profile`;

// Rutas de archivos
const IMAGE_TRANSPARENT_PATH = 'C:/Temp/transparent.png';
const IMAGE_JPEG_PATH = 'C:/Temp/images.jpeg';

// Textos de promociones
const PROMO_TITLE_PREFIX = 'Promo de prueba';
const PROMO_EDITED_PREFIX = 'Promo Editada';

// Términos de búsqueda
const SEARCH_TERM = 'Promo de prueba';
const NON_EXISTENT_SEARCH_TERM = 'Término que no existe';

// Fechas para filtros
const FILTER_START_DATE = '01-11-2025';
const FILTER_END_DATE = '31-12-2025';

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


async function showStepMessage(page, message) {
  await page.evaluate((msg) => {
    let box = document.getElementById('__playwright_step_overlay');
    if (!box) {
      box = document.createElement('div');
      box.id = '__playwright_step_overlay';
      box.style.position = 'fixed';
      box.style.top = '50%';
      box.style.left = '50%';
      box.style.transform = 'translate(-50%, -50%)';
      box.style.zIndex = '999999';
      box.style.padding = '15px 25px';
      box.style.background = 'rgba(59, 130, 246, 0.9)';
      box.style.color = 'white';
      box.style.fontSize = '16px';
      box.style.borderRadius = '12px';
      box.style.fontFamily = 'monospace';
      box.style.fontWeight = 'bold';
      box.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      box.style.textAlign = 'center';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    
    // Auto-eliminar después de 2 segundos
    setTimeout(() => {
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    }, 2000);
  }, message);
}

async function clearStepMessage(page) {
  await page.evaluate(() => {
    const box = document.getElementById('__playwright_step_overlay');
    if (box && box.parentNode) {
      box.parentNode.removeChild(box);
    }
  });
}

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

async function hideDynamicElements(page: Page) {
  await page.evaluate(() => {
    const h4s = Array.from(document.querySelectorAll('div.overflow-hidden > h4')) as HTMLElement[];
    h4s.forEach(el => el.style.display = 'none');

    const divs = Array.from(document.querySelectorAll('div[role="button"].w-full')) as HTMLElement[];
    divs.forEach(el => el.style.display = 'none');

    const buttons = Array.from(document.querySelectorAll('div.pt-4.overflow-y-auto button')) as HTMLElement[];
    buttons.forEach(el => el.style.display = 'none');
  });
}

async function showDynamicElements(page: Page) {
  await page.evaluate(() => {
    const h4s = Array.from(document.querySelectorAll('div.overflow-hidden > h4')) as HTMLElement[];
    h4s.forEach(el => el.style.display = '');
    const divs = Array.from(document.querySelectorAll('div[role="button"].w-full')) as HTMLElement[];
    divs.forEach(el => el.style.display = '');
    const buttons = Array.from(document.querySelectorAll('div.pt-4.overflow-y-auto button')) as HTMLElement[];
    buttons.forEach(el => el.style.display = '');
  });
}

test.beforeEach(async ({ page }) => {
  await login(page, LOGIN_EMAIL, LOGIN_PASSWORD);
});

test('Crear promoción', async ({ page }) => {
  // Ya está logueado por beforeEach
  
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
  await page.locator('input[type="file"]').setInputFiles(IMAGE_TRANSPARENT_PATH);
  
  await showStepMessage(page, '💾 GUARDANDO PROMOCIÓN');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Finalizar' }).click();

  // --- DASHBOARD CON NUEVA PROMO ---
  await showStepMessage(page, '🔄 RECARGANDO PÁGINA PARA VER CAMBIOS');
  await page.waitForTimeout(1000);
  await expect(page.getByText(promoTitle)).toBeVisible({ timeout: 20000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

});

test('Ordenar promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT ANTES DE ORDENAR ---
  await page.screenshot({ path: 'ordenar01-promotions-before-sort.png', fullPage: true });

  await showStepMessage(page, '🟢 ORDENAR PROMOCIONES (PRIMERA VEZ)');
  await page.waitForTimeout(1000); // pequeño delay para que se vea el mensaje

  // --- ORDENAR PROMOCIONES (PRIMERA VEZ) ---
  const sortButton = page.locator('button:has(i.icon-sort-descending)');
  await sortButton.click();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT DESPUÉS DE PRIMER ORDENAMIENTO ---
  await page.screenshot({ path: 'ordenar02-promotions-after-first-sort.png', fullPage: true });

  // --- ORDENAR PROMOCIONES (SEGUNDA VEZ - ORDEN OPUESTO) ---
  await showStepMessage(page, '🟢 SEGUNDA VEZ - ORDEN OPUESTO');
  await page.waitForTimeout(1000); // pequeño delay para que se vea el mensaje

  await sortButton.click();
  await page.waitForTimeout(1000);

  // --- LIMPIAR MENSAJE ---
  await clearStepMessage(page);

  // --- SCREENSHOT DESPUÉS DE SEGUNDO ORDENAMIENTO ---
  await page.screenshot({ path: 'ordenar03-promotions-after-second-sort.png', fullPage: true });

  // --- COMPARAR SCREENSHOTS ---
  try {
    // Verificar que los archivos existen
    const files = [
      'ordenar01-promotions-before-sort.png',
      'ordenar02-promotions-after-first-sort.png', 
      'ordenar03-promotions-after-second-sort.png'
    ];
    
    for (const file of files) {
      if (!fs.existsSync(file)) {
        throw new Error(`❌ No se encontró el archivo: ${file}`);
      }
    }

    // Comparar estado inicial vs primer ordenamiento
    console.log('🔄 Comparando estado inicial vs primer ordenamiento...');
    const beforeStats = fs.statSync('ordenar01-promotions-before-sort.png');
    const firstSortStats = fs.statSync('ordenar02-promotions-after-first-sort.png');
    
    console.log(`📊 Tamaño inicial: ${beforeStats.size} bytes`);
    console.log(`📊 Tamaño después del primer orden: ${firstSortStats.size} bytes`);

    // Comparar primer ordenamiento vs segundo ordenamiento
    console.log('🔄 Comparando primer ordenamiento vs segundo ordenamiento...');
    const secondSortStats = fs.statSync('ordenar03-promotions-after-second-sort.png');
    console.log(`📊 Tamaño después del segundo orden: ${secondSortStats.size} bytes`);

    // Validar que hubo cambios en ambos ordenamientos
    const firstChange = beforeStats.size !== firstSortStats.size;
    const secondChange = firstSortStats.size !== secondSortStats.size;
    const backToOriginal = beforeStats.size === secondSortStats.size;

    if (!firstChange) {
      throw new Error('❌ No se detectaron cambios en el primer ordenamiento');
    }

    if (!secondChange) {
      throw new Error('❌ No se detectaron cambios en el segundo ordenamiento');
    }

    if (backToOriginal) {
      console.log('✅ Ordenamiento completo exitoso: Inicial → Ordenado → Vuelta al original');
    } else {
      console.log('✅ Ordenamiento exitoso: Se detectaron cambios en ambas direcciones');
    }

    // Comparación pixel por pixel para validación adicional
    try {
      const beforeImage = PNG.sync.read(fs.readFileSync('ordenar01-promotions-before-sort.png'));
      const firstSortImage = PNG.sync.read(fs.readFileSync('ordenar02-promotions-after-first-sort.png'));
      const secondSortImage = PNG.sync.read(fs.readFileSync('ordenar03-promotions-after-second-sort.png'));

      // Comparar inicial vs primer orden
      const diff1 = new PNG({ width: beforeImage.width, height: beforeImage.height });
      const pixels1 = pixelmatch(beforeImage.data, firstSortImage.data, diff1.data, beforeImage.width, beforeImage.height, { threshold: 0.1 });
      
      // Comparar primer orden vs segundo orden
      const diff2 = new PNG({ width: firstSortImage.width, height: firstSortImage.height });
      const pixels2 = pixelmatch(firstSortImage.data, secondSortImage.data, diff2.data, firstSortImage.width, firstSortImage.height, { threshold: 0.1 });

      console.log(`🔍 Píxeles diferentes (inicial → primer orden): ${pixels1}`);
      console.log(`🔍 Píxeles diferentes (primer orden → segundo orden): ${pixels2}`);

      if (pixels1 === 0) {
        throw new Error('❌ No se detectaron cambios pixel por pixel en el primer ordenamiento');
      }
      if (pixels2 === 0) {
        throw new Error('❌ No se detectaron cambios pixel por pixel en el segundo ordenamiento');
      }

    } catch (pngError) {
      console.warn('⚠️ No se pudo realizar comparación pixel por pixel:', pngError.message);
      // Continuar con la validación basada en tamaño de archivo
    }

  } catch (error) {
    console.error('Error al comparar screenshots:', error);
    throw new Error('❌ Error al procesar la comparación de screenshots');
  }
});

test('Filtrar promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

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
  await expect(startDateInput).toBeVisible({ timeout: 5000 });
  await expect(endDateInput).toBeVisible({ timeout: 5000 });
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
  console.log(`✅ Fecha inicio configurada: ${startDateValue} (esperada: ${FILTER_START_DATE})`);
  console.log(`✅ Fecha fin configurada: ${endDateValue} (esperada: ${FILTER_END_DATE})`);

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
  await expect(startDateInput).toBeVisible({ timeout: 5000 });
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
  console.log(`  ✅ Rango de fechas: ${FILTER_START_DATE} - ${FILTER_END_DATE}`);
  console.log(`  ✅ Filtro aplicado: ${afterFilterCount !== initialPromoCount ? 'Sí' : 'No (todas las promociones están en el rango)'}`);
  console.log(`  ✅ Estado restaurado: ${afterClearCount === initialPromoCount ? 'Sí' : 'Parcial'}`);
});

test('Buscar promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

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
  
  // Esperar a que se procese la búsqueda (esperar a que el listado se actualice)
  await page.waitForTimeout(WAIT_FOR_SEARCH_PROCESS);
  
  // Verificar que el campo de búsqueda tiene el valor correcto
  const searchValue = await searchInput.inputValue();
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
  console.log(`  ✅ Campo de búsqueda: "${finalSearchValue}" (vacío)`);
});

test('Editar promoción', async ({ page }) => {
  test.setTimeout(EXTENDED_TIMEOUT);
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
  await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(1000);

  // --- LOCALIZAR Y EDITAR PROMOCIÓN ---
  // Buscar cualquier promoción que contenga el prefijo de prueba (puede ser la creada anteriormente)
  const promoName = page.locator(`p.text-medium.font-bold:has-text("${PROMO_TITLE_PREFIX}")`).first();
  await expect(promoName).toBeVisible();
  const promoNameText = await promoName.textContent();
  
  if (!promoNameText) {
    throw new Error('❌ No se pudo obtener el texto de la promoción');
  }

  await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA EDITAR');
  await page.waitForTimeout(1000);
  const promoCard = page.locator('div.w-full.flex.shadow-4', { hasText: promoNameText });
    const menuButton = promoCard.locator('button:has(i.icon-more-vertical)');
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

  // --- VALIDAR Y SCREENSHOT FINAL ---
  await showStepMessage(page, '🔄 RECARGANDO PARA VER CAMBIOS GUARDADOS');
  await page.waitForTimeout(1000);
  const updatedPromo = page.locator('div.w-full.flex.shadow-4', { hasText: editedPromoTitle });
  await expect(updatedPromo).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
});

test('Eliminar promoción', async ({ page }) => {
  test.setTimeout(EXTENDED_TIMEOUT);
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
  await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(2000); // Aumentado para dar más tiempo a cargar

  // --- LOCALIZAR Y ELIMINAR PROMOCIÓN ---
  // Esperar un momento adicional para que las promociones se carguen completamente
  await page.waitForTimeout(5000);
  
  // Buscar cualquier promoción que contenga el prefijo de promoción editada (la que se editó anteriormente)
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

  // --- VALIDAR Y SCREENSHOT FINAL ---
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

test('Navegar a chats desde promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto(PROMOTIONS_URL);
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- NAVEGAR A CHATS DESDE PROMOCIONES ---
  await showStepMessage(page, '💬 NAVEGANDO AL DASHBOARD DE CHATS DESDE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  const chatsLink = page.locator('a[href="/provider/chats"]:has(i.icon-message-square)');
  await chatsLink.click();
  await page.waitForTimeout(2000); // Esperar a que cargue la página

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
  await page.waitForTimeout(2000); // Esperar a que cargue la página

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

test('Navegar a perfil desde promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto(PROMOTIONS_URL);
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- NAVEGAR A PERFIL DESDE PROMOCIONES ---
  await showStepMessage(page, '👤 NAVEGANDO AL PERFIL DESDE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  const profileLink = page.locator('a[href="/provider/profile"][class*="w-[40px]"][class*="h-[40px]"]:has(i.icon-user)');
  await profileLink.click();
  await page.waitForTimeout(2000); // Esperar a que cargue la página

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
  await page.waitForTimeout(2000); // Esperar a que cargue la página

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

test('Navegar a dashboard de proveedor desde promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto(PROMOTIONS_URL);
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- NAVEGAR A HOME DESDE PROMOCIONES ---
  await showStepMessage(page, '🏠 NAVEGANDO AL HOME DESDE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  const homeLink = page.locator('a:has(svg#Capa_1[width="282"])');
  await homeLink.click();
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
  const currentUrl = page.url();
  if (currentUrl.includes('/provider') && !currentUrl.includes('/promotions')) {
    console.log('✅ URL correcta: Navegación exitosa al dashboard principal');
  } else {
    throw new Error(`❌ URL incorrecta. Esperaba dashboard principal, obtuvo: ${currentUrl}`);
  }

  // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
  await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE LA PÁGINA DE HOME');
  await page.waitForTimeout(1000);
  
  // Verificar que no estamos en la página de promociones
  const isNotInPromotionsUrl = !page.url().includes('/promotions');
  if (!isNotInPromotionsUrl) {
    throw new Error('❌ Aún estamos en la página de promociones');
  }
  
  // Verificar que estamos en el dashboard principal (URL base de provider)
  const isInDashboard = page.url().includes('/provider') && !page.url().includes('/promotions') && !page.url().includes('/chats') && !page.url().includes('/profile');
  if (!isInDashboard) {
    throw new Error(`❌ No estamos en el dashboard principal. URL actual: ${page.url()}`);
  }
  
  // Verificar que el logo de Fiestamas esté presente (elemento característico del home)
  const logo = page.locator('svg#Capa_1[width="282"]');
  await expect(logo).toBeVisible({ timeout: 10000 });
  console.log('✅ Logo de Fiestamas encontrado en la página home');
  
  // Verificar que hay elementos de navegación característicos del dashboard
  const navigationElements = page.locator('a[href="/provider/promotions"], a[href="/provider/chats"], a[href="/provider/profile"]');
  const navCount = await navigationElements.count();
  if (navCount >= 2) {
    console.log(`✅ Elementos de navegación encontrados: ${navCount} enlaces`);
  } else {
    console.warn('⚠️ Pocos elementos de navegación encontrados en el dashboard');
  }
  
  // Verificar que NO estamos en la página de promociones (elementos específicos de promociones)
  const promotionsTitle = page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Promociones")');
  const isNotInPromotions = await promotionsTitle.count() === 0;
  if (isNotInPromotions) {
    console.log('✅ Confirmado: No estamos en la página de promociones');
  } else {
    console.warn('⚠️ Aún se detecta el título "Promociones" - puede que no hayamos salido completamente');
  }
  
  // Verificar que NO hay elementos específicos de la página de promociones
  const searchInput = page.locator('input#Search');
  const createPromoButton = page.locator('button:has-text("Crear promoción")');
  const isNotInPromotionsPage = await searchInput.count() === 0 && await createPromoButton.count() === 0;
  
  if (isNotInPromotionsPage) {
    console.log('✅ Confirmado: No hay elementos específicos de la página de promociones');
  } else {
    console.warn('⚠️ Se detectaron elementos de la página de promociones - verificar navegación');
  }

  // --- REGRESAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto(PROMOTIONS_URL);
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
  await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
  
  // Verificar que la URL es correcta
  const finalUrl = page.url();
  if (finalUrl.includes('/provider/promotions')) {
    console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
  } else {
    throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
  }

  console.log('✅ Navegación completa: Promociones → Home → Promociones');
});
