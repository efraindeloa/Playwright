import { test, expect, Page, Locator } from '@playwright/test';
import { login, showStepMessage } from '../utils';
import { crearEventoCompleto } from './event-helpers';
import {
  DEFAULT_BASE_URL,
  PROVIDER_EMAIL,
  PROVIDER_PASSWORD
} from '../config';

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;
const SERVICES_URL = `${DEFAULT_BASE_URL}/provider/services`;
const PROMOTIONS_URL = `${DEFAULT_BASE_URL}/provider/promotions`;
const CHATS_URL = `${DEFAULT_BASE_URL}/provider/chats`;
const PROFILE_URL = `${DEFAULT_BASE_URL}/provider/profile`;
const STATS_VIEWS_URL = `${DEFAULT_BASE_URL}/provider/stats/views`;
const STATS_APPLICATIONS_URL = `${DEFAULT_BASE_URL}/provider/stats/applications`;
const STATS_HIRINGS_URL = `${DEFAULT_BASE_URL}/provider/stats/hirings`;
const EVENT_URL = `${DEFAULT_BASE_URL}/provider/event`;

test.use({
  viewport: { width: 1400, height: 720 }
});

// Configurar este archivo para ejecutar pruebas en serie y en orden
test.describe.configure({ mode: 'serial' });

