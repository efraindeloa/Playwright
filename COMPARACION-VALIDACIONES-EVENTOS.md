# Comparación de Validaciones: `eventos.spec.ts` vs `cliente-eventos.spec.ts`

## ❌ **NO, `cliente-eventos.spec.ts` NO cubre completamente todas las validaciones de `eventos.spec.ts`**

Aunque `cliente-eventos.spec.ts` es más completo en muchos aspectos, **faltan algunas validaciones específicas** que `eventos.spec.ts` realiza.

---

## 📊 Validaciones que AMBOS archivos realizan

### ✅ Validaciones Comunes

1. **Login y navegación inicial**
   - ✅ Login como cliente
   - ✅ Navegación al dashboard
   - ✅ Verificación de URL del dashboard

2. **Botón "Nueva fiesta"**
   - ✅ Verificación de visibilidad
   - ✅ Clic en el botón

3. **Selección de categoría de evento**
   - ✅ Conteo de categorías disponibles
   - ✅ Selección aleatoria de categoría

4. **Formulario de evento**
   - ✅ Llenado de nombre del festejado
   - ✅ Selección de fecha (date picker)
   - ✅ Selección de hora (selector de hora)
   - ✅ Selección de ciudad (autocompletado Google Places)
   - ✅ Llenado de número de invitados
   - ✅ Verificación de valores de campos

5. **Creación del evento**
   - ✅ Clic en botón "Crear evento"
   - ✅ Verificación de visibilidad del botón

6. **Modal de solicitud**
   - ✅ Interacción con modal (solo `cliente-eventos.spec.ts` lo hace completamente)
   - ✅ Clic en "Solicitar"
   - ✅ Diálogo "Solicitud enviada"
   - ✅ Clic en "OK"

7. **Regreso al dashboard**
   - ✅ Verificación de URL del dashboard
   - ✅ Espera de carga del dashboard

8. **Evento en dashboard**
   - ✅ Verificación de que el evento aparece en el dashboard
   - ✅ Búsqueda por nombre del festejado

9. **Apertura del evento**
   - ✅ Clic en la tarjeta del evento
   - ✅ Verificación de página de detalles

10. **Fiestachat**
    - ✅ Verificación de sección Fiestachat
    - ✅ Verificación de notificaciones

---

## ❌ Validaciones que SOLO `eventos.spec.ts` realiza

### 1. **Validación del Diálogo de Confirmación Pre-Solicitud** ⚠️ **FALTA EN `cliente-eventos.spec.ts`**

**`eventos.spec.ts` valida:**
- ✅ Texto del diálogo contiene "Dile aquí a [NOMBRE_SERVICIO] qué es lo que necesitas"
- ✅ Contenedor de información del evento visible
- ✅ **Tipo de evento** en el diálogo
- ✅ **Nombre del festejado** en el diálogo
- ✅ **Número de invitados** en el diálogo
- ✅ **Ciudad** en el diálogo (con validación por palabras)
- ✅ **Hora** en el diálogo (con validación de formato 12h/24h)
- ✅ Validación exhaustiva de todos los componentes de la hora (hora, minutos, formato)

**`cliente-eventos.spec.ts`:**
- ❌ **NO valida el diálogo de confirmación pre-solicitud**
- ❌ **NO verifica que el diálogo contenga la información del evento**
- ⚠️ Va directo a interactuar con el modal sin validar el diálogo intermedio

**Código relevante en `eventos.spec.ts` (líneas 651-769):**
```typescript
// Validar la información del evento en el diálogo
const eventInfoContainer = page.locator('div.w-full.flex.flex-col.items-center.border-\\[1px\\]');
await expect(eventInfoContainer).toBeVisible({ timeout: 5000 });

// Validar que contiene el tipo de evento
if (eventInfoText?.includes(selectedEventType)) {
  console.log(`✓ Tipo de evento coincide: "${selectedEventType}"`);
}

// Validar que contiene el nombre del festejado
if (eventInfoText?.includes(randomHonoree)) {
  console.log(`✓ Nombre del festejado coincide: "${randomHonoree}"`);
}

// Validar que contiene el número de invitados
if (eventInfoText?.includes(randomAttendees.toString())) {
  console.log(`✓ Número de invitados coincide: ${randomAttendees}`);
}

// Validar que contiene la ciudad
// Validar que contiene la hora
// ... validaciones exhaustivas
```

