# Reporte de Pruebas: Dashboard de Cliente

## 📋 Información General

- **Nombre del archivo**: `dashboard.spec.ts`
- **Ruta en GitHub**: `https://github.com/efraindeloafiestamas/Automations/blob/main/tests/client/dashboard.spec.ts`
- **Tipo de prueba**: Suite de pruebas End-to-End (E2E)
- **Framework**: Playwright
- **Timeout por defecto**: 60 segundos por prueba
- **Viewport**: 1400x720 (configurable por prueba)

## 🎯 Objetivo de las Pruebas

Esta suite de pruebas valida el funcionamiento completo del dashboard del cliente en la plataforma Fiestamas, incluyendo:
- Validación de elementos visuales y funcionales
- Navegación entre secciones
- Interacciones con servicios
- Filtrado y ordenamiento
- Funcionalidad del calendario
- Responsividad móvil y desktop

## 📦 Estructura de la Suite

La suite contiene **12 pruebas** organizadas en un `test.describe` que comparten configuración común:

### Configuración Compartida
- **beforeEach**: Inicia sesión como cliente y navega al dashboard antes de cada prueba
- **Timeout**: 60 segundos por defecto (algunas pruebas tienen timeouts personalizados)
- **Verificación inicial**: Confirma que el mensaje "Bienvenido" es visible

## 🔄 Pruebas Incluidas

### 1. `mostrar las secciones principales del dashboard`
**Objetivo**: Validar que todas las secciones principales del dashboard son visibles

**Validaciones**:
- ✅ Mensaje de bienvenida
- ✅ Sección "Elige tu fiesta"
- ✅ Botón "Nueva fiesta" (desktop y móvil)
- ✅ Botón "Agregar servicios"
- ✅ Botón "Ordenar por"
- ✅ Calendario (solo desktop, viewport >= 1024px)
- ✅ Sección "¡Fiestachat!" con título y subtítulo

**Características**:
- Detecta automáticamente el viewport y busca el botón correcto (desktop/móvil)
- Usa fallbacks para encontrar elementos si los selectores principales fallan

---

### 2. `barra superior navega a chats, favoritos y perfil`
**Objetivo**: Verificar que la navegación superior funciona correctamente

**Flujo**:
1. Navega a Chats y verifica la URL
2. Regresa al dashboard
3. Navega a Favoritos (solo desktop) y verifica la URL
4. Regresa al dashboard
5. Navega a Perfil y verifica la URL
6. Regresa al dashboard

**Características**:
- Maneja navegación tanto en desktop como móvil
- Verifica URLs específicas para cada sección
- Usa `networkidle` para asegurar carga completa

---

### 3. `botón Nueva fiesta navega a la página de creación de evento`
**Objetivo**: Validar que el botón "Nueva fiesta" navega correctamente

**Flujo**:
1. Busca el botón según el viewport (desktop/móvil)
2. Hace clic en el botón
3. Verifica que navega a la página de selección de tipo de evento
4. Verifica que la URL cambia correctamente

**Características**:
- Detecta viewport y selecciona el botón apropiado
- Tiene fallbacks para encontrar el botón si los selectores principales fallan

---

### 4. `crear nueva fiesta - validar página de selección de tipo de evento`
**Objetivo**: Validar el flujo completo de creación de nueva fiesta

**Flujo**:
1. Hace clic en "Nueva fiesta"
2. Verifica que aparece la página de selección de tipo de evento
3. Valida que hay categorías de eventos disponibles
4. Selecciona una categoría aleatoria
5. Navega por categorías y subcategorías hasta encontrar servicios
6. Valida que se puede avanzar al siguiente paso

**Características**:
- Usa la función `navegarHastaEncontrarServicios()` para navegación inteligente
- Selección aleatoria de categorías
- Validación de avance en el flujo

---

### 5. `botón Agregar servicios está visible y funcional`
**Objetivo**: Verificar que el botón "Agregar servicios" funciona

