# Documentación de Pruebas - home.spec.ts

## 📋 Descripción

Pruebas que validan la funcionalidad completa de la página de inicio (`/`) de Fiestamas, incluyendo elementos técnicos, componentes interactivos y navegación.

## 🎯 Objetivo

Asegurar que todos los elementos y funcionalidades de la página principal funcionan correctamente y proporcionan una experiencia de usuario óptima.

## 📄 Archivo

`tests/common/home.spec.ts`

---

## 🧪 Pruebas Incluidas

### 1. Validar elementos técnicos únicos de la página de inicio

**Línea**: `9`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que los elementos técnicos fundamentales de la página están presentes y funcionando.

#### Elementos validados:

- ✅ **Estructura del `<body>`**
  - Clase `__className_4de144`
  - Atributo `cz-shortcut-listen` (opcional)

- ✅ **Scripts de Next.js**
  - Script de webpack (`script[id="_R_"][src*="webpack"]`)
  - Scripts con patrón `__next_f` o `self.__next_f`

- ✅ **Next Route Announcer**
  - Elemento `<next-route-announcer>`

- ✅ **Toaster**
  - Elemento `div#_rht_toaster` para notificaciones

- ✅ **Script de Google OAuth**
  - Script con `src*="accounts.google.com/gsi/client"`

- ✅ **Meta tags esenciales**
  - Meta tags de configuración de la aplicación

- ✅ **Estructura HTML básica**
  - Validación de elementos fundamentales del DOM

#### Notas:
- Esta prueba valida solo elementos técnicos únicos que no se cubren en otras pruebas
- Las validaciones de navbar, hero, categorías, eventos, estímulos y footer se realizan en las pruebas de funcionalidad correspondientes

---

### 2. Validar funcionalidad del navbar superior

**Línea**: `192`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que todos los elementos del navbar funcionan correctamente.

#### Elementos validados:

- ✅ **Logo de Fiestamas**
  - Presencia del logo (`svg#Capa_1`)
  - Logo dentro de un enlace o botón
  - Navegación al hacer clic (debe llevar a la página de inicio)

- ✅ **Enlaces de navegación**
  - Enlaces principales del navbar
  - Navegación correcta al hacer clic
  - URLs correctas después de la navegación

- ✅ **Botón de búsqueda**
  - Botón visible y clicable
  - Funcionalidad de búsqueda (si aplica)

- ✅ **Botones de autenticación**
  - Botón "Iniciar sesión"
  - Botón "Registrarse"
  - Navegación a páginas de autenticación

- ✅ **Menú de usuario** (si está autenticado)
  - Menú desplegable
  - Opciones del menú

- ✅ **Responsividad**
  - Comportamiento en diferentes tamaños de pantalla

#### Selectores utilizados:
- Navbar: `nav.z-50.fixed.w-dvw.text-neutral-1000.bg-neutral-0`
- Logo: `svg#Capa_1`
- Enlaces: Varios selectores según el tipo de enlace

---

### 3. Validar funcionalidad del hero banner

**Línea**: `978`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que el carrusel de banners del hero funciona correctamente.

#### Funcionalidades validadas:

- ✅ **Presencia de banners**
  - Banners visibles en el hero
  - Imágenes de banners cargadas correctamente

- ✅ **Indicadores/puntos de navegación**
  - Puntos del carrusel visibles (`button.rounded-full`)
  - Al menos 3 puntos encontrados

- ✅ **Navegación entre banners**
  - Clic en cada punto del carrusel
  - Transición entre banners
  - Banner correcto visible después del clic

- ✅ **Botones de acción (CTA)**
  - Botones de llamada a la acción en cada banner
  - Navegación al hacer clic en CTA

- ✅ **Imágenes de banners**
  - Imagen con `alt="Hero_Image"` o similar
  - Imágenes cargadas correctamente

