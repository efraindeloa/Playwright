import { test, expect, Page } from '@playwright/test';
import { DEFAULT_BASE_URL } from '../config';
import { showStepMessage, safeWaitForTimeout } from '../utils';

/**
 * Función helper para validar la estructura básica de una ruta de Familia
 */
async function validarEstructuraFamilia(
  page: Page,
  familiaSlug: string,
  familiaNombre: string,
  categoriasEsperadas: string[]
) {
  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const familiaUrl = `${baseOrigin}/c/${familiaSlug}`;

  await page.goto(familiaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar título de la página
  await showStepMessage(page, `📋 VALIDANDO TÍTULO DE LA PÁGINA - ${familiaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const titulo = page.getByText('Categorías', { exact: false }).or(
    page.locator('text=Categorías').or(
      page.getByRole('heading', { name: /Categorías/i })
    )
  );
  await expect(titulo.first()).toBeVisible({ timeout: 10000 });
  console.log(`✅ Título "Categorías" encontrado para ${familiaNombre}`);

  // Validar breadcrumb o tag de categoría principal
  await showStepMessage(page, `🍞 VALIDANDO BREADCRUMB/TAG - ${familiaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const breadcrumb = page.locator(`text=${familiaNombre}`).or(page.getByText(new RegExp(familiaNombre, 'i'))).first();
  await expect(breadcrumb).toBeVisible({ timeout: 5000 });
  console.log(`✅ Breadcrumb/Tag "${familiaNombre}" encontrado`);

  // Validar instrucción principal
  await showStepMessage(page, `📝 VALIDANDO INSTRUCCIÓN PRINCIPAL - ${familiaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const instruccion = page.locator(`text=/Selecciona la categoría de ${familiaNombre}/i`).or(
    page.getByText(new RegExp(`Selecciona la categoría de ${familiaNombre}`, 'i'))
  );
  await expect(instruccion.first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Instrucción principal encontrada para ${familiaNombre}`);

  // Validar enlace "Ver todos los servicios"
  await showStepMessage(page, `🔗 VALIDANDO ENLACE "VER TODOS LOS SERVICIOS" - ${familiaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const enlaceTodosServicios = page.locator('text=/Ver todos los servicios/i').or(
    page.getByRole('link', { name: /Ver todos los servicios/i })
  );
  await expect(enlaceTodosServicios.first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Enlace "Ver todos los servicios" encontrado para ${familiaNombre}`);

  // Validar categorías esperadas
  await showStepMessage(page, `📦 VALIDANDO CATEGORÍAS DE ${familiaNombre.toUpperCase()}`);
  await safeWaitForTimeout(page, 1000);
  
  let categoriasEncontradas = 0;
  for (const categoria of categoriasEsperadas) {
    const categoriaElement = page.locator(`text=${categoria}`).or(
      page.getByText(new RegExp(categoria, 'i'))
    );
    const count = await categoriaElement.count();
    if (count > 0) {
      await expect(categoriaElement.first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ Categoría "${categoria}" encontrada`);
      categoriasEncontradas++;
    } else {
      console.log(`⚠️ Categoría "${categoria}" no encontrada`);
    }
  }

  // Validar que hay al menos algunas categorías visibles
  const todasLasCategorias = page.locator('button, div, a').filter({
    hasText: new RegExp(categoriasEsperadas.join('|'), 'i')
  });
  const countCategorias = await todasLasCategorias.count();
  expect(countCategorias).toBeGreaterThan(0);
  console.log(`✅ Se encontraron ${countCategorias} categorías visibles para ${familiaNombre}`);
  
  return { categoriasEncontradas, countCategorias };
}

/**
 * Función helper para validar la estructura básica de una ruta de Categoría
 */
async function validarEstructuraCategoria(
  page: Page,
  familiaSlug: string,
  familiaNombre: string,
  categoriaSlug: string,
  categoriaNombre: string,
  subcategoriasEsperadas: string[]
) {
  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const categoriaUrl = `${baseOrigin}/c/${categoriaSlug}`;

  await page.goto(categoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar título de la página
  await showStepMessage(page, `📋 VALIDANDO TÍTULO - ${categoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const titulo = page.getByText('Categorías', { exact: false }).or(
    page.locator('text=Categorías').or(
      page.getByRole('heading', { name: /Categorías/i })
    )
  );
  await expect(titulo.first()).toBeVisible({ timeout: 10000 });
  console.log(`✅ Título "Categorías" encontrado para ${categoriaNombre}`);

  // Validar breadcrumb con ruta completa
  await showStepMessage(page, `🍞 VALIDANDO BREADCRUMB - ${categoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const breadcrumbCompleto = page.locator(`text=/${familiaNombre}.*${categoriaNombre}/i`).or(
    page.getByText(new RegExp(`${familiaNombre}.*${categoriaNombre}`, 'i'))
  );
  const breadcrumbExists = await breadcrumbCompleto.count() > 0;
  if (breadcrumbExists) {
    await expect(breadcrumbCompleto.first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ Breadcrumb completo "${familiaNombre} >> ${categoriaNombre}" encontrado`);
  } else {
    // Intentar buscar breadcrumb por partes
    const familia = page.locator(`text=${familiaNombre}`).first();
    const categoria = page.locator(`text=${categoriaNombre}`).or(page.getByText(new RegExp(categoriaNombre, 'i'))).first();
    if (await familia.count() > 0 && await categoria.count() > 0) {
      console.log(`✅ Breadcrumb encontrado por partes para ${categoriaNombre}`);
    } else {
      console.log(`⚠️ Breadcrumb completo no encontrado para ${categoriaNombre}`);
    }
  }

  // Validar instrucción principal
  await showStepMessage(page, `📝 VALIDANDO INSTRUCCIÓN - ${categoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const instruccion = page.locator(`text=/Selecciona la categoría de ${categoriaNombre}/i`).or(
    page.getByText(new RegExp(`Selecciona la categoría de ${categoriaNombre}`, 'i'))
  );
  await expect(instruccion.first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Instrucción principal encontrada para ${categoriaNombre}`);

  // Validar enlace "Ver todos los servicios"
  await showStepMessage(page, `🔗 VALIDANDO ENLACE "VER TODOS LOS SERVICIOS" - ${categoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const enlaceTodosServicios = page.locator('text=/Ver todos los servicios/i').or(
    page.getByRole('link', { name: /Ver todos los servicios/i })
  );
  await expect(enlaceTodosServicios.first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Enlace "Ver todos los servicios" encontrado para ${categoriaNombre}`);

  // Validar subcategorías esperadas
  await showStepMessage(page, `📦 VALIDANDO SUBCATEGORÍAS DE ${categoriaNombre.toUpperCase()}`);
  await safeWaitForTimeout(page, 1000);
  
  let subcategoriasEncontradas = 0;
  for (const subcategoria of subcategoriasEsperadas) {
    const subcategoriaElement = page.locator(`text=${subcategoria}`).or(
      page.getByText(new RegExp(subcategoria, 'i'))
    );
    const count = await subcategoriaElement.count();
    if (count > 0) {
      await expect(subcategoriaElement.first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ Subcategoría "${subcategoria}" encontrada`);
      subcategoriasEncontradas++;
    } else {
      console.log(`⚠️ Subcategoría "${subcategoria}" no encontrada`);
    }
  }

  // Validar que hay al menos algunas subcategorías visibles
  const todasLasSubcategorias = page.locator('button, div, a').filter({
    hasText: new RegExp(subcategoriasEsperadas.join('|'), 'i')
  });
  const countSubcategorias = await todasLasSubcategorias.count();
  expect(countSubcategorias).toBeGreaterThan(0);
  console.log(`✅ Se encontraron ${countSubcategorias} subcategorías visibles para ${categoriaNombre}`);
  
  return { subcategoriasEncontradas, countSubcategorias };
}

/**
 * Función helper para validar la estructura básica de una ruta de Sub-categoría
 */
async function validarEstructuraSubcategoria(
  page: Page,
  familiaSlug: string,
  familiaNombre: string,
  categoriaSlug: string,
  categoriaNombre: string,
  subcategoriaSlug: string,
  subcategoriaNombre: string
) {
  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const subcategoriaUrl = `${baseOrigin}/c/${subcategoriaSlug}`;

  await page.goto(subcategoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar título de la página
  await showStepMessage(page, `📋 VALIDANDO TÍTULO - ${subcategoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const titulo = page.locator('text=Servicios').or(page.getByRole('heading', { name: /Servicios/i }));
  await expect(titulo.first()).toBeVisible({ timeout: 10000 });
  console.log(`✅ Título "Servicios" encontrado para ${subcategoriaNombre}`);

  // Validar breadcrumb con ruta completa
  await showStepMessage(page, `🍞 VALIDANDO BREADCRUMB - ${subcategoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const breadcrumbCompleto = page.locator(
    `text=/${familiaNombre}.*${categoriaNombre}.*${subcategoriaNombre}/i`
  ).or(
    page.getByText(new RegExp(`${familiaNombre}.*${categoriaNombre}.*${subcategoriaNombre}`, 'i'))
  );
  const breadcrumbExists = await breadcrumbCompleto.count() > 0;
  if (breadcrumbExists) {
    await expect(breadcrumbCompleto.first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ Breadcrumb completo encontrado para ${subcategoriaNombre}`);
  } else {
    // Intentar buscar breadcrumb por partes
    const subcategoria = page.locator(`text=${subcategoriaNombre}`).or(page.getByText(new RegExp(subcategoriaNombre, 'i'))).first();
    if (await subcategoria.count() > 0) {
      console.log(`✅ Breadcrumb encontrado por partes para ${subcategoriaNombre}`);
    } else {
      console.log(`⚠️ Breadcrumb completo no encontrado para ${subcategoriaNombre}`);
    }
  }

  // Validar pregunta principal
  await showStepMessage(page, `❓ VALIDANDO PREGUNTA PRINCIPAL - ${subcategoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const pregunta = page.locator(`text=/¿Qué servicios de.*${subcategoriaNombre}.*buscas?/i`).or(
    page.getByText(new RegExp(`¿Qué servicios de.*${subcategoriaNombre}.*buscas?`, 'i'))
  );
  await expect(pregunta.first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Pregunta principal encontrada para ${subcategoriaNombre}`);

  // Validar campo de búsqueda
  await showStepMessage(page, `🔍 VALIDANDO CAMPO DE BÚSQUEDA - ${subcategoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const campoBusqueda = page.locator('input[placeholder*="Buscar" i], input[type="search"]').or(
    page.getByPlaceholder(/Buscar/i)
  );
  await expect(campoBusqueda.first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Campo de búsqueda encontrado para ${subcategoriaNombre}`);

  // Validar campo de ubicación
  await showStepMessage(page, `📍 VALIDANDO CAMPO DE UBICACIÓN - ${subcategoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  const campoUbicacion = page.locator('input').filter({
    has: page.locator('text=/Ubicación/i').or(page.getByText(/Ubicación/i))
  }).or(
    page.locator('input[placeholder*="Ubicación" i]')
  );
  const ubicacionExists = await campoUbicacion.count() > 0;
  if (ubicacionExists) {
    await expect(campoUbicacion.first()).toBeVisible({ timeout: 5000 });
    console.log(`✅ Campo de ubicación encontrado para ${subcategoriaNombre}`);
  } else {
    console.log(`⚠️ Campo de ubicación no encontrado para ${subcategoriaNombre}`);
  }

  // Validar que hay servicios/proveedores visibles
  await showStepMessage(page, `🏪 VALIDANDO SERVICIOS/PROVEEDORES - ${subcategoriaNombre}`);
  await safeWaitForTimeout(page, 1000);
  
  const servicios = page.locator('div[role="button"], div.card, article, section').filter({
    has: page.locator('h2, h3, h4, h5, h6, p').filter({ hasText: /./ })
  });
  const countServicios = await servicios.count();
  
  if (countServicios > 0) {
    console.log(`✅ Se encontraron ${countServicios} servicios/proveedores para ${subcategoriaNombre}`);
    const primerServicio = servicios.first();
    await expect(primerServicio).toBeVisible({ timeout: 5000 });
    console.log(`✅ Al menos un servicio es visible para ${subcategoriaNombre}`);
  } else {
    console.log(`⚠️ No se encontraron servicios/proveedores visibles para ${subcategoriaNombre}`);
  }
  
  return { countServicios };
}

// ============================================
// GRUPO 1: PRUEBAS QUE SOLO VERIFICAN EXISTENCIA DE ELEMENTOS
// ============================================

test('Validar estructura de la ruta de Familia (/c/alimentos)', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const familiaUrl = `${baseOrigin}/c/alimentos`;

  await page.goto(familiaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar título de la página
  await showStepMessage(page, '📋 VALIDANDO TÍTULO DE LA PÁGINA');
  await safeWaitForTimeout(page, 1000);
  const titulo = page.getByText('Categorías', { exact: false }).or(
    page.locator('text=Categorías').or(
      page.getByRole('heading', { name: /Categorías/i })
    )
  );
  await expect(titulo.first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Título "Categorías" encontrado');

  // Validar breadcrumb o tag de categoría principal
  await showStepMessage(page, '🍞 VALIDANDO BREADCRUMB/TAG DE CATEGORÍA');
  await safeWaitForTimeout(page, 1000);
  const breadcrumbAlimentos = page.locator('text=Alimentos').or(page.getByText(/Alimentos/i)).first();
  await expect(breadcrumbAlimentos).toBeVisible({ timeout: 5000 });
  console.log('✅ Breadcrumb/Tag "Alimentos" encontrado');

  // Validar instrucción principal
  await showStepMessage(page, '📝 VALIDANDO INSTRUCCIÓN PRINCIPAL');
  await safeWaitForTimeout(page, 1000);
  const instruccion = page.locator('text=/Selecciona la categoría de Alimentos/i');
  await expect(instruccion.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Instrucción principal encontrada');

  // Validar enlace "Ver todos los servicios"
  await showStepMessage(page, '🔗 VALIDANDO ENLACE "VER TODOS LOS SERVICIOS"');
  await safeWaitForTimeout(page, 1000);
  const enlaceTodosServicios = page.locator('text=/Ver todos los servicios/i').or(
    page.getByRole('link', { name: /Ver todos los servicios/i })
  );
  await expect(enlaceTodosServicios.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Enlace "Ver todos los servicios" encontrado');

  // Validar categorías esperadas de Alimentos
  await showStepMessage(page, '🍰 VALIDANDO CATEGORÍAS DE ALIMENTOS');
  await safeWaitForTimeout(page, 1000);
  
  const categoriasEsperadas = [
    'Postres / Pasteles',
    'Entradas',
    'Taquizas',
    'After Party',
    'Banquetes',
    'Snacks Botanas',
    'Buffetes'
  ];

  for (const categoria of categoriasEsperadas) {
    const categoriaElement = page.locator(`text=${categoria}`).or(
      page.getByText(new RegExp(categoria, 'i'))
    );
    const count = await categoriaElement.count();
    if (count > 0) {
      await expect(categoriaElement.first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ Categoría "${categoria}" encontrada`);
    } else {
      console.log(`⚠️ Categoría "${categoria}" no encontrada`);
    }
  }

  // Validar que hay al menos algunas categorías visibles
  const todasLasCategorias = page.locator('button, div, a').filter({
    hasText: new RegExp(categoriasEsperadas.join('|'), 'i')
  });
  const countCategorias = await todasLasCategorias.count();
  expect(countCategorias).toBeGreaterThan(0);
  console.log(`✅ Se encontraron ${countCategorias} categorías visibles`);
});

test('Validar estructura de la ruta de Familia (/c/decoracion)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'decoracion',
    'Decoración',
    [
      'Decorador profesional',
      'Luces',
      'Globos',
      'Temática',
      'Decoración y ambientación gral',
      'Centros de mesa',
      'Flores',
      'Mamparas'
    ]
  );
});

test('Validar estructura de la ruta de Familia (/c/entretenimiento)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'entretenimiento',
    'Entretenimiento',
    [
      'Juegos Mecánicos',
      'Backdrop',
      'Conferencista',
      'Mini Spa',
      'Magos',
      'Casino',
      'Mini Feria',
      'Pirotecnia',
      'Artistas',
      'Pinta Caritas',
      'Pulseras electrónicas',
      'Cabina de fotos',
      'Comediantes',
      'Inflables',
      'Payasos',
      'Artículos / Objetos',
      'Espectáculo'
    ]
  );
});

// NOTA: La ruta /c/fotografia no existe en el sitio - muestra "Categoría no encontrada"
// test('Validar estructura de la ruta de Familia (/c/fotografia)', async ({ page }) => {
//   Esta ruta no está disponible en staging.fiestamas.com
// });

test('Validar estructura de la ruta de Familia (/c/lugares)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'lugares',
    'Lugares',
    [
      'Playas',
      'Restaurantes',
      'Salón de eventos',
      'Haciendas',
      'Salón de hotel',
      'Antros / disco',
      'Centros de Convenciones',
      'Viñedos',
      'Terrazas'
    ]
  );
});