**Flujo**:
1. Verifica que el botón es visible
2. Hace clic en el botón
3. Verifica que navega a la página de servicios

**Características**:
- Validación simple y directa
- Verifica funcionalidad básica

---

### 6. `botón Ordenar por muestra opciones`
**Objetivo**: Validar el dropdown de ordenamiento

**Flujo**:
1. Busca el botón "Ordenar por"
2. Hace clic en el botón
3. Verifica que aparecen opciones de ordenamiento

**Características**:
- Verifica interacción con dropdown
- Valida que las opciones son visibles

---

### 7. `filtros de servicios están visibles`
**Objetivo**: Validar que los filtros de servicios funcionan correctamente

**Flujo**:
1. Navega hasta encontrar servicios usando `navegarHastaEncontrarServicios()`
2. Busca el botón de filtros
3. Hace clic para abrir los filtros
4. Verifica que los filtros son visibles
5. Valida diferentes tipos de filtros disponibles

**Características**:
- Requiere navegación previa a servicios
- Valida múltiples tipos de filtros
- Verifica visibilidad y funcionalidad

---

### 8. `sección de eventos muestra las fiestas del cliente`
**Objetivo**: Validar que la sección de eventos muestra correctamente las fiestas

**Flujo**:
1. Busca la sección de eventos
2. Verifica que hay eventos visibles
3. Valida la estructura de las tarjetas de eventos

**Características**:
- Verifica presencia de eventos
- Valida estructura visual
- Confirma que los eventos son interactuables

---

### 9. `sección Fiestachat muestra conversaciones`
**Objetivo**: Validar que la sección de Fiestachat muestra conversaciones

**Flujo**:
1. Busca la sección de Fiestachat
2. Verifica que hay conversaciones visibles
3. Valida la estructura de las conversaciones
4. Verifica que se puede hacer clic en las conversaciones

**Características**:
- Valida presencia de conversaciones
- Verifica estructura de mensajes
- Confirma interactividad

---

### 10. `calendario filtra eventos al seleccionar un día (desktop)`
**Objetivo**: Validar que el calendario filtra eventos correctamente

**Flujo**:
1. Busca el calendario (solo desktop)
2. Identifica días con eventos
3. Cuenta eventos antes de seleccionar un día
4. Selecciona un día con eventos
5. Cuenta eventos después del filtro
6. Verifica que el número de eventos cambió

**Características**:
- Solo se ejecuta en viewport desktop (>= 1024px)
- Compara conteo antes/después del filtro
- Valida que el filtro funciona correctamente

---

### 11. `navegación móvil funciona correctamente`
**Objetivo**: Validar la navegación en dispositivos móviles

**Configuración**:
- Viewport: 375x667 (iPhone SE)

**Flujo**:
1. Ajusta el viewport a móvil
2. Verifica que el botón "Nueva fiesta" es visible (versión móvil)
3. Valida la navegación inferior móvil
4. Navega a diferentes secciones desde la navegación móvil

**Características**:
- Prueba específica para móvil
- Valida elementos específicos de la versión móvil
- Verifica navegación inferior

---

## 🛠️ Funciones Auxiliares

### `navegarHastaEncontrarServicios(page: Page)`
**Propósito**: Navega recursivamente por categorías y subcategorías hasta encontrar servicios disponibles

**Características**:
- **Navegación inteligente**: Si no encuentra servicios en una subcategoría, regresa un nivel y prueba otra
- **Cambio de categoría**: Si ninguna subcategoría tiene servicios, sube 2 niveles y selecciona otra categoría de servicios
- **Prevención de loops**: Usa `visitedPaths` para evitar visitar la misma ruta dos veces
- **Límites de seguridad**: 
  - Máximo 50 intentos
  - Máximo 5 niveles de profundidad
  - Máximo 3 regresos sin servicios antes de cambiar categoría

**Retorna**: `boolean` - `true` si encuentra servicios, `false` si no los encuentra después de todos los intentos

---

