# Reporte: [WEB] QA-AUTO Cliente: Búsqueda y Contratación de Servicios

## 📋 Información General

- **Subtask**: `[WEB] QA-AUTO Cliente: Búsqueda y Contratación de Servicios`
- **Archivos relacionados**: 
  - `tests/client/cliente-eventos.spec.ts` (funciones principales)
  - `tests/client/dashboard.spec.ts` (funciones auxiliares)
- **Tipo de prueba**: Funcionalidades de búsqueda y contratación integradas en flujos E2E
- **Framework**: Playwright
- **Timeout**: Variable según el flujo (60-180 segundos)

## 🎯 Objetivo

Este conjunto de funcionalidades valida el proceso completo de búsqueda y contratación de servicios como cliente en la plataforma Fiestamas, incluyendo:

1. **Búsqueda de servicios** en el dashboard del proveedor
2. **Navegación por categorías y subcategorías** para encontrar servicios específicos
3. **Filtrado de servicios activos** (excluyendo inactivos)
4. **Contratación de servicios** mediante el botón "Contactar GRATIS"
5. **Manejo de servicios inactivos** durante la navegación
6. **Extracción de información** de servicios (nombre, categoría, subcategoría)

## 📊 Resumen de Pruebas

### Tests Implementados

Las funcionalidades de búsqueda y contratación están integradas en múltiples flujos:

1. **`tests/client/cliente-eventos.spec.ts`**:
   - `test('Crear Una Nueva Fiesta Y Agregar Un Servicio')` - Incluye búsqueda y contratación
   - `test('Agregar Un Servicio A Un Evento Existente')` - Incluye búsqueda y contratación

2. **`tests/client/dashboard.spec.ts`**:
   - `test('Crear Nueva Fiesta Desde El Dashboard')` - Incluye navegación por servicios

**Total de validaciones**: 3 flujos principales que incluyen búsqueda y contratación

## 📊 Funcionalidades Implementadas

### Funciones Principales

#### 1. `buscarServicioEnProveedor(page: Page)`

**Ubicación**: `tests/client/cliente-eventos.spec.ts`

**Propósito**: Busca y extrae información de un servicio aleatorio **activo** del dashboard del proveedor

**Retorna**: `Promise<{ nombre: string; categoria: string; subcategoria?: string } | null>`

**Flujo**:
1. **Navega al dashboard del proveedor** (`/provider/dashboard`)
2. **Verifica si está logueado**:
   - Si no está logueado, hace login automático
   - Si ya está logueado, continúa
3. **Accede a "Administrar servicios"**:
   - Busca y hace clic en el botón "Administrar servicios"
   - Espera a que cargue la página
4. **Busca tarjetas de servicios**:
   - Busca contenedores con clases específicas: `bg-neutral-0 rounded-6 shadow-4 border-1 border-light-neutral`
   - Cuenta todas las tarjetas encontradas
5. **Filtra servicios activos**:
   - Itera sobre todas las tarjetas de servicios
   - Para cada tarjeta:
     - Verifica que sea visible
     - Busca el botón de tres puntos (`icon-more-vertical`)
     - Hace clic en el botón para abrir el menú
     - Espera 1.5 segundos para que el menú se abra
     - Busca botón "Desactivar" (indica servicio activo) o "Activar" (indica servicio inactivo)
     - Si tiene "Desactivar", marca el servicio como activo
     - Cierra el menú presionando `Escape`
     - Continúa con el siguiente servicio
6. **Selecciona un servicio aleatorio** de los servicios activos
7. **Extrae información del servicio**:
   - **Nombre**: Busca en `p.text-medium.font-bold` o variantes
   - **Categoría y Subcategoría**: Busca en contenedor con `i.icon-tag`
     - Parsea el formato "Categoría > Subcategoría"
     - Maneja entidades HTML (`&gt;`, `&lt;`)
8. **Navega a la página de detalles del servicio**:
   - Abre el menú de tres puntos
   - Hace clic en "Ver servicio" o "Editar"
   - O hace clic directamente en la tarjeta si no hay menú
9. **Retorna la información** del servicio

**Características**:
- **Filtrado robusto de servicios activos**: Abre el menú de cada servicio para verificar su estado
- **Manejo de errores**: Si hay error al verificar un servicio, lo asume como activo (fallback)
- **Logs detallados**: Muestra cuántos servicios activos se encontraron
- **Extracción flexible de nombres**: Múltiples estrategias para encontrar el nombre del servicio
- **Extracción de categorías**: Parsea el formato "Categoría > Subcategoría" de la tarjeta

**Tiempo estimado**: ~2-5 segundos por servicio para verificar estado (depende de cantidad de servicios)

#### 2. `navegarHastaEncontrarServicioEspecifico(page: Page, nombreServicio: string, categoria?: string, subcategoria?: string)`

**Ubicación**: `tests/client/cliente-eventos.spec.ts`

**Propósito**: Navega recursivamente por categorías y subcategorías hasta encontrar un servicio específico por nombre

**Retorna**: `Promise<boolean>` (true si encuentra el servicio)