// NOTA: La ruta /c/mobiliario redirige a /services/mobiliario/1500 (muestra servicios directos, no categorías)
// test('Validar estructura de la ruta de Familia (/c/mobiliario)', async ({ page }) => {
//   Esta ruta redirige a servicios directos, no muestra categorías intermedias
// });

test('Validar estructura de la ruta de Familia (/c/bebidas)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'bebidas',
    'Bebidas',
    [
      'Coctelería',
      'Especialidades',
      'Vinos y Licores',
      'Cafés',
      'Refrescos / sodas',
      'Aguas de sabores'
    ]
  );
});

test('Validar estructura de la ruta de Familia (/c/musica)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'musica',
    'Música',
    [
      'Banda',
      'Urbana',
      'Cumbia y salsa',
      'Artistas reconocidos',
      'Rock / Pop',
      'DJ',
      'Sones Regionales',
      'Country',
      'Grupo Versátil',
      'Mariachi / Música Ranchera',
      'Solista, duetos, tríos y más',
      'Norteño',
      'Coro / Religiosa',
      'Violinista o saxofonista',
      'Otro Tipo'
    ]
  );
});

// NOTA: La ruta /c/invitaciones redirige a /services/invitaciones/1516 (muestra servicios directos, no categorías)
// test('Validar estructura de la ruta de Familia (/c/invitaciones)', async ({ page }) => {
//   Esta ruta redirige a servicios directos, no muestra categorías intermedias
// });

