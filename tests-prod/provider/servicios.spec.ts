import path from 'path';
import { test, expect, Page, Locator } from '@playwright/test';
import { login, uniqueSuffix } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

const SERVICES_URL = `${DEFAULT_BASE_URL}/provider/services`;
const IMAGE_FIXTURE = path.resolve(__dirname, '..', '..', 'tests', 'profile.png');

type CreatedService = {
  name: string;
};

test.use({ viewport: { width: 1280, height: 720 } });
test.setTimeout(120_000);

test.describe('Gestión de servicios en producción', () => {
test.beforeEach(async ({ page }) => {
  await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
  await page.waitForLoadState('networkidle');
  });

  test('crear, editar, desactivar y eliminar un servicio propio', async ({ page }) => {
    let currentName: string | null = null;

    try {
      const created = await createService(page);
      currentName = created.name;

      await expectServiceVisible(page, currentName);

      currentName = await editService(page, currentName);
      await expectServiceVisible(page, currentName);

      await toggleServiceAvailability(page, currentName, false);
      await toggleServiceAvailability(page, currentName, true);

      await deleteService(page, currentName);
      await expectNoServiceMatches(page, currentName);
      currentName = null;
    } finally {
      if (currentName) {
        await safeCleanup(page, currentName);
      }
      await clearSearch(page);
    }
  });
});

async function createService(page: Page): Promise<CreatedService> {
  await gotoServices(page);
  await expect(page.getByRole('button', { name: /Crear servicio/i })).toBeVisible();
  await page.getByRole('button', { name: /Crear servicio/i }).click();

  await chooseFirstCard(page);
  await chooseFirstCard(page);

  const serviceName = `Servicio QA ${uniqueSuffix('prod')}`;
  const description = `Servicio automatizado creado en producción ${new Date().toLocaleString()}`;

  await page.locator('form#ServiceDetailsForm input#Name').fill(serviceName);
  await page.locator('form#ServiceDetailsForm textarea#Description').fill(description);

  const unit = page.locator('#Units button[type="button"]').first();
  if (await unit.count()) {
    await unit.click();
  }

  await page.locator('input#MinAmount').fill('10');
  await page.locator('input#MaxAmount').fill('100');

  await submitForm(page, 'ServiceDetailsForm');

  await page.locator('form#ServicePriceConditionsForm input#Price').fill('1500');

  const paymentMethod = page.locator('#PaymentMethods button[type="button"]').first();
  if (await paymentMethod.count()) {
    await paymentMethod.click();
  }

  await page.locator('form#ServicePriceConditionsForm textarea#Conditions').fill(buildConditions(serviceName));
  await submitForm(page, 'ServicePriceConditionsForm');

  const attribute = page.locator('#Attributes input[type="checkbox"]').first();
  if (await attribute.count()) {
    const checkboxId = await attribute.getAttribute('id');
      if (checkboxId) {
        await page.locator(`label[for="${checkboxId}"]`).click();
    }
    await submitForm(page, 'ServiceAttributesForm');
  }

  const rangeSlider = page.locator('input[type="range"].style-slider').first();
  if (await rangeSlider.count()) {
    await rangeSlider.fill('1');
    await submitForm(page, 'ServiceRangeForm');
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(IMAGE_FIXTURE);
    const mediaSubmit = page.locator('button[type="submit"][form="ServiceMediaForm"]').first();
    if (await mediaSubmit.count()) {
      await expect(mediaSubmit).toBeVisible({ timeout: 10000 });
      await mediaSubmit.click();
      await page.waitForTimeout(1500);
    }
  }

  await finalizeWizard(page);

  await expect(page.getByRole('button', { name: /Siguiente/i })).toBeVisible();
  await clearSearch(page);
  await searchService(page, serviceName);

  return { name: serviceName };
}

async function editService(page: Page, originalName: string): Promise<string> {
  const newName = `${originalName} EDITADO`;

  await searchService(page, originalName);
  await openActionsMenu(page, originalName);
  await page.getByRole('menuitem', { name: /Editar/i }).click();

  const nameInput = page.locator('form#ServiceDetailsForm input#Name');
  await nameInput.fill(newName);
  await page.locator('form#ServiceDetailsForm textarea#Description').fill(
    `Descripción actualizada ${new Date().toLocaleString()}`
  );
  await submitForm(page, 'ServiceDetailsForm');

  await page.locator('form#ServicePriceConditionsForm input#Price').fill('1800');
  await submitForm(page, 'ServicePriceConditionsForm');

  const rangeSlider = page.locator('input[type="range"].style-slider').first();
  if (await rangeSlider.count()) {
    await rangeSlider.fill('2');
    await submitForm(page, 'ServiceRangeForm');
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles(IMAGE_FIXTURE);
    const mediaSubmit = page.locator('button[type="submit"][form="ServiceMediaForm"]').first();
    if (await mediaSubmit.count()) {
      await expect(mediaSubmit).toBeVisible({ timeout: 10000 });
      await mediaSubmit.click();
      await page.waitForTimeout(1500);
    }
  }

  await finalizeWizard(page);

  await clearSearch(page);
  await searchService(page, newName);

  return newName;
}

