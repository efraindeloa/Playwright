import { test, expect, devices } from '@playwright/test';

// Configuración Desktop
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Pruebas de captura - Desktop', () => {
  test('captura y valida página completa (desktop)', async ({ page }) => {
    await page.goto('https://staging.fiestamas.com/');
    await page.waitForLoadState('networkidle');

    // compara toda la página en desktop
    await expect(page).toHaveScreenshot('homepage-desktop.png', { fullPage: true });
  });
});