### `obtenerCategoriasServicios(page: Page)`
**Propósito**: Obtiene todas las categorías de servicios disponibles en la página actual

**Retorna**: Array de objetos con `name` (string) y `button` (Locator) de cada categoría

**Características**:
- Busca botones con estructura específica de categorías
- Filtra elementos no relevantes
- Maneja diferentes estructuras DOM

---

### `obtenerSubcategorias(page: Page)`
**Propósito**: Obtiene todas las subcategorías disponibles en el nivel actual

**Retorna**: Array de objetos con `name` (string) y `button` (Locator) de cada subcategoría

**Características**:
- Identifica subcategorías por su estructura visual
- Maneja múltiples niveles de anidamiento
- Filtra elementos no relevantes

---

### `verificarSiHayServicios(page: Page)`
**Propósito**: Verifica si hay servicios disponibles en la página actual

**Retorna**: `boolean` - `true` si encuentra servicios, `false` si no

**Estrategias de búsqueda**:
1. Busca el título "Servicios" en la página
2. Busca tarjetas de servicios con clases específicas
3. Busca imágenes de servicios
4. Busca botones de "Contactar" o similares

**Características**:
- Múltiples estrategias de detección para mayor robustez
- Maneja diferentes estructuras de visualización de servicios

---

## 📊 Datos y Configuración

### URLs Utilizadas
- **Dashboard**: `${DEFAULT_BASE_URL}/client/dashboard`
- **Chats**: `${DEFAULT_BASE_URL}/client/chats`
- **Perfil**: `${DEFAULT_BASE_URL}/client/profile`
- **Favoritos**: `${DEFAULT_BASE_URL}/client/favorites`
- **Calendario**: `${DEFAULT_BASE_URL}/client/calendar`

### Viewports
- **Desktop por defecto**: 1400x720
- **Móvil (prueba específica)**: 375x667

### Credenciales
- Usa `CLIENT_EMAIL` y `CLIENT_PASSWORD` de `tests/config.ts`

## 🎨 Características Especiales

### Detección Automática de Viewport
- Las pruebas detectan el tamaño del viewport
- Buscan elementos específicos según sea desktop o móvil
- Tienen fallbacks para diferentes estructuras DOM

### Navegación Inteligente
- La función `navegarHastaEncontrarServicios()` implementa un algoritmo de búsqueda recursiva
- Evita loops infinitos usando tracking de rutas visitadas
- Cambia automáticamente de categoría si no encuentra servicios

### Mensajes Visuales de Progreso
- Usa `showStepMessage()` para mostrar mensajes en pantalla durante la ejecución
- Mensajes informativos con emojis para mejor seguimiento
- Cada prueba muestra su progreso visualmente

### Manejo Robusto de Elementos
- Múltiples estrategias de búsqueda para encontrar elementos
- Fallbacks cuando los selectores principales fallan
- Validación de visibilidad antes de interactuar

## 🚀 Cómo Ejecutar las Pruebas

### Prerrequisitos
1. Tener Node.js instalado
2. Tener las dependencias instaladas: `npm install`
3. Configurar las credenciales en `tests/config.ts`:
   - `CLIENT_EMAIL`
   - `CLIENT_PASSWORD`
   - `DEFAULT_BASE_URL`

### Ejecución

#### Ejecutar todas las pruebas del dashboard:
```bash
npx playwright test tests/client/dashboard.spec.ts
```

#### Ejecutar una prueba específica:
```bash
npx playwright test tests/client/dashboard.spec.ts -g "mostrar las secciones principales"
```

#### Ejecutar en modo UI (recomendado para debugging):
```bash
npx playwright test tests/client/dashboard.spec.ts --ui
```

#### Ejecutar en modo headed (ver el navegador):
```bash
npx playwright test tests/client/dashboard.spec.ts --headed
```

#### Ejecutar con más información de debug:
```bash
npx playwright test tests/client/dashboard.spec.ts --debug
```

