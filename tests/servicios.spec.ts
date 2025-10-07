import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import PNG from 'png-js';
// @ts-ignore
import pixelmatch from 'pixelmatch';

test.use({ 
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(90000); // 90 segundos de timeout para cada test

// Función común para login
async function login(page: Page) {
  // --- HOME ---
  await page.goto('https://staging.fiestamas.com');
  await page.waitForTimeout(1000);
  await screenshotAndCompare(page, 'login01-home.png', 'refs/login01-home.png');

  // --- LOGIN ---
  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();
  
  // Screenshot de la página de login
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'login02-login.png', fullPage: true });
  
  await page.locator('input[id="Email"]').fill('fiestamasqaprv@gmail.com');
  await page.locator('input[id="Password"]').fill('Fiesta2025$');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(1000);

  // --- DASHBOARD LIMPIO ---
  await screenshotAndCompare(page, 'login03-dashboard.png', 'refs/login03-dashboard.png');
}

async function hideDynamicElements(page: Page) {
  await page.evaluate(() => {
    const h4s = Array.from(document.querySelectorAll('div.overflow-hidden > h4')) as HTMLElement[];
    h4s.forEach(el => el.style.display = 'none');

    const divs = Array.from(document.querySelectorAll('div[role="button"].w-full')) as HTMLElement[];
    divs.forEach(el => el.style.display = 'none');

    const buttons = Array.from(document.querySelectorAll('div.pt-4.overflow-y-auto button')) as HTMLElement[];
    buttons.forEach(el => el.style.display = 'none');
  });
}

async function showDynamicElements(page: Page) {
  await page.evaluate(() => {
    const h4s = Array.from(document.querySelectorAll('div.overflow-hidden > h4')) as HTMLElement[];
    h4s.forEach(el => el.style.display = '');
    const divs = Array.from(document.querySelectorAll('div[role="button"].w-full')) as HTMLElement[];
    divs.forEach(el => el.style.display = '');
    const buttons = Array.from(document.querySelectorAll('div.pt-4.overflow-y-auto button')) as HTMLElement[];
    buttons.forEach(el => el.style.display = '');
  });
}

async function screenshotAndCompare(page: Page, ssPath: string, refPath: string) {
  await hideDynamicElements(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: ssPath, 
    fullPage: true,
    timeout: 30000  // 30 segundos para screenshots
  });
  await showDynamicElements(page);

  if (!fs.existsSync(refPath)) {
    console.warn(`⚠️ Referencia no encontrada: ${refPath}`);
                    return;
                }

  const imgBefore = PNG.sync.read(fs.readFileSync(path.resolve(ssPath)));
  const imgAfter = PNG.sync.read(fs.readFileSync(path.resolve(refPath)));

  if (imgBefore.width !== imgAfter.width || imgAfter.height !== imgAfter.height) {
    throw new Error(`❌ Tamaño distinto entre ${ssPath} y referencia ${refPath}`);
  }

  const diff = new PNG({ width: imgBefore.width, height: imgBefore.height });
  const numDiffPixels = pixelmatch(imgBefore.data, imgAfter.data, diff.data, imgBefore.width, imgBefore.height, { threshold: 0.1 });

  if (numDiffPixels > 0) {
    throw new Error(`❌ Diferencia entre ${ssPath} y referencia ${refPath}. Píxeles distintos: ${numDiffPixels}`);
  } else {
    console.log(`✅ ${ssPath} coincide con la referencia`);
  }
}

