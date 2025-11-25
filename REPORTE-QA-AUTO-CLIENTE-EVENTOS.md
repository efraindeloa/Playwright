# Reporte: [WEB] QA-AUTO Cliente: Eventos (Creación, Validación, Servicios)

## 📋 Información General

- **Subtask**: `[WEB] QA-AUTO Cliente: Eventos (Creación, Validación, Servicios)`
- **Archivo de pruebas**: `tests/client/cliente-eventos.spec.ts`
- **Tipo de prueba**: End-to-End (E2E)
- **Framework**: Playwright
- **Timeout base**: 180 segundos (3 minutos)
- **Timeout bloques**: 300 segundos (5 minutos por bloque)
- **Viewport**: 1280x720

## 🎯 Objetivo

Este conjunto de pruebas automatizadas valida el flujo completo de creación y gestión de eventos como cliente en la plataforma Fiestamas, incluyendo:

1. **Creación de eventos** con diferentes tipos (Cumpleaños, Bautizo, Baby Shower, etc.)
2. **Validación exhaustiva** de datos en múltiples niveles (diálogos, dashboard, página de detalles)
3. **Gestión de servicios** asociados a eventos (búsqueda, contratación, agregar a eventos existentes)
4. **Integración con Fiestachat** (notificaciones y mensajería)

## 📊 Resumen de Pruebas

### Tests Implementados

1. **`test('Nueva fiesta')`**
   - Crea un evento completo con validaciones exhaustivas
   - Tipo de evento: Aleatorio
   - Timeout: 180 segundos

2. **`test('Crear eventos - Bloque 1 (tipos 1-3)')`**
   - Crea eventos de los primeros 3 tipos disponibles
   - Timeout: 300 segundos

3. **`test('Crear eventos - Bloque 2 (tipos 4-6)')`**
   - Crea eventos de los siguientes 3 tipos
   - Timeout: 300 segundos

4. **`test('Crear eventos - Bloque 3 (tipos 7-9)')`**
   - Crea eventos de los siguientes 3 tipos
   - Timeout: 300 segundos

5. **`test('Crear eventos - Bloque 4 (tipos 10-12)')`**
   - Crea eventos de los siguientes 3 tipos
   - Timeout: 300 segundos

6. **`test('Crear eventos - Bloque 5 (tipos 13-15)')`**
   - Crea eventos de los últimos tipos disponibles
   - Timeout: 300 segundos

**Total de tests**: 6 tests (1 individual + 5 bloques)

## 🔄 Flujos de Prueba

### Flujo 1: Creación Completa de Evento (`ejecutarFlujoCompletoCreacionEvento`)

#### Fase 1: Preparación - Búsqueda de Servicio en Proveedor
1. **Inicia sesión como proveedor** (si no está logueado)
2. **Navega al dashboard del proveedor**
3. **Accede a "Administrar servicios"**
4. **Filtra servicios activos**:
   - Itera sobre todas las tarjetas de servicios
   - Para cada servicio, abre el menú de tres puntos
   - Verifica si tiene botón "Desactivar" (servicio activo) o "Activar" (servicio inactivo)
   - Cierra el menú presionando `Escape`
   - Solo selecciona servicios que estén activos
5. **Selecciona un servicio aleatorio** de los servicios activos
6. **Extrae información del servicio**:
   - Nombre del servicio
   - Categoría (ej: "Alimentos", "Decoración")
   - Subcategoría (ej: "Entradas", "Decorador profesional")
7. **Cierra sesión del proveedor** y limpia cookies/storage de forma segura

#### Fase 2: Creación del Evento como Cliente
1. **Inicia sesión como cliente**
2. **Navega al dashboard del cliente**
3. **Hace clic en "Nueva fiesta"**
4. **Selecciona una categoría de evento aleatoria** (Cumpleaños, Bautizo, Baby Shower, etc.)
5. **Navega por categorías y subcategorías** hasta encontrar el servicio específico extraído del proveedor
   - Usa la categoría y subcategoría extraídas para navegación directa
   - Maneja servicios inactivos (los omite automáticamente)
