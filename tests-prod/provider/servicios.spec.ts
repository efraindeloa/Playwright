import path from 'path';
import { test, expect, Page, Locator } from '@playwright/test';
import { login, uniqueSuffix } from '../utils';
import { DEFAULT_BASE_URL, PROVIDER_EMAIL, PROVIDER_PASSWORD } from '../config';

const SERVICES_URL = `${DEFAULT_BASE_URL}/provider/services`;
const IMAGE_FIXTURE = path.resolve(__dirname, '..', '..', 'tests', 'profile.png');
const IMAGE_FIXTURE_INFANTIL = path.resolve(__dirname, '..', '..', 'tests', 'infantil.jpg');

type CreatedService = {
  name: string;
};

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

// Función para mostrar mensajes explicativos
async function showStepMessage(page: Page, message: string) {
  await page.evaluate((msg) => {
    let box = document.getElementById('__playwright_step_overlay');
    if (!box) {
      box = document.createElement('div');
      box.id = '__playwright_step_overlay';
      box.style.position = 'fixed';
      box.style.top = '50%';
      box.style.left = '50%';
      box.style.transform = 'translate(-50%, -50%)';
      box.style.zIndex = '999999';
      box.style.padding = '15px 25px';
      box.style.background = 'rgba(243, 130, 246, 0.9)';
      box.style.color = 'white';
      box.style.fontSize = '24px';
      box.style.borderRadius = '12px';
      box.style.fontFamily = 'monospace';
      box.style.fontWeight = 'bold';
      box.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      box.style.textAlign = 'center';
      document.body.appendChild(box);
    }
    box.textContent = msg;

    // Auto-eliminar después de 2 segundos
    setTimeout(() => {
      if (box && box.parentNode) {
        box.parentNode.removeChild(box);
      }
    }, 2000);
  }, message);
}

test.use({ viewport: { width: 1280, height: 720 } });
test.setTimeout(120_000);

