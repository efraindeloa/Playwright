import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import PNG from 'png-js';
import pixelmatch from 'pixelmatch';



test.use({ 
    viewport: { width: 1280, height: 720 }
  });
  
  // Configuración global de timeout
  test.setTimeout(60000); // 60 segundos de timeout para cada test
  
  // Función común para login
  async function login(page: Page) {
    // --- HOME ---
    await page.goto('https://staging.fiestamas.com');
    await page.waitForTimeout(2000);
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
    await page.waitForTimeout(2000);
  
    // --- DASHBOARD LIMPIO ---
    await screenshotAndCompare(page, 'login03-dashboard.png', 'refs/login03-dashboard.png');
  }
  

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
  
    if (imgBefore.width !== imgAfter.width || imgBefore.height !== imgAfter.height) {
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
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });
  
  test('Login', async ({ page }) => {
    // El login ya se ejecutó en beforeEach
    console.log('✅ Login completado automáticamente');
  });
  

 
  test('Editar perfil de proveedor y cambiar foto', async ({ page }) => {
    await page.goto('https://staging.fiestamas.com/provider/profile');
  
    // --- DATOS PERSONALES ---
    const seccionDatosPersonales = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Datos personales")')
    });
  
    const btnEditarDatosPersonales = seccionDatosPersonales.locator('button').filter({
      has: page.locator('p:text("Editar")')
    }).first();
    await btnEditarDatosPersonales.click();

    const inputNombre = seccionDatosPersonales.locator('input[name="Name"]');
    const inputApellido = seccionDatosPersonales.locator('input[name="LastName"]');
    const inputTelefono = seccionDatosPersonales.locator('input[id="PhoneNumber"]');

    // Esperar a que el input de nombre sea visible después de hacer clic en "Editar"
    await inputNombre.waitFor({ state: 'visible', timeout: 10000 });
    
    await inputNombre.fill('NuevoNombreQA');
    await inputApellido.fill('NuevoApellidoQA');
    await inputTelefono.fill('1234567890');
  
    // Seleccionar país aleatorio para teléfono
    await seccionDatosPersonales.locator('#CountryDialCodeId').click();
    const paises = await page.locator('ul[role="listbox"] > li').all();
    const randomPais = paises[Math.floor(Math.random() * paises.length)];
    await randomPais.click();
  
    await seccionDatosPersonales.locator('button:has-text("Guardar")').click();
  
    // Validar cambios
    await expect(seccionDatosPersonales.locator('p:text("NuevoNombreQA NuevoApellidoQA")')).toBeVisible();
    await expect(seccionDatosPersonales.locator('p:text("1234567890")')).toBeVisible();
  
    // --- DATOS DEL NEGOCIO ---
    const seccionDatosNegocio = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Datos del negocio")')
    });
  
    const btnEditarDatosNegocio = seccionDatosNegocio.locator('button').filter({
      has: page.locator('p:text("Editar")')
    }).first();
    await btnEditarDatosNegocio.click();

    const inputNombreNegocio = seccionDatosNegocio.locator('input[name="Name"]');
    const inputDireccionNegocio = seccionDatosNegocio.locator('input[name="Direccion"]');
    const inputTelefonoNegocio = seccionDatosNegocio.locator('input[id="PhoneNumber"]');

    // Esperar a que el input de nombre del negocio sea visible después de hacer clic en "Editar"
    await inputNombreNegocio.waitFor({ state: 'visible', timeout: 10000 });
    
    await inputNombreNegocio.fill('Nuevo Negocio QA');
    await inputDireccionNegocio.fill('C. Reforma 123, Centro, 47600 Tepatitlán, Jal.');
    await inputTelefonoNegocio.fill('9998888777');
  
    // Seleccionar país aleatorio para teléfono del negocio
    await seccionDatosNegocio.locator('#CountryDialCodeId').click();
    const paisesNegocio = await page.locator('ul[role="listbox"] > li').all();
    const randomPaisNegocio = paisesNegocio[Math.floor(Math.random() * paisesNegocio.length)];
    await randomPaisNegocio.click();
  
    await seccionDatosNegocio.locator('button:has-text("Guardar")').click();
  
    // Validar cambios
    await expect(seccionDatosNegocio.locator('p:text("Nuevo Negocio QA")')).toBeVisible();
    await expect(seccionDatosNegocio.locator('p:text("C. Reforma 123, Centro, 47600 Tepatitlán, Jal.")')).toBeVisible();
    await expect(seccionDatosNegocio.locator('p:text("9998888777")')).toBeVisible();
  
    // --- PRESENCIA DIGITAL ---
    const seccionPresenciaDigital = page.locator('div.flex-col').filter({
      has: page.locator('h5:text("Presencia digital")')
    });
  
    const btnEditarPresencia = seccionPresenciaDigital.locator('button').filter({
      has: page.locator('p:text("Editar")')
    }).first();
    await btnEditarPresencia.click();
  
    // Aquí se pueden llenar campos de redes sociales si existieran
    // await seccionPresenciaDigital.locator('input[name="Instagram"]').fill('https://instagram.com/nuevoPerfilQA');
  
    await seccionPresenciaDigital.locator('button:has-text("Guardar")').click();
    await expect(seccionPresenciaDigital.locator('div:text("No hay información")')).toBeVisible();
  
    // --- CAMBIAR FOTO DE PERFIL ---
    const btnFotoPerfil = page.locator('button:has(i.icon-camera)').first();
    await btnFotoPerfil.setInputFiles(path.resolve('./tests/fixtures/nueva-foto.png'));
  
    const avatar = page.locator('img.avatar');
    await expect(avatar).toHaveAttribute('src', /nueva-foto/);
  
    // --- OPCIONES ADICIONALES ---
    const btnOpciones = page.locator('button:has(i.icon-more-vertical)').first();
    await btnOpciones.click();
  
    const opcionCambiarContrasena = page.locator('div[role="menu"] >> text=Cambiar contraseña');
    await expect(opcionCambiarContrasena).toBeVisible();
  
    const opcionCerrarSesion = page.locator('div[role="menu"] >> text=Cerrar sesión');
    await expect(opcionCerrarSesion).toBeVisible();
  });
  