6. **Hace clic en el servicio** y luego en "Contactar GRATIS"
7. **Llena el formulario de evento**:
   - **Nombre del festejado**: Nombre y apellido aleatorios
   - **Fecha**: Selecciona un día futuro usando el date picker (Flatpickr)
   - **Hora**: Selecciona hora (1-12) y minuto (0, 15, 30, 45) usando reloj analógico
   - **Ciudad**: Escribe una ciudad y selecciona de las sugerencias de Google Places Autocomplete
   - **Número de invitados**: Número aleatorio entre 20 y 200
8. **Hace clic en "Crear evento"**

#### Fase 3: Validación del Diálogo de Confirmación Pre-Solicitud
1. **Valida el diálogo de confirmación** que aparece después de hacer clic en "Crear evento"
2. **Verifica que el diálogo contiene**:
   - Texto que menciona el servicio ("Dile aquí a [SERVICIO]...")
   - Tipo de evento seleccionado
   - Nombre del festejado
   - Número de invitados
   - Ciudad (con validación por palabras si no coincide exactamente)
   - Hora (con validación de formato 12h/24h y componentes individuales)

#### Fase 4: Interacción con Modal de Solicitud
1. **Espera a que aparezca el modal de solicitud** (`#PrequotationRequestForm`)
2. **Selecciona variedades del servicio**:
   - 40% de probabilidad: Hace clic en "Seleccionar todo"
   - 60% de probabilidad: Selecciona checkboxes aleatorios
3. **Llena el campo "Solicitudes"** con un mensaje aleatorio
4. **Hace clic en "Solicitar"**
5. **Confirma el diálogo "Solicitud enviada"** haciendo clic en "OK"

#### Fase 5: Verificación en Dashboard
1. **Espera a que regrese automáticamente al dashboard del cliente**
2. **Valida que el evento aparece en la lista general** (sin filtrar por día)
   - Busca el evento por nombre del festejado
   - Lista eventos disponibles para debugging si no se encuentra
3. **Interactúa con el calendario**:
   - Localiza el calendario en el dashboard
   - Obtiene el día del evento desde la fecha guardada
   - Navega al mes correcto si es necesario (hasta 3 clics adelante)
   - Selecciona el día del evento para filtrar
4. **Valida eventos filtrados por día**:
   - Verifica que el evento aparece en la lista filtrada
   - Valida que todos los eventos mostrados corresponden al día seleccionado
   - Extrae y valida fechas de las tarjetas de eventos
5. **Verifica que los datos del evento coinciden en la tarjeta**:
   - Nombre del festejado
   - Fecha (considerando diferentes formatos: DD-MM-YYYY, DD/MM/YYYY, etc.)
   - Hora (considerando formatos 12h/24h)
   - Ciudad (considerando abreviaciones y partes de la ciudad)
   - Número de invitados

#### Fase 6: Verificación en Página de Detalles
1. **Hace clic en la tarjeta del evento** para abrir sus detalles
2. **Verifica que el servicio aparece en la sección de servicios**:
   - Lista todos los servicios encontrados (hasta 5 para validación)
   - Busca el servicio específico por nombre
   - Verifica que tiene estado "PENDIENTE"
3. **Valida datos del evento en la página completa**:
   - Tipo de evento
   - Nombre del festejado
   - Ciudad
   - Número de invitados
4. **Verifica notificaciones en Fiestachat** (validación detallada):
   - Título "¡Fiestachat!" visible
   - Subtítulo "La línea directa a tu evento" visible
   - Notificaciones encontradas
   - Texto de solicitud en la notificación
   - Fecha y hora en la notificación (múltiples formatos)
   - Nombre del servicio en la notificación
   - Mensaje específico de la notificación
   - Validación de coincidencia del nombre del servicio

### Flujo 2: Creación de Eventos por Tipo (`crearEventoDeTipoEspecifico`)

Similar al Flujo 1, pero permite especificar el tipo de evento en lugar de seleccionarlo aleatoriamente:

1. **Busca un servicio en el dashboard del proveedor**
2. **Cierra sesión y hace login como cliente**
3. **Navega a "Nueva fiesta"**
4. **Selecciona el tipo de evento específico** (pasado como parámetro)
5. **Navega hasta encontrar el servicio**
6. **Completa el formulario de evento**
7. **Interactúa con el modal de solicitud**
8. **Confirma la solicitud enviada**

