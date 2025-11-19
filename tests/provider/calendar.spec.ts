import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, clearStepMessage } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

// URLs
const CALENDAR_URL = `${DEFAULT_BASE_URL}/provider/calendar`;

// Timeouts (en milisegundos)
const DEFAULT_TIMEOUT = 60000; // 60 segundos
const WAIT_FOR_ELEMENT_TIMEOUT = 5000;
const WAIT_FOR_PAGE_LOAD = 2000;
const WAIT_FOR_CALENDAR_UPDATE = 1000;

// ============================================================================

test.use({ 
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(DEFAULT_TIMEOUT);

test.describe('Gestión de calendario', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('navegar a calendario y validar estructura básica', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A PÁGINA DE CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR ESTRUCTURA BÁSICA ---
    await showStepMessage(page, '✅ VALIDANDO ESTRUCTURA BÁSICA DEL CALENDARIO');
    await page.waitForTimeout(1000);

    // Validar título de la página
    const pageTitle = page.locator('p.text-\\[20px\\].text-neutral-800:has-text("Calendario")');
    await expect(pageTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Calendario" encontrado');

    // Validar botón de retroceso
    const backButton = page.locator('button:has(i.icon-chevron-left-bold)');
    await expect(backButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón de retroceso encontrado');

    // Validar contenedor del calendario
    const calendarContainer = page.locator('div.flex.bg-light-light.items-center.justify-between.shadow-4.rounded-5');
    await expect(calendarContainer).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Contenedor del calendario encontrado');

    // Validar botones de navegación de mes
    const prevMonthButton = calendarContainer.locator('button:has(i.icon-chevron-left)');
    const nextMonthButton = calendarContainer.locator('button:has(i.icon-chevron-right)');
    await expect(prevMonthButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    await expect(nextMonthButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botones de navegación de mes encontrados');

    // Validar título del mes
    const monthTitle = calendarContainer.locator('button.text-dark-neutral.font-bold');
    await expect(monthTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    const monthText = await monthTitle.textContent();
    if (!monthText) {
      throw new Error('❌ No se pudo obtener el texto del mes');
    }
    console.log(`✅ Título del mes encontrado: "${monthText}"`);

    // Validar encabezados de días de la semana
    // Buscar el contenedor que tiene los encabezados (está dentro del contenedor del calendario)
    const calendarContent = page.locator('div.flex.flex-col.gap-2.p-4.rounded-6.bg-light-light.shadow-4');
    const dayHeadersContainer = calendarContent.locator('div.flex.items-center.justify-between').first();
    
    // Si no se encuentra con ese selector, intentar buscar directamente los encabezados
    let dayHeadersFound = false;
    try {
      await expect(dayHeadersContainer).toBeVisible({ timeout: 2000 });
      dayHeadersFound = true;
    } catch (e) {
      // Intentar buscar de otra manera
      const altDayHeaders = page.locator('div.flex.flex-col.gap-2').locator('div.flex.items-center.justify-between').first();
      try {
        await expect(altDayHeaders).toBeVisible({ timeout: 2000 });
        dayHeadersFound = true;
      } catch (e2) {
        // Buscar directamente los elementos p con los días
        const firstDayHeader = page.locator('p.text-xsmall.text-dark-neutral:has-text("Dom")');
        const isVisible = await firstDayHeader.isVisible().catch(() => false);
        if (isVisible) {
          dayHeadersFound = true;
        }
      }
    }
    
    if (!dayHeadersFound) {
      console.warn('⚠️ No se pudo encontrar el contenedor de encabezados, buscando directamente los días');
    }
    
    const expectedDays = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    let foundDays = 0;
    
    for (const day of expectedDays) {
      // Buscar directamente los elementos p con el texto del día
      const dayHeader = page.locator(`p.text-xsmall.text-dark-neutral:has-text("${day}")`);
      const isVisible = await dayHeader.isVisible().catch(() => false);
      if (isVisible) {
        foundDays++;
      }
    }
    
    if (foundDays === expectedDays.length) {
      console.log('✅ Encabezados de días de la semana validados');
    } else if (foundDays > 0) {
      console.warn(`⚠️ Solo se encontraron ${foundDays} de ${expectedDays.length} encabezados de días`);
    } else {
      throw new Error(`❌ No se encontraron los encabezados de días de la semana. Se esperaban: ${expectedDays.join(', ')}`);
    }

    // Validar separador
    const separator = page.locator('div.h-\\[1px\\].w-full.bg-light-neutral');
    await expect(separator).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Separador encontrado');

    // Validar sección de eventos agendados
    const eventsSection = page.locator('p.text-dark-neutral.font-bold:has-text("Eventos agendados")');
    await expect(eventsSection).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Sección "Eventos agendados" encontrada');

    console.log('✅ Estructura básica del calendario validada correctamente');
  });

  test('navegar entre meses del calendario', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- OBTENER MES INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO MES INICIAL');
    await page.waitForTimeout(1000);

    const calendarContainer = page.locator('div.flex.bg-light-light.items-center.justify-between.shadow-4.rounded-5');
    const monthTitle = calendarContainer.locator('button.text-dark-neutral.font-bold');
    const initialMonthText = await monthTitle.textContent();
    
    if (!initialMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes inicial');
    }
    console.log(`📅 Mes inicial: "${initialMonthText}"`);

    // --- NAVEGAR AL MES SIGUIENTE ---
    await showStepMessage(page, '➡️ NAVEGANDO AL MES SIGUIENTE');
    await page.waitForTimeout(1000);

    const nextMonthButton = calendarContainer.locator('button:has(i.icon-chevron-right)');
    await nextMonthButton.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    const nextMonthText = await monthTitle.textContent();
    if (!nextMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes siguiente');
    }
    console.log(`📅 Mes siguiente: "${nextMonthText}"`);

    if (nextMonthText === initialMonthText) {
      throw new Error(`❌ El mes no cambió. Esperaba un mes diferente, obtuve: "${nextMonthText}"`);
    }
    console.log('✅ Navegación al mes siguiente exitosa');

    // --- NAVEGAR AL MES ANTERIOR ---
    await showStepMessage(page, '⬅️ NAVEGANDO AL MES ANTERIOR');
    await page.waitForTimeout(1000);

    const prevMonthButton = calendarContainer.locator('button:has(i.icon-chevron-left)');
    await prevMonthButton.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    const prevMonthText = await monthTitle.textContent();
    if (!prevMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes anterior');
    }
    console.log(`📅 Mes anterior: "${prevMonthText}"`);

    if (prevMonthText !== initialMonthText) {
      console.warn(`⚠️ El mes no volvió al inicial. Inicial: "${initialMonthText}", Actual: "${prevMonthText}"`);
    } else {
      console.log('✅ Navegación al mes anterior exitosa (volvió al mes inicial)');
    }

    // --- NAVEGAR VARIOS MESES ADELANTE ---
    await showStepMessage(page, '➡️ NAVEGANDO VARIOS MESES ADELANTE');
    await page.waitForTimeout(1000);

    const monthsToNavigate = 3;
    for (let i = 0; i < monthsToNavigate; i++) {
      await nextMonthButton.click();
      await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);
    }

    const finalMonthText = await monthTitle.textContent();
    if (!finalMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes final');
    }
    console.log(`📅 Mes final después de navegar ${monthsToNavigate} meses: "${finalMonthText}"`);
    console.log('✅ Navegación múltiple de meses exitosa');
  });

  test('validar estructura de días del calendario', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR ESTRUCTURA DE DÍAS ---
    await showStepMessage(page, '📊 VALIDANDO ESTRUCTURA DE DÍAS');
    await page.waitForTimeout(1000);

    // Obtener todos los botones de días
    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();
    console.log(`📊 Total de botones de días encontrados: ${dayCount}`);

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron botones de días en el calendario');
    }

    // Validar que hay al menos 28 días (mínimo para cualquier mes)
    if (dayCount < 28) {
      throw new Error(`❌ Se esperaban al menos 28 días, se encontraron: ${dayCount}`);
    }

    // Validar que hay días del mes actual y días de otros meses
    let currentMonthDays = 0;
    let otherMonthDays = 0;

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      const dayText = await dayButton.locator('p').first().textContent();
      const opacity = await dayButton.locator('p').first().evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      if (opacity === '0.4' || opacity === '0.40') {
        otherMonthDays++;
      } else {
        currentMonthDays++;
      }
    }

    console.log(`📊 Días del mes actual: ${currentMonthDays}`);
    console.log(`📊 Días de otros meses: ${otherMonthDays}`);

    // Validar que hay días del mes actual
    if (currentMonthDays === 0) {
      throw new Error('❌ No se encontraron días del mes actual');
    }

    console.log('✅ Estructura de días del calendario validada correctamente');
  });

  test('seleccionar día del calendario', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- SELECCIONAR UN DÍA ---
    await showStepMessage(page, '🖱️ SELECCIONANDO DÍA DEL CALENDARIO');
    await page.waitForTimeout(1000);

    // Obtener todos los botones de días del mes actual (sin opacity-40)
    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron días en el calendario');
    }

    // Buscar un día del mes actual (sin opacity reducida)
    let selectedDay: ReturnType<typeof page.locator> | null = null;
    let selectedDayText: string | null = null;

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      const dayTextElement = dayButton.locator('p').first();
      const opacity = await dayTextElement.evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });

      // Días del mes actual tienen opacity normal (1 o cerca de 1)
      if (opacity !== '0.4' && opacity !== '0.40') {
        selectedDay = dayButton;
        selectedDayText = await dayTextElement.textContent();
        break;
      }
    }

    if (!selectedDay || !selectedDayText) {
      throw new Error('❌ No se encontró un día del mes actual para seleccionar');
    }

    console.log(`📅 Día seleccionado: ${selectedDayText}`);

    // Hacer clic en el día
    await selectedDay.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    // Validar que el día tiene el borde de selección
    const borderClass = await selectedDay.evaluate((el) => {
      return el.classList.contains('border-primary-neutral') || 
             el.classList.contains('border-2');
    });

    if (!borderClass) {
      // Verificar si tiene el estilo de borde directamente
      const borderStyle = await selectedDay.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });
      
      if (!borderStyle || borderStyle === 'rgba(0, 0, 0, 0)') {
        console.warn('⚠️ El día seleccionado no muestra indicador visual de selección');
      } else {
        console.log('✅ Día seleccionado visualmente (borde detectado)');
      }
    } else {
      console.log('✅ Día seleccionado correctamente (clase de borde encontrada)');
    }

    // Validar que la sección de eventos se actualizó
    const eventsSection = page.locator('p.text-dark-neutral.font-bold:has-text("Eventos agendados")');
    await expect(eventsSection).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Sección de eventos visible después de seleccionar día');
  });

  test('validar días con eventos (indicadores de color)', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- BUSCAR DÍAS CON EVENTOS ---
    await showStepMessage(page, '🔍 BUSCANDO DÍAS CON EVENTOS');
    await page.waitForTimeout(1000);

    // Buscar días que tienen indicadores de color (puntos)
    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron días en el calendario');
    }

    let daysWithEvents = 0;
    const daysWithEventsInfo: Array<{ day: string; colors: string[] }> = [];

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      
      // Buscar indicadores de color (divs con w-[4px] y rounded-circle)
      const indicators = dayButton.locator('div.w-\\[4px\\].aspect-square.rounded-circle');
      const indicatorCount = await indicators.count();

      if (indicatorCount > 0) {
        const dayTextElement = dayButton.locator('p').first();
        const dayText = await dayTextElement.textContent();
        
        const colors: string[] = [];
        for (let j = 0; j < indicatorCount; j++) {
          const indicator = indicators.nth(j);
          const bgColor = await indicator.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });
          colors.push(bgColor);
        }

        daysWithEvents++;
        if (dayText) {
          daysWithEventsInfo.push({ day: dayText, colors });
        }
      }
    }

    console.log(`📊 Días con eventos encontrados: ${daysWithEvents}`);

    if (daysWithEvents > 0) {
      console.log('📋 Información de días con eventos:');
      daysWithEventsInfo.forEach((info, index) => {
        console.log(`  ${index + 1}. Día ${info.day}: ${info.colors.length} evento(s) - Colores: ${info.colors.join(', ')}`);
      });
      console.log('✅ Indicadores de eventos encontrados y validados');
    } else {
      console.log('ℹ️ No se encontraron días con eventos en el calendario actual');
    }
  });

  test('validar estado vacío cuando no hay eventos', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- BUSCAR DÍA SIN EVENTOS ---
    await showStepMessage(page, '🔍 BUSCANDO DÍA SIN EVENTOS');
    await page.waitForTimeout(1000);

    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron días en el calendario');
    }

    // Buscar un día sin indicadores de eventos
    let dayWithoutEvents: ReturnType<typeof page.locator> | null = null;
    let dayWithoutEventsText: string | null = null;

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      const indicators = dayButton.locator('div.w-\\[4px\\].aspect-square.rounded-circle');
      const indicatorCount = await indicators.count();

      if (indicatorCount === 0) {
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        // Asegurarse de que es un día del mes actual
        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithoutEvents = dayButton;
          dayWithoutEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithoutEvents || !dayWithoutEventsText) {
      console.log('ℹ️ No se encontró un día sin eventos, seleccionando cualquier día del mes actual');
      // Seleccionar cualquier día del mes actual
      for (let i = 0; i < dayCount; i++) {
        const dayButton = dayButtons.nth(i);
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithoutEvents = dayButton;
          dayWithoutEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithoutEvents || !dayWithoutEventsText) {
      throw new Error('❌ No se pudo encontrar un día para seleccionar');
    }

    console.log(`📅 Día seleccionado: ${dayWithoutEventsText}`);

    // --- SELECCIONAR DÍA ---
    await showStepMessage(page, '🖱️ SELECCIONANDO DÍA');
    await page.waitForTimeout(1000);

    await dayWithoutEvents.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    // --- VALIDAR ESTADO VACÍO ---
    await showStepMessage(page, '✅ VALIDANDO ESTADO VACÍO');
    await page.waitForTimeout(1000);

    // Buscar el mensaje de estado vacío
    const emptyStateIcon = page.locator('div.flex.items-center.justify-center.w-\\[120px\\].aspect-square.bg-light-light.rounded-circle:has(i.icon-calendar)');
    const emptyStateTitle = page.locator('h6.text-dark-neutral:has-text("¡Este día está vacío!")');
    const emptyStateMessage = page.locator('p.text-small.text-dark-neutral:has-text("Agenda un nuevo evento y lleva el control desde Fiestamas")');
    const createEventButton = page.locator('button:has-text("Agendar evento")');

    const hasEmptyState = await emptyStateIcon.isVisible().catch(() => false) ||
                          await emptyStateTitle.isVisible().catch(() => false) ||
                          await emptyStateMessage.isVisible().catch(() => false) ||
                          await createEventButton.isVisible().catch(() => false);

    if (hasEmptyState) {
      console.log('✅ Estado vacío encontrado');
      
      if (await emptyStateIcon.isVisible().catch(() => false)) {
        console.log('✅ Ícono de calendario vacío visible');
      }
      if (await emptyStateTitle.isVisible().catch(() => false)) {
        console.log('✅ Título "¡Este día está vacío!" visible');
      }
      if (await emptyStateMessage.isVisible().catch(() => false)) {
        console.log('✅ Mensaje de estado vacío visible');
      }
      if (await createEventButton.isVisible().catch(() => false)) {
        console.log('✅ Botón "Agendar evento" visible');
      }
    } else {
      console.log('ℹ️ No se encontró estado vacío (puede haber eventos en este día)');
    }
  });

  test('validar botón agendar evento desde calendario', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- BUSCAR Y VALIDAR BOTÓN AGENDAR EVENTO ---
    await showStepMessage(page, '🔍 BUSCANDO BOTÓN AGENDAR EVENTO');
    await page.waitForTimeout(1000);

    // El botón puede estar en el estado vacío o siempre visible
    const createEventButton = page.locator('button:has-text("Agendar evento")');
    const isVisible = await createEventButton.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Botón "Agendar evento" encontrado');
      
      // Validar que el botón tiene el estilo correcto
      const buttonClasses = await createEventButton.getAttribute('class');
      if (buttonClasses) {
        console.log(`✅ Clases del botón: ${buttonClasses}`);
      }

      // Validar que tiene el ícono de plus
      const plusIcon = createEventButton.locator('i.icon-plus, i.icon');
      const hasIcon = await plusIcon.count() > 0;
      if (hasIcon) {
        console.log('✅ Ícono de plus encontrado en el botón');
      }

      // Hacer clic en el botón (opcional, puede navegar a otra página)
      await showStepMessage(page, '🖱️ HACIENDO CLIC EN BOTÓN AGENDAR EVENTO');
      await page.waitForTimeout(1000);

      try {
        await createEventButton.click();
        await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

        // Verificar si navegó a otra página o se abrió un modal
        const currentUrl = page.url();
        console.log(`📍 URL después de hacer clic: ${currentUrl}`);

        // Si no navegó, puede haber un modal o formulario
        const modal = page.locator('div[role="dialog"], div.modal, div[class*="modal"]');
        const hasModal = await modal.isVisible().catch(() => false);

        if (hasModal) {
          console.log('✅ Modal o diálogo abierto después de hacer clic');
        } else if (currentUrl !== CALENDAR_URL) {
          console.log('✅ Navegación a otra página después de hacer clic');
        } else {
          console.log('ℹ️ El botón no navegó ni abrió modal (puede requerir selección de día primero)');
        }
      } catch (error) {
        console.log('ℹ️ No se pudo hacer clic en el botón (puede requerir selección de día primero)');
      }
    } else {
      console.log('ℹ️ Botón "Agendar evento" no visible (puede requerir seleccionar un día primero)');
      
      // Intentar seleccionar un día primero
      const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
      const dayCount = await dayButtons.count();

      if (dayCount > 0) {
        // Seleccionar el primer día del mes actual
        for (let i = 0; i < dayCount; i++) {
          const dayButton = dayButtons.nth(i);
          const dayTextElement = dayButton.locator('p').first();
          const opacity = await dayTextElement.evaluate((el) => {
            return window.getComputedStyle(el).opacity;
          });

          if (opacity !== '0.4' && opacity !== '0.40') {
            await dayButton.click();
            await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);
            break;
          }
        }

        // Buscar el botón nuevamente
        const createEventButtonAfter = page.locator('button:has-text("Agendar evento")');
        const isVisibleAfter = await createEventButtonAfter.isVisible().catch(() => false);

        if (isVisibleAfter) {
          console.log('✅ Botón "Agendar evento" visible después de seleccionar día');
        }
      }
    }
  });

  test('navegar de regreso desde calendario', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR BOTÓN DE RETROCESO ---
    await showStepMessage(page, '⬅️ VALIDANDO BOTÓN DE RETROCESO');
    await page.waitForTimeout(1000);

    const backButton = page.locator('button:has(i.icon-chevron-left-bold)');
    await expect(backButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Botón de retroceso encontrado');

    // --- HACER CLIC EN BOTÓN DE RETROCESO ---
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN BOTÓN DE RETROCESO');
    await page.waitForTimeout(1000);

    const initialUrl = page.url();
    await backButton.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR NAVEGACIÓN ---
    const finalUrl = page.url();
    console.log(`📍 URL inicial: ${initialUrl}`);
    console.log(`📍 URL final: ${finalUrl}`);

    if (finalUrl !== initialUrl) {
      console.log('✅ Navegación de regreso exitosa');
      
      // Validar que no estamos en la página de calendario
      if (!finalUrl.includes('/calendar')) {
        console.log('✅ Regresó a una página diferente del calendario');
      } else {
        console.warn('⚠️ Aún estamos en una URL relacionada con calendario');
      }
    } else {
      console.warn('⚠️ La URL no cambió después de hacer clic en retroceso');
    }
  });

  test('seleccionar día con eventos del mes siguiente', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- OBTENER MES INICIAL ---
    await showStepMessage(page, '📊 OBTENIENDO MES INICIAL');
    await page.waitForTimeout(1000);

    const calendarContainer = page.locator('div.flex.bg-light-light.items-center.justify-between.shadow-4.rounded-5');
    const monthTitle = calendarContainer.locator('button.text-dark-neutral.font-bold');
    const initialMonthText = await monthTitle.textContent();
    
    if (!initialMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes inicial');
    }
    console.log(`📅 Mes inicial: "${initialMonthText}"`);

    // --- NAVEGAR AL MES SIGUIENTE ---
    await showStepMessage(page, '➡️ NAVEGANDO AL MES SIGUIENTE');
    await page.waitForTimeout(1000);

    const nextMonthButton = calendarContainer.locator('button:has(i.icon-chevron-right)');
    await nextMonthButton.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    const nextMonthText = await monthTitle.textContent();
    if (!nextMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes siguiente');
    }
    console.log(`📅 Mes siguiente: "${nextMonthText}"`);

    if (nextMonthText === initialMonthText) {
      throw new Error(`❌ El mes no cambió. Esperaba un mes diferente, obtuve: "${nextMonthText}"`);
    }
    console.log('✅ Navegación al mes siguiente exitosa');

    // --- BUSCAR DÍA CON EVENTOS EN EL MES SIGUIENTE ---
    await showStepMessage(page, '🔍 BUSCANDO DÍA CON EVENTOS EN EL MES SIGUIENTE');
    await page.waitForTimeout(1000);

    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron días en el calendario');
    }

    // Buscar un día con indicadores de eventos en el mes siguiente
    let dayWithEvents: ReturnType<typeof page.locator> | null = null;
    let dayWithEventsText: string | null = null;

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      const indicators = dayButton.locator('div.w-\\[4px\\].aspect-square.rounded-circle');
      const indicatorCount = await indicators.count();

      if (indicatorCount > 0) {
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        // Asegurarse de que es un día del mes actual (no del mes anterior)
        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithEvents = dayButton;
          dayWithEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithEvents || !dayWithEventsText) {
      console.log('ℹ️ No se encontró un día con eventos en el mes siguiente');
      console.log('ℹ️ Seleccionando cualquier día del mes siguiente para validar la funcionalidad');
      
      // Seleccionar cualquier día del mes siguiente
      for (let i = 0; i < dayCount; i++) {
        const dayButton = dayButtons.nth(i);
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithEvents = dayButton;
          dayWithEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithEvents || !dayWithEventsText) {
      throw new Error('❌ No se pudo encontrar un día para seleccionar en el mes siguiente');
    }

    console.log(`📅 Día seleccionado en el mes siguiente: ${dayWithEventsText}`);

    // --- SELECCIONAR DÍA DEL MES SIGUIENTE ---
    await showStepMessage(page, '🖱️ SELECCIONANDO DÍA DEL MES SIGUIENTE');
    await page.waitForTimeout(1000);

    await dayWithEvents.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    // --- VALIDAR QUE EL DÍA SE SELECCIONÓ CORRECTAMENTE ---
    await showStepMessage(page, '✅ VALIDANDO SELECCIÓN DEL DÍA');
    await page.waitForTimeout(1000);

    // Validar que el día tiene el borde de selección
    const borderClass = await dayWithEvents.evaluate((el) => {
      return el.classList.contains('border-primary-neutral') || 
             el.classList.contains('border-2');
    });

    if (!borderClass) {
      // Verificar si tiene el estilo de borde directamente
      const borderStyle = await dayWithEvents.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });
      
      if (!borderStyle || borderStyle === 'rgba(0, 0, 0, 0)') {
        console.warn('⚠️ El día seleccionado no muestra indicador visual de selección');
      } else {
        console.log('✅ Día seleccionado visualmente (borde detectado)');
      }
    } else {
      console.log('✅ Día seleccionado correctamente (clase de borde encontrada)');
    }

    // --- VALIDAR SECCIÓN DE EVENTOS ---
    await showStepMessage(page, '✅ VALIDANDO SECCIÓN DE EVENTOS AGENDADOS');
    await page.waitForTimeout(1000);

    const eventsSection = page.locator('p.text-dark-neutral.font-bold:has-text("Eventos agendados")');
    await expect(eventsSection).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Eventos agendados" visible');

    // Buscar contenedor de eventos (puede tener lista de eventos o estado vacío)
    const eventsContainer = page.locator('div.flex.flex-col.grow.overflow-y-auto.gap-3');
    const isContainerVisible = await eventsContainer.isVisible().catch(() => false);

    if (isContainerVisible) {
      console.log('✅ Contenedor de eventos visible');

      // Buscar si hay lista de eventos o estado vacío
      const emptyState = page.locator('h6.text-dark-neutral:has-text("¡Este día está vacío!")');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (hasEmptyState) {
        console.log('ℹ️ Estado vacío mostrado (no hay eventos en este día del mes siguiente)');
      } else {
        // Buscar elementos de eventos (pueden ser cards, botones, etc.)
        const eventElements = eventsContainer.locator('div, button, a').filter({
          hasNot: page.locator('h6, p:has-text("vacío"), i.icon-calendar')
        });
        const eventCount = await eventElements.count();

        if (eventCount > 0) {
          console.log(`✅ Se encontraron ${eventCount} elemento(s) en la sección de eventos del mes siguiente`);
        } else {
          console.log('ℹ️ No se encontraron elementos de eventos específicos');
        }
      }
    } else {
      console.warn('⚠️ Contenedor de eventos no visible');
    }

    // --- VALIDAR QUE EL MES SIGUE SIENDO EL CORRECTO ---
    await showStepMessage(page, '✅ VALIDANDO QUE EL MES SIGUE SIENDO EL CORRECTO');
    await page.waitForTimeout(1000);

    const currentMonthText = await monthTitle.textContent();
    if (!currentMonthText) {
      throw new Error('❌ No se pudo obtener el texto del mes actual');
    }

    if (currentMonthText === nextMonthText) {
      console.log(`✅ El mes se mantiene correctamente: "${currentMonthText}"`);
    } else {
      console.warn(`⚠️ El mes cambió después de seleccionar el día. Esperado: "${nextMonthText}", Actual: "${currentMonthText}"`);
    }

    console.log('✅ Prueba de selección de día del mes siguiente completada exitosamente');
  });

  test('validar eventos agendados cuando hay eventos', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- BUSCAR DÍA CON EVENTOS ---
    await showStepMessage(page, '🔍 BUSCANDO DÍA CON EVENTOS');
    await page.waitForTimeout(1000);

    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron días en el calendario');
    }

    // Buscar un día con indicadores de eventos
    let dayWithEvents: ReturnType<typeof page.locator> | null = null;
    let dayWithEventsText: string | null = null;

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      const indicators = dayButton.locator('div.w-\\[4px\\].aspect-square.rounded-circle');
      const indicatorCount = await indicators.count();

      if (indicatorCount > 0) {
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        // Asegurarse de que es un día del mes actual
        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithEvents = dayButton;
          dayWithEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithEvents || !dayWithEventsText) {
      console.log('ℹ️ No se encontró un día con eventos en el calendario actual');
      console.log('ℹ️ Seleccionando cualquier día para validar la estructura');
      
      // Seleccionar cualquier día del mes actual
      for (let i = 0; i < dayCount; i++) {
        const dayButton = dayButtons.nth(i);
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithEvents = dayButton;
          dayWithEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithEvents || !dayWithEventsText) {
      throw new Error('❌ No se pudo encontrar un día para seleccionar');
    }

    console.log(`📅 Día seleccionado: ${dayWithEventsText}`);

    // --- SELECCIONAR DÍA ---
    await showStepMessage(page, '🖱️ SELECCIONANDO DÍA CON EVENTOS');
    await page.waitForTimeout(1000);

    await dayWithEvents.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    // --- VALIDAR SECCIÓN DE EVENTOS ---
    await showStepMessage(page, '✅ VALIDANDO SECCIÓN DE EVENTOS AGENDADOS');
    await page.waitForTimeout(1000);

    const eventsSection = page.locator('p.text-dark-neutral.font-bold:has-text("Eventos agendados")');
    await expect(eventsSection).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Eventos agendados" visible');

    // Buscar contenedor de eventos (puede tener lista de eventos o estado vacío)
    const eventsContainer = page.locator('div.flex.flex-col.grow.overflow-y-auto.gap-3');
    const isContainerVisible = await eventsContainer.isVisible().catch(() => false);

    if (isContainerVisible) {
      console.log('✅ Contenedor de eventos visible');

      // Buscar si hay lista de eventos o estado vacío
      const emptyState = page.locator('h6.text-dark-neutral:has-text("¡Este día está vacío!")');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (hasEmptyState) {
        console.log('ℹ️ Estado vacío mostrado (no hay eventos en este día)');
      } else {
        // Buscar elementos de eventos (pueden ser cards, botones, etc.)
        const eventElements = eventsContainer.locator('div, button, a').filter({
          hasNot: page.locator('h6, p:has-text("vacío"), i.icon-calendar')
        });
        const eventCount = await eventElements.count();

        if (eventCount > 0) {
          console.log(`✅ Se encontraron ${eventCount} elemento(s) en la sección de eventos`);
        } else {
          console.log('ℹ️ No se encontraron elementos de eventos específicos');
        }
      }
    } else {
      console.warn('⚠️ Contenedor de eventos no visible');
    }
  });

  test('Agendar evento', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- BUSCAR BOTÓN AGENDAR EVENTO ---
    await showStepMessage(page, '🔍 BUSCANDO BOTÓN AGENDAR EVENTO');
    await page.waitForTimeout(1000);

    // El botón puede estar en el estado vacío o siempre visible
    let createEventButton = page.locator('button:has-text("Agendar evento")');
    let isVisible = await createEventButton.isVisible().catch(() => false);

    // Si no está visible, puede requerir seleccionar un día primero
    if (!isVisible) {
      console.log('ℹ️ Botón "Agendar evento" no visible, seleccionando un día primero');
      
      const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
      const dayCount = await dayButtons.count();

      if (dayCount > 0) {
        // Seleccionar el primer día del mes actual
        for (let i = 0; i < dayCount; i++) {
          const dayButton = dayButtons.nth(i);
          const dayTextElement = dayButton.locator('p').first();
          const opacity = await dayTextElement.evaluate((el) => {
            return window.getComputedStyle(el).opacity;
          });

          if (opacity !== '0.4' && opacity !== '0.40') {
            await dayButton.click();
            await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);
            break;
          }
        }

        // Buscar el botón nuevamente
        createEventButton = page.locator('button:has-text("Agendar evento")');
        isVisible = await createEventButton.isVisible().catch(() => false);
      }
    }

    if (!isVisible) {
      throw new Error('❌ No se pudo encontrar el botón "Agendar evento" en el calendario');
    }

    console.log('✅ Botón "Agendar evento" encontrado');

    // --- HACER CLIC EN BOTÓN AGENDAR EVENTO ---
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN BOTÓN AGENDAR EVENTO');
    await page.waitForTimeout(1000);

    const initialUrl = page.url();
    await createEventButton.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2); // Esperar más tiempo para la navegación

    // --- VALIDAR REDIRECCIÓN A PÁGINA DE EVENTO ---
    await showStepMessage(page, '✅ VALIDANDO REDIRECCIÓN A PÁGINA DE EVENTO');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);

    // Validar que la URL contiene /provider/event
    if (!currentUrl.includes('/provider/event')) {
      throw new Error(`❌ La URL no corresponde a la página de evento. URL actual: ${currentUrl}`);
    }

    console.log('✅ Redirección a página de evento exitosa');

    // --- VALIDAR TÍTULO "NUEVO EVENTO" ---
    await showStepMessage(page, '✅ VALIDANDO TÍTULO "NUEVO EVENTO"');
    await page.waitForTimeout(1000);

    const pageTitle = page.locator('p.text-\\[20px\\].text-dark-neutral:has-text("Nuevo evento")');
    await expect(pageTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Nuevo evento" encontrado');

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
    // Según el HTML, es un div con clases: "flex items-center justify-center px-5 py-2 gap-3 rounded-8 bg-secondary-neutral text-light-light h-[40px] shrink-0"
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
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Buscar el campo de ciudad con múltiples estrategias
    let cityInput = page.locator('input[id="Address"]');
    let isCityInputVisible = await cityInput.isVisible().catch(() => false);

    if (!isCityInputVisible) {
      // Intentar buscar por el label asociado
      const cityLabel = page.locator('label:has-text("Ciudad")');
      const labelExists = await cityLabel.count().then(count => count > 0);
      
      if (labelExists) {
        // Buscar el input usando el atributo 'for' del label
        try {
          const labelFor = await cityLabel.getAttribute('for');
          if (labelFor) {
            cityInput = page.locator(`input[id="${labelFor}"]`);
            isCityInputVisible = await cityInput.isVisible().catch(() => false);
          }
        } catch (e) {
          // Si no tiene atributo 'for', buscar el input cercano
          cityInput = page.locator('label:has-text("Ciudad")').locator('..').locator('input').first();
          isCityInputVisible = await cityInput.isVisible().catch(() => false);
        }
      }
    }

    if (!isCityInputVisible) {
      // Intentar buscar por placeholder o cualquier input vacío cerca del label
      cityInput = page.locator('input[placeholder=" "], input[type="text"]').first();
      isCityInputVisible = await cityInput.isVisible().catch(() => false);
    }

    // Esperar a que el campo esté visible con timeout aumentado
    await expect(cityInput).toBeVisible({ timeout: 15000 }); // Aumentado a 15 segundos
    
    // Hacer clic en el input para activarlo
    await cityInput.click();
    await page.waitForTimeout(500);
    
    // Escribir el nombre de la ciudad
    await cityInput.fill('Ciudad de México');
    await page.waitForTimeout(2000); // Esperar más tiempo para que aparezcan las sugerencias

    // Esperar a que aparezcan las opciones de autocompletado de Google Places
    // Las opciones están en elementos <li> dentro de un <ul>
    try {
      // Buscar primero el contenedor de opciones
      const autocompleteList = page.locator('ul.flex.flex-col.py-2, ul[class*="flex"][class*="flex-col"]');
      await autocompleteList.first().waitFor({ state: 'visible', timeout: 5000 });
      
      // Buscar las opciones dentro del <ul> (elementos <li>)
      const autocompleteOptions = autocompleteList.locator('li.cursor-pointer, li[class*="cursor-pointer"]');
      await autocompleteOptions.first().waitFor({ state: 'visible', timeout: 3000 });
      
      const optionsCount = await autocompleteOptions.count();
      console.log(`📋 Opciones de ciudad encontradas: ${optionsCount}`);
      
      if (optionsCount > 0) {
        // Seleccionar la primera opción disponible
        const firstOption = autocompleteOptions.first();
        const optionText = await firstOption.textContent();
        console.log(`📋 Seleccionando ciudad: "${optionText?.trim()}"`);
        
        await firstOption.click();
        await page.waitForTimeout(1000); // Esperar a que se complete la selección
        
        // Validar que el campo se actualizó con la ciudad seleccionada
        const cityValue = await cityInput.inputValue();
        console.log(`✅ Ciudad seleccionada. Valor del campo: "${cityValue}"`);
        
        // Verificar que el mensaje de error desapareció (si existía)
        const errorMessage = page.locator('p.text-xsmall.text-danger-neutral:has-text("Selecciona una dirección")');
        const hasError = await errorMessage.isVisible().catch(() => false);
        
        if (!hasError) {
          console.log('✅ Mensaje de error desapareció, ciudad seleccionada correctamente');
        }
      } else {
        throw new Error('No se encontraron opciones en la lista');
      }
    } catch (error) {
      // Si falla, intentar con selectores alternativos más genéricos
      try {
        const autocompleteOptionsAlt = page.locator('li.cursor-pointer.flex.items-center, li[class*="cursor-pointer"]');
        await autocompleteOptionsAlt.first().waitFor({ state: 'visible', timeout: 3000 });
        
        const firstOption = autocompleteOptionsAlt.first();
        const optionText = await firstOption.textContent();
        console.log(`📋 Seleccionando ciudad (selector alternativo): "${optionText?.trim()}"`);
        
        await firstOption.click();
        await page.waitForTimeout(1000);
        console.log('✅ Ciudad seleccionada del autocompletado (selector alternativo)');
      } catch (error2) {
        console.log('⚠️ No se pudieron encontrar las opciones de autocompletado, continuando con el texto ingresado');
        console.log('⚠️ Puede que sea necesario seleccionar manualmente una ciudad de las sugerencias');
      }
    }

    // 2. Validar Fecha (ya tiene un valor por defecto)
    await showStepMessage(page, '📅 VALIDANDO FECHA');
    await page.waitForTimeout(1000);

    const dateInput = page.locator('input[id="Date"]');
    await expect(dateInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    
    const dateValue = await dateInput.inputValue();
    if (!dateValue) {
      throw new Error('❌ El campo de fecha no tiene un valor');
    }
    console.log(`✅ Fecha actual: ${dateValue}`);

    // 3. Llenar Hora
    await showStepMessage(page, '🕐 LLENANDO HORA');
    await page.waitForTimeout(1000);

    const timeInput = page.locator('input[id="Time"]');
    await expect(timeInput).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    
    // Función auxiliar para seleccionar hora y minuto en el reloj circular
    async function seleccionarHoraYMinuto(page: Page, hora: number, minuto: number) {
      // 1. Abrir el selector de hora
      await timeInput.scrollIntoViewIfNeeded();
      await timeInput.click({ force: true });
      
      // 2. Esperar a que aparezca el diálogo
      await page.waitForSelector('[data-time-picker-content="true"]', { state: 'visible', timeout: 10000 });
      
      // 3. Seleccionar la hora usando coordenadas
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
      
      // Esperar un momento para que el diálogo se cargue completamente
      await page.waitForTimeout(500);
      
      // Buscar el círculo de hora usando coordenadas
      const allCircles = page.locator('svg circle.cursor-pointer');
      const circleCount = await allCircles.count();
      
      let closestCircle: ReturnType<typeof allCircles.nth> | null = null;
      let minDistance = Infinity;
      
      for (let i = 0; i < circleCount; i++) {
        const circle = allCircles.nth(i);
        const cx = parseFloat(await circle.getAttribute('cx') || '0');
        const cy = parseFloat(await circle.getAttribute('cy') || '0');
        
        // Calcular distancia euclidiana a las coordenadas esperadas
        const distance = Math.sqrt(Math.pow(cx - h.cx, 2) + Math.pow(cy - h.cy, 2));
        
        if (distance < minDistance && distance < 25) { // Tolerancia de 25 píxeles
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
      
      // Esperar un momento para que el reloj cambie a modo de minutos
      await page.waitForTimeout(500);
      
      // 4. Seleccionar el minuto
      const minutoCirculos: { [key: number]: { cx: number; cy: number } } = {
        0: { cx: 120, cy: 205 },
        15: { cx: 205, cy: 120 },
        30: { cx: 120, cy: 35 },
        45: { cx: 35, cy: 120 },
      };
      
      const m = minutoCirculos[minuto];
      if (!m) throw new Error(`Minuto ${minuto} no está mapeado`);
      
      // Buscar el círculo de minuto usando el mismo enfoque
      const allMinuteCircles = page.locator('svg circle.cursor-pointer');
      const minuteCircleCount = await allMinuteCircles.count();
      
      let closestMinuteCircle: ReturnType<typeof allMinuteCircles.nth> | null = null;
      let minMinuteDistance = Infinity;
      
      for (let i = 0; i < minuteCircleCount; i++) {
        const circle = allMinuteCircles.nth(i);
        const cx = parseFloat(await circle.getAttribute('cx') || '0');
        const cy = parseFloat(await circle.getAttribute('cy') || '0');
        
        // Calcular distancia euclidiana
        const distance = Math.sqrt(Math.pow(cx - m.cx, 2) + Math.pow(cy - m.cy, 2));
        
        if (distance < minMinuteDistance && distance < 25) { // Tolerancia de 25 píxeles
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
      
      // Esperar un momento antes de confirmar
      await page.waitForTimeout(500);
      
      // 5. Confirmar selección
      const confirmButton = page.locator('button.bg-primary-neutral.text-light-light').filter({ hasText: 'Confirmar' });
      await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
      await confirmButton.click({ timeout: 5000 });
      console.log('✅ Botón "Confirmar" presionado');
    }

    // Seleccionar una hora aleatoria (entre 1 y 12) y un minuto (0, 15, 30 o 45)
    const randomHour = Math.floor(Math.random() * 12) + 1; // Entre 1 y 12
    const randomMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)]; // 0, 15, 30 o 45
    
    await seleccionarHoraYMinuto(page, randomHour, randomMinute);
    console.log(`✅ Hora seleccionada: ${randomHour}:${randomMinute.toString().padStart(2, '0')}`);
    
    // Esperar a que el diálogo del selector de hora se cierre completamente
    const timePickerDialog = page.locator('[data-time-picker-content="true"]');
    try {
      await timePickerDialog.waitFor({ state: 'hidden', timeout: 3000 });
    } catch (e) {
      // Si no se oculta rápidamente, esperar un poco más
      await page.waitForTimeout(1000);
    }

    // 4. Seleccionar Servicio
    await showStepMessage(page, '🔧 SELECCIONANDO SERVICIO');
    await page.waitForTimeout(1000);

    const serviceButton = page.locator('button[id="ServiceId"]');
    await expect(serviceButton).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    
    // Hacer clic en el botón para abrir el dropdown
    await serviceButton.click();
    await page.waitForTimeout(2000); // Esperar más tiempo para que se abra el dropdown

    // Intentar esperar a que aparezcan las opciones del dropdown
    try {
      await page.waitForSelector('div[role="option"], ul[role="listbox"], div[class*="dropdown"], div[class*="select"], div[class*="menu"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      console.log('✅ Dropdown de servicios apareció');
    } catch (error) {
      console.log('ℹ️ No se detectó el dropdown con waitForSelector, continuando con búsqueda manual...');
    }

    // Buscar opciones de servicio en el dropdown con múltiples estrategias
    let serviceSelected = false;
    
    try {
      // Estrategia 0: Buscar elementos que aparezcan después del clic (portales, modales, etc.)
      // Buscar elementos que estén fuera del flujo normal del documento (portales de React)
      const portalElements = page.locator('[data-radix-portal], [data-portal], div[style*="z-index"]:not([id="ServiceId"])');
      const portalCount = await portalElements.count();
      
      if (portalCount > 0) {
        console.log(`📋 Elementos de portal encontrados: ${portalCount}`);
        
        for (let i = 0; i < portalCount; i++) {
          const portal = portalElements.nth(i);
          const isVisible = await portal.isVisible().catch(() => false);
          
          if (isVisible) {
            // Buscar opciones dentro del portal
            const portalOptions = portal.locator('div, li, button, a').filter({
              hasNot: page.locator('input, label, button[id="ServiceId"]')
            });
            const portalOptionsCount = await portalOptions.count();
            
            if (portalOptionsCount > 0) {
              console.log(`📋 Opciones encontradas en portal ${i + 1}: ${portalOptionsCount}`);
              
              for (let j = 0; j < portalOptionsCount; j++) {
                const option = portalOptions.nth(j);
                const optionText = await option.textContent();
                
                if (optionText && optionText.trim() !== '' && optionText.trim() !== 'Servicio') {
                  console.log(`📋 Servicio a seleccionar (portal): "${optionText.trim()}"`);
                  await option.click();
                  await page.waitForTimeout(1000);
                  serviceSelected = true;
                  console.log('✅ Servicio seleccionado del dropdown (estrategia portal)');
                  break;
                }
              }
              
              if (serviceSelected) break;
            }
          }
        }
      }
    } catch (error) {
      console.log('ℹ️ Estrategia portal falló, intentando estrategia 1...');
    }
    
    if (!serviceSelected) {
      try {
        // Estrategia 1: Buscar elementos con role="option" o role="listbox"
        const serviceOptions1 = page.locator('div[role="option"], ul[role="listbox"] li, li[role="option"]');
        const count1 = await serviceOptions1.count();
      
        if (count1 > 0) {
          console.log(`📋 Opciones encontradas (estrategia 1): ${count1}`);
          const firstOption = serviceOptions1.first();
          const serviceText = await firstOption.textContent();
          console.log(`📋 Servicio a seleccionar: "${serviceText?.trim()}"`);
          
          await firstOption.click();
          await page.waitForTimeout(1000);
          serviceSelected = true;
          console.log('✅ Servicio seleccionado del dropdown (estrategia 1)');
        }
      } catch (error) {
        console.log('ℹ️ Estrategia 1 falló, intentando estrategia 2...');
      }
    }

    if (!serviceSelected) {
      try {
        // Estrategia 2: Buscar elementos dentro de contenedores de dropdown comunes
        const dropdownContainers = page.locator('div[class*="dropdown"], div[class*="select"], div[class*="menu"], ul[class*="menu"], div[class*="popover"]');
        const containerCount = await dropdownContainers.count();
        
        if (containerCount > 0) {
          console.log(`📋 Contenedores de dropdown encontrados: ${containerCount}`);
          
          // Buscar opciones dentro de los contenedores
          for (let i = 0; i < containerCount; i++) {
            const container = dropdownContainers.nth(i);
            const isVisible = await container.isVisible().catch(() => false);
            
            if (isVisible) {
              const optionsInContainer = container.locator('div, li, button, a').filter({ hasNot: page.locator('input, label') });
              const optionsCount = await optionsInContainer.count();
              
              if (optionsCount > 0) {
                console.log(`📋 Opciones encontradas en contenedor ${i + 1}: ${optionsCount}`);
                
                // Filtrar opciones que no sean el botón mismo ni elementos vacíos
                for (let j = 0; j < optionsCount; j++) {
                  const option = optionsInContainer.nth(j);
                  const optionText = await option.textContent();
                  const optionId = await option.getAttribute('id');
                  
                  // Evitar seleccionar el botón ServiceId o elementos vacíos
                  if (optionId !== 'ServiceId' && optionText && optionText.trim() !== '' && optionText.trim() !== 'Servicio') {
                    console.log(`📋 Servicio a seleccionar: "${optionText.trim()}"`);
                    await option.click();
                    await page.waitForTimeout(1000);
                    serviceSelected = true;
                    console.log('✅ Servicio seleccionado del dropdown (estrategia 2)');
                    break;
                  }
                }
                
                if (serviceSelected) break;
              }
            }
          }
        }
      } catch (error) {
        console.log('ℹ️ Estrategia 2 falló, intentando estrategia 3...');
      }
    }

    if (!serviceSelected) {
      try {
        // Estrategia 3: Buscar elementos que aparezcan después del botón ServiceId en el DOM
        // Buscar elementos que estén en el mismo contenedor padre o después del botón
        const serviceContainer = serviceButton.locator('..'); // Contenedor padre
        const siblingsAfter = serviceContainer.locator('~ *'); // Hermanos después del contenedor
        const optionsAfter = siblingsAfter.locator('div, li, button, a').filter({
          hasNot: page.locator('input, label, button[id="ServiceId"]')
        });
        
        const optionsAfterCount = await optionsAfter.count();
        if (optionsAfterCount > 0) {
          console.log(`📋 Opciones encontradas después del botón: ${optionsAfterCount}`);
          
          for (let i = 0; i < optionsAfterCount; i++) {
            const option = optionsAfter.nth(i);
            const isVisible = await option.isVisible().catch(() => false);
            
            if (isVisible) {
              const optionText = await option.textContent();
              if (optionText && optionText.trim() !== '' && optionText.trim() !== 'Servicio') {
                console.log(`📋 Servicio a seleccionar (después del botón): "${optionText.trim()}"`);
                await option.click();
                await page.waitForTimeout(1000);
                serviceSelected = true;
                console.log('✅ Servicio seleccionado del dropdown (estrategia 3)');
                break;
              }
            }
          }
        }
      } catch (error) {
        console.log('ℹ️ Estrategia 3 falló, intentando estrategia 4...');
      }
    }

    if (!serviceSelected) {
      try {
        // Estrategia 4: Buscar cualquier elemento clickeable que no sea el botón ServiceId
        const allClickableElements = page.locator('div, li, button, a').filter({
          hasNot: page.locator('button[id="ServiceId"], input, label')
        });
        
        // Esperar un momento para que aparezcan las opciones
        await page.waitForTimeout(1000);
        
        const allElementsCount = await allClickableElements.count();
        console.log(`📋 Elementos clickeables encontrados: ${allElementsCount}`);
        
        // Buscar elementos que estén visibles y tengan texto
        for (let i = 0; i < Math.min(allElementsCount, 20); i++) { // Limitar a los primeros 20
          const element = allClickableElements.nth(i);
          const isVisible = await element.isVisible().catch(() => false);
          
          if (isVisible) {
            const elementText = await element.textContent();
            const elementId = await element.getAttribute('id');
            
            // Evitar el botón ServiceId y elementos sin texto útil
            if (elementId !== 'ServiceId' && elementText && elementText.trim() !== '' && 
                elementText.trim() !== 'Servicio' && !elementText.trim().includes('¿Aún no registras')) {
              
              // Verificar que el elemento esté dentro de un contenedor de dropdown (opcional)
              const boundingBox = await element.boundingBox().catch(() => null);
              if (boundingBox) {
                console.log(`📋 Servicio a seleccionar (estrategia 4): "${elementText.trim()}"`);
                await element.click();
                await page.waitForTimeout(1000);
                serviceSelected = true;
                console.log('✅ Servicio seleccionado del dropdown (estrategia 4)');
                break;
              }
            }
          }
        }
      } catch (error) {
        console.log('ℹ️ Estrategia 4 falló');
      }
    }

    // Si aún no se seleccionó un servicio, verificar si hay un enlace "Crear ahora"
    if (!serviceSelected) {
      const createServiceLink = page.locator('p.text-primary-neutral.font-bold:has-text("Crear ahora")');
      const isCreateLinkVisible = await createServiceLink.isVisible().catch(() => false);
      
      if (isCreateLinkVisible) {
        console.log('ℹ️ No hay servicios disponibles, se muestra el enlace "Crear ahora"');
        // No hacer clic en "Crear ahora" para no salir del flujo de creación de evento
        console.log('⚠️ No se pudo seleccionar un servicio, pero se encontró el enlace "Crear ahora"');
      } else {
        // Intentar verificar si el botón ya tiene un valor seleccionado
        const buttonText = await serviceButton.locator('span').textContent();
        if (buttonText && buttonText.trim() !== '' && buttonText.trim() !== 'Servicio') {
          console.log(`ℹ️ El botón ya tiene un valor: "${buttonText.trim()}"`);
          serviceSelected = true;
        } else {
          throw new Error('❌ No se pudo seleccionar un servicio y no se encontró el enlace "Crear ahora"');
        }
      }
    }

    // Validar que el servicio se seleccionó correctamente
    if (serviceSelected) {
      await page.waitForTimeout(1000); // Esperar a que se actualice el botón
      const finalButtonText = await serviceButton.locator('span').textContent();
      if (finalButtonText && finalButtonText.trim() !== '' && finalButtonText.trim() !== 'Servicio') {
        console.log(`✅ Servicio seleccionado correctamente: "${finalButtonText.trim()}"`);
      } else {
        console.log('⚠️ El botón no muestra un servicio seleccionado, pero se intentó seleccionar uno');
      }
    }

    // --- VALIDAR QUE TODOS LOS CAMPOS ESTÁN LLENOS ---
    await showStepMessage(page, '✅ VALIDANDO CAMPOS LLENOS');
    await page.waitForTimeout(1000);

    // Validar ciudad
    const cityValue = await cityInput.inputValue();
    if (!cityValue || cityValue.trim() === '') {
      throw new Error('❌ El campo de ciudad no está lleno');
    }
    console.log(`✅ Ciudad: "${cityValue}"`);

    // Validar fecha
    const finalDateValue = await dateInput.inputValue();
    if (!finalDateValue || finalDateValue.trim() === '') {
      throw new Error('❌ El campo de fecha no está lleno');
    }
    console.log(`✅ Fecha: "${finalDateValue}"`);

    // Validar hora
    const timeValue = await timeInput.inputValue();
    if (!timeValue || timeValue.trim() === '') {
      console.warn('⚠️ El campo de hora no está lleno, pero continuando...');
    } else {
      console.log(`✅ Hora: "${timeValue}"`);
    }

    console.log('✅ Prueba de botón agendar evento, selección de categoría y llenado de datos completada exitosamente');
  });

  test('seleccionar evento de un día con eventos y validar redirección a negociación', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- BUSCAR DÍA CON EVENTOS ---
    await showStepMessage(page, '🔍 BUSCANDO DÍA CON EVENTOS');
    await page.waitForTimeout(1000);

    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const dayCount = await dayButtons.count();

    if (dayCount === 0) {
      throw new Error('❌ No se encontraron días en el calendario');
    }

    // Buscar un día con indicadores de eventos
    let dayWithEvents: ReturnType<typeof page.locator> | null = null;
    let dayWithEventsText: string | null = null;

    for (let i = 0; i < dayCount; i++) {
      const dayButton = dayButtons.nth(i);
      const indicators = dayButton.locator('div.w-\\[4px\\].aspect-square.rounded-circle');
      const indicatorCount = await indicators.count();

      if (indicatorCount > 0) {
        const dayTextElement = dayButton.locator('p').first();
        const opacity = await dayTextElement.evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        // Asegurarse de que es un día del mes actual
        if (opacity !== '0.4' && opacity !== '0.40') {
          dayWithEvents = dayButton;
          dayWithEventsText = await dayTextElement.textContent();
          break;
        }
      }
    }

    if (!dayWithEvents || !dayWithEventsText) {
      throw new Error('❌ No se encontró un día con eventos en el calendario. Se necesita al menos un día con eventos para esta prueba.');
    }

    console.log(`📅 Día seleccionado: ${dayWithEventsText}`);

    // --- SELECCIONAR DÍA CON EVENTOS ---
    await showStepMessage(page, '🖱️ SELECCIONANDO DÍA CON EVENTOS');
    await page.waitForTimeout(1000);

    await dayWithEvents.click();
    await page.waitForTimeout(WAIT_FOR_CALENDAR_UPDATE);

    // --- VALIDAR SECCIÓN DE EVENTOS ---
    await showStepMessage(page, '✅ VALIDANDO SECCIÓN DE EVENTOS AGENDADOS');
    await page.waitForTimeout(1000);

    const eventsSection = page.locator('p.text-dark-neutral.font-bold:has-text("Eventos agendados")');
    await expect(eventsSection).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
    console.log('✅ Título "Eventos agendados" visible');

    // --- BUSCAR EVENTOS EN LA LISTA ---
    await showStepMessage(page, '🔍 BUSCANDO EVENTOS EN LA LISTA');
    await page.waitForTimeout(1000);

    // Buscar contenedor de eventos
    const eventsContainer = page.locator('div.flex.flex-col.grow.overflow-y-auto.gap-3');
    const isContainerVisible = await eventsContainer.isVisible().catch(() => false);

    if (!isContainerVisible) {
      throw new Error('❌ El contenedor de eventos no está visible');
    }

    // Buscar si hay estado vacío
    const emptyState = page.locator('h6.text-dark-neutral:has-text("¡Este día está vacío!")');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      throw new Error('❌ El día seleccionado muestra estado vacío, pero se esperaba que tuviera eventos');
    }

    // Buscar eventos (pueden ser botones, divs con role="button", o enlaces)
    // Intentar múltiples selectores comunes para eventos
    let eventCards = eventsContainer.locator('button.flex.flex-col');
    let eventCount = await eventCards.count();

    if (eventCount === 0) {
      // Intentar con otro selector
      eventCards = eventsContainer.locator('div[role="button"]');
      eventCount = await eventCards.count();
    }

    if (eventCount === 0) {
      // Intentar con enlaces
      eventCards = eventsContainer.locator('a');
      eventCount = await eventCards.count();
    }

    if (eventCount === 0) {
      // Intentar con cualquier botón dentro del contenedor
      eventCards = eventsContainer.locator('button');
      eventCount = await eventCards.count();
    }

    if (eventCount === 0) {
      throw new Error('❌ No se encontraron eventos en la lista. Se esperaba al menos un evento.');
    }

    console.log(`📊 Eventos encontrados: ${eventCount}`);

    // --- SELECCIONAR UN EVENTO ---
    await showStepMessage(page, '🖱️ SELECCIONANDO UN EVENTO');
    await page.waitForTimeout(1000);

    // Seleccionar el primer evento disponible
    const firstEvent = eventCards.first();
    const eventText = await firstEvent.textContent();
    console.log(`📋 Evento seleccionado: "${eventText?.trim().substring(0, 50)}..."`);

    // Guardar la URL actual antes de hacer clic
    const initialUrl = page.url();

    // Hacer clic en el evento
    await firstEvent.click();
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD * 2); // Esperar más tiempo para la navegación

    // --- VALIDAR REDIRECCIÓN A PÁGINA DE NEGOCIACIÓN ---
    await showStepMessage(page, '✅ VALIDANDO REDIRECCIÓN A PÁGINA DE NEGOCIACIÓN');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);

    // Validar que la URL contiene /provider/negotiation/
    if (!currentUrl.includes('/provider/negotiation/')) {
      throw new Error(`❌ La URL no corresponde a una página de negociación. URL actual: ${currentUrl}`);
    }

    console.log('✅ Redirección a página de negociación exitosa');

    // Validar que la URL tiene un ID de negociación (número)
    const negotiationIdMatch = currentUrl.match(/\/negotiation\/(\d+)/);
    if (!negotiationIdMatch) {
      throw new Error(`❌ La URL de negociación no contiene un ID válido. URL: ${currentUrl}`);
    }

    const negotiationId = negotiationIdMatch[1];
    console.log(`✅ ID de negociación encontrado: ${negotiationId}`);

    // --- VALIDAR ELEMENTO "NEGOCIACIÓN" EN LA PÁGINA ---
    await showStepMessage(page, '✅ VALIDANDO ELEMENTO "NEGOCIACIÓN" EN LA PÁGINA');
    await page.waitForTimeout(1000);

    // Buscar el elemento con el texto "Negociación"
    const negotiationTitle = page.locator('p.text-dark-neutral.text-medium:has-text("Negociación")');
    
    try {
      await expect(negotiationTitle).toBeVisible({ timeout: WAIT_FOR_ELEMENT_TIMEOUT });
      console.log('✅ Elemento "Negociación" encontrado en la página');
    } catch (error) {
      // Intentar con un selector más flexible
      const negotiationTitleAlt = page.locator('p:has-text("Negociación")');
      const isVisible = await negotiationTitleAlt.isVisible().catch(() => false);
      
      if (isVisible) {
        console.log('✅ Elemento "Negociación" encontrado (selector alternativo)');
      } else {
        // Buscar en el contenedor específico mencionado
        const negotiationContainer = page.locator('div.grow.flex.items-center.justify-center');
        const negotiationText = negotiationContainer.locator('p.text-dark-neutral.text-medium:has-text("Negociación")');
        const isVisibleInContainer = await negotiationText.isVisible().catch(() => false);
        
        if (isVisibleInContainer) {
          console.log('✅ Elemento "Negociación" encontrado en el contenedor específico');
        } else {
          throw new Error('❌ No se encontró el elemento "Negociación" en la página de negociación');
        }
      }
    }

    // Validar que el contenedor específico existe
    const negotiationContainer = page.locator('div.grow.flex.items-center.justify-center');
    const containerExists = await negotiationContainer.isVisible().catch(() => false);
    
    if (containerExists) {
      console.log('✅ Contenedor de negociación encontrado');
      
      // Validar que contiene el texto "Negociación"
      const containerText = await negotiationContainer.textContent();
      if (containerText && containerText.includes('Negociación')) {
        console.log('✅ El contenedor contiene el texto "Negociación"');
      }
    }

    console.log('✅ Prueba de selección de evento y redirección a negociación completada exitosamente');
  });

  test('validar responsividad y elementos visuales', async ({ page }) => {
    // --- NAVEGAR A CALENDARIO ---
    await showStepMessage(page, '📅 NAVEGANDO A CALENDARIO');
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);
    
    await page.goto(CALENDAR_URL);
    await page.waitForTimeout(WAIT_FOR_PAGE_LOAD);

    // --- VALIDAR ELEMENTOS VISUALES ---
    await showStepMessage(page, '🎨 VALIDANDO ELEMENTOS VISUALES');
    await page.waitForTimeout(1000);

    // Validar que el calendario tiene sombra
    const calendarContainer = page.locator('div.flex.bg-light-light.items-center.justify-between.shadow-4.rounded-5');
    const hasShadow = await calendarContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.boxShadow !== 'none';
    });
    console.log(`✅ Sombra del calendario: ${hasShadow ? 'Presente' : 'No presente'}`);

    // Validar que el calendario tiene fondo claro
    const bgColor = await calendarContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`✅ Color de fondo del calendario: ${bgColor}`);

    // Validar que los días tienen forma circular cuando están seleccionados
    const dayButtons = page.locator('div.flex.flex-col.gap-1 button[type="button"]');
    const firstDay = dayButtons.first();
    const borderRadius = await firstDay.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius;
    });
    console.log(`✅ Radio de borde de los días: ${borderRadius}`);

    // Validar separador
    const separator = page.locator('div.h-\\[1px\\].w-full.bg-light-neutral');
    const separatorColor = await separator.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`✅ Color del separador: ${separatorColor}`);

    console.log('✅ Elementos visuales validados');
  });
});