#### Proceso de validación:
1. Buscar contenedor del hero
2. Encontrar indicadores/puntos del carrusel
3. Para cada punto:
   - Hacer clic en el punto
   - Esperar transición
   - Verificar que el banner correspondiente está visible
   - Verificar botones CTA

#### Selectores utilizados:
- Hero image: `img[alt="Hero_Image"]`
- Indicadores: `button.rounded-full` dentro del hero
- Contenedor hero: `main div:has(img[alt*="Hero"])` o `[class*="hero"]`

---

### 4. Validar funcionalidad de la sección de categorías

**Línea**: `1334`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que las categorías principales se muestran y son navegables.

#### Elementos validados:

- ✅ **Grid de categorías**
  - Grid visible en la página
  - Estructura del grid correcta

- ✅ **Tarjetas de categoría**
  - Tarjetas con imágenes
  - Nombres de categorías visibles
  - Diseño consistente

- ✅ **Navegación**
  - Clic en cada categoría navega correctamente
  - URLs correctas (`/c/[slug-categoria]`)
  - Página de categoría carga correctamente

- ✅ **Contenido**
  - Categorías esperadas presentes
  - Imágenes de categorías cargadas

#### Proceso de validación:
1. Buscar sección de categorías
2. Encontrar todas las tarjetas de categoría
3. Para cada categoría:
   - Verificar que es visible
   - Verificar imagen
   - Verificar nombre
   - Hacer clic y verificar navegación

---

### 5. Validar funcionalidad de los botones de tipos de eventos

**Línea**: `1572`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que los filtros de tipos de eventos funcionan correctamente.

#### Tipos de eventos validados:

- ✅ Cumpleaños
- ✅ Baby Shower
- ✅ Bautizo
- ✅ Despedida
- ✅ Corporativa
- ✅ Otros tipos disponibles

#### Funcionalidades:

- ✅ **Botones visibles y clicables**
  - Todos los botones de tipos de eventos visibles
  - Botones habilitados

- ✅ **Filtrado de contenido**
  - Al seleccionar un tipo, el contenido se filtra
  - Resultados filtrados visibles

- ✅ **Actualización de URL**
  - URL cambia al seleccionar un tipo
  - Parámetros de filtro en la URL

- ✅ **Visualización de resultados**
  - Resultados filtrados se muestran correctamente
  - Contenido relevante al tipo seleccionado

#### Proceso de validación:
1. Encontrar botones de tipos de eventos
2. Para cada tipo:
   - Hacer clic en el botón
   - Verificar cambio en URL
   - Verificar que el contenido se filtra
   - Verificar resultados mostrados

---

### 6. Validar funcionalidad de los botones de estímulos

**Línea**: `1726`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que los filtros de estímulos funcionan correctamente.

#### Estímulos validados:

- ✅ Diferentes tipos de estímulos disponibles en la página

#### Funcionalidades:

- ✅ **Botones visibles y clicables**
  - Todos los botones de estímulos visibles
  - Botones habilitados

- ✅ **Filtrado de contenido**
  - Al seleccionar un estímulo, el contenido se filtra
  - Resultados filtrados visibles

- ✅ **Actualización de URL**
  - URL cambia al seleccionar un estímulo
  - Parámetros de filtro en la URL

- ✅ **Visualización de resultados**
  - Resultados filtrados se muestran correctamente
  - Contenido relevante al estímulo seleccionado

#### Proceso de validación:
Similar a la validación de tipos de eventos.

---

### 7. Validar funcionalidad del footer

**Línea**: `1837`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que todos los enlaces y elementos del footer funcionan correctamente.

#### Elementos validados:

- ✅ **Enlaces de navegación**
  - Enlaces principales del footer
  - Navegación correcta al hacer clic
  - URLs correctas

- ✅ **Enlaces de redes sociales**
  - Enlaces a Facebook, Instagram, Twitter, etc.
  - Enlaces abren correctamente (nueva pestaña o mismo sitio)

- ✅ **Información de contacto**
  - Email de contacto
  - Teléfono (si aplica)
  - Dirección (si aplica)