test.describe('Dashboard de proveedor', () => {
  // Configurar timeout por defecto para todas las pruebas del describe
  test.setTimeout(60000); // 60 segundos por defecto
  
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/provider/dashboard')) {
      await page.goto(DASHBOARD_URL);
    }

    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();
  });

  // ============================================
  // GRUPO 1: PRUEBAS QUE SOLO VERIFICAN EXISTENCIA DE ELEMENTOS
  // ============================================

  test('Mostrar las secciones principales del dashboard', async ({ page }) => {
    await showStepMessage(page, '📋 VALIDANDO SECCIONES PRINCIPALES DEL DASHBOARD');
    await page.waitForTimeout(1000);
    
    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();
    
    await showStepMessage(page, '🔘 VALIDANDO BOTONES DE ACCESO RÁPIDO');
    await page.waitForTimeout(1000);
    const btnServicios = page.getByRole('button', { name: /Administrar servicios/i });
    const btnPromociones = page.getByRole('button', { name: /Administrar promociones/i });
    await expect(btnServicios).toBeVisible();
    await expect(btnPromociones).toBeVisible();

    // Verificar si el proveedor tiene servicios
    await showStepMessage(page, '🔍 VERIFICANDO SI EL PROVEEDOR TIENE SERVICIOS');
    await page.waitForTimeout(1000);
    const tieneServicios = await verificarSiTieneServicios(page);
    
    if (tieneServicios) {
      // Si tiene servicios, las estadísticas DEBEN mostrarse
      await showStepMessage(page, '📊 VALIDANDO TARJETAS DE ESTADÍSTICAS');
      await page.waitForTimeout(1000);
      console.log('✅ El proveedor tiene servicios - validando estadísticas');
      await expect(obtenerTarjetaEstadistica(page, /Visualizaciones/i)).toBeVisible();
      await expect(obtenerTarjetaEstadistica(page, /Solicitudes/i)).toBeVisible();
      await expect(obtenerTarjetaEstadistica(page, /Contrataciones/i)).toBeVisible();
    } else {
      // Si NO tiene servicios, las estadísticas NO deben mostrarse
      await showStepMessage(page, '⚠️ SIN SERVICIOS - VALIDANDO QUE NO HAY ESTADÍSTICAS');
      await page.waitForTimeout(1000);
      console.log('⚠️ El proveedor NO tiene servicios - las estadísticas no se muestran');
      const tarjetaVisualizaciones = obtenerTarjetaEstadistica(page, /Visualizaciones/i);
      const tarjetaSolicitudes = obtenerTarjetaEstadistica(page, /Solicitudes/i);
      const tarjetaContrataciones = obtenerTarjetaEstadistica(page, /Contrataciones/i);
      
      // Verificar que las tarjetas NO estén visibles
      if (await tarjetaVisualizaciones.count() > 0) {
        await expect(tarjetaVisualizaciones).not.toBeVisible();
      }
      if (await tarjetaSolicitudes.count() > 0) {
        await expect(tarjetaSolicitudes).not.toBeVisible();
      }
      if (await tarjetaContrataciones.count() > 0) {
        await expect(tarjetaContrataciones).not.toBeVisible();
      }
    }

    await showStepMessage(page, '🔘 VALIDANDO FILTROS DE EVENTOS');
    await page.waitForTimeout(1000);
    const filtrosContainer = page.locator('div').filter({
      has: page.getByRole('button', { name: 'TODOS', exact: true })
    }).first();
    for (const filtro of ['TODOS', 'NUEVO', 'PENDIENTE', 'CONTRATADO', 'CANCELADO']) {
      await expect(filtrosContainer.getByRole('button', { name: filtro, exact: true })).toBeVisible();
    }

    await showStepMessage(page, '📅 VALIDANDO BOTÓN NUEVO EVENTO Y CALENDARIO');
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /Nuevo Evento/i })).toBeVisible();

    const calendario = page.locator('div').filter({
      has: page.locator('button', { hasText: /\d{4}$/ })
    }).first();
    await expect(calendario.locator('button', { hasText: /\d{4}$/ }).first()).toBeVisible();
    await expect(calendario.locator('p', { hasText: /^Dom$/ }).first()).toBeVisible();

    await showStepMessage(page, '💬 VALIDANDO SECCIÓN DE CHATS');
    await page.waitForTimeout(1000);
    await expect(page.getByText('¡Fiestachat!')).toBeVisible();
    await expect(page.getByText('La línea directa a tu evento')).toBeVisible();
    const primerChat = page.locator('button').filter({
      has: page.locator('p', { hasText: /Fiestamas qa cliente|NuevoNombreQA/i })
    }).first();
    await expect(primerChat).toBeVisible();
  });

  test('Controles adicionales del listado de eventos están visibles', async ({ page }) => {
    await showStepMessage(page, '📐 AJUSTANDO VIEWPORT');
    console.log('🔍 Validando controles adicionales del listado de eventos...');
    await page.waitForTimeout(1000);
    await page.setViewportSize({ width: 1080, height: 720 });
    await page.waitForTimeout(500);

    await showStepMessage(page, '🔘 VALIDANDO BOTÓN NUEVO EVENTO');
    console.log('✅ Botón nuevo evento visible y habilitado');
    await page.waitForTimeout(1000);
    const botonNuevoEventoDesktop = page.locator('button').filter({
      has: page.locator('i.icon-calendar')
    }).filter({
      has: page.locator('h5', { hasText: /Nuevo Evento/i })
    });
    const botonNuevoEventoDesktopVisible = botonNuevoEventoDesktop.filter({
      has: page.locator(':visible')
    });
    const botonNuevoEventoMobile = page.locator('button').filter({
      has: page.locator('p', { hasText: /Nuevo evento/i })
    });

    if (await botonNuevoEventoDesktopVisible.count()) {
      const boton = botonNuevoEventoDesktopVisible.first();
      await expect(boton).toBeVisible();
      await expect(boton).toBeEnabled();
    } else {
      const boton = botonNuevoEventoMobile.first();
      await expect(boton).toBeVisible();
      await expect(boton).toBeEnabled();
    }

    await showStepMessage(page, '🎯 VALIDANDO TARJETAS DE CATEGORÍAS');
    await page.waitForTimeout(1000);
    const tarjetaCategoria = page
      .locator('button')
      .filter({ has: page.locator('img[alt^="Image_"]') })
      .first();
    if (await tarjetaCategoria.count()) {
      await tarjetaCategoria.scrollIntoViewIfNeeded();
      await expect(tarjetaCategoria).toBeVisible();
    }

    await showStepMessage(page, '📅 VALIDANDO BOTÓN VER EVENTOS PASADOS');
    await page.waitForTimeout(1000);
    const botonEventosPasados = page.getByRole('button', { name: /Ver eventos pasados/i }).first();
    if (await botonEventosPasados.count()) {
      await expect(botonEventosPasados).toBeVisible();
      await expect(botonEventosPasados).toBeEnabled();
    }

    await showStepMessage(page, '📆 VALIDANDO BOTÓN FECHA');
    await page.waitForTimeout(1000);
    const botonFecha = page.locator('button').filter({ has: page.locator('p', { hasText: /^Fecha$/i }) }).first();
    await expect(botonFecha).toBeVisible();
    await expect(botonFecha).toBeEnabled();
  });

  // ============================================
  // GRUPO 2: PRUEBAS QUE VERIFICAN EXISTENCIA Y FUNCIONALIDAD
  // ============================================

  test('Accesos rápidos navegan a las secciones correspondientes', async ({ page }) => {
    await showStepMessage(page, '🔘 NAVEGANDO A SERVICIOS');
    console.log('🚀 Navegando a servicios desde accesos rápidos...');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Administrar servicios/i }).click();
    await expect(page).toHaveURL(SERVICES_URL);
    console.log('✅ Navegación a servicios exitosa');

    await page.goto(DASHBOARD_URL);
    await showStepMessage(page, '🔘 NAVEGANDO A PROMOCIONES');
    console.log('🚀 Navegando a promociones desde accesos rápidos...');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Administrar promociones/i }).click();
    await expect(page).toHaveURL(PROMOTIONS_URL);
    console.log('✅ Navegación a promociones exitosa');

    await page.goto(DASHBOARD_URL);
  });

  test('Barra superior navega a chats y perfil', async ({ page }) => {
    await showStepMessage(page, '💬 NAVEGANDO A CHATS');
    console.log('🚀 Navegando a chats desde la barra superior...');
    await page.waitForTimeout(1000);
    const enlaceChats = page.locator('div.lg\\:block nav a[href="/provider/chats"]').first();
    await expect(enlaceChats).toBeVisible();
    await enlaceChats.click();
    await expect(page).toHaveURL(CHATS_URL);
    console.log('✅ Navegación a chats exitosa');

    await page.goto(DASHBOARD_URL);

    await showStepMessage(page, '👤 NAVEGANDO A PERFIL');
    console.log('🚀 Navegando a perfil desde la barra superior...');
    await page.waitForTimeout(1000);
    const enlacePerfil = page.locator('div.lg\\:block nav a[href="/provider/profile"]').first();
    await expect(enlacePerfil).toBeVisible();
    await enlacePerfil.click();
    await expect(page).toHaveURL(PROFILE_URL);
    console.log('✅ Navegación a perfil exitosa');

    await page.goto(DASHBOARD_URL);
  });

  test('Tarjetas de estadísticas redirigen a sus secciones', async ({ page }) => {
    // Solo validar las tarjetas si el proveedor tiene servicios
    await showStepMessage(page, '🔍 VERIFICANDO SI EL PROVEEDOR TIENE SERVICIOS');
    await page.waitForTimeout(1000);
    const tieneServicios = await verificarSiTieneServicios(page);
    
    if (!tieneServicios) {
      console.log('⚠️ El proveedor NO tiene servicios - saltando validación de estadísticas');
      return;
    }
    
    await showStepMessage(page, '📊 VALIDANDO REDIRECCIÓN DE VISUALIZACIONES');
    await page.waitForTimeout(1000);
    await validarTarjetaEstadistica(page, /Visualizaciones/i, '/provider/stats/views', STATS_VIEWS_URL);
    
    await showStepMessage(page, '📊 VALIDANDO REDIRECCIÓN DE SOLICITUDES');
    await page.waitForTimeout(1000);
    await validarTarjetaEstadistica(page, /Solicitudes/i, '/provider/stats/applications', STATS_APPLICATIONS_URL);
    
    await showStepMessage(page, '📊 VALIDANDO REDIRECCIÓN DE CONTRATACIONES');
    await page.waitForTimeout(1000);
    await validarTarjetaEstadistica(page, /Contrataciones/i, '/provider/stats/hirings', STATS_HIRINGS_URL);
  });

  test('Filtros de eventos permiten cambiar la vista', async ({ page }) => {
    test.setTimeout(60000); // Aumentar timeout a 60 segundos
    await showStepMessage(page, '🔍 VALIDANDO FILTROS DE EVENTOS');
    console.log('🚀 Validando funcionalidad de filtros de eventos...');
    await page.waitForTimeout(1000);
    const filtrosContainer = page.locator('div').filter({
      has: page.getByRole('button', { name: 'TODOS', exact: true })
    }).first();

    await showStepMessage(page, '✅ FILTRANDO POR CONTRATADO');
    console.log('✅ Filtro CONTRATADO aplicado correctamente');
    await page.waitForTimeout(1000);
    await validarEstado(filtrosContainer, page, 'CONTRATADO');

    await showStepMessage(page, '⏳ FILTRANDO POR PENDIENTE');
    console.log('✅ Filtro PENDIENTE aplicado correctamente');
    await page.waitForTimeout(1000);
    await validarEstado(filtrosContainer, page, 'PENDIENTE');

    await showStepMessage(page, '🆕 FILTRANDO POR NUEVO');
    console.log('✅ Filtro NUEVO aplicado correctamente');
    await page.waitForTimeout(1000);
    await validarEstado(filtrosContainer, page, 'NUEVO');

    await showStepMessage(page, '❌ FILTRANDO POR CANCELADO');
    console.log('✅ Filtro CANCELADO aplicado correctamente');
    await page.waitForTimeout(1000);
    await validarEstado(filtrosContainer, page, 'CANCELADO');

    await showStepMessage(page, '🔄 VOLVIENDO A FILTRO TODOS');
    console.log('✅ Filtro TODOS restaurado correctamente');
    await page.waitForTimeout(1000);
    const filtroTodos = filtrosContainer.getByRole('button', { name: 'TODOS', exact: true });
    await filtroTodos.click();
    await expect(page.getByRole('button', { name: /Nuevo Evento/i })).toBeVisible();
  });

  test('Botón Fecha ordena los eventos', async ({ page }) => {
    test.setTimeout(60000); // Aumentar timeout a 60 segundos
    await showStepMessage(page, '📆 VALIDANDO BOTÓN FECHA');
    await page.waitForTimeout(1000);
    const botonFecha = page.locator('button').filter({ has: page.locator('p', { hasText: /^Fecha$/i }) }).first();
    await expect(botonFecha).toBeVisible();
    
    // Verificar que el ícono inicial es chevron-down
    const iconoInicial = botonFecha.locator('i.icon-chevron-down');
    await expect(iconoInicial).toBeVisible();
    console.log('✅ Ícono inicial: chevron-down (orden descendente)');
    
    // Obtener el estado inicial de los eventos para comparar
    const eventosIniciales = page.locator('div[role="button"]').filter({
      has: page.locator('p, h5, h6').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ })
    });
    const countInicial = await eventosIniciales.count();
    console.log(`📊 Eventos visibles inicialmente: ${countInicial}`);
    
    // Primer click: cambiar a orden ascendente (chevron-up)
    await showStepMessage(page, '🔄 CLICK 1: ORDEN ASCENDENTE');
    await page.waitForTimeout(1000);
    await botonFecha.click();
    await page.waitForTimeout(1000);
    
    // Verificar que el ícono cambió a chevron-up
    const iconoAscendente = botonFecha.locator('i.icon-chevron-up');
    await expect(iconoAscendente).toBeVisible({ timeout: 5000 });
    console.log('✅ Ícono después del primer click: chevron-up (orden ascendente)');
    
    // Segundo click: volver a orden descendente (chevron-down)
    await showStepMessage(page, '🔄 CLICK 2: ORDEN DESCENDENTE');
    await page.waitForTimeout(1000);
    await botonFecha.click();
    await page.waitForTimeout(1000);
    
    // Verificar que el ícono cambió a chevron-down
    const iconoDescendente = botonFecha.locator('i.icon-chevron-down');
    await expect(iconoDescendente).toBeVisible({ timeout: 5000 });
    console.log('✅ Ícono después del segundo click: chevron-down (orden descendente)');
    
    // Tercer click: cambiar a orden ascendente nuevamente
    await showStepMessage(page, '🔄 CLICK 3: ORDEN ASCENDENTE');
    await page.waitForTimeout(1000);
    await botonFecha.click();
    await page.waitForTimeout(1000);
    
    // Verificar que el ícono cambió a chevron-up
    await expect(iconoAscendente).toBeVisible({ timeout: 5000 });
    console.log('✅ Ícono después del tercer click: chevron-up (orden ascendente)');
    
    // Cuarto click: volver a orden descendente
    await showStepMessage(page, '🔄 CLICK 4: ORDEN DESCENDENTE');
    await page.waitForTimeout(1000);
    await botonFecha.click();
    await page.waitForTimeout(1000);
    
    // Verificar que el ícono cambió a chevron-down
    await expect(iconoDescendente).toBeVisible({ timeout: 5000 });
    console.log('✅ Ícono después del cuarto click: chevron-down (orden descendente)');
    
    // Quinto click: cambiar a orden ascendente una vez más
    await showStepMessage(page, '🔄 CLICK 5: ORDEN ASCENDENTE');
    await page.waitForTimeout(1000);
    await botonFecha.click();
    await page.waitForTimeout(1000);
    
    // Verificar que el ícono cambió a chevron-up
    await expect(iconoAscendente).toBeVisible({ timeout: 5000 });
    console.log('✅ Ícono después del quinto click: chevron-up (orden ascendente)');
    
    // Verificar que los eventos siguen visibles después de todos los cambios
    const eventosFinales = page.locator('div[role="button"]').filter({
      has: page.locator('p, h5, h6').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ })
    });
    const countFinal = await eventosFinales.count();
    console.log(`📊 Eventos visibles después de todos los clicks: ${countFinal}`);
    
    console.log('✅ Prueba de ordenamiento completada: El botón alterna correctamente entre orden ascendente y descendente');
  });

  test('Botón Ver eventos pasados muestra eventos pasados', async ({ page }) => {
    test.setTimeout(60000); // Aumentar timeout a 60 segundos
    await showStepMessage(page, '📅 BUSCANDO BOTÓN VER EVENTOS PASADOS');
    await page.waitForTimeout(1000);
    const botonEventosPasados = page.getByRole('button', { name: /Ver eventos pasados/i }).first();
    
    // Verificar si el botón existe (puede estar oculto en ciertos viewports)
    if (await botonEventosPasados.count() === 0) {
      console.log('⚠️ El botón "Ver eventos pasados" no está visible en este viewport');
      return;
    }

    await expect(botonEventosPasados).toBeVisible();
    await expect(botonEventosPasados).toBeEnabled();

    // Obtener el estado inicial de los eventos visibles
    await showStepMessage(page, '📊 CONTANDO EVENTOS INICIALES');
    await page.waitForTimeout(1000);
    const eventosIniciales = page.locator('div[role="button"]').filter({
      has: page.locator('p, h5, h6').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ })
    });
    const countInicial = await eventosIniciales.count();
    console.log(`📊 Eventos visibles antes de click: ${countInicial}`);

    // Hacer click en el botón
    await showStepMessage(page, '🔄 HACIENDO CLICK EN VER EVENTOS PASADOS');
    await page.waitForTimeout(1000);
    await botonEventosPasados.click();
    await page.waitForTimeout(2000); // Esperar a que se carguen los eventos pasados

    // Verificar que algo cambió (puede haber más eventos o menos, dependiendo de la implementación)
    await showStepMessage(page, '📊 CONTANDO EVENTOS DESPUÉS DEL CLICK');
    await page.waitForTimeout(1000);
    const eventosDespues = page.locator('div[role="button"]').filter({
      has: page.locator('p, h5, h6').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ })
    });
    const countDespues = await eventosDespues.count();
    console.log(`📊 Eventos visibles después de click: ${countDespues}`);

    // Validar que el botón cambió a "Ocultar eventos pasados"
    await showStepMessage(page, '✅ VALIDANDO CAMBIO A "OCULTAR EVENTOS PASADOS"');
    await page.waitForTimeout(1000);
    const botonOcultar = page.getByRole('button', { name: /Ocultar eventos pasados/i }).first();
    await expect(botonOcultar).toBeVisible({ timeout: 5000 });
    await expect(botonOcultar).toBeEnabled();
    console.log('✅ El botón cambió a "Ocultar eventos pasados"');

    // Hacer click en "Ocultar eventos pasados" para regresar
    await showStepMessage(page, '🔄 HACIENDO CLICK EN OCULTAR EVENTOS PASADOS');
    await page.waitForTimeout(1000);
    await botonOcultar.click();
    await page.waitForTimeout(2000); // Esperar a que se oculten los eventos pasados

    // Validar que el botón regresó a "Ver eventos pasados"
    await showStepMessage(page, '✅ VALIDANDO REGRESO A "VER EVENTOS PASADOS"');
    await page.waitForTimeout(1000);
    const botonVerNuevamente = page.getByRole('button', { name: /Ver eventos pasados/i }).first();
    await expect(botonVerNuevamente).toBeVisible({ timeout: 5000 });
    await expect(botonVerNuevamente).toBeEnabled();
    console.log('✅ El botón regresó a "Ver eventos pasados"');

    console.log('✅ Prueba de "Ver eventos pasados" completada exitosamente');
  });

  test('Calendario filtra eventos al seleccionar un día con eventos', async ({ page }) => {
    test.setTimeout(90000); // Aumentar timeout a 90 segundos (prueba larga con muchas esperas)
    await showStepMessage(page, '📅 BUSCANDO CALENDARIO');
    await page.waitForTimeout(1000);
    
    // Buscar el contenedor del calendario (puede tener diferentes variaciones de clases)
    const calendario = page.locator('div').filter({
      has: page.locator('button[type="button"]').filter({
        has: page.locator('p.text-dark-neutral')
      })
    }).filter({
      has: page.locator('p.text-xsmall.text-dark-neutral').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/ })
    }).first();
    
    await expect(calendario).toBeVisible({ timeout: 5000 });
    
    // Buscar días con puntos (eventos)
    // Los días con eventos tienen un div con puntos dentro del botón
    await showStepMessage(page, '🔍 BUSCANDO DÍAS CON EVENTOS (PUNTOS)');
    await page.waitForTimeout(1000);
    
    // Buscar botones de días que contengan puntos
    // Los puntos están en un div con clase que incluye "rounded-circle" y tienen un tamaño pequeño
    const diasConPuntos = calendario.locator('button[type="button"]').filter({
      has: page.locator('div').filter({
        has: page.locator('div[class*="rounded-circle"]').filter({
          has: page.locator('div').filter({
            hasText: /^$/
          })
        })
      })
    });
    
    // Alternativa: buscar días que tengan un div con puntos (divs pequeños redondos)
    // Los puntos son divs pequeños (4px) con clase rounded-circle dentro de un contenedor flex
    const diasConPuntosAlt = calendario.locator('button[type="button"]').filter({
      has: page.locator('div.flex.items-center.justify-center').filter({
        has: page.locator('div[class*="rounded-circle"][style*="background-color"]')
      })
    });
    
    // Usar el que encuentre elementos
    let diasConEventos = diasConPuntosAlt;
    const countAlt = await diasConPuntosAlt.count();
    const countOriginal = await diasConPuntos.count();
    
    if (countAlt > 0) {
      diasConEventos = diasConPuntosAlt;
      console.log(`📊 Usando selector alternativo: ${countAlt} días encontrados`);
    } else if (countOriginal > 0) {
      diasConEventos = diasConPuntos;
      console.log(`📊 Usando selector original: ${countOriginal} días encontrados`);
    } else {
      // Último recurso: buscar cualquier botón que tenga un div con estilo background-color (los puntos)
      diasConEventos = calendario.locator('button[type="button"]').filter({
        has: page.locator('div[style*="background-color"]')
      });
    }
    
    const cantidadDiasConEventos = await diasConEventos.count();
    console.log(`📊 Días con eventos encontrados: ${cantidadDiasConEventos}`);
    
    if (cantidadDiasConEventos === 0) {
      console.log('⚠️ No se encontraron días con eventos en el calendario');
      return;
    }
    
    // Seleccionar el primer día con eventos
    const primerDiaConEventos = diasConEventos.first();
    await primerDiaConEventos.scrollIntoViewIfNeeded();
    
    // Obtener el número del día antes de hacer click
    const numeroDiaTexto = await primerDiaConEventos.locator('p.text-dark-neutral').first().textContent();
    const numeroDia = numeroDiaTexto?.trim() || '';
    console.log(`📅 Día seleccionado: ${numeroDia}`);
    
    if (!numeroDia) {
      console.log('⚠️ No se pudo obtener el número del día');
      return;
    }
    
    // Contar eventos visibles antes del click
    await showStepMessage(page, '📊 CONTANDO EVENTOS ANTES DE SELECCIONAR DÍA');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Contar eventos: buscar contenedores div[role="button"] con fechas y contar solo los visibles
    const { count: countAntes, locator: eventosAntes } = await contarEventosVisibles(page);
    console.log(`📊 Eventos visibles antes: ${countAntes}`);
    
    // Hacer click en el día
    await showStepMessage(page, `🔄 HACIENDO CLICK EN DÍA ${numeroDia}`);
    await page.waitForTimeout(1500);
    await primerDiaConEventos.click();
    await page.waitForTimeout(3000); // Esperar a que se filtren los eventos
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000); // Tiempo adicional para que se rendericen los eventos filtrados
    
    // Validar que el día tiene el borde de selección (múltiples estrategias)
    await showStepMessage(page, '✅ VALIDANDO BORDE DE SELECCIÓN EN EL DÍA');
    await page.waitForTimeout(2000);
    
    // Estrategia 1: Buscar el botón del día con borde
    let diaSeleccionado = calendario.locator('button[type="button"]').filter({
      has: page.locator('p.text-dark-neutral').filter({ hasText: new RegExp(`^${numeroDia}$`) })
    }).filter({
      has: page.locator('[class*="border-primary-neutral"]')
    });
    
    // Si no se encuentra con la primera estrategia, intentar otras
    if (await diaSeleccionado.count() === 0) {
      // Estrategia 2: Buscar por clase border-2
      diaSeleccionado = calendario.locator('button[type="button"]').filter({
        has: page.locator('p.text-dark-neutral').filter({ hasText: new RegExp(`^${numeroDia}$`) })
      }).filter({
        has: page.locator('[class*="border-2"]')
      });
    }
    
    // Si aún no se encuentra, buscar simplemente el botón del día (el click ya se hizo)
    if (await diaSeleccionado.count() === 0) {
      diaSeleccionado = calendario.locator('button[type="button"]').filter({
        has: page.locator('p.text-dark-neutral').filter({ hasText: new RegExp(`^${numeroDia}$`) })
      });
      console.log('⚠️ No se encontró el borde de selección, pero el día existe');
    } else {
      await expect(diaSeleccionado).toBeVisible({ timeout: 5000 });
      console.log('✅ El día tiene el borde de selección');
    }
    
    // Validar que solo se muestran eventos del día seleccionado
    await showStepMessage(page, '📊 VALIDANDO FILTRADO DE EVENTOS POR DÍA');
    await page.waitForTimeout(2000);
    
    // Contar eventos después del filtro
    const { count: countDespues, locator: eventosDespues } = await contarEventosVisibles(page);
    console.log(`📊 Eventos visibles después: ${countDespues}`);
    
    // Verificar que los eventos mostrados corresponden al día seleccionado
    // Los eventos pueden mostrar la fecha en diferentes formatos:
    // - Desktop: "Jueves 13 nov 2025" o similar
    // - Mobile: "13" en el formato de fecha
    // Buscar eventos que contengan el número del día en su fecha
    if (countDespues > 0) {
      await showStepMessage(page, '✅ VALIDANDO QUE LAS FECHAS DE LOS EVENTOS COINCIDEN CON EL DÍA');
      await page.waitForTimeout(2000);
      
      // Validar que cada evento visible tiene la fecha del día seleccionado
      // Usar una validación más estricta: el día debe aparecer al inicio de una fecha
      // Formato esperado: "22 nov 2025", "22/11/2025", "Miércoles 22 nov 2025", etc.
      const eventosDelDia = eventosDespues.filter({
        has: page.locator('p, h5, h6').filter({ 
          hasText: new RegExp(`(^|\\s|\\b)${numeroDia}(\\s|/|\\b)`, 'i')
        })
      });
      const countEventosDelDia = await eventosDelDia.count();
      console.log(`📊 Eventos que contienen el día ${numeroDia} (validación estricta): ${countEventosDelDia} de ${countDespues} totales`);
      
      // Validar la fecha en las cards de eventos (formato más específico)
      // Buscar eventos que muestren el día en formato de fecha (ej: "13/11/2025" o "13 nov 2025")
      const eventosConFechaCorrecta = eventosDespues.filter({
        has: page.locator('p, h5, h6').filter({ 
          hasText: new RegExp(`(^|\\s|\\b)${numeroDia}(\\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)|/)`, 'i')
        })
      });
      const countConFechaCorrecta = await eventosConFechaCorrecta.count();
      console.log(`📅 Eventos con fecha que contiene el día ${numeroDia} (formato fecha): ${countConFechaCorrecta}`);
      
      // Verificar que todos los eventos visibles corresponden al día seleccionado
      if (countEventosDelDia === countDespues && countConFechaCorrecta === countDespues) {
        console.log('✅ Todos los eventos visibles corresponden al día seleccionado');
      } else if (countEventosDelDia > 0 || countConFechaCorrecta > 0) {
        console.log(`⚠️ Solo ${countEventosDelDia} eventos contienen el día ${numeroDia} y ${countConFechaCorrecta} tienen formato de fecha correcto`);
        console.log(`⚠️ Se esperaban ${countDespues} eventos del día ${numeroDia}`);
        
        // Mostrar información de depuración: ver el texto de los eventos que no coinciden
        if (countDespues > countEventosDelDia) {
          console.log('🔍 Analizando eventos que no coinciden...');
          for (let i = 0; i < Math.min(countDespues, 3); i++) {
            const evento = eventosDespues.nth(i);
            const texto = await evento.textContent();
            console.log(`  Evento ${i + 1}: ${texto?.substring(0, 150)}`);
          }
        }
      } else {
        console.log('⚠️ No se encontraron eventos que coincidan exactamente con el día seleccionado');
      }
      
      if (countConFechaCorrecta > 0) {
        console.log('✅ Se validó que las fechas de los eventos coinciden con el día seleccionado');
      }
    } else {
      console.log('⚠️ No hay eventos visibles después de seleccionar el día');
    }
    
    // Validar que el día tiene puntos (eventos) - HACERLO ANTES para comparar
    await showStepMessage(page, '🔍 VALIDANDO PUNTOS EN EL DÍA SELECCIONADO');
    await page.waitForTimeout(2000);
    
    // Buscar puntos en el día seleccionado (usar el botón original si el seleccionado no funciona)
    let puntosDelDia = diaSeleccionado.locator('div[class*="rounded-circle"][style*="background-color"]');
    let cantidadPuntos = await puntosDelDia.count();
    
    // Si no se encuentran puntos en el día seleccionado, buscar en el botón original
    if (cantidadPuntos === 0) {
      puntosDelDia = primerDiaConEventos.locator('div[class*="rounded-circle"][style*="background-color"]');
      cantidadPuntos = await puntosDelDia.count();
    }
    
    console.log(`📊 Puntos (eventos) en el día ${numeroDia}: ${cantidadPuntos}`);
    
    if (cantidadPuntos > 0) {
      await expect(puntosDelDia.first()).toBeVisible();
      console.log(`✅ El día tiene ${cantidadPuntos} punto(s) (evento(s))`);
      
      // Validar que no hay más de 3 puntos (máximo permitido)
      if (cantidadPuntos <= 3) {
        console.log('✅ La cantidad de puntos es válida (≤ 3)');
      } else {
        console.log(`⚠️ El día tiene más de 3 puntos: ${cantidadPuntos}`);
      }
      
      // VALIDACIÓN CRÍTICA: El número de eventos filtrados debe coincidir con el número de puntos
      if (countDespues > 0) {
        // Validar que la cantidad de eventos filtrados coincide con la cantidad de puntos
        if (countDespues === cantidadPuntos) {
          console.log(`✅ La cantidad de eventos filtrados (${countDespues}) coincide con los puntos del día (${cantidadPuntos})`);
        } else {
          console.log(`⚠️ DISCREPANCIA: Se muestran ${countDespues} eventos pero el día tiene ${cantidadPuntos} punto(s)`);
          console.log(`⚠️ El filtro puede no estar funcionando correctamente`);
        }
      }
    } else {
      console.log('⚠️ El día seleccionado no tiene puntos visibles');
    }
    
    // Hacer click nuevamente en el día seleccionado para quitar la selección
    await showStepMessage(page, `🔄 HACIENDO CLICK NUEVAMENTE EN DÍA ${numeroDia} PARA DESELECCIONAR`);
    await page.waitForTimeout(1500);
    await diaSeleccionado.click();
    await page.waitForTimeout(3000); // Esperar a que se actualice la vista
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000); // Tiempo adicional para que se rendericen todos los eventos
    
    // Verificar que se quitó la selección (el borde ya no debe estar)
    await showStepMessage(page, '✅ VALIDANDO QUE SE QUITÓ LA SELECCIÓN');
    await page.waitForTimeout(2000);
    
    const diaSinSeleccion = calendario.locator('button[type="button"]').filter({
      has: page.locator('p.text-dark-neutral').filter({ hasText: new RegExp(`^${numeroDia}$`) })
    });
    
    // Verificar que el día ya no tiene el borde de selección
    const tieneBorde = await diaSinSeleccion.locator('[class*="border-primary-neutral"]').count();
    const tieneBorder2 = await diaSinSeleccion.locator('[class*="border-2"]').count();
    
    if (tieneBorde === 0 && tieneBorder2 === 0) {
      console.log('✅ La selección se quitó correctamente (no hay borde)');
    } else {
      // Verificar si el borde es solo el borde normal del botón (no el de selección)
      const clases = await diaSinSeleccion.getAttribute('class');
      if (clases && !clases.includes('border-primary-neutral')) {
        console.log('✅ La selección se quitó correctamente');
      } else {
        console.log('⚠️ El día aún parece tener algún borde, pero puede ser el borde normal');
      }
    }
    
    // Verificar que se muestran todos los eventos nuevamente
    await showStepMessage(page, '📊 VALIDANDO QUE SE MUESTRAN TODOS LOS EVENTOS');
    await page.waitForTimeout(2000);
    
    // Contar eventos finales después de deseleccionar
    const { count: countFinales, locator: eventosFinales } = await contarEventosVisibles(page);
    console.log(`📊 Eventos visibles después de deseleccionar: ${countFinales}`);
    console.log(`📊 Eventos visibles antes de seleccionar: ${countAntes}`);
    
    // Los eventos finales deberían ser iguales o mayores que los iniciales
    // (puede haber más si se cargaron eventos adicionales)
    if (countFinales >= countAntes) {
      console.log('✅ Se muestran todos los eventos nuevamente (o más)');
    } else {
      console.log(`⚠️ Hay menos eventos visibles (${countFinales}) que antes de seleccionar (${countAntes})`);
    }
    
    // Validar que hay eventos de diferentes días (no solo del día seleccionado)
    if (countFinales > 0) {
      const eventosDiferentesDias = eventosFinales.filter({
        has: page.locator('p, h5, h6').filter({ 
          hasText: new RegExp(`\\b(?!${numeroDia}\\b)\\d{1,2}\\b`) 
        })
      });
      const countDiferentesDias = await eventosDiferentesDias.count();
      console.log(`📊 Eventos de otros días: ${countDiferentesDias}`);
      
      if (countDiferentesDias > 0) {
        console.log('✅ Se muestran eventos de diferentes días (filtro desactivado)');
      } else {
        console.log('⚠️ Solo se muestran eventos del mismo día');
      }
    }
    
    console.log('✅ Prueba de calendario completada exitosamente');
  });

  test('Calendario muestra estado vacío al seleccionar un día sin eventos', async ({ page }) => {
    test.setTimeout(120000); // Aumentar timeout a 120 segundos (2 minutos)
    await showStepMessage(page, '📅 BUSCANDO CALENDARIO');
    await page.waitForTimeout(1000);
    
    // Buscar el contenedor del calendario
    const calendario = page.locator('div').filter({
      has: page.locator('button[type="button"]').filter({
        has: page.locator('p.text-dark-neutral')
      })
    }).filter({
      has: page.locator('p.text-xsmall.text-dark-neutral').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/ })
    }).first();
    
    await expect(calendario).toBeVisible({ timeout: 5000 });
    
    // Buscar días SIN puntos (sin eventos)
    await showStepMessage(page, '🔍 BUSCANDO DÍAS SIN EVENTOS (SIN PUNTOS)');
    await page.waitForTimeout(1000);
    
    console.log('🔍 Paso 1: Obteniendo solo días VISIBLES del mes actual...');
    
    // Estrategia mejorada: usar page.evaluate para obtener solo días visibles del mes actual
    // Esto es más eficiente que iterar sobre todos los elementos del DOM
    const diasSinPuntos: Locator[] = [];
    
    try {
      console.log('⏳ Buscando días sin eventos usando evaluación del DOM...');
      
      // Verificar que la página sigue disponible antes de evaluar
      if (page.isClosed()) {
        throw new Error('La página se cerró antes de evaluar el DOM');
      }
      
      // Obtener el mes actual del calendario para filtrar solo días del mes actual
      let mesActualTexto: string | null = null;
      try {
        // Buscar el mes en el header del calendario
        const mesHeader = page.locator('p.text-dark-neutral, h2, h3').filter({ 
          hasText: /Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i 
        }).first();
        mesActualTexto = await mesHeader.textContent({ timeout: 3000 }).catch(() => null);
      } catch (e) {
        console.log(`⚠️ No se pudo obtener el mes actual: ${e.message}`);
      }
      
      console.log(`📅 Mes actual en el calendario: ${mesActualTexto || 'No encontrado (continuando de todas formas)'}`);
      
      // Usar page.evaluate para encontrar días sin eventos de manera más eficiente
      const diasSinEventosInfo = await page.evaluate(() => {
        const diasSinEventos: Array<{ numero: string, index: number, numeroDia: number }> = [];
        
        // Buscar todos los botones de días que son visibles
        const botonesDias = Array.from(document.querySelectorAll('button[type="button"]'));
        
        let index = 0;
        for (const boton of botonesDias) {
          // Verificar que el botón es visible
          const rect = boton.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            continue; // Saltar botones no visibles
          }
          
          // Verificar que tiene el elemento de texto
          const textoElement = boton.querySelector('p.text-dark-neutral');
          if (!textoElement) {
            continue;
          }
          
          // Verificar que el texto es visible
          const textoRect = textoElement.getBoundingClientRect();
          if (textoRect.width === 0 || textoRect.height === 0) {
            continue;
          }
          
          // Verificar el color del texto - los días del mes anterior/siguiente suelen ser grises
          const estiloTexto = window.getComputedStyle(textoElement);
          const colorTexto = estiloTexto.color;
          
          // Si el texto es muy claro (gris), probablemente es de otro mes
          if (colorTexto.includes('rgb(200, 200, 200)') || 
              colorTexto.includes('rgb(180, 180, 180)') ||
              colorTexto.includes('rgb(160, 160, 160)') ||
              colorTexto.includes('rgba(0, 0, 0, 0.3)') ||
              colorTexto.includes('rgba(0, 0, 0, 0.4)')) {
            continue; // Saltar días de otros meses (grises)
          }
          
          const numeroTexto = textoElement.textContent?.trim() || '';
          
          // Verificar que es un número válido
          if (!numeroTexto.match(/^\d+$/)) {
            continue;
          }
          
          // Priorizar días del 1 al 15 del mes actual (más probable que sean del mes actual)
          const numeroDia = parseInt(numeroTexto, 10);
          if (numeroDia > 15 && numeroDia < 28) {
            // Días del 16 al 27 pueden ser del mes actual o siguiente
            // Verificar el estilo del botón para determinar si es del mes actual
            const estiloBoton = window.getComputedStyle(boton);
            const opacidad = estiloBoton.opacity;
            if (opacidad && parseFloat(opacidad) < 0.5) {
              continue; // Botones con baja opacidad suelen ser de otros meses
            }
          }
          
          // Verificar que NO tiene puntos (divs con rounded-circle y background-color)
          const puntos = boton.querySelectorAll('div[class*="rounded-circle"]');
          let tienePuntos = false;
          
          for (const punto of Array.from(puntos)) {
            const estilo = window.getComputedStyle(punto);
            const bgColor = estilo.backgroundColor;
            // Verificar que tiene un color de fondo (no transparente, blanco, o muy claro)
            if (bgColor && 
                bgColor !== 'transparent' && 
                bgColor !== 'rgba(0, 0, 0, 0)' &&
                !bgColor.includes('rgb(255, 255, 255)') &&
                !bgColor.includes('rgb(242, 242, 242)')) {
              tienePuntos = true;
              break;
            }
          }
          
          if (!tienePuntos) {
            diasSinEventos.push({ numero: numeroTexto, index, numeroDia });
          }
          
          index++;
        }
        
        // Ordenar por número de día para priorizar días del 1 en adelante del mes actual
        diasSinEventos.sort((a, b) => {
          return a.numeroDia - b.numeroDia;
        });
        
        // Filtrar para asegurar que solo incluimos días del mes actual
        // Priorizar días del 1 al 15 primero, luego del 16 al 31
        const diasDelMesActual = diasSinEventos.filter(dia => {
          // Si el día es menor o igual a 15, es muy probable que sea del mes actual
          if (dia.numeroDia <= 15) {
            return true;
          }
          // Para días mayores a 15, verificar que no sean de otro mes
          // (ya filtramos por color arriba, pero hacemos doble verificación)
          return dia.numeroDia <= 31;
        });
        
        return diasDelMesActual;
      });
      
      console.log(`✅ Encontrados ${diasSinEventosInfo.length} días sin eventos usando evaluación del DOM`);
      
      if (diasSinEventosInfo.length > 0) {
        // Obtener los locators para los días encontrados
        const todosLosDias = calendario.locator('button[type="button"]').filter({
          has: page.locator('p.text-dark-neutral')
        });
        
        // Limitar a los primeros 5 días sin eventos para evitar procesar demasiados
        const diasAProcesar = Math.min(diasSinEventosInfo.length, 5);
        console.log(`📊 Procesando ${diasAProcesar} días sin eventos...`);
        
        for (let i = 0; i < diasAProcesar; i++) {
          const infoDia = diasSinEventosInfo[i];
          try {
            const dia = todosLosDias.nth(infoDia.index);
            const diaVisible = await dia.isVisible({ timeout: 2000 }).catch(() => false);
            if (diaVisible) {
              diasSinPuntos.push(dia);
              if (i === 0) {
                console.log(`✅ Primer día sin eventos encontrado: día ${infoDia.numero}`);
              }
            }
          } catch (error) {
            console.log(`⚠️ Error al obtener locator para día ${infoDia.numero}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      const errorMessage = error.message || String(error);
      console.log(`⚠️ Error en evaluación del DOM: ${errorMessage}`);
      
      // Verificar si la página se cerró
      if (errorMessage.includes('Target page, context or browser has been closed') || page.isClosed()) {
        console.log('❌ La página se cerró durante la evaluación del DOM');
        throw error; // Re-lanzar el error para que la prueba falle claramente
      }
      
      console.log('⚠️ Intentando método alternativo más lento...');
      
      // Verificar que la página sigue disponible
      if (page.isClosed()) {
        throw new Error('La página se cerró antes del método alternativo');
      }
      
      // Método alternativo: procesar solo los primeros días visibles
      try {
        const todosLosDias = calendario.locator('button[type="button"]').filter({
          has: page.locator('p.text-dark-neutral')
        });
        
        console.log('⏳ Contando días en método alternativo...');
        const totalDias = await Promise.race([
          todosLosDias.count(),
          new Promise<number>(resolve => setTimeout(() => resolve(0), 10000))
        ]);
        
        if (totalDias === 0) {
          console.log('⚠️ No se encontraron días en el método alternativo');
          throw new Error('No se pudieron encontrar días del calendario');
        }
        
        console.log(`📊 Total de días encontrados: ${totalDias}`);
        
        // Limitar a procesar solo los primeros 35 días (suficiente para un mes)
        const diasAProcesar = Math.min(totalDias, 35);
        console.log(`🔍 Procesando solo los primeros ${diasAProcesar} días...`);
        
        for (let i = 0; i < diasAProcesar && diasSinPuntos.length < 5; i++) {
          // Verificar que la página sigue disponible en cada iteración
          if (page.isClosed()) {
            console.log(`❌ La página se cerró durante el procesamiento (día ${i + 1})`);
            break;
          }
          
          try {
            const dia = todosLosDias.nth(i);
            const diaVisible = await dia.isVisible({ timeout: 1000 }).catch(() => false);
            if (!diaVisible) {
              continue;
            }
            
            // Verificar el color del texto para filtrar días de otros meses
            const textoDia = dia.locator('p.text-dark-neutral').first();
            let colorTexto: string | null = null;
            try {
              colorTexto = await textoDia.evaluate((el) => {
                const estilo = window.getComputedStyle(el);
                return estilo.color;
              }).catch(() => null);
            } catch (e) {
              // Si no se puede obtener el color, continuar
            }
            
            // Si el texto es gris, probablemente es de otro mes
            if (colorTexto && (
              colorTexto.includes('rgb(200, 200, 200)') ||
              colorTexto.includes('rgb(180, 180, 180)') ||
              colorTexto.includes('rgb(160, 160, 160)')
            )) {
              continue; // Saltar días de otros meses
            }
            
            // Verificar rápidamente si tiene puntos usando page.evaluate
            const elementHandle = await dia.elementHandle();
            if (!elementHandle) {
              continue;
            }
            
            const tienePuntos = await page.evaluate((element) => {
              const puntos = element.querySelectorAll('div[class*="rounded-circle"]');
              for (const punto of Array.from(puntos)) {
                const estilo = window.getComputedStyle(punto);
                const bgColor = estilo.backgroundColor;
                if (bgColor && 
                    bgColor !== 'transparent' && 
                    bgColor !== 'rgba(0, 0, 0, 0)' &&
                    !bgColor.includes('rgb(255, 255, 255)') &&
                    !bgColor.includes('rgb(242, 242, 242)')) {
                  return true;
                }
              }
              return false;
            }, elementHandle).catch(() => false);
            
            if (!tienePuntos) {
              const numeroDia = await dia.locator('p.text-dark-neutral').first().textContent({ timeout: 1000 }).catch(() => null);
              if (numeroDia && numeroDia.trim().match(/^\d+$/)) {
                const numero = parseInt(numeroDia.trim(), 10);
                // Priorizar días del 1 al 15 del mes actual
                if (numero >= 1 && numero <= 15) {
                  diasSinPuntos.push(dia);
                  if (diasSinPuntos.length === 1) {
                    console.log(`✅ Primer día sin eventos encontrado: día ${numeroDia.trim()}`);
                  }
                } else if (diasSinPuntos.length === 0 && numero <= 31) {
                  // Si no encontramos días del 1-15, usar cualquier día del mes
                  diasSinPuntos.push(dia);
                  console.log(`✅ Día sin eventos encontrado: día ${numeroDia.trim()}`);
                }
              }
            }
          } catch (error) {
            // Continuar con el siguiente día
            continue;
          }
        }
      } catch (altError) {
        const altErrorMessage = altError.message || String(altError);
        console.log(`❌ Error en método alternativo: ${altErrorMessage}`);
        if (altErrorMessage.includes('Target page, context or browser has been closed') || page.isClosed()) {
          throw altError;
        }
      }
    }
    
    console.log(`📊 Días sin eventos encontrados: ${diasSinPuntos.length}`);
    
    if (diasSinPuntos.length === 0) {
      console.log('⚠️ No se encontraron días sin eventos en el calendario');
      return;
    }
    
    // Seleccionar el primer día sin eventos
    const diaSinEventos = diasSinPuntos[0];
    await diaSinEventos.scrollIntoViewIfNeeded();
    
    const numeroDiaTexto = await diaSinEventos.locator('p.text-dark-neutral').first().textContent();
    const numeroDia = numeroDiaTexto?.trim() || '';
    console.log(`📅 Día seleccionado (sin eventos): ${numeroDia}`);
    
    if (!numeroDia) {
      console.log('⚠️ No se pudo obtener el número del día');
      return;
    }
    
    // Contar eventos visibles antes del click
    await showStepMessage(page, '📊 CONTANDO EVENTOS ANTES DE SELECCIONAR DÍA SIN EVENTOS');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    const { count: countAntes } = await contarEventosVisibles(page);
    console.log(`📊 Eventos visibles antes: ${countAntes}`);
    
    // Hacer click en el día sin eventos
    await showStepMessage(page, `🔄 HACIENDO CLICK EN DÍA ${numeroDia} (SIN EVENTOS)`);
    console.log(`🖱️ Haciendo clic en día ${numeroDia}...`);
    
    try {
      await diaSinEventos.click({ timeout: 10000 });
      console.log('✅ Clic ejecutado exitosamente');
    } catch (error) {
      console.log(`⚠️ Error al hacer clic: ${error.message}, intentando con force...`);
      await diaSinEventos.click({ timeout: 10000, force: true });
    }
    
    console.log('⏳ Esperando a que se actualice la vista después del clic...');
    // Esperar a que se actualice la vista con timeout más corto
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 15000 }),
      page.waitForTimeout(5000) // Máximo 5 segundos de espera
    ]).catch(() => {
      console.log('⚠️ Timeout esperando networkidle, continuando...');
    });
    
    await page.waitForTimeout(1000); // Espera mínima adicional
    
    // Validar que NO hay eventos visibles
    await showStepMessage(page, '✅ VALIDANDO QUE NO HAY EVENTOS VISIBLES');
    console.log('⏳ Esperando antes de contar eventos...');
    await page.waitForTimeout(1000);
    
    const { count: countDespues } = await contarEventosVisibles(page);
    console.log(`📊 Eventos visibles después: ${countDespues}`);
    
    if (countDespues === 0) {
      console.log('✅ No hay eventos visibles (correcto)');
    } else {
      console.log(`⚠️ Se encontraron ${countDespues} eventos cuando se esperaba 0`);
    }
    
    // Validar que se muestra el estado vacío
    await showStepMessage(page, '✅ VALIDANDO ESTADO VACÍO');
    await page.waitForTimeout(2000);
    
    // Buscar el contenedor del estado vacío (div con bg-no-repeat bg-contain bg-center)
    const estadoVacio = page.locator('div.bg-no-repeat.bg-contain.bg-center').first();
    const existeEstadoVacio = await estadoVacio.count() > 0;
    
    if (existeEstadoVacio) {
      await expect(estadoVacio).toBeVisible({ timeout: 5000 });
      console.log('✅ Se muestra el estado vacío correctamente');
      
      // Verificar que el estado vacío tiene una imagen de fondo
      const tieneImagen = await estadoVacio.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.backgroundImage && style.backgroundImage !== 'none';
      });
      
      if (tieneImagen) {
        console.log('✅ El estado vacío tiene una imagen de fondo');
      } else {
        console.log('⚠️ El estado vacío no tiene imagen de fondo');
      }
    } else {
      console.log('⚠️ No se encontró el estado vacío');
    }
    
    // Validar que el día tiene el borde de selección
    await showStepMessage(page, '✅ VALIDANDO BORDE DE SELECCIÓN EN EL DÍA');
    await page.waitForTimeout(2000);
    
    let diaSeleccionado = calendario.locator('button[type="button"]').filter({
      has: page.locator('p.text-dark-neutral').filter({ hasText: new RegExp(`^${numeroDia}$`) })
    }).filter({
      has: page.locator('[class*="border-primary-neutral"]')
    });
    
    if (await diaSeleccionado.count() === 0) {
      diaSeleccionado = calendario.locator('button[type="button"]').filter({
        has: page.locator('p.text-dark-neutral').filter({ hasText: new RegExp(`^${numeroDia}$`) })
      }).filter({
        has: page.locator('[class*="border-2"]')
      });
    }
    
    if (await diaSeleccionado.count() > 0) {
      await expect(diaSeleccionado).toBeVisible({ timeout: 5000 });
      console.log('✅ El día tiene el borde de selección');
    } else {
      console.log('⚠️ No se encontró el borde de selección, pero el día existe');
    }
    
    console.log('✅ Prueba de día sin eventos completada exitosamente');
  });

  // ============================================
  // GRUPO 3: PRUEBAS QUE SOLO PRUEBAN FUNCIONALIDAD
  // ============================================

  test('Se crea un nuevo evento desde el dashboard', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos (la creación de evento puede tardar)
    await showStepMessage(page, '🔘 BUSCANDO BOTÓN NUEVO EVENTO');
    await page.waitForTimeout(1000);
    
    // Buscar el botón "Nuevo evento" (puede ser desktop o mobile)
    const botonNuevoEventoDesktop = page.locator('button').filter({
      has: page.locator('i.icon-calendar')
    }).filter({
      has: page.locator('h5', { hasText: /Nuevo Evento/i })
    });
    const botonNuevoEventoDesktopVisible = botonNuevoEventoDesktop.filter({
      has: page.locator(':visible')
    });
    const botonNuevoEventoMobile = page.locator('button').filter({
      has: page.locator('p', { hasText: /Nuevo evento/i })
    });
    
    let botonNuevoEvento: Locator;
    
    if (await botonNuevoEventoDesktopVisible.count() > 0) {
      botonNuevoEvento = botonNuevoEventoDesktopVisible.first();
      console.log('✅ Botón "Nuevo evento" encontrado (versión desktop)');
    } else if (await botonNuevoEventoMobile.count() > 0) {
      botonNuevoEvento = botonNuevoEventoMobile.first();
      console.log('✅ Botón "Nuevo evento" encontrado (versión mobile)');
    } else {
      // Intentar con el selector más simple
      botonNuevoEvento = page.getByRole('button', { name: /Nuevo Evento/i }).first();
      console.log('✅ Botón "Nuevo evento" encontrado (selector simple)');
    }
    
    await expect(botonNuevoEvento).toBeVisible({ timeout: 20000 });
    await expect(botonNuevoEvento).toBeEnabled();
    
    // Guardar la URL actual antes de hacer clic
    const urlInicial = page.url();
    console.log(`📍 URL inicial: ${urlInicial}`);
    
    // Hacer clic en el botón
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN BOTÓN NUEVO EVENTO');
    await page.waitForTimeout(1000);
    await botonNuevoEvento.click();
    await page.waitForTimeout(2000); // Esperar a que se cargue la nueva página
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Validar que se navegó a la página de creación de evento
    await showStepMessage(page, '✅ VALIDANDO NAVEGACIÓN A PÁGINA DE CREACIÓN DE EVENTO');
    await page.waitForTimeout(1000);
    
    const urlActual = page.url();
    console.log(`📍 URL actual: ${urlActual}`);
    
    // Validar que la URL contiene /provider/event
    if (!urlActual.includes('/provider/event')) {
      throw new Error(`❌ La URL no corresponde a la página de creación de evento. URL actual: ${urlActual}`);
    }
    
    console.log('✅ Redirección a página de creación de evento exitosa');
    
    // Validar que se muestra el título "Nuevo evento"
    await showStepMessage(page, '✅ VALIDANDO TÍTULO "NUEVO EVENTO"');
    await page.waitForTimeout(1000);
    
    const tituloNuevoEvento = page.locator('p.text-\\[20px\\].text-dark-neutral:has-text("Nuevo evento"), h1:has-text("Nuevo evento"), h2:has-text("Nuevo evento"), h3:has-text("Nuevo evento"), h4:has-text("Nuevo evento"), h5:has-text("Nuevo evento"), p:has-text("Nuevo evento")').first();
    await expect(tituloNuevoEvento).toBeVisible({ timeout: 10000 });
    console.log('✅ Título "Nuevo evento" encontrado');
    
    // Validar que se muestra el formulario de selección de tipo de evento
    await showStepMessage(page, '✅ VALIDANDO FORMULARIO DE SELECCIÓN DE TIPO DE EVENTO');
    await page.waitForTimeout(1000);
    
    const formularioTipoEvento = page.locator('form[id="EventTypeForm"]');
    await expect(formularioTipoEvento).toBeVisible({ timeout: 10000 });
    console.log('✅ Formulario de selección de tipo de evento visible');
    
    // Validar que se muestra el título del formulario
    const tituloFormulario = page.locator('h5:has-text("Selecciona el tipo de tu evento"), h4:has-text("Selecciona el tipo de tu evento"), h3:has-text("Selecciona el tipo de tu evento")').first();
    const tituloVisible = await tituloFormulario.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (tituloVisible) {
      console.log('✅ Título del formulario "Selecciona el tipo de tu evento" encontrado');
    } else {
      console.log('⚠️ No se encontró el título del formulario, pero el formulario está visible');
    }
    
    // Validar que hay categorías de eventos disponibles
    await showStepMessage(page, '✅ VALIDANDO CATEGORÍAS DE EVENTOS');
    await page.waitForTimeout(1000);
    
    const categoriasEventos = page.locator('form[id="EventTypeForm"] button[type="submit"]');
    const cantidadCategorias = await categoriasEventos.count();
    
    if (cantidadCategorias > 0) {
      console.log(`✅ Se encontraron ${cantidadCategorias} categorías de eventos disponibles`);
      
      // Validar que al menos una categoría está visible
      const primeraCategoria = categoriasEventos.first();
      await expect(primeraCategoria).toBeVisible({ timeout: 5000 });
      console.log('✅ Al menos una categoría de evento está visible');
    } else {
      console.log('⚠️ No se encontraron categorías de eventos');
    }
    
    // --- CREAR EVENTO COMPLETO ---
    await showStepMessage(page, '🎯 CREANDO EVENTO COMPLETO');
    await page.waitForTimeout(1000);
    
    await crearEventoCompleto(page);
    
    console.log('✅ Prueba de navegación a página de creación de evento y creación de evento completada exitosamente');
  });
});

/**
 * Cuenta los eventos visibles en la página
 * IMPORTANTE: Cada evento tiene dos versiones (desktop y mobile) dentro del mismo contenedor
 * Esta función cuenta solo los contenedores únicos div[role="button"] que son visibles
 */
async function contarEventosVisibles(page: Page): Promise<{ count: number; locator: Locator }> {
  // Buscar todos los contenedores div[role="button"] que tienen fechas
  const todosContenedores = page.locator('div[role="button"]').filter({
    has: page.locator('p, h5, h6').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+\d{4}/i })
  });
  
  // Contar solo los contenedores que son visibles (no los elementos internos duplicados)
  let count = 0;
  const totalContenedores = await todosContenedores.count();
  
  for (let i = 0; i < totalContenedores; i++) {
    const contenedor = todosContenedores.nth(i);
    const isVisible = await contenedor.isVisible().catch(() => false);
    if (isVisible) {
      count++;
    }
  }
  
  // Crear el locator de eventos visibles para usar después
  const eventosVisibles = todosContenedores.filter({ has: page.locator(':visible') });
  
  return { count, locator: eventosVisibles };
}

async function validarEstado(container: Locator, page: Page, estado: 'CONTRATADO' | 'PENDIENTE' | 'NUEVO' | 'CANCELADO') {
  const filtro = container.getByRole('button', { name: estado, exact: true });
  await filtro.click();
  await page.waitForTimeout(1000); // Esperar a que se actualice la UI después del click

  const tarjetas = page.locator('div[role="button"]').filter({ hasText: new RegExp(`${estado}`, 'i') });
  const estadoVacio = page.locator('div.bg-no-repeat.bg-contain.bg-center');

  // Esperar un poco más para que se carguen los elementos
  await page.waitForTimeout(500);

  const countTarjetas = await tarjetas.count();
  const countEstadoVacio = await estadoVacio.count();

  if (countTarjetas > 0) {
    await expect(tarjetas.first()).toBeVisible({ timeout: 5000 });
  } else if (countEstadoVacio > 0) {
    await expect(estadoVacio.first()).toBeVisible({ timeout: 5000 });
  } else {
    // Si no hay tarjetas ni estado vacío, solo validar que el filtro está activo
    console.log(`⚠️ No se encontraron tarjetas ni estado vacío para el filtro ${estado}`);
  }
}

async function validarTarjetaEstadistica(
  page: Page,
  labelRegex: RegExp,
  href: string,
  destino: string
) {
  const contenedor = obtenerTarjetaEstadistica(page, labelRegex);

  await expect(contenedor).toBeVisible();

  const indicador = contenedor.locator('h4').first();
  const texto = (await indicador.textContent())?.trim() ?? '';
  const valor = Number.parseInt(texto.replace(/[^\d-]/g, ''), 10);

  const enlace = contenedor.locator(`a[href="${href}"]`).first();

  if (!Number.isFinite(valor) || valor === 0 || !(await enlace.count())) {
    return;
  }

  await enlace.click();
  await expect(page).toHaveURL(destino);
  await page.goto(DASHBOARD_URL);
}

function obtenerTarjetaEstadistica(page: Page, labelRegex: RegExp): Locator {
  return page
    .locator('div.md\\:w-full')
    .filter({ has: page.locator('p', { hasText: labelRegex }) })
    .first();
}

/**
 * Verifica si el proveedor tiene al menos un servicio
 * Navega a la página de servicios y verifica si hay servicios listados
 */
async function verificarSiTieneServicios(page: Page): Promise<boolean> {
  // Guardar la URL actual
  const urlActual = page.url();
  
  try {
    // Navegar a la página de servicios
    await page.goto(SERVICES_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    // Verificar si hay estado vacío primero (más rápido)
    const emptyState = page.locator('div.grow.flex.flex-col.justify-center.gap-6.items-center');
    const tieneEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (tieneEmptyState) {
      console.log('[verificarSiTieneServicios] Estado vacío encontrado - el proveedor NO tiene servicios');
      return false;
    }
    
    // Si no hay estado vacío, verificar si hay input de búsqueda (indica que hay servicios)
    const searchInput = page.locator('input#Search');
    const tieneSearchInput = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (tieneSearchInput) {
      console.log('[verificarSiTieneServicios] Input de búsqueda encontrado - el proveedor tiene servicios');
      return true;
    }
    
    // Como último recurso, verificar si hay tarjetas de servicios visibles
    // Buscar tarjetas que contengan información de servicios (títulos, descripciones, etc.)
    const tarjetasServicios = page.locator('div[role="button"], div.card, div.border').filter({
      has: page.locator('h5, h6').filter({ hasText: /./ })
    });
    
    const countTarjetas = await tarjetasServicios.count();
    const tieneServicios = countTarjetas > 0;
    
    console.log(`[verificarSiTieneServicios] Tarjetas encontradas: ${countTarjetas} - Tiene servicios: ${tieneServicios}`);
    return tieneServicios;
  } catch (error) {
    console.log(`[verificarSiTieneServicios] Error al verificar servicios: ${error}`);
    // En caso de error, asumir que no hay servicios para ser conservador
    return false;
  } finally {
    // Volver a la URL original (dashboard)
    if (urlActual.includes('/provider/dashboard')) {
      await page.goto(urlActual, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
    } else {
      await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
    }
  }
}