### 2. **Validación de Evento en Lista General (ANTES de filtrar por día)** ⚠️ **FALTA EN `cliente-eventos.spec.ts`**

**`eventos.spec.ts` valida:**
- ✅ Evento aparece en la lista general del dashboard (sin filtrar)
- ✅ Búsqueda del evento por nombre del festejado en lista general
- ✅ Listado de eventos disponibles para debugging si no se encuentra

**`cliente-eventos.spec.ts`:**
- ❌ **NO valida que el evento aparezca en la lista general**
- ✅ Solo valida que aparece después de hacer clic en la tarjeta

**Código relevante en `eventos.spec.ts` (líneas 956-1004):**
```typescript
// Validar que el evento creado aparece en la lista de eventos (ANTES de filtrar por día)
console.log(`\n🔍 Validando que el evento aparece en la lista de eventos del dashboard...`);

const eventsContainerInitial = page.locator('div.flex.relative.w-full.overflow-hidden');
// ... busca el evento en la lista general
```

### 3. **Interacción con Calendario y Filtrado por Día** ⚠️ **FALTA EN `cliente-eventos.spec.ts`**

**`eventos.spec.ts` valida:**
- ✅ Localización del calendario en el dashboard
- ✅ Obtención del día del evento creado
- ✅ Navegación de meses en el calendario (si es necesario)
- ✅ Búsqueda del día específico en el calendario
- ✅ Clic en el día del evento para filtrar
- ✅ Validación de que el evento aparece en la lista filtrada por día
- ✅ **Validación de que TODOS los eventos mostrados corresponden al día seleccionado**
- ✅ Extracción y validación de fechas en las tarjetas de eventos

**`cliente-eventos.spec.ts`:**
- ❌ **NO interactúa con el calendario**
- ❌ **NO filtra eventos por día**
- ❌ **NO valida que los eventos filtrados corresponden al día seleccionado**

**Código relevante en `eventos.spec.ts` (líneas 1006-1232):**
```typescript
// Seleccionar el día del evento en el calendario del dashboard
console.log(`\n🔍 Buscando calendario en el dashboard...`);

// Obtener el día del evento creado
const eventDay = futureDate.getDate();
const eventMonth = futureDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

// Buscar el calendario
const calendarContainer = page.locator('div.w-full.flex.flex-col.gap-4').first();

// Navegar al mes del evento si es necesario
if (!currentMonthInCalendar.includes(targetMonth.split(' ')[0])) {
  // Hacer clic hasta 3 veces para avanzar meses
  for (let clicks = 0; clicks < 3; clicks++) {
    await nextMonthButton.click();
    // ...
  }
}

// Buscar el día del evento por número
for (let i = 0; i < dayButtonCount; i++) {
  const dayButton = allDayButtons.nth(i);
  // ...
  if (dayNumber === eventDay && !hasOpacity) {
    await dayButton.click();
    // ...
  }
}

// Validar que todos los eventos mostrados pertenecen al día seleccionado
let allEventsFromSelectedDay = true;
for (let i = 0; i < eventCardsCount; i++) {
  const eventCard = eventCards.nth(i);
  const eventCardText = await eventCard.textContent();
  // Extraer la fecha del evento
  const dateMatch = eventCardText.match(/(\d{1,2})\s+(\w+)\.?\s+(\d{4})/);
  if (dateMatch) {
    const dayInCard = parseInt(dateMatch[1]);
    if (dayInCard === eventDay) {
      // ✓ Corresponde al día seleccionado
    } else {
      // ⚠ NO corresponde al día seleccionado
      allEventsFromSelectedDay = false;
    }
  }
}
```

### 4. **Validación Detallada de Fiestachat** ⚠️ **PARCIALMENTE FALTA EN `cliente-eventos.spec.ts`**

**`eventos.spec.ts` valida:**
- ✅ Título "¡Fiestachat!" visible
- ✅ Subtítulo "La línea directa a tu evento" visible
- ✅ Conteo de notificaciones
- ✅ Texto "Solicitud de cotización enviada" en la notificación
- ✅ **Fecha y hora en la notificación** (con regex para múltiples formatos)
- ✅ **Nombre del servicio en la notificación** (elemento específico)
- ✅ **Mensaje de la notificación** (elemento span específico)
- ✅ Búsqueda alternativa de sección Fiestachat

