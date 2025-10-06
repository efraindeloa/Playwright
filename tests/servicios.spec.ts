import { test, expect, devices, Page } from '@playwright/test';

// Configuración Desktop
test.use({ viewport: { width: 1280, height: 720 } });


/**
 * Selecciona una fecha en datepickers tipo flatpickr.
 * - inputSelector: selector del input (ej. 'input#StartDate' o 'input[id="StartDate"]')
 * - isoDate: 'YYYY-MM-DD' (ej. '2025-10-05')
 */
async function pickDateSmart(page: Page, inputSelector: string, isoDate: string) {
    const day = String(new Date(isoDate).getDate());

    // 1) INTENTO: usar la API de flatpickr si existe
    try {
        const apiResult = await page.evaluate(({ sel, d }) => {
            const el = document.querySelector(sel) as any;
            if (!el) return false;
            const inst = el._flatpickr || (window as any).flatpickr?.instances?.find((i: any) => i.input === el);
            if (inst && typeof inst.setDate === 'function') {
                try {
                    // setDate acepta Date or string; el segundo argumento true dispara el change
                    inst.setDate(d, true);
                    return true;
                } catch (e) {
                    // fallback
                    return false;
                }
            }
            return false;
        }, { sel: inputSelector, d: isoDate });

        if (apiResult) {
            // espera un poco para que la app procese
            await page.waitForTimeout(200);
            return;
        }
    } catch (e) {
        // continuar al siguiente intento
    }

    // 2) INTENTO: abrir calendario y navegar meses hasta encontrar el día visible
    const input = page.locator(inputSelector).first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.scrollIntoViewIfNeeded();
    await input.click(); // abre datepicker

    const calendar = page.locator('.flatpickr-calendar').first();
    // espera a que aparezca calendar (si el datepicker usa otro selector puede necesitar ajuste)
    await calendar.waitFor({ state: 'visible', timeout: 4000 }).catch(() => { /* seguir a fallback */ });

    // Intentar hasta 12 veces: buscar día visible en mes activo; si no, click next
    for (let i = 0; i < 12; i++) {
        // recolecta las celdas
        const cellsCount = await calendar.locator('.flatpickr-day').count();
        for (let j = 0; j < cellsCount; j++) {
            const cell = calendar.locator('.flatpickr-day').nth(j);
            const txt = (await cell.textContent())?.trim() ?? '';
            const cls = (await cell.getAttribute('class')) ?? '';
            const isDisabled = /flatpickr-disabled/.test(cls);
            const isPrevOrNext = /prevMonthDay|nextMonthDay/.test(cls);
            if (txt === day && !isDisabled && !isPrevOrNext) {
                // asegurarse visible
                if (await cell.isVisible()) {
                    await cell.click();
                    // dejar que la app procese el cambio
                    await page.waitForTimeout(200);
                    return;
                }
            }
        }
        // si no lo encontramos: intentar avanzar un mes
        const nextBtn = calendar.locator('.flatpickr-next, .flatpickr-next-month').first();
        if (await nextBtn.count() === 0) break;
        await nextBtn.click();
        await page.waitForTimeout(200);
    }

    // 3) FALLBACK: forzar value vía JS (remueve readonly y dispara eventos)
    await page.evaluate(({ sel, val }) => {
        const el = document.querySelector(sel) as HTMLInputElement | null;
        if (!el) return;
        el.removeAttribute('readonly');
        // muchos datepickers esperan YYYY-MM-DD o su formato personalizado; aquí usamos isoDate
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        // Blur para que algunos componentes actualicen UI
        el.blur();
    }, { sel: inputSelector, val: isoDate });

    // espera para que la app reaccione
    await page.waitForTimeout(200);
}


test('Crear promoción', async ({ page }) => {
    // 1. Abrir página de login
    await page.goto('https://staging.fiestamas.com/login');

    // 2. Escribir usuario
    await page.locator('input[id="Email"]').fill('fiestamasqaprv@gmail.com');

    // 3. Escribir contraseña
    await page.locator('input[id="Password"]').fill('Fiesta2025$');

    // 4. Click en el botón de login
    await page.locator('button[type="submit"]').click();

    // 5. Validar que estamos en el dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Clic en el botón "Administrar promociones"
    const promos = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promos.click();

    // Validar que estamos en la sección de promociones (ajusta el selector según tu UI real)
    await expect(page.getByText('Crear promoción')).toBeVisible();

    // 4. Clic en botón "Crear promoción"
    await page.getByRole('button', { name: 'Crear promoción' }).click();

    // 5. Validar que se abre el formulario de nueva promoción
    await expect(page.getByText('Nueva promoción')).toBeVisible();

    // 6. Llenar formulario 
    await page.locator('input[id="Title"]').fill('Promo de prueba Playwright');
    // seleccionar fechas 
    await pickDateSmart(page, 'input#StartDate', '05-10-2025');
    await pickDateSmart(page, 'input#EndDate', '31-10-2025');


    // 1. Localizamos el input oculto asociado al botón "Agregar foto/video"
    const fileInput = await page.locator('input[type="file"]');

    // 2. Subimos un archivo local (cambia la ruta a la de tu archivo real)
    await fileInput.setInputFiles('C:/Temp/transparent.png');


    // 7. Guardar promoción
    await page.getByRole('button', { name: 'Finalizar' }).click();

    // 8. Validar que aparece en la lista de promociones
    await expect(page.getByText('Promo de prueba Playwright')).toBeVisible();

    await page.reload({ waitUntil: 'networkidle' });

});