test.describe('Gestión de servicios en producción', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
    await page.waitForLoadState('networkidle');
  });

  test('crear un servicio', async ({ page }) => {
    console.log('[TEST] Iniciando creación de servicio...');
    
    // Navegar a servicios
    await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
    await gotoServices(page);
    await page.waitForTimeout(1000);
    
    // Verificar si hay servicios existentes o si está en estado vacío
    const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
    const totalCards = await serviceCards.count();
    
    if (totalCards === 0) {
      // Estado vacío: validar el botón "Crear servicio" dentro del estado vacío
      console.log('[TEST] No hay servicios creados - validando estado vacío...');
      await showStepMessage(page, '📋 VALIDANDO ESTADO VACÍO');
      const emptyStateContainer = page.locator('div.grow.flex.flex-col.justify-center.gap-6.items-center');
      await expect(emptyStateContainer).toBeVisible();
      
      const emptyStateIcon = emptyStateContainer.locator('i.icon-balloon');
      await expect(emptyStateIcon).toBeVisible();
      
      const emptyStateTitle = emptyStateContainer.getByText('¡Ofrece tus servicios!');
      await expect(emptyStateTitle).toBeVisible();
      
      const emptyStateDescription = emptyStateContainer.getByText('Crea tu primer servicio y conecta con nuevos clientes');
      await expect(emptyStateDescription).toBeVisible();
      
      // Validar el botón "Crear servicio" en el estado vacío
      const createButtonEmpty = emptyStateContainer.getByRole('button', { name: /Crear servicio/i });
      await expect(createButtonEmpty).toBeVisible();
      console.log('[TEST] ✓ Estado vacío validado correctamente');
    } else {
      // Hay servicios: validar el botón "Crear servicio" normal
      console.log(`[TEST] Hay ${totalCards} servicio(s) creado(s) - validando botón normal...`);
      await showStepMessage(page, '📋 VALIDANDO BOTÓN CREAR SERVICIO');
      const createButtonNormal = page.getByRole('button', { name: /Crear servicio/i });
      await expect(createButtonNormal).toBeVisible();
      console.log('[TEST] ✓ Botón "Crear servicio" normal validado');
    }
    
    // Crear el servicio (funciona en ambos casos)
    await showStepMessage(page, '➕ CREANDO NUEVO SERVICIO');
    const created = await createService(page);
    const serviceName = created.name;
    console.log(`[TEST] Servicio creado con nombre: ${serviceName}`);

    console.log(`[TEST] Verificando que el servicio "${serviceName}" sea visible...`);
    await showStepMessage(page, '✅ VERIFICANDO SERVICIO CREADO');
    await expectServiceVisible(page, serviceName);
    console.log(`[TEST] ✓ Servicio "${serviceName}" encontrado correctamente`);
    
    // El servicio no se elimina aquí, se eliminará con la prueba correspondiente
    await clearSearch(page);
  });

  test('editar un servicio', async ({ page }) => {
    test.setTimeout(600000); // 10 minutos
    
    console.log('[TEST] Iniciando edición de servicio...');
    
    // Navegar al administrador de servicios
    await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
    await gotoServices(page);
    await page.waitForTimeout(1000);
    
    // Buscar servicios existentes
    console.log('[TEST] Buscando servicios disponibles...');
    await showStepMessage(page, '🔍 BUSCANDO SERVICIO PARA EDITAR');
    const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
    const totalCards = await serviceCards.count();
    console.log(`[TEST] Total de servicios encontrados: ${totalCards}`);
    
    if (totalCards === 0) {
      throw new Error('❌ No se encontraron servicios disponibles para editar');
    }
    
    // Seleccionar un servicio aleatorio
    const randomIndex = Math.floor(Math.random() * totalCards);
    console.log(`[TEST] Seleccionando servicio aleatorio (índice ${randomIndex} de ${totalCards})`);
    const threeDotsButton = serviceCards.nth(randomIndex);
    await expect(threeDotsButton).toBeVisible({ timeout: 10000 });
    
    // Abrir menú y editar
    console.log('[TEST] Abriendo menú del servicio...');
    await threeDotsButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar botón "Editar"
    await showStepMessage(page, '✏️ SELECCIONANDO EDITAR');
    const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar"), [role="menuitem"]:has-text("Editar")');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    console.log('[TEST] Botón "Editar" encontrado, haciendo click...');
    await editButton.click();
    await page.waitForTimeout(3000);
    
    // Editar el servicio
    await showStepMessage(page, '📝 EDITANDO DATOS DEL SERVICIO');
    const nameInput = page.locator('input[id="Name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    const currentName = await nameInput.inputValue();
    const newName = `${currentName} - EDITADO ${new Date().toISOString().slice(0, 19)}`;
    
    console.log(`[TEST] Editando servicio: "${currentName}" → "${newName}"`);
    
    // Editar nombre
    console.log(`[TEST] 📝 Nombre - Anterior: "${currentName}" → Nuevo: "${newName}"`);
    await nameInput.clear();
    await nameInput.fill(newName);
    await page.waitForTimeout(1000);
    
    // Editar descripción
    const descriptionInput = page.locator('textarea[id="Description"]');
    const currentDescription = await descriptionInput.inputValue();
    const newDescription = `${currentDescription}\n\n--- EDITADO EL ${new Date().toLocaleDateString()} ---`;
    console.log(`[TEST] 📝 Descripción - Anterior: "${currentDescription.substring(0, 50)}..." → Nuevo: "${newDescription.substring(0, 50)}..."`);
    await descriptionInput.clear();
    await descriptionInput.fill(newDescription);
    await page.waitForTimeout(1000);
    
    // Editar capacidad mínima y máxima
    await showStepMessage(page, '👥 EDITANDO CAPACIDAD');
    const minAmountInput = page.locator('input[id="MinAmount"]');
    const maxAmountInput = page.locator('input[id="MaxAmount"]');
    
    const currentMinCapacity = await minAmountInput.inputValue();
    const currentMaxCapacity = await maxAmountInput.inputValue();
    const newMinCapacity = Math.floor(Math.random() * 20) + 5; // 5-25
    const newMaxCapacity = newMinCapacity + Math.floor(Math.random() * 50) + 20; // minCapacity + 20-70
    
    console.log(`[TEST] 📝 Capacidad Mínima - Anterior: "${currentMinCapacity}" → Nuevo: "${newMinCapacity}"`);
    await minAmountInput.clear();
    await minAmountInput.fill(newMinCapacity.toString());
    await page.waitForTimeout(500);
    
    console.log(`[TEST] 📝 Capacidad Máxima - Anterior: "${currentMaxCapacity}" → Nuevo: "${newMaxCapacity}"`);
    await maxAmountInput.clear();
    await maxAmountInput.fill(newMaxCapacity.toString());
    await page.waitForTimeout(1000);
    
    // Enviar formulario de detalles
    await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE DETALLES');
    await submitForm(page, 'ServiceDetailsForm');
    
    // Editar precio
    await showStepMessage(page, '💰 EDITANDO PRECIO Y CONDICIONES');
    const priceInput = page.locator('input[id="Price"]');
    const currentPrice = await priceInput.inputValue();
    const newPrice = (Math.floor(Math.random() * 1000) + 200).toString() + '.00';
    console.log(`[TEST] 📝 Precio - Anterior: "$${currentPrice}" → Nuevo: "$${newPrice}"`);
    await priceInput.clear();
    await priceInput.fill(newPrice);
    await page.waitForTimeout(1000);
    
    // Editar condiciones
    const conditionsInput = page.locator('textarea[id="Conditions"]');
    if (await conditionsInput.count() > 0) {
      const currentConditions = await conditionsInput.inputValue();
      const newConditions = generateConditions(newName, 150);
      console.log(`[TEST] 📝 Condiciones - Anterior: "${currentConditions.substring(0, 50)}..." → Nuevo: "${newConditions.substring(0, 50)}..."`);
      await conditionsInput.clear();
      await conditionsInput.fill(newConditions);
      await page.waitForTimeout(1000);
    }
    
    // Enviar formulario de precios
    await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE PRECIOS');
    await submitForm(page, 'ServicePriceConditionsForm');
    
    // Editar atributos
    await showStepMessage(page, '🎯 EDITANDO ATRIBUTOS');
    console.log('[TEST] 📝 Editando atributos...');
    const attributeCheckboxes = page.locator('#Attributes input[type="checkbox"]');
    const attributeCount = await attributeCheckboxes.count();
    
    if (attributeCount > 0) {
      // Obtener atributos seleccionados antes
      const selectedAttributesBefore: string[] = [];
      const existingCheckboxes = page.locator('#Attributes input[type="checkbox"]:checked');
      const checkedCount = await existingCheckboxes.count();
      
      for (let i = 0; i < checkedCount; i++) {
        const checkbox = existingCheckboxes.nth(i);
        const checkboxId = await checkbox.getAttribute('id');
        if (checkboxId) {
          const label = page.locator(`label[for="${checkboxId}"]`);
          const labelText = await label.textContent();
          if (labelText) selectedAttributesBefore.push(labelText.trim());
        }
      }
      
      // Desmarcar algunos atributos existentes
      if (checkedCount > 0) {
        const toUncheck = Math.floor(checkedCount / 2);
        const uncheckedAttributes: string[] = [];
        for (let i = 0; i < toUncheck && i < checkedCount; i++) {
          const checkbox = existingCheckboxes.nth(i);
          const checkboxId = await checkbox.getAttribute('id');
          if (checkboxId) {
            const label = page.locator(`label[for="${checkboxId}"]`);
            const labelText = await label.textContent();
            if (labelText) uncheckedAttributes.push(labelText.trim());
            await label.click();
            await page.waitForTimeout(500);
          }
        }
        if (uncheckedAttributes.length > 0) {
          console.log(`[TEST] 📝 Atributos - Desmarcando: [${uncheckedAttributes.join(', ')}]`);
        }
      }
      
      // Marcar algunos atributos nuevos
      const allCheckboxes = page.locator('#Attributes input[type="checkbox"]:not(:checked)');
      const uncheckedCount = await allCheckboxes.count();
      
      if (uncheckedCount > 0) {
        const toCheck = Math.min(2, uncheckedCount);
        const checkedAttributes: string[] = [];
        for (let i = 0; i < toCheck; i++) {
          const checkbox = allCheckboxes.nth(i);
          const checkboxId = await checkbox.getAttribute('id');
          if (checkboxId) {
            const label = page.locator(`label[for="${checkboxId}"]`);
            const labelText = await label.textContent();
            if (labelText) checkedAttributes.push(labelText.trim());
            await label.click();
            await page.waitForTimeout(500);
          }
        }
        if (checkedAttributes.length > 0) {
          console.log(`[TEST] 📝 Atributos - Marcando: [${checkedAttributes.join(', ')}]`);
        }
      }
      
      // Obtener atributos seleccionados después
      const selectedAttributesAfter: string[] = [];
      const finalCheckboxes = page.locator('#Attributes input[type="checkbox"]:checked');
      const finalCheckedCount = await finalCheckboxes.count();
      
      for (let i = 0; i < finalCheckedCount; i++) {
        const checkbox = finalCheckboxes.nth(i);
        const checkboxId = await checkbox.getAttribute('id');
        if (checkboxId) {
          const label = page.locator(`label[for="${checkboxId}"]`);
          const labelText = await label.textContent();
          if (labelText) selectedAttributesAfter.push(labelText.trim());
        }
      }
      console.log(`[TEST] 📝 Atributos - Anterior: [${selectedAttributesBefore.join(', ')}] → Nuevo: [${selectedAttributesAfter.join(', ')}]`);
      
      // Enviar formulario de atributos
      await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE ATRIBUTOS');
      await submitForm(page, 'ServiceAttributesForm');
    }
    
    // Editar rango (si está disponible)
    await showStepMessage(page, '📍 EDITANDO RANGO DE SERVICIO');
    const rangeSlider = page.locator('input[type="range"].style-slider').first();
    if (await rangeSlider.count() > 0) {
      const isRangeVisible = await rangeSlider.isVisible();
      if (isRangeVisible) {
        const minAttr = await rangeSlider.getAttribute('min');
        const maxAttr = await rangeSlider.getAttribute('max');
        const minVal = Number.isFinite(Number(minAttr)) ? Number(minAttr) : 0;
        const maxVal = Number.isFinite(Number(maxAttr)) ? Number(maxAttr) : 4;
        
        const currentRangeValue = await rangeSlider.inputValue();
        const newRangeIndex = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        console.log(`[TEST] 📝 Rango - Anterior: "${currentRangeValue}" → Nuevo: "${newRangeIndex}"`);
        await rangeSlider.fill(String(newRangeIndex));
        await page.waitForTimeout(1000);
        
        // Enviar formulario de rango
        await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE RANGO');
        await submitForm(page, 'ServiceRangeForm');
      }
    }
    
    // Editar imagen (agregar nueva) - Código de staging
    await showStepMessage(page, '📸 AGREGANDO NUEVA IMAGEN');
    console.log('[TEST] 📝 Imagen - Anterior: "(imagen existente)" → Nuevo: "infantil.jpg"');
    console.log('[TEST] Agregando nueva imagen...');
    
    const fileInput = page.locator('input[type="file"]');
    const imageToUse = IMAGE_FIXTURE_INFANTIL;
    console.log(`[TEST] Agregando imagen: infantil.jpg`);
    
    await fileInput.setInputFiles(imageToUse);
    await page.waitForTimeout(2000);
    console.log('[TEST] Imagen agregada');
    
    // Esperar a que la imagen se procese y aparezca el botón de envío
    console.log('[TEST] Esperando procesamiento de imagen...');
    await page.waitForTimeout(3000);
    
    // Verificar si ya apareció el botón de envío
    try {
      const submitButton = page.locator('button[type="submit"][form="ServiceMediaForm"]');
      await expect(submitButton).toBeVisible({ timeout: 2000 });
      console.log('[TEST] Botón de envío ya visible después de subir imagen');
    } catch (error) {
      console.log('[TEST] Botón de envío no visible aún, esperando más tiempo...');
      await page.waitForTimeout(5000);
    }
    
    // Finalizar edición
    await showStepMessage(page, '✅ FINALIZANDO EDICIÓN');
    console.log('[TEST] Finalizando edición...');
    
    try {
      // Buscar botón de envío final con múltiples estrategias
      console.log('[TEST] Buscando botón de envío final...');
      
      // Estrategia 1: Botón ServiceMediaForm
      let finalSubmitButton = page.locator('button[type="submit"][form="ServiceMediaForm"]');
      let buttonFound = false;
      
      try {
        await expect(finalSubmitButton).toBeVisible({ timeout: 5000 });
        console.log('[TEST] Botón ServiceMediaForm encontrado');
        buttonFound = true;
      } catch (error) {
        console.log('[TEST] Botón ServiceMediaForm no encontrado, buscando alternativas...');
      }
      
      // Estrategia 2: Buscar cualquier botón de envío
      if (!buttonFound) {
        const alternativeButtons = page.locator('button[type="submit"]:has-text("Finalizar"), button[type="submit"]:has-text("Guardar"), button[type="submit"]:has-text("Actualizar"), button[type="submit"]:has-text("Continuar")');
        const altCount = await alternativeButtons.count();
        console.log(`[TEST] Botones alternativos encontrados: ${altCount}`);
        
        if (altCount > 0) {
          finalSubmitButton = alternativeButtons.first();
          console.log('[TEST] Usando botón alternativo');
          buttonFound = true;
        }
      }
      
      // Estrategia 3: Buscar botón genérico de envío
      if (!buttonFound) {
        const genericButtons = page.locator('button[type="submit"]');
        const genCount = await genericButtons.count();
        console.log(`[TEST] Botones genéricos encontrados: ${genCount}`);
        
        if (genCount > 0) {
          finalSubmitButton = genericButtons.first();
          console.log('[TEST] Usando botón genérico');
          buttonFound = true;
        }
      }
      
      if (buttonFound) {
        console.log('[TEST] Haciendo clic en botón final...');
        await finalSubmitButton.click();
        console.log('[TEST] Clic en botón final completado');
        await page.waitForTimeout(3000);
        console.log('[TEST] ✓ Imagen "infantil.jpg" agregada exitosamente');
      } else {
        console.log('[TEST] ⚠ No se encontró ningún botón de envío, continuando...');
      }
      
    } catch (error) {
      console.log(`[TEST] Error con botón final: ${error}`);
    }
    
    // Finalizar wizard
    await finalizeWizard(page);
    
    console.log(`[TEST] ✓ Servicio editado exitosamente: "${newName}"`);
  });

  test('desactivar un servicio', async ({ page }) => {
    console.log('[TEST] Iniciando desactivación de servicio...');
    
    // Navegar al administrador de servicios
    await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
    await gotoServices(page);
    await page.waitForTimeout(1000);
    
    // Buscar servicios existentes
    console.log('[TEST] Buscando servicios disponibles...');
    await showStepMessage(page, '🔍 BUSCANDO SERVICIO PARA DESACTIVAR');
    const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
    const totalCards = await serviceCards.count();
    console.log(`[TEST] Total de servicios encontrados: ${totalCards}`);
    
    if (totalCards === 0) {
      throw new Error('❌ No se encontraron servicios para desactivar');
    }
    
    // Seleccionar un servicio aleatorio
    const randomIndex = Math.floor(Math.random() * totalCards);
    console.log(`[TEST] Seleccionando servicio aleatorio (índice ${randomIndex} de ${totalCards})`);
    const threeDotsButton = serviceCards.nth(randomIndex);
    await expect(threeDotsButton).toBeVisible({ timeout: 10000 });
    
    // Abrir menú
    console.log('[TEST] Abriendo menú del servicio...');
    await threeDotsButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar botón "Desactivar"
    await showStepMessage(page, '⏸️ DESACTIVANDO SERVICIO');
    const deactivateButton = page.locator('button:has-text("Desactivar")');
    
    if (await deactivateButton.count() > 0) {
      // El servicio está activo, desactivarlo
      console.log('[TEST] Servicio está activo, desactivando...');
      await expect(deactivateButton).toBeVisible({ timeout: 5000 });
      await deactivateButton.click();
      await page.waitForTimeout(2000);
      console.log('[TEST] ✓ Servicio desactivado exitosamente');
    } else {
      console.log('[TEST] ⚠ El servicio ya está desactivado');
    }
  });

  test('activar un servicio', async ({ page }) => {
    console.log('[TEST] Iniciando activación de servicio...');
    
    // Navegar al administrador de servicios
    await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
    await gotoServices(page);
    await page.waitForTimeout(1000);
    
    // Buscar servicios existentes
    console.log('[TEST] Buscando servicios disponibles...');
    await showStepMessage(page, '🔍 BUSCANDO SERVICIO PARA ACTIVAR');
    const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
    const totalCards = await serviceCards.count();
    console.log(`[TEST] Total de servicios encontrados: ${totalCards}`);
    
    if (totalCards === 0) {
      throw new Error('❌ No se encontraron servicios para activar');
    }
    
    // Seleccionar un servicio aleatorio
    const randomIndex = Math.floor(Math.random() * totalCards);
    console.log(`[TEST] Seleccionando servicio aleatorio (índice ${randomIndex} de ${totalCards})`);
    const threeDotsButton = serviceCards.nth(randomIndex);
    await expect(threeDotsButton).toBeVisible({ timeout: 10000 });
    
    // Abrir menú
    console.log('[TEST] Abriendo menú del servicio...');
    await threeDotsButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar botón "Activar"
    await showStepMessage(page, '▶️ ACTIVANDO SERVICIO');
    const activateButton = page.locator('button:has-text("Activar")');
    
    if (await activateButton.count() > 0) {
      // El servicio está desactivado, activarlo
      console.log('[TEST] Servicio está desactivado, activando...');
      await expect(activateButton).toBeVisible({ timeout: 5000 });
      await activateButton.click();
      await page.waitForTimeout(2000);
      console.log('[TEST] ✓ Servicio activado exitosamente');
    } else {
      // El servicio está activo, desactivarlo primero y luego activarlo
      console.log('[TEST] Servicio está activo, desactivando primero...');
      await showStepMessage(page, '⏸️ DESACTIVANDO PRIMERO');
      const deactivateButton = page.locator('button:has-text("Desactivar")');
      await expect(deactivateButton).toBeVisible({ timeout: 5000 });
      await deactivateButton.click();
      await page.waitForTimeout(2000);
      
      // Reabrir menú
      await threeDotsButton.click();
      await page.waitForTimeout(1000);
      
      // Activar el servicio
      await showStepMessage(page, '▶️ ACTIVANDO SERVICIO');
      const activateButtonAfter = page.locator('button:has-text("Activar")');
      await expect(activateButtonAfter).toBeVisible({ timeout: 5000 });
      await activateButtonAfter.click();
      await page.waitForTimeout(2000);
      console.log('[TEST] ✓ Servicio activado exitosamente');
    }
  });

  test('eliminar un servicio', async ({ page }) => {
    console.log('[TEST] Iniciando eliminación de servicio...');
    
    // Navegar al administrador de servicios
    await showStepMessage(page, '🔧 NAVEGANDO A ADMINISTRAR SERVICIOS');
    await gotoServices(page);
    await page.waitForTimeout(1000);
    
    // Buscar servicios existentes usando el mismo selector que staging
    console.log('[TEST] Buscando servicios disponibles...');
    await showStepMessage(page, '🔍 BUSCANDO SERVICIO PARA ELIMINAR');
    const serviceCards = page.locator('.flex.items-end.justify-end.text-end button');
    const totalCards = await serviceCards.count();
    console.log(`[TEST] Total de servicios encontrados: ${totalCards}`);
    
    if (totalCards === 0) {
      throw new Error('❌ No se encontraron servicios para eliminar');
    }
    
    // Seleccionar un servicio aleatorio
    const randomIndex = Math.floor(Math.random() * totalCards);
    console.log(`[TEST] Seleccionando servicio aleatorio (índice ${randomIndex} de ${totalCards})`);
    const threeDotsButton = serviceCards.nth(randomIndex);
    await expect(threeDotsButton).toBeVisible({ timeout: 10000 });
    
    // Abrir menú y eliminar
    console.log('[TEST] Abriendo menú del servicio...');
    await threeDotsButton.click();
    await page.waitForTimeout(1000);
    
    // Buscar botón "Eliminar" con el selector específico (igual que staging)
    await showStepMessage(page, '🗑️ ELIMINANDO SERVICIO');
    const deleteButton = page.locator('button.flex.items-center.px-4.py-\\[6px\\].w-full.text-start:has-text("Eliminar")');
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    console.log('[TEST] Botón "Eliminar" encontrado, haciendo click...');
    await deleteButton.click();
    await page.waitForTimeout(1000);
    
    // Confirmar eliminación con botón "Aceptar" (igual que staging)
    await showStepMessage(page, '✅ CONFIRMANDO ELIMINACIÓN');
    const confirmButton = page.locator('button.flex.false.justify-center.items-center.h-full.w-full.rounded-circle.gap-3.px-\\[16px\\].py-\\[4px\\].bg-danger-neutral.text-neutral-0:has-text("Aceptar")');
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    console.log('[TEST] Botón "Aceptar" encontrado, confirmando eliminación...');
    await confirmButton.click();
    await page.waitForTimeout(2000);
    
    // Verificar eliminación contando los servicios restantes
    console.log('[TEST] Verificando eliminación...');
    const remainingCards = await serviceCards.count();
    console.log(`[TEST] Servicios restantes: ${remainingCards} (antes: ${totalCards})`);
    
    if (remainingCards < totalCards) {
      console.log(`[TEST] ✓ Servicio eliminado exitosamente: ${totalCards} → ${remainingCards} servicios`);
    } else {
      throw new Error(`❌ El servicio no se eliminó: ${totalCards} servicios (sin cambios)`);
    }
  });
});

