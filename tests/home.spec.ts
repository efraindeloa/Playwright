import { test, expect } from '@playwright/test';

test('Validar hero banner y slider en home', async ({ page }) => {
  test.setTimeout(120000); // Aumentar timeout a 2 minutos
  // Ir al home
  await page.goto('https://staging.fiestamas.com');

  // Esperar que el hero esté cargado
  const hero = page.locator('img[alt="Hero_Image"]');
  await expect(hero).toBeVisible({ timeout: 10000 }); // tiempo mayor por carga de imágenes

  // Validar que el contenedor del texto del banner esté visible (h3 en desktop o h6 en mobile)
  const heroText = page.locator('div.relative.z-10 h3, div.relative.z-10 h6');
  let isAnyVisible = false;
  const count = await heroText.count();
  for (let i = 0; i < count; i++) {
    if (await heroText.nth(i).isVisible()) {
      isAnyVisible = true;
      break;
    }
  }
  expect(isAnyVisible).toBe(true);

  // Validar que los puntos del slider estén visibles y funcionen
  // Buscar botones del slider por sus clases características (rounded-full)
  const sliderPoints = page.locator('button.rounded-full').filter({ hasNotText: /./ });
  const visiblePointsCount = await sliderPoints.count();
  
  // Si hay puntos del slider visibles (al menos 2), hacer clic en ellos
  if (visiblePointsCount >= 2) {
    // Hacer clic en los primeros 3 puntos del slider
    const clickLimit = Math.min(visiblePointsCount, 3);
    for (let i = 0; i < clickLimit; i++) {
      await sliderPoints.nth(i).click({ force: true });
    // Esperar un pequeño delay para que cambie la imagen
      await page.waitForTimeout(500);
      // Confirmar que el hero sigue visible después del cambio
      await expect(hero).toBeVisible();
    }
    
    // Volver al primer slide para probar el botón CTA
    await sliderPoints.nth(0).click({ force: true });
    await page.waitForTimeout(500);
  }
  
  // Validar que el botón CTA del hero banner lleve a la página de registro
  // Puede ser un botón o un enlace, buscar por texto
  const ctaButton = page.locator('button, a').filter({ hasText: /empieza ya|empezar|¡empieza/i }).first();
  await expect(ctaButton).toBeVisible({ timeout: 10000 });
  
  // Hacer clic en el botón
  await ctaButton.click();
  
  // Verificar que navega a la página de registro de proveedores
  await page.waitForURL('https://staging.fiestamas.com/register?role=PRVD', { timeout: 10000 });
  expect(page.url()).toBe('https://staging.fiestamas.com/register?role=PRVD');
  
  // Regresar al home para probar el segundo banner
  await page.goto('https://staging.fiestamas.com');
  await page.waitForLoadState('networkidle');
  
  // Hacer clic en el segundo punto del slider para mostrar el segundo banner
  const sliderPoints2 = page.locator('button.rounded-full').filter({ hasNotText: /./ });
  await sliderPoints2.nth(1).click({ force: true }); // Clic en el segundo punto (índice 1)
  await page.waitForTimeout(500);
  
  // Validar que el botón "Hazlo aquí" del segundo banner lleve a la página de login
  // Puede ser un botón o un enlace, buscar por texto
  const loginButton = page.locator('button, a').filter({ hasText: /hazlo aquí|hazlo aqui/i }).first();
  await expect(loginButton).toBeVisible({ timeout: 10000 });
  
  // Hacer clic en el botón
  await loginButton.click();
  
  // Verificar que navega a la página de login
  await page.waitForURL('https://staging.fiestamas.com/login', { timeout: 10000 });
  expect(page.url()).toBe('https://staging.fiestamas.com/login');
  
  // Regresar al home para probar el tercer banner
  await page.goto('https://staging.fiestamas.com');
  await page.waitForLoadState('networkidle');
  
  // Hacer clic en el tercer punto del slider para mostrar el tercer banner
  const sliderPoints3 = page.locator('button.rounded-full').filter({ hasNotText: /./ });
  await sliderPoints3.nth(2).click({ force: true }); // Clic en el tercer punto (índice 2)
  await page.waitForTimeout(500);
  
  // Validar que el botón "Regístrate ya" del tercer banner lleve a la página de login
  // Puede ser un botón o un enlace, buscar por texto
  const registerButton = page.locator('button, a').filter({ hasText: /regístrate ya|registrate ya/i }).first();
  await expect(registerButton).toBeVisible({ timeout: 10000 });
  
  // Hacer clic en el botón
  await registerButton.click();
  
  // Verificar que navega a la página de login
  await page.waitForURL('https://staging.fiestamas.com/login', { timeout: 10000 });
  expect(page.url()).toBe('https://staging.fiestamas.com/login');
  
  // Regresar al home para validar las categorías
  await page.goto('https://staging.fiestamas.com');
  await page.waitForLoadState('networkidle');
  
  // Validar que existen 10 categorías de servicios
  const categories = page.locator('button img[alt="Ícono de categoría"]');
  const categoryCount = await categories.count();
  expect(categoryCount).toBe(10);
  
  // Validar que cada categoría es visible y clickeable
  const categoryButtons = page.locator('button').filter({ has: page.locator('img[alt="Ícono de categoría"]') });
  const expectedCategories = [
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
  
  // Verificar que cada categoría existe, es visible y es seleccionable
  for (let i = 0; i < expectedCategories.length; i++) {
    console.log(`\n📋 Probando categoría ${i + 1} de ${expectedCategories.length}: ${expectedCategories[i]}`);
    
    const categoryButton = categoryButtons.nth(i);
    await expect(categoryButton).toBeVisible({ timeout: 5000 });
    
    // Verificar que el botón contiene el texto de la categoría esperada
    const categoryText = await categoryButton.textContent();
    expect(categoryText?.trim()).toContain(expectedCategories[i]);
    
    // Hacer clic en cada categoría para validar que es seleccionable
    console.log(`  ✓ Haciendo clic en categoría: ${expectedCategories[i]}`);
    await categoryButton.click();
    // Esperar a que cargue el contenido de la categoría
    await page.waitForTimeout(2000);
    
    // Validar el contenido según la categoría seleccionada
    if (expectedCategories[i] === 'Alimentos') {
      console.log(`  ✓ Validando subcategorías de Alimentos...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(7);
      
      const expectedSubcategories = [
        'Postres / Pasteles',
        'Entradas',
        'Taquizas',
        'After Party',
        'Banquetes',
        'Snacks  Botanas',
        'Buffets'
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 7 subcategorías de Alimentos correctamente`);
    }
    
    if (expectedCategories[i] === 'Bebidas') {
      console.log(`  ✓ Validando subcategorías de Bebidas...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(6);
      
      const expectedSubcategories = [
        'Coctelería',
        'Especialidades',
        'Vinos y Licores',
        'Cafés',
        'Refrescos / sodas',
        'Aguas de sabores'
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 6 subcategorías de Bebidas correctamente`);
    }
    
    if (expectedCategories[i] === 'Lugares') {
      console.log(`  ✓ Validando subcategorías de Lugares...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(9);
      
      const expectedSubcategories = [
        'Playas',
        'Restaurantes',
        'Salón de eventos',
        'Haciendas',
        'Salón de hotel',
        'Antros / disco',
        'Centros de Convenciones',
        'Viñedos',
        'Terrazas'
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 9 subcategorías de Lugares correctamente`);
    }
    
    if (expectedCategories[i] === 'Entretenimiento') {
      console.log(`  ✓ Validando subcategorías de Entretenimiento...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(17);
      
      const expectedSubcategories = [
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
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 17 subcategorías de Entretenimiento correctamente`);
    }
    
    if (expectedCategories[i] === 'Música') {
      console.log(`  ✓ Validando subcategorías de Música...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(15);
      
      const expectedSubcategories = [
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
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 15 subcategorías de Música correctamente`);
    }
    
    if (expectedCategories[i] === 'Decoración') {
      console.log(`  ✓ Validando subcategorías de Decoración...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(9);
      
      const expectedSubcategories = [
        'Decorador profesional',
        'Luces',
        'Globos',
        'Temática',
        'Decoración y ambientación gral',
        'Centros de mesa',
        'Flores',
        'Mamparas',
        'Letras gigantes'
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 9 subcategorías de Decoración correctamente`);
    }
    
    if (expectedCategories[i] === 'Mesa de regalos') {
      console.log(`  ✓ Validando subcategorías de Mesa de regalos...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(1);
      
      const expectedSubcategories = ['Perfumería'];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontró 1 subcategoría de Mesa de regalos correctamente`);
    }
    
    if (expectedCategories[i] === 'Servicios Especializados') {
      console.log(`  ✓ Validando subcategorías de Servicios Especializados...`);
      const subcategories = page.locator('button p.text-neutral-800');
      const subcategoryCount = await subcategories.count();
      expect(subcategoryCount).toBe(20);
      
      const expectedSubcategories = [
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
        'Smoking / trajes',
        'Infraestructura',
        'Climatización',
        'Sanitarios portátiles'
      ];
      
      for (let j = 0; j < expectedSubcategories.length; j++) {
        const subcategoryText = await subcategories.nth(j).textContent();
        expect(subcategoryText?.trim()).toContain(expectedSubcategories[j].trim());
      }
      console.log(`  ✓ Se encontraron las 20 subcategorías de Servicios Especializados correctamente`);
      
      // Validar sub-subcategorías de Climatización
      console.log(`  ✓ Haciendo clic en Climatización para validar sus subcategorías...`);
      const climatizacionButton = page.locator('button').filter({ hasText: 'Climatización' });
      await climatizacionButton.click();
      await page.waitForTimeout(2000);
      
      const subSubcategoriesClima = page.locator('button p.text-neutral-800');
      const subSubcategoryCountClima = await subSubcategoriesClima.count();
      expect(subSubcategoryCountClima).toBe(2);
      
      const expectedSubSubcategoriesClima = ['Cooler', 'Calentadores'];
      
      for (let k = 0; k < expectedSubSubcategoriesClima.length; k++) {
        const subSubcategoryText = await subSubcategoriesClima.nth(k).textContent();
        expect(subSubcategoryText?.trim()).toContain(expectedSubSubcategoriesClima[k].trim());
      }
      console.log(`  ✓ Se encontraron las 2 sub-subcategorías de Climatización correctamente`);
      
      // Regresar a la lista de subcategorías de Servicios Especializados
      console.log(`  ✓ Regresando a Servicios Especializados...`);
      await page.goBack();
      await page.waitForTimeout(2000);
      
      // Validar sub-subcategorías de Infraestructura
      console.log(`  ✓ Haciendo clic en Infraestructura para validar sus subcategorías...`);
      const infraestructuraButton = page.locator('button').filter({ hasText: 'Infraestructura' });
      await infraestructuraButton.click();
      await page.waitForTimeout(2000);
      
      const subSubcategoriesInfra = page.locator('button p.text-neutral-800');
      const subSubcategoryCountInfra = await subSubcategoriesInfra.count();
      expect(subSubcategoryCountInfra).toBe(6);
      
      const expectedSubSubcategoriesInfra = [
        'Grúas y montaje',
        'Remolques',
        'Generadores (Electricidad/Luz)',
        'Vallas y gradas',
        'Toldos',
        'Pistas y entarimado'
      ];
      
      for (let k = 0; k < expectedSubSubcategoriesInfra.length; k++) {
        const subSubcategoryText = await subSubcategoriesInfra.nth(k).textContent();
        expect(subSubcategoryText?.trim()).toContain(expectedSubSubcategoriesInfra[k].trim());
      }
      console.log(`  ✓ Se encontraron las 6 sub-subcategorías de Infraestructura correctamente`);
    }
    
    // Regresar al home para probar la siguiente categoría
    console.log(`  ✓ Regresando al home...`);
    await page.goto('https://staging.fiestamas.com');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log(`  ✓ Categoría ${expectedCategories[i]} completada\n`);
  }
});