**Parámetros**:
- `page`: Página de Playwright
- `nombreServicio`: Nombre del servicio a buscar
- `categoria`: Categoría del servicio (opcional, para navegación directa)
- `subcategoria`: Subcategoría del servicio (opcional, para navegación directa)

**Flujo**:
1. **Verifica si estamos en una página de servicios**:
   - Busca títulos que contengan "Servicios"
   - Si no está en página de servicios, continúa con la búsqueda
2. **Busca el servicio por nombre**:
   - Múltiples estrategias de búsqueda:
     - Selectores específicos: `p.text-large.text-dark-neutral.font-bold`, `h5.text-dark-neutral`, etc.
     - Búsqueda genérica en todos los elementos de texto si los específicos fallan
   - Comparación flexible de nombres:
     - Comparación exacta (case-insensitive)
     - Comparación parcial (incluye)
     - Comparación de nombres base (ignora " - EDITADO" y timestamps)
3. **Verifica visibilidad del servicio**:
   - Solo procesa elementos visibles
   - Maneja versiones móvil/desktop del mismo servicio
4. **Detecta servicios inactivos**:
   - Busca texto "Inactivo" en la tarjeta
   - Busca imágenes o divs con clase `grayscale`
   - Verifica color de texto (RGB bajo indica gris)
   - Si el servicio está inactivo, lo omite y continúa buscando
5. **Hace clic en el servicio**:
   - Busca el contenedor padre clicable (div con `cursor-pointer`, button, o a)
   - Verifica que el contenedor también esté visible
   - Hace clic en el contenedor
6. **Navega a la página del servicio**:
   - Espera a que cargue la página
   - Verifica que estamos en la página de detalles del servicio
7. **Hace clic en "Contactar GRATIS"**:
   - Busca botones con texto "Contactar GRATIS"
   - Hace clic en el primer botón encontrado
   - Espera a que aparezca el formulario

**Características**:
- **Navegación inteligente**: Usa categoría y subcategoría para navegar directamente al path correcto
- **Búsqueda flexible**: Múltiples estrategias de búsqueda y comparación de nombres
- **Manejo de servicios inactivos**: Los detecta y omite automáticamente
- **Comparación de nombres robusta**: Ignora timestamps y sufijos como " - EDITADO"
- **Manejo de visibilidad**: Solo procesa elementos visibles (evita duplicados móvil/desktop)

**Límites**:
- Máximo 30 intentos
- Máximo 5 niveles de profundidad

#### 3. `navegarHastaEncontrarServicios(page: Page)`

**Ubicación**: `tests/client/dashboard.spec.ts`

**Propósito**: Navega por subcategorías hasta encontrar servicios disponibles (sin buscar un servicio específico)

**Retorna**: `Promise<boolean>` (true si encuentra servicios)

**Flujo**:
1. **Selecciona una categoría de servicios inicial aleatoria**
2. **Navega recursivamente por subcategorías**:
   - Hasta 5 niveles de profundidad
   - Máximo 50 intentos
3. **En cada nivel**:
   - Verifica si hay servicios disponibles
   - Si encuentra servicios, retorna `true`
   - Si no hay servicios, busca subcategorías
4. **Manejo de rutas sin servicios**:
   - Si no hay subcategorías en nivel 0: Sube 2 niveles y cambia categoría de servicios
   - Si no hay subcategorías en nivel > 0: Regresa un nivel y prueba otra subcategoría
   - Si todas las subcategorías fueron visitadas: Sube 2 niveles y cambia categoría
5. **Tracking de rutas visitadas**:
   - Usa `Set` para evitar visitar la misma ruta dos veces
   - Limpia rutas visitadas al cambiar de categoría principal

**Características**:
- **Navegación recursiva inteligente**: Maneja múltiples niveles de subcategorías
- **Manejo de rutas sin servicios**: Regresa y prueba alternativas automáticamente
- **Cambio de categoría principal**: Si no encuentra servicios, cambia de categoría
- **Límites de seguridad**: Previene loops infinitos

#### 4. `obtenerCategoriasServicios(page: Page)`

**Ubicación**: `tests/client/dashboard.spec.ts`

**Propósito**: Obtiene todas las categorías principales de servicios disponibles

**Retorna**: `Promise<Array<{ name: string; button: Locator }>>`

**Flujo**:
1. **Busca botones de categorías**:
   - Filtra botones que contengan párrafos con clases específicas
   - `p.text-neutral-800.font-medium`, `p.text-dark-neutral`, etc.
2. **Extrae el nombre de cada categoría**:
   - Múltiples estrategias de búsqueda
   - Filtra categorías conocidas vs desconocidas
3. **Ordena las categorías**:
   - Prioriza categorías conocidas (definidas en `CATEGORIAS_SERVICIOS`)
   - Categorías desconocidas al final
4. **Retorna array con nombre y locator** de cada categoría

**Características**:
- **Búsqueda flexible**: Múltiples selectores para encontrar nombres
- **Priorización**: Categorías conocidas primero
- **Validación**: Verifica que las categorías sean visibles

#### 5. `obtenerSubcategorias(page: Page)`

**Ubicación**: `tests/client/dashboard.spec.ts`

**Propósito**: Obtiene las subcategorías disponibles en la página actual