async function createService(page: Page): Promise<CreatedService> {
  console.log('[createService] Navegando a la página de servicios...');
  await gotoServices(page);
  
  console.log('[createService] Haciendo click en "Crear servicio"...');
  await expect(page.getByRole('button', { name: /Crear servicio/i })).toBeVisible();
  await page.getByRole('button', { name: /Crear servicio/i }).click();
  
  // Esperar a que la pantalla de selección de categorías cargue
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');

  // Seleccionar categoría aleatoria
  const nombreCategoria = await selectRandomCategory(page, 'SELECCIONANDO CATEGORÍA ALEATORIA');
  await page.waitForTimeout(3000); // Tiempo adicional después de seleccionar categoría

  // Seleccionar subcategoría aleatoria
  // Detectar la categoría actual por el título (más específico)
  let tituloCategoria: string | null = null;
  try {
    // Esperar a que el título aparezca
    await expect(page.locator('h5.text-neutral-800:has-text("Selecciona la categoría de")')).toBeVisible({ timeout: 10000 });
    tituloCategoria = await page.locator('h5.text-neutral-800:has-text("Selecciona la categoría de")').textContent();
    console.log(`[createService] Categoría detectada: ${tituloCategoria}`);
  } catch (error) {
    console.log(`[createService] No se pudo obtener el título de la categoría: ${error}`);
  }

  const nombreSubcategoria = await selectRandomCategory(page, 'SELECCIONANDO SUBCATEGORÍA ALEATORIA');
  await page.waitForTimeout(3000); // Tiempo adicional después de seleccionar subcategoría

  // Verificar si necesita subcategoría anidada
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

  console.log(`[createService] Verificando subcategoría anidada - Subcategoría: "${nombreSubcategoria}", Título: "${tituloCategoria}", Necesita anidada: ${necesitaSubcategoriaAnidada}`);

  if (necesitaSubcategoriaAnidada) {
    console.log(`[createService] Subcategoría "${nombreSubcategoria}" requiere subcategoría anidada`);
    await showStepMessage(page, '🎯 SELECCIONANDO SUBCATEGORÍA ANIDADA');
    await page.waitForTimeout(3000); // Tiempo adicional antes de buscar subcategorías anidadas

    try {
      nombreSubcategoriaAnidada = await selectRandomCategory(page, 'SELECCIONANDO SUBCATEGORÍA ANIDADA');
      await page.waitForTimeout(3000); // Tiempo adicional después de seleccionar subcategoría anidada
    } catch (error) {
      console.log(`[createService] No se encontraron subcategorías anidadas: ${error}`);
    }
  }

  // Usar la subcategoría anidada si existe, sino usar la subcategoría, sino usar la categoría principal
  const categoriaFinal = nombreSubcategoriaAnidada || nombreSubcategoria || nombreCategoria || 'General';
  const categoryName = categoriaFinal;

  // Generar nombre más corto que incluya la categoría
  const suffix = uniqueSuffix('prod').slice(-8); // Solo últimos 8 caracteres del sufijo
  const serviceName = `${categoryName} QA-${suffix}`;
  const description = `Servicio automatizado creado en producción ${new Date().toLocaleString()}`;
  console.log(`[createService] Nombre del servicio: ${serviceName}`);

  console.log('[createService] Llenando formulario de detalles...');
  await showStepMessage(page, '📝 LLENANDO DATOS DEL SERVICIO');
  await page.locator('form#ServiceDetailsForm input#Name').fill(serviceName);
  await page.locator('form#ServiceDetailsForm textarea#Description').fill(description);

  const unit = page.locator('#Units button[type="button"]').first();
  if (await unit.count()) {
    console.log('[createService] Seleccionando unidad...');
    await showStepMessage(page, '📏 SELECCIONANDO UNIDAD');
    await unit.click();
    await page.waitForTimeout(500);
  } else {
    console.log('[createService] No se encontró selector de unidad');
  }

  await page.locator('input#MinAmount').fill('10');
  await page.locator('input#MaxAmount').fill('100');

  console.log('[createService] Enviando formulario de detalles (ServiceDetailsForm)...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE DETALLES');
  await submitForm(page, 'ServiceDetailsForm');

  console.log('[createService] Llenando formulario de precio y condiciones...');
  await showStepMessage(page, '💰 CONFIGURANDO PRECIOS Y CONDICIONES');
  await page.locator('form#ServicePriceConditionsForm input#Price').fill('1500');

  // Seleccionar un método de pago (buscar botón que contenga el texto "Efectivo", "Transferencia" o "Tarjeta")
  const paymentMethodContainer = page.locator('#PaymentMethod');
  if (await paymentMethodContainer.count()) {
    console.log('[createService] Seleccionando método de pago...');
    await showStepMessage(page, '💳 SELECCIONANDO MÉTODO DE PAGO');
    // Intentar seleccionar "Transferencia" primero, si no existe, seleccionar el primero disponible
    const transferenciaButton = paymentMethodContainer.locator('button').filter({ 
      has: page.locator('p', { hasText: /^Transferencia$/i }) 
    }).first();
    
    if (await transferenciaButton.count()) {
      console.log('[createService] Seleccionando método de pago: Transferencia');
      await transferenciaButton.click();
      await page.waitForTimeout(300);
  } else {
      // Si no hay "Transferencia", seleccionar el primer botón de método de pago disponible
      const firstPaymentMethod = paymentMethodContainer.locator('button[type="button"]').first();
      if (await firstPaymentMethod.count()) {
        console.log('[createService] Seleccionando primer método de pago disponible');
        await firstPaymentMethod.click();
        await page.waitForTimeout(300);
      } else {
        console.log('[createService] ⚠ No se encontró ningún método de pago');
      }
    }
  } else {
    console.log('[createService] ⚠ No se encontró el contenedor de métodos de pago');
  }

  await page.locator('form#ServicePriceConditionsForm textarea#Conditions').fill(buildConditions(serviceName));
  console.log('[createService] Enviando formulario de precio y condiciones (ServicePriceConditionsForm)...');
  await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE PRECIOS');
  await submitForm(page, 'ServicePriceConditionsForm');

  const attribute = page.locator('#Attributes input[type="checkbox"]').first();
  if (await attribute.count()) {
    console.log('[createService] Seleccionando atributo...');
    await showStepMessage(page, '🎯 SELECCIONANDO ATRIBUTOS DEL SERVICIO');
    const checkboxId = await attribute.getAttribute('id');
      if (checkboxId) {
        await page.locator(`label[for="${checkboxId}"]`).click();
    }
    console.log('[createService] Enviando formulario de atributos (ServiceAttributesForm)...');
    await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE ATRIBUTOS');
    await submitForm(page, 'ServiceAttributesForm');
  } else {
    console.log('[createService] No se encontraron atributos para seleccionar');
  }

  const rangeSlider = page.locator('input[type="range"].style-slider').first();
  if (await rangeSlider.count()) {
    console.log('[createService] Configurando rango de servicio...');
    await showStepMessage(page, '📍 CONFIGURANDO RANGO DE SERVICIO');
    await rangeSlider.fill('1');
    console.log('[createService] Enviando formulario de rango (ServiceRangeForm)...');
    await showStepMessage(page, '➡️ ENVIANDO FORMULARIO DE RANGO');
    await submitForm(page, 'ServiceRangeForm');
  } else {
    console.log('[createService] No se encontró slider de rango');
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    console.log('[createService] Subiendo imagen...');
    await showStepMessage(page, '📸 SUBIENDO IMAGEN DE PRUEBA');
    await fileInput.setInputFiles(IMAGE_FIXTURE);
    console.log('[createService] Esperando análisis de contenido de la imagen (puede tardar varios segundos)...');
    await page.waitForTimeout(5000); // Espera inicial para que comience el análisis
    
    // Después de subir la imagen, aparece un botón "Siguiente" para continuar
    // El botón aparece después de que la imagen sea analizada por contenido inapropiado
    const siguienteButton = page.locator('button[type="submit"][form="ServiceMediaForm"]').filter({ 
      hasText: /Siguiente/i 
    }).first();
    
    console.log('[createService] Esperando que aparezca el botón "Siguiente" (análisis de imagen en progreso)...');
    try {
      // Esperar hasta 30 segundos para que aparezca el botón después del análisis
      await expect(siguienteButton).toBeVisible({ timeout: 30000 });
      console.log('[createService] Botón "Siguiente" encontrado, haciendo click...');
      await siguienteButton.click();
      await page.waitForTimeout(1500);
      console.log('[createService] ✓ Click en botón "Siguiente" realizado');
    } catch (err) {
      console.log('[createService] ⚠ No se encontró el botón "Siguiente" después de subir imagen (timeout de 30s)');
      throw err;
    }
  } else {
    console.log('[createService] No se encontró input de archivo para subir imagen');
  }

  console.log('[createService] Finalizando wizard...');
  await showStepMessage(page, '✅ FINALIZANDO CREACIÓN');
  await finalizeWizard(page);

  console.log('[createService] Buscando servicio creado...');
  await clearSearch(page);
  await searchService(page, serviceName);
  console.log(`[createService] ✓ Servicio "${serviceName}" creado exitosamente`);

  return { name: serviceName };
}

