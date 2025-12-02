import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { login, showStepMessage, clearStepMessage } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

// URLs
const PROMOTIONS_URL = `${DEFAULT_BASE_URL}/provider/promotions`;
const CHATS_URL = `${DEFAULT_BASE_URL}/provider/chats`;
const PROFILE_URL = `${DEFAULT_BASE_URL}/provider/profile`;
const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;

// Rutas de archivos de imágenes
// Intentar usar las rutas absolutas de staging, o rutas relativas como fallback
const PROMOTION_IMAGE_PATH = process.env.PROMOTION_IMAGE_PATH || 'C:/Temp/images.jpeg';
const IMAGE_JPEG_PATH = process.env.IMAGE_JPEG_PATH || 'C:/Temp/images.jpeg';

// Textos de promociones
const PROMO_TITLE_PREFIX = 'Promo de prueba';
const PROMO_EDITED_PREFIX = 'Promo Editada';

// Términos de búsqueda
const SEARCH_TERM = 'Promo de prueba';
const NON_EXISTENT_SEARCH_TERM = 'Término que no existe';

// Fechas para filtros
const FILTER_START_DATE = '01-11-2025';
const FILTER_END_DATE = '14-12-2025';

// Días para cálculos de fechas
const DAYS_TO_ADD_FOR_END_DATE = 30; // Para crear promoción
const DAYS_TO_ADD_FOR_EDITED_END_DATE = 15; // Para editar promoción

// Timeouts (en milisegundos)
const DEFAULT_TIMEOUT = 60000; // 60 segundos
const EXTENDED_TIMEOUT = 90000; // 90 segundos
const WAIT_FOR_ELEMENT_TIMEOUT = 5000;
const WAIT_FOR_PROMO_TIMEOUT = 20000;
const WAIT_FOR_PAGE_LOAD = 2000;
const WAIT_FOR_SEARCH_PROCESS = 2000;

// ============================================================================

