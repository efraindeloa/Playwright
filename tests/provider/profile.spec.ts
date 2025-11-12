import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { login } from '../utils';
import { PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';



test.use({ 
    viewport: { width: 1280, height: 720 }
  });
  
  // Configuración global de timeout
  test.setTimeout(60000); // 60 segundos de timeout para cada test
  
  function getRandomCountryCode() {
    const paises = [
      'Afghanistan +93', 'Albania +355', 'Andorra +376', 'Angola +244', 'Argentina +54',
      'Australia +61', 'Austria +43', 'Belgium +32', 'Brazil +55', 'Canada +1',
      'Chile +56', 'China +86', 'Colombia +57', 'Czechia +420', 'Denmark +45',
      'France +33', 'Germany +49', 'India +91', 'Italy +39', 'Mexico +52',
      'Spain +34', 'United Kingdom +44', 'United States +1'
    ];
    const index = Math.floor(Math.random() * paises.length);
    return paises[index];
  }
  
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
  
  async function clearStepMessage(page) {
    await page.evaluate(() => {
      const box = document.getElementById('__playwright_step_overlay');
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    });
  }
  
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
  
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
  });
  
  test('Login', async ({ page }) => {
    // El login ya se ejecutó en beforeEach
    console.log('✅ Login completado automáticamente');
  });
  

 
  test('Editar perfil de proveedor y cambiar foto', async ({ page }) => {
    const profileLink = page.locator('a[href="/provider/profile"]').filter({
      has: page.locator('i.icon-user')
    }).first();
    await expect(profileLink).toBeVisible({ timeout: 15000 });
    await profileLink.click();
    await expect(page).toHaveURL(/\/provider\/profile/);
    const datosPersonalesHeader = page.locator('h5', { hasText: 'Datos personales' });
    await expect(datosPersonalesHeader).toBeVisible({ timeout: 15000 });
 
    // --- DATOS PERSONALES ---
    const seccionDatosPersonales = page.getByRole('heading', { name: 'Datos personales' })
      .locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-center") and contains(@class,"w-full")]');
  
    const btnEditarDatosPersonales = seccionDatosPersonales.locator('button', { hasText: 'Editar' }).first();
    await btnEditarDatosPersonales.click();

    const formularioDatosPersonales = page.locator('form#EditPersonalDataForm');
    await expect(formularioDatosPersonales).toBeVisible({ timeout: 10000 });

    const inputNombre = formularioDatosPersonales.locator('input#Name');
    const inputApellido = formularioDatosPersonales.locator('input#LastName');
    const inputTelefono = formularioDatosPersonales.locator('input#PhoneNumber');

    await inputNombre.fill('NuevoNombreQA');
    await inputApellido.fill('NuevoApellidoQA');
    await inputTelefono.fill('1234567890');

    await formularioDatosPersonales.locator('#CountryDialCodeId').click();
    const opcionesPais = page.locator('ul[role="listbox"] > li');
    const totalPaises = await opcionesPais.count();
    if (totalPaises > 0) {
      await opcionesPais.nth(Math.floor(Math.random() * totalPaises)).click();
    }

    const guardarBtn = page.locator('button[form="EditPersonalDataForm"]').filter({ hasText: 'Guardar' }).first();
    await expect(guardarBtn).toBeVisible({ timeout: 15000 });
    await guardarBtn.scrollIntoViewIfNeeded();
    await guardarBtn.click();

    await expect(seccionDatosPersonales.locator('p', { hasText: 'NuevoNombreQA NuevoApellidoQA' })).toBeVisible();
  
    // --- DATOS DEL NEGOCIO ---
    const seccionDatosNegocio = page.getByRole('heading', { name: 'Datos del negocio' })
      .locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-center") and contains(@class,"w-full")]');
  
    const btnEditarDatosNegocio = seccionDatosNegocio.locator('button', { hasText: 'Editar' }).first();
    await Promise.all([
      page.waitForURL(/\/provider\/profileEdit/, { timeout: 15000 }),
      btnEditarDatosNegocio.click()
    ]);

    const formularioDatosNegocio = page.locator('form#EditBusinessDataForm');
    await expect(formularioDatosNegocio).toBeVisible({ timeout: 15000 });

    const inputNombreNegocio = formularioDatosNegocio.locator('input#BusinessName');
    const inputTelefonoNegocio = formularioDatosNegocio.locator('input#PhoneNumber');
    const inputRfcNegocio = formularioDatosNegocio.locator('input#Rfc');

    await inputNombreNegocio.fill('Nuevo Negocio QA');
    await inputTelefonoNegocio.fill('9998888777');
    await inputRfcNegocio.fill('FIQ123456ABC');

    await formularioDatosNegocio.locator('#CountryDialCodeId').click();
    const paisesNegocio = page.locator('ul[role="listbox"] > li');
    const totalPaisesNegocio = await paisesNegocio.count();
    if (totalPaisesNegocio > 0) {
      await paisesNegocio.nth(Math.floor(Math.random() * totalPaisesNegocio)).click();
    }

    const guardarNegocioBtn = page.locator('button[form="EditBusinessDataForm"]').filter({ hasText: 'Guardar' }).first();
    await expect(guardarNegocioBtn).toBeVisible({ timeout: 15000 });
    await guardarNegocioBtn.scrollIntoViewIfNeeded();
    await guardarNegocioBtn.click();

    await expect(seccionDatosNegocio.locator('p', { hasText: 'Nuevo Negocio QA' })).toBeVisible();
    await expect(seccionDatosNegocio.locator('p', { hasText: 'Nuevo Negocio QA' })).toBeVisible();
   
    // --- PRESENCIA DIGITAL ---
  
    
    const btnEditarPresencia = page.locator(
      '//h5[normalize-space(text())="Presencia digital"]/following::button[p[normalize-space(text())="Editar"]][1]'
    );
    
    await btnEditarPresencia.click();
        


    await page.screenshot({ path: 'screenshots/presencia-digital.png', fullPage: true });

    
    const formularioPresenciaDigital = page.locator('form#EditSocialPresenceDataForm');
      await expect(formularioPresenciaDigital).toBeVisible({ timeout: 15000 });
  
      // Aquí se pueden llenar campos de redes sociales si existieran
      await formularioPresenciaDigital.locator('input#Facebook').fill('https://facebook.com/ProveedorQA');
      await formularioPresenciaDigital.locator('input#Instagram').fill('https://instagram.com/ProveedorQA');
      await formularioPresenciaDigital.locator('input#Tiktok').fill('https://tiktok.com/@ProveedorQA');
      await formularioPresenciaDigital.locator('input#WebSite').fill('https://proveedorqa.com');
  
      const guardarPresenciaBtn = page.locator('button[form="EditSocialPresenceDataForm"]').first();
      await expect(guardarPresenciaBtn).toBeVisible({ timeout: 15000 });
      await guardarPresenciaBtn.scrollIntoViewIfNeeded();
      await guardarPresenciaBtn.click();
  
    // --- CAMBIAR FOTO DE PERFIL ---
    const btnFotoPerfil = page.locator('button:has(i.icon-camera)').first();
    await expect(btnFotoPerfil).toBeVisible({ timeout: 10000 });
  
    await btnFotoPerfil.click({ force: true });
    const opcionCambiarFoto = page.locator('button', { hasText: 'Cambiar foto' }).first();
    await expect(opcionCambiarFoto).toBeVisible({ timeout: 5000 });
    await opcionCambiarFoto.scrollIntoViewIfNeeded();
    await opcionCambiarFoto.click({ force: true });
    const inputFoto = page.locator('input[type="file"]').first();
    await inputFoto.setInputFiles(path.resolve('./tests/profile.png'));
    const guardarFotoBtn = page.locator('button[type="submit"][form="UserProfilePictureForm"]').first();
    await expect(guardarFotoBtn).toBeVisible({ timeout: 5000 });
    await guardarFotoBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/provider\/profile/, { timeout: 15000 });
    await btnFotoPerfil.waitFor({ state: 'visible', timeout: 15000 });
    const avatarContainer = page.locator('div.relative').filter({
      has: page.locator('button:has(i.icon-camera)')
    }).first();
    await expect(avatarContainer).toBeVisible({ timeout: 15000 });
    const avatarImg = avatarContainer.locator('img');
    if (await avatarImg.count()) {
      const avatarSrc = await avatarImg.first().getAttribute('src');
      expect(avatarSrc).toBeTruthy();
      expect(avatarSrc ?? '').not.toMatch(/default|placeholder|initials/i);
    } else {
      const bgImage = await avatarContainer.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bgImage).toBeTruthy();
      expect(bgImage ?? '').not.toMatch(/default|placeholder|initials/i);
    }
    // --- OPCIONES ---
    const seccionOpciones = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Opciones")')
    }).first();
    await expect(seccionOpciones).toBeVisible({ timeout: 10000 });

    const opcionesEsperadas = [
      'Configurar métodos de pago',
      'Cambiar contraseña',
      'Cerrar sesión',
      'Solicitar eliminacion de cuenta'
    ];

    const botonesOpciones = seccionOpciones
      .locator('button.flex.flex-row')
      .filter({ has: page.locator('i.icon-chevron-right') });
    await expect(botonesOpciones).toHaveCount(opcionesEsperadas.length, { timeout: 10000 });

    for (const texto of opcionesEsperadas) {
      const boton = botonesOpciones.filter({ has: page.locator(`p:text("${texto}")`) }).first();
      await expect(boton).toBeVisible({ timeout: 5000 });
      await expect(boton.locator('i.icon-chevron-right')).toBeVisible();
    }

    // --- MÉTODOS DE PAGO ---
    const botonConfigurarPagos = botonesOpciones
      .filter({ has: page.locator('p:text("Configurar métodos de pago")') })
      .first();
    await expect(botonConfigurarPagos).toBeVisible({ timeout: 5000 });
    await botonConfigurarPagos.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForLoadState('networkidle'),
      botonConfigurarPagos.click()
    ]);

    const tituloMetodosPago = page.locator('p', { hasText: 'Métodos de pago' }).first();
    await expect(tituloMetodosPago).toBeVisible({ timeout: 15000 });

    const registrarMetodoBtn = page.locator('button', { hasText: 'Registrar método de pago' }).first();
    await expect(registrarMetodoBtn).toBeVisible({ timeout: 15000 });

    const paymentCards = page.locator('div.flex.items-center.px-4.py-3');

    const initialPaymentCount = await paymentCards.count();
    const nuevoDetalle = `Metodo QA ${Date.now()}`;

    // Alta de método de pago
    await registrarMetodoBtn.click();
    const formularioMetodoPago = page.locator('form#SaveProviderPaymentMethodForm');
    await expect(formularioMetodoPago).toBeVisible({ timeout: 10000 });

    await formularioMetodoPago.locator('#TypeId').click();
    const opcionesTipo = formularioMetodoPago.locator('button#TypeId ~ ul li');
    await expect(opcionesTipo.first()).toBeVisible({ timeout: 10000 });
    await opcionesTipo.first().click();

    const textareaDetalles = formularioMetodoPago.locator('textarea#Details');
    await textareaDetalles.fill(nuevoDetalle);

    const guardarMetodoBtn = page.locator('button[form="SaveProviderPaymentMethodForm"]').first();
    await expect(guardarMetodoBtn).toBeVisible({ timeout: 10000 });
    await guardarMetodoBtn.click();
    await formularioMetodoPago.waitFor({ state: 'detached', timeout: 15000 });

    const metodoCreado = page
      .locator('div.flex.items-center')
      .filter({ has: page.locator('p.text-dark-neutral', { hasText: nuevoDetalle }) })
      .first();
    await expect(paymentCards).toHaveCount(initialPaymentCount + 1, { timeout: 15000 });
    await expect(metodoCreado).toBeVisible({ timeout: 15000 });

    // Edición del método de pago
    await metodoCreado.locator('button:has(i.icon-edit)').first().click();
    await expect(formularioMetodoPago).toBeVisible({ timeout: 10000 });

    const detalleEditado = `${nuevoDetalle} editado`;
    await textareaDetalles.fill(detalleEditado);

    await guardarMetodoBtn.click();
    await formularioMetodoPago.waitFor({ state: 'detached', timeout: 15000 });

    const metodoEditado = page
      .locator('div.flex.items-center')
      .filter({ has: page.locator('p', { hasText: detalleEditado }) })
      .first();
    await expect(metodoEditado).toBeVisible({ timeout: 15000 });

    // Eliminación del método de pago
    await metodoEditado.locator('button:has(i.icon-trash)').first().click();

    const modalConfirmacion = page
      .locator('div', { hasText: '¿Seguro deseas eliminar este método de pago?' })
      .first();
    await expect(modalConfirmacion).toBeVisible({ timeout: 10000 });

    const botonAceptarEliminar = modalConfirmacion.locator('button', { hasText: 'Aceptar' }).first();
    await botonAceptarEliminar.click();
    await modalConfirmacion.waitFor({ state: 'detached', timeout: 10000 });

    await expect(paymentCards).toHaveCount(initialPaymentCount, { timeout: 15000 });
    await expect(page.locator('p', { hasText: detalleEditado })).toHaveCount(0);

    const botonRegresarMetodos = page.locator('nav button:has(i.icon-chevron-left-bold)').first();
    await Promise.all([
      page.waitForLoadState('networkidle'),
      botonRegresarMetodos.click()
    ]);

    await expect(seccionOpciones).toBeVisible({ timeout: 15000 });

    
 });
 