# Reporte Formal de Pruebas - Módulo de Promociones

## Información General

**Proyecto:** Fiestamas - Plataforma de Gestión de Eventos  
**Módulo:** Promociones  
**Ambiente de Pruebas:** Staging (https://staging.fiestamas.com)  
**Framework de Pruebas:** Playwright  
**Fecha de Generación:** 2025  
**Versión del Reporte:** 1.0

---

## Resumen Ejecutivo

Este documento describe el conjunto completo de pruebas automatizadas implementadas para validar la funcionalidad del módulo de Promociones en la plataforma Fiestamas. Las pruebas cubren las operaciones CRUD (Crear, Leer, Actualizar, Eliminar), así como funcionalidades adicionales de búsqueda, filtrado, ordenamiento y navegación.

### Estadísticas Generales

- **Total de Pruebas:** 10 casos de prueba
- **Cobertura Funcional:** 100% de las funcionalidades principales
- **Timeout Global:** 60 segundos por prueba
- **Timeout Específico:** 90 segundos para pruebas de edición y eliminación
- **Resolución de Pantalla:** 1280x720 píxeles

---

## Configuración del Entorno de Pruebas

### Configuración Técnica

```typescript
- Framework: Playwright Test
- Viewport: 1280x720 píxeles
- Timeout Global: 60000ms (60 segundos)
- Navegador: Chromium (por defecto)
- Modo de Ejecución: Headless (configurable)
```

### Credenciales de Prueba

- **Email:** fiestamasqaprv@gmail.com
- **Rol:** Proveedor
- **Ambiente:** Staging

### Funciones Auxiliares

El conjunto de pruebas utiliza las siguientes funciones auxiliares:

1. **`login(page)`**: Realiza el proceso de autenticación automática
2. **`showStepMessage(page, message)`**: Muestra mensajes informativos durante la ejecución
3. **`pickDateSmart(page, selector, date)`**: Selección inteligente de fechas usando flatpickr
4. **`hideDynamicElements(page)`**: Oculta elementos dinámicos para comparaciones visuales
5. **`showDynamicElements(page)`**: Restaura elementos dinámicos

---

## Casos de Prueba Detallados

### 1. Login

**ID:** TC-PROM-001  
**Prioridad:** Crítica  
**Descripción:** Verifica que el proceso de autenticación se ejecute correctamente antes de cada prueba.

**Precondiciones:**
- Usuario válido registrado en el sistema
- Credenciales correctas disponibles

**Pasos de Ejecución:**
1. Navegar a la página principal
2. Hacer clic en el botón de login
3. Ingresar credenciales
4. Verificar redirección al dashboard

**Resultado Esperado:**
- Login exitoso
- Redirección a `/provider/dashboard`
- Sesión activa para pruebas subsiguientes

**Nota:** Esta prueba se ejecuta automáticamente en `beforeEach`, por lo que todas las demás pruebas parten de un estado autenticado.

---

### 2. Crear Promoción

**ID:** TC-PROM-002  
**Prioridad:** Crítica  
**Timeout:** 60 segundos  
**Descripción:** Valida la funcionalidad de creación de nuevas promociones.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Acceso a la página de administración de promociones

**Pasos de Ejecución:**
1. Navegar a "Administrar promociones"
2. Hacer clic en "Crear promoción"
3. Completar formulario:
   - Título: Generado dinámicamente con timestamp (`Promo de prueba YYYY-MM-DDTHH-mm-ss`)
   - Fecha de inicio: Día actual
   - Fecha de fin: 30 días después del día actual
   - Imagen: Archivo `C:/Temp/transparent.png`
4. Hacer clic en "Finalizar"
5. Verificar que la promoción aparece en el listado

**Validaciones:**
- ✅ Formulario se abre correctamente
- ✅ Campos aceptan datos válidos
- ✅ Promoción se guarda exitosamente
- ✅ Promoción aparece en el listado después de recargar
- ✅ Título de la promoción es visible con timeout de 20 segundos

**Datos de Prueba:**
- Título: Dinámico con formato `Promo de prueba [timestamp]`
- Fechas: Calculadas automáticamente desde la fecha actual
- Imagen: Archivo local en `C:/Temp/transparent.png`

---

### 3. Ordenar Promociones

**ID:** TC-PROM-003  
**Prioridad:** Media  
**Timeout:** 60 segundos  
**Descripción:** Verifica la funcionalidad de ordenamiento de promociones en el listado.

**Precondiciones:**
- Usuario autenticado
- Múltiples promociones existentes en el sistema

**Pasos de Ejecución:**
1. Navegar a "Administrar promociones"
2. Capturar screenshot del estado inicial
3. Hacer clic en el botón de ordenamiento (icono `icon-sort-descending`)
4. Capturar screenshot después del primer ordenamiento
5. Hacer clic nuevamente en el botón de ordenamiento
6. Capturar screenshot después del segundo ordenamiento
7. Comparar screenshots para validar cambios

**Validaciones:**
- ✅ Botón de ordenamiento es clickeable
- ✅ Primer ordenamiento produce cambios visibles
- ✅ Segundo ordenamiento produce cambios visibles
- ✅ Comparación pixel por pixel detecta diferencias
- ✅ Comparación de tamaño de archivo detecta cambios

**Técnicas de Validación:**
- Comparación de tamaño de archivos PNG
- Comparación pixel por pixel usando `pixelmatch`
- Threshold de diferencia: 0.1

**Archivos Generados:**
- `ordenar01-promotions-before-sort.png`
- `ordenar02-promotions-after-first-sort.png`
- `ordenar03-promotions-after-second-sort.png`

---

### 4. Filtrar Promociones

**ID:** TC-PROM-004  
**Prioridad:** Media  
**Timeout:** 60 segundos  
**Descripción:** Valida la funcionalidad de filtrado de promociones por rango de fechas.

**Precondiciones:**
- Usuario autenticado
- Promociones existentes con diferentes fechas

**Pasos de Ejecución:**
1. Navegar a "Administrar promociones"
2. Capturar screenshot del estado inicial
3. Hacer clic en el botón "Filtrar"
4. Configurar fechas:
   - Fecha inicio: 01-01-2025
   - Fecha fin: 31-12-2025
5. Hacer clic en "Aplicar"
6. Capturar screenshot después de aplicar filtro
7. Reabrir el diálogo de filtros
8. Hacer clic en "Limpiar"
9. Capturar screenshot después de limpiar filtros
10. Comparar screenshots

**Validaciones:**
- ✅ Diálogo de filtros se abre correctamente
- ✅ Campos de fecha aceptan valores
- ✅ Filtro se aplica correctamente
- ✅ Listado se actualiza según filtro
- ✅ Botón "Limpiar" restaura el estado original
- ✅ Comparación visual detecta cambios

**Técnicas de Validación:**
- Comparación de tamaño de archivos
- Comparación pixel por pixel
- Validación de vuelta al estado original

**Archivos Generados:**
- `filtrar01-promotions-before-filter.png`
- `filtrar02-filter-dialog-open.png`
- `filtrar03-dates-configured.png`
- `filtrar04-after-apply-filter.png`
- `filtrar05-filter-dialog-reopened.png`
- `filtrar06-after-clear.png`

---

### 5. Buscar Promociones

**ID:** TC-PROM-005  
**Prioridad:** Media  
**Timeout:** 60 segundos  
**Descripción:** Verifica la funcionalidad de búsqueda de promociones por texto.

**Precondiciones:**
- Usuario autenticado
- Promociones existentes con el texto "Promo de prueba"

**Pasos de Ejecución:**
1. Navegar a "Administrar promociones"
2. Capturar screenshot del estado inicial
3. Ingresar texto "Promo de prueba" en el campo de búsqueda
4. Esperar a que se procese la búsqueda
5. Capturar screenshot después de la búsqueda
6. Limpiar el campo de búsqueda
7. Capturar screenshot después de limpiar
8. Ingresar texto "Término que no existe"
9. Capturar screenshot con búsqueda sin resultados
10. Limpiar nuevamente el campo
11. Capturar screenshot final
12. Comparar todos los screenshots

**Validaciones:**
- ✅ Campo de búsqueda acepta texto
- ✅ Búsqueda filtra resultados correctamente
- ✅ Limpieza restaura el listado completo
- ✅ Búsqueda sin resultados muestra estado apropiado
- ✅ Vuelta al estado original es exitosa
- ✅ Comparación pixel por pixel valida cambios

**Casos de Prueba Incluidos:**
- Búsqueda con resultados
- Búsqueda sin resultados
- Limpieza de búsqueda
- Restauración al estado original

**Archivos Generados:**
- `buscar01-promotions-before-search.png`
- `buscar02-promotions-after-search.png`
- `buscar03-promotions-after-clear-search.png`
- `buscar04-promotions-no-results.png`
- `buscar05-promotions-final-clear.png`

---

### 6. Editar Promoción

**ID:** TC-PROM-006  
**Prioridad:** Crítica  
**Timeout:** 90 segundos  
**Descripción:** Valida la funcionalidad de edición de promociones existentes.

**Precondiciones:**
- Usuario autenticado
- Al menos una promoción existente con el texto "Promo de prueba"

**Pasos de Ejecución:**
1. Navegar a "Administrar promociones"
2. Localizar una promoción que contenga "Promo de prueba"
3. Hacer clic en el menú de opciones (icono `icon-more-vertical`)
4. Seleccionar "Editar"
5. Modificar los siguientes campos:
   - Título: `Promo Editada [timestamp]`
   - Fecha de inicio: Día actual
   - Fecha de fin: 15 días después del día actual
6. Eliminar la imagen actual
7. Subir nueva imagen (`C:/Temp/images.jpeg`)
8. Hacer clic en "Finalizar"
9. Verificar que los cambios se guardaron correctamente
10. Recargar la página y validar que la promoción editada es visible

**Validaciones:**
- ✅ Menú de opciones se despliega correctamente
- ✅ Opción "Editar" es accesible
- ✅ Formulario de edición se carga con datos existentes
- ✅ Campos aceptan modificaciones
- ✅ Imagen se elimina correctamente
- ✅ Nueva imagen se sube exitosamente
- ✅ Cambios se guardan correctamente
- ✅ Promoción editada aparece en el listado con timeout de 20 segundos

**Datos de Prueba:**
- Título editado: `Promo Editada [timestamp]`
- Fechas: Recalculadas desde la fecha actual
- Nueva imagen: `C:/Temp/images.jpeg`

---

### 7. Eliminar Promoción

**ID:** TC-PROM-007  
**Prioridad:** Crítica  
**Timeout:** 90 segundos  
**Descripción:** Verifica la funcionalidad de eliminación de promociones con validación explícita.

**Precondiciones:**
- Usuario autenticado
- Al menos una promoción existente con el texto "Promo Editada" (creada en prueba anterior)

**Pasos de Ejecución:**
1. Navegar a "Administrar promociones"
2. Esperar 5 segundos para carga completa
3. Localizar una promoción que contenga "Promo Editada"
4. Guardar el nombre exacto de la promoción
5. Hacer clic en el menú de opciones
6. Seleccionar "Eliminar"
7. Confirmar eliminación haciendo clic en "Aceptar"
8. Recargar la página
9. Validar que la promoción ya no existe:
   - Buscar por nombre exacto (count debe ser 0)
   - Verificar que la tarjeta de la promoción no existe

**Validaciones:**
- ✅ Promoción se localiza correctamente (timeout de 20 segundos)
- ✅ Menú de eliminación se despliega
- ✅ Diálogo de confirmación aparece
- ✅ Eliminación se confirma exitosamente
- ✅ Promoción desaparece del listado
- ✅ Validación explícita: count de promociones con ese nombre = 0
- ✅ Validación adicional: count de tarjetas con ese nombre = 0

**Técnicas de Validación:**
- Búsqueda por texto exacto del nombre
- Conteo de elementos encontrados
- Validación de ausencia en el DOM
- Timeout extendido para carga de datos

**Mensajes de Validación:**
- ✅ "La promoción [nombre] fue eliminada correctamente (0 promociones encontradas con ese nombre)"
- ❌ Error si se encuentran promociones o tarjetas con ese nombre

---

### 8. Navegar a Chats desde Promociones

**ID:** TC-PROM-008  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Verifica la navegación desde la página de promociones hacia el módulo de chats.

**Precondiciones:**
- Usuario autenticado
- Acceso a la página de promociones

**Pasos de Ejecución:**
1. Navegar directamente a `/provider/promotions`
2. Capturar screenshot de la página de promociones
3. Hacer clic en el enlace de chats (icono `icon-message-square`)
4. Verificar que se navega a `/provider/chats`
5. Validar que el título "Fiestachat" es visible
6. Capturar screenshot de la página de chats
7. Regresar a la página de promociones
8. Verificar que se regresó correctamente
9. Capturar screenshot final

**Validaciones:**
- ✅ Navegación a chats es exitosa
- ✅ URL cambia a `/provider/chats`
- ✅ Título "Fiestachat" es visible (timeout de 10 segundos)
- ✅ Regreso a promociones es exitoso
- ✅ URL vuelve a `/provider/promotions`
- ✅ Botón "Crear promoción" es visible

**Archivos Generados:**
- `chats01-promotions-page.png`
- `chats02-conversations-page.png`
- `chats03-back-to-promotions.png`

---

### 9. Navegar a Perfil desde Promociones

**ID:** TC-PROM-009  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Verifica la navegación desde la página de promociones hacia el perfil del usuario.

**Precondiciones:**
- Usuario autenticado
- Acceso a la página de promociones

**Pasos de Ejecución:**
1. Navegar directamente a `/provider/promotions`
2. Capturar screenshot de la página de promociones
3. Hacer clic en el enlace de perfil (icono `icon-user`)
4. Verificar que se navega a `/provider/profile`
5. Validar que el elemento "Datos personales" es visible
6. Capturar screenshot de la página de perfil
7. Regresar a la página de promociones
8. Verificar que se regresó correctamente
9. Capturar screenshot final

**Validaciones:**
- ✅ Navegación a perfil es exitosa
- ✅ URL cambia a `/provider/profile`
- ✅ Elemento "Datos personales" es visible (timeout de 10 segundos)
- ✅ Regreso a promociones es exitoso
- ✅ URL vuelve a `/provider/promotions`
- ✅ Botón "Crear promoción" es visible

**Archivos Generados:**
- `perfil01-promotions-page.png`
- `perfil02-profile-page.png`
- `perfil03-back-to-promotions.png`

---

### 10. Navegar a Dashboard desde Promociones

**ID:** TC-PROM-010  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Verifica la navegación desde la página de promociones hacia el dashboard principal del proveedor.

**Precondiciones:**
- Usuario autenticado
- Acceso a la página de promociones

**Pasos de Ejecución:**
1. Navegar directamente a `/provider/promotions`
2. Capturar screenshot de la página de promociones
3. Hacer clic en el logo de Fiestamas (enlace home)
4. Verificar que se navega al dashboard principal
5. Validar elementos característicos:
   - Logo de Fiestamas visible
   - Elementos de navegación presentes
   - No hay elementos específicos de promociones
6. Capturar screenshot del dashboard
7. Regresar a la página de promociones
8. Verificar que se regresó correctamente
9. Capturar screenshot final

**Validaciones:**
- ✅ Navegación al dashboard es exitosa
- ✅ URL cambia a `/provider` (sin subrutas)
- ✅ Logo de Fiestamas es visible (timeout de 10 segundos)
- ✅ Elementos de navegación están presentes (mínimo 2 enlaces)
- ✅ No hay elementos específicos de promociones
- ✅ Regreso a promociones es exitoso
- ✅ URL vuelve a `/provider/promotions`

**Validaciones Específicas:**
- Logo: `svg#Capa_1[width="282"]`
- Enlaces de navegación: `/provider/promotions`, `/provider/chats`, `/provider/profile`
- Ausencia de: campo de búsqueda, botón "Crear promoción", título "Promociones"

**Archivos Generados:**
- `home01-promotions-page.png`
- `home02-home-page.png`
- `home03-back-to-promotions.png`

---

## Técnicas y Herramientas Utilizadas

### Comparación Visual

Las pruebas utilizan técnicas avanzadas de comparación visual:

1. **Comparación de Tamaño de Archivo:**
   - Análisis de cambios en el tamaño de archivos PNG
   - Detección de diferencias estructurales

2. **Comparación Pixel por Pixel:**
   - Librería: `pixelmatch`
   - Threshold: 0.1 (10% de tolerancia)
   - Generación de imágenes de diferencia

3. **Librerías Utilizadas:**
   - `png-js`: Lectura y manipulación de imágenes PNG
   - `pixelmatch`: Comparación de imágenes
   - `fs`: Operaciones de sistema de archivos

### Manejo de Fechas

La selección de fechas utiliza una estrategia multi-nivel:

1. **Intento 1:** API de flatpickr si está disponible
2. **Intento 2:** Interacción con el calendario visual
3. **Intento 3:** Inyección directa de valor vía JavaScript

### Gestión de Timeouts

- **Timeout Global:** 60 segundos
- **Timeout Extendido:** 90 segundos (edición y eliminación)
- **Timeouts Específicos:**
  - Búsqueda de promociones: 20 segundos
  - Carga de páginas: 2-5 segundos
  - Espera de elementos: 5-10 segundos

### Mensajes Informativos

Sistema de mensajes visuales durante la ejecución:
- Overlay temporal en pantalla
- Mensajes descriptivos de cada paso
- Auto-eliminación después de 2 segundos

---

## Cobertura Funcional

### Funcionalidades Principales

| Funcionalidad | Estado | Casos de Prueba |
|--------------|--------|-----------------|
| Crear Promoción | ✅ Cubierto | TC-PROM-002 |
| Editar Promoción | ✅ Cubierto | TC-PROM-006 |
| Eliminar Promoción | ✅ Cubierto | TC-PROM-007 |
| Listar Promociones | ✅ Cubierto | TC-PROM-002, TC-PROM-006, TC-PROM-007 |
| Buscar Promociones | ✅ Cubierto | TC-PROM-005 |
| Filtrar Promociones | ✅ Cubierto | TC-PROM-004 |
| Ordenar Promociones | ✅ Cubierto | TC-PROM-003 |
| Navegación | ✅ Cubierto | TC-PROM-008, TC-PROM-009, TC-PROM-010 |

### Validaciones Implementadas

- ✅ Validación de existencia de elementos
- ✅ Validación de visibilidad
- ✅ Validación de URLs
- ✅ Validación de conteo de elementos
- ✅ Validación de ausencia de elementos
- ✅ Validación visual (screenshots)
- ✅ Validación de cambios de estado

---

## Dependencias y Requisitos

### Archivos Requeridos

- `C:/Temp/transparent.png` - Imagen para creación de promociones
- `C:/Temp/images.jpeg` - Imagen para edición de promociones

### Credenciales

- Email: `fiestamasqaprv@gmail.com`
- Password: `Fiesta2025$`

### Configuración del Sistema

- Node.js instalado
- Playwright instalado
- Dependencias npm instaladas:
  - `@playwright/test`
  - `png-js`
  - `pixelmatch`
  - `@types/node`

---

## Ejecución de las Pruebas

### Comandos Disponibles

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con interfaz gráfica
npm run test:ui

# Ejecutar en modo headed (navegador visible)
npm run test:headed

# Ejecutar en modo debug
npm run test:debug

# Ver reporte de ejecución
npm run test:report

# Ejecutar un archivo específico
npx playwright test tests/promotions.spec.ts

# Ejecutar una prueba específica
npx playwright test tests/promotions.spec.ts -g "Crear promoción"
```

### Orden de Ejecución Recomendado

Las pruebas están diseñadas para ejecutarse en el siguiente orden:

1. Login (automático en beforeEach)
2. Crear promoción
3. Ordenar promociones
4. Filtrar promociones
5. Buscar promociones
6. Editar promoción (depende de "Crear promoción")
7. Eliminar promoción (depende de "Editar promoción")
8. Navegar a chats
9. Navegar a perfil
10. Navegar a dashboard

---

## Limitaciones Conocidas

1. **Archivos de Imagen:** Las pruebas requieren archivos específicos en `C:/Temp/`
2. **Ambiente:** Las pruebas están configuradas para el ambiente de staging
3. **Credenciales:** Requiere credenciales válidas de proveedor
4. **Dependencias:** Algunas pruebas dependen de la ejecución exitosa de pruebas anteriores

---

## Mantenimiento y Actualizaciones

### Cuándo Actualizar las Pruebas

- Cuando se modifiquen los selectores de elementos
- Cuando cambien las rutas de navegación
- Cuando se agreguen nuevas funcionalidades
- Cuando se modifiquen los flujos de usuario

### Áreas de Mejora Futura

1. Implementar pruebas de regresión visual automatizada
2. Agregar pruebas de rendimiento
3. Implementar pruebas de accesibilidad
4. Agregar pruebas de integración con APIs
5. Implementar pruebas de carga

---

## Conclusiones

El conjunto de pruebas implementado proporciona una cobertura completa de las funcionalidades principales del módulo de Promociones. Las pruebas están diseñadas para ser:

- **Robustas:** Manejo adecuado de timeouts y esperas
- **Mantenibles:** Código organizado con funciones reutilizables
- **Confiables:** Validaciones explícitas y múltiples puntos de verificación
- **Informativas:** Mensajes claros y screenshots para debugging

Las pruebas están listas para ser integradas en un pipeline de CI/CD y pueden ejecutarse de forma automatizada para validar la funcionalidad del módulo en cada despliegue.

---

## Contacto y Soporte

Para preguntas o reportes de problemas relacionados con estas pruebas, contactar al equipo de QA o al responsable del proyecto.

---

**Fin del Reporte**