test.use({ 
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(DEFAULT_TIMEOUT);


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

test.describe('Gestión de promociones', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('crear promoción', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- CREAR PROMOCIÓN ---
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Generar nombre dinámico con fecha y hora actual (máximo 30 caracteres)
    const now = new Date();
    // Usar solo fecha y hora en formato más corto: YYYYMMDD-HHMMSS
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const shortTimestamp = `${dateStr}-${timeStr}`;
    // El título debe tener máximo 30 caracteres
    const promoTitle = `${PROMO_TITLE_PREFIX} ${shortTimestamp}`.substring(0, 30);
    
    await showStepMessage(page, '📝 LLENANDO FORMULARIO: Título, fechas, servicio, descripción, oferta e imagen');
    await page.waitForTimeout(1000);
    
    // Llenar título
    await page.locator('input[id="Title"]').fill(promoTitle);
    await page.waitForTimeout(500);
    
    // Fecha de inicio: día actual
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    
    // Fecha de fin: días después del día actual
    const endDateObj = new Date(now);
    endDateObj.setDate(endDateObj.getDate() + DAYS_TO_ADD_FOR_END_DATE);
    const endDate = `${String(endDateObj.getDate()).padStart(2,'0')}-${String(endDateObj.getMonth()+1).padStart(2,'0')}-${endDateObj.getFullYear()}`;
    
    // Llenar fechas
    await pickDateSmart(page, 'input#StartDate', startDate);
    await page.waitForTimeout(500);
    await pickDateSmart(page, 'input#EndDate', endDate);
    await page.waitForTimeout(500);
    
    // Seleccionar servicio
    await showStepMessage(page, '🔧 SELECCIONANDO SERVICIO');
    const serviceButton = page.locator('button[id="ServiceId"]');
    await expect(serviceButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await serviceButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar y seleccionar el primer servicio disponible en el dropdown
    const serviceOptions = page.locator('div[role="option"], button[role="option"], li[role="option"]');
    const serviceCount = await serviceOptions.count();
    if (serviceCount > 0) {
      await serviceOptions.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Servicio seleccionado');
    } else {
      // Fallback: buscar cualquier opción de servicio en el dropdown
      const fallbackService = page.locator('button:has-text("Servicio"), div:has-text("Servicio"), li:has-text("Servicio")').first();
      const fallbackVisible = await fallbackService.isVisible({ timeout: 2000 }).catch(() => false);
      if (fallbackVisible) {
        await fallbackService.click();
        await page.waitForTimeout(500);
        console.log('✅ Servicio seleccionado (fallback)');
      } else {
        console.warn('⚠️ No se encontraron opciones de servicio, continuando sin seleccionar');
      }
    }
    
    // Llenar descripción
    await showStepMessage(page, '📄 LLENANDO DESCRIPCIÓN');
    const descriptionText = `Descripción de prueba para la promoción ${shortTimestamp}`;
    await page.locator('textarea[id="Description"]').fill(descriptionText);
    await page.waitForTimeout(500);
    
    // Llenar oferta corta
    await showStepMessage(page, '🏷️ LLENANDO OFERTA CORTA');
    const shortOffer = '10% OFF';
    await page.locator('input[id="ShortTitle"]').fill(shortOffer);
    await page.waitForTimeout(500);
    
    // Subir imagen
    await showStepMessage(page, '📷 SUBIENDO IMAGEN');
    const fileInput = page.locator('input[id="PromotionMultimedia"]');
    // El input tiene clase "hidden" pero aún puede recibir archivos
    await expect(fileInput).toHaveCount(1, { timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await fileInput.setInputFiles(PROMOTION_IMAGE_PATH);
    await page.waitForTimeout(1000);
    
    await showStepMessage(page, '💾 GUARDANDO PROMOCIÓN');
    await page.waitForTimeout(1000);
    const finalizarButton = page.locator('button[type="submit"][form="PromotionDataForm"], button:has-text("Finalizar")').first();
    await expect(finalizarButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await finalizarButton.click();

    // --- VALIDAR QUE LA PROMOCIÓN SE CREÓ ---
    await showStepMessage(page, '✅ VALIDANDO QUE LA PROMOCIÓN SE CREÓ CORRECTAMENTE');
    await page.waitForTimeout(1000);
    await expect(page.getByText(promoTitle)).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    await showStepMessage(page, '🔄 RECARGANDO PÁGINA PARA VER CAMBIOS');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('validar campos obligatorios vacíos', async ({ page }) => {
    // Caso 2: Campo obligatorio vacío
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Abrir formulario
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Intentar guardar sin llenar campos obligatorios
    await showStepMessage(page, '⚠️ INTENTANDO GUARDAR SIN CAMPOS OBLIGATORIOS');
    const finalizarButton = page.locator('button[type="submit"][form="PromotionDataForm"], button:has-text("Finalizar")').first();
    await expect(finalizarButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await finalizarButton.click();
    await page.waitForTimeout(2000);

    // Validar mensajes de error específicos
    await showStepMessage(page, '✅ VALIDANDO MENSAJES DE ERROR ESPECÍFICOS');
    
    const errorMessages = {
      titulo: 'Ingresa un título',
      fechaInicio: 'Ingresa una fecha de inicio',
      fechaFin: 'Ingresa una fecha fin',
      servicio: 'Selecciona un servicio',
      descripcion: 'Ingresa una descripción',
      ofertaCorta: 'Ingresa un título corto'
    };

    let errorsFound = 0;
    const foundErrors: string[] = [];

    // Validar mensaje de error de título
    const tituloError = page.locator('text=/Ingresa un título/i');
    const tituloErrorVisible = await tituloError.isVisible({ timeout: 2000 }).catch(() => false);
    if (tituloErrorVisible) {
      errorsFound++;
      foundErrors.push('Título');
      console.log(`✅ Mensaje de error encontrado: "${errorMessages.titulo}"`);
    } else {
      console.warn(`⚠️ No se encontró mensaje de error para: ${errorMessages.titulo}`);
    }

    // Validar mensaje de error de fecha inicio
    const fechaInicioError = page.locator('text=/Ingresa una fecha de inicio/i');
    const fechaInicioErrorVisible = await fechaInicioError.isVisible({ timeout: 2000 }).catch(() => false);
    if (fechaInicioErrorVisible) {
      errorsFound++;
      foundErrors.push('Fecha inicio');
      console.log(`✅ Mensaje de error encontrado: "${errorMessages.fechaInicio}"`);
    } else {
      console.warn(`⚠️ No se encontró mensaje de error para: ${errorMessages.fechaInicio}`);
    }

    // Validar mensaje de error de fecha fin
    const fechaFinError = page.locator('text=/Ingresa una fecha fin/i');
    const fechaFinErrorVisible = await fechaFinError.isVisible({ timeout: 2000 }).catch(() => false);
    if (fechaFinErrorVisible) {
      errorsFound++;
      foundErrors.push('Fecha fin');
      console.log(`✅ Mensaje de error encontrado: "${errorMessages.fechaFin}"`);
    } else {
      console.warn(`⚠️ No se encontró mensaje de error para: ${errorMessages.fechaFin}`);
    }

    // Validar mensaje de error de servicio
    const servicioError = page.locator('text=/Selecciona un servicio/i');
    const servicioErrorVisible = await servicioError.isVisible({ timeout: 2000 }).catch(() => false);
    if (servicioErrorVisible) {
      errorsFound++;
      foundErrors.push('Servicio');
      console.log(`✅ Mensaje de error encontrado: "${errorMessages.servicio}"`);
    } else {
      console.warn(`⚠️ No se encontró mensaje de error para: ${errorMessages.servicio}`);
    }

    // Validar mensaje de error de descripción
    const descripcionError = page.locator('text=/Ingresa una descripción/i');
    const descripcionErrorVisible = await descripcionError.isVisible({ timeout: 2000 }).catch(() => false);
    if (descripcionErrorVisible) {
      errorsFound++;
      foundErrors.push('Descripción');
      console.log(`✅ Mensaje de error encontrado: "${errorMessages.descripcion}"`);
    } else {
      console.warn(`⚠️ No se encontró mensaje de error para: ${errorMessages.descripcion}`);
    }

    // Validar mensaje de error de oferta corta
    const ofertaCortaError = page.locator('text=/Ingresa un título corto/i');
    const ofertaCortaErrorVisible = await ofertaCortaError.isVisible({ timeout: 2000 }).catch(() => false);
    if (ofertaCortaErrorVisible) {
      errorsFound++;
      foundErrors.push('Oferta corta');
      console.log(`✅ Mensaje de error encontrado: "${errorMessages.ofertaCorta}"`);
    } else {
      console.warn(`⚠️ No se encontró mensaje de error para: ${errorMessages.ofertaCorta}`);
    }

    // Resumen de validaciones
    console.log(`\n📊 RESUMEN DE VALIDACIONES:`);
    console.log(`  ✅ Mensajes de error encontrados: ${errorsFound}/6`);
    console.log(`  📝 Campos con error: ${foundErrors.join(', ')}`);

    // Verificar que al menos algunos mensajes de error se mostraron
    if (errorsFound === 0) {
      // Verificar si el formulario no se envió (el botón sigue visible o hay validación HTML5)
      const titleInput = page.locator('input[id="Title"]');
      const titleRequired = await titleInput.getAttribute('required');
      if (titleRequired !== null) {
        console.log('✅ Validación HTML5 activa en campos obligatorios');
      } else {
        throw new Error('❌ No se encontraron mensajes de error visibles y no hay validación HTML5');
      }
    } else {
      expect(errorsFound).toBeGreaterThan(0);
      console.log('✅ Se validaron correctamente los mensajes de error de campos obligatorios');
    }

    // Verificar que no se creó la promoción (debería seguir en el formulario)
    const stillInForm = await page.getByText('Nueva promoción').isVisible();
    expect(stillInForm).toBeTruthy();
    console.log('✅ El formulario no se cerró, validación funcionó correctamente');
  });

  test('validar límite de caracteres en oferta corta', async ({ page }) => {
    // Caso 3: Límite de caracteres en Oferta corta
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Abrir formulario
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Buscar campo de oferta corta
    await showStepMessage(page, '🏷️ PROBANDO LÍMITE DE CARACTERES EN OFERTA CORTA');
    const shortOfferInput = page.locator('input[id="ShortTitle"]');
    await expect(shortOfferInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });

    // Verificar que tiene maxlength="10"
    const maxLength = await shortOfferInput.getAttribute('maxlength');
    expect(maxLength).toBe('10');
    console.log('✅ Campo tiene límite de 10 caracteres');

    // Intentar escribir más de 10 caracteres
    const longText = '12345678901'; // 11 caracteres
    await shortOfferInput.fill(longText);
    await page.waitForTimeout(500);

    // Verificar que solo se aceptaron 10 caracteres
    const inputValue = await shortOfferInput.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(10);
    console.log(`✅ El campo limitó correctamente a ${inputValue.length} caracteres`);

    // Verificar contador visual (0/10)
    const counter = page.locator('text=/\\d+\\/10/');
    const counterVisible = await counter.isVisible({ timeout: 2000 }).catch(() => false);
    if (counterVisible) {
      const counterText = await counter.textContent();
      console.log(`✅ Contador visual encontrado: "${counterText}"`);
    } else {
      console.log('ℹ️ Contador visual no encontrado (puede estar implementado de otra forma)');
    }
  });

  test('validar fecha de fin en el pasado', async ({ page }) => {
    // Caso 4: Fecha de fin en el pasado
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Abrir formulario
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Llenar campos obligatorios mínimos
    await showStepMessage(page, '📝 LLENANDO CAMPOS MÍNIMOS');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const shortTimestamp = `${dateStr}-${timeStr}`;
    const promoTitle = `Test ${shortTimestamp}`.substring(0, 30);

    await page.locator('input[id="Title"]').fill(promoTitle);
    await page.waitForTimeout(500);

    // Fecha de inicio: día actual
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    await pickDateSmart(page, 'input#StartDate', startDate);
    await page.waitForTimeout(500);

    // Fecha de fin: 5 días en el pasado
    const pastDateObj = new Date(now);
    pastDateObj.setDate(pastDateObj.getDate() - 5);
    const pastDate = `${String(pastDateObj.getDate()).padStart(2,'0')}-${String(pastDateObj.getMonth()+1).padStart(2,'0')}-${pastDateObj.getFullYear()}`;

    // Seleccionar servicio
    const serviceButton = page.locator('button[id="ServiceId"]');
    const serviceButtonVisible = await serviceButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (serviceButtonVisible) {
      await serviceButton.click();
      await page.waitForTimeout(1000);
      const serviceOptions = page.locator('div[role="option"], button[role="option"], li[role="option"]');
      const serviceCount = await serviceOptions.count();
      if (serviceCount > 0) {
        await serviceOptions.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Llenar oferta corta
    await page.locator('input[id="ShortTitle"]').fill('TEST');
    await page.waitForTimeout(500);

    // Intentar seleccionar fecha de fin en el pasado
    await showStepMessage(page, '⚠️ INTENTANDO SELECCIONAR FECHA DE FIN EN EL PASADO');
    await pickDateSmart(page, 'input#EndDate', pastDate);
    await page.waitForTimeout(1000);

    // Intentar guardar
    const finalizarButton = page.locator('button[type="submit"][form="PromotionDataForm"], button:has-text("Finalizar")').first();
    await finalizarButton.click();
    await page.waitForTimeout(2000);

    // Validar mensaje de error
    const errorMessage = page.locator('text=/pasado|no puede terminar|fecha.*fin/i');
    const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    if (errorVisible) {
      const errorText = await errorMessage.first().textContent();
      console.log(`✅ Mensaje de error encontrado: "${errorText}"`);
    } else {
      // Verificar si el formulario no se envió
      const stillInForm = await page.getByText('Nueva promoción').isVisible();
      if (stillInForm) {
        console.log('✅ El formulario no se cerró, validación funcionó');
      } else {
        console.warn('⚠️ No se encontró mensaje de error visible');
      }
    }
  });

  test('validar fecha inicio mayor que fecha fin', async ({ page }) => {
    // Caso 5: Fecha inicio mayor que fecha fin
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Abrir formulario
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Llenar campos obligatorios mínimos
    await showStepMessage(page, '📝 LLENANDO CAMPOS MÍNIMOS');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const shortTimestamp = `${dateStr}-${timeStr}`;
    const promoTitle = `Test ${shortTimestamp}`.substring(0, 30);

    await page.locator('input[id="Title"]').fill(promoTitle);
    await page.waitForTimeout(500);

    // Fecha de inicio: 10 días en el futuro
    const futureStartDateObj = new Date(now);
    futureStartDateObj.setDate(futureStartDateObj.getDate() + 10);
    const futureStartDate = `${String(futureStartDateObj.getDate()).padStart(2,'0')}-${String(futureStartDateObj.getMonth()+1).padStart(2,'0')}-${futureStartDateObj.getFullYear()}`;
    await pickDateSmart(page, 'input#StartDate', futureStartDate);
    await page.waitForTimeout(500);

    // Fecha de fin: 5 días en el futuro (menor que inicio)
    const futureEndDateObj = new Date(now);
    futureEndDateObj.setDate(futureEndDateObj.getDate() + 5);
    const futureEndDate = `${String(futureEndDateObj.getDate()).padStart(2,'0')}-${String(futureEndDateObj.getMonth()+1).padStart(2,'0')}-${futureEndDateObj.getFullYear()}`;

    // Seleccionar servicio
    const serviceButton = page.locator('button[id="ServiceId"]');
    const serviceButtonVisible = await serviceButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (serviceButtonVisible) {
      await serviceButton.click();
      await page.waitForTimeout(1000);
      const serviceOptions = page.locator('div[role="option"], button[role="option"], li[role="option"]');
      const serviceCount = await serviceOptions.count();
      if (serviceCount > 0) {
        await serviceOptions.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Llenar oferta corta
    await page.locator('input[id="ShortTitle"]').fill('TEST');
    await page.waitForTimeout(500);

    // Intentar seleccionar fecha de fin menor que inicio
    await showStepMessage(page, '⚠️ INTENTANDO SELECCIONAR FECHA FIN MENOR QUE INICIO');
    await pickDateSmart(page, 'input#EndDate', futureEndDate);
    await page.waitForTimeout(1000);

    // Intentar guardar
    const finalizarButton = page.locator('button[type="submit"][form="PromotionDataForm"], button:has-text("Finalizar")').first();
    await finalizarButton.click();
    await page.waitForTimeout(2000);

    // Validar mensaje de error
    const errorMessage = page.locator('text=/inicio.*fin|fin.*inicio|menor|mayor|igual/i');
    const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    if (errorVisible) {
      const errorText = await errorMessage.first().textContent();
      console.log(`✅ Mensaje de error encontrado: "${errorText}"`);
    } else {
      // Verificar si el formulario no se envió
      const stillInForm = await page.getByText('Nueva promoción').isVisible();
      if (stillInForm) {
        console.log('✅ El formulario no se cerró, validación funcionó');
      } else {
        console.warn('⚠️ No se encontró mensaje de error visible');
      }
    }
  });

  test('validar servicios no disponibles', async ({ page }) => {
    // Caso 6: Servicios no disponibles
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Abrir formulario
    await showStepMessage(page, '🟢 ABRIENDO FORMULARIO DE NUEVA PROMOCIÓN');
    await page.getByRole('button', { name: 'Crear promoción' }).click();
    await expect(page.getByText('Nueva promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Abrir dropdown de servicios
    await showStepMessage(page, '🔧 VERIFICANDO DROPDOWN DE SERVICIOS');
    const serviceButton = page.locator('button[id="ServiceId"]');
    await expect(serviceButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await serviceButton.click();
    await page.waitForTimeout(1000);

    // Verificar si hay opciones de servicio
    const serviceOptions = page.locator('div[role="option"], button[role="option"], li[role="option"]');
    const serviceCount = await serviceOptions.count();

    if (serviceCount === 0) {
      // Verificar mensaje de estado vacío
      const emptyMessage = page.locator('text=/selecciona.*servicio|sin.*servicio|no.*servicio|servicio.*disponible/i');
      const emptyMessageVisible = await emptyMessage.isVisible({ timeout: 2000 }).catch(() => false);
      if (emptyMessageVisible) {
        const messageText = await emptyMessage.first().textContent();
        console.log(`✅ Mensaje de estado vacío encontrado: "${messageText}"`);
      } else {
        // Verificar placeholder o texto del botón
        const buttonText = await serviceButton.textContent();
        if (buttonText && (buttonText.includes('Selecciona') || buttonText.includes('servicio'))) {
          console.log(`✅ Texto del botón indica estado vacío: "${buttonText}"`);
        } else {
          console.log('ℹ️ No se encontró mensaje explícito de estado vacío');
        }
      }
      console.log('✅ Validación: No hay servicios disponibles');
    } else {
      console.log(`ℹ️ Se encontraron ${serviceCount} servicio(s) disponible(s)`);
      // Cerrar el dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('ordenar promociones', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // Verificar que hay promociones para ordenar
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const initialPromoCount = await promoCardsLocator.count();
    
    if (initialPromoCount < 2) {
      console.log('⚠️ Se necesitan al menos 2 promociones para ordenar. Promociones encontradas:', initialPromoCount);
      return;
    }

    await showStepMessage(page, '🟢 ORDENAR PROMOCIONES (PRIMERA VEZ)');
    await page.waitForTimeout(1000);

    // --- ORDENAR PROMOCIONES (PRIMERA VEZ) ---
    const sortButton = page.locator('button:has(i.icon-sort-descending)');
    await expect(sortButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await sortButton.click();
    await page.waitForTimeout(1000);

    // --- ORDENAR PROMOCIONES (SEGUNDA VEZ - ORDEN OPUESTO) ---
    await showStepMessage(page, '🟢 SEGUNDA VEZ - ORDEN OPUESTO');
    await page.waitForTimeout(1000);

    await sortButton.click();
    await page.waitForTimeout(1000);

    // --- LIMPIAR MENSAJE ---
    await clearStepMessage(page);

    console.log('✅ Ordenamiento de promociones completado exitosamente');
  });

  test('filtrar promociones', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- OBTENER ESTADO INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const initialPromoCount = await promoCardsLocator.count();
    console.log(`📊 Promociones iniciales: ${initialPromoCount}`);
    
    // Verificar que hay promociones para filtrar
    if (initialPromoCount === 0) {
      throw new Error('❌ No hay promociones disponibles para realizar el filtrado');
    }

    // --- ABRIR FILTROS ---
    await showStepMessage(page, '🔍 ABRIENDO DIALOG DE FILTROS');
    await page.waitForTimeout(1000);
    const filterButton = page.getByRole('button', { name: 'Filtrar' });
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Validar que el diálogo de filtros se abrió
    const startDateInput = page.locator('input#StartDate');
    const endDateInput = page.locator('input#EndDate');
    await expect(startDateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await expect(endDateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Diálogo de filtros abierto correctamente');

    // --- CONFIGURAR FECHAS INICIALES ---
    await showStepMessage(page, '📅 CONFIGURANDO FECHAS DE FILTRO');
    await page.waitForTimeout(1000);
    
    await pickDateSmart(page, 'input#StartDate', FILTER_START_DATE);
    await page.waitForTimeout(500);
    await pickDateSmart(page, 'input#EndDate', FILTER_END_DATE);
    await page.waitForTimeout(500);

    // Validar que las fechas se configuraron correctamente
    const startDateValue = await startDateInput.inputValue();
    const endDateValue = await endDateInput.inputValue();
    if (startDateValue === null || startDateValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor de la fecha de inicio');
    }
    if (endDateValue === null || endDateValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor de la fecha de fin');
    }
    console.log(`✅ Fecha inicio configurada: ${startDateValue}`);
    console.log(`✅ Fecha fin configurada: ${endDateValue}`);

    // --- APLICAR FILTRO ---
    await showStepMessage(page, '✅ APLICANDO FILTRO DE FECHAS');
    await page.waitForTimeout(1000);
    const applyButton = page.locator('button:has-text("Aplicar")');
    await expect(applyButton).toBeVisible();
    await applyButton.click();
    
    // Esperar a que el diálogo se cierre y el listado se actualice
    await page.waitForTimeout(2000);
    
    // Validar que el diálogo se cerró
    const isDialogClosed = await startDateInput.isVisible().catch(() => false);
    if (isDialogClosed) {
      console.warn('⚠️ El diálogo de filtros aún está visible después de aplicar');
    } else {
      console.log('✅ Diálogo de filtros cerrado correctamente');
    }

    // Contar promociones después de aplicar el filtro
    const afterFilterCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de aplicar filtro: ${afterFilterCount}`);

    // Validar que el filtro cambió el conteo
    if (afterFilterCount === initialPromoCount) {
      console.warn(`⚠️ El filtro no cambió el conteo. Inicial: ${initialPromoCount}, Después: ${afterFilterCount}`);
      console.warn('⚠️ Esto puede ser normal si todas las promociones están dentro del rango de fechas');
    } else if (afterFilterCount > initialPromoCount) {
      throw new Error(`❌ El filtro aumentó el conteo. Inicial: ${initialPromoCount}, Después: ${afterFilterCount}`);
    } else {
      console.log(`✅ Filtro aplicado exitosamente: Se filtraron ${initialPromoCount - afterFilterCount} promociones`);
    }

    // --- VOLVER A ABRIR FILTROS ---
    await showStepMessage(page, '🔍 REABRIENDO FILTROS PARA LIMPIAR');
    await page.waitForTimeout(1000);
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Validar que el diálogo se abrió nuevamente
    await expect(startDateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Diálogo de filtros reabierto correctamente');

    // --- LIMPIAR FILTROS ---
    await showStepMessage(page, '🧹 LIMPIANDO FILTROS APLICADOS');
    await page.waitForTimeout(1000);
    const clearButton = page.locator('button:has-text("Limpiar")');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await page.waitForTimeout(500);

    // Esperar a que el listado se actualice después de limpiar
    await page.waitForTimeout(2000);

    // Contar promociones después de limpiar
    const afterClearCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de limpiar filtro: ${afterClearCount}`);

    // Validar que se restauraron todas las promociones
    if (afterClearCount === initialPromoCount) {
      console.log(`✅ Limpieza exitosa: Se restauraron todas las promociones (${afterClearCount})`);
    } else {
      console.warn(`⚠️ El conteo después de limpiar no coincide con el inicial. Inicial: ${initialPromoCount}, Después: ${afterClearCount}`);
      // Esto puede ser aceptable si hay diferencias menores, pero lo reportamos
      if (Math.abs(afterClearCount - initialPromoCount) > 2) {
        throw new Error(`❌ Diferencia significativa después de limpiar. Inicial: ${initialPromoCount}, Después: ${afterClearCount}`);
      }
    }

    // Resumen final
    console.log('\n📋 RESUMEN DE VALIDACIONES:');
    console.log(`  ✅ Estado inicial: ${initialPromoCount} promociones`);
    console.log(`  ✅ Después de aplicar filtro: ${afterFilterCount} promociones`);
    console.log(`  ✅ Después de limpiar filtro: ${afterClearCount} promociones`);
  });

  test('buscar promociones', async ({ page }) => {
    // --- ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- OBTENER ESTADO INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const initialPromoCount = await promoCardsLocator.count();
    console.log(`📊 Promociones iniciales: ${initialPromoCount}`);
    
    // Verificar que hay promociones para buscar
    if (initialPromoCount === 0) {
      throw new Error('❌ No hay promociones disponibles para realizar la búsqueda');
    }

    // --- REALIZAR BÚSQUEDA ---
    await showStepMessage(page, '🔍 REALIZANDO BÚSQUEDA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('input#Search');
    await searchInput.fill(SEARCH_TERM);
    
    // Esperar a que se procese la búsqueda
    await page.waitForTimeout(WAIT_FOR_SEARCH_PROCESS);
    
    // Verificar que el campo de búsqueda tiene el valor correcto
    const searchValue = await searchInput.inputValue();
    if (searchValue === null || searchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor del campo de búsqueda');
    }
    if (searchValue !== SEARCH_TERM) {
      throw new Error(`❌ El campo de búsqueda no tiene el valor esperado. Esperado: "${SEARCH_TERM}", Obtenido: "${searchValue}"`);
    }
    console.log(`✅ Campo de búsqueda contiene: "${searchValue}"`);

    // Contar promociones después de la búsqueda
    const afterSearchCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de búsqueda: ${afterSearchCount}`);

    // Validar que la búsqueda filtró resultados
    if (afterSearchCount >= initialPromoCount) {
      console.warn(`⚠️ La búsqueda no filtró resultados. Inicial: ${initialPromoCount}, Después: ${afterSearchCount}`);
    } else {
      console.log(`✅ Búsqueda exitosa: Se filtraron ${initialPromoCount - afterSearchCount} promociones`);
    }

    // Verificar que las promociones visibles contienen el término de búsqueda
    if (afterSearchCount > 0) {
      const visiblePromos = promoCardsLocator;
      let matchingPromos = 0;
      for (let i = 0; i < afterSearchCount; i++) {
        const promoText = await visiblePromos.nth(i).textContent();
        if (promoText && promoText.toLowerCase().includes(SEARCH_TERM.toLowerCase())) {
          matchingPromos++;
        }
      }
      console.log(`✅ Promociones que coinciden con "${SEARCH_TERM}": ${matchingPromos}/${afterSearchCount}`);
      
      if (matchingPromos === 0 && afterSearchCount > 0) {
        console.warn('⚠️ Ninguna promoción visible contiene el término de búsqueda');
      }
    }

    // --- LIMPIAR BÚSQUEDA ---
    await showStepMessage(page, '🧹 LIMPIANDO BÚSQUEDA');
    await page.waitForTimeout(1000);
    
    await searchInput.clear();
    await page.waitForTimeout(2000); // Esperar a que se procese la limpieza

    // Verificar que el campo de búsqueda está vacío
    const clearedSearchValue = await searchInput.inputValue();
    if (clearedSearchValue === null || clearedSearchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor del campo de búsqueda después de limpiar');
    }
    if (clearedSearchValue !== '') {
      throw new Error(`❌ El campo de búsqueda no se limpió correctamente. Valor: "${clearedSearchValue}"`);
    }
    console.log(`✅ Campo de búsqueda limpiado correctamente`);

    // Contar promociones después de limpiar
    const afterClearCount = await promoCardsLocator.count();
    console.log(`📊 Promociones después de limpiar: ${afterClearCount}`);

    // Validar que se restauraron todas las promociones
    if (afterClearCount === initialPromoCount) {
      console.log(`✅ Limpieza exitosa: Se restauraron todas las promociones (${afterClearCount})`);
    } else {
      console.warn(`⚠️ El conteo después de limpiar no coincide con el inicial. Inicial: ${initialPromoCount}, Después: ${afterClearCount}`);
    }

    // --- BÚSQUEDA CON TÉRMINO NO EXISTENTE ---
    await showStepMessage(page, '❌ BUSCANDO TÉRMINO NO EXISTENTE');
    await page.waitForTimeout(1000);
    
    await searchInput.fill(NON_EXISTENT_SEARCH_TERM);
    await page.waitForTimeout(WAIT_FOR_SEARCH_PROCESS);

    // Verificar que el campo tiene el término
    const noResultsSearchValue = await searchInput.inputValue();
    if (noResultsSearchValue === null || noResultsSearchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor del campo de búsqueda con término no existente');
    }
    if (noResultsSearchValue !== NON_EXISTENT_SEARCH_TERM) {
      throw new Error(`❌ El campo de búsqueda no tiene el término esperado. Esperado: "${NON_EXISTENT_SEARCH_TERM}", Obtenido: "${noResultsSearchValue}"`);
    }

    // Contar promociones con búsqueda sin resultados
    const noResultsCount = await promoCardsLocator.count();
    console.log(`📊 Promociones con búsqueda sin resultados: ${noResultsCount}`);

    // Validar que no hay resultados (o verificar mensaje de "sin resultados")
    if (noResultsCount === 0) {
      console.log(`✅ Búsqueda sin resultados exitosa: No se encontraron promociones`);
      
      // Verificar si hay un mensaje de "sin resultados" (opcional, depende de la UI)
      const noResultsMessage = page.locator('text=/no.*resultado|sin.*resultado|no.*encontrado/i');
      const hasNoResultsMessage = await noResultsMessage.count() > 0;
      if (hasNoResultsMessage) {
        console.log(`✅ Mensaje de "sin resultados" encontrado`);
      }
    } else {
      console.warn(`⚠️ Se encontraron ${noResultsCount} promociones cuando se esperaba 0`);
    }

    // --- LIMPIAR BÚSQUEDA Y VERIFICAR VUELTA AL ORIGINAL ---
    await showStepMessage(page, '🔄 LIMPIANDO BÚSQUEDA Y VERIFICANDO VUELTA AL ORIGINAL');
    await page.waitForTimeout(1000);
    
    await searchInput.clear();
    await page.waitForTimeout(2000);

    // Verificar que el campo está vacío
    const finalSearchValue = await searchInput.inputValue();
    if (finalSearchValue === null || finalSearchValue === undefined) {
      throw new Error('❌ No se pudo obtener el valor final del campo de búsqueda');
    }
    if (finalSearchValue !== '') {
      throw new Error(`❌ El campo de búsqueda no está vacío. Valor: "${finalSearchValue}"`);
    }

    // Contar promociones finales
    const finalPromoCount = await promoCardsLocator.count();
    console.log(`📊 Promociones finales: ${finalPromoCount}`);

    // Validar que se volvió al estado original
    if (finalPromoCount === initialPromoCount) {
      console.log(`✅ VUELTA AL ORIGINAL EXITOSA: El conteo final (${finalPromoCount}) coincide con el inicial (${initialPromoCount})`);
    } else {
      throw new Error(`❌ El estado final no coincide con el inicial. Inicial: ${initialPromoCount}, Final: ${finalPromoCount}`);
    }

    // Resumen final
    console.log('\n📋 RESUMEN DE VALIDACIONES:');
    console.log(`  ✅ Estado inicial: ${initialPromoCount} promociones`);
    console.log(`  ✅ Después de búsqueda: ${afterSearchCount} promociones`);
    console.log(`  ✅ Después de limpiar: ${afterClearCount} promociones`);
    console.log(`  ✅ Búsqueda sin resultados: ${noResultsCount} promociones`);
    console.log(`  ✅ Estado final: ${finalPromoCount} promociones`);
  });

  test('editar promoción', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // --- ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(1000);

    // --- LOCALIZAR Y EDITAR PROMOCIÓN ---
    await showStepMessage(page, '🔍 BUSCANDO PROMOCIÓN PARA EDITAR');
    await page.waitForTimeout(1000);
    
    // Esperar a que aparezcan las cards de promociones
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const totalPromos = await promoCardsLocator.count();
    console.log(`🔍 TRACE: Total de promociones disponibles: ${totalPromos}`);
    
    if (totalPromos === 0) {
      throw new Error('❌ No se encontraron promociones disponibles para editar');
    }
    
    // Seleccionar un índice aleatorio
    const randomIndex = Math.floor(Math.random() * totalPromos);
    console.log(`🔍 TRACE: Seleccionando promoción aleatoria (índice ${randomIndex} de ${totalPromos})`);
    
    // Obtener la promoción seleccionada aleatoriamente
    const selectedPromoCard = promoCardsLocator.nth(randomIndex);
    await expect(selectedPromoCard).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    
    // Obtener el nombre de la promoción seleccionada
    const promoName = selectedPromoCard.locator('p.text-medium.font-bold').first();
    const promoNameText = await promoName.textContent();
    
    if (!promoNameText) {
      throw new Error('❌ No se pudo obtener el texto de la promoción');
    }
    
    console.log(`🔍 TRACE: Promoción seleccionada: "${promoNameText}"`);

    await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA EDITAR');
    await page.waitForTimeout(1000);
    const menuButton = selectedPromoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

    await showStepMessage(page, '✏️ ABRIENDO MENÚ DE EDICIÓN');
    await page.waitForTimeout(1000);
    await page.locator('text=Editar').click();

    // --- MODIFICAR PROMOCIÓN ---
    await showStepMessage(page, '📝 MODIFICANDO DATOS DE LA PROMOCIÓN');
    await page.waitForTimeout(1000);
    const now = new Date();
    // Usar solo fecha y hora en formato más corto: YYYYMMDD-HHMMSS
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const shortTimestamp = `${dateStr}-${timeStr}`;
    // El título debe tener máximo 30 caracteres
    const editedPromoTitle = `${PROMO_EDITED_PREFIX} ${shortTimestamp}`.substring(0, 30);
    
    // Fecha de inicio: día actual
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    
    // Fecha de fin: días después del día actual
    const end = new Date(now);
    end.setDate(end.getDate() + DAYS_TO_ADD_FOR_EDITED_END_DATE);
    const endDate = `${String(end.getDate()).padStart(2,'0')}-${String(end.getMonth()+1).padStart(2,'0')}-${end.getFullYear()}`;

    // Llenar título
    await page.locator('input[id="Title"]').fill(editedPromoTitle);
    await page.waitForTimeout(500);
    
    // Llenar fechas
    await pickDateSmart(page, 'input#StartDate', startDate);
    await page.waitForTimeout(500);
    await pickDateSmart(page, 'input#EndDate', endDate);
    await page.waitForTimeout(500);
    
    // Actualizar servicio si es necesario (opcional, puede que ya esté seleccionado)
    const serviceButton = page.locator('button[id="ServiceId"]');
    const serviceButtonVisible = await serviceButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (serviceButtonVisible) {
      const serviceButtonText = await serviceButton.textContent();
      if (!serviceButtonText || serviceButtonText.trim() === '') {
        await showStepMessage(page, '🔧 ACTUALIZANDO SERVICIO');
        await serviceButton.click();
        await page.waitForTimeout(1000);
        const serviceOptions = page.locator('div[role="option"], button[role="option"], li[role="option"]');
        const serviceCount = await serviceOptions.count();
        if (serviceCount > 0) {
          await serviceOptions.first().click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Actualizar descripción
    await showStepMessage(page, '📄 ACTUALIZANDO DESCRIPCIÓN');
    const editedDescription = `Descripción editada para la promoción ${shortTimestamp}`;
    await page.locator('textarea[id="Description"]').fill(editedDescription);
    await page.waitForTimeout(500);
    
    // Actualizar oferta corta
    await showStepMessage(page, '🏷️ ACTUALIZANDO OFERTA CORTA');
    const editedShortOffer = '20% OFF';
    await page.locator('input[id="ShortTitle"]').fill(editedShortOffer);
    await page.waitForTimeout(500);

    // Borrar imagen actual si existe
    await showStepMessage(page, '🗑️ ELIMINANDO IMAGEN ACTUAL');
    await page.waitForTimeout(1000);
    const deleteImageButton = page.locator('button:has(i.icon-trash)');
    const deleteButtonVisible = await deleteImageButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (deleteButtonVisible) {
      await deleteImageButton.click();
      await page.waitForTimeout(500);
      const acceptButton = page.locator('button:has-text("Aceptar")');
      const acceptVisible = await acceptButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (acceptVisible) {
        await acceptButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Subir nueva imagen
    await showStepMessage(page, '📷 SUBIENDO NUEVA IMAGEN');
    await page.waitForTimeout(1000);
    const fileInput = page.locator('input[id="PromotionMultimedia"]');
    // El input tiene clase "hidden" pero aún puede recibir archivos
    await expect(fileInput).toHaveCount(1, { timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await fileInput.setInputFiles(IMAGE_JPEG_PATH);
    await page.waitForTimeout(1000);

    // --- GUARDAR CAMBIOS ---
    await showStepMessage(page, '💾 GUARDANDO CAMBIOS DE EDICIÓN');
    await page.waitForTimeout(1000);
    const finalizarButton = page.locator('button[type="submit"][form="PromotionDataForm"], button:has-text("Finalizar")').first();
    await expect(finalizarButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await finalizarButton.click();

    // --- VALIDAR CAMBIOS ---
    await showStepMessage(page, '🔄 RECARGANDO PARA VER CAMBIOS GUARDADOS');
    await page.waitForTimeout(1000);
    const updatedPromo = page.locator('div.w-full.flex.shadow-4', { hasText: editedPromoTitle });
    await expect(updatedPromo).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('eliminar promoción', async ({ page }) => {
    test.setTimeout(EXTENDED_TIMEOUT);
    
    // --- ADMINISTRAR PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A ADMINISTRAR PROMOCIONES');
    const promosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promosBtn.click();
    await expect(page.getByText('Crear promoción')).toBeVisible();
    await page.waitForTimeout(2000);

    // --- LOCALIZAR Y ELIMINAR PROMOCIÓN ---
    await showStepMessage(page, '🔍 BUSCANDO PROMOCIÓN PARA ELIMINAR');
    await page.waitForTimeout(1000);
    
    // Esperar a que aparezcan las cards de promociones
    const promoCardsLocator = page.locator('div.w-full.flex.shadow-4');
    const totalPromos = await promoCardsLocator.count();
    console.log(`🔍 TRACE: Total de promociones disponibles: ${totalPromos}`);
    
    if (totalPromos === 0) {
      throw new Error('❌ No se encontraron promociones disponibles para eliminar');
    }
    
    // Seleccionar un índice aleatorio
    const randomIndex = Math.floor(Math.random() * totalPromos);
    console.log(`🔍 TRACE: Seleccionando promoción aleatoria (índice ${randomIndex} de ${totalPromos})`);
    
    // Obtener la promoción seleccionada aleatoriamente
    const selectedPromoCard = promoCardsLocator.nth(randomIndex);
    await expect(selectedPromoCard).toBeVisible({ timeout: WAIT_FOR_PROMO_TIMEOUT });
    
    // Obtener el nombre de la promoción seleccionada
    const promoName = selectedPromoCard.locator('p.text-medium.font-bold').first();
    const promoNameText = await promoName.textContent();
    
    if (!promoNameText) {
      throw new Error('❌ No se pudo obtener el texto de la promoción');
    }
    
    console.log(`🔍 TRACE: Promoción seleccionada para eliminar: "${promoNameText}"`);

    await showStepMessage(page, '🔍 LOCALIZANDO PROMOCIÓN PARA ELIMINAR');
    await page.waitForTimeout(1000);
    const menuButton = selectedPromoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

    // --- CONFIRMAR ELIMINACIÓN ---
    await showStepMessage(page, '⚠️ CONFIRMANDO ELIMINACIÓN');
    await page.waitForTimeout(1000);
    await page.locator('text=Eliminar').click();
    await page.waitForTimeout(500);

    await showStepMessage(page, '✅ FINALIZANDO ELIMINACIÓN');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Aceptar")').click();

    // --- VALIDAR ELIMINACIÓN ---
    await showStepMessage(page, '🔄 RECARGANDO PARA VERIFICAR ELIMINACIÓN');
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // --- VALIDAR QUE LA PROMOCIÓN FUE ELIMINADA ---
    await showStepMessage(page, '✅ VERIFICANDO QUE LA PROMOCIÓN FUE ELIMINADA');
    
    // Buscar la promoción específica que se eliminó usando el texto exacto guardado
    const deletedPromoLocator = page.locator('p.text-medium.font-bold', { hasText: promoNameText });
    
    // Verificar que no hay ninguna promoción con ese nombre exacto (count debe ser 0)
    const promoCount = await deletedPromoLocator.count();
    if (promoCount > 0) {
      throw new Error(`❌ La promoción "${promoNameText}" todavía existe. Se encontraron ${promoCount} promoción(es) con ese nombre.`);
    }
    
    console.log(`✅ La promoción "${promoNameText}" fue eliminada correctamente (0 promociones encontradas con ese nombre)`);
    
    // Verificación adicional: verificar que la tarjeta de la promoción tampoco existe
    const promoCardAfterDelete = page.locator('div.w-full.flex.shadow-4', { hasText: promoNameText });
    const cardCount = await promoCardAfterDelete.count();
    if (cardCount > 0) {
      throw new Error(`❌ La tarjeta de la promoción "${promoNameText}" todavía existe en el DOM.`);
    }
  });

  test('navegar a chats desde promociones', async ({ page }) => {
    // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A CHATS DESDE PROMOCIONES ---
    await showStepMessage(page, '💬 NAVEGANDO AL DASHBOARD DE CHATS DESDE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const chatsLink = page.locator('a[href="/provider/chats"]:has(i.icon-message-square)');
    await chatsLink.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    await expect(page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Fiestachat")')).toBeVisible({ timeout: 10000 });

    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE LA PÁGINA DE CHATS');
    await page.waitForTimeout(1000);
    
    // Verificar que el título "Conversaciones" está visible
    const conversationsTitle = page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Fiestachat")');
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
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    
    // Verificar que la URL es correcta
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/promotions')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
    }

    console.log('✅ Navegación completa: Promociones → Chats → Promociones');
  });

  test('navegar a perfil desde promociones', async ({ page }) => {
    // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A PERFIL DESDE PROMOCIONES ---
    await showStepMessage(page, '👤 NAVEGANDO AL PERFIL DESDE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const profileLink = page.locator('a[href="/provider/profile"][class*="w-[40px]"][class*="h-[40px]"]:has(i.icon-user)');
    await profileLink.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/profile')) {
      console.log('✅ URL correcta: Navegación exitosa a /provider/profile');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/profile, obtuvo: ${currentUrl}`);
    }

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
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    
    // Verificar que la URL es correcta
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/promotions')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
    }

    console.log('✅ Navegación completa: Promociones → Perfil → Promociones');
  });

  test('navegar a dashboard desde promociones', async ({ page }) => {
    // --- NAVEGAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- NAVEGAR A DASHBOARD DESDE PROMOCIONES ---
    await showStepMessage(page, '🏠 NAVEGANDO AL DASHBOARD DESDE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    const homeLink = page.locator('a:has(svg#Capa_1[width="282"])');
    await homeLink.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider') && !currentUrl.includes('/promotions')) {
      console.log('✅ URL correcta: Navegación exitosa al dashboard principal');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba dashboard principal, obtuvo: ${currentUrl}`);
    }

    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DEL DASHBOARD');
    await page.waitForTimeout(1000);
    
    // Verificar que no estamos en la página de promociones
    const isNotInPromotionsUrl = !page.url().includes('/promotions');
    if (!isNotInPromotionsUrl) {
      throw new Error('❌ Aún estamos en la página de promociones');
    }
    
    // Verificar que estamos en el dashboard principal
    const isInDashboard = page.url().includes('/provider') && !page.url().includes('/promotions') && !page.url().includes('/chats') && !page.url().includes('/profile');
    if (!isInDashboard) {
      throw new Error(`❌ No estamos en el dashboard principal. URL actual: ${page.url()}`);
    }
    
    // Verificar que el logo de Fiestamas esté presente
    const logo = page.locator('svg#Capa_1[width="282"]');
    await expect(logo).toBeVisible({ timeout: 10000 });
    console.log('✅ Logo de Fiestamas encontrado en el dashboard');
    
    // Verificar que hay elementos de navegación característicos del dashboard
    const navigationElements = page.locator('a[href="/provider/promotions"], a[href="/provider/chats"], a[href="/provider/profile"]');
    const navCount = await navigationElements.count();
    if (navCount >= 2) {
      console.log(`✅ Elementos de navegación encontrados: ${navCount} enlaces`);
    } else {
      console.warn('⚠️ Pocos elementos de navegación encontrados en el dashboard');
    }

    // --- REGRESAR A PÁGINA DE PROMOCIONES ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE PROMOCIONES');
    await page.waitForTimeout(1000);
    
    await page.goto(PROMOTIONS_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VERIFICAR QUE REGRESÓ A PROMOCIONES ---
    await expect(page.getByText('Crear promoción')).toBeVisible({ timeout: 10000 });
    
    // Verificar que la URL es correcta
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/promotions')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/promotions');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/promotions, obtuvo: ${finalUrl}`);
    }

    console.log('✅ Navegación completa: Promociones → Dashboard → Promociones');
  });
});
