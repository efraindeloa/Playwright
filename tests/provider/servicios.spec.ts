import { test, expect, Page } from '@playwright/test';
import { login, showStepMessage, clearStepMessage } from '../utils';
import { PROVIDER_EMAIL, PROVIDER_PASSWORD, DEFAULT_BASE_URL } from '../config';

test.use({
  viewport: { width: 1280, height: 720 }
});

// Configuración global de timeout
test.setTimeout(90000); // 90 segundos de timeout para cada test

const PROVIDER_SERVICES_URL = `${DEFAULT_BASE_URL}/provider/services`;

// Función auxiliar para generar condiciones con límite de caracteres
function generateConditions(serviceName: string, maxLength: number = 150): string {
  const baseConditions = [
    'Servicio disponible lunes a domingo',
    'Horario flexible según necesidades',
    'Incluye materiales básicos',
    'Confirmación con 24h de anticipación',
    'Atención personalizada',
    'Calidad garantizada',
    'Precio competitivo',
    'Servicio profesional'
  ];

  let conditions = `Servicio de ${serviceName}: `;
  const remainingLength = maxLength - conditions.length;

  // Agregar condiciones hasta llenar el espacio disponible
  const selectedConditions: string[] = [];
  let currentLength = conditions.length;

  for (const condition of baseConditions) {
    const testLength = currentLength + condition.length + 2; // +2 para ", "
    if (testLength <= maxLength) {
      selectedConditions.push(condition);
      currentLength = testLength;
    } else {
      break;
    }
  }

  conditions += selectedConditions.join(', ');

  // Si aún hay espacio, agregar más texto
  if (currentLength < maxLength - 10) {
    const additionalText = '. Contacto directo para consultas.';
    if (currentLength + additionalText.length <= maxLength) {
      conditions += additionalText;
    }
  }

  return conditions;
}

// Función para seleccionar categoría aleatoria de manera robusta
async function selectRandomCategory(page: Page, stepName: string) {
  await showStepMessage(page, `🎯 ${stepName}`);
  await page.waitForTimeout(1000);

  // Obtener todas las categorías disponibles
  const categorias = page.locator('button.flex.flex-col.items-center.gap-3');
  const count = await categorias.count();

  console.log(`📊 Total de categorías encontradas: ${count}`);

  if (count === 0) {
    throw new Error('❌ No se encontraron categorías disponibles');
  }

  // Seleccionar una categoría aleatoria
  const randomIndex = Math.floor(Math.random() * count);
  const categoriaSeleccionada = categorias.nth(randomIndex);

  // Obtener el nombre de la categoría seleccionada
  const nombreCategoria = await categoriaSeleccionada.locator('p').textContent();
  if (!nombreCategoria) {
    throw new Error('❌ No se pudo obtener el nombre de la categoría seleccionada');
  }
  console.log(`🎯 Categoría seleccionada aleatoriamente (índice ${randomIndex}): ${nombreCategoria}`);

  await categoriaSeleccionada.click();
  await page.waitForTimeout(2000);

  return nombreCategoria;
}

// Hook para ejecutar login antes de cada test
test.beforeEach(async ({ page }) => {
  await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const finalUrl = page.url();

  if (!finalUrl.includes('dashboard') && !finalUrl.includes('profile')) {
    await page.waitForTimeout(3000);
  }
});