### Flujo 3: Agregar Servicio a Evento Existente (`agregarServicioAEventoExistente`)

1. **Selecciona un evento existente del dashboard**:
   - Filtra eventos con fecha futura (no eventos pasados)
   - Selecciona un evento aleatorio de los disponibles
   - Guarda el índice del evento seleccionado
2. **Hace clic en "Agregar servicios"**
3. **Busca un servicio en el dashboard del proveedor**
4. **Cierra sesión del proveedor y hace login como cliente**
5. **Vuelve a seleccionar el mismo evento** (usando el índice guardado)
6. **Hace clic en "Agregar servicios" nuevamente**
7. **Navega hasta encontrar el servicio específico**
8. **Verifica si el servicio ya está agregado**:
   - Detecta el mensaje "Servicio previamente agregado"
   - Si aparece, cierra el diálogo y busca otro servicio
   - Repite hasta encontrar un servicio no agregado (máximo 5 intentos)
9. **Interactúa con el modal de solicitud** (sin llenar datos del evento, ya están establecidos)
10. **Confirma la solicitud enviada**
11. **Verifica que el servicio aparece en la sección de servicios del evento**

### Flujo 4: Creación de Eventos de Todos los Tipos (`crearEventosDeBloque`)

1. **Obtiene todos los tipos de eventos disponibles** (máximo 15)
2. **Divide los tipos en bloques de 3**
3. **Para cada bloque**:
   - Limpia cookies y storage
   - Hace login como cliente
   - Obtiene los tipos de eventos
   - Crea un evento de cada tipo en el bloque
   - Limpia memoria después de cada evento
4. **Muestra resumen del bloque** (eventos creados vs fallidos)

## 🛠️ Funciones Principales

### Funciones Exportadas

#### `buscarServicioEnProveedor(page: Page)`
- **Propósito**: Busca y extrae información de un servicio aleatorio **activo** del dashboard del proveedor
- **Retorna**: `{ nombre: string; categoria: string; subcategoria?: string } | null`
- **Características**:
  - Login automático si es necesario
  - Navegación al dashboard del proveedor
  - **Filtrado de servicios activos**: Abre el menú de tres puntos de cada servicio para verificar su estado
  - Verifica botón "Desactivar" (activo) o "Activar" (inactivo)
  - Cierra el menú con `Escape` antes de continuar
  - Selección aleatoria solo de servicios activos
  - Extracción de categoría y subcategoría desde la tarjeta del servicio
  - Logs detallados del proceso

#### `navegarHastaEncontrarServicioEspecifico(page: Page, targetServiceName: string, targetCategoria?: string, targetSubcategoria?: string)`
- **Propósito**: Navega recursivamente por categorías y subcategorías hasta encontrar un servicio específico
- **Retorna**: `boolean` (true si encuentra el servicio)
- **Características**:
  - Navegación inteligente usando la categoría y subcategoría del servicio objetivo
  - Manejo de servicios inactivos (los omite por texto, clases CSS o color)
  - Búsqueda por nombre exacto o parcial
  - Comparación flexible de nombres (ignora " - EDITADO" y timestamps)
  - Hace clic en "Contactar GRATIS" cuando encuentra el servicio
  - Manejo robusto de errores

#### `seleccionarHoraYMinuto(page: Page, hora: number, minuto: number)`
- **Propósito**: Selecciona hora y minuto en el reloj analógico
- **Características**:
  - Abre el selector de hora
  - Selecciona la hora usando coordenadas de círculos SVG
  - Selecciona el minuto usando coordenadas de círculos SVG
  - Confirma la selección
  - Manejo de errores si no encuentra los elementos

#### `ejecutarFlujoCompletoCreacionEvento(page: Page)`
- **Propósito**: Ejecuta el flujo completo de creación de evento como cliente
- **Características**:
  - Función exportada para reutilización en otras pruebas (ej: `dashboard.spec.ts`)
  - Incluye todas las fases: búsqueda de servicio, creación, validaciones y verificaciones
  - Maneja todos los pasos desde el login hasta la verificación final en Fiestachat
  - Validaciones exhaustivas en múltiples niveles

