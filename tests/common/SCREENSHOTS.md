# Documentación de Pruebas - screenshots.spec.ts

## 📋 Descripción

Pruebas de regresión visual que capturan y comparan screenshots de la página principal para detectar cambios visuales no deseados en los banners del hero.

## 🎯 Objetivo

Asegurar que los elementos visuales de la página principal, específicamente los banners del hero, no cambian de manera inesperada entre ejecuciones.

## 📄 Archivo

`tests/common/screenshots.spec.ts`

---

## ⚙️ Configuración

### Viewport
- **Ancho**: 1280px
- **Alto**: 720px
- **Dispositivo**: Desktop

### Navegador
- **Browser**: Chromium
- **Plataforma**: Windows (win32)

### Archivos de Screenshot
Los screenshots se guardan en:
```
tests/common/screenshots.spec.ts-snapshots/
```

---

## 🧪 Pruebas Incluidas

### Grupo 1: Capturar screenshots de referencia

#### 1.1. Capturar screenshot de referencia - Banner 1

**Línea**: `292`  
**Timeout**: 60 segundos

**Objetivo**: Capturar un screenshot de referencia de toda la página mostrando el banner 1 del hero.

**Proceso**:
1. **Eliminar screenshot existente** (si existe)
   - Usa `deleteExistingScreenshots(1)`
   - Evita conflictos con screenshots anteriores

2. **Inicializar página y encontrar indicadores**
   - Navega a la página principal (`/`)
   - Cierra modales que puedan aparecer
   - Busca los indicadores/puntos del hero banner
   - Encuentra al menos 3 puntos

3. **Hacer clic en el indicador del banner 1**
   - Hace scroll al indicador si es necesario
   - Cierra modales antes del clic
   - Espera a que los backdrops desaparezcan
   - Hace clic en el primer indicador

4. **Esperar transición del banner**
   - Espera 1.5 segundos para la transición
   - Espera a que el DOM esté listo
   - Espera adicional de 0.5 segundos

5. **Capturar screenshot**
   - Oculta elementos dinámicos
   - Deshabilita animaciones CSS
   - Captura screenshot de toda la página
   - Guarda como `homepage-banner-1-chromium-win32.png`

**Archivo generado**: `homepage-banner-1-chromium-win32.png`

---

#### 1.2. Capturar screenshot de referencia - Banner 2

**Línea**: `320`  
**Timeout**: 60 segundos

**Objetivo**: Capturar un screenshot de referencia de toda la página mostrando el banner 2 del hero.

**Proceso**: Similar al banner 1, pero haciendo clic en el segundo indicador.

**Archivo generado**: `homepage-banner-2-chromium-win32.png`

---

#### 1.3. Capturar screenshot de referencia - Banner 3

**Línea**: `348`  
**Timeout**: 60 segundos

**Objetivo**: Capturar un screenshot de referencia de toda la página mostrando el banner 3 del hero.

**Proceso**: Similar al banner 1, pero haciendo clic en el tercer indicador.

**Archivo generado**: `homepage-banner-3-chromium-win32.png`

---

### Grupo 2: Validar screenshots con referencia

#### 2.1. Validar que los banners del hero no han cambiado

**Línea**: `396`  
**Timeout**: 40 segundos por banner

**Objetivo**: Comparar screenshots actuales con los de referencia para detectar cambios visuales.

**Proceso para cada banner (1, 2, 3)**:

1. **Inicializar página y encontrar indicadores**
   - Navega a la página principal
   - Cierra modales
   - Encuentra los indicadores del hero

2. **Hacer clic en el indicador correspondiente**
   - Banner 1: primer indicador
   - Banner 2: segundo indicador
   - Banner 3: tercer indicador

3. **Esperar transición**
   - Espera a que el banner cambie
   - Espera a que el DOM esté listo

4. **Ocultar elementos dinámicos**
   - Contadores, timers, relojes
   - Notificaciones, badges
   - Elementos con `aria-live`, `role="status"`, `role="alert"`
   - Elementos con clases relacionadas a tiempo real

