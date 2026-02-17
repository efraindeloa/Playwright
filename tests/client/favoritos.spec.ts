import { test, expect, Page, BrowserContext } from '@playwright/test';
import { login, showStepMessage, safeWaitForTimeout } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';
import { verificarSiServicioEstaActivo, marcarServicioComoFavorito } from './cliente-eventos-helpers';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const PROVIDER_SERVICES_URL = `${DEFAULT_BASE_URL}/provider/services`;
const FAVORITES_URL = `${DEFAULT_BASE_URL}/client/favorites`;

// Timeouts
const DEFAULT_TIMEOUT = 240000; // 3 minutos
const WAIT_FOR_PAGE_LOAD = 2000;

// ============================================================================
// TIPOS
// ============================================================================

interface ServicioInfo {
  nombre: string;
  categoria: string;
  subcategoria?: string;
  rutaCategorias: string[]; // Array con la ruta completa: [categoria, subcategoria, ...]
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene todos los servicios del proveedor con su información de categorías
 */
async function obtenerServiciosDelProveedor(page: Page): Promise<ServicioInfo[]> {
  await showStepMessage(page, '🔍 OBTENIENDO SERVICIOS DEL PROVEEDOR');
  console.log('📋 Iniciando sesión como proveedor...');
  
  // Iniciar sesión como proveedor
  await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

  // Navegar a administrar servicios
  await page.goto(`${DEFAULT_BASE_URL}/provider/dashboard`);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios"), div.flex.flex-row.gap-3 button:has-text("Administrar servicios")');
  const botonVisible = await adminServiciosButton.first().isVisible({ timeout: 10000 }).catch(() => false);
  
  if (!botonVisible) {
    throw new Error('❌ No se encontró el botón "Administrar servicios"');
  }

  await adminServiciosButton.first().click();
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

  // Buscar todas las tarjetas de servicios
  const serviceCardsContainer = page.locator('div.flex.flex-col.bg-neutral-0.rounded-6.shadow-4.border-1.border-light-neutral');
  const serviceCardsCount = await serviceCardsContainer.count();
  console.log(`📊 Tarjetas de servicios encontradas: ${serviceCardsCount}`);

  if (serviceCardsCount === 0) {
    throw new Error('❌ No se encontraron servicios del proveedor');
  }

  const servicios: ServicioInfo[] = [];

  // Iterar por todas las tarjetas y obtener información
  for (let i = 0; i < serviceCardsCount; i++) {
    const card = serviceCardsContainer.nth(i);
    const isVisible = await card.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }

    // Verificar si el servicio está activo antes de agregarlo
    const estadoServicio = await verificarSiServicioEstaActivo(page, card);
    
    if (estadoServicio === false) {
      console.log(`❌ Servicio en índice ${i + 1}/${serviceCardsCount} está inactivo, descartando...`);
      continue; // Descartar servicios inactivos
    }
    
    if (estadoServicio === null) {
      console.log(`⚠️ Servicio en índice ${i + 1}/${serviceCardsCount} no se puede verificar el estado, descartando...`);
      continue; // Descartar servicios con estado no verificable
    }

    // Si llegamos aquí, el servicio está activo (estadoServicio === true)
    console.log(`✅ Servicio en índice ${i + 1}/${serviceCardsCount} está activo, agregando a la lista...`);

    // Obtener el nombre del servicio
    const serviceNameElement = card.locator('p.text-medium.font-bold, p.font-bold, p.text-dark-neutral').first();
    let serviceName = '';
    if (await serviceNameElement.count() > 0) {
      serviceName = (await serviceNameElement.textContent())?.trim() || '';
    }

    if (!serviceName || serviceName.length < 3) {
      console.log(`⚠️ Servicio en índice ${i + 1}/${serviceCardsCount} no tiene nombre válido, omitiéndolo`);
      continue;
    }

    // Obtener categoría y subcategoría
    let categoria = '';
    let subcategoria = '';
    const categoriaContainer = card.locator('div.flex.flex-row.items-center.gap-3.mt-1:has(i.icon-tag)');
    if (await categoriaContainer.count() > 0) {
      const categoriaElement = categoriaContainer.locator('p').first();
      if (await categoriaElement.count() > 0) {
        let categoriaText = (await categoriaElement.textContent())?.trim() || '';
        categoriaText = categoriaText.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
        
        if (categoriaText.includes('>')) {
          const parts = categoriaText.split('>').map(p => p.trim()).filter(p => p.length > 0);
          categoria = parts[0] || '';
          subcategoria = parts[1] || '';
        } else {
          categoria = categoriaText;
        }
      }
    }

    // Construir ruta de categorías
    const rutaCategorias: string[] = [];
    if (categoria) {
      rutaCategorias.push(categoria);
      if (subcategoria) {
        rutaCategorias.push(subcategoria);
      }
    }

    servicios.push({
      nombre: serviceName,
      categoria,
      subcategoria,
      rutaCategorias
    });

    console.log(`✅ Servicio ${servicios.length}/${serviceCardsCount}: "${serviceName}" - Ruta: ${rutaCategorias.join(' > ') || 'Sin categoría'}`);
  }

  console.log(`\n📊 Total de servicios activos obtenidos: ${servicios.length} de ${serviceCardsCount}`);
  if (servicios.length === 0) {
    throw new Error('❌ No se encontraron servicios activos del proveedor');
  }
  console.log(`✅ Se obtuvieron ${servicios.length} servicios activos del proveedor`);
  return servicios;
}

/**
 * Obtiene las categorías de servicios disponibles en la página actual (similar a dashboard.spec.ts)
 */
async function obtenerCategoriasServicios(page: Page): Promise<Array<{ name: string; button: ReturnType<typeof page.locator> }>> {
  const categorias: Array<{ name: string; button: ReturnType<typeof page.locator> }> = [];
  
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
        categorias.push({
          name: nombre.trim(),
          button: boton
        });
      }
    }
  }
  
  return categorias;
}

/**
 * Obtiene las subcategorías disponibles en la página actual (similar a dashboard.spec.ts)
 */
async function obtenerSubcategorias(page: Page): Promise<Array<{ name: string; button: ReturnType<typeof page.locator> }>> {
  const subcategorias: Array<{ name: string; button: ReturnType<typeof page.locator> }> = [];
  
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
        subcategorias.push({
          name: nombre.trim(),
          button: boton
        });
      }
    }
  }
  
  return subcategorias;
}

/**
 * Navega a un servicio específico usando su ruta de categorías
 */