#### `agregarServicioAEventoExistente(page: Page)`
- **Propósito**: Agrega un servicio a un evento existente
- **Características**:
  - Selecciona un evento con fecha futura
  - Maneja el caso de servicio ya agregado (reintenta hasta encontrar uno nuevo)
  - Reutiliza funciones de búsqueda y navegación
  - Valida que el servicio aparece en la sección de servicios del evento

#### `obtenerTiposDeEventos(page: Page)`
- **Propósito**: Obtiene todos los tipos de eventos disponibles en la página
- **Retorna**: `Promise<string[]>` (array de nombres de tipos de eventos)
- **Características**:
  - Verifica si está logueado antes de navegar
  - Navega a "Nueva fiesta"
  - Extrae todos los tipos disponibles
  - Manejo seguro de errores

#### `crearEventosDeBloque(page: Page, tiposEventos: string[], inicio: number, fin: number)`
- **Propósito**: Crea eventos de un bloque específico de tipos
- **Retorna**: `{ eventosCreados: string[]; eventosFallidos: string[] }`
- **Características**:
  - Procesa un bloque de tipos (máximo 3 por bloque)
  - Limpia memoria después de cada evento
  - Muestra resumen del bloque
  - Manejo de errores por tipo de evento

## 📊 Datos de Prueba

### Nombres Aleatorios
- **Nombres**: María, Juan, Carlos, Ana, Pedro, Laura, José, Carmen, Luis, Sofia
- **Apellidos**: García, Rodríguez, Martínez, López, González, Hernández, Pérez, Sánchez, Ramírez, Torres

### Ciudades Aleatorias
- Guadalajara, Ciudad de México, Monterrey, Puebla, Querétaro, León, Tijuana, Mérida

### Mensajes de Solicitud Aleatorios
- "Nos gustaría incluir opciones vegetarianas y postres personalizados."
- "Buscamos algo con temática tropical y servicio completo de montaje."
- "Necesitamos cotización con barra libre y personal extra para servicio."
- "Queremos opciones premium y asesoría para decoración a juego."

### Otros Datos Aleatorios
- **Hora**: Entre 1 y 12 horas, minutos en intervalos de 15 (0, 15, 30, 45)
- **Invitados**: Entre 20 y 200 personas
- **Fecha**: Día futuro del mes actual

## 🎨 Características Especiales

### Filtrado Inteligente de Servicios Activos
- **Método de verificación**: Abre el menú de tres puntos de cada servicio para verificar su estado
- **Indicadores de estado**:
  - **Servicio activo**: Tiene botón "Desactivar" en el menú
  - **Servicio inactivo**: Tiene botón "Activar" en el menú
- **Proceso**:
  1. Itera sobre todas las tarjetas de servicios
  2. Para cada tarjeta, busca el botón de tres puntos (`icon-more-vertical`)
  3. Hace clic en el botón para abrir el menú
  4. Espera 1.5 segundos para que el menú se abra completamente
  5. Busca botones "Desactivar" o "Activar" en el menú
  6. Si encuentra "Desactivar", marca el servicio como activo
  7. Cierra el menú presionando `Escape`
  8. Continúa con el siguiente servicio
- **Logs informativos**: Muestra cuántos servicios activos se encontraron y cuáles se omitieron
- **Manejo de errores**: Si hay un error al verificar un servicio, lo asume como activo para no perder servicios válidos
- **Rendimiento**: El tiempo de filtrado depende del número de servicios (aproximadamente 1.5-2 segundos por servicio)

### Manejo de Servicios Ya Agregados
- **Detección**: Busca el mensaje "Servicio previamente agregado" o "Este servicio ya fue agregado anteriormente"
- **Reintentos**: Hasta 5 intentos para encontrar un servicio no agregado
- **Proceso**:
  1. Detecta el diálogo de servicio ya agregado
  2. Cierra el diálogo (botón de cerrar o `Escape`)
  3. Busca otro servicio en el proveedor
  4. Repite el proceso hasta encontrar uno no agregado
  5. Si después de 5 intentos no encuentra, lanza error

### Validación de Fechas de Eventos
- **Filtrado**: Solo selecciona eventos con fecha futura
- **Extracción**: Parsea fechas en formato "DD MMM YYYY" (ej: "31 jul. 2026")
- **Mapeo de meses**: Convierte nombres de meses en español a números
- **Comparación**: Compara con fecha actual (solo día, mes y año)

