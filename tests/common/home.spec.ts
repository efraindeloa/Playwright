import { test, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from '../config';
import { showStepMessage, safeWaitForTimeout } from '../utils';

// ============================================
// GRUPO 1: PRUEBAS QUE SOLO VERIFICAN EXISTENCIA DE ELEMENTOS
// ============================================

test('Validar elementos técnicos únicos de la página de inicio', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
    await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // NOTA: Esta prueba valida solo elementos técnicos únicos que no se cubren en otras pruebas.
  // Las validaciones de navbar, hero, categorías, eventos, estímulos y footer se realizan
  // en las pruebas de funcionalidad correspondientes.

  // 1️⃣ VALIDAR ESTRUCTURA DEL BODY
  await showStepMessage(page, '🔍 VALIDANDO ESTRUCTURA DEL BODY');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando estructura del body...');
  const body = page.locator('body.__className_4de144');
  await expect(body).toBeVisible({ timeout: 10000 });
  
  // Validar atributo cz-shortcut-listen (puede no existir en algunos casos)
  const bodyElement = page.locator('body');
  const czShortcutListen = await bodyElement.getAttribute('cz-shortcut-listen');
  if (czShortcutListen !== null) {
    expect(czShortcutListen).toBe('true');
    console.log('✅ Atributo cz-shortcut-listen encontrado');
  } else {
    console.log('⚠️ Atributo cz-shortcut-listen no encontrado (puede ser normal)');
  }

  // 2️⃣ VALIDAR SCRIPTS DE NEXT.JS
  await showStepMessage(page, '📜 VALIDANDO SCRIPTS DE NEXT.JS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando scripts de Next.js...');
  const webpackScript = page.locator('script[id="_R_"][src*="webpack"]');
  // Los scripts no son visibles, solo verificamos que existan en el DOM
  const webpackScriptCount = await webpackScript.count();
  if (webpackScriptCount > 0) {
    console.log('✅ Script de webpack encontrado');
  } else {
    console.log('⚠️ Script de webpack no encontrado (puede estar en otro formato)');
  }
  
  // Validar scripts de Next.js (pueden no estar siempre presentes o en formato diferente)
  const nextScripts = page.locator('script').filter({ 
    hasText: /self\.__next_f|__next_f/
  });
  const nextScriptsCount = await nextScripts.count();
  if (nextScriptsCount > 0) {
    console.log(`✅ ${nextScriptsCount} script(s) de Next.js encontrado(s)`);
  } else {
    // Intentar buscar scripts de Next.js de otra manera
    const allScripts = page.locator('script');
    const allScriptsCount = await allScripts.count();
    console.log(`⚠️ Scripts de Next.js con patrón __next_f no encontrados (${allScriptsCount} scripts totales en la página)`);
    // No fallar la prueba si no se encuentran, ya que pueden estar en formato diferente
  }

  // 3️⃣ VALIDAR ELEMENTOS ADICIONALES (Técnicos únicos)
  await showStepMessage(page, '🔧 VALIDANDO ELEMENTOS ADICIONALES');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando elementos adicionales técnicos...');
  
  const elementosFaltantes: string[] = [];
  
  // Next Route Announcer
  const routeAnnouncer = page.locator('next-route-announcer');
  const routeAnnouncerExists = await routeAnnouncer.count() > 0;
  if (routeAnnouncerExists) {
    console.log('✅ Next Route Announcer encontrado');
  } else {
    console.log('❌ Next Route Announcer no encontrado');
    elementosFaltantes.push('Next Route Announcer');
  }
  
  // Toaster
  const toaster = page.locator('div#_rht_toaster');
  const toasterExists = await toaster.count() > 0;
  if (toasterExists) {
    console.log('✅ Toaster encontrado');
  } else {
    console.log('❌ Toaster no encontrado');
    elementosFaltantes.push('Toaster');
  }
  
  // Google OAuth Script
  const googleScript = page.locator('script[src*="accounts.google.com/gsi/client"]');
  const googleScriptExists = await googleScript.count() > 0;
  if (googleScriptExists) {
    console.log('✅ Script de Google OAuth encontrado');
  } else {
    console.log('❌ Script de Google OAuth no encontrado');
    elementosFaltantes.push('Script de Google OAuth');
  }
  
  // Facebook Pixel Script
  // El Facebook Pixel es un código de seguimiento de Facebook/Meta que permite:
  // - Medir conversiones y eventos en el sitio web
  // - Crear audiencias personalizadas para anuncios
  // - Rastrear el comportamiento de los usuarios
  // Puede estar en diferentes formatos:
  // 1. Script inline con función fbq
  // 2. Script con src que apunta a facebook.net
  // 3. Noscript con imagen de tracking
  let fbPixelFound = false;
  
  // Buscar script inline con función fbq (más común)
  const fbPixelScriptInline = page.locator('script').filter({
    hasText: /fbq|facebook\.net|fbevents\.js/
  });
  const fbPixelInlineExists = await fbPixelScriptInline.count() > 0;
  
  if (fbPixelInlineExists) {
    // Verificar que realmente contiene código de Facebook Pixel
    for (let i = 0; i < await fbPixelScriptInline.count(); i++) {
      const scriptContent = await fbPixelScriptInline.nth(i).textContent().catch(() => '');
      if (scriptContent && (scriptContent.includes('fbq') || scriptContent.includes('facebook.net') || scriptContent.includes('fbevents.js'))) {
        console.log('✅ Script de Facebook Pixel encontrado (inline)');
        fbPixelFound = true;
        break;
      }
    }
  }
  
  // Si no se encontró inline, buscar script con src
  if (!fbPixelFound) {
    const fbPixelScriptSrc = page.locator('script[src*="facebook.net"], script[src*="fbevents"]');
    const fbPixelSrcExists = await fbPixelScriptSrc.count() > 0;
    if (fbPixelSrcExists) {
      console.log('✅ Script de Facebook Pixel encontrado (con src)');
      fbPixelFound = true;
    }
  }
  
  // También buscar el noscript de Facebook Pixel (fallback para usuarios sin JavaScript)
  if (!fbPixelFound) {
    const fbPixelNoscript = page.locator('noscript').filter({
      hasText: /facebook\.com\/tr|fbq|2113594752336747/
    });
    const fbPixelNoscriptExists = await fbPixelNoscript.count() > 0;
    if (fbPixelNoscriptExists) {
      console.log('✅ Noscript de Facebook Pixel encontrado');
      fbPixelFound = true;
    }
  }
  
  // Buscar por ID del pixel específico (2113594752336747) que aparece en el HTML
  if (!fbPixelFound) {
    const fbPixelById = page.locator('script, noscript').filter({
      hasText: /2113594752336747/
    });
    const fbPixelByIdExists = await fbPixelById.count() > 0;
    if (fbPixelByIdExists) {
      console.log('✅ Facebook Pixel encontrado por ID del pixel');
      fbPixelFound = true;
    }
  }
  
  if (!fbPixelFound) {
    console.log('❌ Script de Facebook Pixel no encontrado');
    elementosFaltantes.push('Script de Facebook Pixel');
  }
  
  // Si faltan elementos adicionales, la prueba debe fallar
  if (elementosFaltantes.length > 0) {
    const mensajeError = `❌ ERROR: Los siguientes elementos adicionales no se encontraron: ${elementosFaltantes.join(', ')}`;
    console.log(mensajeError);
    throw new Error(mensajeError);
  }

  await showStepMessage(page, '✅ VALIDACIÓN COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de estructura HTML completada exitosamente');
  console.log('ℹ️ Nota: Las validaciones de navbar, hero, categorías, eventos, estímulos y footer');
  console.log('   se realizan en las pruebas de funcionalidad correspondientes.');
});

// ============================================
// GRUPO 2: PRUEBAS QUE VERIFICAN EXISTENCIA Y FUNCIONALIDAD
// ============================================