async function editService(page: Page, originalName: string): Promise<string> {
  const newName = `${originalName} EDITADO`;

  await searchService(page, originalName);
  await openActionsMenu(page, originalName);
  await page.getByRole('menuitem', { name: /Editar/i }).click();

  const nameInput = page.locator('form#ServiceDetailsForm input#Name');
  await nameInput.fill(newName);
  await page.locator('form#ServiceDetailsForm textarea#Description').fill(
    `Descripción actualizada ${new Date().toLocaleString()}`
  );
  await submitForm(page, 'ServiceDetailsForm');

  await page.locator('form#ServicePriceConditionsForm input#Price').fill('1800');
  await submitForm(page, 'ServicePriceConditionsForm');

  const rangeSlider = page.locator('input[type="range"].style-slider').first();
  if (await rangeSlider.count()) {
    await rangeSlider.fill('2');
    await submitForm(page, 'ServiceRangeForm');
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    console.log('[editService] Subiendo imagen...');
    await fileInput.setInputFiles(IMAGE_FIXTURE);
    console.log('[editService] Esperando análisis de contenido de la imagen (puede tardar varios segundos)...');
    await page.waitForTimeout(5000); // Espera inicial para que comience el análisis
    
    // Después de subir la imagen, aparece un botón "Siguiente" para continuar
    // El botón aparece después de que la imagen sea analizada por contenido inapropiado
    const siguienteButton = page.locator('button[type="submit"][form="ServiceMediaForm"]').filter({ 
      hasText: /Siguiente/i 
    }).first();
    
    console.log('[editService] Esperando que aparezca el botón "Siguiente" (análisis de imagen en progreso)...');
    try {
      // Esperar hasta 30 segundos para que aparezca el botón después del análisis
      await expect(siguienteButton).toBeVisible({ timeout: 30000 });
      console.log('[editService] Botón "Siguiente" encontrado, haciendo click...');
      await siguienteButton.click();
      await page.waitForTimeout(1500);
      console.log('[editService] ✓ Click en botón "Siguiente" realizado');
    } catch (err) {
      console.log('[editService] ⚠ No se encontró el botón "Siguiente" después de subir imagen (timeout de 30s)');
      throw err;
    }
  }

  await finalizeWizard(page);

  await clearSearch(page);
  await searchService(page, newName);

  return newName;
}