**`cliente-eventos.spec.ts` valida:**
- ✅ Sección Fiestachat visible
- ✅ Notificaciones encontradas
- ✅ Mensaje "Solicitud recibida" o "Pronto tendrás una respuesta"
- ❌ **NO valida el título "¡Fiestachat!"**
- ❌ **NO valida el subtítulo "La línea directa a tu evento"**
- ❌ **NO valida fecha y hora en la notificación**
- ❌ **NO valida el nombre del servicio en la notificación**
- ❌ **NO valida el mensaje específico de la notificación**

**Código relevante en `eventos.spec.ts` (líneas 838-954):**
```typescript
// Buscar el título "¡Fiestachat!"
const fiestachatTitle = fiestachatSection.locator('p.text-regular.text-primary-neutral.text-center.font-bold');
if (titleText && titleText.includes('¡Fiestachat!')) {
  console.log(`✓ Título "¡Fiestachat!" encontrado`);
}

// Buscar el subtítulo "La línea directa a tu evento"
const fiestachatSubtitle = fiestachatSection.locator('p.text-small.text-dark-neutral.text-center');
if (subtitleText && subtitleText.includes('La línea directa a tu evento')) {
  console.log(`✓ Subtítulo "La línea directa a tu evento" encontrado`);
}

// Validar que contiene una fecha y hora (formato flexible)
const hasDateAndTime = /\d{1,2}:\d{2}\s*(AM|PM|am|pm)/.test(notificationText) ||
  /\d{1,2}:\d{2}/.test(notificationText) ||
  /(Hoy|Ayer|mañana)/i.test(notificationText);

// Buscar el nombre del servicio en la notificación
const serviceNameElement = firstNotification.locator('p.text-small.text-dark-neutral.font-bold.text-start');
const serviceNameText = await serviceNameElement.textContent();

// Validar el mensaje de la notificación
const messageElement = firstNotification.locator('span');
const messageText = await messageElement.textContent();
```

### 5. **Validación Detallada de Servicios en Página de Detalles** ⚠️ **PARCIALMENTE FALTA EN `cliente-eventos.spec.ts`**

**`eventos.spec.ts` valida:**
- ✅ Contenedor de servicios visible
- ✅ Conteo de servicios en la lista
- ✅ Listado de servicios encontrados (hasta 5 servicios)
- ✅ Validación de que el servicio seleccionado debe estar en la lista
- ✅ Validación de otros datos del evento (tipo, nombre, ciudad) en la página completa

**`cliente-eventos.spec.ts` valida:**
- ✅ Sección de servicios visible
- ✅ Servicio específico encontrado por nombre
- ✅ Estado "PENDIENTE" del servicio
- ❌ **NO lista todos los servicios encontrados**
- ❌ **NO valida otros datos del evento en la página completa**

**Código relevante en `eventos.spec.ts` (líneas 1273-1338):**
```typescript
// Listar los servicios encontrados para validación
for (let j = 0; j < Math.min(serviceCount, 5); j++) {
  const serviceCard = serviceCards.nth(j);
  const serviceText = await serviceCard.textContent();
  console.log(`   - Servicio ${j + 1}: "${serviceText?.trim()}"`);
}

// Validar otros datos del evento si están visibles
const pageContent = await page.textContent('body');
if (pageContent) {
  // Validar que aparece el tipo de evento
  if (pageContent.includes(selectedEventType)) {
    console.log(`✓ Tipo de evento "${selectedEventType}" encontrado en la página`);
  }
  // Validar que aparece el nombre del festejado
  if (pageContent.includes(randomHonoree)) {
    console.log(`✓ Nombre del festejado "${randomHonoree}" encontrado en la página`);
  }
  // Validar que aparece la ciudad
  if (selectedCityValue && pageContent.includes(selectedCityValue.split(',')[0])) {
    console.log(`✓ Ciudad encontrada en la página`);
  }
}
```

---

## ✅ Validaciones que SOLO `cliente-eventos.spec.ts` realiza

### 1. **Búsqueda de Servicio en Dashboard del Proveedor**
- ✅ Login como proveedor
- ✅ Navegación a administrar servicios
- ✅ Extracción de nombre, categoría y subcategoría del servicio
- ✅ Cierre de sesión del proveedor

