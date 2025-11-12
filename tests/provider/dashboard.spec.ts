import { test, expect, Page, Locator } from '@playwright/test';
import { login } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/provider/dashboard`;
const SERVICES_URL = `${DEFAULT_BASE_URL}/provider/services`;
const PROMOTIONS_URL = `${DEFAULT_BASE_URL}/provider/promotions`;
const CHATS_URL = `${DEFAULT_BASE_URL}/provider/chats`;
const PROFILE_URL = `${DEFAULT_BASE_URL}/provider/profile`;
const STATS_VIEWS_URL = `${DEFAULT_BASE_URL}/provider/stats/views`;
const STATS_APPLICATIONS_URL = `${DEFAULT_BASE_URL}/provider/stats/applications`;
const STATS_HIRINGS_URL = `${DEFAULT_BASE_URL}/provider/stats/hirings`;

test.use({
  viewport: { width: 1280, height: 720 }
});

test.describe('Dashboard de proveedor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/provider/dashboard')) {
      await page.goto(DASHBOARD_URL);
    }

    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();
  });

  test('mostrar las secciones principales del dashboard', async ({ page }) => {
    // Tarjeta de bienvenida y acciones rápidas
    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();
    const btnServicios = page.getByRole('button', { name: /Administrar servicios/i });
    const btnPromociones = page.getByRole('button', { name: /Administrar promociones/i });
    await expect(btnServicios).toBeVisible();
    await expect(btnPromociones).toBeVisible();

    // Estadísticas
    await expect(page.getByRole('link', { name: /Visualizaciones/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Solicitudes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Contrataciones/i })).toBeVisible();

    // Filtros de eventos
    const filtrosContainer = page.locator('div').filter({
      has: page.getByRole('button', { name: 'TODOS', exact: true })
    }).first();
    for (const filtro of ['TODOS', 'NUEVO', 'PENDIENTE', 'CONTRATADO', 'CANCELADO']) {
      await expect(filtrosContainer.getByRole('button', { name: filtro, exact: true })).toBeVisible();
    }

    // Listado de eventos (botón para crear y contenedor principal)
    await expect(page.getByRole('button', { name: /Nuevo Evento/i })).toBeVisible();

    // Calendario mensual
    const calendario = page.locator('div').filter({
      has: page.locator('button', { hasText: /\d{4}$/ })
    }).first();
    await expect(calendario.locator('button', { hasText: /\d{4}$/ }).first()).toBeVisible();
    await expect(calendario.locator('p', { hasText: /^Dom$/ }).first()).toBeVisible();

    // Módulo Fiestachat
    await expect(page.getByText('¡Fiestachat!')).toBeVisible();
    await expect(page.getByText('La línea directa a tu evento')).toBeVisible();
    const primerChat = page.locator('button').filter({
      has: page.locator('p', { hasText: /Fiestamas qa cliente|NuevoNombreQA/i })
    }).first();
    await expect(primerChat).toBeVisible();
  });

  test('accesos rápidos navegan a las secciones correspondientes', async ({ page }) => {
    await page.getByRole('button', { name: /Administrar servicios/i }).click();
    await expect(page).toHaveURL(SERVICES_URL);

    await page.goto(DASHBOARD_URL);
    await page.getByRole('button', { name: /Administrar promociones/i }).click();
    await expect(page).toHaveURL(PROMOTIONS_URL);

    await page.goto(DASHBOARD_URL);
  });

  test('barra superior navega a chats y perfil', async ({ page }) => {
    const enlaceChats = page.locator('div.lg\\:block nav a[href="/provider/chats"]').first();
    await expect(enlaceChats).toBeVisible();
    await enlaceChats.click();
    await expect(page).toHaveURL(CHATS_URL);

    await page.goto(DASHBOARD_URL);

    const enlacePerfil = page.locator('div.lg\\:block nav a[href="/provider/profile"]').first();
    await expect(enlacePerfil).toBeVisible();
    await enlacePerfil.click();
    await expect(page).toHaveURL(PROFILE_URL);

    await page.goto(DASHBOARD_URL);
  });

  test('tarjetas de estadísticas redirigen a sus secciones', async ({ page }) => {
    const tarjetaVisualizaciones = page.locator('a[href="/provider/stats/views"]').first();
    await expect(tarjetaVisualizaciones).toBeVisible();
    await tarjetaVisualizaciones.click();
    await expect(page).toHaveURL(STATS_VIEWS_URL);

    await page.goto(DASHBOARD_URL);

    const tarjetaSolicitudes = page.locator('a[href="/provider/stats/applications"]').first();
    await expect(tarjetaSolicitudes).toBeVisible();
    await tarjetaSolicitudes.click();
    await expect(page).toHaveURL(STATS_APPLICATIONS_URL);

    await page.goto(DASHBOARD_URL);

    const tarjetaContrataciones = page.locator('a[href="/provider/stats/hirings"]').first();
    await expect(tarjetaContrataciones).toBeVisible();
    await tarjetaContrataciones.click();
    await expect(page).toHaveURL(STATS_HIRINGS_URL);

    await page.goto(DASHBOARD_URL);
  });

  test('controles adicionales del listado de eventos están visibles', async ({ page }) => {
    await page.setViewportSize({ width: 991, height: 720 });
    await page.waitForTimeout(500);

    const botonNuevoEventoDesktop = page
      .locator('button')
      .filter({
        has: page.locator('i.icon-calendar')
      })
      .filter({
        has: page.locator('h5', { hasText: /Nuevo Evento/i })
      })
      .first();
    const botonNuevoEventoMobile = page
      .locator('button')
      .filter({
        has: page.locator('p', { hasText: /Nuevo evento/i })
      })
      .first();

    const botonNuevoEventoDesktopVisible = botonNuevoEventoDesktop.filter({ has: page.locator(':visible') });

    if (await botonNuevoEventoDesktopVisible.count()) {
      await expect(botonNuevoEventoDesktopVisible.first()).toBeVisible();
      await expect(botonNuevoEventoDesktopVisible.first()).toBeEnabled();
    } else {
      await expect(botonNuevoEventoMobile.first()).toBeVisible();
      await expect(botonNuevoEventoMobile.first()).toBeEnabled();
    }

    const tarjetaCategoria = page
      .locator('button')
      .filter({
        has: page.locator('img[alt^="Image_"]')
      })
      .first();
    await tarjetaCategoria.scrollIntoViewIfNeeded();
    await expect(await tarjetaCategoria.count()).toBeGreaterThan(0);
    await expect(tarjetaCategoria).toBeVisible();

    const botonEventosPasados = page.getByRole('button', { name: /Ver eventos pasados/i }).first();
    await expect(botonEventosPasados).toBeVisible();
    await expect(botonEventosPasados).toBeEnabled();

    const botonFecha = page.getByRole('button', { name: /^Fecha$/i }).first();
    await expect(botonFecha).toBeVisible();
    await expect(botonFecha).toBeEnabled();
  });

  test('filtros de eventos permiten cambiar la vista', async ({ page }) => {
    const filtrosContainer = page.locator('div').filter({
      has: page.getByRole('button', { name: 'TODOS', exact: true })
    }).first();

    const filtroContratado = filtrosContainer.getByRole('button', { name: 'CONTRATADO', exact: true });
    await filtroContratado.click();

    await validarEstado(filtrosContainer, page, 'CONTRATADO');

    const filtroPendiente = filtrosContainer.getByRole('button', { name: 'PENDIENTE', exact: true });
    await filtroPendiente.click();

    await validarEstado(filtrosContainer, page, 'PENDIENTE');

    const filtroNuevo = filtrosContainer.getByRole('button', { name: 'NUEVO', exact: true });
    await filtroNuevo.click();
    await validarEstado(filtrosContainer, page, 'NUEVO');

    const filtroCancelado = filtrosContainer.getByRole('button', { name: 'CANCELADO', exact: true });
    await filtroCancelado.click();
    await validarEstado(filtrosContainer, page, 'CANCELADO');

    const filtroTodos = filtrosContainer.getByRole('button', { name: 'TODOS', exact: true });
    await filtroTodos.click();
    await expect(page.getByRole('button', { name: /Nuevo Evento/i })).toBeVisible();
  });
});

async function validarEstado(container: Locator, page: Page, estado: 'CONTRATADO' | 'PENDIENTE' | 'NUEVO' | 'CANCELADO') {
  const filtro = container.getByRole('button', { name: estado, exact: true });
  await filtro.click();

  const tarjetas = page.locator('div[role="button"]').filter({ hasText: new RegExp(`${estado}`, 'i') });
  const estadoVacio = page.locator('div.bg-no-repeat.bg-contain.bg-center');

  if (await tarjetas.count()) {
    await expect(tarjetas.first()).toBeVisible();
  } else {
    await expect(estadoVacio.first()).toBeVisible();
  }
}