#### Ejecutar solo pruebas de desktop:
```bash
npx playwright test tests/client/dashboard.spec.ts -g "calendario filtra eventos"
```

#### Ejecutar solo pruebas de móvil:
```bash
npx playwright test tests/client/dashboard.spec.ts -g "navegación móvil"
```

## 📝 Estructura del Código

```
dashboard.spec.ts
├── Imports y configuración
├── Constantes de URLs
├── Configuración de viewport
├── navegarHastaEncontrarServicios()
│   └── Algoritmo de navegación recursiva
│   └── Manejo de rutas visitadas
│   └── Cambio de categorías
├── obtenerCategoriasServicios()
│   └── Extracción de categorías
├── obtenerSubcategorias()
│   └── Extracción de subcategorías
├── verificarSiHayServicios()
│   └── Múltiples estrategias de búsqueda
└── test.describe('Dashboard de cliente')
    ├── beforeEach (login y navegación)
    ├── test 1: Secciones principales
    ├── test 2: Navegación superior
    ├── test 3: Botón Nueva fiesta
    ├── test 4: Crear nueva fiesta
    ├── test 5: Botón Agregar servicios
    ├── test 6: Botón Ordenar por
    ├── test 7: Filtros de servicios
    ├── test 8: Sección de eventos
    ├── test 9: Sección Fiestachat
    ├── test 10: Calendario (desktop)
    └── test 11: Navegación móvil
```

## ⚠️ Consideraciones Importantes

1. **Dependencia de login**: Todas las pruebas requieren login exitoso (manejado en `beforeEach`)
2. **Datos existentes**: Algunas pruebas requieren que existan eventos o conversaciones en el sistema
3. **Viewport específico**: La prueba del calendario solo funciona en desktop (>= 1024px)
4. **Navegación compleja**: La función `navegarHastaEncontrarServicios()` puede tomar tiempo si hay muchas categorías
5. **Timeouts**: Cada prueba tiene timeout de 60 segundos, pero algunas pueden necesitar más tiempo

## 🐛 Manejo de Errores

Las pruebas incluyen manejo robusto de errores:
- Verifica existencia de elementos antes de interactuar
- Usa timeouts apropiados para esperar elementos
- Maneja casos donde elementos no están visibles
- Proporciona mensajes de error descriptivos en la consola
- Tiene fallbacks para diferentes estructuras DOM

## 📈 Métricas Esperadas

- **Tiempo de ejecución total**: ~10-15 minutos (todas las pruebas)
- **Tiempo por prueba**: ~30-60 segundos
- **Pasos totales**: ~100-150 pasos principales
- **Interacciones con UI**: ~200-300 interacciones
- **Verificaciones**: ~50-70 verificaciones de elementos

## 🔗 Enlaces Relacionados

- **Repositorio**: https://github.com/efraindeloafiestamas/Automations
- **Archivo de prueba**: `tests/client/dashboard.spec.ts`
- **Utilidades**: `tests/utils.ts`
- **Configuración**: `tests/config.ts`
- **Prueba relacionada**: `tests/client/cliente-eventos.spec.ts`

## 📋 Resumen de Cobertura

### Elementos Validados
- ✅ Botones principales (Nueva fiesta, Agregar servicios, Ordenar por)
- ✅ Secciones principales (Elige tu fiesta, Fiestachat, Eventos)
- ✅ Navegación superior (Chats, Favoritos, Perfil)
- ✅ Calendario y filtrado
- ✅ Filtros de servicios
- ✅ Navegación móvil

### Funcionalidades Probadas
- ✅ Navegación entre páginas
- ✅ Creación de nueva fiesta
- ✅ Búsqueda de servicios
- ✅ Filtrado de eventos
- ✅ Visualización de conversaciones
- ✅ Responsividad móvil/desktop

### Flujos Completos
- ✅ Flujo de creación de evento
- ✅ Flujo de navegación por servicios
- ✅ Flujo de filtrado por calendario
- ✅ Flujo de navegación móvil