**Retorna**: `Promise<Array<{ name: string; button: Locator }>>`

**Flujo**:
1. **Busca botones de subcategorías**:
   - Filtra botones que contengan párrafos
   - Verifica que sean visibles
2. **Extrae el nombre de cada subcategoría**:
   - Múltiples estrategias de búsqueda
   - Filtra categorías principales para evitar confusión
3. **Retorna array con nombre y locator** de cada subcategoría

**Características**:
- **Filtrado inteligente**: Excluye categorías principales
- **Búsqueda flexible**: Múltiples selectores
- **Validación de visibilidad**: Solo procesa elementos visibles

#### 6. `obtenerSubcategoriasParaBusqueda(page: Page)`

**Ubicación**: `tests/client/cliente-eventos.spec.ts`

**Propósito**: Obtiene subcategorías para búsqueda (similar a `obtenerSubcategorias` pero con estructura diferente)

**Retorna**: `Promise<Array<{ name: string; button: any }>>`

**Características**:
- Similar a `obtenerSubcategorias` pero adaptada para el contexto de búsqueda de servicios específicos
- Usada en `navegarHastaEncontrarServicioEspecifico`

#### 7. `verificarSiHayServicios(page: Page)`

**Ubicación**: `tests/client/dashboard.spec.ts`

**Propósito**: Verifica si hay servicios disponibles en la página actual

**Retorna**: `Promise<boolean>`

**Flujo**:
1. **Busca tarjetas de servicios**:
   - Busca contenedores que representen servicios
   - Verifica que sean visibles
2. **Retorna `true`** si encuentra al menos un servicio visible
3. **Retorna `false`** si no encuentra servicios

**Características**:
- **Búsqueda rápida**: Solo verifica presencia, no detalles
- **Validación de visibilidad**: Solo cuenta servicios visibles

## 🔄 Flujos de Prueba

### Flujo 1: Búsqueda y Contratación en Creación de Evento

**Contexto**: Parte del flujo de creación de evento (`ejecutarFlujoCompletoCreacionEvento`)

**Pasos**:
1. **Buscar servicio en proveedor**:
   - Llama a `buscarServicioEnProveedor()`
   - Obtiene nombre, categoría y subcategoría del servicio
2. **Cerrar sesión del proveedor** y hacer login como cliente
3. **Navegar a "Nueva fiesta"** y seleccionar tipo de evento
4. **Navegar hasta encontrar el servicio**:
   - Llama a `navegarHastaEncontrarServicioEspecifico()`
   - Usa la categoría y subcategoría para navegación directa
   - Encuentra el servicio por nombre
5. **Hacer clic en "Contactar GRATIS"**:
   - La función `navegarHastaEncontrarServicioEspecifico` ya hace clic automáticamente
6. **Completar formulario de evento** y continuar con el flujo

**Resultado esperado**: Servicio encontrado y contratado exitosamente

### Flujo 2: Búsqueda y Contratación al Agregar Servicio a Evento Existente

**Contexto**: Parte del flujo de agregar servicio a evento existente (`agregarServicioAEventoExistente`)

**Pasos**:
1. **Seleccionar evento existente** con fecha futura
2. **Hacer clic en "Agregar servicios"**
3. **Buscar servicio en proveedor**:
   - Llama a `buscarServicioEnProveedor()`
   - Obtiene información del servicio
4. **Cerrar sesión del proveedor** y hacer login como cliente
5. **Volver a seleccionar el evento** y hacer clic en "Agregar servicios"
6. **Navegar hasta encontrar el servicio**:
   - Llama a `navegarHastaEncontrarServicioEspecifico()`
   - Maneja el caso de servicio ya agregado (reintentos)
7. **Hacer clic en "Contactar GRATIS"**:
   - La función ya hace clic automáticamente
8. **Interactuar con modal de solicitud** (sin llenar datos del evento)

**Resultado esperado**: Servicio agregado a evento existente exitosamente

### Flujo 3: Búsqueda General de Servicios (Dashboard)

**Contexto**: Parte de la validación del dashboard (`navegarHastaEncontrarServicios`)

**Pasos**:
1. **Seleccionar categoría de servicios aleatoria**
2. **Navegar recursivamente por subcategorías**:
   - Usa `obtenerCategoriasServicios()` y `obtenerSubcategorias()`
   - Usa `verificarSiHayServicios()` en cada nivel
3. **Manejar rutas sin servicios**:
   - Regresa un nivel si no encuentra servicios
   - Cambia de categoría si es necesario
4. **Retorna cuando encuentra servicios** o alcanza límites

**Resultado esperado**: Servicios encontrados en la navegación

## 🔄 Flujos de Búsqueda y Contratación

### Flujo 1: Búsqueda y Contratación en Creación de Evento

**Contexto**: Parte del flujo de creación de evento (`ejecutarFlujoCompletoCreacionEvento`)

**Pasos**:
1. **Buscar servicio en proveedor**:
   - Llama a `buscarServicioEnProveedor()`
   - Obtiene nombre, categoría y subcategoría del servicio
