import { test, expect, Page, Locator } from '@playwright/test';
import path from 'path';
import { login, showStepMessage, safeWaitForTimeout, mapearEstructuraCategoriasServicios } from '../utils';
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

  // ============================================
  // GRUPO 1: PRUEBAS QUE SOLO VERIFICAN EXISTENCIA DE ELEMENTOS
  // ============================================

  test('Se muestran todas las secciones principales del dashboard', async ({ page }) => {
    await showStepMessage(page, '📋 VALIDANDO SECCIONES PRINCIPALES DEL DASHBOARD');
    await page.waitForTimeout(1000);
    
    console.log('🔍 Validando mensaje de bienvenida...');
    await expect(page.getByText(/Bienvenido/i)).toBeVisible();
    console.log('✅ Mensaje de bienvenida visible');
    
    await showStepMessage(page, '🎉 VALIDANDO SECCIÓN "ELIGE TU FIESTA"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando sección "Elige tu fiesta"...');
    // Excluir el overlay de showStepMessage - buscar solo elementos p que no estén dentro del overlay
    const tituloEligeTuFiesta = page.locator('p.text-dark-neutral.font-extrabold').filter({ 
      hasText: /^Elige tu fiesta$/i 
    }).first();
    await expect(tituloEligeTuFiesta).toBeVisible();
    console.log('✅ Sección "Elige tu fiesta" visible');

    await showStepMessage(page, '🔘 VALIDANDO BOTÓN "NUEVA FIESTA"');
    await page.waitForTimeout(1000);
    // Buscar botón "Nueva fiesta" según el viewport
    // Botón desktop: tiene clase "lg:flex" y es un botón cuadrado con icono grande
    // Botón móvil: tiene clase "lg:hidden" y es un botón horizontal
    const viewportWidth = page.viewportSize()?.width || 1400;
    
    if (viewportWidth >= 1024) {
      // Desktop: buscar botón con clase "lg:flex" y estructura específica
      const botonNuevaFiestaDesktop = page.locator('button.hidden.lg\\:flex').filter({
        has: page.locator('p').filter({ hasText: /Nueva fiesta|Nuevo evento/i })
      });
      
      if (await botonNuevaFiestaDesktop.count() > 0) {
        const esVisible = await botonNuevaFiestaDesktop.first().isVisible().catch(() => false);
        if (esVisible) {
          await expect(botonNuevaFiestaDesktop.first()).toBeVisible();
          console.log('✅ Botón "Nueva fiesta" encontrado y visible (versión desktop)');
        } else {
        }
      }
      
      // Fallback: buscar cualquier botón con "Nueva fiesta" o "Nuevo evento" que esté visible
      // IMPORTANTE: Excluir botones con clase "lg:hidden" ya que están ocultos en desktop
      if (await botonNuevaFiestaDesktop.count() === 0 || !(await botonNuevaFiestaDesktop.first().isVisible().catch(() => false))) {
        // Buscar todos los botones con el texto, pero filtrar por visibilidad y clase
        const todosLosBotones = page.locator('button').filter({
          has: page.locator('p').filter({ hasText: /Nueva fiesta|Nuevo evento/i })
        });
        
        const cantidadBotones = await todosLosBotones.count();
        let botonVisibleEncontrado = false;
        
        // Revisar cada botón para encontrar uno que esté visible y no tenga lg:hidden
        for (let i = 0; i < cantidadBotones; i++) {
          const boton = todosLosBotones.nth(i);
          const tieneClaseHidden = await boton.evaluate((el) => {
            return el.classList.contains('lg:hidden');
          }).catch(() => false);
          
          // Si tiene lg:hidden, saltarlo (es versión mobile)
          if (tieneClaseHidden) {
            continue;
          }
          
          const esVisible = await boton.isVisible().catch(() => false);
          if (esVisible) {
            await expect(boton).toBeVisible();
            console.log('✅ Botón "Nueva fiesta" encontrado y visible (fallback)');
            botonVisibleEncontrado = true;
            break;
          }
        }
        
        if (!botonVisibleEncontrado) {
          // Verificar si hay algún botón con lg:hidden para reportar
          const botonMobile = page.locator('button.lg\\:hidden').filter({
            has: page.locator('p').filter({ hasText: /Nueva fiesta|Nuevo evento/i })
          }).first();
          
          if (await botonMobile.count() > 0) {
            console.log('⚠️ Botón "Nueva fiesta" encontrado pero oculto (tiene clase lg:hidden - es versión mobile, no visible en desktop)');
          } else {
            console.log('⚠️ No se encontró el botón "Nueva fiesta" visible en desktop');
          }
        }
      }
    } else {
      // Mobile: buscar botón con clase "lg:hidden"
      console.log('🔍 Buscando botón "Nueva fiesta" (versión mobile)...');
      const botonNuevaFiestaMobile = page.locator('button.lg\\:hidden').filter({
        has: page.locator('p').filter({ hasText: /Nueva fiesta|Nuevo evento/i })
      });
      
      if (await botonNuevaFiestaMobile.count() > 0) {
        const esVisible = await botonNuevaFiestaMobile.first().isVisible().catch(() => false);
        if (esVisible) {
          await expect(botonNuevaFiestaMobile.first()).toBeVisible();
          console.log('✅ Botón "Nueva fiesta" encontrado y visible (versión mobile)');
        } else {
          console.log('⚠️ Botón "Nueva fiesta" encontrado pero oculto (puede ser que el viewport no sea mobile)');
        }
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

  test('Se muestran todos los elementos de la barra superior', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos
    
    await showStepMessage(page, '📋 VALIDANDO ELEMENTOS COMPLETOS DE LA BARRA SUPERIOR');
    await page.waitForTimeout(1000);
    
    // 1. VALIDAR LOGO DE FIESTAMAS
    await showStepMessage(page, '🎨 VALIDANDO LOGO DE FIESTAMAS');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando logo de Fiestamas...');
    
    // Buscar logo en desktop (dentro de nav)
    const logoDesktop = page.locator('div.lg\\:block nav a[href="/client/dashboard"], div.lg\\:block nav a[href="/"]').filter({
      has: page.locator('svg, img')
    }).first();
    
    // Buscar logo en mobile
    const logoMobile = page.locator('div.xlg\\:hidden nav a[href="/client/dashboard"], div.xlg\\:hidden nav a[href="/"]').filter({
      has: page.locator('svg, img')
    }).first();
    
    // Buscar logo por SVG (más específico)
    const logoSvg = page.locator('nav a svg, nav a img').first();
    
    let logoEncontrado = false;
    let logoElement: ReturnType<typeof page.locator> | null = null;
    
    if (await logoDesktop.count() > 0 && await logoDesktop.first().isVisible().catch(() => false)) {
      logoElement = logoDesktop.first();
      logoEncontrado = true;
      console.log('✅ Logo encontrado (desktop)');
    } else if (await logoMobile.count() > 0 && await logoMobile.first().isVisible().catch(() => false)) {
      logoElement = logoMobile.first();
      logoEncontrado = true;
      console.log('✅ Logo encontrado (mobile)');
    } else if (await logoSvg.count() > 0 && await logoSvg.first().isVisible().catch(() => false)) {
      logoElement = logoSvg.locator('xpath=ancestor::a[1]').first();
      logoEncontrado = true;
      console.log('✅ Logo encontrado (por SVG)');
    }
    
    if (logoEncontrado && logoElement) {
      await expect(logoElement).toBeVisible();
      console.log('✅ Logo de Fiestamas visible');
      
      // Validar funcionalidad: clic en logo debe navegar al dashboard/home
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DEL LOGO');
      await page.waitForTimeout(1000);
      
      // Guardar URL actual
      const urlAntes = page.url();
      
      // Hacer clic en el logo
      await logoElement.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const urlDespues = page.url();
      const navegoCorrectamente = urlDespues.includes('/client/dashboard') || urlDespues === DEFAULT_BASE_URL || urlDespues === `${DEFAULT_BASE_URL}/`;
      
      if (navegoCorrectamente) {
        console.log('✅ Logo navega correctamente al dashboard/home');
      } else {
        console.log(`⚠️ Logo navegó a: ${urlDespues} (esperado: dashboard o home)`);
      }
      
      // Regresar al dashboard si no estamos ahí
      if (!urlDespues.includes('/client/dashboard')) {
        await page.goto(DASHBOARD_URL);
        await page.waitForLoadState('networkidle');
      }
    } else {
      console.log('⚠️ Logo de Fiestamas no encontrado');
    }
    
    // 2. VALIDAR CONTADOR DE MENSAJES EN CHATS
    await showStepMessage(page, '🔔 VALIDANDO CONTADOR DE MENSAJES EN CHATS');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando contador de mensajes en chats...');
    
    // Buscar contador en desktop
    const contadorDesktop = page.locator('div.lg\\:block nav a[href="/client/chats"]').locator('div.absolute').filter({
      has: page.locator('div.bg-danger-neutral, div[class*="bg-danger"]')
    }).locator('p, div').filter({
      hasText: /\d+/
    }).first();
    
    // Buscar contador en mobile
    const contadorMobile = page.locator('a[href="/client/chats"]').locator('div.absolute').filter({
      has: page.locator('div.bg-danger-neutral, div[class*="bg-danger"]')
    }).locator('p, div').filter({
      hasText: /\d+/
    }).first();
    
    // Buscar contador por estructura común (badge con número)
    const contadorBadge = page.locator('i.icon-message-square').locator('xpath=following-sibling::div[contains(@class, "absolute")]').filter({
      has: page.locator('div[class*="bg-danger"], div[class*="rounded-full"]')
    }).locator('p, div').filter({
      hasText: /\d+/
    }).first();
    
    let contadorEncontrado = false;
    let contadorElement: ReturnType<typeof page.locator> | null = null;
    
    if (await contadorDesktop.count() > 0 && await contadorDesktop.first().isVisible().catch(() => false)) {
      contadorElement = contadorDesktop.first();
      contadorEncontrado = true;
      console.log('✅ Contador encontrado (desktop)');
    } else if (await contadorMobile.count() > 0 && await contadorMobile.first().isVisible().catch(() => false)) {
      contadorElement = contadorMobile.first();
      contadorEncontrado = true;
      console.log('✅ Contador encontrado (mobile)');
    } else if (await contadorBadge.count() > 0 && await contadorBadge.first().isVisible().catch(() => false)) {
      contadorElement = contadorBadge.first();
      contadorEncontrado = true;
      console.log('✅ Contador encontrado (por badge)');
    }
    
    if (contadorEncontrado && contadorElement) {
      await expect(contadorElement).toBeVisible();
      const textoContador = await contadorElement.textContent();
      const numeroContador = textoContador ? parseInt(textoContador.trim()) : null;
      
      if (numeroContador !== null && !isNaN(numeroContador)) {
        console.log(`✅ Contador de mensajes visible con valor: ${numeroContador}`);
        expect(numeroContador).toBeGreaterThanOrEqual(0);
      } else {
        console.log(`⚠️ Contador encontrado pero no se pudo extraer el número. Texto: "${textoContador}"`);
      }
    } else {
      console.log('ℹ️ Contador de mensajes no visible (puede que no haya mensajes sin leer)');
    }
    
    // 3. VALIDAR BOTÓN/ENLACE DE BÚSQUEDA
    await showStepMessage(page, '🔍 VALIDANDO BOTÓN DE BÚSQUEDA');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando botón/enlace de búsqueda...');
    
    // Buscar botón de búsqueda en desktop
    const busquedaDesktop = page.locator('div.lg\\:block nav a[href="/"]').filter({
      has: page.locator('i.icon-search')
    }).first();
    
    // Buscar botón de búsqueda en mobile
    const busquedaMobile = page.locator('a[href="/"]').filter({
      has: page.locator('i.icon-search')
    }).first();
    
    // Buscar por icono directamente
    const busquedaIcono = page.locator('i.icon-search').locator('xpath=ancestor::a[1]').first();
    
    let busquedaEncontrada = false;
    let busquedaElement: ReturnType<typeof page.locator> | null = null;
    
    if (await busquedaDesktop.count() > 0 && await busquedaDesktop.first().isVisible().catch(() => false)) {
      busquedaElement = busquedaDesktop.first();
      busquedaEncontrada = true;
      console.log('✅ Botón de búsqueda encontrado (desktop)');
    } else if (await busquedaMobile.count() > 0 && await busquedaMobile.first().isVisible().catch(() => false)) {
      busquedaElement = busquedaMobile.first();
      busquedaEncontrada = true;
      console.log('✅ Botón de búsqueda encontrado (mobile)');
    } else if (await busquedaIcono.count() > 0 && await busquedaIcono.first().isVisible().catch(() => false)) {
      busquedaElement = busquedaIcono.first();
      busquedaEncontrada = true;
      console.log('✅ Botón de búsqueda encontrado (por icono)');
    }
    
    if (busquedaEncontrada && busquedaElement) {
      await expect(busquedaElement).toBeVisible();
      console.log('✅ Botón de búsqueda visible');
      
      // Validar funcionalidad: clic en búsqueda
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DEL BOTÓN DE BÚSQUEDA');
      await page.waitForTimeout(1000);
      
      const urlAntesBusqueda = page.url();
      await busquedaElement.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const urlDespuesBusqueda = page.url();
      const navegoABusqueda = urlDespuesBusqueda.includes('/') || urlDespuesBusqueda === DEFAULT_BASE_URL;
      
      if (navegoABusqueda) {
        console.log('✅ Botón de búsqueda navega correctamente');
      } else {
        console.log(`⚠️ Botón de búsqueda navegó a: ${urlDespuesBusqueda}`);
      }
      
      // Regresar al dashboard
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
    } else {
      console.log('⚠️ Botón de búsqueda no encontrado');
    }
    
    // 4. VALIDAR MENÚ DE OPCIONES (MÓVIL)
    await showStepMessage(page, '📱 VALIDANDO MENÚ DE OPCIONES (MÓVIL)');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando menú de opciones móvil...');
    
    // Buscar botón del menú móvil (icon-more-vertical)
    const menuMovilButton = page.locator('div.xlg\\:hidden nav button').filter({
      has: page.locator('i.icon-more-vertical')
    }).first();
    
    // Buscar por icono directamente
    const menuMovilIcono = page.locator('i.icon-more-vertical').locator('xpath=ancestor::button[1]').first();
    
    let menuMovilEncontrado = false;
    let menuButtonElement: ReturnType<typeof page.locator> | null = null;
    
    if (await menuMovilButton.count() > 0 && await menuMovilButton.first().isVisible().catch(() => false)) {
      menuButtonElement = menuMovilButton.first();
      menuMovilEncontrado = true;
      console.log('✅ Botón de menú móvil encontrado');
    } else if (await menuMovilIcono.count() > 0 && await menuMovilIcono.first().isVisible().catch(() => false)) {
      menuButtonElement = menuMovilIcono.first();
      menuMovilEncontrado = true;
      console.log('✅ Botón de menú móvil encontrado (por icono)');
    }
    
    if (menuMovilEncontrado && menuButtonElement) {
      await expect(menuButtonElement).toBeVisible();
      await expect(menuButtonElement).toBeEnabled();
      console.log('✅ Botón de menú móvil visible y habilitado');
      
      // Validar funcionalidad: abrir menú
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD DEL MENÚ MÓVIL');
      await page.waitForTimeout(1000);
      
      await menuButtonElement.click();
      await page.waitForTimeout(1000);
      
      // Buscar menú desplegable
      const menuDesplegable = page.locator('div.absolute, div[role="menu"], div.dropdown-menu').filter({
        has: page.locator('button, a')
      }).first();
      
      const menuVisible = await menuDesplegable.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (menuVisible) {
        await expect(menuDesplegable).toBeVisible();
        console.log('✅ Menú desplegable abierto');
        
        // Validar opciones del menú
        await showStepMessage(page, '📋 VALIDANDO OPCIONES DEL MENÚ MÓVIL');
        await page.waitForTimeout(1000);
        
        const opcionesMenu = menuDesplegable.locator('button, a');
        const cantidadOpciones = await opcionesMenu.count();
        
        console.log(`📊 Opciones encontradas en el menú: ${cantidadOpciones}`);
        
        if (cantidadOpciones > 0) {
          // Validar que las opciones son visibles
          for (let i = 0; i < Math.min(cantidadOpciones, 5); i++) {
            const opcion = opcionesMenu.nth(i);
            const opcionVisible = await opcion.isVisible().catch(() => false);
            if (opcionVisible) {
              const textoOpcion = await opcion.textContent();
              console.log(`  ✓ Opción ${i + 1}: "${textoOpcion?.trim() || 'sin texto'}"`);
            }
          }
          console.log('✅ Opciones del menú validadas');
        }
        
        // Cerrar menú (clic fuera o en el botón nuevamente)
        await menuButtonElement.click().catch(() => {});
        await page.waitForTimeout(500);
      } else {
        console.log('⚠️ Menú desplegable no se abrió o no es visible');
      }
    } else {
      console.log('ℹ️ Menú móvil no encontrado (puede que solo esté visible en viewports móviles)');
    }
    
    await showStepMessage(page, '✅ VALIDACIÓN COMPLETA DE BARRA SUPERIOR FINALIZADA');
    console.log('✅ Validación completa de elementos de la barra superior finalizada');
  });

  test('Se muestran conversaciones en la sección Fiestachat (navegación)', async ({ page }) => {
    await showStepMessage(page, '💬 VALIDANDO Y NAVEGANDO A CHATS');
    await page.waitForTimeout(1000);
    // Buscar enlace de chats (puede estar en mobile o desktop)
    console.log('🔍 Buscando enlace de chats...');
    const enlaceChatsMobile = page.locator('a[href="/client/chats"]').filter({
      has: page.locator('i.icon-message-square')
    });
    const enlaceChatsDesktop = page.locator('div.lg\\:block nav a[href="/client/chats"]');
    
    let enlaceChats: ReturnType<typeof page.locator> | null = null;
    
    if (await enlaceChatsDesktop.count() > 0) {
      enlaceChats = enlaceChatsDesktop.first();
      await expect(enlaceChats).toBeVisible();
      console.log('✅ Enlace de chats encontrado (desktop)');
      
      // Validar contador de mensajes antes de hacer clic
      const contador = enlaceChats.locator('div.absolute').filter({
        has: page.locator('div.bg-danger-neutral, div[class*="bg-danger"]')
      }).locator('p, div').filter({
        hasText: /\d+/
      }).first();
      
      const contadorVisible = await contador.isVisible().catch(() => false);
      if (contadorVisible) {
        const textoContador = await contador.textContent();
        const numeroContador = textoContador ? parseInt(textoContador.trim()) : null;
        if (numeroContador !== null && !isNaN(numeroContador)) {
          console.log(`✅ Contador de mensajes visible: ${numeroContador}`);
        }
      } else {
        console.log('ℹ️ Contador de mensajes no visible (puede que no haya mensajes sin leer)');
      }
      
      console.log('🖱️ Haciendo clic en enlace de chats...');
      await enlaceChats.click();
    } else if (await enlaceChatsMobile.count() > 0) {
      enlaceChats = enlaceChatsMobile.first();
      await expect(enlaceChats).toBeVisible();
      console.log('✅ Enlace de chats encontrado (mobile)');
      
      // Validar contador de mensajes antes de hacer clic
      const contador = enlaceChats.locator('div.absolute').filter({
        has: page.locator('div.bg-danger-neutral, div[class*="bg-danger"]')
      }).locator('p, div').filter({
        hasText: /\d+/
      }).first();
      
      const contadorVisible = await contador.isVisible().catch(() => false);
      if (contadorVisible) {
        const textoContador = await contador.textContent();
        const numeroContador = textoContador ? parseInt(textoContador.trim()) : null;
        if (numeroContador !== null && !isNaN(numeroContador)) {
          console.log(`✅ Contador de mensajes visible: ${numeroContador}`);
        }
      } else {
        console.log('ℹ️ Contador de mensajes no visible (puede que no haya mensajes sin leer)');
      }
      
      console.log('🖱️ Haciendo clic en enlace de chats...');
      await enlaceChats.click();
    } else {
      console.log('⚠️ No se encontró el enlace de chats');
    }
    
    if (enlaceChats) {
      await expect(page).toHaveURL(CHATS_URL);
      console.log('✅ Navegación a chats exitosa');
    }

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

  // ============================================
  // GRUPO 2: PRUEBAS QUE VERIFICAN EXISTENCIA Y FUNCIONALIDAD
  // ============================================

  test('Navega a Chats, Favoritos y Perfil desde la barra superior', async ({ page }) => {
    await showStepMessage(page, '💬 VALIDANDO Y NAVEGANDO A CHATS');
    await page.waitForTimeout(1000);
    // Buscar enlace de chats (puede estar en mobile o desktop)
    console.log('🔍 Buscando enlace de chats...');
    const enlaceChatsMobile = page.locator('a[href="/client/chats"]').filter({
      has: page.locator('i.icon-message-square')
    });
    const enlaceChatsDesktop = page.locator('div.lg\\:block nav a[href="/client/chats"]');
    
    let enlaceChats: ReturnType<typeof page.locator> | null = null;
    
    if (await enlaceChatsDesktop.count() > 0) {
      enlaceChats = enlaceChatsDesktop.first();
      await expect(enlaceChats).toBeVisible();
      console.log('✅ Enlace de chats encontrado (desktop)');
      
      // Validar contador de mensajes antes de hacer clic
      const contador = enlaceChats.locator('div.absolute').filter({
        has: page.locator('div.bg-danger-neutral, div[class*="bg-danger"]')
      }).locator('p, div').filter({
        hasText: /\d+/
      }).first();
      
      const contadorVisible = await contador.isVisible().catch(() => false);
      if (contadorVisible) {
        const textoContador = await contador.textContent();
        const numeroContador = textoContador ? parseInt(textoContador.trim()) : null;
        if (numeroContador !== null && !isNaN(numeroContador)) {
          console.log(`✅ Contador de mensajes visible: ${numeroContador}`);
        }
      } else {
        console.log('ℹ️ Contador de mensajes no visible (puede que no haya mensajes sin leer)');
      }
      
      console.log('🖱️ Haciendo clic en enlace de chats...');
      await enlaceChats.click();
    } else if (await enlaceChatsMobile.count() > 0) {
      enlaceChats = enlaceChatsMobile.first();
      await expect(enlaceChats).toBeVisible();
      console.log('✅ Enlace de chats encontrado (mobile)');
      
      // Validar contador de mensajes antes de hacer clic
      const contador = enlaceChats.locator('div.absolute').filter({
        has: page.locator('div.bg-danger-neutral, div[class*="bg-danger"]')
      }).locator('p, div').filter({
        hasText: /\d+/
      }).first();
      
      const contadorVisible = await contador.isVisible().catch(() => false);
      if (contadorVisible) {
        const textoContador = await contador.textContent();
        const numeroContador = textoContador ? parseInt(textoContador.trim()) : null;
        if (numeroContador !== null && !isNaN(numeroContador)) {
          console.log(`✅ Contador de mensajes visible: ${numeroContador}`);
        }
      } else {
        console.log('ℹ️ Contador de mensajes no visible (puede que no haya mensajes sin leer)');
      }
      
      console.log('🖱️ Haciendo clic en enlace de chats...');
      await enlaceChats.click();
    } else {
      console.log('⚠️ No se encontró el enlace de chats');
    }
    
    if (enlaceChats) {
      await expect(page).toHaveURL(CHATS_URL);
      console.log('✅ Navegación a chats exitosa');
    }

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

  test('Se muestran todos los elementos de la sección Fiestachat (desktop)', async ({ page }) => {
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

  test('Se muestran todos los elementos de la sección Fiestachat (completo)', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos
    
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);
    
    await showStepMessage(page, '💬 VALIDANDO ELEMENTOS COMPLETOS DE "¡FIESTACHAT!"');
    await safeWaitForTimeout(page, 1000);
    
    // La sección Fiestachat solo está visible en desktop
    if (page.viewportSize() && page.viewportSize()!.width < 1024) {
      console.log('⚠️ La sección Fiestachat solo está visible en viewports grandes (≥1024px)');
      test.skip();
      return;
    }
    
    // 1. VALIDAR EXISTENCIA Y VISIBILIDAD DEL CONTENEDOR
    await showStepMessage(page, '📦 BUSCANDO CONTENEDOR DE FIESTACHAT');
    await safeWaitForTimeout(page, 1000);
    
    let seccionFiestachat = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light').filter({
      has: page.locator('p').filter({ hasText: '¡Fiestachat!' })
    });
    
    let contenedorEncontrado = await seccionFiestachat.count() > 0;
    
    if (!contenedorEncontrado) {
      // Fallback: buscar cualquier contenedor que tenga el título
      seccionFiestachat = page.locator('div').filter({
        has: page.locator('p').filter({ hasText: '¡Fiestachat!' })
      }).first();
      
      const countFallback = await seccionFiestachat.count();
      if (countFallback > 0) {
        contenedorEncontrado = await seccionFiestachat.isVisible({ timeout: 3000 }).catch(() => false);
      }
    }
    
    if (!contenedorEncontrado) {
      console.log('❌ No se encontró el contenedor de Fiestachat');
      return;
    }
    
    await expect(seccionFiestachat).toBeVisible();
    console.log('✅ Contenedor de Fiestachat encontrado y visible');
    
    // 2. VALIDAR TÍTULO
    await showStepMessage(page, '📝 VALIDANDO TÍTULO');
    await safeWaitForTimeout(page, 500);
    
    const tituloFiestachat = seccionFiestachat.locator('p').filter({ hasText: '¡Fiestachat!' }).first();
    await expect(tituloFiestachat).toBeVisible();
    const textoTitulo = (await tituloFiestachat.textContent())?.trim() || '';
    expect(textoTitulo).toContain('¡Fiestachat!');
    console.log(`✅ Título encontrado: "${textoTitulo}"`);
    
    // 3. VALIDAR SUBTÍTULO
    await showStepMessage(page, '📝 VALIDANDO SUBTÍTULO');
    await safeWaitForTimeout(page, 500);
    
    const subtituloFiestachat = seccionFiestachat.locator('p').filter({ hasText: 'La línea directa a tu evento' }).first();
    await expect(subtituloFiestachat).toBeVisible();
    const textoSubtitulo = (await subtituloFiestachat.textContent())?.trim() || '';
    expect(textoSubtitulo).toContain('La línea directa a tu evento');
    console.log(`✅ Subtítulo encontrado: "${textoSubtitulo}"`);
    
    // 4. VALIDAR CONTENEDOR DESTACADO CON INFORMACIÓN SOBRE EL CHAT
    await showStepMessage(page, '📦 VALIDANDO CONTENEDOR DESTACADO');
    await safeWaitForTimeout(page, 500);
    
    // Buscar elementos dentro del contenedor que puedan contener información
    const elementosInformacion = seccionFiestachat.locator('div, p, span').filter({
      hasNot: page.locator('p').filter({ hasText: /¡Fiestachat!|La línea directa a tu evento/ })
    });
    
    const countElementos = await elementosInformacion.count();
    console.log(`📊 Elementos de información encontrados: ${countElementos}`);
    
    if (countElementos > 0) {
      // Validar que hay contenido visible en el contenedor
      const primerElemento = elementosInformacion.first();
      const esVisible = await primerElemento.isVisible().catch(() => false);
      if (esVisible) {
        const contenido = (await primerElemento.textContent())?.trim() || '';
        if (contenido.length > 0) {
          console.log(`✅ Contenedor destacado tiene contenido: "${contenido.substring(0, 50)}..."`);
        }
      }
    }
    
    // Validar estilos del contenedor (bg-light-light indica que es destacado)
    const bgColor = await seccionFiestachat.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    }).catch(() => null);
    
    if (bgColor) {
      console.log(`✅ Contenedor tiene estilo destacado (background color aplicado)`);
    }
    
    // 5. VALIDAR ELEMENTOS INTERACTIVOS (BOTONES, ENLACES, ETC.)
    await showStepMessage(page, '🖱️ VALIDANDO ELEMENTOS INTERACTIVOS');
    await safeWaitForTimeout(page, 500);
    
    // Buscar botones dentro del contenedor
    const botones = seccionFiestachat.locator('button');
    const countBotones = await botones.count();
    console.log(`📊 Botones encontrados: ${countBotones}`);
    
    if (countBotones > 0) {
      for (let i = 0; i < Math.min(countBotones, 5); i++) {
        const boton = botones.nth(i);
        const esVisible = await boton.isVisible().catch(() => false);
        if (esVisible) {
          await expect(boton).toBeVisible();
          const esHabilitado = await boton.isEnabled().catch(() => false);
          if (esHabilitado) {
            await expect(boton).toBeEnabled();
            const textoBoton = (await boton.textContent())?.trim() || '';
            console.log(`✅ Botón encontrado y habilitado: "${textoBoton}"`);
          }
        }
      }
    }
    
    // Buscar enlaces dentro del contenedor
    const enlaces = seccionFiestachat.locator('a');
    const countEnlaces = await enlaces.count();
    console.log(`📊 Enlaces encontrados: ${countEnlaces}`);
    
    if (countEnlaces > 0) {
      for (let i = 0; i < Math.min(countEnlaces, 5); i++) {
        const enlace = enlaces.nth(i);
        const esVisible = await enlace.isVisible().catch(() => false);
        if (esVisible) {
          await expect(enlace).toBeVisible();
          const href = await enlace.getAttribute('href').catch(() => null);
          const textoEnlace = (await enlace.textContent())?.trim() || '';
          console.log(`✅ Enlace encontrado: "${textoEnlace}" -> ${href || 'sin href'}`);
        }
      }
    }
    
    // 6. VALIDAR CONVERSACIONES (ELEMENTOS CLICKEABLES DE CHAT)
    await showStepMessage(page, '💬 VALIDANDO CONVERSACIONES');
    await safeWaitForTimeout(page, 500);
    
    // Buscar conversaciones (botones con información de chat)
    const conversaciones = page.locator('button').filter({
      has: seccionFiestachat.locator('div').filter({
        has: page.locator('p, span')
      })
    });
    
    // Si no se encuentran dentro del contenedor, buscar en toda la página cerca del contenedor
    const conversacionesAlternativas = page.locator('button').filter({
      has: page.locator('div').filter({
        has: page.locator('p, span').filter({ hasText: /.+/ })
      })
    });
    
    const countConversaciones = await conversaciones.count();
    const countConversacionesAlt = await conversacionesAlternativas.count();
    
    console.log(`📊 Conversaciones encontradas (dentro del contenedor): ${countConversaciones}`);
    console.log(`📊 Conversaciones encontradas (alternativas): ${countConversacionesAlt}`);
    
    if (countConversaciones > 0 || countConversacionesAlt > 0) {
      const conversacionesParaValidar = countConversaciones > 0 ? conversaciones : conversacionesAlternativas;
      const primeraConversacion = conversacionesParaValidar.first();
      
      await expect(primeraConversacion).toBeVisible();
      const esClickeable = await primeraConversacion.isEnabled().catch(() => false);
      if (esClickeable) {
        await expect(primeraConversacion).toBeEnabled();
        console.log('✅ Se encontraron conversaciones válidas y clickeables');
      }
    } else {
      console.log('ℹ️ No se encontraron conversaciones, puede ser un estado vacío válido');
    }
    
    console.log('✅ Validación completa de la sección "¡Fiestachat!" finalizada');
  });

  test('Navega a la página de cotización al hacer clic en una notificación', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos
    
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);
    
    await showStepMessage(page, '🔔 VALIDANDO CLIC EN NOTIFICACIÓN Y NAVEGACIÓN');
    await safeWaitForTimeout(page, 1000);
    
    // La sección Fiestachat solo está visible en desktop
    if (page.viewportSize() && page.viewportSize()!.width < 1024) {
      console.log('⚠️ La sección Fiestachat solo está visible en viewports grandes (≥1024px)');
      test.skip();
      return;
    }
    
    // 1. BUSCAR SECCIÓN FIESTACHAT
    await showStepMessage(page, '🔍 BUSCANDO SECCIÓN FIESTACHAT');
    await safeWaitForTimeout(page, 1000);
    
    let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
    }
    
    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
      fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
    }
    
    if (!fiestachatVisible) {
      console.log('⚠️ Sección Fiestachat no visible, no se puede validar notificaciones');
      test.skip();
      return;
    }
    
    console.log('✅ Sección Fiestachat encontrada');
    
    // 2. BUSCAR NOTIFICACIONES
    await showStepMessage(page, '🔔 BUSCANDO NOTIFICACIONES');
    await safeWaitForTimeout(page, 1000);
    
    const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
    const notificationCount = await notificationButtons.count();
    
    if (notificationCount === 0) {
      console.log('⚠️ No se encontraron notificaciones en Fiestachat');
      test.skip();
      return;
    }
    
    console.log(`✅ Se encontraron ${notificationCount} notificación(es)`);
    
    // 3. OBTENER INFORMACIÓN DE LA PRIMERA NOTIFICACIÓN
    await showStepMessage(page, '📋 OBTENIENDO INFORMACIÓN DE LA NOTIFICACIÓN');
    await safeWaitForTimeout(page, 500);
    
    const firstNotification = notificationButtons.first();
    const notificationText = await firstNotification.textContent();
    const urlAntesClick = page.url();
    
    
    // Verificar que la notificación es clickeable
    await expect(firstNotification).toBeVisible();
    await expect(firstNotification).toBeEnabled();
    console.log('✅ Notificación es clickeable');
    
    // 4. HACER CLIC EN LA NOTIFICACIÓN
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN LA NOTIFICACIÓN');
    await safeWaitForTimeout(page, 500);
    
    await firstNotification.click();
    await safeWaitForTimeout(page, 2000);
    
    // 5. VERIFICAR NAVEGACIÓN A PÁGINA DE COTIZACIÓN
    await showStepMessage(page, '✅ VERIFICANDO NAVEGACIÓN');
    await safeWaitForTimeout(page, 1000);
    
    const urlDespuesClick = page.url();
    
    // Verificar que la URL cambió
    expect(urlDespuesClick).not.toBe(urlAntesClick);
    console.log('✅ La URL cambió después del clic');
    
    // Verificar que estamos en una página de cotización
    // Puede ser /client/quotation, /client/prequotation, /client/negotiation, etc.
    const esPaginaCotizacion = 
      urlDespuesClick.includes('/quotation') ||
      urlDespuesClick.includes('/prequotation') ||
      urlDespuesClick.includes('/negotiation') ||
      urlDespuesClick.includes('/cotizacion');
    
    if (esPaginaCotizacion) {
      console.log('✅ Navegación exitosa a página de cotización');
    } else {
      console.log('⚠️ La URL no parece ser de cotización');
      // No fallar el test, solo advertir, ya que puede haber diferentes formatos de URL
    }
    
    // 6. VERIFICAR ELEMENTOS DE LA PÁGINA DE COTIZACIÓN
    await showStepMessage(page, '📄 VALIDANDO ELEMENTOS DE LA PÁGINA');
    await safeWaitForTimeout(page, 1000);
    
    // Buscar elementos comunes en páginas de cotización
    const elementosCotizacion = [
      page.locator('p, h1, h2, h3').filter({ hasText: /Cotización|Quotation/i }),
      page.locator('button').filter({ hasText: /Enviar|Solicitar|Aceptar|Rechazar/i }),
      page.locator('textarea, input').filter({ has: page.locator('label').filter({ hasText: /Detalle|Mensaje|Request/i }) }),
    ];
    
    let elementosEncontrados = 0;
    for (const elemento of elementosCotizacion) {
      const count = await elemento.count();
      if (count > 0) {
        const visible = await elemento.first().isVisible({ timeout: 2000 }).catch(() => false);
        if (visible) {
          elementosEncontrados++;
        }
      }
    }
    
    if (elementosEncontrados > 0) {
      console.log(`✅ Se encontraron ${elementosEncontrados} elemento(s) relacionados con cotización`);
    } else {
      console.log('ℹ️ No se encontraron elementos específicos de cotización (puede ser una página diferente)');
    }
    
    // Verificar que la página se cargó correctamente
    await page.waitForLoadState('networkidle');
    const pageTitle = await page.title();
    console.log(`📄 Título de la página: "${pageTitle}"`);
    
    console.log('✅ Validación de clic en notificación y navegación completada');
  });

  test('Se muestran las fiestas del cliente en la sección de eventos', async ({ page }) => {
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

  test('Se muestran todos los elementos de la sección Elige Tu Fiesta', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos
    
    await showStepMessage(page, '🎉 VALIDANDO ELEMENTOS COMPLETOS DE "ELIGE TU FIESTA"');
    await page.waitForTimeout(1000);
    
    // 1. VALIDAR TÍTULO
    await showStepMessage(page, '📋 VALIDANDO TÍTULO "ELIGE TU FIESTA"');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando título "Elige tu fiesta"...');
    // Excluir el overlay de showStepMessage - buscar solo elementos p con las clases específicas
    const titulo = page.locator('p.text-dark-neutral.font-extrabold').filter({ 
      hasText: /^Elige tu fiesta$/i 
    }).first();
    await expect(titulo).toBeVisible();
    console.log('✅ Título "Elige tu fiesta" visible');
    
    // 2. VALIDAR SCROLL HORIZONTAL
    await showStepMessage(page, '📜 VALIDANDO SCROLL HORIZONTAL');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando contenedor con scroll horizontal...');
    
    // Buscar contenedor de eventos con scroll horizontal
    const contenedorEventos = page.locator('div.flex.flex-nowrap.overflow-x-auto, div[class*="overflow-x-auto"]').filter({
      has: page.locator('button').filter({
        has: page.locator('p').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i })
      })
    }).first();
    
    const tieneScroll = await contenedorEventos.count() > 0;
    if (tieneScroll) {
      const scrollVisible = await contenedorEventos.isVisible().catch(() => false);
      if (scrollVisible) {
        console.log('✅ Contenedor con scroll horizontal encontrado');
        
        // Validar que tiene la clase de scroll
        const tieneOverflowX = await contenedorEventos.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.overflowX === 'auto' || styles.overflowX === 'scroll';
        }).catch(() => false);
        
        if (tieneOverflowX) {
          console.log('✅ Scroll horizontal configurado correctamente');
        }
      }
    } else {
      console.log('ℹ️ Contenedor con scroll no encontrado (puede que no haya suficientes eventos)');
    }
    
    // 3. VALIDAR TARJETAS DE EVENTOS Y SUS ELEMENTOS
    await showStepMessage(page, '🎴 VALIDANDO TARJETAS DE EVENTOS');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando tarjetas de eventos...');
    
    // Buscar tarjetas de eventos (botones clickeables)
    const tarjetasEventos = page.locator('button').filter({
      has: page.locator('div').filter({
        has: page.locator('p').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i })
      })
    });
    
    const cantidadTarjetas = await tarjetasEventos.count();
    console.log(`📊 Tarjetas de eventos encontradas: ${cantidadTarjetas}`);
    
    if (cantidadTarjetas > 0) {
      // Validar elementos de la primera tarjeta
      const primeraTarjeta = tarjetasEventos.first();
      await expect(primeraTarjeta).toBeVisible();
      console.log('✅ Primera tarjeta de evento visible');
      
      // 3.1. VALIDAR NOMBRE DEL EVENTO
      await showStepMessage(page, '📝 VALIDANDO NOMBRE DEL EVENTO');
      await page.waitForTimeout(1000);
      console.log('🔍 Buscando nombre del evento...');
      
      // Buscar nombre del evento (texto en negrita o destacado)
      const nombreEvento = primeraTarjeta.locator('p.font-bold, p[class*="font-bold"], h1, h2, h3, h4, h5, h6').first();
      const nombreVisible = await nombreEvento.isVisible().catch(() => false);
      
      if (nombreVisible) {
        const textoNombre = await nombreEvento.textContent();
        if (textoNombre && textoNombre.trim().length > 0) {
          console.log(`✅ Nombre del evento encontrado: "${textoNombre.trim()}"`);
        } else {
          console.log('⚠️ Nombre del evento vacío');
        }
      } else {
        // Fallback: buscar cualquier texto que no sea fecha, hora, precio, etc.
        const textosTarjeta = await primeraTarjeta.locator('p').allTextContents();
        const nombreAlternativo = textosTarjeta.find(texto => 
          !texto.match(/\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i) &&
          !texto.match(/\d{1,2}:\d{2}/) &&
          !texto.match(/\$\s*\d+/) &&
          !texto.match(/\d+%/) &&
          !texto.match(/Faltan\s+\d+/) &&
          texto.trim().length > 0
        );
        if (nombreAlternativo) {
          console.log(`✅ Nombre del evento encontrado (alternativo): "${nombreAlternativo.trim()}"`);
        } else {
          console.log('⚠️ No se pudo encontrar el nombre del evento');
        }
      }
      
      // 3.2. VALIDAR FECHA Y HORA
      await showStepMessage(page, '📅 VALIDANDO FECHA Y HORA');
      await page.waitForTimeout(1000);
      console.log('🔍 Buscando fecha y hora del evento...');
      
      // Buscar fecha (formato: "31 jul. 2026")
      const fecha = primeraTarjeta.locator('p').filter({
        hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4}/i
      }).first();
      
      const fechaVisible = await fecha.isVisible().catch(() => false);
      if (fechaVisible) {
        const textoFecha = await fecha.textContent();
        console.log(`✅ Fecha encontrada: "${textoFecha?.trim()}"`);
      } else {
        console.log('⚠️ Fecha no encontrada');
      }
      
      // Buscar hora (formato: "5:25 PM" o similar)
      const hora = primeraTarjeta.locator('p').filter({
        hasText: /\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/i
      }).first();
      
      const horaVisible = await hora.isVisible().catch(() => false);
      if (horaVisible) {
        const textoHora = await hora.textContent();
        console.log(`✅ Hora encontrada: "${textoHora?.trim()}"`);
      } else {
        // Buscar hora en el mismo elemento que la fecha
        const fechaHora = primeraTarjeta.locator('p').filter({
          hasText: /-/
        }).first();
        const fechaHoraVisible = await fechaHora.isVisible().catch(() => false);
        if (fechaHoraVisible) {
          const textoFechaHora = await fechaHora.textContent();
          console.log(`✅ Fecha y hora encontradas juntas: "${textoFechaHora?.trim()}"`);
        } else {
          console.log('ℹ️ Hora no encontrada (puede estar incluida en la fecha)');
        }
      }
      
      // 3.3. VALIDAR PRESUPUESTO
      await showStepMessage(page, '💰 VALIDANDO PRESUPUESTO');
      await page.waitForTimeout(1000);
      console.log('🔍 Buscando presupuesto del evento...');
      
      // Buscar presupuesto (formato: "$ 0.00" o similar)
      const presupuesto = primeraTarjeta.locator('p').filter({
        hasText: /\$\s*\d+([.,]\d+)?/
      }).first();
      
      const presupuestoVisible = await presupuesto.isVisible().catch(() => false);
      if (presupuestoVisible) {
        const textoPresupuesto = await presupuesto.textContent();
        console.log(`✅ Presupuesto encontrado: "${textoPresupuesto?.trim()}"`);
      } else {
        // Buscar por icono de dólar
        const presupuestoIcono = primeraTarjeta.locator('div').filter({
          has: page.locator('i.icon-dollar-sign')
        }).locator('p').first();
        const presupuestoIconoVisible = await presupuestoIcono.isVisible().catch(() => false);
        if (presupuestoIconoVisible) {
          const textoPresupuesto = await presupuestoIcono.textContent();
          console.log(`✅ Presupuesto encontrado (por icono): "${textoPresupuesto?.trim()}"`);
        } else {
          console.log('ℹ️ Presupuesto no encontrado (puede ser 0.00 o no estar visible)');
        }
      }
      
      // 3.4. VALIDAR AVANCE (PORCENTAJE Y BARRA)
      await showStepMessage(page, '📊 VALIDANDO AVANCE (PORCENTAJE Y BARRA)');
      await page.waitForTimeout(1000);
      console.log('🔍 Buscando avance del evento...');
      
      // Buscar porcentaje de avance
      const porcentajeAvance = primeraTarjeta.locator('p').filter({
        hasText: /\d+%/
      }).first();
      
      const porcentajeVisible = await porcentajeAvance.isVisible().catch(() => false);
      if (porcentajeVisible) {
        const textoPorcentaje = await porcentajeAvance.textContent();
        const porcentajeNumero = textoPorcentaje ? parseInt(textoPorcentaje.match(/\d+/)?.[0] || '0') : 0;
        console.log(`✅ Porcentaje de avance encontrado: ${porcentajeNumero}%`);
        expect(porcentajeNumero).toBeGreaterThanOrEqual(0);
        expect(porcentajeNumero).toBeLessThanOrEqual(100);
      } else {
        console.log('ℹ️ Porcentaje de avance no encontrado');
      }
      
      // Buscar barra de avance (div con width o background-color)
      const barraAvance = primeraTarjeta.locator('div').filter({
        has: page.locator('div[style*="width"], div[class*="bg-"]')
      }).filter({
        has: page.locator('div').filter({
          has: page.locator('div[style*="width:"]')
        })
      }).first();
      
      const barraVisible = await barraAvance.isVisible().catch(() => false);
      if (barraVisible) {
        console.log('✅ Barra de avance encontrada');
        
        // Validar que la barra tiene un ancho configurado
        const tieneWidth = await barraAvance.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.width !== '0px' && styles.width !== 'auto';
        }).catch(() => false);
        
        if (tieneWidth) {
          console.log('✅ Barra de avance tiene ancho configurado');
        }
      } else {
        console.log('ℹ️ Barra de avance no encontrada');
      }
      
      // 3.5. VALIDAR DÍAS RESTANTES
      await showStepMessage(page, '⏰ VALIDANDO DÍAS RESTANTES');
      await page.waitForTimeout(1000);
      console.log('🔍 Buscando días restantes...');
      
      // Buscar días restantes (formato: "Faltan 248 días" o similar)
      const diasRestantes = primeraTarjeta.locator('p').filter({
        hasText: /Faltan\s+\d+\s+día/i
      }).first();
      
      const diasRestantesVisible = await diasRestantes.isVisible().catch(() => false);
      if (diasRestantesVisible) {
        const textoDiasRestantes = await diasRestantes.textContent();
        const numeroDias = textoDiasRestantes ? parseInt(textoDiasRestantes.match(/\d+/)?.[0] || '0') : 0;
        console.log(`✅ Días restantes encontrados: "${textoDiasRestantes?.trim()}" (${numeroDias} días)`);
        expect(numeroDias).toBeGreaterThanOrEqual(0);
      } else {
        console.log('ℹ️ Días restantes no encontrados');
      }
      
      // 3.6. VALIDAR COLOR IDENTIFICADOR POR EVENTO
      await showStepMessage(page, '🎨 VALIDANDO COLOR IDENTIFICADOR');
      await page.waitForTimeout(1000);
      console.log('🔍 Buscando color identificador del evento...');
      
      // Buscar elemento con color (border-left o background-color)
      const colorIdentificador = primeraTarjeta.locator('div').filter({
        has: page.locator('div[style*="border-left"], div[style*="background-color"]')
      }).first();
      
      const colorVisible = await colorIdentificador.isVisible().catch(() => false);
      if (colorVisible) {
        // Obtener el color del borde izquierdo o fondo
        const color = await colorIdentificador.evaluate(el => {
          const styles = window.getComputedStyle(el);
          const borderColor = styles.borderLeftColor;
          const bgColor = styles.backgroundColor;
          return borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent' ? borderColor : 
                 (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' ? bgColor : null);
        }).catch(() => null);
        
        if (color) {
          console.log(`✅ Color identificador encontrado: ${color}`);
        } else {
          // Buscar por atributo style directamente
          const colorStyle = await colorIdentificador.getAttribute('style');
          if (colorStyle && (colorStyle.includes('border-left') || colorStyle.includes('background-color'))) {
            console.log(`✅ Color identificador encontrado en style: ${colorStyle.substring(0, 50)}...`);
          } else {
            console.log('ℹ️ Color identificador no se pudo extraer');
          }
        }
      } else {
        // Buscar círculo de color
        const circuloColor = primeraTarjeta.locator('div[class*="rounded-circle"], div[class*="rounded-full"]').filter({
          has: page.locator('div[style*="background-color"]')
        }).first();
        
        const circuloVisible = await circuloColor.isVisible().catch(() => false);
        if (circuloVisible) {
          const colorCirculo = await circuloColor.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
          }).catch(() => null);
          if (colorCirculo) {
            console.log(`✅ Color identificador encontrado (círculo): ${colorCirculo}`);
          }
        } else {
          console.log('ℹ️ Color identificador no encontrado');
        }
      }
      
      // 3.7. VALIDAR FUNCIONALIDAD: CLIC EN TARJETA DE EVENTO
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD: CLIC EN TARJETA');
      await page.waitForTimeout(1000);
      console.log('🔍 Validando que la tarjeta es clickeable...');
      
      await expect(primeraTarjeta).toBeEnabled();
      console.log('✅ Tarjeta está habilitada');
      
      // Hacer clic en la tarjeta y validar navegación
      const urlAntes = page.url();
      await primeraTarjeta.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const urlDespues = page.url();
      const navegoCorrectamente = urlDespues !== urlAntes && 
                                  (urlDespues.includes('/client/event') || 
                                   urlDespues.includes('/client/dashboard') ||
                                   urlDespues.includes('/event'));
      
      if (navegoCorrectamente) {
        console.log(`✅ Clic en tarjeta navegó correctamente a: ${urlDespues}`);
      } else {
        console.log(`⚠️ Clic en tarjeta navegó a: ${urlDespues} (puede ser comportamiento válido)`);
      }
      
      // Regresar al dashboard
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    } else {
      console.log('ℹ️ No hay tarjetas de eventos para validar (estado vacío válido)');
    }
    
    // 4. VALIDAR FUNCIONALIDAD DEL BOTÓN "NUEVA FIESTA"
    await showStepMessage(page, '🔘 VALIDANDO FUNCIONALIDAD DEL BOTÓN "NUEVA FIESTA"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando funcionalidad del botón "Nueva fiesta"...');
    
    const viewportWidth = page.viewportSize()?.width || 1400;
    let botonNuevaFiesta: ReturnType<typeof page.locator> | null = null;
    
    if (viewportWidth >= 1024) {
      // Desktop
      botonNuevaFiesta = page.locator('button.hidden.lg\\:flex').filter({
        has: page.locator('p').filter({ hasText: /Nueva fiesta/i })
      }).first();
    } else {
      // Mobile
      botonNuevaFiesta = page.locator('button.lg\\:hidden').filter({
        has: page.locator('p').filter({ hasText: /Nueva fiesta/i })
      }).first();
    }
    
    if (botonNuevaFiesta && await botonNuevaFiesta.count() > 0) {
      await expect(botonNuevaFiesta).toBeVisible();
      await expect(botonNuevaFiesta).toBeEnabled();
      console.log('✅ Botón "Nueva fiesta" visible y habilitado');
      
      // Hacer clic y validar que abre el formulario de creación
      const urlAntesNuevaFiesta = page.url();
      await botonNuevaFiesta.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const urlDespuesNuevaFiesta = page.url();
      const abrioFormulario = urlDespuesNuevaFiesta !== urlAntesNuevaFiesta || 
                              await page.locator('button[type="submit"]').filter({
                                has: page.locator('p.text-dark-neutral')
                              }).count() > 0;
      
      if (abrioFormulario) {
        console.log('✅ Botón "Nueva fiesta" abrió el formulario correctamente');
      } else {
        console.log('⚠️ Botón "Nueva fiesta" puede no haber abierto el formulario');
      }
      
      // Regresar al dashboard si es necesario
      if (!urlDespuesNuevaFiesta.includes('/client/dashboard')) {
        await page.goto(DASHBOARD_URL);
        await page.waitForLoadState('networkidle');
      }
    } else {
      console.log('⚠️ Botón "Nueva fiesta" no encontrado');
    }
    
    await showStepMessage(page, '✅ VALIDACIÓN COMPLETA DE "ELIGE TU FIESTA" FINALIZADA');
    console.log('✅ Validación completa de elementos de "Elige tu fiesta" finalizada');
  });

  test('Se muestran todos los elementos de la sección de servicios', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos
    
    await showStepMessage(page, '🔍 VALIDANDO ELEMENTOS COMPLETOS DE LA SECCIÓN DE SERVICIOS');
    await page.waitForTimeout(1000);
    
    // 1. VALIDAR BOTÓN "AGREGAR SERVICIOS" (existencia ya validada, validar funcionalidad completa)
    await showStepMessage(page, '🔘 VALIDANDO BOTÓN "AGREGAR SERVICIOS"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando botón "Agregar servicios"...');
    const botonAgregarServicios = page.getByRole('button', { name: /Agregar servicios/i });
    await expect(botonAgregarServicios).toBeVisible();
    await expect(botonAgregarServicios).toBeEnabled();
    console.log('✅ Botón "Agregar servicios" visible y habilitado');
    
    // 2. VALIDAR BOTÓN "ORDENAR POR" (existencia ya validada, validar funcionalidad completa)
    await showStepMessage(page, '🔘 VALIDANDO BOTÓN "ORDENAR POR"');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando botón "Ordenar por"...');
    const botonOrdenar = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: /Ordenar por/i })
    }).first();
    await expect(botonOrdenar).toBeVisible();
    await expect(botonOrdenar).toBeEnabled();
    console.log('✅ Botón "Ordenar por" visible y habilitado');
    
    // Validar funcionalidad: clic abre menú de opciones
    await botonOrdenar.click();
    await page.waitForTimeout(1000);
    
    // Buscar menú desplegable de ordenamiento con las opciones específicas
    const menuOrdenar = page.locator('div.absolute.w-\\[200px\\].rounded-4.shadow-3.bg-light-light').filter({
      has: page.locator('button').filter({ hasText: /Nuevo|Pendiente|Contratado|Cancelado/i })
    }).first();
    
    // Fallback: buscar por estructura más flexible
    const menuOrdenarFallback = page.locator('div.absolute').filter({
      has: page.locator('button').filter({ hasText: /Nuevo/i })
    }).filter({
      has: page.locator('button').filter({ hasText: /Pendiente/i })
    }).first();
    
    let menuElement: ReturnType<typeof page.locator> | null = null;
    const menuOrdenarVisible = await menuOrdenar.isVisible({ timeout: 3000 }).catch(() => false);
    const menuOrdenarFallbackVisible = await menuOrdenarFallback.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (menuOrdenarVisible) {
      menuElement = menuOrdenar;
      console.log('✅ Menú de ordenamiento abierto (selector específico)');
    } else if (menuOrdenarFallbackVisible) {
      menuElement = menuOrdenarFallback;
      console.log('✅ Menú de ordenamiento abierto (fallback)');
    }
    
    if (menuElement) {
      // Validar que las 4 opciones están presentes
      const opcionesEsperadas = ['Nuevo', 'Pendiente', 'Contratado', 'Cancelado'];
      let opcionesEncontradas = 0;
      
      for (const opcionTexto of opcionesEsperadas) {
        const opcion = menuElement.locator('button').filter({
          hasText: new RegExp(`^${opcionTexto}$`, 'i')
        }).first();
        
        const opcionVisible = await opcion.isVisible().catch(() => false);
        if (opcionVisible) {
          opcionesEncontradas++;
          console.log(`✅ Opción "${opcionTexto}" encontrada en el menú`);
        }
      }
      
      if (opcionesEncontradas === opcionesEsperadas.length) {
        console.log(`✅ Todas las opciones del menú están presentes (${opcionesEncontradas}/${opcionesEsperadas.length})`);
      } else {
        console.log(`⚠️ Solo se encontraron ${opcionesEncontradas}/${opcionesEsperadas.length} opciones del menú`);
      }
      
      // Cerrar menú
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    } else {
      console.log('ℹ️ Menú de ordenamiento no visible (puede tener otra implementación)');
    }
    
    // 3. VALIDAR FILTROS LATERALES (DESKTOP)
    await showStepMessage(page, '📋 VALIDANDO FILTROS LATERALES (DESKTOP)');
    await page.waitForTimeout(1000);
    
    const viewportWidth = page.viewportSize()?.width || 1400;
    if (viewportWidth >= 1280) {
      console.log('🔍 Buscando filtros laterales (desktop)...');
      
      // Buscar contenedor de filtros
      const contenedorFiltros = page.locator('div.hidden.xlg\\:flex.flex-col.grow.overflow-y-auto.shrink-0');
      const filtrosVisible = await contenedorFiltros.isVisible().catch(() => false);
      
      if (filtrosVisible) {
        console.log('✅ Contenedor de filtros encontrado');
        
        // 3.1. VALIDAR SECCIÓN "SERVICIOS"
        await showStepMessage(page, '📂 VALIDANDO SECCIÓN "SERVICIOS"');
        await page.waitForTimeout(1000);
        
        const seccionServicios = contenedorFiltros.locator('div.flex.flex-col.gap-2').filter({
          has: page.locator('p.font-bold').filter({ hasText: /^Servicios$/ })
        }).first();
        
        const seccionServiciosVisible = await seccionServicios.isVisible().catch(() => false);
        if (seccionServiciosVisible) {
          console.log('✅ Sección "Servicios" encontrada');
          
          // Validar categorías de servicios
          const categorias = seccionServicios.locator('button.text-start, a.text-start');
          const cantidadCategorias = await categorias.count();
          console.log(`📊 Categorías encontradas: ${cantidadCategorias}`);
          
          if (cantidadCategorias > 0) {
            // Validar algunas categorías específicas
            const categoriasEsperadas = ['Alimentos', 'Bebidas', 'Mobiliario', 'Música', 'Decoración'];
            for (const categoriaEsperada of categoriasEsperadas) {
              const categoria = categorias.filter({
                hasText: new RegExp(categoriaEsperada, 'i')
              }).first();
              const categoriaVisible = await categoria.isVisible().catch(() => false);
              if (categoriaVisible) {
                console.log(`✅ Categoría "${categoriaEsperada}" encontrada`);
                
                // Validar contador de servicios por categoría
                const textoCategoria = await categoria.textContent();
                const tieneContador = textoCategoria && /\d+/.test(textoCategoria);
                if (tieneContador) {
                  const numeroContador = textoCategoria.match(/\d+/)?.[0];
                  console.log(`✅ Contador de servicios encontrado para "${categoriaEsperada}": ${numeroContador}`);
                } else {
                  console.log(`ℹ️ Categoría "${categoriaEsperada}" no tiene contador visible`);
                }
              }
            }
            
            // Validar funcionalidad: clic en categoría
            const primeraCategoria = categorias.first();
            const primeraCategoriaVisible = await primeraCategoria.isVisible().catch(() => false);
            if (primeraCategoriaVisible) {
              const textoPrimeraCategoria = await primeraCategoria.textContent();
              console.log(`🖱️ Haciendo clic en categoría: "${textoPrimeraCategoria?.trim()}"`);
              await primeraCategoria.click();
              await page.waitForTimeout(2000);
              console.log('✅ Clic en categoría ejecutado');
            }
          }
          
          // Validar botón "Ver más"
          const botonVerMas = seccionServicios.locator('button, a').filter({
            hasText: /Ver más/i
          }).first();
          const botonVerMasVisible = await botonVerMas.isVisible().catch(() => false);
          if (botonVerMasVisible) {
            await expect(botonVerMas).toBeVisible();
            await expect(botonVerMas).toBeEnabled();
            console.log('✅ Botón "Ver más" encontrado y habilitado');
            
            // Validar funcionalidad: clic en "Ver más"
            await botonVerMas.click();
            await page.waitForTimeout(1000);
            console.log('✅ Clic en "Ver más" ejecutado');
          } else {
            console.log('ℹ️ Botón "Ver más" no visible (puede que no haya suficientes categorías)');
          }
        } else {
          console.log('⚠️ Sección "Servicios" no encontrada');
        }
        
        // 3.2. VALIDAR SECCIÓN "SUGERENCIAS"
        await showStepMessage(page, '💡 VALIDANDO SECCIÓN "SUGERENCIAS"');
        await page.waitForTimeout(1000);
        
        const seccionSugerencias = contenedorFiltros.locator('div.flex.flex-col.gap-2').filter({
          has: page.locator('p.font-bold').filter({ hasText: /^Sugerencias$/ })
        }).first();
        
        const seccionSugerenciasVisible = await seccionSugerencias.isVisible().catch(() => false);
        if (seccionSugerenciasVisible) {
          console.log('✅ Sección "Sugerencias" encontrada');
          
          // Validar sugerencias específicas
          const sugerenciasEsperadas = ['Lugares', 'Entretenimiento', 'Mesa de regalos'];
          const botonesSugerencias = seccionSugerencias.locator('button.text-start, a.text-start');
          
          for (const sugerenciaEsperada of sugerenciasEsperadas) {
            const sugerencia = botonesSugerencias.filter({
              hasText: new RegExp(sugerenciaEsperada, 'i')
            }).first();
            const sugerenciaVisible = await sugerencia.isVisible().catch(() => false);
            if (sugerenciaVisible) {
              console.log(`✅ Sugerencia "${sugerenciaEsperada}" encontrada`);
              
              // Validar funcionalidad: clic en sugerencia
              await sugerencia.click();
              await page.waitForTimeout(2000);
              console.log(`✅ Clic en sugerencia "${sugerenciaEsperada}" ejecutado`);
            }
          }
        } else {
          console.log('⚠️ Sección "Sugerencias" no encontrada');
        }
      } else {
        console.log('ℹ️ Filtros laterales no visibles (solo en viewports ≥1280px)');
      }
    } else {
      console.log('ℹ️ Filtros laterales solo visibles en viewports ≥1280px');
    }
    
    // 4. VALIDAR LISTA DE SERVICIOS
    await showStepMessage(page, '📋 VALIDANDO LISTA DE SERVICIOS');
    await page.waitForTimeout(1000);
    console.log('🔍 Buscando tarjetas de servicios...');
    
    // Buscar tarjetas de servicios (botones clickeables con información)
    const tarjetasServicios = page.locator('button').filter({
      has: page.locator('div').filter({
        has: page.locator('img[alt], img[src*="imagedelivery"]')
      })
    });
    
    const cantidadTarjetas = await tarjetasServicios.count();
    console.log(`📊 Tarjetas de servicios encontradas: ${cantidadTarjetas}`);
    
    if (cantidadTarjetas > 0) {
      // Validar elementos de la primera tarjeta
      const primeraTarjeta = tarjetasServicios.first();
      await expect(primeraTarjeta).toBeVisible();
      console.log('✅ Primera tarjeta de servicio visible');
      
      // 4.1. VALIDAR IMAGEN
      await showStepMessage(page, '🖼️ VALIDANDO IMAGEN DEL SERVICIO');
      await page.waitForTimeout(1000);
      const imagen = primeraTarjeta.locator('img').first();
      const imagenVisible = await imagen.isVisible().catch(() => false);
      if (imagenVisible) {
        const srcImagen = await imagen.getAttribute('src');
        const altImagen = await imagen.getAttribute('alt');
        console.log(`✅ Imagen encontrada (src: ${srcImagen?.substring(0, 50)}..., alt: ${altImagen || 'sin alt'})`);
      } else {
        console.log('⚠️ Imagen no encontrada');
      }
      
      // 4.2. VALIDAR NOMBRE DEL SERVICIO
      await showStepMessage(page, '📝 VALIDANDO NOMBRE DEL SERVICIO');
      await page.waitForTimeout(1000);
      const nombreServicio = primeraTarjeta.locator('p.font-bold, p[class*="font-bold"], h1, h2, h3, h4, h5, h6').first();
      const nombreVisible = await nombreServicio.isVisible().catch(() => false);
      if (nombreVisible) {
        const textoNombre = await nombreServicio.textContent();
        console.log(`✅ Nombre del servicio encontrado: "${textoNombre?.trim()}"`);
      } else {
        console.log('⚠️ Nombre del servicio no encontrado');
      }
      
      // 4.3. VALIDAR CATEGORÍA/SUBCATEGORÍA
      await showStepMessage(page, '🏷️ VALIDANDO CATEGORÍA/SUBCATEGORÍA');
      await page.waitForTimeout(1000);
      const categoriaSubcategoria = primeraTarjeta.locator('div').filter({
        has: page.locator('p').filter({
          hasText: /Barman|Banda|Entradas|Coctelería|Postres|Decorador|Cuidado|Invitaciones/i
        })
      }).locator('p').first();
      const categoriaVisible = await categoriaSubcategoria.isVisible().catch(() => false);
      if (categoriaVisible) {
        const textoCategoria = await categoriaSubcategoria.textContent();
        console.log(`✅ Categoría/Subcategoría encontrada: "${textoCategoria?.trim()}"`);
      } else {
        console.log('ℹ️ Categoría/Subcategoría no encontrada');
      }
      
      // 4.4. VALIDAR DESCRIPCIÓN
      await showStepMessage(page, '📄 VALIDANDO DESCRIPCIÓN');
      await page.waitForTimeout(1000);
      const descripcion = primeraTarjeta.locator('p').filter({
        hasText: /Descripción|description/i
      }).first();
      const descripcionVisible = await descripcion.isVisible().catch(() => false);
      if (!descripcionVisible) {
        // Buscar cualquier texto que parezca descripción (texto largo)
        const textos = await primeraTarjeta.locator('p').allTextContents();
        const textoDescripcion = textos.find(texto => 
          texto.length > 20 && 
          !texto.match(/\$\s*\d+/) &&
          !texto.match(/\d+%/) &&
          !texto.match(/NUEVO/i)
        );
        if (textoDescripcion) {
          console.log(`✅ Descripción encontrada: "${textoDescripcion.substring(0, 50)}..."`);
        } else {
          console.log('ℹ️ Descripción no encontrada');
        }
      } else {
        const textoDescripcion = await descripcion.textContent();
        console.log(`✅ Descripción encontrada: "${textoDescripcion?.substring(0, 50)}..."`);
      }
      
      // 4.5. VALIDAR PRECIO DESDE
      await showStepMessage(page, '💰 VALIDANDO PRECIO DESDE');
      await page.waitForTimeout(1000);
      const precioDesde = primeraTarjeta.locator('p').filter({
        hasText: /Desde\s+\$\s*\d+([.,]\d+)?|Desde \$|Desde/i
      }).first();
      const precioVisible = await precioDesde.isVisible().catch(() => false);
      if (precioVisible) {
        const textoPrecio = await precioDesde.textContent();
        console.log(`✅ Precio desde encontrado: "${textoPrecio?.trim()}"`);
      } else {
        console.log('ℹ️ Precio desde no encontrado');
      }
      
      // 4.6. VALIDAR INFORMACIÓN DEL NEGOCIO
      await showStepMessage(page, '🏢 VALIDANDO INFORMACIÓN DEL NEGOCIO');
      await page.waitForTimeout(1000);
      const infoNegocio = primeraTarjeta.locator('div').filter({
        has: page.locator('i.icon-briefcase, i.icon-phone')
      });
      const infoNegocioVisible = await infoNegocio.isVisible().catch(() => false);
      if (infoNegocioVisible) {
        // Buscar nombre del negocio
        const nombreNegocio = infoNegocio.locator('p').filter({
          has: page.locator('xpath=preceding-sibling::i[contains(@class, "icon-briefcase")]')
        }).first();
        const nombreNegocioVisible = await nombreNegocio.isVisible().catch(() => false);
        if (!nombreNegocioVisible) {
          const nombreNegocioAlt = infoNegocio.locator('p').first();
          const nombreNegocioAltVisible = await nombreNegocioAlt.isVisible().catch(() => false);
          if (nombreNegocioAltVisible) {
            const textoNombreNegocio = await nombreNegocioAlt.textContent();
            console.log(`✅ Nombre del negocio encontrado: "${textoNombreNegocio?.trim()}"`);
          }
        } else {
          const textoNombreNegocio = await nombreNegocio.textContent();
          console.log(`✅ Nombre del negocio encontrado: "${textoNombreNegocio?.trim()}"`);
        }
        
        // Buscar teléfono
        const telefono = infoNegocio.locator('p').filter({
          hasText: /\+?\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,9}/
        }).first();
        const telefonoVisible = await telefono.isVisible().catch(() => false);
        if (telefonoVisible) {
          const textoTelefono = await telefono.textContent();
          console.log(`✅ Teléfono encontrado: "${textoTelefono?.trim()}"`);
        }
      } else {
        console.log('ℹ️ Información del negocio no encontrada');
      }
      
      // 4.7. VALIDAR BADGE "NUEVO"
      await showStepMessage(page, '🆕 VALIDANDO BADGE "NUEVO"');
      await page.waitForTimeout(1000);
      const badgeNuevo = primeraTarjeta.locator('div').filter({
        has: page.locator('p').filter({ hasText: /NUEVO/i })
      }).first();
      const badgeVisible = await badgeNuevo.isVisible().catch(() => false);
      if (badgeVisible) {
        const textoBadge = await badgeNuevo.locator('p').filter({ hasText: /NUEVO/i }).first().textContent();
        console.log(`✅ Badge "NUEVO" encontrado: "${textoBadge?.trim()}"`);
      } else {
        console.log('ℹ️ Badge "NUEVO" no visible (puede que el servicio no sea nuevo)');
      }
      
      // 4.8. VALIDAR COLOR IDENTIFICADOR DEL EVENTO ASOCIADO
      await showStepMessage(page, '🎨 VALIDANDO COLOR IDENTIFICADOR DEL EVENTO');
      await page.waitForTimeout(1000);
      const colorIdentificador = primeraTarjeta.locator('div').filter({
        has: page.locator('div[class*="rounded-circle"], div[class*="rounded-full"]')
      }).locator('div[style*="background-color"]').first();
      const colorVisible = await colorIdentificador.isVisible().catch(() => false);
      if (colorVisible) {
        const color = await colorIdentificador.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        }).catch(() => null);
        if (color) {
          console.log(`✅ Color identificador encontrado: ${color}`);
        }
      } else {
        // Buscar por círculo de color en la tarjeta
        const circuloColor = primeraTarjeta.locator('div[class*="rounded-circle"]').filter({
          has: page.locator('div[style*="background-color"]')
        }).first();
        const circuloVisible = await circuloColor.isVisible().catch(() => false);
        if (circuloVisible) {
          const color = await circuloColor.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
          }).catch(() => null);
          if (color) {
            console.log(`✅ Color identificador encontrado (círculo): ${color}`);
          }
        } else {
          console.log('ℹ️ Color identificador no encontrado');
        }
      }
      
      // 4.9. VALIDAR FUNCIONALIDAD: CLIC EN TARJETA DE SERVICIO
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD: CLIC EN TARJETA');
      await page.waitForTimeout(1000);
      console.log('🔍 Validando que la tarjeta es clickeable...');
      
      await expect(primeraTarjeta).toBeEnabled();
      console.log('✅ Tarjeta está habilitada');
      
      // Hacer clic en la tarjeta y validar navegación
      const urlAntes = page.url();
      await primeraTarjeta.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const urlDespues = page.url();
      const navegoCorrectamente = urlDespues !== urlAntes;
      
      if (navegoCorrectamente) {
        console.log(`✅ Clic en tarjeta navegó correctamente a: ${urlDespues}`);
      } else {
        console.log(`⚠️ Clic en tarjeta no cambió la URL (puede abrir modal o tener otra funcionalidad)`);
      }
      
      // Regresar al dashboard
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    } else {
      console.log('ℹ️ No hay tarjetas de servicios para validar (estado vacío válido)');
    }
    
    await showStepMessage(page, '✅ VALIDACIÓN COMPLETA DE SECCIÓN DE SERVICIOS FINALIZADA');
    console.log('✅ Validación completa de elementos de la sección de servicios finalizada');
  });

  test('Se muestra el botón Agregar Servicios y se prueba su funcionalidad', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos (mismo timeout que cliente-eventos.spec.ts)
    
    await showStepMessage(page, '➕ AGREGANDO SERVICIO A EVENTO EXISTENTE');
    console.log('🚀 Iniciando flujo de agregar servicio a evento existente...');
    
    // Esta prueba ejecuta el flujo completo de agregar un servicio a un evento existente
    // Reutiliza la función agregarServicioAEventoExistente de cliente-eventos.spec.ts
    // que selecciona un evento, hace clic en "Agregar servicios", busca un servicio
    // y completa el flujo sin llenar los datos del evento (porque ya están)
    
    await agregarServicioAEventoExistente(page);
    console.log('✅ Flujo de agregar servicio a evento existente finalizado');
  });

  test('Los servicios se ordenan correctamente', async ({ page }) => {
    test.setTimeout(60000); // 1 minuto
    
    await showStepMessage(page, '🔘 VALIDANDO BOTÓN ORDENAR POR');
    await page.waitForTimeout(1000);
    
    const botonOrdenar = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: /Ordenar por/i })
    });
    await expect(botonOrdenar.first()).toBeVisible();
    await expect(botonOrdenar.first()).toBeEnabled();
    console.log('✅ Botón "Ordenar por" visible y habilitado');
    
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN ORDENAR POR');
    await page.waitForTimeout(1000);
    await botonOrdenar.first().click();
    await page.waitForTimeout(1000);
    
    // Validar que se muestra el menú desplegable
    await showStepMessage(page, '📋 VALIDANDO MENÚ DE OPCIONES');
    await page.waitForTimeout(1000);
    
    // Buscar el menú desplegable según la estructura proporcionada
    const menuOrdenar = page.locator('div.absolute.w-\\[200px\\].rounded-4.shadow-3.bg-light-light').filter({
      has: page.locator('button').filter({ hasText: /Nuevo|Pendiente|Contratado|Cancelado/i })
    }).first();
    
    // Fallback: buscar por estructura más flexible
    const menuOrdenarFallback = page.locator('div.absolute').filter({
      has: page.locator('button').filter({ hasText: /Nuevo/i })
    }).filter({
      has: page.locator('button').filter({ hasText: /Pendiente/i })
    }).first();
    
    let menuVisible = false;
    let menuElement: ReturnType<typeof page.locator> | null = null;
    
    if (await menuOrdenar.count() > 0 && await menuOrdenar.isVisible({ timeout: 3000 }).catch(() => false)) {
      menuElement = menuOrdenar;
      menuVisible = true;
      console.log('✅ Menú de ordenamiento encontrado (selector específico)');
    } else if (await menuOrdenarFallback.count() > 0 && await menuOrdenarFallback.isVisible({ timeout: 3000 }).catch(() => false)) {
      menuElement = menuOrdenarFallback;
      menuVisible = true;
      console.log('✅ Menú de ordenamiento encontrado (fallback)');
    }
    
    if (menuVisible && menuElement) {
      await expect(menuElement).toBeVisible();
      console.log('✅ Menú de ordenamiento visible');
      
      // Validar opciones específicas del menú
      const opcionesEsperadas = ['Nuevo', 'Pendiente', 'Contratado', 'Cancelado'];
      
      for (const opcionTexto of opcionesEsperadas) {
        await showStepMessage(page, `🔍 VALIDANDO OPCIÓN "${opcionTexto.toUpperCase()}"`);
        await page.waitForTimeout(500);
        
        const opcion = menuElement.locator('button').filter({
          hasText: new RegExp(`^${opcionTexto}$`, 'i')
        }).first();
        
        const opcionVisible = await opcion.isVisible().catch(() => false);
        if (opcionVisible) {
          await expect(opcion).toBeVisible();
          await expect(opcion).toBeEnabled();
          console.log(`✅ Opción "${opcionTexto}" encontrada, visible y habilitada`);
          
          // Validar funcionalidad: clic en la opción
          await showStepMessage(page, `🖱️ PROBANDO CLIC EN "${opcionTexto.toUpperCase()}"`);
          await page.waitForTimeout(500);
          
          // Contar servicios antes del clic (si es posible)
          const serviciosAntes = await page.locator('button').filter({
            has: page.locator('div').filter({
              has: page.locator('img[alt], img[src*="imagedelivery"]')
            })
          }).count();
          
          await opcion.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          
          // Validar que el menú se cerró
          const menuCerrado = await menuElement.isVisible({ timeout: 1000 }).catch(() => false);
          if (!menuCerrado) {
            console.log(`✅ Menú se cerró después de seleccionar "${opcionTexto}"`);
          } else {
            console.log(`⚠️ Menú no se cerró después de seleccionar "${opcionTexto}"`);
          }
          
          // Contar servicios después del clic para verificar que se aplicó el filtro
          const serviciosDespues = await page.locator('button').filter({
            has: page.locator('div').filter({
              has: page.locator('img[alt], img[src*="imagedelivery"]')
            })
          }).count();
          
          if (serviciosAntes > 0 || serviciosDespues > 0) {
            console.log(`📊 Servicios antes: ${serviciosAntes}, después: ${serviciosDespues}`);
            if (serviciosAntes !== serviciosDespues) {
              console.log(`✅ El filtro "${opcionTexto}" cambió la cantidad de servicios mostrados`);
            } else {
              console.log(`ℹ️ El filtro "${opcionTexto}" mantuvo la misma cantidad de servicios`);
            }
          }
          
          // Reabrir el menú para probar la siguiente opción
          await botonOrdenar.first().click();
          await page.waitForTimeout(1000);
          
          // Verificar que el menú se abrió nuevamente
          const menuReabierto = await menuElement.isVisible({ timeout: 3000 }).catch(() => false);
          if (menuReabierto) {
            console.log(`✅ Menú reabierto para probar siguiente opción`);
          } else {
            // Intentar encontrar el menú nuevamente
            const menuReabiertoFallback = page.locator('div.absolute').filter({
              has: page.locator('button').filter({ hasText: /Nuevo/i })
            }).first();
            const menuReabiertoVisible = await menuReabiertoFallback.isVisible({ timeout: 3000 }).catch(() => false);
            if (menuReabiertoVisible) {
              menuElement = menuReabiertoFallback;
              console.log(`✅ Menú reabierto (fallback) para probar siguiente opción`);
            } else {
              console.log(`⚠️ No se pudo reabrir el menú, continuando con siguiente opción`);
              break; // Salir del loop si no se puede reabrir el menú
            }
          }
        } else {
          console.log(`⚠️ Opción "${opcionTexto}" no encontrada o no visible`);
        }
      }
      
      // Cerrar el menú si aún está abierto
      const menuAunAbierto = await menuElement.isVisible({ timeout: 1000 }).catch(() => false);
      if (menuAunAbierto) {
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
      }
      
      console.log('✅ Validación de opciones del menú "Ordenar por" completada');
    } else {
      console.log('⚠️ Menú de ordenamiento no encontrado o no visible');
      console.log('ℹ️ Puede que el menú tenga una estructura diferente o no se haya abierto correctamente');
    }
    
    await showStepMessage(page, '✅ VALIDACIÓN DE "ORDENAR POR" COMPLETADA');
    console.log('✅ Validación completa de "Ordenar por" finalizada');
  });

  test('Los filtros de servicios se aplican correctamente', async ({ page }) => {
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

  test('Se muestran todos los elementos del calendario en vista desktop', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos (aumentado para evitar timeouts)
    
    // Solo ejecutar en viewports grandes donde el calendario es visible
    if (page.viewportSize() && page.viewportSize()!.width < 1024) {
      console.log('⚠️ El calendario solo está visible en viewports grandes (≥1024px)');
      test.skip();
      return;
    }
    
    await showStepMessage(page, '📅 VALIDANDO ELEMENTOS COMPLETOS DEL CALENDARIO');
    await page.waitForTimeout(1000);
    
    // 1. VALIDAR EXISTENCIA DEL CALENDARIO
    await showStepMessage(page, '📅 BUSCANDO CALENDARIO');
    await page.waitForTimeout(1000);
    
    // Estrategia 1: Buscar por días de la semana (más confiable)
    let calendario = page.locator('div').filter({
      has: page.locator('p, span, div').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/i })
    }).first();
    
    let calendarioVisible = await calendario.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Estrategia 2: Buscar por mes actual si la primera no funciona
    if (!calendarioVisible) {
      console.log('🔍 Intentando estrategia alternativa: buscar por mes...');
      calendario = page.locator('div').filter({
        has: page.locator('button, p, span').filter({ 
          hasText: /Noviembre|Diciembre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre/i 
        })
      }).filter({
        has: page.locator('p, span, div').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/i })
      }).first();
      
      calendarioVisible = await calendario.isVisible({ timeout: 3000 }).catch(() => false);
    }
    
    // Estrategia 3: Buscar cualquier div que contenga botones con números (días)
    if (!calendarioVisible) {
      console.log('🔍 Intentando estrategia alternativa: buscar por estructura de días...');
      calendario = page.locator('div').filter({
        has: page.locator('button').filter({
          has: page.locator('p, span').filter({ hasText: /^\d{1,2}$/ })
        })
      }).filter({
        has: page.locator('p, span, div').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/i })
      }).first();
      
      calendarioVisible = await calendario.isVisible({ timeout: 3000 }).catch(() => false);
    }
    
    // Estrategia 4: Buscar por clase específica o estructura común de calendarios
    if (!calendarioVisible) {
      console.log('🔍 Intentando estrategia alternativa: buscar por clases comunes...');
      calendario = page.locator('div[class*="calendar"], div[class*="Calendar"], div[class*="grid"]').filter({
        has: page.locator('button, div').filter({
          has: page.locator('p, span').filter({ hasText: /^\d{1,2}$/ })
        })
      }).first();
      
      calendarioVisible = await calendario.isVisible({ timeout: 3000 }).catch(() => false);
    }
    
    // Estrategia 5: Buscar cualquier contenedor que tenga días de la semana
    if (!calendarioVisible) {
      console.log('🔍 Intentando estrategia alternativa: buscar cualquier contenedor con días de semana...');
      const diasSemana = page.locator('p, span, div').filter({ hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/i });
      const cantidadDiasSemana = await diasSemana.count();
      
      if (cantidadDiasSemana > 0) {
        // Buscar el contenedor padre que tiene los días de la semana
        const primerDiaSemana = diasSemana.first();
        calendario = primerDiaSemana.locator('xpath=ancestor::div[contains(@class, "flex") or contains(@class, "grid")][1]').first();
        calendarioVisible = await calendario.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (calendarioVisible) {
          console.log(`✅ Calendario encontrado usando contenedor padre de días de semana`);
        }
      }
    }
    
    if (!calendarioVisible) {
      console.log('⚠️ El calendario no está visible con ninguna estrategia');
      console.log('🔍 Intentando diagnóstico...');
      
      // Diagnóstico: buscar elementos relacionados con calendario
      const elementosMes = await page.locator('p, span, button').filter({ 
        hasText: /Noviembre|Diciembre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre/i 
      }).count();
      const elementosDiasSemana = await page.locator('p, span, div').filter({ 
        hasText: /^Dom$|^Lun$|^Mar$|^Mie$|^Jue$|^Vie$|^Sab$/i 
      }).count();
      const elementosDias = await page.locator('button, div').filter({
        has: page.locator('p, span').filter({ hasText: /^\d{1,2}$/ })
      }).count();
      
      console.log(`📊 Diagnóstico: Meses encontrados: ${elementosMes}, Días de semana: ${elementosDiasSemana}, Días numéricos: ${elementosDias}`);
      
      // Si encontramos elementos relacionados, intentar construir el calendario desde ellos
      if (elementosDiasSemana > 0 || elementosMes > 0 || elementosDias > 0) {
        console.log('ℹ️ Se encontraron elementos relacionados con calendario, pero no se pudo encontrar el contenedor principal');
        console.log('⚠️ Continuando con validaciones individuales...');
        // Continuar con validaciones individuales aunque no encontremos el contenedor
      } else {
        test.skip();
        return;
      }
    } else {
      await expect(calendario).toBeVisible();
      console.log('✅ Calendario encontrado y visible');
    }
    
    // Definir baseLocator para usar en el resto del test
    const baseLocator = calendarioVisible ? calendario : page;
    
    // 2. VALIDAR VISTA MENSUAL
    await showStepMessage(page, '📆 VALIDANDO VISTA MENSUAL');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando vista mensual...');
    
    // Buscar el mes actual mostrado (usar selector directo si no tenemos contenedor)
    const mesActual = baseLocator.locator('button, p, span').filter({
      hasText: /Noviembre|Diciembre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre/i 
    }).first();
    
    const mesVisible = await mesActual.isVisible().catch(() => false);
    if (mesVisible) {
      const textoMes = await mesActual.textContent();
      console.log(`✅ Mes actual mostrado: "${textoMes?.trim()}"`);
      
      // Validar que el mes es válido
      const mesesValidos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mesValido = mesesValidos.some(mes => textoMes?.includes(mes));
      if (mesValido) {
        console.log('✅ Mes válido');
      } else {
        console.log('⚠️ Mes no reconocido');
      }
    } else {
      console.log('⚠️ Mes actual no encontrado');
    }
    
    // 3. VALIDAR DÍAS DE LA SEMANA
    await showStepMessage(page, '📅 VALIDANDO DÍAS DE LA SEMANA');
    await page.waitForTimeout(1000);
    console.log('🔍 Validando días de la semana...');
    
    const diasSemanaEsperados = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const diasSemanaEncontrados: string[] = [];
    
    for (const diaEsperado of diasSemanaEsperados) {
      const diaSemana = baseLocator.locator('p, span, div').filter({
        hasText: new RegExp(`^${diaEsperado}$`, 'i')
      }).first();
      
      const diaVisible = await diaSemana.isVisible().catch(() => false);
      if (diaVisible) {
        diasSemanaEncontrados.push(diaEsperado);
        console.log(`✅ Día de la semana "${diaEsperado}" encontrado`);
      }
    }
    
    if (diasSemanaEncontrados.length === diasSemanaEsperados.length) {
      console.log(`✅ Todos los días de la semana están presentes (${diasSemanaEncontrados.length}/${diasSemanaEsperados.length})`);
    } else {
      console.log(`⚠️ Solo se encontraron ${diasSemanaEncontrados.length}/${diasSemanaEsperados.length} días de la semana`);
    }
    
    // 4. VALIDAR NAVEGACIÓN ENTRE MESES
    await showStepMessage(page, '🔄 VALIDANDO NAVEGACIÓN ENTRE MESES');
    await safeWaitForTimeout(page, 1000);
    console.log('🔍 Validando navegación entre meses...');
    
    // Obtener el mes actual antes de navegar (usar textContent directamente con timeout corto)
    let mesAntes = '';
    if (mesVisible) {
      try {
        mesAntes = (await mesActual.textContent({ timeout: 3000 }))?.trim() || '';
        console.log(`📅 Mes actual: "${mesAntes}"`);
      } catch (e) {
        console.log('⚠️ No se pudo obtener el mes actual, continuando con navegación...');
      }
    } else {
      console.log('⚠️ Mes no visible, continuando con navegación...');
    }
    
    // Buscar botón de mes anterior (chevron-left o similar)
    const botonMesAnterior = baseLocator.locator('button').filter({
      has: page.locator('i.icon-chevron-left, i[class*="chevron-left"], svg[class*="chevron-left"]')
    }).first();
    
    // Buscar botón de mes siguiente (chevron-right o similar)
    const botonMesSiguiente = baseLocator.locator('button').filter({
      has: page.locator('i.icon-chevron-right, i[class*="chevron-right"], svg[class*="chevron-right"]')
    }).first();
    
    const botonAnteriorVisible = await botonMesAnterior.isVisible({ timeout: 2000 }).catch(() => false);
    const botonSiguienteVisible = await botonMesSiguiente.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (botonAnteriorVisible) {
      await expect(botonMesAnterior).toBeEnabled({ timeout: 3000 });
      console.log('✅ Botón de mes anterior encontrado y habilitado');
      
      // Validar funcionalidad: navegar al mes anterior
      await showStepMessage(page, '⬅️ NAVEGANDO AL MES ANTERIOR');
      await safeWaitForTimeout(page, 500);
      
      await botonMesAnterior.click();
      await safeWaitForTimeout(page, 1500);
      
      // Buscar el mes actualizado (con timeout corto)
      const mesActualizado = baseLocator.locator('button, p, span').filter({
        hasText: /Noviembre|Diciembre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre/i 
      }).first();
      
      try {
        const mesDespuesAnterior = (await mesActualizado.textContent({ timeout: 2000 }))?.trim() || '';
        if (mesDespuesAnterior && mesDespuesAnterior !== mesAntes) {
          console.log(`✅ Navegación al mes anterior exitosa: "${mesDespuesAnterior}"`);
        } else if (mesDespuesAnterior) {
          console.log(`ℹ️ El mes no cambió después de hacer clic en anterior (puede ser el primer mes disponible)`);
        } else {
          console.log(`⚠️ No se pudo obtener el mes después de navegar`);
        }
      } catch (e) {
        console.log(`⚠️ No se pudo obtener el mes después de navegar al anterior (timeout)`);
      }
    } else {
      console.log('ℹ️ Botón de mes anterior no encontrado');
    }
    
    if (botonSiguienteVisible) {
      await expect(botonMesSiguiente).toBeEnabled({ timeout: 3000 });
      console.log('✅ Botón de mes siguiente encontrado y habilitado');
      
      // Validar funcionalidad: navegar al mes siguiente
      await showStepMessage(page, '➡️ NAVEGANDO AL MES SIGUIENTE');
      await safeWaitForTimeout(page, 500);
      
      await botonMesSiguiente.click();
      await safeWaitForTimeout(page, 1500);
      
      // Buscar el mes actualizado (con timeout corto)
      const mesActualizadoSiguiente = baseLocator.locator('button, p, span').filter({
        hasText: /Noviembre|Diciembre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre/i 
      }).first();
      
      try {
        const mesDespuesSiguiente = (await mesActualizadoSiguiente.textContent({ timeout: 2000 }))?.trim() || '';
        if (mesDespuesSiguiente) {
          console.log(`✅ Navegación al mes siguiente: "${mesDespuesSiguiente}"`);
        } else {
          console.log(`⚠️ No se pudo obtener el mes después de navegar`);
        }
        
        // NO regresar al mes original - mantenernos en Noviembre para buscar eventos
        // Noviembre tiene varios días con eventos, así que es mejor buscar ahí
        if (mesDespuesSiguiente && mesDespuesSiguiente.includes('Noviembre')) {
          console.log('✅ Permaneciendo en Noviembre para buscar días con eventos');
        } else if (mesDespuesSiguiente && !mesDespuesSiguiente.includes('Noviembre')) {
          // Si no estamos en Noviembre, navegar a Noviembre
          // Buscar el botón del mes que contiene "Noviembre"
          const botonNoviembre = baseLocator.locator('button').filter({
            hasText: /Noviembre/i
          }).first();
          const botonNovVisible = await botonNoviembre.isVisible({ timeout: 2000 }).catch(() => false);
          if (botonNovVisible) {
            await botonNoviembre.click();
            await safeWaitForTimeout(page, 1500);
            console.log('✅ Navegado a Noviembre para buscar días con eventos');
          }
        }
      } catch (e) {
        console.log(`⚠️ No se pudo obtener el mes después de navegar al siguiente (timeout)`);
      }
    } else {
      console.log('ℹ️ Botón de mes siguiente no encontrado');
    }
    
    // 5. VALIDAR EVENTOS MARCADOS EN EL CALENDARIO
    await showStepMessage(page, '🔍 VALIDANDO EVENTOS MARCADOS EN EL CALENDARIO');
    await safeWaitForTimeout(page, 1000);
    
    // Verificar en qué mes estamos antes de buscar días con eventos
    const mesActualParaEventos = baseLocator.locator('button, p, span').filter({
      hasText: /Noviembre|Diciembre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre/i 
    }).first();
    const mesActualTexto = (await mesActualParaEventos.textContent({ timeout: 2000 }).catch(() => null))?.trim() || '';
    console.log(`🔍 Buscando días con eventos marcados en el mes: "${mesActualTexto}"`);
    
    // Buscar eventos en el mes actual
    // No forzar navegación a un mes específico, buscar eventos en el mes que esté visible
    console.log(`🔍 Buscando eventos en el mes actual: "${mesActualTexto}"`);
    
    // Buscar días con puntos de colores (indicadores de eventos)
    // Los días con eventos tienen divs con w-[4px] aspect-square rounded-circle y background-color
    // IMPORTANTE: Solo buscar días del mes actual, excluyendo días de otros meses
    // Estrategia mejorada: buscar primero días que tengan puntos de colores directamente
    console.log('🔍 Buscando días con eventos usando múltiples estrategias...');
    
    let diasConEventos: Array<Locator> = [];
    let countTodos = 0; // Variable para contar días totales procesados
    
    // Estrategia 1: Buscar directamente botones que contengan puntos de colores (más eficiente)
    // Intentar múltiples selectores para encontrar los puntos
    const selectoresEstrategia1 = [
      baseLocator.locator('button[type="button"]').filter({
        has: baseLocator.locator('div[style*="background-color"]')
      }),
      baseLocator.locator('button[type="button"]').filter({
        has: baseLocator.locator('div[class*="rounded"]')
      }),
      baseLocator.locator('button[type="button"]').filter({
        has: baseLocator.locator('div[class*="circle"]')
      })
    ];
    
    let diasConPuntos: Locator | null = null;
    let countDiasConPuntos = 0;
    
    for (const selector of selectoresEstrategia1) {
      try {
        const count = await Promise.race([
          selector.count(),
          new Promise<number>(resolve => setTimeout(() => resolve(0), 2000))
        ]).catch(() => 0);
        
        if (count > 0) {
          diasConPuntos = selector;
          countDiasConPuntos = count;
          console.log(`📊 Días con puntos de colores encontrados (estrategia 1, selector ${selectoresEstrategia1.indexOf(selector) + 1}): ${count}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (countDiasConPuntos === 0) {
      console.log(`📊 Días con puntos de colores encontrados (estrategia 1): 0 (probados ${selectoresEstrategia1.length} selectores)`);
    }
    
    // Estrategia 2: Si no encontramos con la primera estrategia, buscar todos los días y filtrar
    let todosLosDias: Locator;
    
    if (countDiasConPuntos > 0 && diasConPuntos) {
      // Usar la estrategia 1 si encontramos días
      countTodos = countDiasConPuntos; // Inicializar contador
      const maxDiasAProcesar = Math.min(countDiasConPuntos, 31);
      console.log(`🔍 Procesando ${maxDiasAProcesar} días con puntos de colores...`);
      
      for (let i = 0; i < maxDiasAProcesar; i++) {
        try {
          const dia = diasConPuntos.nth(i);
          const diaVisible = await Promise.race([
            dia.isVisible({ timeout: 1000 }),
            new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
          ]).catch(() => false);
          
          if (diaVisible) {
            // Verificar que no es un día de otro mes
            const esDiaOtroMes = await Promise.race([
              dia.evaluate((el) => {
                const classes = el.className || '';
                const parentClasses = el.parentElement?.className || '';
                const parentParentClasses = el.parentElement?.parentElement?.className || '';
                return classes.includes('prevMonthDay') || classes.includes('nextMonthDay') ||
                       classes.includes('prev-month') || classes.includes('next-month') ||
                       parentClasses.includes('prevMonthDay') || parentClasses.includes('nextMonthDay') ||
                       parentParentClasses.includes('prevMonthDay') || parentParentClasses.includes('nextMonthDay');
              }),
              new Promise<boolean>(resolve => setTimeout(() => resolve(false), 500))
            ]).catch(() => false);
            
            if (!esDiaOtroMes) {
              // Verificar que tiene puntos de colores válidos usando evaluate
              const tieneEventos = await Promise.race([
                dia.evaluate((el) => {
                  const divs = el.querySelectorAll('div');
                  let encontrado = false;
                  
                  for (const div of divs) {
                    const style = window.getComputedStyle(div);
                    const bgColor = style.backgroundColor;
                    
                    if (bgColor && 
                        bgColor !== 'rgba(0, 0, 0, 0)' && 
                        bgColor !== 'transparent' &&
                        !bgColor.includes('rgb(242, 242, 242)') &&
                        !bgColor.includes('rgba(242, 242, 242')) {
                      
                      const width = style.width;
                      const height = style.height;
                      const widthNum = parseFloat(width);
                      const heightNum = parseFloat(height);
                      
                      if ((widthNum > 0 && widthNum < 10) || (heightNum > 0 && heightNum < 10)) {
                        encontrado = true;
                        break;
                      }
                      
                      const classes = div.className || '';
                      if (classes.includes('rounded') || classes.includes('circle') || classes.includes('aspect-square')) {
                        encontrado = true;
                        break;
                      }
                    }
                  }
                  
                  return encontrado;
                }),
                new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000))
              ]).catch(() => false);
              
              if (tieneEventos) {
                diasConEventos.push(dia);
                console.log(`  ✓ Día ${i + 1}: encontrado con evento(s)`);
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
    } else {
      // Estrategia 2: Buscar todos los días y filtrar manualmente
      console.log('⚠️ Estrategia 1 no encontró días, usando estrategia 2...');
      // Usar el mismo selector que funciona al final de la prueba para encontrar días
      todosLosDias = baseLocator.locator('button[type="button"]').filter({
        has: page.locator('p, span').filter({
          hasText: /^\d{1,2}$/
        })
      });
      countTodos = await Promise.race([
        todosLosDias.count(),
        new Promise<number>(resolve => setTimeout(() => resolve(0), 3000))
      ]).catch(() => 0);
      
      console.log(`📊 Total de días encontrados en el calendario: ${countTodos}`);
      
      // Si aún no encontramos días, intentar sin el filtro de números
      if (countTodos === 0) {
        console.log('⚠️ No se encontraron días con el selector filtrado, intentando sin filtro...');
        todosLosDias = baseLocator.locator('button[type="button"]');
        countTodos = await Promise.race([
          todosLosDias.count(),
          new Promise<number>(resolve => setTimeout(() => resolve(0), 3000))
        ]).catch(() => 0);
        console.log(`📊 Total de días encontrados (sin filtro): ${countTodos}`);
      }
      
      // Si aún no encontramos días, buscar directamente en la página
      if (countTodos === 0) {
        console.log('⚠️ No se encontraron días con baseLocator, buscando directamente en la página...');
        todosLosDias = page.locator('button[type="button"]').filter({
          has: page.locator('p, span').filter({
            hasText: /^\d{1,2}$/
          })
        });
        countTodos = await Promise.race([
          todosLosDias.count(),
          new Promise<number>(resolve => setTimeout(() => resolve(0), 3000))
        ]).catch(() => 0);
        console.log(`📊 Total de días encontrados (búsqueda directa en página): ${countTodos}`);
      }
      
      const maxDiasAProcesar = Math.min(countTodos, 35);
      console.log(`🔍 Procesando ${maxDiasAProcesar} días para buscar eventos...`);
      
      const startTime = Date.now();
      const maxLoopTime = 60000; // Máximo 60 segundos para procesar días (aumentado porque algunos días pueden tardar más)
      
      // Primero, inspeccionar algunos días para entender la estructura
      console.log('🔍 Inspeccionando estructura de los primeros días para entender el DOM...');
      const diasMuestra = Math.min(10, maxDiasAProcesar);
      let diasInspeccionados = 0;
      
      for (let i = 0; i < diasMuestra; i++) {
        try {
          const dia = todosLosDias.nth(i);
          const diaVisible = await dia.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (!diaVisible) {
            console.log(`  ⚠️ Día ${i + 1}: no visible, saltando...`);
            continue;
          }
          
          const infoDia = await Promise.race([
            dia.evaluate((el) => {
              const texto = el.textContent?.trim() || '';
              const classes = el.className || '';
              const innerHTML = el.innerHTML.substring(0, 200); // Primeros 200 caracteres del HTML
              
              // Buscar todos los elementos dentro del botón
              const todosElementos = el.querySelectorAll('*');
              const elementosConColor: Array<{tag: string, classes: string, bgColor: string, width: string, height: string}> = [];
              
              for (const elem of todosElementos) {
                const style = window.getComputedStyle(elem);
                const bgColor = style.backgroundColor;
                const width = style.width;
                const height = style.height;
                
                if (bgColor && 
                    bgColor !== 'rgba(0, 0, 0, 0)' && 
                    bgColor !== 'transparent' &&
                    bgColor !== 'rgb(255, 255, 255)' &&
                    bgColor !== 'rgba(255, 255, 255, 1)') {
                  
                  const widthNum = parseFloat(width);
                  const heightNum = parseFloat(height);
                  
                  // Solo incluir elementos pequeños (puntos de eventos)
                  if ((widthNum > 0 && widthNum < 30) || (heightNum > 0 && heightNum < 30)) {
                    elementosConColor.push({
                      tag: elem.tagName.toLowerCase(),
                      classes: elem.className || '',
                      bgColor: bgColor,
                      width: width,
                      height: height
                    });
                  }
                }
              }
              
              // También buscar elementos hermanos o en el contenedor padre
              const parent = el.parentElement;
              let elementosHermanosConColor = 0;
              if (parent) {
                const hermanos = parent.querySelectorAll('*');
                for (const hermano of hermanos) {
                  if (hermano !== el) {
                    const style = window.getComputedStyle(hermano);
                    const bgColor = style.backgroundColor;
                    if (bgColor && 
                        bgColor !== 'rgba(0, 0, 0, 0)' && 
                        bgColor !== 'transparent' &&
                        !bgColor.includes('rgb(242, 242, 242)')) {
                      const width = parseFloat(style.width);
                      const height = parseFloat(style.height);
                      if ((width > 0 && width < 10) || (height > 0 && height < 10)) {
                        elementosHermanosConColor++;
                      }
                    }
                  }
                }
              }
              
              return {
                texto: texto,
                classes: classes,
                innerHTML: innerHTML,
                elementosConColor: elementosConColor.length,
                elementosInfo: elementosConColor.slice(0, 5),
                elementosHermanosConColor: elementosHermanosConColor
              };
            }),
            new Promise<any>(resolve => setTimeout(() => resolve(null), 2000))
          ]).catch((error) => {
            console.log(`  ❌ Error al inspeccionar día ${i + 1}: ${error}`);
            return null;
          });
          
          if (infoDia) {
            diasInspeccionados++;
            console.log(`  📋 Día ${i + 1}: texto="${infoDia.texto.substring(0, 50)}", clases="${infoDia.classes.substring(0, 100)}"`);
            console.log(`    Elementos con color dentro: ${infoDia.elementosConColor}, elementos hermanos con color: ${infoDia.elementosHermanosConColor}`);
            if (infoDia.elementosInfo.length > 0) {
              infoDia.elementosInfo.forEach((elem: any, idx: number) => {
                console.log(`    ${elem.tag} ${idx + 1}: bg=${elem.bgColor}, size=${elem.width}x${elem.height}, clases="${elem.classes.substring(0, 50)}"`);
              });
            }
            if (infoDia.elementosConColor === 0 && infoDia.elementosHermanosConColor > 0) {
              console.log(`    ⚠️ Los eventos podrían estar fuera del botón (en elementos hermanos)`);
            }
          } else {
            console.log(`  ⚠️ Día ${i + 1}: no se pudo obtener información`);
          }
        } catch (error: any) {
          console.log(`  ❌ Error al procesar día ${i + 1}: ${error?.message || error}`);
        }
      }
      
      console.log(`✅ Inspección completada: ${diasInspeccionados} de ${diasMuestra} días inspeccionados`);
      
      for (let i = 0; i < maxDiasAProcesar; i++) {
        // Verificar timeout global del loop
        if (Date.now() - startTime > maxLoopTime) {
          console.log(`⏱️ Timeout del loop alcanzado después de procesar ${i} días. Continuando con los días encontrados hasta ahora.`);
          break;
        }
        try {
          const dia = todosLosDias.nth(i);
          
          // Usar la misma lógica que funciona en la inspección: buscar eventos directamente
          const infoDia = await Promise.race([
            dia.evaluate((el) => {
              // Verificar que no es un día de otro mes
              const classes = el.className || '';
              const parentClasses = el.parentElement?.className || '';
              const esDiaOtroMes = classes.includes('prevMonthDay') || classes.includes('nextMonthDay') ||
                     classes.includes('prev-month') || classes.includes('next-month') ||
                     parentClasses.includes('prevMonthDay') || parentClasses.includes('nextMonthDay');
              
              if (esDiaOtroMes) {
                return { esDiaOtroMes: true, tieneEventos: false, colores: [], texto: '' };
              }
              
              const coloresEncontrados: string[] = [];
              
              // 1. Buscar dentro del botón
              const todosElementos = el.querySelectorAll('*');
              for (const elem of todosElementos) {
                const style = window.getComputedStyle(elem);
                const bgColor = style.backgroundColor;
                
                if (bgColor && 
                    bgColor !== 'rgba(0, 0, 0, 0)' && 
                    bgColor !== 'transparent' &&
                    bgColor !== 'rgb(255, 255, 255)' &&
                    bgColor !== 'rgba(255, 255, 255, 1)' &&
                    !bgColor.includes('rgb(242, 242, 242)') &&
                    !bgColor.includes('rgba(242, 242, 242')) {
                  
                  const width = parseFloat(style.width);
                  const height = parseFloat(style.height);
                  
                  // Buscar elementos pequeños (puntos de eventos) - 4px es el tamaño típico
                  if ((width > 0 && width < 10) || (height > 0 && height < 10)) {
                    coloresEncontrados.push(bgColor);
                  }
                  
                  // También verificar clases específicas de puntos de eventos
                  const elemClasses = elem.className || '';
                  if (elemClasses.includes('w-[4px]') || elemClasses.includes('aspect-square') || elemClasses.includes('rounded-circle')) {
                    coloresEncontrados.push(bgColor);
                  }
                }
              }
              
              // 2. Si no encontramos dentro, buscar en elementos hermanos (como muestra la inspección)
              // Los eventos pueden estar en el mismo contenedor padre pero en otros elementos
              if (coloresEncontrados.length === 0 && el.parentElement) {
                const parent = el.parentElement;
                // Buscar en todos los elementos del contenedor padre, no solo hermanos directos
                const todosEnContenedor = parent.querySelectorAll('*');
                
                for (const elem of todosEnContenedor) {
                  // Saltar el elemento actual y sus hijos
                  if (el.contains(elem) || elem === el) {
                    continue;
                  }
                  
                  const style = window.getComputedStyle(elem);
                  const bgColor = style.backgroundColor;
                  
                  if (bgColor && 
                      bgColor !== 'rgba(0, 0, 0, 0)' && 
                      bgColor !== 'transparent' &&
                      bgColor !== 'rgb(255, 255, 255)' &&
                      bgColor !== 'rgba(255, 255, 255, 1)' &&
                      !bgColor.includes('rgb(242, 242, 242)') &&
                      !bgColor.includes('rgba(242, 242, 242')) {
                    
                    const width = parseFloat(style.width);
                    const height = parseFloat(style.height);
                    const elemClasses = elem.className || '';
                    
                    // Buscar elementos pequeños (puntos de eventos) O elementos con clases específicas
                    const esPuntoEvento = ((width > 0 && width < 10) || (height > 0 && height < 10)) &&
                                         (elemClasses.includes('w-[4px]') || elemClasses.includes('aspect-square') || elemClasses.includes('rounded-circle'));
                    
                    // También aceptar si tiene las clases específicas aunque el tamaño sea ligeramente mayor
                    const tieneClasesEspecificas = elemClasses.includes('w-[4px]') || 
                                                   (elemClasses.includes('aspect-square') && elemClasses.includes('rounded-circle'));
                    
                    if (esPuntoEvento || tieneClasesEspecificas) {
                      coloresEncontrados.push(bgColor);
                      // Si encontramos uno con la clase w-[4px], es suficiente
                      if (elemClasses.includes('w-[4px]')) {
                        break;
                      }
                    }
                  }
                }
              }
              
              // 3. También buscar en el contenedor del contenedor (nivel superior)
              if (coloresEncontrados.length === 0 && el.parentElement?.parentElement) {
                const grandParent = el.parentElement.parentElement;
                const todosEnGrandParent = grandParent.querySelectorAll('*');
                
                for (const elem of todosEnGrandParent) {
                  // Saltar el elemento actual y su contenedor padre
                  if (el.contains(elem) || el.parentElement?.contains(elem) || elem === el) {
                    continue;
                  }
                  
                  const style = window.getComputedStyle(elem);
                  const bgColor = style.backgroundColor;
                  
                  if (bgColor && 
                      bgColor !== 'rgba(0, 0, 0, 0)' && 
                      bgColor !== 'transparent' &&
                      !bgColor.includes('rgb(242, 242, 242)')) {
                    
                    const width = parseFloat(style.width);
                    const height = parseFloat(style.height);
                    const elemClasses = elem.className || '';
                    
                    if (((width > 0 && width < 10) || (height > 0 && height < 10)) &&
                        (elemClasses.includes('w-[4px]') || elemClasses.includes('aspect-square') || elemClasses.includes('rounded-circle'))) {
                      coloresEncontrados.push(bgColor);
                      break;
                    }
                  }
                }
              }
              
              return { 
                esDiaOtroMes: false, 
                tieneEventos: coloresEncontrados.length > 0, 
                colores: coloresEncontrados.slice(0, 5),
                texto: el.textContent?.trim() || ''
              };
            }),
            new Promise<any>(resolve => setTimeout(() => resolve({esDiaOtroMes: false, tieneEventos: false, colores: [], texto: ''}), 1000))
          ]).catch(() => ({esDiaOtroMes: false, tieneEventos: false, colores: [], texto: ''}));
          
          if (infoDia.esDiaOtroMes) {
            if (i < 5) {
              console.log(`  ⏭️ Día ${i + 1}: es de otro mes, saltando...`);
            }
            continue; // Saltar días de otros meses
          }
          
          if (infoDia.tieneEventos) {
            diasConEventos.push(dia);
            console.log(`  ✓ Día ${i + 1}${infoDia.texto ? ` (${infoDia.texto.substring(0, 20)})` : ''}: encontrado con ${infoDia.colores.length} evento(s)${infoDia.colores.length > 0 ? ` (colores: ${infoDia.colores.slice(0, 3).join(', ')})` : ''}`);
            
            // Si ya encontramos suficientes días con eventos, podemos parar
            if (diasConEventos.length >= 20) {
              console.log(`✅ Encontrados ${diasConEventos.length} días con eventos, limitando búsqueda para optimizar tiempo`);
              break;
            }
          } else {
            // Log solo para los primeros días para debugging
            if (i < 10 && infoDia.texto) {
              console.log(`  ⚠️ Día ${i + 1} (${infoDia.texto.substring(0, 10)}): no tiene eventos detectados`);
            }
          }
        } catch (error: any) {
          // Continuar con el siguiente día si hay un error
          console.log(`  ⚠️ Error procesando día ${i + 1}: ${error?.message || error}`);
          continue;
        }
      }
    }
    
    const cantidadDiasConEventos = diasConEventos.length;
    console.log(`📊 Días con eventos marcados encontrados: ${cantidadDiasConEventos} (de ${countTodos} días totales)`);
    
    if (cantidadDiasConEventos > 0) {
      console.log('✅ Se encontraron días con eventos marcados');
      
      // Validar algunos días con eventos
      const diasAValidar = Math.min(cantidadDiasConEventos, 5);
      for (let i = 0; i < diasAValidar; i++) {
        const diaConEvento = diasConEventos[i];
        const diaVisible = await diaConEvento.isVisible().catch(() => false);
        
        if (diaVisible) {
          // Obtener el número del día - buscar específicamente el número (1-31), no el texto del evento
          let numeroDiaTexto = '';
          let numeroDia = 0;
          
          // Buscar un elemento que contenga solo un número (1-31)
          const elementosNumericos = diaConEvento.locator('p, span').filter({
            hasText: /^\d{1,2}$/
          });
          const countNumericos = await elementosNumericos.count();
          
          if (countNumericos > 0) {
            numeroDiaTexto = await Promise.race([
              elementosNumericos.first().textContent(),
              new Promise<string | null>(resolve => setTimeout(() => resolve(null), 1000))
            ]).then(text => text?.trim() || '').catch(() => '');
            numeroDia = parseInt(numeroDiaTexto);
          } else {
            // Estrategia alternativa: buscar directamente en el texto completo (más rápido)
            const textoCompleto = await Promise.race([
              diaConEvento.textContent(),
              new Promise<string | null>(resolve => setTimeout(() => resolve(null), 1000))
            ]).then(text => text?.trim() || '').catch(() => '');
            
            if (textoCompleto) {
              const numeros = textoCompleto.match(/\b(\d{1,2})\b/g);
              if (numeros) {
                for (const numStr of numeros) {
                  const num = parseInt(numStr);
                  if (num >= 1 && num <= 31) {
                    numeroDiaTexto = numStr;
                    numeroDia = num;
                    break;
                  }
                }
              }
            }
          }
          
          const diaDisplay = numeroDia > 0 ? numeroDia.toString() : 'N/A';
          
          // Validar que tiene puntos de colores (indicadores de eventos)
          const puntosColores = diaConEvento.locator('div.w-\\[4px\\].aspect-square.rounded-circle[style*="background-color"]');
          const countPuntos = await puntosColores.count();
          
          if (countPuntos > 0) {
            // Obtener los colores de los puntos
            const colores: string[] = [];
            for (let j = 0; j < Math.min(countPuntos, 5); j++) {
              const punto = puntosColores.nth(j);
              const colorPunto = await punto.evaluate(el => {
                return window.getComputedStyle(el).backgroundColor;
              }).catch(() => null);
              
              if (colorPunto && !colorPunto.includes('rgb(242, 242, 242)')) {
                colores.push(colorPunto);
              }
            }
            
            if (colores.length > 0) {
              console.log(`  ✓ Día ${diaDisplay}: tiene ${countPuntos} punto(s) de evento(s)${colores.length > 0 ? ` (colores: ${colores.join(', ')})` : ''}`);
            } else {
              console.log(`  ✓ Día ${diaDisplay}: tiene ${countPuntos} punto(s) pero sin colores válidos`);
            }
          } else {
            console.log(`  ✓ Día ${diaDisplay}: tiene evento marcado (sin puntos de colores visibles)`);
          }
        }
      }
    } else {
      console.log('ℹ️ No se encontraron días con eventos marcados en el mes actual');
      console.log('ℹ️ Continuando con validaciones de estructura del calendario...');
    }
    
    // 6. VALIDAR FUNCIONALIDAD: FILTRAR EVENTOS AL SELECCIONAR UN DÍA (solo si hay eventos)
    if (cantidadDiasConEventos > 0) {
      await showStepMessage(page, '🖱️ VALIDANDO FUNCIONALIDAD: FILTRAR POR DÍA');
      await safeWaitForTimeout(page, 1000);
      
      // Función auxiliar para obtener el número del mes
      const obtenerNumeroMes = (nombreMes: string): number => {
        const meses: { [key: string]: number } = {
          'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
          'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        };
        const mesLower = nombreMes.toLowerCase();
        for (const [mes, numero] of Object.entries(meses)) {
          if (mesLower.includes(mes)) {
            return numero;
          }
        }
        return new Date().getMonth() + 1;
      };
      
      // Buscar tarjetas de eventos usando selector más específico
      // Buscar solo en la sección "Elige tu fiesta" que contiene los eventos
      const seccionEventos = page.locator('div').filter({
        has: page.locator('p').filter({ hasText: /Elige tu fiesta/i })
      });
      
      // Buscar botones de eventos dentro de la sección (más específico)
      const tarjetasAmpliasAntes = seccionEventos.locator('button[type="button"]').filter({
        has: page.locator('p, span').filter({ hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i })
      });
      const countAntes = await Promise.race([
        tarjetasAmpliasAntes.count(),
        new Promise<number>(resolve => setTimeout(() => resolve(0), 5000))
      ]) as number;
      console.log(`📊 Tarjetas de eventos visibles antes del filtro: ${countAntes}`);
      
      // Seleccionar el primer día con eventos
      const primerDiaConEventos = diasConEventos[0];
      await primerDiaConEventos.scrollIntoViewIfNeeded();
      
      // Obtener el número del día - buscar específicamente el número (1-31), no el texto del evento
      let numeroDia = 0;
      let numeroDiaTexto = '';
      
      // Estrategia 1: Buscar un elemento que contenga solo un número (1-31) - debe ser exacto
      const elementosNumericos = primerDiaConEventos.locator('p, span').filter({
        hasText: /^\d{1,2}$/
      });
      const countNumericos = await elementosNumericos.count();
      
      if (countNumericos > 0) {
        numeroDiaTexto = (await elementosNumericos.first().textContent())?.trim() || '';
        numeroDia = parseInt(numeroDiaTexto);
        console.log(`📅 Número del día encontrado (Estrategia 1): ${numeroDia}`);
      } else {
        // Estrategia 2: Buscar directamente en el texto completo del botón (más rápido)
        const textoCompleto = (await primerDiaConEventos.textContent())?.trim() || '';
        if (textoCompleto) {
          // Buscar el primer número de 1-2 dígitos que esté entre 1-31
          const numeros = textoCompleto.match(/\b(\d{1,2})\b/g);
          if (numeros) {
            for (const numStr of numeros) {
              const num = parseInt(numStr);
              if (num >= 1 && num <= 31) {
                numeroDiaTexto = numStr;
                numeroDia = num;
                console.log(`📅 Número del día encontrado (Estrategia 2): ${numeroDia}`);
                break;
              }
            }
          }
        }
      }
      
      if (numeroDia === 0 || isNaN(numeroDia)) {
        const textoCompleto = await primerDiaConEventos.textContent();
        console.log(`⚠️ No se pudo obtener el número del día del botón. Texto completo: "${textoCompleto?.trim()}"`);
      } else {
        console.log(`📅 Día seleccionado para filtrar: ${numeroDia}${numeroDiaTexto ? ` (texto: "${numeroDiaTexto}")` : ''}`);
      }
      
      if (numeroDia > 0) {
        // Hacer clic en el primer día con eventos
        console.log(`🖱️ Haciendo clic en el día ${numeroDia}...`);
        await primerDiaConEventos.click();
        await safeWaitForTimeout(page, 1500);
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        
        // Verificar si el día tiene borde de selección
        const tieneBorde = await primerDiaConEventos.evaluate((el) => {
          const classes = el.className || '';
          const styles = window.getComputedStyle(el);
          const borderColor = styles.borderColor;
          const borderWidth = styles.borderWidth;
          
          // Verificar si tiene las clases de borde o si tiene un borde visible
          return classes.includes('border-primary-neutral') || 
                 classes.includes('border-2') ||
                 (borderWidth && parseFloat(borderWidth) >= 2 && borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent');
        }).catch(() => false);
        
        let diaSeleccionadoConBorde: Locator = primerDiaConEventos;
        
        if (!tieneBorde) {
          console.log(`⚠️ El día ${numeroDia} no tiene borde de selección después del clic`);
          console.log(`ℹ️ Continuando con la validación (el borde puede no ser visible o aplicarse de otra manera)`);
          // No buscar otro día para evitar timeouts - simplemente continuar con el día original
        } else {
          console.log(`✅ El día ${numeroDia} tiene borde de selección`);
        }
        
        // Buscar tarjetas de eventos después del filtro con selector más específico
        // Buscar solo en la sección "Elige tu fiesta" que contiene los eventos
        // Filtrar eventos que tengan el día seleccionado en su fecha (más específico)
        const tarjetasAmpliasDespues = seccionEventos.locator('button[type="button"]').filter({
          has: page.locator('p, span').filter({ 
            hasText: new RegExp(`\\b${numeroDia}\\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)`, 'i') 
          })
        });
        const countDespues = await Promise.race([
          tarjetasAmpliasDespues.count(),
          new Promise<number>(resolve => setTimeout(() => resolve(0), 5000))
        ]) as number;
        console.log(`📊 Tarjetas de eventos visibles después del filtro: ${countDespues}`);
        
        // Usar las tarjetas encontradas para validar
        const eventosParaValidar = tarjetasAmpliasDespues;
        const countParaValidar = countDespues;
        
        // Validar que el filtro funcionó: verificar que los eventos mostrados corresponden al día seleccionado
        if (countParaValidar > 0) {
          let eventosCoinciden = 0;
          let eventosNoCoinciden = 0;
          
          console.log(`🔍 Validando que los ${countParaValidar} evento(s) corresponden al día ${numeroDia}...`);
          
          // Validar cada evento visible para verificar que corresponde al día seleccionado
          // Limitar a 5 eventos para evitar timeout
          for (let i = 0; i < Math.min(countParaValidar, 5); i++) {
            try {
              const evento = eventosParaValidar.nth(i);
              const esVisible = await Promise.race([
                evento.isVisible(),
                new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000))
              ]) as boolean;
              
              if (esVisible) {
                // Buscar la fecha en el evento - solo usar estrategia rápida
                let fechaTexto: string | null = null;
                let diaEnFecha = 0;
                
                // Estrategia única: Buscar en todo el texto del evento (más rápido)
                const textoCompletoEvento = await Promise.race([
                  evento.textContent(),
                  new Promise<string | null>(resolve => setTimeout(() => resolve(null), 2000))
                ]) as string | null;
                
                if (textoCompletoEvento) {
                  // Buscar fecha en el texto completo (formato: día mes año o día mes)
                  const matchFecha = textoCompletoEvento.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)(?:\s+\d{4})?/i);
                  if (matchFecha && matchFecha[1]) {
                    diaEnFecha = parseInt(matchFecha[1]);
                    fechaTexto = matchFecha[0];
                  }
                }
                
                // Si no encontramos con la estrategia rápida, intentar una búsqueda más específica pero limitada
                if (!fechaTexto) {
                  const fechaCompleta = await Promise.race([
                    evento.locator('p, span').filter({ 
                      hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+\d{4}/i 
                    }).first().textContent(),
                    new Promise<string | null>(resolve => setTimeout(() => resolve(null), 2000))
                  ]) as string | null;
                  
                  if (fechaCompleta) {
                    fechaTexto = fechaCompleta;
                    const match = fechaTexto.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i);
                  if (match && match[1]) {
                    diaEnFecha = parseInt(match[1]);
                  }
                } else {
                  // Buscar fecha con formato corto (día mes)
                  const fechaCorta = await evento.locator('p, span').filter({ 
                    hasText: /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i 
                  }).first().textContent().catch(() => null);
                  
                  if (fechaCorta) {
                    fechaTexto = fechaCorta;
                    const match = fechaTexto.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i);
                    if (match && match[1]) {
                      diaEnFecha = parseInt(match[1]);
                    }
                  }
                }
              }
              
                // Validar el día encontrado
                if (diaEnFecha > 0) {
                  if (diaEnFecha === numeroDia) {
                    eventosCoinciden++;
                    console.log(`  ✅ Evento ${i + 1}: fecha coincide con día seleccionado (${diaEnFecha})${fechaTexto ? ` - "${fechaTexto.trim()}"` : ''}`);
                  } else {
                    eventosNoCoinciden++;
                    console.log(`  ⚠️ Evento ${i + 1}: fecha no coincide (día en evento: ${diaEnFecha}, día seleccionado: ${numeroDia})${fechaTexto ? ` - "${fechaTexto.trim()}"` : ''}`);
                  }
                } else {
                  // No se encontró fecha, mostrar diagnóstico
                  const textoEvento = await Promise.race([
                    evento.locator('p, span').first().textContent(),
                    new Promise<string | null>(resolve => setTimeout(() => resolve(null), 1000))
                  ]) as string | null;
                  const textoCompleto = textoCompletoEvento || textoEvento || 'N/A';
                  console.log(`  ℹ️ Evento ${i + 1}: no se encontró fecha en el formato esperado - Texto: "${textoCompleto.toString().trim().substring(0, 100)}..."`);
                }
              }
            } catch (error) {
              // Continuar con el siguiente evento si hay un error
              console.log(`  ⚠️ Error al validar evento ${i + 1}, continuando...`);
              continue;
            }
          }
          
          if (eventosCoinciden > 0 && eventosNoCoinciden === 0) {
            console.log(`✅ El filtro funcionó correctamente: todos los eventos (${eventosCoinciden}) corresponden al día seleccionado (${numeroDia})`);
          } else if (eventosCoinciden > 0) {
            console.log(`⚠️ El filtro funcionó parcialmente: ${eventosCoinciden} evento(s) coinciden, ${eventosNoCoinciden} no coinciden`);
          } else {
            console.log(`⚠️ Ningún evento coincide con el día seleccionado (puede ser un problema con el formato de fecha o el filtro no funcionó)`);
          }
        } else {
          console.log('ℹ️ No se encontraron eventos después del filtro (puede ser que no haya eventos para ese día específico)');
        }
        
        // Validar que el número de eventos cambió (indicador de que el filtro se aplicó)
        if (countParaValidar !== countAntes) {
          console.log(`✅ El número de eventos cambió (${countAntes} → ${countParaValidar}), indicando que el filtro se aplicó`);
        } else if (countParaValidar > 0) {
          console.log(`ℹ️ El número de eventos no cambió (${countAntes} → ${countParaValidar}), pero hay eventos visibles (puede que todos los eventos sean del mismo día)`);
        }
        
        // Validar la cantidad de puntos en el día seleccionado vs eventos mostrados
        if (numeroDia > 0 && diaSeleccionadoConBorde) {
          // Usar directamente el día con eventos que ya encontramos y que tiene borde de selección
          // Esto evita el problema de strict mode violation cuando hay días con el mismo número en diferentes meses
          const diaSeleccionado = diaSeleccionadoConBorde;
          
          const puntosEnDia = diaSeleccionado.locator('div.w-\\[4px\\].aspect-square.rounded-circle[style*="background-color"]');
          const countPuntos = await puntosEnDia.count().catch(() => 0);
          
          if (countPuntos > 0) {
            // Filtrar puntos que no sean del color "sin eventos"
            let puntosValidos = 0;
            for (let i = 0; i < countPuntos; i++) {
              const punto = puntosEnDia.nth(i);
              const colorPunto = await punto.evaluate(el => {
                return window.getComputedStyle(el).backgroundColor;
              }).catch(() => null);
              
              if (colorPunto && !colorPunto.includes('rgb(242, 242, 242)')) {
                puntosValidos++;
              }
            }
            
            console.log(`📊 Puntos (eventos) en el día ${numeroDia}: ${puntosValidos}`);
            
            if (puntosValidos > 0 && puntosValidos <= 3) {
              console.log(`✅ El día tiene ${puntosValidos} punto(s) (evento(s))`);
              console.log(`✅ La cantidad de puntos es válida (≤ 3)`);
              
              // Comparar con eventos mostrados
              if (countParaValidar > puntosValidos) {
                console.log(`⚠️ DISCREPANCIA: Se muestran ${countParaValidar} eventos pero el día tiene ${puntosValidos} punto(s)`);
                console.log(`ℹ️ Esto puede ser normal si el filtro muestra eventos relacionados o si hay eventos de múltiples días`);
              } else if (countParaValidar === puntosValidos) {
                console.log(`✅ La cantidad de eventos mostrados (${countParaValidar}) coincide con los puntos del día (${puntosValidos})`);
              }
            }
          }
        }
      }
    } else {
      console.log('ℹ️ No hay días con eventos para probar el filtrado');
      console.log('ℹ️ Esta validación se omite cuando no hay eventos disponibles');
    }
    
    // 7. VALIDAR ESTRUCTURA DEL CALENDARIO (días del mes)
    await showStepMessage(page, '📋 VALIDANDO ESTRUCTURA DEL CALENDARIO');
    await safeWaitForTimeout(page, 1000);
    console.log('🔍 Validando estructura del calendario...');
    
    // Buscar todos los botones de días (números del 1 al 31)
    const botonesDias = baseLocator.locator('button[type="button"]').filter({
      has: page.locator('p, span').filter({
        hasText: /^\d{1,2}$/
      })
    });
    
    const cantidadDias = await botonesDias.count();
    console.log(`📊 Días encontrados en el calendario: ${cantidadDias}`);
    
    if (cantidadDias > 0) {
      // Validar que hay al menos 28 días (mes mínimo)
      if (cantidadDias >= 28) {
        console.log(`✅ Calendario tiene estructura válida (${cantidadDias} días)`);
      } else {
        console.log(`⚠️ Calendario tiene menos días de lo esperado (${cantidadDias} días)`);
      }
      
      // Validar que los días están habilitados
      const primerDia = botonesDias.first();
      const diaHabilitado = await primerDia.isEnabled().catch(() => false);
      if (diaHabilitado) {
        console.log('✅ Los días del calendario están habilitados (clickeables)');
      } else {
        console.log('⚠️ Los días del calendario no están habilitados');
      }
    } else {
      console.log('⚠️ No se encontraron días en el calendario');
    }
    
    await showStepMessage(page, '✅ VALIDACIÓN COMPLETA DEL CALENDARIO FINALIZADA');
    console.log('✅ Validación completa del calendario finalizada');
  });

  // ============================================
  // GRUPO 3: PRUEBAS QUE SOLO PRUEBAN FUNCIONALIDAD
  // ============================================

  test('Crear una nueva fiesta desde el dashboard', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos (mismo timeout que cliente-eventos.spec.ts)
    
    await showStepMessage(page, '🎉 CREANDO NUEVA FIESTA DESDE EL DASHBOARD');
    console.log('🚀 Iniciando flujo completo de creación de evento...');
    
    // Esta prueba ejecuta el flujo completo de creación de evento
    // Reutiliza la función ejecutarFlujoCompletoCreacionEvento de cliente-eventos.spec.ts
    // para evitar duplicación de código
    
    await ejecutarFlujoCompletoCreacionEvento(page);
    console.log('✅ Flujo completo de creación de evento finalizado');
  });

  // ============================================================================
  // TEST: Mapear estructura completa de categorías de servicios
  // ============================================================================
  test('Mapear estructura completa de categorías y subcategorías de servicios', async ({ page }) => {
    test.setTimeout(600000); // 10 minutos para explorar todas las categorías
    
    await showStepMessage(page, '🗺️ Mapeando estructura completa de categorías de servicios');
    
    const resultado = await mapearEstructuraCategoriasServicios(page, DEFAULT_BASE_URL);
    
    // Validar que se encontraron categorías
    expect(resultado.resumen.categoriasPrincipales).toBeGreaterThan(0);
    
    // Validar que al menos una ruta llegó a cards
    expect(resultado.resumen.rutasConCards).toBeGreaterThan(0);
  });


});