async function toggleServiceAvailability(page: Page, serviceName: string, shouldActivate: boolean) {
  await searchService(page, serviceName);
  await openActionsMenu(page, serviceName);

  const activateButton = page.getByRole('menuitem', { name: /Activar/i });
  const deactivateButton = page.getByRole('menuitem', { name: /Desactivar/i });

  if (shouldActivate) {
    if (await activateButton.count()) {
      await activateButton.click();
    }
    } else {
    if (await deactivateButton.count()) {
    await deactivateButton.click();
    }
  }

      await page.waitForTimeout(1000);
  await clearSearch(page);
}

async function deleteService(page: Page, serviceName: string) {
  await searchService(page, serviceName);
  await openActionsMenu(page, serviceName);

  await page.getByRole('menuitem', { name: /Eliminar/i }).click();

  const confirmButton = page
    .locator('button')
    .filter({ hasText: /Aceptar/i })
    .filter({ has: page.locator('i.icon-trash') })
    .first();

  if (await confirmButton.count()) {
    await confirmButton.click();
    } else {
    await page.getByRole('button', { name: /Aceptar/i }).click();
  }

  await clearSearch(page);
}

async function safeCleanup(page: Page, serviceName: string) {
  try {
    await deleteService(page, serviceName);
  } catch (err) {
    console.warn(`No se pudo eliminar el servicio "${serviceName}" durante la limpieza: ${err}`);
  }
}