2. **Cerrar sesión del proveedor** y hacer login como cliente
3. **Navegar a "Nueva fiesta"** y seleccionar tipo de evento
4. **Navegar hasta encontrar el servicio**:
   - Llama a `navegarHastaEncontrarServicioEspecifico()`
   - Usa la categoría y subcategoría para navegación directa
   - Encuentra el servicio por nombre
5. **Hacer clic en "Contactar GRATIS"**:
   - La función `navegarHastaEncontrarServicioEspecifico` ya hace clic automáticamente
6. **Completar formulario de evento** y continuar con el flujo

### Flujo 2: Búsqueda y Contratación al Agregar Servicio a Evento Existente

**Contexto**: Parte del flujo de agregar servicio a evento existente (`agregarServicioAEventoExistente`)

**Pasos**:
1. **Seleccionar evento existente** con fecha futura
2. **Hacer clic en "Agregar servicios"**
3. **Buscar servicio en proveedor**:
   - Llama a `buscarServicioEnProveedor()`
   - Obtiene información del servicio
4. **Cerrar sesión del proveedor** y hacer login como cliente
5. **Volver a seleccionar el evento** y hacer clic en "Agregar servicios"
6. **Navegar hasta encontrar el servicio**:
   - Llama a `navegarHastaEncontrarServicioEspecifico()`
   - Maneja el caso de servicio ya agregado (reintentos)
7. **Hacer clic en "Contactar GRATIS"**:
   - La función ya hace clic automáticamente
8. **Interactuar con modal de solicitud** (sin llenar datos del evento)

### Flujo 3: Búsqueda General de Servicios (Dashboard)

**Contexto**: Parte de la validación del dashboard (`navegarHastaEncontrarServicios`)

**Pasos**:
1. **Seleccionar categoría de servicios aleatoria**
2. **Navegar recursivamente por subcategorías**:
   - Usa `obtenerCategoriasServicios()` y `obtenerSubcategorias()`
   - Usa `verificarSiHayServicios()` en cada nivel
3. **Manejar rutas sin servicios**:
   - Regresa un nivel si no encuentra servicios
   - Cambia de categoría si es necesario
4. **Retorna cuando encuentra servicios** o alcanza límites

## 🛠️ Funciones Principales

Ver sección "📊 Funcionalidades Implementadas" para detalles completos de cada función.

## 📊 Datos de Prueba

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

Mapeo completo de subcategorías (ver `dashboard.spec.ts` para lista completa):

**Bebidas**: Cafés, Aguas de sabores, Vinos y Licores, Coctelería, Refrescos / sodas, Especialidades

**Entretenimiento**: Backdrop, Mini Spa, Magos, Casino, Pirotecnia, Artistas, Pulseras electrónicas, Cabina de fotos, Comediantes, Payasos, Inflables, Artículos / Objetos, Espectáculo, Juegos Mecánicos, Pinta Caritas, Mini Feria

**Música**: Banda, Country, Norteño, Rock / Pop, Coro / Religiosa, Solista, duetos, tríos y más, Artistas reconocidos, Cumbia y salsa, Urbana, Violinista o saxofonista, DJ, Sones Regionales, Grupo Versátil, Mariachi / Música Ranchera, Otro Tipo

**Lugares**: Antros / disco, Centros de Convenciones, Playas, Restaurantes, Salón de eventos, Salón de hotel, Viñedos, Terrazas, Haciendas

**Servicios Especializados**: Hoteles, Barman, Fotógrafo, Coreografías, Vestidos, Smoking / trajes, Niñeras, Transporte, Valet parking, Meseros, Joyería, Cuidado de Mascotas, Belleza, Agencia de Viajes, Hostess, Organizador de Eventos, Barbería, Conferencista

**Decoración**: Temática, Centros de mesa, Decorador profesional, Flores, Luces, Mamparas, Decoración y ambientación gral, Globos

**Alimentos**: Taquizas, Banquetes, Entradas, Buffetes, Postres / Pasteles, After Party, Snacks Botanas

**Mesa de regalos**: Perfumería

### Sub-Subcategorías (Tercer Nivel)

**Alimentos > After Party**: Chilaquiles, Hamburguesas, Taquizas

**Alimentos > Snacks Botanas**: Tortas, Helados, Frituras, Cafés, Hamburguesas, Frutas y/o Verduras, Pizzas

### Formatos de Datos

- **Nombres de servicios**: Pueden incluir sufijos como " - EDITADO 2025-11-20T17:19:11"
- **Categorías**: Formato "Categoría > Subcategoría" con entidades HTML (`&gt;`, `&lt;`)
- **Estados de servicios**: "Activo" (botón "Desactivar") o "Inactivo" (botón "Activar")

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

Mapeo completo de subcategorías (ver `dashboard.spec.ts` para lista completa):

**Bebidas**: Cafés, Aguas de sabores, Vinos y Licores, Coctelería, Refrescos / sodas, Especialidades

**Entretenimiento**: Backdrop, Mini Spa, Magos, Casino, Pirotecnia, Artistas, Pulseras electrónicas, Cabina de fotos, Comediantes, Payasos, Inflables, Artículos / Objetos, Espectáculo, Juegos Mecánicos, Pinta Caritas, Mini Feria