### Integración con Google Places Autocomplete
- Escribe el nombre de la ciudad
- Espera a que aparezcan las sugerencias
- Selecciona la primera opción disponible
- Maneja diferentes estructuras DOM de las sugerencias
- Validación robusta del campo de ciudad (evita escribir en campos incorrectos)

### Manejo de Servicios Inactivos
- **En el dashboard del proveedor**:
  - Abre el menú de tres puntos de cada servicio
  - Verifica si tiene botón "Desactivar" (activo) o "Activar" (inactivo)
  - Solo selecciona servicios que tengan botón "Desactivar"
  - Cierra el menú con `Escape` antes de continuar
  - Logs informativos indicando cuántos servicios activos se encontraron
- **En la navegación del cliente**:
  - Detecta servicios marcados como "Inactivo" en el texto
  - Detecta imágenes o divs con clase `grayscale`
  - Detecta texto con color gris (RGB bajo)
  - Los omite automáticamente
  - Busca servicios activos alternativos si el objetivo está inactivo

### Verificación Flexible de Datos
- Acepta diferentes formatos de fecha (DD-MM-YYYY, DD/MM/YYYY, etc.)
- Maneja formatos de hora 12h y 24h
- Considera abreviaciones de ciudades
- Verifica coincidencias parciales
- Validación por palabras para ciudades

### Validación del Diálogo de Confirmación
- Múltiples estrategias de búsqueda del diálogo
- Validación exhaustiva de todos los datos del evento
- Validación de componentes individuales de la hora
- Manejo de errores con debugging detallado

### Interacción con Calendario
- Localización automática del calendario
- Navegación inteligente de meses (hasta 3 meses adelante)
- Detección de días del mes anterior/siguiente (opacity-40)
- Filtrado de eventos por día seleccionado
- Validación de que todos los eventos filtrados corresponden al día

### Validación Detallada de Fiestachat
- Múltiples estrategias de búsqueda de la sección
- Validación de título y subtítulo
- Extracción y validación de fecha/hora con regex flexible
- Validación del nombre del servicio en la notificación
- Validación del mensaje específico de la notificación

### Validación en Página Completa
- Búsqueda de datos en todo el contenido de la página
- Validación de tipo de evento, nombre, ciudad e invitados
- Listado de servicios para debugging

### Mensajes Visuales de Progreso
- Usa `showStepMessage()` para mostrar mensajes en pantalla durante la ejecución
- Mensajes informativos con emojis para mejor seguimiento
- Limpia los mensajes al finalizar
- Mensajes específicos para cada fase de validación

### Manejo Seguro de Storage
- Navega a una página válida antes de limpiar `localStorage` y `sessionStorage`
- Manejo de errores de acceso a storage (SecurityError)
- Try-catch en múltiples niveles para evitar fallos

## 📋 Validaciones Implementadas

### Validaciones del Diálogo de Confirmación Pre-Solicitud
- ✅ Diálogo visible (3 estrategias de búsqueda)
- ✅ Texto menciona el servicio
- ✅ Tipo de evento en el diálogo
- ✅ Nombre del festejado en el diálogo
- ✅ Número de invitados en el diálogo
- ✅ Ciudad en el diálogo (exacta o por palabras)
- ✅ Hora en el diálogo (formato 12h/24h y componentes)

### Validaciones en Dashboard
- ✅ Evento en lista general (sin filtrar)
- ✅ Calendario localizado y navegación de meses
- ✅ Selección de día del evento
- ✅ Eventos filtrados por día
- ✅ Validación de que todos los eventos corresponden al día
- ✅ Datos del evento en la tarjeta (nombre, fecha, hora, ciudad, invitados)

### Validaciones en Página de Detalles
- ✅ Servicio específico visible en lista
- ✅ Estado "PENDIENTE" del servicio
- ✅ Listado de servicios (hasta 5 para debugging)
- ✅ Datos del evento en página completa (tipo, nombre, ciudad, invitados)

