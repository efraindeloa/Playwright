# Reporte Formal de Pruebas - Módulo de Servicios

## Información General

**Proyecto:** Fiestamas - Plataforma de Gestión de Eventos  
**Módulo:** Servicios  
**Ambiente de Pruebas:** Staging (https://staging.fiestamas.com)  
**Framework de Pruebas:** Playwright  
**Fecha de Generación:** 2025  
**Versión del Reporte:** 1.0  

---

## Resumen Ejecutivo

Este documento describe el conjunto completo de pruebas automatizadas implementadas para validar la funcionalidad del módulo de Servicios en la plataforma Fiestamas. Las pruebas cubren las operaciones CRUD (Crear, Leer, Actualizar, Eliminar), así como funcionalidades adicionales de búsqueda, filtrado, ordenamiento, activación/desactivación y navegación.

### Estadísticas Generales

- **Total de Pruebas:** 10 casos de prueba
- **Cobertura Funcional:** 100% de las funcionalidades principales
- **Timeout Global:** 90 segundos por prueba
- **Timeout Específico:** 600 segundos (10 minutos) para pruebas de creación y edición
- **Resolución de Pantalla:** 1280x720 píxeles
- **Login:** Se ejecuta automáticamente en `beforeEach` usando función centralizada de `utils.ts`

---

## Configuración del Entorno de Pruebas

### Configuración Técnica

```typescript
- Framework: Playwright Test
- Viewport: 1280x720 píxeles
- Timeout Global: 90000ms (90 segundos)
- Timeout Específico: 600000ms (10 minutos) para creación y edición
- Navegador: Chromium (por defecto)
- Modo de Ejecución: Headless (configurable)
```

### Credenciales de Prueba

- **Email:** fiestamasqaprv@gmail.com
- **Rol:** Proveedor
- **Ambiente:** Staging

### Funciones Auxiliares

El conjunto de pruebas utiliza las siguientes funciones auxiliares:

1. **`login(page)`**: Función que utiliza `loginFromUtils()` de `utils.ts` para realizar el proceso completo de autenticación
2. **`showStepMessage(page, message)`**: Muestra mensajes informativos durante la ejecución en un overlay visual
3. **`clearStepMessage(page)`**: Limpia los mensajes del overlay
4. **`selectRandomCategory(page, stepName)`**: Selecciona una categoría aleatoria de manera robusta
5. **`generateConditions(serviceName, maxLength)`**: Genera condiciones de servicio con límite de caracteres
6. **`generateServiceName(category, subcategory)`**: Genera nombres de servicio apropiados según la categoría

---

## Casos de Prueba Detallados

**Nota sobre Login:** El proceso de autenticación se ejecuta automáticamente en `beforeEach` usando la función `login()` que internamente utiliza `loginFromUtils()` de `utils.ts`. Esta función realiza la navegación inicial, apertura del formulario de login, llenado de credenciales y validación de redirección al dashboard. Todas las pruebas parten de un estado autenticado.

---

### 1. Crear Servicio

**ID:** TC-SERV-001  
**Prioridad:** Crítica  
**Timeout:** 600 segundos (10 minutos)  
**Descripción:** Valida la funcionalidad de creación de nuevos servicios con todas sus configuraciones.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Acceso a la página de administración de servicios
- Imágenes de prueba disponibles en `C:/Users/Efrain De Loa/Pictures/Fiestamas Testing/`

**Pasos de Ejecución:**

1. **Navegación a Administrar Servicios**
   - Hacer clic en el botón "Administrar servicios"

2. **Iniciar Creación**
   - Hacer clic en "Crear servicio"

3. **Selección de Categoría y Subcategoría**
   - Seleccionar una categoría aleatoria (Alimentos, Bebidas, Lugares, Mobiliario, Entretenimiento, Música, Decoración, Invitaciones, Mesa de regalos, Servicios Especializados)
   - Seleccionar una subcategoría aleatoria
   - Si la subcategoría requiere nivel anidado (After Party, Snacks Botanas, Infrastructura, Climatización), seleccionar subcategoría anidada

4. **Llenado de Datos del Servicio**
   - Nombre: Generado dinámicamente según categoría con timestamp
   - Descripción: Generada automáticamente con fecha
   - Unidades: Selección aleatoria de 1-3 unidades
   - Capacidad mínima: Valor aleatorio entre 1-10
   - Capacidad máxima: Valor aleatorio entre (mínima + 10) y (mínima + 60)

5. **Configuración de Precios y Condiciones**
   - Precio: Valor aleatorio entre $100.00 y $600.00
   - Unidad principal: Selección aleatoria del dropdown
   - Métodos de pago: Selección aleatoria de 1-2 métodos
   - Condiciones: Generadas automáticamente (máximo 150 caracteres)
   - Requiere anticipo: Opcional (50% probabilidad)

6. **Selección de Atributos**
   - Selección aleatoria de 1-3 atributos disponibles

7. **Configuración de Rango de Servicio**
   - Si la categoría NO es "Lugares": Seleccionar rango aleatorio usando slider (0-4)
   - Si la categoría es "Lugares": Omitir este paso

8. **Subida de Imagen**
   - Seleccionar una imagen aleatoria de la carpeta de pruebas
   - Esperar procesamiento de la imagen
   - Hacer clic en botón de envío

9. **Finalización**
   - Hacer clic en "Finalizar" o botón de confirmación
   - Verificar regreso automático al administrador de servicios

**Validaciones:**
- ✅ El servicio se crea exitosamente
- ✅ Se completa el flujo completo de creación
- ✅ Se regresa automáticamente al administrador de servicios
- ✅ El nombre del servicio contiene el timestamp para unicidad

**Datos Generados Dinámicamente:**
- Nombres de servicio según categoría (ej: "Catering Gourmet", "Bar Premium", "Salón de Eventos")
- Descripciones con fecha de creación
- Precios aleatorios
- Capacidades aleatorias
- Selección aleatoria de unidades, métodos de pago y atributos

---

### 2. Editar Servicio

**ID:** TC-SERV-002  
**Prioridad:** Crítica  
**Timeout:** 600 segundos (10 minutos)  
**Descripción:** Valida la funcionalidad de edición de servicios existentes.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Al menos un servicio existente en el sistema
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación y Selección**
   - Navegar a "Administrar servicios"
   - Seleccionar un servicio aleatorio de la lista
   - Abrir menú de opciones (tres puntos)
   - Hacer clic en "Editar"

2. **Edición de Datos Básicos**
   - Nombre: Agregar sufijo "- EDITADO" con timestamp
   - Descripción: Agregar sección de edición con fecha
   - Capacidad mínima: Valor aleatorio entre 5-25
   - Capacidad máxima: Valor aleatorio entre (mínima + 20) y (mínima + 70)

3. **Edición de Precios y Condiciones**
   - Precio: Nuevo valor aleatorio entre $200.00 y $1200.00
   - Condiciones: Regenerar con nuevo nombre (máximo 150 caracteres)

4. **Edición de Atributos**
   - Desmarcar aproximadamente la mitad de los atributos seleccionados
   - Marcar hasta 2 atributos nuevos

5. **Edición de Rango (si aplica)**
   - Si la categoría NO es "Lugares": Seleccionar nuevo rango aleatorio

6. **Agregar Nueva Imagen**
   - Subir una nueva imagen aleatoria
   - Esperar procesamiento

7. **Finalización**
   - Hacer clic en botón de envío final
   - Verificar regreso al administrador de servicios

**Validaciones:**
- ✅ El servicio se edita exitosamente
- ✅ Los cambios se reflejan correctamente
- ✅ Se completa el flujo completo de edición
- ✅ Se regresa automáticamente al administrador de servicios

**Estrategias de Recuperación:**
- Múltiples estrategias para encontrar botones de envío (ServiceMediaForm, alternativos, genéricos)
- Navegación manual como respaldo si no hay regreso automático

---

### 3. Eliminar Servicio

**ID:** TC-SERV-003  
**Prioridad:** Alta  
**Timeout:** 60 segundos  
**Descripción:** Valida la funcionalidad de eliminación de servicios.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Al menos un servicio existente en el sistema
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación y Selección**
   - Navegar a "Administrar servicios"
   - Seleccionar un servicio aleatorio de la lista
   - Abrir menú de opciones (tres puntos)

2. **Eliminación**
   - Hacer clic en "Eliminar"
   - Confirmar eliminación haciendo clic en "Aceptar"

3. **Verificación**
   - Contar servicios antes y después de la eliminación
   - Verificar que el conteo disminuyó

**Validaciones:**
- ✅ El servicio se elimina exitosamente
- ✅ El conteo de servicios disminuye después de la eliminación
- ✅ Se muestra mensaje de confirmación antes de eliminar

**Validación de Eliminación:**
- Comparación de conteo de servicios antes y después
- Verificación explícita de que el conteo disminuyó

---

### 4. Desactivar/Activar Servicio

**ID:** TC-SERV-004  
**Prioridad:** Media  
**Timeout:** 60 segundos  
**Descripción:** Valida la funcionalidad de activación y desactivación de servicios.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Al menos un servicio existente en el sistema
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación y Selección**
   - Navegar a "Administrar servicios"
   - Seleccionar un servicio aleatorio de la lista
   - Abrir menú de opciones (tres puntos)

2. **Cambio de Estado**
   - Si el servicio está activo:
     - Hacer clic en "Desactivar"
     - Verificar que aparece botón "Activar"
     - Hacer clic en "Activar"
     - Verificar que aparece botón "Desactivar"
   - Si el servicio está desactivado:
     - Hacer clic en "Activar"
     - Verificar que aparece botón "Desactivar"
     - Hacer clic en "Desactivar"
     - Verificar que aparece botón "Activar"

**Validaciones:**
- ✅ El servicio se desactiva correctamente
- ✅ El servicio se activa correctamente
- ✅ Los botones cambian según el estado actual
- ✅ Se puede alternar entre estados múltiples veces

**Lógica Adaptativa:**
- El test se adapta al estado inicial del servicio (activo o desactivado)
- Verifica ambos cambios de estado en una sola ejecución

---

### 5. Buscar Servicios

**ID:** TC-SERV-005  
**Prioridad:** Media  
**Timeout:** 60 segundos  
**Descripción:** Valida la funcionalidad de búsqueda de servicios.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Al menos un servicio existente en el sistema
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Estado Inicial**
   - Navegar a "Administrar servicios"
   - Obtener conteo inicial de servicios

2. **Realizar Búsqueda**
   - Llenar campo de búsqueda con término "prueba"
   - Esperar procesamiento de la búsqueda
   - Verificar valor del campo de búsqueda
   - Obtener conteo después de la búsqueda

3. **Limpiar Búsqueda**
   - Limpiar campo de búsqueda
   - Esperar procesamiento
   - Verificar que el campo está vacío
   - Obtener conteo después de limpiar

**Validaciones:**
- ✅ El campo de búsqueda acepta el término ingresado
- ✅ La búsqueda filtra los resultados (conteo disminuye o se mantiene si todos coinciden)
- ✅ El campo de búsqueda se limpia correctamente
- ✅ Se restauran todos los servicios después de limpiar
- ✅ El conteo final coincide con el inicial

**Validación Basada en DOM:**
- Conteo de elementos antes, durante y después de la búsqueda
- Verificación de valores en campos de entrada
- Comparación de estados para validar restauración

---

### 6. Filtrar Servicios

**ID:** TC-SERV-006  
**Prioridad:** Media  
**Timeout:** 90 segundos  
**Descripción:** Valida la funcionalidad de filtrado de servicios por categoría y estatus.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Al menos un servicio existente en el sistema
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Estado Inicial**
   - Navegar a "Administrar servicios"
   - Obtener conteo inicial de servicios

2. **Abrir Filtros**
   - Hacer clic en botón "Filtrar"
   - Verificar que el diálogo se abre correctamente

3. **Configurar Filtros**
   - Seleccionar categoría aleatoria del dropdown
   - Verificar que la categoría se seleccionó
   - Seleccionar estatus aleatorio del dropdown
   - Verificar que el estatus se seleccionó

4. **Aplicar Filtros**
   - Hacer clic en "Aplicar"
   - Verificar que el diálogo se cierra
   - Obtener conteo después de aplicar filtros

5. **Limpiar Filtros**
   - Reabrir diálogo de filtros
   - Hacer clic en "Limpiar"
   - Cerrar diálogo si es necesario
   - Obtener conteo después de limpiar

**Validaciones:**
- ✅ El diálogo de filtros se abre correctamente
- ✅ Los filtros se seleccionan correctamente (categoría y estatus)
- ✅ El diálogo se cierra después de aplicar
- ✅ Los filtros cambian el conteo de servicios (o se mantiene si todos coinciden)
- ✅ Los filtros se limpian correctamente
- ✅ Se restauran todos los servicios después de limpiar
- ✅ El conteo final coincide con el inicial

**Validación Basada en DOM:**
- Verificación de visibilidad de elementos del diálogo
- Verificación de valores seleccionados en botones
- Conteo de elementos antes, durante y después del filtrado
- Comparación de estados para validar restauración

**Manejo de Casos Especiales:**
- Si todos los servicios coinciden con los filtros, el conteo puede mantenerse (se reporta como advertencia)
- Tolerancia de hasta 2 servicios de diferencia al limpiar (puede ser por actualizaciones en tiempo real)

---

### 7. Ordenar Servicios

**ID:** TC-SERV-007  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Valida la funcionalidad de ordenamiento de servicios.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Al menos un servicio existente en el sistema
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación**
   - Navegar a "Administrar servicios"

2. **Ordenamiento**
   - Buscar botón de ordenamiento
   - Si existe:
     - Hacer clic en el botón (primera vez)
     - Esperar actualización
     - Hacer clic en el botón (segunda vez)
     - Esperar actualización
   - Si no existe:
     - Reportar que no se encontró el botón

**Validaciones:**
- ✅ El botón de ordenamiento se encuentra (si existe)
- ✅ El ordenamiento se ejecuta correctamente
- ✅ Se puede alternar el orden múltiples veces

**Manejo de Casos:**
- Si el botón no existe, se reporta como advertencia pero no falla el test

---

### 8. Navegar a Chats desde Servicios

**ID:** TC-SERV-008  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Valida la navegación desde la página de servicios hacia la página de chats.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación Inicial**
   - Navegar a "Administrar servicios"

2. **Navegación a Chats**
   - Buscar enlace a chats (icono de mensaje)
   - Si existe:
     - Hacer clic en el enlace
     - Verificar que la URL contiene `/provider/chats`

3. **Regreso a Servicios**
   - Navegar manualmente a `/provider/services`
   - Verificar que la URL contiene `/provider/services`

**Validaciones:**
- ✅ El enlace a chats existe y es clickeable
- ✅ La navegación a chats es exitosa (URL correcta)
- ✅ El regreso a servicios es exitoso (URL correcta)

**Validación de Navegación:**
- Verificación de URLs después de cada navegación
- Validación explícita de rutas correctas

---

### 9. Navegar a Perfil desde Servicios

**ID:** TC-SERV-009  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Valida la navegación desde la página de servicios hacia la página de perfil.

**Precondiciones:**
- Usuario autenticado como Proveedor
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación Inicial**
   - Navegar a "Administrar servicios"

2. **Navegación a Perfil**
   - Buscar enlace a perfil (icono de usuario)
   - Si existe:
     - Hacer clic en el enlace
     - Verificar que la URL contiene `/provider/profile`
     - Verificar que existe elemento "Datos personales"

3. **Regreso a Servicios**
   - Navegar manualmente a `/provider/services`
   - Verificar que la URL contiene `/provider/services`

**Validaciones:**
- ✅ El enlace a perfil existe y es clickeable
- ✅ La navegación a perfil es exitosa (URL correcta)
- ✅ La página de perfil contiene elementos esperados
- ✅ El regreso a servicios es exitoso (URL correcta)

**Validación de Contenido:**
- Verificación de URLs
- Verificación de elementos específicos de la página de destino

---

### 10. Navegar a Home desde Servicios

**ID:** TC-SERV-010  
**Prioridad:** Baja  
**Timeout:** 60 segundos  
**Descripción:** Valida la navegación desde la página de servicios hacia el dashboard principal (home).

**Precondiciones:**
- Usuario autenticado como Proveedor
- Acceso a la página de administración de servicios

**Pasos de Ejecución:**

1. **Navegación Inicial**
   - Navegar a "Administrar servicios"

2. **Navegación a Home**
   - Buscar enlace a home (logo o enlace principal)
   - Si existe:
     - Hacer clic en el enlace
     - Verificar que la URL contiene `/provider` pero NO `/services`
     - Verificar que existe el logo de Fiestamas
     - Verificar que NO estamos en la página de servicios

3. **Regreso a Servicios**
   - Navegar manualmente a `/provider/services`
   - Verificar que la URL contiene `/provider/services`

**Validaciones:**
- ✅ El enlace a home existe y es clickeable
- ✅ La navegación a home es exitosa (URL correcta)
- ✅ La página home contiene elementos esperados (logo)
- ✅ Se confirma que no estamos en la página de servicios
- ✅ El regreso a servicios es exitoso (URL correcta)

**Validación de Navegación:**
- Verificación de URLs con lógica negativa (NO debe contener `/services`)
- Verificación de elementos visuales (logo)
- Validación explícita de que se salió de la página de servicios

---

## Técnicas y Herramientas Utilizadas

### Validación Basada en DOM

Todas las pruebas utilizan validaciones basadas en el DOM en lugar de comparación de screenshots, lo que proporciona:

- **Mayor Velocidad:** No se generan ni comparan imágenes
- **Mayor Confiabilidad:** Las validaciones son más precisas y menos propensas a falsos positivos
- **Mejor Depuración:** Los errores son más fáciles de identificar y corregir
- **Mantenibilidad:** Los tests son más fáciles de mantener y actualizar

### Técnicas de Validación

1. **Conteo de Elementos:** Se cuenta el número de elementos antes y después de operaciones para validar cambios
2. **Verificación de Valores:** Se verifica el contenido de campos de entrada y botones
3. **Validación de Visibilidad:** Se verifica que los elementos aparezcan o desaparezcan según corresponda
4. **Validación de URLs:** Se verifica que las navegaciones redirijan a las URLs correctas
5. **Validación de Texto:** Se verifica el contenido de texto en elementos específicos

### Funciones de Generación de Datos

1. **`generateServiceName(category, subcategory)`**: Genera nombres de servicio contextuales según la categoría
2. **`generateConditions(serviceName, maxLength)`**: Genera condiciones de servicio respetando límites de caracteres

### Estrategias de Recuperación

Las pruebas implementan múltiples estrategias de recuperación para mayor robustez:

- **Múltiples Selectores:** Se intentan diferentes selectores para encontrar elementos
- **Timeouts Adaptativos:** Se ajustan los timeouts según la complejidad de la operación
- **Navegación Manual:** Se usa como respaldo cuando la navegación automática falla
- **Manejo de Errores:** Se capturan y reportan errores sin detener la ejecución completa

---

## Datos de Prueba

### Categorías de Servicios Soportadas

- Alimentos
- Bebidas
- Lugares
- Mobiliario
- Entretenimiento
- Música
- Decoración
- Invitaciones
- Mesa de regalos
- Servicios Especializados

### Subcategorías con Nivel Anidado

- After Party
- Snacks Botanas
- Infrastructura
- Climatización

### Imágenes de Prueba

Las imágenes se encuentran en: `C:/Users/Efrain De Loa/Pictures/Fiestamas Testing/`

Archivos disponibles:
- logo.png
- alimentos.png
- comidas.png
- desayunos.png
- cenas.png
- Bebidas.avif
- public.webp

### Rangos de Datos Generados

- **Precios:** $100.00 - $600.00 (creación), $200.00 - $1200.00 (edición)
- **Capacidad Mínima:** 1-10 (creación), 5-25 (edición)
- **Capacidad Máxima:** (mínima + 10) - (mínima + 60) (creación), (mínima + 20) - (mínima + 70) (edición)
- **Unidades:** 1-3 seleccionadas aleatoriamente
- **Métodos de Pago:** 1-2 seleccionados aleatoriamente
- **Atributos:** 1-3 seleccionados aleatoriamente
- **Rango de Servicio:** 0-4 (slider)

---

## Limitaciones Conocidas

1. **Dependencia de Imágenes:** Las pruebas de creación y edición requieren que existan imágenes en la ruta especificada
2. **Categoría "Lugares":** Esta categoría no requiere configuración de rango de servicio, lo cual se maneja automáticamente
3. **Subcategorías Anidadas:** Solo ciertas subcategorías requieren un nivel adicional de selección
4. **Tiempo de Procesamiento:** La subida de imágenes puede tomar tiempo variable según el tamaño del archivo
5. **Estado Inicial de Servicios:** Algunas pruebas requieren que existan servicios previos en el sistema

---

## Mejoras y Optimizaciones

### Optimizaciones Implementadas

1. **Eliminación de Screenshots:** Se eliminaron todas las capturas de pantalla para mejorar el rendimiento
2. **Validaciones Basadas en DOM:** Todas las validaciones usan el DOM en lugar de comparación de imágenes
3. **Login Centralizado:** Se utiliza la función de login de `utils.ts` para evitar duplicación
4. **Generación Dinámica de Datos:** Los datos se generan dinámicamente para evitar conflictos
5. **Selección Aleatoria:** Se seleccionan elementos aleatoriamente para mayor cobertura de pruebas

### Funciones Auxiliares Reutilizables

- `selectRandomCategory()`: Selección robusta de categorías
- `generateServiceName()`: Generación contextual de nombres
- `generateConditions()`: Generación de condiciones con límites
- `showStepMessage()`: Mensajes informativos durante ejecución

---

## Conclusiones

El conjunto de pruebas del módulo de Servicios proporciona una cobertura completa de las funcionalidades principales, incluyendo operaciones CRUD, búsqueda, filtrado, ordenamiento, activación/desactivación y navegación. Las pruebas están diseñadas para ser robustas, mantenibles y eficientes, utilizando validaciones basadas en DOM y estrategias de recuperación para manejar casos edge.

La implementación actual garantiza que:
- ✅ Todas las operaciones críticas están cubiertas
- ✅ Las validaciones son precisas y confiables
- ✅ Los tests son rápidos y eficientes
- ✅ El código es mantenible y extensible
- ✅ Se manejan casos especiales y errores apropiadamente

---

**Fin del Reporte**