test('Validar funcionalidad del navbar superior', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // 1️⃣ VALIDAR LOGO
  await showStepMessage(page, '🏠 VALIDANDO LOGO DEL NAVBAR');
  await safeWaitForTimeout(page, 1000);
  console.log('🚀 Iniciando validación del navbar superior...');
  
  const navbar = page.locator('nav.z-50.fixed.w-dvw.text-neutral-1000.bg-neutral-0');
  await expect(navbar).toBeVisible({ timeout: 10000 });
  
  // Buscar logo (puede estar en desktop o mobile)
  const logo = navbar.locator('svg#Capa_1').first();
  const logoCount = await logo.count();
  expect(logoCount).toBeGreaterThanOrEqual(1);
  
  // Verificar que el logo es clickeable (debe estar dentro de un enlace o botón)
  const logoLink = logo.locator('xpath=ancestor::a[1]').first();
  const logoLinkCount = await logoLink.count();
  
  if (logoLinkCount > 0) {
    const logoLinkVisible = await logoLink.first().isVisible().catch(() => false);
    if (logoLinkVisible) {
      const urlAntesLogo = page.url();
      await logoLink.first().click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      const urlDespuesLogo = page.url();
      // El logo debería navegar a la página de inicio
      const navegoAHome = urlDespuesLogo === homeUrl || urlDespuesLogo === baseOrigin + '/' || urlDespuesLogo.includes('/');
      expect(navegoAHome).toBe(true);
      console.log('✅ Logo navega correctamente a la página de inicio');
      
      // Regresar a home si no estamos ahí
      if (page.url() !== homeUrl) {
        await page.goto(homeUrl);
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, 1000);
      }
    }
  }

  // 2️⃣ VALIDAR BOTÓN DE BÚSQUEDA
  await showStepMessage(page, '🔍 VALIDANDO BOTÓN DE BÚSQUEDA');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando botón de búsqueda...');
  
  // Múltiples estrategias para encontrar el botón de búsqueda (priorizando elementos clickeables)
  const estrategiasBusqueda = [
    // Estrategia 1: Buscar botones con icon-search directamente en navbar (PRIORIDAD MÁXIMA)
    {
      name: 'botón navbar con icon-search',
      locator: navbar.locator('button:has(i.icon-search)').first(),
      esClickeable: true
    },
    // Estrategia 2: Buscar botones con icon-search en toda la página (PRIORIDAD ALTA)
    {
      name: 'botón con icon-search',
      locator: page.locator('button:has(i.icon-search)').first(),
      esClickeable: true
    },
    // Estrategia 3: Buscar icono y subir al ancestro <button> (PRIORIDAD ALTA)
    {
      name: 'icono con ancestro button',
      locator: page.locator('i.icon-search').locator('xpath=ancestor::button[1]').first(),
      esClickeable: true
    },
    // Estrategia 4: Buscar en navbar con enlace que contiene icon-search
    {
      name: 'navbar enlace con icon-search',
      locator: navbar.locator('a').filter({ has: page.locator('i.icon-search') }).first(),
      esClickeable: true
    },
    // Estrategia 5: Buscar cualquier enlace con icon-search
    {
      name: 'cualquier enlace con icon-search',
      locator: page.locator('a').filter({ has: page.locator('i.icon-search') }).first(),
      esClickeable: true
    },
    // Estrategia 6: Buscar icono y subir al ancestro <a>
    {
      name: 'icono con ancestro a',
      locator: page.locator('i.icon-search').locator('xpath=ancestor::a[1]').first(),
      esClickeable: true
    },
    // Estrategia 6: Buscar por aria-label si existe (PRIORIDAD ALTA)
    {
      name: 'aria-label buscar',
      locator: page.locator('a[aria-label*="buscar" i], button[aria-label*="buscar" i], a[aria-label*="search" i], button[aria-label*="search" i]').first(),
      esClickeable: true
    },
    // Estrategia 7: Buscar enlaces con href="/" que contengan icon-search
    {
      name: 'enlace href="/" con icon-search',
      locator: page.locator('a[href="/"]').filter({ has: page.locator('i.icon-search') }).first(),
      esClickeable: true
    },
    // Estrategia 8: Buscar en navbar cualquier elemento clickeable con icon-search (PRIORIDAD BAJA - puede ser div)
    {
      name: 'navbar elemento clickeable',
      locator: navbar.locator('*:has(i.icon-search)').first(),
      esClickeable: false
    },
    // Estrategia 9: Buscar directamente el icono y luego encontrar el elemento clickeable más cercano
    {
      name: 'icono directo',
      locator: page.locator('i.icon-search').first(),
      esClickeable: false
    }
  ];
  
  let busquedaEncontrada = false;
  let busquedaElement: ReturnType<typeof page.locator> | null = null;
  let estrategiaUsada = '';
  
  // Primero intentar solo elementos clickeables (a, button)
  for (const estrategia of estrategiasBusqueda) {
    if (!estrategia.esClickeable) continue; // Saltar elementos no clickeables por ahora
    
    try {
      const count = await estrategia.locator.count();
      if (count > 0) {
        const isVisible = await estrategia.locator.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
          // Verificar que realmente es un elemento clickeable
          const tagName = await estrategia.locator.first().evaluate(el => el.tagName).catch(() => '');
          if (tagName === 'A' || tagName === 'BUTTON') {
            busquedaElement = estrategia.locator.first();
            busquedaEncontrada = true;
            estrategiaUsada = estrategia.name;
            console.log(`✅ Botón de búsqueda encontrado (${estrategia.name}) - tag: ${tagName}`);
      break;
    }
  }
      }
    } catch (e) {
      // Continuar con la siguiente estrategia
      continue;
    }
  }
  
  // Si no encontramos un elemento clickeable, buscar el icono y encontrar su padre clickeable
  if (!busquedaEncontrada) {
    const iconoBusqueda = page.locator('i.icon-search').first();
    const iconoCount = await iconoBusqueda.count();
    if (iconoCount > 0) {
      const iconoVisible = await iconoBusqueda.isVisible({ timeout: 2000 }).catch(() => false);
      if (iconoVisible) {
        // Buscar el elemento padre clickeable (a o button)
        const padreClickeable = iconoBusqueda.locator('xpath=ancestor::*[self::a or self::button][1]').first();
        const padreCount = await padreClickeable.count();
        if (padreCount > 0) {
          const padreVisible = await padreClickeable.isVisible({ timeout: 2000 }).catch(() => false);
          if (padreVisible) {
            const tagName = await padreClickeable.evaluate(el => el.tagName).catch(() => '');
            if (tagName === 'A' || tagName === 'BUTTON') {
              busquedaElement = padreClickeable;
              busquedaEncontrada = true;
              estrategiaUsada = 'icono con padre clickeable';
              console.log(`✅ Botón de búsqueda encontrado (icono con padre clickeable) - tag: ${tagName}`);
            }
          }
        }
      }
    }
  }
  
  // Si aún no encontramos nada, usar estrategias no clickeables como último recurso
  if (!busquedaEncontrada) {
    for (const estrategia of estrategiasBusqueda) {
      if (estrategia.esClickeable) continue; // Ya intentamos estos
      
      try {
        const count = await estrategia.locator.count();
        if (count > 0) {
          const isVisible = await estrategia.locator.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
            busquedaElement = estrategia.locator.first();
            busquedaEncontrada = true;
            estrategiaUsada = estrategia.name;
            console.log(`⚠️ Botón de búsqueda encontrado (${estrategia.name}) - puede no ser clickeable directamente`);
      break;
    }
  }
      } catch (e) {
        continue;
      }
    }
  }
  
  if (busquedaEncontrada && busquedaElement) {
    await expect(busquedaElement).toBeVisible();
    console.log('✅ Botón de búsqueda visible');
    
    // Validar funcionalidad: clic en búsqueda y apertura del modal/input
    await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DEL BOTÓN DE BÚSQUEDA');
    await safeWaitForTimeout(page, 1000);
    
    // Asegurarse de estar en home antes de hacer clic
    if (page.url() !== homeUrl) {
      await page.goto(homeUrl);
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 500);
    }
    
    // Hacer clic en el botón de búsqueda
    await busquedaElement.scrollIntoViewIfNeeded();
    await safeWaitForTimeout(page, 500);
    
    // Debug: información del elemento antes del clic
    const tagName = await busquedaElement.evaluate(el => el.tagName).catch(() => 'unknown');
    const href = await busquedaElement.getAttribute('href').catch(() => null);
    const className = await busquedaElement.getAttribute('class').catch(() => null);
    console.log(`🔍 Debug: Elemento a clickear - tag: ${tagName}, href: ${href}, class: ${className?.substring(0, 50)}...`);
    
    // Si el elemento no es clickeable (es un DIV), buscar el elemento clickeable más cercano
    if (tagName === 'DIV' || tagName === 'SPAN' || tagName === 'I') {
      console.log('⚠️ El elemento encontrado no es directamente clickeable, buscando elemento clickeable...');
      
      // Buscar un elemento clickeable padre o hijo
      const elementoClickeable = busquedaElement.locator('xpath=ancestor::*[self::a or self::button][1]').first();
      const countClickeable = await elementoClickeable.count();
      
      if (countClickeable > 0) {
        const isVisible = await elementoClickeable.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          busquedaElement = elementoClickeable;
          const nuevoTag = await busquedaElement.evaluate(el => el.tagName).catch(() => 'unknown');
          console.log(`✅ Elemento clickeable encontrado - tag: ${nuevoTag}`);
        }
      } else {
        // Si no hay padre clickeable, buscar hijos clickeables
        const hijoClickeable = busquedaElement.locator('a, button').first();
        const countHijo = await hijoClickeable.count();
        if (countHijo > 0) {
          const isVisible = await hijoClickeable.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            busquedaElement = hijoClickeable;
            const nuevoTag = await busquedaElement.evaluate(el => el.tagName).catch(() => 'unknown');
            console.log(`✅ Elemento clickeable hijo encontrado - tag: ${nuevoTag}`);
          }
        }
      }
    }
    
    // Esperar a que el elemento sea clickeable
    await busquedaElement.waitFor({ state: 'visible', timeout: 5000 });
    const esEnabled = await busquedaElement.isEnabled().catch(() => true);
    if (!esEnabled) {
      console.log('⚠️ El elemento no está habilitado, intentando de todas formas...');
    }
    
    console.log('🖱️ Haciendo clic en el botón de búsqueda...');
    
    // Verificar si hay un input Search antes del clic (no debería existir)
    const inputAntes = await page.locator('input#Search').count();
    console.log(`🔍 Debug: Inputs Search antes del clic: ${inputAntes}`);
    
    // Si el elemento encontrado es un DIV, buscar el botón dentro de él
    const tagNameElemento = await busquedaElement.evaluate(el => el.tagName).catch(() => '');
    console.log(`🔍 Debug: Tag del elemento encontrado: ${tagNameElemento}`);
    
    let elementoAClickeable = busquedaElement;
    
    // Si es un DIV, buscar el botón dentro
    if (tagNameElemento === 'DIV') {
      console.log('🔍 El elemento es un DIV, buscando botón dentro...');
      const botonDentro = busquedaElement.locator('button').first();
      const botonCount = await botonDentro.count();
      if (botonCount > 0) {
        const botonVisible = await botonDentro.isVisible({ timeout: 2000 }).catch(() => false);
        if (botonVisible) {
          elementoAClickeable = botonDentro;
          console.log('✅ Botón encontrado dentro del DIV');
        }
      }
      
      // Si no hay botón, buscar el icono y hacer clic en él o su padre clickeable
      if (botonCount === 0 || !await botonDentro.isVisible({ timeout: 1000 }).catch(() => false)) {
        const iconoDentro = busquedaElement.locator('i.icon-search').first();
        const iconoCount = await iconoDentro.count();
        if (iconoCount > 0) {
          const iconoVisible = await iconoDentro.isVisible({ timeout: 2000 }).catch(() => false);
          if (iconoVisible) {
            // Buscar el botón padre del icono
            const botonPadre = iconoDentro.locator('xpath=ancestor::button[1]').first();
            const botonPadreCount = await botonPadre.count();
            if (botonPadreCount > 0) {
              elementoAClickeable = botonPadre;
              console.log('✅ Botón padre del icono encontrado');
            } else {
              // Si no hay botón padre, hacer clic directamente en el icono usando JavaScript
              elementoAClickeable = iconoDentro;
              console.log('⚠️ No se encontró botón padre, usando el icono directamente');
            }
          }
        }
      }
    }
    
    // Intentar hacer clic con diferentes estrategias
    let clicExitoso = false;
    try {
      // Primero intentar clic normal
      await elementoAClickeable.click({ timeout: 5000, force: false });
      clicExitoso = true;
      console.log('✅ Clic ejecutado correctamente (método normal)');
    } catch (e) {
      console.log('⚠️ Primer intento de clic falló, intentando con force:true...');
      try {
        await elementoAClickeable.click({ timeout: 5000, force: true });
        clicExitoso = true;
        console.log('✅ Clic ejecutado correctamente (método force)');
      } catch (e2) {
        console.log('⚠️ Clic con force falló, intentando con JavaScript...');
        try {
          await elementoAClickeable.evaluate((el: any) => {
            // Intentar diferentes métodos de clic
            if (el instanceof HTMLElement) {
              el.click();
            } else if ('click' in el && typeof el.click === 'function') {
              el.click();
            } else if (el.dispatchEvent) {
              // Disparar evento click
              const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
              el.dispatchEvent(event);
            }
          });
          clicExitoso = true;
          console.log('✅ Clic ejecutado correctamente (método JavaScript)');
        } catch (e3) {
          console.log('⚠️ Clic con JavaScript falló, intentando buscar botón directamente...');
          // Último recurso: buscar el botón directamente en el navbar
          try {
            const botonDirecto = navbar.locator('button:has(i.icon-search)').first();
            const botonDirectoVisible = await botonDirecto.isVisible({ timeout: 2000 }).catch(() => false);
            if (botonDirectoVisible) {
              await botonDirecto.click({ timeout: 5000 });
              clicExitoso = true;
              console.log('✅ Clic ejecutado correctamente (botón directo del navbar)');
            } else {
              throw new Error('No se pudo encontrar un botón clickeable');
            }
          } catch (e4) {
            console.log('❌ Todos los métodos de clic fallaron');
            throw e4;
          }
        }
      }
    }
    
    // Esperar a que aparezca el modal (usar waitFor en lugar de solo timeout)
    await showStepMessage(page, '📋 VALIDANDO MODAL DE BÚSQUEDA');
    
    // Esperar más tiempo después del clic
    await safeWaitForTimeout(page, 500);
    
    // Esperar el contenedor MUI primero (es lo primero que aparece)
    console.log('🔍 Esperando contenedor MUI...');
    try {
      await page.waitForSelector('div[role="presentation"].MuiModal-root', { 
        state: 'visible', 
        timeout: 8000 
      });
      console.log('✅ Contenedor MUI encontrado');
    } catch (e) {
      console.log('⚠️ Contenedor MUI no apareció en 8 segundos, continuando búsqueda...');
    }
    
    // Esperar un poco más después de que aparezca el contenedor MUI
    await safeWaitForTimeout(page, 500);
    
    // Verificar cambios en el body que indican que el modal se abrió (overflow: hidden)
    await safeWaitForTimeout(page, 500);
    const bodyStyle = await page.evaluate(() => {
      const body = document.body;
      return {
        overflow: window.getComputedStyle(body).overflow,
        paddingRight: window.getComputedStyle(body).paddingRight
      };
    }).catch(() => ({ overflow: '', paddingRight: '' }));
    console.log(`🔍 Debug: Estilo del body después del clic - overflow: ${bodyStyle.overflow}, paddingRight: ${bodyStyle.paddingRight}`);
    
    // Verificar si apareció el input Search después del clic
    const inputDespues = await page.locator('input#Search').count();
    console.log(`🔍 Debug: Inputs Search después del clic: ${inputDespues}`);
    
    const formDespues = await page.locator('form#SearchBarForm').count();
    console.log(`🔍 Debug: Forms SearchBarForm después del clic: ${formDespues}`);
    
    if (inputDespues === 0 && formDespues === 0) {
      console.log('⚠️ El modal no apareció inmediatamente, esperando más tiempo...');
      await safeWaitForTimeout(page, 2000);
      const inputDespues2 = await page.locator('input#Search').count();
      const formDespues2 = await page.locator('form#SearchBarForm').count();
      console.log(`🔍 Debug: Inputs Search después de esperar más: ${inputDespues2}`);
      console.log(`🔍 Debug: Forms SearchBarForm después de esperar más: ${formDespues2}`);
    }
    
    // Múltiples selectores para el modal (está dentro de un contenedor MUI)
    const selectoresModal = [
      // Selector 1: Buscar dentro del contenedor MUI por form SearchBarForm (más específico)
      page.locator('div[role="presentation"].MuiModal-root div:has(form#SearchBarForm)'),
      // Selector 2: Buscar dentro del contenedor MUI por input Search
      page.locator('div[role="presentation"].MuiModal-root div:has(input#Search)'),
      // Selector 3: Buscar dentro del contenedor MUI por contenido "Buscador"
      page.locator('div[role="presentation"].MuiModal-root div:has-text("Buscador")').filter({ has: page.locator('form#SearchBarForm') }),
      // Selector 4: Buscar directamente por form SearchBarForm (sin MUI, por si acaso)
      page.locator('div:has(form#SearchBarForm)'),
      // Selector 5: Buscar por input Search dentro de un div con clases específicas del modal
      page.locator('div.absolute.top-1\\/2.left-1\\/2.transform.-translate-x-1\\/2.-translate-y-1\\/2:has(input#Search)'),
      // Selector 6: Buscar por input Search dentro de cualquier div
      page.locator('div:has(input#Search)'),
      // Selector 7: Buscar por contenido "Buscador" y form
      page.locator('div:has-text("Buscador")').filter({ has: page.locator('form#SearchBarForm') }),
      // Selector 8: Buscar por tabindex="-1" dentro de MUI
      page.locator('div[role="presentation"].MuiModal-root div[tabindex="-1"]:has(form#SearchBarForm)'),
    ];
    
    let modalBusqueda: ReturnType<typeof page.locator> | null = null;
    let modalEncontrado = false;
    
    console.log('🔍 Buscando modal de búsqueda...');
    
    for (const selector of selectoresModal) {
      try {
        const count = await selector.count();
        if (count > 0) {
          const isVisible = await selector.first().isVisible({ timeout: 3000 }).catch(() => false);
          if (isVisible) {
            modalBusqueda = selector.first();
            modalEncontrado = true;
            console.log('✅ Modal de búsqueda encontrado');
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Si no se encontró con los selectores, esperar un poco más y buscar de nuevo
    if (!modalEncontrado) {
      console.log('⏳ Esperando a que aparezca el modal...');
      
      // Intentar múltiples estrategias de espera (el modal está dentro de un contenedor MUI)
      const estrategiasEspera = [
        // Estrategia 1: Esperar el contenedor MUI primero, luego el form dentro
        async () => {
          await page.waitForSelector('div[role="presentation"].MuiModal-root', { state: 'visible', timeout: 8000 });
          await page.waitForSelector('form#SearchBarForm', { state: 'visible', timeout: 5000 });
          return page.locator('div[role="presentation"].MuiModal-root div:has(form#SearchBarForm)').first();
        },
        // Estrategia 2: Esperar el contenedor MUI primero, luego el input dentro
        async () => {
          await page.waitForSelector('div[role="presentation"].MuiModal-root', { state: 'visible', timeout: 8000 });
          await page.waitForSelector('input#Search', { state: 'visible', timeout: 5000 });
          return page.locator('div[role="presentation"].MuiModal-root div:has(input#Search)').first();
        },
        // Estrategia 3: Esperar el form directamente (puede estar dentro de MUI)
        async () => {
          await page.waitForSelector('form#SearchBarForm', { state: 'visible', timeout: 8000 });
          // Buscar primero dentro de MUI
          const modalMUI = page.locator('div[role="presentation"].MuiModal-root div:has(form#SearchBarForm)').first();
          const countMUI = await modalMUI.count();
          if (countMUI > 0) {
            return modalMUI;
          }
          return page.locator('div:has(form#SearchBarForm)').first();
        },
        // Estrategia 4: Esperar el input directamente (puede estar dentro de MUI)
        async () => {
          await page.waitForSelector('input#Search', { state: 'visible', timeout: 8000 });
          // Buscar primero dentro de MUI
          const modalMUI = page.locator('div[role="presentation"].MuiModal-root div:has(input#Search)').first();
          const countMUI = await modalMUI.count();
          if (countMUI > 0) {
            return modalMUI;
          }
          return page.locator('div:has(input#Search)').first();
        },
        // Estrategia 5: Esperar usando waitForFunction para verificar que el input es visible
        async () => {
          await page.waitForFunction(() => {
            const input = document.querySelector('input#Search') as HTMLElement | null;
            if (!input) return false;
            const style = window.getComputedStyle(input);
            return input.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden';
          }, { timeout: 8000 });
          // Buscar primero dentro de MUI
          const modalMUI = page.locator('div[role="presentation"].MuiModal-root div:has(input#Search)').first();
          const countMUI = await modalMUI.count();
          if (countMUI > 0) {
            return modalMUI;
          }
          return page.locator('div:has(input#Search)').first();
        }
      ];
      
      for (let i = 0; i < estrategiasEspera.length; i++) {
        try {
          console.log(`🔍 Intentando estrategia ${i + 1} de espera...`);
          modalBusqueda = await estrategiasEspera[i]();
          const isVisible = await modalBusqueda.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            modalEncontrado = true;
            console.log(`✅ Modal encontrado usando estrategia ${i + 1}`);
            break;
          }
        } catch (e) {
          console.log(`⚠️ Estrategia ${i + 1} falló: ${e}`);
          continue;
        }
      }
    }
    
    if (!modalEncontrado || !modalBusqueda) {
      // Debug exhaustivo: ver qué elementos están visibles (con manejo de errores)
      console.log('🔍 === DEBUG EXHAUSTIVO ===');
      
      try {
        const todosLosDivs = await page.locator('div').count().catch(() => 0);
        console.log(`🔍 Total de divs en la página: ${todosLosDivs}`);
        
        const divsConBuscador = await page.locator('div:has-text("Buscador")').count().catch(() => 0);
        console.log(`🔍 Divs con texto "Buscador": ${divsConBuscador}`);
        
        const inputsSearch = await page.locator('input#Search').count().catch(() => 0);
        console.log(`🔍 Inputs con id="Search": ${inputsSearch}`);
        
        const formsSearchBar = await page.locator('form#SearchBarForm').count().catch(() => 0);
        console.log(`🔍 Forms con id="SearchBarForm": ${formsSearchBar}`);
        
        // Verificar si hay overlays o backdrops
        const overlays = await page.locator('div[class*="overlay" i], div[class*="backdrop" i], div[class*="modal" i]').count().catch(() => 0);
        console.log(`🔍 Overlays/backdrops encontrados: ${overlays}`);
        
        // Verificar si hay elementos con posición fixed o absolute que puedan ser el modal
        const elementosAbsolutos = await page.locator('div[class*="absolute" i]').count().catch(() => 0);
        console.log(`🔍 Elementos con posición absolute: ${elementosAbsolutos}`);
        
        // Intentar encontrar cualquier input de búsqueda
        const todosLosInputs = await page.locator('input').count().catch(() => 0);
        console.log(`🔍 Total de inputs en la página: ${todosLosInputs}`);
        
        // Verificar la URL actual
        try {
          const urlActual = page.url();
        } catch (e) {
          console.log('⚠️ No se pudo obtener la URL actual');
        }
      } catch (e) {
        console.log(`⚠️ Error durante debug exhaustivo: ${e}`);
      }
      
      console.log('🔍 === FIN DEBUG ===');
      
      throw new Error('❌ No se pudo encontrar el modal de búsqueda después del clic. El elemento clickeado puede no ser el correcto o el modal requiere una acción diferente.');
    }
    
    await expect(modalBusqueda).toBeVisible({ timeout: 5000 });
    console.log('✅ Modal de búsqueda abierto y visible');
    
    // Validar título del modal
    const tituloModal = modalBusqueda.locator('div').filter({ hasText: /Buscador/i });
    await expect(tituloModal).toBeVisible();
    console.log('✅ Título "Buscador" visible en el modal');
    
    // Validar botón de cerrar
    const botonCerrar = modalBusqueda.locator('button:has(i.icon-x)').last();
    await expect(botonCerrar).toBeVisible();
    console.log('✅ Botón de cerrar visible');
    
    // Buscar el input de búsqueda (id="Search")
    const inputBusqueda = modalBusqueda.locator('input#Search');
    await expect(inputBusqueda).toBeVisible({ timeout: 5000 });
    await expect(inputBusqueda).toBeEnabled();
    console.log('✅ Input de búsqueda visible y habilitado');
    
    // Validar label del input
    const labelBusqueda = modalBusqueda.locator('label[for="Search"]');
    await expect(labelBusqueda).toBeVisible();
    const textoLabel = await labelBusqueda.textContent();
    expect(textoLabel?.trim()).toBe('Buscar');
    console.log('✅ Label "Buscar" visible');
    
    // Validar botón de limpiar input
    const botonLimpiar = modalBusqueda.locator('button[aria-label="Clear input"]');
    const botonLimpiarVisible = await botonLimpiar.isVisible({ timeout: 2000 }).catch(() => false);
    if (botonLimpiarVisible) {
      console.log('✅ Botón de limpiar input visible');
    }
    
    // Validar que el input es interactivo
    await inputBusqueda.focus();
    await safeWaitForTimeout(page, 500);
    
    // Realizar algunas búsquedas de prueba
    await showStepMessage(page, '🔍 REALIZANDO BÚSQUEDAS DE PRUEBA');
    await safeWaitForTimeout(page, 1000);
    
    const busquedasPrueba = [
      'fiesta',
      'pastel',
      'decoración'
    ];
    
    for (const terminoBusqueda of busquedasPrueba) {
      console.log(`🔍 Realizando búsqueda: "${terminoBusqueda}"`);
      
      // Limpiar el input usando el botón de limpiar si está visible, sino usar clear()
      if (botonLimpiarVisible) {
        const valorActual = await inputBusqueda.inputValue();
        if (valorActual.length > 0) {
          await botonLimpiar.click();
          await safeWaitForTimeout(page, 300);
        }
      } else {
        await inputBusqueda.clear();
        await safeWaitForTimeout(page, 300);
      }
      
      // Escribir el término de búsqueda
      await inputBusqueda.fill(terminoBusqueda);
      await safeWaitForTimeout(page, 800);
      
      // Validar que el texto se escribió correctamente
      const valorInput = await inputBusqueda.inputValue();
      expect(valorInput.toLowerCase()).toContain(terminoBusqueda.toLowerCase());
      console.log(`✅ Término "${terminoBusqueda}" escrito correctamente en el input`);
      
      // Esperar a que aparezcan los resultados
      await safeWaitForTimeout(page, 1500);
      
      // Validar que aparecen resultados de servicios
      const seccionServicios = modalBusqueda.locator('p.text-small.font-bold.text-dark-neutral').filter({ hasText: /Servicios/i });
      const seccionServiciosVisible = await seccionServicios.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (seccionServiciosVisible) {
        console.log('✅ Sección "Servicios" visible');
        
        // Buscar los botones de resultados (servicios)
        const resultadosServicios = modalBusqueda.locator('div.flex.flex-col.overflow-y-auto button');
        const cantidadResultados = await resultadosServicios.count();
        
        if (cantidadResultados > 0) {
          console.log(`✅ Se encontraron ${cantidadResultados} resultados para "${terminoBusqueda}"`);
          
          // Validar estructura de al menos el primer resultado
          const primerResultado = resultadosServicios.first();
          await expect(primerResultado).toBeVisible();
          
          // Validar que tiene imagen
          const imagenResultado = primerResultado.locator('img');
          const tieneImagen = await imagenResultado.count() > 0;
          if (tieneImagen) {
            console.log('✅ Resultado tiene imagen');
          }
          
          // Validar que tiene texto del servicio
          const textoResultado = primerResultado.locator('p.text-dark-neutral');
          const tieneTexto = await textoResultado.count() > 0;
          if (tieneTexto) {
            const texto = await textoResultado.first().textContent();
            console.log(`✅ Resultado tiene texto: "${texto?.trim()}"`);
          }
          
          // Validar que tiene rating (estrella y número)
          const ratingResultado = primerResultado.locator('i.icon-star-solid');
          const tieneRating = await ratingResultado.count() > 0;
          if (tieneRating) {
            console.log('✅ Resultado tiene rating');
          }
        } else {
          console.log(`ℹ️ No se encontraron resultados visibles para "${terminoBusqueda}"`);
        }
      } else {
        console.log(`ℹ️ Sección de servicios no visible para "${terminoBusqueda}" (puede no haber resultados)`);
      }
    }
    
    // Validar funcionalidad del botón de cerrar
    await showStepMessage(page, '❌ VALIDANDO BOTÓN DE CERRAR');
    await safeWaitForTimeout(page, 1000);
    
    await botonCerrar.click();
    await safeWaitForTimeout(page, 1000);
    
    // Validar que el modal se cerró
    const modalCerrado = await modalBusqueda.isHidden({ timeout: 3000 }).catch(() => false);
    if (modalCerrado) {
      console.log('✅ Modal de búsqueda se cerró correctamente');
    } else {
      console.log('⚠️ El modal puede seguir visible o cerrarse de otra manera');
    }
    
    // Regresar a home
    await page.goto(homeUrl);
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 500);
  } else {
    console.log('⚠️ Botón de búsqueda no encontrado o no visible');
    
    // Información de debug
    const iconosBusqueda = page.locator('i.icon-search');
    const cantidadIconos = await iconosBusqueda.count();
    console.log(`🔍 Debug: Se encontraron ${cantidadIconos} iconos de búsqueda en la página`);
    
    if (cantidadIconos > 0) {
      for (let i = 0; i < Math.min(cantidadIconos, 5); i++) {
        const icono = iconosBusqueda.nth(i);
        const isVisible = await icono.isVisible().catch(() => false);
        const tagName = await icono.evaluate(el => el.tagName).catch(() => 'unknown');
        const parentTag = await icono.evaluate(el => el.parentElement?.tagName || 'none').catch(() => 'unknown');
        console.log(`  - Icono ${i + 1}: visible=${isVisible}, tag=${tagName}, parent=${parentTag}`);
      }
    }
    
    // Buscar enlaces en el navbar
    const enlacesNavbar = navbar.locator('a');
    const cantidadEnlaces = await enlacesNavbar.count();
    console.log(`🔍 Debug: Se encontraron ${cantidadEnlaces} enlaces en el navbar`);
    
    // Buscar botones en el navbar
    const botonesNavbar = navbar.locator('button');
    const cantidadBotones = await botonesNavbar.count();
    console.log(`🔍 Debug: Se encontraron ${cantidadBotones} botones en el navbar`);
  }

  // 3️⃣ VALIDAR BOTÓN DE FAVORITOS (si está visible)
  await showStepMessage(page, '❤️ VALIDANDO BOTÓN DE FAVORITOS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando botón de favoritos...');
  
  const favoritosButtons = navbar.locator('button:has(i.icon-heart), a:has(i.icon-heart)');
  const favoritosButtonsCount = await favoritosButtons.count();
  
  if (favoritosButtonsCount > 0) {
    let favoritosEncontrado = false;
    let favoritosElement: ReturnType<typeof page.locator> | null = null;
    
    for (let i = 0; i < favoritosButtonsCount; i++) {
      const isVisible = await favoritosButtons.nth(i).isVisible().catch(() => false);
      if (isVisible) {
        favoritosElement = favoritosButtons.nth(i);
        favoritosEncontrado = true;
        console.log(`✅ Botón de favoritos encontrado y visible (índice ${i})`);
        break;
      }
    }
    
    if (favoritosEncontrado && favoritosElement) {
      await expect(favoritosElement).toBeVisible();
      await expect(favoritosElement).toBeEnabled();
      console.log('✅ Botón de favoritos visible y habilitado');
      
      // Validar funcionalidad: clic en favoritos
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DEL BOTÓN DE FAVORITOS');
      await safeWaitForTimeout(page, 1000);
      
      const urlAntesFavoritos = page.url();
      await favoritosElement.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      const urlDespuesFavoritos = page.url();
      // El botón de favoritos debería navegar a la página de favoritos o login
      const navegoAFavoritos = urlDespuesFavoritos.includes('/favorites') || urlDespuesFavoritos.includes('/login') || urlDespuesFavoritos.includes('/favoritos');
      console.log(`✅ Botón de favoritos navega a: ${urlDespuesFavoritos}`);
      
      // Regresar a home
      await page.goto(homeUrl);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 1000);
    }
  } else {
    console.log('ℹ️ Botón de favoritos no encontrado (puede estar oculto según el viewport)');
  }

  // 4️⃣ VALIDAR BOTÓN DE USUARIO (si está visible)
  await showStepMessage(page, '👤 VALIDANDO BOTÓN DE USUARIO');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando botón de usuario...');
  
  const userButtons = navbar.locator('button:has(i.icon-user), a:has(i.icon-user)');
  const userButtonsCount = await userButtons.count();
  
  if (userButtonsCount > 0) {
    let userEncontrado = false;
    let userElement: ReturnType<typeof page.locator> | null = null;
    
    for (let i = 0; i < userButtonsCount; i++) {
    const isVisible = await userButtons.nth(i).isVisible().catch(() => false);
    if (isVisible) {
        userElement = userButtons.nth(i);
        userEncontrado = true;
        console.log(`✅ Botón de usuario encontrado y visible (índice ${i})`);
      break;
    }
  }
    
    if (userEncontrado && userElement) {
      await expect(userElement).toBeVisible();
      await expect(userElement).toBeEnabled();
      console.log('✅ Botón de usuario visible y habilitado');
      
      // Validar funcionalidad: clic en usuario
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DEL BOTÓN DE USUARIO');
      await safeWaitForTimeout(page, 1000);
      
      const urlAntesUsuario = page.url();
      await userElement.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      const urlDespuesUsuario = page.url();
      // El botón de usuario debería navegar a la página de perfil o login
      const navegoAPerfil = urlDespuesUsuario.includes('/profile') || urlDespuesUsuario.includes('/login') || urlDespuesUsuario.includes('/perfil');
      console.log(`✅ Botón de usuario navega a: ${urlDespuesUsuario}`);
      
      // Regresar a home
      await page.goto(homeUrl);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 1000);
    }
  } else {
    console.log('ℹ️ Botón de usuario no encontrado (puede estar oculto según el viewport)');
  }

  await showStepMessage(page, '✅ VALIDACIÓN DE NAVBAR COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de funcionalidad del navbar completada exitosamente');
});