### Validaciones de Fiestachat
- ✅ Sección Fiestachat visible (3 estrategias)
- ✅ Título "¡Fiestachat!" visible
- ✅ Subtítulo "La línea directa a tu evento" visible
- ✅ Notificaciones encontradas
- ✅ Texto de solicitud en notificación
- ✅ Fecha y hora en notificación (múltiples formatos)
- ✅ Nombre del servicio en notificación
- ✅ Mensaje específico de notificación
- ✅ Coincidencia del nombre del servicio

### Validaciones de Agregar Servicio a Evento Existente
- ✅ Evento con fecha futura seleccionado
- ✅ Servicio no agregado previamente (reintentos automáticos)
- ✅ Servicio aparece en la sección de servicios del evento
- ✅ Estado "PENDIENTE" del servicio agregado

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

#### Ejecutar solo el test principal:
```bash
npx playwright test tests/client/cliente-eventos.spec.ts -g "Nueva fiesta"
```

#### Ejecutar todos los tests (incluyendo bloques):
```bash
npx playwright test tests/client/cliente-eventos.spec.ts
```

#### Ejecutar un bloque específico:
```bash
npx playwright test tests/client/cliente-eventos.spec.ts -g "Bloque 1"
```

#### Ejecutar en modo UI (recomendado para debugging):
```bash
npx playwright test tests/client/cliente-eventos.spec.ts --ui
```

#### Ejecutar en modo headed (ver el navegador):
```bash
npx playwright test tests/client/cliente-eventos.spec.ts --headed
```

#### Ejecutar con más información de debug:
```bash
npx playwright test tests/client/cliente-eventos.spec.ts --debug
```

#### Ejecutar todas las pruebas del cliente:
```bash
npx playwright test tests/client/
```

## 📈 Métricas Esperadas

### Test Individual ("Nueva fiesta")
- **Tiempo de ejecución**: ~3-4 minutos
- **Pasos totales**: ~25-30 pasos principales
- **Interacciones con UI**: ~50-70 interacciones (incluye apertura de menús para verificar estado)
- **Verificaciones**: ~25-30 verificaciones de datos
- **Filtrado de servicios**: Abre menú de 3 puntos para cada servicio en el dashboard del proveedor

### Tests de Bloques
- **Tiempo de ejecución por bloque**: ~5-10 minutos (depende de cuántos eventos se creen)
- **Eventos por bloque**: Máximo 3
- **Limpieza de memoria**: Después de cada evento
- **Reintentos**: Hasta 5 intentos por servicio si ya está agregado

### Métricas Totales
- **Validaciones de diálogos**: 2 (confirmación pre-solicitud y solicitud enviada)
- **Validaciones de calendario**: Navegación de meses y selección de día
- **Validaciones de Fiestachat**: 7 validaciones específicas
- **Validaciones de servicios**: Estado, visibilidad, nombre

## ⚠️ Consideraciones Importantes

1. **Timeout extendido**: 
   - Test individual: 3 minutos
   - Tests de bloques: 5 minutos por bloque
   - Debido a la complejidad del flujo y múltiples validaciones

2. **Dependencia de servicios activos**: 
   - Requiere que existan servicios **activos** en el dashboard del proveedor
   - La prueba filtra automáticamente servicios inactivos abriendo el menú de tres puntos
   - Si no hay servicios activos, la prueba falla con un mensaje claro

3. **Verificación de estado del servicio**: 
   - En el proveedor: Abre el menú de cada servicio para verificar si tiene botón "Desactivar" (activo)
   - En el cliente: Detecta servicios inactivos por texto, clases CSS o color de texto

4. **Google Places API**: Depende de que Google Places Autocomplete funcione correctamente

5. **Estado del servicio**: La prueba verifica que el servicio tenga estado "PENDIENTE" después de crear el evento

6. **Notificaciones**: Verifica que se genere una notificación automática en Fiestachat con validación detallada

7. **Calendario**: La prueba interactúa con el calendario del dashboard, requiere que el mes del evento sea accesible (máximo 3 meses adelante)

8. **Diálogo de confirmación**: Puede no aparecer en algunos casos, la prueba continúa sin fallar

9. **Formato de fechas**: La prueba maneja múltiples formatos de fecha para mayor robustez

10. **Validaciones exhaustivas**: Incluye validaciones en múltiples niveles (diálogo, tarjeta, página completa)

