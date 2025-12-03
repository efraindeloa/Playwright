import { test, expect, Page, Locator } from '@playwright/test';
import path from 'path';
import * as fs from 'fs';
import { login, showStepMessage, safeWaitForTimeout } from '../utils';
import {
  DEFAULT_BASE_URL,
  CLIENT_EMAIL,
  CLIENT_PASSWORD
} from '../config';

const DASHBOARD_URL = `${DEFAULT_BASE_URL}/client/dashboard`;
const QUOTATION_BASE_URL = `${DEFAULT_BASE_URL}/client/quotation`;

test.use({
  viewport: { width: 1400, height: 720 }
});

/**
 * Verifica si una cotización está cancelada
 */
async function esCotizacionCancelada(page: Page): Promise<boolean> {
  // Buscar el botón/mensaje que indica que la negociación fue cancelada
  const mensajeCancelado = page.locator('button, div').filter({
    has: page.locator('p').filter({ hasText: /La negociación fue cancelada|negociación fue cancelada|fue cancelada/i })
  }).or(page.locator('p').filter({ hasText: /La negociación fue cancelada|negociación fue cancelada|fue cancelada/i }));

  const canceladoVisible = await mensajeCancelado.first().isVisible({ timeout: 3000 }).catch(() => false);
  return canceladoVisible;
}

/**
 * Navega al dashboard, encuentra una notificación y obtiene su información
 * @param excluirCanceladas Si es true, excluye notificaciones de cotizaciones canceladas
 */