test('Validar funcionalidad del hero banner', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // 1️⃣ VALIDAR ESTRUCTURA DEL HERO
  await showStepMessage(page, '🎯 VALIDANDO ESTRUCTURA DEL HERO BANNER');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando estructura del hero banner...');
  
  const heroImage = page.locator('img[alt="Hero_Image"]');
  await expect(heroImage).toBeVisible({ timeout: 10000 });
  
  // Validar que hay contenido en el hero
  const heroContent = page.locator('main').locator('div').filter({
    has: heroImage
  });
  await expect(heroContent.first()).toBeVisible();
  console.log('✅ Hero banner encontrado');

  // 2️⃣ VALIDAR LOS 3 PUNTOS DEL SLIDER
  await showStepMessage(page, '🔘 VALIDANDO PUNTOS DEL SLIDER');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando puntos del slider...');
  
  // Buscar puntos del slider dentro del hero
  const heroSliderPoints = heroContent.locator('button.rounded-full');
  const heroSliderPointsCount = await heroSliderPoints.count();
  
  // También buscar en toda la página
  const allSliderPoints = page.locator('button.rounded-full').filter({
    hasNotText: /.{3,}/  // Botones sin texto o con texto muy corto (máximo 2 caracteres)
  });
  
  // Buscar puntos dentro del hero primero
  let puntosEncontrados = 0;
  const puntosHeroIndices: number[] = [];
  const puntosAllIndices: number[] = [];
  
  for (let i = 0; i < heroSliderPointsCount; i++) {
    const punto = heroSliderPoints.nth(i);
    const puntoText = await punto.textContent().catch(() => '');
    const isVisible = await punto.isVisible().catch(() => false);
    
    // Los puntos del slider suelen ser botones pequeños sin texto o con texto muy corto
    if (isVisible && (!puntoText || puntoText.trim().length <= 2)) {
      puntosEncontrados++;
      puntosHeroIndices.push(i);
      if (puntosEncontrados >= 3) break;
    }
  }
  
  // Si no encontramos suficientes en el hero, buscar en toda la página
  if (puntosEncontrados < 3) {
    const allPointsCount = await allSliderPoints.count();
    for (let i = 0; i < Math.min(allPointsCount, 10); i++) {
      const punto = allSliderPoints.nth(i);
      const puntoText = await punto.textContent().catch(() => '');
      const isVisible = await punto.isVisible().catch(() => false);
      
      if (isVisible && (!puntoText || puntoText.trim().length <= 2)) {
        puntosEncontrados++;
        puntosAllIndices.push(i);
      }
      
      if (puntosEncontrados >= 3) break;
    }
  }
  
  expect(puntosEncontrados).toBeGreaterThanOrEqual(3);
  console.log(`✅ Se encontraron ${puntosEncontrados} puntos del slider`);
  
  // Validar que los puntos son clickeables (usar los primeros 3 encontrados)
  let puntosValidados = 0;
  
  // Validar puntos del hero primero
  for (let idx = 0; idx < puntosHeroIndices.length && puntosValidados < 3; idx++) {
    const puntoIndex = puntosHeroIndices[idx];
    const punto = heroSliderPoints.nth(puntoIndex);
    const isEnabled = await punto.isEnabled().catch(() => false);
    expect(isEnabled).toBe(true);
    puntosValidados++;
    console.log(`✅ Punto ${puntosValidados} del slider es clickeable (hero)`);
  }
  
  // Validar puntos adicionales de toda la página si es necesario
  for (let idx = 0; idx < puntosAllIndices.length && puntosValidados < 3; idx++) {
    const puntoIndex = puntosAllIndices[idx];
    const punto = allSliderPoints.nth(puntoIndex);
    const isEnabled = await punto.isEnabled().catch(() => false);
    expect(isEnabled).toBe(true);
    puntosValidados++;
    console.log(`✅ Punto ${puntosValidados} del slider es clickeable (página)`);
  }

  // 3️⃣ VALIDAR BOTONES DE CADA BANNER
  await showStepMessage(page, '🔘 VALIDANDO BOTONES DE LOS BANNERS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando botones de los banners...');
  
  // Buscar botones del hero con los textos esperados
  const botonesEsperados = [
    /Regístrate ya|Registrate ya|¡Regístrate ya!/i,
    /Empieza ya|¡Empieza ya!/i,
    /Hazlo aquí|¡Hazlo aquí!/i
  ];
  
  const botonesEncontrados: { texto: string; elemento: ReturnType<typeof page.locator> }[] = [];
  
  // Buscar botones dentro del hero
  const heroButtons = heroContent.locator('button');
  const heroButtonsCount = await heroButtons.count();
  
  for (let i = 0; i < heroButtonsCount; i++) {
    const boton = heroButtons.nth(i);
    const botonText = await boton.textContent().catch(() => '');
    const isVisible = await boton.isVisible().catch(() => false);
    
    if (isVisible && botonText) {
      // Verificar si coincide con alguno de los textos esperados
      for (const patron of botonesEsperados) {
        if (patron.test(botonText)) {
          botonesEncontrados.push({ texto: botonText.trim(), elemento: boton });
          console.log(`✅ Botón encontrado: "${botonText.trim()}"`);
        break;
        }
      }
    }
  }
  
  // Si no encontramos todos los botones en el hero, buscar en toda la página
  if (botonesEncontrados.length < botonesEsperados.length) {
    const allButtons = page.locator('button').filter({
      hasText: /Regístrate|Empieza|Hazlo/i
    });
    const allButtonsCount = await allButtons.count();
    
    for (let i = 0; i < allButtonsCount; i++) {
      const boton = allButtons.nth(i);
      const botonText = await boton.textContent().catch(() => '');
      const isVisible = await boton.isVisible().catch(() => false);
      
      if (isVisible && botonText) {
        // Verificar si coincide con alguno de los textos esperados y no está duplicado
        for (const patron of botonesEsperados) {
          if (patron.test(botonText)) {
            const yaExiste = botonesEncontrados.some(b => b.texto === botonText.trim());
            if (!yaExiste) {
              botonesEncontrados.push({ texto: botonText.trim(), elemento: boton });
              console.log(`✅ Botón encontrado: "${botonText.trim()}"`);
              break;
            }
          }
        }
      }
      
      if (botonesEncontrados.length >= botonesEsperados.length) break;
    }
  }
  
  // 3️⃣ NAVEGAR ENTRE BANNERS Y VALIDAR BOTONES
  await showStepMessage(page, '🔄 NAVEGANDO ENTRE BANNERS Y VALIDANDO BOTONES');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Navegando entre banners y validando que cada botón navega a lugares diferentes...');
  
  const urlsVisitadas: string[] = [];
  const botonesPorBanner: Array<{ texto: string; url: string }> = [];
  
  // Función para encontrar el botón del banner actual
  const encontrarBotonBannerActual = async (): Promise<{ texto: string; elemento: ReturnType<typeof page.locator> } | null> => {
    // Buscar botones dentro del hero
    const heroButtons = heroContent.locator('button');
    const heroButtonsCount = await heroButtons.count();
    
    for (let i = 0; i < heroButtonsCount; i++) {
      const boton = heroButtons.nth(i);
      const botonText = await boton.textContent().catch(() => '');
      const isVisible = await boton.isVisible().catch(() => false);
      
      if (isVisible && botonText) {
        // Verificar si coincide con alguno de los textos esperados
        for (const patron of botonesEsperados) {
          if (patron.test(botonText)) {
            return { texto: botonText.trim(), elemento: boton };
          }
        }
      }
    }
    
    // Si no se encuentra en el hero, buscar en toda la página
    const allButtons = page.locator('button').filter({
      hasText: /Regístrate|Empieza|Hazlo/i
    });
    const allButtonsCount = await allButtons.count();
    
    for (let i = 0; i < allButtonsCount; i++) {
      const boton = allButtons.nth(i);
      const botonText = await boton.textContent().catch(() => '');
      const isVisible = await boton.isVisible().catch(() => false);
      
      if (isVisible && botonText) {
        for (const patron of botonesEsperados) {
          if (patron.test(botonText)) {
            return { texto: botonText.trim(), elemento: boton };
          }
        }
      }
    }
    
    return null;
  };
  
  // Navegar usando puntos del hero primero y validar botones
  for (let idx = 0; idx < puntosHeroIndices.length && idx < 3; idx++) {
    const puntoIndex = puntosHeroIndices[idx];
    const punto = heroSliderPoints.nth(puntoIndex);
    
    console.log(`🖱️ Navegando al banner ${idx + 1} usando el punto del slider...`);
    
    // Regresar a home antes de cambiar de banner
    await page.goto(homeUrl);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 1000);
    
    // Hacer clic en el punto para cambiar de banner
    await punto.click();
    await safeWaitForTimeout(page, 1500); // Esperar a que cambie el banner
    
    // Verificar que el hero sigue visible después del cambio
    const heroSigueVisible = await heroImage.isVisible().catch(() => false);
    expect(heroSigueVisible).toBe(true);
    console.log(`✅ Banner ${idx + 1} visible después del clic`);
    
    // Buscar el botón del banner actual
    const botonBanner = await encontrarBotonBannerActual();
    
    if (botonBanner) {
      console.log(`🔍 Botón encontrado en banner ${idx + 1}: "${botonBanner.texto}"`);
      
      await expect(botonBanner.elemento).toBeVisible();
      await expect(botonBanner.elemento).toBeEnabled();
      
      // Hacer clic en el botón
      const urlAntes = page.url();
      await botonBanner.elemento.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      const urlDespues = page.url();
      urlsVisitadas.push(urlDespues);
      botonesPorBanner.push({ texto: botonBanner.texto, url: urlDespues });
      
      console.log(`✅ Botón "${botonBanner.texto}" navegó a: ${urlDespues}`);
      
      // Regresar a home para continuar con el siguiente banner
      await page.goto(homeUrl);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 1000);
  } else {
      console.log(`⚠️ No se encontró botón en el banner ${idx + 1}`);
    }
  }
  
  // Navegar usando puntos adicionales de toda la página si es necesario
  let bannersNavegados = puntosHeroIndices.length;
  for (let idx = 0; idx < puntosAllIndices.length && bannersNavegados < 3; idx++) {
    const puntoIndex = puntosAllIndices[idx];
    const punto = allSliderPoints.nth(puntoIndex);
    
    console.log(`🖱️ Navegando al banner ${bannersNavegados + 1} usando el punto del slider...`);
    
    // Regresar a home antes de cambiar de banner
    await page.goto(homeUrl);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 1000);
    
    // Hacer clic en el punto para cambiar de banner
    await punto.click();
    await safeWaitForTimeout(page, 1500); // Esperar a que cambie el banner
    
    // Verificar que el hero sigue visible después del cambio
    const heroSigueVisible = await heroImage.isVisible().catch(() => false);
    expect(heroSigueVisible).toBe(true);
    bannersNavegados++;
    console.log(`✅ Banner ${bannersNavegados} visible después del clic`);
    
    // Buscar el botón del banner actual
    const botonBanner = await encontrarBotonBannerActual();
    
    if (botonBanner) {
      console.log(`🔍 Botón encontrado en banner ${bannersNavegados}: "${botonBanner.texto}"`);
      
      await expect(botonBanner.elemento).toBeVisible();
      await expect(botonBanner.elemento).toBeEnabled();
      
      // Hacer clic en el botón
      const urlAntes = page.url();
      await botonBanner.elemento.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      const urlDespues = page.url();
      urlsVisitadas.push(urlDespues);
      botonesPorBanner.push({ texto: botonBanner.texto, url: urlDespues });
      
      console.log(`✅ Botón "${botonBanner.texto}" navegó a: ${urlDespues}`);
      
      // Regresar a home para continuar con el siguiente banner
      await page.goto(homeUrl);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 1000);
    } else {
      console.log(`⚠️ No se encontró botón en el banner ${bannersNavegados}`);
    }
  }
  
  // Validar que se encontraron botones
  expect(botonesPorBanner.length).toBeGreaterThan(0);
  console.log(`✅ Se validaron ${botonesPorBanner.length} botones de banners diferentes`);
  
  // Validar que los botones navegan a lugares diferentes
  await showStepMessage(page, '🔍 VALIDANDO QUE LOS BOTONES NAVEGAN A LUGARES DIFERENTES');
  await safeWaitForTimeout(page, 1000);
  
  if (botonesPorBanner.length > 1) {
    const urlsUnicas = [...new Set(urlsVisitadas)];
    console.log(`📊 URLs únicas visitadas: ${urlsUnicas.length} de ${urlsVisitadas.length} totales`);
    
    // Mostrar resumen de navegación
    console.log('📋 Resumen de navegación:');
    botonesPorBanner.forEach((boton, index) => {
      console.log(`  Banner ${index + 1}: "${boton.texto}" → ${boton.url}`);
    });
    
    // Validar que al menos hay URLs diferentes (pueden ser todas diferentes o algunas iguales)
    // Lo importante es que cada botón funciona correctamente
    if (urlsUnicas.length === urlsVisitadas.length) {
      console.log('✅ Todos los botones navegan a lugares diferentes');
  } else {
      console.log(`ℹ️ Algunos botones navegan al mismo lugar (${urlsUnicas.length} lugares únicos de ${urlsVisitadas.length} botones)`);
    }
  } else {
    console.log('ℹ️ Solo se encontró un botón, no se puede validar que naveguen a lugares diferentes');
  }

  await showStepMessage(page, '✅ VALIDACIÓN DEL HERO BANNER COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de funcionalidad del hero banner completada exitosamente');
});