- ✅ **Enlaces legales**
  - Términos y condiciones
  - Política de privacidad
  - Aviso legal (si aplica)

- ✅ **Copyright**
  - Año actual en el copyright
  - Texto de copyright visible

- ✅ **Navegación**
  - Todos los enlaces son clicables
  - Navegación funciona correctamente

#### Proceso de validación:
1. Buscar footer en la página
2. Encontrar todos los enlaces
3. Para cada enlace:
   - Verificar que es visible
   - Verificar URL esperada
   - Hacer clic y verificar navegación

---

## 🛠️ Funciones Helper Utilizadas

### `showStepMessage(page, message)`
Muestra un mensaje visual en la página durante la ejecución de la prueba.

**Uso**: Se utiliza en cada sección de validación para mostrar el progreso.

### `safeWaitForTimeout(page, ms)`
Espera de forma segura sin lanzar errores si la página se cierra.

**Uso**: Se utiliza después de navegaciones y antes de validaciones para asegurar que la página está lista.

### `waitForBackdropToDisappear(page, timeout)`
Espera a que los backdrops de Material-UI desaparezcan.

**Uso**: Se utiliza antes de hacer clics en elementos interactivos para evitar bloqueos.

### `closeRegistrationModal(page, timeout)`
Cierra el modal de registro si aparece.

**Uso**: Se utiliza al inicio de las pruebas para evitar que el modal bloquee interacciones.

---

## 🚀 Ejecución

### Ejecutar todas las pruebas de home
```bash
npx playwright test tests/common/home.spec.ts
```

### Ejecutar una prueba específica
```bash
# Por nombre
npx playwright test tests/common/home.spec.ts -g "Validar funcionalidad del hero banner"

# Por número de línea
npx playwright test tests/common/home.spec.ts:978
```

### Ejecutar en modo UI
```bash
npx playwright test tests/common/home.spec.ts --ui
```

### Ejecutar en modo debug
```bash
npx playwright test tests/common/home.spec.ts --debug
```

---

## ⚙️ Configuración

### Variables de Entorno

- `HOME_BASE_URL`: URL base para las pruebas (por defecto: `DEFAULT_BASE_URL`)

### Timeouts

- **Timeout por defecto**: 60 segundos por prueba
- **Timeouts de elementos**: 5-10 segundos según el elemento

---

## 🔍 Debugging

### Problemas Comunes

#### 1. Elementos no encontrados
**Solución**: 
- Verificar que la página cargó completamente con `waitForLoadState('networkidle')`
- Usar múltiples selectores alternativos
- Aumentar timeouts si es necesario

#### 2. Backdrop bloqueando clics
**Solución**: Usar `waitForBackdropToDisappear()` antes de hacer clics.

#### 3. Modal de registro bloqueando
**Solución**: Usar `closeRegistrationModal()` al inicio de las pruebas.

#### 4. Hero no encontrado
**Solución**: 
- Verificar que la página cargó completamente
- Usar selectores alternativos para el hero
- Esperar más tiempo si es necesario

---

## 📝 Mantenimiento

### Agregar Nueva Prueba

1. Seguir el patrón de las pruebas existentes
2. Usar `showStepMessage()` para mensajes visuales
3. Usar `safeWaitForTimeout()` para esperas
4. Validar elementos con `expect()` de Playwright
5. Incluir mensajes de consola descriptivos
6. Configurar timeout apropiado con `test.setTimeout()`

### Actualizar Selectores

Si la estructura HTML cambia:

1. Actualizar selectores en las pruebas afectadas
2. Probar en staging antes de producción
3. Verificar que todas las pruebas pasan
4. Actualizar esta documentación si es necesario

---

## 📚 Referencias

- [README.md](./README.md) - Documentación general de pruebas Common
- [Configuración del proyecto](../config.ts)
- [Utilidades comunes](../utils.ts)
- [Documentación de Playwright](https://playwright.dev/)

---

**Última actualización**: Diciembre 2024

