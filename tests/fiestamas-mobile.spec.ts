import { test, expect, devices } from '@playwright/test';

// Configuración Móvil (iPhone 14)
test.use({ ...devices['iPhone 14'] });

test.describe('Pruebas de captura - Mobile', () => {
  test('captura y valida página completa (móvil)', async ({ page }) => {
    await page.goto('https://fiestamas.com/');
    await page.waitForLoadState('networkidle');

    // Captura y compara toda la página en móvil
    await expect(page).toHaveScreenshot('homepage-mobile.png', { fullPage: true });
  });
});