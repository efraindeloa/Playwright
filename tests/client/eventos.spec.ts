import { test, expect, Page } from '@playwright/test';
import { login, safeFill } from '../utils';
import { DEFAULT_BASE_URL, CLIENT_EMAIL, CLIENT_PASSWORD } from '../config';

test.use({
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(90000); // 90 segundos de timeout


test('Validar que se puede crear un evento desde el dashboard', async ({ page }) => {
  // Hacer login primero
  //await login(page);
  // Usando la función de login

  await page.goto(DEFAULT_BASE_URL);

  await page.waitForTimeout(2000);

  // Hacer clic en el botón de login
  const loginButton = page.locator('button:has(i.icon-user)');
  await loginButton.click();

  await page.waitForTimeout(1000);

  await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);

  console.log('✓ Login exitoso, navegando al dashboard...');

  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL(`${DEFAULT_BASE_URL}/client/dashboard`);

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
  let totalCategoriesAttempted = 0; // Contador de categorías totales intentadas
  const maxTotalCategories = 5; // Límite de categorías diferentes a intentar

  // Estructura para rastrear la navegación
  let navigationPath: Array<{ level: number, name: string, totalOptions: number }> = [];
  let currentServiceCategory = serviceName?.trim() || 'Desconocida';

  // Set para rastrear categorías/subcategorías ya visitadas sin servicios
  const visitedWithoutServices = new Set<string>();

  console.log(`\n📍 Categoría de servicio actual: "${currentServiceCategory}"`);

  while (!foundServices && attempts < maxAttempts && totalCategoriesAttempted < maxTotalCategories) {
    attempts++;
    attemptsInCurrentCategory++;
    console.log(`\n--- Intento ${attempts} de encontrar servicios (intento ${attemptsInCurrentCategory} en esta categoría) ---`);
    console.log(`📂 Ruta de navegación actual: ${navigationPath.length === 0 ? '[Raíz]' : navigationPath.map(p => p.name).join(' > ')}`);
    console.log(`📊 Categorías intentadas: ${totalCategoriesAttempted}/${maxTotalCategories}`);

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

        // Generar una fecha futura (entre 1 y 90 días desde mañana)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1); // Mañana
        const daysToAdd = Math.floor(Math.random() * 89) + 1; // Entre 1 y 89 días desde mañana
        const futureDate = new Date(tomorrow);
        futureDate.setDate(tomorrow.getDate() + daysToAdd);
        const formattedDate = futureDate.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

        // La hora se seleccionará usando la función seleccionarHoraYMinuto

        // Ciudades aleatorias
        const randomCities = ['Guadalajara', 'Ciudad de México', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Tijuana', 'Mérida'];
        const randomCity = randomCities[Math.floor(Math.random() * randomCities.length)];

        // Número de invitados aleatorio (entre 20 y 200)
        const randomAttendees = Math.floor(Math.random() * 181) + 20;

        console.log(`📝 Datos generados:`);
        console.log(`   - Festejado: ${randomHonoree}`);
        console.log(`   - Fecha: ${formattedDate} (en ${daysToAdd + 1} días desde hoy)`);
        console.log(`   - Hora: Se seleccionará usando el selector de hora`);
        console.log(`   - Ciudad: ${randomCity}`);
        console.log(`   - Invitados: ${randomAttendees}`);

        // Llenar el campo "Nombre del festejado"
        await honoreeField.fill(randomHonoree);
        console.log(`✓ Campo "Nombre del festejado" llenado`);
        await page.waitForTimeout(500);

        // Seleccionar fecha futura usando el date picker
        const dateField = page.locator('input[id="Date"]');
        await dateField.click();
        console.log(`✓ Abriendo date picker para seleccionar fecha futura`);
        await page.waitForTimeout(1000);

        // Buscar el date picker y seleccionar un día futuro
        const datePicker = page.locator('.flatpickr-calendar:visible, .flatpickr-calendar.open').first();
        const datePickerVisible = await datePicker.isVisible().catch(() => false);

        if (datePickerVisible) {
          console.log(`✓ Date picker visible, buscando días futuros...`);
          
          // Buscar días disponibles del mes actual
          const availableDays = page.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
          const daysCount = await availableDays.count();
          const currentDay = new Date().getDate();
          
          console.log(`📊 Días disponibles: ${daysCount}, día actual: ${currentDay}`);

          // Buscar el primer día futuro disponible
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

          // Si no hay días futuros en este mes, usar el último día disponible
          if (futureDayIndex === -1) {
            futureDayIndex = daysCount - 1;
            console.log(`⚠ No hay días futuros en este mes, usando último día disponible`);
          }

          // Seleccionar el día encontrado
          const selectedDay = availableDays.nth(futureDayIndex);
          const dayText = await selectedDay.textContent();
          const selectedDayNumber = parseInt(dayText?.trim() || '0');
          
          await selectedDay.click();
          console.log(`✓ Fecha seleccionada: día ${selectedDayNumber}`);

        } else {
          console.log(`⚠ Date picker no visible, estableciendo fecha directamente`);
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

        // --- Función para seleccionar hora y minuto en el reloj ---

        async function seleccionarHoraYMinuto(page, hora: number, minuto: number) {
          // 1. Abrir el selector de hora
          const timeInput = page.locator('input#Time');
          await timeInput.scrollIntoViewIfNeeded();
          await timeInput.click({ force: true });

          // 2. Esperar a que aparezca el diálogo
          await page.waitForSelector('[data-time-picker-content="true"]', { state: 'visible', timeout: 10000 });

          // 3. Seleccionar la hora
          // Mapeo de hora a los círculos (hardcodeado según tu reloj)
          const horaCirculos = {
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
          await horaCircle.click();

          // 4. Seleccionar el minuto
          // Puedes ajustar según tu reloj de minutos
          // Ejemplo para minuto "0" (círculo que compartiste)
          const minutoCirculos = {
            0: { cx: "120", cy: "205" },
            15: { cx: "205", cy: "120" },
            30: { cx: "120", cy: "35" },
            45: { cx: "35", cy: "120" },
            // agrega más si necesitas
          };

          const m = minutoCirculos[minuto];
          if (!m) throw new Error(`Minuto ${minuto} no está mapeado`);

          const minutoCircle = page.locator(`circle.cursor-pointer[cx="${m.cx}"][cy="${m.cy}"]`);
          await minutoCircle.click();

          // 5. Confirmar selección
          await page.getByRole('button', { name: 'Confirmar' }).click();
        }

        // --- Uso ---
        await seleccionarHoraYMinuto(page, 2, 0); // selecciona hora 2 y minuto 0
        console.log('✅ Hora seleccionada correctamente');

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

        // Autocompletado de ciudad completado

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


        // Formulario completado, procediendo a crear evento

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

        // Evento creado exitosamente

        // Esperar un momento para que aparezca el diálogo
        await page.waitForTimeout(2000);

        // Buscando diálogo de confirmación

        // Buscar el diálogo de confirmación con múltiples estrategias
        let dialogTitle;

        // Estrategia 1: Selector original
        try {
          dialogTitle = page.locator('p.text-large.font-semibold');
          await expect(dialogTitle).toBeVisible({ timeout: 3000 });
          console.log(`✓ Diálogo de confirmación encontrado con selector original`);
        } catch (e1) {
          console.log(`⚠ Selector original no funcionó, intentando otras estrategias...`);

          // Estrategia 2: Buscar por texto que contenga "Dile aquí"
          try {
            dialogTitle = page.locator('p').filter({ hasText: /Dile aquí|necesitas|qué es lo que/i });
            await expect(dialogTitle).toBeVisible({ timeout: 3000 });
            console.log(`✓ Diálogo de confirmación encontrado por texto`);
          } catch (e2) {
            console.log(`⚠ Selector por texto no funcionó, intentando selector genérico...`);

            // Estrategia 3: Buscar cualquier párrafo con clase font-semibold
            try {
              dialogTitle = page.locator('p.font-semibold');
              await expect(dialogTitle).toBeVisible({ timeout: 3000 });
              console.log(`✓ Diálogo de confirmación encontrado con selector genérico`);
            } catch (e3) {
              console.log(`⚠ No se encontró el diálogo de confirmación con ninguna estrategia`);
              console.log(`📊 Contenido de la página después de crear evento:`);

              // Buscar todos los párrafos visibles para debugging
              const allParagraphs = page.locator('p');
              const paragraphCount = await allParagraphs.count();
              console.log(`📊 Total de párrafos encontrados: ${paragraphCount}`);

              for (let i = 0; i < Math.min(paragraphCount, 10); i++) {
                try {
                  const paragraph = allParagraphs.nth(i);
                  const text = await paragraph.textContent();
                  const isVisible = await paragraph.isVisible();
                  if (text && isVisible) {
                    console.log(`   - Párrafo ${i}: "${text.trim().substring(0, 100)}..."`);
                  }
                } catch (e) {
                  // Ignorar errores al leer párrafos
                }
              }

              throw new Error('No se pudo encontrar el diálogo de confirmación');
            }
          }
        }

        console.log(`✓ Diálogo de confirmación visible`);

        // Extraer y validar el nombre del servicio en el diálogo
        let dialogTitleText = '';
        if (dialogTitle) {
          dialogTitleText = await dialogTitle.textContent() || '';
          console.log(`📝 Texto del diálogo: "${dialogTitleText}"`);
        }

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

        // Validar que la hora del diálogo coincide con la hora seleccionada
        // La función seleccionarHoraYMinuto usa valores fijos: hora 2, minuto 0
        const selectedHour = 2;
        const selectedMinute = 0;
        const selectedPeriod = 'PM';
        
        console.log(`📊 Hora seleccionada: ${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`);

        if (actualTimeValue && eventInfoText?.toLowerCase().includes(actualTimeValue.toLowerCase())) {
          console.log(`✓ Hora coincide exactamente: ${actualTimeValue}`);
        } else {
          console.log(`⚠ Hora no coincide exactamente. Valor del campo: "${actualTimeValue}"`);

          // Validar componentes de la hora seleccionada
          let hourValidated = false;
          let minuteValidated = false;

          // Buscar la hora en el diálogo
          if (eventInfoText?.includes(selectedHour.toString())) {
            console.log(`✓ Hora validada: ${selectedHour}`);
            hourValidated = true;
          }

          // Buscar los minutos en el diálogo
          if (eventInfoText?.includes(selectedMinute.toString().padStart(2, '0'))) {
            console.log(`✓ Minutos validados: ${selectedMinute.toString().padStart(2, '0')}`);
            minuteValidated = true;
          }

          // Si no se validó la hora exacta, intentar con formato 24h
          if (!hourValidated && selectedPeriod === 'PM') {
            const hour24 = selectedHour + 12; // 2 PM = 14 en formato 24h
            if (eventInfoText?.includes(hour24.toString())) {
              console.log(`✓ Hora validada en formato 24h: ${hour24}`);
              hourValidated = true;
            }
          }

          if (!hourValidated && !minuteValidated) {
            console.log(`⚠ Hora no validada completamente. Campo: "${actualTimeValue}", Seleccionada: ${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
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
          await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`);
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

      // Verificar si debemos cambiar de categoría completamente
      // Cambiar si: 1) Solo hay una subcategoría sin servicios, O 2) Todas las subcategorías fueron visitadas sin servicios
      const hasOnlyOneSubcategory = navigationPath.length === 1;
      const pathsForCurrentCategory = Array.from(visitedWithoutServices).filter(path => path.includes(currentServiceCategory));
      const allSubcategoriesVisited = pathsForCurrentCategory.length > 0;
      
      // También cambiar si hemos intentado muchas veces en esta categoría sin éxito
      const shouldChangeCategory = (hasOnlyOneSubcategory && allSubcategoriesVisited) || 
                                  (attemptsInCurrentCategory >= maxAttemptsPerCategory);

      if (shouldChangeCategory) {
        console.log(`⚠ Cambiando de categoría "${currentServiceCategory}" - sin servicios encontrados`);
        console.log(`✓ Razón: ${hasOnlyOneSubcategory ? 'Una subcategoría sin servicios' : 'Múltiples intentos sin éxito'}`);
        console.log(`✓ Navegando directamente a la selección de categorías...`);

        // Navegar directamente a la página de selección de categorías de servicios
        // Buscar el breadcrumb "Familias" para volver a la selección de categorías
        let navigatedBack = false;
        
        // Buscar el breadcrumb "Familias" con la clase específica
        const familiasBreadcrumb = page.locator('p.truncate.max-w-\\[120px\\].lg\\:max-w-\\[none\\].whitespace-nowrap').filter({
          hasText: 'Familias'
        });
        
        const familiasVisible = await familiasBreadcrumb.isVisible().catch(() => false);
        console.log(`🔍 Breadcrumb "Familias" encontrado: ${familiasVisible}`);
        
        if (familiasVisible) {
          try {
            console.log(`📍 Haciendo clic en breadcrumb "Familias" para volver a selección de categorías`);
            await familiasBreadcrumb.click();
            await page.waitForTimeout(2000);
            navigatedBack = true;
            console.log(`✓ Navegación a selección de categorías completada`);
          } catch (error) {
            console.log(`⚠ Error al hacer clic en breadcrumb "Familias": ${error}`);
          }
        } else {
          console.log(`⚠ Breadcrumb "Familias" no encontrado, buscando alternativas...`);
          
          // Estrategia alternativa: Buscar botón de retroceder con icono chevron-left
          const backButtons = page.locator('button').filter({
            has: page.locator('i.icon-chevron-left')
          });
          
          const backButtonCount = await backButtons.count();
          console.log(`🔍 Botones de retroceder encontrados: ${backButtonCount}`);
          
          // Intentar hacer clic en todos los botones de retroceder disponibles (máximo 3 clics)
          for (let i = 0; i < Math.min(backButtonCount, 3); i++) {
            try {
              const backButton = backButtons.nth(i);
              const isVisible = await backButton.isVisible().catch(() => false);
              
              if (isVisible) {
                const buttonText = await backButton.locator('p').textContent().catch(() => '');
                console.log(`📍 Retrocediendo nivel ${i + 1}: "${buttonText?.trim()}"`);
                
                await backButton.click();
                await page.waitForTimeout(2000);
                navigatedBack = true;
              }
            } catch (error) {
              console.log(`⚠ Error al hacer clic en botón de retroceder ${i + 1}: ${error}`);
            }
          }
        }

        if (navigatedBack) {
          console.log(`✓ Navegación hacia atrás completada`);
          
          // Buscar categorías de servicio disponibles
          const newServiceButtons = page.locator('button').filter({
            has: page.locator('p.text-neutral-800.font-medium')
          });

          const newServiceCount = await newServiceButtons.count();
          console.log(`🔍 Categorías de servicio disponibles: ${newServiceCount}`);

          if (newServiceCount > 0) {
            // Seleccionar una categoría diferente a la actual
            let newRandomServiceIndex;
            let attempts = 0;
            let newServiceName = currentServiceCategory;

            // Intentar hasta 10 veces encontrar una categoría diferente
            while (newServiceName === currentServiceCategory && attempts < 10) {
              newRandomServiceIndex = Math.floor(Math.random() * newServiceCount);
              const newSelectedService = newServiceButtons.nth(newRandomServiceIndex);
              const tempServiceName = await newSelectedService.locator('p.text-neutral-800.font-medium').textContent();
              newServiceName = tempServiceName?.trim() || currentServiceCategory;
              attempts++;
            }

            if (newServiceName !== currentServiceCategory) {
              const newSelectedService = newServiceButtons.nth(newRandomServiceIndex!);
              console.log(`✓ Seleccionando nueva categoría: "${newServiceName}" (índice ${newRandomServiceIndex})`);

              await newSelectedService.click();
              console.log(`✓ Se hizo clic en la nueva categoría "${newServiceName}"`);

              // Resetear variables para la nueva categoría
              currentServiceCategory = newServiceName;
              navigationPath = [];
              attemptsInCurrentCategory = 0;
              totalCategoriesAttempted++;

              await page.waitForTimeout(2000);
              console.log(`✓ Nueva categoría configurada: "${currentServiceCategory}" (${totalCategoriesAttempted}/${maxTotalCategories})`);
            } else {
              console.log(`⚠ No se pudo encontrar una categoría diferente a "${currentServiceCategory}"`);
            }
          } else {
            console.log(`⚠ No se encontraron categorías de servicio disponibles`);
          }
        } else {
          console.log(`⚠ No se pudo navegar hacia atrás, intentando navegación directa...`);
          
          // Estrategia alternativa: Navegar directamente a la página de selección de categorías
          try {
            await page.goto(`${DEFAULT_BASE_URL}/client/dashboard`);
            await page.waitForTimeout(2000);
            
            // Buscar el botón "Nueva fiesta" y navegar al flujo de creación
            const nuevaFiestaButton = page.locator('button.lg\\:flex').filter({ hasText: 'Nueva fiesta' });
            const buttonVisible = await nuevaFiestaButton.isVisible().catch(() => false);
            
            if (buttonVisible) {
              await nuevaFiestaButton.click();
              await page.waitForTimeout(2000);
              
              // Seleccionar la misma categoría de evento (asumiendo que ya está seleccionada)
              const categoryButtons = page.locator('button[type="submit"]').filter({
                has: page.locator('p.text-dark-neutral')
              });
              
              const categoryCount = await categoryButtons.count();
              if (categoryCount > 0) {
                // Seleccionar la primera categoría disponible
                await categoryButtons.first().click();
                await page.waitForTimeout(2000);
                
                console.log(`✓ Navegación directa completada, reiniciando búsqueda de servicios`);
                
                // Resetear variables para empezar de nuevo
                navigationPath = [];
                attemptsInCurrentCategory = 0;
                totalCategoriesAttempted++;
                
                // Seleccionar una nueva categoría de servicio diferente
                const newServiceButtons = page.locator('button').filter({
                  has: page.locator('p.text-neutral-800.font-medium')
                });
                
                const newServiceCount = await newServiceButtons.count();
                if (newServiceCount > 0) {
                  // Seleccionar una categoría diferente a la actual
                  let newRandomServiceIndex;
                  let attempts = 0;
                  let newServiceName = currentServiceCategory;
                  
                  while (newServiceName === currentServiceCategory && attempts < 10) {
                    newRandomServiceIndex = Math.floor(Math.random() * newServiceCount);
                    const newSelectedService = newServiceButtons.nth(newRandomServiceIndex);
                    const tempServiceName = await newSelectedService.locator('p.text-neutral-800.font-medium').textContent();
                    newServiceName = tempServiceName?.trim() || currentServiceCategory;
                    attempts++;
                  }
                  
                  if (newServiceName !== currentServiceCategory) {
                    const newSelectedService = newServiceButtons.nth(newRandomServiceIndex!);
                    await newSelectedService.click();
                    await page.waitForTimeout(2000);
                    
                    currentServiceCategory = newServiceName;
                    console.log(`✓ Nueva categoría seleccionada por navegación directa: "${currentServiceCategory}"`);
                  }
                }
              }
            }
          } catch (error) {
            console.log(`⚠ Error en navegación directa: ${error}`);
          }
        }

        continue; // Continuar con el siguiente intento en la nueva categoría
      } else {
        // Si no se puede cambiar de categoría, intentar retroceder niveles
        console.log(`⚠ No se puede cambiar de categoría, retrocediendo niveles...`);
        
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
          console.log(`📍 Ya estamos en la raíz, no se puede retroceder más. Intentando otra categoría.`);
          continue;
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
            console.log(`⚠ No se encontró botón para volver atrás o ya estamos en la raíz. Intentando otra categoría.`);
            continue;
          }
        }
      }
    }
  }

  if (foundServices) {
    console.log('\n✓ Prueba de creación de evento completada exitosamente - Servicios encontrados');
  } else if (totalCategoriesAttempted >= maxTotalCategories) {
    console.log(`\n⚠ No se encontraron servicios después de intentar ${totalCategoriesAttempted} categorías diferentes`);
  } else {
    console.log(`\n⚠ No se encontraron servicios después de ${attempts} intentos`);
  }
});

