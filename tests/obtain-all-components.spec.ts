import { test } from '@playwright/test';
import fs from 'fs';

test('extraer DOM y guardarlo en JSON', async ({ page }) => {
  await page.goto('https://fiestamas.com/');
  await page.waitForLoadState('networkidle');

  // Evaluar el DOM completo en el navegador
  const domData = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).map(el => {
      const attrs: Record<string, string> = {};
      for (const attr of el.getAttributeNames()) {
        attrs[attr] = el.getAttribute(attr) || '';
      }
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        class: el.className || null,
        text: el.textContent?.trim().slice(0, 100) || null, // hasta 100 caracteres
        attributes: attrs
      };
    });
  });

  // Guardar en archivo JSON
  fs.writeFileSync('dom-dump.json', JSON.stringify(domData, null, 2), 'utf-8');

  console.log('✅ DOM exportado a dom-dump.json');
});


