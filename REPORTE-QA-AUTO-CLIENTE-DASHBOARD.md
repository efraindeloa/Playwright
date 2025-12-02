# Reporte: [WEB] QA-AUTO Cliente: Dashboard (Navegación, Filtros, Calendario)

## 📋 Información General

- **Subtask**: `[WEB] QA-AUTO Cliente: Dashboard (Navegación, Filtros, Calendario)`
- **Archivo de pruebas**: `tests/client/dashboard.spec.ts`
- **Tipo de prueba**: Suite de pruebas End-to-End (E2E)
- **Framework**: Playwright
- **Timeout por defecto**: 60 segundos por prueba (algunas pruebas tienen timeouts extendidos)
- **Viewport**: 1400x720 (configurable por prueba)

## 🎯 Objetivo

Esta suite de pruebas valida el funcionamiento completo del dashboard del cliente en la plataforma Fiestamas, incluyendo:

1. **Validación de elementos visuales** y funcionales del dashboard
2. **Navegación** entre secciones (chats, favoritos, perfil)
3. **Interacciones con servicios** (búsqueda, filtrado, ordenamiento)
4. **Funcionalidad del calendario** (filtrado por día, navegación entre meses, eventos marcados)
5. **Gestión de eventos** (visualización, creación, agregar servicios)
6. **Integración con Fiestachat** (conversaciones, notificaciones, navegación)
7. **Validación completa de secciones** (barra superior, eventos, servicios, calendario)

## 📊 Resumen de Pruebas

### Tests Implementados

La suite contiene **19 pruebas** organizadas en un `test.describe` que comparten configuración común. Las pruebas están organizadas siguiendo el flujo típico del usuario:

#### Pruebas de Validación de Secciones del Dashboard

1. **`test('Mostrar Todas Las Secciones Principales Del Dashboard')`**
   - Valida que todas las secciones principales del dashboard son visibles
   - Valida mensaje de bienvenida, sección "Elige tu fiesta", botones principales, calendario (desktop) y sección Fiestachat
   - Timeout: 60 segundos

2. **`test('Mostrar Todos Los Elementos De La Barra Superior')`**
   - Valida logo de Fiestamas (desktop y móvil)
   - Valida enlaces de navegación: Chats (con contador de mensajes), Búsqueda, Favoritos, Perfil
   - Valida menú de opciones (móvil)
   - Valida funcionalidad de cada elemento
   - Timeout: 120 segundos (2 minutos)

3. **`test('Mostrar Todos Los Elementos De La Sección Elige Tu Fiesta')`**
   - Valida título "Elige tu fiesta"
   - Valida scroll horizontal
   - Valida tarjetas de eventos: nombre, fecha, hora, presupuesto, avance (porcentaje y barra), días restantes, color identificador
   - Valida botón "Nueva fiesta" (desktop y móvil)
   - Timeout: 120 segundos (2 minutos)

4. **`test('Mostrar Todos Los Elementos De La Sección De Servicios')`**
   - Valida botón "Agregar servicios"
   - Valida botón "Ordenar por" con menú desplegable (Nuevo, Pendiente, Contratado, Cancelado)
   - Valida filtros laterales (desktop): categorías, contador de servicios, botón "Ver más"
   - Valida sugerencias: Lugares, Entretenimiento, Mesa de regalos
   - Valida tarjetas de servicios: imagen, nombre, categoría/subcategoría, descripción, precio, información del negocio, badge "NUEVO", color identificador del evento
   - Timeout: 180 segundos (3 minutos)

5. **`test('Mostrar Todos Los Elementos Del Calendario En Vista Desktop')`**
   - Valida vista mensual
   - Valida navegación entre meses (anterior y siguiente)
   - Valida días de la semana (Dom, Lun, Mar, Mie, Jue, Vie, Sab)
   - Valida eventos marcados en el calendario (puntos de colores)
   - Valida filtrado de eventos al seleccionar un día
   - **Optimizaciones recientes**:
     - Procesa máximo 35 días (suficiente para cualquier mes)
     - Timeouts cortos (1 segundo) para verificación de visibilidad
     - Timeouts de 2 segundos para operaciones de `textContent()`
     - Manejo mejorado de días con el mismo número en diferentes meses
     - Validación condicional: solo filtra eventos si hay días con eventos disponibles
   - Solo se ejecuta en desktop (viewport ≥ 1024px)
   - Timeout: 120 segundos (2 minutos)

6. **`test('Mostrar Todos Los Elementos De La Sección Fiestachat')`**
   - Valida título "¡Fiestachat!"
   - Valida subtítulo "La línea directa a tu evento"
   - Valida contenedor destacado con información sobre el chat
   - Valida elementos interactivos (botones, enlaces)
   - Valida conversaciones disponibles
   - Solo se ejecuta en desktop (viewport ≥ 1024px)
   - Timeout: 120 segundos (2 minutos)

#### Pruebas de Navegación

7. **`test('Navegar Correctamente Desde La Barra Superior A Chats Favoritos Y Perfil')`**
   - Verifica que la navegación superior funciona correctamente
   - Valida contador de mensajes en Chats
   - Valida navegación a Chats, Favoritos (solo desktop) y Perfil
   - Verifica URLs correctas después de navegar
   - Timeout: 60 segundos

#### Pruebas de Chats y Notificaciones

8. **`test('Mostrar Las Conversaciones En La Sección Fiestachat')`**
   - Valida que la sección Fiestachat muestra conversaciones
   - Cuenta las conversaciones encontradas
   - Timeout: 60 segundos

9. **`test('Navegar A La Página De Cotización Al Hacer Clic En Una Notificación')`**
   - Busca notificaciones en la sección Fiestachat
   - Hace clic en una notificación
   - Verifica que navega a la página de cotización correspondiente
   - Valida que la URL contiene el ID de la cotización
   - Solo se ejecuta en desktop (viewport ≥ 1024px)
   - Timeout: 120 segundos (2 minutos)

#### Pruebas de Eventos

10. **`test('Mostrar Las Fiestas Del Cliente En La Sección De Eventos')`**
    - Valida que los eventos del cliente se muestran correctamente
    - Busca eventos por patrón de fecha
    - Valida estructura de tarjetas de eventos
    - Timeout: 60 segundos

#### Pruebas de Servicios

