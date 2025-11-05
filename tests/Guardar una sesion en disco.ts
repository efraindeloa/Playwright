// globalSetup.ts
import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://tusitio.com/login');
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', '1234');
  await page.click('text=Entrar');
  await page.context().storageState({ path: 'state.json' });
  await browser.close();
}

export default globalSetup;


Luego en tu config:

use: {
  storageState: 'state.json'
}