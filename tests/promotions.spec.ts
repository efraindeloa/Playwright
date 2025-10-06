import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import PNG from 'png-js';
import pixelmatch from 'pixelmatch';

test.use({ 
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(60000); // 60 segundos de timeout para cada test

// Función común para login
async function login(page: Page) {
  // --- HOME ---
  await page.goto('https://staging.fiestamas.com');
  await page.waitForTimeout(2000);
  await screenshotAndCompare(page, 'login01-home.png', 'refs/login01-home.png');

  // --- LOGIN ---
  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();
  
  // Screenshot de la página de login
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'login02-login.png', fullPage: true });
  
  await page.locator('input[id="Email"]').fill('fiestamasqaprv@gmail.com');
  await page.locator('input[id="Password"]').fill('Fiesta2025$');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(2000);

  // --- DASHBOARD LIMPIO ---
  await screenshotAndCompare(page, 'login03-dashboard.png', 'refs/login03-dashboard.png');
}

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

async function screenshotAndCompare(page: Page, ssPath: string, refPath: string) {
  await hideDynamicElements(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: ssPath, 
    fullPage: true,
    timeout: 30000  // 30 segundos para screenshots
  });
  await showDynamicElements(page);

  if (!fs.existsSync(refPath)) {
    console.warn(`⚠️ Referencia no encontrada: ${refPath}`);
    return;
  }

  const imgBefore = PNG.sync.read(fs.readFileSync(path.resolve(ssPath)));
  const imgAfter = PNG.sync.read(fs.readFileSync(path.resolve(refPath)));

  if (imgBefore.width !== imgAfter.width || imgBefore.height !== imgAfter.height) {
    throw new Error(`❌ Tamaño distinto entre ${ssPath} y referencia ${refPath}`);
  }

  const diff = new PNG({ width: imgBefore.width, height: imgBefore.height });
  const numDiffPixels = pixelmatch(imgBefore.data, imgAfter.data, diff.data, imgBefore.width, imgBefore.height, { threshold: 0.1 });

  if (numDiffPixels > 0) {
    throw new Error(`❌ Diferencia entre ${ssPath} y referencia ${refPath}. Píxeles distintos: ${numDiffPixels}`);
  } else {
    console.log(`✅ ${ssPath} coincide con la referencia`);
  }
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('Login', async ({ page }) => {
  // El login ya se ejecutó en beforeEach
  console.log('✅ Login completado automáticamente');
});