**Música**: Banda, Country, Norteño, Rock / Pop, Coro / Religiosa, Solista, duetos, tríos y más, Artistas reconocidos, Cumbia y salsa, Urbana, Violinista o saxofonista, DJ, Sones Regionales, Grupo Versátil, Mariachi / Música Ranchera, Otro Tipo

**Lugares**: Antros / disco, Centros de Convenciones, Playas, Restaurantes, Salón de eventos, Salón de hotel, Viñedos, Terrazas, Haciendas

**Servicios Especializados**: Hoteles, Barman, Fotógrafo, Coreografías, Vestidos, Smoking / trajes, Niñeras, Transporte, Valet parking, Meseros, Joyería, Cuidado de Mascotas, Belleza, Agencia de Viajes, Hostess, Organizador de Eventos, Barbería, Conferencista

**Decoración**: Temática, Centros de mesa, Decorador profesional, Flores, Luces, Mamparas, Decoración y ambientación gral, Globos

**Alimentos**: Taquizas, Banquetes, Entradas, Buffetes, Postres / Pasteles, After Party, Snacks Botanas

**Mesa de regalos**: Perfumería

### Sub-Subcategorías (Tercer Nivel)

**Alimentos > After Party**: Chilaquiles, Hamburguesas, Taquizas

**Alimentos > Snacks Botanas**: Tortas, Helados, Frituras, Cafés, Hamburguesas, Frutas y/o Verduras, Pizzas

## 🎨 Características Especiales

### Filtrado Inteligente de Servicios Activos

**Método de verificación**:
- Abre el menú de tres puntos de cada servicio
- Verifica si tiene botón "Desactivar" (activo) o "Activar" (inactivo)
- Cierra el menú con `Escape`

**Proceso**:
1. Itera sobre todas las tarjetas de servicios
2. Para cada tarjeta, busca el botón de tres puntos (`icon-more-vertical`)
3. Hace clic en el botón para abrir el menú
4. Espera 1.5 segundos para que el menú se abra completamente
5. Busca botones "Desactivar" o "Activar" en el menú
6. Si encuentra "Desactivar", marca el servicio como activo
7. Cierra el menú presionando `Escape`
8. Continúa con el siguiente servicio

**Logs informativos**: Muestra cuántos servicios activos se encontraron y cuáles se omitieron

**Manejo de errores**: Si hay un error al verificar un servicio, lo asume como activo para no perder servicios válidos

**Rendimiento**: El tiempo de filtrado depende del número de servicios (aproximadamente 1.5-2 segundos por servicio)

### Navegación Inteligente por Categorías

**Navegación directa**:
- Si se proporciona categoría y subcategoría, navega directamente al path correcto
- Evita navegación aleatoria innecesaria

**Navegación recursiva**:
- Hasta 5 niveles de profundidad
- Máximo 30-50 intentos (depende de la función)
- Tracking de rutas visitadas para evitar loops

**Manejo de rutas sin servicios**:
- Regresa un nivel si no encuentra servicios
- Cambia de categoría principal si es necesario
- Evita rutas ya visitadas

### Detección de Servicios Inactivos

**En el dashboard del proveedor**:
- Abre el menú de tres puntos de cada servicio
- Verifica si tiene botón "Desactivar" (activo) o "Activar" (inactivo)
- Solo selecciona servicios que tengan botón "Desactivar"
- Cierra el menú con `Escape` antes de continuar

**En la navegación del cliente**:
- Detecta servicios marcados como "Inactivo" en el texto
- Detecta imágenes o divs con clase `grayscale`
- Detecta texto con color gris (RGB bajo)
- Los omite automáticamente
- Busca servicios activos alternativos si el objetivo está inactivo

### Comparación Flexible de Nombres

**Estrategias de comparación**:
- Comparación exacta (case-insensitive)
- Comparación parcial (incluye)
- Comparación de nombres base (ignora " - EDITADO" y timestamps)
- Normalización de texto (trim, lowercase)

**Manejo de variantes**:
- Ignora sufijos como " - EDITADO 2025-11-20T17:19:11"
- Compara solo la parte base del nombre
- Permite coincidencias parciales

### Extracción de Información de Servicios

**Nombre del servicio**:
- Múltiples estrategias de búsqueda
- Selectores específicos: `p.text-medium.font-bold`
- Fallbacks: `p.font-bold`, `p.text-dark-neutral`
- Búsqueda en todos los párrafos si es necesario
- Filtrado de textos no relevantes ("Filtrar", "Pendientes", etc.)

**Categoría y Subcategoría**:
- Busca en contenedor con `i.icon-tag`
- Parsea formato "Categoría > Subcategoría"
- Maneja entidades HTML (`&gt;`, `&lt;`)
- Extrae partes individuales si es necesario

## 📋 Validaciones Implementadas

### Validaciones de Búsqueda
- ✅ Servicios activos filtrados correctamente
- ✅ Información del servicio extraída (nombre, categoría, subcategoría)
- ✅ Navegación por categorías funciona
- ✅ Navegación por subcategorías funciona
- ✅ Servicios inactivos detectados y omitidos
- ✅ Servicios encontrados por nombre (exacto y parcial)

