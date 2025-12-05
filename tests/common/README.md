# Documentación de Pruebas Common

## 📋 Descripción General

Las pruebas **Common** son un conjunto de pruebas de extremo a extremo (E2E) que validan funcionalidades comunes y elementos públicos de la plataforma Fiestamas. Estas pruebas se ejecutan sin necesidad de autenticación y cubren aspectos fundamentales de la experiencia del usuario en la página principal y las rutas de categorías.

## 🎯 Objetivo

Validar que los elementos públicos y las funcionalidades básicas de navegación funcionan correctamente en la plataforma, asegurando una experiencia de usuario consistente y sin errores.

## 📁 Estructura de Archivos

```
tests/common/
├── README.md                      # Este documento (visión general)
├── HOME.md                        # Documentación de pruebas de home.spec.ts
├── RUTAS-CATEGORIAS.md            # Documentación de pruebas de rutas-categorias.spec.ts
├── SCREENSHOTS.md                 # Documentación de pruebas de screenshots.spec.ts
├── home.spec.ts                   # Pruebas de la página de inicio
├── rutas-categorias.spec.ts       # Pruebas de navegación y rutas de categorías
├── screenshots.spec.ts            # Pruebas de regresión visual
└── screenshots.spec.ts-snapshots/ # Screenshots de referencia para comparación
```

## 📚 Documentación Detallada

Para información específica sobre cada conjunto de pruebas, consulta los siguientes documentos:

- **[HOME.md](./HOME.md)** - Pruebas de la página de inicio (`home.spec.ts`)
- **[RUTAS-CATEGORIAS.md](./RUTAS-CATEGORIAS.md)** - Pruebas de rutas de categorías (`rutas-categorias.spec.ts`)
- **[SCREENSHOTS.md](./SCREENSHOTS.md)** - Pruebas de regresión visual (`screenshots.spec.ts`)

---

## 🛠️ Utilidades Comunes

Las pruebas Common utilizan las siguientes funciones helper de `tests/utils.ts`:

### `showStepMessage(page, message)`
Muestra un mensaje visual en la página durante la ejecución de la prueba (útil para debugging).

**Nota**: No se usa en `screenshots.spec.ts` para evitar que los mensajes aparezcan en los screenshots.

### `safeWaitForTimeout(page, ms)`
Espera de forma segura sin lanzar errores si la página se cierra.

### `waitForBackdropToDisappear(page, timeout)`
Espera a que los backdrops de Material-UI desaparezcan antes de interactuar con elementos.

**Selectores buscados**:
- `.MuiBackdrop-root`
- `[class*="MuiBackdrop-root"]`
- `div[aria-hidden="true"].MuiBackdrop-root`

**Comportamiento**:
- Espera a que el backdrop se oculte
- Si no desaparece, presiona ESC
- Timeout por defecto: 10 segundos

### `closeRegistrationModal(page, timeout)`
Cierra el modal de registro que puede aparecer en algunas páginas.

**Selectores**:
- Texto: "Registra tu servicio en Fiestamas"
- Botón de cerrar: `button:has(i.icon-x)`

**Comportamiento**:
- Detecta si el modal está visible
- Hace clic en el botón de cerrar
- Si no funciona, presiona ESC
- Timeout por defecto: 5 segundos

---

## 🚀 Ejecución de las Pruebas

### Ejecutar todas las pruebas Common
```bash
npx playwright test tests/common
```

### Ejecutar un archivo específico
```bash
# Pruebas de la página de inicio
npx playwright test tests/common/home.spec.ts

# Pruebas de rutas de categorías
npx playwright test tests/common/rutas-categorias.spec.ts

# Pruebas de screenshots
npx playwright test tests/common/screenshots.spec.ts
```

### Ejecutar una prueba específica
```bash
# Por nombre de prueba
npx playwright test tests/common/home.spec.ts -g "Validar funcionalidad del hero banner"

# Por número de línea
npx playwright test tests/common/home.spec.ts:978
```

### Ejecutar en modo UI
```bash
npx playwright test tests/common --ui
```