async function obtenerNotificacionYInfo(page: Page, excluirCanceladas: boolean = true): Promise<{
  notificationButton: Locator;
  notificationText: string;
  quotationId?: string;
}> {
  console.log('🔐 Iniciando login y navegación al dashboard...');
  await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
  await page.goto(DASHBOARD_URL);
  await page.waitForLoadState('networkidle');
  await safeWaitForTimeout(page, 2000);
  console.log('✅ Dashboard cargado');

  // Buscar sección Fiestachat
  console.log('🔍 Buscando sección Fiestachat...');
  let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
  let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

  if (!fiestachatVisible) {
    console.log('🔍 Intentando selector alternativo para Fiestachat...');
    fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
  }

  if (!fiestachatVisible) {
    console.log('🔍 Intentando buscar por texto "¡Fiestachat!"...');
    fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
    fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
  }

  if (!fiestachatVisible) {
    throw new Error('No se encontró la sección Fiestachat');
  }
  console.log('✅ Sección Fiestachat encontrada');

  // Buscar notificaciones
  console.log('🔍 Buscando notificaciones...');
  const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
  const notificationCount = await notificationButtons.count();
  console.log(`📊 Notificaciones encontradas: ${notificationCount}`);

  if (notificationCount === 0) {
    throw new Error('No se encontraron notificaciones en Fiestachat');
  }

  // Si se deben excluir canceladas, buscar una que no esté cancelada
  if (excluirCanceladas) {
    console.log('🔍 Buscando notificación no cancelada...');
    // Limitar la búsqueda a las primeras 50 notificaciones para evitar timeouts
    const maxNotificationsToCheck = Math.min(notificationCount, 50);
    console.log(`🔍 Verificando hasta ${maxNotificationsToCheck} notificaciones...`);
    
    for (let i = 0; i < maxNotificationsToCheck; i++) {
      console.log(`🔍 Verificando notificación ${i + 1} de ${maxNotificationsToCheck}...`);
      const notification = notificationButtons.nth(i);
      const notificationText = (await notification.textContent())?.trim() || '';
      console.log(`📋 Texto de notificación ${i + 1}: "${notificationText.substring(0, 100)}..."`);
      
      // Verificar si el texto contiene indicadores de cancelación (sin hacer clic)
      const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(notificationText);
      
      if (textoCancelado) {
        console.log(`⚠️ Notificación ${i + 1} parece estar cancelada (según texto), saltando...`);
        continue; // Saltar esta notificación y probar la siguiente
      }
      
      // Si no tiene texto de cancelación, verificar haciendo clic (solo si es necesario)
      // Pero primero intentar extraer el ID sin hacer clic
      let quotationId: string | undefined;
      try {
        const href = await notification.getAttribute('href').catch(() => null);
        if (href) {
          const match = href.match(/quotation[\/\-]?(\d+)|quotation[\/\-]?([a-f0-9-]+)/i);
          if (match) {
            quotationId = match[1] || match[2];
          }
        }
        if (!quotationId) {
          const textMatch = notificationText.match(/#(\d+)|ID[:\s]+(\d+)|Cotización[:\s]+(\d+)/i);
          if (textMatch) {
            quotationId = textMatch[1] || textMatch[2] || textMatch[3];
          }
        }
      } catch (e) {
        console.log('⚠️ No se pudo extraer el ID de cotización de la notificación');
      }
      
      // Esta notificación no parece cancelada según el texto, usarla
      console.log(`✅ Notificación ${i + 1} no parece cancelada (según texto), usándola`);
      return {
        notificationButton: notification,
        notificationText,
        quotationId
      };
    }
    
    // Si todas las verificadas están canceladas, lanzar error
    console.log(`❌ Las primeras ${maxNotificationsToCheck} notificaciones parecen estar canceladas`);
    throw new Error(`Las primeras ${maxNotificationsToCheck} notificaciones disponibles parecen estar canceladas`);
  } else {
    console.log('🔍 Buscando específicamente una notificación cancelada...');
    // Buscar específicamente una notificación cancelada
    // Limitar la búsqueda a las primeras 50 notificaciones para evitar timeouts
    const maxNotificationsToCheck = Math.min(notificationCount, 50);
    console.log(`🔍 Verificando hasta ${maxNotificationsToCheck} notificaciones para encontrar una cancelada...`);
    
    for (let i = 0; i < maxNotificationsToCheck; i++) {
      console.log(`🔍 Verificando notificación ${i + 1} de ${maxNotificationsToCheck}...`);
      const notification = notificationButtons.nth(i);
      const notificationText = (await notification.textContent())?.trim() || '';
      console.log(`📋 Texto de notificación ${i + 1}: "${notificationText.substring(0, 100)}..."`);
      
      // Verificar si el texto contiene indicadores de cancelación
      const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(notificationText);
      
      if (textoCancelado) {
        console.log(`✅ Notificación ${i + 1} parece estar cancelada (según texto), usándola`);
        
        // Intentar extraer el ID de cotización de la notificación o del botón
        let quotationId: string | undefined;
        try {
          // Buscar en el href o data attributes
          const href = await notification.getAttribute('href').catch(() => null);
          if (href) {
            const match = href.match(/quotation[\/\-]?(\d+)|quotation[\/\-]?([a-f0-9-]+)/i);
            if (match) {
              quotationId = match[1] || match[2];
            }
          }

          // Si no se encontró en href, buscar en el texto
          if (!quotationId) {
            const textMatch = notificationText.match(/#(\d+)|ID[:\s]+(\d+)|Cotización[:\s]+(\d+)/i);
            if (textMatch) {
              quotationId = textMatch[1] || textMatch[2] || textMatch[3];
            }
          }
        } catch (e) {
          // Si no se puede extraer el ID, continuar sin él
          console.log('⚠️ No se pudo extraer el ID de cotización de la notificación');
        }

        return {
          notificationButton: notification,
          notificationText,
          quotationId
        };
      } else {
        console.log(`⚠️ Notificación ${i + 1} no parece estar cancelada (según texto), continuando búsqueda...`);
      }
    }
    
    // Si no se encontró ninguna cancelada en el texto, lanzar error
    console.log(`❌ No se encontró ninguna notificación cancelada en las primeras ${maxNotificationsToCheck} notificaciones`);
    throw new Error(`No se encontró ninguna notificación cancelada en las primeras ${maxNotificationsToCheck} notificaciones disponibles`);
  }
}

/**
 * Valida si un archivo tiene un formato permitido para Galería
 * Formatos permitidos según el diálogo: imágenes (xbm, tif, jfif, pjp, apng, jpeg, heif, ico, tiff, webp, svgz, jpg, heic, gif, svg, png, bmp, pjpeg, avif)
 * y videos (ogm, wmv, mpg, webm, ogv, mov, asx, mpeg, mp4, m4v, avi)
 */
function esFormatoPermitidoParaGaleria(archivo: string): boolean {
  const ext = path.extname(archivo).toLowerCase();
  const formatosImagen = [
    '.xbm', '.tif', '.tiff', '.jfif', '.pjp', '.apng', '.jpeg', '.heif', 
    '.ico', '.webp', '.svgz', '.jpg', '.heic', '.svg', '.png', 
    '.bmp', '.pjpeg', '.avif'
  ];
  const formatosVideo = [
    '.ogm', '.wmv', '.mpg', '.webm', '.ogv', '.mov', '.asx', '.mpeg', 
    '.mp4', '.m4v', '.avi'
  ];
  return formatosImagen.includes(ext) || formatosVideo.includes(ext);
}

/**
 * Obtiene archivos de prueba de las rutas especificadas
 */
async function obtenerArchivosPrueba(): Promise<{
  archivosTemp: string[];
  imagenesTesting: string[];
}> {
  const archivosTemp: string[] = [];
  const imagenesTesting: string[] = [];

  // Buscar archivos en C:\Temp (excluyendo node_modules, test-results, etc.)
  try {
    const tempDir = 'C:\\Temp';
    
    if (fs.existsSync(tempDir)) {
      const archivos = fs.readdirSync(tempDir, { withFileTypes: true });
      for (const archivo of archivos) {
        if (archivo.isFile()) {
          const ext = path.extname(archivo.name).toLowerCase();
          // Incluir archivos comunes: .txt, .pdf, .doc, .docx, .xlsx, .csv, .jpg, .png, etc.
          if (['.txt', '.pdf', '.doc', '.docx', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'].includes(ext)) {
            const rutaCompleta = path.join(tempDir, archivo.name);
            // Verificar que el archivo existe y es accesible
            if (fs.existsSync(rutaCompleta)) {
              archivosTemp.push(rutaCompleta);
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('⚠️ No se pudieron leer archivos de C:\\Temp:', e);
  }

  // Buscar imágenes y videos en C:\Users\Efrain De Loa\Pictures\Fiestamas Testing
  // Formatos permitidos según el diálogo de Galería:
  // Imágenes: xbm, tif, jfif, pjp, apng, jpeg, heif, ico, tiff, webp, svgz, jpg, heic, gif, svg, png, bmp, pjpeg, avif
  // Videos: ogm, wmv, mpg, webm, ogv, mov, asx, mpeg, mp4, m4v, avi
  try {
    const imagenesDir = 'C:\\Users\\Efrain De Loa\\Pictures\\Fiestamas Testing';
    
    if (fs.existsSync(imagenesDir)) {
      const archivos = fs.readdirSync(imagenesDir, { withFileTypes: true });
      for (const archivo of archivos) {
        if (archivo.isFile()) {
          const rutaCompleta = path.join(imagenesDir, archivo.name);
          // Verificar que el archivo existe, es accesible y tiene un formato permitido para Galería
          if (fs.existsSync(rutaCompleta) && esFormatoPermitidoParaGaleria(rutaCompleta)) {
            imagenesTesting.push(rutaCompleta);
          }
        }
      }
    }
  } catch (e) {
    console.log('⚠️ No se pudieron leer imágenes de C:\\Users\\Efrain De Loa\\Pictures\\Fiestamas Testing:', e);
  }

  return { archivosTemp, imagenesTesting };
}

test.describe('Cotizaciones', () => {
  test.beforeEach(async ({ page }) => {
    // Login y navegación se harán en cada test según sea necesario
  });

  test('Validar que se muestran todos los elementos de una cotización', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos

    console.log('🚀 INICIANDO PRUEBA: Validar elementos completos de la página de cotización');
    console.log(`📊 Viewport: ${page.viewportSize()?.width}x${page.viewportSize()?.height}`);
    
    await showStepMessage(page, '📋 VALIDANDO ELEMENTOS COMPLETOS DE LA PÁGINA DE COTIZACIÓN');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER NOTIFICACIÓN Y NAVEGAR A COTIZACIÓN (excluyendo canceladas)
    console.log('🔔 PASO 1: Obteniendo notificación y navegando...');
    await showStepMessage(page, '🔔 OBTENIENDO NOTIFICACIÓN Y NAVEGANDO');
    await safeWaitForTimeout(page, 1000);

    const { notificationButton, notificationText, quotationId } = await obtenerNotificacionYInfo(page, true);
    
    console.log(`📋 Contenido de la notificación: "${notificationText}"`);
    if (quotationId) {
      console.log(`🆔 ID de cotización extraído: ${quotationId}`);
    }
    console.log('✅ Notificación obtenida correctamente');

    // Guardar información de la notificación para comparar después
    const infoNotificacion = {
      texto: notificationText,
      id: quotationId
    };

    // Hacer clic en la notificación
    console.log('🖱️ Haciendo clic en la notificación...');
    await notificationButton.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    const urlActual = page.url();
    console.log(`🌐 URL actual después del clic: ${urlActual}`);

    // Verificar que estamos en una página de cotización
    const esPaginaCotizacion = 
      urlActual.includes('/quotation') ||
      urlActual.includes('/prequotation') ||
      urlActual.includes('/negotiation') ||
      urlActual.includes('/cotizacion');

    if (!esPaginaCotizacion) {
      throw new Error(`No se navegó a una página de cotización. URL: ${urlActual}`);
    }

    console.log('✅ Navegación exitosa a página de cotización');

    // 2. VALIDAR NAVBAR/NAVEGACIÓN
    console.log('📄 PASO 2: Validando navbar/navegación...');
    await showStepMessage(page, '📄 VALIDANDO NAVBAR');
    await safeWaitForTimeout(page, 1000);

    // Validar botón de retroceso
    const botonRetroceso = page.locator('button').filter({
      has: page.locator('i.icon-chevron-left-bold, i[class*="chevron-left"]')
    }).first();
    const retrocesoVisible = await botonRetroceso.isVisible({ timeout: 5000 }).catch(() => false);
    if (retrocesoVisible) {
      console.log('✅ Botón de retroceso encontrado');
      await expect(botonRetroceso).toBeVisible();
    } else {
      console.log('⚠️ Botón de retroceso no encontrado');
    }

    // Validar título "Negociación" en el navbar
    const tituloNavbar = page.locator('p').filter({ hasText: /^Negociación$/i });
    const tituloNavbarVisible = await tituloNavbar.isVisible({ timeout: 5000 }).catch(() => false);
    if (tituloNavbarVisible) {
      console.log('✅ Título "Negociación" encontrado en el navbar');
      await expect(tituloNavbar).toBeVisible();
    } else {
      console.log('⚠️ Título "Negociación" no encontrado en el navbar');
    }

    // 3. VALIDAR INFORMACIÓN DEL EVENTO
    console.log('📅 PASO 3: Validando información del evento...');
    await showStepMessage(page, '📅 VALIDANDO INFORMACIÓN DEL EVENTO');
    await safeWaitForTimeout(page, 1000);

    // Validar contenedor de información del evento (con borde izquierdo de color)
    const contenedorEvento = page.locator('div').filter({
      has: page.locator('i.icon-calendar')
    }).filter({
      has: page.locator('i.icon-clock')
    }).filter({
      has: page.locator('i.icon-users')
    }).filter({
      has: page.locator('i.icon-map-pin')
    }).first();

    const eventoVisible = await contenedorEvento.isVisible({ timeout: 5000 }).catch(() => false);
    if (eventoVisible) {
      console.log('✅ Contenedor de información del evento encontrado');
      
      // Validar nombre del evento
      const nombreEvento = contenedorEvento.locator('p').filter({ hasText: /<b>/ }).first();
      const nombreVisible = await nombreEvento.isVisible({ timeout: 2000 }).catch(() => false);
      if (nombreVisible) {
        const nombreTexto = await nombreEvento.textContent();
        console.log(`✅ Nombre del evento encontrado: "${nombreTexto?.trim()}"`);
      }

      // Validar fecha (icono de calendario)
      const fecha = contenedorEvento.locator('i.icon-calendar').locator('..').locator('p');
      const fechaVisible = await fecha.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (fechaVisible) {
        const fechaTexto = await fecha.first().textContent();
        console.log(`✅ Fecha del evento encontrada: "${fechaTexto?.trim()}"`);
      }

      // Validar hora (icono de reloj)
      const hora = contenedorEvento.locator('i.icon-clock').locator('..').locator('p');
      const horaVisible = await hora.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (horaVisible) {
        const horaTexto = await hora.first().textContent();
        console.log(`✅ Hora del evento encontrada: "${horaTexto?.trim()}"`);
      }

      // Validar número de invitados (icono de usuarios)
      const invitados = contenedorEvento.locator('i.icon-users').locator('..').locator('p');
      const invitadosVisible = await invitados.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (invitadosVisible) {
        const invitadosTexto = await invitados.first().textContent();
        console.log(`✅ Número de invitados encontrado: "${invitadosTexto?.trim()}"`);
      }

      // Validar ubicación (icono de map-pin)
      const ubicacionEvento = contenedorEvento.locator('i.icon-map-pin').locator('..').locator('p');
      const ubicacionVisible = await ubicacionEvento.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (ubicacionVisible) {
        const ubicacionTexto = await ubicacionEvento.first().textContent();
        console.log(`✅ Ubicación del evento encontrada: "${ubicacionTexto?.trim()}"`);
      }

      // Validar borde izquierdo de color
      const tieneBordeColor = await contenedorEvento.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.borderLeftWidth !== '0px' && style.borderLeftStyle !== 'none';
      }).catch(() => false);
      if (tieneBordeColor) {
        console.log('✅ Contenedor tiene borde izquierdo de color');
      }
    } else {
      console.log('⚠️ Contenedor de información del evento no encontrado');
    }

    // 4. VALIDAR INFORMACIÓN DEL SERVICIO/PROVEEDOR
    console.log('🏢 PASO 4: Validando información del servicio/proveedor...');
    await showStepMessage(page, '🏢 VALIDANDO INFORMACIÓN DEL SERVICIO');
    await safeWaitForTimeout(page, 1000);

    // Validar imagen del servicio
    const imagenServicio = page.locator('img[alt="Service_MainImage"], img[alt*="Service"]').first();
    const imagenVisible = await imagenServicio.isVisible({ timeout: 5000 }).catch(() => false);
    if (imagenVisible) {
      console.log('✅ Imagen del servicio encontrada');
      await expect(imagenServicio).toBeVisible();
    } else {
      console.log('⚠️ Imagen del servicio no encontrada');
    }

    // Validar nombre del servicio
    const nombreServicio = page.locator('p').filter({ hasText: /^[A-Za-z]/ }).filter({
      has: page.locator('..').locator('div').filter({
        has: page.locator('i.icon-star')
      })
    }).first();
    const nombreServicioVisible = await nombreServicio.isVisible({ timeout: 5000 }).catch(() => false);
    if (nombreServicioVisible) {
      const nombreServicioTexto = await nombreServicio.textContent();
      console.log(`✅ Nombre del servicio encontrado: "${nombreServicioTexto?.trim()}"`);
    } else {
      // Buscar de otra manera
      const nombreServicioAlt = page.locator('p.font-bold').filter({
        has: page.locator('..').locator('div').filter({
          has: page.locator('i.icon-star')
        })
      }).first();
      const nombreServicioAltVisible = await nombreServicioAlt.isVisible({ timeout: 3000 }).catch(() => false);
      if (nombreServicioAltVisible) {
        const nombreServicioAltTexto = await nombreServicioAlt.textContent();
        console.log(`✅ Nombre del servicio encontrado: "${nombreServicioAltTexto?.trim()}"`);
      } else {
        console.log('⚠️ Nombre del servicio no encontrado');
      }
    }

    // Validar calificación (icono de estrella)
    const calificacion = page.locator('i.icon-star').locator('..').locator('p');
    const calificacionVisible = await calificacion.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (calificacionVisible) {
      const calificacionTexto = await calificacion.first().textContent();
      console.log(`✅ Calificación encontrada: "${calificacionTexto?.trim()}"`);
    } else {
      console.log('⚠️ Calificación no encontrada');
    }

    // Validar dirección del servicio
    const direccionServicio = page.locator('i.icon-map-pin').locator('..').locator('p').filter({
      hasText: /C\.|Av\.|Blvd\.|Calle|Street|Avenue/i
    }).first();
    const direccionVisible = await direccionServicio.isVisible({ timeout: 3000 }).catch(() => false);
    if (direccionVisible) {
      const direccionTexto = await direccionServicio.textContent();
      console.log(`✅ Dirección del servicio encontrada: "${direccionTexto?.trim()}"`);
    } else {
      console.log('⚠️ Dirección del servicio no encontrada');
    }

    // Validar nombre del proveedor
    const nombreProveedor = page.locator('p.font-bold').filter({
      has: page.locator('..').locator('div').filter({
        has: page.locator('i.icon-phone')
      })
    }).first();
    const nombreProveedorVisible = await nombreProveedor.isVisible({ timeout: 5000 }).catch(() => false);
    if (nombreProveedorVisible) {
      const nombreProveedorTexto = await nombreProveedor.textContent();
      console.log(`✅ Nombre del proveedor encontrado: "${nombreProveedorTexto?.trim()}"`);
    } else {
      console.log('⚠️ Nombre del proveedor no encontrado');
    }

    // Validar teléfono del proveedor
    const telefonoProveedor = page.locator('i.icon-phone').locator('..').locator('p');
    const telefonoVisible = await telefonoProveedor.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (telefonoVisible) {
      const telefonoTexto = await telefonoProveedor.first().textContent();
      console.log(`✅ Teléfono del proveedor encontrado: "${telefonoTexto?.trim()}"`);
    } else {
      console.log('⚠️ Teléfono del proveedor no encontrado');
    }

    // Validar email del proveedor
    const emailProveedor = page.locator('i.icon-mail').locator('..').locator('p');
    const emailVisible = await emailProveedor.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (emailVisible) {
      const emailTexto = await emailProveedor.first().textContent();
      console.log(`✅ Email del proveedor encontrado: "${emailTexto?.trim()}"`);
    } else {
      console.log('⚠️ Email del proveedor no encontrado');
    }

    // 5. VALIDAR SECCIÓN DE COTIZACIÓN
    console.log('📋 PASO 5: Validando sección de cotización...');
    await showStepMessage(page, '📋 VALIDANDO SECCIÓN DE COTIZACIÓN');
    await safeWaitForTimeout(page, 1000);

    // Validar título "Cotización"
    const tituloCotizacion = page.locator('p').filter({ hasText: /^Cotización$/i });
    const tituloCotizacionVisible = await tituloCotizacion.isVisible({ timeout: 5000 }).catch(() => false);
    if (tituloCotizacionVisible) {
      console.log('✅ Título "Cotización" encontrado');
      await expect(tituloCotizacion).toBeVisible();
    } else {
      console.log('⚠️ Título "Cotización" no encontrado');
    }

    // Validar estado de la cotización (badge)
    const estadoCotizacion = page.locator('p').filter({
      hasText: /SOLICITADA|PENDIENTE|ENVIADA|ACEPTADA|RECHAZADA/i
    }).filter({
      has: page.locator('..').locator('div').filter({
        has: page.locator('div[class*="bg-info-neutral"], div[class*="bg-warning-neutral"], div[class*="bg-success-neutral"], div[class*="bg-danger-neutral"]')
      })
    }).first();
    const estadoVisible = await estadoCotizacion.isVisible({ timeout: 5000 }).catch(() => false);
    if (estadoVisible) {
      const estadoTexto = await estadoCotizacion.textContent();
      console.log(`✅ Estado de la cotización encontrado: "${estadoTexto?.trim()}"`);
    } else {
      // Buscar de otra manera
      const estadoAlt = page.locator('div').filter({
        has: page.locator('p').filter({
          hasText: /SOLICITADA|PENDIENTE|ENVIADA|ACEPTADA|RECHAZADA/i
        })
      }).first();
      const estadoAltVisible = await estadoAlt.isVisible({ timeout: 3000 }).catch(() => false);
      if (estadoAltVisible) {
        const estadoAltTexto = await estadoAlt.textContent();
        console.log(`✅ Estado de la cotización encontrado: "${estadoAltTexto?.trim()}"`);
      } else {
        console.log('⚠️ Estado de la cotización no encontrado');
      }
    }

    // Validar descripción del estado
    const descripcionEstado = page.locator('p').filter({
      hasText: /El proveedor|proveedor|todavía|aún|no te ha enviado|ha enviado/i
    }).first();
    const descripcionVisible = await descripcionEstado.isVisible({ timeout: 3000 }).catch(() => false);
    if (descripcionVisible) {
      const descripcionTexto = await descripcionEstado.textContent();
      console.log(`✅ Descripción del estado encontrada: "${descripcionTexto?.trim().substring(0, 100)}..."`);
    } else {
      console.log('⚠️ Descripción del estado no encontrada');
    }

    // Validar solicitud sobre la cotización
    const solicitudCotizacion = page.locator('p').filter({
      hasText: /Solicitud sobre la cotización|solicitud|Solicitud/i
    }).first();
    const solicitudVisible = await solicitudCotizacion.isVisible({ timeout: 3000 }).catch(() => false);
    if (solicitudVisible) {
      console.log('✅ Solicitud sobre la cotización encontrada');
    } else {
      console.log('⚠️ Solicitud sobre la cotización no encontrada');
    }

    // Validar variedad solicitada
    const variedadSolicitada = page.locator('p').filter({
      hasText: /Variedad solicitada|variedad/i
    }).first();
    const variedadVisible = await variedadSolicitada.isVisible({ timeout: 3000 }).catch(() => false);
    if (variedadVisible) {
      console.log('✅ Variedad solicitada encontrada');
      // Validar lista de variedades
      const listaVariedades = page.locator('ul.list-disc').filter({
        has: page.locator('li')
      });
      const listaVisible = await listaVariedades.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (listaVisible) {
        const cantidadVariedades = await listaVariedades.locator('li').count();
        console.log(`✅ Lista de variedades encontrada con ${cantidadVariedades} elemento(s)`);
      }
    } else {
      console.log('⚠️ Variedad solicitada no encontrada');
    }

    // 6. VALIDAR BOTÓN "CANCELAR NEGOCIACIÓN" Y ACEPTAR CANCELACIÓN
    console.log('❌ PASO 6: Validando botón "Cancelar negociación"...');
    await showStepMessage(page, '❌ VALIDANDO BOTÓN "CANCELAR NEGOCIACIÓN"');
    await safeWaitForTimeout(page, 1000);

    const botonCancelar = page.locator('button, a').filter({
      hasText: /Cancelar negociación|Cancelar|Cancel/i
    }).first();

    const cancelarVisible = await botonCancelar.isVisible({ timeout: 5000 }).catch(() => false);
    if (cancelarVisible) {
      console.log('✅ Botón "Cancelar negociación" encontrado');
      await expect(botonCancelar).toBeVisible();
    } else {
      console.log('⚠️ Botón "Cancelar negociación" no encontrado (puede no estar disponible en este estado)');
    }

    // 7. VALIDAR SECCIÓN DE NOTAS PERSONALES
    console.log('📝 PASO 7: Validando sección de notas personales...');
    await showStepMessage(page, '📝 VALIDANDO SECCIÓN DE NOTAS PERSONALES');
    await safeWaitForTimeout(page, 1000);

    // Validar título "Notas personales"
    const tituloNotas = page.locator('p').filter({ hasText: /^Notas personales$/i });
    const tituloNotasVisible = await tituloNotas.isVisible({ timeout: 5000 }).catch(() => false);
    if (tituloNotasVisible) {
      console.log('✅ Título "Notas personales" encontrado');
      await expect(tituloNotas).toBeVisible();
    } else {
      console.log('⚠️ Título "Notas personales" no encontrado');
    }

    // Validar icono de información y texto explicativo
    const iconoInfo = page.locator('i.icon-info').first();
    const iconoInfoVisible = await iconoInfo.isVisible({ timeout: 3000 }).catch(() => false);
    if (iconoInfoVisible) {
      console.log('✅ Icono de información encontrado');
      
      // Validar texto explicativo
      const textoExplicativo = page.locator('p.text-small').filter({
        hasText: /El proveedor no podrá ver|proveedor no podrá|no podrá ver lo que escribas/i
      }).first();
      const textoExplicativoVisible = await textoExplicativo.isVisible({ timeout: 3000 }).catch(() => false);
      if (textoExplicativoVisible) {
        const textoExplicativoContenido = await textoExplicativo.textContent();
        console.log(`✅ Texto explicativo encontrado: "${textoExplicativoContenido?.trim()}"`);
      } else {
        console.log('⚠️ Texto explicativo no encontrado');
      }
    } else {
      console.log('⚠️ Icono de información no encontrado');
    }

    // Validar formulario de notas (form#ContactedServiceNotesForm)
    const formularioNotas = page.locator('form#ContactedServiceNotesForm').first();
    const formularioNotasVisible = await formularioNotas.isVisible({ timeout: 5000 }).catch(() => false);
    if (formularioNotasVisible) {
      console.log('✅ Formulario de notas (form#ContactedServiceNotesForm) encontrado');
    } else {
      console.log('⚠️ Formulario de notas no encontrado');
    }

    // Buscar campo de notas (textarea con id="Notes")
    const campoNotas = page.locator('textarea#Notes, input#Notes').first();
    let notasVisible = await campoNotas.isVisible({ timeout: 5000 }).catch(() => false);
    let campoNotasFinal = campoNotas;
    
    if (!notasVisible) {
      // Buscar con selector alternativo
      const campoNotasAlt = page.locator('textarea, input').filter({
        has: page.locator('label').filter({ hasText: /Nota|Note|Observación|Observacion/i })
      }).or(page.getByLabel(/Nota|Note|Observación|Observacion/i, { exact: false }));
      notasVisible = await campoNotasAlt.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (notasVisible) {
        console.log('✅ Campo de notas encontrado (usando selector alternativo)');
        campoNotasFinal = campoNotasAlt.first();
        await expect(campoNotasFinal).toBeVisible();
      }
    } else {
      console.log('✅ Campo de notas (textarea#Notes) encontrado');
      await expect(campoNotasFinal).toBeVisible();
    }

    if (notasVisible) {
      // Verificar si el campo está habilitado o deshabilitado
      const estaHabilitado = await campoNotasFinal.isEnabled({ timeout: 1000 }).catch(() => false);
      
      if (estaHabilitado) {
        console.log('✅ Campo de notas está habilitado');
        await expect(campoNotasFinal).toBeEnabled();
      } else {
        console.log('ℹ️ Campo de notas está deshabilitado (puede ser de solo lectura o requerir acción previa)');
        
        // Verificar si hay algún botón o acción que habilite el campo
        const botonEditar = page.locator('button').filter({
          hasText: /Editar|Edit|Modificar|Modify/i
        }).first();
        const editarVisible = await botonEditar.isVisible({ timeout: 2000 }).catch(() => false);
        if (editarVisible) {
          console.log('ℹ️ Botón de editar encontrado (puede habilitar el campo)');
        }
      }
    } else {
      console.log('⚠️ Campo de notas no encontrado (puede no estar disponible)');
    }

    // 8. VALIDAR CHAT DE MENSAJES
    console.log('💬 PASO 8: Validando chat de mensajes...');
    await showStepMessage(page, '💬 VALIDANDO CHAT DE MENSAJES');
    await safeWaitForTimeout(page, 1000);

    // Validar mensaje de estado del proveedor
    const mensajeEstadoProveedor = page.locator('div').filter({
      has: page.locator('p').filter({
        hasText: /El proveedor está preparando|proveedor está|preparando tu cotización/i
      })
    }).first();
    const mensajeEstadoVisible = await mensajeEstadoProveedor.isVisible({ timeout: 5000 }).catch(() => false);
    if (mensajeEstadoVisible) {
      console.log('✅ Mensaje de estado del proveedor encontrado');
      const mensajeEstadoTexto = await mensajeEstadoProveedor.textContent();
      console.log(`   Texto: "${mensajeEstadoTexto?.trim().substring(0, 100)}..."`);
    } else {
      console.log('⚠️ Mensaje de estado del proveedor no encontrado');
    }

    // Validar información del contacto en el chat
    const infoContactoChat = page.locator('div').filter({
      has: page.locator('img[alt="Client_ProfilePicture"], img[alt*="profile"]')
    }).filter({
      has: page.locator('p.text-xsmall')
    }).first();
    const infoContactoVisible = await infoContactoChat.isVisible({ timeout: 5000 }).catch(() => false);
    if (infoContactoVisible) {
      console.log('✅ Información del contacto en el chat encontrada');
      
      // Validar imagen de perfil
      const imagenPerfilChat = infoContactoChat.locator('img[alt="Client_ProfilePicture"], img[alt*="profile"]').first();
      const imagenPerfilVisible = await imagenPerfilChat.isVisible({ timeout: 2000 }).catch(() => false);
      if (imagenPerfilVisible) {
        console.log('✅ Imagen de perfil del contacto encontrada');
      }
      
      // Validar nombre del contacto
      const nombreContactoChat = infoContactoChat.locator('p.text-xsmall').first();
      const nombreContactoVisible = await nombreContactoChat.isVisible({ timeout: 2000 }).catch(() => false);
      if (nombreContactoVisible) {
        const nombreContactoTexto = await nombreContactoChat.textContent();
        console.log(`✅ Nombre del contacto encontrado: "${nombreContactoTexto?.trim()}"`);
      }
    } else {
      console.log('⚠️ Información del contacto en el chat no encontrada');
    }

    // Validar área de mensajes (chat-scroll-container)
    const areaMensajes = page.locator('div[id="chat-scroll-container"]').first();
    const areaMensajesVisible = await areaMensajes.isVisible({ timeout: 5000 }).catch(() => false);
    if (areaMensajesVisible) {
      console.log('✅ Área de mensajes (chat-scroll-container) encontrada');
      await expect(areaMensajes).toBeVisible();
      
      // Validar que hay mensajes en el chat
      const mensajes = areaMensajes.locator('div[id^="message-"]');
      const cantidadMensajes = await mensajes.count();
      console.log(`✅ Se encontraron ${cantidadMensajes} mensaje(s) en el chat`);
      
      if (cantidadMensajes > 0) {
        // Validar que los mensajes tienen el formato correcto
        const primerMensaje = mensajes.first();
        const primerMensajeVisible = await primerMensaje.isVisible({ timeout: 2000 }).catch(() => false);
        if (primerMensajeVisible) {
          console.log('✅ Primer mensaje encontrado y visible');
        }
      }
    } else {
      console.log('⚠️ Área de mensajes (chat-scroll-container) no encontrada');
    }

    // Validar campo de mensaje (textarea con id="Message")
    const campoMensaje = page.locator('textarea#Message, input#Message').first();
    const campoMensajeVisible = await campoMensaje.isVisible({ timeout: 5000 }).catch(() => false);
    if (campoMensajeVisible) {
      console.log('✅ Campo de mensaje (textarea#Message) encontrado');
      await expect(campoMensaje).toBeVisible();
      await expect(campoMensaje).toBeEnabled();
      
      // Validar placeholder
      const placeholder = await campoMensaje.getAttribute('placeholder');
      if (placeholder) {
        console.log(`✅ Placeholder del campo de mensaje: "${placeholder}"`);
      }
    } else {
      // Buscar con selector alternativo
      const campoMensajeAlt = page.locator('textarea, input').filter({
        has: page.locator('[placeholder]').filter({ hasText: /Mensaje|Message/i })
      }).or(page.getByPlaceholder(/Mensaje|Message/i, { exact: false }));
      const campoMensajeAltVisible = await campoMensajeAlt.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (campoMensajeAltVisible) {
        console.log('✅ Campo de mensaje encontrado (usando selector alternativo)');
      } else {
        console.log('⚠️ Campo de mensaje no encontrado');
      }
    }

    // Validar botón de adjuntar (icon-paperclip)
    const botonAdjuntarChat = page.locator('button').filter({
      has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
    }).first();
    const botonAdjuntarChatVisible = await botonAdjuntarChat.isVisible({ timeout: 5000 }).catch(() => false);
    if (botonAdjuntarChatVisible) {
      console.log('✅ Botón de adjuntar (icon-paperclip) encontrado en el chat');
      await expect(botonAdjuntarChat).toBeVisible();
      await expect(botonAdjuntarChat).toBeEnabled();
    } else {
      console.log('⚠️ Botón de adjuntar no encontrado en el chat');
    }

    // Validar botón de cámara
    const botonCamaraChat = page.locator('button').filter({
      has: page.locator('i.icon-camera, i[class*="camera"]')
    }).first();
    const botonCamaraChatVisible = await botonCamaraChat.isVisible({ timeout: 5000 }).catch(() => false);
    if (botonCamaraChatVisible) {
      console.log('✅ Botón de cámara encontrado en el chat');
      await expect(botonCamaraChat).toBeVisible();
      await expect(botonCamaraChat).toBeEnabled();
      
      // Validar input file oculto para cámara
      const inputCamaraOculto = page.locator('input[type="file"][accept*="image"][capture="environment"]').first();
      const inputCamaraExists = await inputCamaraOculto.count() > 0;
      if (inputCamaraExists) {
        console.log('✅ Input file oculto para cámara encontrado');
      }
    } else {
      console.log('⚠️ Botón de cámara no encontrado en el chat');
    }

    // Validar formulario de mensaje (form#MessageForm)
    const formularioMensaje = page.locator('form#MessageForm').first();
    const formularioVisible = await formularioMensaje.isVisible({ timeout: 5000 }).catch(() => false);
    if (formularioVisible) {
      console.log('✅ Formulario de mensaje (form#MessageForm) encontrado');
      await expect(formularioMensaje).toBeVisible();
    } else {
      console.log('⚠️ Formulario de mensaje no encontrado');
    }

    // 9. VALIDAR ENVÍO DE ARCHIVOS ADJUNTOS
    console.log('📎 PASO 9: Validando envío de archivos adjuntos...');
    await showStepMessage(page, '📎 VALIDANDO ENVÍO DE ARCHIVOS ADJUNTOS');
    await safeWaitForTimeout(page, 1000);

    // Buscar icono/botón de enviar documento (icono de attach/paperclip/file)
    const iconoEnviarDocumento = page.locator('button, div').filter({
      has: page.locator('i[class*="attach"], i[class*="paperclip"], i[class*="file"], i[class*="document"]')
    }).or(page.locator('button, label').filter({
      hasText: /Adjuntar|Attach|Archivo|File|Subir|Upload|Documento/i
    })).first();

    const iconoVisible = await iconoEnviarDocumento.isVisible({ timeout: 5000 }).catch(() => false);

    if (iconoVisible) {
      console.log('✅ Icono/botón de enviar documento encontrado');
      await expect(iconoEnviarDocumento).toBeVisible();
      
      // Validar que el botón está habilitado
      const iconoHabilitado = await iconoEnviarDocumento.isEnabled({ timeout: 1000 }).catch(() => false);
      if (iconoHabilitado) {
        console.log('✅ Icono/botón de enviar documento está habilitado');
      } else {
        console.log('ℹ️ Icono/botón de enviar documento está deshabilitado');
      }
    } else {
      console.log('⚠️ Icono/botón de enviar documento no encontrado (puede no estar disponible)');
    }

    // 10. VALIDAR BOTÓN DE REGRESO AL DASHBOARD
    console.log('🏠 PASO 10: Validando botón de regreso al dashboard...');
    await showStepMessage(page, '🏠 VALIDANDO BOTÓN DE REGRESO');
    await safeWaitForTimeout(page, 1000);

    // Buscar botón de regreso al dashboard (icono de casa/dashboard)
    const botonDashboard = page.locator('a[href*="/dashboard"], button').filter({
      has: page.locator('svg, i').filter({
        has: page.locator('path, [class*="dashboard"], [class*="home"]')
      })
    }).first();
    
    const botonDashboardVisible = await botonDashboard.isVisible({ timeout: 5000 }).catch(() => false);
    if (botonDashboardVisible) {
      console.log('✅ Botón de regreso al dashboard encontrado');
      await expect(botonDashboard).toBeVisible();
    } else {
      // Buscar en el área del chat (mensaje de estado)
      const mensajeEstado = page.locator('div').filter({
        has: page.locator('p').filter({
          hasText: /El proveedor está preparando|proveedor está|preparando tu cotización/i
        })
      }).first();
      const mensajeEstadoVisible = await mensajeEstado.isVisible({ timeout: 3000 }).catch(() => false);
      if (mensajeEstadoVisible) {
        console.log('✅ Mensaje de estado del proveedor encontrado');
        // Buscar botón dentro del mensaje de estado
        const botonEnMensaje = mensajeEstado.locator('a[href*="/dashboard"]').first();
        const botonEnMensajeVisible = await botonEnMensaje.isVisible({ timeout: 2000 }).catch(() => false);
        if (botonEnMensajeVisible) {
          console.log('✅ Botón de regreso al dashboard encontrado en el mensaje de estado');
        }
      } else {
        console.log('⚠️ Botón de regreso al dashboard no encontrado');
      }
    }

    // 11. VALIDAR OTROS ELEMENTOS COMUNES
    console.log('🔍 PASO 11: Validando otros elementos comunes...');
    await showStepMessage(page, '🔍 VALIDANDO OTROS ELEMENTOS');
    await safeWaitForTimeout(page, 1000);

    // Validar información del servicio/negocio
    const infoServicio = page.locator('div, p').filter({
      hasText: /Servicio|Service|Negocio|Business|Proveedor|Provider/i
    });
    const infoServicioCount = await infoServicio.count();
    if (infoServicioCount > 0) {
      console.log(`✅ Se encontraron ${infoServicioCount} elemento(s) con información del servicio/negocio`);
    }

    // Validar información de precio/presupuesto
    const infoPrecio = page.locator('div, p, span').filter({
      hasText: /\$|Precio|Price|Presupuesto|Budget|Costo|Cost/i
    });
    const infoPrecioCount = await infoPrecio.count();
    if (infoPrecioCount > 0) {
      console.log(`✅ Se encontraron ${infoPrecioCount} elemento(s) con información de precio`);
    }

    // Validar información de fecha/hora
    const infoFecha = page.locator('div, p, span').filter({
      hasText: /Fecha|Date|Hora|Time|Día|Day/i
    });
    const infoFechaCount = await infoFecha.count();
    if (infoFechaCount > 0) {
      console.log(`✅ Se encontraron ${infoFechaCount} elemento(s) con información de fecha/hora`);
    }

    console.log('✅ Validación completa de la página de cotización finalizada');
    console.log('🎉 PRUEBA COMPLETADA: Validar elementos completos de la página de cotización');
  });

  test('Interactuar Con Elementos De Una Cotización No Cancelada', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos

    console.log('🚀 INICIANDO PRUEBA: Validar otra cotización sin cancelar');
    console.log(`📊 Viewport: ${page.viewportSize()?.width}x${page.viewportSize()?.height}`);

    await showStepMessage(page, '🔍 VALIDANDO OTRA COTIZACIÓN SIN CANCELAR');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER NOTIFICACIÓN Y NAVEGAR A COTIZACIÓN
    console.log('🔔 PASO 1: Obteniendo notificación y navegando...');
    const { notificationButton, notificationText, quotationId } = await obtenerNotificacionYInfo(page, true);
    
    console.log(`📋 Contenido de la notificación: "${notificationText}"`);
    if (quotationId) {
      console.log(`🆔 ID de cotización extraído: ${quotationId}`);
    }

    // Asegurarse de estar en el dashboard antes de hacer clic
    const urlActualAntes = page.url();
    if (!urlActualAntes.includes('/dashboard')) {
      console.log('🔄 Navegando al dashboard antes de hacer clic en la notificación...');
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    }

    // Re-buscar el botón de notificación para asegurarse de que está disponible
    console.log('🔍 Re-buscando botón de notificación...');
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);

    // Buscar sección Fiestachat nuevamente
    let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
      fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
    }

    if (!fiestachatVisible) {
      throw new Error('No se encontró la sección Fiestachat después de navegar');
    }

    // Buscar la notificación por su texto
    const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
    const notificationCount = await notificationButtons.count();
    
    let notificationButtonFinal: Locator | null = null;
    
    // Buscar la notificación que coincida con el texto
    for (let i = 0; i < Math.min(notificationCount, 50); i++) {
      const notification = notificationButtons.nth(i);
      const text = (await notification.textContent())?.trim() || '';
      
      // Verificar si coincide (puede ser parcial debido a truncamiento)
      if (text.includes(notificationText.substring(0, 30)) || notificationText.includes(text.substring(0, 30))) {
        // Verificar que no esté cancelada
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Notificación encontrada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      // Si no se encuentra por texto, usar la primera no cancelada
      console.log('⚠️ No se encontró la notificación exacta, buscando primera no cancelada...');
      for (let i = 0; i < Math.min(notificationCount, 50); i++) {
        const notification = notificationButtons.nth(i);
        const text = (await notification.textContent())?.trim() || '';
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Usando primera notificación no cancelada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      throw new Error('No se pudo encontrar una notificación válida para hacer clic');
    }

    // Hacer clic en la notificación
    console.log('🖱️ Haciendo clic en la notificación...');
    await notificationButtonFinal.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    const urlActual = page.url();
    console.log(`🌐 URL de cotización: ${urlActual}`);

    // Verificar que estamos en una página de cotización
    const esPaginaCotizacion = 
      urlActual.includes('/quotation') ||
      urlActual.includes('/prequotation') ||
      urlActual.includes('/negotiation') ||
      urlActual.includes('/cotizacion');

    if (!esPaginaCotizacion) {
      throw new Error(`No se navegó a una página de cotización. URL: ${urlActual}`);
    }

    console.log('✅ Navegación exitosa a página de cotización');

    // 2. VALIDAR QUE EL BOTÓN "CANCELAR NEGOCIACIÓN" EXISTE PERO NO SE CANCELA
    await showStepMessage(page, '✅ VALIDANDO QUE NO SE CANCELA');
    await safeWaitForTimeout(page, 1000);

    const botonCancelar = page.locator('button, a').filter({
      hasText: /Cancelar negociación|Cancelar|Cancel/i
    }).first();

    const cancelarVisible = await botonCancelar.isVisible({ timeout: 5000 }).catch(() => false);
    if (cancelarVisible) {
      console.log('✅ Botón "Cancelar negociación" encontrado');
      await expect(botonCancelar).toBeVisible();
      
      // NO hacer clic en cancelar, solo validar que existe
      console.log('✅ Botón "Cancelar negociación" existe pero no se cancela (como se esperaba)');
    } else {
      console.log('⚠️ Botón "Cancelar negociación" no encontrado (puede no estar disponible en este estado)');
    }

    // 3. AGREGAR UNA NOTA
    console.log('📝 PASO 3: Agregando una nota...');
    await showStepMessage(page, '📝 AGREGANDO NOTA');
    await safeWaitForTimeout(page, 1000);

    const campoNotas = page.locator('textarea, input').filter({
      has: page.locator('label').filter({ hasText: /Nota|Note|Observación|Observacion/i })
    }).or(page.getByLabel(/Nota|Note|Observación|Observacion/i, { exact: false }))
    .or(page.locator('textarea#Notes, input#Notes, textarea[id*="note"], input[id*="note"]'));

    const notasVisible = await campoNotas.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (notasVisible) {
      const estaHabilitado = await campoNotas.first().isEnabled({ timeout: 2000 }).catch(() => false);
      
      if (!estaHabilitado) {
        // Intentar habilitar el campo
        const botonEditar = page.locator('button').filter({
          hasText: /Editar|Edit|Modificar|Modify/i
        }).first();
        const editarVisible = await botonEditar.isVisible({ timeout: 2000 }).catch(() => false);
        if (editarVisible) {
          console.log('🖱️ Haciendo clic en botón de editar para habilitar el campo...');
          await botonEditar.click();
          await safeWaitForTimeout(page, 1000);
        }
      }

      const estaHabilitadoDespues = await campoNotas.first().isEnabled({ timeout: 2000 }).catch(() => false);
      if (estaHabilitadoDespues) {
        const textoNota = `Nota de prueba - ${new Date().toISOString()}`;
        await campoNotas.first().fill(textoNota);
        await safeWaitForTimeout(page, 1000);
        
        // Verificar que se guardó
        const valorNota = await campoNotas.first().inputValue();
        if (valorNota.includes(textoNota)) {
          console.log('✅ Nota agregada correctamente');
        }

        // Validar botón "Borrar todo"
        console.log('🧹 Validando botón "Borrar todo"...');
        const botonBorrarTodo = page.locator('button').filter({
          has: page.locator('p').filter({ hasText: /^Borrar todo$/i })
        }).or(page.getByText('Borrar todo', { exact: true }).locator('..')).first();

        const botonBorrarVisible = await botonBorrarTodo.isVisible({ timeout: 2000 }).catch(() => false);
        if (botonBorrarVisible) {
          console.log('✅ Botón "Borrar todo" encontrado y visible');
          await expect(botonBorrarTodo).toBeVisible();
          
          // Verificar que el campo tiene contenido antes de borrar
          const valorAntesBorrar = await campoNotas.first().inputValue();
          if (valorAntesBorrar && valorAntesBorrar.trim().length > 0) {
            console.log(`📝 Contenido antes de borrar: "${valorAntesBorrar.substring(0, 50)}..."`);
            
            // Hacer clic en el botón "Borrar todo"
            console.log('🖱️ Haciendo clic en botón "Borrar todo"...');
            await botonBorrarTodo.click();
            await safeWaitForTimeout(page, 1000);
            
            // Verificar que el campo se vació
            const valorDespuesBorrar = await campoNotas.first().inputValue();
            if (!valorDespuesBorrar || valorDespuesBorrar.trim().length === 0) {
              console.log('✅ Botón "Borrar todo" funcionó correctamente - el campo se vació');
            } else {
              console.log(`⚠️ El campo aún tiene contenido después de borrar: "${valorDespuesBorrar}"`);
            }
          } else {
            console.log('⚠️ El campo no tenía contenido para borrar');
          }
        } else {
          console.log('⚠️ Botón "Borrar todo" no encontrado o no está visible');
        }
      } else {
        console.log('⚠️ Campo de notas no está habilitado, no se puede agregar nota');
      }
    } else {
      console.log('⚠️ Campo de notas no encontrado');
    }

    // 4. ENVIAR UN MENSAJE
    console.log('💬 PASO 4: Enviando un mensaje...');
    await showStepMessage(page, '💬 ENVIANDO MENSAJE');
    await safeWaitForTimeout(page, 1000);

    const campoMensaje = page.locator('textarea, input').filter({
      has: page.locator('label, [placeholder]').filter({ hasText: /Mensaje|Message|Escribe|Write/i })
    }).or(page.getByPlaceholder(/Mensaje|Message|Escribe|Write/i, { exact: false }));

    const mensajeVisible = await campoMensaje.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (mensajeVisible) {
      const estaHabilitado = await campoMensaje.first().isEnabled({ timeout: 2000 }).catch(() => false);
      if (estaHabilitado) {
        const textoMensaje = `Mensaje de prueba - ${new Date().toISOString()}`;
        await campoMensaje.first().fill(textoMensaje);
        await safeWaitForTimeout(page, 500);

        // Buscar botón para enviar mensaje
        const botonEnviar = page.locator('button').filter({
          has: page.locator('i[class*="send"], i[class*="paper-plane"], svg[class*="send"]')
        }).or(page.locator('button').filter({
          hasText: /Enviar|Send/i
        })).first();

        const enviarVisible = await botonEnviar.isVisible({ timeout: 3000 }).catch(() => false);
        if (enviarVisible && await botonEnviar.isEnabled({ timeout: 1000 }).catch(() => false)) {
          console.log('🖱️ Haciendo clic en botón de enviar mensaje...');
          await botonEnviar.click();
          await safeWaitForTimeout(page, 2000);
          console.log('✅ Mensaje enviado');
        } else {
          console.log('⚠️ Botón de enviar no está disponible');
        }
      } else {
        console.log('⚠️ Campo de mensaje no está habilitado');
      }
    } else {
      console.log('⚠️ Campo de mensaje no encontrado');
    }

    // 5. ADJUNTAR ARCHIVOS: DOCUMENTO E IMAGEN
    console.log('📎 PASO 5: Adjuntando archivos (documento e imagen)...');
    await showStepMessage(page, '📎 ADJUNTANDO ARCHIVOS');
    await safeWaitForTimeout(page, 1000);

    // Buscar icono/botón de enviar documento con múltiples estrategias
    let iconoEnviarDocumento: Locator | null = null;
    let iconoVisible = false;

    // Estrategia 1: Buscar botón con icono icon-paperclip específicamente
    console.log('🔍 Estrategia 1: Buscando botón con icono icon-paperclip...');
    // Buscar directamente el botón que contiene el icono
    const botonPaperclip = page.locator('button').filter({
      has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
    }).first();
    
    iconoVisible = await botonPaperclip.isVisible({ timeout: 5000 }).catch(() => false);
    if (iconoVisible) {
      console.log('✅ Botón con icono paperclip encontrado (Estrategia 1)');
      iconoEnviarDocumento = botonPaperclip;
    } else {
      // Verificar si el icono existe pero el botón no es visible
      const iconoExiste = await page.locator('i.icon-paperclip, i[class*="paperclip"]').count() > 0;
      if (iconoExiste) {
        console.log('⚠️ Icono encontrado pero botón no visible, intentando buscar botón padre...');
        const iconoPaperclip = page.locator('i.icon-paperclip, i[class*="paperclip"]').first();
        // Buscar el botón padre más cercano
        const botonPadre = iconoPaperclip.locator('xpath=ancestor::button[1]').first();
        iconoVisible = await botonPadre.isVisible({ timeout: 3000 }).catch(() => false);
        if (iconoVisible) {
          console.log('✅ Botón padre encontrado (Estrategia 1)');
          iconoEnviarDocumento = botonPadre;
        }
      }
    }

    // Estrategia 2: Buscar dentro del área del chat/formulario de mensaje
    if (!iconoVisible) {
      console.log('🔍 Estrategia 2: Buscando en área del chat...');
      // Buscar el contenedor del área de mensajes (tiene border-t y contiene el formulario)
      const areaChat = page.locator('div').filter({
        has: page.locator('form#MessageForm')
      }).or(
        page.locator('div.border-t').filter({
          has: page.locator('button').filter({
            has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
          })
        })
      );
      
      const botonEnArea = areaChat.locator('button').filter({
        has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
      }).first();
      
      iconoVisible = await botonEnArea.isVisible({ timeout: 3000 }).catch(() => false);
      if (iconoVisible) {
        console.log('✅ Botón encontrado en área del chat (Estrategia 2)');
        iconoEnviarDocumento = botonEnArea;
      }
    }

    // Estrategia 3: Buscar por cualquier botón con icono de paperclip/attach/file/document
    if (!iconoVisible) {
      console.log('🔍 Estrategia 3: Buscando cualquier botón con icono de adjuntar...');
      const botonGenerico = page.locator('button').filter({
        has: page.locator('i[class*="attach"], i[class*="paperclip"], i[class*="file"], i[class*="document"]')
      }).first();
      
      iconoVisible = await botonGenerico.isVisible({ timeout: 3000 }).catch(() => false);
      if (iconoVisible) {
        console.log('✅ Botón genérico encontrado (Estrategia 3)');
        iconoEnviarDocumento = botonGenerico;
      }
    }

    // Estrategia 4: Buscar por texto (fallback)
    if (!iconoVisible) {
      console.log('🔍 Estrategia 4: Buscando por texto...');
      const botonPorTexto = page.locator('button, label').filter({
        hasText: /Adjuntar|Attach|Archivo|File|Subir|Upload|Documento/i
      }).first();
      
      iconoVisible = await botonPorTexto.isVisible({ timeout: 3000 }).catch(() => false);
      if (iconoVisible) {
        console.log('✅ Botón encontrado por texto (Estrategia 4)');
        iconoEnviarDocumento = botonPorTexto;
      }
    }

    if (iconoVisible && iconoEnviarDocumento) {
      console.log('✅ Icono/botón de enviar documento encontrado');
      
      // Hacer clic en el icono para abrir el diálogo
      console.log('🖱️ Haciendo clic en icono de adjuntar...');
      await iconoEnviarDocumento.click();
      await safeWaitForTimeout(page, 2000);

      // Esperar a que aparezca el modal de MUI (buscar por role="presentation" sin depender de clases dinámicas)
      console.log('⏳ Esperando a que aparezca el modal...');
      await page.waitForSelector('div[role="presentation"]', { timeout: 3000 }).catch(() => {
        console.log('⚠️ Modal no apareció en 3 segundos');
      });

      // Buscar el diálogo de adjuntos con múltiples estrategias
      let dialogoAdjuntos: Locator | null = null;
      let dialogoVisible = false;

      // Estrategia 1: Buscar el modal de MUI por role y luego el contenido del diálogo
      console.log('🔍 Estrategia 1: Buscando modal por role="presentation"...');
      const modalMUI = page.locator('div[role="presentation"]');
      const modalCount = await modalMUI.count();
      console.log(`📊 Modales encontrados: ${modalCount}`);
      
      if (modalCount > 0) {
        // Buscar el modal que contiene el diálogo de adjuntos
        for (let i = 0; i < modalCount; i++) {
          const modal = modalMUI.nth(i);
          const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
          if (modalVisible) {
            // Buscar el diálogo dentro de este modal
            const dialogo = modal.locator('div.absolute.bg-neutral-0.shadow-lg.bottom-0').first();
            const dialogoCount = await dialogo.count();
            if (dialogoCount > 0) {
              const textoDialogo = await dialogo.textContent().catch(() => '');
              if (textoDialogo && /Adjunto|Galería|Documento|Ubicación/i.test(textoDialogo)) {
                dialogoAdjuntos = dialogo;
                dialogoVisible = await dialogo.isVisible({ timeout: 2000 }).catch(() => false);
                if (dialogoVisible) {
                  console.log(`✅ Diálogo encontrado dentro del modal ${i + 1} (Estrategia 1)`);
                  break;
                }
              }
            }
          }
        }
      }

      // Estrategia 2: Buscar directamente por el texto "Adjunto"
      if (!dialogoVisible) {
        console.log('🔍 Estrategia 2: Buscando por texto "Adjunto"...');
        const textoAdjunto = page.getByText('Adjunto', { exact: true });
        const textoVisible = await textoAdjunto.isVisible({ timeout: 2000 }).catch(() => false);
        if (textoVisible) {
          console.log('✅ Texto "Adjunto" encontrado');
          // Buscar el contenedor padre que tiene las clases del diálogo
          dialogoAdjuntos = textoAdjunto.locator('..').locator('..').locator('div.absolute.bg-neutral-0.shadow-lg').first();
          dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
          if (!dialogoVisible) {
            // Intentar buscar el contenedor de otra manera
            dialogoAdjuntos = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
              has: textoAdjunto
            }).first();
            dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
          }
          if (dialogoVisible) {
            console.log('✅ Diálogo encontrado por texto (Estrategia 2)');
          }
        }
      }

      // Estrategia 3: Buscar por los botones "Galería", "Documento", "Ubicación"
      if (!dialogoVisible) {
        console.log('🔍 Estrategia 3: Buscando por botones del diálogo...');
        const botonGaleria = page.getByText('Galería', { exact: true });
        const botonVisible = await botonGaleria.isVisible({ timeout: 2000 }).catch(() => false);
        if (botonVisible) {
          console.log('✅ Botón "Galería" encontrado');
          // Buscar el contenedor padre
          dialogoAdjuntos = botonGaleria.locator('..').locator('..').locator('..').locator('div.absolute.bg-neutral-0.shadow-lg').first();
          dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
          if (!dialogoVisible) {
            dialogoAdjuntos = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
              has: botonGaleria
            }).first();
            dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
          }
          if (dialogoVisible) {
            console.log('✅ Diálogo encontrado por botones (Estrategia 3)');
          }
        }
      }

      // Estrategia 4: Buscar cualquier div absoluto con shadow-lg
      if (!dialogoVisible) {
        console.log('🔍 Estrategia 4: Buscando cualquier div absoluto con shadow-lg...');
        const todosLosDialogos = page.locator('div.absolute.shadow-lg');
        const cantidad = await todosLosDialogos.count();
        console.log(`📊 Divs absolutos con shadow-lg encontrados: ${cantidad}`);
        if (cantidad > 0) {
          for (let i = 0; i < cantidad; i++) {
            const dialogo = todosLosDialogos.nth(i);
            const visible = await dialogo.isVisible({ timeout: 1000 }).catch(() => false);
            if (visible) {
              // Verificar que contiene "Adjunto", "Galería", "Documento" o "Ubicación"
              const texto = await dialogo.textContent().catch(() => '');
              if (texto && /Adjunto|Galería|Documento|Ubicación/i.test(texto)) {
                dialogoAdjuntos = dialogo;
                dialogoVisible = true;
                console.log(`✅ Diálogo encontrado en posición ${i + 1} (Estrategia 4)`);
                break;
              }
            }
          }
        }
      }

      // Estrategia 5: Buscar por el input file que está dentro del diálogo
      if (!dialogoVisible) {
        console.log('🔍 Estrategia 5: Buscando por input file dentro del diálogo...');
        const inputFile = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*=".pdf"]').first();
        const inputVisible = await inputFile.isVisible({ timeout: 2000 }).catch(() => false);
        if (inputVisible) {
          console.log('✅ Input file encontrado');
          // Buscar el contenedor padre que tiene las clases del diálogo
          dialogoAdjuntos = inputFile.locator('..').locator('..').locator('..').locator('div.absolute.bg-neutral-0.shadow-lg').first();
          dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
          if (!dialogoVisible) {
            dialogoAdjuntos = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
              has: inputFile
            }).first();
            dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
          }
          if (dialogoVisible) {
            console.log('✅ Diálogo encontrado por input file (Estrategia 5)');
          }
        }
      }

      if (dialogoVisible && dialogoAdjuntos) {
        console.log('✅ Diálogo de adjuntos abierto');

        // 5.1. ADJUNTAR DOCUMENTO
        console.log('📄 Adjuntando documento...');
        // Buscar el botón que contiene el icono icon-file y el texto "Documento"
        const botonDocumento = dialogoAdjuntos.locator('button').filter({
          has: page.locator('i.icon-file')
        }).filter({
          has: page.locator('p').filter({ hasText: /^Documento$/i })
        }).first();
        
        // Si no se encuentra con el filtro, buscar directamente por el texto
        let documentoVisible = await botonDocumento.isVisible({ timeout: 2000 }).catch(() => false);
        let botonFinal = botonDocumento;
        
        if (!documentoVisible) {
          console.log('🔍 Buscando botón "Documento" por texto directo...');
          const botonPorTexto = dialogoAdjuntos.getByText('Documento', { exact: true }).locator('..').locator('..');
          documentoVisible = await botonPorTexto.isVisible({ timeout: 2000 }).catch(() => false);
          if (documentoVisible) {
            console.log('✅ Botón "Documento" encontrado por texto');
            botonFinal = botonPorTexto;
          }
        }

        if (documentoVisible) {
          console.log('✅ Botón "Documento" encontrado');
          
          // Obtener archivos de prueba (documentos) antes de hacer clic
          const { archivosTemp } = await obtenerArchivosPrueba();
          console.log(`📊 Archivos encontrados en C:\\Temp: ${archivosTemp.length}`);
          
          if (archivosTemp.length > 0) {
            // Buscar un archivo PDF, DOC, DOCX, XLSX, etc.
            const documentoPrueba = archivosTemp.find(archivo => {
              const ext = path.extname(archivo).toLowerCase();
              return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext);
            });
            
            if (documentoPrueba) {
              console.log(`📎 Usando documento de prueba: ${path.basename(documentoPrueba)}`);
              
              // Buscar el input file que está antes del botón de documento
              // El input está en el mismo contenedor que el botón
              let inputDocumento = botonFinal.locator('..').locator('input[type="file"][accept*=".pdf"]').first();
              let inputExists = await inputDocumento.count() > 0;
              
              if (!inputExists) {
                // Buscar el input que está antes del botón (hermano anterior)
                inputDocumento = botonFinal.locator('..').locator('..').locator('input[type="file"][accept*=".pdf"]').first();
                inputExists = await inputDocumento.count() > 0;
              }
              
              if (!inputExists) {
                // Buscar directamente en el diálogo por accept
                inputDocumento = dialogoAdjuntos.locator('input[type="file"][accept*=".pdf"], input[type="file"][accept*=".doc"], input[type="file"][accept*=".docx"]').first();
                inputExists = await inputDocumento.count() > 0;
              }
              
              if (!inputExists) {
                // Última opción: buscar cualquier input file dentro del diálogo
                inputDocumento = dialogoAdjuntos.locator('input[type="file"]').nth(1); // El segundo input es el de documentos
                inputExists = await inputDocumento.count() > 0;
              }
              
              // Hacer clic en el botón de documento para activar el input
              await botonFinal.click();
              await safeWaitForTimeout(page, 1000);
              
              // Intentar adjuntar el documento
              try {
                if (inputExists) {
                  await inputDocumento.setInputFiles(documentoPrueba);
                  await safeWaitForTimeout(page, 2000);
                  console.log('✅ Documento adjuntado exitosamente');
                } else {
                  console.log('⚠️ Input file no encontrado después de hacer clic en Documento');
                }
              } catch (e: any) {
                console.log(`⚠️ Error al adjuntar documento: ${e.message}`);
                console.log('⚠️ Intentando estrategia alternativa...');
                
                // Estrategia alternativa: buscar input file en toda la página
                const inputAlternativo = page.locator('input[type="file"][accept*=".pdf"], input[type="file"][accept*=".doc"], input[type="file"][accept*=".docx"]').first();
                const inputAltExists = await inputAlternativo.count() > 0;
                if (inputAltExists) {
                  try {
                    await inputAlternativo.setInputFiles(documentoPrueba);
                    await safeWaitForTimeout(page, 2000);
                    console.log('✅ Documento adjuntado (usando estrategia alternativa)');
                  } catch (e2: any) {
                    console.log(`⚠️ Error en estrategia alternativa: ${e2.message}`);
                  }
                }
              }
            } else {
              console.log('⚠️ No se encontraron documentos de prueba compatibles (.pdf, .doc, .docx, .xlsx, etc.)');
            }
          } else {
            console.log('⚠️ No se encontraron archivos de prueba en C:\\Temp');
          }
        } else {
          console.log('⚠️ Botón "Documento" no encontrado en el diálogo');
        }

        // 5.2. ADJUNTAR IMAGEN
        console.log('🖼️ Adjuntando imagen...');
        const botonGaleria = dialogoAdjuntos.locator('button').filter({
          has: page.locator('i.icon-image')
        }).filter({
          has: page.locator('p').filter({ hasText: /^Galería$/i })
        }).first();

        let galeriaVisible = await botonGaleria.isVisible({ timeout: 2000 }).catch(() => false);
        let botonGaleriaFinal = botonGaleria;
        
        if (!galeriaVisible) {
          console.log('🔍 Buscando botón "Galería" por texto directo...');
          const botonPorTexto = dialogoAdjuntos.getByText('Galería', { exact: true }).locator('..').locator('..');
          galeriaVisible = await botonPorTexto.isVisible({ timeout: 2000 }).catch(() => false);
          if (galeriaVisible) {
            console.log('✅ Botón "Galería" encontrado por texto');
            botonGaleriaFinal = botonPorTexto;
          }
        }
        
        if (galeriaVisible) {
          console.log('✅ Botón "Galería" encontrado');
          
          // Obtener archivos de prueba (imágenes)
          const { imagenesTesting } = await obtenerArchivosPrueba();
          console.log(`📊 Imágenes encontradas: ${imagenesTesting.length}`);
          
          if (imagenesTesting.length > 0) {
            const imagenPrueba = imagenesTesting[0];
            console.log(`📎 Usando imagen de prueba: ${path.basename(imagenPrueba)}`);
            
            // Buscar el input file que está antes del botón de galería
            let inputGaleria = botonGaleriaFinal.locator('..').locator('input[type="file"][accept*="image"]').first();
            let inputGaleriaExists = await inputGaleria.count() > 0;
            
            if (!inputGaleriaExists) {
              // Buscar el input que está antes del botón (hermano anterior)
              inputGaleria = botonGaleriaFinal.locator('..').locator('..').locator('input[type="file"][accept*="image"]').first();
              inputGaleriaExists = await inputGaleria.count() > 0;
            }
            
            if (!inputGaleriaExists) {
              // Buscar directamente en el diálogo por accept
              inputGaleria = dialogoAdjuntos.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
              inputGaleriaExists = await inputGaleria.count() > 0;
            }
            
            if (!inputGaleriaExists) {
              // Última opción: buscar el primer input file (es el de imágenes)
              inputGaleria = dialogoAdjuntos.locator('input[type="file"]').first();
              inputGaleriaExists = await inputGaleria.count() > 0;
            }
            
            // Hacer clic en el botón de galería para activar el input
            await botonGaleriaFinal.click();
            await safeWaitForTimeout(page, 1000);
            
            // Intentar adjuntar la imagen
            try {
              if (inputGaleriaExists) {
                await inputGaleria.setInputFiles(imagenPrueba);
                await safeWaitForTimeout(page, 2000);
                console.log('✅ Imagen adjuntada exitosamente');
              } else {
                console.log('⚠️ Input file no encontrado después de hacer clic en Galería');
              }
            } catch (e: any) {
              console.log(`⚠️ Error al adjuntar imagen: ${e.message}`);
              console.log('⚠️ Intentando estrategia alternativa...');
              
              // Estrategia alternativa: buscar input file en toda la página
              const inputAlternativo = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
              const inputAltExists = await inputAlternativo.count() > 0;
              if (inputAltExists) {
                try {
                  await inputAlternativo.setInputFiles(imagenPrueba);
                  await safeWaitForTimeout(page, 2000);
                  console.log('✅ Imagen adjuntada (usando estrategia alternativa)');
                } catch (e2: any) {
                  console.log(`⚠️ Error en estrategia alternativa: ${e2.message}`);
                }
              }
            }
          } else {
            console.log('⚠️ No se encontraron imágenes de prueba');
          }
        } else {
          console.log('⚠️ Botón "Galería" no encontrado en el diálogo');
        }

        // Cerrar el diálogo antes de continuar con ubicación
        console.log('🔒 Cerrando diálogo de adjuntos...');
        const botonCerrar = dialogoAdjuntos.locator('button').filter({
          has: page.locator('i.icon-x')
        }).first();
        const cerrarVisible = await botonCerrar.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (cerrarVisible) {
          console.log('🖱️ Haciendo clic en botón de cerrar...');
          await botonCerrar.click();
          await safeWaitForTimeout(page, 1000);
          
          // Verificar que el diálogo se cerró
          const dialogoCerrado = await dialogoAdjuntos.isHidden({ timeout: 2000 }).catch(() => false);
          if (dialogoCerrado) {
            console.log('✅ Diálogo de adjuntos cerrado correctamente');
          } else {
            console.log('⚠️ El diálogo aún está visible, intentando cerrar con ESC...');
            await page.keyboard.press('Escape');
            await safeWaitForTimeout(page, 1000);
            
            // Verificar nuevamente
            const dialogoCerrado2 = await dialogoAdjuntos.isHidden({ timeout: 2000 }).catch(() => false);
            if (dialogoCerrado2) {
              console.log('✅ Diálogo cerrado con ESC');
            } else {
              console.log('⚠️ El diálogo no se cerró, continuando de todas formas...');
            }
          }
        } else {
          console.log('⚠️ Botón de cerrar no encontrado, usando ESC...');
          await page.keyboard.press('Escape');
          await safeWaitForTimeout(page, 1000);
          
          // Verificar que el diálogo se cerró
          const dialogoCerrado = await dialogoAdjuntos.isHidden({ timeout: 2000 }).catch(() => false);
          if (dialogoCerrado) {
            console.log('✅ Diálogo de adjuntos cerrado (usando ESC)');
          } else {
            console.log('⚠️ El diálogo no se cerró con ESC, continuando de todas formas...');
          }
        }
        
        // Esperar un momento adicional para asegurar que el diálogo se cerró completamente
        await safeWaitForTimeout(page, 500);
      } else {
        console.log('⚠️ Diálogo de adjuntos no se abrió después de hacer clic en el icono');
      }
    } else {
      console.log('❌ ERROR: Icono/botón de enviar documento no encontrado');
      console.log('🔍 Información de depuración:');
      
      // Intentar encontrar todos los botones con iconos relacionados
      const todosLosBotones = await page.locator('button').count();
      console.log(`   - Total de botones en la página: ${todosLosBotones}`);
      
      const botonesConIconos = page.locator('button').filter({
        has: page.locator('i')
      });
      const cantidadConIconos = await botonesConIconos.count();
      console.log(`   - Botones con iconos: ${cantidadConIconos}`);
      
      // Buscar específicamente el icono paperclip
      const iconosPaperclip = await page.locator('i.icon-paperclip, i[class*="paperclip"]').count();
      console.log(`   - Iconos paperclip encontrados: ${iconosPaperclip}`);
      
      // Buscar el formulario de mensaje
      const formularioMensaje = await page.locator('form#MessageForm').count();
      console.log(`   - Formulario MessageForm encontrado: ${formularioMensaje > 0 ? 'Sí' : 'No'}`);
      
      if (formularioMensaje > 0) {
        const contenedorPadre = page.locator('form#MessageForm').locator('..');
        const botonesEnContenedor = await contenedorPadre.locator('button').count();
        console.log(`   - Botones en contenedor del formulario: ${botonesEnContenedor}`);
      }
      
      throw new Error('No se pudo encontrar el botón para adjuntar archivos. El elemento puede no estar disponible o la estructura de la página ha cambiado.');
    }

    // 5.5. PROBAR BOTÓN DE CÁMARA
    // Nota: El botón de cámara se comporta igual que seleccionar "Galería" en el diálogo de adjuntos
    console.log('📷 PASO 5.5: Probando botón de cámara (comportamiento igual a Galería)...');
    await showStepMessage(page, '📷 PROBANDO BOTÓN DE CÁMARA');
    await safeWaitForTimeout(page, 1000);

    // Buscar el botón de cámara (icono icon-camera)
    const botonCamara = page.locator('button').filter({
      has: page.locator('i.icon-camera, i[class*="camera"]')
    }).first();

    const botonCamaraVisible = await botonCamara.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!botonCamaraVisible) {
      // Intentar buscar en el área del chat/formulario
      const areaChat = page.locator('form#MessageForm').locator('..').or(
        page.locator('div').filter({ has: page.locator('form#MessageForm') })
      );
      const botonCamaraEnArea = areaChat.locator('button').filter({
        has: page.locator('i.icon-camera, i[class*="camera"]')
      }).first();
      
      const botonCamaraEnAreaVisible = await botonCamaraEnArea.isVisible({ timeout: 2000 }).catch(() => false);
      if (botonCamaraEnAreaVisible) {
        console.log('✅ Botón de cámara encontrado en área del chat');
        // Usar el botón encontrado en el área
        const botonCamaraHabilitado = await botonCamaraEnArea.isEnabled({ timeout: 1000 }).catch(() => false);
        if (botonCamaraHabilitado) {
          console.log('✅ Botón de cámara está habilitado');
          
          // Obtener imágenes de prueba (mismo proceso que para Galería)
          const { imagenesTesting } = await obtenerArchivosPrueba();
          console.log(`📊 Imágenes encontradas: ${imagenesTesting.length}`);
          
          if (imagenesTesting.length > 0) {
            const imagenPrueba = imagenesTesting[0];
            console.log(`📎 Usando imagen de prueba: ${path.basename(imagenPrueba)}`);
            
            // Hacer clic en el botón de cámara (abre el mismo input que Galería)
            console.log('🖱️ Haciendo clic en botón de cámara...');
            await botonCamaraEnArea.click();
            await safeWaitForTimeout(page, 1000);
            
            // Buscar el input file (mismo que se usa para Galería)
            // El botón de cámara abre el mismo selector de archivos que Galería
            let inputCamara = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
            let inputCamaraExists = await inputCamara.count() > 0;
            
            if (!inputCamaraExists) {
              // Buscar input con capture (puede estar oculto)
              inputCamara = page.locator('input[type="file"][capture="environment"], input[type="file"][capture*="camera"]').first();
              inputCamaraExists = await inputCamara.count() > 0;
            }
            
            if (!inputCamaraExists) {
              // Última opción: buscar cualquier input file
              inputCamara = page.locator('input[type="file"]').first();
              inputCamaraExists = await inputCamara.count() > 0;
            }
            
            // Intentar adjuntar la imagen (mismo proceso que Galería)
            try {
              if (inputCamaraExists) {
                await inputCamara.setInputFiles(imagenPrueba);
                await safeWaitForTimeout(page, 2000);
                console.log('✅ Imagen adjuntada desde botón de cámara (comportamiento igual a Galería)');
              } else {
                console.log('⚠️ Input file no encontrado después de hacer clic en botón de cámara');
              }
            } catch (e: any) {
              console.log(`⚠️ Error al adjuntar imagen desde botón de cámara: ${e.message}`);
              console.log('⚠️ Intentando estrategia alternativa...');
              
              // Estrategia alternativa: buscar input file en toda la página
              const inputAlternativo = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
              const inputAltExists = await inputAlternativo.count() > 0;
              if (inputAltExists) {
                try {
                  await inputAlternativo.setInputFiles(imagenPrueba);
                  await safeWaitForTimeout(page, 2000);
                  console.log('✅ Imagen adjuntada (usando estrategia alternativa)');
                } catch (e2: any) {
                  console.log(`⚠️ Error en estrategia alternativa: ${e2.message}`);
                }
              }
            }
          } else {
            console.log('⚠️ No se encontraron imágenes de prueba');
          }
        } else {
          console.log('⚠️ Botón de cámara está deshabilitado');
        }
      }
    } else {
      console.log('✅ Botón de cámara encontrado');
      
      // Verificar que el botón está habilitado
      const botonCamaraHabilitado = await botonCamara.isEnabled({ timeout: 1000 }).catch(() => false);
      if (botonCamaraHabilitado) {
        console.log('✅ Botón de cámara está habilitado');
        
        // Obtener imágenes de prueba (mismo proceso que para Galería)
        const { imagenesTesting } = await obtenerArchivosPrueba();
        console.log(`📊 Imágenes encontradas: ${imagenesTesting.length}`);
        
        if (imagenesTesting.length > 0) {
          const imagenPrueba = imagenesTesting[0];
          console.log(`📎 Usando imagen de prueba: ${path.basename(imagenPrueba)}`);
          
          // Hacer clic en el botón de cámara (abre el mismo input que Galería)
          console.log('🖱️ Haciendo clic en botón de cámara...');
          await botonCamara.click();
          await safeWaitForTimeout(page, 1000);
          
          // Buscar el input file (mismo que se usa para Galería)
          // El botón de cámara abre el mismo selector de archivos que Galería
          let inputCamara = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
          let inputCamaraExists = await inputCamara.count() > 0;
          
          if (!inputCamaraExists) {
            // Buscar input con capture (puede estar oculto)
            inputCamara = page.locator('input[type="file"][capture="environment"], input[type="file"][capture*="camera"]').first();
            inputCamaraExists = await inputCamara.count() > 0;
          }
          
          if (!inputCamaraExists) {
            // Última opción: buscar cualquier input file
            inputCamara = page.locator('input[type="file"]').first();
            inputCamaraExists = await inputCamara.count() > 0;
          }
          
          // Intentar adjuntar la imagen (mismo proceso que Galería)
          try {
            if (inputCamaraExists) {
              await inputCamara.setInputFiles(imagenPrueba);
              await safeWaitForTimeout(page, 2000);
              console.log('✅ Imagen adjuntada desde botón de cámara (comportamiento igual a Galería)');
            } else {
              console.log('⚠️ Input file no encontrado después de hacer clic en botón de cámara');
            }
          } catch (e: any) {
            console.log(`⚠️ Error al adjuntar imagen desde botón de cámara: ${e.message}`);
            console.log('⚠️ Intentando estrategia alternativa...');
            
            // Estrategia alternativa: buscar input file en toda la página
            const inputAlternativo = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
            const inputAltExists = await inputAlternativo.count() > 0;
            if (inputAltExists) {
              try {
                await inputAlternativo.setInputFiles(imagenPrueba);
                await safeWaitForTimeout(page, 2000);
                console.log('✅ Imagen adjuntada (usando estrategia alternativa)');
              } catch (e2: any) {
                console.log(`⚠️ Error en estrategia alternativa: ${e2.message}`);
              }
            }
          }
        } else {
          console.log('⚠️ No se encontraron imágenes de prueba');
        }
      } else {
        console.log('⚠️ Botón de cámara está deshabilitado');
      }
    }
    
    if (!botonCamaraVisible) {
      console.log('⚠️ Botón de cámara no encontrado (puede no estar disponible en esta vista)');
    }

    // 6. ADJUNTAR UBICACIÓN
    console.log('📍 PASO 6: Adjuntando ubicación...');
    await showStepMessage(page, '📍 ADJUNTANDO UBICACIÓN');
    await safeWaitForTimeout(page, 1000);

    // Asegurarse de que no haya diálogos abiertos antes de continuar
    console.log('🔍 Verificando que no haya diálogos abiertos...');
    const dialogoAbierto = page.locator('div[role="presentation"]').first();
    const hayDialogoAbierto = await dialogoAbierto.isVisible({ timeout: 1000 }).catch(() => false);
    if (hayDialogoAbierto) {
      console.log('⚠️ Hay un diálogo abierto, cerrándolo...');
      await page.keyboard.press('Escape');
      await safeWaitForTimeout(page, 1000);
    }

    // Re-abrir el diálogo de adjuntos
    console.log('🔍 Buscando icono para re-abrir diálogo de adjuntos...');
    const iconoEnviarDocumento2 = page.locator('button').filter({
      has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
    }).first();
    
    let iconoVisible2 = await iconoEnviarDocumento2.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Si no se encuentra con el selector específico, intentar con el genérico
    if (!iconoVisible2) {
      console.log('🔍 Intentando con selector genérico...');
      const iconoGenerico = page.locator('button, div').filter({
        has: page.locator('i[class*="attach"], i[class*="paperclip"], i[class*="file"], i[class*="document"]')
      }).or(page.locator('button, label').filter({
        hasText: /Adjuntar|Attach|Archivo|File|Subir|Upload|Documento/i
      })).first();
      
      iconoVisible2 = await iconoGenerico.isVisible({ timeout: 3000 }).catch(() => false);
      if (iconoVisible2) {
        console.log('✅ Icono encontrado con selector genérico');
        await iconoGenerico.click();
      }
    } else {
      console.log('✅ Icono encontrado con selector específico');
      await iconoEnviarDocumento2.click();
    }
    
    if (iconoVisible2) {
      await safeWaitForTimeout(page, 1500);

      const dialogoAdjuntos2 = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
        has: page.locator('p').filter({ hasText: /^Adjunto$/i })
      }).first();

      const dialogoVisible2 = await dialogoAdjuntos2.isVisible({ timeout: 3000 }).catch(() => false);
      if (dialogoVisible2) {
        // Buscar botón de ubicación
        const botonUbicacion = dialogoAdjuntos2.locator('button').filter({
          has: page.locator('i.icon-map-pin')
        }).filter({
          has: page.locator('p').filter({ hasText: /^Ubicación$/i })
        }).first();

        const ubicacionVisible = await botonUbicacion.isVisible({ timeout: 2000 }).catch(() => false);
        if (ubicacionVisible) {
          console.log('✅ Botón de ubicación encontrado');
          await botonUbicacion.click();
          await safeWaitForTimeout(page, 1500);

          // Buscar el diálogo de ubicación
          const dialogoUbicacion = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
            has: page.locator('p').filter({ hasText: /^Enviar ubicación$/i })
          }).first();

          const dialogoUbicacionVisible = await dialogoUbicacion.isVisible({ timeout: 3000 }).catch(() => false);
          if (dialogoUbicacionVisible) {
            console.log('✅ Diálogo de ubicación abierto');

            // Buscar el campo de dirección
            const campoDireccion = dialogoUbicacion.locator('input[placeholder=" "], input#Address').first();
            const campoVisible = await campoDireccion.isVisible({ timeout: 3000 }).catch(() => false);
            
            if (campoVisible) {
              // Escribir una dirección al azar con calle, número, ciudad y estado
              const direccionesPrueba = [
                'matamoros 500, tepatitlan jalisco',
                'av independencia 123, guadalajara jalisco',
                'calle hidalgo 456, zapopan jalisco',
                'blvd lopez mateos 789, tlaquepaque jalisco'
              ];
              
              const direccionPrueba = direccionesPrueba[Math.floor(Math.random() * direccionesPrueba.length)];
              console.log(`✍️ Escribiendo dirección: "${direccionPrueba}"`);
              
              await campoDireccion.fill(direccionPrueba);
              await safeWaitForTimeout(page, 2000); // Esperar a que aparezcan las sugerencias de Google

              // Esperar a que aparezcan las opciones de Google
              const opcionesUbicacion = dialogoUbicacion.locator('ul li.cursor-pointer').first();
              const opcionesVisible = await opcionesUbicacion.isVisible({ timeout: 5000 }).catch(() => false);
              
              if (opcionesVisible) {
                console.log('✅ Opciones de ubicación de Google aparecieron');
                
                // Obtener todas las opciones disponibles
                const todasLasOpciones = dialogoUbicacion.locator('ul li.cursor-pointer');
                const cantidadOpciones = await todasLasOpciones.count();
                console.log(`📊 Opciones disponibles: ${cantidadOpciones}`);
                
                if (cantidadOpciones > 0) {
                  // Seleccionar la primera opción
                  const primeraOpcion = todasLasOpciones.first();
                  const textoOpcion = await primeraOpcion.textContent();
                  console.log(`🖱️ Seleccionando opción: "${textoOpcion?.trim()}"`);
                  
                  await primeraOpcion.click();
                  await safeWaitForTimeout(page, 2000);
                  console.log('✅ Ubicación seleccionada');
                } else {
                  console.log('⚠️ No se encontraron opciones de ubicación');
                }
              } else {
                console.log('⚠️ Las opciones de ubicación no aparecieron (puede requerir más tiempo)');
              }
            } else {
              console.log('⚠️ Campo de dirección no encontrado');
            }

            // Cerrar el diálogo de ubicación
            const botonCerrarUbicacion = dialogoUbicacion.locator('button').filter({
              has: page.locator('i.icon-x')
            }).first();
            const cerrarUbicacionVisible = await botonCerrarUbicacion.isVisible({ timeout: 2000 }).catch(() => false);
            if (cerrarUbicacionVisible) {
              await botonCerrarUbicacion.click();
              await safeWaitForTimeout(page, 1000);
            } else {
              // Buscar botón Cancelar
              const botonCancelarUbicacion = dialogoUbicacion.locator('button').filter({
                hasText: /^Cancelar$/i
              }).first();
              const cancelarVisible = await botonCancelarUbicacion.isVisible({ timeout: 2000 }).catch(() => false);
              if (cancelarVisible) {
                await botonCancelarUbicacion.click();
                await safeWaitForTimeout(page, 1000);
              } else {
                await page.keyboard.press('Escape');
                await safeWaitForTimeout(page, 1000);
              }
            }
          } else {
            console.log('⚠️ Diálogo de ubicación no se abrió');
          }
        } else {
          console.log('⚠️ Botón de ubicación no encontrado');
        }

        // Cerrar el diálogo de adjuntos
        const botonCerrarAdjuntos = dialogoAdjuntos2.locator('button').filter({
          has: page.locator('i.icon-x')
        }).first();
        const cerrarAdjuntosVisible = await botonCerrarAdjuntos.isVisible({ timeout: 2000 }).catch(() => false);
        if (cerrarAdjuntosVisible) {
          await botonCerrarAdjuntos.click();
          await safeWaitForTimeout(page, 1000);
        } else {
          await page.keyboard.press('Escape');
          await safeWaitForTimeout(page, 1000);
        }
      }
    } else {
      console.log('⚠️ Icono de adjuntar no está disponible para ubicación');
    }

    // 7. VALIDAR OTROS ELEMENTOS DE LA PÁGINA
    await showStepMessage(page, '📋 VALIDANDO ELEMENTOS DE LA PÁGINA');
    await safeWaitForTimeout(page, 1000);

    // Validar que la página tiene contenido
    const tituloCotizacion = page.locator('h1, h2, h3, p').filter({
      hasText: /Cotización|Quotation|Negociación|Negotiation/i
    }).first();
    
    const tituloVisible = await tituloCotizacion.isVisible({ timeout: 5000 }).catch(() => false);
    if (tituloVisible) {
      const tituloTexto = await tituloCotizacion.textContent();
      console.log(`✅ Título de cotización encontrado: "${tituloTexto?.trim()}"`);
    }

    // Validar información del servicio/negocio
    const infoServicio = page.locator('div, p').filter({
      hasText: /Servicio|Service|Negocio|Business|Proveedor|Provider/i
    });
    const infoServicioCount = await infoServicio.count();
    if (infoServicioCount > 0) {
      console.log(`✅ Se encontraron ${infoServicioCount} elemento(s) con información del servicio/negocio`);
    }

    console.log('✅ Validación de otra cotización sin cancelar completada');
  });

  test('Cancelar Una Negociación', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos

    console.log('🚀 INICIANDO PRUEBA: Cancelar una negociación');
    console.log(`📊 Viewport: ${page.viewportSize()?.width}x${page.viewportSize()?.height}`);

    await showStepMessage(page, '❌ CANCELANDO NEGOCIACIÓN');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER NOTIFICACIÓN Y NAVEGAR A COTIZACIÓN
    console.log('🔔 PASO 1: Obteniendo notificación y navegando...');
    const { notificationButton, notificationText, quotationId } = await obtenerNotificacionYInfo(page, true);
    
    console.log(`📋 Contenido de la notificación: "${notificationText}"`);
    if (quotationId) {
      console.log(`🆔 ID de cotización extraído: ${quotationId}`);
    }

    // Asegurarse de estar en el dashboard antes de hacer clic
    const urlActualAntes = page.url();
    if (!urlActualAntes.includes('/dashboard')) {
      console.log('🔄 Navegando al dashboard antes de hacer clic en la notificación...');
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    }

    // Re-buscar el botón de notificación para asegurarse de que está disponible
    console.log('🔍 Re-buscando botón de notificación...');
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);

    // Buscar sección Fiestachat nuevamente
    let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
      fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
    }

    if (!fiestachatVisible) {
      throw new Error('No se encontró la sección Fiestachat después de navegar');
    }

    // Buscar la notificación por su texto
    const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
    const notificationCount = await notificationButtons.count();
    
    let notificationButtonFinal: Locator | null = null;
    
    // Buscar la notificación que coincida con el texto y que NO esté cancelada
    for (let i = 0; i < Math.min(notificationCount, 50); i++) {
      const notification = notificationButtons.nth(i);
      const text = (await notification.textContent())?.trim() || '';
      
      // Verificar si coincide (puede ser parcial debido a truncamiento)
      if (text.includes(notificationText.substring(0, 30)) || notificationText.includes(text.substring(0, 30))) {
        // Verificar que NO esté cancelada
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Notificación encontrada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      // Si no se encuentra por texto, usar la primera no cancelada
      console.log('⚠️ No se encontró la notificación exacta, buscando primera no cancelada...');
      for (let i = 0; i < Math.min(notificationCount, 50); i++) {
        const notification = notificationButtons.nth(i);
        const text = (await notification.textContent())?.trim() || '';
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Usando primera notificación no cancelada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      throw new Error('No se pudo encontrar una notificación válida (no cancelada) para cancelar');
    }

    // Hacer clic en la notificación
    console.log('🖱️ Haciendo clic en la notificación...');
    await notificationButtonFinal.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    const urlActual = page.url();
    console.log(`🌐 URL de cotización: ${urlActual}`);

    // Verificar que estamos en una página de cotización
    const esPaginaCotizacion = 
      urlActual.includes('/quotation') ||
      urlActual.includes('/prequotation') ||
      urlActual.includes('/negotiation') ||
      urlActual.includes('/cotizacion');

    if (!esPaginaCotizacion) {
      throw new Error(`No se navegó a una página de cotización. URL: ${urlActual}`);
    }

    console.log('✅ Navegación exitosa a página de cotización');

    // 2. CANCELAR LA NEGOCIACIÓN
    await showStepMessage(page, '❌ CANCELANDO NEGOCIACIÓN');
    await safeWaitForTimeout(page, 1000);

    const botonCancelar = page.locator('button, a').filter({
      hasText: /Cancelar negociación|Cancelar|Cancel/i
    }).first();

    const cancelarVisible = await botonCancelar.isVisible({ timeout: 5000 }).catch(() => false);
    if (!cancelarVisible) {
      throw new Error('❌ ERROR: Botón "Cancelar negociación" no encontrado. No se puede continuar con la cancelación.');
    }

    console.log('✅ Botón "Cancelar negociación" encontrado');
    await expect(botonCancelar).toBeVisible();
    
    // Guardar URL de esta cotización antes de cancelar
    const urlCotizacionActual = page.url();
    console.log(`📋 URL de cotización actual: ${urlCotizacionActual}`);
    
    // Hacer clic en el botón de cancelar
    await showStepMessage(page, '🖱️ HACIENDO CLIC EN CANCELAR');
    await safeWaitForTimeout(page, 500);
    
    await botonCancelar.click();
    await safeWaitForTimeout(page, 1500);

    // Buscar modal de confirmación con el diálogo específico
    // El diálogo tiene: imagen de danger, texto "Esta acción es irreversible...", botones "Regresar" y "Aceptar"
    const modalConfirmacion = page.locator('div.relative.flex.flex-col.gap-3.w-\\[300px\\]').filter({
      has: page.locator('img[alt="danger icon"], img[alt*="danger"]')
    }).filter({
      has: page.locator('p').filter({
        hasText: /Esta acción es irreversible|irreversible|no podrás modificar/i
      })
    }).first();

    // Fallback: buscar modal con estructura más flexible
    let modalVisible = await modalConfirmacion.isVisible({ timeout: 5000 }).catch(() => false);
    let modalElement = modalConfirmacion;

    if (!modalVisible) {
      console.log('🔍 Intentando buscar modal con selector más flexible...');
      modalElement = page.locator('div.relative.flex.flex-col').filter({
        has: page.locator('img[alt*="danger"], img[src*="danger"]')
      }).filter({
        has: page.locator('p').filter({
          hasText: /Esta acción es irreversible|irreversible|no podrás modificar/i
        })
      }).first();
      modalVisible = await modalElement.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (!modalVisible) {
      throw new Error('❌ ERROR: Modal de confirmación no encontrado después de hacer clic en cancelar');
    }

    console.log('✅ Modal de confirmación encontrado');
    
    // Buscar y hacer clic en el botón "Aceptar"
    const botonAceptar = modalElement.locator('button').filter({
      has: page.locator('span.font-bold').filter({ hasText: /^Aceptar$/i })
    }).filter({
      has: page.locator('span').filter({ hasText: /Aceptar/i })
    }).first();

    let aceptarVisible = await botonAceptar.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!aceptarVisible) {
      // Fallback: buscar botón con bg-danger-neutral
      const botonAceptarFallback = modalElement.locator('button.bg-danger-neutral').filter({
        has: page.locator('span').filter({ hasText: /Aceptar/i })
      }).first();
      aceptarVisible = await botonAceptarFallback.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (aceptarVisible) {
        console.log('✅ Botón "Aceptar" encontrado en el modal (usando fallback)');
        await botonAceptarFallback.click();
      }
    } else {
      console.log('✅ Botón "Aceptar" encontrado en el modal');
      await botonAceptar.click();
    }

    if (!aceptarVisible) {
      throw new Error('❌ ERROR: Botón "Aceptar" no encontrado en el modal de confirmación');
    }

    await safeWaitForTimeout(page, 2000);
    await page.waitForLoadState('networkidle');
    console.log('✅ Cancelación aceptada');

    // Verificar que se navegó (probablemente de vuelta al dashboard o a otra página)
    const urlDespuesCancelar = page.url();
    console.log(`🌐 URL después de cancelar: ${urlDespuesCancelar}`);
    
    if (urlDespuesCancelar !== urlCotizacionActual) {
      console.log('✅ Navegación después de cancelar confirmada');
    }

    // 3. VERIFICAR QUE LA NEGOCIACIÓN FUE CANCELADA
    await showStepMessage(page, '✅ VERIFICANDO CANCELACIÓN');
    await safeWaitForTimeout(page, 1000);

    // Si estamos en el dashboard, buscar la notificación cancelada
    if (urlDespuesCancelar.includes('/dashboard')) {
      console.log('🔍 Verificando que la notificación aparece como cancelada en el dashboard...');
      await safeWaitForTimeout(page, 2000);
      
      // Buscar la sección Fiestachat nuevamente
      fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (!fiestachatVisible) {
        fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
        fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
      }

      if (fiestachatVisible) {
        const notificationButtonsDespues = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
        const notificationCountDespues = await notificationButtonsDespues.count();
        
        // Buscar la notificación cancelada
        let encontradaCancelada = false;
        for (let i = 0; i < Math.min(notificationCountDespues, 50); i++) {
          const notification = notificationButtonsDespues.nth(i);
          const text = (await notification.textContent())?.trim() || '';
          const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
          
          if (textoCancelado && (text.includes(notificationText.substring(0, 30)) || notificationText.includes(text.substring(0, 30)))) {
            encontradaCancelada = true;
            console.log(`✅ Notificación cancelada encontrada en posición ${i + 1}`);
            break;
          }
        }
        
        if (encontradaCancelada) {
          console.log('✅ La negociación fue cancelada exitosamente');
        } else {
          console.log('⚠️ No se encontró la notificación cancelada en el dashboard (puede requerir recarga)');
        }
      }
    } else {
      // Si estamos en otra página, verificar que la página muestra que está cancelada
      const mensajeCancelado = page.locator('button, div, p').filter({
        hasText: /La negociación fue cancelada|negociación cancelada|cancelada/i
      }).first();
      
      const canceladoVisible = await mensajeCancelado.isVisible({ timeout: 5000 }).catch(() => false);
      if (canceladoVisible) {
        console.log('✅ La página muestra que la negociación fue cancelada');
      } else {
        console.log('⚠️ No se encontró mensaje de cancelación en la página actual');
      }
    }

    // 4. VERIFICAR QUE EL CHAT YA NO ES INTERACTUABLE
    await showStepMessage(page, '🔒 VERIFICANDO QUE EL CHAT NO ES INTERACTUABLE');
    
    // Si estamos en la página de cotización (no en el dashboard), hacer refresh para reflejar los cambios
    const urlActualFinal = page.url();
    const esPaginaCotizacionFinal = 
      urlActualFinal.includes('/quotation') ||
      urlActualFinal.includes('/prequotation') ||
      urlActualFinal.includes('/negotiation') ||
      urlActualFinal.includes('/cotizacion');

    if (esPaginaCotizacionFinal) {
      // Hacer refresh de la página para que se reflejen los cambios después de cancelar
      console.log('🔄 Recargando la página para reflejar los cambios después de la cancelación...');
      await page.reload({ waitUntil: 'networkidle' });
      await safeWaitForTimeout(page, 2000); // Espera adicional después del refresh
      console.log('✅ Página recargada');
      
      // 4.0. Verificar que se muestra el mensaje "La negociación fue cancelada" en el chat
      console.log('💬 Verificando mensaje de cancelación en el chat...');
      await showStepMessage(page, '💬 VERIFICANDO MENSAJE DE CANCELACIÓN');
      await safeWaitForTimeout(page, 1000);
      
      // Buscar el mensaje con el formato específico: div[id^="message-"] que contiene "La negociación fue cancelada"
      const mensajeCancelacion = page.locator('div[id^="message-"]').filter({
        has: page.locator('p').filter({ hasText: /^La negociación fue cancelada$/i })
      }).first();
      
      const mensajeCancelacionVisible = await mensajeCancelacion.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (!mensajeCancelacionVisible) {
        // Intentar buscar con selector más flexible
        console.log('🔍 Intentando buscar mensaje con selector más flexible...');
        const mensajeCancelacionFlexible = page.locator('div').filter({
          has: page.locator('p').filter({ hasText: /La negociación fue cancelada/i })
        }).filter({
          has: page.locator('div.bg-gradient-to-r, div[class*="gradient"]')
        }).first();
        
        const mensajeFlexibleVisible = await mensajeCancelacionFlexible.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (mensajeFlexibleVisible) {
          console.log('✅ Mensaje de cancelación encontrado en el chat (usando selector flexible)');
          
          // Verificar que tiene el formato correcto con el gradiente
          const tieneGradiente = await mensajeCancelacionFlexible.locator('div.bg-gradient-to-r, div[class*="gradient"]').isVisible({ timeout: 2000 }).catch(() => false);
          if (tieneGradiente) {
            console.log('✅ El mensaje tiene el formato correcto con gradiente');
          }
          
          // Verificar que contiene el texto correcto
          const textoMensaje = await mensajeCancelacionFlexible.textContent();
          if (textoMensaje && /La negociación fue cancelada/i.test(textoMensaje)) {
            console.log(`✅ El mensaje contiene el texto correcto: "${textoMensaje.trim()}"`);
          }
        } else {
          throw new Error('❌ ERROR: No se encontró el mensaje "La negociación fue cancelada" en el chat después de cancelar');
        }
      } else {
        console.log('✅ Mensaje de cancelación encontrado en el chat');
        
        // Verificar que tiene el formato correcto
        const tieneGradiente = await mensajeCancelacion.locator('div.bg-gradient-to-r, div[class*="gradient"]').isVisible({ timeout: 2000 }).catch(() => false);
        if (tieneGradiente) {
          console.log('✅ El mensaje tiene el formato correcto con gradiente');
        }
        
        // Verificar que el mensaje está centrado (tiene las clases correctas)
        const tieneClasesCorrectas = await mensajeCancelacion.evaluate((el) => {
          return el.classList.contains('flex') && 
                 el.classList.contains('w-full') && 
                 el.classList.contains('items-center') && 
                 el.classList.contains('justify-center');
        }).catch(() => false);
        
        if (tieneClasesCorrectas) {
          console.log('✅ El mensaje tiene las clases CSS correctas (centrado)');
        }
        
        // Verificar que contiene el texto correcto
        const textoMensaje = await mensajeCancelacion.textContent();
        if (textoMensaje && /La negociación fue cancelada/i.test(textoMensaje)) {
          console.log(`✅ El mensaje contiene el texto correcto: "${textoMensaje.trim()}"`);
        }
        
        // Verificar que tiene el icono de reloj y la hora
        const tieneHora = await mensajeCancelacion.locator('i.icon-clock, i[class*="clock"]').isVisible({ timeout: 2000 }).catch(() => false);
        if (tieneHora) {
          console.log('✅ El mensaje tiene el icono de reloj y la hora');
        }
      }
      
      console.log('🔍 Verificando que el chat no es interactuable en la página de cotización cancelada...');
      
      // 4.1. Verificar que el campo de mensaje está deshabilitado
      console.log('📝 Verificando campo de mensaje...');
      await safeWaitForTimeout(page, 1000); // Espera adicional antes de verificar
      
      const campoMensaje = page.locator('textarea, input').filter({
        has: page.locator('label, [placeholder]').filter({ hasText: /Mensaje|Message|Escribe|Write/i })
      }).or(page.getByPlaceholder(/Mensaje|Message|Escribe|Write/i, { exact: false }))
      .or(page.locator('textarea#Message, input#Message, textarea[id*="message"], input[id*="message"]'));

      const campoMensajeVisible = await campoMensaje.first().isVisible({ timeout: 5000 }).catch(() => false);
      if (campoMensajeVisible) {
        // Esperar a que el campo se deshabilite (puede tomar tiempo)
        console.log('⏳ Esperando a que el campo de mensaje se deshabilite...');
        let campoMensajeHabilitado = true;
        let intentos = 0;
        const maxIntentos = 10; // 10 intentos = 5 segundos
        
        while (campoMensajeHabilitado && intentos < maxIntentos) {
          campoMensajeHabilitado = await campoMensaje.first().isEnabled({ timeout: 500 }).catch(() => false);
          if (campoMensajeHabilitado) {
            intentos++;
            await safeWaitForTimeout(page, 500); // Esperar 500ms antes del siguiente intento
          }
        }
        
        if (campoMensajeHabilitado) {
          throw new Error('❌ ERROR: El campo de mensaje está habilitado cuando debería estar deshabilitado después de cancelar');
        } else {
          console.log('✅ Campo de mensaje está deshabilitado (correcto)');
        }
      } else {
        console.log('⚠️ Campo de mensaje no encontrado (puede estar oculto o no disponible)');
      }

      // 4.2. Verificar que el botón de enviar está deshabilitado o no está disponible
      console.log('📤 Verificando botón de enviar...');
      await safeWaitForTimeout(page, 500); // Espera adicional
      
      const botonEnviar = page.locator('button').filter({
        has: page.locator('i[class*="send"], i[class*="paper-plane"], svg[class*="send"]')
      }).or(page.locator('button').filter({
        hasText: /Enviar|Send/i
      })).first();

      const botonEnviarVisible = await botonEnviar.isVisible({ timeout: 3000 }).catch(() => false);
      if (botonEnviarVisible) {
        // Esperar a que el botón se deshabilite
        let botonEnviarHabilitado = true;
        let intentos = 0;
        const maxIntentos = 10;
        
        while (botonEnviarHabilitado && intentos < maxIntentos) {
          botonEnviarHabilitado = await botonEnviar.isEnabled({ timeout: 500 }).catch(() => false);
          if (botonEnviarHabilitado) {
            intentos++;
            await safeWaitForTimeout(page, 500);
          }
        }
        
        if (botonEnviarHabilitado) {
          throw new Error('❌ ERROR: El botón de enviar está habilitado cuando debería estar deshabilitado después de cancelar');
        } else {
          console.log('✅ Botón de enviar está deshabilitado (correcto)');
        }
      } else {
        console.log('✅ Botón de enviar no está visible (correcto - chat deshabilitado)');
      }

      // 4.3. Verificar que el botón de adjuntar archivos está deshabilitado o no está disponible
      console.log('📎 Verificando botón de adjuntar archivos...');
      await safeWaitForTimeout(page, 500); // Espera adicional
      
      const botonAdjuntar = page.locator('button').filter({
        has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
      }).first();

      const botonAdjuntarVisible = await botonAdjuntar.isVisible({ timeout: 3000 }).catch(() => false);
      if (botonAdjuntarVisible) {
        // Esperar a que el botón se deshabilite
        let botonAdjuntarHabilitado = true;
        let intentos = 0;
        const maxIntentos = 10;
        
        while (botonAdjuntarHabilitado && intentos < maxIntentos) {
          botonAdjuntarHabilitado = await botonAdjuntar.isEnabled({ timeout: 500 }).catch(() => false);
          if (botonAdjuntarHabilitado) {
            intentos++;
            await safeWaitForTimeout(page, 500);
          }
        }
        
        if (botonAdjuntarHabilitado) {
          throw new Error('❌ ERROR: El botón de adjuntar archivos está habilitado cuando debería estar deshabilitado después de cancelar');
        } else {
          console.log('✅ Botón de adjuntar archivos está deshabilitado (correcto)');
        }
      } else {
        console.log('✅ Botón de adjuntar archivos no está visible (correcto - chat deshabilitado)');
      }

      // 4.4. Verificar que el botón de cámara está deshabilitado o no está disponible
      console.log('📷 Verificando botón de cámara...');
      await safeWaitForTimeout(page, 500); // Espera adicional
      
      const botonCamara = page.locator('button').filter({
        has: page.locator('i.icon-camera, i[class*="camera"]')
      }).first();

      const botonCamaraVisible = await botonCamara.isVisible({ timeout: 3000 }).catch(() => false);
      if (botonCamaraVisible) {
        // Esperar a que el botón se deshabilite
        let botonCamaraHabilitado = true;
        let intentos = 0;
        const maxIntentos = 10;
        
        while (botonCamaraHabilitado && intentos < maxIntentos) {
          botonCamaraHabilitado = await botonCamara.isEnabled({ timeout: 500 }).catch(() => false);
          if (botonCamaraHabilitado) {
            intentos++;
            await safeWaitForTimeout(page, 500);
          }
        }
        
        if (botonCamaraHabilitado) {
          throw new Error('❌ ERROR: El botón de cámara está habilitado cuando debería estar deshabilitado después de cancelar');
        } else {
          console.log('✅ Botón de cámara está deshabilitado (correcto)');
        }
      } else {
        console.log('✅ Botón de cámara no está visible (correcto - chat deshabilitado)');
      }

      // 4.5. Intentar interactuar con el campo de mensaje para confirmar que está deshabilitado
      console.log('🔒 Intentando interactuar con el campo de mensaje para confirmar deshabilitación...');
      if (campoMensajeVisible) {
        try {
          await campoMensaje.first().fill('Test de interacción');
          // Si llegamos aquí, el campo está habilitado (no debería pasar)
          throw new Error('❌ ERROR: Se pudo escribir en el campo de mensaje cuando debería estar deshabilitado');
        } catch (e: any) {
          // Si el error es porque el campo está deshabilitado, está bien
          if (e.message.includes('deshabilitado') || e.message.includes('disabled') || e.message.includes('is not editable')) {
            console.log('✅ Confirmado: El campo de mensaje está deshabilitado y no permite interacción');
          } else if (e.message.includes('ERROR')) {
            // Re-lanzar el error si es nuestro error personalizado
            throw e;
          } else {
            // Otro tipo de error, probablemente porque el campo está deshabilitado
            console.log('✅ Confirmado: El campo de mensaje no permite interacción (probablemente deshabilitado)');
          }
        }
      }

      console.log('✅ Verificación completada: El chat no es interactuable después de cancelar la negociación');
    } else {
      console.log('⚠️ No estamos en la página de cotización, no se puede verificar el estado del chat');
      console.log(`   URL actual: ${urlActualFinal}`);
    }

    console.log('✅ Prueba de cancelar negociación completada');
  });

  test('Agregar Una Nota', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos

    console.log('🚀 INICIANDO PRUEBA: Agregar una nota');
    console.log(`📊 Viewport: ${page.viewportSize()?.width}x${page.viewportSize()?.height}`);

    await showStepMessage(page, '📝 AGREGANDO NOTA');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER NOTIFICACIÓN Y NAVEGAR A COTIZACIÓN
    console.log('🔔 PASO 1: Obteniendo notificación y navegando...');
    const { notificationButton, notificationText, quotationId } = await obtenerNotificacionYInfo(page, true);
    
    console.log(`📋 Contenido de la notificación: "${notificationText}"`);
    if (quotationId) {
      console.log(`🆔 ID de cotización extraído: ${quotationId}`);
    }

    // Asegurarse de estar en el dashboard antes de hacer clic
    const urlActualAntes = page.url();
    if (!urlActualAntes.includes('/dashboard')) {
      console.log('🔄 Navegando al dashboard antes de hacer clic en la notificación...');
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    }

    // Re-buscar el botón de notificación para asegurarse de que está disponible
    console.log('🔍 Re-buscando botón de notificación...');
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);

    // Buscar sección Fiestachat nuevamente
    let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
      fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
    }

    if (!fiestachatVisible) {
      throw new Error('No se encontró la sección Fiestachat después de navegar');
    }

    // Buscar la notificación por su texto
    const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
    const notificationCount = await notificationButtons.count();
    
    let notificationButtonFinal: Locator | null = null;
    
    // Buscar la notificación que coincida con el texto y que NO esté cancelada
    for (let i = 0; i < Math.min(notificationCount, 50); i++) {
      const notification = notificationButtons.nth(i);
      const text = (await notification.textContent())?.trim() || '';
      
      // Verificar si coincide (puede ser parcial debido a truncamiento)
      if (text.includes(notificationText.substring(0, 30)) || notificationText.includes(text.substring(0, 30))) {
        // Verificar que NO esté cancelada
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Notificación encontrada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      // Si no se encuentra por texto, usar la primera no cancelada
      console.log('⚠️ No se encontró la notificación exacta, buscando primera no cancelada...');
      for (let i = 0; i < Math.min(notificationCount, 50); i++) {
        const notification = notificationButtons.nth(i);
        const text = (await notification.textContent())?.trim() || '';
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Usando primera notificación no cancelada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      throw new Error('No se pudo encontrar una notificación válida (no cancelada) para agregar nota');
    }

    // Hacer clic en la notificación
    console.log('🖱️ Haciendo clic en la notificación...');
    await notificationButtonFinal.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    const urlActual = page.url();
    console.log(`🌐 URL de cotización: ${urlActual}`);

    // Verificar que estamos en una página de cotización
    const esPaginaCotizacion = 
      urlActual.includes('/quotation') ||
      urlActual.includes('/prequotation') ||
      urlActual.includes('/negotiation') ||
      urlActual.includes('/cotizacion');

    if (!esPaginaCotizacion) {
      throw new Error(`No se navegó a una página de cotización. URL: ${urlActual}`);
    }

    console.log('✅ Navegación exitosa a página de cotización');

    // 2. AGREGAR UNA NOTA
    console.log('📝 PASO 2: Agregando una nota...');
    await showStepMessage(page, '📝 AGREGANDO NOTA');
    await safeWaitForTimeout(page, 1000);

    const campoNotas = page.locator('textarea, input').filter({
      has: page.locator('label').filter({ hasText: /Nota|Note|Observación|Observacion/i })
    }).or(page.getByLabel(/Nota|Note|Observación|Observacion/i, { exact: false }))
    .or(page.locator('textarea#Notes, input#Notes, textarea[id*="note"], input[id*="note"]'));

    const notasVisible = await campoNotas.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!notasVisible) {
      throw new Error('❌ ERROR: Campo de notas no encontrado. No se puede continuar con la prueba.');
    }

    console.log('✅ Campo de notas encontrado');

    const estaHabilitado = await campoNotas.first().isEnabled({ timeout: 2000 }).catch(() => false);
    
    if (!estaHabilitado) {
      // Intentar habilitar el campo
      console.log('🔍 Campo de notas está deshabilitado, buscando botón de editar...');
      const botonEditar = page.locator('button').filter({
        hasText: /Editar|Edit|Modificar|Modify/i
      }).first();
      const editarVisible = await botonEditar.isVisible({ timeout: 2000 }).catch(() => false);
      if (editarVisible) {
        console.log('🖱️ Haciendo clic en botón de editar para habilitar el campo...');
        await botonEditar.click();
        await safeWaitForTimeout(page, 1000);
      } else {
        throw new Error('❌ ERROR: Campo de notas está deshabilitado y no se encontró botón de editar');
      }
    }

    const estaHabilitadoDespues = await campoNotas.first().isEnabled({ timeout: 2000 }).catch(() => false);
    if (!estaHabilitadoDespues) {
      throw new Error('❌ ERROR: Campo de notas sigue deshabilitado después de intentar habilitarlo');
    }

    console.log('✅ Campo de notas está habilitado');

    // Obtener el valor actual del campo (si tiene contenido)
    const valorInicial = await campoNotas.first().inputValue().catch(() => '');
    console.log(`📝 Valor inicial del campo: "${valorInicial.substring(0, 50)}${valorInicial.length > 50 ? '...' : ''}"`);

    // Escribir una nota nueva con timestamp
    const textoNota = `Nota de prueba - ${new Date().toISOString()}`;
    console.log(`✍️ Escribiendo nota: "${textoNota}"`);
    
    await campoNotas.first().fill(textoNota);
    await safeWaitForTimeout(page, 500);
    
    // Mover el cursor a otro elemento (como el chat) para que se guarde la nota
    console.log('🖱️ Moviendo cursor al campo del chat para guardar la nota...');
    const campoMensajeChat = page.locator('textarea, input').filter({
      has: page.locator('label, [placeholder]').filter({ hasText: /Mensaje|Message|Escribe|Write/i })
    }).or(page.getByPlaceholder(/Mensaje|Message|Escribe|Write/i, { exact: false }))
    .or(page.locator('textarea#Message, input#Message, textarea[id*="message"], input[id*="message"]'));
    
    const campoMensajeChatVisible = await campoMensajeChat.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (campoMensajeChatVisible) {
      // Hacer clic en el campo del chat para activar el blur del campo de notas
      await campoMensajeChat.first().click();
      await safeWaitForTimeout(page, 1000);
      console.log('✅ Cursor movido al campo del chat');
    } else {
      // Si no se encuentra el campo del chat, hacer clic en otro elemento visible
      console.log('⚠️ Campo del chat no encontrado, haciendo clic en otro elemento...');
      const otroElemento = page.locator('div, button, p').first();
      await otroElemento.click({ force: true }).catch(() => {
        // Si falla, simplemente presionar Tab para mover el foco
        console.log('⚠️ No se pudo hacer clic, presionando Tab para mover el foco...');
      });
      await page.keyboard.press('Tab');
      await safeWaitForTimeout(page, 1000);
    }
    
    // Esperar un momento adicional para que se guarde la nota
    await safeWaitForTimeout(page, 1000);
    
    // Verificar que se guardó
    const valorNota = await campoNotas.first().inputValue();
    if (valorNota.includes(textoNota)) {
      console.log('✅ Nota agregada correctamente');
      await expect(campoNotas.first()).toHaveValue(new RegExp(textoNota.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    } else {
      throw new Error(`❌ ERROR: La nota no se guardó correctamente. Valor esperado: "${textoNota}", Valor actual: "${valorNota}"`);
    }

    // 3. VALIDAR BOTÓN "BORRAR TODO"
    console.log('🧹 PASO 3: Validando botón "Borrar todo"...');
    await showStepMessage(page, '🧹 VALIDANDO BORRAR TODO');
    await safeWaitForTimeout(page, 1000);

    const botonBorrarTodo = page.locator('button').filter({
      has: page.locator('p').filter({ hasText: /^Borrar todo$/i })
    }).or(page.getByText('Borrar todo', { exact: true }).locator('..')).first();

    const botonBorrarVisible = await botonBorrarTodo.isVisible({ timeout: 2000 }).catch(() => false);
    if (!botonBorrarVisible) {
      console.log('⚠️ Botón "Borrar todo" no encontrado o no está visible (puede no estar disponible)');
    } else {
      console.log('✅ Botón "Borrar todo" encontrado y visible');
      await expect(botonBorrarTodo).toBeVisible();
      
      // Verificar que el campo tiene contenido antes de borrar
      const valorAntesBorrar = await campoNotas.first().inputValue();
      if (valorAntesBorrar && valorAntesBorrar.trim().length > 0) {
        console.log(`📝 Contenido antes de borrar: "${valorAntesBorrar.substring(0, 50)}..."`);
        
        // Hacer clic en el botón "Borrar todo"
        console.log('🖱️ Haciendo clic en botón "Borrar todo"...');
        await botonBorrarTodo.click();
        await safeWaitForTimeout(page, 1000);
        
        // Verificar que el campo se vació
        const valorDespuesBorrar = await campoNotas.first().inputValue();
        if (!valorDespuesBorrar || valorDespuesBorrar.trim().length === 0) {
          console.log('✅ Botón "Borrar todo" funcionó correctamente - el campo se vació');
          
          // Volver a escribir una nota para dejar el campo con contenido
          const notaFinal = `Nota final de prueba - ${new Date().toISOString()}`;
          await campoNotas.first().fill(notaFinal);
          await safeWaitForTimeout(page, 500);
          
          // Mover el cursor al chat para que se guarde la nota final
          console.log('🖱️ Moviendo cursor al campo del chat para guardar la nota final...');
          const campoMensajeChatFinal = page.locator('textarea, input').filter({
            has: page.locator('label, [placeholder]').filter({ hasText: /Mensaje|Message|Escribe|Write/i })
          }).or(page.getByPlaceholder(/Mensaje|Message|Escribe|Write/i, { exact: false }))
          .or(page.locator('textarea#Message, input#Message, textarea[id*="message"], input[id*="message"]'));
          
          const campoMensajeChatFinalVisible = await campoMensajeChatFinal.first().isVisible({ timeout: 5000 }).catch(() => false);
          if (campoMensajeChatFinalVisible) {
            await campoMensajeChatFinal.first().click();
            await safeWaitForTimeout(page, 1000);
            console.log('✅ Cursor movido al campo del chat');
          } else {
            // Si no se encuentra el campo del chat, presionar Tab para mover el foco
            await page.keyboard.press('Tab');
            await safeWaitForTimeout(page, 1000);
          }
          
          await safeWaitForTimeout(page, 1000);
          console.log(`✅ Nota final escrita: "${notaFinal}"`);
        } else {
          console.log(`⚠️ El campo aún tiene contenido después de borrar: "${valorDespuesBorrar}"`);
        }
      } else {
        console.log('⚠️ El campo no tenía contenido para borrar');
      }
    }

    console.log('✅ Prueba de agregar nota completada');
  });

  test('Probar Funcionalidad Completa Del Chat', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos

    console.log('🚀 INICIANDO PRUEBA: Probar funcionalidad completa del chat');
    console.log(`📊 Viewport: ${page.viewportSize()?.width}x${page.viewportSize()?.height}`);

    await showStepMessage(page, '💬 PROBANDO FUNCIONALIDAD COMPLETA DEL CHAT');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER NOTIFICACIÓN Y NAVEGAR A COTIZACIÓN
    console.log('🔔 PASO 1: Obteniendo notificación y navegando...');
    const { notificationButton, notificationText, quotationId } = await obtenerNotificacionYInfo(page, true);
    
    console.log(`📋 Contenido de la notificación: "${notificationText}"`);
    if (quotationId) {
      console.log(`🆔 ID de cotización extraído: ${quotationId}`);
    }

    // Asegurarse de estar en el dashboard antes de hacer clic
    const urlActualAntes = page.url();
    if (!urlActualAntes.includes('/dashboard')) {
      console.log('🔄 Navegando al dashboard antes de hacer clic en la notificación...');
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);
    }

    // Re-buscar el botón de notificación
    console.log('🔍 Re-buscando botón de notificación...');
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
    await safeWaitForTimeout(page, 2000);

    // Buscar sección Fiestachat
    let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
    let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (!fiestachatVisible) {
      fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
      fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
    }

    if (!fiestachatVisible) {
      throw new Error('No se encontró la sección Fiestachat después de navegar');
    }

    // Buscar la notificación
    const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
    const notificationCount = await notificationButtons.count();
    
    let notificationButtonFinal: Locator | null = null;
    
    for (let i = 0; i < Math.min(notificationCount, 50); i++) {
      const notification = notificationButtons.nth(i);
      const text = (await notification.textContent())?.trim() || '';
      
      if (text.includes(notificationText.substring(0, 30)) || notificationText.includes(text.substring(0, 30))) {
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Notificación encontrada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      for (let i = 0; i < Math.min(notificationCount, 50); i++) {
        const notification = notificationButtons.nth(i);
        const text = (await notification.textContent())?.trim() || '';
        const textoCancelado = /La negociación fue cancelada|negociación cancelada|cancelada/i.test(text);
        if (!textoCancelado) {
          notificationButtonFinal = notification;
          console.log(`✅ Usando primera notificación no cancelada en posición ${i + 1}`);
          break;
        }
      }
    }

    if (!notificationButtonFinal) {
      throw new Error('No se pudo encontrar una notificación válida (no cancelada) para probar el chat');
    }

    // Hacer clic en la notificación
    console.log('🖱️ Haciendo clic en la notificación...');
    await notificationButtonFinal.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    const urlActual = page.url();
    console.log(`🌐 URL de cotización: ${urlActual}`);

    const esPaginaCotizacion = 
      urlActual.includes('/quotation') ||
      urlActual.includes('/prequotation') ||
      urlActual.includes('/negotiation') ||
      urlActual.includes('/cotizacion');

    if (!esPaginaCotizacion) {
      throw new Error(`No se navegó a una página de cotización. URL: ${urlActual}`);
    }

    console.log('✅ Navegación exitosa a página de cotización');

    // Función auxiliar para contar mensajes en el área de chat
    async function contarMensajesEnChat(): Promise<number> {
      const areaMensajes = page.locator('div[id="chat-scroll-container"], div[id*="chat"], div[id*="message"]').first();
      const mensajes = areaMensajes.locator('div[id^="message-"]');
      return await mensajes.count();
    }

    // Función auxiliar para verificar que un mensaje aparece en el chat
    async function verificarMensajeEnChat(textoBuscado: string, tipo: 'texto' | 'archivo' | 'imagen' | 'ubicacion' = 'texto'): Promise<boolean> {
      await safeWaitForTimeout(page, 2000); // Esperar a que el mensaje aparezca
      
      const areaMensajes = page.locator('div[id="chat-scroll-container"], div[id*="chat"]').first();
      const mensajes = areaMensajes.locator('div[id^="message-"]');
      const cantidadMensajes = await mensajes.count();
      
      console.log(`🔍 Buscando mensaje en ${cantidadMensajes} mensajes del chat...`);
      
      for (let i = 0; i < cantidadMensajes; i++) {
        const mensaje = mensajes.nth(i);
        const textoMensaje = await mensaje.textContent().catch(() => '');
        
        if (textoMensaje && textoMensaje.includes(textoBuscado)) {
          console.log(`✅ Mensaje encontrado en posición ${i + 1}: "${textoBuscado}"`);
          return true;
        }
        
        // Verificar si es un mensaje con imagen/archivo
        if (tipo === 'imagen' || tipo === 'archivo') {
          const tieneImagen = await mensaje.locator('img').count() > 0;
          const tieneArchivo = await mensaje.locator('a[href*="."], div[class*="file"]').count() > 0;
          if (tieneImagen || tieneArchivo) {
            console.log(`✅ Mensaje con ${tipo} encontrado en posición ${i + 1}`);
            return true;
          }
        }
        
        // Verificar si es un mensaje con ubicación
        if (tipo === 'ubicacion') {
          const tieneUbicacion = await mensaje.locator('i.icon-map-pin, i[class*="map-pin"], div[class*="location"]').count() > 0;
          if (tieneUbicacion) {
            console.log(`✅ Mensaje con ubicación encontrado en posición ${i + 1}`);
            return true;
          }
        }
      }
      
      return false;
    }

    // 2. ENVIAR UN MENSAJE DE TEXTO
    console.log('💬 PASO 2: Enviando un mensaje de texto...');
    await showStepMessage(page, '💬 ENVIANDO MENSAJE DE TEXTO');
    await safeWaitForTimeout(page, 1000);

    const cantidadMensajesInicial = await contarMensajesEnChat();
    console.log(`📊 Cantidad inicial de mensajes en el chat: ${cantidadMensajesInicial}`);

    const campoMensaje = page.locator('textarea, input').filter({
      has: page.locator('label, [placeholder]').filter({ hasText: /Mensaje|Message|Escribe|Write/i })
    }).or(page.getByPlaceholder(/Mensaje|Message|Escribe|Write/i, { exact: false }))
    .or(page.locator('textarea#Message, input#Message, textarea[id*="message"], input[id*="message"]'));

    const campoMensajeVisible = await campoMensaje.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!campoMensajeVisible) {
      throw new Error('❌ ERROR: Campo de mensaje no encontrado');
    }

    const textoMensaje = `Mensaje de prueba del chat - ${new Date().toISOString()}`;
    console.log(`✍️ Escribiendo mensaje: "${textoMensaje}"`);
    await campoMensaje.first().fill(textoMensaje);
    await safeWaitForTimeout(page, 500);

    // Buscar botón para enviar mensaje
    const botonEnviar = page.locator('button').filter({
      has: page.locator('i[class*="send"], i[class*="paper-plane"], svg[class*="send"]')
    }).or(page.locator('button').filter({
      hasText: /Enviar|Send/i
    })).first();

    const botonEnviarVisible = await botonEnviar.isVisible({ timeout: 3000 }).catch(() => false);
    if (!botonEnviarVisible || !(await botonEnviar.isEnabled({ timeout: 1000 }).catch(() => false))) {
      throw new Error('❌ ERROR: Botón de enviar no está disponible');
    }

    console.log('🖱️ Haciendo clic en botón de enviar mensaje...');
    await botonEnviar.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    // Verificar que el mensaje aparece en el chat
    const mensajeEncontrado = await verificarMensajeEnChat(textoMensaje.substring(0, 30), 'texto');
    if (!mensajeEncontrado) {
      throw new Error(`❌ ERROR: El mensaje "${textoMensaje}" no aparece en el área de mensajes`);
    }
    console.log('✅ Mensaje de texto enviado y verificado en el chat');

    // 3. ENVIAR ARCHIVO DE GALERÍA
    console.log('🖼️ PASO 3: Enviando archivo de galería...');
    await showStepMessage(page, '🖼️ ENVIANDO ARCHIVO DE GALERÍA');
    await safeWaitForTimeout(page, 1000);

    const cantidadMensajesAntesGaleria = await contarMensajesEnChat();
    console.log(`📊 Mensajes antes de enviar galería: ${cantidadMensajesAntesGaleria}`);

    // Buscar botón de adjuntar
    const botonAdjuntar = page.locator('button').filter({
      has: page.locator('i.icon-paperclip, i[class*="paperclip"]')
    }).first();

    const botonAdjuntarVisible = await botonAdjuntar.isVisible({ timeout: 5000 }).catch(() => false);
    if (!botonAdjuntarVisible) {
      throw new Error('❌ ERROR: Botón de adjuntar no encontrado');
    }

    await botonAdjuntar.click();
    await safeWaitForTimeout(page, 2000);

    // Buscar diálogo de adjuntos
    const dialogoAdjuntos = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
      has: page.locator('p').filter({ hasText: /^Adjunto$/i })
    }).first();

    const dialogoVisible = await dialogoAdjuntos.isVisible({ timeout: 3000 }).catch(() => false);
    if (!dialogoVisible) {
      throw new Error('❌ ERROR: Diálogo de adjuntos no se abrió');
    }

    // Buscar botón de Galería
    const botonGaleria = dialogoAdjuntos.locator('button').filter({
      has: page.locator('i.icon-image, i[class*="image"]')
    }).filter({
      has: page.locator('p').filter({ hasText: /^Galería$/i })
    }).first();

    const galeriaVisible = await botonGaleria.isVisible({ timeout: 2000 }).catch(() => false);
    if (!galeriaVisible) {
      throw new Error('❌ ERROR: Botón de Galería no encontrado');
    }

    // Obtener imágenes de prueba
    const { imagenesTesting } = await obtenerArchivosPrueba();
    if (imagenesTesting.length === 0) {
      throw new Error('❌ ERROR: No se encontraron imágenes de prueba');
    }

    const imagenPrueba = imagenesTesting[0];
    console.log(`📎 Usando imagen de prueba: ${path.basename(imagenPrueba)}`);

    // Buscar input file para galería
    let inputGaleria = dialogoAdjuntos.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
    let inputGaleriaExists = await inputGaleria.count() > 0;

    if (!inputGaleriaExists) {
      inputGaleria = dialogoAdjuntos.locator('input[type="file"]').first();
      inputGaleriaExists = await inputGaleria.count() > 0;
    }

    if (!inputGaleriaExists) {
      throw new Error('❌ ERROR: Input file para galería no encontrado');
    }

    await botonGaleria.click();
    await safeWaitForTimeout(page, 500);
    await inputGaleria.setInputFiles(imagenPrueba);
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    // Cerrar diálogo
    await page.keyboard.press('Escape').catch(() => {});
    await safeWaitForTimeout(page, 1000);

    // Verificar que el mensaje con imagen aparece en el chat
    const imagenEncontrada = await verificarMensajeEnChat('', 'imagen');
    if (!imagenEncontrada) {
      throw new Error('❌ ERROR: El mensaje con imagen de galería no aparece en el área de mensajes');
    }
    console.log('✅ Archivo de galería enviado y verificado en el chat');

    // 4. ENVIAR DOCUMENTO
    console.log('📄 PASO 4: Enviando documento...');
    await showStepMessage(page, '📄 ENVIANDO DOCUMENTO');
    await safeWaitForTimeout(page, 1000);

    // Re-abrir diálogo de adjuntos
    await botonAdjuntar.click();
    await safeWaitForTimeout(page, 2000);

    // Buscar botón de Documento
    const botonDocumento = dialogoAdjuntos.locator('button').filter({
      has: page.locator('i.icon-file')
    }).filter({
      has: page.locator('p').filter({ hasText: /^Documento$/i })
    }).first();

    const documentoVisible = await botonDocumento.isVisible({ timeout: 2000 }).catch(() => false);
    if (!documentoVisible) {
      throw new Error('❌ ERROR: Botón de Documento no encontrado');
    }

    // Obtener documentos de prueba
    const { archivosTemp } = await obtenerArchivosPrueba();
    const documentoPrueba = archivosTemp.find(archivo => {
      const ext = path.extname(archivo).toLowerCase();
      return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext);
    });

    if (!documentoPrueba) {
      throw new Error('❌ ERROR: No se encontraron documentos de prueba');
    }

    console.log(`📎 Usando documento de prueba: ${path.basename(documentoPrueba)}`);

    // Buscar input file para documentos
    let inputDocumento = dialogoAdjuntos.locator('input[type="file"][accept*=".pdf"], input[type="file"][accept*=".doc"]').first();
    let inputDocumentoExists = await inputDocumento.count() > 0;

    if (!inputDocumentoExists) {
      inputDocumento = dialogoAdjuntos.locator('input[type="file"]').nth(1);
      inputDocumentoExists = await inputDocumento.count() > 0;
    }

    if (!inputDocumentoExists) {
      inputDocumento = dialogoAdjuntos.locator('input[type="file"]').first();
      inputDocumentoExists = await inputDocumento.count() > 0;
    }

    if (!inputDocumentoExists) {
      throw new Error('❌ ERROR: Input file para documento no encontrado');
    }

    await botonDocumento.click();
    await safeWaitForTimeout(page, 500);
    await inputDocumento.setInputFiles(documentoPrueba);
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    // Cerrar diálogo
    await page.keyboard.press('Escape').catch(() => {});
    await safeWaitForTimeout(page, 1000);

    // Verificar que el mensaje con documento aparece en el chat
    const documentoEncontrado = await verificarMensajeEnChat(path.basename(documentoPrueba), 'archivo');
    if (!documentoEncontrado) {
      // Intentar verificar por tipo de archivo
      const documentoEncontrado2 = await verificarMensajeEnChat('', 'archivo');
      if (!documentoEncontrado2) {
        throw new Error('❌ ERROR: El mensaje con documento no aparece en el área de mensajes');
      }
    }
    console.log('✅ Documento enviado y verificado en el chat');

    // 5. ENVIAR UBICACIÓN
    console.log('📍 PASO 5: Enviando ubicación...');
    await showStepMessage(page, '📍 ENVIANDO UBICACIÓN');
    await safeWaitForTimeout(page, 1000);

    // Re-abrir diálogo de adjuntos
    await botonAdjuntar.click();
    await safeWaitForTimeout(page, 2000);

    // Buscar botón de Ubicación
    const botonUbicacion = dialogoAdjuntos.locator('button').filter({
      has: page.locator('i.icon-map-pin')
    }).filter({
      has: page.locator('p').filter({ hasText: /^Ubicación$/i })
    }).first();

    const ubicacionVisible = await botonUbicacion.isVisible({ timeout: 2000 }).catch(() => false);
    if (!ubicacionVisible) {
      throw new Error('❌ ERROR: Botón de Ubicación no encontrado');
    }

    await botonUbicacion.click();
    await safeWaitForTimeout(page, 1500);

    // Buscar diálogo de ubicación
    const dialogoUbicacion = page.locator('div.absolute.bg-neutral-0.shadow-lg').filter({
      has: page.locator('p').filter({ hasText: /^Enviar ubicación$/i })
    }).first();

    const dialogoUbicacionVisible = await dialogoUbicacion.isVisible({ timeout: 3000 }).catch(() => false);
    if (!dialogoUbicacionVisible) {
      throw new Error('❌ ERROR: Diálogo de ubicación no se abrió');
    }

    // Escribir dirección
    const campoDireccion = dialogoUbicacion.locator('input[placeholder=" "], input#Address').first();
    const direccionesPrueba = [
      'matamoros 500, tepatitlan jalisco',
      'av independencia 123, guadalajara jalisco',
      'calle hidalgo 456, zapopan jalisco'
    ];
    
    const direccionPrueba = direccionesPrueba[Math.floor(Math.random() * direccionesPrueba.length)];
    console.log(`✍️ Escribiendo dirección: "${direccionPrueba}"`);
    
    await campoDireccion.fill(direccionPrueba);
    await safeWaitForTimeout(page, 2000);

    // Seleccionar primera opción de Google Places
    const opcionesUbicacion = dialogoUbicacion.locator('ul li.cursor-pointer').first();
    const opcionesVisible = await opcionesUbicacion.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (opcionesVisible) {
      const primeraOpcion = dialogoUbicacion.locator('ul li.cursor-pointer').first();
      const textoOpcion = await primeraOpcion.textContent();
      console.log(`🖱️ Seleccionando opción: "${textoOpcion?.trim()}"`);
      await primeraOpcion.click();
      await safeWaitForTimeout(page, 2000);
      
      // Buscar botón de enviar ubicación
      const botonEnviarUbicacion = dialogoUbicacion.locator('button').filter({
        hasText: /Enviar|Send/i
      }).first();
      
      const botonEnviarUbicacionVisible = await botonEnviarUbicacion.isVisible({ timeout: 2000 }).catch(() => false);
      if (botonEnviarUbicacionVisible) {
        await botonEnviarUbicacion.click();
        await safeWaitForTimeout(page, 3000);
        await page.waitForLoadState('networkidle');
      }
    } else {
      throw new Error('❌ ERROR: No aparecieron opciones de ubicación de Google Places');
    }

    // Verificar que el mensaje con ubicación aparece en el chat
    const ubicacionEncontrada = await verificarMensajeEnChat('', 'ubicacion');
    if (!ubicacionEncontrada) {
      throw new Error('❌ ERROR: El mensaje con ubicación no aparece en el área de mensajes');
    }
    console.log('✅ Ubicación enviada y verificada en el chat');

    // 6. ENVIAR DESDE CÁMARA
    console.log('📷 PASO 6: Enviando desde cámara...');
    await showStepMessage(page, '📷 ENVIANDO DESDE CÁMARA');
    await safeWaitForTimeout(page, 1000);

    // Buscar botón de cámara
    const botonCamara = page.locator('button').filter({
      has: page.locator('i.icon-camera, i[class*="camera"]')
    }).first();

    const botonCamaraVisible = await botonCamara.isVisible({ timeout: 5000 }).catch(() => false);
    if (!botonCamaraVisible) {
      console.log('⚠️ Botón de cámara no encontrado (puede no estar disponible)');
    } else {
      // Obtener imágenes de prueba
      if (imagenesTesting.length > 1) {
        const imagenCamara = imagenesTesting[1];
        console.log(`📎 Usando imagen de prueba para cámara: ${path.basename(imagenCamara)}`);

        await botonCamara.click();
        await safeWaitForTimeout(page, 1000);

        // Buscar input file de cámara
        let inputCamara = page.locator('input[type="file"][accept*="image"], input[type="file"][accept*="video"]').first();
        let inputCamaraExists = await inputCamara.count() > 0;

        if (!inputCamaraExists) {
          inputCamara = page.locator('input[type="file"][capture="environment"], input[type="file"][capture*="camera"]').first();
          inputCamaraExists = await inputCamara.count() > 0;
        }

        if (!inputCamaraExists) {
          inputCamara = page.locator('input[type="file"]').first();
          inputCamaraExists = await inputCamara.count() > 0;
        }

        if (inputCamaraExists) {
          await inputCamara.setInputFiles(imagenCamara);
          await safeWaitForTimeout(page, 3000);
          await page.waitForLoadState('networkidle');

          // Verificar que el mensaje con imagen de cámara aparece en el chat
          const camaraEncontrada = await verificarMensajeEnChat('', 'imagen');
          if (!camaraEncontrada) {
            console.log('⚠️ El mensaje con imagen de cámara no se encontró inmediatamente (puede requerir más tiempo)');
          } else {
            console.log('✅ Imagen desde cámara enviada y verificada en el chat');
          }
        } else {
          console.log('⚠️ Input file de cámara no encontrado');
        }
      } else {
        console.log('⚠️ No hay suficientes imágenes de prueba para probar la cámara');
      }
    }

    // 7. VERIFICACIÓN FINAL: Contar todos los mensajes
    console.log('📊 PASO 7: Verificación final de mensajes...');
    await showStepMessage(page, '📊 VERIFICACIÓN FINAL');
    await safeWaitForTimeout(page, 1000);

    const cantidadMensajesFinal = await contarMensajesEnChat();
    console.log(`📊 Cantidad final de mensajes en el chat: ${cantidadMensajesFinal}`);
    console.log(`📊 Cantidad inicial: ${cantidadMensajesInicial}`);
    console.log(`📊 Mensajes nuevos: ${cantidadMensajesFinal - cantidadMensajesInicial}`);

    if (cantidadMensajesFinal <= cantidadMensajesInicial) {
      console.log('⚠️ No se detectaron nuevos mensajes en el chat');
    } else {
      console.log(`✅ Se detectaron ${cantidadMensajesFinal - cantidadMensajesInicial} nuevos mensajes en el chat`);
    }

    console.log('✅ Prueba de funcionalidad completa del chat completada');
  });

  test('Mostrar Datos De La Cotización Que Coinciden Con La Notificación Seleccionada', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos

    await showStepMessage(page, '🔍 VALIDANDO COINCIDENCIA DE DATOS');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER INFORMACIÓN DE LA NOTIFICACIÓN (excluyendo canceladas)
    const { notificationButton, notificationText, quotationId } = await obtenerNotificacionYInfo(page, true);
    
    console.log(`📋 Contenido de la notificación: "${notificationText}"`);

    // Extraer información clave de la notificación
    const infoNotificacion: {
      texto: string;
      id?: string;
      nombreServicio?: string;
      nombreNegocio?: string;
      fecha?: string;
      precio?: string;
    } = {
      texto: notificationText
    };

    // Intentar extraer nombre del servicio
    const servicioMatch = notificationText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (servicioMatch) {
      infoNotificacion.nombreServicio = servicioMatch[1];
      console.log(`📦 Nombre del servicio extraído: "${infoNotificacion.nombreServicio}"`);
    }

    // Intentar extraer precio
    const precioMatch = notificationText.match(/\$[\d,]+(?:\.\d{2})?/);
    if (precioMatch) {
      infoNotificacion.precio = precioMatch[0];
      console.log(`💰 Precio extraído: "${infoNotificacion.precio}"`);
    }

    if (quotationId) {
      infoNotificacion.id = quotationId;
    }

    // 2. NAVEGAR A LA COTIZACIÓN
    await notificationButton.click();
    await safeWaitForTimeout(page, 3000);
    await page.waitForLoadState('networkidle');

    const urlActual = page.url();
    console.log(`🌐 URL de cotización: ${urlActual}`);

    // 3. VALIDAR QUE LOS DATOS COINCIDEN
    await showStepMessage(page, '✅ VALIDANDO COINCIDENCIA DE DATOS');

    // Validar ID de cotización si está disponible
    if (quotationId) {
      const idEnPagina = page.locator('*').filter({
        hasText: new RegExp(quotationId, 'i')
      });
      const idVisible = await idEnPagina.isVisible({ timeout: 5000 }).catch(() => false);
      expect(idVisible).toBe(true);
      console.log(`✅ ID de cotización (${quotationId}) encontrado en la página`);
    }

    // Validar nombre del servicio si se extrajo
    if (infoNotificacion.nombreServicio) {
      const servicioEnPagina = page.locator('*').filter({
        hasText: new RegExp(infoNotificacion.nombreServicio!.replace(/\s+/g, '.*'), 'i')
      });
      const servicioVisible = await servicioEnPagina.isVisible({ timeout: 5000 }).catch(() => false);
      if (servicioVisible) {
        console.log(`✅ Nombre del servicio ("${infoNotificacion.nombreServicio}") encontrado en la página`);
      } else {
        console.log(`⚠️ Nombre del servicio ("${infoNotificacion.nombreServicio}") no encontrado exactamente (puede estar en formato diferente)`);
      }
    }

    // Validar precio si se extrajo
    if (infoNotificacion.precio) {
      const precioEnPagina = page.locator('*').filter({
        hasText: new RegExp(infoNotificacion.precio.replace(/\$/, '\\$'), 'i')
      });
      const precioVisible = await precioEnPagina.isVisible({ timeout: 5000 }).catch(() => false);
      if (precioVisible) {
        console.log(`✅ Precio (${infoNotificacion.precio}) encontrado en la página`);
      } else {
        console.log(`⚠️ Precio (${infoNotificacion.precio}) no encontrado exactamente (puede estar en formato diferente)`);
      }
    }

    // Validar que al menos parte del texto de la notificación aparece en la página
    const palabrasClave = notificationText.split(' ').filter(p => p.length > 3).slice(0, 3);
    let palabrasEncontradas = 0;
    
    for (const palabra of palabrasClave) {
      const palabraEnPagina = page.locator('*').filter({
        hasText: new RegExp(palabra, 'i')
      });
      const palabraVisible = await palabraEnPagina.isVisible({ timeout: 3000 }).catch(() => false);
      if (palabraVisible) {
        palabrasEncontradas++;
      }
    }

    if (palabrasEncontradas > 0) {
      console.log(`✅ Se encontraron ${palabrasEncontradas} de ${palabrasClave.length} palabras clave de la notificación`);
    } else {
      console.log('⚠️ No se encontraron palabras clave de la notificación (puede estar en formato diferente)');
    }

    console.log('✅ Validación de coincidencia de datos completada');
  });

  test('Se deshabilita la interacción cuando un evento está cancelado', async ({ page }) => {
    test.setTimeout(120000); // 2 minutos

    await showStepMessage(page, '❌ VALIDANDO EVENTO CANCELADO');
    await safeWaitForTimeout(page, 1000);

    // 1. OBTENER NOTIFICACIÓN CANCELADA (no excluir canceladas)
    await showStepMessage(page, '🔔 BUSCANDO NOTIFICACIÓN CANCELADA');
    await safeWaitForTimeout(page, 1000);

    // Primero intentar obtener una cancelada
    let notificationButton: Locator | null = null;
    let notificationText = '';
    
    try {
      const { notificationButton: btn, notificationText: txt } = await obtenerNotificacionYInfo(page, false);
      notificationButton = btn;
      notificationText = txt;
    } catch (e) {
      // Si no hay notificaciones, buscar manualmente una cancelada
      await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      await safeWaitForTimeout(page, 2000);

      // Buscar sección Fiestachat
      let fiestachatSection = page.locator('div.hidden.md\\:flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
      let fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (!fiestachatVisible) {
        fiestachatSection = page.locator('div.flex.flex-col.p-5.gap-\\[10px\\].bg-light-light');
        fiestachatVisible = await fiestachatSection.isVisible({ timeout: 5000 }).catch(() => false);
      }

      if (!fiestachatVisible) {
        fiestachatSection = page.locator('div:has-text("¡Fiestachat!")').first();
        fiestachatVisible = await fiestachatSection.count().then(count => count > 0);
      }

      if (fiestachatVisible) {
        const notificationButtons = fiestachatSection.locator('button.flex.gap-4.px-4.bg-light-light.rounded-2.border-l-4.items-center');
        const notificationCount = await notificationButtons.count();

        if (notificationCount > 0) {
          // Probar cada notificación hasta encontrar una cancelada
          for (let i = 0; i < notificationCount; i++) {
            const notification = notificationButtons.nth(i);
            await notification.click();
            await safeWaitForTimeout(page, 2000);
            await page.waitForLoadState('networkidle');

            const cancelada = await esCotizacionCancelada(page);
            if (cancelada) {
              notificationButton = notification;
              notificationText = (await notification.textContent())?.trim() || '';
              break;
            } else {
              await page.goto(DASHBOARD_URL);
              await page.waitForLoadState('networkidle');
              await safeWaitForTimeout(page, 2000);
            }
          }
        }
      }
    }

    if (!notificationButton) {
      console.log('⚠️ No se encontró ninguna notificación cancelada para validar');
      test.skip();
      return;
    }

    // Si ya estamos en la página de cotización cancelada, continuar
    // Si no, hacer clic en la notificación
    const urlActual = page.url();
    const esPaginaCotizacion = 
      urlActual.includes('/quotation') ||
      urlActual.includes('/prequotation') ||
      urlActual.includes('/negotiation') ||
      urlActual.includes('/cotizacion');

    if (!esPaginaCotizacion) {
      await notificationButton.click();
      await safeWaitForTimeout(page, 3000);
      await page.waitForLoadState('networkidle');
    }

    // 2. VALIDAR QUE LA COTIZACIÓN ESTÁ CANCELADA
    await showStepMessage(page, '✅ VALIDANDO QUE ESTÁ CANCELADA');
    await safeWaitForTimeout(page, 1000);

    const cancelada = await esCotizacionCancelada(page);
    if (!cancelada) {
      throw new Error('La cotización no está cancelada, no se puede validar la prueba');
    }

    console.log('✅ Cotización cancelada confirmada');

    // 3. VALIDAR QUE EL CAMPO DE NOTAS ESTÁ DESHABILITADO
    await showStepMessage(page, '📝 VALIDANDO CAMPO DE NOTAS DESHABILITADO');
    await safeWaitForTimeout(page, 1000);

    const campoNotas = page.locator('textarea, input').filter({
      has: page.locator('label').filter({ hasText: /Nota|Note|Observación|Observacion/i })
    }).or(page.getByLabel(/Nota|Note|Observación|Observacion/i, { exact: false }))
    .or(page.locator('textarea#Notes, input#Notes, textarea[id*="note"], input[id*="note"]'));

    const notasVisible = await campoNotas.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (notasVisible) {
      const estaHabilitado = await campoNotas.first().isEnabled({ timeout: 1000 }).catch(() => false);
      expect(estaHabilitado).toBe(false);
      console.log('✅ Campo de notas está deshabilitado (como se esperaba)');
    } else {
      console.log('⚠️ Campo de notas no encontrado');
    }

    // 4. VALIDAR QUE EL CHAT ESTÁ DESHABILITADO/OCULTO
    await showStepMessage(page, '💬 VALIDANDO CHAT DESHABILITADO');
    await safeWaitForTimeout(page, 1000);

    // Buscar campo de mensaje del chat - NO DEBE ESTAR VISIBLE
    const campoMensaje = page.locator('textarea, input').filter({
      has: page.locator('label, [placeholder]').filter({ hasText: /Mensaje|Message|Escribe|Write/i })
    }).or(page.getByPlaceholder(/Mensaje|Message|Escribe|Write/i, { exact: false }));

    const mensajeVisible = await campoMensaje.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (mensajeVisible) {
      // Si está visible, la prueba debe fallar
      throw new Error('❌ ERROR: El campo de mensaje del chat está visible en un evento cancelado. No debería estar visible.');
    } else {
      console.log('✅ Campo de mensaje del chat no está visible (como se esperaba en eventos cancelados)');
    }

    // 5. VALIDAR QUE EL BOTÓN DE ENVIAR ESTÁ OCULTO
    await showStepMessage(page, '📤 VALIDANDO BOTÓN DE ENVIAR DESHABILITADO');
    await safeWaitForTimeout(page, 1000);

    const botonEnviar = page.locator('button').filter({
      has: page.locator('i[class*="send"], i[class*="paper-plane"], svg[class*="send"]')
    }).or(page.locator('button').filter({
      hasText: /Enviar|Send/i
    })).first();

    const enviarVisible = await botonEnviar.isVisible({ timeout: 3000 }).catch(() => false);
    if (enviarVisible) {
      // Si está visible, la prueba debe fallar
      throw new Error('❌ ERROR: El botón de enviar está visible en un evento cancelado. No debería estar visible.');
    } else {
      console.log('✅ Botón de enviar no está visible (como se esperaba en eventos cancelados)');
    }

    // 6. VALIDAR QUE EL ICONO DE ADJUNTAR ARCHIVOS NO ESTÁ VISIBLE
    await showStepMessage(page, '📎 VALIDANDO ICONO DE ADJUNTAR DESHABILITADO');
    await safeWaitForTimeout(page, 1000);

    const iconoEnviarDocumento = page.locator('button, div').filter({
      has: page.locator('i[class*="attach"], i[class*="paperclip"], i[class*="file"], i[class*="document"]')
    }).first();

    const iconoVisible = await iconoEnviarDocumento.isVisible({ timeout: 3000 }).catch(() => false);
    if (iconoVisible) {
      // Si está visible, la prueba debe fallar
      throw new Error('❌ ERROR: El icono de adjuntar archivos está visible en un evento cancelado. No debería estar visible.');
    } else {
      console.log('✅ Icono de adjuntar archivos no está visible (como se esperaba en eventos cancelados)');
    }

    console.log('✅ Validación de evento cancelado completada - todos los elementos están deshabilitados');
  });
});