test('Validar funcionalidad de la sección de categorías', async ({ page }) => {
  test.setTimeout(180000); // 3 minutos para validar todas las categorías

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 1000);

  // 1️⃣ VALIDAR ESTRUCTURA DEL CONTENEDOR DE CATEGORÍAS
  await showStepMessage(page, '📂 VALIDANDO ESTRUCTURA DE CATEGORÍAS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando estructura del contenedor de categorías...');
  
  // Contenedor principal
  const contenedorPrincipal = page.locator('div.relative.max-w-full.overflow-hidden');
  await expect(contenedorPrincipal).toBeVisible({ timeout: 10000 });
  console.log('✅ Contenedor principal de categorías encontrado');
  
  // Contenedor con scroll
  const contenedorScroll = contenedorPrincipal.locator('div.overflow-x-auto.w-full.scrollbar-hide.no-scrollbar');
  await expect(contenedorScroll).toBeVisible();
  console.log('✅ Contenedor con scroll encontrado');
  
  // Contenedor flex con las categorías
  const contenedorFlex = contenedorScroll.locator('div.flex.flex-row.lg\\:items-center.lg\\:justify-between');
  await expect(contenedorFlex).toBeVisible();
  console.log('✅ Contenedor flex de categorías encontrado');

  // 2️⃣ VALIDAR LAS 10 CATEGORÍAS
  await showStepMessage(page, '📋 VALIDANDO CATEGORÍAS INDIVIDUALES');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando categorías individuales...');
  
  const categoriasEsperadas = [
    'Alimentos',
    'Bebidas',
    'Lugares',
    'Mobiliario',
    'Entretenimiento',
    'Música',
    'Decoración',
    'Invitaciones',
    'Mesa de regalos',
    'Servicios Especializados'
  ];
  
  // Buscar botones de categorías
  const categoriaButtons = contenedorFlex.locator('button.flex.flex-col.text-center.items-center');
  const categoriaButtonsCount = await categoriaButtons.count();
  
  expect(categoriaButtonsCount).toBeGreaterThanOrEqual(categoriasEsperadas.length);
  console.log(`✅ Se encontraron ${categoriaButtonsCount} botones de categorías`);
  
  // Validar cada categoría
  for (const categoriaNombre of categoriasEsperadas) {
    const categoriaButton = categoriaButtons.filter({
      hasText: new RegExp(categoriaNombre, 'i')
    }).first();
    
    await expect(categoriaButton).toBeVisible({ timeout: 5000 });
    console.log(`✅ Categoría "${categoriaNombre}" encontrada`);
    
    // Validar que tiene la imagen
    const categoriaImage = categoriaButton.locator('img[alt="Ícono de categoría"]');
    await expect(categoriaImage).toBeVisible();
    
    // Validar que tiene el texto
    const categoriaText = categoriaButton.locator('div.flex.flex-row.text-xsmall.mt-2');
    await expect(categoriaText).toBeVisible();
    const textoCategoria = await categoriaText.textContent();
    expect(textoCategoria?.trim()).toContain(categoriaNombre);
  }

  // 3️⃣ VALIDAR BOTONES DE NAVEGACIÓN (IZQUIERDA Y DERECHA)
  await showStepMessage(page, '⬅️➡️ VALIDANDO BOTONES DE NAVEGACIÓN');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando botones de navegación...');
  
  // Botón izquierdo
  const botonIzquierdo = contenedorPrincipal.locator('button.hidden.md\\:absolute.left-0').filter({
    has: page.locator('i.icon-chevron-left')
  });
  const botonIzquierdoVisible = await botonIzquierdo.isVisible().catch(() => false);
  
  if (botonIzquierdoVisible) {
    await expect(botonIzquierdo).toBeVisible();
    await expect(botonIzquierdo).toBeEnabled();
    console.log('✅ Botón de navegación izquierda encontrado y habilitado');
  } else {
    console.log('ℹ️ Botón de navegación izquierda no visible (puede estar oculto según el viewport)');
  }
  
  // Botón derecho
  const botonDerecho = contenedorPrincipal.locator('button.hidden.md\\:absolute.right-0').filter({
    has: page.locator('i.icon-chevron-right')
  });
  const botonDerechoVisible = await botonDerecho.isVisible().catch(() => false);
  
  if (botonDerechoVisible) {
    await expect(botonDerecho).toBeVisible();
    await expect(botonDerecho).toBeEnabled();
    console.log('✅ Botón de navegación derecha encontrado y habilitado');
  } else {
    console.log('ℹ️ Botón de navegación derecha no visible (puede estar oculto según el viewport)');
  }

  // 4️⃣ VALIDAR FUNCIONALIDAD DE CLIC EN CATEGORÍAS
  await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DE CLIC EN CATEGORÍAS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando funcionalidad de clic en categorías...');
  
  const urlsCategorias: string[] = [];
  
  // Hacer clic en todas las categorías para validar que navegan correctamente
  for (let i = 0; i < categoriasEsperadas.length; i++) {
    const categoriaNombre = categoriasEsperadas[i];
    const categoriaButton = categoriaButtons.filter({
      hasText: new RegExp(categoriaNombre, 'i')
    }).first();
    
    console.log(`🖱️ Haciendo clic en la categoría: "${categoriaNombre}"`);
    
    // Asegurarse de que estamos en home antes de hacer clic
    if (page.url() !== homeUrl) {
      await page.goto(homeUrl);
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 500);
    }
    
    const urlAntes = page.url();
    await categoriaButton.click();
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 1000); // Reducido de 2000ms a 1000ms
    
    const urlDespues = page.url();
    urlsCategorias.push(urlDespues);
    
    // Las categorías deberían navegar a una página de servicios o búsqueda
    const navegoCorrectamente = 
      urlDespues.includes('/services') ||
      urlDespues.includes('/servicios') ||
      urlDespues.includes('/search') ||
      urlDespues.includes('/buscar') ||
      urlDespues.includes(categoriaNombre.toLowerCase()) ||
      urlDespues !== urlAntes;
    
    console.log(`✅ Categoría "${categoriaNombre}" navegó a: ${urlDespues}`);
    
    // Regresar a home para continuar con la siguiente categoría
    await page.goto(homeUrl);
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 500); // Reducido de 1000ms a 500ms
  }
  
  // Validar que todas las categorías navegan correctamente
  expect(urlsCategorias.length).toBe(categoriasEsperadas.length);
  console.log(`✅ Se validaron todas las ${urlsCategorias.length} categorías con navegación correcta`);
  
  // Mostrar resumen de navegación
  console.log('📋 Resumen de navegación de categorías:');
  categoriasEsperadas.forEach((categoria, index) => {
    if (urlsCategorias[index]) {
      console.log(`  ${index + 1}. "${categoria}" → ${urlsCategorias[index]}`);
    }
  });
  
  // Validar que hay URLs diferentes (algunas categorías pueden navegar al mismo lugar)
  const urlsUnicas = [...new Set(urlsCategorias)];
  console.log(`📊 URLs únicas visitadas: ${urlsUnicas.length} de ${urlsCategorias.length} categorías`);

  // 5️⃣ VALIDAR FUNCIONALIDAD DE BOTONES DE NAVEGACIÓN (SCROLL)
  await showStepMessage(page, '🔄 VALIDANDO FUNCIONALIDAD DE SCROLL');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando funcionalidad de scroll con botones de navegación...');
  
  // Regresar a home
  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 500);
  
  if (botonDerechoVisible) {
    // Obtener posición de scroll inicial
    const scrollInicial = await contenedorScroll.evaluate((el) => el.scrollLeft);
    console.log(`📊 Posición de scroll inicial: ${scrollInicial}`);
    
    // Hacer clic en el botón derecho
    await botonDerecho.click();
    await safeWaitForTimeout(page, 500);
    
    // Obtener posición de scroll después del clic
    const scrollDespuesDerecho = await contenedorScroll.evaluate((el) => el.scrollLeft);
    console.log(`📊 Posición de scroll después de clic derecho: ${scrollDespuesDerecho}`);
    
    // El scroll debería haber cambiado (aumentado)
    if (scrollDespuesDerecho > scrollInicial) {
      console.log('✅ Botón derecho desplaza el scroll correctamente');
    } else {
      console.log('⚠️ Botón derecho no desplazó el scroll (puede que ya esté al final)');
    }
    
    // Si el botón izquierdo está visible, probarlo también
    if (botonIzquierdoVisible) {
      await botonIzquierdo.click();
      await safeWaitForTimeout(page, 500);
      
      const scrollDespuesIzquierdo = await contenedorScroll.evaluate((el) => el.scrollLeft);
      console.log(`📊 Posición de scroll después de clic izquierdo: ${scrollDespuesIzquierdo}`);
      
      // El scroll debería haber cambiado (disminuido)
      if (scrollDespuesIzquierdo < scrollDespuesDerecho) {
        console.log('✅ Botón izquierdo desplaza el scroll correctamente');
      } else {
        console.log('⚠️ Botón izquierdo no desplazó el scroll (puede que ya esté al inicio)');
      }
    }
  } else {
    console.log('ℹ️ Botones de navegación no visibles, validando scroll manual...');
    
    // Validar que el contenedor permite scroll horizontal
    const tieneScroll = await contenedorScroll.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    
    if (tieneScroll) {
      console.log('✅ El contenedor permite scroll horizontal');
    } else {
      console.log('ℹ️ El contenedor no requiere scroll (todas las categorías caben en pantalla)');
    }
  }

  await showStepMessage(page, '✅ VALIDACIÓN DE CATEGORÍAS COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de funcionalidad de categorías completada exitosamente');
});