### Validaciones de Contratación
- ✅ Botón "Contactar GRATIS" encontrado
- ✅ Clic en "Contactar GRATIS" ejecutado
- ✅ Formulario de evento aparece después del clic
- ✅ Navegación a página de detalles del servicio funciona

### Validaciones de Navegación
- ✅ Categorías de servicios obtenidas correctamente
- ✅ Subcategorías obtenidas correctamente
- ✅ Rutas sin servicios manejadas correctamente
- ✅ Cambio de categoría principal funciona
- ✅ Regreso de niveles funciona

## 🚀 Cómo Ejecutar las Pruebas

### Prerrequisitos
1. Tener Node.js instalado
2. Tener las dependencias instaladas: `npm install`
3. Configurar las credenciales en `tests/config.ts`:
   - `CLIENT_EMAIL`
   - `CLIENT_PASSWORD`
   - `PROVIDER_EMAIL`
   - `PROVIDER_PASSWORD`
   - `DEFAULT_BASE_URL`

### Ejecución

Las funcionalidades de búsqueda y contratación están integradas en los flujos de eventos:

#### Ejecutar flujo completo de creación de evento (incluye búsqueda y contratación):
```bash
npx playwright test tests/client/cliente-eventos.spec.ts -g "Nueva fiesta"
```

#### Ejecutar flujo de agregar servicio (incluye búsqueda y contratación):
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Agregar servicios"
```

#### Ejecutar validación de navegación de servicios:
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Crear nueva fiesta"
```

#### Ejecutar en modo UI (recomendado para debugging):
```bash
npx playwright test tests/client/cliente-eventos.spec.ts --ui
```

#### Ejecutar en modo headed (ver el navegador):
```bash
npx playwright test tests/client/cliente-eventos.spec.ts --headed
```

## 📈 Métricas Esperadas

### Búsqueda de Servicio en Proveedor
- **Tiempo de ejecución**: ~2-5 segundos por servicio para verificar estado
- **Servicios verificados**: Todos los servicios en el dashboard
- **Interacciones**: 1 clic por servicio (menú de tres puntos) + 1 tecla (Escape)
- **Extracción de información**: Nombre, categoría, subcategoría

### Navegación hasta Encontrar Servicio Específico
- **Tiempo de ejecución**: ~10-30 segundos (depende de la profundidad)
- **Niveles máximos**: 5 niveles de profundidad
- **Intentos máximos**: 30 intentos
- **Búsquedas**: Múltiples estrategias por intento
- **Servicios inactivos omitidos**: Automáticamente

### Navegación General hasta Encontrar Servicios
- **Tiempo de ejecución**: ~20-60 segundos (depende de la estructura)
- **Niveles máximos**: 5 niveles de profundidad
- **Intentos máximos**: 50 intentos
- **Cambios de categoría**: Hasta agotar todas las categorías disponibles

## ⚠️ Consideraciones Importantes

1. **Dependencia de servicios activos**: 
   - Requiere que existan servicios **activos** en el dashboard del proveedor
   - La verificación de estado puede tomar tiempo si hay muchos servicios
   - Si no hay servicios activos, las funciones retornan `null` o `false`

2. **Verificación de estado del servicio**: 
   - Abre el menú de tres puntos de cada servicio
   - Verifica si tiene botón "Desactivar" (activo) o "Activar" (inactivo)
   - Cierra el menú con `Escape` antes de continuar
   - Tiempo adicional: ~1.5-2 segundos por servicio

3. **Navegación por categorías**: 
   - Puede tomar tiempo si hay muchas categorías y subcategorías
   - Tiene límites de seguridad para evitar loops infinitos
   - Maneja rutas sin servicios automáticamente

4. **Comparación de nombres**: 
   - Usa comparación flexible para manejar variantes
   - Ignora timestamps y sufijos como " - EDITADO"
   - Permite coincidencias parciales

5. **Servicios inactivos**: 
   - Se detectan y omiten automáticamente durante la navegación
   - Se filtran antes de seleccionar un servicio en el proveedor

6. **Manejo de visibilidad**: 
   - Solo procesa elementos visibles
   - Maneja versiones móvil/desktop del mismo servicio
   - Evita duplicados

7. **Reintentos automáticos**: 
   - En el flujo de agregar servicio a evento existente
   - Hasta 5 intentos si el servicio ya está agregado
   - Busca otro servicio automáticamente

## 🐛 Manejo de Errores

Las funciones incluyen manejo robusto de errores:
- Verifica existencia de elementos antes de interactuar
- Usa timeouts apropiados para esperar elementos
- Maneja casos donde elementos no están visibles
- Proporciona mensajes de error descriptivos en la consola
- Múltiples estrategias de búsqueda para elementos críticos
- Fallbacks para selectores si los principales fallan
- Manejo de errores durante verificación de estado (asume activo como fallback)
- Validaciones no bloqueantes: continúa aunque algunas validaciones fallen
- Debugging detallado: lista elementos disponibles cuando no encuentra el objetivo

## 🔄 Cambios Recientes