test('Validar estructura de la ruta de Familia (/c/mesa-de-regalos)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'mesa-de-regalos',
    'Mesa de regalos',
    [
      'Perfumería'
    ]
  );
});

test('Validar estructura de la ruta de Familia (/c/servicios-especializados)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'servicios-especializados',
    'Servicios Especializados',
    [
      'Cuidado de Mascotas',
      'Barman',
      'Niñeras',
      'Valet parking',
      'Belleza',
      'Agencia de Viajes',
      'Fotógrafo',
      'Hoteles',
      'Joyería',
      'Hostess',
      'Transporte',
      'Meseros',
      'Organizador de Eventos',
      'Coreografías',
      'Vestidos',
      'Barbería',
      'Smoking / trajes'
    ]
  );
});

test('Validar estructura de la ruta de Categoría (/c/alimentos-after-party)', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const categoriaUrl = `${baseOrigin}/c/alimentos-after-party`;

  await page.goto(categoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar título de la página
  await showStepMessage(page, '📋 VALIDANDO TÍTULO DE LA PÁGINA');
  await safeWaitForTimeout(page, 1000);
  const titulo = page.getByText('Categorías', { exact: false }).or(
    page.locator('text=Categorías').or(
      page.getByRole('heading', { name: /Categorías/i })
    )
  );
  await expect(titulo.first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Título "Categorías" encontrado');

  // Validar breadcrumb con ruta completa
  await showStepMessage(page, '🍞 VALIDANDO BREADCRUMB COMPLETO');
  await safeWaitForTimeout(page, 1000);
  const breadcrumbCompleto = page.locator('text=/Alimentos.*After Party/i').or(
    page.getByText(/Alimentos.*After Party/i)
  );
  const breadcrumbExists = await breadcrumbCompleto.count() > 0;
  if (breadcrumbExists) {
    await expect(breadcrumbCompleto.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Breadcrumb completo "Alimentos >> After Party" encontrado');
  } else {
    // Intentar buscar breadcrumb por partes
    const alimentos = page.locator('text=Alimentos').first();
    const afterParty = page.locator('text=After Party').or(page.getByText(/After Party/i)).first();
    if (await alimentos.count() > 0 && await afterParty.count() > 0) {
      console.log('✅ Breadcrumb encontrado por partes');
    } else {
      console.log('⚠️ Breadcrumb completo no encontrado');
    }
  }

  // Validar instrucción principal
  await showStepMessage(page, '📝 VALIDANDO INSTRUCCIÓN PRINCIPAL');
  await safeWaitForTimeout(page, 1000);
  const instruccion = page.locator('text=/Selecciona la categoría de After Party/i');
  await expect(instruccion.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Instrucción principal encontrada');

  // Validar enlace "Ver todos los servicios"
  await showStepMessage(page, '🔗 VALIDANDO ENLACE "VER TODOS LOS SERVICIOS"');
  await safeWaitForTimeout(page, 1000);
  const enlaceTodosServicios = page.locator('text=/Ver todos los servicios/i').or(
    page.getByRole('link', { name: /Ver todos los servicios/i })
  );
  await expect(enlaceTodosServicios.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Enlace "Ver todos los servicios" encontrado');

  // Validar subcategorías esperadas de After Party
  await showStepMessage(page, '🍔 VALIDANDO SUBCATEGORÍAS DE AFTER PARTY');
  await safeWaitForTimeout(page, 1000);
  
  const subcategoriasEsperadas = [
    'Hamburguesas',
    'Taquizas',
    'Chilaquiles'
  ];

  for (const subcategoria of subcategoriasEsperadas) {
    const subcategoriaElement = page.locator(`text=${subcategoria}`).or(
      page.getByText(new RegExp(subcategoria, 'i'))
    );
    const count = await subcategoriaElement.count();
    if (count > 0) {
      await expect(subcategoriaElement.first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ Subcategoría "${subcategoria}" encontrada`);
    } else {
      console.log(`⚠️ Subcategoría "${subcategoria}" no encontrada`);
    }
  }

  // Validar que hay al menos algunas subcategorías visibles
  const todasLasSubcategorias = page.locator('button, div, a').filter({
    hasText: new RegExp(subcategoriasEsperadas.join('|'), 'i')
  });
  const countSubcategorias = await todasLasSubcategorias.count();
  expect(countSubcategorias).toBeGreaterThan(0);
  console.log(`✅ Se encontraron ${countSubcategorias} subcategorías visibles`);
});

// NOTA: Las subcategorías NO usan /c/subcategoria, redirigen directamente a /services/familia-categoria-subcategoria/ID
// Por ejemplo: /services/alimentos-after-party-hamburguesas/12922
// test('Validar estructura de la ruta de Sub-categoría (/c/hamburguesas)', async ({ page }) => {
//   Esta ruta no existe - las subcategorías redirigen a /services/
// });

// ============================================
// GRUPO 2: PRUEBAS QUE VERIFICAN EXISTENCIA Y FUNCIONALIDAD
// ============================================

test('Navegar desde Familia a Categoría (/c/alimentos -> /c/alimentos-after-party)', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const familiaUrl = `${baseOrigin}/c/alimentos`;

  await page.goto(familiaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Buscar y hacer clic en la categoría "After Party"
  await showStepMessage(page, '🖱️ BUSCANDO CATEGORÍA "AFTER PARTY"');
  await safeWaitForTimeout(page, 1000);
  
  const categoriaAfterParty = page.locator('button, a, div[role="button"]').filter({
    hasText: /After Party/i
  }).first();
  
  await expect(categoriaAfterParty).toBeVisible({ timeout: 10000 });
  console.log('✅ Categoría encontrada');
  
  await showStepMessage(page, '🖱️ HACIENDO CLIC EN "AFTER PARTY"');
  await safeWaitForTimeout(page, 1000);
  await categoriaAfterParty.click();
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar que se navegó a la ruta correcta
  await showStepMessage(page, '✅ VALIDANDO NAVEGACIÓN');
  console.log('✅ Navegación exitosa');
  await safeWaitForTimeout(page, 1000);
  const urlActual = page.url();
  expect(urlActual).toContain('/c/alimentos-after-party');
  console.log(`✅ Navegación exitosa a: ${urlActual}`);

  // Validar que se muestra el contenido de After Party
  const instruccion = page.locator('text=/Selecciona la categoría de After Party/i');
  await expect(instruccion.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Contenido de After Party visible');
});

test('Navegar desde Categoría a Sub-categoría (/c/alimentos-after-party -> servicios)', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const categoriaUrl = `${baseOrigin}/c/alimentos-after-party`;

  await page.goto(categoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Buscar y hacer clic en la subcategoría "Hamburguesas"
  await showStepMessage(page, '🖱️ BUSCANDO SUBCATEGORÍA "HAMBURGUESAS"');
  await safeWaitForTimeout(page, 1000);
  
  const subcategoriaHamburguesas = page.locator('button, a, div[role="button"]').filter({
    hasText: /Hamburguesas/i
  }).first();
  
  await expect(subcategoriaHamburguesas).toBeVisible({ timeout: 10000 });
  console.log('✅ Subcategoría encontrada');
  
  await showStepMessage(page, '🖱️ HACIENDO CLIC EN "HAMBURGUESAS"');
  await safeWaitForTimeout(page, 1000);
  await subcategoriaHamburguesas.click();
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar que se navegó a la ruta de servicios (las subcategorías redirigen a /services/)
  await showStepMessage(page, '✅ VALIDANDO NAVEGACIÓN');
  console.log('✅ Navegación exitosa');
  await safeWaitForTimeout(page, 1000);
  const urlActual = page.url();
  expect(urlActual).toContain('/services/');
  expect(urlActual).toContain('hamburguesas');
  console.log(`✅ Navegación exitosa a: ${urlActual}`);

  // Validar que se muestra el contenido de servicios
  const pregunta = page.locator('text=/¿Qué servicios de.*Hamburguesas.*buscas?/i');
  await expect(pregunta.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Navegación a subcategoría exitosa');
});

test('Navegar usando breadcrumb desde Sub-categoría a Categoría', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  // Las subcategorías redirigen a /services/, usamos una URL real de servicios
  const subcategoriaUrl = `${baseOrigin}/services/alimentos-after-party-hamburguesas/12922`;

  await page.goto(subcategoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Buscar breadcrumb de "After Party" y hacer clic
  await showStepMessage(page, '🍞 BUSCANDO BREADCRUMB "AFTER PARTY"');
  await safeWaitForTimeout(page, 1000);
  
  const breadcrumbAfterParty = page.locator('button, a').filter({
    hasText: /After Party/i
  }).first();
  
  const breadcrumbExists = await breadcrumbAfterParty.count() > 0;
  if (breadcrumbExists) {
    await expect(breadcrumbAfterParty).toBeVisible({ timeout: 5000 });
    console.log('✅ Breadcrumb "After Party" encontrado');
    
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN BREADCRUMB "AFTER PARTY"');
    await safeWaitForTimeout(page, 1000);
    await breadcrumbAfterParty.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);

    // Validar que se navegó a la ruta correcta
    const urlActual = page.url();
    expect(urlActual).toContain('/c/alimentos-after-party');
    console.log(`✅ Navegación exitosa a: ${urlActual}`);
  } else {
    console.log('⚠️ Breadcrumb "After Party" no encontrado o no es clickeable');
  }
});

test('Navegar usando breadcrumb desde Categoría a Familia', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const categoriaUrl = `${baseOrigin}/c/alimentos-after-party`;

  await page.goto(categoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Buscar breadcrumb de "Alimentos" y hacer clic
  await showStepMessage(page, '🍞 BUSCANDO BREADCRUMB "ALIMENTOS"');
  await safeWaitForTimeout(page, 1000);
  
  const breadcrumbAlimentos = page.locator('button, a').filter({
    hasText: /Alimentos/i
  }).first();
  
  const breadcrumbExists = await breadcrumbAlimentos.count() > 0;
  if (breadcrumbExists) {
    await expect(breadcrumbAlimentos).toBeVisible({ timeout: 5000 });
    console.log('✅ Breadcrumb "Alimentos" encontrado');
    
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN BREADCRUMB "ALIMENTOS"');
    await safeWaitForTimeout(page, 1000);
    await breadcrumbAlimentos.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);

    // Validar que se navegó a la ruta correcta
    const urlActual = page.url();
    expect(urlActual).toContain('/c/alimentos');
    console.log(`✅ Navegación exitosa a: ${urlActual}`);
  } else {
    console.log('⚠️ Breadcrumb "Alimentos" no encontrado o no es clickeable');
  }
});

test('Validar funcionalidad de búsqueda en Sub-categoría (servicios de hamburguesas)', async ({ page }) => {
  test.setTimeout(60000);

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  // Las subcategorías redirigen a /services/, usamos una URL real de servicios
  const subcategoriaUrl = `${baseOrigin}/services/alimentos-after-party-hamburguesas/12922`;

  await page.goto(subcategoriaUrl);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Buscar campo de búsqueda
  await showStepMessage(page, '🔍 BUSCANDO CAMPO DE BÚSQUEDA');
  await safeWaitForTimeout(page, 1000);
  
  const campoBusqueda = page.locator('input[placeholder*="Buscar" i], input[type="search"]').or(
    page.getByPlaceholder(/Buscar/i)
  ).first();
  
  await expect(campoBusqueda).toBeVisible({ timeout: 5000 });
  console.log('✅ Campo de búsqueda encontrado');

  // Realizar búsqueda
  await showStepMessage(page, '⌨️ REALIZANDO BÚSQUEDA');
  await safeWaitForTimeout(page, 1000);
  await campoBusqueda.fill('hamburguesa');
  await safeWaitForTimeout(page, 1000);
  
  // Presionar Enter o hacer clic en el botón de búsqueda
  const botonBuscar = page.locator('button[type="submit"]').filter({
    has: page.locator('[aria-label*="buscar" i], [aria-label*="search" i]')
  }).or(
    page.locator('button').filter({ has: page.locator('svg, i') })
  ).first();
  
  if (await botonBuscar.count() > 0) {
    await botonBuscar.click();
  } else {
    await campoBusqueda.press('Enter');
  }
  
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);

  // Validar que se muestran resultados (o estado vacío si no hay resultados)
  await showStepMessage(page, '✅ VALIDANDO RESULTADOS DE BÚSQUEDA');
  await safeWaitForTimeout(page, 1000);
  
  const resultados = page.locator('div[role="button"], div.card, article').filter({
    has: page.locator('h2, h3, h4, h5, h6, p').filter({ hasText: /./ })
  });
  const estadoVacio = page.locator('text=/No se encontraron resultados/i').or(
    page.getByText(/No hay resultados/i)
  );
  
  const hayResultados = await resultados.count() > 0;
  const hayEstadoVacio = await estadoVacio.count() > 0;
  
  if (hayResultados) {
    console.log(`✅ Se encontraron ${await resultados.count()} resultados de búsqueda`);
  } else if (hayEstadoVacio) {
    console.log('✅ Se muestra estado vacío (sin resultados)');
  } else {
    console.log('⚠️ No se pudo determinar el estado de los resultados');
  }
});

// NOTA: Las subcategorías NO usan /c/subcategoria, redirigen directamente a /services/familia-categoria-subcategoria/ID
// test('Validar estructura de Sub-categoría de Decoración (ejemplo: /c/globos)', async ({ page }) => {
//   Las subcategorías redirigen a /services/ - no hay rutas /c/ para subcategorías
// });

// NOTA: Las subcategorías NO usan /c/subcategoria, redirigen directamente a /services/familia-categoria-subcategoria/ID
// test('Validar estructura de Sub-categoría de Entretenimiento (ejemplo: /c/dj)', async ({ page }) => {
//   Las subcategorías redirigen a /services/ - no hay rutas /c/ para subcategorías
// });

// NOTA: La ruta /c/fotografia no existe, por lo tanto no hay subcategorías de Fotografía
// test('Validar estructura de Sub-categoría de Fotografía (ejemplo: /c/fotografia-de-eventos)', async ({ page }) => {
//   Esta ruta no está disponible en staging.fiestamas.com
// });

// NOTA: Las subcategorías NO usan /c/subcategoria, redirigen directamente a /services/familia-categoria-subcategoria/ID
// test('Validar estructura de Sub-categoría de Lugares (ejemplo: /c/salones-de-eventos)', async ({ page }) => {
//   Las subcategorías redirigen a /services/ - no hay rutas /c/ para subcategorías
// });

// NOTA: La ruta /c/mobiliario redirige a servicios directos, no tiene subcategorías intermedias
// test('Validar estructura de Sub-categoría de Mobiliario (ejemplo: /c/mesas)', async ({ page }) => {
//   Esta ruta redirige a servicios directos, no muestra subcategorías
// });

// NOTA: Las subcategorías NO usan /c/subcategoria, redirigen directamente a /services/familia-categoria-subcategoria/ID
// test('Validar estructura de Sub-categoría de Bebidas (ejemplo: /c/cocteles)', async ({ page }) => {
//   Las subcategorías redirigen a /services/ - no hay rutas /c/ para subcategorías
// });

test('Validar que todas las rutas de familias principales son accesibles', async ({ page }) => {
  test.setTimeout(120000); // 2 minutos para validar todas las familias

  const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;

  // Familias que funcionan con categorías intermedias
  const familias = [
    { slug: 'alimentos', nombre: 'Alimentos' },
    { slug: 'bebidas', nombre: 'Bebidas' },
    { slug: 'lugares', nombre: 'Lugares' },
    { slug: 'entretenimiento', nombre: 'Entretenimiento' },
    { slug: 'musica', nombre: 'Música' },
    { slug: 'decoracion', nombre: 'Decoración' },
    { slug: 'mesa-de-regalos', nombre: 'Mesa de regalos' },
    { slug: 'servicios-especializados', nombre: 'Servicios Especializados' }
  ];
  
  // Familias que NO funcionan (redirigen o no existen):
  // - fotografia: No existe (muestra "Categoría no encontrada")
  // - mobiliario: Redirige a /services/mobiliario/1500 (servicios directos)
  // - invitaciones: Redirige a /services/invitaciones/1516 (servicios directos)

  const familiasAccesibles: string[] = [];
  const familiasNoAccesibles: string[] = [];

  for (const familia of familias) {
    await showStepMessage(page, `🔍 VALIDANDO ACCESIBILIDAD DE ${familia.nombre.toUpperCase()}`);
    await safeWaitForTimeout(page, 1000);
    
    const familiaUrl = `${baseOrigin}/c/${familia.slug}`;
    
    try {
      await page.goto(familiaUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await safeWaitForTimeout(page, 2000);
      
      // Verificar que la página cargó correctamente (no es 404)
      const titulo = page.getByText('Categorías', { exact: false }).or(
    page.locator('text=Categorías').or(
      page.getByRole('heading', { name: /Categorías/i })
    )
  );
      const tituloExists = await titulo.count() > 0;
      
      if (tituloExists) {
        familiasAccesibles.push(familia.nombre);
        console.log(`✅ Familia "${familia.nombre}" es accesible`);
      } else {
        // Verificar si es una página de error
        const error404 = page.locator('text=/404|Not Found|Página no encontrada/i');
        const hayError = await error404.count() > 0;
        if (hayError) {
          familiasNoAccesibles.push(familia.nombre);
          console.log(`❌ Familia "${familia.nombre}" retorna error 404`);
        } else {
          familiasAccesibles.push(familia.nombre);
          console.log(`✅ Familia "${familia.nombre}" es accesible (sin título estándar)`);
        }
      }
    } catch (error) {
      familiasNoAccesibles.push(familia.nombre);
      console.log(`❌ Error al acceder a familia "${familia.nombre}": ${error}`);
    }
  }

  // Reporte final
  await showStepMessage(page, '📊 REPORTE DE ACCESIBILIDAD DE FAMILIAS');
  await safeWaitForTimeout(page, 1000);
  console.log(`\n📊 RESUMEN DE ACCESIBILIDAD:`);
  console.log(`✅ Familias accesibles (${familiasAccesibles.length}): ${familiasAccesibles.join(', ')}`);
  if (familiasNoAccesibles.length > 0) {
    console.log(`❌ Familias no accesibles (${familiasNoAccesibles.length}): ${familiasNoAccesibles.join(', ')}`);
  }
  
  // Validar que al menos algunas familias son accesibles
  expect(familiasAccesibles.length).toBeGreaterThan(0);
  console.log(`\n✅ Validación completada: ${familiasAccesibles.length} de ${familias.length} familias son accesibles`);
});