test('Editar promoción', async ({ page }) => {
    // 1. Abrir página de login
    await page.goto('https://staging.fiestamas.com/login');

    // 2. Escribir usuario
    await page.locator('input[id="Email"]').fill('fiestamasqaprv@gmail.com');

    // 3. Escribir contraseña
    await page.locator('input[id="Password"]').fill('Fiesta2025$');

    // 4. Click en el botón de login
    await page.locator('button[type="submit"]').click();

    // 5. Validar que estamos en el dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // 6. Clic en el botón "Administrar promociones"
    const promos = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promos.click();

    // 7. Validar que aparece la promoción existente
    const promoName = 'Promo de prueba Playwright';
    await expect(page.getByText(promoName)).toBeVisible();

    // 8. Localizamos la card por su título
    const promoCard = page.locator('div.w-full.flex.shadow-4', { hasText: promoName });

    // 9. Dentro de la card, localizamos el botón ⋮ y hacemos click
    const menuButton = promoCard.locator('button:has(i.icon-more-vertical)');
    await menuButton.click();

    // 10. Seleccionar "Editar"
    await page.locator('text=Editar').click();

    // 11. Generar fechas: StartDate hoy, EndDate 5 días después
    const now = new Date();
    const startDate = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    const end = new Date(now);
    end.setDate(end.getDate() + 5);
    const endDate = `${String(end.getDate()).padStart(2,'0')}-${String(end.getMonth()+1).padStart(2,'0')}-${end.getFullYear()}`;

    // 12. Cambiar el título y las fechas
    await page.locator('input[id="Title"]').fill('Promo Editada Automáticamente');
    await pickDateSmart(page, 'input#StartDate', startDate);
    await pickDateSmart(page, 'input#EndDate', endDate);

    // 13. Borrar la imagen actual
    await page.locator('button:has(i.icon-trash)').click(); 

    // 13. Confirmar eliminacion
    await page.locator('button:has-text("Aceptar")').click();

    // 14. Subir nueva imagen
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('C:/Temp/images.jpeg');

    // 15. Guardar cambios
    await page.getByRole('button', { name: 'Finalizar' }).click();

    // 16. Validar que la promo fue actualizada
    const updatedPromo = page.locator('div.w-full.flex.shadow-4', { hasText: 'Promo Editada Automáticamente' });
    await expect(updatedPromo).toBeVisible();

    await page.reload({ waitUntil: 'networkidle' });
});


test('Eliminar promoción', async ({ page }) => {
    // 1. Abrir página de login
    await page.goto('https://staging.fiestamas.com/login');

    // 2. Escribir usuario
    await page.locator('input[id="Email"]').fill('fiestamasqaprv@gmail.com');

    // 3. Escribir contraseña
    await page.locator('input[id="Password"]').fill('Fiesta2025$');

    // 4. Click en el botón de login
    await page.locator('button[type="submit"]').click();

    // 5. Validar que estamos en el dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Clic en el botón "Administrar promociones"
    const promos = page.locator('div.flex.flex-row.gap-3').getByRole('button', { name: 'Administrar promociones' });
    await promos.click();


    const promoName = 'Promo Editada Automáticamente';

    // 8. Validar que aparece en la lista de promociones
    await expect(page.getByText(promoName)).toBeVisible();

    // 1. Localizamos la card por su título
    const promoCard = page.locator('div.w-full.flex.shadow-4', { hasText: promoName });

    // 2. Dentro de la card, localizamos el botón ⋮
    const menuButton = promoCard.locator('button:has(i.icon-more-vertical)');

    // 3. Hacemos click en el botón
    await menuButton.click();

    // 4. Click en "Eliminar"
    await page.locator('text=Eliminar').click();

    await page.locator('button:has-text("Aceptar")').click();

    await page.reload({ waitUntil: 'networkidle' });

});