5. **Deshabilitar animaciones CSS**
   - `animation-duration: 0s`
   - `transition-duration: 0s`
   - `scroll-behavior: auto`

6. **Comparar con screenshot de referencia**
   - Usa `toHaveScreenshot()` de Playwright
   - Comparación pixel por pixel exacta
   - Si hay diferencias, genera imagen diff

**Configuración de comparación**:
```typescript
{
  fullPage: true,           // Captura de toda la página
  timeout: 40000,           // 40 segundos
  animations: 'disabled',    // Animaciones deshabilitadas
  maxDiffPixels: 0,         // Comparación exacta (0 diferencias permitidas)
  threshold: 0              // Sin tolerancia (0.0)
}
```

**Archivos generados en caso de diferencias**:
- `homepage-banner-{N}-comparison-chromium-win32.png` - Screenshot actual capturado
- `homepage-banner-{N}-diff-chromium-win32.png` - Imagen diff marcando diferencias

**Librerías utilizadas para diff**:
- `pixelmatch` - Comparación de píxeles
- `pngjs` - Manipulación de imágenes PNG

---

## 🛠️ Funciones Helper

### `deleteExistingScreenshots(bannerNumber)`

Elimina screenshots existentes antes de crear nuevos para evitar conflictos.

**Parámetros**:
- `bannerNumber`: Número del banner (1, 2, o 3)

**Proceso**:
1. Construye la ruta del archivo de screenshot
2. Verifica si el archivo existe
3. Si existe, lo elimina
4. Espera 200ms para asegurar que el archivo se eliminó

**Uso**:
```typescript
await deleteExistingScreenshots(1);
```

---

### `snapshotExists(bannerNumber)`

Verifica si existe un screenshot de referencia con reintentos para evitar condiciones de carrera.

**Parámetros**:
- `bannerNumber`: Número del banner (1, 2, o 3)

**Retorna**: `boolean`

**Proceso**:
1. Construye la ruta del archivo de screenshot
2. Verifica múltiples veces (hasta 3 intentos)
3. Verifica que el archivo existe
4. Verifica que el archivo no está siendo escrito (tamaño estable)
5. Espera 100ms entre intentos si es necesario

**Uso**:
```typescript
const exists = snapshotExists(1);
if (exists) {
  // Comparar con referencia
} else {
  // Crear nueva referencia
}
```

---

### `setupPageAndFindIndicators(page)`

Inicializa la página y encuentra los indicadores del hero banner.

**Parámetros**:
- `page`: Instancia de Page de Playwright

**Retorna**:
```typescript
{
  indicators: Locator,        // Locator de todos los indicadores
  puntosHeroIndices: number[] // Índices de los primeros 3 indicadores del hero
}
```

**Proceso**:
1. Navega a la página principal
2. Espera a que el DOM esté listo
3. Cierra modales de registro
4. Espera a que los backdrops desaparezcan
5. Busca el hero usando múltiples selectores:
   - `img[alt="Hero_Image"]`
   - `main div:has(img[alt*="Hero"])`
   - `[class*="hero"]`
   - `[class*="banner"]`
6. Busca indicadores usando `button.rounded-full`
7. Filtra los indicadores que están dentro del hero
8. Retorna los primeros 3 indicadores encontrados

**Uso**:
```typescript
const { indicators, puntosHeroIndices } = await setupPageAndFindIndicators(page);
const indicatorIndex = puntosHeroIndices[0];
const indicator = indicators.nth(indicatorIndex);
```

---

### `captureScreenshot(page, bannerNumber)`

Captura un screenshot de toda la página con el banner especificado visible.

**Parámetros**:
- `page`: Instancia de Page de Playwright
- `bannerNumber`: Número del banner (1, 2, o 3)

**Proceso**:

1. **Ocultar elementos dinámicos**
   ```typescript
   const dynamicSelectors = [
     '[class*="counter"]', '[class*="timer"]', '[class*="clock"]',
     '[class*="date"]', '[class*="time"]', '[class*="notification"]',
     '[class*="badge"]', '[class*="notification-badge"]',
     '[data-testid*="notification"]', 'time', '[datetime]',
     '[class*="live"]', '[class*="real-time"]', '[class*="marquee"]',
     '[class*="scrolling"]', '[class*="ticker"]', '[class*="loading"]',
     '[class*="spinner"]', '[aria-live]', '[role="status"]', '[role="alert"]'
   ];
   ```
   - Oculta todos los elementos que coincidan con estos selectores
   - Usa `visibility: hidden` para ocultarlos

2. **Deshabilitar animaciones CSS**
   ```css
   *, *::before, *::after {
     animation-duration: 0s !important;
     animation-delay: 0s !important;
     transition-duration: 0s !important;
     transition-delay: 0s !important;
     scroll-behavior: auto !important;
   }
   ```
   - Inyecta este estilo en el `<head>` de la página
   - Fuerza un repaint con `document.body.offsetHeight`

3. **Esperar estabilización**
   - Espera 300ms después de ocultar elementos
   - Espera 200ms adicional antes de capturar

4. **Verificar si existe snapshot de referencia**
   - Si NO existe: crea uno nuevo con `page.screenshot()`
   - Si existe: compara con `toHaveScreenshot()`

5. **Crear o comparar screenshot**
   - **Si no existe**:
     - Crea el directorio de snapshots si no existe
     - Captura screenshot con `page.screenshot()`
     - Guarda como `homepage-banner-{N}-chromium-win32.png`
     - Espera 500ms para asegurar que se guardó
   
   - **Si existe**:
     - Usa `toHaveScreenshot()` para comparar
     - Configuración estricta: `maxDiffPixels: 0`, `threshold: 0`
     - Si hay diferencias, Playwright genera archivos de comparación

**Uso**:
```typescript
await captureScreenshot(page, 1);
```

---

### `deleteComparisonScreenshots()`

Elimina archivos temporales de comparación después de las pruebas.

**Proceso**:
1. Para cada banner (1, 2, 3):
   - Busca archivo de comparación: `homepage-banner-{N}-comparison-chromium-win32.png`
   - Busca archivo diff: `homepage-banner-{N}-diff-chromium-win32.png`
   - Si existen, los elimina
2. Espera 200ms para asegurar que se eliminaron

**Uso**:
```typescript
await deleteComparisonScreenshots();
```

---

## 🎨 Elementos Dinámicos Ocultos

Para asegurar screenshots estables, se ocultan los siguientes elementos:

### Contadores y Timers
- `[class*="counter"]`
- `[class*="timer"]`
- `[class*="clock"]`
- `[class*="date"]`
- `[class*="time"]`

### Notificaciones
- `[class*="notification"]`
- `[class*="badge"]`
- `[class*="notification-badge"]`
- `[data-testid*="notification"]`

### Elementos de Tiempo Real
- `time`
- `[datetime]`
- `[class*="live"]`
- `[class*="real-time"]`

### Elementos Animados
- `[class*="marquee"]`
- `[class*="scrolling"]`
- `[class*="ticker"]`
- `[class*="loading"]`
- `[class*="spinner"]`

### Elementos de Accesibilidad
- `[aria-live]`
- `[role="status"]`
- `[role="alert"]`

---

## 🚀 Ejecución

### Ejecutar todas las pruebas de screenshots
```bash
npx playwright test tests/common/screenshots.spec.ts
```

### Ejecutar solo pruebas de captura
```bash
npx playwright test tests/common/screenshots.spec.ts -g "Capturar screenshot"
```

### Ejecutar solo pruebas de validación
```bash
npx playwright test tests/common/screenshots.spec.ts -g "Validar que los banners"
```

### Ejecutar una prueba específica
```bash
# Por nombre
npx playwright test tests/common/screenshots.spec.ts -g "Banner 1"

# Por número de línea
npx playwright test tests/common/screenshots.spec.ts:292
```

### Ejecutar en modo UI
```bash
npx playwright test tests/common/screenshots.spec.ts --ui
```

---

## 📝 Mantenimiento

### Actualizar Screenshots de Referencia

