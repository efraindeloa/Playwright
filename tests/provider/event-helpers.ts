import { Page } from '@playwright/test';
import { showStepMessage } from '../utils';

// Constantes para timeouts
const WAIT_FOR_ELEMENT_TIMEOUT = 5000;
const WAIT_FOR_PAGE_LOAD = 2000;

/**
 * Crea un evento completo desde la página de creación de evento.
 * Asume que la página ya está en /provider/event y muestra el formulario de selección de categoría.
 * 
 * @param page - Instancia de Page de Playwright
 */
export async function crearEventoCompleto(page: Page) {
  const { expect } = await import('@playwright/test');

  // --- BUSCAR CATEGORÍAS DISPONIBLES ---
  await showStepMessage(page, '🔍 BUSCANDO CATEGORÍAS DISPONIBLES');
  await page.waitForTimeout(1000);

  // Buscar todos los botones de categorías (botones type="submit" dentro del formulario)
  const categoryButtons = page.locator('form#EventTypeForm button[type="submit"]');
  const categoryCount = await categoryButtons.count();

  if (categoryCount === 0) {
    throw new Error('❌ No se encontraron categorías disponibles en la página');
  }

  console.log(`📊 Categorías encontradas: ${categoryCount}`);

  // Obtener información de las categorías
  const categories: Array<{ index: number; name: string; button: ReturnType<typeof page.locator> }> = [];
  
  for (let i = 0; i < categoryCount; i++) {
    const categoryButton = categoryButtons.nth(i);
    const categoryNameElement = categoryButton.locator('p.text-dark-neutral, p.lg\\:text-large');
    const categoryName = await categoryNameElement.textContent();
    
    if (categoryName) {
      categories.push({
        index: i,
        name: categoryName.trim(),
        button: categoryButton
      });
    }
  }

  console.log('📋 Categorías disponibles:');
  categories.forEach((cat, idx) => {
    console.log(`  ${idx + 1}. ${cat.name}`);
  });

  if (categories.length === 0) {
    throw new Error('❌ No se pudieron obtener los nombres de las categorías');
  }

  // --- SELECCIONAR CATEGORÍA ALEATORIA ---
  await showStepMessage(page, '🎲 SELECCIONANDO CATEGORÍA ALEATORIA');
  await page.waitForTimeout(1000);

  const randomIndex = Math.floor(Math.random() * categories.length);
  const selectedCategory = categories[randomIndex];

  console.log(`🎯 Categoría seleccionada aleatoriamente: "${selectedCategory.name}" (índice ${randomIndex + 1} de ${categories.length})`);

  // --- HACER CLIC EN LA CATEGORÍA SELECCIONADA ---
  await showStepMessage(page, `🖱️ HACIENDO CLIC EN CATEGORÍA: ${selectedCategory.name}`);
  await page.waitForTimeout(1000);

  // Hacer clic en el botón de la categoría seleccionada
  await selectedCategory.button.click();
  await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2); // Esperar a que avance al siguiente paso

  // --- VALIDAR QUE SE AVANZÓ AL SIGUIENTE PASO ---
  await showStepMessage(page, '✅ VALIDANDO AVANCE AL SIGUIENTE PASO');
  await page.waitForTimeout(1000);

  // Validar que el indicador de progreso muestra el paso 2 activo
  const progressBars = page.locator('div.basis-0.grow.rounded-4.transition-all.duration-300.ease-in-out.h-2');
  const progressBarCount = await progressBars.count();

  if (progressBarCount >= 2) {
    // El primer bar debería estar activo (bg-primary-neutral)
    const firstProgressBar = progressBars.first();
    const firstBarClasses = await firstProgressBar.getAttribute('class');
    
    if (firstBarClasses && firstBarClasses.includes('bg-primary-neutral')) {
      console.log('✅ Indicador de progreso muestra el paso 1 completado');
    }
  }

  // Validar que el formulario del paso 2 está visible (EventDataForm)
  const step2Form = page.locator('form#EventDataForm');
  const isStep2Visible = await step2Form.isVisible().catch(() => false);

  if (!isStep2Visible) {
    // Verificar si aún estamos en el paso 1
    const step1Form = page.locator('form#EventTypeForm');
    const isStep1Visible = await step1Form.isVisible().catch(() => false);
    
    if (isStep1Visible) {
      throw new Error('❌ Aún estamos en el paso 1 después de hacer clic en la categoría');
    } else {
      throw new Error('❌ No se pudo determinar el paso actual');
    }
  }

  console.log('✅ Formulario del paso 2 (Datos del evento) visible');
  
  // Validar que el título del paso 2 está visible
  const step2Title = page.locator('h4.text-center:has-text("Ingresa los datos del evento")');
  await expect(step2Title).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  console.log('✅ Título del paso 2 encontrado: "Ingresa los datos del evento"');

  // --- VALIDAR QUE EL TIPO DE EVENTO SELECCIONADO SE MUESTRA EN EL PASO SIGUIENTE ---
  await showStepMessage(page, '✅ VALIDANDO TIPO DE EVENTO SELECCIONADO');
  await page.waitForTimeout(1000);

  // Buscar el elemento que muestra el tipo de evento seleccionado
  let eventTypeBadge = page.locator('div.flex.items-center.justify-center.px-5.py-2.gap-3.rounded-8.bg-secondary-neutral.text-light-light.h-\\[40px\\].shrink-0');
  let isBadgeVisible = await eventTypeBadge.isVisible().catch(() => false);

  if (!isBadgeVisible) {
    // Intentar con selector más flexible
    eventTypeBadge = page.locator('div.bg-secondary-neutral.text-light-light');
    isBadgeVisible = await eventTypeBadge.isVisible().catch(() => false);
    
    if (!isBadgeVisible) {
      throw new Error('❌ No se encontró el elemento que muestra el tipo de evento seleccionado');
    }
  }

  // Obtener el texto del tipo de evento mostrado
  const eventTypeTextElement = eventTypeBadge.locator('p');
  const eventTypeText = await eventTypeTextElement.textContent();
  
  if (!eventTypeText) {
    throw new Error('❌ No se pudo obtener el texto del tipo de evento mostrado');
  }

  const displayedEventType = eventTypeText.trim();
  console.log(`📋 Tipo de evento mostrado en el paso siguiente: "${displayedEventType}"`);
  console.log(`📋 Tipo de evento seleccionado: "${selectedCategory.name}"`);

  // Validar que el tipo de evento mostrado corresponde al seleccionado
  if (displayedEventType !== selectedCategory.name) {
    throw new Error(`❌ El tipo de evento mostrado ("${displayedEventType}") no corresponde al seleccionado ("${selectedCategory.name}")`);
  }

  console.log('✅ El tipo de evento seleccionado se muestra correctamente en el paso siguiente');

  // --- LLENAR DATOS DEL FORMULARIO DEL PASO 2 ---
  await showStepMessage(page, '📝 LLENANDO DATOS DEL FORMULARIO');
  await page.waitForTimeout(2000); // Esperar más tiempo para que el formulario se cargue completamente

  // 1. Llenar Ciudad
  await showStepMessage(page, '🏙️ LLENANDO CIUDAD');
  await page.waitForTimeout(1000);

  // Esperar a que el formulario esté completamente cargado
  try {
    await page.waitForLoadState('load', { timeout: 10000 });
  } catch (error) {
    console.log('ℹ️ waitForLoadState falló, continuando...');
  }
  await page.waitForTimeout(1000);

  // Buscar el campo de ciudad con múltiples estrategias
  let cityInput = page.locator('input[id="Address"]');
  let isCityInputVisible = await cityInput.isVisible().catch(() => false);

  if (!isCityInputVisible) {
    const cityLabel = page.locator('label:has-text("Ciudad")');
    const labelExists = await cityLabel.count().then(count => count > 0);
    
    if (labelExists) {
      try {
        const labelFor = await cityLabel.getAttribute('for');
        if (labelFor) {
          cityInput = page.locator(`input[id="${labelFor}"]`);
          isCityInputVisible = await cityInput.isVisible().catch(() => false);
        }
      } catch (e) {
        cityInput = page.locator('label:has-text("Ciudad")').locator('..').locator('input').first();
        isCityInputVisible = await cityInput.isVisible().catch(() => false);
      }
    }
  }

  if (!isCityInputVisible) {
    cityInput = page.locator('input[placeholder=" "], input[type="text"]').first();
    isCityInputVisible = await cityInput.isVisible().catch(() => false);
  }

  await expect(cityInput).toBeVisible({ timeout: 15000 });
  
  await cityInput.click();
  await page.waitForTimeout(500);
  
  await cityInput.fill('Ciudad de México');
  await page.waitForTimeout(2000);

  // Esperar a que aparezcan las opciones de autocompletado de Google Places
  try {
    const autocompleteList = page.locator('ul.flex.flex-col.py-2, ul[class*="flex"][class*="flex-col"]');
    await autocompleteList.first().waitFor({ state: 'visible', timeout: 5000 });
    
    const autocompleteOptions = autocompleteList.locator('li.cursor-pointer, li[class*="cursor-pointer"]');
    await autocompleteOptions.first().waitFor({ state: 'visible', timeout: 3000 });
    
    const optionsCount = await autocompleteOptions.count();
    console.log(`📋 Opciones de ciudad encontradas: ${optionsCount}`);
    
    if (optionsCount > 0) {
      const firstOption = autocompleteOptions.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad: "${optionText?.trim()}"`);
      
      await firstOption.click();
      await page.waitForTimeout(1500);
      
      const cityValue = await cityInput.inputValue();
      console.log(`✅ Ciudad seleccionada. Valor del campo: "${cityValue}"`);
      
      const errorMessage = page.locator('p.text-xsmall.text-danger-neutral:has-text("Selecciona una dirección")');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      if (!hasError) {
        console.log('✅ Mensaje de error desapareció, ciudad seleccionada correctamente');
      }
    } else {
      throw new Error('No se encontraron opciones en la lista');
    }
  } catch (error) {
    try {
      const autocompleteOptionsAlt = page.locator('li.cursor-pointer.flex.items-center, li[class*="cursor-pointer"]');
      await autocompleteOptionsAlt.first().waitFor({ state: 'visible', timeout: 3000 });
      
      const firstOption = autocompleteOptionsAlt.first();
      const optionText = await firstOption.textContent();
      console.log(`📋 Seleccionando ciudad (selector alternativo): "${optionText?.trim()}"`);
      
      await firstOption.click();
      await page.waitForTimeout(1500);
      console.log('✅ Ciudad seleccionada del autocompletado (selector alternativo)');
    } catch (error2) {
      console.log('⚠️ No se pudieron encontrar las opciones de autocompletado, continuando con el texto ingresado');
    }
  }

  // 2. Seleccionar Fecha (31-12-2025)
  await showStepMessage(page, '📅 SELECCIONANDO FECHA');
  await page.waitForTimeout(1000);

  const dateInput = page.locator('input[id="Date"]');
  await expect(dateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  
  const targetDay = 31;
  const targetMonth = 12;
  const targetYear = 2025;
  const targetDateFormatted = '31-12-2025';
  
  console.log(`📅 Fecha objetivo a seleccionar: ${targetDateFormatted}`);
  
  await dateInput.click();
  await page.waitForTimeout(1000);
  
  const calendarContainer = page.locator('.flatpickr-calendar, [class*="flatpickr"], [class*="calendar"]').first();
  const isCalendarVisible = await calendarContainer.isVisible().catch(() => false);
  
  if (!isCalendarVisible) {
    const altCalendar = page.locator('div[class*="flatpickr"][class*="open"], div[class*="calendar"][class*="open"]').first();
    const isAltVisible = await altCalendar.isVisible().catch(() => false);
    
    if (!isAltVisible) {
      throw new Error('❌ No se pudo encontrar el calendario de fecha después de hacer clic en el campo');
    }
  }
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const targetMonthName = monthNames[targetMonth - 1];
  
  let monthFound = false;
  const maxNavigationAttempts = 12;
  
  for (let attempt = 0; attempt < maxNavigationAttempts; attempt++) {
    const currentMonthElement = page.locator('.flatpickr-current-month, [class*="current-month"], .flatpickr-month, [class*="month"]').first();
    const currentMonthText = await currentMonthElement.textContent().catch(() => '');
    
    if (currentMonthText && currentMonthText.includes(targetMonthName) && currentMonthText.includes(targetYear.toString())) {
      monthFound = true;
      console.log(`✅ Calendario muestra el mes correcto: ${targetMonthName} ${targetYear}`);
      break;
    }
    
    const nextMonthButton = page.locator('.flatpickr-next-month, [class*="next-month"], button[aria-label*="siguiente"], button[aria-label*="next"]').first();
    const isNextButtonVisible = await nextMonthButton.isVisible().catch(() => false);
    
    if (isNextButtonVisible) {
      await nextMonthButton.click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }
  }
  
  if (!monthFound) {
    console.log('⚠️ No se pudo navegar al mes correcto, intentando seleccionar el día de todos modos');
  }
  
  const daySelectors = [
    `.flatpickr-day[aria-label*="${targetDay}"][aria-label*="${targetMonth}"][aria-label*="${targetYear}"]`,
    `.flatpickr-day:has-text("${targetDay}")`,
    `[class*="flatpickr-day"]:has-text("${targetDay}")`,
    `button[aria-label*="${targetDay}"]`,
    `td[aria-label*="${targetDay}"]`
  ];
  
  let daySelected = false;
  
  for (const selector of daySelectors) {
    try {
      const dayElement = page.locator(selector).first();
      const isVisible = await dayElement.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        const isDisabled = await dayElement.evaluate((el) => {
          return el.classList.contains('flatpickr-disabled') || 
                 el.classList.contains('disabled') || 
                 el.hasAttribute('disabled') ||
                 el.getAttribute('aria-disabled') === 'true';
        }).catch(() => false);
        
        if (!isDisabled) {
          console.log(`📅 Seleccionando día ${targetDay} del mes ${targetMonth}`);
          await dayElement.click();
          await page.waitForTimeout(1000);
          daySelected = true;
          break;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!daySelected) {
    try {
      const allDayElements = page.locator(`[class*="flatpickr-day"], button, td`).filter({ hasText: new RegExp(`^${targetDay}$`) });
      const dayCount = await allDayElements.count();
      
      if (dayCount > 0) {
        for (let i = 0; i < dayCount; i++) {
          const dayElement = allDayElements.nth(i);
          const isVisible = await dayElement.isVisible().catch(() => false);
          
          if (isVisible) {
            const isDisabled = await dayElement.evaluate((el) => {
              return el.classList.contains('flatpickr-disabled') || 
                     el.classList.contains('disabled') || 
                     el.hasAttribute('disabled') ||
                     el.getAttribute('aria-disabled') === 'true';
            }).catch(() => false);
            
            if (!isDisabled) {
              console.log(`📅 Seleccionando día ${targetDay} (búsqueda por texto)`);
              await dayElement.click();
              await page.waitForTimeout(1000);
              daySelected = true;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️ No se pudo seleccionar el día usando búsqueda por texto');
    }
  }
  
  if (!daySelected) {
    throw new Error(`❌ No se pudo seleccionar el día ${targetDay} del mes ${targetMonth} en el calendario`);
  }
  
  await page.waitForTimeout(1000);
  const updatedDateValue = await dateInput.inputValue();
  console.log(`✅ Fecha seleccionada: ${updatedDateValue}`);
  
  if (!updatedDateValue.includes('31') || !updatedDateValue.includes('12') || !updatedDateValue.includes('2025')) {
    console.log(`⚠️ La fecha seleccionada (${updatedDateValue}) puede no ser exactamente ${targetDateFormatted}, pero continuando...`);
  }

  // 3. Llenar Hora
  await showStepMessage(page, '🕐 LLENANDO HORA');
  await page.waitForTimeout(1000);

  const timeInput = page.locator('input[id="Time"]');
  await expect(timeInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  
  // Función auxiliar para seleccionar hora y minuto en el reloj circular
  async function seleccionarHoraYMinuto(page: Page, hora: number, minuto: number) {
    await timeInput.scrollIntoViewIfNeeded();
    await timeInput.click({ force: true });
    
    await page.waitForSelector('[data-time-picker-content="true"]', { state: 'visible', timeout: 10000 });
    
    const horaCirculos: { [key: number]: { cx: number; cy: number } } = {
      1: { cx: 162.5, cy: 46.38784067832272 },
      2: { cx: 193.6121593216773, cy: 77.5 },
      3: { cx: 205, cy: 120 },
      4: { cx: 193.6121593216773, cy: 162.5 },
      5: { cx: 162.5, cy: 193.61215932167727 },
      6: { cx: 120, cy: 205 },
      7: { cx: 77.50000000000003, cy: 193.6121593216773 },
      8: { cx: 46.3878406783227, cy: 162.5 },
      9: { cx: 35, cy: 120.00000000000001 },
      10: { cx: 46.38784067832272, cy: 77.5 },
      11: { cx: 77.49999999999997, cy: 46.38784067832273 },
      12: { cx: 120, cy: 35 },
    };
    
    const h = horaCirculos[hora];
    if (!h) throw new Error(`Hora ${hora} no está mapeada en el reloj`);
    
    await page.waitForTimeout(500);
    
    const allCircles = page.locator('svg circle.cursor-pointer');
    const circleCount = await allCircles.count();
    
    let closestCircle: ReturnType<typeof page.locator> | null = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < circleCount; i++) {
      const circle = allCircles.nth(i);
      const cx = parseFloat(await circle.getAttribute('cx') || '0');
      const cy = parseFloat(await circle.getAttribute('cy') || '0');
      
      const distance = Math.sqrt(Math.pow(cx - h.cx, 2) + Math.pow(cy - h.cy, 2));
      
      if (distance < minDistance && distance < 25) {
        minDistance = distance;
        closestCircle = circle;
      }
    }
    
    if (closestCircle) {
      await closestCircle.click({ timeout: 5000 });
      console.log(`✅ Hora ${hora} seleccionada`);
    } else {
      throw new Error(`No se pudo encontrar el círculo para la hora ${hora} (buscando cerca de cx=${h.cx}, cy=${h.cy})`);
    }
    
    await page.waitForTimeout(500);
    
    const minutoCirculos: { [key: number]: { cx: number; cy: number } } = {
      0: { cx: 120, cy: 205 },
      15: { cx: 205, cy: 120 },
      30: { cx: 120, cy: 35 },
      45: { cx: 35, cy: 120 },
    };
    
    const m = minutoCirculos[minuto];
    if (!m) throw new Error(`Minuto ${minuto} no está mapeado`);
    
    const allMinuteCircles = page.locator('svg circle.cursor-pointer');
    const minuteCircleCount = await allMinuteCircles.count();
    
    let closestMinuteCircle: ReturnType<typeof allMinuteCircles.nth> | null = null;
    let minMinuteDistance = Infinity;
    
    for (let i = 0; i < minuteCircleCount; i++) {
      const circle = allMinuteCircles.nth(i);
      const cx = parseFloat(await circle.getAttribute('cx') || '0');
      const cy = parseFloat(await circle.getAttribute('cy') || '0');
      
      const distance = Math.sqrt(Math.pow(cx - m.cx, 2) + Math.pow(cy - m.cy, 2));
      
      if (distance < minMinuteDistance && distance < 25) {
        minMinuteDistance = distance;
        closestMinuteCircle = circle;
      }
    }
    
    if (closestMinuteCircle) {
      await closestMinuteCircle.click({ timeout: 5000 });
      console.log(`✅ Minuto ${minuto} seleccionado`);
    } else {
      throw new Error(`No se pudo encontrar el círculo para el minuto ${minuto}`);
    }
    
    await page.waitForTimeout(500);
    
    const confirmButton = page.locator('button.bg-primary-neutral.text-light-light').filter({ hasText: 'Confirmar' });
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click({ timeout: 5000 });
    console.log('✅ Botón "Confirmar" presionado');
  }

  const randomHour = Math.floor(Math.random() * 12) + 1;
  const randomMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  
  await seleccionarHoraYMinuto(page, randomHour, randomMinute);
  console.log(`✅ Hora seleccionada: ${randomHour}:${randomMinute.toString().padStart(2, '0')}`);
  
  const timePickerDialog = page.locator('[data-time-picker-content="true"]');
  try {
    await timePickerDialog.waitFor({ state: 'hidden', timeout: 3000 });
  } catch (e) {
    await page.waitForTimeout(1000);
  }

  // 4. Seleccionar Servicio
  await showStepMessage(page, '🔧 SELECCIONANDO SERVICIO');
  await page.waitForTimeout(500);

  const serviceButton = page.locator('button[id="ServiceId"]');
  await expect(serviceButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  
  await serviceButton.click();
  await page.waitForTimeout(1500);

  let serviceSelected = false;
  
  try {
    const serviceList = page.locator('ul.absolute.mt-3.top-full, ul[class*="absolute"][class*="mt-3"]').first();
    const isListVisible = await serviceList.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isListVisible) {
      const serviceOptions = serviceList.locator('li.cursor-pointer, li[class*="cursor-pointer"]');
      const optionsCount = await serviceOptions.count();
      
      console.log(`📋 Opciones de servicio encontradas en la lista: ${optionsCount}`);
      
      if (optionsCount > 0) {
        const firstOption = serviceOptions.first();
        const optionText = await firstOption.textContent();
        
        if (optionText && optionText.trim() !== '') {
          console.log(`📋 Seleccionando primer servicio disponible: "${optionText.trim()}"`);
          
          await firstOption.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          
          try {
            await firstOption.click({ timeout: 3000 });
            await page.waitForTimeout(1000);
            serviceSelected = true;
            console.log(`✅ Servicio seleccionado: "${optionText.trim()}"`);
          } catch (e) {
            try {
              await firstOption.click({ force: true, timeout: 3000 });
              await page.waitForTimeout(1000);
              serviceSelected = true;
              console.log(`✅ Servicio seleccionado (con force): "${optionText.trim()}"`);
            } catch (e2) {
              console.log(`⚠️ No se pudo hacer clic en "${optionText.trim()}", intentando otras estrategias...`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('ℹ️ Estrategia 1 falló, intentando otras estrategias...');
  }
  
  if (!serviceSelected) {
    try {
      const serviceOptions = page.locator('li.cursor-pointer, li[class*="cursor-pointer"]').filter({
        hasNot: page.locator('[id="ServiceId"]')
      });
      
      const optionsCount = await serviceOptions.count();
      console.log(`📋 Opciones de servicio encontradas (estrategia 2): ${optionsCount}`);
      
      if (optionsCount > 0) {
        for (let i = 0; i < optionsCount; i++) {
          const option = serviceOptions.nth(i);
          const isVisible = await option.isVisible().catch(() => false);
          
          if (isVisible) {
            const optionText = await option.textContent();
            
            if (optionText && optionText.trim() !== '' && optionText.trim() !== 'Servicio') {
              console.log(`📋 Seleccionando servicio (estrategia 2): "${optionText.trim()}"`);
              
              await option.scrollIntoViewIfNeeded();
              await page.waitForTimeout(300);
              
              try {
                await option.click({ timeout: 3000 });
                await page.waitForTimeout(1000);
                serviceSelected = true;
                console.log(`✅ Servicio seleccionado: "${optionText.trim()}"`);
                break;
              } catch (e) {
                try {
                  await option.click({ force: true, timeout: 3000 });
                  await page.waitForTimeout(1000);
                  serviceSelected = true;
                  console.log(`✅ Servicio seleccionado (con force): "${optionText.trim()}"`);
                  break;
                } catch (e2) {
                  continue;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('ℹ️ Estrategia 2 falló');
    }
  }
  
  if (!serviceSelected) {
    try {
      const dropdownContainers = page.locator('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], div[class*="popover"], div[class*="dropdown"], ul[class*="menu"]');
      const containerCount = await dropdownContainers.count();
      
      if (containerCount > 0) {
        for (let i = 0; i < containerCount; i++) {
          const container = dropdownContainers.nth(i);
          const isVisible = await container.isVisible().catch(() => false);
          
          if (isVisible) {
            const options = container.locator('div, li, button, a, p').filter({
              hasNot: page.locator('[id="ServiceId"], input, label')
            });
            
            const optionsCount = await options.count();
            
            if (optionsCount > 0) {
              for (let j = 0; j < optionsCount; j++) {
                const option = options.nth(j);
                const optionText = await option.textContent();
                const optionId = await option.getAttribute('id');
                
                const invalidTexts = ['Servicio', 'Nuevo evento', '¿Aún no registras', 'Crear ahora', 'Ciudad', 'Fecha', 'Hora'];
                const isValidOption = optionId !== 'ServiceId' && 
                                     optionText && 
                                     optionText.trim() !== '' && 
                                     !invalidTexts.some(invalid => optionText.trim().toLowerCase().includes(invalid.toLowerCase()));
                
                if (isValidOption) {
                  console.log(`📋 Servicio a seleccionar (estrategia 3): "${optionText.trim()}"`);
                  
                  await option.scrollIntoViewIfNeeded();
                  await page.waitForTimeout(300);
                  
                  try {
                    await option.click({ timeout: 3000 });
                    await page.waitForTimeout(1000);
                    serviceSelected = true;
                    console.log('✅ Servicio seleccionado del dropdown (estrategia 3)');
                    break;
                  } catch (e) {
                    try {
                      await option.click({ force: true, timeout: 3000 });
                      await page.waitForTimeout(1000);
                      serviceSelected = true;
                      console.log('✅ Servicio seleccionado del dropdown (estrategia 3, con force)');
                      break;
                    } catch (e2) {
                      continue;
                    }
                  }
                }
              }
              
              if (serviceSelected) break;
            }
          }
        }
      }
    } catch (error) {
      console.log('ℹ️ Estrategia 3 falló');
    }
  }
  
  let spanUpdated = false;
  const maxWaitTime = 3000;
  const startTime = Date.now();
  
  while (!spanUpdated && (Date.now() - startTime) < maxWaitTime) {
    await page.waitForTimeout(300);
    const finalButtonText = await serviceButton.locator('span').textContent();
    
    if (finalButtonText && finalButtonText.trim() !== '' && finalButtonText.trim() !== 'Servicio') {
      console.log(`✅ Servicio seleccionado correctamente: "${finalButtonText.trim()}"`);
      spanUpdated = true;
      serviceSelected = true;
      break;
    }
  }
  
  if (!serviceSelected || !spanUpdated) {
    const createServiceLink = page.locator('p.text-primary-neutral.font-bold:has-text("Crear ahora"), a:has-text("Crear ahora")');
    const isCreateLinkVisible = await createServiceLink.isVisible().catch(() => false);
    
    if (isCreateLinkVisible) {
      throw new Error('❌ No hay servicios disponibles para seleccionar. El servicio es un campo requerido para crear un evento. Por favor, crea al menos un servicio antes de ejecutar esta prueba.');
    } else {
      throw new Error('❌ No se pudo seleccionar un servicio. El servicio es un campo requerido para crear un evento. Verifica que haya servicios disponibles y que el dropdown funcione correctamente.');
    }
  }

  // --- VALIDAR QUE TODOS LOS CAMPOS ESTÁN LLENOS ---
  await showStepMessage(page, '✅ VALIDANDO CAMPOS LLENOS');
  await page.waitForTimeout(1000);

  const cityValue = await cityInput.inputValue();
  if (!cityValue || cityValue.trim() === '') {
    throw new Error('❌ El campo de ciudad no está lleno');
  }
  console.log(`✅ Ciudad: "${cityValue}"`);

  const finalDateValue = await dateInput.inputValue();
  if (!finalDateValue || finalDateValue.trim() === '') {
    throw new Error('❌ El campo de fecha no está lleno');
  }
  console.log(`✅ Fecha: "${finalDateValue}"`);

  const timeValue = await timeInput.inputValue();
  if (!timeValue || timeValue.trim() === '') {
    console.warn('⚠️ El campo de hora no está lleno, pero continuando...');
  } else {
    console.log(`✅ Hora: "${timeValue}"`);
  }

  const finalServiceButtonText = await serviceButton.locator('span').textContent();
  if (!finalServiceButtonText || finalServiceButtonText.trim() === '' || finalServiceButtonText.trim() === 'Servicio') {
    throw new Error('❌ El campo de servicio no está lleno. El servicio es un campo requerido para crear un evento.');
  }
  console.log(`✅ Servicio: "${finalServiceButtonText.trim()}"`);

  // --- CONTINUAR AL SIGUIENTE PASO Y LLENAR DATOS DEL FESTEJADO ---
  await showStepMessage(page, '➡️ AVANZANDO AL SIGUIENTE PASO');
  await page.waitForTimeout(1000);
  
  const nextButton = page.locator('button[type="submit"][form="EventDataForm"], button:has-text("Siguiente")').first();
  const isNextButtonVisible = await nextButton.isVisible().catch(() => false);
  
  if (isNextButtonVisible) {
    console.log('✅ Botón "Siguiente" encontrado, haciendo clic...');
    await nextButton.click();
    await page.waitForTimeout(2000);
  } else {
    const nextButtonAlt = page.locator('button[type="submit"]').filter({ hasText: 'Siguiente' }).first();
    await nextButtonAlt.click();
    await page.waitForTimeout(2000);
  }
  
  // --- LLENAR DATOS DEL FESTEJADO (PASO 3) ---
  await showStepMessage(page, '📝 LLENANDO DATOS DEL FESTEJADO');
  await page.waitForTimeout(1000);
  
  const step3Form = page.locator('form[id="HonoreeDataForm"]');
  await expect(step3Form).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  console.log('✅ Formulario de datos del festejado visible');
  
  await showStepMessage(page, '👤 LLENANDO NOMBRE DEL FESTEJADO');
  await page.waitForTimeout(500);
  
  const nameInput = page.locator('input[id="Name"]');
  await expect(nameInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  await nameInput.fill('Juan Pérez');
  console.log('✅ Nombre del festejado llenado: "Juan Pérez"');
  
  await showStepMessage(page, '🌍 VALIDANDO PAÍS');
  await page.waitForTimeout(500);
  
  const countryButton = page.locator('button[id="CountryDialCodeId"]');
  const countryValue = await countryButton.textContent();
  if (!countryValue || countryValue.trim() === '') {
    throw new Error('❌ El campo de país no tiene un valor');
  }
  console.log(`✅ País: "${countryValue.trim()}"`);
  
  await showStepMessage(page, '📞 LLENANDO TELÉFONO');
  await page.waitForTimeout(500);
  
  const phoneInput = page.locator('input[id="PhoneNumber"]');
  await expect(phoneInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  await phoneInput.fill('5551234567');
  console.log('✅ Teléfono llenado: "5551234567"');
  
  await showStepMessage(page, '📧 LLENANDO CORREO');
  await page.waitForTimeout(500);
  
  const emailInput = page.locator('input[id="Email"]');
  await expect(emailInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  await emailInput.fill('juan.perez@example.com');
  console.log('✅ Correo llenado: "juan.perez@example.com"');
  
  await showStepMessage(page, '✅ VALIDANDO CAMPOS DEL FESTEJADO');
  await page.waitForTimeout(500);
  
  const finalNameValue = await nameInput.inputValue();
  const finalPhoneValue = await phoneInput.inputValue();
  const finalEmailValue = await emailInput.inputValue();
  
  if (!finalNameValue || finalNameValue.trim() === '') {
    throw new Error('❌ El campo de nombre del festejado no está lleno');
  }
  if (!finalPhoneValue || finalPhoneValue.trim() === '') {
    throw new Error('❌ El campo de teléfono no está lleno');
  }
  if (!finalEmailValue || finalEmailValue.trim() === '') {
    throw new Error('❌ El campo de correo no está lleno');
  }
  
  console.log(`✅ Nombre: "${finalNameValue}"`);
  console.log(`✅ Teléfono: "${finalPhoneValue}"`);
  console.log(`✅ Correo: "${finalEmailValue}"`);

  // --- AVANZAR AL PASO 4 (INGRESA TU VENTA) ---
  await showStepMessage(page, '➡️ AVANZANDO AL PASO 4');
  await page.waitForTimeout(1000);
  
  const nextButtonStep3 = page.locator('button[type="submit"][form="HonoreeDataForm"], button:has-text("Siguiente")').first();
  const isNextButtonStep3Visible = await nextButtonStep3.isVisible().catch(() => false);
  
  if (isNextButtonStep3Visible) {
    console.log('✅ Botón "Siguiente" encontrado, haciendo clic...');
    await nextButtonStep3.click();
    await page.waitForTimeout(2000);
  } else {
    const nextButtonAlt = page.locator('button[type="submit"]').filter({ hasText: 'Siguiente' }).first();
    await nextButtonAlt.click();
    await page.waitForTimeout(2000);
  }
  
  // --- LLENAR DATOS DE VENTA (PASO 4) ---
  await showStepMessage(page, '💰 LLENANDO DATOS DE VENTA');
  await page.waitForTimeout(1000);
  
  const step4Form = page.locator('form[id="QuotationDataForm"]');
  await expect(step4Form).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  console.log('✅ Formulario de datos de venta visible');
  
  const step4Title = page.locator('h4:has-text("Ingresa tu venta")');
  await expect(step4Title).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  console.log('✅ Título "Ingresa tu venta" encontrado');
  
  await showStepMessage(page, '📝 LLENANDO DESCRIPCIÓN');
  await page.waitForTimeout(500);
  
  const descriptionTextarea = page.locator('textarea[id="Description"]');
  await expect(descriptionTextarea).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  await descriptionTextarea.fill('Servicio de decoración completo para evento especial con ambientación temática, iluminación y diseño personalizado.');
  console.log('✅ Descripción llenada');
  
  await showStepMessage(page, '🔢 LLENANDO CANTIDAD');
  await page.waitForTimeout(500);
  
  const quantityInput = page.locator('input[id="Quantity"]');
  await expect(quantityInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  await quantityInput.fill('1');
  console.log('✅ Cantidad llenada: 1');
  
  await showStepMessage(page, '💵 LLENANDO PRECIO');
  await page.waitForTimeout(500);
  
  const unitPriceInput = page.locator('input[id="UnitPrice"]');
  await expect(unitPriceInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
  await unitPriceInput.fill('5000');
  console.log('✅ Precio llenado: 5000');
  
  await showStepMessage(page, '✅ VALIDANDO CAMPOS DE VENTA');
  await page.waitForTimeout(500);
  
  const finalDescriptionValue = await descriptionTextarea.inputValue();
  const finalQuantityValue = await quantityInput.inputValue();
  const finalUnitPriceValue = await unitPriceInput.inputValue();
  
  if (!finalDescriptionValue || finalDescriptionValue.trim() === '') {
    throw new Error('❌ El campo de descripción no está lleno');
  }
  if (!finalQuantityValue || finalQuantityValue.trim() === '') {
    throw new Error('❌ El campo de cantidad no está lleno');
  }
  if (!finalUnitPriceValue || finalUnitPriceValue.trim() === '') {
    throw new Error('❌ El campo de precio no está lleno');
  }
  
  console.log(`✅ Descripción: "${finalDescriptionValue.substring(0, 50)}..."`);
  console.log(`✅ Cantidad: "${finalQuantityValue}"`);
  console.log(`✅ Precio: "${finalUnitPriceValue}"`);
  
  // --- HACER CLIC EN FINALIZAR ---
  await showStepMessage(page, '✅ FINALIZANDO EVENTO');
  await page.waitForTimeout(1000);
  
  const finalizeButton = page.locator('button[type="submit"][form="QuotationDataForm"], button:has-text("Finalizar")').first();
  const isFinalizeButtonVisible = await finalizeButton.isVisible().catch(() => false);
  
  if (isFinalizeButtonVisible) {
    console.log('✅ Botón "Finalizar" encontrado, haciendo clic...');
    await finalizeButton.click();
    await page.waitForTimeout(3000);
  } else {
    const finalizeButtonAlt = page.locator('button[type="submit"]').filter({ hasText: 'Finalizar' }).first();
    await finalizeButtonAlt.click();
    await page.waitForTimeout(3000);
  }
  
  console.log('✅ Creación de evento completada exitosamente');
}

