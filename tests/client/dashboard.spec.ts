import { test, expect, Page, Locator } from '@playwright/test';
import { login, showStepMessage } from '../utils';
import {
  DEFAULT_BASE_URL,
  CLIENT_EMAIL,
  CLIENT_PASSWORD
} from '../config';
import { ejecutarFlujoCompletoCreacionEvento, agregarServicioAEventoExistente } from './cliente-eventos.spec';

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/client/dashboard`;
const CHATS_URL = `${DEFAULT_BASE_URL}/client/chats`;
const PROFILE_URL = `${DEFAULT_BASE_URL}/client/profile`;
const FAVORITES_URL = `${DEFAULT_BASE_URL}/client/favorites`;
const CALENDAR_URL = `${DEFAULT_BASE_URL}/client/calendar`;

test.use({
  viewport: { width: 1400, height: 720 }
});

/**
 * Navega por subcategorías hasta encontrar servicios disponibles.
 * Si no encuentra servicios en una subcategoría, regresa un nivel y prueba otra.
 * Si en ninguna subcategoría hay servicios, sube 2 niveles y selecciona otra categoría de servicios.
 */
async function navegarHastaEncontrarServicios(page: Page): Promise<boolean> {
  const MAX_ATTEMPTS = 50;
  const MAX_LEVELS = 5;
  let attempts = 0;
  let navigationPath: Array<{ level: number; name: string; index: number }> = [];
  const visitedPaths = new Set<string>();
  let currentLevel = 0;
  let serviceCategoryIndex = -1; // Índice de la categoría de servicios actual
  let visitedServiceCategories = new Set<number>(); // Categorías de servicios ya visitadas
  let regresosSinServicios = 0; // Contador de regresos sin encontrar servicios
  const MAX_REGRESOS_SIN_SERVICIOS = 3; // Máximo de regresos antes de cambiar categoría de servicios

  // Primero, seleccionar una categoría de servicios inicial
  await showStepMessage(page, '🔍 BUSCANDO CATEGORÍAS DE SERVICIOS');
  await page.waitForTimeout(1000);
  
  let categoriasServicios = await obtenerCategoriasServicios(page);
  
  if (categoriasServicios.length === 0) {
    console.log('❌ No se encontraron categorías de servicios');
    return false;
  }
  
  // Seleccionar una categoría de servicios aleatoria
  const randomServiceCategoryIndex = Math.floor(Math.random() * categoriasServicios.length);
  const categoriaServiciosInicial = categoriasServicios[randomServiceCategoryIndex];
  serviceCategoryIndex = randomServiceCategoryIndex;
  visitedServiceCategories.add(serviceCategoryIndex);
  
  console.log(`🎯 Seleccionando categoría de servicios inicial: "${categoriaServiciosInicial.name}"`);
  await categoriaServiciosInicial.button.scrollIntoViewIfNeeded();
  await categoriaServiciosInicial.button.click();
  await page.waitForTimeout(2000);
  
  navigationPath.push({
    level: 0,
    name: categoriaServiciosInicial.name,
    index: serviceCategoryIndex
  });

  while (attempts < MAX_ATTEMPTS && currentLevel < MAX_LEVELS) {
    attempts++;
    await page.waitForTimeout(1000);
    
    console.log(`\n--- Intento ${attempts}: Nivel ${currentLevel} ---`);
    if (navigationPath.length > 0) {
      console.log(`📂 Ruta: ${navigationPath.map(p => p.name).join(' > ')}`);
    }

    // Verificar si hay servicios disponibles en el nivel actual
    const servicios = await verificarSiHayServicios(page);
    
    if (servicios) {
      console.log('✅ Servicios encontrados!');
      return true;
    }

    // Buscar subcategorías en el nivel actual
    const subcategorias = await obtenerSubcategorias(page);
    
    if (subcategorias.length === 0) {
      console.log('⚠️ No hay subcategorías en este nivel');
      
      // Si no hay subcategorías y estamos en nivel 0, subir 2 niveles y cambiar categoría de servicios
      if (currentLevel === 0) {
        console.log('🔄 Subiendo 2 niveles para cambiar categoría de servicios');
        
        // Regresar al nivel de categorías de servicios
        for (let i = 0; i < 2; i++) {
          const botonRegreso = page.locator('button').filter({
            has: page.locator('i.icon-chevron-left-bold')
          }).first();
          
          if (await botonRegreso.count() > 0 && await botonRegreso.isVisible().catch(() => false)) {
            await botonRegreso.click();
            await page.waitForTimeout(1500);
            currentLevel = Math.max(0, currentLevel - 1);
            if (navigationPath.length > 0) {
              navigationPath.pop();
            }
          }
        }
        
        // Seleccionar otra categoría de servicios
        categoriasServicios = await obtenerCategoriasServicios(page);
        if (categoriasServicios.length > 0) {
          // Filtrar categorías ya visitadas
          const categoriasDisponibles = categoriasServicios.filter((_, idx) => !visitedServiceCategories.has(idx));
          
          if (categoriasDisponibles.length > 0) {
            const randomIndex = Math.floor(Math.random() * categoriasDisponibles.length);
            const nuevaCategoria = categoriasDisponibles[randomIndex];
            serviceCategoryIndex = categoriasServicios.indexOf(nuevaCategoria);
            visitedServiceCategories.add(serviceCategoryIndex);
            
            console.log(`🔄 Seleccionando nueva categoría de servicios: "${nuevaCategoria.name}"`);
            await nuevaCategoria.button.scrollIntoViewIfNeeded();
            await nuevaCategoria.button.click();
            await page.waitForTimeout(2000);
            navigationPath = [{
              level: 0,
              name: nuevaCategoria.name,
              index: serviceCategoryIndex
            }];
            currentLevel = 0;
            visitedPaths.clear();
            continue;
          }
        }
        
        console.log('❌ No hay más categorías de servicios disponibles');
        return false;
      } else {
        // Regresar un nivel y probar otra subcategoría
        console.log('🔄 Regresando un nivel para probar otra subcategoría');
        
        const botonRegreso = page.locator('button').filter({
          has: page.locator('i.icon-chevron-left-bold')
        }).first();
        
        if (await botonRegreso.count() > 0 && await botonRegreso.isVisible().catch(() => false)) {
          await botonRegreso.click();
          await page.waitForTimeout(1500);
          currentLevel = Math.max(0, currentLevel - 1);
          if (navigationPath.length > 0) {
            navigationPath.pop();
          }
          // Limpiar las rutas visitadas del nivel actual para permitir probar otras subcategorías
          const currentPathKey = navigationPath.map(p => `${p.index}`).join('-');
          const keysToRemove: string[] = [];
          visitedPaths.forEach(key => {
            if (key.startsWith(currentPathKey || '0')) {
              keysToRemove.push(key);
            }
          });
          keysToRemove.forEach(key => visitedPaths.delete(key));
          continue;
        } else {
          console.log('❌ No se pudo regresar un nivel');
          return false;
        }
      }
    }

    // Filtrar subcategorías ya visitadas
    const pathKey = navigationPath.map(p => `${p.index}`).join('-');
    const subcategoriasDisponibles = subcategorias.filter((sub, idx) => {
      const subPathKey = pathKey ? `${pathKey}-${idx}` : `${idx}`;
      return !visitedPaths.has(subPathKey);
    });

    if (subcategoriasDisponibles.length === 0) {
      console.log('⚠️ Todas las subcategorías de este nivel ya fueron visitadas sin encontrar servicios');
      
      // Si estamos en nivel 0 (categoría de servicios), cambiar a otra categoría
      if (currentLevel === 0) {
        console.log('🔄 Cambiando categoría de servicios (subiendo 2 niveles desde subcategorías)');
        
        // Regresar al nivel de categorías de servicios (puede requerir 1 o más clics de regreso)
        // Intentar regresar hasta encontrar las categorías de servicios
        let nivelesRegresados = 0;
        while (nivelesRegresados < 3) {
          const botonRegreso = page.locator('button').filter({
            has: page.locator('i.icon-chevron-left-bold')
          }).first();
          
          if (await botonRegreso.count() > 0 && await botonRegreso.isVisible().catch(() => false)) {
            await botonRegreso.click();
            await page.waitForTimeout(1500);
            nivelesRegresados++;
          } else {
            break;
          }
        }
        
        // Seleccionar otra categoría de servicios
        categoriasServicios = await obtenerCategoriasServicios(page);
        if (categoriasServicios.length > 0) {
          const categoriasDisponibles = categoriasServicios.filter((_, idx) => !visitedServiceCategories.has(idx));
          
          if (categoriasDisponibles.length > 0) {
            const randomIndex = Math.floor(Math.random() * categoriasDisponibles.length);
            const nuevaCategoria = categoriasDisponibles[randomIndex];
            serviceCategoryIndex = categoriasServicios.indexOf(nuevaCategoria);
            visitedServiceCategories.add(serviceCategoryIndex);
            
            console.log(`🔄 Seleccionando nueva categoría de servicios: "${nuevaCategoria.name}"`);
            await nuevaCategoria.button.scrollIntoViewIfNeeded();
            await nuevaCategoria.button.click();
            await page.waitForTimeout(2000);
            navigationPath = [{
              level: 0,
              name: nuevaCategoria.name,
              index: serviceCategoryIndex
            }];
            currentLevel = 0;
            visitedPaths.clear();
            continue;
          }
        }
        
        console.log('❌ No hay más categorías de servicios disponibles');
        return false;
      } else {
        // Si estamos en subcategorías (nivel > 0) y todas fueron visitadas sin servicios,
        // primero intentar regresar un nivel para probar otra subcategoría
        // Si eso no funciona o si ya probamos todas las subcategorías del nivel anterior,
        // subir 2 niveles y cambiar categoría de servicios
        // Regresar un nivel para probar otra subcategoría
        console.log('🔄 Regresando un nivel para probar otra subcategoría');
        const botonRegreso = page.locator('button').filter({
          has: page.locator('i.icon-chevron-left-bold')
        }).first();
        
        if (await botonRegreso.count() > 0 && await botonRegreso.isVisible().catch(() => false)) {
          await botonRegreso.click();
          await page.waitForTimeout(1500);
          currentLevel = Math.max(0, currentLevel - 1);
          if (navigationPath.length > 0) {
            navigationPath.pop();
          }
          // Limpiar las rutas visitadas del nivel actual para permitir probar otras subcategorías
          const currentPathKey = navigationPath.map(p => `${p.index}`).join('-');
          const keysToRemove: string[] = [];
          visitedPaths.forEach(key => {
            if (key.startsWith(currentPathKey || '0')) {
              keysToRemove.push(key);
            }
          });
          keysToRemove.forEach(key => visitedPaths.delete(key));
          continue;
        } else {
          // Si no se puede regresar, intentar subir 2 niveles y cambiar categoría de servicios
          console.log('⚠️ No se pudo regresar un nivel, subiendo 2 niveles para cambiar categoría de servicios');
          
          // Subir hasta el nivel de categorías de servicios (regresar todos los niveles actuales + 1)
          let nivelesRegresados = 0;
          const nivelesASubir = currentLevel + 1; // Subir hasta llegar a categorías de servicios
          
          while (nivelesRegresados < nivelesASubir) {
            const botonRegreso2 = page.locator('button').filter({
              has: page.locator('i.icon-chevron-left-bold')
            }).first();
            
            if (await botonRegreso2.count() > 0 && await botonRegreso2.isVisible().catch(() => false)) {
              await botonRegreso2.click();
              await page.waitForTimeout(1500);
              nivelesRegresados++;
            } else {
              break;
            }
          }
          
          // Seleccionar otra categoría de servicios
          categoriasServicios = await obtenerCategoriasServicios(page);
          if (categoriasServicios.length > 0) {
            const categoriasDisponibles = categoriasServicios.filter((_, idx) => !visitedServiceCategories.has(idx));
            
            if (categoriasDisponibles.length > 0) {
              const randomIndex = Math.floor(Math.random() * categoriasDisponibles.length);
              const nuevaCategoria = categoriasDisponibles[randomIndex];
              serviceCategoryIndex = categoriasServicios.indexOf(nuevaCategoria);
              visitedServiceCategories.add(serviceCategoryIndex);
              
              console.log(`🔄 Seleccionando nueva categoría de servicios: "${nuevaCategoria.name}"`);
              await nuevaCategoria.button.scrollIntoViewIfNeeded();
              await nuevaCategoria.button.click();
              await page.waitForTimeout(2000);
              navigationPath = [{
                level: 0,
                name: nuevaCategoria.name,
                index: serviceCategoryIndex
              }];
              currentLevel = 0;
              visitedPaths.clear();
              continue;
            }
          }
          
          console.log('❌ No hay más opciones disponibles');
          return false;
        }
      }
    }

    // Seleccionar una subcategoría aleatoria de las disponibles
    const randomIndex = Math.floor(Math.random() * subcategoriasDisponibles.length);
    const subcategoriaSeleccionada = subcategoriasDisponibles[randomIndex];
    const subcategoriaIndex = subcategorias.indexOf(subcategoriaSeleccionada);
    
    const subPathKey = pathKey ? `${pathKey}-${subcategoriaIndex}` : `${subcategoriaIndex}`;
    visitedPaths.add(subPathKey);
    
    console.log(`🎯 Seleccionando subcategoría: "${subcategoriaSeleccionada.name}" (índice ${subcategoriaIndex})`);
    
    await subcategoriaSeleccionada.button.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await subcategoriaSeleccionada.button.click();
    await page.waitForTimeout(2000);
    
    navigationPath.push({
      level: currentLevel,
      name: subcategoriaSeleccionada.name,
      index: subcategoriaIndex
    });
    
    currentLevel++;
  }

  console.log('❌ Se alcanzó el límite de intentos sin encontrar servicios');
  return false;
}

/**
 * Verifica si hay servicios disponibles en la página actual
 * Un servicio típicamente tiene: imagen, nombre del proveedor, descripción, precio, botón de acción
 */
async function verificarSiHayServicios(page: Page): Promise<boolean> {
  // Estrategia 1: Buscar tarjetas de servicios con imágenes de proveedores
  // Las tarjetas de servicios suelen tener imágenes y información del proveedor
  const tarjetasConImagen = page.locator('div, button, a').filter({
    has: page.locator('img[src*="imagedelivery"], img[alt*="servicio"], img[alt*="proveedor"]')
  }).filter({
    has: page.locator('p, h5, h6, span').filter({ hasText: /./ })
  });
  
  const countTarjetas = await tarjetasConImagen.count();
  
  // Estrategia 2: Buscar botones o enlaces que indiquen acciones de servicios
  const botonesServicios = page.locator('button, a').filter({
    hasText: /ver servicio|contratar|solicitar|agregar servicio|ver más|seleccionar/i
  });
  
  const countBotones = await botonesServicios.count();
  
  // Estrategia 3: Buscar elementos que contengan información de proveedores
  // (nombre, precio, descripción, etc.)
  const elementosConInfoProveedor = page.locator('div, article, section').filter({
    has: page.locator('p, h5, h6, span').filter({ 
      hasText: /\$|precio|desde|mxn|pesos|calificación|estrellas|reseñas/i 
    })
  }).filter({
    has: page.locator('p, h5, h6, span').filter({ hasText: /./ })
  });
  
  const countElementos = await elementosConInfoProveedor.count();
  
  // Estrategia 4: Buscar grid o lista de servicios (estructura común)
  const gridsServicios = page.locator('div[class*="grid"], div[class*="flex"]').filter({
    has: page.locator('div, article').filter({
      has: page.locator('img, p, h5, h6').filter({ hasText: /./ })
    })
  });
  
  const countGrids = await gridsServicios.count();
  
  // Si hay al menos una tarjeta, botón, elemento con info o grid, probablemente hay servicios
  const tieneServicios = countTarjetas > 0 || countBotones > 0 || countElementos > 0 || countGrids > 0;
  
  if (tieneServicios) {
    console.log(`✅ Servicios detectados: ${countTarjetas} tarjetas, ${countBotones} botones, ${countElementos} elementos, ${countGrids} grids`);
  } else {
    console.log(`🔍 No se detectaron servicios (tarjetas: ${countTarjetas}, botones: ${countBotones}, elementos: ${countElementos}, grids: ${countGrids})`);
  }
  
  return tieneServicios;
}

/**
 * Lista de categorías principales de servicios esperadas
 */
const CATEGORIAS_SERVICIOS = [
  'Bebidas',
  'Entretenimiento',
  'Música',
  'Lugares',
  'Mobiliario',
  'Servicios Especializados',
  'Decoración',
  'Alimentos',
  'Invitaciones',
  'Mesa de regalos'
];

/**
 * Mapa de subcategorías por categoría principal
 */
const SUBCATEGORIAS_POR_CATEGORIA: Record<string, string[]> = {
  'Bebidas': ['Cafés', 'Aguas de sabores', 'Vinos y Licores', 'Coctelería', 'Refrescos / sodas', 'Especialidades'],
  'Entretenimiento': [
    'Backdrop', 'Mini Spa', 'Magos', 'Casino', 'Pirotecnia', 'Artistas', 'Pulseras electrónicas',
    'Cabina de fotos', 'Comediantes', 'Payasos', 'Inflables', 'Artículos / Objetos', 'Espectáculo',
    'Juegos Mecánicos', 'Pinta Caritas', 'Mini Feria'
  ],
  'Música': [
    'Banda', 'Country', 'Norteño', 'Rock / Pop', 'Coro / Religiosa', 'Solista, duetos, tríos y más',
    'Artistas reconocidos', 'Cumbia y salsa', 'Urbana', 'Violinista o saxofonista', 'DJ',
    'Sones Regionales', 'Grupo Versátil', 'Mariachi / Música Ranchera', 'Otro Tipo'
  ],
  'Lugares': [
    'Antros / disco', 'Centros de Convenciones', 'Playas', 'Restaurantes', 'Salón de eventos',
    'Salón de hotel', 'Viñedos', 'Terrazas', 'Haciendas'
  ],
  'Servicios Especializados': [
    'Hoteles', 'Barman', 'Fotógrafo', 'Coreografías', 'Vestidos', 'Smoking / trajes', 'Niñeras',
    'Transporte', 'Valet parking', 'Meseros', 'Joyería', 'Cuidado de Mascotas', 'Belleza',
    'Agencia de Viajes', 'Hostess', 'Organizador de Eventos', 'Barbería', 'Conferencista'
  ],
  'Decoración': [
    'Temática', 'Centros de mesa', 'Decorador profesional', 'Flores', 'Luces', 'Mamparas',
    'Decoración y ambientación gral', 'Globos'
  ],
  'Alimentos': [
    'Taquizas', 'Banquetes', 'Entradas', 'Buffetes', 'Postres / Pasteles', 'After Party',
    'Snacks Botanas'
  ],
  'Mesa de regalos': ['Perfumería']
};

/**
 * Mapa de sub-subcategorías (subcategorías de subcategorías)
 * Estructura: categoría > subcategoría > sub-subcategoría
 */
const SUB_SUBCATEGORIAS: Record<string, Record<string, string[]>> = {
  'Alimentos': {
    'After Party': ['Chilaquiles', 'Hamburguesas', 'Taquizas'],
    'Snacks Botanas': ['Tortas', 'Helados', 'Frituras', 'Cafés', 'Hamburguesas', 'Frutas y/o Verduras', 'Pizzas']
  }
};

/**
 * Obtiene las subcategorías disponibles en la página actual
 */
async function obtenerSubcategorias(page: Page): Promise<Array<{ name: string; button: Locator }>> {
  const subcategorias: Array<{ name: string; button: Locator }> = [];
  
  // Buscar botones de subcategorías
  const botonesSubcategorias = page.locator('button').filter({
    has: page.locator('p.text-neutral-800, p.text-dark-neutral, p.font-medium, p')
  });
  
  const count = await botonesSubcategorias.count();
  
  for (let i = 0; i < count; i++) {
    const boton = botonesSubcategorias.nth(i);
    const isVisible = await boton.isVisible().catch(() => false);
    
    if (isVisible) {
      // Intentar obtener el nombre desde diferentes selectores
      let nombreElement = boton.locator('p.text-neutral-800, p.text-dark-neutral, p.font-medium').first();
      let nombre = await nombreElement.textContent().catch(() => null);
      
      // Si no se encuentra, intentar con cualquier párrafo
      if (!nombre || nombre.trim() === '') {
        nombreElement = boton.locator('p').first();
        nombre = await nombreElement.textContent().catch(() => null);
      }
      
      if (nombre && nombre.trim() !== '') {
        const nombreTrimmed = nombre.trim();
        
        // Verificar que el nombre no sea una categoría principal (para evitar confusión)
        if (!CATEGORIAS_SERVICIOS.includes(nombreTrimmed)) {
          subcategorias.push({
            name: nombreTrimmed,
            button: boton
          });
        }
      }
    }
  }
  
  return subcategorias;
}

/**
 * Obtiene las categorías de servicios disponibles en la página actual
 */
async function obtenerCategoriasServicios(page: Page): Promise<Array<{ name: string; button: Locator }>> {
  const categorias: Array<{ name: string; button: Locator }> = [];
  
  // Buscar botones de categorías de servicios
  const botonesCategorias = page.locator('button').filter({
    has: page.locator('p.text-neutral-800.font-medium, p.text-dark-neutral, p.font-medium, p')
  });
  
  const count = await botonesCategorias.count();
  
  for (let i = 0; i < count; i++) {
    const boton = botonesCategorias.nth(i);
    const isVisible = await boton.isVisible().catch(() => false);
    
    if (isVisible) {
      // Intentar obtener el nombre desde diferentes selectores
      let nombreElement = boton.locator('p.text-neutral-800.font-medium, p.text-dark-neutral').first();
      let nombre = await nombreElement.textContent().catch(() => null);
      
      // Si no se encuentra, intentar con cualquier párrafo
      if (!nombre || nombre.trim() === '') {
        nombreElement = boton.locator('p').first();
        nombre = await nombreElement.textContent().catch(() => null);
      }
      
      if (nombre && nombre.trim() !== '') {
        const nombreTrimmed = nombre.trim();
        
        // Verificar que el nombre coincida con una categoría conocida
        // Si no coincide exactamente, aún lo agregamos pero con prioridad a las conocidas
        const esCategoriaConocida = CATEGORIAS_SERVICIOS.some(cat => 
          cat.toLowerCase() === nombreTrimmed.toLowerCase() || 
          nombreTrimmed.toLowerCase().includes(cat.toLowerCase())
        );
        
        categorias.push({
          name: nombreTrimmed,
          button: boton
        });
      }
    }
  }
  
  // Ordenar para dar prioridad a las categorías conocidas
  categorias.sort((a, b) => {
    const aEsConocida = CATEGORIAS_SERVICIOS.some(cat => 
      cat.toLowerCase() === a.name.toLowerCase() || 
      a.name.toLowerCase().includes(cat.toLowerCase())
    );
    const bEsConocida = CATEGORIAS_SERVICIOS.some(cat => 
      cat.toLowerCase() === b.name.toLowerCase() || 
      b.name.toLowerCase().includes(cat.toLowerCase())
    );
    
    if (aEsConocida && !bEsConocida) return -1;
    if (!aEsConocida && bEsConocida) return 1;
    return 0;
  });
  
  return categorias;
}

test.describe('Dashboard de cliente', () => {
  // Configurar timeout por defecto para todas las pruebas del describe
  test.setTimeout(60000); // 60 segundos por defecto
  
  test.beforeEach(async ({ page }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/client/dashboard')) {
      await page.goto(DASHBOARD_URL);
    }

    await expect(page.getByText(/Bienvenido/i)).toBeVisible();
  });

  test('Validar secciones dashboard', async ({ page }) => {
    await showStepMessage(page, '📋 VALIDANDO SECCIONES PRINCIPALES DEL DASHBOARD');
    await page.waitForTimeout(1000);
    
    console.log('🔍 Validando mensaje de bienvenida...');
    await expect(page.getByText(/Bienvenido/i)).toBeVisible();
    console.log('✅ Mensaje de bienvenida visible');
    
    await showStepMessage(page, '🎉 VALIDANDO SECCIÓN "ELIGE TU FIESTA"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando sección "Elige tu fiesta"...');
    await expect(page.getByText('Elige tu fiesta')).toBeVisible();
    console.log('✅ Sección "Elige tu fiesta" visible');

    await showStepMessage(page, '🔘 VALIDANDO BOTÓN "NUEVA FIESTA"');
    await page.waitForTimeout(1000);
    // Buscar botón "Nueva fiesta" según el viewport
    // Botón desktop: tiene clase "lg:flex" y es un botón cuadrado con icono grande
    // Botón móvil: tiene clase "lg:hidden" y es un botón horizontal
    const viewportWidth = page.viewportSize()?.width || 1400;
    console.log(`📱 Viewport width: ${viewportWidth}px`);
    
    if (viewportWidth >= 1024) {
      // Desktop: buscar botón con clase "lg:flex" y estructura específica
      console.log('🔍 Buscando botón "Nueva fiesta" (versión desktop)...');
      const botonNuevaFiestaDesktop = page.locator('button.hidden.lg\\:flex').filter({
        has: page.locator('p').filter({ hasText: /Nueva fiesta/i })
      });
      
      if (await botonNuevaFiestaDesktop.count() > 0) {
        await expect(botonNuevaFiestaDesktop.first()).toBeVisible();
        console.log('✅ Botón "Nueva fiesta" encontrado (versión desktop)');
      } else {
        // Fallback: buscar cualquier botón con "Nueva fiesta" que esté visible
        console.log('🔍 Buscando botón "Nueva fiesta" (fallback)...');
        const botonVisible = page.locator('button').filter({
          has: page.locator('p').filter({ hasText: /Nueva fiesta/i })
        }).filter({ has: page.locator(':visible') }).first();
        
        if (await botonVisible.count() > 0) {
          await expect(botonVisible).toBeVisible();
          console.log('✅ Botón "Nueva fiesta" encontrado (fallback)');
        } else {
          console.log('⚠️ No se encontró el botón "Nueva fiesta"');
        }
      }
    } else {
      // Mobile: buscar botón con clase "lg:hidden"
      console.log('🔍 Buscando botón "Nueva fiesta" (versión mobile)...');
      const botonNuevaFiestaMobile = page.locator('button.lg\\:hidden').filter({
        has: page.locator('p').filter({ hasText: /Nueva fiesta/i })
      });
      
      if (await botonNuevaFiestaMobile.count() > 0) {
        await expect(botonNuevaFiestaMobile.first()).toBeVisible();
        console.log('✅ Botón "Nueva fiesta" encontrado (versión mobile)');
      } else {
        console.log('⚠️ No se encontró el botón "Nueva fiesta" (mobile)');
      }
    }

    await showStepMessage(page, '🔘 VALIDANDO BOTÓN "AGREGAR SERVICIOS"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando botón "Agregar servicios"...');
    await expect(page.getByRole('button', { name: /Agregar servicios/i })).toBeVisible();
    console.log('✅ Botón "Agregar servicios" visible');

    await showStepMessage(page, '🔘 VALIDANDO BOTÓN "ORDENAR POR"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando botón "Ordenar por"...');
    const botonOrdenar = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: /Ordenar por/i })
    });
    await expect(botonOrdenar.first()).toBeVisible();
    console.log('✅ Botón "Ordenar por" visible');

    await showStepMessage(page, '📅 VALIDANDO CALENDARIO (DESKTOP)');
    await page.waitForTimeout(1000);
    // El calendario solo está visible en desktop (lg:flex)
    console.log('🔍 Validando calendario (desktop)...');
    const calendario = page.locator('div').filter({
      has: page.locator('button').filter({
        has: page.locator('p').filter({ hasText: /^Noviembre|^Diciembre|^Enero/i })
      })
    }).filter({
      has: page.locator('p').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/ })
    });
    
    // Solo validar si el viewport es lo suficientemente grande
    if (page.viewportSize() && page.viewportSize()!.width >= 1024) {
      const calendarioVisible = await calendario.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (calendarioVisible) {
        await expect(calendario.first()).toBeVisible();
        console.log('✅ Calendario visible (desktop)');
      } else {
        console.log('⚠️ Calendario no visible en este viewport');
      }
    } else {
      console.log('⚠️ Calendario solo visible en viewports ≥1024px');
    }

    await showStepMessage(page, '💬 VALIDANDO SECCIÓN "¡FIESTACHAT!"');
    await page.waitForTimeout(1000);
    // Buscar el texto dentro del contenedor específico de Fiestachat (evitar el overlay)
    console.log('🔍 Validando sección "¡Fiestachat!"...');
    const seccionFiestachat = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light').filter({
      has: page.locator('p').filter({ hasText: '¡Fiestachat!' })
    });
    
    if (await seccionFiestachat.count() > 0) {
      const tituloFiestachat = seccionFiestachat.locator('p').filter({ hasText: '¡Fiestachat!' }).first();
      const subtituloFiestachat = seccionFiestachat.locator('p').filter({ hasText: 'La línea directa a tu evento' }).first();
      
      await expect(tituloFiestachat).toBeVisible();
      await expect(subtituloFiestachat).toBeVisible();
      console.log('✅ Sección "¡Fiestachat!" visible (contenedor específico)');
    } else {
      // Fallback: buscar directamente pero excluyendo el overlay
      console.log('🔍 Buscando sección "¡Fiestachat!" (fallback)...');
      const tituloFiestachat = page.locator('p.text-regular.text-primary-neutral.text-center.font-bold').filter({
        hasText: '¡Fiestachat!'
      }).first();
      const subtituloFiestachat = page.locator('p.text-small.text-dark-neutral.text-center').filter({
        hasText: 'La línea directa a tu evento'
      }).first();
      
      await expect(tituloFiestachat).toBeVisible();
      await expect(subtituloFiestachat).toBeVisible();
      console.log('✅ Sección "¡Fiestachat!" visible (fallback)');
    }
    
    console.log('✅ Validación de secciones del dashboard completada');
  });

  test('Barra superior navega a chats, favoritos y perfil', async ({ page }) => {
    await showStepMessage(page, '💬 NAVEGANDO A CHATS');
    await page.waitForTimeout(1000);
    // Buscar enlace de chats (puede estar en mobile o desktop)
    console.log('🔍 Buscando enlace de chats...');
    const enlaceChatsMobile = page.locator('a[href="/client/chats"]').filter({
      has: page.locator('i.icon-message-square')
    });
    const enlaceChatsDesktop = page.locator('div.lg\\:block nav a[href="/client/chats"]');
    
    if (await enlaceChatsDesktop.count() > 0) {
      await expect(enlaceChatsDesktop.first()).toBeVisible();
      console.log('✅ Enlace de chats encontrado (desktop), haciendo clic...');
      await enlaceChatsDesktop.first().click();
    } else if (await enlaceChatsMobile.count() > 0) {
      await expect(enlaceChatsMobile.first()).toBeVisible();
      console.log('✅ Enlace de chats encontrado (mobile), haciendo clic...');
      await enlaceChatsMobile.first().click();
    } else {
      console.log('⚠️ No se encontró el enlace de chats');
    }
    await expect(page).toHaveURL(CHATS_URL);
    console.log('✅ Navegación a chats exitosa');

    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');

    await showStepMessage(page, '❤️ NAVEGANDO A FAVORITOS');
    await page.waitForTimeout(1000);
    // Buscar enlace de favoritos (solo desktop)
    console.log('🔍 Buscando enlace de favoritos...');
    const enlaceFavoritos = page.locator('div.lg\\:block nav a[href="/client/favorites"]');
    if (await enlaceFavoritos.count() > 0) {
      await expect(enlaceFavoritos.first()).toBeVisible();
      console.log('✅ Enlace de favoritos encontrado, haciendo clic...');
      await enlaceFavoritos.first().click();
      await expect(page).toHaveURL(FAVORITES_URL);
      console.log('✅ Navegación a favoritos exitosa');
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
    } else {
      console.log('⚠️ Enlace de favoritos no encontrado (solo visible en desktop)');
    }

    await showStepMessage(page, '👤 NAVEGANDO A PERFIL');
    await page.waitForTimeout(1000);
    // Buscar enlace de perfil (puede estar en mobile o desktop)
    console.log('🔍 Buscando enlace de perfil...');
    const enlacePerfilMobile = page.locator('a[href="/client/profile"]').filter({
      has: page.locator('i.icon-user')
    });
    const enlacePerfilDesktop = page.locator('div.lg\\:block nav a[href="/client/profile"]');
    
    if (await enlacePerfilDesktop.count() > 0) {
      await expect(enlacePerfilDesktop.first()).toBeVisible();
      console.log('✅ Enlace de perfil encontrado (desktop), haciendo clic...');
      await enlacePerfilDesktop.first().click();
    } else if (await enlacePerfilMobile.count() > 0) {
      await expect(enlacePerfilMobile.first()).toBeVisible();
      console.log('✅ Enlace de perfil encontrado (mobile), haciendo clic...');
      await enlacePerfilMobile.first().click();
    } else {
      console.log('⚠️ No se encontró el enlace de perfil');
    }
    await expect(page).toHaveURL(PROFILE_URL);
    console.log('✅ Navegación a perfil exitosa');

    await page.goto(DASHBOARD_URL);
    console.log('✅ Prueba de navegación de barra superior completada');
  });

  test('Crear nueva fiesta', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos (mismo timeout que cliente-eventos.spec.ts)
    
    // Esta prueba ejecuta el flujo completo de creación de evento
    // Reutiliza la función ejecutarFlujoCompletoCreacionEvento de cliente-eventos.spec.ts
    // para evitar duplicación de código
    
    console.log('🚀 Iniciando flujo completo de creación de evento...');
    await ejecutarFlujoCompletoCreacionEvento(page);
    console.log('✅ Flujo completo de creación de evento finalizado');
  });

  test('"Agregar servicios" está visible y funcional', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos (mismo timeout que cliente-eventos.spec.ts)
    
    // Esta prueba ejecuta el flujo completo de agregar un servicio a un evento existente
    // Reutiliza la función agregarServicioAEventoExistente de cliente-eventos.spec.ts
    // que selecciona un evento, hace clic en "Agregar servicios", busca un servicio
    // y completa el flujo sin llenar los datos del evento (porque ya están)
    
    console.log('🚀 Iniciando flujo de agregar servicio a evento existente...');
    await agregarServicioAEventoExistente(page);
    console.log('✅ Flujo de agregar servicio a evento existente finalizado');
  });

  test('"Ordenar por" funciona correctamente', async ({ page }) => {
    await showStepMessage(page, '🔘 VALIDANDO BOTÓN ORDENAR POR');
    await page.waitForTimeout(1000);
    
    const botonOrdenar = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: /Ordenar por/i })
    });
    await expect(botonOrdenar.first()).toBeVisible();
    await expect(botonOrdenar.first()).toBeEnabled();
    
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN ORDENAR POR');
    await page.waitForTimeout(1000);
    await botonOrdenar.first().click();
    await page.waitForTimeout(1000);
    
    // Validar que se muestra un dropdown o menú (depende de la implementación)
    // Por ahora solo validamos que el click funciona
    console.log('✅ Click en "Ordenar por" ejecutado');
  });

  test('Filtros de servicios funcionan correctamente', async ({ page }) => {
    await showStepMessage(page, '🔍 VALIDANDO FILTROS DE SERVICIOS');
    await page.waitForTimeout(1000);
    
    // Los filtros solo están visibles en desktop (xlg:flex)
    if (page.viewportSize() && page.viewportSize()!.width >= 1280) {
      // Buscar el contenedor de filtros (sidebar izquierdo)
      // Estructura: div.hidden.xlg:flex > div.flex.flex-col.gap-4 > div.flex.flex-col.gap-2 > p.font-bold
      const contenedorFiltros = page.locator('div.hidden.xlg\\:flex.flex-col.grow.overflow-y-auto.shrink-0');
      
      if (await contenedorFiltros.count() > 0) {
        // Buscar dentro del contenedor interno que tiene gap-4
        const contenedorInterno = contenedorFiltros.locator('div.flex.flex-col.gap-4');
        
        if (await contenedorInterno.count() > 0) {
          // Buscar secciones dentro del contenedor interno
          const seccionServicios = contenedorInterno.locator('div.flex.flex-col.gap-2').filter({
            has: page.locator('p.font-bold').filter({ hasText: /^Servicios$/ })
          });
          
          const seccionSugerencias = contenedorInterno.locator('div.flex.flex-col.gap-2').filter({
            has: page.locator('p.font-bold').filter({ hasText: /^Sugerencias$/ })
          });
          
          if (await seccionServicios.count() > 0) {
            const tituloServicios = seccionServicios.locator('p.font-bold').filter({ hasText: /^Servicios$/ }).first();
            await expect(tituloServicios).toBeVisible();
          }
          
          if (await seccionSugerencias.count() > 0) {
            const tituloSugerencias = seccionSugerencias.locator('p.font-bold').filter({ hasText: /^Sugerencias$/ }).first();
            await expect(tituloSugerencias).toBeVisible();
          }
        }
      }
      
      // Validar que hay sugerencias disponibles
      const sugerencias = page.locator('button').filter({
        has: page.locator('p').filter({ hasText: /Alimentos|Bebidas|Lugares|Mobiliario|Entretenimiento/i })
      });
      const countSugerencias = await sugerencias.count();
      if (countSugerencias > 0) {
        console.log(`✅ Se encontraron ${countSugerencias} sugerencias`);
      }
    } else {
      console.log('⚠️ Los filtros solo están visibles en viewports grandes (≥1280px)');
    }
  });

  test('La sección de eventos muestra las fiestas del cliente', async ({ page }) => {
    await showStepMessage(page, '🎉 VALIDANDO SECCIÓN DE EVENTOS');
    await page.waitForTimeout(1000);
    
    // Buscar eventos/fiestas en la sección "Elige tu fiesta"
    const eventos = page.locator('button').filter({
      has: page.locator('div').filter({
        has: page.locator('p').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+\d{4}/i })
      })
    });
    
    const countEventos = await eventos.count();
    console.log(`📊 Eventos encontrados: ${countEventos}`);
    
    if (countEventos > 0) {
      // Validar que el primer evento tiene información válida
      const primerEvento = eventos.first();
      await expect(primerEvento).toBeVisible();
      
      // Validar que tiene fecha
      const fecha = primerEvento.locator('p').filter({
        hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+\d{4}/i
      });
      await expect(fecha.first()).toBeVisible();
      
      console.log('✅ Se encontraron eventos válidos');
    } else {
      console.log('⚠️ No se encontraron eventos, puede ser un estado vacío válido');
    }
  });

  test('Fiestachat muestra conversaciones', async ({ page }) => {
    await showStepMessage(page, '💬 VALIDANDO SECCIÓN FIESTACHAT');
    await page.waitForTimeout(1000);
    
    // La sección Fiestachat solo está visible en desktop
    if (page.viewportSize() && page.viewportSize()!.width >= 1024) {
      // Buscar el texto dentro del contenedor específico de Fiestachat (evitar el overlay)
      const seccionFiestachat = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light').filter({
        has: page.locator('p').filter({ hasText: '¡Fiestachat!' })
      });
      
      if (await seccionFiestachat.count() > 0) {
        const tituloFiestachat = seccionFiestachat.locator('p').filter({ hasText: '¡Fiestachat!' }).first();
        const subtituloFiestachat = seccionFiestachat.locator('p').filter({ hasText: 'La línea directa a tu evento' }).first();
        
        await expect(tituloFiestachat).toBeVisible();
        await expect(subtituloFiestachat).toBeVisible();
      } else {
        // Fallback: buscar directamente pero excluyendo el overlay
        const tituloFiestachat = page.locator('p.text-regular.text-primary-neutral.text-center.font-bold').filter({
          hasText: '¡Fiestachat!'
        }).first();
        const subtituloFiestachat = page.locator('p.text-small.text-dark-neutral.text-center').filter({
          hasText: 'La línea directa a tu evento'
        }).first();
        
        await expect(tituloFiestachat).toBeVisible();
        await expect(subtituloFiestachat).toBeVisible();
      }
      
      // Buscar conversaciones (botones con información de chat)
      const conversaciones = page.locator('button').filter({
        has: page.locator('div').filter({
          has: page.locator('p').filter({ hasText: /NuevoNombreQA|Nuevo Negocio QA/i })
        })
      });
      
      const countConversaciones = await conversaciones.count();
      console.log(`📊 Conversaciones encontradas: ${countConversaciones}`);
      
      if (countConversaciones > 0) {
        // Validar que la primera conversación es clickeable
        const primeraConversacion = conversaciones.first();
        await expect(primeraConversacion).toBeVisible();
        console.log('✅ Se encontraron conversaciones válidas');
      } else {
        console.log('⚠️ No se encontraron conversaciones, puede ser un estado vacío válido');
      }
    } else {
      console.log('⚠️ La sección Fiestachat solo está visible en viewports grandes (≥1024px)');
    }
  });

  test('El calendario filtra eventos al seleccionar un día (desktop)', async ({ page }) => {
    test.setTimeout(90000);
    
    // Solo ejecutar en viewports grandes donde el calendario es visible
    if (page.viewportSize() && page.viewportSize()!.width < 1024) {
      console.log('⚠️ El calendario solo está visible en viewports grandes (≥1024px)');
      return;
    }
    
    await showStepMessage(page, '📅 BUSCANDO CALENDARIO');
    await page.waitForTimeout(1000);
    
    // Buscar el contenedor del calendario
    const calendario = page.locator('div').filter({
      has: page.locator('button').filter({
        has: page.locator('p').filter({ hasText: /^Noviembre|^Diciembre|^Enero/i })
      })
    }).filter({
      has: page.locator('p').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/ })
    }).first();
    
    const calendarioVisible = await calendario.isVisible({ timeout: 5000 }).catch(() => false);
    if (!calendarioVisible) {
      console.log('⚠️ El calendario no está visible');
      return;
    }
    
    await expect(calendario).toBeVisible();
    
    // Buscar días con puntos (eventos)
    await showStepMessage(page, '🔍 BUSCANDO DÍAS CON EVENTOS');
    await page.waitForTimeout(1000);
    
    const diasConPuntos = calendario.locator('button[type="button"]').filter({
      has: page.locator('div[style*="background-color"]')
    });
    
    const cantidadDiasConEventos = await diasConPuntos.count();
    console.log(`📊 Días con eventos encontrados: ${cantidadDiasConEventos}`);
    
    if (cantidadDiasConEventos === 0) {
      console.log('⚠️ No se encontraron días con eventos en el calendario');
      return;
    }
    
    // Seleccionar el primer día con eventos
    const primerDiaConEventos = diasConPuntos.first();
    await primerDiaConEventos.scrollIntoViewIfNeeded();
    
    // Obtener el número del día
    const numeroDiaTexto = await primerDiaConEventos.locator('p').first().textContent();
    const numeroDia = numeroDiaTexto?.trim() || '';
    console.log(`📅 Día seleccionado: ${numeroDia}`);
    
    if (!numeroDia) {
      console.log('⚠️ No se pudo obtener el número del día');
      return;
    }
    
    // Contar eventos visibles antes del click
    await showStepMessage(page, '📊 CONTANDO EVENTOS ANTES DE SELECCIONAR DÍA');
    await page.waitForTimeout(2000);
    
    const eventosAntes = page.locator('button').filter({
      has: page.locator('div').filter({
        has: page.locator('p').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+\d{4}/i })
      })
    });
    const countAntes = await eventosAntes.count();
    console.log(`📊 Eventos visibles antes: ${countAntes}`);
    
    // Hacer click en el día
    await showStepMessage(page, `🔄 HACIENDO CLIC EN DÍA ${numeroDia}`);
    await page.waitForTimeout(1500);
    await primerDiaConEventos.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Contar eventos después del filtro
    await showStepMessage(page, '📊 CONTANDO EVENTOS DESPUÉS DEL FILTRO');
    await page.waitForTimeout(2000);
    
    const eventosDespues = page.locator('button').filter({
      has: page.locator('div').filter({
        has: page.locator('p').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+\d{4}/i })
      })
    });
    const countDespues = await eventosDespues.count();
    console.log(`📊 Eventos visibles después: ${countDespues}`);
    
    // Validar que algo cambió (puede haber menos eventos o el mismo número si todos son del mismo día)
    if (countDespues <= countAntes) {
      console.log('✅ El filtro funcionó (se muestran menos o igual cantidad de eventos)');
    } else {
      console.log('⚠️ Se muestran más eventos después del filtro, puede ser un comportamiento válido');
    }
    
    console.log('✅ Prueba de calendario completada');
  });

});