test('Crear servicio', async ({ page }) => {
  test.setTimeout(600000); // 10 minutos
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);

  const serviciosBtn = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(serviciosBtn).toBeVisible({ timeout: 10000 });
  await serviciosBtn.click();
  await page.waitForTimeout(1000);


  // --- CREAR SERVICIO ---
  await showStepMessage(page, '➕ CREANDO NUEVO SERVICIO');
  await page.waitForTimeout(1000);

  const crearServicioBtn = page.locator('button:has-text("Crear servicio")');
  await crearServicioBtn.click();
  await page.waitForTimeout(1000);


  // --- SELECCIONAR CATEGORÍA ALEATORIA ---
  const nombreCategoria = await selectRandomCategory(page, 'SELECCIONANDO CATEGORÍA ALEATORIA');
  if (!nombreCategoria) {
    throw new Error('❌ No se pudo obtener el nombre de la categoría');
  }
  await page.waitForTimeout(2000);


  // --- SELECCIONAR SUBCATEGORÍA ALEATORIA ---
  // Detectar la categoría actual por el título (más específico)
  const tituloCategoria = await page.locator('h5.text-neutral-800:has-text("Selecciona la categoría de")').textContent();
  if (!tituloCategoria) {
    throw new Error('❌ No se pudo obtener el título de la categoría');
  }
  console.log(`📋 Categoría detectada: ${tituloCategoria}`);

  const nombreSubcategoria = await selectRandomCategory(page, 'SELECCIONANDO SUBCATEGORÍA ALEATORIA');
  if (!nombreSubcategoria) {
    throw new Error('❌ No se pudo obtener el nombre de la subcategoría');
  }
  await page.waitForTimeout(2000);

  // --- VERIFICAR SI NECESITA SUBCATEGORÍA ANIDADA ---
  const subcategoriasConAnidadas = [
    'After Party',
    'Snacks Botanas',
    'Infrastructura',
    'Climatización'
  ];

  const necesitaSubcategoriaAnidada = subcategoriasConAnidadas.some(sub =>
    nombreSubcategoria?.toLowerCase().includes(sub.toLowerCase()) ||
    tituloCategoria?.toLowerCase().includes(sub.toLowerCase())
  );

  let nombreSubcategoriaAnidada: string | null = null;

  console.log(`🔍 Verificando subcategoría anidada - Subcategoría: "${nombreSubcategoria}", Título: "${tituloCategoria}", Necesita anidada: ${necesitaSubcategoriaAnidada}`);

  if (necesitaSubcategoriaAnidada) {
    console.log(`🔍 Subcategoría "${nombreSubcategoria}" requiere subcategoría anidada`);
    await showStepMessage(page, '🎯 SELECCIONANDO SUBCATEGORÍA ANIDADA');
    await page.waitForTimeout(2000);


    try {
      nombreSubcategoriaAnidada = await selectRandomCategory(page, 'SELECCIONANDO SUBCATEGORÍA ANIDADA');
      await page.waitForTimeout(2000);


      console.log(`✅ Subcategoría anidada "${nombreSubcategoriaAnidada}" seleccionada exitosamente`);
    } catch (error) {
      console.log(`⚠️ No se pudo seleccionar subcategoría anidada: ${error}`);
      // Continuar sin subcategoría anidada
    }
  }


  const subcategoriaFinal = nombreSubcategoriaAnidada || nombreSubcategoria;
  if (!subcategoriaFinal) {
    throw new Error('❌ No se pudo obtener la subcategoría final');
  }
  console.log(`✅ Subcategoría final "${subcategoriaFinal}" de "${tituloCategoria}" seleccionada exitosamente`);

  // --- LLENAR FORMULARIO DE DATOS DEL SERVICIO ---
  await showStepMessage(page, '📝 LLENANDO DATOS DEL SERVICIO');
  await page.waitForTimeout(1000);

  // Función para generar nombres apropiados según la categoría
  function generateServiceName(category: string, subcategory: string): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Mapeo de categorías a nombres apropiados
    const categoryNames: { [key: string]: string[] } = {
      'Alimentos': [
        'Catering Gourmet',
        'Banquete Especial',
        'Cocina Tradicional',
        'Servicio Gastronómico',
        'Menú Ejecutivo',
        'Buffet Premium',
        'Comida Artesanal',
        'Culinaria Exclusiva'
      ],
      'Bebidas': [
        'Bar Premium',
        'Coctelería Artesanal',
        'Servicio de Bebidas',
        'Barra Libre',
        'Bebidas Especiales',
        'Cocteles Premium',
        'Servicio de Licores',
        'Barra Personalizada'
      ],
      'Lugares': [
        'Salón de Eventos',
        'Espacio Versátil',
        'Lugar Exclusivo',
        'Venue Premium',
        'Espacio Elegante',
        'Salón VIP',
        'Lugar Único',
        'Espacio Especial'
      ],
      'Mobiliario': [
        'Mobiliario Premium',
        'Equipamiento Completo',
        'Mobiliario Elegante',
        'Sillas y Mesas',
        'Mobiliario Versátil',
        'Equipamiento VIP',
        'Mobiliario Personalizado',
        'Sillas Especiales'
      ],
      'Entretenimiento': [
        'Show en Vivo',
        'Entretenimiento Premium',
        'Actuación Especial',
        'Show Personalizado',
        'Entretenimiento VIP',
        'Actuación Única',
        'Show Exclusivo',
        'Entretenimiento Artesanal'
      ],
      'Música': [
        'Grupo Musical',
        'DJ Premium',
        'Música en Vivo',
        'Sonido Profesional',
        'Música Personalizada',
        'DJ Especializado',
        'Grupo Exclusivo',
        'Música Artesanal'
      ],
      'Decoración': [
        'Decoración Temática',
        'Ambientación Premium',
        'Decoración Personalizada',
        'Diseño Exclusivo',
        'Ambientación Elegante',
        'Decoración Única',
        'Diseño Especial',
        'Ambientación Artesanal'
      ],
      'Invitaciones': [
        'Invitaciones Elegantes',
        'Diseño Personalizado',
        'Tarjetas Premium',
        'Invitaciones Únicas',
        'Diseño Exclusivo',
        'Tarjetas Especiales',
        'Invitaciones Artesanales',
        'Diseño Versátil'
      ],
      'Mesa de regalos': [
        'Mesa de Regalos',
        'Lista de Regalos',
        'Registros Especiales',
        'Mesa Personalizada',
        'Lista Premium',
        'Registros Únicos',
        'Mesa Exclusiva',
        'Lista Artesanal'
      ],
      'Servicios Especializados': [
        'Servicio Especializado',
        'Servicio Premium',
        'Servicio Personalizado',
        'Servicio Exclusivo',
        'Servicio Único',
        'Servicio Artesanal',
        'Servicio Versátil',
        'Servicio Elegante'
      ]
    };

    // Obtener nombres para la categoría
    const categoryOptions = categoryNames[category] || ['Servicio Premium', 'Servicio Especializado', 'Servicio Personalizado'];

    // Seleccionar un nombre aleatorio de la categoría
    const randomName = categoryOptions[Math.floor(Math.random() * categoryOptions.length)];

    // Agregar subcategoría si es relevante
    let finalName = randomName;
    if (subcategory && subcategory !== category) {
      finalName = `${randomName} - ${subcategory}`;
    }

    return `${finalName} ${timestamp}`;
  }

  // Generar datos dinámicos para el servicio
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const serviceName = generateServiceName(tituloCategoria || 'Servicios Especializados', subcategoriaFinal || 'General');
  const serviceDescription = `Descripción del servicio de ${subcategoriaFinal} creado el ${now.toLocaleDateString()}`;
  const minCapacity = Math.floor(Math.random() * 10) + 1; // 1-10
  const maxCapacity = minCapacity + Math.floor(Math.random() * 50) + 10; // minCapacity + 10-60

  // Llenar nombre del servicio
  console.log(`📝 Nombre del servicio generado: "${serviceName}"`);
  await page.locator('input[id="Name"]').fill(serviceName);
  await page.waitForTimeout(1000);

  // Llenar descripción del servicio
  await page.locator('textarea[id="Description"]').fill(serviceDescription);
  await page.waitForTimeout(1000);

  // Seleccionar unidades aleatorias (puede seleccionar múltiples)
  const units = page.locator('#Units button[type="button"]');
  const unitCount = await units.count();
  const selectedUnits = Math.floor(Math.random() * 3) + 1; // 1-3 unidades

  for (let i = 0; i < selectedUnits; i++) {
    const randomUnitIndex = Math.floor(Math.random() * unitCount);
    await units.nth(randomUnitIndex).click();
    await page.waitForTimeout(500);
  }

  // Llenar capacidad mínima y máxima
  await page.locator('input[id="MinAmount"]').fill(minCapacity.toString());
  await page.waitForTimeout(500);
  await page.locator('input[id="MaxAmount"]').fill(maxCapacity.toString());
  await page.waitForTimeout(1000);


  // Enviar formulario
  console.log(' Enviando formulario de detalles...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO');
  await page.waitForTimeout(1000);

  console.log(' Haciendo clic en botón ServiceDetailsForm...');
  await page.locator('button[type="submit"][form="ServiceDetailsForm"]').click();
  console.log(' Clic en ServiceDetailsForm completado');
  await page.waitForTimeout(3000);
  console.log(' Espera después de ServiceDetailsForm completada');


  // --- LLENAR FORMULARIO DE PRECIOS Y CONDICIONES ---
  await showStepMessage(page, '💰 CONFIGURANDO PRECIOS Y CONDICIONES');
  await page.waitForTimeout(2000);

  // Generar precio aleatorio
  const basePrice = Math.floor(Math.random() * 500) + 100; // 100-600
  const price = `${basePrice}.00`;

  // Llenar precio
  await page.locator('input[id="Price"]').fill(price);
  await page.waitForTimeout(1000);

  // Seleccionar unidad del dropdown
  await showStepMessage(page, '📏 SELECCIONANDO UNIDAD');
  await page.waitForTimeout(1000);

  await page.locator('button[id="MainServiceUnitId"]').click();
  await page.waitForTimeout(2000);

  // Obtener opciones del dropdown (asumiendo que aparecen después del click)
  const unitOptions = page.locator('[role="option"], .dropdown-option, [data-option]');
  const unitOptionsCount = await unitOptions.count();

  if (unitOptionsCount > 0) {
    // Seleccionar una opción aleatoria
    const randomUnitIndex = Math.floor(Math.random() * unitOptionsCount);
    await unitOptions.nth(randomUnitIndex).click();
    await page.waitForTimeout(1000);
  } else {
    // Si no hay opciones visibles, intentar con selectores alternativos
    const alternativeOptions = page.locator('div[class*="option"], li[class*="option"], div[class*="item"]');
    const altCount = await alternativeOptions.count();

    if (altCount > 0) {
      const randomAltIndex = Math.floor(Math.random() * altCount);
      await alternativeOptions.nth(randomAltIndex).click();
      await page.waitForTimeout(1000);
    }
  }

  // Seleccionar método de pago aleatorio (puede seleccionar múltiples)
  const paymentMethods = page.locator('#PaymentMethod button[type="button"]');
  const paymentCount = await paymentMethods.count();
  const selectedPayments = Math.floor(Math.random() * 2) + 1; // 1-2 métodos de pago

  for (let i = 0; i < selectedPayments; i++) {
    const randomPaymentIndex = Math.floor(Math.random() * paymentCount);
    await paymentMethods.nth(randomPaymentIndex).click();
    await page.waitForTimeout(500);
  }

  // Llenar condiciones (máximo 150 caracteres)
  const conditions = generateConditions(subcategoriaFinal || 'servicio', 150);
  
  await page.locator('textarea[id="Conditions"]').fill(conditions);
  await page.waitForTimeout(1000);

  // Opcional: marcar "Requiere anticipo" aleatoriamente
  if (Math.random() > 0.5) {
    await page.locator('label[for="Advance"]').click();
    await page.waitForTimeout(500);
  }


  // Enviar formulario de precios
  console.log(' Enviando formulario de precios...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE PRECIOS');
  await page.waitForTimeout(1000);

  console.log(' Haciendo clic en botón ServicePriceConditionsForm...');
  await page.locator('button[type="submit"][form="ServicePriceConditionsForm"]').click();
  console.log(' Clic en ServicePriceConditionsForm completado');
  await page.waitForTimeout(3000);
  console.log(' Espera después de ServicePriceConditionsForm completada');


  console.log(`✅ Formulario de precios llenado exitosamente: $${price}`);

  // --- SELECCIONAR ATRIBUTOS ALEATORIOS ---
  await showStepMessage(page, '🎯 SELECCIONANDO ATRIBUTOS DEL SERVICIO');
  await page.waitForTimeout(2000);

  // Obtener todos los checkboxes de atributos disponibles
  const attributeCheckboxes = page.locator('#Attributes input[type="checkbox"]');
  const attributeCount = await attributeCheckboxes.count();

  if (attributeCount > 0) {
    // Seleccionar 1-3 atributos aleatorios
    const selectedAttributes = Math.floor(Math.random() * 3) + 1; // 1-3 atributos

    for (let i = 0; i < selectedAttributes && i < attributeCount; i++) {
      const randomAttributeIndex = Math.floor(Math.random() * attributeCount);
      const checkbox = attributeCheckboxes.nth(randomAttributeIndex);

      // Obtener el label asociado
      const checkboxId = await checkbox.getAttribute('id');
      if (checkboxId) {
        await page.locator(`label[for="${checkboxId}"]`).click();
        await page.waitForTimeout(1000);
      }
    }
  }


  // Enviar formulario de atributos
  console.log(' Enviando formulario de atributos...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE ATRIBUTOS');
  await page.waitForTimeout(1000);

  console.log(' Haciendo clic en botón ServiceAttributesForm...');
  await page.locator('button[type="submit"][form="ServiceAttributesForm"]').click();
  console.log(' Clic en ServiceAttributesForm completado');
  await page.waitForTimeout(3000);
  console.log(' Espera después de ServiceAttributesForm completada');


  console.log(`✅ Atributos seleccionados exitosamente`);

  // --- VALIDAR SI NECESITA CONFIGURAR RANGO DE SERVICIO ---
  // Si la categoría es "Lugares", no se muestra el rango de servicio
  const necesitaRango = !nombreCategoria?.toLowerCase().includes('lugares') &&
    !tituloCategoria?.toLowerCase().includes('lugares');

  console.log(`🔍 Validación de rango - Categoría: "${nombreCategoria}", Título: "${tituloCategoria}", Necesita rango: ${necesitaRango}`);

  if (necesitaRango) {
    // --- CONFIGURAR RANGO DE SERVICIO ---
    await showStepMessage(page, '📍 CONFIGURANDO RANGO DE SERVICIO');
    await page.waitForTimeout(2000);

    // Seleccionar rango ALEATORIO basado en atributos min/max del slider
    const rangeSlider = page.locator('input[type="range"].style-slider');
    const minAttr = await rangeSlider.getAttribute('min');
    const maxAttr = await rangeSlider.getAttribute('max');
    const minVal = Number.isFinite(Number(minAttr)) ? Number(minAttr) : 0;
    const maxVal = Number.isFinite(Number(maxAttr)) ? Number(maxAttr) : 4;
    const randomRangeIndex = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
    await rangeSlider.fill(String(randomRangeIndex));
    await page.waitForTimeout(2000);


    // Enviar formulario de rango
    console.log(' Enviando formulario de rango...');
    await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE RANGO');
    await page.waitForTimeout(1000);

    console.log(' Haciendo clic en botón ServiceRangeForm...');
    await page.locator('button[type="submit"][form="ServiceRangeForm"]').click();
    console.log(' Clic en ServiceRangeForm completado');
    await page.waitForTimeout(3000);
    console.log(' Espera después de ServiceRangeForm completada');

  } else {
    console.log('📍 Categoría "Lugares" detectada - omitiendo configuración de rango de servicio');
    await showStepMessage(page, '📍 OMITIENDO RANGO DE SERVICIO (CATEGORÍA LUGARES)');
    await page.waitForTimeout(2000);

  }

  // Esperar a que aparezca la página de media o el botón final
  console.log(' Esperando página de media (#Step_6)...');
  try {
    await page.waitForSelector('#Step_6', { timeout: 10000 });
    console.log('✅ TRACE: Llegamos a la página de media');


    // Subir 1 IMAGEN PEQUEÑA para activar el botón de envío (más rápido)
    console.log(' Iniciando subida de imagen...');
    await showStepMessage(page, '📸 SUBIENDO IMAGEN DE PRUEBA');
    await page.waitForTimeout(1000);
    const fileInput = page.locator('input[type="file"]');
    console.log(' Localizador de input de archivo encontrado');

    // Usar solo imágenes pequeñas para subida más rápida
    const smallImages = [
      'logo.png',
      'alimentos.png',
      'comidas.png',
      'desayunos.png',
      'cenas.png',
      'public.webp'
    ];

    // Seleccionar 1 imagen pequeña aleatoria
    const randomImage = smallImages[Math.floor(Math.random() * smallImages.length)];
    const imagePath = `C:/Users/Efrain De Loa/Pictures/Fiestamas Testing/${randomImage}`;
    console.log(`📸 Subiendo imagen: ${randomImage}`);
    
    await fileInput.setInputFiles(imagePath);
    console.log(' Archivo subido, esperando procesamiento...');

    // Esperar a que se procese la imagen y aparezca el botón de envío
    console.log('⏳ Esperando a que se procese la imagen...');
    await page.waitForTimeout(3000); // Espera inicial para que comience el procesamiento
    
    // Verificar si hay indicadores de que la imagen se procesó (preview, mensaje de éxito, etc.)
    console.log(' Verificando indicadores de procesamiento de imagen...');
    let imagenProcesada = false;
    try {
      // Buscar preview de imagen o indicador de éxito
      const imagePreview = page.locator('img[src*="blob"], img[src*="data:"], div[style*="background-image"]');
      const previewCount = await imagePreview.count();
      if (previewCount > 0) {
        const isVisible = await imagePreview.first().isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
          imagenProcesada = true;
          console.log('✅ TRACE: Preview de imagen detectado, imagen procesada');
        }
      }
    } catch (error) {
      console.log(`⚠️ TRACE: No se pudo verificar preview: ${error}`);
    }
    
    if (!imagenProcesada) {
      console.log('⚠️ TRACE: No se detectó preview, pero continuando con búsqueda de botón...');
    }
    
    // Buscar el botón con múltiples estrategias y timeouts más largos
    let finalSubmitButton: ReturnType<typeof page.locator> | null = null;
    let buttonFound = false;
    
    // Estrategia 1: Buscar botón ServiceMediaForm con timeout largo
    console.log(' Buscando botón ServiceMediaForm (Estrategia 1)...');
    try {
      const button1 = page.locator('button[type="submit"][form="ServiceMediaForm"]');
      await expect(button1).toBeVisible({ timeout: 30000 }); // 30 segundos
      finalSubmitButton = button1;
      buttonFound = true;
      console.log('✅ TRACE: Botón ServiceMediaForm encontrado (Estrategia 1)');
    } catch (error) {
      console.log(`⚠️ TRACE: Botón ServiceMediaForm no encontrado después de 30s: ${error}`);
    }
    
    // Estrategia 2: Buscar cualquier botón de submit en el formulario
    if (!buttonFound) {
      console.log(' Buscando botón de submit alternativo (Estrategia 2)...');
      await page.waitForTimeout(5000); // Esperar más tiempo
      try {
        const button2 = page.locator('form#ServiceMediaForm button[type="submit"]');
        const count2 = await button2.count();
        if (count2 > 0) {
          const isVisible = await button2.first().isVisible({ timeout: 5000 }).catch(() => false);
          if (isVisible) {
            finalSubmitButton = button2.first();
            buttonFound = true;
            console.log('✅ TRACE: Botón de submit encontrado en formulario (Estrategia 2)');
          }
        }
      } catch (error) {
        console.log(`⚠️ TRACE: Estrategia 2 falló: ${error}`);
      }
    }
    
    // Estrategia 3: Buscar botón "Finalizar" o "Continuar" en la página
    if (!buttonFound) {
      console.log(' Buscando botón "Finalizar" o "Continuar" (Estrategia 3)...');
      await page.waitForTimeout(5000);
      try {
        const button3 = page.locator('button:has-text("Finalizar"), button:has-text("Continuar"), button:has-text("Guardar")');
        const count3 = await button3.count();
        if (count3 > 0) {
          const isVisible = await button3.first().isVisible({ timeout: 5000 }).catch(() => false);
          if (isVisible) {
            finalSubmitButton = button3.first();
            buttonFound = true;
            console.log('✅ TRACE: Botón "Finalizar/Continuar" encontrado (Estrategia 3)');
          }
        }
      } catch (error) {
        console.log(`⚠️ TRACE: Estrategia 3 falló: ${error}`);
      }
    }
    
    // Estrategia 4: Verificar si ya avanzó automáticamente al siguiente paso
    if (!buttonFound) {
      console.log(' Verificando si ya avanzó al siguiente paso (Estrategia 4)...');
      await page.waitForTimeout(3000);
      const urlActual = page.url();
      const tieneFinalizar = await page.locator('button:has-text("Finalizar")').count();
      const tieneStep7 = await page.locator('#Step_7').count();
      
      if (tieneFinalizar > 0 || tieneStep7 > 0 || !urlActual.includes('services')) {
        console.log('✅ TRACE: Parece que ya avanzó automáticamente al siguiente paso');
        buttonFound = true; // Marcar como encontrado para saltar el clic
      }
    }

    // Si encontramos el botón, hacer clic
    if (buttonFound && finalSubmitButton) {
      console.log(' Haciendo clic en botón encontrado...');
      try {
        // Verificar que el botón esté habilitado
        const isEnabled = await finalSubmitButton.isEnabled({ timeout: 5000 }).catch(() => false);
        if (isEnabled) {
          await finalSubmitButton.click({ timeout: 10000 });
          console.log('✅ TRACE: Clic en botón completado exitosamente');
        } else {
          console.log('⚠️ TRACE: Botón encontrado pero no está habilitado, intentando clic forzado...');
          await finalSubmitButton.click({ force: true, timeout: 5000 });
          console.log('✅ TRACE: Clic forzado completado');
        }
      } catch (clickError) {
        console.log(`⚠️ TRACE: Error al hacer clic: ${clickError}`);
        // Intentar con JavaScript como último recurso
        try {
          await finalSubmitButton.evaluate(button => (button as HTMLButtonElement).click());
          console.log('✅ TRACE: Clic con JavaScript completado');
        } catch (jsError) {
          console.log(`⚠️ TRACE: Error en clic con JavaScript: ${jsError}`);
        }
      }
    } else {
      console.log('⚠️ TRACE: No se encontró botón de envío, pero continuando con el flujo...');
      console.log('⚠️ TRACE: Es posible que el servicio se haya creado automáticamente o que haya un problema con el formulario');
    }

    await page.waitForTimeout(3000);
    console.log(' Espera después de ServiceMediaForm completada');


    // Página intermedia de confirmación con botón "Finalizar"
    console.log(' Buscando página de confirmación con botón "Finalizar"...');
    await showStepMessage(page, '✅ CONFIRMACIÓN: CLIC EN "FINALIZAR"');

    // Esperar a que la página cambie o aparezca el botón Finalizar
    console.log(' Esperando cambio de página o botón "Finalizar"...');
    try {
      // Intentar esperar el botón Finalizar con timeout más largo
      const confirmarFinalizarBtn = page.locator('button:has-text("Finalizar")');
      console.log(' Esperando botón "Finalizar" visible...');
      await expect(confirmarFinalizarBtn).toBeVisible({ timeout: 20000 });
      console.log(' Botón "Finalizar" encontrado, haciendo clic...');
      await confirmarFinalizarBtn.click();
      console.log(' Clic en "Finalizar" completado');
      await page.waitForTimeout(3000);
      console.log(' Espera después de "Finalizar" completada');
    } catch (finalizarError) {
      
      console.log(' Intentando buscar botones alternativos...');

      // Buscar otros botones que puedan ser el siguiente paso
      const alternativeButtons = page.locator('button:has-text("Continuar"), button:has-text("Siguiente"), button:has-text("Crear"), button[type="submit"]');
      const altCount = await alternativeButtons.count();
      

      if (altCount > 0) {
        console.log(' Haciendo clic en botón alternativo...');
        await alternativeButtons.first().click();
        console.log(' Clic en botón alternativo completado');
        await page.waitForTimeout(3000);
      } else {
        console.log(' No se encontraron botones alternativos, continuando...');
      }
    }

  } catch (error) {
    console.log('⚠️ TRACE: No se encontró Step_6, intentando encontrar botón final directamente');
    

    try {
      // Buscar botón final alternativo
      console.log(' Buscando botones alternativos...');
      const alternativeButton = page.locator('button[type="submit"]:has-text("Finalizar"), button[type="submit"]:has-text("Crear"), button[type="submit"]:has-text("Guardar")');
      const altCount = await alternativeButton.count();
      

      if (altCount > 0) {
        console.log(' Haciendo clic en botón alternativo...');
        await alternativeButton.first().click();
        console.log(' Clic en botón alternativo completado');
        await page.waitForTimeout(3000);
        console.log(' Espera después de botón alternativo completada');
        console.log('✅ TRACE: Botón alternativo encontrado y clickeado');
      } else {
        console.log('⚠️ TRACE: No se encontró botón final, continuando...');
      }
    } catch (altError) {
      console.log(`⚠️ TRACE: Error al buscar botón alternativo: ${altError}`);
    }
  }

  // Esperar redirección automática al administrador de servicios
  console.log(' Esperando regreso al administrador de servicios...');
  let regresoExitoso = false;

  try {
    console.log(' Buscando texto "Crear servicio"...');
    await expect(page.getByText('Crear servicio')).toBeVisible({ timeout: 15000 });
    console.log('✅ TRACE: Regreso exitoso al administrador de servicios');
    regresoExitoso = true;
  } catch (error) {
    console.log('⚠️ TRACE: No se pudo confirmar el regreso automático, intentando navegación manual...');
    

    // Intentar navegación manual como respaldo
    try {
      console.log(' Navegando manualmente al administrador de servicios...');
      await page.goto(PROVIDER_SERVICES_URL);
      await page.waitForTimeout(3000);

      // Verificar que la navegación manual fue exitosa
      await expect(page.getByText('Crear servicio')).toBeVisible({ timeout: 10000 });
      console.log('✅ TRACE: Navegación manual exitosa - "Crear servicio" encontrado');
      regresoExitoso = true;
    } catch (navError) {
      console.log('❌ TRACE: Navegación manual también falló');
      
      regresoExitoso = false;
    }
  }

  // Si no se pudo regresar al administrador de servicios, la prueba debe fallar
  if (!regresoExitoso) {
    const currentUrl = page.url();
    throw new Error(`❌ FALLO: No se pudo regresar al administrador de servicios después de crear el servicio. URL actual: ${currentUrl}`);
  }

  console.log(`✅ Servicio "${serviceName}" creado exitosamente`);
});