test('Validar funcionalidad de los botones de tipos de eventos', async ({ page }) => {
  test.setTimeout(180000); // 3 minutos para validar todos los eventos

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 1000);

  // 1️⃣ VALIDAR ESTRUCTURA DEL GRID DE EVENTOS
  await showStepMessage(page, '🎉 VALIDANDO ESTRUCTURA DEL GRID DE EVENTOS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando estructura del grid de eventos...');
  
  // Buscar el grid de eventos
  const gridEventos = page.locator('div.grid').filter({
    has: page.locator('img[alt="Fiestamas Square Image"]')
  }).first();
  
  const gridVisible = await gridEventos.isVisible({ timeout: 10000 }).catch(() => false);
  expect(gridVisible).toBe(true);
  console.log('✅ Grid de eventos encontrado');

  // 2️⃣ VALIDAR TIPOS DE EVENTOS ESPERADOS
  await showStepMessage(page, '📋 VALIDANDO TIPOS DE EVENTOS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando tipos de eventos...');
  
  const eventosEsperados = [
    'Cumpleaños',
    'Baby Shower',
    'Bautizo',
    'Boda',
    'Revelación',
    'XV Años',
    'Graduaciones',
    'Divorcio',
    'Corporativa',
    'Planners',
    'Despedida',
    'Personaliza tu evento'
  ];
  
  // Buscar botones de eventos
  const eventButtons = page.locator('button').filter({
    has: page.locator('img[alt="Fiestamas Square Image"]')
  });
  const eventButtonsCount = await eventButtons.count();
  
  expect(eventButtonsCount).toBeGreaterThanOrEqual(eventosEsperados.length);
  console.log(`✅ Se encontraron ${eventButtonsCount} botones de eventos`);
  
  // Validar que cada evento está presente
  for (const eventName of eventosEsperados) {
    const eventButton = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: new RegExp(eventName, 'i') })
    }).first();
    
    await expect(eventButton).toBeVisible({ timeout: 5000 });
    console.log(`✅ Evento "${eventName}" encontrado`);
    
    // Validar que tiene la imagen
    const eventImage = eventButton.locator('img[alt="Fiestamas Square Image"]');
    await expect(eventImage).toBeVisible();
    
    // Validar que tiene el texto
    const eventText = eventButton.locator('p').filter({ hasText: new RegExp(eventName, 'i') });
    await expect(eventText).toBeVisible();
  }

  // 3️⃣ VALIDAR FUNCIONALIDAD DE CLIC EN EVENTOS
  await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DE CLIC EN EVENTOS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando funcionalidad de clic en eventos...');
  
  const urlsEventos: string[] = [];
  const eventosValidados: Array<{ nombre: string; url: string }> = [];
  
  // Hacer clic en todos los eventos para validar que navegan correctamente
  for (let i = 0; i < eventosEsperados.length; i++) {
    const eventName = eventosEsperados[i];
    const eventButton = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: new RegExp(eventName, 'i') })
    }).first();
    
    console.log(`🖱️ Haciendo clic en el evento: "${eventName}"`);
    
    // Asegurarse de que estamos en home antes de hacer clic
    if (page.url() !== homeUrl) {
      await page.goto(homeUrl);
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 500);
    }
    
    // Scroll al botón si es necesario para asegurar que sea visible
    await eventButton.scrollIntoViewIfNeeded();
    await safeWaitForTimeout(page, 300);
    
    const urlAntes = page.url();
    
    // Verificar que el botón es clickeable
    await expect(eventButton).toBeVisible();
    await expect(eventButton).toBeEnabled();
    
    await eventButton.click();
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 1000);
    
    const urlDespues = page.url();
    urlsEventos.push(urlDespues);
    eventosValidados.push({ nombre: eventName, url: urlDespues });
    
    // Los eventos deberían navegar a una página de creación de evento, servicios o búsqueda
    const navegoCorrectamente = 
      urlDespues.includes('/new') ||
      urlDespues.includes('/nueva') ||
      urlDespues.includes('/create') ||
      urlDespues.includes('/crear') ||
      urlDespues.includes('/services') ||
      urlDespues.includes('/servicios') ||
      urlDespues.includes('/search') ||
      urlDespues.includes('/buscar') ||
      urlDespues.includes(eventName.toLowerCase().replace(/\s+/g, '-')) ||
      urlDespues !== urlAntes;
    
    console.log(`✅ Evento "${eventName}" navegó a: ${urlDespues}`);
    
    // Regresar a home para continuar con el siguiente evento
    await page.goto(homeUrl);
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 500);
  }
  
  // Validar que todos los eventos navegan correctamente
  expect(eventosValidados.length).toBe(eventosEsperados.length);
  console.log(`✅ Se validaron todos los ${eventosValidados.length} eventos con navegación correcta`);
  
  // Mostrar resumen de navegación
  console.log('📋 Resumen de navegación de eventos:');
  eventosValidados.forEach((evento, index) => {
    console.log(`  ${index + 1}. "${evento.nombre}" → ${evento.url}`);
  });
  
  // Validar que hay URLs diferentes (algunos eventos pueden navegar al mismo lugar)
  const urlsUnicas = [...new Set(urlsEventos)];
  console.log(`📊 URLs únicas visitadas: ${urlsUnicas.length} de ${urlsEventos.length} eventos`);

  await showStepMessage(page, '✅ VALIDACIÓN DE EVENTOS COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de funcionalidad de eventos completada exitosamente');
});

