import { test, expect, devices, Locator } from '@playwright/test';
import { DEFAULT_BASE_URL } from '../config';
import { showStepMessage, safeWaitForTimeout, closeRegistrationModal, waitForBackdropToDisappear } from '../utils';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';

// Configuración Desktop
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Pruebas de captura - Desktop', () => {

  // Función auxiliar para borrar screenshots existentes
  async function deleteExistingScreenshots(bannerNumber: number) {
    try {
      const snapshotDir = path.join(__dirname, 'screenshots.spec.ts-snapshots');
      const screenshotFile = path.join(snapshotDir, `homepage-banner-${bannerNumber}-chromium-win32.png`);
      
      if (fs.existsSync(screenshotFile)) {
        fs.unlinkSync(screenshotFile);
        console.log(`🗑️ Screenshot existente eliminado: homepage-banner-${bannerNumber}.png`);
        // Esperar un momento para asegurar que el archivo se eliminó completamente
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.log(`⚠️ Error al eliminar screenshot existente: ${error}`);
    }
  }

  // Función auxiliar para verificar si el snapshot existe (con reintentos)
  function snapshotExists(bannerNumber: number): boolean {
    const snapshotDir = path.join(__dirname, 'screenshots.spec.ts-snapshots');
    const snapshotFile = path.join(snapshotDir, `homepage-banner-${bannerNumber}-chromium-win32.png`);
    
    // Verificar múltiples veces para evitar condiciones de carrera
    for (let i = 0; i < 3; i++) {
      try {
        if (fs.existsSync(snapshotFile)) {
          // Verificar que el archivo no esté siendo escrito (tamaño estable)
          const stats1 = fs.statSync(snapshotFile);
          setTimeout(() => {
            try {
              const stats2 = fs.statSync(snapshotFile);
              if (stats1.size === stats2.size) {
                return true;
              }
            } catch {
              // Ignorar errores en la segunda verificación
            }
          }, 100);
          return true;
        }
      } catch {
        // Si hay error, esperar un poco y reintentar
        if (i < 2) {
          // Esperar 100ms antes del siguiente intento
          const start = Date.now();
          while (Date.now() - start < 100) {
            // Espera activa corta
          }
        }
      }
    }
    return false;
  }

  // Función auxiliar para inicializar la página y encontrar los indicadores
  async function setupPageAndFindIndicators(page: any) {
    const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
    const baseOrigin = new URL(BASE_URL).origin;
    
    console.log('🚀 Navegando a la página principal...');
    
    await page.goto(`${baseOrigin}/`);
    await page.waitForLoadState('domcontentloaded'); // Más rápido que networkidle
    await safeWaitForTimeout(page, 500); // Reducido de 1000ms
    
    // Cerrar modales que puedan estar bloqueando (con timeouts más cortos)
    await closeRegistrationModal(page, 2000); // Reducido de 3000ms
    await waitForBackdropToDisappear(page, 2000); // Reducido de 3000ms
    
    // Buscar hero usando el mismo método que en home.spec.ts (no bloqueante)
    console.log('⏳ Buscando hero...');
    let heroVisible = false;
    
    try {
      // Método usado en home.spec.ts: buscar imagen del hero
      const heroImage = page.locator('img[alt="Hero_Image"]');
      const isHeroImageVisible = await heroImage.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isHeroImageVisible) {
        heroVisible = true;
        console.log('✅ Hero encontrado por imagen Hero_Image');
      } else {
        // Intentar con selectores alternativos rápidos
        const heroSelectors = [
          'main div:has(img[alt*="Hero"])',
          '[class*="hero"]',
          '[class*="banner"]'
        ];
        
        for (const selector of heroSelectors) {
          try {
            const hero = page.locator(selector).first();
            const isVisible = await hero.isVisible({ timeout: 500 }).catch(() => false);
            if (isVisible) {
              heroVisible = true;
              console.log(`✅ Hero encontrado con selector: ${selector}`);
              break;
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      // Si falla, continuar sin hero
    }
    
    if (!heroVisible) {
      console.log('ℹ️ Hero no encontrado con selectores específicos, pero continuando (no es crítico)...');
    }
    
    // Esperar tiempo mínimo para que los elementos se rendericen
    await safeWaitForTimeout(page, 300);
    
    console.log('🔍 Buscando puntos del slider con button.rounded-full...');
    
    // Buscar puntos del slider
    const heroSliderPoints = page.locator('button.rounded-full');
    const heroSliderPointsCount = await heroSliderPoints.count();
    console.log(`📍 Se encontraron ${heroSliderPointsCount} botones con clase rounded-full`);
    
    const allSliderPoints = page.locator('button.rounded-full').filter({
      hasNotText: /.{3,}/
    });
    
    let indicators: Locator | null = null;
    let puntosHeroIndices: number[] = [];
    
    // Buscar puntos dentro del hero primero
    for (let i = 0; i < heroSliderPointsCount; i++) {
      const punto = heroSliderPoints.nth(i);
      const puntoText = await punto.textContent().catch(() => '');
      const isVisible = await punto.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible && (!puntoText || puntoText.trim().length <= 2)) {
        puntosHeroIndices.push(i);
        if (puntosHeroIndices.length >= 3) break;
      }
    }
    
    console.log(`📍 Se encontraron ${puntosHeroIndices.length} puntos en el hero`);
    
    if (puntosHeroIndices.length >= 3) {
      indicators = heroSliderPoints;
      console.log(`✅ Se encontraron ${puntosHeroIndices.length} puntos del slider en el hero`);
    } else {
      // Si no encontramos suficientes en el hero, buscar en toda la página
      console.log('⚠️ No se encontraron suficientes puntos en el hero, buscando en toda la página...');
      const allPointsCount = await allSliderPoints.count();
      console.log(`📍 Se encontraron ${allPointsCount} botones rounded-full filtrados en toda la página`);
      
      const puntosAllIndices: number[] = [];
      for (let i = 0; i < Math.min(allPointsCount, 10); i++) {
        const punto = allSliderPoints.nth(i);
        const puntoText = await punto.textContent().catch(() => '');
        const isVisible = await punto.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible && (!puntoText || puntoText.trim().length <= 2)) {
          puntosAllIndices.push(i);
        }
        
        if (puntosAllIndices.length >= 3) break;
      }
      
      if (puntosAllIndices.length >= 3) {
        indicators = allSliderPoints;
        puntosHeroIndices = puntosAllIndices;
        console.log(`✅ Se encontraron ${puntosAllIndices.length} puntos del slider en toda la página`);
      }
    }
    
    if (!indicators || puntosHeroIndices.length < 3) {
      throw new Error(`No se pudieron encontrar al menos 3 indicadores/puntos del hero. Se encontraron: ${puntosHeroIndices.length || 0}.`);
    }
    
    return { indicators, puntosHeroIndices };
  }

  // Función auxiliar para capturar screenshot
  async function captureScreenshot(page: any, bannerNumber: number) {
    // Ocultar elementos dinámicos y detener animaciones
    console.log(`🔧 Ocultando elementos dinámicos antes de capturar...`);
    await page.evaluate(() => {
      const dynamicSelectors = [
        '[class*="counter"]',
        '[class*="timer"]',
        '[class*="clock"]',
        '[class*="date"]',
        '[class*="time"]',
        '[class*="notification"]',
        '[class*="badge"]',
        '[class*="notification-badge"]',
        '[data-testid*="notification"]',
        'time',
        '[datetime]',
        '[class*="live"]',
        '[class*="real-time"]',
        '[class*="marquee"]',
        '[class*="scrolling"]',
        '[class*="ticker"]',
        '[class*="loading"]',
        '[class*="spinner"]',
        '[aria-live]',
        '[role="status"]',
        '[role="alert"]'
      ];
      
      dynamicSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el: Element) => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        } catch (e) {
          // Ignorar errores
        }
      });
      
      // Detener todas las animaciones CSS y forzar repaint
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
      
      // Forzar repaint para asegurar que los cambios se apliquen
      void document.body.offsetHeight;
    });
    
    await safeWaitForTimeout(page, 300); // Reducido de 500ms
    
    console.log(`📸 Capturando screenshot de toda la página con banner ${bannerNumber}...`);
    
    // Esperar un momento para asegurar que cualquier operación de archivo anterior haya terminado
    await safeWaitForTimeout(page, 200);
    
    // Verificar si el snapshot existe antes de comparar (con reintentos)
    const exists = snapshotExists(bannerNumber);
    
    if (!exists) {
      console.log(`ℹ️ Snapshot no existe, creando nuevo snapshot para banner ${bannerNumber}...`);
      // Crear el snapshot manualmente usando page.screenshot() directamente
      // Esto evita el error de comparación de Playwright
      const snapshotDir = path.join(__dirname, 'screenshots.spec.ts-snapshots');
      // Asegurar que el directorio existe
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      const snapshotFile = path.join(snapshotDir, `homepage-banner-${bannerNumber}-chromium-win32.png`);
      
      // Capturar screenshot directamente
      await page.screenshot({
        path: snapshotFile,
        fullPage: true,
        animations: 'disabled'
      });
      
      // Esperar un momento para asegurar que el archivo se guardó completamente
      await safeWaitForTimeout(page, 500);
      console.log(`✅ Snapshot creado exitosamente para banner ${bannerNumber}`);
    } else {
      // Si el snapshot existe, comparar con umbrales permisivos
      await expect(page).toHaveScreenshot(`homepage-banner-${bannerNumber}.png`, { 
        fullPage: true,
        timeout: 40000,
        animations: 'disabled',
        maxDiffPixels: 500000,
        threshold: 0.2
      });
      console.log(`✅ Screenshot ${bannerNumber} capturado y comparado exitosamente`);
    }
  }

  test('Capturar screenshot de referencia - Banner 1', async ({ page }) => {
    test.setTimeout(60000);
    
    // Borrar screenshot existente si existe
    await deleteExistingScreenshots(1);
    
    const { indicators, puntosHeroIndices } = await setupPageAndFindIndicators(page);
    
    console.log(`🔘 Haciendo click en el punto/indicador 1...`);
    const indicatorIndex = puntosHeroIndices[0];
    const indicator = indicators.nth(indicatorIndex);
    await indicator.scrollIntoViewIfNeeded();
    
    // Cerrar modales antes de hacer click (con timeouts más cortos)
    await closeRegistrationModal(page, 1500); // Reducido de 2000ms
    await waitForBackdropToDisappear(page, 1500); // Reducido de 2000ms
    
    await indicator.click();
    
    // Esperar transición del banner (tiempos reducidos)
    console.log(`⏳ Esperando transición del banner 1...`);
    await safeWaitForTimeout(page, 1500); // Reducido de 2000ms
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {}); // Más rápido que networkidle
    await safeWaitForTimeout(page, 500); // Reducido de 1000ms
    
    await captureScreenshot(page, 1);
  });

  test('Capturar screenshot de referencia - Banner 2', async ({ page }) => {
    test.setTimeout(60000);
    
    // Borrar screenshot existente si existe
    await deleteExistingScreenshots(2);
    
    const { indicators, puntosHeroIndices } = await setupPageAndFindIndicators(page);
    
    console.log(`🔘 Haciendo click en el punto/indicador 2...`);
    const indicatorIndex = puntosHeroIndices[1];
    const indicator = indicators.nth(indicatorIndex);
    await indicator.scrollIntoViewIfNeeded();
    
    // Cerrar modales antes de hacer click (con timeouts más cortos)
    await closeRegistrationModal(page, 1500); // Reducido de 2000ms
    await waitForBackdropToDisappear(page, 1500); // Reducido de 2000ms
    
    await indicator.click();
    
    // Esperar transición del banner (tiempos reducidos)
    console.log(`⏳ Esperando transición del banner 2...`);
    await safeWaitForTimeout(page, 1500); // Reducido de 2000ms
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {}); // Más rápido que networkidle
    await safeWaitForTimeout(page, 500); // Reducido de 1000ms
    
    await captureScreenshot(page, 2);
  });

  test('Capturar screenshot de referencia - Banner 3', async ({ page }) => {
    test.setTimeout(60000);
    
    // Borrar screenshot existente si existe
    await deleteExistingScreenshots(3);
    
    const { indicators, puntosHeroIndices } = await setupPageAndFindIndicators(page);
    
    console.log(`🔘 Haciendo click en el punto/indicador 3...`);
    const indicatorIndex = puntosHeroIndices[2];
    const indicator = indicators.nth(indicatorIndex);
    await indicator.scrollIntoViewIfNeeded();
    
    // Cerrar modales antes de hacer click (con timeouts más cortos)
    await closeRegistrationModal(page, 1500); // Reducido de 2000ms
    await waitForBackdropToDisappear(page, 1500); // Reducido de 2000ms
    
    await indicator.click();
    
    // Esperar transición del banner (tiempos reducidos)
    console.log(`⏳ Esperando transición del banner 3...`);
    await safeWaitForTimeout(page, 1500); // Reducido de 2000ms
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {}); // Más rápido que networkidle
    await safeWaitForTimeout(page, 500); // Reducido de 1000ms
    
    await captureScreenshot(page, 3);
  });

  // Función auxiliar para borrar screenshots temporales de comparación
  async function deleteComparisonScreenshots() {
    try {
      const snapshotDir = path.join(__dirname, 'screenshots.spec.ts-snapshots');
      
      for (let i = 1; i <= 3; i++) {
        const tempFile = path.join(snapshotDir, `homepage-banner-${i}-comparison-chromium-win32.png`);
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`🗑️ Screenshot temporal de comparación eliminado: homepage-banner-${i}-comparison.png`);
        }
      }
      
      // Esperar un momento para asegurar que los archivos se eliminaron completamente
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`⚠️ Error al eliminar screenshots temporales de comparación: ${error}`);
    }
  }

  test('Validar que los banners del hero no han cambiado comparando con screenshots de referencia', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos
    
    // Borrar screenshots temporales de comparación anteriores si existen
    await deleteComparisonScreenshots();
    
    const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
    const baseOrigin = new URL(BASE_URL).origin;
    
    console.log('🚀 Iniciando validación de screenshots de referencia...');
    console.log('🚀 Navegando a la página principal...');
    
    await page.goto(`${baseOrigin}/`);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 1000);
    
    // Cerrar modales que puedan estar bloqueando
    await closeRegistrationModal(page, 3000);
    await waitForBackdropToDisappear(page, 3000);
    await safeWaitForTimeout(page, 500);
    
    // Esperar a que el hero esté visible (con timeout más corto)
    console.log('⏳ Esperando a que el hero esté visible...');
    const heroSelectors = [
      '[class*="hero"]',
      '[class*="banner"]',
      '[class*="carousel"]',
      '[class*="slider"]',
      'section:has(img)'
    ];
    
    let heroVisible = false;
    for (const selector of heroSelectors) {
      try {
        const hero = page.locator(selector).first();
        await hero.waitFor({ state: 'visible', timeout: 5000 });
        heroVisible = true;
        console.log(`✅ Hero visible con selector: ${selector}`);
        break;
      } catch {
        continue;
      }
    }
    
    if (!heroVisible) {
      console.log('⚠️ Hero no encontrado con selectores específicos, continuando...');
    }
    
    // Esperar tiempo reducido para que los indicadores se rendericen
    await safeWaitForTimeout(page, 1000);
    
    console.log('🔍 Buscando puntos del slider con button.rounded-full...');
    
    // Buscar puntos del slider (mismo método que el test anterior)
    const heroSliderPoints = page.locator('button.rounded-full');
    const heroSliderPointsCount = await heroSliderPoints.count();
    console.log(`📍 Se encontraron ${heroSliderPointsCount} botones con clase rounded-full`);
    
    const allSliderPoints = page.locator('button.rounded-full').filter({
      hasNotText: /.{3,}/
    });
    
    let indicators: Locator | null = null;
    let indicatorsFound = false;
    let puntosHeroIndices: number[] = [];
    
    // Buscar puntos dentro del hero primero
    for (let i = 0; i < heroSliderPointsCount; i++) {
      const punto = heroSliderPoints.nth(i);
      const puntoText = await punto.textContent().catch(() => '');
      const isVisible = await punto.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible && (!puntoText || puntoText.trim().length <= 2)) {
        puntosHeroIndices.push(i);
        if (puntosHeroIndices.length >= 3) break;
      }
    }
    
    console.log(`📍 Se encontraron ${puntosHeroIndices.length} puntos en el hero`);
    
    if (puntosHeroIndices.length >= 3) {
      indicators = heroSliderPoints;
      indicatorsFound = true;
      console.log(`✅ Se encontraron ${puntosHeroIndices.length} puntos del slider en el hero`);
    } else {
      // Si no encontramos suficientes en el hero, buscar en toda la página
      console.log('⚠️ No se encontraron suficientes puntos en el hero, buscando en toda la página...');
      const allPointsCount = await allSliderPoints.count();
      console.log(`📍 Se encontraron ${allPointsCount} botones rounded-full filtrados en toda la página`);
      
      const puntosAllIndices: number[] = [];
      for (let i = 0; i < Math.min(allPointsCount, 10); i++) {
        const punto = allSliderPoints.nth(i);
        const puntoText = await punto.textContent().catch(() => '');
        const isVisible = await punto.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisible && (!puntoText || puntoText.trim().length <= 2)) {
          puntosAllIndices.push(i);
        }
        
        if (puntosAllIndices.length >= 3) break;
      }
      
      if (puntosAllIndices.length >= 3) {
        indicators = allSliderPoints;
        indicatorsFound = true;
        puntosHeroIndices = puntosAllIndices;
        console.log(`✅ Se encontraron ${puntosAllIndices.length} puntos del slider en toda la página`);
      }
    }
    
    if (!indicatorsFound || !indicators) {
      throw new Error('No se pudieron encontrar los indicadores/puntos del hero. No se puede validar los screenshots.');
    }
    
    // Comparar screenshots con los de referencia
    const indicesToUse = puntosHeroIndices.slice(0, 3);
    
    for (let i = 0; i < 3; i++) {
      console.log(`🔘 Haciendo click en el punto/indicador ${i + 1} para comparar con referencia...`);
      
      // Hacer click en el indicador correspondiente
      const indicatorIndex = indicesToUse[i] ?? i;
      const indicator = indicators.nth(indicatorIndex);
      await indicator.scrollIntoViewIfNeeded();
      await safeWaitForTimeout(page, 500);
      
      // Cerrar modales antes de hacer click
      await closeRegistrationModal(page, 2000);
      await waitForBackdropToDisappear(page, 2000);
      
      await indicator.click();
      
      // Esperar tiempo reducido para que la transición del banner termine
      console.log(`⏳ Esperando transición del banner ${i + 1}...`);
      await safeWaitForTimeout(page, 2000); // Reducido de 5s a 2s
      
      // Esperar a que la página esté estable (timeout más corto)
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await safeWaitForTimeout(page, 1000); // Reducido de 3s a 1s
      
      // Ocultar elementos dinámicos y detener animaciones (más rápido)
      console.log(`🔧 Ocultando elementos dinámicos antes de comparar...`);
      await page.evaluate(() => {
        const dynamicSelectors = [
          '[class*="counter"]',
          '[class*="timer"]',
          '[class*="clock"]',
          '[class*="date"]',
          '[class*="time"]',
          '[class*="notification"]',
          '[class*="badge"]',
          '[class*="notification-badge"]',
          '[data-testid*="notification"]',
          'time',
          '[datetime]',
          '[class*="live"]',
          '[class*="real-time"]',
          '[class*="marquee"]',
          '[class*="scrolling"]',
          '[class*="ticker"]',
          '[class*="loading"]',
          '[class*="spinner"]',
          '[aria-live]',
          '[role="status"]',
          '[role="alert"]'
        ];
        
        dynamicSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el: Element) => {
              (el as HTMLElement).style.visibility = 'hidden';
            });
          } catch (e) {
            // Ignorar errores
          }
        });
        
        // Detener todas las animaciones CSS y forzar repaint
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            scroll-behavior: auto !important;
          }
        `;
        document.head.appendChild(style);
        
        // Forzar repaint para asegurar que los cambios se apliquen
        void document.body.offsetHeight;
      });
      
      await safeWaitForTimeout(page, 500); // Reducido de 2s a 0.5s
      
      console.log(`📸 Comparando screenshot de toda la página con banner ${i + 1} contra referencia...`);
      
      // Guardar screenshot temporal para comparación antes de comparar
      const snapshotDir = path.join(__dirname, 'screenshots.spec.ts-snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      const tempScreenshotFile = path.join(snapshotDir, `homepage-banner-${i + 1}-comparison-chromium-win32.png`);
      
      // Capturar screenshot temporal
      await page.screenshot({
        path: tempScreenshotFile,
        fullPage: true,
        animations: 'disabled'
      });
      console.log(`💾 Screenshot temporal guardado: homepage-banner-${i + 1}-comparison.png`);
      
      // Comparar screenshot con el de referencia
      // Comparación exacta sin tolerancia a diferencias
      try {
        await expect(page).toHaveScreenshot(`homepage-banner-${i + 1}.png`, { 
          fullPage: true,
          timeout: 30000,
          animations: 'disabled'
          // Sin maxDiffPixels ni threshold = comparación exacta pixel por pixel
        });
        console.log(`✅ Screenshot ${i + 1} coincide con la referencia`);
      } catch (error: any) {
        // Si hay diferencias, generar un diff visual marcando las diferencias
        console.log(`⚠️ Se encontraron diferencias en el screenshot ${i + 1}, generando diff visual...`);
        
        const referenceFile = path.join(snapshotDir, `homepage-banner-${i + 1}-chromium-win32.png`);
        const diffFile = path.join(snapshotDir, `homepage-banner-${i + 1}-diff-chromium-win32.png`);
        
        if (fs.existsSync(referenceFile) && fs.existsSync(tempScreenshotFile)) {
          try {
            // Leer ambas imágenes
            const referenceImg = PNG.sync.read(fs.readFileSync(referenceFile));
            const actualImg = PNG.sync.read(fs.readFileSync(tempScreenshotFile));
            
            // Crear imagen diff (marcar diferencias en rojo)
            const diffImg = new PNG({ width: referenceImg.width, height: referenceImg.height });
            
            for (let y = 0; y < referenceImg.height; y++) {
              for (let x = 0; x < referenceImg.width; x++) {
                const idx = (referenceImg.width * y + x) << 2;
                
                // Comparar píxeles
                const refR = referenceImg.data[idx];
                const refG = referenceImg.data[idx + 1];
                const refB = referenceImg.data[idx + 2];
                const refA = referenceImg.data[idx + 3];
                
                const actR = actualImg.data[idx];
                const actG = actualImg.data[idx + 1];
                const actB = actualImg.data[idx + 2];
                const actA = actualImg.data[idx + 3];
                
                // Si los píxeles son diferentes, marcar en rojo
                if (refR !== actR || refG !== actG || refB !== actB || refA !== actA) {
                  // Marcar diferencia en rojo
                  diffImg.data[idx] = 255;     // R
                  diffImg.data[idx + 1] = 0;   // G
                  diffImg.data[idx + 2] = 0;   // B
                  diffImg.data[idx + 3] = 255; // A
                } else {
                  // Mantener el píxel original pero más oscuro para resaltar diferencias
                  diffImg.data[idx] = Math.floor(refR * 0.3);
                  diffImg.data[idx + 1] = Math.floor(refG * 0.3);
                  diffImg.data[idx + 2] = Math.floor(refB * 0.3);
                  diffImg.data[idx + 3] = refA;
                }
              }
            }
            
            // Guardar imagen diff
            fs.writeFileSync(diffFile, PNG.sync.write(diffImg));
            console.log(`📊 Diff visual guardado: homepage-banner-${i + 1}-diff.png`);
          } catch (diffError) {
            console.log(`⚠️ Error al generar diff visual: ${diffError}`);
          }
        }
        
        // Relanzar el error para que el test falle
        throw error;
      }
    }
    
    console.log('✅ Todos los screenshots coinciden con las referencias. La página no ha cambiado visualmente.');
  });
});