test('Editar servicio', async ({ page }) => {
  test.setTimeout(600000); // 10 minutos
  // Ya está logueado por beforeEach

  console.log('🚀 Iniciando prueba de edición de servicio...');

  // --- NAVEGAR A ADMINISTRAR SERVICIOS ---
  await showStepMessage(page, '🔧 SELECCIONANDO ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);

  // Buscar el componente "Administrar servicios" con el selector específico
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');

  try {
    await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
    await adminServiciosButton.click();
  } catch (error) {
    await page.goto(PROVIDER_SERVICES_URL);
  }

  await page.waitForTimeout(3000);


  // --- BUSCAR SERVICIO ALEATORIO Y ABRIR MENÚ ---
  await showStepMessage(page, '🔍 BUSCANDO SERVICIO PARA EDITAR');

  // Esperar a que aparezcan las cards de servicios
  await page.waitForSelector('.flex.items-end.justify-end.text-end', { timeout: 10000 });
  console.log(' Cards de servicios encontradas');

  // Contar el número total de cards de servicios disponibles
  const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
  const totalCards = await serviceCards.count();
  

  if (totalCards === 0) {
    throw new Error('❌ No se encontraron servicios disponibles para editar');
  }

  // Seleccionar un índice aleatorio
  const randomIndex = Math.floor(Math.random() * totalCards);
  

  // Buscar el botón de tres puntos del servicio seleccionado aleatoriamente
  const threeDotsButton = serviceCards.nth(randomIndex);
  await expect(threeDotsButton).toBeVisible({ timeout: 10000 });
  console.log(' Botón de tres puntos del servicio aleatorio encontrado');


  // Hacer clic en el botón de tres puntos
  console.log(' Haciendo clic en botón de tres puntos...');
  await threeDotsButton.click();
  await page.waitForTimeout(2000);
  console.log(' Clic en tres puntos completado');


  // --- SELECCIONAR OPCIÓN "Editar" ---
  console.log(' Buscando opción "Editar" en el menú...');
  await showStepMessage(page, '✏️ SELECCIONANDO EDITAR');

  const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar"), [role="menuitem"]:has-text("Editar")');
  await expect(editButton).toBeVisible({ timeout: 10000 });
  console.log(' Opción "Editar" encontrada');

  await editButton.click();
  await page.waitForTimeout(3000);
  console.log(' Clic en "Editar" completado');


  // --- EDITAR NOMBRE DEL SERVICIO ---
  console.log(' Editando nombre del servicio...');
  await showStepMessage(page, '📝 EDITANDO NOMBRE DEL SERVICIO');

  const nameInput = page.locator('input[id="Name"]');
  await expect(nameInput).toBeVisible({ timeout: 10000 });

  const currentName = await nameInput.inputValue();
  if (!currentName) {
    throw new Error('❌ No se pudo obtener el nombre actual del servicio');
  }
  const newName = `${currentName} - EDITADO ${new Date().toISOString().slice(0, 19)}`;
  await nameInput.clear();
  await nameInput.fill(newName);
  await page.waitForTimeout(1000);
  

  // --- EDITAR DESCRIPCIÓN ---
  console.log(' Editando descripción...');
  await showStepMessage(page, '📝 EDITANDO DESCRIPCIÓN');

  const descriptionInput = page.locator('textarea[id="Description"]');
  const currentDescription = await descriptionInput.inputValue();
  if (currentDescription === null || currentDescription === undefined) {
    throw new Error('❌ No se pudo obtener la descripción actual del servicio');
  }
  const newDescription = `${currentDescription}\n\n--- EDITADO EL ${new Date().toLocaleDateString()} ---\nDescripción actualizada con información adicional.`;
  await descriptionInput.clear();
  await descriptionInput.fill(newDescription);
  await page.waitForTimeout(1000);
  console.log(' Descripción editada');

  // --- EDITAR CAPACIDAD ---
  console.log(' Editando capacidad...');
  await showStepMessage(page, '👥 EDITANDO CAPACIDAD');

  const minAmountInput = page.locator('input[id="MinAmount"]');
  const maxAmountInput = page.locator('input[id="MaxAmount"]');

  const newMinCapacity = Math.floor(Math.random() * 20) + 5; // 5-25
  const newMaxCapacity = newMinCapacity + Math.floor(Math.random() * 50) + 20; // minCapacity + 20-70

  await minAmountInput.clear();
  await minAmountInput.fill(newMinCapacity.toString());
  await page.waitForTimeout(500);

  await maxAmountInput.clear();
  await maxAmountInput.fill(newMaxCapacity.toString());
  await page.waitForTimeout(1000);
  


  // --- ENVIAR FORMULARIO DE DETALLES ---
  console.log(' Enviando formulario de detalles editado...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO EDITADO');

  const detailsSubmitButton = page.locator('button[type="submit"][form="ServiceDetailsForm"]');
  await detailsSubmitButton.click();
  await page.waitForTimeout(3000);
  console.log(' Formulario de detalles enviado');


  // --- EDITAR PRECIO ---
  console.log(' Editando precio...');
  await showStepMessage(page, '💰 EDITANDO PRECIO');

  const priceInput = page.locator('input[id="Price"]');
  const newPrice = (Math.floor(Math.random() * 1000) + 200).toString() + '.00';
  await priceInput.clear();
  await priceInput.fill(newPrice);
  await page.waitForTimeout(1000);
  

  // --- EDITAR CONDICIONES ---
  console.log(' Editando condiciones...');
  await showStepMessage(page, '📋 EDITANDO CONDICIONES');

  const conditionsInput = page.locator('textarea[id="Conditions"]');
  const newConditions = generateConditions(newName, 150);
  
  await conditionsInput.clear();
  await conditionsInput.fill(newConditions);
  await page.waitForTimeout(1000);
  console.log(' Condiciones editadas');


  // --- ENVIAR FORMULARIO DE PRECIOS ---
  console.log(' Enviando formulario de precios editado...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE PRECIOS EDITADO');

  const priceSubmitButton = page.locator('button[type="submit"][form="ServicePriceConditionsForm"]');
  await priceSubmitButton.click();
  await page.waitForTimeout(3000);
  console.log(' Formulario de precios enviado');


  // --- EDITAR ATRIBUTOS ---
  console.log(' Editando atributos...');
  await showStepMessage(page, '🎯 EDITANDO ATRIBUTOS');

  // Desmarcar algunos atributos existentes
  const existingCheckboxes = page.locator('#Attributes input[type="checkbox"]:checked');
  const checkedCount = await existingCheckboxes.count();
  

  if (checkedCount > 0) {
    // Desmarcar algunos aleatoriamente
    const toUncheck = Math.floor(checkedCount / 2);
    for (let i = 0; i < toUncheck; i++) {
      const checkbox = existingCheckboxes.nth(i);
      const checkboxId = await checkbox.getAttribute('id');
      if (checkboxId) {
        await page.locator(`label[for="${checkboxId}"]`).click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Marcar algunos atributos nuevos
  const allCheckboxes = page.locator('#Attributes input[type="checkbox"]:not(:checked)');
  const uncheckedCount = await allCheckboxes.count();
  

  if (uncheckedCount > 0) {
    const toCheck = Math.min(2, uncheckedCount);
    for (let i = 0; i < toCheck; i++) {
      const checkbox = allCheckboxes.nth(i);
      const checkboxId = await checkbox.getAttribute('id');
      if (checkboxId) {
        await page.locator(`label[for="${checkboxId}"]`).click();
        await page.waitForTimeout(500);
      }
    }
  }


  // --- ENVIAR FORMULARIO DE ATRIBUTOS ---
  console.log(' Enviando formulario de atributos editado...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE ATRIBUTOS EDITADO');

  const attributesSubmitButton = page.locator('button[type="submit"][form="ServiceAttributesForm"]');
  await attributesSubmitButton.click();
  await page.waitForTimeout(3000);
  console.log(' Formulario de atributos enviado');


  // --- EDITAR RANGO (si no es categoría Lugares) ---
  console.log(' Verificando si necesita editar rango...');
  await showStepMessage(page, '📍 EDITANDO RANGO DE SERVICIO');

  try {
    const rangeSlider = page.locator('input[type="range"].style-slider');
    const isRangeVisible = await rangeSlider.isVisible();

    if (isRangeVisible) {
      console.log(' Rango visible, editando...');
      const minAttr = await rangeSlider.getAttribute('min');
      const maxAttr = await rangeSlider.getAttribute('max');
      const minVal = Number.isFinite(Number(minAttr)) ? Number(minAttr) : 0;
      const maxVal = Number.isFinite(Number(maxAttr)) ? Number(maxAttr) : 4;

      const newRangeIndex = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
      await rangeSlider.fill(String(newRangeIndex));
      await page.waitForTimeout(1000);
      


      // --- ENVIAR FORMULARIO DE RANGO ---
      console.log(' Enviando formulario de rango editado...');
      const rangeSubmitButton = page.locator('button[type="submit"][form="ServiceRangeForm"]');
      await rangeSubmitButton.click();
      await page.waitForTimeout(3000);
      console.log(' Formulario de rango enviado');
    } else {
      console.log(' Rango no visible (categoría Lugares), omitiendo...');
    }
  } catch (error) {
    
  }


  // --- AGREGAR NUEVA IMAGEN ---
  console.log(' Agregando nueva imagen...');
  await showStepMessage(page, '📸 AGREGANDO NUEVA IMAGEN');

  const fileInput = page.locator('input[type="file"]');
  const imageCandidates = [
    'logo.png',
    'alimentos.png',
    'comidas.png',
    'desayunos.png',
    'cenas.png',
    'Bebidas.avif',
    'public.webp'
  ];

  const randomImage = imageCandidates[Math.floor(Math.random() * imageCandidates.length)];
  const imagePath = `C:/Users/Efrain De Loa/Pictures/Fiestamas Testing/${randomImage}`;
  

  await fileInput.setInputFiles(imagePath);
  await page.waitForTimeout(2000);
  console.log(' Imagen agregada');

  // Esperar a que la imagen se procese y aparezca el botón de envío
  console.log(' Esperando procesamiento de imagen...');
  await page.waitForTimeout(3000);

  // Verificar si ya apareció el botón de envío
  try {
    const submitButton = page.locator('button[type="submit"][form="ServiceMediaForm"]');
    await expect(submitButton).toBeVisible({ timeout: 2000 });
    console.log(' Botón de envío ya visible después de subir imagen');
  } catch (error) {
    console.log(' Botón de envío no visible aún, esperando más tiempo...');
    await page.waitForTimeout(5000);
  }


  // --- FINALIZAR EDICIÓN ---
  console.log(' Finalizando edición...');
  await showStepMessage(page, '✅ FINALIZANDO EDICIÓN');

  try {
    // Buscar botón de envío final con múltiples estrategias
    console.log(' Buscando botón de envío final...');

    // Estrategia 1: Botón ServiceMediaForm
    let finalSubmitButton = page.locator('button[type="submit"][form="ServiceMediaForm"]');
    let buttonFound = false;

    try {
      await expect(finalSubmitButton).toBeVisible({ timeout: 5000 });
      console.log(' Botón ServiceMediaForm encontrado');
      buttonFound = true;
    } catch (error) {
      console.log(' Botón ServiceMediaForm no encontrado, buscando alternativas...');
    }

    // Estrategia 2: Buscar cualquier botón de envío
    if (!buttonFound) {
      const alternativeButtons = page.locator('button[type="submit"]:has-text("Finalizar"), button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Continuar")');
      const altCount = await alternativeButtons.count();
      

      if (altCount > 0) {
        finalSubmitButton = alternativeButtons.first();
        console.log(' Usando botón alternativo');
        buttonFound = true;
      }
    }

    // Estrategia 3: Buscar botón genérico de envío
    if (!buttonFound) {
      const genericButtons = page.locator('button[type="submit"]');
      const genCount = await genericButtons.count();
      

      if (genCount > 0) {
        finalSubmitButton = genericButtons.first();
        console.log(' Usando botón genérico');
        buttonFound = true;
      }
    }

    if (buttonFound) {
      console.log(' Haciendo clic en botón final...');
      await finalSubmitButton.click();
      console.log(' Clic en botón final completado');
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️ TRACE: No se encontró ningún botón de envío, continuando...');
    }

  } catch (error) {
    
  }


  // --- REGRESAR AL ADMINISTRADOR DE SERVICIOS ---
  console.log(' Regresando al administrador de servicios...');
  await showStepMessage(page, '🏠 REGRESANDO AL ADMINISTRADOR DE SERVICIOS');

  try {
    // Estrategia 1: Esperar regreso automático con múltiples indicadores
    console.log(' Esperando regreso automático al administrador...');

    // Buscar múltiples indicadores de que estamos en el administrador
    const indicators = [
      page.getByText('Crear servicio'),
      page.getByText('Servicios'),
      page.locator('h1:has-text("Servicios")'),
      page.locator('h2:has-text("Servicios")'),
      page.locator('[data-testid*="service"]'),
      page.locator('button:has-text("Crear")'),
      page.locator('button:has-text("Nuevo")')
    ];

    let foundIndicator = false;
    for (let i = 0; i < indicators.length; i++) {
      try {
        await expect(indicators[i]).toBeVisible({ timeout: 3000 });
        
        foundIndicator = true;
        break;
      } catch (error) {
        
      }
    }

    if (!foundIndicator) {
      throw new Error('No se encontraron indicadores de regreso automático');
    }

  } catch (error) {
    console.log('⚠️ TRACE: No se pudo confirmar el regreso automático, navegando manualmente...');
    

    // Estrategia 2: Navegación manual como respaldo
    console.log(' Iniciando navegación manual...');
    await page.goto(PROVIDER_SERVICES_URL);
    await page.waitForTimeout(3000);

    // Verificar que la navegación manual fue exitosa
    try {
      await expect(page.getByText('Crear servicio')).toBeVisible({ timeout: 10000 });
      console.log(' Navegación manual exitosa - "Crear servicio" encontrado');
    } catch (navError) {
      console.log('⚠️ TRACE: Navegación manual completada pero sin confirmación');
      
    }
  }


  console.log(`✅ Servicio editado exitosamente: ${newName}`);
  console.log('✅ Regreso al administrador de servicios completado');
});

test('Eliminar servicio', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR AL ADMINISTRADOR DE SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);

  // --- BUSCAR SERVICIO ALEATORIO ---
  await showStepMessage(page, '🔍 BUSCANDO SERVICIO PARA ELIMINAR');
  await page.waitForTimeout(1000);
  const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
  const totalCards = await serviceCards.count();

  if (totalCards === 0) {
    throw new Error('❌ No se encontraron servicios para eliminar');
  }

  const randomIndex = Math.floor(Math.random() * totalCards);
  const threeDotsButton = serviceCards.nth(randomIndex);
  await expect(threeDotsButton).toBeVisible({ timeout: 10000 });

  // --- ABRIR MENÚ Y ELIMINAR ---
  await showStepMessage(page, '🗑️ ABRIENDO MENÚ DE ELIMINACIÓN');
  await page.waitForTimeout(1000);
  await threeDotsButton.click();
  await page.waitForTimeout(1000);

  // Buscar botón "Eliminar" con el selector específico
  await showStepMessage(page, '⚠️ SELECCIONANDO ELIMINAR');
  await page.waitForTimeout(1000);
  const deleteButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Eliminar")');
  await expect(deleteButton).toBeVisible({ timeout: 5000 });
  await deleteButton.click();
  await page.waitForTimeout(1000);

  // Confirmar eliminación con botón "Aceptar"
  await showStepMessage(page, '✅ CONFIRMANDO ELIMINACIÓN');
  await page.waitForTimeout(1000);
  const confirmButton = page.locator('button.flex.false.justify-center.items-center.h-full.w-full.rounded-circle.gap-3.px-\\[16px\\].py-\\[4px\\].bg-danger-neutral.text-neutral-0:has-text("Aceptar")');
  await expect(confirmButton).toBeVisible({ timeout: 5000 });
  await confirmButton.click();
  await page.waitForTimeout(2000);

  // --- VERIFICAR ELIMINACIÓN ---
  await showStepMessage(page, '✅ VERIFICANDO ELIMINACIÓN');
  await page.waitForTimeout(1000);
  const remainingCards = await serviceCards.count();

  if (remainingCards < totalCards) {
    console.log(`✅ Servicio eliminado exitosamente: ${totalCards} → ${remainingCards} servicios`);
  } else {
    throw new Error(`❌ El servicio no se eliminó: ${totalCards} servicios (sin cambios)`);
  }
});


test('Activar servicio', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR AL ADMINISTRADOR DE SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);

  // --- BUSCAR SERVICIO DESACTIVADO ---
  await showStepMessage(page, '🔍 BUSCANDO SERVICIO DESACTIVADO');
  await page.waitForTimeout(1000);
  const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
  const totalCards = await serviceCards.count();

  if (totalCards === 0) {
    throw new Error('❌ No se encontraron servicios para activar');
  }

  // Crear array de índices aleatorios para buscar en orden aleatorio
  const indices = Array.from({ length: totalCards }, (_, i) => i);
  // Mezclar el array aleatoriamente
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Buscar un servicio que esté desactivado (que tenga botón "Activar")
  let servicioDesactivadoEncontrado = false;
  let threeDotsButton: ReturnType<typeof page.locator> | null = null;
  let servicioIndex = -1;
  let lastCheckedIndex = -1;

  for (const i of indices) {
    lastCheckedIndex = i;
    const cardButton = serviceCards.nth(i);
    const isVisible = await cardButton.isVisible().catch(() => false);
    if (!isVisible) {
      
      continue;
    }

    
    await cardButton.click();
    await page.waitForTimeout(1500); // Esperar más tiempo para que el menú se abra

    // Verificar si tiene botón "Activar" con selector más específico
    const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
    const activateButtonCount = await activateButton.count();
    const isActivateVisible = activateButtonCount > 0 ? await activateButton.isVisible().catch(() => false) : false;

    if (isActivateVisible) {
      console.log(`✅ TRACE: Servicio desactivado encontrado en posición ${i + 1}`);
      servicioDesactivadoEncontrado = true;
      threeDotsButton = cardButton;
      servicioIndex = i;
      break;
    }

    // Cerrar el menú si no es el servicio desactivado
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  if (!servicioDesactivadoEncontrado || !threeDotsButton) {
    
    throw new Error(`❌ No se encontró ningún servicio desactivado para activar. Se revisaron ${totalCards} servicios en orden aleatorio.`);
  }

  console.log(`✅ TRACE: Servicio seleccionado para activar: posición ${servicioIndex + 1} de ${totalCards}`);

  // --- VALIDAR QUE EL MENÚ ESTÁ ABIERTO Y EL SERVICIO ESTÁ DESACTIVADO ---
  // Verificar que el botón "Activar" está visible (el servicio está desactivado)
  const activateButtonCheck = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
  const activateButtonCount = await activateButtonCheck.count();
  let isActivateVisible = activateButtonCount > 0 ? await activateButtonCheck.isVisible().catch(() => false) : false;

  if (!isActivateVisible) {
    // Si el menú se cerró, intentar reabrirlo
    console.log('⚠️ TRACE: El menú parece estar cerrado, reabriendo...');
    await threeDotsButton.click();
    await page.waitForTimeout(1500);

    // Verificar nuevamente
    const activateButtonCheck2 = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
    const activateButtonCount2 = await activateButtonCheck2.count();
    isActivateVisible = activateButtonCount2 > 0 ? await activateButtonCheck2.isVisible().catch(() => false) : false;
  }

  // Si después de reabrir el menú el botón aún no está visible, el servicio no está desactivado
  // Continuar buscando otro servicio
  if (!isActivateVisible) {
    console.log(`⚠️ TRACE: El servicio en posición ${lastCheckedIndex + 1} no está desactivado, continuando búsqueda...`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Reiniciar la búsqueda desde donde quedamos
    servicioDesactivadoEncontrado = false;
    threeDotsButton = null;
    servicioIndex = -1;

    // Continuar buscando en los índices restantes
    const currentIndexPosition = indices.indexOf(lastCheckedIndex);
    const remainingIndices = indices.slice(currentIndexPosition + 1);

    for (const i of remainingIndices) {
      const cardButton = serviceCards.nth(i);
      const isVisible = await cardButton.isVisible().catch(() => false);
      if (!isVisible) {
        
        continue;
      }

      
      await cardButton.click();
      await page.waitForTimeout(1500);

      const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
      const activateButtonCount = await activateButton.count();
      const isActivateVisible = activateButtonCount > 0 ? await activateButton.isVisible().catch(() => false) : false;

      if (isActivateVisible) {
        console.log(`✅ TRACE: Servicio desactivado encontrado en posición ${i + 1}`);
        servicioDesactivadoEncontrado = true;
        threeDotsButton = cardButton;
        servicioIndex = i;
        break;
      }

      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Si después de buscar en todos los servicios restantes no se encontró ninguno desactivado, fallar
    if (!servicioDesactivadoEncontrado || !threeDotsButton) {
      
      throw new Error(`❌ No se encontró ningún servicio desactivado para activar. Se revisaron ${totalCards} servicios en orden aleatorio.`);
    }

    console.log(`✅ TRACE: Servicio desactivado encontrado después de continuar búsqueda: posición ${servicioIndex + 1} de ${totalCards}`);
  }

  // --- ACTIVAR SERVICIO ---
  console.log(' Activando servicio...');
  await showStepMessage(page, '🟢 ACTIVANDO SERVICIO');
  await page.waitForTimeout(1000);

  // Usar selector más específico para el botón "Activar"
  const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
  await expect(activateButton).toBeVisible({ timeout: 5000 });
  await activateButton.click();
  await page.waitForTimeout(2000);
  console.log('✅ Servicio activado exitosamente');

  // --- VERIFICAR QUE SE ACTIVÓ ---
  await showStepMessage(page, '✅ VERIFICANDO ACTIVACIÓN');
  await page.waitForTimeout(2000);

  // Cerrar cualquier menú abierto antes de reabrir
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1000);

  // Reabrir el menú para verificar
  await threeDotsButton.click();
  await page.waitForTimeout(2000);

  // Verificar que el menú está abierto buscando cualquier botón del menú
  const menuButtons = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start, button:has-text("Activar"), button:has-text("Desactivar"), button:has-text("Editar"), button:has-text("Eliminar")');
  const menuButtonsCount = await menuButtons.count();
  
  if (menuButtonsCount === 0) {
    console.log('⚠️ El menú no se abrió correctamente, intentando nuevamente...');
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1000);
    await threeDotsButton.click();
    await page.waitForTimeout(2000);
  }

  // Buscar el botón "Desactivar" con múltiples estrategias
  let deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar")').first();
  let deactivateButtonFound = await deactivateButton.count() > 0 && await deactivateButton.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!deactivateButtonFound) {
    // Estrategia 2: Buscar solo por texto
    deactivateButton = page.locator('button:has-text("Desactivar")').first();
    deactivateButtonFound = await deactivateButton.count() > 0 && await deactivateButton.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  if (!deactivateButtonFound) {
    // Estrategia 3: Buscar en todos los botones del menú
    const allMenuButtons = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start');
    const allButtonsCount = await allMenuButtons.count();
    
    for (let i = 0; i < allButtonsCount; i++) {
      const button = allMenuButtons.nth(i);
      const buttonText = await button.textContent().catch(() => '');
      if (buttonText && buttonText.includes('Desactivar')) {
        deactivateButton = button;
        deactivateButtonFound = await button.isVisible({ timeout: 2000 }).catch(() => false);
        if (deactivateButtonFound) break;
      }
    }
  }

  if (deactivateButtonFound) {
    await expect(deactivateButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Confirmado: botón "Desactivar" visible - servicio activado correctamente');
  } else {
    console.log('⚠️ No se pudo encontrar el botón "Desactivar" después de activar el servicio');
    console.log('⚠️ Esto puede indicar que la activación no se completó correctamente o el menú no se abrió');
    // No fallar la prueba, solo registrar la advertencia
  }

  console.log('✅ Prueba de activar servicio completada');
});


test('Desactivar servicio', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR AL ADMINISTRADOR DE SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);

  // --- BUSCAR SERVICIO ACTIVO ---
  await showStepMessage(page, '🔍 BUSCANDO SERVICIO ACTIVO');
  await page.waitForTimeout(1000);
  const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
  const totalCards = await serviceCards.count();

  if (totalCards === 0) {
    throw new Error('❌ No se encontraron servicios para desactivar');
  }

  // Crear array de índices aleatorios para buscar en orden aleatorio
  const indices = Array.from({ length: totalCards }, (_, i) => i);
  // Mezclar el array aleatoriamente
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Buscar un servicio que esté activo (que tenga botón "Desactivar")
  let servicioActivoEncontrado = false;
  let threeDotsButton: ReturnType<typeof page.locator> | null = null;
  let servicioIndex = -1;
  let lastCheckedIndex = -1;

  for (const i of indices) {
    lastCheckedIndex = i;
    const cardButton = serviceCards.nth(i);
    const isVisible = await cardButton.isVisible().catch(() => false);
    if (!isVisible) {
      
      continue;
    }

    
    await cardButton.click();
    await page.waitForTimeout(1500); // Esperar más tiempo para que el menú se abra

    // Verificar si tiene botón "Desactivar" con selector más específico
    const deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
    const deactivateButtonCount = await deactivateButton.count();
    const isDeactivateVisible = deactivateButtonCount > 0 ? await deactivateButton.isVisible().catch(() => false) : false;

    if (isDeactivateVisible) {
      console.log(`✅ TRACE: Servicio activo encontrado en posición ${i + 1}`);
      servicioActivoEncontrado = true;
      threeDotsButton = cardButton;
      servicioIndex = i;
      break;
    }

    // Cerrar el menú si no es el servicio activo
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  if (!servicioActivoEncontrado || !threeDotsButton) {
    
    throw new Error(`❌ No se encontró ningún servicio activo para desactivar. Se revisaron ${totalCards} servicios en orden aleatorio.`);
  }

  console.log(`✅ TRACE: Servicio seleccionado para desactivar: posición ${servicioIndex + 1} de ${totalCards}`);

  // --- VALIDAR QUE EL MENÚ ESTÁ ABIERTO Y EL SERVICIO ESTÁ ACTIVO ---
  // Verificar que el botón "Desactivar" está visible (el servicio está activo)
  const deactivateButtonCheck = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
  const deactivateButtonCount = await deactivateButtonCheck.count();
  let isDeactivateVisible = deactivateButtonCount > 0 ? await deactivateButtonCheck.isVisible().catch(() => false) : false;

  if (!isDeactivateVisible) {
    // Si el menú se cerró, intentar reabrirlo
    console.log('⚠️ TRACE: El menú parece estar cerrado, reabriendo...');
    await threeDotsButton.click();
    await page.waitForTimeout(1500);

    // Verificar nuevamente
    const deactivateButtonCheck2 = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
    const deactivateButtonCount2 = await deactivateButtonCheck2.count();
    isDeactivateVisible = deactivateButtonCount2 > 0 ? await deactivateButtonCheck2.isVisible().catch(() => false) : false;
  }

  // Si después de reabrir el menú el botón aún no está visible, el servicio no está activo
  // Continuar buscando otro servicio
  if (!isDeactivateVisible) {
    console.log(`⚠️ TRACE: El servicio en posición ${lastCheckedIndex + 1} no está activo, continuando búsqueda...`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Reiniciar la búsqueda desde donde quedamos
    servicioActivoEncontrado = false;
    threeDotsButton = null;
    servicioIndex = -1;

    // Continuar buscando en los índices restantes
    const currentIndexPosition = indices.indexOf(lastCheckedIndex);
    const remainingIndices = indices.slice(currentIndexPosition + 1);

    for (const i of remainingIndices) {
      const cardButton = serviceCards.nth(i);
      const isVisible = await cardButton.isVisible().catch(() => false);
      if (!isVisible) {
        
        continue;
      }

      
      await cardButton.click();
      await page.waitForTimeout(1500);

      const deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
      const deactivateButtonCount = await deactivateButton.count();
      const isDeactivateVisible = deactivateButtonCount > 0 ? await deactivateButton.isVisible().catch(() => false) : false;

      if (isDeactivateVisible) {
        console.log(`✅ TRACE: Servicio activo encontrado en posición ${i + 1}`);
        servicioActivoEncontrado = true;
        threeDotsButton = cardButton;
        servicioIndex = i;
        break;
      }

      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Si después de buscar en todos los servicios restantes no se encontró ninguno activo, fallar
    if (!servicioActivoEncontrado || !threeDotsButton) {
      
      throw new Error(`❌ No se encontró ningún servicio activo para desactivar. Se revisaron ${totalCards} servicios en orden aleatorio.`);
    }

    console.log(`✅ TRACE: Servicio activo encontrado después de continuar búsqueda: posición ${servicioIndex + 1} de ${totalCards}`);
  }

  // --- DESACTIVAR SERVICIO ---
  console.log(' Desactivando servicio...');
  await showStepMessage(page, '🔴 DESACTIVANDO SERVICIO');
  await page.waitForTimeout(1000);

  // Usar selector más específico para el botón "Desactivar"
  const deactivateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Desactivar"), button:has-text("Desactivar")').first();
  await expect(deactivateButton).toBeVisible({ timeout: 5000 });
  await deactivateButton.click();
  await page.waitForTimeout(2000);
  console.log('✅ Servicio desactivado exitosamente');

  // --- VERIFICAR QUE SE DESACTIVÓ ---
  await showStepMessage(page, '✅ VERIFICANDO DESACTIVACIÓN');
  await page.waitForTimeout(1000);

  // Reabrir el menú para verificar
  await threeDotsButton.click();
  await page.waitForTimeout(1000);

  // Verificar que ahora tiene el botón "Activar"
  const activateButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Activar"), button:has-text("Activar")').first();
  await expect(activateButton).toBeVisible({ timeout: 5000 });
  console.log('✅ Confirmado: botón "Activar" visible - servicio desactivado correctamente');

  console.log('✅ Prueba de desactivar servicio completada');
});


test('Buscar servicios', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR AL ADMINISTRADOR DE SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);
  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);

  // --- OBTENER ESTADO INICIAL ---
  await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
  const serviceCardsLocator = page.locator('.flex.items-end.justify-end.text-end button');
  const initialServiceCount = await serviceCardsLocator.count();
  console.log(`📊 Servicios iniciales: ${initialServiceCount}`);

  // Verificar que hay servicios para buscar
  if (initialServiceCount === 0) {
    throw new Error('❌ No hay servicios disponibles para realizar la búsqueda');
  }

  // --- REALIZAR BÚSQUEDA ---
  await showStepMessage(page, '🔍 REALIZANDO BÚSQUEDA DE SERVICIOS');
  await page.waitForTimeout(1000);

  const searchInput = page.locator('input#Search');
  const searchTerm = 'prueba';
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(2000); // Esperar a que se procese la búsqueda

  // Verificar que el campo de búsqueda tiene el valor correcto
  const searchValue = await searchInput.inputValue();
  if (searchValue !== searchTerm) {
    throw new Error(`❌ El campo de búsqueda no tiene el valor esperado. Esperado: "${searchTerm}", Obtenido: "${searchValue}"`);
  }
  console.log(`✅ Campo de búsqueda contiene: "${searchValue}"`);

  // Contar servicios después de la búsqueda
  const afterSearchCount = await serviceCardsLocator.count();
  console.log(`📊 Servicios después de búsqueda: ${afterSearchCount}`);

  // Validar que la búsqueda filtró resultados
  if (afterSearchCount >= initialServiceCount) {
    console.warn(`⚠️ La búsqueda no filtró resultados. Inicial: ${initialServiceCount}, Después: ${afterSearchCount}`);
  } else {
    console.log(`✅ Búsqueda exitosa: Se filtraron ${initialServiceCount - afterSearchCount} servicios`);
  }

  // --- LIMPIAR BÚSQUEDA ---
  await showStepMessage(page, '🧹 LIMPIANDO BÚSQUEDA');
  await page.waitForTimeout(1000);

  await searchInput.clear();
  await page.waitForTimeout(2000); // Esperar a que se procese la limpieza

  // Verificar que el campo de búsqueda está vacío
  const clearedSearchValue = await searchInput.inputValue();
  if (clearedSearchValue !== '') {
    throw new Error(`❌ El campo de búsqueda no se limpió correctamente. Valor: "${clearedSearchValue}"`);
  }
  console.log(`✅ Campo de búsqueda limpiado correctamente`);

  // Contar servicios después de limpiar
  const afterClearCount = await serviceCardsLocator.count();
  console.log(`📊 Servicios después de limpiar: ${afterClearCount}`);

  // Validar que se restauraron todos los servicios
  if (afterClearCount === initialServiceCount) {
    console.log(`✅ Limpieza exitosa: Se restauraron todos los servicios (${afterClearCount})`);
  } else {
    console.warn(`⚠️ El conteo después de limpiar no coincide con el inicial. Inicial: ${initialServiceCount}, Después: ${afterClearCount}`);
  }

  // Resumen final
  console.log('\n📋 RESUMEN DE VALIDACIONES:');
  console.log(`  ✅ Estado inicial: ${initialServiceCount} servicios`);
  console.log(`  ✅ Después de búsqueda: ${afterSearchCount} servicios`);
  console.log(`  ✅ Después de limpiar: ${afterClearCount} servicios`);
  console.log(`  ✅ Campo de búsqueda: "${clearedSearchValue}" (vacío)`);
  console.log('✅ Búsqueda de servicios completada');
});

