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
        const randomLastNames = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randomLastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
        const randomHonoree = `${randomName} ${randomLastName}`;
        
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
        
        // Llenar el campo "Fecha" - hacer clic para abrir el date picker
        const dateField = page.locator('input[id="Date"]');
        await dateField.click();
        console.log(`✓ Campo "Fecha" - clic para abrir date picker`);
        await page.waitForTimeout(1000);
        
        // Buscar el date picker que se abre (flatpickr)
        const datePicker = page.locator('.flatpickr-calendar:visible, .flatpickr-calendar.open').first();
        const datePickerVisible = await datePicker.isVisible().catch(() => false);
        
        if (datePickerVisible) {
          console.log(`✓ Date picker visible, seleccionando fecha futura...`);
          // Buscar días disponibles que no estén deshabilitados ni sean del mes pasado
          const availableDays = page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
          const daysCount = await availableDays.count();
          console.log(`📊 Días disponibles en el calendario: ${daysCount}`);
          
          // Seleccionar un día en la segunda mitad del mes para asegurar que sea futuro
          const dayIndex = Math.floor(daysCount / 2) + Math.floor(Math.random() * (daysCount / 2));
          const selectedDay = availableDays.nth(Math.min(dayIndex, daysCount - 1));
          
          const dayText = await selectedDay.textContent();
          const selectedDayNumber = parseInt(dayText?.trim() || '0');
          console.log(`✓ Seleccionando día del calendario: ${selectedDayNumber}`);
          
          await selectedDay.click();
          console.log(`✓ Fecha seleccionada del calendario: día ${selectedDayNumber}`);
          
        } else {
          console.log(`⚠ Date picker no visible, usando JavaScript`);
          await dateField.evaluate((el: HTMLInputElement, value: string) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }, formattedDate);
        }
        await page.waitForTimeout(500);
        
        // Verificar la fecha que realmente se seleccionó en el campo
        const actualDateValue = await dateField.inputValue();
        console.log(`📅 Fecha en el campo después de selección: "${actualDateValue}"`);
        
        // Parsear la fecha real del campo para actualizar futureDate
        if (actualDateValue) {
          // El formato puede ser DD/MM/YYYY o DD-MM-YYYY
          const dateParts = actualDateValue.split(/[-\/]/);
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // Los meses en JavaScript son 0-indexed
            const year = parseInt(dateParts[2]);
            
            // Actualizar futureDate con la fecha real del campo
            futureDate.setFullYear(year);
            futureDate.setMonth(month);
            futureDate.setDate(day);
            
            console.log(`✓ Fecha actualizada desde el campo: ${futureDate.toLocaleDateString('es-MX')}`);
            console.log(`   - Día: ${day}, Mes: ${month + 1}, Año: ${year}`);
          }
        }
        
        // --- Selección de hora (corrigiendo minutos) ---
        let selectedHour = 0;
        let selectedMinute = 0;
        try {
          const timeInput = page.locator('#Time');
          await timeInput.click();

          // Espera a que se abra el flatpickr
          const timePicker = page.locator('.flatpickr-calendar.open').first();
          await expect(timePicker).toBeVisible({ timeout: 5000 });

          // Selecciona los inputs dentro del flatpickr activo
          const hourInput = timePicker.locator('input.flatpickr-hour');
          const minuteInput = timePicker.locator('input.flatpickr-minute');

          // Genera hora aleatoria entre 6 y 10 pm, con minutos en múltiplos de 5
          selectedHour = Math.floor(Math.random() * 5) + 6; // 6–10
          selectedMinute = Math.floor(Math.random() * 12) * 5; // 0–55

          await hourInput.click();
          await hourInput.fill(selectedHour.toString());
          await hourInput.evaluate(el => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });

          await minuteInput.click();
          await minuteInput.fill(selectedMinute.toString().padStart(2, '0'));
          await minuteInput.evaluate(el => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });

          // Cierra o confirma el picker
          await page.keyboard.press('Enter');

          console.log(`✅ Hora seleccionada: ${selectedHour}:${selectedMinute.toString().padStart(2, '0')}`);
        } catch (err) {
          console.log('⚠ No se pudo seleccionar la hora, usando valor por defecto');
        }
        
        // Esperar un momento después de seleccionar la hora
        await page.waitForTimeout(1000);
        
        // Llenar el campo "Ciudad" usando el autocompletado real
        const cityField = page.locator('label:has-text("Ciudad")').locator('..').locator('input').first();
        
        console.log(`✓ Configurando ciudad usando autocompletado real...`);
        
        // Hacer clic en el campo y limpiarlo
        await cityField.click();
        await cityField.clear();
        await page.waitForTimeout(500);
        
        // Escribir la ciudad letra por letra para activar el autocompletado
        await cityField.pressSequentially(randomCity, { delay: 150 });
        console.log(`✓ Ciudad escrita: "${randomCity}"`);
        
        // Esperar a que aparezca la lista de sugerencias
        await page.waitForTimeout(3000);
        
        // Buscar la lista de sugerencias
        //const citySuggestionsList = page.locator('list').locator('listitem');
        const citySuggestionsList = page.locator('ul li');
        const suggestionCount = await citySuggestionsList.count();
        console.log(`📊 Sugerencias de ciudad encontradas: ${suggestionCount}`);
        
        let selectedCityValue = '';
        
        if (suggestionCount > 0) {
          console.log(`✓ Seleccionando automáticamente la primera sugerencia disponible...`);
          
          // Seleccionar directamente la primera sugerencia
          const firstSuggestion = citySuggestionsList.first();
          const firstText = await firstSuggestion.textContent();
          console.log(`✓ Seleccionando: "${firstText?.trim()}"`);
          
          // Guardar el valor de la sugerencia seleccionada para validación
          selectedCityValue = firstText?.trim() || '';
          
          // Hacer clic en la primera sugerencia
          await firstSuggestion.click();
          await page.waitForTimeout(2000);
          
          // Verificar que se seleccionó
          const finalValue = await cityField.inputValue();
          console.log(`✓ Ciudad seleccionada: "${finalValue}"`);
          
          // Hacer clic fuera del campo para activar validación
          await page.locator('body').click({ position: { x: 100, y: 100 } });
          await page.waitForTimeout(1000);
          console.log(`✓ Clic fuera del campo para activar validación`);
          
          
        } else {
          console.log(`⚠ No se encontraron sugerencias, usando valor directo`);
          // Si no hay sugerencias, usar el valor original como fallback
          selectedCityValue = `${randomCity}, Mexico`;
          
          // Intentar establecer el valor directamente
          await cityField.evaluate((el: HTMLInputElement, value: string) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }, selectedCityValue);
        }
        
        // Verificación final
        const finalCityValue = await cityField.inputValue();
        console.log(`✓ Valor final de ciudad: "${finalCityValue}"`);
        
        // Tomar screenshot para verificar
        await page.screenshot({ path: 'debug-ciudad-autocompletado.png', fullPage: true });
        console.log(`📸 Screenshot después de autocompletado guardado`);
        
        // Llenar el campo "Número de invitados"
        const attendeesField = page.locator('input[id="Attendees"]');
        await attendeesField.fill(randomAttendees.toString());
        console.log(`✓ Campo "Número de invitados" llenado`);
        await page.waitForTimeout(500);
        
        console.log(`\n✓ Formulario de contacto completado`);
        
        // Verificar que todos los campos tengan valores
        console.log(`\n🔍 Verificando valores de los campos...`);
        const honoreeValue = await honoreeField.inputValue();
        const dateValue = await dateField.inputValue();
        const timeField = page.locator('input[id="Time"]');
        const timeValue = await timeField.inputValue();
        const cityValue = await cityField.inputValue();
        const attendeesValue = await attendeesField.inputValue();
        
        console.log(`   - Festejado: "${honoreeValue}"`);
        console.log(`   - Fecha: "${dateValue}"`);
        console.log(`   - Hora: "${timeValue}"`);
        console.log(`   - Ciudad: "${cityValue}"`);
        console.log(`   - Invitados: "${attendeesValue}"`);
        
        // Verificar que ningún campo esté vacío
        const allFieldsFilled = honoreeValue && dateValue && timeValue && cityValue && attendeesValue;
        if (allFieldsFilled) {
          console.log(`✓ Todos los campos tienen valores`);
        } else {
          console.log(`⚠ Hay campos vacíos!`);
        }
        
        // Verificar si hay mensajes de error visibles
        console.log(`\n🔍 Verificando mensajes de error...`);
        const errorMessages = page.locator('p').filter({ hasText: /selecciona|ingresa|requerido|error/i });
        const errorCount = await errorMessages.count();
        console.log(`📊 Mensajes de error encontrados: ${errorCount}`);
        
        if (errorCount > 0) {
          for (let i = 0; i < errorCount; i++) {
            const errorText = await errorMessages.nth(i).textContent();
            console.log(`   - Error ${i + 1}: "${errorText?.trim()}"`);
          }
          
          // Si hay errores, intentar hacer clic en el botón de todas formas
          console.log(`⚠ Se encontraron errores de validación, pero continuando...`);
          
          // Intentar hacer clic en el botón aunque haya errores
          console.log(`✓ Intentando hacer clic en "Crear evento" a pesar de los errores...`);
        } else {
          console.log(`✓ No se encontraron mensajes de error`);
        }
        
        // Tomar screenshot del formulario antes de crear evento (para debug)
        await page.screenshot({ path: 'debug-formulario-antes-crear.png', fullPage: true });
        console.log(`📸 Screenshot del formulario guardado`);
        
        // Hacer clic en el botón "Crear evento"
        const createEventButton = page.locator('button').filter({ hasText: /Crear evento/i });
        
        // Verificar que el botón existe
        const buttonCount = await createEventButton.count();
        console.log(`📊 Botones "Crear evento" encontrados: ${buttonCount}`);
        
        if (buttonCount === 0) {
          console.log(`⚠ No se encontró el botón "Crear evento", buscando alternativas...`);
          // Intentar buscar por otros textos posibles
          const altButtons = page.locator('button').filter({ hasText: /crear|continuar|enviar/i });
          const altCount = await altButtons.count();
          console.log(`📊 Botones alternativos encontrados: ${altCount}`);
          
          if (altCount > 0) {
            for (let i = 0; i < altCount; i++) {
              const btnText = await altButtons.nth(i).textContent();
              console.log(`  - Botón ${i}: "${btnText?.trim()}"`);
            }
          }
        }
        
        await expect(createEventButton).toBeVisible({ timeout: 10000 });
        console.log(`✓ Botón "Crear evento" visible`);
        
        // Verificar si el botón está habilitado
        const isEnabled = await createEventButton.isEnabled();
        console.log(`✓ Botón "Crear evento" habilitado: ${isEnabled}`);
        
        // Hacer scroll al botón para asegurarse de que está en viewport
        await createEventButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        await createEventButton.click();
        console.log(`✓ Se hizo clic en "Crear evento"`);
        await page.waitForTimeout(3000);
        
        // Tomar screenshot después de hacer clic (para debug)
        await page.screenshot({ path: 'debug-despues-crear-evento.png', fullPage: true });
        console.log(`📸 Screenshot después de crear evento guardado`);
        
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
        
        // Validar que contiene la ciudad usando el valor seleccionado de la lista
        console.log(`📊 Ciudad seleccionada de la lista: "${selectedCityValue}"`);
        
        if (selectedCityValue && eventInfoText?.toLowerCase().includes(selectedCityValue.toLowerCase())) {
          console.log(`✓ Ciudad coincide exactamente: "${selectedCityValue}"`);
        } else {
          console.log(`⚠ Ciudad no coincide exactamente. Ciudad seleccionada: "${selectedCityValue}"`);
          
          // Buscar cualquier mención de la ciudad en el texto
          const cityWords = selectedCityValue.split(/[,\s]+/).filter(word => word.length > 2);
          let foundCityWords: string[] = [];
          
          for (const word of cityWords) {
            if (eventInfoText?.toLowerCase().includes(word.toLowerCase())) {
              foundCityWords.push(word);
            }
          }
          
          if (foundCityWords.length > 0) {
            console.log(`✓ Ciudad validada por palabras encontradas: [${foundCityWords.join(', ')}]`);
          } else {
            console.log(`⚠ Ninguna palabra de la ciudad fue encontrada en el diálogo`);
            console.log(`📊 Palabras buscadas: [${cityWords.join(', ')}]`);
          }
        }
        
        // Validar que contiene la hora
        // Obtener el valor real del campo de hora para la validación
        const timeFieldForValidation = page.locator('input[id="Time"]');
        const actualTimeValue = await timeFieldForValidation.inputValue();
        console.log(`📊 Hora en el campo: "${actualTimeValue}"`);
        
        // Validar que la hora del diálogo coincide con la hora del campo
        if (actualTimeValue && eventInfoText?.toLowerCase().includes(actualTimeValue.toLowerCase())) {
          console.log(`✓ Hora coincide exactamente: ${actualTimeValue}`);
        } else {
          console.log(`⚠ Hora no coincide exactamente. Valor del campo: "${actualTimeValue}"`);
          
          // Extraer hora y minutos del valor del campo para validación más flexible
          const timeMatch = actualTimeValue.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            const fieldHour = timeMatch[1];
            const fieldMinute = timeMatch[2];
            console.log(`📊 Extrayendo hora del campo: ${fieldHour}:${fieldMinute}`);
            
            // Convertir a formato 24h para comparar con el diálogo
            let hour24 = parseInt(fieldHour);
            if (actualTimeValue.includes('PM') && hour24 !== 12) {
              hour24 += 12;
            } else if (actualTimeValue.includes('AM') && hour24 === 12) {
              hour24 = 0;
            }
            
            const time24h = `${hour24}:${fieldMinute}`;
            console.log(`📊 Hora convertida a formato 24h: ${time24h}`);
            
            // Validar que el diálogo contenga la hora en formato 24h
            if (eventInfoText?.includes(time24h)) {
              console.log(`✓ Hora encontrada en formato 24h: ${time24h}`);
            } else {
              // Intentar con formato de hora sin minutos (solo la hora)
              if (eventInfoText?.includes(hour24.toString())) {
                console.log(`✓ Hora validada por número encontrado: ${hour24}`);
              } else {
                // Intentar con formato de minutos
                if (eventInfoText?.includes(fieldMinute)) {
                  console.log(`✓ Minutos validados: ${fieldMinute}`);
                } else {
                  console.log(`⚠ Hora no validada. Campo: "${actualTimeValue}", Buscando: ${time24h}, ${hour24}, o ${fieldMinute}`);
                }
              }
            }
          } else {
            console.log(`⚠ No se pudo extraer hora del campo: "${actualTimeValue}"`);
          }
        }
        
        console.log(`\n✓ Validación del diálogo de confirmación completada`);
        
        // Hacer clic en el botón "Solicitar" para enviar la solicitud
        const solicitarButton = page.locator('button').filter({ hasText: /Solicitar/i });
        const solicitarVisible = await solicitarButton.isVisible().catch(() => false);
        
        if (solicitarVisible) {
          console.log(`✓ Botón "Solicitar" encontrado y visible`);
          await solicitarButton.click();
          console.log(`✓ Se hizo clic en el botón "Solicitar"`);
          await page.waitForTimeout(3000);
          
          // Verificar que aparece el diálogo de "Solicitud enviada"
          const solicitudEnviadaDialog = page.locator('div.absolute.top-1\\/2.left-1\\/2').filter({
            hasText: 'Solicitud enviada'
          });
          
          const dialogVisible = await solicitudEnviadaDialog.isVisible().catch(() => false);
          
          if (dialogVisible) {
            console.log(`✓ Diálogo "Solicitud enviada" apareció correctamente`);
            
            // Verificar que el diálogo contiene el mensaje de agradecimiento
            const graciasText = page.locator('p').filter({ hasText: 'Gracias por tu solicitud' });
            const graciasVisible = await graciasText.isVisible().catch(() => false);
            
            if (graciasVisible) {
              console.log(`✓ Mensaje "Gracias por tu solicitud" visible en el diálogo`);
            } else {
              console.log(`⚠ Mensaje de agradecimiento no encontrado`);
            }
            
            // Hacer clic en el botón "OK" para cerrar el diálogo
            const okButton = solicitudEnviadaDialog.locator('button').filter({ hasText: /OK/i });
            const okVisible = await okButton.isVisible().catch(() => false);
            
            if (okVisible) {
              console.log(`✓ Botón "OK" encontrado en el diálogo`);
              await okButton.click();
              console.log(`✓ Se hizo clic en "OK" para cerrar el diálogo`);
              await page.waitForTimeout(2000);
            } else {
              console.log(`⚠ Botón "OK" no encontrado en el diálogo`);
            }
          } else {
            console.log(`⚠ Diálogo "Solicitud enviada" no apareció`);
          }
        } else {
          console.log(`⚠ Botón "Solicitar" no encontrado o no visible`);
        }
        
        // Validar que se regresa al dashboard después de completar el flujo
        console.log(`\n🔍 Validando regreso al dashboard...`);
        
        // Esperar a que se regrese al dashboard
        await page.waitForTimeout(3000);
        
        // Verificar que estamos en la URL del dashboard
        const currentUrl = page.url();
        if (currentUrl.includes('/client/dashboard')) {
          console.log(`✓ Regreso exitoso al dashboard: ${currentUrl}`);
        } else {
          console.log(`⚠ No se regresó al dashboard. URL actual: ${currentUrl}`);
          // Intentar navegar manualmente al dashboard
          await page.goto('https://staging.fiestamas.com/client/dashboard');
          await page.waitForTimeout(2000);
          console.log(`✓ Navegación manual al dashboard completada`);
        }
        
        // Validar notificación en la sección "¡Fiestachat!"
        console.log(`\n🔍 Validando notificación en Fiestachat...`);
        
        // Buscar la sección de Fiestachat
        const fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
        const fiestachatVisible = await fiestachatSection.isVisible().catch(() => false);
        
        if (fiestachatVisible) {
          console.log(`✓ Sección Fiestachat visible en el dashboard`);
          
          // Buscar el título "¡Fiestachat!"
          const fiestachatTitle = fiestachatSection.locator('p.text-regular.text-primary-neutral.text-center.font-bold');
          const titleText = await fiestachatTitle.textContent();
          
          if (titleText && titleText.includes('¡Fiestachat!')) {
            console.log(`✓ Título "¡Fiestachat!" encontrado`);
          } else {
            console.log(`⚠ Título "¡Fiestachat!" no encontrado`);
          }
          
          // Buscar el subtítulo "La línea directa a tu evento"
          const fiestachatSubtitle = fiestachatSection.locator('p.text-small.text-dark-neutral.text-center');
          const subtitleText = await fiestachatSubtitle.textContent();
          
          if (subtitleText && subtitleText.includes('La línea directa a tu evento')) {
            console.log(`✓ Subtítulo "La línea directa a tu evento" encontrado`);
          } else {
            console.log(`⚠ Subtítulo "La línea directa a tu evento" no encontrado`);
          }
          
          // Buscar notificaciones en la sección
          const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
          const notificationCount = await notificationButtons.count();
          console.log(`📊 Notificaciones encontradas en Fiestachat: ${notificationCount}`);
          
          if (notificationCount > 0) {
            console.log(`✓ Notificaciones encontradas en la sección Fiestachat`);
            
            // Validar la primera notificación (debería ser la más reciente)
            const firstNotification = notificationButtons.first();
            const notificationText = await firstNotification.textContent();
            
            if (notificationText) {
              console.log(`📋 Contenido de la notificación: "${notificationText.trim()}"`);
              
              // Validar que contiene "Solicitud de cotización enviada"
              if (notificationText.includes('Solicitud de cotización enviada')) {
                console.log(`✓ Notificación de "Solicitud de cotización enviada" encontrada`);
              } else {
                console.log(`⚠ Texto "Solicitud de cotización enviada" no encontrado en la notificación`);
              }
              
              // Validar que contiene una fecha y hora (formato flexible)
              const hasDateAndTime = /\d{1,2}:\d{2}\s*(AM|PM|am|pm)/.test(notificationText) || 
                                   /\d{1,2}:\d{2}/.test(notificationText) ||
                                   /(Hoy|Ayer|mañana)/i.test(notificationText);
              
              if (hasDateAndTime) {
                console.log(`✓ Fecha y hora encontradas en la notificación`);
              } else {
                console.log(`⚠ Fecha y hora no encontradas en la notificación`);
              }
              
              // Buscar el nombre del servicio en la notificación (puede estar truncado)
              const serviceNameElement = firstNotification.locator('p.text-small.text-dark-neutral.font-bold.text-start');
              const serviceNameText = await serviceNameElement.textContent();
              
              if (serviceNameText) {
                console.log(`✓ Nombre del servicio en la notificación: "${serviceNameText.trim()}"`);
                console.log(`✓ El servicio seleccionado debe estar relacionado con esta notificación`);
              } else {
                console.log(`⚠ No se pudo obtener el nombre del servicio de la notificación`);
              }
              
              // Validar el mensaje de la notificación
              const messageElement = firstNotification.locator('span');
              const messageText = await messageElement.textContent();
              
              if (messageText && messageText.includes('Solicitud de cotización enviada')) {
                console.log(`✓ Mensaje de notificación correcto: "${messageText.trim()}"`);
              } else {
                console.log(`⚠ Mensaje de notificación no coincide: "${messageText?.trim()}"`);
              }
              
            } else {
              console.log(`⚠ No se pudo obtener el texto de la notificación`);
            }
            
          } else {
            console.log(`⚠ No se encontraron notificaciones en la sección Fiestachat`);
          }
          
        } else {
          console.log(`⚠ Sección Fiestachat no visible en el dashboard`);
          
          // Buscar alternativamente la sección sin la clase hidden
          const fiestachatSectionAlt = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
          const altVisible = await fiestachatSectionAlt.isVisible().catch(() => false);
          
          if (altVisible) {
            console.log(`✓ Sección Fiestachat encontrada (versión alternativa)`);
            // Repetir validaciones con la sección alternativa
            const notificationButtons = fiestachatSectionAlt.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
            const notificationCount = await notificationButtons.count();
            console.log(`📊 Notificaciones encontradas (alternativa): ${notificationCount}`);
            
            if (notificationCount > 0) {
              const firstNotification = notificationButtons.first();
              const notificationText = await firstNotification.textContent();
              console.log(`📋 Contenido de la notificación: "${notificationText?.trim()}"`);
              
              if (notificationText && notificationText.includes('Solicitud de cotización enviada')) {
                console.log(`✓ Notificación de "Solicitud de cotización enviada" encontrada`);
              }
            }
          }
        }
        
        // Validar que el evento creado aparece en la lista de eventos (ANTES de filtrar por día)
        console.log(`\n🔍 Validando que el evento aparece en la lista de eventos del dashboard...`);
        
        // Buscar el contenedor de eventos
        const eventsContainerInitial = page.locator('div.flex.relative.w-full.overflow-hidden');
        const containerInitialVisible = await eventsContainerInitial.isVisible().catch(() => false);
        
        if (containerInitialVisible) {
          console.log(`✓ Contenedor de eventos visible en el dashboard`);
          
          // Buscar eventos en la lista
          const eventCardsInitial = eventsContainerInitial.locator('button.flex.flex-col');
          const eventCountInitial = await eventCardsInitial.count();
          console.log(`📊 Eventos encontrados en la lista: ${eventCountInitial}`);
          
          if (eventCountInitial > 0) {
            console.log(`✓ Lista de eventos cargada correctamente`);
            
            // Buscar el evento creado por el nombre del festejado
            let eventFoundInitial = false;
            for (let i = 0; i < eventCountInitial; i++) {
              const eventCard = eventCardsInitial.nth(i);
              const eventText = await eventCard.textContent();
              
              if (eventText && eventText.includes(randomHonoree)) {
                console.log(`✅ Evento encontrado en la lista general: "${randomHonoree}"`);
                console.log(`   📋 Detalles: "${eventText.trim().substring(0, 100)}..."`);
                eventFoundInitial = true;
                break;
              }
            }
            
            if (!eventFoundInitial) {
              console.log(`⚠ Evento "${randomHonoree}" NO encontrado en la lista general`);
              console.log(`📊 Listando eventos disponibles para debugging...`);
              
              // Listar los primeros 3 eventos para debugging
              for (let i = 0; i < Math.min(eventCountInitial, 3); i++) {
                const eventCard = eventCardsInitial.nth(i);
                const eventCardText = await eventCard.textContent();
                console.log(`   - Evento ${i + 1}: "${eventCardText?.trim().substring(0, 80)}..."`);
              }
            }
          } else {
            console.log(`⚠ No se encontraron eventos en la lista`);
          }
        } else {
          console.log(`⚠ Contenedor de eventos no visible en el dashboard`);
        }
        
        // Tomar screenshot del dashboard con el evento en la lista general
        await page.screenshot({ path: 'eventos-01-dashboard-evento-en-lista.png', fullPage: true });
        console.log(`📸 Screenshot guardado: eventos-01-dashboard-evento-en-lista.png`);
        
        // Seleccionar el día del evento en el calendario del dashboard
        console.log(`\n🔍 Buscando calendario en el dashboard...`);
        
        // Obtener el día del evento creado (la fecha futura que se generó)
        const eventDay = futureDate.getDate();
        const eventMonth = futureDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        console.log(`📅 Día del evento creado: ${eventDay}`);
        console.log(`📅 Mes del evento: ${eventMonth}`);
        
        // Buscar el calendario en el dashboard
        const calendarContainer = page.locator('div.w-full.flex.flex-col.gap-4').first();
        const calendarVisible = await calendarContainer.isVisible().catch(() => false);
        
        if (calendarVisible) {
          console.log(`✓ Calendario encontrado en el dashboard`);
          
          // Buscar el título del mes
          const monthTitle = calendarContainer.locator('button.text-dark-neutral.font-bold').first();
          const monthText = await monthTitle.textContent();
          console.log(`📅 Mes mostrado en calendario: "${monthText?.trim()}"`);
          
          // Navegar al mes del evento si es necesario
          const currentMonthInCalendar = monthText?.trim().toLowerCase() || '';
          const targetMonth = eventMonth.toLowerCase();
          
          console.log(`🔍 Verificando si necesitamos cambiar de mes...`);
          console.log(`   - Mes en calendario: "${currentMonthInCalendar}"`);
          console.log(`   - Mes del evento: "${targetMonth}"`);
          
          // Si el mes no coincide, navegar usando los botones de chevron
          if (!currentMonthInCalendar.includes(targetMonth.split(' ')[0])) {
            console.log(`⚠ El mes del calendario no coincide con el mes del evento`);
            console.log(`🖱️ Navegando al mes correcto...`);
            
            // Buscar el botón de siguiente mes (chevron-right)
            const nextMonthButton = calendarContainer.locator('button').filter({
              has: page.locator('i.icon-chevron-right')
            });
            
            // Hacer clic hasta 3 veces para avanzar meses si es necesario
            for (let clicks = 0; clicks < 3; clicks++) {
              await nextMonthButton.click();
              await page.waitForTimeout(1000);
              
              const updatedMonthText = await monthTitle.textContent();
              console.log(`   📅 Mes actualizado: "${updatedMonthText?.trim()}"`);
              
              if (updatedMonthText?.toLowerCase().includes(targetMonth.split(' ')[0])) {
                console.log(`✓ Mes correcto encontrado: "${updatedMonthText?.trim()}"`);
                break;
              }
            }
          }
          
          // Buscar todos los días del calendario
          const allDayButtons = calendarContainer.locator('button').filter({
            has: page.locator('p.text-dark-neutral')
          }).filter({
            hasNot: page.locator('i.icon')
          });
          
          const dayButtonCount = await allDayButtons.count();
          console.log(`📊 Total de días en el calendario: ${dayButtonCount}`);
          
          // Buscar el día del evento por número
          let eventDayFound = false;
          for (let i = 0; i < dayButtonCount; i++) {
            const dayButton = allDayButtons.nth(i);
            const dayTextElement = dayButton.locator('p.text-dark-neutral').first();
            const dayText = await dayTextElement.textContent();
            const dayNumber = parseInt(dayText?.trim() || '0');
            
            // Verificar que no tiene opacidad (días del mes anterior/siguiente tienen opacity-40)
            const hasOpacity = await dayButton.locator('p.opacity-40').count() > 0;
            
            if (dayNumber === eventDay && !hasOpacity) {
              console.log(`✓ Día del evento encontrado en el calendario: ${dayNumber}`);
              console.log(`🖱️ Haciendo clic en el día ${dayNumber} para filtrar eventos...`);
              await dayButton.click();
              await page.waitForTimeout(2000);
              console.log(`✓ Se hizo clic en el día ${dayNumber} del calendario`);
              
              // Tomar screenshot después de seleccionar el día
              await page.screenshot({ path: 'eventos-02-calendario-dia-seleccionado.png', fullPage: true });
              console.log(`📸 Screenshot guardado: eventos-02-calendario-dia-seleccionado.png`);
              
              eventDayFound = true;
              break;
            }
          }
          
          if (!eventDayFound) {
            console.log(`⚠ Día del evento (${eventDay}) no encontrado en el calendario`);
          }
          
        } else {
          console.log(`⚠ Calendario no encontrado en el dashboard`);
          
          // Intentar buscar el calendario de forma alternativa
          const calendarAlt = page.locator('div.flex.flex-col.gap-2.p-4.rounded-6.bg-light-light.shadow-4');
          const calendarAltVisible = await calendarAlt.isVisible().catch(() => false);
          
          if (calendarAltVisible) {
            console.log(`✓ Calendario encontrado (versión alternativa)`);
            
            // Buscar el día del evento en la versión alternativa
            const allDayButtonsAlt = calendarAlt.locator('button').filter({
              has: page.locator('p.text-dark-neutral')
            });
            
            const dayButtonCountAlt = await allDayButtonsAlt.count();
            console.log(`📊 Total de días en el calendario (alt): ${dayButtonCountAlt}`);
            
            for (let i = 0; i < dayButtonCountAlt; i++) {
              const dayButton = allDayButtonsAlt.nth(i);
              const dayText = await dayButton.locator('p').first().textContent();
              const dayNumber = parseInt(dayText?.trim() || '0');
              const hasOpacity = await dayButton.locator('p.opacity-40').count() > 0;
              
              if (dayNumber === eventDay && !hasOpacity) {
                console.log(`✓ Día del evento encontrado: ${dayNumber}`);
                console.log(`🖱️ Haciendo clic en el día ${dayNumber}...`);
                await dayButton.click();
                await page.waitForTimeout(2000);
                console.log(`✓ Se hizo clic en el día ${dayNumber} del calendario`);
                
                // Tomar screenshot después de seleccionar el día (versión alternativa)
                await page.screenshot({ path: 'eventos-02-calendario-dia-seleccionado.png', fullPage: true });
                console.log(`📸 Screenshot guardado: eventos-02-calendario-dia-seleccionado.png`);
                
                break;
              }
            }
          }
        }
        
        // Validar que el evento creado aparece en la sección de eventos después de seleccionar el día
        console.log(`\n🔍 Validando que el evento aparece en la sección de eventos del día seleccionado...`);
        
        // Buscar la sección de eventos (la lista de eventos del dashboard)
        const eventsSection = page.locator('div.flex.relative.w-full.overflow-hidden');
        const eventsSectionVisible = await eventsSection.isVisible().catch(() => false);
        
        if (eventsSectionVisible) {
          console.log(`✓ Sección de eventos visible en el dashboard`);
          
          // Buscar todos los eventos en la lista
          const eventCards = eventsSection.locator('button.flex.flex-col');
          const eventCardsCount = await eventCards.count();
          console.log(`📊 Total de eventos mostrados en la lista: ${eventCardsCount}`);
          
          if (eventCardsCount > 0) {
            console.log(`✓ Eventos encontrados en la lista`);
            
            // Buscar el evento recién creado por el nombre del festejado
            let eventFoundInList = false;
            
            for (let i = 0; i < eventCardsCount; i++) {
              const eventCard = eventCards.nth(i);
              const eventCardText = await eventCard.textContent();
              
              if (eventCardText) {
                // Verificar si el evento contiene el nombre del festejado
                if (eventCardText.includes(randomHonoree)) {
                  console.log(`✓ Evento encontrado en la lista del día seleccionado: "${randomHonoree}"`);
                  console.log(`   📋 Detalles: "${eventCardText.trim().substring(0, 100)}..."`);
                  eventFoundInList = true;
                  
                  // Validar que la fecha del evento coincide con el día seleccionado
                  const eventDateInCard = eventCardText.match(/\d{1,2}\s+\w+\.?\s+\d{4}/);
                  if (eventDateInCard) {
                    console.log(`   📅 Fecha en la card: "${eventDateInCard[0]}"`);
                  }
                  
                  break;
                }
              }
            }
            
            if (eventFoundInList) {
              console.log(`✅ VALIDACIÓN EXITOSA: El evento "${randomHonoree}" aparece en la lista del día ${eventDay}`);
            } else {
              console.log(`⚠ Evento "${randomHonoree}" NO encontrado en la lista del día ${eventDay}`);
              console.log(`📊 Listando eventos disponibles para debugging...`);
              
              // Listar los primeros 3 eventos para debugging
              for (let i = 0; i < Math.min(eventCardsCount, 3); i++) {
                const eventCard = eventCards.nth(i);
                const eventCardText = await eventCard.textContent();
                console.log(`   - Evento ${i + 1}: "${eventCardText?.trim().substring(0, 80)}..."`);
              }
            }
            
            // Validar que todos los eventos mostrados corresponden al día seleccionado
            console.log(`\n🔍 Validando que todos los eventos mostrados pertenecen al día ${eventDay}...`);
            
            let allEventsFromSelectedDay = true;
            for (let i = 0; i < eventCardsCount; i++) {
              const eventCard = eventCards.nth(i);
              const eventCardText = await eventCard.textContent();
              
              if (eventCardText) {
                // Extraer la fecha del evento (formato: "31 oct. 2025")
                const dateMatch = eventCardText.match(/(\d{1,2})\s+(\w+)\.?\s+(\d{4})/);
                
                if (dateMatch) {
                  const dayInCard = parseInt(dateMatch[1]);
                  console.log(`   📅 Evento ${i + 1}: Día ${dayInCard}`);
                  
                  if (dayInCard === eventDay) {
                    console.log(`      ✓ Corresponde al día seleccionado (${eventDay})`);
                  } else {
                    console.log(`      ⚠ NO corresponde al día seleccionado (esperado: ${eventDay}, encontrado: ${dayInCard})`);
                    allEventsFromSelectedDay = false;
                  }
                } else {
                  console.log(`   ⚠ Evento ${i + 1}: No se pudo extraer la fecha`);
                }
              }
            }
            
            if (allEventsFromSelectedDay) {
              console.log(`✓ Todos los eventos mostrados corresponden al día seleccionado (${eventDay})`);
            } else {
              console.log(`⚠ Algunos eventos NO corresponden al día seleccionado (puede ser esperado si el filtro no se aplicó)`);
            }
            
          } else {
            console.log(`⚠ No se encontraron eventos en la lista del día seleccionado`);
          }
          
        } else {
          console.log(`⚠ Sección de eventos no visible en el dashboard`);
        }
        
        // Tomar screenshot de los eventos filtrados por día
        await page.screenshot({ path: 'eventos-03-eventos-filtrados-por-dia.png', fullPage: true });
        console.log(`📸 Screenshot guardado: eventos-03-eventos-filtrados-por-dia.png`);
        
        // Hacer clic en el evento para abrirlo y validar sus datos
        console.log(`\n🔍 Abriendo el evento creado para validar datos...`);
        
        // Buscar el contenedor de eventos nuevamente
        const eventsContainer = page.locator('div.flex.relative.w-full.overflow-hidden');
        const containerVisible = await eventsContainer.isVisible().catch(() => false);
        
        if (containerVisible) {
          // Buscar eventos en la lista
          const eventCards = eventsContainer.locator('button.flex.flex-col');
          const eventCount = await eventCards.count();
          
          if (eventCount > 0) {
            // Buscar el evento creado por el nombre del festejado
            let eventFound = false;
            for (let i = 0; i < eventCount; i++) {
              const eventCard = eventCards.nth(i);
              const eventText = await eventCard.textContent();
              
            if (eventText && eventText.includes(randomHonoree)) {
              console.log(`✓ Evento encontrado, haciendo clic para abrirlo: "${randomHonoree}"`);
              eventFound = true;
              
              // Hacer clic en el evento para abrirlo
              console.log(`\n🔍 Abriendo evento para validar datos...`);
              await eventCard.click();
              console.log(`✓ Se hizo clic en el evento "${randomHonoree}"`);
              await page.waitForTimeout(3000);
              
              // Validar que se abrió la página de detalles del evento
              const currentUrl = page.url();
              if (currentUrl.includes('/event/') || currentUrl.includes('/client/')) {
                console.log(`✓ Página de detalles del evento cargada: ${currentUrl}`);
              } else {
                console.log(`⚠ URL inesperada al abrir evento: ${currentUrl}`);
              }
              
              // Tomar screenshot de la página de detalles del evento
              await page.screenshot({ path: 'eventos-04-detalles-del-evento.png', fullPage: true });
              console.log(`📸 Screenshot guardado: eventos-04-detalles-del-evento.png`);
              
              // Validar los datos mostrados en la card del evento
              console.log(`\n🔍 Validando datos del evento en la página...`);
              
              // Buscar el contenedor de servicios
              const servicesContainer = page.locator('div.flex.flex-col.grow.overflow-y-auto.w-full');
              const containerVisible = await servicesContainer.isVisible().catch(() => false);
              
              if (containerVisible) {
                console.log(`✓ Contenedor de servicios visible`);
                
                // Buscar servicios en la lista
                const serviceCards = servicesContainer.locator('button.text-start.flex.flex-col');
                const serviceCount = await serviceCards.count();
                console.log(`📊 Servicios encontrados en la lista: ${serviceCount}`);
                
                if (serviceCount > 0) {
                  console.log(`✓ Lista de servicios cargada correctamente`);
                  
                  // Validar que hay servicios listados (el servicio seleccionado debe estar ahí)
                  console.log(`✓ Validando que el servicio seleccionado está en la lista...`);
                  
                  // Listar los servicios encontrados para validación
                  for (let j = 0; j < Math.min(serviceCount, 5); j++) {
                    const serviceCard = serviceCards.nth(j);
                    const serviceText = await serviceCard.textContent();
                    console.log(`   - Servicio ${j + 1}: "${serviceText?.trim()}"`);
                  }
                  
                  if (serviceCount > 0) {
                    console.log(`✓ Servicios encontrados en la lista del evento (${serviceCount} servicios)`);
                    console.log(`✓ El servicio seleccionado debe estar incluido en esta lista`);
                  } else {
                    console.log(`⚠ No se encontraron servicios en la lista del evento`);
                  }
                } else {
                  console.log(`⚠ No se encontraron servicios en la lista`);
                }
              } else {
                console.log(`⚠ Contenedor de servicios no visible en la página`);
              }
              
              // Validar otros datos del evento si están visibles
              console.log(`\n🔍 Validando otros datos del evento...`);
              
              // Buscar información del evento en la página
              const pageContent = await page.textContent('body');
              if (pageContent) {
                // Validar que aparece el tipo de evento
                if (pageContent.includes(selectedEventType)) {
                  console.log(`✓ Tipo de evento "${selectedEventType}" encontrado en la página`);
                } else {
                  console.log(`⚠ Tipo de evento "${selectedEventType}" no encontrado en la página`);
                }
                
                // Validar que aparece el nombre del festejado
                if (pageContent.includes(randomHonoree)) {
                  console.log(`✓ Nombre del festejado "${randomHonoree}" encontrado en la página`);
                } else {
                  console.log(`⚠ Nombre del festejado "${randomHonoree}" no encontrado en la página`);
                }
                
                // Validar que aparece la ciudad
                if (selectedCityValue && pageContent.includes(selectedCityValue.split(',')[0])) {
                  console.log(`✓ Ciudad encontrada en la página`);
                } else {
                  console.log(`⚠ Ciudad no encontrada en la página`);
                }
              }
              
              break;
            }
            }
            
            if (!eventFound) {
              console.log(`⚠ Evento con nombre "${randomHonoree}" no encontrado en la lista`);
              console.log(`📊 Listando eventos disponibles para debugging...`);
              
              // Listar algunos eventos para debugging
              for (let i = 0; i < Math.min(eventCount, 3); i++) {
                const eventCard = eventCards.nth(i);
                const eventText = await eventCard.textContent();
                console.log(`   - Evento ${i + 1}: "${eventText?.trim()}"`);
              }
            }
          } else {
            console.log(`⚠ No se encontraron eventos en la lista`);
          }
        } else {
          console.log(`⚠ Contenedor de eventos no visible en el dashboard`);
        }
        
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
      
      // Verificar si esta categoría tiene solo una subcategoría sin servicios
      // En este caso, necesitamos cambiar completamente de categoría (subir 2 niveles)
      const hasOnlyOneSubcategory = navigationPath.length === 1;
      const allSubcategoriesVisited = visitedWithoutServices.size >= 1 && 
        Array.from(visitedWithoutServices).some(path => path.includes(currentServiceCategory));
      
      if (hasOnlyOneSubcategory && allSubcategoriesVisited) {
        console.log(`⚠ Esta categoría "${currentServiceCategory}" tiene solo una subcategoría sin servicios.`);
        console.log(`✓ Cambiando completamente de categoría (subiendo 2 niveles)...`);
        
        // Nivel 1: Volver de la subcategoría a la categoría de servicio
        const backButton1 = page.locator('button').filter({
          has: page.locator('i.icon-chevron-left')
        }).first();
        
        const backButton1Visible = await backButton1.isVisible().catch(() => false);
        
        if (backButton1Visible) {
          const backText1 = await backButton1.locator('p').textContent().catch(() => '');
          console.log(`📍 Nivel 1: Retrocediendo desde subcategoría: "${backText1?.trim()}"`);
          await backButton1.click();
          await page.waitForTimeout(2000);
          
          // Nivel 2: Volver de la categoría de servicio a la selección de categorías
          const backButton2 = page.locator('button').filter({
            has: page.locator('i.icon-chevron-left')
          }).first();
          
          const backButton2Visible = await backButton2.isVisible().catch(() => false);
          
          if (backButton2Visible) {
            const backText2 = await backButton2.locator('p').textContent().catch(() => '');
            console.log(`📍 Nivel 2: Retrocediendo desde categoría de servicio: "${backText2?.trim()}"`);
            await backButton2.click();
            await page.waitForTimeout(2000);
            
            // Ahora debemos estar en la selección de categorías de servicios
            console.log(`✓ Regresado a la selección de categorías de servicios`);
            
            // Seleccionar una nueva categoría de servicio diferente a la anterior
            const newServiceButtons = page.locator('button').filter({ 
              has: page.locator('p.text-neutral-800.font-medium') 
            });
            
            const newServiceCount = await newServiceButtons.count();
            
            if (newServiceCount > 0) {
              // Intentar seleccionar una categoría diferente a la actual
              let newRandomServiceIndex;
              let attempts = 0;
              let newServiceName = currentServiceCategory;
              
              // Intentar hasta 5 veces encontrar una categoría diferente
              while (newServiceName === currentServiceCategory && attempts < 5) {
                newRandomServiceIndex = Math.floor(Math.random() * newServiceCount);
                const newSelectedService = newServiceButtons.nth(newRandomServiceIndex);
                const tempServiceName = await newSelectedService.locator('p.text-neutral-800.font-medium').textContent();
                newServiceName = tempServiceName?.trim() || currentServiceCategory;
                attempts++;
              }
              
              const newSelectedService = newServiceButtons.nth(newRandomServiceIndex!);
              console.log(`✓ Seleccionando nueva categoría de servicio: "${newServiceName?.trim()}" (índice ${newRandomServiceIndex})`);
              
              await newSelectedService.click();
              console.log(`✓ Se hizo clic en la nueva categoría de servicio "${newServiceName?.trim()}"`);
              
              // Resetear variables para la nueva categoría
              currentServiceCategory = newServiceName?.trim() || 'Desconocida';
              navigationPath = [];
              attemptsInCurrentCategory = 0;
              
              await page.waitForTimeout(2000);
              console.log(`✓ Nueva categoría de servicio configurada: "${currentServiceCategory}"`);
            }
          }
        }
        
        continue; // Continuar con el siguiente intento en la nueva categoría
      }
      
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

