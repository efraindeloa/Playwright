import { test, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from './config';

test('Validar hero banner, slider y categorías en home', async ({ page }) => {
  test.setTimeout(120000);

        const BASE_URL = process.env.HOME_BASE_URL ?? DEFAULT_BASE_URL;
  const baseOrigin = new URL(BASE_URL).origin;
  const urls = {
    home: `${baseOrigin}/`,
    register: `${baseOrigin}/register?role=PRVD`,
    login: `${baseOrigin}/login`
  };

  const normalize = (txt?: string | null) => txt?.trim() ?? '';
  const serviciosEspecializados = [
    'Cuidado de Mascotas', 'Barman', 'Niñeras', 'Valet parking', 'Belleza',
    'Agencia de Viajes', 'Fotógrafo', 'Hoteles', 'Joyería', 'Hostess',
    'Transporte', 'Meseros', 'Organizador de Eventos', 'Coreografías',
    'Vestidos', 'Barbería', 'Smoking / trajes'
  ];

  const categorias = {
    Alimentos: {
      subcategorias: [
        'Postres / Pasteles', 'Entradas', 'Taquizas', 'After Party',
        'Banquetes', 'Snacks Botanas', 'Buffetes'
      ],
      nested: {
        'After Party': ['Hamburguesas', 'Taquizas', 'Chilaquiles'],
        'Snacks Botanas': ['Hamburguesas', 'Pizzas', 'Tortas', 'Frutas y/o Verduras', 'Helados', 'Frituras', 'Cafés']
      }
    },
    Bebidas: ['Coctelería', 'Especialidades', 'Vinos y Licores', 'Cafés', 'Refrescos / sodas', 'Aguas de sabores'],
    Lugares: ['Playas', 'Restaurantes', 'Salón de eventos', 'Haciendas', 'Salón de hotel', 'Antros / disco', 'Centros de Convenciones', 'Viñedos', 'Terrazas'],
    Entretenimiento: ['Juegos Mecánicos', 'Backdrop', 'Conferencista', 'Mini Spa', 'Magos', 'Casino', 'Mini Feria', 'Pirotecnia', 'Artistas', 'Pinta Caritas', 'Pulseras electrónicas', 'Cabina de fotos', 'Comediantes', 'Inflables', 'Payasos', 'Artículos / Objetos', 'Espectáculo'],
    Música: ['Banda', 'Urbana', 'Cumbia y salsa', 'Artistas reconocidos', 'Rock / Pop', 'DJ', 'Sones Regionales', 'Country', 'Grupo Versátil', 'Mariachi / Música Ranchera', 'Solista, duetos, tríos y más', 'Norteño', 'Coro / Religiosa', 'Violinista o saxofonista', 'Otro Tipo'],
    Decoración: ['Decorador profesional', 'Luces', 'Globos', 'Temática', 'Decoración y ambientación gral', 'Centros de mesa', 'Flores', 'Mamparas'],
    'Mesa de regalos': ['Perfumería'],
    'Servicios Especializados': serviciosEspecializados
  };

  // Helpers reutilizables
  const wait = (ms = 1500) => page.waitForTimeout(ms);
  const gotoHome = async () => { await page.goto(urls.home); await page.waitForLoadState('networkidle'); };
  const clickButton = async (label: string) => {
    const btn = page.locator('button', { hasText: new RegExp(`^${label}\\b`, 'i') }).first();
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click();
    await page.waitForLoadState('networkidle');
    await wait();
  };
  const validateList = async (locator, expected: string[]) => {
    const items = page.locator(locator);
    await expect(items).toHaveCount(expected.length, { timeout: 15000 });
    for (let i = 0; i < expected.length; i++)
      expect(normalize(await items.nth(i).textContent())).toContain(expected[i]);
  };

  // 1️⃣ Validar hero y slider
  await gotoHome();
  const hero = page.locator('img[alt="Hero_Image"]');
  await expect(hero).toBeVisible({ timeout: 10000 });
  const cta = page.locator('button, a', { hasText: /empieza|empezar/i }).first();
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(urls.register);
  await gotoHome();

  // 2️⃣ Validar banners de login
  const sliderPoints = page.locator('button.rounded-full').filter({ hasNotText: /./ });
  for (let i = 1; i <= 2; i++) {
    await sliderPoints.nth(i).click({ force: true });
    await wait(500);
    const btn = page.locator('button, a', { hasText: i === 1 ? /hazlo aquí/i : /regístrate ya/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(urls.login);
    await gotoHome();
  }

  // 3️⃣ Validar categorías
  const expectedCategories = Object.keys(categorias);
  const buttons = page.locator('button', { has: page.locator('img[alt="Ícono de categoría"]') });
  await expect(buttons).toHaveCount(10);

  for (const nombre of expectedCategories) {
    console.log(`🟩 Validando categoría: ${nombre}`);
    const button = buttons.filter({ hasText: new RegExp(nombre, 'i') }).first();
    await expect(button).toBeVisible();
    await button.click();
    await wait(1500);

    const subcats = categorias[nombre];
    if (typeof subcats === 'object' && !Array.isArray(subcats)) {
      await validateList('button p.text-neutral-800', subcats.subcategorias);
      for (const [sub, nested] of Object.entries(subcats.nested)) {
        await clickButton(sub);
        await validateList('button p.text-neutral-800', nested);
        await clickButton('Alimentos');
      }
    } else {
      await validateList('button p.text-neutral-800', subcats as string[]);
    }

    await gotoHome();
  }
});