### Mejora en Filtrado de Servicios Activos (Última actualización)
- **Problema anterior**: La búsqueda seleccionaba servicios aleatoriamente sin verificar si estaban activos
- **Solución implementada**: 
  - Verificación del estado del servicio abriendo el menú de tres puntos
  - Filtrado explícito de servicios activos antes de seleccionar uno
  - Logs detallados del proceso de filtrado
  - Manejo robusto de errores durante la verificación
- **Resultado**: Las funciones ahora garantizan que solo seleccionan servicios activos

### Mejora en Extracción de Categorías (Última actualización)
- **Problema anterior**: No se extraían categoría y subcategoría de la tarjeta del servicio
- **Solución implementada**: 
  - Búsqueda en contenedor con `i.icon-tag`
  - Parseo del formato "Categoría > Subcategoría"
  - Manejo de entidades HTML
- **Resultado**: Ahora se extraen categoría y subcategoría para navegación directa

### Mejora en Detección de Servicios Inactivos (Última actualización)
- **Problema anterior**: Los servicios inactivos causaban fallos durante la navegación
- **Solución implementada**: 
  - Detección por texto "Inactivo"
  - Detección por clases CSS `grayscale`
  - Detección por color de texto (RGB bajo)
  - Omisión automática de servicios inactivos
- **Resultado**: La navegación ahora omite servicios inactivos automáticamente

### Mejora en Comparación de Nombres (Última actualización)
- **Problema anterior**: Los nombres con timestamps no coincidían
- **Solución implementada**: 
  - Comparación de nombres base (ignora " - EDITADO" y timestamps)
  - Comparación flexible (exacta, parcial, includes)
  - Normalización de texto
- **Resultado**: La búsqueda ahora encuentra servicios aunque tengan timestamps

## 🔗 Enlaces Relacionados

- **Repositorio**: https://github.com/efraindeloafiestamas/Automations
- **Archivos principales**: 
  - `tests/client/cliente-eventos.spec.ts`
  - `tests/client/dashboard.spec.ts`
- **Utilidades**: `tests/utils.ts`
- **Configuración**: `tests/config.ts`
- **Reporte de eventos**: `REPORTE-QA-AUTO-CLIENTE-EVENTOS.md`
- **Reporte de dashboard**: `REPORTE-QA-AUTO-CLIENTE-DASHBOARD.md`

## 📊 Estado de Implementación

### ✅ Completado
- [x] Búsqueda de servicios en dashboard del proveedor
- [x] Filtrado de servicios activos
- [x] Extracción de información de servicios (nombre, categoría, subcategoría)
- [x] Navegación por categorías y subcategorías
- [x] Búsqueda de servicio específico por nombre
- [x] Detección y omisión de servicios inactivos
- [x] Clic en "Contactar GRATIS" automático
- [x] Navegación inteligente usando categoría/subcategoría
- [x] Comparación flexible de nombres
- [x] Manejo de rutas sin servicios
- [x] Reintentos automáticos para servicios ya agregados

### 🔄 Mejoras Futuras
- [ ] Búsqueda por texto libre (buscador)
- [ ] Filtrado por precio
- [ ] Filtrado por ubicación
- [ ] Ordenamiento de resultados
- [ ] Validación de imágenes de servicios
- [ ] Validación de descripciones
- [ ] Validación de precios y cotizaciones
- [ ] Búsqueda por proveedor
- [ ] Filtrado por calificaciones

## 🔄 Funcionalidades Pendientes de Implementación

Las siguientes funcionalidades están pendientes de implementación:

1. **Búsqueda por texto libre**: Implementar búsqueda usando el buscador de la plataforma
2. **Filtrado por precio**: Filtrar servicios por rango de precios
3. **Filtrado por ubicación**: Filtrar servicios por ubicación geográfica
4. **Ordenamiento de resultados**: Ordenar servicios por precio, calificación, etc.
5. **Validación de imágenes de servicios**: Verificar que las imágenes se carguen correctamente
6. **Validación de descripciones**: Verificar que las descripciones de servicios sean correctas
7. **Validación de precios y cotizaciones**: Verificar que los precios se muestren correctamente
8. **Búsqueda por proveedor**: Buscar servicios de un proveedor específico
9. **Filtrado por calificaciones**: Filtrar servicios por calificación mínima

## 💡 Recomendaciones

### Prioridades de Mejora

1. **Alta prioridad**:
   - Búsqueda por texto libre (buscador)
   - Filtrado por precio
   - Validación de imágenes de servicios

2. **Media prioridad**:
   - Filtrado por ubicación
   - Ordenamiento de resultados
   - Validación de descripciones

3. **Baja prioridad**:
   - Validación de precios y cotizaciones
   - Búsqueda por proveedor
   - Filtrado por calificaciones

### Mejores Prácticas

1. **Filtrado de servicios activos**: Siempre verificar el estado del servicio antes de seleccionarlo
2. **Navegación inteligente**: Usar categoría y subcategoría para navegación directa cuando sea posible
3. **Manejo de servicios inactivos**: Detectar y omitir servicios inactivos automáticamente
4. **Comparación flexible de nombres**: Usar comparación flexible para manejar variantes de nombres
5. **Logs detallados**: Proporcionar información completa para debugging