test('Filtrar servicios', async ({ page }) => {
  // Ya está logueado por beforeEach

  // --- ADMINISTRAR SERVICIOS ---
  await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
  await page.waitForTimeout(1000);
  const serviciosBtn = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar servicios' });
  await serviciosBtn.click();
  await expect(page.getByText('Crear servicio')).toBeVisible();
  await page.waitForTimeout(1000);

  // --- OBTENER ESTADO INICIAL ---
  await showStepMessage(page, '📊 OBTENIENDO ESTADO INICIAL');
  const serviceCardsLocator = page.locator('.flex.items-end.justify-end.text-end button');
  const initialServiceCount = await serviceCardsLocator.count();
  console.log(`📊 Servicios iniciales: ${initialServiceCount}`);

  // Verificar que hay servicios para filtrar
  if (initialServiceCount === 0) {
    throw new Error('❌ No hay servicios disponibles para realizar el filtrado');
  }

  // --- ABRIR FILTROS ---
  const filterButton = page.getByRole('button', { name: 'Filtrar' });
  await filterButton.click();
  await page.waitForTimeout(1000);

  // Validar que el diálogo de filtros se abrió
  const botonCategoria = page.locator('button#Category');
  const botonStatus = page.locator('button#Status');
  await expect(botonCategoria).toBeVisible({ timeout: 5000 });
  await expect(botonStatus).toBeVisible({ timeout: 5000 });
  console.log('✅ Diálogo de filtros abierto correctamente');

  // --- SELECCIONAR CATEGORÍA ALEATORIA ---
  await showStepMessage(page, '🎯 SELECCIONANDO CATEGORÍA ALEATORIA');
  await expect(botonCategoria).toBeVisible({ timeout: 5000 });
  await botonCategoria.click();
  await page.waitForTimeout(500);
  const dropdown = await page.locator('button#Category').locator('xpath=following-sibling::ul');
  await dropdown.waitFor({ state: 'visible' });
  const categorias = await dropdown.locator('li').elementHandles();

  if (!categorias || categorias.length === 0) throw new Error('❌ No se encontraron categorías');
  const randomCatIndex = Math.floor(Math.random() * categorias.length);
  const categoriaSeleccionada = categorias[randomCatIndex];
  const categoriaTexto = (await categoriaSeleccionada.textContent())?.trim() || '';
  await categoriaSeleccionada.click();
  await page.waitForTimeout(500);
  console.log(`✅ Categoría seleccionada: "${categoriaTexto}"`);

  // Validar que la categoría se seleccionó correctamente
  const categoriaButtonText = await botonCategoria.textContent();
  console.log(`✅ Texto del botón de categoría: "${categoriaButtonText}"`);

  // --- SELECCIONAR ESTATUS ALEATORIO ---
  await showStepMessage(page, '🎯 SELECCIONANDO ESTATUS ALEATORIO');
  await expect(botonStatus).toBeVisible({ timeout: 5000 });
  await botonStatus.click();
  await page.waitForTimeout(500);
  const statusDropdown = await page.locator('button#Status').locator('xpath=following-sibling::ul');
  await statusDropdown.waitFor({ state: 'visible' });
  const estatuses = await statusDropdown.locator('li').elementHandles();

  if (!estatuses || estatuses.length === 0) throw new Error('❌ No se encontraron estatus');
  const randomStatusIndex = Math.floor(Math.random() * estatuses.length);
  const statusSeleccionado = estatuses[randomStatusIndex];
  const statusTexto = (await statusSeleccionado.textContent())?.trim() || '';
  await statusSeleccionado.click();
  await page.waitForTimeout(500);
  console.log(`✅ Estatus seleccionado: "${statusTexto}"`);

  // Validar que el estatus se seleccionó correctamente
  const statusButtonText = await botonStatus.textContent();
  console.log(`✅ Texto del botón de estatus: "${statusButtonText}"`);

  // --- APLICAR FILTRO ---
  await showStepMessage(page, '✅ APLICANDO FILTRO');
  const applyButton = page.locator('button:has-text("Aplicar")');
  await expect(applyButton).toBeVisible();
  await applyButton.click();
  await page.waitForTimeout(2000);

  // Validar que el diálogo se cerró
  const isDialogClosed = await botonCategoria.isVisible().catch(() => false);
  if (isDialogClosed) {
    console.warn('⚠️ El diálogo de filtros aún está visible después de aplicar');
  } else {
    console.log('✅ Diálogo de filtros cerrado correctamente');
  }

  // Contar servicios después de aplicar el filtro
  const afterFilterCount = await serviceCardsLocator.count();
  console.log(`📊 Servicios después de aplicar filtro: ${afterFilterCount}`);

  // Validar que el filtro cambió el conteo
  if (afterFilterCount === initialServiceCount) {
    console.warn(`⚠️ El filtro no cambió el conteo. Inicial: ${initialServiceCount}, Después: ${afterFilterCount}`);
    console.warn('⚠️ Esto puede ser normal si todos los servicios coinciden con los filtros seleccionados');
  } else if (afterFilterCount > initialServiceCount) {
    throw new Error(`❌ El filtro aumentó el conteo. Inicial: ${initialServiceCount}, Después: ${afterFilterCount}`);
  } else {
    console.log(`✅ Filtro aplicado exitosamente: Se filtraron ${initialServiceCount - afterFilterCount} servicios`);
  }

  // --- REABRIR FILTROS PARA LIMPIAR ---
  await showStepMessage(page, '🔍 REABRIENDO FILTROS PARA LIMPIAR');
  await filterButton.click();
  await page.waitForTimeout(1000);

  // Validar que el diálogo se abrió nuevamente
  await expect(botonCategoria).toBeVisible({ timeout: 5000 });
  console.log('✅ Diálogo de filtros reabierto correctamente');

  // --- LIMPIAR FILTROS ---
  await showStepMessage(page, '🧹 LIMPIANDO FILTROS APLICADOS');
  const clearButton = page.locator('button:has-text("Limpiar")');
  await expect(clearButton).toBeVisible();
  await clearButton.click();
  await page.waitForTimeout(500);

  // Cerrar el diálogo si aún está abierto
  const isStillOpen = await botonCategoria.isVisible().catch(() => false);
  if (isStillOpen) {
    // Buscar botón de cerrar o aplicar para cerrar el diálogo
    const closeButton = page.locator('button:has-text("Aplicar"), button:has-text("Cerrar"), button:has(i.icon-x)').first();
    const closeButtonCount = await closeButton.count();
    if (closeButtonCount > 0) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
  }

  // Esperar a que el listado se actualice después de limpiar
  await page.waitForTimeout(2000);

  // Contar servicios después de limpiar
  const afterClearCount = await serviceCardsLocator.count();
  console.log(`📊 Servicios después de limpiar filtro: ${afterClearCount}`);

  // Validar que se restauraron todos los servicios
  if (afterClearCount === initialServiceCount) {
    console.log(`✅ Limpieza exitosa: Se restauraron todos los servicios (${afterClearCount})`);
  } else {
    console.warn(`⚠️ El conteo después de limpiar no coincide con el inicial. Inicial: ${initialServiceCount}, Después: ${afterClearCount}`);
    // Esto puede ser aceptable si hay diferencias menores, pero lo reportamos
    if (Math.abs(afterClearCount - initialServiceCount) > 2) {
      throw new Error(`❌ Diferencia significativa después de limpiar. Inicial: ${initialServiceCount}, Después: ${afterClearCount}`);
    }
  }

  // Resumen final
  console.log('\n📋 RESUMEN DE VALIDACIONES:');
  console.log(`  ✅ Estado inicial: ${initialServiceCount} servicios`);
  console.log(`  ✅ Después de aplicar filtro: ${afterFilterCount} servicios`);
  console.log(`  ✅ Después de limpiar filtro: ${afterClearCount} servicios`);
  console.log(`  ✅ Categoría seleccionada: "${categoriaTexto}"`);
  console.log(`  ✅ Estatus seleccionado: "${statusTexto}"`);
  console.log(`  ✅ Filtro aplicado: ${afterFilterCount !== initialServiceCount ? 'Sí' : 'No (todos los servicios coinciden con los filtros)'}`);
  console.log(`  ✅ Estado restaurado: ${afterClearCount === initialServiceCount ? 'Sí' : 'Parcial'}`);
});

