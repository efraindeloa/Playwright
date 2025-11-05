import { test, expect, Page } from '@playwright/test';
import { login } from './utils';

test.use({
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout (aumentado para dar más tiempo a la carga de servicios)
test.setTimeout(180000); // 3 minutos

test('Nueva fiesta', async ({ page }) => {
  // Navegar a la página de login
  await page.goto('https://staging.fiestamas.com/login');
  
  // Esperar un momento para que cargue la página
  await page.waitForTimeout(2000);
  
  // Hacer login con las credenciales del cliente
  await login(page, 'fiestamasqacliente@gmail.com', 'Fiesta2025$');
  console.log('✓ Login exitoso como cliente');
  
  // Esperar a que se cargue el dashboard después del login
  await page.waitForTimeout(3000);
  
  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL('https://staging.fiestamas.com/client/dashboard', { timeout: 10000 });
  console.log('✓ Navegación al dashboard confirmada');
  
  // Buscar y seleccionar el botón "Nueva fiesta"
  // El botón tiene la clase "hidden lg:flex" (visible en pantallas grandes)
  const nuevaFiestaButton = page.locator('button[type="button"].hidden.lg\\:flex').filter({
    hasText: 'Nueva fiesta'
  });
  
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
  const selectedServiceCategory = serviceName?.trim() || 'Desconocida';
  console.log(`✓ Seleccionando categoría de servicio aleatoria: "${selectedServiceCategory}" (índice ${randomServiceIndex})`);
  
  // Hacer clic en la categoría de servicio seleccionada
  await selectedService.click();
  console.log(`✓ Se hizo clic en la categoría de servicio "${selectedServiceCategory}"`);
  
  // Esperar a que cargue el siguiente paso
  await page.waitForTimeout(2000);
  
  // Estructura para rastrear la navegación por niveles
  // Cada elemento representa un nivel navegado: { level: número, name: nombre }
  let navigationPath: Array<{ level: number, name: string }> = [];
  
  // Set para rastrear subcategorías visitadas (se usará en el bucle de búsqueda de servicios)
  const visitedSubcategories = new Set<string>();
  
  // Nivel inicial: 0 = categoría de servicio, 1 = subcategoría, 2 = sub-subcategoría, etc.
  let currentLevel = 0;
  
  console.log(`📍 Nivel actual de navegación: ${currentLevel} (Categoría: ${selectedServiceCategory})`);
  
  // Verificar si la categoría seleccionada es "Mobiliario e invitaciones"
  // Esta categoría no tiene subcategorías, así que saltamos la selección de subcategoría
  if (selectedServiceCategory.toLowerCase().includes('mobiliario') && 
      selectedServiceCategory.toLowerCase().includes('invitaciones')) {
    console.log('ℹ Categoría "Mobiliario e invitaciones" seleccionada - no tiene subcategorías, continuando...');
  } else {
    // Buscar subcategorías disponibles
    const subcategoryButtons = page.locator('button').filter({
      has: page.locator('p.text-neutral-800')
    });
    
    const subcategoryCount = await subcategoryButtons.count();
    
    if (subcategoryCount > 0) {
      // Navegar recursivamente por subcategorías hasta llegar a una página de servicios
      let reachedServicesPage = false;
      const maxNavigationDepth = 10; // Límite de profundidad para evitar bucles infinitos
      let navigationDepth = 0;
      
      while (!reachedServicesPage && navigationDepth < maxNavigationDepth) {
        navigationDepth++;
        
        // Verificar si ya estamos en una página de servicios
        // Buscar el texto "Servicios" en el top de la página
        const serviciosTitle = page.locator('p.text-center').filter({
          hasText: 'Servicios'
        });
        
        const isServicesPage = await serviciosTitle.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isServicesPage) {
          console.log('✓ Se detectó la página de servicios (texto "Servicios" en el top)');
          reachedServicesPage = true;
          break;
        }
        
        // Buscar subcategorías disponibles en el nivel actual
        const currentLevelButtons = page.locator('button').filter({
          has: page.locator('p.text-neutral-800')
        });
        
        const currentLevelCount = await currentLevelButtons.count();
        
        if (currentLevelCount > 0) {
          console.log(`✓ Se encontraron ${currentLevelCount} opciones en el nivel ${navigationDepth}`);
          
          // Seleccionar aleatoriamente una subcategoría
          const randomIndex = Math.floor(Math.random() * currentLevelCount);
          const selectedButton = currentLevelButtons.nth(randomIndex);
          
          // Obtener el nombre de la subcategoría seleccionada
          const buttonName = await selectedButton.locator('p.text-neutral-800').textContent();
          const selectedName = buttonName?.trim() || 'Desconocida';
          
          console.log(`✓ Seleccionando opción nivel ${navigationDepth}: "${selectedName}" (índice ${randomIndex})`);
          
          // Agregar al Set de subcategorías visitadas
          visitedSubcategories.add(selectedName);
          
          // Actualizar el registro de navegación
          currentLevel = navigationDepth;
          navigationPath.push({ level: currentLevel, name: selectedName });
          console.log(`📍 Nivel actualizado: ${currentLevel} - Ruta: ${navigationPath.map(p => p.name).join(' > ')}`);
          
          // Hacer clic en la subcategoría seleccionada
          await selectedButton.click();
          console.log(`✓ Se hizo clic en "${selectedName}"`);
          
          // Esperar más tiempo para que cargue la página
          await page.waitForTimeout(4000);
          
        } else {
          console.log(`ℹ No se encontraron más opciones en el nivel ${navigationDepth}`);
          break; // No hay más opciones, asumir que estamos en una página de servicios
        }
      }
      
      if (navigationDepth >= maxNavigationDepth) {
        console.log('⚠ Se alcanzó el límite de profundidad de navegación, continuando...');
      }
    } else {
      console.log('ℹ No se encontraron subcategorías disponibles para esta categoría');
    }
  }
  
  // Buscar servicios disponibles - retroceder y seleccionar otra subcategoría si no hay servicios
  let foundServices = false;
  let maxAttempts = 10; // Límite de intentos para evitar bucle infinito
  let attempts = 0;
  
  while (!foundServices && attempts < maxAttempts) {
    attempts++;
    console.log(`\n--- Intento ${attempts} de encontrar servicios ---`);
    console.log(`📍 Nivel actual: ${currentLevel} - Ruta: ${navigationPath.length === 0 ? '[Raíz]' : navigationPath.map(p => p.name).join(' > ')}`);
    
    // Esperar un tiempo adicional para que carguen los servicios
    await page.waitForTimeout(3000);
    
    // Verificar si hay servicios disponibles
    const servicesContainer = page.locator('div.flex.flex-wrap.gap-6').filter({
      has: page.locator('button, a, div')
    }).first();
    
    // Esperar a que el contenedor esté visible con un timeout más largo
    try {
      await servicesContainer.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
        console.log('ℹ Contenedor de servicios no visible aún, continuando...');
      });
    } catch (e) {
      console.log('ℹ Error esperando contenedor de servicios, continuando...');
    }
    
    // Intentar contar elementos dentro del contenedor de servicios
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
      console.log(`✓ Se hizo clic en el servicio`);
      // Esperar más tiempo para que cargue la página del servicio
      await page.waitForTimeout(4000);
      
      // Buscar y hacer clic en el botón "Contactar GRATIS"
      const contactButtons = page.locator('button').filter({
        hasText: /Contactar GRATIS/i
      });
      
      const contactButtonCount = await contactButtons.count();
      console.log(`✓ Se encontraron ${contactButtonCount} botones "Contactar GRATIS"`);
      
      if (contactButtonCount > 0) {
        // Seleccionar aleatoriamente un botón "Contactar GRATIS" si hay varios
        const randomContactIndex = Math.floor(Math.random() * contactButtonCount);
        const selectedContactButton = contactButtons.nth(randomContactIndex);
        
        console.log(`✓ Haciendo clic en el botón "Contactar GRATIS" (índice ${randomContactIndex})`);
        await selectedContactButton.click();
        console.log(`✓ Se hizo clic exitosamente en "Contactar GRATIS"`);
        
        // Esperar a que aparezca el formulario en lugar de espera fija
        await page.locator('input[id="Honoree"]').waitFor({ state: 'visible', timeout: 5000 });
        
        // --- Función auxiliar para seleccionar hora y minuto en el reloj ---
        async function seleccionarHoraYMinuto(page: Page, hora: number, minuto: number) {
          // 1. Abrir el selector de hora
          const timeInput = page.locator('input#Time');
          await timeInput.scrollIntoViewIfNeeded();
          await timeInput.click({ force: true });
          
          // 2. Esperar a que aparezca el diálogo
          await page.waitForSelector('[data-time-picker-content="true"]', { state: 'visible', timeout: 10000 });
          
          // 3. Seleccionar la hora
          const horaCirculos: { [key: number]: { cx: string; cy: string } } = {
            1: { cx: "130.0", cy: "40.0" },
            2: { cx: "193.6121593216773", cy: "77.5" },
            3: { cx: "205", cy: "126" },
            4: { cx: "193", cy: "174" },
            5: { cx: "130", cy: "212" },
            6: { cx: "70", cy: "212" },
            7: { cx: "10", cy: "174" },
            8: { cx: "0", cy: "126" },
            9: { cx: "10", cy: "77" },
            10: { cx: "70", cy: "40" },
            11: { cx: "100", cy: "0" },
            12: { cx: "130", cy: "0" },
          };
          
          const h = horaCirculos[hora];
          if (!h) throw new Error(`Hora ${hora} no está mapeada en el reloj`);
          
          const horaCircle = page.locator(`circle.cursor-pointer[cx="${h.cx}"][cy="${h.cy}"]`);
          // Esperar a que el círculo de hora esté visible y clickeable
          await horaCircle.waitFor({ state: 'visible', timeout: 5000 });
          await horaCircle.click();
          
          // Esperar un momento para que el reloj cambie a modo de minutos
          await page.waitForTimeout(300);
          
          // 4. Seleccionar el minuto
          const minutoCirculos: { [key: number]: { cx: string; cy: string } } = {
            0: { cx: "120", cy: "205" },
            15: { cx: "205", cy: "120" },
            30: { cx: "120", cy: "35" },
            45: { cx: "35", cy: "120" },
          };
          
          const m = minutoCirculos[minuto];
          if (!m) throw new Error(`Minuto ${minuto} no está mapeado`);
          
          const minutoCircle = page.locator(`circle.cursor-pointer[cx="${m.cx}"][cy="${m.cy}"]`);
          // Esperar a que el círculo de minuto esté visible y clickeable
          await minutoCircle.waitFor({ state: 'visible', timeout: 5000 });
          await minutoCircle.click();
          
          // Esperar un momento antes de confirmar
          await page.waitForTimeout(300);
          
          // 5. Confirmar selección
          const confirmButton = page.getByRole('button', { name: 'Confirmar' });
          await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
          await confirmButton.click();
        }
        
        // Llenar todos los campos del formulario
        console.log('\n📝 Llenando formulario de contacto...');
        
        // 1. Nombre del festejado
        const randomNames = ['María', 'Juan', 'Carlos', 'Ana', 'Pedro', 'Laura', 'José', 'Carmen', 'Luis', 'Sofia'];
        const randomLastNames = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randomLastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
        const randomHonoree = `${randomName} ${randomLastName}`;
        
        const honoreeField = page.locator('input[id="Honoree"]');
        await honoreeField.fill(randomHonoree);
        console.log(`✓ Campo "Nombre del festejado" llenado: ${randomHonoree}`);
        
        // 2. Fecha (usando date picker)
        const dateField = page.locator('input[id="Date"]');
        await dateField.click();
        console.log(`✓ Abriendo date picker para seleccionar fecha futura`);
        
        // Esperar a que aparezca el date picker con timeout más corto
        const datePicker = page.locator('.flatpickr-calendar:visible, .flatpickr-calendar.open').first();
        await datePicker.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        
        const datePickerVisible = await datePicker.isVisible().catch(() => false);
        
        if (datePickerVisible) {
          console.log(`✓ Date picker visible, buscando días futuros...`);
          
          const availableDays = page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
          const daysCount = await availableDays.count();
          const currentDay = new Date().getDate();
          
          console.log(`📊 Días disponibles: ${daysCount}, día actual: ${currentDay}`);
          
          let futureDayIndex = -1;
          for (let i = 0; i < daysCount; i++) {
            const dayElement = availableDays.nth(i);
            const dayText = await dayElement.textContent();
            const dayNumber = parseInt(dayText?.trim() || '0');
            
            if (dayNumber > currentDay) {
              futureDayIndex = i;
              break;
            }
          }
          
          if (futureDayIndex === -1) {
            futureDayIndex = daysCount - 1;
            console.log(`⚠ No hay días futuros en este mes, usando último día disponible`);
          }
          
          const selectedDay = availableDays.nth(futureDayIndex);
          await selectedDay.click();
          const dayText = await selectedDay.textContent();
          const selectedDayNumber = parseInt(dayText?.trim() || '0');
          console.log(`✓ Fecha seleccionada: día ${selectedDayNumber}`);
        }
        
        // 3. Hora (usando selector de hora)
        const randomHour = Math.floor(Math.random() * 12) + 1; // Entre 1 y 12
        const randomMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)]; // 0, 15, 30 o 45
        
        await seleccionarHoraYMinuto(page, randomHour, randomMinute);
        console.log(`✓ Hora seleccionada: ${randomHour}:${randomMinute.toString().padStart(2, '0')}`);
        
        // 4. Ciudad (usando autocompletado) - optimizado
        const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
        const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];
        
        const cityField = page.locator('input[id="Address"]');
        await cityField.click();
        await cityField.clear();
        
        // Usar fill en lugar de pressSequentially para mayor velocidad
        await cityField.fill(randomCity);
        console.log(`✓ Ciudad escrita: "${randomCity}"`);
        
        // Esperar a que aparezcan las sugerencias con timeout más corto
        const citySuggestionsList = page.locator('ul li');
        try {
          await citySuggestionsList.first().waitFor({ state: 'visible', timeout: 2000 });
          const suggestionCount = await citySuggestionsList.count();
          console.log(`📊 Sugerencias de ciudad encontradas: ${suggestionCount}`);
          
          if (suggestionCount > 0) {
            const firstSuggestion = citySuggestionsList.first();
            await firstSuggestion.click();
            const firstText = await firstSuggestion.textContent();
            console.log(`✓ Seleccionando ciudad: "${firstText?.trim()}"`);
          }
        } catch (e) {
          console.log(`ℹ No se encontraron sugerencias de ciudad, continuando...`);
        }
        
        // 5. Número de invitados
        const randomAttendees = Math.floor(Math.random() * 181) + 20; // Entre 20 y 200
        const attendeesField = page.locator('input[id="Attendees"]');
        await attendeesField.fill(randomAttendees.toString());
        console.log(`✓ Campo "Número de invitados" llenado: ${randomAttendees}`);
        
        console.log('✅ Formulario completado exitosamente');
      } else {
        console.log(`⚠ No se encontraron botones "Contactar GRATIS"`);
      }
      
      break; // Salir del bucle si encontramos servicios
    } else {
      console.log(`⚠ No se encontraron servicios en esta subcategoría (intento ${attempts}/${maxAttempts})`);
      
      // Si no hay servicios, retroceder un nivel usando el botón chevron-left-bold
      // El botón tiene las clases: flex items-center justify-center w-[24px] aspect-square text-neutral-800
      const backButton = page.locator('button.flex.items-center.justify-center').filter({
        has: page.locator('i.icon-chevron-left-bold')
      }).first();
      
      const backButtonVisible = await backButton.isVisible().catch(() => false);
      
      if (backButtonVisible) {
        // Verificar cuántos niveles podemos retroceder
        const levelsToGoBack = navigationPath.length;
        
        if (levelsToGoBack === 0) {
          console.log('⚠ Ya estamos en el nivel raíz, no se puede retroceder más');
          break;
        }
        
        console.log(`⬅ Retrocediendo un nivel (de ${currentLevel} a ${currentLevel - 1}) para seleccionar otra subcategoría...`);
        console.log(`📍 Niveles disponibles para retroceder: ${levelsToGoBack}`);
        
        // Retroceder: remover el último elemento del path y decrementar nivel
        const lastLevel = navigationPath.pop();
        currentLevel = Math.max(0, currentLevel - 1);
        
        console.log(`📍 Retrocedido desde "${lastLevel?.name}" - Nivel actual: ${currentLevel}`);
        console.log(`📍 Ruta actualizada: ${navigationPath.length === 0 ? '[Raíz]' : navigationPath.map(p => p.name).join(' > ')}`);
        
        await backButton.click();
        // Esperar más tiempo después de retroceder para que cargue la página
        await page.waitForTimeout(4000);
        
        // Determinar qué nivel de subcategorías buscar basado en el nivel actual
        const subcategoryButtons = page.locator('button').filter({
          has: page.locator('p.text-neutral-800')
        });
        
        const subcategoryCount = await subcategoryButtons.count();
        
        if (subcategoryCount > 0) {
          // Obtener nombres de todas las subcategorías para evitar seleccionar las ya visitadas
          let availableIndices: number[] = [];
          
          for (let i = 0; i < subcategoryCount; i++) {
            const subcat = subcategoryButtons.nth(i);
            const subcatName = await subcat.locator('p.text-neutral-800').textContent();
            const subcatKey = subcatName?.trim() || '';
            
            if (!visitedSubcategories.has(subcatKey)) {
              availableIndices.push(i);
            }
          }
          
          if (availableIndices.length > 0) {
            // Seleccionar aleatoriamente una subcategoría no visitada
            const randomAvailableIndex = Math.floor(Math.random() * availableIndices.length);
            const randomSubcategoryIndex = availableIndices[randomAvailableIndex];
            const selectedSubcategory = subcategoryButtons.nth(randomSubcategoryIndex);
            
            const subcategoryName = await selectedSubcategory.locator('p.text-neutral-800').textContent();
            const selectedSubcategoryName = subcategoryName?.trim() || 'Desconocida';
            
            // Marcar como visitada
            visitedSubcategories.add(selectedSubcategoryName);
            
            // Actualizar el registro de navegación
            currentLevel = navigationPath.length + 1;
            navigationPath.push({ level: currentLevel, name: selectedSubcategoryName });
            
            console.log(`✓ Seleccionando otra subcategoría: "${selectedSubcategoryName}" (índice ${randomSubcategoryIndex})`);
            console.log(`📍 Nivel actualizado: ${currentLevel} - Ruta: ${navigationPath.map(p => p.name).join(' > ')}`);
            
            await selectedSubcategory.click();
            console.log(`✓ Se hizo clic en la subcategoría "${selectedSubcategoryName}"`);
            // Esperar más tiempo para que cargue la página
            await page.waitForTimeout(4000);
            
            // Navegar recursivamente por subcategorías hasta llegar a una página de servicios
            let reachedServicesPage = false;
            const maxNavigationDepth = 10;
            let navigationDepth = currentLevel; // Continuar desde el nivel actual
            
            while (!reachedServicesPage && navigationDepth < maxNavigationDepth) {
              navigationDepth++;
              
              // Verificar si ya estamos en una página de servicios
              const serviciosTitle = page.locator('p.text-center').filter({
                hasText: 'Servicios'
              });
              
              const isServicesPage = await serviciosTitle.isVisible({ timeout: 2000 }).catch(() => false);
              
              if (isServicesPage) {
                console.log('✓ Se detectó la página de servicios (texto "Servicios" en el top)');
                reachedServicesPage = true;
                break;
              }
              
              // Buscar subcategorías disponibles en el nivel actual
              const currentLevelButtons = page.locator('button').filter({
                has: page.locator('p.text-neutral-800')
              });
              
              const currentLevelCount = await currentLevelButtons.count();
              
              if (currentLevelCount > 0) {
                console.log(`✓ Se encontraron ${currentLevelCount} opciones en el nivel ${navigationDepth}`);
                
                // Obtener nombres de todas las opciones para evitar seleccionar las ya visitadas
                let availableIndices: number[] = [];
                
                for (let i = 0; i < currentLevelCount; i++) {
                  const btn = currentLevelButtons.nth(i);
                  const btnName = await btn.locator('p.text-neutral-800').textContent();
                  const btnKey = btnName?.trim() || '';
                  
                  if (!visitedSubcategories.has(btnKey)) {
                    availableIndices.push(i);
                  }
                }
                
                if (availableIndices.length > 0) {
                  // Seleccionar aleatoriamente una opción no visitada
                  const randomAvailableIndex = Math.floor(Math.random() * availableIndices.length);
                  const randomIndex = availableIndices[randomAvailableIndex];
                  const selectedButton = currentLevelButtons.nth(randomIndex);
                  
                  const buttonName = await selectedButton.locator('p.text-neutral-800').textContent();
                  const selectedName = buttonName?.trim() || 'Desconocida';
                  
                  // Marcar como visitada
                  visitedSubcategories.add(selectedName);
                  
                  // Actualizar el registro de navegación
                  currentLevel = navigationDepth;
                  navigationPath.push({ level: currentLevel, name: selectedName });
                  
                  console.log(`✓ Seleccionando opción nivel ${navigationDepth}: "${selectedName}"`);
                  console.log(`📍 Nivel actualizado: ${currentLevel} - Ruta: ${navigationPath.map(p => p.name).join(' > ')}`);
                  
                  await selectedButton.click();
                  console.log(`✓ Se hizo clic en "${selectedName}"`);
                  await page.waitForTimeout(4000);
                } else {
                  console.log(`ℹ Todas las opciones del nivel ${navigationDepth} ya fueron visitadas`);
                  break;
                }
              } else {
                console.log(`ℹ No se encontraron más opciones en el nivel ${navigationDepth}`);
                break;
              }
            }
          } else {
            console.log('⚠ Todas las subcategorías ya fueron visitadas sin servicios');
            console.log(`📍 Niveles restantes para retroceder: ${navigationPath.length}`);
            
            // Si aún hay niveles para retroceder, continuar el bucle para retroceder más
            if (navigationPath.length > 0) {
              console.log('ℹ Continuando para retroceder más niveles...');
              continue;
            } else {
              break; // Salir del bucle si no hay más niveles para retroceder
            }
          }
        } else {
          console.log('⚠ No se encontraron subcategorías disponibles para seleccionar');
          console.log(`📍 Niveles restantes para retroceder: ${navigationPath.length}`);
          
          // Si aún hay niveles para retroceder, continuar
          if (navigationPath.length > 0) {
            console.log('ℹ Continuando para retroceder más niveles...');
            continue;
          } else {
            break; // Salir del bucle si no hay subcategorías
          }
        }
      } else {
        console.log('⚠ No se encontró botón de retroceder');
        console.log(`📍 Niveles restantes según el registro: ${navigationPath.length}`);
        break; // Salir del bucle si no hay botón de retroceder
      }
    }
  }
  
  if (!foundServices) {
    console.log('⚠ No se encontraron servicios después de todos los intentos');
  }
  
  // Tomar screenshot del resultado
  await page.screenshot({ path: 'cliente-servicio-seleccionado.png', fullPage: true });
  console.log('📸 Screenshot guardado: cliente-servicio-seleccionado.png');
});