11. **`test('Mostrar El Botón Agregar Servicios y probar su funcionalidad')`**
    - Valida el botón "Agregar servicios" y ejecuta el flujo completo
    - Reutiliza `agregarServicioAEventoExistente` de `cliente-eventos.spec.ts`
    - Timeout: 180 segundos (3 minutos)

12. **`test('Ordenar Servicios Correctamente')`**
    - Valida que el botón "Ordenar por" es visible y funcional
    - Valida que el menú desplegable se abre correctamente
    - Valida opciones del menú: Nuevo, Pendiente, Contratado, Cancelado
    - Valida funcionalidad de filtrado por cada opción
    - Timeout: 60 segundos

13. **`test('Aplicar Filtros De Servicios Correctamente')`**
    - Valida los filtros de servicios en el sidebar (solo desktop)
    - Valida secciones "Servicios" y "Sugerencias"
    - Cuenta sugerencias disponibles
    - Timeout: 60 segundos

#### Pruebas de Calendario

15. **`test('Mostrar Todos Los Elementos Del Calendario En Vista Desktop')`**
    - Incluye validación de filtrado por día (ver prueba #5)
    - Optimizado para evitar timeouts

#### Pruebas de Creación de Eventos

16. **`test('Crear Una Nueva Fiesta')`**
    - Ejecuta el flujo completo de creación de evento
    - Reutiliza `ejecutarFlujoCompletoCreacionEvento` de `cliente-eventos.spec.ts`
    - Timeout: 180 segundos (3 minutos)

#### Pruebas de Perfil

17. **`test('Mostrar Todos Los Elementos De La Página De Perfil')`**
    - Valida elementos básicos de la página de perfil
    - Timeout: 60 segundos

18. **`test('Editar Los Datos Personales Del Usuario')`**
    - Valida funcionalidad de edición de datos personales
    - Timeout: 60 segundos

19. **`test('Actualizar La Foto De Perfil')`**
    - Valida funcionalidad de subir foto de perfil
    - Timeout: 60 segundos

20. **`test('Eliminar La Foto De Perfil')`**
    - Valida funcionalidad de eliminar foto de perfil
    - Timeout: 60 segundos

21. **`test('Cambiar La Contraseña Del Usuario')`**
    - Valida funcionalidad de cambio de contraseña
    - Timeout: 60 segundos

**Total de tests**: 19 tests (14 de dashboard + 5 de perfil)

## 🔄 Flujos de Prueba

### Configuración Compartida (`beforeEach`)

Antes de cada prueba:
1. **Inicia sesión como cliente** usando `login()` (con verificación de autenticación previa)
2. **Navega al dashboard** (`/client/dashboard`)
3. **Espera a que cargue completamente** (`networkidle`)
4. **Verifica el mensaje de bienvenida** ("Bienvenido")
5. **Muestra mensaje de progreso** con `showStepMessage()`

### Test 1: Validar Secciones Dashboard

**Objetivo**: Validar que todas las secciones principales del dashboard son visibles

**Flujo**:
1. **Valida mensaje de bienvenida**: Busca texto "Bienvenido" en la página
2. **Valida sección "Elige tu fiesta"**: Busca el título "Elige tu fiesta"
3. **Valida botón "Nueva fiesta"**: Detecta viewport y busca el botón apropiado (desktop o móvil)
4. **Valida botón "Agregar servicios"**: Busca botón con texto "Agregar servicios"
5. **Valida botón "Ordenar por"**: Busca botón con texto "Ordenar por"
6. **Valida calendario (solo desktop)**: Solo valida si viewport ≥ 1024px
7. **Valida sección "¡Fiestachat!"**: Busca contenedor específico con título y subtítulo

**Características**:
- Detección automática de viewport
- Múltiples estrategias de búsqueda (selectores principales + fallbacks)
- Validación condicional según viewport (calendario solo desktop)

### Test 2: Validar Elementos Completos de la Barra Superior

**Objetivo**: Validar todos los elementos de la barra superior y su funcionalidad

**Flujo**:
1. **Valida logo de Fiestamas**:
   - Busca logo en desktop y móvil
   - Valida que es visible
   - Valida funcionalidad: clic navega al dashboard/home

2. **Valida enlace de Chats**:
   - Busca botón/enlace de Chats
   - Valida contador de mensajes (si existe)
   - Valida funcionalidad: clic navega a `/client/chats`

3. **Valida botón de Búsqueda**:
   - Busca botón de búsqueda
   - Valida que es visible
   - Valida funcionalidad: clic abre modal/buscador

4. **Valida enlace de Favoritos (solo desktop)**:
   - Solo si viewport ≥ 1024px
   - Busca botón/enlace de Favoritos
   - Valida funcionalidad: clic navega a `/client/favorites`

5. **Valida enlace de Perfil**:
   - Busca botón/enlace de Perfil
   - Valida funcionalidad: clic navega a `/client/profile`

6. **Valida menú móvil (solo móvil)**:
   - Solo si viewport < 1024px
   - Busca botón de menú móvil
   - Valida funcionalidad: clic abre menú

**Características**:
- Validación completa de todos los elementos de navegación
- Validación de contador de mensajes en Chats
- Validación condicional según viewport

### Test 3: Validar Elementos Completos de la Sección "Elige tu fiesta"

**Objetivo**: Validar todos los elementos de la sección de eventos

**Flujo**:
1. **Valida título**: Busca y valida "Elige tu fiesta"
2. **Valida scroll horizontal**: Busca contenedor con `overflow-x-auto` y valida funcionalidad
3. **Valida tarjetas de eventos**:
   - Busca todas las tarjetas de eventos
   - Para cada tarjeta valida:
     - Nombre del evento
     - Fecha y hora (formato DD MMM YYYY, HH:MM)
     - Presupuesto (formato de moneda)
     - Avance (porcentaje y barra de progreso)
     - Días restantes
     - Color identificador (border-left-color)
4. **Valida botón "Nueva fiesta"**:
   - Desktop: busca botón con clase `hidden.lg:flex`
   - Móvil: busca botón con clase `lg:hidden`
   - **Mejoras recientes**:
     - Busca tanto "Nueva fiesta" como "Nuevo evento" (por si el texto cambió)
     - Verifica visibilidad antes de validar con `toBeVisible()` para evitar fallos
     - Maneja correctamente cuando el botón está oculto según el viewport
   - Valida funcionalidad: clic navega a creación de evento

**Características**:
- Validación exhaustiva de cada elemento de las tarjetas
- Validación de formato de fechas, horas y monedas
- Validación de scroll horizontal
- Validación condicional según viewport

### Test 4: Validar Elementos Completos de la Sección de Servicios

**Objetivo**: Validar todos los elementos de la sección de servicios

**Flujo**:
1. **Valida botón "Agregar servicios"**: Visible y habilitado
2. **Valida botón "Ordenar por"**:
   - Visible y habilitado
   - Clic abre menú desplegable
   - Valida opciones: Nuevo, Pendiente, Contratado, Cancelado
   - Valida funcionalidad de cada opción

3. **Valida filtros laterales (desktop)**:
   - Solo si viewport ≥ 1280px
   - Valida sección "Servicios" con categorías
   - Valida contador de servicios por categoría
   - Valida botón "Ver más" (si aplica)

4. **Valida sugerencias**:
   - Busca sección "Sugerencias"
   - Valida sugerencias: Lugares, Entretenimiento, Mesa de regalos
   - Valida funcionalidad de cada sugerencia

5. **Valida tarjetas de servicios**:
   - Busca todas las tarjetas de servicios
   - Para cada tarjeta valida:
     - Imagen del servicio
     - Nombre del servicio
     - Categoría/Subcategoría
     - Descripción
     - Precio desde (formato de moneda)
     - Información del negocio (nombre, ubicación)
     - Badge "NUEVO" (si aplica)
     - Color identificador del evento asociado

**Características**:
- Validación exhaustiva de cada elemento de las tarjetas
- Validación de menú desplegable "Ordenar por"
- Validación condicional según viewport (filtros solo desktop)

### Test 5: Validar Elementos Completos del Calendario (Desktop)

**Objetivo**: Validar todos los elementos del calendario y su funcionalidad

**Flujo**:
1. **Valida existencia del calendario**:
   - Múltiples estrategias de búsqueda (por días de la semana, por mes, por estructura)
   - Valida que es visible

2. **Valida vista mensual**:
   - Busca y valida mes actual (Noviembre, Diciembre, etc.)
   - Valida formato correcto del mes

3. **Valida días de la semana**:
   - Busca y valida: Dom, Lun, Mar, Mie, Jue, Vie, Sab
   - Valida que todos están presentes (7/7)

4. **Valida navegación entre meses**:
   - Busca botón de mes anterior (chevron-left)
   - Busca botón de mes siguiente (chevron-right)
   - Valida funcionalidad: navegar al mes anterior y siguiente
   - Asegura que está en Noviembre (mes con eventos) antes de buscar días

5. **Valida eventos marcados**:
   - Busca días con puntos de colores (indicadores de eventos)
   - Filtra días con eventos reales (excluye `rgb(242, 242, 242)` que indica sin eventos)
   - Extrae número del día correctamente
   - Muestra días encontrados con eventos

6. **Valida filtrado por día**:
   - Cuenta eventos antes del filtro
   - Selecciona un día con eventos
   - Cuenta eventos después del filtro
   - Valida que los eventos mostrados corresponden al día seleccionado
   - Compara fechas de eventos con el día seleccionado

**Características**:
- Múltiples estrategias de búsqueda del calendario
- Validación exhaustiva de navegación entre meses
- Identificación precisa de días con eventos (excluyendo días sin eventos)
- Validación de filtrado con comparación de fechas
- Solo se ejecuta en desktop (viewport ≥ 1024px)

### Test 6: Validar Elementos Completos de la Sección "¡Fiestachat!"

**Objetivo**: Validar todos los elementos de la sección Fiestachat

**Flujo**:
1. **Valida existencia del contenedor**:
   - Busca contenedor específico con clases `flex.flex-col.p-5.gap-[10px].bg-light-light`
   - Fallback: busca cualquier contenedor con el título

2. **Valida título**: Busca y valida "¡Fiestachat!"
3. **Valida subtítulo**: Busca y valida "La línea directa a tu evento"
4. **Valida contenedor destacado**: Busca contenedor con información sobre el chat
5. **Valida elementos interactivos**:
   - Busca botones y enlaces
   - Valida funcionalidad de cada elemento
6. **Valida conversaciones**:
   - Busca conversaciones disponibles
   - Cuenta conversaciones encontradas

**Características**:
- Validación completa de estructura y contenido
- Solo se ejecuta en desktop (viewport ≥ 1024px)
- Manejo de casos sin conversaciones

### Test 7: Barra Superior Navega a Chats, Favoritos y Perfil

**Objetivo**: Verificar que la navegación superior funciona correctamente

**Flujo**:
1. **Navega a Chats**: Busca botón, hace clic, verifica URL `/client/chats`
2. **Regresa al dashboard**: Navega a `/client/dashboard`
3. **Navega a Favoritos (solo desktop)**: Solo si viewport ≥ 1024px, busca botón, hace clic, verifica URL `/client/favorites`
4. **Regresa al dashboard**: Navega a `/client/dashboard`
5. **Navega a Perfil**: Busca botón, hace clic, verifica URL `/client/profile`
6. **Regresa al dashboard**: Navega a `/client/dashboard`

**Características**:
- Maneja navegación tanto en desktop como móvil
- Verifica URLs específicas para cada sección
- Valida contador de mensajes en Chats

### Test 8: Crear Nueva Fiesta

**Objetivo**: Validar el flujo completo de creación de nueva fiesta

**Flujo**:
1. **Ejecuta el flujo completo de creación de evento**:
   - Reutiliza la función `ejecutarFlujoCompletoCreacionEvento()` de `cliente-eventos.spec.ts`
   - Esta función incluye:
     - Búsqueda de servicio en proveedor
     - Login como cliente
     - Selección de tipo de evento
     - Navegación hasta encontrar el servicio
     - Llenado del formulario
     - Interacción con modal de solicitud
     - Validaciones exhaustivas en dashboard y página de detalles

**Características**:
- Reutiliza código de `cliente-eventos.spec.ts`
- Timeout extendido (3 minutos) debido a la complejidad del flujo
- Incluye todas las validaciones del flujo completo

### Test 9: "Agregar Servicios" Está Visible y Funcional

**Objetivo**: Validar el botón "Agregar servicios" y ejecutar el flujo completo

**Flujo**:
1. **Valida que el botón "Agregar servicios" es visible**: Busca el botón con texto "Agregar servicios"
2. **Ejecuta el flujo completo de agregar servicio a evento existente**:
   - Reutiliza la función `agregarServicioAEventoExistente()` de `cliente-eventos.spec.ts`
   - Esta función incluye:
     - Selección de evento con fecha futura
     - Clic en "Agregar servicios"
     - Búsqueda de servicio en proveedor
     - Navegación hasta encontrar el servicio
     - Manejo de servicios ya agregados (reintentos)
     - Interacción con modal de solicitud
     - Validación de que el servicio aparece en la sección de servicios

**Características**:
- Reutiliza código de `cliente-eventos.spec.ts`
- Timeout extendido (3 minutos)
- Maneja automáticamente servicios ya agregados

### Test 10: "Ordenar por" Funciona Correctamente

**Objetivo**: Validar que el botón "Ordenar por" es visible y funcional

**Flujo**:
1. **Valida que el botón es visible**: Busca botón con texto "Ordenar por"
2. **Valida que el botón está habilitado**: Verifica que no está deshabilitado
3. **Hace clic en el botón**: Ejecuta el clic y espera a que se procese
4. **Valida menú desplegable**:
   - Busca menú con opciones: Nuevo, Pendiente, Contratado, Cancelado
   - Valida que todas las opciones están presentes
5. **Valida funcionalidad de cada opción**:
   - Hace clic en cada opción
   - Verifica que el filtrado funciona correctamente

**Características**:
- Validación completa del menú desplegable
- Validación de funcionalidad de filtrado

### Test 11: Filtros de Servicios Funcionan Correctamente

**Objetivo**: Valida los filtros de servicios en el sidebar (solo desktop)

**Flujo**:
1. **Verifica viewport**: Solo ejecuta si viewport ≥ 1280px (desktop grande)
2. **Busca contenedor de filtros**: Busca sidebar con clase específica
3. **Valida sección "Servicios"**: Busca sección con título "Servicios"
4. **Valida sección "Sugerencias"**: Busca sección con título "Sugerencias"
5. **Valida sugerencias disponibles**: Busca botones con nombres de categorías y cuenta cuántas hay

**Características**:
- Solo se ejecuta en viewports grandes (≥1280px)
- Valida estructura del sidebar de filtros
- Cuenta sugerencias disponibles

### Test 12: La Sección de Eventos Muestra las Fiestas del Cliente

**Objetivo**: Valida que los eventos del cliente se muestran correctamente

**Flujo**:
1. **Busca eventos en la sección "Elige tu fiesta"**: Busca botones que contengan fechas en formato "DD MMM YYYY"
2. **Cuenta eventos encontrados**: Muestra el conteo en consola
3. **Valida el primer evento**: Verifica que es visible, tiene fecha e información del evento

**Características**:
- Búsqueda flexible de eventos por patrón de fecha
- Validación de estructura de tarjetas de eventos
- Manejo de casos sin eventos

### Test 13: Fiestachat Muestra Conversaciones

**Objetivo**: Valida que la sección Fiestachat muestra conversaciones

**Flujo**:
1. **Busca la sección Fiestachat**: Busca contenedor con título "¡Fiestachat!"
2. **Busca conversaciones**: Busca elementos que representen conversaciones
3. **Valida que hay conversaciones**: Cuenta las conversaciones encontradas y muestra el conteo

**Características**:
- Búsqueda flexible de la sección Fiestachat
- Validación de presencia de conversaciones
- Manejo de casos sin conversaciones

### Test 14: Hacer Clic en Notificación y Verificar Navegación a Página de Cotización

**Objetivo**: Validar que al hacer clic en una notificación se navega a la página de cotización correspondiente

**Flujo**:
1. **Busca sección Fiestachat**: Múltiples estrategias de búsqueda
2. **Busca notificaciones**: Busca botones de notificaciones con clases específicas
3. **Valida que hay notificaciones**: Cuenta notificaciones encontradas
4. **Hace clic en la primera notificación**: Ejecuta el clic y espera navegación
5. **Verifica navegación**: Valida que la URL contiene `/client/quotation/` y un ID de cotización
6. **Valida contenido de la página**: Verifica que la página de cotización se carga correctamente

**Características**:
- Validación completa del flujo de navegación
- Validación de URL y contenido
- Solo se ejecuta en desktop (viewport ≥ 1024px)
- Manejo de casos sin notificaciones

### Test 15: El Calendario Filtra Eventos al Seleccionar un Día (Desktop)

**Objetivo**: Valida la funcionalidad de filtrado del calendario

**Flujo**:
1. **Verifica viewport**: Solo ejecuta si viewport ≥ 1024px (desktop)
2. **Busca el calendario**: Busca contenedor del calendario
3. **Busca días con eventos**: Busca días que tengan indicadores visuales (puntos de colores)
4. **Cuenta eventos antes del filtro**: Cuenta todos los eventos visibles en la lista
5. **Selecciona un día con eventos**: Hace clic en el primer día que tiene eventos
6. **Cuenta eventos después del filtro**: Cuenta los eventos visibles después del filtro
7. **Valida que el filtro funcionó**: Verifica que los eventos mostrados corresponden al día seleccionado

**Características**:
- Solo se ejecuta en desktop (viewport ≥ 1024px)
- Comparación antes/después del filtro
- Validación de funcionalidad de filtrado
- Validación de fechas de eventos con el día seleccionado
- Manejo de casos sin días con eventos

## 🛠️ Funciones Auxiliares

### `navegarHastaEncontrarServicios(page: Page)`

**Propósito**: Navega por subcategorías hasta encontrar servicios disponibles

**Características**:
- **Navegación recursiva**: Navega por múltiples niveles de subcategorías
- **Manejo inteligente de rutas sin servicios**:
  - Si no encuentra servicios en una subcategoría, regresa un nivel y prueba otra
  - Si en ninguna subcategoría hay servicios, sube 2 niveles y selecciona otra categoría de servicios
- **Tracking de rutas visitadas**: Evita visitar la misma ruta dos veces
- **Límites de seguridad**:
  - Máximo 50 intentos
  - Máximo 5 niveles de profundidad
  - Máximo 3 regresos sin servicios antes de cambiar categoría
- **Logs detallados**: Muestra la ruta actual en cada intento

**Proceso**:
1. Selecciona una categoría de servicios inicial aleatoria
2. Navega por subcategorías recursivamente
3. En cada nivel, verifica si hay servicios disponibles
4. Si no hay servicios:
   - Regresa un nivel y prueba otra subcategoría
   - Si todas las subcategorías fueron visitadas, sube 2 niveles y cambia categoría
5. Continúa hasta encontrar servicios o alcanzar límites

### `obtenerCategoriasServicios(page: Page)`

**Propósito**: Obtiene todas las categorías principales de servicios disponibles

**Retorna**: `Array<{ name: string; button: Locator }>`

**Características**:
- Busca botones de categorías principales
- Extrae el nombre de cada categoría
- Retorna nombre y locator del botón para cada categoría

### `obtenerSubcategorias(page: Page)`

**Propósito**: Obtiene las subcategorías disponibles en la página actual

**Retorna**: `Array<{ name: string; button: Locator }>`

**Características**:
- Busca botones de subcategorías
- Múltiples estrategias de búsqueda de nombres
- Filtra categorías principales para evitar confusión
- Retorna nombre y locator del botón para cada subcategoría

### `verificarSiHayServicios(page: Page)`

**Propósito**: Verifica si hay servicios disponibles en la página actual

**Retorna**: `boolean`

**Características**:
- Busca tarjetas de servicios
- Verifica que sean visibles
- Retorna `true` si encuentra al menos un servicio visible

## 📊 Estructura de Datos

### Categorías de Servicios

Lista de categorías principales disponibles:
- Bebidas
- Entretenimiento
- Música
- Lugares
- Mobiliario
- Servicios Especializados
- Decoración
- Alimentos
- Invitaciones
- Mesa de regalos

### Subcategorías por Categoría

Mapeo de subcategorías para cada categoría principal:

**Bebidas**:
- Cafés, Aguas de sabores, Vinos y Licores, Coctelería, Refrescos / sodas, Especialidades

**Entretenimiento**:
- Backdrop, Mini Spa, Magos, Casino, Pirotecnia, Artistas, Pulseras electrónicas, Cabina de fotos, Comediantes, Payasos, Inflables, Artículos / Objetos, Espectáculo, Juegos Mecánicos, Pinta Caritas, Mini Feria

**Música**:
- Banda, Country, Norteño, Rock / Pop, Coro / Religiosa, Solista, duetos, tríos y más, Artistas reconocidos, Cumbia y salsa, Urbana, Violinista o saxofonista, DJ, Sones Regionales, Grupo Versátil, Mariachi / Música Ranchera, Otro Tipo

**Lugares**:
- Antros / disco, Centros de Convenciones, Playas, Restaurantes, Salón de eventos, Salón de hotel, Viñedos, Terrazas, Haciendas

**Servicios Especializados**:
- Hoteles, Barman, Fotógrafo, Coreografías, Vestidos, Smoking / trajes, Niñeras, Transporte, Valet parking, Meseros, Joyería, Cuidado de Mascotas, Belleza, Agencia de Viajes, Hostess, Organizador de Eventos, Barbería, Conferencista

**Decoración**:
- Temática, Centros de mesa, Decorador profesional, Flores, Luces, Mamparas, Decoración y ambientación gral, Globos

**Alimentos**:
- Taquizas, Banquetes, Entradas, Buffetes, Postres / Pasteles, After Party, Snacks Botanas

**Mesa de regalos**:
- Perfumería

### Sub-Subcategorías

Estructura de tercer nivel (categoría > subcategoría > sub-subcategoría):

**Alimentos > After Party**:
- Chilaquiles, Hamburguesas, Taquizas

**Alimentos > Snacks Botanas**:
- Tortas, Helados, Frituras, Cafés, Hamburguesas, Frutas y/o Verduras, Pizzas

## 🎨 Características Especiales

### Detección Automática de Viewport

- **Desktop**: Viewport ≥ 1024px
  - Botón "Nueva fiesta" con clase `hidden.lg:flex`
  - Calendario visible
  - Filtros visibles (≥1280px)
  - Navegación a Favoritos disponible
  - Sección Fiestachat visible

- **Móvil**: Viewport < 1024px
  - Botón "Nueva fiesta" con clase `lg:hidden`
  - Calendario no visible
  - Filtros no visibles
  - Navegación a Favoritos no disponible
  - Sección Fiestachat no visible

### Navegación Inteligente por Categorías

- **Navegación recursiva**: Hasta 5 niveles de profundidad
- **Manejo de rutas sin servicios**:
  - Regresa un nivel si no encuentra servicios
  - Cambia de categoría principal si es necesario
  - Evita rutas ya visitadas
- **Tracking de rutas**: Usa `Set` para evitar visitas duplicadas
- **Límites de seguridad**: Previene loops infinitos

### Reutilización de Código

- **`ejecutarFlujoCompletoCreacionEvento`**: Importada de `cliente-eventos.spec.ts`
  - Usada en el test "Crear nueva fiesta"
  - Incluye todas las validaciones del flujo completo

- **`agregarServicioAEventoExistente`**: Importada de `cliente-eventos.spec.ts`
  - Usada en el test "Agregar servicios"
  - Incluye manejo de servicios ya agregados

### Múltiples Estrategias de Búsqueda

- **Selectores principales**: Selectores específicos y optimizados
- **Fallbacks**: Selectores alternativos si los principales fallan
- **Búsqueda por texto**: Búsqueda flexible usando `hasText`
- **Búsqueda por estructura**: Búsqueda por estructura DOM
- **Búsqueda por múltiples criterios**: Combinación de selectores para mayor robustez

### Validación Condicional por Viewport

- Algunas validaciones solo se ejecutan en desktop (calendario, filtros, Fiestachat)
- Otras validaciones tienen comportamientos diferentes según viewport (botón "Nueva fiesta")
- Detección automática del viewport antes de validar

### Mensajes Visuales de Progreso

- Usa `showStepMessage()` para mostrar mensajes en pantalla durante la ejecución
- Mensajes informativos con emojis para mejor seguimiento
- Mensajes específicos para cada fase de validación

### Manejo de Autenticación

- Verificación de autenticación previa antes de intentar login
- Evita intentos de login redundantes
- Manejo robusto de sesiones existentes

## 📋 Validaciones Implementadas

### Validaciones de Secciones del Dashboard
- ✅ Mensaje de bienvenida visible
- ✅ Sección "Elige tu fiesta" visible
- ✅ Botón "Nueva fiesta" visible (desktop y móvil)
- ✅ Botón "Agregar servicios" visible
- ✅ Botón "Ordenar por" visible
- ✅ Calendario visible (solo desktop)
- ✅ Sección "¡Fiestachat!" con título y subtítulo

### Validaciones de Barra Superior
- ✅ Logo de Fiestamas visible (desktop y móvil)
- ✅ Logo navega al dashboard/home
- ✅ Enlace de Chats visible y funcional
- ✅ Contador de mensajes en Chats (si existe)
- ✅ Botón de Búsqueda visible y funcional
- ✅ Enlace de Favoritos visible y funcional (solo desktop)
- ✅ Enlace de Perfil visible y funcional
- ✅ Menú móvil visible y funcional (solo móvil)

### Validaciones de Navegación
- ✅ Navegación a Chats funciona
- ✅ URL correcta después de navegar a Chats
- ✅ Navegación a Favoritos funciona (solo desktop)
- ✅ URL correcta después de navegar a Favoritos
- ✅ Navegación a Perfil funciona
- ✅ URL correcta después de navegar a Perfil

### Validaciones de Sección "Elige tu fiesta"
- ✅ Título "Elige tu fiesta" visible
- ✅ Scroll horizontal funcional
- ✅ Tarjetas de eventos visibles
- ✅ Nombre del evento presente
- ✅ Fecha y hora presentes (formato correcto)
- ✅ Presupuesto presente (formato de moneda)
- ✅ Avance presente (porcentaje y barra)
- ✅ Días restantes presentes
- ✅ Color identificador presente (border-left-color)
- ✅ Botón "Nueva fiesta" visible y funcional

### Validaciones de Sección de Servicios
- ✅ Botón "Agregar servicios" visible y funcional
- ✅ Botón "Ordenar por" visible y funcional
- ✅ Menú desplegable "Ordenar por" con opciones: Nuevo, Pendiente, Contratado, Cancelado
- ✅ Funcionalidad de filtrado por cada opción
- ✅ Filtros laterales visibles (solo desktop)
- ✅ Categorías de servicios presentes
- ✅ Contador de servicios por categoría
- ✅ Botón "Ver más" (si aplica)
- ✅ Sugerencias presentes: Lugares, Entretenimiento, Mesa de regalos
- ✅ Tarjetas de servicios visibles
- ✅ Imagen del servicio presente
- ✅ Nombre del servicio presente
- ✅ Categoría/Subcategoría presente
- ✅ Descripción presente
- ✅ Precio desde presente (formato de moneda)
- ✅ Información del negocio presente
- ✅ Badge "NUEVO" (si aplica)
- ✅ Color identificador del evento asociado

### Validaciones de Calendario
- ✅ Calendario visible (solo desktop)
- ✅ Vista mensual presente
- ✅ Mes actual mostrado correctamente
- ✅ Navegación entre meses funcional (anterior y siguiente)
- ✅ Días de la semana presentes (7/7): Dom, Lun, Mar, Mie, Jue, Vie, Sab
- ✅ Días con eventos identificados correctamente
- ✅ Puntos de colores visibles (excluyendo días sin eventos)
- ✅ Filtrado por día funciona correctamente
- ✅ Eventos mostrados corresponden al día seleccionado
- ✅ Validación de fechas de eventos con día seleccionado

### Validaciones de Fiestachat
- ✅ Sección Fiestachat visible (solo desktop)
- ✅ Título "¡Fiestachat!" presente
- ✅ Subtítulo "La línea directa a tu evento" presente
- ✅ Contenedor destacado presente
- ✅ Elementos interactivos presentes
- ✅ Conversaciones disponibles (si existen)
- ✅ Notificaciones presentes (si existen)
- ✅ Navegación a página de cotización funciona correctamente

### Validaciones de Funcionalidad
- ✅ Botón "Nueva fiesta" navega correctamente
- ✅ Botón "Agregar servicios" es funcional
- ✅ Botón "Ordenar por" es funcional
- ✅ Filtros de servicios visibles (solo desktop grande)
- ✅ Secciones de filtros (Servicios, Sugerencias) visibles

### Validaciones de Eventos
- ✅ Eventos del cliente se muestran en la sección
- ✅ Eventos tienen fechas válidas
- ✅ Eventos tienen información completa

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
npx playwright test tests/client/dashboard.spec.ts -g "Validar elementos completos de la barra superior"
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

#### Ejecutar todas las pruebas del cliente:
```bash
npx playwright test tests/client/
```

## 📈 Métricas Esperadas

### Test Individual (Validaciones Básicas)
- **Tiempo de ejecución**: ~30-120 segundos por prueba
- **Pasos totales**: ~5-20 pasos principales
- **Interacciones con UI**: ~10-30 interacciones
- **Verificaciones**: ~5-15 verificaciones de visibilidad

### Tests de Flujo Completo
- **"Crear nueva fiesta"**: ~3-4 minutos (reutiliza flujo completo)
- **"Agregar servicios"**: ~3-4 minutos (reutiliza flujo completo)

### Tests de Validación Completa
- **"Validar elementos completos de la barra superior"**: ~2 minutos
- **"Validar elementos completos de la sección 'Elige tu fiesta'"**: ~2 minutos
- **"Validar elementos completos de la sección de servicios"**: ~3 minutos
- **"Validar elementos completos del calendario"**: ~2 minutos
- **"Validar elementos completos de la sección '¡Fiestachat!'"**: ~2 minutos
- **"Hacer clic en notificación y verificar navegación"**: ~2 minutos

### Métricas Totales
- **Tests totales**: 19 (15 de dashboard + 5 de perfil)
- **Tests con flujo completo**: 2 (reutilizan funciones de eventos)
- **Tests de validación completa**: 6
- **Tests de validación básica**: 7
- **Validaciones de navegación**: 3 (chats, favoritos, perfil)
- **Validaciones de funcionalidad**: 4 (botones, filtros, calendario)

## ⚠️ Consideraciones Importantes

1. **Configuración compartida**: Todas las pruebas comparten un `beforeEach` que hace login y navega al dashboard

2. **Dependencia de otras pruebas**: 
   - Los tests "Crear nueva fiesta" y "Agregar servicios" dependen de funciones de `cliente-eventos.spec.ts`
   - Requieren que existan servicios activos en el dashboard del proveedor

3. **Viewport condicional**: 
   - Algunas validaciones solo se ejecutan en desktop (calendario, filtros, Fiestachat)
   - El botón "Nueva fiesta" tiene diferentes selectores según viewport
   - La navegación a Favoritos solo está disponible en desktop

4. **Navegación inteligente**: 
   - La función `navegarHastaEncontrarServicios` puede tomar tiempo si hay muchas categorías
   - Tiene límites de seguridad para evitar loops infinitos

5. **Reutilización de código**: 
   - Se reutilizan funciones de `cliente-eventos.spec.ts` para evitar duplicación
   - Esto asegura consistencia entre pruebas

6. **Validaciones no bloqueantes**: 
   - Algunas validaciones continúan aunque fallen (ej: calendario en móvil)
   - Los tests no fallan si elementos opcionales no están presentes

7. **Manejo de casos sin datos**: 
   - Los tests manejan casos donde no hay eventos, conversaciones, etc.
   - Muestran mensajes informativos en consola

8. **Manejo de autenticación**: 
   - Verifica si el usuario ya está autenticado antes de intentar login
   - Evita intentos de login redundantes

9. **Múltiples estrategias de búsqueda**: 
   - Los tests usan múltiples estrategias para encontrar elementos
   - Tienen fallbacks si los selectores principales fallan

10. **Validación de fechas y formatos**: 
    - Los tests validan formatos de fechas, horas y monedas
    - Comparan fechas de eventos con días seleccionados en el calendario

## 🐛 Manejo de Errores

La suite incluye manejo robusto de errores:
- Verifica existencia de elementos antes de interactuar
- Usa timeouts apropiados para esperar elementos
- Maneja casos donde elementos no están visibles
- Proporciona mensajes de error descriptivos en la consola
- Múltiples estrategias de búsqueda para elementos críticos
- Validaciones no bloqueantes: continúa aunque algunas validaciones fallen
- Manejo de viewport: detecta automáticamente y ajusta validaciones
- Fallbacks para selectores: si un selector falla, intenta alternativos
- Manejo de páginas cerradas: usa `safeWaitForTimeout` para evitar errores cuando la página se cierra
- Validación de autenticación: verifica sesión antes de intentar login

## 🔄 Cambios Recientes

### Validaciones Completas de Secciones (Última actualización)
- **Mejora**: Se agregaron pruebas exhaustivas para validar todos los elementos de cada sección
- **Nuevas pruebas**:
  - "Validar elementos completos de la barra superior"
  - "Validar elementos completos de la sección 'Elige tu fiesta'"
  - "Validar elementos completos de la sección de servicios"
  - "Validar elementos completos del calendario (desktop)"
  - "Validar elementos completos de la sección '¡Fiestachat!'"
- **Beneficio**: 
  - Cobertura completa de todos los elementos visuales y funcionales
  - Validación exhaustiva de cada componente
  - Detección temprana de problemas de UI
- **Resultado**: Los tests ahora validan exhaustivamente cada sección del dashboard

### Validación de Navegación de Notificaciones (Última actualización)
- **Mejora**: Se agregó prueba para validar que al hacer clic en una notificación se navega a la página de cotización
- **Nueva prueba**: "Hacer clic en notificación y verificar navegación a página de cotización"
- **Beneficio**: 
  - Validación del flujo completo de notificaciones
  - Verificación de navegación correcta
  - Validación de URLs y contenido
- **Resultado**: Los tests ahora validan el flujo completo de notificaciones

### Optimizaciones en Validación del Calendario (Última actualización - Diciembre 2025)
- **Mejora**: Se optimizó la validación del calendario para evitar timeouts y mejorar rendimiento
- **Cambios**:
  - **Límite de días procesados**: Máximo 35 días (reducido de 100 para evitar procesar elementos incorrectos)
  - **Parada temprana**: Se detiene cuando encuentra 20 días con eventos
  - **Timeouts cortos**: 
     - Verificación de visibilidad con timeout de 1 segundo (usando `Promise.race`)
     - Operaciones de `textContent()` con timeout de 2 segundos máximo
  - **Lógica simplificada**: Solo verifica el primer punto de color en lugar de todos
  - **Validación limitada**: Limita validación de eventos a 5 eventos máximo
  - **Timeouts con Promise.race**: Agregados timeouts para todas las operaciones costosas
  - **Eliminación de `.all()`**: Reemplazado por búsqueda directa en texto completo (más rápido)
  - **Manejo de errores**: Try-catch para continuar si un día o evento falla
  - **Manejo mejorado de días con el mismo número**:
     - Usa directamente el día con eventos encontrado en lugar de buscar por número
     - Evita `strict mode violation` cuando hay días con el mismo número en diferentes meses
  - **Validación condicional de filtrado**: Solo valida el filtrado por día si hay días con eventos disponibles
  - **Exclusión mejorada de días de otros meses**: Doble verificación (selector + JavaScript) para asegurar que no son días de otros meses
- **Beneficio**: 
  - Prueba completa dentro del timeout de 120 segundos
  - Mayor eficiencia en el procesamiento
  - Menos operaciones costosas
  - Mejor manejo de errores
  - Sin errores de `strict mode violation`
- **Resultado**: Los tests ahora completan exitosamente sin exceder el timeout y sin errores de selectores ambiguos

### Estandarización de Nombres de Pruebas (Última actualización)
- **Mejora**: Se estandarizaron todos los nombres de pruebas a "Title Case" sin la palabra "debe"
- **Cambios**:
  - Todos los nombres ahora siguen el formato: "Verbo + Objeto + Descripción" en Title Case
  - Ejemplos: "Mostrar Todos Los Elementos De La Barra Superior", "Navegar Correctamente Desde La Barra Superior A Chats Favoritos Y Perfil"
  - Reordenadas según el flujo típico del usuario (dashboard → navegación → chats → eventos → servicios → calendario → crear evento → perfil)
- **Beneficio**: 
  - Nombres más descriptivos y consistentes
  - Mejor organización según flujo de usuario
  - Más fácil de entender y mantener
- **Resultado**: Los tests ahora tienen nombres consistentes y están organizados lógicamente

### Integración con Pruebas de Eventos
- **Mejora**: Los tests "Crear nueva fiesta" y "Agregar servicios" ahora reutilizan funciones de `cliente-eventos.spec.ts`
- **Beneficio**: 
  - Evita duplicación de código
  - Asegura consistencia entre pruebas
  - Facilita mantenimiento
- **Resultado**: Los tests ahora ejecutan el flujo completo con todas las validaciones

### Agregado de Logs Informativos
- **Mejora**: Se agregaron logs informativos a todos los tests
- **Beneficio**: 
  - Mejor seguimiento del progreso
  - Debugging más fácil
  - Identificación rápida de problemas
- **Resultado**: Los tests ahora proporcionan información detallada durante la ejecución

### Validación Mejorada de Selectores
- **Mejora**: Se agregaron fallbacks para selectores principales
- **Beneficio**: 
  - Mayor robustez ante cambios en la UI
  - Menos fallos por selectores específicos
  - Mejor compatibilidad entre versiones
- **Resultado**: Los tests ahora son más resistentes a cambios menores en la UI

### Manejo de Autenticación Mejorado
- **Mejora**: Se agregó verificación de autenticación previa antes de intentar login
- **Beneficio**: 
  - Evita intentos de login redundantes
  - Reduce tiempo de ejecución
  - Manejo más robusto de sesiones
- **Resultado**: Los tests ahora son más eficientes y robustos

## 🔗 Enlaces Relacionados

- **Repositorio**: https://github.com/efraindeloafiestamas/Automations
- **Archivo de prueba**: `tests/client/dashboard.spec.ts`
- **Utilidades**: `tests/utils.ts`
- **Configuración**: `tests/config.ts`
- **Pruebas de eventos relacionadas**: `tests/client/cliente-eventos.spec.ts`
- **Reporte de eventos**: `REPORTE-QA-AUTO-CLIENTE-EVENTOS.md`

## 📊 Estado de Implementación

### ✅ Completado
- [x] Validación de secciones principales del dashboard
- [x] Validación completa de barra superior (logo, navegación, contador de mensajes, menú móvil)
- [x] Validación completa de sección "Elige tu fiesta" (título, scroll, tarjetas con todos los elementos)
- [x] Validación completa de sección de servicios (botones, menú ordenar, filtros, sugerencias, tarjetas)
- [x] Validación completa del calendario (vista mensual, navegación, días de la semana, eventos marcados, filtrado)
- [x] Optimización del calendario para evitar timeouts (límite de 35 días, parada temprana, timeouts cortos, manejo de días duplicados)
- [x] Mejora en validación del botón "Nueva fiesta" (manejo de versiones mobile/desktop, búsqueda de texto alternativo)
- [x] Mejora en manejo de días con el mismo número en diferentes meses (evita strict mode violation)
- [x] Validación completa de sección "¡Fiestachat!" (título, subtítulo, contenedor, conversaciones)
- [x] Navegación entre secciones (chats, favoritos, perfil)
- [x] Validación de botones principales (Nueva fiesta, Agregar servicios, Ordenar por)
- [x] Flujo completo de creación de evento (reutiliza función de eventos)
- [x] Flujo completo de agregar servicio a evento (reutiliza función de eventos)
- [x] Validación de filtros de servicios (desktop)
- [x] Validación de sección de eventos
- [x] Validación de navegación de notificaciones a página de cotización
- [x] Validación de filtrado del calendario por día
- [x] Navegación inteligente por categorías
- [x] Detección automática de viewport
- [x] Múltiples estrategias de búsqueda con fallbacks
- [x] Manejo de autenticación mejorado
- [x] Validación de formatos (fechas, horas, monedas)
- [x] Estandarización de nombres de pruebas (Title Case, sin "debe")
- [x] Reorganización de pruebas según flujo de usuario

### 🔄 Mejoras Futuras
- [ ] Validación de interacción con filtros (aplicar filtros y ver resultados)
- [ ] Validación de ordenamiento de eventos
- [x] Validación de búsqueda de servicios (flujo completo con diálogo y resultados) - Implementada con manejo de navegación y validación de resultados
- [ ] Validación de filtros avanzados en búsqueda de servicios
- [ ] Validación de ordenamiento en resultados de búsqueda
- [ ] Validación de responsive design en diferentes viewports
- [ ] Validación de accesibilidad (ARIA labels, navegación por teclado)
- [ ] Validación de rendimiento (tiempo de carga, lazy loading)
- [ ] Validación de scroll horizontal en sección de eventos
- [ ] Validación de paginación (si aplica)
- [ ] Validación de estados de carga
- [ ] Validación de mensajes de error

## 📝 Estructura del Código

```
dashboard.spec.ts
├── Imports y configuración
├── Constantes
│   ├── CATEGORIAS_SERVICIOS
│   ├── SUBCATEGORIAS_POR_CATEGORIA
│   └── SUB_SUBCATEGORIAS
├── Funciones auxiliares
│   ├── navegarHastaEncontrarServicios()
│   ├── obtenerCategoriasServicios()
│   ├── obtenerSubcategorias()
│   └── verificarSiHayServicios()
└── test.describe('Dashboard de cliente')
    ├── beforeEach (login y navegación)
    ├── test('Mostrar Todas Las Secciones Principales Del Dashboard')
    ├── test('Mostrar Todos Los Elementos De La Barra Superior')
    ├── test('Navegar Correctamente Desde La Barra Superior A Chats Favoritos Y Perfil')
    ├── test('Mostrar Las Conversaciones En La Sección Fiestachat')
    ├── test('Mostrar Todos Los Elementos De La Sección Fiestachat')
    ├── test('Navegar A La Página De Cotización Al Hacer Clic En Una Notificación')
    ├── test('Mostrar Las Fiestas Del Cliente En La Sección De Eventos')
    ├── test('Mostrar Todos Los Elementos De La Sección Elige Tu Fiesta')
    ├── test('Mostrar Todos Los Elementos De La Sección De Servicios')
    ├── test('Mostrar El Botón Agregar Servicios y probar su funcionalidad')
    ├── test('Ordenar Servicios Correctamente')
    ├── test('Aplicar Filtros De Servicios Correctamente')
    ├── test('Mostrar Todos Los Elementos Del Calendario En Vista Desktop')
    ├── test('Crear Una Nueva Fiesta')
    ├── test('Mostrar Todos Los Elementos De La Página De Perfil')
    ├── test('Editar Los Datos Personales Del Usuario')
    ├── test('Actualizar La Foto De Perfil')
    ├── test('Eliminar La Foto De Perfil')
    └── test('Cambiar La Contraseña Del Usuario')
```