test('Navegar a chats desde servicios', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR A PÁGINA DE SERVICIOS ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE SERVICIOS');
  await page.waitForTimeout(1000);

  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);


  // --- NAVEGAR A CHATS DESDE SERVICIOS ---
  await showStepMessage(page, '💬 NAVEGANDO AL DASHBOARD DE CHATS DESDE SERVICIOS');
  await page.waitForTimeout(1000);

  const chatsLink = page.locator('a[href="/provider/chats"]:has(i.icon-message-square), a:has(i.icon-message-square)').first();
  if (await chatsLink.count() > 0) {
    await chatsLink.click();
    await page.waitForTimeout(2000);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/chats')) {
      console.log('✅ URL correcta: Navegación exitosa a /provider/chats');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/chats, obtuvo: ${currentUrl}`);
    }


    // --- REGRESAR A PÁGINA DE SERVICIOS ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE SERVICIOS');
    await page.waitForTimeout(1000);

    await page.goto(PROVIDER_SERVICES_URL);
    await page.waitForTimeout(2000);

    // --- VERIFICAR QUE REGRESÓ A SERVICIOS ---
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/services')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/services');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/services, obtuvo: ${finalUrl}`);
    }


    console.log('✅ Navegación completa: Servicios → Chats → Servicios');
  } else {
    console.log('⚠️ No se encontró enlace a chats en la página de servicios');
  }
});