### 2. **Navegación Directa al Servicio Específico**
- ✅ Navegación usando categoría/subcategoría extraída
- ✅ Búsqueda del servicio específico por nombre
- ✅ Manejo de servicios inactivos

### 3. **Interacción Completa con Modal de Solicitud**
- ✅ Selección de checkboxes (aleatorios o "Seleccionar todo")
- ✅ Llenado de textarea de solicitudes
- ✅ Clic en botón "Solicitar"

### 4. **Validación Detallada de Datos del Evento en Dashboard**
- ✅ Verificación de nombre del festejado en la tarjeta
- ✅ Verificación de fecha (múltiples formatos)
- ✅ Verificación de hora (múltiples formatos)
- ✅ Verificación de ciudad (por partes)
- ✅ Verificación de número de invitados

### 5. **Validación de Servicio Específico en Página de Detalles**
- ✅ Verificación de que el servicio específico aparece
- ✅ Verificación de estado "PENDIENTE"

---

## 📋 Resumen de Cobertura

| Validación | `eventos.spec.ts` | `cliente-eventos.spec.ts` | Estado |
|------------|-------------------|---------------------------|--------|
| **Diálogo de confirmación pre-solicitud** | ✅ Completo | ❌ **NO** | ⚠️ **FALTA** |
| **Validación de datos en diálogo** | ✅ Completo | ❌ **NO** | ⚠️ **FALTA** |
| **Evento en lista general (sin filtrar)** | ✅ | ❌ **NO** | ⚠️ **FALTA** |
| **Interacción con calendario** | ✅ Completo | ❌ **NO** | ⚠️ **FALTA** |
| **Filtrado por día** | ✅ Completo | ❌ **NO** | ⚠️ **FALTA** |
| **Validación de eventos filtrados** | ✅ Completo | ❌ **NO** | ⚠️ **FALTA** |
| **Título/subtítulo Fiestachat** | ✅ | ❌ **NO** | ⚠️ **FALTA** |
| **Fecha/hora en notificación** | ✅ | ❌ **NO** | ⚠️ **FALTA** |
| **Nombre servicio en notificación** | ✅ | ❌ **NO** | ⚠️ **FALTA** |
| **Listado de servicios en detalles** | ✅ | ❌ **NO** | ⚠️ **FALTA** |
| **Validación de datos en página completa** | ✅ | ❌ **NO** | ⚠️ **FALTA** |
| **Búsqueda servicio en proveedor** | ❌ **NO** | ✅ | ✅ **EXTRA** |
| **Navegación directa al servicio** | ❌ **NO** | ✅ | ✅ **EXTRA** |
| **Interacción con modal completo** | ⚠️ Parcial | ✅ Completo | ✅ **MEJOR** |
| **Validación datos en tarjeta** | ⚠️ Parcial | ✅ Completo | ✅ **MEJOR** |
| **Validación servicio específico** | ❌ **NO** | ✅ | ✅ **EXTRA** |

---

## 🎯 Conclusión

**`cliente-eventos.spec.ts` NO cubre completamente todas las validaciones de `eventos.spec.ts`.**

### Validaciones críticas que faltan:

1. **Validación del diálogo de confirmación pre-solicitud** - Esta es una validación importante que verifica que el sistema muestra correctamente la información del evento antes de enviar la solicitud.

2. **Interacción con calendario y filtrado por día** - Esta validación es importante para verificar que el sistema puede filtrar eventos por fecha y que el filtrado funciona correctamente.

3. **Validación de evento en lista general** - Verificar que el evento aparece en la lista general antes de cualquier filtrado.

4. **Validación detallada de Fiestachat** - Título, subtítulo, fecha/hora, nombre del servicio.

5. **Validación de datos en página completa** - Verificar que los datos del evento aparecen en toda la página de detalles, no solo en secciones específicas.

### Recomendación:

Para tener una cobertura completa, se deberían **agregar estas validaciones faltantes** a `cliente-eventos.spec.ts`, o mantener ambos archivos si tienen propósitos diferentes:
- `eventos.spec.ts`: Prueba genérica de creación de evento con validaciones exhaustivas
- `cliente-eventos.spec.ts`: Prueba end-to-end completa desde proveedor hasta cliente