### Ejecutar en modo debug
```bash
npx playwright test tests/common --debug
```

### Ejecutar con reporte HTML
```bash
npx playwright test tests/common --reporter=html
```

---

## ⚙️ Configuración

### Variables de Entorno

Las pruebas Common utilizan las siguientes variables de entorno (definidas en `tests/config.ts`):

- `HOME_BASE_URL`: URL base para las pruebas de la página de inicio (por defecto: `DEFAULT_BASE_URL`)
- `FIESTAMAS_BASE_URL`: URL base de staging (por defecto: `https://staging.fiestamas.com`)
- `FIESTAMAS_PROD_BASE_URL`: URL base de producción (por defecto: `https://fiestamas.com`)
- `ENVIRONMENT`: Ambiente de ejecución (`prod` o `staging`)

### Timeouts

- **Timeout por defecto de Playwright**: 30 segundos
- **Timeout de pruebas individuales**: 60 segundos (configurado con `test.setTimeout()`)
- **Timeout de comparación de screenshots**: 40 segundos

---

## 📊 Cobertura de Pruebas

### Página de Inicio (`home.spec.ts`)
- ✅ Elementos técnicos y estructura HTML
- ✅ Navbar completo
- ✅ Hero banner y carrusel
- ✅ Sección de categorías
- ✅ Filtros de tipos de eventos
- ✅ Filtros de estímulos
- ✅ Footer completo

### Rutas de Categorías (`rutas-categorias.spec.ts`)
- ✅ 8+ familias de categorías
- ✅ Navegación entre niveles (Familia → Categoría → Sub-categoría)
- ✅ Breadcrumbs
- ✅ Búsqueda dentro de subcategorías
- ✅ Accesibilidad de rutas principales

### Regresión Visual (`screenshots.spec.ts`)
- ✅ 3 banners del hero
- ✅ Comparación pixel por pixel
- ✅ Generación de diffs visuales

---

## 🔍 Debugging

### Problemas Comunes

#### 1. Backdrop bloqueando clics
**Solución**: Las pruebas utilizan `waitForBackdropToDisappear()` antes de hacer clics en elementos interactivos.

#### 2. Modal de registro bloqueando
**Solución**: Las pruebas utilizan `closeRegistrationModal()` al inicio de las interacciones.

#### 3. Screenshots inestables
**Solución**: 
- Se ocultan elementos dinámicos antes de capturar
- Se deshabilitan animaciones CSS
- Se espera a que las transiciones terminen

#### 4. Elementos no encontrados
**Solución**: 
- Se utilizan múltiples selectores alternativos
- Se espera a que los elementos estén visibles con timeouts apropiados
- Se verifica la carga completa de la página con `waitForLoadState()`

### Logs y Mensajes

Las pruebas incluyen mensajes de consola detallados:
- `🚀` - Inicio de operaciones
- `✅` - Operación exitosa
- `⚠️` - Advertencia (no crítica)
- `❌` - Error o fallo
- `🔍` - Búsqueda o validación
- `📸` - Captura de screenshot
- `🗑️` - Eliminación de archivos

---

## 📝 Mantenimiento

### Agregar Nuevas Pruebas

Al agregar o modificar pruebas Common:

1. Mantener la consistencia con el estilo existente
2. Incluir mensajes de consola descriptivos
3. Usar las funciones helper cuando sea posible
4. Documentar nuevas funcionalidades en los documentos específicos
5. Asegurar que los timeouts sean apropiados
6. Probar en ambos ambientes (staging y producción) si es necesario

---

## 📚 Referencias

- [Documentación de Playwright](https://playwright.dev/)
- [Configuración del proyecto](../config.ts)
- [Utilidades comunes](../utils.ts)
- [HOME.md](./HOME.md) - Documentación detallada de pruebas de home
- [RUTAS-CATEGORIAS.md](./RUTAS-CATEGORIAS.md) - Documentación detallada de pruebas de rutas
- [SCREENSHOTS.md](./SCREENSHOTS.md) - Documentación detallada de pruebas de screenshots

---

**Última actualización**: Diciembre 2024
