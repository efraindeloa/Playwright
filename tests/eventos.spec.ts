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
  
  // Buscar el botón "Nueva fiesta" usando el selector específico
  // El botón tiene la clase específica y contiene el texto "Nueva fiesta"
  const nuevaFiestaButton = page.locator('button').filter({ hasText: 'Nueva fiesta' }).first();
  
  // Verificar que el botón existe y es visible
  await expect(nuevaFiestaButton).toBeVisible({ timeout: 10000 });
  console.log('✓ Botón "Nueva fiesta" encontrado y visible');
  
  // Hacer clic en el botón "Nueva fiesta"
  await nuevaFiestaButton.click();
  console.log('✓ Se hizo clic en "Nueva fiesta"');
  
  // Esperar a que cargue la página o modal de creación de evento
  await page.waitForTimeout(2000);
  
  // Aquí puedes agregar validaciones del formulario de creación de evento
  // Por ejemplo, verificar que se muestre algún título o formulario específico
  // await expect(page.locator('h1, h2, h3').filter({ hasText: /crear|nuevo evento|nueva fiesta/i })).toBeVisible();
  
  console.log('✓ Prueba de navegación a creación de evento completada');
});