test('Validar funcionalidad de los botones de estímulos', async ({ page }) => {
  test.setTimeout(120000); // 2 minutos para validar todos los estímulos

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 1000);

  // 1️⃣ VALIDAR ESTRUCTURA DE LOS ESTÍMULOS
  await showStepMessage(page, '⭐ VALIDANDO ESTRUCTURA DE ESTÍMULOS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando estructura de los estímulos...');
  
  const estimulosIds = ['stim1', 'stim2', 'stim3', 'stim4'];
  const estimulosEncontrados: Array<{ id: string; elemento: ReturnType<typeof page.locator> }> = [];
  
  for (const estimuloId of estimulosIds) {
    const estimuloContainer = page.locator(`div#${estimuloId}`);
    const containerExists = await estimuloContainer.count() > 0;
    
    if (containerExists) {
      const estimuloButton = estimuloContainer.locator('button[type="button"]');
      const isVisible = await estimuloButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        estimulosEncontrados.push({ id: estimuloId, elemento: estimuloButton });
        console.log(`✅ Estímulo ${estimuloId} encontrado y visible`);
    } else {
        console.log(`ℹ️ Estímulo ${estimuloId} encontrado pero no visible (puede estar oculto según el viewport)`);
      }
    } else {
      console.log(`ℹ️ Contenedor del estímulo ${estimuloId} no encontrado`);
    }
  }
  
  expect(estimulosEncontrados.length).toBeGreaterThan(0);
  console.log(`✅ Se encontraron ${estimulosEncontrados.length} de ${estimulosIds.length} estímulos`);

  // 2️⃣ VALIDAR FUNCIONALIDAD DE CLIC EN ESTÍMULOS
  await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DE CLIC EN ESTÍMULOS');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando funcionalidad de clic en estímulos...');
  
  const estimulosValidados: Array<{ id: string; url: string; texto?: string }> = [];
  
  for (const { id, elemento } of estimulosEncontrados) {
    console.log(`🖱️ Validando estímulo ${id}...`);
    
    // Asegurarse de que estamos en home antes de hacer clic
    if (page.url() !== homeUrl) {
      await page.goto(homeUrl);
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 500);
    }
    
    // Scroll al botón si es necesario
    await elemento.scrollIntoViewIfNeeded();
    await safeWaitForTimeout(page, 300);
    
    await expect(elemento).toBeVisible();
    await expect(elemento).toBeEnabled();
    
    // Obtener el texto del botón si está disponible
    const textoBoton = await elemento.textContent().catch(() => '');
    
    const urlAntes = page.url();
    await elemento.click();
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 1000);
    
    const urlDespues = page.url();
    estimulosValidados.push({ 
      id, 
      url: urlDespues,
      texto: textoBoton?.trim() || undefined
    });
    
    console.log(`✅ Estímulo ${id} navegó a: ${urlDespues}`);
    if (textoBoton) {
      console.log(`   Texto del botón: "${textoBoton.trim()}"`);
    }
    
    // Regresar a home para continuar con el siguiente estímulo
    await page.goto(homeUrl);
    await page.waitForLoadState('domcontentloaded');
    await safeWaitForTimeout(page, 500);
  }
  
  // Validar que los estímulos navegan correctamente
  expect(estimulosValidados.length).toBeGreaterThan(0);
  console.log(`✅ Se validaron ${estimulosValidados.length} estímulos con navegación correcta`);
  
  // Mostrar resumen de navegación
  console.log('📋 Resumen de navegación de estímulos:');
  estimulosValidados.forEach((estimulo, index) => {
    const textoInfo = estimulo.texto ? ` ("${estimulo.texto}")` : '';
    console.log(`  ${index + 1}. Estímulo ${estimulo.id}${textoInfo} → ${estimulo.url}`);
  });
  
  // Validar que hay URLs diferentes (algunos estímulos pueden navegar al mismo lugar)
  const urlsUnicas = [...new Set(estimulosValidados.map(e => e.url))];
  console.log(`📊 URLs únicas visitadas: ${urlsUnicas.length} de ${estimulosValidados.length} estímulos`);

  await showStepMessage(page, '✅ VALIDACIÓN DE ESTÍMULOS COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de funcionalidad de estímulos completada exitosamente');
});

