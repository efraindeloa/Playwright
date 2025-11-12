import { test, expect, devices } from '@playwright/test';
import { DEFAULT_BASE_URL } from '../config';

// Configuración Desktop
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Pruebas de captura - Desktop', () => {
  test('captura y valida página completa (desktop)', async ({ page }) => {
    await page.goto(`${DEFAULT_BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // compara toda la página en desktop
    await expect(page).toHaveScreenshot('homepage-desktop.png', { fullPage: true });
  });
});