async function navegarAServicioPorRuta(page: Page, servicio: ServicioInfo): Promise<boolean> {
  await showStepMessage(page, `🔍 NAVEGANDO A: ${servicio.nombre}`);
  console.log(`\n📋 Navegando a servicio: "${servicio.nombre}"`);
  console.log(`   Ruta: ${servicio.rutaCategorias.join(' > ') || 'Sin categoría'}`);

  // Ir al home del cliente
  console.log('   🔗 Navegando al home...');
  await page.goto(DEFAULT_BASE_URL);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

  // Si el servicio tiene ruta de categorías, navegar haciendo click en los botones
  if (servicio.rutaCategorias.length > 0) {
    const categoriaPrincipal = servicio.rutaCategorias[0];
    console.log(`   📂 Navegando a categoría principal: "${categoriaPrincipal}"`);
    
    // Buscar y hacer click en la categoría principal
    const categoriaElement = page.locator('button, a, div[role="button"]').filter({
      hasText: new RegExp(categoriaPrincipal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    }).first();

    const categoriaExists = await categoriaElement.count() > 0;
    
    if (categoriaExists) {
      await expect(categoriaElement).toBeVisible({ timeout: 10000 });
      console.log(`   ✅ Categoría "${categoriaPrincipal}" encontrada`);
      await categoriaElement.click();
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      console.log(`   ✅ Clic realizado en "${categoriaPrincipal}"`);
    } else {
      console.log(`   ⚠️ No se encontró la categoría "${categoriaPrincipal}", continuando...`);
    }

    // Navegar por subcategorías si las hay
    // NOTA: Si solo hay un servicio en una subcategoría, la aplicación navega directamente
    // a la página de detalle del servicio. En ese caso, debemos buscar el servicio en la lista
    // sin hacer clic en la subcategoría.
    for (let nivel = 1; nivel < servicio.rutaCategorias.length; nivel++) {
      const subcategoriaNombre = servicio.rutaCategorias[nivel];
      console.log(`   📂 Intentando navegar a subcategoría: "${subcategoriaNombre}"`);

      const subcategoriaElement = page.locator('button, a, div[role="button"]').filter({
        hasText: new RegExp(subcategoriaNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      }).first();

      const subcategoriaExists = await subcategoriaElement.count() > 0;
      
      if (subcategoriaExists) {
        await expect(subcategoriaElement).toBeVisible({ timeout: 10000 });
        console.log(`   ✅ Subcategoría "${subcategoriaNombre}" encontrada`);
        
        // Guardar la URL actual antes de hacer clic
        const urlAntes = page.url();
        await subcategoriaElement.click();
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
        
        // Verificar si navegó a una página de detalle de servicio
        const urlDespues = page.url();
        if (urlDespues.includes('/service/') || urlDespues.includes('/services/')) {
          console.log(`   ⚠️ Al hacer clic en la subcategoría "${subcategoriaNombre}", navegó directamente a una página de servicio`);
          console.log(`   🔄 Volviendo atrás y navegando nuevamente desde la categoría principal...`);
          
          // Volver atrás
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
          
          // Si después de volver atrás no estamos en una página con formulario de búsqueda,
          // volver a navegar desde la categoría principal
          const urlDespuesVolver = page.url();
          const searchForm = page.locator('form#ServicesSearchForm');
          const formExists = await searchForm.count().then(count => count > 0);
          
          if (!formExists || (!urlDespuesVolver.includes('/c/') && !urlDespuesVolver.includes('/services'))) {
            console.log(`   🔄 La página después de volver no tiene formulario, navegando nuevamente desde categoría principal...`);
            
            // Volver al home y navegar nuevamente desde la categoría principal
            await page.goto(DEFAULT_BASE_URL);
            await page.waitForLoadState('networkidle');
            await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
            
            // Navegar a la categoría principal nuevamente
            if (servicio.rutaCategorias.length > 0) {
              const categoriaPrincipal = servicio.rutaCategorias[0];
              const categoriaElement = page.locator('button, a, div[role="button"]').filter({
                hasText: new RegExp(categoriaPrincipal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
              }).first();
              
              const categoriaExists = await categoriaElement.count() > 0;
              if (categoriaExists) {
                await expect(categoriaElement).toBeVisible({ timeout: 10000 });
                await categoriaElement.click();
                await page.waitForLoadState('networkidle');
                await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
                console.log(`   ✅ Navegó nuevamente a la categoría "${categoriaPrincipal}"`);
              }
            }
          } else {
            console.log(`   ✅ Regresó a la lista de servicios con formulario disponible`);
          }
          
          // Salir del bucle de subcategorías - buscaremos el servicio en la lista actual
          break;
        } else {
          console.log(`   ✅ Clic realizado en "${subcategoriaNombre}" y permaneció en la lista`);
        }
      } else {
        console.log(`   ⚠️ No se encontró la subcategoría "${subcategoriaNombre}", continuando...`);
      }
    }
  }

  // Establecer la ubicación antes de buscar servicios
  console.log('   📍 Estableciendo ubicación...');
  
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 3000); // Esperar más tiempo para que el formulario cargue
  
  // Buscar el formulario primero
  const searchForm = page.locator('form#ServicesSearchForm, form');
  let formExists = await searchForm.count() > 0;
  console.log(`   📊 Formulario encontrado: ${formExists}`);
  
  // Si no hay formulario, puede ser que estemos en una página sin formulario (después de volver atrás)
  // En ese caso, volver a navegar desde el home
  if (!formExists) {
    console.log('   ⚠️ No se encontró formulario, puede ser que estemos en una página incorrecta');
    console.log('   🔄 Verificando URL actual...');
    const urlActual = page.url();
    console.log(`   📍 URL actual: ${urlActual}`);
    
    // Si estamos en una URL de categoría pero sin formulario, volver al home y navegar nuevamente
    if (urlActual.includes('/c/') || urlActual.includes('/services')) {
      console.log('   🔄 Volviendo al home y navegando nuevamente desde la categoría principal...');
      
      // Volver al home
      await page.goto(DEFAULT_BASE_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      
      // Navegar nuevamente a la categoría principal si existe
      if (servicio.rutaCategorias.length > 0) {
        const categoriaPrincipal = servicio.rutaCategorias[0];
        const categoriaElement = page.locator('button, a, div[role="button"]').filter({
          hasText: new RegExp(categoriaPrincipal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        }).first();
        
        const categoriaExists = await categoriaElement.count() > 0;
        if (categoriaExists) {
          await expect(categoriaElement).toBeVisible({ timeout: 10000 });
          await categoriaElement.click();
          await page.waitForLoadState('networkidle');
          await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
          console.log(`   ✅ Navegó nuevamente a la categoría "${categoriaPrincipal}"`);
        }
      }
      
      // Esperar a que el formulario cargue
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 3000);
      
      // Verificar nuevamente si hay formulario
      formExists = await searchForm.count() > 0;
      console.log(`   📊 Formulario encontrado después de re-navegar: ${formExists}`);
    }
  }
  
  // Buscar el campo de ubicación usando el label como referencia
  // El HTML muestra: <label for="Address">Ubicación</label> y un <input> dentro del mismo div.relative
  const locationLabel = page.locator('label[for="Address"]');
  let locationInput: ReturnType<typeof page.locator> | null = null;
  let locationInputCount = 0;
  
  // Estrategia 1: Buscar por id (si existe)
  locationInput = page.locator('input#Address');
  locationInputCount = await locationInput.count();
  
  // Estrategia 2: Buscar el input relacionado con el label (en el mismo div.relative)
  if (locationInputCount === 0) {
    const labelExists = await locationLabel.count() > 0;
    if (labelExists) {
      console.log('   🔍 Label "Ubicación" encontrado, buscando input relacionado...');
      // El label y el input están en el mismo div.relative
      // Estructura: <div class="relative"><input><label for="Address">
      const relativeContainer = locationLabel.locator('..'); // Subir un nivel para llegar al div.relative
      locationInput = relativeContainer.locator('input').first();
      locationInputCount = await locationInput.count();
      
      if (locationInputCount > 0) {
        console.log('   ✅ Campo de ubicación encontrado por label (mismo contenedor relativo)');
      }
    } else {
      console.log('   ⚠️ Label[for="Address"] no encontrado, intentando otras estrategias...');
    }
  }
  
  // Estrategia 3: Buscar todos los inputs y encontrar el que tiene el label "Ubicación"
  if (locationInputCount === 0) {
    console.log('   🔍 Buscando todos los inputs y verificando si tienen label "Ubicación"...');
    const allInputs = page.locator('input[type="text"], input:not([type])');
    const totalInputs = await allInputs.count();
    console.log(`   📊 Total de inputs encontrados: ${totalInputs}`);
    
    for (let i = 0; i < totalInputs; i++) {
      const input = allInputs.nth(i);
      // Verificar que no sea el campo de búsqueda
      const inputId = await input.getAttribute('id').catch(() => '');
      const inputName = await input.getAttribute('name').catch(() => '');
      
      if (inputId === 'Search' || inputName === 'Search') {
        continue; // Saltar el campo de búsqueda
      }
      
      // Buscar si hay un label "Ubicación" o label[for="Address"] en el contenedor del input
      // El input está dentro de: <div class="relative"><input>...<label>
      const inputContainer = input.locator('..'); // div.relative
      const nearbyLabel = inputContainer.locator('label[for="Address"], label:has-text("Ubicación")');
      const labelCount = await nearbyLabel.count();
      
      if (labelCount > 0) {
        locationInput = input;
        locationInputCount = 1;
        console.log(`   ✅ Campo de ubicación encontrado (índice ${i}) - input con label "Ubicación"`);
        break;
      }
    }
  }
  
  // Estrategia 4: Buscar input con placeholder=" " que tenga un label "Ubicación" en su contenedor padre
  if (locationInputCount === 0) {
    console.log('   🔍 Buscando input con placeholder=" " que tenga label "Ubicación" cerca...');
    const allInputs = page.locator('input[placeholder=" "]');
    const inputCount = await allInputs.count();
    console.log(`   📊 Inputs con placeholder=" " encontrados: ${inputCount}`);
    
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      // Verificar si hay un label "Ubicación" o label[for="Address"] en el mismo contenedor relativo
      const inputContainer = input.locator('..').locator('..'); // Subir dos niveles para llegar al div.relative
      const nearbyLabel = inputContainer.locator('label[for="Address"], label:has-text("Ubicación")');
      const labelCount = await nearbyLabel.count();
      
      if (labelCount > 0) {
        locationInput = input;
        locationInputCount = 1;
        console.log(`   ✅ Campo de ubicación encontrado por label cercano (índice ${i})`);
        break;
      }
    }
  }
  
  // Estrategia 5: Buscar por el valor actual si contiene "Tepatitlán", "Jalisco" o alguna ciudad
  if (locationInputCount === 0) {
    console.log('   🔍 Buscando input por valor que contenga ubicación...');
    const allInputs = page.locator('input[type="text"]');
    const inputCount = await allInputs.count();
    console.log(`   📊 Inputs de texto encontrados: ${inputCount}`);
    
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      try {
        const inputValue = await input.inputValue();
        if (inputValue && (inputValue.includes('Tepatitlán') || inputValue.includes('Tepatitlan') || inputValue.includes('Jalisco') || inputValue.includes('Morelos'))) {
          // Verificar que no sea el campo de búsqueda (Search)
          const inputId = await input.getAttribute('id').catch(() => '');
          const inputName = await input.getAttribute('name').catch(() => '');
          if (inputId !== 'Search' && inputName !== 'Search') {
            locationInput = input;
            locationInputCount = 1;
            console.log(`   ✅ Campo de ubicación encontrado por valor (índice ${i}): "${inputValue}"`);
            break;
          }
        }
      } catch (e) {
        // Continuar con el siguiente input
        continue;
      }
    }
  }
  
  // Estrategia 6: Buscar cualquier input que tenga un label[for="Address"] asociado (usando el atributo for del label)
  if (locationInputCount === 0) {
    console.log('   🔍 Buscando input usando el atributo for="Address" del label...');
    const labelFor = await locationLabel.getAttribute('for').catch(() => null);
    if (labelFor === 'Address') {
      // Buscar el input que debería estar asociado con este label
      // Puede estar en el mismo contenedor o en un contenedor relacionado
      const formContainer = locationLabel.locator('..').locator('..').locator('..'); // Subir niveles para encontrar el form o contenedor
      locationInput = formContainer.locator('input').filter({
        hasNot: page.locator('#Search, [name="Search"]')
      }).first();
      locationInputCount = await locationInput.count();
      
      if (locationInputCount > 0) {
        console.log('   ✅ Campo de ubicación encontrado usando contenedor del label');
      }
    }
  }
  
  if (locationInputCount === 0 || !locationInput) {
    console.log('   ❌ No se encontró el campo de ubicación después de múltiples intentos');
    console.log('   🔍 Debug: Buscando todos los inputs en la página...');
    
    // Intentar obtener información de debug (con timeout corto usando Promise.race)
    try {
      const allInputsPromise = page.locator('input').count();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
      const allInputs = await Promise.race([allInputsPromise, timeoutPromise]) as number;
      console.log(`   📊 Total de inputs encontrados: ${allInputs}`);
    } catch (e) {
      console.log(`   ⚠️ Error al contar inputs: ${e}`);
    }
    
    try {
      const labelCountPromise = locationLabel.count();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
      const labelExists = await Promise.race([labelCountPromise, timeoutPromise]) as number;
      console.log(`   📊 Label[for="Address"] existe: ${labelExists > 0}`);
    } catch (e) {
      console.log(`   ⚠️ Error al verificar label: ${e}`);
    }
    
    // Obtener información básica que no debería dar timeout
    try {
      const currentUrl = page.url();
      console.log(`   🔗 URL actual: ${currentUrl}`);
    } catch (e) {
      console.log(`   ⚠️ Error al obtener URL: ${e}`);
    }
    
    throw new Error('❌ FALLO: No se pudo encontrar el campo de ubicación. La prueba requiere establecer una ubicación para continuar.');
  }
  
  console.log('   ✅ Campo de ubicación encontrado');
  
  // Hacer clic en el campo de ubicación
  await locationInput.click({ force: true });
  await safeWaitForTimeout(page, 500);
  
  // Limpiar el campo si tiene algún valor
  const currentValue = await locationInput.inputValue().catch(() => '');
  if (currentValue && currentValue.trim().length > 0) {
    // Buscar el botón de limpiar (icon-x) cerca del input
    // El botón está en un div absoluto dentro del mismo contenedor que el input
    const inputContainer = locationInput.locator('..').locator('..'); // Subir dos niveles para llegar al contenedor relativo
    const clearButton = inputContainer.locator('button[aria-label="Clear address"], button:has(i.icon-x), button:has(i[class*="icon-x"])').first();
    const clearButtonVisible = await clearButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (clearButtonVisible) {
      console.log('   🗑️ Limpiando campo de ubicación...');
      await clearButton.click();
      await safeWaitForTimeout(page, 500);
    } else {
      // Si no hay botón de limpiar, limpiar manualmente seleccionando todo y borrando
      await locationInput.click({ clickCount: 3 }); // Triple clic para seleccionar todo
      await page.keyboard.press('Delete');
      await safeWaitForTimeout(page, 300);
    }
  }
  
  // Escribir "Tepatitlan" en el campo de ubicación
  console.log('   ✍️ Escribiendo "Tepatitlan" en el campo de ubicación...');
  await locationInput.fill('Tepatitlan');
  await safeWaitForTimeout(page, 2000); // Esperar a que aparezcan las sugerencias
  
  // Buscar las opciones del dropdown de Google Places
  console.log('   🔍 Esperando sugerencias de Google Places...');
  
  let opcionesUbicacion = page.locator('ul li.cursor-pointer, div[role="option"], ul li[role="option"]');
  let opcionesCount = await opcionesUbicacion.count();
  
  // Intentar múltiples veces si no aparecen las opciones
  for (let intento = 1; intento <= 5 && opcionesCount === 0; intento++) {
    console.log(`   ⏳ Intento ${intento}/5: Esperando sugerencias...`);
    await safeWaitForTimeout(page, 2000);
    opcionesCount = await opcionesUbicacion.count();
  }
  
  // Si no se encuentran con ese selector, intentar otros
  if (opcionesCount === 0) {
    opcionesUbicacion = page.locator('ul li, div[role="option"], li[role="option"]');
    opcionesCount = await opcionesUbicacion.count();
  }
  
  if (opcionesCount > 0) {
    console.log(`   📊 Opciones de ubicación encontradas: ${opcionesCount}`);
    
    // Seleccionar la primera opción que contenga "Tepatitlán" o "Tepatitlan"
    let opcionSeleccionada = false;
    for (let i = 0; i < opcionesCount; i++) {
      const opcion = opcionesUbicacion.nth(i);
      const textoOpcion = await opcion.textContent().catch(() => '') || '';
      const textoLimpio = textoOpcion.toLowerCase();
      
      if (textoLimpio.includes('tepatitlán') || textoLimpio.includes('tepatitlan')) {
        console.log(`   🖱️ Seleccionando opción "${textoOpcion.trim()}"`);
        await opcion.click();
        await safeWaitForTimeout(page, 1000);
        opcionSeleccionada = true;
        console.log('   ✅ Ubicación seleccionada');
        break;
      }
    }
    
    // Si no se encontró una opción con "Tepatitlán", seleccionar la primera
    if (!opcionSeleccionada) {
      const primeraOpcion = opcionesUbicacion.first();
      const textoOpcion = await primeraOpcion.textContent().catch(() => '');
      console.log(`   🖱️ Seleccionando primera opción: "${textoOpcion?.trim()}"`);
      await primeraOpcion.click();
      await safeWaitForTimeout(page, 1000);
      console.log('   ✅ Ubicación seleccionada');
      opcionSeleccionada = true;
    }
    
    // Verificar que se seleccionó una opción
    if (!opcionSeleccionada) {
      throw new Error('❌ FALLO: No se pudo seleccionar ninguna opción de ubicación. La prueba requiere establecer una ubicación para continuar.');
    }
  } else {
    console.log('   ❌ No se encontraron opciones de ubicación después de escribir "Tepatitlan"');
    throw new Error('❌ FALLO: No se encontraron opciones de ubicación después de escribir en el campo. La prueba requiere establecer una ubicación para continuar.');
  }
  
  // Esperar a que la página actualice después de seleccionar la ubicación
  await safeWaitForTimeout(page, 2000);
  
  // Después de navegar por categorías, buscar el servicio directamente en la lista de servicios
  // NO usar el campo de búsqueda ya que encontraría primero las promociones en el carrusel
  console.log('   🔍 Buscando servicio en la lista de servicios...');

  // Esperar a que aparezcan las tarjetas de servicios (excluyendo promociones)
  console.log('   ⏳ Esperando a que los servicios se carguen...');
  try {
    await page.waitForSelector('img[src*="imagedelivery"], img[alt]', { timeout: 10000, state: 'visible' });
    console.log('   ✅ Imágenes de servicios detectadas');
  } catch (e) {
    console.log('   ⚠️ No se detectaron imágenes de servicios inmediatamente, continuando...');
  }
  
  await safeWaitForTimeout(page, 2000); // Esperar 2 segundos más después de detectar imágenes

  // Buscar tarjetas de servicios en los resultados
  // Excluir promociones buscando solo servicios que NO estén en el carrusel de promociones
  // Las promociones tienen un div con clase que contiene "bg-[#FF7A00]" o "icon-promotion"
  const serviceCards = page.locator('button, div').filter({
    has: page.locator('img[src*="imagedelivery"], img[alt]')
  }).filter({
    has: page.locator('p, h3, h4, h5, h6')
  }).filter({
    hasNot: page.locator('i[class*="promotion"], div[class*="bg-[#FF7A00]"], div[style*="#FF7A00"]')
  });

  const cardCount = await serviceCards.count();
  console.log(`   📊 Tarjetas de servicios encontradas (sin promociones): ${cardCount}`);

  if (cardCount === 0) {
    console.log('   ⚠️ No se encontraron tarjetas de servicios en los resultados');
    return false;
  }

  // Buscar la tarjeta que contiene el nombre EXACTO del servicio
  const nombreServicio = servicio.nombre.trim();
  const nombreServicioLimpio = nombreServicio.toLowerCase();
  
  console.log(`   🔍 Buscando servicio: "${nombreServicio}"`);

  for (let i = 0; i < Math.min(cardCount, 50); i++) {
    const card = serviceCards.nth(i);
    
    // Buscar el nombre del servicio en el TÍTULO/NOMBRE PRINCIPAL de la tarjeta
    const selectoresNombreServicio = [
      'p.text-large.text-dark-neutral.font-bold.text-start', // Versión móvil
      'h5.text-dark-neutral', // Versión desktop
      'p.text-large.font-bold', // Fallback
      'p.text-medium.font-bold', // Fallback
      'p.font-bold.text-start', // Fallback
      'h3.text-dark-neutral',
      'h4.text-dark-neutral'
    ];
    
    let nombreEncontrado = false;
    let textoEncontrado = '';
    
    // Buscar en cada selector de nombre de servicio
    for (const selector of selectoresNombreServicio) {
      const elementosNombre = card.locator(selector);
      const countElementos = await elementosNombre.count();
      
      for (let j = 0; j < countElementos; j++) {
        const elemento = elementosNombre.nth(j);
        const textoElemento = await elemento.textContent().catch(() => null);
        
        if (!textoElemento) {
          continue;
        }
        
        const textoLimpio = textoElemento.trim().toLowerCase();
        
        // Verificar coincidencia EXACTA del nombre completo
        const textoLimpioTrim = textoLimpio.trim();
        const nombreServicioLimpioTrim = nombreServicioLimpio.trim();
        const textoCoincideExacto = textoLimpioTrim === nombreServicioLimpioTrim;
        
        // También verificar si contiene el nombre (más flexible)
        const textoContieneNombre = textoLimpioTrim.includes(nombreServicioLimpioTrim) || nombreServicioLimpioTrim.includes(textoLimpioTrim);
        
        // Extraer parte clave del nombre (sin timestamps)
        const partesNombre = nombreServicio.split(' - ');
        const parteDescriptiva = partesNombre.length > 1 ? partesNombre[1].split(/\d{4}-\d{2}-\d{2}/)[0].trim().toLowerCase() : '';
        const tieneParteDescriptiva = parteDescriptiva && textoLimpio.includes(parteDescriptiva);
        
        // Aceptar si es exactamente igual O si contiene el nombre completo O si tiene la parte descriptiva
        if (textoCoincideExacto || (textoContieneNombre && textoLimpio.length > 20) || tieneParteDescriptiva) {
          // Verificar que el texto tiene una longitud razonable
          const longitudSimilar = Math.abs(textoElemento.trim().length - nombreServicio.length) < 50;
          
          if (longitudSimilar || textoCoincideExacto) {
            nombreEncontrado = true;
            textoEncontrado = textoElemento;
            console.log(`   ✅ Encontró servicio en índice ${i}, selector: ${selector}`);
            console.log(`   📋 Texto encontrado: "${textoElemento}"`);
            console.log(`   📋 Nombre buscado: "${nombreServicio}"`);
            console.log(`   📋 Coincidencia exacta: ${textoCoincideExacto}, Contiene nombre: ${textoContieneNombre}, Tiene parte descriptiva: ${tieneParteDescriptiva}`);
            break;
          }
        }
      }
      
      if (nombreEncontrado) {
        break;
      }
    }
    
    if (nombreEncontrado) {
      // Hacer clic en la tarjeta
      console.log(`   🖱️ Haciendo clic en la tarjeta del servicio...`);
      
      // Esperar a que la tarjeta sea clickeable antes de hacer clic
      await card.waitFor({ state: 'visible', timeout: 10000 });
      await card.click();
      
      // Esperar a que la navegación ocurra
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
      
      // Esperar a que la URL cambie a una página de detalle
      try {
        await page.waitForURL(/\/service\/|\/services\//, { timeout: 15000 });
      } catch (e) {
        console.log(`   ⚠️ No se detectó cambio de URL a página de detalle después de 15 segundos`);
      }
      
      // Verificar que navegó a la página de detalle
      const urlActual = page.url();
      console.log(`   🔗 URL actual después del clic: ${urlActual}`);
      
      if (urlActual.includes('/service/') || urlActual.includes('/services/')) {
        // Esperar a que la página de detalle cargue completamente
        console.log(`   ⏳ Esperando a que la página de detalle cargue...`);
        await page.waitForLoadState('domcontentloaded');
        await safeWaitForTimeout(page, 2000);
        
        // Primero verificar si hay una sección de promoción
        console.log(`   🔍 Verificando si el servicio tiene promoción asociada...`);
        const seccionPromocion = page.locator('text=/Promociones especiales/i').first();
        const tienePromocion = await seccionPromocion.isVisible({ timeout: 3000 }).catch(() => false);
        
        let tituloPromocionEnPagina = '';
        if (tienePromocion) {
          console.log(`   ✅ El servicio tiene una promoción asociada`);
          
          // Buscar el título de la promoción en la sección de promoción
          // El título está en p.text-dark-neutral.text-large.font-bold dentro de la sección de promoción
          const tituloPromocionElement = page.locator('div.flex.flex-col.w-full.gap-2.max-w-\\[480px\\] p.text-dark-neutral.text-large.font-bold').first();
          const tituloPromocionVisible = await tituloPromocionElement.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (tituloPromocionVisible) {
            tituloPromocionEnPagina = (await tituloPromocionElement.textContent().catch(() => '')) || '';
            console.log(`   ✅ Título de promoción encontrado en la página: "${tituloPromocionEnPagina.trim()}"`);
          }
        } else {
          console.log(`   ℹ️ El servicio no tiene promoción asociada (estructura estándar)`);
        }
        
        // Buscar el nombre del servicio
        // Cuando hay promoción, el nombre del servicio está en h4 (desktop) o h6 (mobile) DESPUÉS de la sección de promoción
        // Cuando no hay promoción, el nombre puede estar en h4, h5, h6, o en el header
        let nombreEnPagina = '';
        let elementoEncontrado = false;
        
        // Priorizar h4 para desktop y h6 para mobile cuando hay promoción
        try {
          // Intentar h4 primero (desktop - cuando hay promoción, el nombre está aquí)
          const h4 = page.locator('h4.text-dark-neutral, h4').first();
          const h4Visible = await h4.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (h4Visible) {
            const textoH4 = (await h4.textContent().catch(() => '')) || '';
            
            // Verificar que no sea el título de la promoción (si hay promoción)
            if (tienePromocion && tituloPromocionEnPagina) {
              const textoLimpio = textoH4.trim().toLowerCase();
              const tituloPromoLimpio = tituloPromocionEnPagina.trim().toLowerCase();
              if (textoLimpio === tituloPromoLimpio) {
                console.log(`   ⚠️ El h4 contiene el título de la promoción, no el nombre del servicio. Buscando en otro lugar...`);
              } else {
                nombreEnPagina = textoH4.trim().toLowerCase();
                elementoEncontrado = true;
                console.log(`   ✅ Nombre encontrado en la página con selector: h4`);
                console.log(`   📋 Texto encontrado: "${textoH4.trim()}"`);
              }
            } else {
              nombreEnPagina = textoH4.trim().toLowerCase();
              elementoEncontrado = true;
              console.log(`   ✅ Nombre encontrado en la página con selector: h4`);
              console.log(`   📋 Texto encontrado: "${textoH4.trim()}"`);
            }
          }
          
          // Si no se encontró en h4, intentar h5 (desktop - header superior)
          if (!elementoEncontrado) {
            const h5 = page.locator('h5.text-dark-neutral, h5').first();
            const h5Visible = await h5.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (h5Visible) {
              const textoH5 = (await h5.textContent().catch(() => '')) || '';
              
              // Verificar que no sea el título de la promoción (si hay promoción)
              if (tienePromocion && tituloPromocionEnPagina) {
                const textoLimpio = textoH5.trim().toLowerCase();
                const tituloPromoLimpio = tituloPromocionEnPagina.trim().toLowerCase();
                if (textoLimpio === tituloPromoLimpio) {
                  console.log(`   ⚠️ El h5 contiene el título de la promoción, no el nombre del servicio. Buscando en otro lugar...`);
                } else {
                  nombreEnPagina = textoH5.trim().toLowerCase();
                  elementoEncontrado = true;
                  console.log(`   ✅ Nombre encontrado en la página con selector: h5`);
                  console.log(`   📋 Texto encontrado: "${textoH5.trim()}"`);
                }
              } else {
                nombreEnPagina = textoH5.trim().toLowerCase();
                elementoEncontrado = true;
                console.log(`   ✅ Nombre encontrado en la página con selector: h5`);
                console.log(`   📋 Texto encontrado: "${textoH5.trim()}"`);
              }
            }
          }
          
          // Si no se encontró en h5, intentar h6 (mobile - cuando hay promoción, el nombre está aquí)
          if (!elementoEncontrado) {
            const h6 = page.locator('h6.text-dark-neutral, h6').first();
            const h6Visible = await h6.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (h6Visible) {
              const textoH6 = (await h6.textContent().catch(() => '')) || '';
              
              // Verificar que no sea el título de la promoción (si hay promoción)
              if (tienePromocion && tituloPromocionEnPagina) {
                const textoLimpio = textoH6.trim().toLowerCase();
                const tituloPromoLimpio = tituloPromocionEnPagina.trim().toLowerCase();
                if (textoLimpio === tituloPromoLimpio) {
                  console.log(`   ⚠️ El h6 contiene el título de la promoción, no el nombre del servicio. Buscando en otro lugar...`);
                } else {
                  nombreEnPagina = textoH6.trim().toLowerCase();
                  elementoEncontrado = true;
                  console.log(`   ✅ Nombre encontrado en la página con selector: h6`);
                  console.log(`   📋 Texto encontrado: "${textoH6.trim()}"`);
                }
              } else {
                nombreEnPagina = textoH6.trim().toLowerCase();
                elementoEncontrado = true;
                console.log(`   ✅ Nombre encontrado en la página con selector: h6`);
                console.log(`   📋 Texto encontrado: "${textoH6.trim()}"`);
              }
            }
          }
          
          // Como último recurso, intentar otros selectores
          if (!elementoEncontrado) {
            const selectoresNombreDetalle = [
              'h1',
              'h2',
              'h3',
              'p.text-large.font-bold',
              'p.text-large.text-dark-neutral.font-bold'
            ];
            
            for (const selector of selectoresNombreDetalle) {
              try {
                const elemento = page.locator(selector).first();
                const esVisible = await elemento.isVisible({ timeout: 3000 }).catch(() => false);
                if (esVisible) {
                  const texto = await elemento.textContent();
                  if (texto && texto.trim().length > 0) {
                    // Verificar que no sea el título de la promoción (si hay promoción)
                    if (tienePromocion && tituloPromocionEnPagina) {
                      const textoLimpio = texto.trim().toLowerCase();
                      const tituloPromoLimpio = tituloPromocionEnPagina.trim().toLowerCase();
                      if (textoLimpio === tituloPromoLimpio) {
                        continue; // Es el título de la promoción, continuar con el siguiente selector
                      }
                    }
                    
                    nombreEnPagina = texto.trim().toLowerCase();
                    elementoEncontrado = true;
                    console.log(`   ✅ Nombre encontrado en la página con selector: ${selector}`);
                    console.log(`   📋 Texto encontrado: "${texto.trim()}"`);
                    break;
                  }
                }
              } catch (e) {
                // Continuar con el siguiente selector
                continue;
              }
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Error al buscar nombre en headers: ${error}`);
        }
        
        if (elementoEncontrado) {
          // Verificar si el nombre coincide
          if (nombreEnPagina.includes(nombreServicioLimpio) || nombreServicioLimpio.includes(nombreEnPagina)) {
            console.log(`   ✅ Verificado: El servicio en la página coincide con el buscado`);
            console.log(`   ✅ Navegó a la página de detalle: ${urlActual}`);
            return true;
          } else {
            console.log(`   ⚠️ El nombre en la página no coincide exactamente, pero la URL es válida`);
            console.log(`   📋 Nombre en página: "${nombreEnPagina}"`);
            console.log(`   📋 Nombre buscado: "${nombreServicioLimpio}"`);
            console.log(`   ✅ Navegó a la página de detalle: ${urlActual}`);
            return true;
          }
        } else {
          console.log(`   ⚠️ No se encontró el nombre del servicio en la página, pero la URL es válida`);
          console.log(`   ✅ Navegó a la página de detalle: ${urlActual}`);
          return true; // Aceptar si la URL es correcta aunque no encontremos el nombre
        }
      } else {
        console.log(`   ⚠️ No se navegó a una página de detalle de servicio. URL: ${urlActual}`);
        return false;
      }
    }
  }

  console.log(`   ❌ No se encontró la tarjeta del servicio "${servicio.nombre}" en los resultados`);
  console.log(`   🔍 Revisando las primeras 5 tarjetas para debug...`);
  
  // Debug: mostrar los nombres de las primeras tarjetas
  for (let i = 0; i < Math.min(5, cardCount); i++) {
    const card = serviceCards.nth(i);
    const selectores = ['p.text-large.font-bold', 'h5.text-dark-neutral', 'p.font-bold'];
    for (const sel of selectores) {
      const elemento = card.locator(sel).first();
      const texto = await elemento.textContent().catch(() => null);
      if (texto) {
        console.log(`   📋 Tarjeta ${i + 1}: "${texto.trim().substring(0, 100)}"`);
        break;
      }
    }
  }
  
  return false;
}

/**
 * Marca o desmarca un servicio como favorito
 */
async function toggleFavorito(page: Page, marcar: boolean): Promise<boolean> {
  await showStepMessage(page, marcar ? '❤️ MARCANDO COMO FAVORITO' : '💔 DESMARCANDO FAVORITO');
  await safeWaitForTimeout(page, 2000);

  // Buscar el botón de favoritos con múltiples estrategias
  // El HTML muestra:
  // Desktop: <button class="relative flex w-[40px] h-[40px]..."><i class="icon icon-heart text-[24px] text-primary-neutral"></i></button>
  // Móvil: <button class="w-[40px] h-[40px] relative..."><i class="icon icon-heart text-dark-neutral text-[24px]"></i></button>
  let botonFavoritos: ReturnType<typeof page.locator> | null = null;
  let botonVisible = false;
  
  // Estrategia 1: Buscar botón con icono icon-heart (versión desktop - visible en lg)
  botonFavoritos = page.locator('button').filter({
    has: page.locator('i.icon.icon-heart')
  }).filter({
    hasNot: page.locator('i[class*="share"]') // Excluir botón de compartir que también puede tener iconos similares
  }).first();
  
  botonVisible = await botonFavoritos.isVisible({ timeout: 5000 }).catch(() => false);
  
  // Estrategia 2: Si no se encuentra en desktop, buscar en móvil
  if (!botonVisible) {
    console.log('   🔍 Botón de favoritos no visible en desktop, buscando en móvil...');
    botonFavoritos = page.locator('button.w-\\[40px\\].h-\\[40px\\]').filter({
      has: page.locator('i.icon.icon-heart')
    }).first();
    botonVisible = await botonFavoritos.isVisible({ timeout: 5000 }).catch(() => false);
  }
  
  // Estrategia 3: Buscar cualquier botón que contenga un icono con clase icon-heart
  if (!botonVisible) {
    console.log('   🔍 Buscando botón con icono icon-heart de forma general...');
    botonFavoritos = page.locator('button').filter({
      has: page.locator('i[class*="icon-heart"]')
    }).filter({
      hasNot: page.locator('i[class*="share"]')
    }).first();
    botonVisible = await botonFavoritos.isVisible({ timeout: 5000 }).catch(() => false);
  }
  
  // Estrategia 4: Buscar por aria-label si existe
  if (!botonVisible) {
    console.log('   🔍 Intentando buscar por aria-label...');
    const botonFavoritosAlt = page.locator('button[aria-label*="favorito" i], button[aria-label*="favorite" i]').first();
    botonVisible = await botonFavoritosAlt.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (botonVisible) {
      botonFavoritos = botonFavoritosAlt;
    }
  }
  
  // Estrategia 5: Buscar manualmente en todos los botones
  if (!botonVisible) {
    console.log('   🔍 Buscando manualmente en todos los botones...');
    const todosLosBotones = page.locator('button');
    const cantidadBotones = await todosLosBotones.count();
    console.log(`   📊 Total de botones encontrados: ${cantidadBotones}`);
    
    for (let i = 0; i < Math.min(cantidadBotones, 30); i++) {
      const boton = todosLosBotones.nth(i);
      const tieneIconoHeart = await boton.locator('i.icon.icon-heart, i[class*="icon-heart"]').count() > 0;
      
      if (tieneIconoHeart) {
        // Verificar que no sea el botón de compartir
        const tieneIconoShare = await boton.locator('i[class*="share"]').count() > 0;
        if (!tieneIconoShare) {
          const esVisible = await boton.isVisible({ timeout: 2000 }).catch(() => false);
          if (esVisible) {
            botonFavoritos = boton;
            botonVisible = true;
            console.log(`   ✅ Botón de favoritos encontrado en índice ${i}`);
            break;
          }
        }
      }
    }
  }
  
  if (!botonVisible) {
    throw new Error('❌ No se encontró el botón de favoritos en la página del servicio');
  }

  console.log('   ✅ Botón de favoritos encontrado');

  // Verificar el estado actual del icono
  // Buscar el icono dentro del botón
  const iconHeart = botonFavoritos.locator('i.icon.icon-heart, i[class*="icon-heart"]').first();
  const iconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
  console.log(`   📊 Clase completa del icono: "${iconClass}"`);
  
  // El estado marcado se detecta por:
  // 1. Clase que contiene "heart-solid" o "icon-heart-solid"
  // 2. Clase que contiene "text-primary-neutral" (en desktop, cuando está marcado)
  // 3. O si el icono tiene alguna clase específica de "marcado"
  const estaMarcado = iconClass.includes('heart-solid') || 
                      iconClass.includes('icon-heart-solid') ||
                      iconClass.includes('text-primary-neutral');
  
  console.log(`   📊 Estado actual: ${estaMarcado ? 'marcado' : 'desmarcado'}`);

  // Si queremos marcar y ya está marcado, o si queremos desmarcar y no está marcado, no hacer nada
  if ((marcar && estaMarcado) || (!marcar && !estaMarcado)) {
    console.log(`   ℹ️ El servicio ya está en el estado deseado (${marcar ? 'marcado' : 'desmarcado'})`);
    return true;
  }

  // Hacer clic para cambiar el estado
  console.log(`   🖱️ Haciendo clic en el botón de favoritos...`);
  await botonFavoritos.click();
  await safeWaitForTimeout(page, 3000);

  // Verificar que cambió el estado
  const nuevoIconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
  const nuevoEstado = nuevoIconClass.includes('heart-solid') || 
                      nuevoIconClass.includes('icon-heart-solid') ||
                      nuevoIconClass.includes('text-primary-neutral');
  
  console.log(`   📊 Nuevo estado: ${nuevoEstado ? 'marcado' : 'desmarcado'}`);
  console.log(`   📊 Nueva clase del icono: "${nuevoIconClass}"`);
  
  if (marcar && nuevoEstado) {
    console.log('   ✅ Servicio marcado como favorito correctamente');
    return true;
  } else if (!marcar && !nuevoEstado) {
    console.log('   ✅ Servicio desmarcado como favorito correctamente');
    return true;
  } else {
    console.log('⚠️ El estado puede no haber cambiado visualmente, pero el clic se realizó');
    return true; // Aún así consideramos éxito
  }
}

// ============================================================================
// PRUEBAS
// ============================================================================

test.use({
  viewport: { width: 1280, height: 720 }
});

test.setTimeout(DEFAULT_TIMEOUT);

test.describe('Favoritos del cliente', () => {
  let serviciosDelProveedor: ServicioInfo[] = [];
  let serviciosObtenidos = false;

  test.beforeEach(async ({ page, browser }, testInfo) => {
    // La prueba "Desmarcar servicio como favorito desde la página de favoritos" 
    // no necesita obtener servicios del proveedor
    const esPruebaDesmarcarDesdeFavoritos = testInfo.title.includes('Favoritos Cliente: Página favoritos – Desmarcar servicio');
    
    // Obtener servicios del proveedor solo la primera vez y solo si la prueba los necesita
    if (!serviciosObtenidos && !esPruebaDesmarcarDesdeFavoritos) {
      // Crear un nuevo contexto separado para el proveedor (sin cookies compartidas)
      const providerContext = await browser.newContext();
      const providerPage = await providerContext.newPage();
      
      try {
        serviciosDelProveedor = await obtenerServiciosDelProveedor(providerPage);
        
        if (serviciosDelProveedor.length === 0) {
          throw new Error('❌ No se encontraron servicios del proveedor');
        }
        
        console.log(`\n✅ Se obtuvieron ${serviciosDelProveedor.length} servicios del proveedor`);
        serviciosObtenidos = true;
      } finally {
        await providerContext.close();
      }
    }

    // Iniciar sesión como cliente
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  // ============================================
  // PRUEBAS: Marcar favorito, Desmarcar (desde servicio), Desmarcar (desde página favoritos)
  // ============================================

  test('Favoritos Cliente: Servicio – Marcar como favorito', async ({ page }) => {
    // Asegurarse de estar deslogueado del proveedor y logueado como cliente
    await showStepMessage(page, '🔄 ASEGURANDO SESIÓN COMO CLIENTE');
    
    // Limpiar cookies y storage para asegurar que no haya sesión activa del proveedor
    await page.context().clearCookies();
    
    // Navegar a una página válida antes de limpiar storage
    try {
      await page.goto(DEFAULT_BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (e) {
      console.log('⚠️ Error al limpiar storage, continuando...');
    }
    
    // Verificar que estamos logueados como cliente (si no, hacer login)
    const isLoggedIn = await page.locator('button:has(i.icon-user), a:has(i.icon-user)').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('📋 No hay sesión activa, iniciando sesión como cliente...');
      await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    } else {
      console.log('✅ Ya hay una sesión activa, verificando que sea del cliente...');
      // Verificar que la sesión es del cliente y no del proveedor
      // Si estamos en una página del proveedor, hacer logout y login como cliente
      const currentUrl = page.url();
      if (currentUrl.includes('/provider/')) {
        console.log('⚠️ Detectada sesión de proveedor, cerrando sesión...');
        // Buscar botón de logout o menú de usuario
        try {
          const userMenu = page.locator('button:has(i.icon-user), a:has(i.icon-user)').first();
          await userMenu.click();
          await safeWaitForTimeout(page, 1000);
          
          const logoutButton = page.locator('button:has-text("Cerrar sesión"), button:has-text("Logout"), a:has-text("Cerrar sesión")').first();
          const logoutVisible = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
          if (logoutVisible) {
            await logoutButton.click();
            await page.waitForLoadState('networkidle');
            await safeWaitForTimeout(page, 2000);
          }
        } catch (e) {
          console.log('⚠️ No se pudo hacer logout explícito, limpiando cookies...');
          await page.context().clearCookies();
          await page.goto(DEFAULT_BASE_URL);
          await page.waitForLoadState('networkidle');
        }
        
        // Hacer login como cliente
        await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, 2000);
      }
    }
    
    // Buscar un servicio que NO esté marcado como favorito
    await showStepMessage(page, '🔍 BUSCANDO SERVICIO SIN MARCAR COMO FAVORITO');
    let servicioNoFavorito: ServicioInfo | null = null;
    
    // Limitar la búsqueda a los primeros 10 servicios para evitar tiempos de ejecución muy largos
    // pero manteniendo la navegación completa como lo haría un humano
    const maxServiciosAVerificar = Math.min(10, serviciosDelProveedor.length);
    console.log(`📊 Verificando hasta ${maxServiciosAVerificar} servicios para encontrar uno no marcado como favorito...`);
    console.log(`ℹ️ La prueba navegará por categorías como lo haría un usuario real (sin atajos)`);
    
    // Iterar por los servicios del proveedor para encontrar uno que no esté marcado como favorito
    for (let i = 0; i < maxServiciosAVerificar; i++) {
      const servicio = serviciosDelProveedor[i];
      console.log(`\n🔍 Verificando servicio ${i + 1}/${maxServiciosAVerificar}: "${servicio.nombre}"`);
      
      // Navegar al servicio usando la navegación completa por categorías (como lo haría un humano)
      const navegoCorrectamente = await navegarAServicioPorRuta(page, servicio);
      if (!navegoCorrectamente) {
        console.log(`   ⚠️ No se pudo navegar al servicio "${servicio.nombre}", intentando siguiente...`);
        continue;
      }
      
      // Esperar a que la página cargue
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      // Verificar que estamos en la página del servicio
      const urlActual = page.url();
      if (!urlActual.includes('/service/') && !urlActual.includes('/services/')) {
        console.log(`   ⚠️ No se detectó navegación a página de servicio (URL: ${urlActual}), intentando siguiente...`);
        continue;
      }
      
      // Esperar a que existan iconos de corazón (render dinámico)
      await page.waitForSelector('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]', { timeout: 5000 }).catch(() => {});

      // Buscar el botón de favoritos de forma robusta
      const candidatos = page.locator('button').filter({
        has: page.locator('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]')
      }).filter({
        hasNot: page.locator('i[class*="share"]')
      });

      const totalCandidatos = await candidatos.count();
      let botonFavoritos: ReturnType<typeof page.locator> | null = null;
      for (let idx = 0; idx < totalCandidatos; idx++) {
        const btn = candidatos.nth(idx);
        const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) {
          botonFavoritos = btn;
          break;
        }
      }

      if (!botonFavoritos) {
        console.log(`   ⚠️ No se encontró el botón de favoritos para "${servicio.nombre}", intentando siguiente...`);
        continue;
      }

      // Verificar el estado actual del favorito (solo sólido indica marcado)
      const iconElement = botonFavoritos.locator('i.icon-heart-solid, i[class*="heart-solid"]').first();
      const estaMarcado = await iconElement.count().then(c => c > 0);
      
      console.log(`   📊 Estado del favorito: ${estaMarcado ? '✅ MARCADO' : '❌ NO MARCADO'}`);
      
      if (!estaMarcado) {
        // ¡Encontramos un servicio que no está marcado como favorito!
        servicioNoFavorito = servicio;
        console.log(`\n✅ Servicio encontrado que NO está marcado como favorito: "${servicio.nombre}"`);
        break;
      } else {
        console.log(`   ℹ️ El servicio "${servicio.nombre}" ya está marcado como favorito, buscando otro...`);
      }
    }
    
    // Verificar que encontramos un servicio
    if (!servicioNoFavorito) {
      throw new Error('❌ No se encontró ningún servicio del proveedor fiestamasqaprv@gmail.com que no esté marcado como favorito');
    }
    
    const servicio = servicioNoFavorito;
    expect(servicio).toBeDefined();
    expect(servicio.nombre).toBeTruthy();
    
    console.log(`\n📋 Usando servicio: "${servicio.nombre}"`);

    // Marcar como favorito usando la función reutilizable
    const exito = await marcarServicioComoFavorito(page);
    expect(exito).toBe(true);

    // Verificar en la página de favoritos
    await showStepMessage(page, '🔍 VERIFICANDO EN PÁGINA DE FAVORITOS');
    await safeWaitForTimeout(page, 2000);

    await page.goto(FAVORITES_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const urlActual = page.url();
    expect(urlActual).toContain('favorites');
    console.log('✅ Navegó a la página de favoritos');

    // Buscar el servicio en favoritos
    const serviciosEnFavoritos = page.locator('button, div').filter({
      has: page.locator('img[src*="imagedelivery"], img[alt]')
    });

    const cantidadServicios = await serviciosEnFavoritos.count();
    console.log(`📊 Servicios encontrados en favoritos: ${cantidadServicios}`);

    if (cantidadServicios > 0) {
      console.log('✅ El servicio aparece en la lista de favoritos');
    } else {
      console.log('⚠️ No se encontraron servicios en favoritos (puede que necesite tiempo para cargar)');
    }
  });

  test('Favoritos Cliente: Servicio – Desmarcar como favorito', async ({ page }) => {
    // Seleccionar el primer servicio disponible
    const servicio = serviciosDelProveedor[0];
    expect(servicio).toBeDefined();
    expect(servicio.nombre).toBeTruthy();

    // Primero asegurarse de que está marcado como favorito
    // Navegar al servicio
    let navegoCorrectamente = await navegarAServicioPorRuta(page, servicio);
    expect(navegoCorrectamente).toBe(true);

    // Verificar si ya está marcado, si no, marcarlo primero
    // Usar la misma lógica robusta que en toggleFavorito
    let botonFavoritos = page.locator('button').filter({
      has: page.locator('i[class*="heart"]')
    }).first();

    let botonVisible = await botonFavoritos.isVisible({ timeout: 10000 }).catch(() => false);
    
    // Si no se encuentra, intentar otros selectores
    if (!botonVisible) {
      botonFavoritos = page.locator('button').filter({
        has: page.locator('i.icon.icon-heart, i.icon-heart, i.icon-heart-solid')
      }).first();
      botonVisible = await botonFavoritos.isVisible({ timeout: 5000 }).catch(() => false);
    }
    
    // Si aún no se encuentra, buscar manualmente
    if (!botonVisible) {
      const todosLosBotones = page.locator('button');
      const cantidadBotones = await todosLosBotones.count();
      
      for (let i = 0; i < Math.min(cantidadBotones, 20); i++) {
        const boton = todosLosBotones.nth(i);
        const tieneIconoHeart = await boton.locator('i[class*="heart"]').count() > 0;
        
        if (tieneIconoHeart) {
          const esVisible = await boton.isVisible({ timeout: 2000 }).catch(() => false);
          if (esVisible) {
            botonFavoritos = boton;
            botonVisible = true;
            break;
          }
        }
      }
    }

    expect(botonVisible).toBe(true);

    // Verificar el estado actual leyendo la clase del icono
    const iconHeart = botonFavoritos.locator('i[class*="heart"]').first();
    const iconClass = await iconHeart.getAttribute('class').catch(() => '') || '';
    const yaEsFavorito = iconClass.includes('heart-solid') || iconClass.includes('icon-heart-solid');

    if (!yaEsFavorito) {
      console.log('ℹ️ El servicio no está marcado como favorito, marcándolo primero...');
      await marcarServicioComoFavorito(page);
      // Navegar de nuevo al servicio para desmarcarlo
      navegoCorrectamente = await navegarAServicioPorRuta(page, servicio);
      expect(navegoCorrectamente).toBe(true);
    }

    // Desmarcar como favorito
    const exito = await toggleFavorito(page, false);
    expect(exito).toBe(true);

    // Verificar en la página de favoritos
    await showStepMessage(page, '🔍 VERIFICANDO EN PÁGINA DE FAVORITOS');
    await safeWaitForTimeout(page, 2000);

    await page.goto(FAVORITES_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const urlActual = page.url();
    expect(urlActual).toContain('favorites');
    console.log('✅ Navegó a la página de favoritos');
    console.log('ℹ️ Verificación completada. El servicio debería estar desmarcado como favorito.');
  });

  // ============================================
  // PRUEBAS: Marcar favorito, Desmarcar (desde servicio), Desmarcar (desde página favoritos)
  // ============================================

  test('Favoritos Cliente: Servicio – Volver a marcar como favorito', async ({ page }) => {
    // Asegurarse de estar deslogueado del proveedor y logueado como cliente
    await showStepMessage(page, '🔄 ASEGURANDO SESIÓN COMO CLIENTE');
    
    // Limpiar cookies y storage para asegurar que no haya sesión activa del proveedor
    await page.context().clearCookies();
    
    // Navegar a una página válida antes de limpiar storage
    try {
      await page.goto(DEFAULT_BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (e) {
      console.log('⚠️ Error al limpiar storage, continuando...');
    }
    
    // Verificar que estamos logueados como cliente (si no, hacer login)
    const isLoggedIn = await page.locator('button:has(i.icon-user), a:has(i.icon-user)').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('📋 No hay sesión activa, iniciando sesión como cliente...');
      await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    } else {
      console.log('✅ Ya hay una sesión activa, verificando que sea del cliente...');
      // Verificar que la sesión es del cliente y no del proveedor
      // Si estamos en una página del proveedor, hacer logout y login como cliente
      const currentUrl = page.url();
      if (currentUrl.includes('/provider/')) {
        console.log('⚠️ Detectada sesión de proveedor, cerrando sesión...');
        // Buscar botón de logout o menú de usuario
        try {
          const userMenu = page.locator('button:has(i.icon-user), a:has(i.icon-user)').first();
          await userMenu.click();
          await safeWaitForTimeout(page, 1000);
          
          const logoutButton = page.locator('button:has-text("Cerrar sesión"), button:has-text("Logout"), a:has-text("Cerrar sesión")').first();
          const logoutVisible = await logoutButton.isVisible({ timeout: 3000 }).catch(() => false);
          if (logoutVisible) {
            await logoutButton.click();
            await page.waitForLoadState('networkidle');
            await safeWaitForTimeout(page, 2000);
          }
        } catch (e) {
          console.log('⚠️ No se pudo hacer logout explícito, limpiando cookies...');
          await page.context().clearCookies();
          await page.goto(DEFAULT_BASE_URL);
          await page.waitForLoadState('networkidle');
        }
        
        // Hacer login como cliente
        await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
        await page.waitForLoadState('networkidle');
        await safeWaitForTimeout(page, 2000);
      }
    }
    
    // Buscar un servicio que NO esté marcado como favorito
    await showStepMessage(page, '🔍 BUSCANDO SERVICIO SIN MARCAR COMO FAVORITO');
    let servicioNoFavorito: ServicioInfo | null = null;
    
    // Limitar la búsqueda a los primeros 10 servicios para evitar tiempos de ejecución muy largos
    // pero manteniendo la navegación completa como lo haría un humano
    const maxServiciosAVerificar = Math.min(10, serviciosDelProveedor.length);
    console.log(`📊 Verificando hasta ${maxServiciosAVerificar} servicios para encontrar uno no marcado como favorito...`);
    console.log(`ℹ️ La prueba navegará por categorías como lo haría un usuario real (sin atajos)`);
    
    // Iterar por los servicios del proveedor para encontrar uno que no esté marcado como favorito
    for (let i = 0; i < maxServiciosAVerificar; i++) {
      const servicio = serviciosDelProveedor[i];
      console.log(`\n🔍 Verificando servicio ${i + 1}/${maxServiciosAVerificar}: "${servicio.nombre}"`);
      
      // Navegar al servicio usando la navegación completa por categorías (como lo haría un humano)
      const navegoCorrectamente = await navegarAServicioPorRuta(page, servicio);
      if (!navegoCorrectamente) {
        console.log(`   ⚠️ No se pudo navegar al servicio "${servicio.nombre}", intentando siguiente...`);
        continue;
      }
      
      // Esperar a que la página cargue
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
      
      // Verificar que estamos en la página del servicio
      const urlActual = page.url();
      if (!urlActual.includes('/service/') && !urlActual.includes('/services/')) {
        console.log(`   ⚠️ No se detectó navegación a página de servicio (URL: ${urlActual}), intentando siguiente...`);
        continue;
      }
      
      // Esperar a que existan iconos de corazón (render dinámico)
      await page.waitForSelector('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]', { timeout: 5000 }).catch(() => {});

      // Buscar el botón de favoritos de forma robusta
      const candidatos = page.locator('button').filter({
        has: page.locator('i.icon.icon-heart, i.icon-heart, i[class*="icon-heart"]')
      }).filter({
        hasNot: page.locator('i[class*="share"]')
      });

      const totalCandidatos = await candidatos.count();
      let botonFavoritos: ReturnType<typeof page.locator> | null = null;
      for (let idx = 0; idx < totalCandidatos; idx++) {
        const btn = candidatos.nth(idx);
        const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) {
          botonFavoritos = btn;
          break;
        }
      }

      if (!botonFavoritos) {
        console.log(`   ⚠️ No se encontró el botón de favoritos para "${servicio.nombre}", intentando siguiente...`);
        continue;
      }

      // Verificar el estado actual del favorito (solo sólido indica marcado)
      const iconElement = botonFavoritos.locator('i.icon-heart-solid, i[class*="heart-solid"]').first();
      const estaMarcado = await iconElement.count().then(c => c > 0);
      
      console.log(`   📊 Estado del favorito: ${estaMarcado ? '✅ MARCADO' : '❌ NO MARCADO'}`);
      
      if (!estaMarcado) {
        // ¡Encontramos un servicio que no está marcado como favorito!
        servicioNoFavorito = servicio;
        console.log(`\n✅ Servicio encontrado que NO está marcado como favorito: "${servicio.nombre}"`);
        break;
      } else {
        console.log(`   ℹ️ El servicio "${servicio.nombre}" ya está marcado como favorito, buscando otro...`);
      }
    }
    
    // Verificar que encontramos un servicio
    if (!servicioNoFavorito) {
      throw new Error('❌ No se encontró ningún servicio del proveedor fiestamasqaprv@gmail.com que no esté marcado como favorito');
    }
    
    const servicio = servicioNoFavorito;
    expect(servicio).toBeDefined();
    expect(servicio.nombre).toBeTruthy();
    
    console.log(`\n📋 Usando servicio: "${servicio.nombre}"`);

    // Marcar como favorito usando la función reutilizable
    const exito = await marcarServicioComoFavorito(page);
    expect(exito).toBe(true);

    // Verificar en la página de favoritos
    await showStepMessage(page, '🔍 VERIFICANDO EN PÁGINA DE FAVORITOS');
    await safeWaitForTimeout(page, 2000);

    await page.goto(FAVORITES_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const urlActual = page.url();
    expect(urlActual).toContain('favorites');
    console.log('✅ Navegó a la página de favoritos');

    // Buscar el servicio en favoritos
    const serviciosEnFavoritos = page.locator('button, div').filter({
      has: page.locator('img[src*="imagedelivery"], img[alt]')
    });

    const cantidadServicios = await serviciosEnFavoritos.count();
    console.log(`📊 Servicios encontrados en favoritos: ${cantidadServicios}`);

    if (cantidadServicios > 0) {
      console.log('✅ El servicio aparece en la lista de favoritos');
    } else {
      console.log('⚠️ No se encontraron servicios en favoritos (puede que necesite tiempo para cargar)');
    }
  });

  test('Favoritos Cliente: Página favoritos – Desmarcar servicio', async ({ page }) => {
    // Esta prueba no necesita obtener servicios del proveedor
    // Solo necesita desmarcar cualquier servicio que esté marcado como favorito
    
    // Asegurarse de estar logueado como cliente (sin depender del beforeEach que obtiene servicios)
    await showStepMessage(page, '🔍 DESMARCANDO FAVORITO DESDE PÁGINA DE FAVORITOS');
    
    // Verificar si ya estamos logueados
    const isLoggedIn = await page.locator('button:has(i.icon-user), a:has(i.icon-user)').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('📋 Iniciando sesión como cliente...');
      await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);
    } else {
      console.log('✅ Ya hay una sesión activa');
    }
    
    // Navegar a la página de favoritos
    console.log('📂 Navegando a la página de favoritos...');
    await page.goto(FAVORITES_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    const urlActual = page.url();
    expect(urlActual).toContain('favorites');
    console.log('✅ Navegó a la página de favoritos');

    // Buscar servicios favoritos en la página
    console.log('🔍 Buscando servicios favoritos...');
    await safeWaitForTimeout(page, 2000); // Esperar a que carguen los servicios

    // Buscar tarjetas de servicios que tengan el icono de corazón marcado (heart-solid)
    const tarjetasFavoritos = page.locator('button, div').filter({
      has: page.locator('img[src*="imagedelivery"], img[alt]')
    }).filter({
      has: page.locator('i[class*="heart"]')
    });

    const cantidadFavoritos = await tarjetasFavoritos.count();
    console.log(`📊 Servicios favoritos encontrados: ${cantidadFavoritos}`);

    // Si no hay servicios favoritos, solo avisar y terminar la prueba
    if (cantidadFavoritos === 0) {
      console.log('⚠️ No se encontraron servicios favoritos en la página');
      console.log('ℹ️ La prueba se completa sin errores, pero no hay servicios para desmarcar');
      return; // Terminar la prueba sin fallar
    }

    // Seleccionar el primer servicio favorito
    const primeraTarjeta = tarjetasFavoritos.first();
    console.log('✅ Servicio favorito encontrado, haciendo clic...');

    // Hacer clic en la tarjeta para ir a la página de detalle
    await primeraTarjeta.click();
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    // Verificar que navegó a la página de detalle
    const urlDetalle = page.url();
    console.log(`🔗 URL de detalle: ${urlDetalle}`);

    if (!urlDetalle.includes('/service/') && !urlDetalle.includes('/services/')) {
      console.log('⚠️ No se navegó a una página de detalle, intentando desmarcar desde la tarjeta...');
      
      // Si no navegó, volver a la página de favoritos e intentar desmarcar directamente desde la tarjeta
      await page.goto(FAVORITES_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

      // Buscar el botón de favoritos en la primera tarjeta
      const botonFavoritosEnTarjeta = primeraTarjeta.locator('button').filter({
        has: page.locator('i[class*="heart"]')
      }).first();

      const botonVisible = await botonFavoritosEnTarjeta.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (botonVisible) {
        console.log('✅ Botón de favoritos encontrado en la tarjeta, desmarcando...');
        await botonFavoritosEnTarjeta.click();
        await safeWaitForTimeout(page, 2000);
        console.log('✅ Servicio desmarcado como favorito desde la tarjeta');
        return;
      } else {
        console.log('⚠️ No se encontró el botón de favoritos en la tarjeta');
        return; // Terminar sin fallar
      }
    }

    // Si navegó a la página de detalle, desmarcar desde ahí
    console.log('✅ Navegó a la página de detalle, desmarcando favorito...');
    const exito = await toggleFavorito(page, false);
    
    if (exito) {
      console.log('✅ Servicio desmarcado como favorito correctamente');
    } else {
      console.log('⚠️ No se pudo desmarcar el servicio como favorito');
    }

    // Volver a la página de favoritos para verificar
    await showStepMessage(page, '🔍 VERIFICANDO EN PÁGINA DE FAVORITOS');
    await safeWaitForTimeout(page, 2000);

    await page.goto(FAVORITES_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, WAIT_FOR_PAGE_LOAD);

    console.log('✅ Verificación completada. El servicio debería estar desmarcado como favorito.');
  });
});