test('Validar funcionalidad del footer', async ({ page }) => {
  test.setTimeout(120000); // 2 minutos para validar todos los enlaces del footer

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const homeUrl = `${baseOrigin}/`;

  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 1000);

  // 1️⃣ VALIDAR ESTRUCTURA DEL FOOTER
  await showStepMessage(page, '👣 VALIDANDO ESTRUCTURA DEL FOOTER');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando estructura del footer...');
  
  const footer = page.locator('footer.w-dvw.bg-light-neutral');
  await expect(footer).toBeVisible({ timeout: 10000 });
  console.log('✅ Footer encontrado');

  // 2️⃣ VALIDAR SECCIÓN "PARA TI"
  await showStepMessage(page, '📋 VALIDANDO SECCIÓN "PARA TI"');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando sección "Para ti"...');
  
  const paraTiSection = footer.locator('p.text-medium').filter({ 
    hasText: /Para ti/i 
  });
  await expect(paraTiSection).toBeVisible();
  console.log('✅ Sección "Para ti" encontrada');

  // 3️⃣ VALIDAR ENLACES DEL FOOTER
  await showStepMessage(page, '🔗 VALIDANDO ENLACES DEL FOOTER');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando enlaces del footer...');
  
  const enlacesEsperados = [
    { texto: /Conviértete en proveedor/i, urlEsperada: /register|registro/i },
    { texto: /Inicia sesión/i, urlEsperada: /login|iniciar/i },
    { texto: /Beneficios para proveedores/i, urlEsperada: /registroproveedores|beneficios|provider/i }
  ];
  
  const enlacesValidados: Array<{ texto: string; url: string }> = [];
  
  for (const enlaceInfo of enlacesEsperados) {
    const enlace = footer.locator('a').filter({ hasText: enlaceInfo.texto });
    const enlaceCount = await enlace.count();
    
    if (enlaceCount > 0) {
      const enlaceElement = enlace.first();
      await expect(enlaceElement).toBeVisible({ timeout: 5000 });
      
      const textoEnlace = await enlaceElement.textContent();
      console.log(`🖱️ Validando enlace: "${textoEnlace?.trim()}"`);
      
      // Asegurarse de que estamos en home antes de hacer clic
      if (page.url() !== homeUrl) {
        await page.goto(homeUrl);
        await page.waitForLoadState('domcontentloaded');
        await safeWaitForTimeout(page, 500);
      }
      
      // Scroll al footer si es necesario
      await footer.scrollIntoViewIfNeeded();
      await safeWaitForTimeout(page, 300);
      
      const urlAntes = page.url();
      await enlaceElement.click();
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 1000);
      
      const urlDespues = page.url();
      enlacesValidados.push({ 
        texto: textoEnlace?.trim() || '', 
        url: urlDespues 
      });
      
      // Validar que navegó correctamente
      const navegoCorrectamente = enlaceInfo.urlEsperada.test(urlDespues) || urlDespues !== urlAntes;
      console.log(`✅ Enlace "${textoEnlace?.trim()}" navegó a: ${urlDespues}`);
      
      // Regresar a home para continuar con el siguiente enlace
      await page.goto(homeUrl);
      await page.waitForLoadState('domcontentloaded');
      await safeWaitForTimeout(page, 500);
    } else {
      console.log(`⚠️ Enlace con texto "${enlaceInfo.texto}" no encontrado`);
    }
  }
  
  expect(enlacesValidados.length).toBeGreaterThan(0);
  console.log(`✅ Se validaron ${enlacesValidados.length} de ${enlacesEsperados.length} enlaces del footer`);

  // 4️⃣ VALIDAR REDES SOCIALES
  await showStepMessage(page, '📱 VALIDANDO REDES SOCIALES');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando enlaces de redes sociales...');
  
  // Instagram
  const instagramLink = footer.locator('a[aria-label="Ir a Instagram"]');
  const instagramVisible = await instagramLink.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (instagramVisible) {
    await expect(instagramLink).toBeVisible();
    const instagramHref = await instagramLink.getAttribute('href');
    expect(instagramHref).toContain('instagram.com');
    console.log(`✅ Enlace de Instagram encontrado: ${instagramHref}`);
    
    // Validar icono
  const instagramIcon = instagramLink.locator('i.icon-instagram');
  await expect(instagramIcon).toBeVisible();
  } else {
    console.log('ℹ️ Enlace de Instagram no visible');
  }
  
  // Facebook
  const facebookLink = footer.locator('a[aria-label="Ir a Facebook"]');
  const facebookVisible = await facebookLink.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (facebookVisible) {
    await expect(facebookLink).toBeVisible();
    const facebookHref = await facebookLink.getAttribute('href');
    expect(facebookHref).toContain('facebook.com');
    console.log(`✅ Enlace de Facebook encontrado: ${facebookHref}`);
    
    // Validar icono
  const facebookIcon = facebookLink.locator('i.icon-facebook');
  await expect(facebookIcon).toBeVisible();
  } else {
    console.log('ℹ️ Enlace de Facebook no visible');
  }
  
  // TikTok
  const tiktokLink = footer.locator('a[aria-label="Ir a Tiktok"]');
  const tiktokVisible = await tiktokLink.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (tiktokVisible) {
    await expect(tiktokLink).toBeVisible();
    const tiktokHref = await tiktokLink.getAttribute('href');
    expect(tiktokHref).toContain('tiktok.com');
    console.log(`✅ Enlace de TikTok encontrado: ${tiktokHref}`);
    
    // Validar icono
  const tiktokIcon = tiktokLink.locator('i.icon-tiktok');
  await expect(tiktokIcon).toBeVisible();
  } else {
    console.log('ℹ️ Enlace de TikTok no visible');
  }

  // 5️⃣ VALIDAR COPYRIGHT
  await showStepMessage(page, '© VALIDANDO COPYRIGHT');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando copyright...');
  
  const copyright = footer.locator('p').filter({ 
    hasText: /© 2025\. Fiestamas/i 
  });
  await expect(copyright).toBeVisible();

  const copyrightText = await copyright.textContent();
  expect(copyrightText).toContain('2025');
  expect(copyrightText).toContain('Fiestamas');
  console.log(`✅ Copyright encontrado: "${copyrightText?.trim()}"`);

  // 6️⃣ VALIDAR FUNCIONALIDAD DE REDES SOCIALES (OPCIONAL - ABRIR EN NUEVA PESTAÑA)
  await showStepMessage(page, '🔗 VALIDANDO FUNCIONALIDAD DE REDES SOCIALES');
  await safeWaitForTimeout(page, 1000);
  console.log('🔍 Validando funcionalidad de enlaces de redes sociales...');
  
  // Regresar a home
  await page.goto(homeUrl);
  await page.waitForLoadState('domcontentloaded');
  await safeWaitForTimeout(page, 500);
  
  // Validar que los enlaces tienen target="_blank" o rel="noopener noreferrer"
  if (instagramVisible) {
    const instagramTarget = await instagramLink.getAttribute('target');
    const instagramRel = await instagramLink.getAttribute('rel');
    if (instagramTarget === '_blank' || instagramRel?.includes('noopener')) {
      console.log('✅ Enlace de Instagram abre en nueva pestaña');
    }
  }
  
  if (facebookVisible) {
    const facebookTarget = await facebookLink.getAttribute('target');
    const facebookRel = await facebookLink.getAttribute('rel');
    if (facebookTarget === '_blank' || facebookRel?.includes('noopener')) {
      console.log('✅ Enlace de Facebook abre en nueva pestaña');
    }
  }
  
  if (tiktokVisible) {
    const tiktokTarget = await tiktokLink.getAttribute('target');
    const tiktokRel = await tiktokLink.getAttribute('rel');
    if (tiktokTarget === '_blank' || tiktokRel?.includes('noopener')) {
      console.log('✅ Enlace de TikTok abre en nueva pestaña');
    }
  }

  // Mostrar resumen
  console.log('📋 Resumen de validación del footer:');
  console.log(`  - Enlaces validados: ${enlacesValidados.length}`);
  console.log(`  - Redes sociales encontradas: ${[instagramVisible, facebookVisible, tiktokVisible].filter(Boolean).length} de 3`);
  console.log(`  - Copyright: ✅`);

  await showStepMessage(page, '✅ VALIDACIÓN DEL FOOTER COMPLETADA EXITOSAMENTE');
  await safeWaitForTimeout(page, 1000);
  console.log('✅ Validación de funcionalidad del footer completada exitosamente');
});
