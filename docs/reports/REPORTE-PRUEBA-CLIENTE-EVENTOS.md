# Reporte de Prueba: Creación de Evento como Cliente

## 📋 Información General

- **Nombre del archivo**: `cliente-eventos.spec.ts`
- **Ruta en GitHub**: `https://github.com/efraindeloafiestamas/Automations/blob/main/tests/client/cliente-eventos.spec.ts`
- **Tipo de prueba**: End-to-End (E2E)
- **Framework**: Playwright
- **Timeout**: 180 segundos (3 minutos)
- **Viewport**: 1280x720

## 🎯 Objetivo de la Prueba

Esta prueba automatizada simula el flujo completo de creación de un evento como cliente en la plataforma Fiestamas, desde la búsqueda de un servicio en el dashboard del proveedor hasta la verificación de que el evento se creó correctamente y aparece en el dashboard del cliente con todos sus datos.

## 🔄 Flujo de la Prueba

### Fase 1: Preparación - Búsqueda de Servicio en Proveedor
1. **Inicia sesión como proveedor** (si no está logueado)
2. **Navega al dashboard del proveedor**
3. **Accede a "Administrar servicios"**
4. **Filtra servicios activos**:
   - Itera sobre todas las tarjetas de servicios
   - Para cada servicio, abre el menú de tres puntos
   - Verifica si tiene botón "Desactivar" (servicio activo) o "Activar" (servicio inactivo)
   - Cierra el menú y continúa con el siguiente
   - Solo selecciona servicios que estén activos
5. **Selecciona un servicio aleatorio** de los servicios activos
6. **Extrae información del servicio**:
   - Nombre del servicio
   - Categoría
   - Subcategoría (si existe)
7. **Cierra sesión del proveedor** y limpia cookies/storage

### Fase 2: Creación del Evento como Cliente
1. **Inicia sesión como cliente**
2. **Navega al dashboard del cliente**
3. **Hace clic en "Nueva fiesta"**
4. **Selecciona una categoría de evento aleatoria** (Cumpleaños, Bautizo, etc.)
5. **Navega por categorías y subcategorías** hasta encontrar el servicio específico extraído del proveedor
6. **Hace clic en el servicio** y luego en "Contactar GRATIS"
7. **Llena el formulario de evento**:
   - **Nombre del festejado**: Nombre y apellido aleatorios
   - **Fecha**: Selecciona un día futuro usando el date picker
   - **Hora**: Selecciona hora y minuto aleatorios usando el reloj analógico
   - **Ciudad**: Escribe una ciudad y selecciona de las sugerencias de Google Places Autocomplete
   - **Número de invitados**: Número aleatorio entre 20 y 200
8. **Hace clic en "Crear evento"**

### Fase 3: Validación del Diálogo de Confirmación Pre-Solicitud
1. **Valida el diálogo de confirmación** que aparece después de hacer clic en "Crear evento"
2. **Verifica que el diálogo contiene**:
   - Texto que menciona el servicio ("Dile aquí a [SERVICIO]...")
   - Tipo de evento seleccionado
   - Nombre del festejado
   - Número de invitados
   - Ciudad (con validación por palabras si no coincide exactamente)
   - Hora (con validación de formato 12h/24h y componentes individuales)

### Fase 4: Interacción con Modal de Solicitud
1. **Espera a que aparezca el modal de solicitud**
2. **Selecciona variedades del servicio**:
   - 40% de probabilidad: Hace clic en "Seleccionar todo"
   - 60% de probabilidad: Selecciona checkboxes aleatorios
3. **Llena el campo "Solicitudes"** con un mensaje aleatorio
4. **Hace clic en "Solicitar"**
5. **Confirma el diálogo "Solicitud enviada"** haciendo clic en "OK"

### Fase 5: Verificación en Dashboard
1. **Espera a que regrese automáticamente al dashboard del cliente**
2. **Valida que el evento aparece en la lista general** (sin filtrar por día)
   - Busca el evento por nombre del festejado
   - Lista eventos disponibles para debugging si no se encuentra
3. **Interactúa con el calendario**:
   - Localiza el calendario en el dashboard
   - Obtiene el día del evento desde la fecha guardada
   - Navega al mes correcto si es necesario (hasta 3 clics)
   - Selecciona el día del evento para filtrar
4. **Valida eventos filtrados por día**:
   - Verifica que el evento aparece en la lista filtrada
   - Valida que todos los eventos mostrados corresponden al día seleccionado
   - Extrae y valida fechas de las tarjetas de eventos
5. **Verifica que el evento aparece en el dashboard** buscando el nombre del festejado
6. **Verifica que los datos del evento coinciden en la tarjeta**:
   - Nombre del festejado
   - Fecha (considerando diferentes formatos: DD-MM-YYYY, DD/MM/YYYY, etc.)
   - Hora (considerando formatos 12h/24h)
   - Ciudad (considerando abreviaciones y partes de la ciudad)
   - Número de invitados

### Fase 6: Verificación en Página de Detalles
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

## 🛠️ Funciones Auxiliares

### `buscarServicioEnProveedor(page: Page)`
- **Propósito**: Busca y extrae información de un servicio aleatorio **activo** del dashboard del proveedor
- **Retorna**: Objeto con `nombre`, `categoria`, y `subcategoria` (opcional)
- **Maneja**: 
  - Login automático si es necesario
  - Navegación al dashboard
  - **Filtrado de servicios activos**: Abre el menú de tres puntos de cada servicio para verificar su estado
  - Selección aleatoria solo de servicios activos
  - Extracción de categoría y subcategoría desde la tarjeta del servicio