## 📊 Métricas de Cobertura

### Cobertura Actual
- **Búsqueda de servicios en proveedor**: ✅ 100% Implementada
- **Filtrado de servicios activos**: ✅ 100% Implementada
- **Extracción de información de servicios**: ✅ 100% Implementada
- **Navegación por categorías y subcategorías**: ✅ 100% Implementada
- **Búsqueda de servicio específico por nombre**: ✅ 100% Implementada
- **Detección y omisión de servicios inactivos**: ✅ 100% Implementada
- **Clic en "Contactar GRATIS"**: ✅ 100% Implementada
- **Navegación inteligente usando categoría/subcategoría**: ✅ 100% Implementada
- **Comparación flexible de nombres**: ✅ 100% Implementada
- **Manejo de rutas sin servicios**: ✅ 100% Implementada
- **Reintentos automáticos para servicios ya agregados**: ✅ 100% Implementada

### Cobertura Objetivo
- **Búsqueda de servicios en proveedor**: ✅ 100% (alcanzado)
- **Filtrado de servicios activos**: ✅ 100% (alcanzado)
- **Extracción de información de servicios**: ✅ 100% (alcanzado)
- **Navegación por categorías y subcategorías**: ✅ 100% (alcanzado)
- **Búsqueda de servicio específico por nombre**: ✅ 100% (alcanzado)
- **Detección y omisión de servicios inactivos**: ✅ 100% (alcanzado)
- **Clic en "Contactar GRATIS"**: ✅ 100% (alcanzado)
- **Navegación inteligente usando categoría/subcategoría**: ✅ 100% (alcanzado)
- **Comparación flexible de nombres**: ✅ 100% (alcanzado)
- **Manejo de rutas sin servicios**: ✅ 100% (alcanzado)
- **Reintentos automáticos para servicios ya agregados**: ✅ 100% (alcanzado)
- **Búsqueda por texto libre**: 🔄 Pendiente de implementación
- **Filtrado por precio**: 🔄 Pendiente de implementación
- **Filtrado por ubicación**: 🔄 Pendiente de implementación
- **Ordenamiento de resultados**: 🔄 Pendiente de implementación
- **Validación de imágenes de servicios**: 🔄 Pendiente de implementación
- **Validación de descripciones**: 🔄 Pendiente de implementación
- **Validación de precios y cotizaciones**: 🔄 Pendiente de implementación
- **Búsqueda por proveedor**: 🔄 Pendiente de implementación
- **Filtrado por calificaciones**: 🔄 Pendiente de implementación

## 📝 Notas Adicionales

1. **Estado actual**: 
   - Todas las funcionalidades principales de búsqueda y contratación están implementadas
   - Las funciones están integradas en múltiples flujos de pruebas
   - Las funciones usan múltiples estrategias de búsqueda para mayor robustez

2. **Próximos pasos sugeridos**:
   - Implementar búsqueda por texto libre
   - Agregar filtrado por precio y ubicación
   - Implementar validaciones de imágenes y descripciones

3. **Dependencias**:
   - Requiere estar logueado como proveedor para buscar servicios
   - Requiere estar logueado como cliente para contratar servicios
   - Requiere que existan servicios activos en el dashboard del proveedor
   - Las funciones de navegación requieren que existan categorías y subcategorías

4. **Rendimiento**:
   - El filtrado de servicios activos puede tomar tiempo si hay muchos servicios (~1.5-2 segundos por servicio)
   - La navegación recursiva puede tomar tiempo si hay muchas categorías y subcategorías (~10-60 segundos)
   - Las funciones tienen límites de seguridad para evitar loops infinitos

## 📝 Estructura del Código

```
Funcionalidades de Búsqueda y Contratación
├── cliente-eventos.spec.ts
│   ├── buscarServicioEnProveedor()
│   │   ├── Login como proveedor
│   │   ├── Navegación a servicios
│   │   ├── Filtrado de servicios activos
│   │   │   ├── Itera sobre todas las tarjetas
│   │   │   ├── Abre menú de 3 puntos de cada servicio
│   │   │   ├── Verifica botón "Desactivar" (activo) o "Activar" (inactivo)
│   │   │   └── Cierra menú con Escape
│   │   ├── Selección aleatoria de servicio activo
│   │   └── Extracción de datos del servicio
│   ├── navegarHastaEncontrarServicioEspecifico()
│   │   ├── Navegación recursiva por categorías
│   │   ├── Búsqueda del servicio objetivo
│   │   ├── Manejo de servicios inactivos
│   │   └── Clic en "Contactar GRATIS"
│   └── obtenerSubcategoriasParaBusqueda()
│       └── Extracción de subcategorías disponibles
└── dashboard.spec.ts
    ├── navegarHastaEncontrarServicios()
    │   ├── Navegación recursiva por categorías
    │   ├── Manejo de rutas sin servicios
    │   └── Cambio de categoría principal
    ├── obtenerCategoriasServicios()
    │   └── Extracción de categorías principales
    ├── obtenerSubcategorias()
    │   └── Extracción de subcategorías
    └── verificarSiHayServicios()
        └── Verificación rápida de presencia
```