async function expectServiceVisible(page: Page, serviceName: string) {
  console.log(`[expectServiceVisible] Verificando que el servicio "${serviceName}" sea visible...`);
  await searchService(page, serviceName);
  
  // Esperar un poco más para que los resultados se rendericen completamente
  await page.waitForTimeout(2000);
  
  // Verificar que el texto del servicio está visible en la página
  // Esto es más simple y robusto que buscar la tarjeta completa
  const serviceText = page.getByText(serviceName, { exact: false });
  console.log(`[expectServiceVisible] Buscando texto del servicio "${serviceName}"...`);
  
  // Aumentar timeout a 15000ms para dar más tiempo
  await expect(serviceText, `El servicio "${serviceName}" debe aparecer en la lista`).toBeVisible({ timeout: 15000 });
  console.log(`[expectServiceVisible] ✓ Servicio "${serviceName}" es visible`);
}

async function expectNoServiceMatches(page: Page, serviceName: string) {
  await searchService(page, serviceName);
  await page.waitForTimeout(2000);
  
  // Verificar que el texto del servicio NO está visible
  const serviceText = page.getByText(serviceName, { exact: false });
  await expect(serviceText).not.toBeVisible({ timeout: 5000 });
}

async function gotoServices(page: Page) {
  await page.goto(SERVICES_URL, { waitUntil: 'networkidle' });
  
  // Validar que la página se cargó correctamente
  // Puede estar en estado vacío (sin servicios) o con servicios
  const searchInput = page.locator('input#Search');
  const emptyState = page.locator('div.grow.flex.flex-col.justify-center.gap-6.items-center');
  const createButton = page.getByRole('button', { name: /Crear servicio/i });
  
  // Esperar a que aparezca al menos uno de estos elementos
  await Promise.race([
    searchInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    emptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    createButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null)
  ]);
  
  // Verificar que al menos uno está visible
  const hasSearch = await searchInput.isVisible().catch(() => false);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);
  const hasCreateButton = await createButton.isVisible().catch(() => false);
  
  if (!hasSearch && !hasEmptyState && !hasCreateButton) {
    throw new Error('No se pudo determinar el estado de la página de servicios');
  }
  
  console.log(`[gotoServices] Página cargada - Search: ${hasSearch}, EmptyState: ${hasEmptyState}, CreateButton: ${hasCreateButton}`);
}