### `navegarHastaEncontrarServicioEspecifico(page: Page, targetServiceName: string, targetCategoria?: string, targetSubcategoria?: string)`
- **Propósito**: Navega recursivamente por categorías y subcategorías hasta encontrar un servicio específico
- **Características**:
  - Navegación inteligente usando la categoría y subcategoría del servicio objetivo
  - Manejo de servicios inactivos (los omite)
  - Búsqueda por nombre exacto o parcial
  - Hace clic en "Contactar GRATIS" cuando encuentra el servicio

### `obtenerSubcategoriasParaBusqueda(page: Page)`
- **Propósito**: Obtiene todas las subcategorías disponibles en la página actual
- **Retorna**: Array de objetos con nombre y botón de cada subcategoría

### `ejecutarFlujoCompletoCreacionEvento(page: Page)`
- **Propósito**: Ejecuta el flujo completo de creación de evento como cliente
- **Características**:
  - Función exportada para reutilización en otras pruebas (ej: `dashboard.spec.ts`)
  - Incluye todas las fases: búsqueda de servicio, creación, validaciones y verificaciones
  - Maneja todos los pasos desde el login hasta la verificación final en Fiestachat

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

### Integración con Google Places Autocomplete
- Escribe el nombre de la ciudad
- Espera a que aparezcan las sugerencias
- Selecciona la primera opción disponible
- Maneja diferentes estructuras DOM de las sugerencias

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

## 🚀 Cómo Ejecutar la Prueba

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

#### Ejecutar solo esta prueba:
```bash
npx playwright test tests/client/cliente-eventos.spec.ts
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

## 📝 Estructura del Código

```
cliente-eventos.spec.ts
├── Imports y configuración
├── buscarServicioEnProveedor()
│   └── Login como proveedor
│   └── Navegación a servicios
│   └── Filtrado de servicios activos
│   │   ├── Itera sobre todas las tarjetas
│   │   ├── Abre menú de 3 puntos de cada servicio
│   │   ├── Verifica botón "Desactivar" (activo) o "Activar" (inactivo)
│   │   └── Cierra menú con Escape
│   └── Selección aleatoria de servicio activo
│   └── Extracción de datos del servicio
├── navegarHastaEncontrarServicioEspecifico()
│   └── Navegación recursiva por categorías
│   └── Búsqueda del servicio objetivo
│   └── Manejo de servicios inactivos (detección por texto/clases CSS)
├── obtenerSubcategoriasParaBusqueda()
│   └── Extracción de subcategorías disponibles
└── ejecutarFlujoCompletoCreacionEvento()
    ├── Fase 1: Búsqueda de servicio en proveedor
    ├── Fase 2: Creación del evento como cliente
    ├── Fase 3: Validación del diálogo de confirmación
    ├── Fase 4: Interacción con modal de solicitud
    ├── Fase 5: Verificación en dashboard
    │   ├── Validación en lista general
    │   ├── Interacción con calendario
    │   ├── Filtrado por día
    │   └── Validación de datos en tarjeta
    └── Fase 6: Verificación en página de detalles
        ├── Validación de servicios
        ├── Validación de datos en página completa
        └── Validación detallada de Fiestachat
```

## ⚠️ Consideraciones Importantes

1. **Timeout extendido**: La prueba tiene un timeout de 3 minutos debido a la complejidad del flujo y múltiples validaciones
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

## 📈 Métricas Esperadas

- **Tiempo de ejecución**: ~3-4 minutos (puede variar según cantidad de servicios a filtrar)
- **Pasos totales**: ~25-30 pasos principales
- **Interacciones con UI**: ~50-70 interacciones (incluye apertura de menús para verificar estado)
- **Verificaciones**: ~25-30 verificaciones de datos
- **Filtrado de servicios**: Abre menú de 3 puntos para cada servicio en el dashboard del proveedor
- **Validaciones de diálogos**: 2 (confirmación pre-solicitud y solicitud enviada)
- **Validaciones de calendario**: Navegación de meses y selección de día
- **Validaciones de Fiestachat**: 7 validaciones específicas

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

## 🔄 Cambios Recientes

### Mejora en Filtrado de Servicios Activos (Última actualización)
- **Problema anterior**: La prueba seleccionaba servicios aleatoriamente sin verificar si estaban activos, lo que causaba fallos al intentar navegar a servicios inactivos
- **Solución implementada**: 
  - Verificación del estado del servicio abriendo el menú de tres puntos
  - Filtrado explícito de servicios activos antes de seleccionar uno
  - Logs detallados del proceso de filtrado
  - Manejo robusto de errores durante la verificación
- **Resultado**: La prueba ahora garantiza que solo selecciona servicios activos, mejorando significativamente la tasa de éxito

### Funciones Exportadas
- `buscarServicioEnProveedor()`: Exportada para uso en otras pruebas
- `navegarHastaEncontrarServicioEspecifico()`: Exportada para uso en otras pruebas
- `obtenerSubcategoriasParaBusqueda()`: Exportada para uso en otras pruebas
- `seleccionarHoraYMinuto()`: Exportada para uso en otras pruebas
- `ejecutarFlujoCompletoCreacionEvento()`: Exportada para reutilización completa del flujo (usada en `dashboard.spec.ts`)

## 🔗 Enlaces Relacionados

- **Repositorio**: https://github.com/efraindeloafiestamas/Automations
- **Archivo de prueba**: `tests/client/cliente-eventos.spec.ts`
- **Utilidades**: `tests/utils.ts`
- **Configuración**: `tests/config.ts`
- **Reporte de comparación**: [`COMPARACION-VALIDACIONES-EVENTOS.md`](./COMPARACION-VALIDACIONES-EVENTOS.md)
- **Prueba que reutiliza el flujo**: `tests/client/dashboard.spec.ts`