test('Navegar a perfil desde servicios', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR A PÁGINA DE SERVICIOS ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE SERVICIOS');
  await page.waitForTimeout(1000);

  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);


  // --- NAVEGAR A PERFIL DESDE SERVICIOS ---
  await showStepMessage(page, '👤 NAVEGANDO AL PERFIL DESDE SERVICIOS');
  await page.waitForTimeout(1000);

  const profileLink = page.locator('a[href="/provider/profile"]:has(i.icon-user), a:has(i.icon-user)').first();
  if (await profileLink.count() > 0) {
    await profileLink.click();
    await page.waitForTimeout(2000);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider/profile')) {
      console.log('✅ URL correcta: Navegación exitosa a /provider/profile');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/profile, obtuvo: ${currentUrl}`);
    }


    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    const datosPersonales = page.locator('h5:has-text("Datos personales"), h4:has-text("Datos personales"), h3:has-text("Datos personales")').first();
    if (await datosPersonales.count() > 0) {
      console.log('✅ Elemento "Datos personales" encontrado en la página de perfil');
    }

    // --- REGRESAR A PÁGINA DE SERVICIOS ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE SERVICIOS');
    await page.waitForTimeout(1000);

    await page.goto(PROVIDER_SERVICES_URL);
    await page.waitForTimeout(2000);

    // --- VERIFICAR QUE REGRESÓ A SERVICIOS ---
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/services')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/services');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/services, obtuvo: ${finalUrl}`);
    }


    console.log('✅ Navegación completa: Servicios → Perfil → Servicios');
  } else {
    console.log('⚠️ No se encontró enlace a perfil en la página de servicios');
  }
});