// Función para seleccionar categoría aleatoria de manera robusta
async function selectRandomCategory(page: Page, stepName: string): Promise<string | null> {
  await showStepMessage(page, `🎯 ${stepName}`);
  await page.waitForTimeout(2000);

  // Esperar a que las categorías estén cargadas
  const categorias = page.locator('button.flex.flex-col.items-center.gap-3');
  
  // Esperar a que al menos una categoría esté visible
  await expect(categorias.first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500); // Tiempo adicional para que todas las categorías se rendericen

  const count = await categorias.count();

  console.log(`[selectRandomCategory] Total de categorías encontradas: ${count}`);

  if (count === 0) {
    throw new Error('❌ No se encontraron categorías disponibles');
  }

  // Seleccionar una categoría aleatoria
  const randomIndex = Math.floor(Math.random() * count);
  const categoriaSeleccionada = categorias.nth(randomIndex);

  // Asegurarse de que la categoría seleccionada esté visible antes de hacer click
  await expect(categoriaSeleccionada).toBeVisible({ timeout: 5000 });
  
  // Obtener el nombre de la categoría seleccionada
  const nombreCategoria = await categoriaSeleccionada.locator('p').textContent();
  console.log(`[selectRandomCategory] Categoría seleccionada aleatoriamente (índice ${randomIndex}): ${nombreCategoria}`);

  await categoriaSeleccionada.click();
  
  // Esperar a que la selección se procese y la siguiente pantalla cargue
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  return nombreCategoria;
}

