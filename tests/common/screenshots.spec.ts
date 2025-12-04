import { test, expect, devices } from '@playwright/test';
import { DEFAULT_BASE_URL } from '../config';
import { showStepMessage, safeWaitForTimeout } from '../utils';

// Configuración Desktop
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Pruebas de captura - Desktop', () => {
  test('Captura y valida página completa (desktop)', async ({ page }) => {
    await showStepMessage(page, '📸 CAPTURANDO PANTALLA DE LA PÁGINA PRINCIPAL');
    console.log('🚀 Iniciando captura de pantalla de la página principal...');
    
    await page.goto(`${DEFAULT_BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 1000);

    await showStepMessage(page, '✅ VALIDANDO CAPTURA DE PANTALLA');
    console.log('📸 Capturando pantalla completa de la página...');
    
    // compara toda la página en desktop
    await expect(page).toHaveScreenshot('homepage-desktop.png', { fullPage: true });
    
    console.log('✅ Captura de pantalla completada exitosamente');
  });
});