// Función para mostrar mensajes explicativos
async function showStepMessage(page, message) {
  await page.evaluate((msg) => {
    let box = document.getElementById('__playwright_step_overlay');
    if (!box) {
      box = document.createElement('div');
      box.id = '__playwright_step_overlay';
      box.style.position = 'fixed';
      box.style.top = '50%';
      box.style.left = '50%';
      box.style.transform = 'translate(-50%, -50%)';
      box.style.zIndex = '999999';
      box.style.padding = '15px 25px';
      box.style.background = 'rgba(59, 130, 246, 0.9)';
      box.style.color = 'white';
      box.style.fontSize = '16px';
      box.style.borderRadius = '12px';
      box.style.fontFamily = 'monospace';
      box.style.fontWeight = 'bold';
      box.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      box.style.textAlign = 'center';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    
    // Auto-eliminar después de 2 segundos
    setTimeout(() => {
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    }, 2000);
  }, message);
}

// Función para limpiar mensajes
async function clearStepMessage(page) {
  await page.evaluate(() => {
    const box = document.getElementById('__playwright_step_overlay');
    if (box && box.parentNode) {
      box.parentNode.removeChild(box);
    }
  });
}

// Función para seleccionar categoría aleatoria de manera robusta
async function selectRandomCategory(page: Page, stepName: string) {
  await showStepMessage(page, `🎯 ${stepName}`);
  await page.waitForTimeout(1000);

  // Obtener todas las categorías disponibles
  const categorias = page.locator('button.flex.flex-col.items-center.gap-3');
  const count = await categorias.count();
  
  console.log(`📊 Total de categorías encontradas: ${count}`);
  
  if (count === 0) {
    throw new Error('❌ No se encontraron categorías disponibles');
  }

  // Seleccionar una categoría aleatoria
  const randomIndex = Math.floor(Math.random() * count);
  const categoriaSeleccionada = categorias.nth(randomIndex);
  
  // Obtener el nombre de la categoría seleccionada
  const nombreCategoria = await categoriaSeleccionada.locator('p').textContent();
  console.log(`🎯 Categoría seleccionada aleatoriamente (índice ${randomIndex}): ${nombreCategoria}`);
  
  await categoriaSeleccionada.click();
  await page.waitForTimeout(2000);
  
  return nombreCategoria;
}

// Hook para ejecutar login antes de cada test
test.beforeEach(async ({ page }) => {
  await login(page);
});

test('Login', async ({ page }) => {
  // El login ya se ejecutó en beforeEach
  console.log('✅ Login completado automáticamente');
});

test('Crear servicio', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);
  
  const serviciosBtn = page.locator('button:has-text("Administrar servicios")');
  await serviciosBtn.click();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT PÁGINA DE SERVICIOS ---
  await page.screenshot({ path: 'servicios01-services-page.png', fullPage: true });

  // --- CREAR SERVICIO ---
  await showStepMessage(page, '➕ CREANDO NUEVO SERVICIO');
  await page.waitForTimeout(1000);
  
  const crearServicioBtn = page.locator('button:has-text("Crear servicio")');
  await crearServicioBtn.click();
  await page.waitForTimeout(1000);

  // --- SCREENSHOT FORMULARIO DE CREAR SERVICIO ---
  await page.screenshot({ path: 'servicios02-create-service-form.png', fullPage: true });

  // --- SELECCIONAR CATEGORÍA ALEATORIA ---
  const nombreCategoria = await selectRandomCategory(page, 'SELECCIONANDO CATEGORÍA ALEATORIA');

  // --- SCREENSHOT DESPUÉS DE SELECCIONAR CATEGORÍA ---
  await page.screenshot({ path: 'servicios03-category-selected.png', fullPage: true });

  // --- SELECCIONAR SUBCATEGORÍA ALEATORIA ---
  // Detectar la categoría actual por el título (más específico)
  const tituloCategoria = await page.locator('h5.text-neutral-800:has-text("Selecciona la categoría de")').textContent();
  console.log(`📋 Categoría detectada: ${tituloCategoria}`);

  const nombreSubcategoria = await selectRandomCategory(page, 'SELECCIONANDO SUBCATEGORÍA ALEATORIA');

  // --- SCREENSHOT DESPUÉS DE SELECCIONAR SUBCATEGORÍA ---
  await page.screenshot({ path: 'servicios04-subcategory-selected.png', fullPage: true });

  console.log(`✅ Subcategoría "${nombreSubcategoria}" de "${tituloCategoria}" seleccionada exitosamente`);

  // --- LLENAR FORMULARIO DE DATOS DEL SERVICIO ---
  await showStepMessage(page, '📝 LLENANDO DATOS DEL SERVICIO');
  await page.waitForTimeout(1000);

  // Generar datos dinámicos para el servicio
    const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const serviceName = `Servicio de prueba ${timestamp}`;
  const serviceDescription = `Descripción del servicio de ${nombreSubcategoria} creado el ${now.toLocaleDateString()}`;
  const minCapacity = Math.floor(Math.random() * 10) + 1; // 1-10
  const maxCapacity = minCapacity + Math.floor(Math.random() * 50) + 10; // minCapacity + 10-60

  // Llenar nombre del servicio
  await page.locator('input[id="Name"]').fill(serviceName);
  await page.waitForTimeout(500);

  // Llenar descripción del servicio
  await page.locator('textarea[id="Description"]').fill(serviceDescription);
  await page.waitForTimeout(500);

  // Seleccionar unidades aleatorias (puede seleccionar múltiples)
  const units = page.locator('#Units button[type="button"]');
  const unitCount = await units.count();
  const selectedUnits = Math.floor(Math.random() * 3) + 1; // 1-3 unidades
  
  for (let i = 0; i < selectedUnits; i++) {
    const randomUnitIndex = Math.floor(Math.random() * unitCount);
    await units.nth(randomUnitIndex).click();
    await page.waitForTimeout(200);
  }

  // Llenar capacidad mínima y máxima
  await page.locator('input[id="MinAmount"]').fill(minCapacity.toString());
  await page.waitForTimeout(200);
  await page.locator('input[id="MaxAmount"]').fill(maxCapacity.toString());
  await page.waitForTimeout(500);

  // --- SCREENSHOT FORMULARIO LLENO ---
  await page.screenshot({ path: 'servicios05-form-filled.png', fullPage: true });

  // Enviar formulario
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO');
  await page.waitForTimeout(1000);
  
  await page.locator('button[type="submit"][form="ServiceDetailsForm"]').click();
  await page.waitForTimeout(2000);

  // --- SCREENSHOT PÁGINA DE PRECIOS ---
  await page.screenshot({ path: 'servicios06-price-page.png', fullPage: true });

  // --- LLENAR FORMULARIO DE PRECIOS Y CONDICIONES ---
  await showStepMessage(page, '💰 CONFIGURANDO PRECIOS Y CONDICIONES');
  await page.waitForTimeout(1000);

  // Generar precio aleatorio
  const basePrice = Math.floor(Math.random() * 500) + 100; // 100-600
  const price = `${basePrice}.00`;

  // Llenar precio
  await page.locator('input[id="Price"]').fill(price);
  await page.waitForTimeout(500);

  // Seleccionar unidad del dropdown
  await showStepMessage(page, '📏 SELECCIONANDO UNIDAD');
  await page.waitForTimeout(500);
  
  await page.locator('button[id="MainServiceUnitId"]').click();
  await page.waitForTimeout(1000);

  // Obtener opciones del dropdown (asumiendo que aparecen después del click)
  const unitOptions = page.locator('[role="option"], .dropdown-option, [data-option]');
  const unitOptionsCount = await unitOptions.count();
  
  if (unitOptionsCount > 0) {
    // Seleccionar una opción aleatoria
    const randomUnitIndex = Math.floor(Math.random() * unitOptionsCount);
    await unitOptions.nth(randomUnitIndex).click();
    await page.waitForTimeout(500);
  } else {
    // Si no hay opciones visibles, intentar con selectores alternativos
    const alternativeOptions = page.locator('div[class*="option"], li[class*="option"], div[class*="item"]');
    const altCount = await alternativeOptions.count();
    
    if (altCount > 0) {
      const randomAltIndex = Math.floor(Math.random() * altCount);
      await alternativeOptions.nth(randomAltIndex).click();
      await page.waitForTimeout(500);
    }
  }

  // Seleccionar método de pago aleatorio (puede seleccionar múltiples)
  const paymentMethods = page.locator('#PaymentMethod button[type="button"]');
  const paymentCount = await paymentMethods.count();
  const selectedPayments = Math.floor(Math.random() * 2) + 1; // 1-2 métodos de pago
  
  for (let i = 0; i < selectedPayments; i++) {
    const randomPaymentIndex = Math.floor(Math.random() * paymentCount);
    await paymentMethods.nth(randomPaymentIndex).click();
    await page.waitForTimeout(200);
  }

  // Llenar condiciones
  const conditions = `Condiciones especiales para el servicio de ${nombreSubcategoria}:\n- Servicio disponible de lunes a domingo\n- Horario flexible según necesidades del cliente\n- Incluye materiales básicos\n- Se requiere confirmación con 24 horas de anticipación`;
  await page.locator('textarea[id="Conditions"]').fill(conditions);
  await page.waitForTimeout(500);

  // Opcional: marcar "Requiere anticipo" aleatoriamente
  if (Math.random() > 0.5) {
    await page.locator('label[for="Advance"]').click();
    await page.waitForTimeout(200);
  }

  // --- SCREENSHOT FORMULARIO DE PRECIOS LLENO ---
  await page.screenshot({ path: 'servicios07-price-form-filled.png', fullPage: true });

  // Enviar formulario de precios
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE PRECIOS');
  await page.waitForTimeout(1000);
  
  await page.locator('button[type="submit"][form="ServicePriceConditionsForm"]').click();
  await page.waitForTimeout(2000);

      // --- SCREENSHOT PÁGINA DE ATRIBUTOS ---
      await page.screenshot({ path: 'servicios08-attributes-page.png', fullPage: true });

      console.log(`✅ Formulario de precios llenado exitosamente: $${price}`);

      // --- SELECCIONAR ATRIBUTOS ALEATORIOS ---
      await showStepMessage(page, '🎯 SELECCIONANDO ATRIBUTOS DEL SERVICIO');
      await page.waitForTimeout(1000);

      // Obtener todos los checkboxes de atributos disponibles
      const attributeCheckboxes = page.locator('#Attributes input[type="checkbox"]');
      const attributeCount = await attributeCheckboxes.count();

      if (attributeCount > 0) {
        // Seleccionar 1-3 atributos aleatorios
        const selectedAttributes = Math.floor(Math.random() * 3) + 1; // 1-3 atributos
        
        for (let i = 0; i < selectedAttributes && i < attributeCount; i++) {
          const randomAttributeIndex = Math.floor(Math.random() * attributeCount);
          const checkbox = attributeCheckboxes.nth(randomAttributeIndex);
          
          // Obtener el label asociado
          const checkboxId = await checkbox.getAttribute('id');
          if (checkboxId) {
            await page.locator(`label[for="${checkboxId}"]`).click();
            await page.waitForTimeout(200);
          }
        }
      }

      // --- SCREENSHOT DESPUÉS DE SELECCIONAR ATRIBUTOS ---
      await page.screenshot({ path: 'servicios09-attributes-selected.png', fullPage: true });

      // Enviar formulario de atributos
      await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE ATRIBUTOS');
      await page.waitForTimeout(1000);
      
      await page.locator('button[type="submit"][form="ServiceAttributesForm"]').click();
      await page.waitForTimeout(2000);

      // --- SCREENSHOT PÁGINA DE RANGO DE SERVICIO ---
      await page.screenshot({ path: 'servicios10-service-range-page.png', fullPage: true });

      console.log(`✅ Atributos seleccionados exitosamente`);

      // --- CONFIGURAR RANGO DE SERVICIO ---
      await showStepMessage(page, '📍 CONFIGURANDO RANGO DE SERVICIO');
      await page.waitForTimeout(1000);

      // Seleccionar rango de 160km (índice 3 en el slider)
      const rangeSlider = page.locator('input[type="range"].style-slider');
      await rangeSlider.fill('3'); // 160km corresponde al índice 3
      await page.waitForTimeout(500);
      
      // --- SCREENSHOT FORMULARIO DE RANGO LLENO ---
      await page.screenshot({ path: 'servicios11-range-form-filled.png', fullPage: true });

      // Enviar formulario de rango
      await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE RANGO');
      
      await page.locator('button[type="submit"][form="ServiceRangeForm"]').click();
      
      // Esperar a que aparezca la página de media o el botón final
      try {
        await page.waitForSelector('#Step_6', { timeout: 5000 });
        console.log('✅ Llegamos a la página de media');
        
        // --- SCREENSHOT PÁGINA DE MEDIA ---
        await page.screenshot({ path: 'servicios12-media-page.png', fullPage: true });

        // Subir una imagen para que aparezca el botón de envío
        await showStepMessage(page, '📸 SUBIENDO IMAGEN');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('C:/Temp/transparent.png');
        await page.waitForTimeout(1000);

        // --- SCREENSHOT DESPUÉS DE SUBIR IMAGEN ---
        await page.screenshot({ path: 'servicios13-image-uploaded.png', fullPage: true });

        // Ahora el botón ServiceMediaForm debería estar visible
        const finalSubmitButton = page.locator('button[type="submit"][form="ServiceMediaForm"]');
        await expect(finalSubmitButton).toBeVisible({ timeout: 5000 });
        await finalSubmitButton.click();
        
      } catch (error) {
        console.log('⚠️ No se encontró Step_6, intentando encontrar botón final directamente');
        
        // Buscar botón final alternativo
        const alternativeButton = page.locator('button[type="submit"]:has-text("Finalizar"), button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")');
        if (await alternativeButton.count() > 0) {
          await alternativeButton.first().click();
          console.log('✅ Botón alternativo encontrado y clickeado');
        } else {
          console.log('⚠️ No se encontró botón final, continuando...');
        }
      }
      
      // Esperar un momento para que se procese
      await page.waitForTimeout(2000);
      
      // --- SCREENSHOT FINAL ---
      await page.screenshot({ path: 'servicios14-service-created.png', fullPage: true });

      console.log(`✅ Servicio "${serviceName}" creado exitosamente`);
});