async function toggleServiceAvailability(page: Page, serviceName: string, shouldActivate: boolean) {
  await searchService(page, serviceName);
  await openActionsMenu(page, serviceName);

  const activateButton = page.getByRole('menuitem', { name: /Activar/i });
  const deactivateButton = page.getByRole('menuitem', { name: /Desactivar/i });

  if (shouldActivate) {
    if (await activateButton.count()) {
      await activateButton.click();
    }
    } else {
    if (await deactivateButton.count()) {
    await deactivateButton.click();
    }
  }

  await page.waitForTimeout(1000);
  await clearSearch(page);
}

async function deleteService(page: Page, serviceName: string) {
  await searchService(page, serviceName);
  await openActionsMenu(page, serviceName);

  await page.getByRole('menuitem', { name: /Eliminar/i }).click();

  const confirmButton = page
    .locator('button')
    .filter({ hasText: /Aceptar/i })
    .filter({ has: page.locator('i.icon-trash') })
    .first();

  if (await confirmButton.count()) {
    await confirmButton.click();
  } else {
    await page.getByRole('button', { name: /Aceptar/i }).click();
  }

  await clearSearch(page);
}

async function safeCleanup(page: Page, serviceName: string) {
  try {
    await deleteService(page, serviceName);
  } catch (err) {
    console.warn(`No se pudo eliminar el servicio "${serviceName}" durante la limpieza: ${err}`);
  }
}

async function expectServiceVisible(page: Page, serviceName: string) {
  await searchService(page, serviceName);
  const card = locateServiceCard(page, serviceName);
  await expect(card, `El servicio "${serviceName}" debe aparecer en la lista`).toBeVisible();
}

async function expectNoServiceMatches(page: Page, serviceName: string) {
  await searchService(page, serviceName);
  const cards = locateServiceCard(page, serviceName);
  await expect(cards).toHaveCount(0);
}

async function gotoServices(page: Page) {
  await page.goto(SERVICES_URL, { waitUntil: 'networkidle' });
  await expect(page.locator('input#Search')).toBeVisible();
}

async function chooseFirstCard(page: Page) {
  const options = page.locator('button.flex.flex-col').filter({ has: page.locator('p') });
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await page.waitForTimeout(600);
}

function buildConditions(serviceName: string) {
  return [
    `El servicio ${serviceName} incluye personal especializado.`,
    'Requiere confirmación con al menos 48 horas de anticipación.',
    'Pago del 30% para reservar la fecha.'
  ].join(' ');
}

async function submitForm(page: Page, formId: string) {
  const submitButton = page.locator(`button[type="submit"][form="${formId}"]`).first();
  if (await submitButton.count()) {
    await submitButton.click();
  await page.waitForTimeout(1000);
  }
}

async function searchService(page: Page, text: string) {
  await gotoServices(page);
  const searchInput = page.locator('input#Search');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(text);
  await page.waitForTimeout(1500);
}

async function clearSearch(page: Page) {
  const searchInput = page.locator('input#Search');
  if (await searchInput.count()) {
    await searchInput.fill('');
    await page.waitForTimeout(800);
  }
}

async function openActionsMenu(page: Page, serviceName: string) {
  const cards = locateServiceCard(page, serviceName);
  const count = await cards.count();
  if (count === 0) {
    throw new Error(`No se encontró el servicio "${serviceName}" para abrir el menú`);
  }
  const menuButton = cards.first().locator('button:has(i.icon-more-vertical)').first();
  await menuButton.click();
  await page.waitForTimeout(500);
}

function locateServiceCard(page: Page, serviceName: string): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByText(serviceName, { exact: false }) })
    .filter({ has: page.locator('button:has(i.icon-more-vertical)') })
    .filter({ has: page.locator('h4, h5, h6') });
}

async function finalizeWizard(page: Page) {
  const selectors = [
    'button:has-text("Finalizar")',
    'button:has-text("Ir a servicios")',
    'button:has-text("Volver a servicios")',
    'button:has-text("Regresar a servicios")'
  ];

  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.count()) {
      await expect(button).toBeVisible({ timeout: 5000 });
      await button.click();
      await page.waitForTimeout(1500);
      break;
    }
  }

  try {
    await page.waitForURL(SERVICES_URL, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    await page.waitForLoadState('networkidle');
  }
}