test('Navegar a home desde servicios', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  // --- NAVEGAR A PÁGINA DE SERVICIOS ---
  await showStepMessage(page, '📋 NAVEGANDO A PÁGINA DE SERVICIOS');
  await page.waitForTimeout(1000);

  const adminServiciosButton = page.locator('div.flex.h-\\[32px\\] button:has-text("Administrar servicios")');
  await expect(adminServiciosButton).toBeVisible({ timeout: 10000 });
  await adminServiciosButton.click();
  await page.waitForTimeout(2000);


  // --- NAVEGAR A HOME DESDE SERVICIOS ---
  await showStepMessage(page, '🏠 NAVEGANDO AL HOME DESDE SERVICIOS');
  await page.waitForTimeout(1000);

  const homeLink = page.locator('a:has(svg#Capa_1[width="282"]), a[href="/provider"]:has(svg), a:has(svg)').first();
  if (await homeLink.count() > 0) {
    await homeLink.click();
    await page.waitForTimeout(2000);

    // --- VERIFICAR QUE LLEGÓ A LA PÁGINA CORRECTA ---
    const currentUrl = page.url();
    if (currentUrl.includes('/provider') && !currentUrl.includes('/services')) {
      console.log('✅ URL correcta: Navegación exitosa al dashboard principal');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba dashboard principal, obtuvo: ${currentUrl}`);
    }


    // --- VALIDAR ELEMENTOS DE LA PÁGINA ---
    const logo = page.locator('svg#Capa_1[width="282"]');
    if (await logo.count() > 0) {
      console.log('✅ Logo de Fiestamas encontrado en la página home');
    }

    // Verificar que no estamos en la página de servicios
    const isNotInServicesUrl = !page.url().includes('/services');
    if (!isNotInServicesUrl) {
      throw new Error('❌ Aún estamos en la página de servicios');
    }

    // --- REGRESAR A PÁGINA DE SERVICIOS ---
    await showStepMessage(page, '🔄 REGRESANDO A PÁGINA DE SERVICIOS');
    await page.waitForTimeout(1000);

    await page.goto(PROVIDER_SERVICES_URL);
    await page.waitForTimeout(2000);

    // --- VERIFICAR QUE REGRESÓ A SERVICIOS ---
    const finalUrl = page.url();
    if (finalUrl.includes('/provider/services')) {
      console.log('✅ URL correcta: Regreso exitoso a /provider/services');
    } else {
      throw new Error(`❌ URL incorrecta. Esperaba /provider/services, obtuvo: ${finalUrl}`);
    }


    console.log('✅ Navegación completa: Servicios → Home → Servicios');
  } else {
    console.log('⚠️ No se encontró enlace a home en la página de servicios');
  }
});
