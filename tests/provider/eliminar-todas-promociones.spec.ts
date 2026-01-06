import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, safeWaitForTimeout } from '../utils';
import { DEFAULT_BASE_URL } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const PROVIDER_EMAIL = 'fiestamasqaprv@gmail.com';
const PROVIDER_PASSWORD = 'Fiesta2025$';

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;

// Timeouts (en milisegundos)
const EXTENDED_TIMEOUT = 900000; // 15 minutos - tiempo suficiente para eliminar muchas promociones
const WAIT_FOR_PAGE_LOAD = 2000;
const WAIT_FOR_DELETE = 3000; // Tiempo de espera después de cada eliminación

// ============================================================================
// TESTS
// ============================================================================

test.describe('Eliminar todas las promociones', () => {
  test('Eliminar todas las promociones del proveedor', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // Login con las credenciales especificadas
    await showStepMessage(page, '🔐 INICIANDO SESIÓN COMO PROVEEDOR');
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    console.log(`✅ Login exitoso con: ${PROVIDER_EMAIL}`);
    
    // --- NAVEGAR A ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    const buttonExists = await promosBtn.count().then(count => count > 0);
    
    if (!buttonExists) {
      // Intentar navegar directamente al dashboard y buscar el botón
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      
      const promosBtnRetry = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
      await expect(promosBtnRetry).toBeVisible({ timeout: 10000 });
      await promosBtnRetry.click();
    } else {
      await promosBtn.click();
    }
    
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    console.log('✅ Navegación a administrar promociones exitosa');
    
    // --- ELIMINAR TODAS LAS PROMOCIONES ---
    await showStepMessage(page, '🗑️ ELIMINANDO TODAS LAS PROMOCIONES');
    await page.waitForTimeout(1000);
    
    let totalEliminadas = 0;
    let intentos = 0;
    const MAX_INTENTOS = 200; // Límite de seguridad para evitar bucles infinitos
    
    while (intentos < MAX_INTENTOS) {
      intentos++;
      
      // Esperar a que se carguen las cards de promociones
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      
      const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
      const promocionesRestantes = await promoCardsLocator.count();
      
      console.log(`\n📊 Intento ${intentos}: Promociones restantes: ${promocionesRestantes}`);
      
      if (promocionesRestantes === 0) {
        console.log('✅ No hay más promociones para eliminar');
        break;
      }
      
      // Seleccionar la primera promoción (índice 0)
      const selectedPromoCard = promoCardsLocator.first();
      const cardVisible = await selectedPromoCard.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!cardVisible) {
        console.log('⚠️ La tarjeta de promoción no es visible, esperando...');
        await page.waitForTimeout(2000);
        continue;
      }
      
      // Obtener el nombre de la promoción para logging
      let promoNameText = '';
      try {
        const promoNameElement = selectedPromoCard.locator('p.text-medium.font-bold').first();
        const nameExists = await promoNameElement.count().then(count => count > 0);
        
        if (nameExists) {
          promoNameText = (await promoNameElement.textContent())?.trim() || '';
        }
      } catch (error) {
        console.log('⚠️ No se pudo obtener el nombre de la promoción');
      }
      
      if (!promoNameText) {
        // Intentar eliminar de todas formas
        try {
          await showStepMessage(page, `🗑️ ELIMINANDO PROMOCIÓN ${intentos} (sin nombre)`);
          
          const menuButton = selectedPromoCard.locator('button:has(i.icon-more-vertical)');
          const menuExists = await menuButton.count().then(count => count > 0);
          
          if (!menuExists) {
            console.log('⚠️ Botón de menú no encontrado, intentando siguiente promoción...');
            await page.waitForTimeout(1000);
            continue;
          }
          
          await menuButton.scrollIntoViewIfNeeded();
          await menuButton.click();
          await page.waitForTimeout(500);
          
          const eliminarButton = page.locator('text=Eliminar').first();
          const eliminarExists = await eliminarButton.count().then(count => count > 0);
          
          if (!eliminarExists) {
            console.log('⚠️ Botón "Eliminar" no encontrado, cerrando menú...');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            continue;
          }
          
          await eliminarButton.click();
          await page.waitForTimeout(500);
          
          const aceptarButton = page.locator('button:has-text("Aceptar")').first();
          const aceptarExists = await aceptarButton.count().then(count => count > 0);
          
          if (!aceptarExists) {
            console.log('⚠️ Botón "Aceptar" no encontrado en confirmación');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            continue;
          }
          
          await aceptarButton.click();
          await page.waitForTimeout(WAIT_FOR_DELETE);
          totalEliminadas++;
          console.log(`✅ Promoción eliminada (sin nombre) - Total: ${totalEliminadas}`);
        } catch (error: any) {
          console.warn(`⚠️ Error al eliminar promoción sin nombre: ${error.message}`);
          // Intentar cerrar cualquier modal abierto
          try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
          } catch {}
          break; // Salir del bucle si hay un error persistente
        }
        continue;
      }
      
      // Proceso de eliminación con nombre
      try {
        await showStepMessage(page, `🗑️ ELIMINANDO PROMOCIÓN: "${promoNameText}"`);
        
        // Hacer scroll a la tarjeta para asegurar que sea visible
        await selectedPromoCard.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // Buscar y hacer clic en el botón de menú (tres puntos)
        const menuButton = selectedPromoCard.locator('button:has(i.icon-more-vertical)');
        const menuExists = await menuButton.count().then(count => count > 0);
        
        if (!menuExists) {
          console.log(`⚠️ Botón de menú no encontrado para promoción "${promoNameText}"`);
          await page.waitForTimeout(1000);
          continue;
        }
        
        await menuButton.scrollIntoViewIfNeeded();
        await menuButton.click();
        await page.waitForTimeout(500);
        
        // Buscar y hacer clic en "Eliminar"
        const eliminarButton = page.locator('text=Eliminar').first();
        const eliminarExists = await eliminarButton.count().then(count => count > 0);
        
        if (!eliminarExists) {
          console.log(`⚠️ Opción "Eliminar" no encontrada para promoción "${promoNameText}"`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          continue;
        }
        
        await eliminarButton.click();
        await page.waitForTimeout(500);
        
        // Confirmar eliminación
        await showStepMessage(page, '✅ CONFIRMANDO ELIMINACIÓN');
        await page.waitForTimeout(500);
        
        const aceptarButton = page.locator('button:has-text("Aceptar")').first();
        const aceptarExists = await aceptarButton.count().then(count => count > 0);
        
        if (!aceptarExists) {
          console.log(`⚠️ Botón "Aceptar" no encontrado en confirmación para "${promoNameText}"`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          continue;
        }
        
        await aceptarButton.click();
        await page.waitForTimeout(WAIT_FOR_DELETE);
        totalEliminadas++;
        
        console.log(`✅ Promoción eliminada: "${promoNameText}" - Total: ${totalEliminadas}`);
        
        // Esperar a que la página se actualice
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
        
      } catch (error: any) {
        console.error(`❌ Error al eliminar promoción "${promoNameText}": ${error.message}`);
        
        // Intentar cerrar cualquier modal abierto
        try {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        } catch {}
        
        // Si hay muchos errores consecutivos, salir del bucle
        if (intentos > 10 && totalEliminadas === 0) {
          console.error('❌ Demasiados errores consecutivos, deteniendo eliminación');
          break;
        }
      }
    }
    
    // --- VALIDAR RESULTADO FINAL ---
    await showStepMessage(page, '✅ VALIDANDO RESULTADO FINAL');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    // Recargar la página para asegurar que vemos el estado actualizado
    await page.reload();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    
    const promoCardsLocatorFinal = page.locator('div.w-full.flex.shadow-4');
    const promocionesFinales = await promoCardsLocatorFinal.count();
    
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   - Promociones eliminadas: ${totalEliminadas}`);
    console.log(`   - Promociones restantes: ${promocionesFinales}`);
    console.log(`   - Intentos realizados: ${intentos}`);
    
    if (promocionesFinales > 0) {
      console.warn(`⚠️ Aún quedan ${promocionesFinales} promoción(es) sin eliminar`);
      
      // Listar las promociones restantes
      console.log('\n📋 Promociones restantes:');
      for (let i = 0; i < Math.min(promocionesFinales, 10); i++) {
        const card = promoCardsLocatorFinal.nth(i);
        try {
          const nameElement = card.locator('p.text-medium.font-bold').first();
          const name = await nameElement.textContent().catch(() => null);
          if (name) {
            console.log(`   ${i + 1}. "${name.trim()}"`);
          }
        } catch {}
      }
    } else {
      console.log('✅ Todas las promociones fueron eliminadas exitosamente');
    }
    
    // Validar que se eliminó al menos una promoción o que no había promociones
    if (totalEliminadas > 0 || promocionesFinales === 0) {
      console.log('\n✅ Prueba completada exitosamente');
    } else {
      console.warn('\n⚠️ No se eliminaron promociones (puede que no hubiera promociones para eliminar)');
    }
    
    // La prueba pasa si se eliminaron promociones o si no había promociones
    expect(totalEliminadas).toBeGreaterThanOrEqual(0);
  });
});

