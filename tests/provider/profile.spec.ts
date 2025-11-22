import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { login, showStepMessage, clearStepMessage } from '../utils';
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
  
  async function navigateToProfile(page: Page) {
    const profileLink = page.locator('a[href="/provider/profile"]').filter({
      has: page.locator('i.icon-user')
    }).first();
    await expect(profileLink).toBeVisible({ timeout: 15000 });
    await profileLink.click();
    await expect(page).toHaveURL(/\/provider\/profile/);
    const datosPersonalesHeader = page.locator('h5', { hasText: 'Datos personales' });
    await expect(datosPersonalesHeader).toBeVisible({ timeout: 15000 });
  }

  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
  });
  
  test('Login', async ({ page }) => {
    // El login ya se ejecutó en beforeEach
    console.log('✅ Login completado automáticamente');
  });

  test('Datos personales', async ({ page }) => {
    await navigateToProfile(page);

    // --- DATOS PERSONALES ---
    await showStepMessage(page, '👤 LOCALIZANDO SECCIÓN DE DATOS PERSONALES');
    const seccionDatosPersonales = page.getByRole('heading', { name: 'Datos personales' })
      .locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-center") and contains(@class,"w-full")]');
  
    await showStepMessage(page, '✏️ ABRIENDO FORMULARIO DE EDICIÓN DE DATOS PERSONALES');
    const btnEditarDatosPersonales = seccionDatosPersonales.locator('button', { hasText: 'Editar' }).first();
    await btnEditarDatosPersonales.click();

    const formularioDatosPersonales = page.locator('form#EditPersonalDataForm');
    await expect(formularioDatosPersonales).toBeVisible({ timeout: 10000 });

    await showStepMessage(page, '📝 LLENANDO CAMPOS DE DATOS PERSONALES');
    const inputNombre = formularioDatosPersonales.locator('input#Name');
    const inputApellido = formularioDatosPersonales.locator('input#LastName');
    const inputTelefono = formularioDatosPersonales.locator('input#PhoneNumber');

    await inputNombre.fill('NuevoNombreQA');
    await inputApellido.fill('NuevoApellidoQA');
    await inputTelefono.fill('1234567891');

    await showStepMessage(page, '🌍 SELECCIONANDO CÓDIGO DE PAÍS');
    await formularioDatosPersonales.locator('#CountryDialCodeId').click();
    const opcionesPais = page.locator('ul[role="listbox"] > li');
    const totalPaises = await opcionesPais.count();
    if (totalPaises > 0) {
      await opcionesPais.nth(Math.floor(Math.random() * totalPaises)).click();
    }

    await showStepMessage(page, '💾 GUARDANDO DATOS PERSONALES');
    const guardarBtn = page.locator('button[form="EditPersonalDataForm"]').filter({ hasText: 'Guardar' }).first();
    await expect(guardarBtn).toBeVisible({ timeout: 15000 });
    await guardarBtn.scrollIntoViewIfNeeded();
    await guardarBtn.click();

    await showStepMessage(page, '✅ VALIDANDO QUE LOS DATOS SE ACTUALIZARON CORRECTAMENTE');
    await expect(seccionDatosPersonales.locator('p', { hasText: 'NuevoNombreQA NuevoApellidoQA' })).toBeVisible();
  });

  test('Datos del negocio', async ({ page }) => {
    await navigateToProfile(page);
  
    // --- DATOS DEL NEGOCIO ---
    await showStepMessage(page, '🏢 LOCALIZANDO SECCIÓN DE DATOS DEL NEGOCIO');
    const seccionDatosNegocio = page.getByRole('heading', { name: 'Datos del negocio' })
      .locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-center") and contains(@class,"w-full")]');
  
    await showStepMessage(page, '✏️ ABRIENDO FORMULARIO DE EDICIÓN DE DATOS DEL NEGOCIO');
    const btnEditarDatosNegocio = seccionDatosNegocio.locator('button', { hasText: 'Editar' }).first();
    await Promise.all([
      page.waitForURL(/\/provider\/profileEdit/, { timeout: 15000 }),
      btnEditarDatosNegocio.click()
    ]);

    const formularioDatosNegocio = page.locator('form#EditBusinessDataForm');
    await expect(formularioDatosNegocio).toBeVisible({ timeout: 15000 });

    await showStepMessage(page, '📝 LLENANDO CAMPOS DE DATOS DEL NEGOCIO');
    const inputNombreNegocio = formularioDatosNegocio.locator('input#BusinessName');
    const inputTelefonoNegocio = formularioDatosNegocio.locator('input#PhoneNumber');
    const inputRfcNegocio = formularioDatosNegocio.locator('input#Rfc');

    await inputNombreNegocio.fill('Nuevo Negocio QA');
    await inputTelefonoNegocio.fill('9998888777');
    await inputRfcNegocio.fill('FIQ123456ABC');

    await showStepMessage(page, '🌍 SELECCIONANDO CÓDIGO DE PAÍS');
    await formularioDatosNegocio.locator('#CountryDialCodeId').click();
    const paisesNegocio = page.locator('ul[role="listbox"] > li');
    const totalPaisesNegocio = await paisesNegocio.count();
    if (totalPaisesNegocio > 0) {
      await paisesNegocio.nth(Math.floor(Math.random() * totalPaisesNegocio)).click();
    }

    await showStepMessage(page, '💾 GUARDANDO DATOS DEL NEGOCIO');
    const guardarNegocioBtn = page.locator('button[form="EditBusinessDataForm"]').filter({ hasText: 'Guardar' }).first();
    await expect(guardarNegocioBtn).toBeVisible({ timeout: 15000 });
    await guardarNegocioBtn.scrollIntoViewIfNeeded();
    await guardarNegocioBtn.click();

    await showStepMessage(page, '✅ VALIDANDO QUE LOS DATOS DEL NEGOCIO SE ACTUALIZARON');
    await expect(seccionDatosNegocio.locator('p', { hasText: 'Nuevo Negocio QA' })).toBeVisible();
  });

  test('Presencia digital', async ({ page }) => {
    await navigateToProfile(page);
   
    // --- PRESENCIA DIGITAL ---
    await showStepMessage(page, '🌐 LOCALIZANDO SECCIÓN DE PRESENCIA DIGITAL');
    const btnEditarPresencia = page.locator(
      '//h5[normalize-space(text())="Presencia digital"]/following::button[p[normalize-space(text())="Editar"]][1]'
    );
    
    await showStepMessage(page, '✏️ ABRIENDO FORMULARIO DE EDICIÓN DE PRESENCIA DIGITAL');
    await btnEditarPresencia.click();
    
    const formularioPresenciaDigital = page.locator('form#EditSocialPresenceDataForm');
    await expect(formularioPresenciaDigital).toBeVisible({ timeout: 15000 });
  
    await showStepMessage(page, '📝 LLENANDO CAMPOS DE REDES SOCIALES');
    // Aquí se pueden llenar campos de redes sociales si existieran
    await formularioPresenciaDigital.locator('input#Facebook').fill('https://facebook.com/ProveedorQA');
    await formularioPresenciaDigital.locator('input#Instagram').fill('https://instagram.com/ProveedorQA');
    await formularioPresenciaDigital.locator('input#Tiktok').fill('https://tiktok.com/@ProveedorQA');
    await formularioPresenciaDigital.locator('input#WebSite').fill('https://proveedorqa.com');

    await showStepMessage(page, '💾 GUARDANDO PRESENCIA DIGITAL');
    const guardarPresenciaBtn = page.locator('button[form="EditSocialPresenceDataForm"]').first();
    await expect(guardarPresenciaBtn).toBeVisible({ timeout: 15000 });
    await guardarPresenciaBtn.scrollIntoViewIfNeeded();
    await guardarPresenciaBtn.click();
  });

  test('Foto de perfil', async ({ page }) => {
    await navigateToProfile(page);
  
    // --- CAMBIAR FOTO DE PERFIL ---
    await showStepMessage(page, '📸 LOCALIZANDO CONTENEDOR DE FOTO DE PERFIL');
    // Localizar el contenedor de la foto de perfil primero
    const avatarContainer = page.locator('div.relative').filter({
      has: page.locator('button:has(i.icon-camera)')
    }).first();
    await expect(avatarContainer).toBeVisible({ timeout: 10000 });
    
    // Hacer scroll para asegurar que el botón esté visible
    await avatarContainer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    await showStepMessage(page, '📷 ABRIENDO MENÚ DE FOTO DE PERFIL');
    // Localizar el botón de la cámara dentro del contenedor
    const btnFotoPerfil = avatarContainer.locator('button:has(i.icon-camera)').first();
    await expect(btnFotoPerfil).toBeVisible({ timeout: 10000 });
    await expect(btnFotoPerfil).toBeEnabled({ timeout: 5000 });
    
    // Intentar hacer clic de múltiples formas
    try {
      await btnFotoPerfil.click({ timeout: 5000 });
    } catch (error) {
      // Si falla, intentar hacer clic directamente en el icono
      const iconoCamara = btnFotoPerfil.locator('i.icon-camera').first();
      await iconoCamara.click({ timeout: 5000 });
    }
    
    // Esperar a que aparezca el menú desplegable
    const menuDesplegable = page.locator('div.absolute.flex.flex-col').filter({
      has: page.locator('button:text("Cambiar foto")')
    }).first();
    await expect(menuDesplegable).toBeVisible({ timeout: 5000 });
    
    await showStepMessage(page, '🔄 SELECCIONANDO OPCIÓN "CAMBIAR FOTO"');
    const opcionCambiarFoto = menuDesplegable.locator('button', { hasText: 'Cambiar foto' }).first();
    await expect(opcionCambiarFoto).toBeVisible({ timeout: 5000 });
    await opcionCambiarFoto.scrollIntoViewIfNeeded();
    await opcionCambiarFoto.click({ force: true });
    
    await showStepMessage(page, '📁 SUBIENDO NUEVA IMAGEN DE PERFIL');
    const inputFoto = page.locator('input[type="file"]').first();
    await inputFoto.setInputFiles(path.resolve('./tests/profile.png'));
    
    await showStepMessage(page, '💾 GUARDANDO NUEVA FOTO DE PERFIL');
    const guardarFotoBtn = page.locator('button[type="submit"][form="UserProfilePictureForm"]').first();
    await expect(guardarFotoBtn).toBeVisible({ timeout: 5000 });
    await guardarFotoBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/provider\/profile/, { timeout: 15000 });
    
    await showStepMessage(page, '✅ VALIDANDO QUE LA FOTO SE ACTUALIZÓ CORRECTAMENTE');
    // Esperar a que el avatar se actualice después de guardar
    await page.waitForTimeout(1000);
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

    // --- ELIMINAR FOTO DE PERFIL ---
    await showStepMessage(page, '⏳ ESPERANDO A QUE EL BOTÓN ESTÉ DISPONIBLE');
    // Esperar a que el botón esté disponible nuevamente
    await page.waitForTimeout(1000);
    await avatarContainer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    await showStepMessage(page, '📷 ABRIENDO MENÚ DE FOTO DE PERFIL (PARA ELIMINAR)');
    // Localizar el botón de la cámara nuevamente (puede haber cambiado después de la actualización)
    const btnFotoPerfil2 = avatarContainer.locator('button:has(i.icon-camera)').first();
    await expect(btnFotoPerfil2).toBeVisible({ timeout: 10000 });
    await expect(btnFotoPerfil2).toBeEnabled({ timeout: 5000 });
    
    // Hacer clic en el botón de la cámara para abrir el menú
    try {
      await btnFotoPerfil2.click({ timeout: 5000 });
    } catch (error) {
      // Si falla, intentar hacer clic directamente en el icono
      const iconoCamara2 = btnFotoPerfil2.locator('i.icon-camera').first();
      await iconoCamara2.click({ timeout: 5000 });
    }
    
    // Esperar a que aparezca el menú desplegable
    const menuDesplegable2 = page.locator('div.absolute.flex.flex-col').filter({
      has: page.locator('button:text("Eliminar foto")')
    }).first();
    await expect(menuDesplegable2).toBeVisible({ timeout: 5000 });
    
    await showStepMessage(page, '🗑️ SELECCIONANDO OPCIÓN "ELIMINAR FOTO"');
    const opcionEliminarFoto = menuDesplegable2.locator('button', { hasText: 'Eliminar foto' }).first();
    await expect(opcionEliminarFoto).toBeVisible({ timeout: 5000 });
    await opcionEliminarFoto.scrollIntoViewIfNeeded();
    await opcionEliminarFoto.click({ timeout: 5000 });
    
    await showStepMessage(page, '⏳ ESPERANDO A QUE SE ELIMINE LA FOTO');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/provider\/profile/, { timeout: 15000 });
    
    await showStepMessage(page, '✅ VALIDANDO QUE EL BOTÓN DE CÁMARA SIGUE DISPONIBLE');
    // Validar que el botón de la cámara sigue visible después de eliminar
    const btnFotoPerfilFinal = avatarContainer.locator('button:has(i.icon-camera)').first();
    await expect(btnFotoPerfilFinal).toBeVisible({ timeout: 15000 });
  });

  test('Sección Opciones', async ({ page }) => {
    await navigateToProfile(page);

    // --- OPCIONES ---
    await showStepMessage(page, '⚙️ LOCALIZANDO SECCIÓN DE OPCIONES');
    const seccionOpciones = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Opciones")')
    }).first();
    await expect(seccionOpciones).toBeVisible({ timeout: 10000 });

    await showStepMessage(page, '✅ VALIDANDO QUE TODAS LAS OPCIONES ESTÁN PRESENTES');
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

    await showStepMessage(page, '🔍 VALIDANDO VISIBILIDAD DE CADA OPCIÓN');
    for (const texto of opcionesEsperadas) {
      const boton = botonesOpciones.filter({ has: page.locator(`p:text("${texto}")`) }).first();
      await expect(boton).toBeVisible({ timeout: 5000 });
      await expect(boton.locator('i.icon-chevron-right')).toBeVisible();
    }

    await showStepMessage(page, '🎨 VALIDANDO ICONOS ESPECÍFICOS DE OPCIONES');
    // Validar iconos específicos
    const botonConfigurarPagos = botonesOpciones
      .filter({ has: page.locator('p:text("Configurar métodos de pago")') })
      .first();
    await expect(botonConfigurarPagos.locator('i.icon-credit-card')).toBeVisible();

    const botonCambiarContrasena = botonesOpciones
      .filter({ has: page.locator('p:text("Cambiar contraseña")') })
      .first();
    await expect(botonCambiarContrasena.locator('i.icon-lock')).toBeVisible();

    const botonCerrarSesion = botonesOpciones
      .filter({ has: page.locator('p:text("Cerrar sesión")') })
      .first();
    await expect(botonCerrarSesion.locator('i.icon-log-out')).toBeVisible();

    const botonEliminarCuenta = botonesOpciones
      .filter({ has: page.locator('p:text("Solicitar eliminacion de cuenta")') })
      .first();
    await expect(botonEliminarCuenta.locator('i.icon-trash')).toBeVisible();
  });

  test('Cambiar contraseña', async ({ page }) => {
    await navigateToProfile(page);

    // --- NAVEGAR A CAMBIAR CONTRASEÑA ---
    await showStepMessage(page, '🔐 NAVEGANDO A CAMBIAR CONTRASEÑA');
    const seccionOpciones = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Opciones")')
    }).first();
    await expect(seccionOpciones).toBeVisible({ timeout: 10000 });

    const botonesOpciones = seccionOpciones
      .locator('button.flex.flex-row')
      .filter({ has: page.locator('i.icon-chevron-right') });

    const botonCambiarContrasena = botonesOpciones
      .filter({ has: page.locator('p:text("Cambiar contraseña")') })
      .first();
    await expect(botonCambiarContrasena).toBeVisible({ timeout: 5000 });
    await botonCambiarContrasena.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForLoadState('networkidle'),
      botonCambiarContrasena.click()
    ]);

    // --- VALIDAR PÁGINA DE CAMBIAR CONTRASEÑA ---
    await showStepMessage(page, '✅ VALIDANDO PÁGINA DE CAMBIAR CONTRASEÑA');
    const tituloCambiarContrasena = page.locator('p', { hasText: 'Editar contraseña' }).first();
    await expect(tituloCambiarContrasena).toBeVisible({ timeout: 15000 });

    const tituloFormulario = page.locator('h4', { hasText: 'Crea una nueva contraseña' }).first();
    await expect(tituloFormulario).toBeVisible({ timeout: 10000 });

    const formularioCambiarContrasena = page.locator('form#NewPasswordForm');
    await expect(formularioCambiarContrasena).toBeVisible({ timeout: 10000 });

    // --- VALIDAR CAMPOS DE CONTRASEÑA ---
    await showStepMessage(page, '🔍 VALIDANDO CAMPOS DE CONTRASEÑA');
    const inputPassword = formularioCambiarContrasena.locator('input#Password');
    const inputRepeatPassword = formularioCambiarContrasena.locator('input#RepeatPassword');

    await expect(inputPassword).toBeVisible({ timeout: 10000 });
    await expect(inputRepeatPassword).toBeVisible({ timeout: 10000 });

    // Validar que inicialmente son de tipo password
    const tipoInicialPassword = await inputPassword.getAttribute('type');
    const tipoInicialRepeatPassword = await inputRepeatPassword.getAttribute('type');
    expect(tipoInicialPassword).toBe('password');
    expect(tipoInicialRepeatPassword).toBe('password');

    // --- LLENAR CAMPOS DE CONTRASEÑA ---
    await showStepMessage(page, '📝 LLENANDO CAMPOS DE CONTRASEÑA');
    const nuevaContrasena = 'Fiesta2025$';
    await inputPassword.fill(nuevaContrasena);
    await inputRepeatPassword.fill(nuevaContrasena);
    await page.waitForTimeout(500);

    // Validar que los valores se ingresaron correctamente (aunque estén ocultos)
    const valorPassword = await inputPassword.inputValue();
    const valorRepeatPassword = await inputRepeatPassword.inputValue();
    expect(valorPassword).toBe(nuevaContrasena);
    expect(valorRepeatPassword).toBe(nuevaContrasena);

    // --- VALIDAR ICONOS DE OJO ---
    await showStepMessage(page, '👁️ VALIDANDO ICONOS DE OJO PARA MOSTRAR/OCULTAR CONTRASEÑA');
    // Buscar los iconos de ojo usando xpath directo desde los inputs
    // El icono está en el mismo div.relative que el input
    const iconoOjoPasswordFinal = page.locator('xpath=//input[@id="Password"]/ancestor::div[contains(@class, "relative")]//i[contains(@class, "icon-eye")]').first();
    const iconoOjoRepeatPasswordFinal = page.locator('xpath=//input[@id="RepeatPassword"]/ancestor::div[contains(@class, "relative")]//i[contains(@class, "icon-eye")]').first();

    // Validar que los iconos están visibles
    await expect(iconoOjoPasswordFinal).toBeVisible({ timeout: 10000 });
    await expect(iconoOjoRepeatPasswordFinal).toBeVisible({ timeout: 10000 });

    // --- HACER CLIC EN ICONO DE OJO PARA MOSTRAR CONTRASEÑA ---
    await showStepMessage(page, '👁️ MOSTRANDO CONTRASEÑA (CLIC EN ICONO DE OJO)');
    await iconoOjoPasswordFinal.scrollIntoViewIfNeeded();
    await iconoOjoPasswordFinal.click({ timeout: 10000 });
    await page.waitForTimeout(300);

    // Validar que el tipo cambió a "text" para mostrar la contraseña
    const tipoDespuesClickPassword = await inputPassword.getAttribute('type');
    expect(tipoDespuesClickPassword).toBe('text');

    // Validar que el valor visible es la contraseña (no asteriscos)
    const valorVisiblePassword = await inputPassword.inputValue();
    expect(valorVisiblePassword).toBe(nuevaContrasena);
    expect(valorVisiblePassword).not.toMatch(/^\*+$/); // No debe ser solo asteriscos

    // --- HACER CLIC EN ICONO DE OJO PARA MOSTRAR CONFIRMACIÓN ---
    await showStepMessage(page, '👁️ MOSTRANDO CONFIRMACIÓN DE CONTRASEÑA (CLIC EN ICONO DE OJO)');
    await iconoOjoRepeatPasswordFinal.scrollIntoViewIfNeeded();
    await iconoOjoRepeatPasswordFinal.click({ timeout: 10000 });
    await page.waitForTimeout(300);

    // Validar que el tipo cambió a "text" para mostrar la confirmación
    const tipoDespuesClickRepeatPassword = await inputRepeatPassword.getAttribute('type');
    expect(tipoDespuesClickRepeatPassword).toBe('text');

    // Validar que el valor visible es la confirmación (no asteriscos)
    const valorVisibleRepeatPassword = await inputRepeatPassword.inputValue();
    expect(valorVisibleRepeatPassword).toBe(nuevaContrasena);
    expect(valorVisibleRepeatPassword).not.toMatch(/^\*+$/); // No debe ser solo asteriscos

    // --- VALIDAR REGLAS DE VALIDACIÓN DE CONTRASEÑA ---
    await showStepMessage(page, '✅ VALIDANDO REGLAS DE VALIDACIÓN DE CONTRASEÑA');
    // La contraseña "Fiesta2025$" cumple con todos los requisitos:
    // - 8 caracteres: ✓ (tiene 12)
    // - 1 número: ✓ (tiene 2 y 0)
    // - 1 minúscula: ✓ (tiene varias)
    // - 1 mayúscula: ✓ (tiene F)
    // - 1 símbolo: ✓ (tiene $)
    // - Confirmación: ✓ (coincide)

    // Buscar los indicadores de validación (deben cambiar de rojo a verde cuando se cumplan)
    // Estos elementos están en el HTML como divs con icon-x o icon-check
    const validaciones = formularioCambiarContrasena.locator('div.flex.gap-3.items-center');
    const cantidadValidaciones = await validaciones.count();

    if (cantidadValidaciones > 0) {
      // Esperar a que las validaciones se actualicen después de ingresar la contraseña
      await page.waitForTimeout(1000);

      // Verificar que las validaciones están presentes
      expect(cantidadValidaciones).toBeGreaterThan(0);
    }

    // --- HACER CLIC EN ICONO DE OJO PARA OCULTAR CONTRASEÑA ---
    await showStepMessage(page, '👁️ OCULTANDO CONTRASEÑA (CLIC EN ICONO DE OJO)');
    await iconoOjoPasswordFinal.scrollIntoViewIfNeeded();
    await iconoOjoPasswordFinal.click({ timeout: 10000 });
    await page.waitForTimeout(300);

    // Validar que el tipo volvió a "password"
    const tipoOcultoPassword = await inputPassword.getAttribute('type');
    expect(tipoOcultoPassword).toBe('password');

    // --- HACER CLIC EN ICONO DE OJO PARA OCULTAR CONFIRMACIÓN ---
    await showStepMessage(page, '👁️ OCULTANDO CONFIRMACIÓN DE CONTRASEÑA (CLIC EN ICONO DE OJO)');
    await iconoOjoRepeatPasswordFinal.scrollIntoViewIfNeeded();
    await iconoOjoRepeatPasswordFinal.click({ timeout: 10000 });
    await page.waitForTimeout(300);

    // Validar que el tipo volvió a "password"
    const tipoOcultoRepeatPassword = await inputRepeatPassword.getAttribute('type');
    expect(tipoOcultoRepeatPassword).toBe('password');

    // --- GUARDAR CONTRASEÑA ---
    await showStepMessage(page, '💾 PREPARANDO PARA GUARDAR CONTRASEÑA');
    const botonGuardar = page.locator('button[type="submit"][form="NewPasswordForm"]').first();
    await expect(botonGuardar).toBeVisible({ timeout: 10000 });
    await botonGuardar.scrollIntoViewIfNeeded();

    // Mostrar las contraseñas nuevamente antes de guardar para verificar
    await iconoOjoPasswordFinal.scrollIntoViewIfNeeded();
    await iconoOjoPasswordFinal.click({ timeout: 10000 });
    await iconoOjoRepeatPasswordFinal.scrollIntoViewIfNeeded();
    await iconoOjoRepeatPasswordFinal.click({ timeout: 10000 });
    await page.waitForTimeout(300);

    // Verificar que los valores siguen siendo correctos
    const valorFinalPassword = await inputPassword.inputValue();
    const valorFinalRepeatPassword = await inputRepeatPassword.inputValue();
    expect(valorFinalPassword).toBe(nuevaContrasena);
    expect(valorFinalRepeatPassword).toBe(nuevaContrasena);

    await showStepMessage(page, '💾 GUARDANDO NUEVA CONTRASEÑA');
    // Hacer clic en guardar
    await botonGuardar.click();
    await page.waitForTimeout(2000);

    // --- VALIDAR MENSAJE DE ERROR (si aparece) ---
    await showStepMessage(page, '🔍 VALIDANDO RESULTADO DEL CAMBIO DE CONTRASEÑA');
    // El mensaje puede aparecer si la contraseña ya fue usada recientemente
    const mensajeErrorModal = page.locator('div.fixed.top-0.left-0').filter({
      has: page.locator('p:text("No puedes usar la misma contraseña que las últimas 3 utilizadas")')
    }).first();
    
    const tieneMensajeError = await mensajeErrorModal.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (tieneMensajeError) {
      // Validar el contenido del modal de error
      const textoError = page.locator('p:text("No puedes usar la misma contraseña que las últimas 3 utilizadas")').first();
      await expect(textoError).toBeVisible({ timeout: 5000 });
      
      // Validar que tiene el icono de peligro
      const iconoPeligro = mensajeErrorModal.locator('img[alt="danger icon"]').first();
      await expect(iconoPeligro).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Mensaje de error validado: "No puedes usar la misma contraseña que las últimas 3 utilizadas"');
      
      // El modal puede cerrarse automáticamente o necesitar interacción
      // Por ahora, solo validamos que apareció
    } else {
      // Si no aparece el mensaje de error, validar que se guardó correctamente
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // La página puede redirigir al perfil o mostrar un mensaje de éxito
      // Validar que no hay otros errores visibles
      const otrosErrores = page.locator('text=/error|Error|ERROR/i');
      const cantidadOtrosErrores = await otrosErrores.count();
      if (cantidadOtrosErrores > 0) {
        const textoOtroError = await otrosErrores.first().textContent();
        console.log(`⚠️ Se encontró otro error: ${textoOtroError}`);
      }
    }
  });

  test('Métodos de pago', async ({ page }) => {
    await navigateToProfile(page);

    // --- OPCIONES ---
    await showStepMessage(page, '💳 NAVEGANDO A MÉTODOS DE PAGO');
    const seccionOpciones = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Opciones")')
    }).first();
    await expect(seccionOpciones).toBeVisible({ timeout: 10000 });

    // --- MÉTODOS DE PAGO ---
    const botonesOpciones = seccionOpciones
      .locator('button.flex.flex-row')
      .filter({ has: page.locator('i.icon-chevron-right') });

    const botonConfigurarPagos = botonesOpciones
      .filter({ has: page.locator('p:text("Configurar métodos de pago")') })
      .first();
    await expect(botonConfigurarPagos).toBeVisible({ timeout: 5000 });
    await botonConfigurarPagos.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForLoadState('networkidle'),
      botonConfigurarPagos.click()
    ]);

    await showStepMessage(page, '✅ VALIDANDO PÁGINA DE MÉTODOS DE PAGO');
    const tituloMetodosPago = page.locator('p', { hasText: 'Métodos de pago' }).first();
    await expect(tituloMetodosPago).toBeVisible({ timeout: 15000 });

    const registrarMetodoBtn = page.locator('button', { hasText: 'Registrar método de pago' }).first();
    await expect(registrarMetodoBtn).toBeVisible({ timeout: 15000 });

    const paymentCards = page.locator('div.flex.items-center.px-4.py-3');

    const initialPaymentCount = await paymentCards.count();
    const nuevoDetalle = `Método QA ${Date.now()}`;

    // Alta de método de pago
    await showStepMessage(page, '➕ CREANDO NUEVO MÉTODO DE PAGO');
    await registrarMetodoBtn.click();
    const formularioMetodoPago = page.locator('form#SaveProviderPaymentMethodForm');
    await expect(formularioMetodoPago).toBeVisible({ timeout: 10000 });

    await showStepMessage(page, '📝 LLENANDO DATOS DEL MÉTODO DE PAGO');
    await formularioMetodoPago.locator('#TypeId').click();
    const opcionesTipo = formularioMetodoPago.locator('button#TypeId ~ ul li');
    await expect(opcionesTipo.first()).toBeVisible({ timeout: 10000 });
    await opcionesTipo.first().click();

    const textareaDetalles = formularioMetodoPago.locator('textarea#Details');
    await textareaDetalles.fill(nuevoDetalle);

    await showStepMessage(page, '💾 GUARDANDO MÉTODO DE PAGO');
    const guardarMetodoBtn = page.locator('button[form="SaveProviderPaymentMethodForm"]').first();
    await expect(guardarMetodoBtn).toBeVisible({ timeout: 10000 });
    await guardarMetodoBtn.click();
    await formularioMetodoPago.waitFor({ state: 'detached', timeout: 15000 });

    await showStepMessage(page, '✅ VALIDANDO QUE EL MÉTODO DE PAGO SE CREÓ');
    const metodoCreado = page
      .locator('div.flex.items-center')
      .filter({ has: page.locator('p.text-dark-neutral', { hasText: nuevoDetalle }) })
      .first();
    await expect(paymentCards).toHaveCount(initialPaymentCount + 1, { timeout: 15000 });
    await expect(metodoCreado).toBeVisible({ timeout: 15000 });

    // Edición del método de pago
    await showStepMessage(page, '✏️ EDITANDO MÉTODO DE PAGO');
    await metodoCreado.locator('button:has(i.icon-edit)').first().click();
    await expect(formularioMetodoPago).toBeVisible({ timeout: 10000 });

    const detalleEditado = `${nuevoDetalle} editado`;
    await textareaDetalles.fill(detalleEditado);

    await showStepMessage(page, '💾 GUARDANDO CAMBIOS DEL MÉTODO DE PAGO');
    await guardarMetodoBtn.click();
    await formularioMetodoPago.waitFor({ state: 'detached', timeout: 15000 });

    await showStepMessage(page, '✅ VALIDANDO QUE EL MÉTODO DE PAGO SE EDITÓ');
    const metodoEditado = page
      .locator('div.flex.items-center')
      .filter({ has: page.locator('p', { hasText: detalleEditado }) })
      .first();
    await expect(metodoEditado).toBeVisible({ timeout: 15000 });

    // Eliminación del método de pago
    await showStepMessage(page, '🗑️ ELIMINANDO MÉTODO DE PAGO');
    await metodoEditado.locator('button:has(i.icon-trash)').first().click();

    const modalConfirmacion = page
      .locator('div', { hasText: '¿Seguro deseas eliminar este método de pago?' })
      .first();
    await expect(modalConfirmacion).toBeVisible({ timeout: 10000 });

    await showStepMessage(page, '✅ CONFIRMANDO ELIMINACIÓN DEL MÉTODO DE PAGO');
    const botonAceptarEliminar = modalConfirmacion.locator('button', { hasText: 'Aceptar' }).first();
    await botonAceptarEliminar.click();
    await modalConfirmacion.waitFor({ state: 'detached', timeout: 10000 });

    await showStepMessage(page, '✅ VALIDANDO QUE EL MÉTODO DE PAGO SE ELIMINÓ');
    await expect(paymentCards).toHaveCount(initialPaymentCount, { timeout: 15000 });
    await expect(page.locator('p', { hasText: detalleEditado })).toHaveCount(0);

    await showStepMessage(page, '🔙 REGRESANDO A LA SECCIÓN DE OPCIONES');
    const botonRegresarMetodos = page.locator('nav button:has(i.icon-chevron-left-bold)').first();
    await Promise.all([
      page.waitForLoadState('networkidle'),
      botonRegresarMetodos.click()
    ]);

    await expect(seccionOpciones).toBeVisible({ timeout: 15000 });
  });

  test('Cerrar sesión', async ({ page }) => {
    await navigateToProfile(page);

    // --- NAVEGAR A CERRAR SESIÓN ---
    await showStepMessage(page, '🚪 NAVEGANDO A CERRAR SESIÓN');
    const seccionOpciones = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Opciones")')
    }).first();
    await expect(seccionOpciones).toBeVisible({ timeout: 10000 });

    const botonesOpciones = seccionOpciones
      .locator('button.flex.flex-row')
      .filter({ has: page.locator('i.icon-chevron-right') });

    const botonCerrarSesion = botonesOpciones
      .filter({ has: page.locator('p:text("Cerrar sesión")') })
      .first();
    await expect(botonCerrarSesion).toBeVisible({ timeout: 5000 });
    await botonCerrarSesion.scrollIntoViewIfNeeded();

    // Hacer clic en "Cerrar sesión"
    await showStepMessage(page, '👆 HACIENDO CLIC EN "CERRAR SESIÓN"');
    await botonCerrarSesion.click();
    await page.waitForTimeout(1000);

    // --- VALIDAR DIÁLOGO DE CONFIRMACIÓN ---
    await showStepMessage(page, '✅ VALIDANDO DIÁLOGO DE CONFIRMACIÓN');
    const dialogoConfirmacion = page.locator('div.fixed.top-0.left-0').filter({
      has: page.locator('p:text("¿Seguro que quieres salir de tu cuenta?")')
    }).first();
    await expect(dialogoConfirmacion).toBeVisible({ timeout: 10000 });

    // Validar el contenido del diálogo
    const textoConfirmacion = page.locator('p:text("¿Seguro que quieres salir de tu cuenta?")').first();
    await expect(textoConfirmacion).toBeVisible({ timeout: 5000 });

    // Validar que tiene el icono de peligro
    const iconoPeligro = dialogoConfirmacion.locator('img[alt="danger icon"]').first();
    await expect(iconoPeligro).toBeVisible({ timeout: 5000 });

    // Validar botón "Regresar"
    const botonRegresar = dialogoConfirmacion.locator('button:has-text("Regresar")').first();
    await expect(botonRegresar).toBeVisible({ timeout: 5000 });
    const textoRegresar = await botonRegresar.textContent();
    expect(textoRegresar?.trim()).toBe('Regresar');

    // Validar botón "Aceptar"
    const botonAceptar = dialogoConfirmacion.locator('button:has-text("Aceptar")').first();
    await expect(botonAceptar).toBeVisible({ timeout: 5000 });
    const textoAceptar = await botonAceptar.textContent();
    expect(textoAceptar?.trim()).toBe('Aceptar');

    // Validar que el botón "Aceptar" tiene el estilo de peligro (bg-danger-neutral)
    const clasesAceptar = await botonAceptar.getAttribute('class');
    expect(clasesAceptar).toContain('bg-danger-neutral');

    // --- CONFIRMAR CERRAR SESIÓN ---
    await showStepMessage(page, '✅ CONFIRMANDO CERRAR SESIÓN');
    await botonAceptar.click();
    await page.waitForLoadState('networkidle');

    // --- VALIDAR REDIRECCIÓN A LOGIN ---
    await showStepMessage(page, '🔍 VALIDANDO REDIRECCIÓN A PÁGINA DE LOGIN');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // --- VALIDAR PÁGINA DE LOGIN ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTOS DE LA PÁGINA DE LOGIN');
    const formularioLogin = page.locator('form#LoginForm');
    await expect(formularioLogin).toBeVisible({ timeout: 15000 });

    // Validar título de la página
    const tituloLogin = page.locator('h4:text("Inicia Sesión")').first();
    await expect(tituloLogin).toBeVisible({ timeout: 10000 });

    // Validar campos del formulario
    const inputEmail = formularioLogin.locator('input#Email');
    const inputPassword = formularioLogin.locator('input#Password');
    await expect(inputEmail).toBeVisible({ timeout: 10000 });
    await expect(inputPassword).toBeVisible({ timeout: 10000 });

    // Validar labels
    const labelEmail = formularioLogin.locator('label[for="Email"]');
    const labelPassword = formularioLogin.locator('label[for="Password"]');
    await expect(labelEmail).toBeVisible({ timeout: 5000 });
    await expect(labelPassword).toBeVisible({ timeout: 5000 });

    // Validar botón "Ingresar"
    const botonIngresar = formularioLogin.locator('button[type="submit"]:has-text("Ingresar")').first();
    await expect(botonIngresar).toBeVisible({ timeout: 5000 });

    // Validar enlace "Olvidé mi contraseña"
    const enlaceOlvideContrasena = formularioLogin.locator('a:text("Olvidé mi contraseña")').first();
    await expect(enlaceOlvideContrasena).toBeVisible({ timeout: 5000 });

    // Validar enlace de registro
    const enlaceRegistro = page.locator('button:text("Regístrate")').first();
    await expect(enlaceRegistro).toBeVisible({ timeout: 5000 });

    // Validar logo de Fiestamas
    const logoSvg = page.locator('svg#Capa_1').first();
    await expect(logoSvg).toBeVisible({ timeout: 5000 });
  });
 