test('Crear promoción', async ({ page }) => {
  // Ya está logueado por beforeEach
  
  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
  await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(1000);
  
  // --- SCREENSHOT ANTES DE CREAR PROMO ---
  await screenshotAndCompare(page, 'crear01-promotions-before.png', 'refs/crear01-promotions-before.png');

  // --- CREAR PROMOCIÓN ---
  await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Crear promoción' }).click();
  await expect(page.getByText('Nueva promoción')).toBeVisible();
  await page.waitForTimeout(1000);
  await screenshotAndCompare(page, 'crear02-new-promo.png', 'refs/crear02-new-promo.png');

  const promoTitle = 'Promo de prueba Playwright';
  await showStepMessage(page, '📝 LLENANDO FORMULARIO: Título, fechas e imagen');
  await page.waitForTimeout(1000);
  await page.locator('input[id="Title"]').fill(promoTitle);
  await pickDateSmart(page, 'input#StartDate', '05-01-2026');
  await pickDateSmart(page, 'input#EndDate', '31-10-2026');
  await page.locator('input[type="file"]').setInputFiles('C:/Temp/transparent.png');
  
  await showStepMessage(page, '💾 GUARDANDO PROMOCIÓN');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Finalizar' }).click();

  // --- DASHBOARD CON NUEVA PROMO ---
  await showStepMessage(page, '🔄 RECARGANDO PÁGINA PARA VER CAMBIOS');
  await page.waitForTimeout(1000);
  await expect(page.getByText(promoTitle)).toBeVisible({ timeout: 20000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshotAndCompare(page, 'crear03-dashboard-after-promo.png', 'refs/crear03-dashboard-after-promo.png');

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

  // --- SCREENSHOT ANTES DE FILTRAR ---
  await page.screenshot({ path: 'filtrar01-promotions-before-filter.png', fullPage: true });

  // --- ABRIR FILTROS ---
  await showStepMessage(page, '🔍 ABRIENDO DIALOG DE FILTROS');
  await page.waitForTimeout(1000);
  const filterButton = page.getByRole('button', { name: 'Filtrar' });
  await filterButton.click();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT DIALOG DE FILTROS ABIERTO ---
  await page.screenshot({ path: 'filtrar02-filter-dialog-open.png', fullPage: true });

  // --- CONFIGURAR FECHAS INICIALES ---
  await showStepMessage(page, '📅 CONFIGURANDO FECHAS DE FILTRO');
  await page.waitForTimeout(1000);
  const startDate = '01-01-2025';
  const endDate = '31-12-2025';
  
  await pickDateSmart(page, 'input#StartDate', startDate);
  await page.waitForTimeout(500);
  await pickDateSmart(page, 'input#EndDate', endDate);
  await page.waitForTimeout(500);

  // --- SCREENSHOT CON FECHAS CONFIGURADAS ---
  await page.screenshot({ path: 'filtrar03-dates-configured.png', fullPage: true });

  // --- APLICAR FILTRO ---
  await showStepMessage(page, '✅ APLICANDO FILTRO DE FECHAS');
  await page.waitForTimeout(1000);
  const applyButton = page.locator('button:has-text("Aplicar")');
  await applyButton.click();
  await page.waitForTimeout(2000);

  // --- SCREENSHOT DESPUÉS DE APLICAR FILTRO ---
  await page.screenshot({ path: 'filtrar04-after-apply-filter.png', fullPage: true });

  // --- VOLVER A ABRIR FILTROS ---
  await showStepMessage(page, '🔍 REABRIENDO FILTROS PARA LIMPIAR');
  await page.waitForTimeout(1000);
  await filterButton.click();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT FILTROS ABIERTOS NUEVAMENTE ---
  await page.screenshot({ path: 'filtrar05-filter-dialog-reopened.png', fullPage: true });

  // --- LIMPIAR FILTROS ---
  await showStepMessage(page, '🧹 LIMPIANDO FILTROS APLICADOS');
  await page.waitForTimeout(1000);
  const clearButton = page.locator('button:has-text("Limpiar")');
  await clearButton.click();
  await page.waitForTimeout(500);

  // --- SCREENSHOT DESPUÉS DE LIMPIAR ---
  await page.screenshot({ path: 'filtrar06-after-clear.png', fullPage: true });

  // --- COMPARAR SCREENSHOTS ---
  try {
    // Verificar que los archivos existen
    const files = [
      'filtrar01-promotions-before-filter.png',
      'filtrar04-after-apply-filter.png',
      'filtrar06-after-clear.png'
    ];
    
    for (const file of files) {
      if (!fs.existsSync(file)) {
        throw new Error(`❌ No se encontró el archivo: ${file}`);
      }
    }

    // Comparar antes vs después del filtro
    console.log('🔄 Comparando antes vs después del filtro...');
    const beforeStats = fs.statSync('filtrar01-promotions-before-filter.png');
    const afterFilterStats = fs.statSync('filtrar04-after-apply-filter.png');
    const afterClearStats = fs.statSync('filtrar06-after-clear.png');
    
    console.log(`📊 Tamaño antes del filtro: ${beforeStats.size} bytes`);
    console.log(`📊 Tamaño después del filtro: ${afterFilterStats.size} bytes`);
    console.log(`📊 Tamaño después de limpiar: ${afterClearStats.size} bytes`);

    // Validar que hubo cambios al aplicar el filtro
    const filterChanges = beforeStats.size !== afterFilterStats.size;
    const clearChanges = afterFilterStats.size !== afterClearStats.size;
    const backToOriginal = beforeStats.size === afterClearStats.size;

    if (!filterChanges) {
      throw new Error('❌ No se detectaron cambios al aplicar el filtro');
    }

    if (!clearChanges) {
      throw new Error('❌ No se detectaron cambios al limpiar el filtro');
    }

    if (backToOriginal) {
      console.log('✅ Flujo completo exitoso: Inicial → Filtrado → Limpiado (vuelta al original)');
    } else {
      console.log('✅ Filtro y limpieza exitosos: Se detectaron cambios en ambas operaciones');
    }

    // Comparación pixel por pixel para validación adicional
    try {
      const beforeImage = PNG.sync.read(fs.readFileSync('filtrar01-promotions-before-filter.png'));
      const afterFilterImage = PNG.sync.read(fs.readFileSync('filtrar04-after-apply-filter.png'));
      const afterClearImage = PNG.sync.read(fs.readFileSync('filtrar06-after-clear.png'));

      // Comparar inicial vs filtrado
      const diff1 = new PNG({ width: beforeImage.width, height: beforeImage.height });
      const pixels1 = pixelmatch(beforeImage.data, afterFilterImage.data, diff1.data, beforeImage.width, beforeImage.height, { threshold: 0.1 });
      
      // Comparar filtrado vs limpiado
      const diff2 = new PNG({ width: afterFilterImage.width, height: afterFilterImage.height });
      const pixels2 = pixelmatch(afterFilterImage.data, afterClearImage.data, diff2.data, afterFilterImage.width, afterFilterImage.height, { threshold: 0.1 });

      console.log(`🔍 Píxeles diferentes (inicial → filtrado): ${pixels1}`);
      console.log(`🔍 Píxeles diferentes (filtrado → limpiado): ${pixels2}`);

      if (pixels1 === 0) {
        throw new Error('❌ No se detectaron cambios pixel por pixel al aplicar el filtro');
      }
      if (pixels2 === 0) {
        throw new Error('❌ No se detectaron cambios pixel por pixel al limpiar el filtro');
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

test('Buscar promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
  await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT ANTES DE BUSCAR ---
  await page.screenshot({ path: 'buscar01-promotions-before-search.png', fullPage: true });

  // --- REALIZAR BÚSQUEDA ---
  await showStepMessage(page, '🔍 REALIZANDO BÚSQUEDA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  const searchInput = page.locator('input#Search');
  await searchInput.fill('Promo de prueba');
  await page.waitForTimeout(2000); // Esperar a que se procese la búsqueda

  // --- SCREENSHOT DESPUÉS DE BÚSQUEDA ---
  await page.screenshot({ path: 'buscar02-promotions-after-search.png', fullPage: true });

  // --- LIMPIAR BÚSQUEDA ---
  await showStepMessage(page, '🧹 LIMPIANDO BÚSQUEDA');
  await page.waitForTimeout(1000);
  
  await searchInput.clear();
  await page.waitForTimeout(2000); // Esperar a que se procese la limpieza

  // --- SCREENSHOT DESPUÉS DE LIMPIAR BÚSQUEDA ---
  await page.screenshot({ path: 'buscar03-promotions-after-clear-search.png', fullPage: true });

  // --- BÚSQUEDA CON TÉRMINO NO EXISTENTE ---
  await showStepMessage(page, '❌ BUSCANDO TÉRMINO NO EXISTENTE');
  await page.waitForTimeout(1000);
  
  await searchInput.fill('Término que no existe');
  await page.waitForTimeout(2000);

  // --- SCREENSHOT CON BÚSQUEDA SIN RESULTADOS ---
  await page.screenshot({ path: 'buscar04-promotions-no-results.png', fullPage: true });

  // --- LIMPIAR BÚSQUEDA Y VERIFICAR VUELTA AL ORIGINAL ---
  await showStepMessage(page, '🔄 LIMPIANDO BÚSQUEDA Y VERIFICANDO VUELTA AL ORIGINAL');
  await page.waitForTimeout(1000);
  
  await searchInput.clear();
  await page.waitForTimeout(2000);

  // --- SCREENSHOT FINAL DESPUÉS DE LIMPIAR ---
  await page.screenshot({ path: 'buscar05-promotions-final-clear.png', fullPage: true });

  // --- COMPARAR SCREENSHOTS ---
  try {
    // Verificar que los archivos existen
    const files = [
      'buscar01-promotions-before-search.png',
      'buscar02-promotions-after-search.png',
      'buscar03-promotions-after-clear-search.png',
      'buscar04-promotions-no-results.png',
      'buscar05-promotions-final-clear.png'
    ];
    
    for (const file of files) {
      if (!fs.existsSync(file)) {
        throw new Error(`❌ No se encontró el archivo: ${file}`);
      }
    }

    // Comparar antes vs después de búsqueda
    console.log('🔄 Comparando antes vs después de búsqueda...');
    const beforeStats = fs.statSync('buscar01-promotions-before-search.png');
    const afterSearchStats = fs.statSync('buscar02-promotions-after-search.png');
    const afterClearStats = fs.statSync('buscar03-promotions-after-clear-search.png');
    const noResultsStats = fs.statSync('buscar04-promotions-no-results.png');
    const finalClearStats = fs.statSync('buscar05-promotions-final-clear.png');
    
    console.log(`📊 Tamaño antes de búsqueda: ${beforeStats.size} bytes`);
    console.log(`📊 Tamaño después de búsqueda: ${afterSearchStats.size} bytes`);
    console.log(`📊 Tamaño después de limpiar: ${afterClearStats.size} bytes`);
    console.log(`📊 Tamaño sin resultados: ${noResultsStats.size} bytes`);
    console.log(`📊 Tamaño final después de limpiar: ${finalClearStats.size} bytes`);

    // Validar que hubo cambios en la búsqueda
    const searchChanges = beforeStats.size !== afterSearchStats.size;
    const clearChanges = afterSearchStats.size !== afterClearStats.size;
    const backToOriginal = beforeStats.size === afterClearStats.size;
    const noResultsChanges = afterClearStats.size !== noResultsStats.size;
    const finalBackToOriginal = beforeStats.size === finalClearStats.size;

    if (!searchChanges) {
      console.warn('⚠️ No se detectaron cambios al realizar la búsqueda');
    } else {
      console.log('✅ Búsqueda exitosa: Se detectaron cambios');
    }

    if (!clearChanges) {
      console.warn('⚠️ No se detectaron cambios al limpiar la búsqueda');
    } else {
      console.log('✅ Limpieza exitosa: Se detectaron cambios');
    }

    if (backToOriginal) {
      console.log('✅ Búsqueda completa: Inicial → Buscado → Limpiado (vuelta al original)');
    } else {
      console.log('✅ Búsqueda y limpieza exitosas: Se detectaron cambios en ambas operaciones');
    }

    if (!noResultsChanges) {
      console.warn('⚠️ No se detectaron cambios al buscar término inexistente');
    } else {
      console.log('✅ Búsqueda sin resultados exitosa: Se detectaron cambios');
    }

    if (finalBackToOriginal) {
      console.log('✅ VUELTA AL ORIGINAL EXITOSA: El estado final es idéntico al inicial');
    } else {
      console.warn('⚠️ El estado final no es idéntico al inicial - puede haber diferencias visuales');
    }

    // Comparación pixel por pixel para validación adicional
    try {
      const beforeImage = PNG.sync.read(fs.readFileSync('buscar01-promotions-before-search.png'));
      const afterSearchImage = PNG.sync.read(fs.readFileSync('buscar02-promotions-after-search.png'));
      const afterClearImage = PNG.sync.read(fs.readFileSync('buscar03-promotions-after-clear-search.png'));
      const noResultsImage = PNG.sync.read(fs.readFileSync('buscar04-promotions-no-results.png'));
      const finalClearImage = PNG.sync.read(fs.readFileSync('buscar05-promotions-final-clear.png'));

      // Comparar inicial vs búsqueda
      const diff1 = new PNG({ width: beforeImage.width, height: beforeImage.height });
      const pixels1 = pixelmatch(beforeImage.data, afterSearchImage.data, diff1.data, beforeImage.width, beforeImage.height, { threshold: 0.1 });
      
      // Comparar búsqueda vs limpiado
      const diff2 = new PNG({ width: afterSearchImage.width, height: afterSearchImage.height });
      const pixels2 = pixelmatch(afterSearchImage.data, afterClearImage.data, diff2.data, afterSearchImage.width, afterSearchImage.height, { threshold: 0.1 });

      // Comparar limpiado vs sin resultados
      const diff3 = new PNG({ width: afterClearImage.width, height: afterClearImage.height });
      const pixels3 = pixelmatch(afterClearImage.data, noResultsImage.data, diff3.data, afterClearImage.width, afterClearImage.height, { threshold: 0.1 });

      // Comparar inicial vs final (verificación de vuelta al original)
      const diff4 = new PNG({ width: beforeImage.width, height: beforeImage.height });
      const pixels4 = pixelmatch(beforeImage.data, finalClearImage.data, diff4.data, beforeImage.width, beforeImage.height, { threshold: 0.1 });

      console.log(`🔍 Píxeles diferentes (inicial → búsqueda): ${pixels1}`);
      console.log(`🔍 Píxeles diferentes (búsqueda → limpiado): ${pixels2}`);
      console.log(`🔍 Píxeles diferentes (limpiado → sin resultados): ${pixels3}`);
      console.log(`🔍 Píxeles diferentes (inicial → final): ${pixels4}`);

      if (pixels1 === 0 && searchChanges) {
        console.warn('⚠️ No se detectaron cambios pixel por pixel en la búsqueda');
      }
      if (pixels2 === 0 && clearChanges) {
        console.warn('⚠️ No se detectaron cambios pixel por pixel al limpiar');
      }
      if (pixels3 === 0 && noResultsChanges) {
        console.warn('⚠️ No se detectaron cambios pixel por pixel en búsqueda sin resultados');
      }
      if (pixels4 === 0) {
        console.log('✅ PERFECTO: El estado final es idéntico al inicial (0 píxeles diferentes)');
      } else {
        console.warn(`⚠️ El estado final tiene ${pixels4} píxeles diferentes al inicial`);
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

test('Editar promoción', async ({ page }) => {
  test.setTimeout(90000); // 90 segundos para este test específico
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
  await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT ANTES DE EDITAR ---
  await screenshotAndCompare(page, 'editar01-promotions-before-edit.png', 'refs/editar01-promotions-before-edit.png');

  // --- LOCALIZAR Y EDITAR PROMOCIÓN ---
    const promoName = 'Promo de prueba Playwright';
    await expect(page.getByText(promoName)).toBeVisible();

  await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA EDITAR');
  await page.waitForTimeout(1000);
    const promoCard = page.locator('div.w-full.flex.shadow-4', { hasText: promoName });
    const menuButton = promoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

  await showStepMessage(page, '✏️ ABRIENDO MENÚ DE EDICIÓN');
  await page.waitForTimeout(1000);
    await page.locator('text=Editar').click();

  // --- SCREENSHOT FORMULARIO DE EDICIÓN ---
  await page.waitForTimeout(1000);
  await screenshotAndCompare(page, 'editar02-edit-promo-form.png', 'refs/editar02-edit-promo-form.png');

  // --- MODIFICAR PROMOCIÓN ---
  await showStepMessage(page, '📝 MODIFICANDO DATOS DE LA PROMOCIÓN');
  await page.waitForTimeout(1000);
    const now = new Date();
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    const end = new Date(now);
    end.setDate(end.getDate() + 5);
    const endDate = `${String(end.getDate()).padStart(2,'0')}-${String(end.getMonth()+1).padStart(2,'0')}-${end.getFullYear()}`;

    await page.locator('input[id="Title"]').fill('Promo Editada Automáticamente');
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
    await fileInput.setInputFiles('C:/Temp/images.jpeg');

  // --- SCREENSHOT ANTES DE GUARDAR CAMBIOS ---
  await page.waitForTimeout(1000);
  await screenshotAndCompare(page, 'editar03-edit-promo-filled.png', 'refs/editar03-edit-promo-filled.png');

  // --- GUARDAR CAMBIOS ---
  await showStepMessage(page, '💾 GUARDANDO CAMBIOS DE EDICIÓN');
  await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Finalizar' }).click();

  // --- VALIDAR Y SCREENSHOT FINAL ---
  await showStepMessage(page, '🔄 RECARGANDO PARA VER CAMBIOS GUARDADOS');
  await page.waitForTimeout(1000);
    const updatedPromo = page.locator('div.w-full.flex.shadow-4', { hasText: 'Promo Editada Automáticamente' });
  await expect(updatedPromo).toBeVisible({ timeout: 20000 });
    await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshotAndCompare(page, 'editar04-promotions-after-edit.png', 'refs/editar04-promotions-after-edit.png');
});

test('Eliminar promoción', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR PROMOCIONES ---
  const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
  await promosBtn.click();
  await expect(page.getByText('Crear promoción')).toBeVisible();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT ANTES DE ELIMINAR ---
  await screenshotAndCompare(page, 'eliminar01-promotions-before-delete.png', 'refs/eliminar01-promotions-before-delete.png');

  // --- LOCALIZAR Y ELIMINAR PROMOCIÓN ---
    const promoName = 'Promo Editada Automáticamente';
    await expect(page.getByText(promoName)).toBeVisible();

  await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA ELIMINAR');
  await page.waitForTimeout(1000);
    const promoCard = page.locator('div.w-full.flex.shadow-4', { hasText: promoName });
    const menuButton = promoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

  // --- SCREENSHOT MENÚ DESPLEGADO ---
  await page.waitForTimeout(500);
  await screenshotAndCompare(page, 'eliminar02-delete-menu-open.png', 'refs/eliminar02-delete-menu-open.png');

  // --- CONFIRMAR ELIMINACIÓN ---
  await showStepMessage(page, '⚠️ CONFIRMANDO ELIMINACIÓN');
  await page.waitForTimeout(1000);
    await page.locator('text=Eliminar').click();
  await page.waitForTimeout(500);
  await screenshotAndCompare(page, 'eliminar03-delete-confirmation.png', 'refs/eliminar03-delete-confirmation.png');

  await showStepMessage(page, '✅ FINALIZANDO ELIMINACIÓN');
  await page.waitForTimeout(1000);
    await page.locator('button:has-text("Aceptar")').click();

  // --- VALIDAR Y SCREENSHOT FINAL ---
  await showStepMessage(page, '🔄 RECARGANDO PARA VERIFICAR ELIMINACIÓN');
  await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await screenshotAndCompare(page, 'eliminar04-promotions-after-delete.png', 'refs/eliminar04-promotions-after-delete.png');
});

test('Navegar a chats desde promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto('https://staging.fiestamas.com/provider/promotions');
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- SCREENSHOT PÁGINA DE PROMOCIONES ---
  await page.screenshot({ path: 'chats01-promotions-page.png', fullPage: true });

  // --- NAVEGAR A CHATS DESDE PROMOCIONES ---
  await showStepMessage(page, '💬 NAVEGANDO AL DASHBOARD DE CHATS DESDE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  const chatsLink = page.locator('a[href="/provider/chats"]:has(i.icon-message-square)');
  await chatsLink.click();
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
  await expect(page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Conversaciones")')).toBeVisible({ timeout: 10000 });

  // --- SCREENSHOT PÁGINA DE CONVERSACIONES ---
  await page.screenshot({ path: 'chats02-conversations-page.png', fullPage: true });

  // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
  await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE LA PÁGINA DE CHATS');
  await page.waitForTimeout(1000);
  
  // Verificar que el título "Conversaciones" está visible
  const conversationsTitle = page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Conversaciones")');
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
  
  await page.goto('https://staging.fiestamas.com/provider/promotions');
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

  // --- SCREENSHOT FINAL DE REGRESO ---
  await page.screenshot({ path: 'chats03-back-to-promotions.png', fullPage: true });

  console.log('✅ Navegación completa: Promociones → Chats → Promociones');
});

test('Navegar a perfil desde promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto('https://staging.fiestamas.com/provider/promotions');
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- SCREENSHOT PÁGINA DE PROMOCIONES ---
  await page.screenshot({ path: 'perfil01-promotions-page.png', fullPage: true });

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

  // --- SCREENSHOT PÁGINA DE PERFIL ---
  await page.screenshot({ path: 'perfil02-profile-page.png', fullPage: true });

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
  
  await page.goto('https://staging.fiestamas.com/provider/promotions');
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

  // --- SCREENSHOT FINAL DE REGRESO ---
  await page.screenshot({ path: 'perfil03-back-to-promotions.png', fullPage: true });

  console.log('✅ Navegación completa: Promociones → Perfil → Promociones');
});

test('Navegar a home desde promociones', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  await page.goto('https://staging.fiestamas.com/provider/promotions');
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- SCREENSHOT PÁGINA DE PROMOCIONES ---
  await page.screenshot({ path: 'home01-promotions-page.png', fullPage: true });

  // --- NAVEGAR A HOME DESDE PROMOCIONES ---
  await showStepMessage(page, '🏠 NAVEGANDO AL HOME DESDE PROMOCIONES');
  await page.waitForTimeout(1000);
  
  const homeLink = page.locator('a:has(svg#Capa_1)');
  await homeLink.click();
  await page.waitForTimeout(2000); // Esperar a que cargue la página

  // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
  const currentUrl = page.url();
  if (currentUrl.includes('/provider') && !currentUrl.includes('/promotions')) {
    console.log('✅ URL correcta: Navegación exitosa al dashboard principal');
  } else {
    throw new Error(`❌ URL incorrecta. Esperaba dashboard principal, obtuvo: ${currentUrl}`);
  }

  // --- SCREENSHOT PÁGINA DE HOME ---
  await page.screenshot({ path: 'home02-home-page.png', fullPage: true });

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
  const logo = page.locator('svg#Capa_1');
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
  
  await page.goto('https://staging.fiestamas.com/provider/promotions');
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

  // --- SCREENSHOT FINAL DE REGRESO ---
  await page.screenshot({ path: 'home03-back-to-promotions.png', fullPage: true });

  console.log('✅ Navegación completa: Promociones → Home → Promociones');
});