11. **Rendimiento del filtrado**: El filtrado de servicios activos puede tomar tiempo adicional si hay muchos servicios, ya que abre el menú de cada uno

12. **Servicios ya agregados**: La prueba maneja automáticamente el caso de servicios ya agregados a eventos, reintentando hasta encontrar uno nuevo

13. **Fechas de eventos**: Solo selecciona eventos con fecha futura al agregar servicios a eventos existentes

14. **Manejo de storage**: Navega a una página válida antes de limpiar localStorage/sessionStorage para evitar errores de seguridad

## 🐛 Manejo de Errores

La prueba incluye manejo robusto de errores:
- Verifica existencia de elementos antes de interactuar
- Usa timeouts apropiados para esperar elementos
- Maneja casos donde elementos no están visibles
- Proporciona mensajes de error descriptivos en la consola
- Múltiples estrategias de búsqueda para elementos críticos (diálogo, calendario, Fiestachat)
- Validaciones no bloqueantes: continúa aunque algunas validaciones fallen
- Debugging detallado: lista elementos disponibles cuando no encuentra el objetivo
- Manejo de formatos de fecha/hora flexibles para evitar fallos por diferencias de formato
- Manejo seguro de errores de acceso a storage (SecurityError)
- Reintentos automáticos para servicios ya agregados

## 🔄 Cambios Recientes

### División en Bloques (Última actualización)
- **Problema anterior**: Crear todos los eventos de una vez causaba errores de memoria ("Out of Memory")
- **Solución implementada**: 
  - División de tipos de eventos en bloques de 3
  - Limpieza de memoria después de cada evento
  - Tests independientes por bloque
  - Timeout extendido por bloque (5 minutos)
- **Resultado**: Los tests ahora se ejecutan sin errores de memoria

### Manejo Seguro de Storage (Última actualización)
- **Problema anterior**: Errores de SecurityError al acceder a localStorage/sessionStorage
- **Solución implementada**: 
  - Navegación a página válida antes de limpiar storage
  - Try-catch en múltiples niveles
  - Manejo de errores de acceso
- **Resultado**: Los tests ahora manejan correctamente los errores de storage

### Validación de Fechas de Eventos (Última actualización)
- **Problema anterior**: La prueba podía seleccionar eventos con fecha pasada
- **Solución implementada**: 
  - Filtrado de eventos por fecha futura
  - Extracción y parseo de fechas en formato español
  - Comparación con fecha actual
- **Resultado**: Solo se seleccionan eventos válidos (fecha futura)

### Manejo de Servicios Ya Agregados (Última actualización)
- **Problema anterior**: La prueba fallaba si intentaba agregar un servicio ya agregado
- **Solución implementada**: 
  - Detección del mensaje "Servicio previamente agregado"
  - Reintentos automáticos (hasta 5 intentos)
  - Búsqueda de otro servicio si el actual ya está agregado
- **Resultado**: La prueba maneja correctamente servicios duplicados

## 🔗 Enlaces Relacionados

- **Repositorio**: https://github.com/efraindeloafiestamas/Automations
- **Archivo de prueba**: `tests/client/cliente-eventos.spec.ts`
- **Utilidades**: `tests/utils.ts`
- **Configuración**: `tests/config.ts`
- **Prueba que reutiliza el flujo**: `tests/client/dashboard.spec.ts`

## 📊 Estado de Implementación

### ✅ Completado
- [x] Creación de evento individual
- [x] Creación de eventos por tipo específico
- [x] Creación de eventos de todos los tipos (en bloques)
- [x] Agregar servicio a evento existente
- [x] Validaciones exhaustivas en múltiples niveles
- [x] Filtrado de servicios activos
- [x] Manejo de servicios inactivos
- [x] Manejo de servicios ya agregados
- [x] Validación de fechas de eventos
- [x] Integración con Google Places
- [x] Validación de Fiestachat
- [x] Interacción con calendario
- [x] Manejo seguro de storage

### 🔄 Mejoras Futuras
- [ ] Optimización del tiempo de filtrado de servicios activos
- [ ] Caché de tipos de eventos para evitar múltiples navegaciones
- [ ] Reportes más detallados por tipo de evento
- [ ] Validación de imágenes de servicios
- [ ] Validación de precios y cotizaciones