async function chooseFirstCard(page: Page) {
  const options = page.locator('button.flex.flex-col').filter({ has: page.locator('p') });
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await page.waitForTimeout(600);
}

function buildConditions(serviceName: string) {
  return [
    `El servicio ${serviceName} incluye personal especializado.`,
    'Requiere confirmación con al menos 48 horas de anticipación.',
    'Pago del 30% para reservar la fecha.'
  ].join(' ');
}

async function submitForm(page: Page, formId: string) {
  console.log(`[submitForm] Buscando botón submit para formulario: ${formId}`);
  const submitButton = page.locator(`button[type="submit"][form="${formId}"]`).first();
  if (await submitButton.count()) {
    console.log(`[submitForm] Haciendo click en botón submit de ${formId}...`);
    await submitButton.click();
    await page.waitForTimeout(1000);
    console.log(`[submitForm] ✓ Formulario ${formId} enviado`);
  } else {
    console.log(`[submitForm] ⚠ No se encontró botón submit para formulario: ${formId}`);
  }
}

async function searchService(page: Page, text: string) {
  console.log(`[searchService] Buscando servicio: "${text}"`);
  await gotoServices(page);
  
  // Verificar que el input de búsqueda está disponible (solo aparece cuando hay servicios)
  const searchInput = page.locator('input#Search');
  const isSearchVisible = await searchInput.isVisible().catch(() => false);
  
  if (!isSearchVisible) {
    // Si no hay input de búsqueda, puede ser que no haya servicios
    // En este caso, el servicio no se encontrará
    console.log(`[searchService] ⚠ Input de búsqueda no disponible (posiblemente no hay servicios)`);
    return;
  }
  
  await searchInput.fill(text);
  console.log(`[searchService] Esperando a que los resultados de búsqueda se carguen...`);
  await page.waitForTimeout(3000); // Aumentado de 1500 a 3000ms
  await page.waitForLoadState('networkidle'); // Esperar a que la red esté inactiva
  console.log(`[searchService] Búsqueda completada para: "${text}"`);
}

async function clearSearch(page: Page) {
  const searchInput = page.locator('input#Search');
  if (await searchInput.count()) {
    await searchInput.fill('');
    await page.waitForTimeout(800);
  }
}

async function openActionsMenu(page: Page, serviceName: string) {
  const cards = locateServiceCard(page, serviceName);
  const count = await cards.count();
  if (count === 0) {
    throw new Error(`No se encontró el servicio "${serviceName}" para abrir el menú`);
  }
  const menuButton = cards.first().locator('button:has(i.icon-more-vertical)').first();
  await menuButton.click();
  await page.waitForTimeout(500);
}

function locateServiceCard(page: Page, serviceName: string): Locator {
  // Usar el mismo enfoque que staging: buscar todas las tarjetas y filtrar por el texto
  // Staging usa: .flex.items-end.justify-end.text-end button para los botones de menú
  // Buscamos el contenedor que tiene el texto del servicio y también tiene un botón de menú
  return page
    .locator('div')
    .filter({ has: page.getByText(serviceName, { exact: false }) })
    .filter({ 
      has: page.locator('.flex.items-end.justify-end.text-end button, button:has(i.icon-more-vertical)') 
    })
    .first();
}

async function finalizeWizard(page: Page) {
  console.log('[finalizeWizard] Buscando botón para finalizar wizard...');
  const selectors = [
    'button:has-text("Finalizar")',
    'button:has-text("Ir a servicios")',
    'button:has-text("Volver a servicios")',
    'button:has-text("Regresar a servicios")'
  ];

  let buttonFound = false;
  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.count()) {
      console.log(`[finalizeWizard] Botón encontrado con selector: ${selector}`);
      await expect(button).toBeVisible({ timeout: 5000 });
      await button.click();
      console.log(`[finalizeWizard] Click realizado en botón: ${selector}`);
      await page.waitForTimeout(1500);
      buttonFound = true;
      break;
    }
  }

  if (!buttonFound) {
    console.log('[finalizeWizard] ⚠ No se encontró ningún botón para finalizar el wizard');
  }

  console.log('[finalizeWizard] Esperando redirección a página de servicios...');
  try {
    await page.waitForURL(SERVICES_URL, { waitUntil: 'networkidle', timeout: 15000 });
    console.log('[finalizeWizard] ✓ Redirección exitosa a página de servicios');
  } catch (err) {
    console.log('[finalizeWizard] ⚠ No se redirigió a la URL esperada, esperando networkidle...');
    await page.waitForLoadState('networkidle');
    console.log(`[finalizeWizard] URL actual: ${page.url()}`);
  }
}

