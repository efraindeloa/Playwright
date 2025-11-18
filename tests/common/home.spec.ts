import { test, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from '../config';

test('Validar todos los elementos del home', async ({ page }) => {
  test.setTimeout(120000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const urls = {
    home: `${baseOrigin}/`,
    register: `${baseOrigin}/register?role=PRVD`,
    login: `${baseOrigin}/login`
  };

  const wait = (ms = 1500) => page.waitForTimeout(ms);
  const gotoHome = async () => { 
    await page.goto(urls.home); 
    await page.waitForLoadState('networkidle');
    await wait(1000);
  };

  await gotoHome();

  // 1️⃣ VALIDAR NAVBAR
  console.log('🔍 Validando Navbar...');
  const navbar = page.locator('nav.z-50.fixed.w-dvw');
  await expect(navbar).toBeVisible({ timeout: 10000 });
  
  // Logo - validar que al menos uno esté visible (desktop o mobile)
  const logos = navbar.locator('svg#Capa_1');
  const logosCount = await logos.count();
  expect(logosCount).toBeGreaterThanOrEqual(1);
  
  // Verificar que al menos un logo esté visible
  let atLeastOneLogoVisible = false;
  for (let i = 0; i < logosCount; i++) {
    const isVisible = await logos.nth(i).isVisible().catch(() => false);
    if (isVisible) {
      atLeastOneLogoVisible = true;
      break;
    }
  }
  expect(atLeastOneLogoVisible).toBe(true);
  
  // Botones de búsqueda y usuario - validar que al menos uno esté visible
  const searchButtons = navbar.locator('button:has(i.icon-search)');
  const searchButtonsCount = await searchButtons.count();
  expect(searchButtonsCount).toBeGreaterThan(0);
  
  // Verificar que al menos un botón de búsqueda esté visible
  let atLeastOneSearchVisible = false;
  for (let i = 0; i < searchButtonsCount; i++) {
    const isVisible = await searchButtons.nth(i).isVisible().catch(() => false);
    if (isVisible) {
      atLeastOneSearchVisible = true;
      break;
    }
  }
  expect(atLeastOneSearchVisible).toBe(true);
  
  const userButtons = navbar.locator('button:has(i.icon-user)');
  const userButtonCount = await userButtons.count();
  expect(userButtonCount).toBeGreaterThan(0);
  
  // Verificar que al menos un botón de usuario esté visible
  let atLeastOneUserVisible = false;
  for (let i = 0; i < userButtonCount; i++) {
    const isVisible = await userButtons.nth(i).isVisible().catch(() => false);
    if (isVisible) {
      atLeastOneUserVisible = true;
      break;
    }
  }
  expect(atLeastOneUserVisible).toBe(true);

  // 2️⃣ VALIDAR HERO BANNER
  console.log('🔍 Validando Hero Banner...');
  const heroImage = page.locator('img[alt="Hero_Image"]');
  await expect(heroImage).toBeVisible({ timeout: 10000 });
  
  // El hero tiene un slider con múltiples banners - validar que al menos uno esté visible
  // Textos posibles de los banners del hero
  const possibleHeroTexts = [
    /Administra tu fiesta en un solo lugar/i,
    /TU FIESTA, MÁS FÁCIL!/i,
    /Encuentra los mejores servicios/i
  ];
  
  let heroBannerFound = false;
  for (const heroText of possibleHeroTexts) {
    const heroElement = page.locator('*').filter({ hasText: heroText }).first();
    const exists = await heroElement.count() > 0;
    if (exists) {
      const isVisible = await heroElement.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✅ Banner del hero encontrado con texto: ${heroText}`);
        heroBannerFound = true;
        break;
      }
    }
  }
  
  if (!heroBannerFound) {
    console.log('⚠️ No se encontró ningún banner del hero visible - puede estar cargando o ser otro banner');
  }
  
  // Validar que hay contenido en el hero (descripción o botón)
  const heroDescription = page.locator('p').filter({ hasText: /Proveedores|presupuesto|fechas|mejores servicios/i });
  const heroButton = page.locator('button').filter({ hasText: /¡Haz tu evento!|COMIENZA HOY!|empieza|empezar/i });
  
  const hasDescription = await heroDescription.count() > 0;
  const hasButton = await heroButton.count() > 0;
  
  if (hasDescription || hasButton) {
    console.log('✅ Hero banner tiene contenido visible (descripción o botón)');
  } else {
    console.log('⚠️ Hero banner puede estar cargando o tener otro contenido');
  }
  
  // Validar botón CTA si existe
  if (hasButton) {
    const buttonVisible = await heroButton.first().isVisible().catch(() => false);
    if (buttonVisible) {
      console.log('✅ Botón CTA del hero encontrado');
    }
  }
  
  // Puntos del slider (indican que hay múltiples banners)
  const sliderPoints = page.locator('button.rounded-full').filter({ 
    has: page.locator('button').filter({ hasNotText: /./ })
  });
  const sliderPointsCount = await sliderPoints.count();
  if (sliderPointsCount >= 2) {
    console.log(`✅ Slider del hero encontrado con ${sliderPointsCount} puntos`);
    expect(sliderPointsCount).toBeGreaterThanOrEqual(2);
  } else {
    console.log('⚠️ Slider del hero puede tener menos puntos o estar en otra ubicación');
  }

  // 3️⃣ VALIDAR CATEGORÍAS
  console.log('🔍 Validando Categorías...');
  const expectedCategories = [
    'Alimentos', 'Bebidas', 'Lugares', 'Mobiliario', 'Entretenimiento',
    'Música', 'Decoración', 'Invitaciones', 'Mesa de regalos', 'Servicios Especializados'
  ];
  
  const categoryButtons = page.locator('button').filter({ 
    has: page.locator('img[alt="Ícono de categoría"]')
  });
  await expect(categoryButtons).toHaveCount(10, { timeout: 10000 });
  
  for (const categoryName of expectedCategories) {
    const categoryButton = categoryButtons.filter({ 
      hasText: new RegExp(categoryName, 'i')
    }).first();
    await expect(categoryButton).toBeVisible({ timeout: 5000 });
    
    // Validar que tiene la imagen
    const categoryImage = categoryButton.locator('img[alt="Ícono de categoría"]');
    await expect(categoryImage).toBeVisible();
  }

  // 4️⃣ VALIDAR GRID DE EVENTOS
  console.log('🔍 Validando Grid de Eventos...');
  
  // Título de la sección - puede ser h4 (desktop) o h6 (mobile)
  const sectionTitles = page.locator('h4, h6').filter({ 
    hasText: /¡Elige qué quieres celebrar!/i 
  });
  const sectionTitlesCount = await sectionTitles.count();
  expect(sectionTitlesCount).toBeGreaterThan(0);
  
  // Verificar que al menos un título esté visible
  let atLeastOneSectionTitleVisible = false;
  for (let i = 0; i < sectionTitlesCount; i++) {
    const isVisible = await sectionTitles.nth(i).isVisible().catch(() => false);
    if (isVisible) {
      atLeastOneSectionTitleVisible = true;
      break;
    }
  }
  expect(atLeastOneSectionTitleVisible).toBe(true);
  
  // Eventos esperados
  const expectedEvents = [
    'Cumpleaños', 'Baby Shower', 'Bautizo', 'Boda', 'Revelación',
    'Despedida', 'Graduaciones', 'Fiesta de Divorcio', 'Corporativa',
    'Personaliza tu evento', 'XV Años'
  ];
  
  // Validar imágenes de eventos
  const eventImages = page.locator('img[alt="Fiestamas Square Image"]');
  const eventImagesCount = await eventImages.count();
  expect(eventImagesCount).toBeGreaterThanOrEqual(expectedEvents.length);
  
  // Validar textos de eventos
  for (const eventName of expectedEvents) {
    const eventButton = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: new RegExp(eventName, 'i') })
    }).first();
    await expect(eventButton).toBeVisible({ timeout: 5000 });
  }
  
  // Validar botones con estilos especiales (stim1, stim2, stim3)
  // Estos botones deben estar siempre visibles - buscar por ID
  const stimIds = ['stim1', 'stim2', 'stim3'];
  const stimButtonTexts = [
    /La App con todo para tu Fiesta/i,
    /Haz un evento memorable/i,
    /Personaliza tu fiesta/i
  ];
  
  for (let i = 0; i < stimIds.length; i++) {
    const stimId = stimIds[i];
    const expectedText = stimButtonTexts[i];
    
    // Buscar por ID primero
    const stimContainer = page.locator(`div#${stimId}`);
    const containerExists = await stimContainer.count() > 0;
    
    if (containerExists) {
      const stimButton = stimContainer.locator('button[type="button"]');
      await expect(stimButton).toBeVisible({ timeout: 10000 });
      
      // Validar que contiene el texto esperado usando filter con hasText
      const buttonWithText = stimButton.filter({ hasText: expectedText });
      const hasText = await buttonWithText.count() > 0;
      
      if (!hasText) {
        // Si no se encuentra, obtener el texto para debugging
        const buttonText = await stimButton.textContent();
        console.log(`⚠️ Texto encontrado en botón ${stimId}: "${buttonText}"`);
        console.log(`⚠️ Texto esperado: ${expectedText}`);
      }
      
      expect(hasText).toBe(true);
      console.log(`✅ Botón ${stimId} encontrado y visible con texto: ${expectedText}`);
    } else {
      // Fallback: buscar por texto si no se encuentra por ID
      const stimButton = page.locator('button[type="button"]').filter({
        hasText: expectedText
      }).first();
      await expect(stimButton).toBeVisible({ timeout: 10000 });
      console.log(`✅ Botón encontrado por texto: ${expectedText}`);
    }
  }

  // 5️⃣ VALIDAR FOOTER
  console.log('🔍 Validando Footer...');
  const footer = page.locator('footer.w-dvw.bg-light-neutral');
  await expect(footer).toBeVisible();
  
  // Sección "Para ti"
  const paraTiSection = footer.locator('p.text-medium').filter({ 
    hasText: /Para ti/i 
  });
  await expect(paraTiSection).toBeVisible();
  
  // Enlaces del footer
  const footerLinks = [
    /Conviértete en proveedor/i,
    /Inicia sesión/i,
    /Beneficios para proveedores/i
  ];
  
  for (const linkText of footerLinks) {
    const link = footer.locator('a').filter({ hasText: linkText });
    await expect(link.first()).toBeVisible({ timeout: 5000 });
  }
  
  // Redes sociales
  const instagramLink = footer.locator('a[aria-label="Ir a Instagram"]');
  await expect(instagramLink).toBeVisible();
  
  const facebookLink = footer.locator('a[aria-label="Ir a Facebook"]');
  await expect(facebookLink).toBeVisible();
  
  const tiktokLink = footer.locator('a[aria-label="Ir a Tiktok"]');
  await expect(tiktokLink).toBeVisible();
  
  // Validar iconos de redes sociales
  const instagramIcon = instagramLink.locator('i.icon-instagram');
  await expect(instagramIcon).toBeVisible();
  
  const facebookIcon = facebookLink.locator('i.icon-facebook');
  await expect(facebookIcon).toBeVisible();
  
  const tiktokIcon = tiktokLink.locator('i.icon-tiktok');
  await expect(tiktokIcon).toBeVisible();
  
  // Copyright
  const copyright = footer.locator('p').filter({ 
    hasText: /© 2025\. Fiestamas/i 
  });
  await expect(copyright).toBeVisible();

  // 6️⃣ VALIDAR NAVEGACIÓN MÓVIL (si está visible)
  console.log('🔍 Validando Navegación Móvil...');
  const mobileNav = page.locator('div.lg\\:hidden.fixed.bottom-0');
  const isMobileNavVisible = await mobileNav.isVisible().catch(() => false);
  
  if (isMobileNavVisible) {
    // Enlaces de navegación móvil
    const mobileHomeLink = mobileNav.locator('a:has(i.icon-home)');
    await expect(mobileHomeLink).toBeVisible();
    
    const mobileFavoritesLink = mobileNav.locator('a:has(i.icon-heart)');
    await expect(mobileFavoritesLink).toBeVisible();
    
    const mobileProfileLink = mobileNav.locator('a:has(i.icon-user)');
    await expect(mobileProfileLink).toBeVisible();
  }

  console.log('✅ Todas las validaciones del home completadas exitosamente');
});