Si los cambios visuales son intencionales y quieres actualizar las referencias:

#### Método 1: Eliminar y regenerar
```bash
# Eliminar screenshots antiguos
rm tests/common/screenshots.spec.ts-snapshots/homepage-banner-*-chromium-win32.png

# Ejecutar pruebas de captura
npx playwright test tests/common/screenshots.spec.ts -g "Capturar screenshot"
```

#### Método 2: Usar flag de Playwright
```bash
# Actualizar snapshots automáticamente
npx playwright test tests/common/screenshots.spec.ts --update-snapshots
```

### Ver Screenshots Generados

Los screenshots se guardan en:
```
tests/common/screenshots.spec.ts-snapshots/
```

Archivos:
- `homepage-banner-1-chromium-win32.png` - Screenshot de referencia banner 1
- `homepage-banner-2-chromium-win32.png` - Screenshot de referencia banner 2
- `homepage-banner-3-chromium-win32.png` - Screenshot de referencia banner 3
- `homepage-banner-{N}-comparison-chromium-win32.png` - Screenshot actual (si hay diferencias)
- `homepage-banner-{N}-diff-chromium-win32.png` - Imagen diff (si hay diferencias)

### Interpretar Diffs

Si una prueba falla por diferencias visuales:

1. **Revisar el archivo diff** (`homepage-banner-{N}-diff-chromium-win32.png`)
   - Las áreas diferentes estarán marcadas en rojo/amarillo
   - Compara con el screenshot de referencia

2. **Revisar el screenshot actual** (`homepage-banner-{N}-comparison-chromium-win32.png`)
   - Compara con el screenshot de referencia

3. **Decidir si el cambio es intencional**
   - Si es intencional: actualizar la referencia
   - Si no es intencional: investigar el cambio

---

## 🔍 Debugging

### Problemas Comunes

#### 1. Screenshots inestables (diferentes en cada ejecución)
**Causas posibles**:
- Elementos dinámicos no ocultos
- Animaciones no deshabilitadas
- Transiciones no completadas

**Solución**:
- Verificar que todos los elementos dinámicos están en la lista de ocultos
- Aumentar tiempos de espera después de transiciones
- Verificar que las animaciones CSS están deshabilitadas

#### 2. Hero no encontrado
**Causas posibles**:
- Página no cargó completamente
- Selectores del hero cambiaron

**Solución**:
- Aumentar tiempo de espera inicial
- Verificar selectores del hero en la página
- Usar `waitForLoadState('networkidle')` si es necesario

#### 3. Indicadores no encontrados
**Causas posibles**:
- Selector `button.rounded-full` no encuentra los puntos
- Los puntos están fuera del hero

**Solución**:
- Verificar que hay al menos 3 botones con clase `rounded-full`
- Verificar que los botones están dentro del contenedor del hero
- Ajustar la lógica de filtrado si es necesario

#### 4. Comparación falla aunque los screenshots parecen iguales
**Causas posibles**:
- Diferencias de renderizado entre ejecuciones
- Fuentes no cargadas completamente
- Diferencias de antialiasing

**Solución**:
- Verificar que las fuentes están cargadas con `waitForLoadState('networkidle')`
- Aumentar tiempo de espera antes de capturar
- Considerar usar `threshold` ligeramente mayor si es necesario (aunque actualmente está en 0)

---

## 📚 Referencias

- [README.md](./README.md) - Documentación general de pruebas Common
- [HOME.md](./HOME.md) - Documentación de pruebas de home
- [RUTAS-CATEGORIAS.md](./RUTAS-CATEGORIAS.md) - Documentación de pruebas de rutas
- [Configuración del proyecto](../config.ts)
- [Utilidades comunes](../utils.ts)
- [Documentación de Playwright - Screenshots](https://playwright.dev/docs/test-screenshots)
- [pixelmatch](https://github.com/mapbox/pixelmatch) - Librería de comparación de imágenes
- [pngjs](https://github.com/lukeapage/pngjs) - Librería de manipulación de PNG

---

**Última actualización**: Diciembre 2024

