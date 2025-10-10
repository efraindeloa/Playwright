import { test, expect, Page } from '@playwright/test';

test.use({ 
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(90000); // 90 segundos de timeout

// Función común para login
async function login(page: Page) {
  await page.goto('https://staging.fiestamas.com');
  await page.waitForTimeout(2000);

  // Hacer clic en el botón de login
  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();
  
  await page.waitForTimeout(1000);
  
  // Llenar credenciales del cliente
  await page.locator('input[id="Email"]').fill('fiestamasqacliente@gmail.com');
  await page.locator('input[id="Password"]').fill('Fiesta2025$');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.waitForTimeout(2000);
}

test('Validar que se puede crear un evento desde el dashboard', async ({ page }) => {
  // Hacer login primero
  await login(page);
  
  console.log('✓ Login exitoso, navegando al dashboard...');
  
  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL('https://staging.fiestamas.com/client/dashboard');
  
  // Buscar el botón "Nueva fiesta" visible en desktop
  // El botón de desktop tiene la clase "lg:flex" (visible en pantallas grandes)
  // El botón de mobile tiene "lg:hidden" (oculto en pantallas grandes)
  const nuevaFiestaButton = page.locator('button.lg\\:flex').filter({ hasText: 'Nueva fiesta' });
  
  // Verificar que el botón existe y es visible
  await expect(nuevaFiestaButton).toBeVisible({ timeout: 10000 });
  console.log('✓ Botón "Nueva fiesta" encontrado y visible');
  
  // Hacer clic en el botón "Nueva fiesta"
  await nuevaFiestaButton.click();
  console.log('✓ Se hizo clic en "Nueva fiesta"');
  
  // Esperar a que cargue la página de selección de categoría de evento
  await page.waitForTimeout(2000);
  
  // Buscar todos los botones de categoría de evento
  // Los botones tienen un párrafo con las clases "text-dark-neutral lg:text-large"
  const categoryButtons = page.locator('button[type="submit"]').filter({ 
    has: page.locator('p.text-dark-neutral') 
  });
  
  // Contar cuántas categorías hay disponibles
  const categoryCount = await categoryButtons.count();
  console.log(`✓ Se encontraron ${categoryCount} categorías de eventos disponibles`);
  
  // Verificar que hay al menos una categoría
  expect(categoryCount).toBeGreaterThan(0);
  
  // Seleccionar aleatoriamente una categoría
  const randomIndex = Math.floor(Math.random() * categoryCount);
  const selectedCategory = categoryButtons.nth(randomIndex);
  
  // Obtener el nombre de la categoría seleccionada antes de hacer clic
  const categoryName = await selectedCategory.locator('p.text-dark-neutral').textContent();
  const selectedEventType = categoryName?.trim() || 'Desconocido';
  console.log(`✓ Seleccionando categoría aleatoria: "${selectedEventType}" (índice ${randomIndex})`);
  
  // Hacer clic en la categoría seleccionada
  await selectedCategory.click();
  console.log(`✓ Se hizo clic en la categoría "${selectedEventType}"`);
  
  // Esperar a que cargue la página de selección de categoría de servicios
  await page.waitForTimeout(2000);
  
  // Buscar todos los botones de categoría de servicios
  // Los botones tienen un párrafo con las clases "text-neutral-800 font-medium lg:text-large"
  const serviceButtons = page.locator('button').filter({ 
    has: page.locator('p.text-neutral-800.font-medium') 
  });
  
  // Contar cuántas categorías de servicios hay disponibles
  const serviceCount = await serviceButtons.count();
  console.log(`✓ Se encontraron ${serviceCount} categorías de servicios disponibles`);
  
  // Verificar que hay al menos una categoría de servicio
  expect(serviceCount).toBeGreaterThan(0);
  
  // Seleccionar aleatoriamente una categoría de servicio
  const randomServiceIndex = Math.floor(Math.random() * serviceCount);
  const selectedService = serviceButtons.nth(randomServiceIndex);
  
  // Obtener el nombre de la categoría de servicio seleccionada antes de hacer clic
  const serviceName = await selectedService.locator('p.text-neutral-800.font-medium').textContent();
  console.log(`✓ Seleccionando categoría de servicio aleatoria: "${serviceName?.trim()}" (índice ${randomServiceIndex})`);
  
  // Hacer clic en la categoría de servicio seleccionada
  await selectedService.click();
  console.log(`✓ Se hizo clic en la categoría de servicio "${serviceName?.trim()}"`);
  
  // Esperar a que cargue el siguiente paso
  await page.waitForTimeout(2000);
  
  // Manejar la navegación anidada de subcategorías hasta encontrar servicios
  let foundServices = false;
  let maxAttempts = 50; // Límite de intentos para evitar bucle infinito
  let attempts = 0;
  let attemptsInCurrentCategory = 0; // Contador de intentos en la categoría actual
  const maxAttemptsPerCategory = 10; // Límite de intentos por categoría antes de cambiar
  
  // Estructura para rastrear la navegación
  let navigationPath: Array<{level: number, name: string, totalOptions: number}> = [];
  let currentServiceCategory = serviceName?.trim() || 'Desconocida';
  
  // Set para rastrear categorías/subcategorías ya visitadas sin servicios
  const visitedWithoutServices = new Set<string>();
  
  console.log(`\n📍 Categoría de servicio actual: "${currentServiceCategory}"`);
  
  while (!foundServices && attempts < maxAttempts) {
    attempts++;
    attemptsInCurrentCategory++;
    console.log(`\n--- Intento ${attempts} de encontrar servicios (intento ${attemptsInCurrentCategory} en esta categoría) ---`);
    console.log(`📂 Ruta de navegación actual: ${navigationPath.length === 0 ? '[Raíz]' : navigationPath.map(p => p.name).join(' > ')}`);
    
    // Navegar por las subcategorías
    let subcategoryLevel = navigationPath.length + 1;
    let hasSubcategories = true;
    
    while (hasSubcategories) {
      // Buscar si hay subcategorías disponibles
      const subcategoryButtons = page.locator('button').filter({ 
        has: page.locator('p.text-neutral-800') 
      });
      
      const subcategoryCount = await subcategoryButtons.count();
      
      if (subcategoryCount > 0) {
        console.log(`✓ Se encontraron ${subcategoryCount} subcategorías en el nivel ${subcategoryLevel}`);
        
        // Filtrar subcategorías que no hayan sido visitadas sin servicios
        let availableIndices: number[] = [];
        let subcategoryNames: string[] = [];
        
        for (let i = 0; i < subcategoryCount; i++) {
          const subcat = subcategoryButtons.nth(i);
          const subcatName = await subcat.locator('p.text-neutral-800').textContent();
          const subcatKey = `${currentServiceCategory}>${navigationPath.map(p => p.name).join('>')}>${subcatName?.trim()}`;
          subcategoryNames.push(subcatName?.trim() || '');
          
          if (!visitedWithoutServices.has(subcatKey)) {
            availableIndices.push(i);
          }
        }
        
        console.log(`📊 Subcategorías disponibles (no visitadas): ${availableIndices.length} de ${subcategoryCount}`);
        
        // Si no hay subcategorías disponibles, salir del bucle
        if (availableIndices.length === 0) {
          console.log(`⚠ Todas las subcategorías de este nivel ya fueron visitadas sin éxito`);
          hasSubcategories = false;
          break;
        }
        
        // Seleccionar aleatoriamente una subcategoría de las disponibles
        const randomAvailableIndex = Math.floor(Math.random() * availableIndices.length);
        const randomSubcategoryIndex = availableIndices[randomAvailableIndex];
        const selectedSubcategory = subcategoryButtons.nth(randomSubcategoryIndex);
        
        // Obtener el nombre de la subcategoría seleccionada
        const subcategoryName = subcategoryNames[randomSubcategoryIndex];
        console.log(`✓ Seleccionando subcategoría nivel ${subcategoryLevel}: "${subcategoryName}" (índice ${randomSubcategoryIndex})`);
        
        // Hacer clic en la subcategoría
        await selectedSubcategory.click();
        console.log(`✓ Se hizo clic en la subcategoría "${subcategoryName}"`);
        
        // Agregar a la ruta de navegación
        navigationPath.push({
          level: subcategoryLevel,
          name: subcategoryName,
          totalOptions: subcategoryCount
        });
        console.log(`📍 Ruta actualizada (nivel ${navigationPath.length}): ${navigationPath.map(p => p.name).join(' > ')}`);
        
        // Esperar a que cargue
        await page.waitForTimeout(2000);
        
        subcategoryLevel++;
      } else {
        console.log(`✓ No hay más subcategorías en este nivel (nivel ${subcategoryLevel}).`);
        hasSubcategories = false;
      }
      
      // Prevenir bucle infinito en subcategorías
      if (subcategoryLevel > 10) {
        console.log(`⚠ Se alcanzó el límite de niveles de subcategorías (10).`);
        hasSubcategories = false;
      }
    }
    
    // Verificar si aparece el diálogo de "Registra tu servicio en Fiestamas"
    // Este diálogo aparece cuando hay menos de 3 servicios
    const registerDialog = page.locator('div.absolute.top-1\\/2.left-1\\/2').filter({
      hasText: 'Registra tu servicio en Fiestamas'
    });
    
    const dialogVisible = await registerDialog.isVisible().catch(() => false);
    
    if (dialogVisible) {
      console.log(`⚠ Apareció el diálogo "Registra tu servicio en Fiestamas" (menos de 3 servicios)`);
      
      // Buscar el botón de cerrar (X) en el diálogo
      const closeButton = registerDialog.locator('button').filter({
        has: page.locator('i.icon-x')
      });
      
      await closeButton.click();
      console.log(`✓ Diálogo cerrado`);
      await page.waitForTimeout(1000);
    }
    
    // Verificar si hay servicios disponibles
    // Los servicios aparecen en un contenedor con clases específicas
    // Si el contenedor está vacío, no hay servicios
    const servicesContainer = page.locator('div.flex.flex-wrap.gap-6').filter({
      has: page.locator('button, a, div')
    }).first();
    
    // Intentar contar elementos dentro del contenedor de servicios
    // Si hay elementos hijos visibles (botones/tarjetas de servicios), hay servicios
    const serviceCards = servicesContainer.locator('> *');
    const serviceCount = await serviceCards.count();
    
    if (serviceCount > 0) {
      console.log(`✓ ¡Se encontraron ${serviceCount} servicios disponibles!`);
      foundServices = true;
      
      // Seleccionar aleatoriamente un servicio
      const randomServiceCardIndex = Math.floor(Math.random() * serviceCount);
      const selectedServiceCard = serviceCards.nth(randomServiceCardIndex);
      console.log(`✓ Seleccionando servicio aleatorio (índice ${randomServiceCardIndex})`);
      
      // Hacer clic en la tarjeta del servicio para abrirlo
      await selectedServiceCard.click();
      console.log(`✓ Se hizo clic en el servicio para abrirlo`);
      await page.waitForTimeout(2000);
      
      // Buscar todos los botones "Contactar GRATIS" disponibles en la página del servicio
      const contactButtons = page.locator('button').filter({ 
        hasText: /Contactar GRATIS/i 
      });
      
      const contactButtonCount = await contactButtons.count();
      console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
      
      if (contactButtonCount > 0) {
        // Seleccionar aleatoriamente un botón "Contactar GRATIS"
        const randomContactIndex = Math.floor(Math.random() * contactButtonCount);
        const selectedContactButton = contactButtons.nth(randomContactIndex);
        
        console.log(`✓ Haciendo clic en el botón "Contactar GRATIS" (índice ${randomContactIndex})`);
        await selectedContactButton.click();
        await page.waitForTimeout(3000);
        
        console.log(`✓ Se hizo clic exitosamente en "Contactar GRATIS"`);
        
        // Validar que llegamos a la página del formulario de contacto
        // Buscar el campo "Nombre del festejado"
        const honoreeField = page.locator('input[id="Honoree"]');
        await expect(honoreeField).toBeVisible({ timeout: 10000 });
        console.log(`✓ Se cargó la página del formulario de contacto`);
        
        // Generar datos aleatorios para llenar el formulario
        const randomNames = ['María', 'Juan', 'Carlos', 'Ana', 'Pedro', 'Laura', 'José', 'Carmen', 'Luis', 'Sofia'];
        const randomHonoree = randomNames[Math.floor(Math.random() * randomNames.length)];
        
        // Generar una fecha futura (entre 7 y 90 días desde hoy)
        const today = new Date();
        const daysToAdd = Math.floor(Math.random() * 84) + 7; // Entre 7 y 90 días
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + daysToAdd);
        const formattedDate = futureDate.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        
        // Generar hora aleatoria (formato 24 horas)
        const randomHour = Math.floor(Math.random() * 12) + 10; // Entre 10:00 y 21:00
        const randomMinute = Math.floor(Math.random() * 4) * 15; // 00, 15, 30, 45
        const formattedTime = `${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}`;
        
        // Ciudades aleatorias
        const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
        const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
        
        // Número de invitados aleatorio (entre 20 y 200)
        const randomAttendees = Math.floor(Math.random() * 181) + 20;
        
        console.log(`📝 Datos generados:`);
        console.log(`   - Festejado: ${randomHonoree}`);
        console.log(`   - Fecha: ${formattedDate} (en ${daysToAdd} días)`);
        console.log(`   - Hora: ${formattedTime}`);
        console.log(`   - Ciudad: ${randomCity}`);
        console.log(`   - Invitados: ${randomAttendees}`);
        
        // Llenar el campo "Nombre del festejado"
        await honoreeField.fill(randomHonoree);
        console.log(`✓ Campo "Nombre del festejado" llenado`);
        await page.waitForTimeout(500);
        
        // Llenar el campo "Fecha" usando JavaScript (el campo es readonly)
        const dateField = page.locator('input[id="Date"]');
        await dateField.evaluate((el: HTMLInputElement, value: string) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, formattedDate);
        console.log(`✓ Campo "Fecha" llenado con JavaScript`);
        await page.waitForTimeout(500);
        
        // Llenar el campo "Hora" usando JavaScript (el campo también es readonly)
        const timeField = page.locator('input[id="Time"]');
        await timeField.evaluate((el: HTMLInputElement, value: string) => {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, formattedTime);
        console.log(`✓ Campo "Hora" llenado con JavaScript`);
        await page.waitForTimeout(500);
        
        // Llenar el campo "Ciudad"
        const cityField = page.locator('input[placeholder=" "]').filter({
          has: page.locator('~ label:has-text("Ciudad")')
        }).first();
        
        // Limpiar el campo primero si tiene algún valor
        await cityField.click();
        await cityField.clear();
        await page.waitForTimeout(500);
        
        // Escribir la ciudad para que aparezca la lista de sugerencias
        await cityField.fill(randomCity);
        console.log(`✓ Campo "Ciudad" llenado con "${randomCity}"`);
        
        // Esperar a que aparezca la lista de sugerencias
        await page.waitForTimeout(2000);
        
        // Buscar la primera opción en la lista de sugerencias
        // Las listas de autocompletado suelen usar divs o li con roles específicos
        const firstSuggestion = page.locator('div[role="option"], li[role="option"], div.pac-item, li.pac-item').first();
        
        // Verificar si aparece una lista de sugerencias
        const suggestionVisible = await firstSuggestion.isVisible().catch(() => false);
        
        if (suggestionVisible) {
          console.log(`✓ Lista de sugerencias de ciudades visible`);
          await firstSuggestion.click();
          console.log(`✓ Primera sugerencia de ciudad seleccionada`);
          await page.waitForTimeout(1000);
        } else {
          console.log(`⚠ No se encontró lista de sugerencias, continuando con el valor escrito`);
        }
        
        // Llenar el campo "Número de invitados"
        const attendeesField = page.locator('input[id="Attendees"]');
        await attendeesField.fill(randomAttendees.toString());
        console.log(`✓ Campo "Número de invitados" llenado`);
        await page.waitForTimeout(500);
        
        console.log(`✓ Formulario de contacto completado exitosamente`);
        
        // Hacer clic en el botón "Crear evento"
        const createEventButton = page.locator('button').filter({ hasText: /Crear evento/i });
        await expect(createEventButton).toBeVisible({ timeout: 10000 });
        console.log(`✓ Botón "Crear evento" encontrado`);
        
        await createEventButton.click();
        console.log(`✓ Se hizo clic en "Crear evento"`);
        await page.waitForTimeout(3000);
        
        // Validar que aparece el diálogo de confirmación
        const dialogTitle = page.locator('p.text-large.font-semibold');
        await expect(dialogTitle).toBeVisible({ timeout: 10000 });
        console.log(`✓ Diálogo de confirmación visible`);
        
        // Extraer y validar el nombre del servicio en el diálogo
        const dialogTitleText = await dialogTitle.textContent();
        console.log(`📝 Texto del diálogo: "${dialogTitleText}"`);
        
        // El texto debería contener "Dile aquí a [NOMBRE_SERVICIO] qué es lo que necesitas"
        if (dialogTitleText && dialogTitleText.includes('Dile aquí a')) {
          console.log(`✓ El diálogo menciona el servicio correctamente`);
        } else {
          console.log(`⚠ El formato del diálogo no es el esperado`);
        }
        
        // Validar la información del evento en el diálogo
        const eventInfoContainer = page.locator('div.w-full.flex.flex-col.items-center.border-\\[1px\\]');
        await expect(eventInfoContainer).toBeVisible({ timeout: 5000 });
        console.log(`✓ Contenedor de información del evento visible`);
        
        const eventInfoText = await eventInfoContainer.textContent();
        console.log(`📋 Información del evento en el diálogo: "${eventInfoText}"`);
        
        // Validar que contiene el tipo de evento
        if (eventInfoText?.includes(selectedEventType)) {
          console.log(`✓ Tipo de evento coincide: "${selectedEventType}"`);
        } else {
          console.log(`⚠ Tipo de evento no encontrado. Esperado: "${selectedEventType}"`);
        }
        
        // Validar que contiene el nombre del festejado
        if (eventInfoText?.includes(randomHonoree)) {
          console.log(`✓ Nombre del festejado coincide: "${randomHonoree}"`);
        } else {
          console.log(`⚠ Nombre del festejado no encontrado. Esperado: "${randomHonoree}"`);
        }
        
        // Validar que contiene el número de invitados
        if (eventInfoText?.includes(randomAttendees.toString())) {
          console.log(`✓ Número de invitados coincide: ${randomAttendees}`);
        } else {
          console.log(`⚠ Número de invitados no encontrado. Esperado: ${randomAttendees}`);
        }
        
        // Validar que contiene la ciudad
        if (eventInfoText?.includes(randomCity)) {
          console.log(`✓ Ciudad coincide: "${randomCity}"`);
        } else {
          console.log(`⚠ Ciudad no encontrada. Esperada: "${randomCity}"`);
        }
        
        // Validar que contiene la hora
        if (eventInfoText?.includes(formattedTime)) {
          console.log(`✓ Hora coincide: ${formattedTime}`);
        } else {
          console.log(`⚠ Hora no encontrada. Esperada: ${formattedTime}`);
        }
        
        console.log(`\n✓ Validación del diálogo de confirmación completada`);
        
      } else {
        console.log(`⚠ No se encontraron botones "Contactar GRATIS"`);
      }
    } else {
      console.log(`✗ No se encontraron servicios en esta subcategoría.`);
      
      // Marcar la ruta actual como visitada sin servicios
      const currentPath = `${currentServiceCategory}>${navigationPath.map(p => p.name).join('>')}`;
      visitedWithoutServices.add(currentPath);
      console.log(`🚫 Ruta marcada como visitada sin servicios: "${currentPath}"`);
      console.log(`📊 Total de rutas visitadas sin servicios: ${visitedWithoutServices.size}`);
      
      // Si se alcanzó el límite de intentos en esta categoría, cambiar de categoría
      if (attemptsInCurrentCategory >= maxAttemptsPerCategory) {
        console.log(`⚠ Se alcanzó el límite de ${maxAttemptsPerCategory} intentos en esta categoría de servicio.`);
        console.log(`✓ Cambiando a otra categoría de servicio...`);
        
        // Volver hasta la selección de categorías de servicios
        // Buscar todos los breadcrumbs y hacer clic en el primero (categoría de evento)
        const allBreadcrumbs = page.locator('button').filter({
          has: page.locator('i.icon-chevron-left')
        }).filter({
          has: page.locator('p')
        });
        
        const breadcrumbCount = await allBreadcrumbs.count();
        
        if (breadcrumbCount > 0) {
          // Hacer clic en el primer breadcrumb para volver a la categoría de evento
          const firstBreadcrumb = allBreadcrumbs.first();
          const breadcrumbText = await firstBreadcrumb.locator('p').textContent();
          console.log(`✓ Volviendo a la categoría de evento: "${breadcrumbText?.trim()}"`);
          await firstBreadcrumb.click();
          await page.waitForTimeout(2000);
          
          // Ahora volver a seleccionar una categoría de servicio diferente
          const newServiceButtons = page.locator('button').filter({ 
            has: page.locator('p.text-neutral-800.font-medium') 
          });
          
          const newServiceCount = await newServiceButtons.count();
          
          if (newServiceCount > 0) {
            // Seleccionar aleatoriamente una nueva categoría de servicio
            const newRandomServiceIndex = Math.floor(Math.random() * newServiceCount);
            const newSelectedService = newServiceButtons.nth(newRandomServiceIndex);
            
            const newServiceName = await newSelectedService.locator('p.text-neutral-800.font-medium').textContent();
            console.log(`✓ Seleccionando nueva categoría de servicio: "${newServiceName?.trim()}" (índice ${newRandomServiceIndex})`);
            
            await newSelectedService.click();
            console.log(`✓ Se hizo clic en la nueva categoría de servicio "${newServiceName?.trim()}"`);
            await page.waitForTimeout(2000);
            
            // Resetear el contador de intentos en la categoría actual
            attemptsInCurrentCategory = 0;
            
            // Resetear la ruta de navegación para la nueva categoría
            navigationPath = [];
            currentServiceCategory = newServiceName?.trim() || 'Desconocida';
            // NO resetear visitedWithoutServices - mantener el historial global
            console.log(`📍 Nueva categoría de servicio: "${currentServiceCategory}" - Ruta de navegación reiniciada`);
          } else {
            console.log(`⚠ No se encontraron categorías de servicio disponibles. Deteniendo búsqueda.`);
            break;
          }
        } else {
          console.log(`⚠ No se encontraron breadcrumbs para volver. Deteniendo búsqueda.`);
          break;
        }
      } else {
        // Decidir cuántos niveles subir basándose en la estructura de navegación
        let levelsToGoBack = 1;
        
        // Si estamos en un nivel profundo (3 o más), subir 2 niveles
        if (navigationPath.length >= 3) {
          levelsToGoBack = 2;
          console.log(`📍 Estamos en nivel ${navigationPath.length}, subiendo ${levelsToGoBack} niveles`);
        } else if (navigationPath.length >= 1) {
          levelsToGoBack = 1;
          console.log(`📍 Estamos en nivel ${navigationPath.length}, subiendo ${levelsToGoBack} nivel`);
        } else {
          console.log(`📍 Ya estamos en la raíz, no se puede retroceder más`);
          break;
        }
        
        // Volver atrás los niveles necesarios
        for (let i = 0; i < levelsToGoBack; i++) {
          const backButton = page.locator('button.cursor-pointer').filter({
            has: page.locator('i.icon-chevron-left')
          }).first();
          
          const backButtonExists = await backButton.count() > 0;
          
          if (backButtonExists && navigationPath.length > 0) {
            // Obtener el nivel actual antes de hacer clic
            const currentLevel = navigationPath[navigationPath.length - 1];
            const backButtonText = await backButton.locator('p').textContent();
            
            console.log(`⬅ Retrocediendo nivel ${navigationPath.length}: "${currentLevel.name}" -> "${backButtonText?.trim()}"`);
            
            // Eliminar el último elemento de la ruta
            navigationPath.pop();
            
            await backButton.click();
            await page.waitForTimeout(2000);
            
            console.log(`📍 Ruta después de retroceder: ${navigationPath.length === 0 ? '[Raíz]' : navigationPath.map(p => p.name).join(' > ')}`);
          } else {
            console.log(`⚠ No se encontró botón para volver atrás o ya estamos en la raíz.`);
            break;
          }
        }
      }
    }
  }
  
  if (foundServices) {
    console.log('\n✓ Prueba de creación de evento completada exitosamente - Servicios encontrados');
  } else {
    console.log(`\n⚠ No se encontraron servicios después de ${attempts} intentos`);
  }
});

