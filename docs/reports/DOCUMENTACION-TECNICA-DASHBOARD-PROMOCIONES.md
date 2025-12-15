# Documentación Técnica: Dashboard de Promociones

## Fecha: Diciembre 2025

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura y Estructura](#arquitectura-y-estructura)
3. [URLs y Rutas](#urls-y-rutas)
4. [Componentes Principales](#componentes-principales)
5. [Funcionalidades](#funcionalidades)
6. [Estructura de Datos](#estructura-de-datos)
7. [Algoritmos y Lógica de Negocio](#algoritmos-y-lógica-de-negocio)
8. [Selectores y Elementos DOM](#selectores-y-elementos-dom)
9. [Integraciones](#integraciones)
10. [Casos de Uso](#casos-de-uso)
11. [Consideraciones Técnicas](#consideraciones-técnicas)

---

## Resumen Ejecutivo

El **Dashboard de Promociones** es una vista del lado del cliente que permite explorar, buscar y filtrar promociones activas de servicios disponibles en la plataforma. La interfaz muestra las promociones en un formato de grid responsivo, con capacidades de búsqueda por texto y ubicación, ordenamiento automático por beneficio neto, y funcionalidades de favoritos.

### Características Principales

- ✅ Visualización de promociones en grid responsivo
- ✅ Búsqueda por texto (título/descripción del servicio)
- ✅ Filtrado por ubicación (Google Places Autocomplete)
- ✅ Ordenamiento automático por beneficio neto porcentual
- ✅ Sistema de favoritos integrado
- ✅ Navegación directa a páginas de servicio
- ✅ Diseño mobile-first responsive

---

## Arquitectura y Estructura

### Estructura de la Vista

```
/promotions
├── Navbar (fijo superior)
├── Formulario de Búsqueda
│   ├── Campo de Búsqueda (texto)
│   └── Campo de Ubicación (Google Places)
├── Grid de Promociones
│   └── Cards de Promoción (múltiples)
└── Footer (fijo inferior, solo móvil)
```

### Layout Responsivo

- **Desktop (≥1024px)**: Grid multi-columna, formulario completo visible
- **Tablet (768px-1023px)**: Grid 2 columnas, formulario adaptado
- **Mobile (<768px)**: Grid 1 columna, formulario compacto

---

## URLs y Rutas

### URL Principal

```
URL Base: {BASE_URL}/promotions
Ejemplo: https://staging.fiestamas.com/promotions
```

### Rutas Relacionadas

- **Favoritos**: `{BASE_URL}/client/favorites`
- **Página de Servicio**: `{BASE_URL}/service/{serviceId}/{serviceSlug}`

### Navegación

- Las cards de promoción son clickeables y navegan a la página del servicio correspondiente
- El botón de favoritos permite marcar/desmarcar promociones como favoritas
- La navegación a favoritos se realiza desde el navbar o directamente a `/client/favorites`

---

## Componentes Principales

### 1. Formulario de Búsqueda (`form#PromotionsSearchForm`)

#### Campo de Búsqueda por Texto

- **Selector**: `input#Search` o `input` asociado a label "Buscar"
- **Funcionalidad**: Filtra promociones por texto en título o descripción
- **Comportamiento**: 
  - Búsqueda en tiempo real o al presionar Enter
  - Mantiene el orden de relevancia después del filtrado
  - Muestra mensaje de "no resultados" si no hay coincidencias

#### Campo de Ubicación

- **Selector**: `input#Address` o `input[name="Address"]`
- **Funcionalidad**: Filtra promociones por ubicación geográfica
- **Integración**: Google Places Autocomplete API
- **Comportamiento**:
  - Muestra sugerencias al escribir
  - Selección de sugerencia actualiza el filtro
  - Filtra promociones que cubren la ubicación seleccionada

### 2. Grid de Promociones

#### Contenedor

- **Selector**: `div[class*="grid"], div[class*="Grid"], section[class*="grid"]`
- **Layout**: CSS Grid o Flexbox responsivo
- **Comportamiento**: 
  - Se adapta automáticamente al número de columnas según viewport
  - Scroll infinito o paginación (según implementación)

### 3. Cards de Promoción

#### Estructura de la Card

```html
<div class="flex flex-col rounded-8 shadow-4 cursor-pointer">
  <!-- Imagen de fondo -->
  <div class="bg-cover bg-center rounded-8" style="background-image: url(...)">
    <!-- Badge de promoción -->
    <div class="bg-orange-950">
      <i class="icon icon-promotion"></i>
      <p>{texto_oferta}</p>
    </div>
    <!-- Botón de favoritos -->
    <button>
      <i class="icon icon-heart | icon-heart-solid"></i>
    </button>
  </div>
  
  <!-- Contenedor de información -->
  <div class="flex flex-col py-4 px-5">
    <!-- Título -->
    <p class="text-large text-dark-neutral font-bold text-start">
      {titulo_servicio}
    </p>
    <!-- Descripción -->
    <p class="text-dark-neutral text-start truncate">
      {descripcion_servicio}
    </p>
  </div>
</div>
```

#### Elementos de la Card

1. **Imagen de Fondo**
   - Selector: `div.bg-cover.bg-center.rounded-8`
   - Estilo: `background-image` con URL de imagen del servicio
   - Comportamiento: Click navega a página del servicio

2. **Badge de Promoción**
   - Selector: `div.bg-orange-950` con `i.icon-promotion`
   - Contenido: Texto de la oferta (ej: "10% OFF", "2x1", "$500")
   - Posición: Superpuesto sobre la imagen

3. **Botón de Favoritos**
   - Selector: `button` con `i.icon-heart` o `i.icon-heart-solid`
   - Estados:
     - `icon-heart`: No marcado como favorito
     - `icon-heart-solid`: Marcado como favorito
   - Comportamiento: Toggle al hacer clic

4. **Título del Servicio**
   - Selector: `p.text-large.text-dark-neutral.font-bold.text-start`
   - Contenido: Nombre del servicio

5. **Descripción del Servicio**
   - Selector: `p.text-dark-neutral.text-start.truncate`
   - Contenido: Descripción corta del servicio
   - Comportamiento: Texto truncado con ellipsis si es muy largo

---

## Funcionalidades

### 1. Carga Inicial

**Comportamiento:**
- Al navegar a `/promotions`, se cargan todas las promociones activas
- Las promociones se ordenan automáticamente por beneficio neto porcentual (descendente)
- Se muestra un grid responsivo con todas las cards

**Validaciones:**
- Verificar que existe un grid contenedor
- Verificar que existe una barra de búsqueda
- Verificar que NO existe un toggle de promociones dentro del input de búsqueda
- Contar cards visibles y válidas

### 2. Búsqueda por Texto

**Flujo:**
1. Usuario escribe en el campo de búsqueda (`input#Search`)
2. El sistema filtra las promociones que contienen el texto en:
   - Título del servicio
   - Descripción del servicio
3. Se mantiene el orden de relevancia (beneficio neto) después del filtrado
4. Si no hay resultados, se muestra mensaje de estado vacío

**Algoritmo de Filtrado:**
- Búsqueda case-insensitive
- Coincidencias parciales (substring)
- Prioriza coincidencias en título sobre descripción

### 3. Filtrado por Ubicación

**Flujo:**
1. Usuario hace clic en el campo de ubicación (`input#Address`)
2. Escribe el nombre de una ciudad (ej: "Tepatitlan")
3. Google Places Autocomplete muestra sugerencias
4. Usuario selecciona una sugerencia de la lista (`ul li.cursor-pointer`)
5. El sistema filtra promociones que cubren esa ubicación
6. Se actualiza el grid con las promociones filtradas

**Integración Google Places:**
- API: Google Places Autocomplete
- Selector de sugerencias: `ul li.cursor-pointer`
- Formato de selección: Click en la primera opción visible

### 4. Ordenamiento por Beneficio Neto

**Algoritmo de Ordenamiento:**

Las promociones se ordenan automáticamente según:

1. **Prioridad Primaria**: Beneficio neto porcentual (descendente)
2. **Prioridad Secundaria**: Relevancia de ubicación (si aplica)
3. **Prioridad Terciaria**: Fecha de creación / ID (descendente)

**Cálculo de Beneficio Neto:**

El beneficio neto porcentual se calcula según el tipo de oferta:

- **Descuento Porcentual** (`X% OFF`):
  ```
  beneficio_neto = X%
  ```

- **Promoción NxM** (`N x M`):
  ```
  beneficio_neto = ((N - M) / N) * 100
  Ejemplo: "3x2" = ((3-2)/3) * 100 = 33.33%
  ```

- **Cupón en Monto** (`$X,xxx`):
  ```
  beneficio_neto = (monto_cupon / precio_servicio) * 100
  Nota: Requiere precio del servicio para calcular
  ```

**Reglas de Ordenamiento:**

1. Promociones con beneficio calculable aparecen **antes** que las sin beneficio
2. Entre promociones con beneficio, se ordenan de mayor a menor
3. Promociones sin beneficio calculable aparecen al final

### 5. Sistema de Favoritos

**Funcionalidad:**
- Cada card tiene un botón de favoritos
- Al hacer clic, se marca/desmarca como favorito
- El estado se refleja en el icono:
  - `icon-heart`: No favorito
  - `icon-heart-solid`: Favorito

**Integración:**
- Las promociones marcadas como favoritas aparecen en `/client/favorites`
- El estado persiste entre sesiones

**Flujo de Prueba:**
1. Navegar a `/promotions`
2. Seleccionar primera promoción visible
3. Hacer clic en botón de favoritos
4. Verificar que el icono cambia a `icon-heart-solid`
5. Navegar a `/client/favorites`
6. Verificar que la promoción aparece en la lista de favoritos

### 6. Navegación a Página de Servicio

**Funcionalidad:**
- Al hacer clic en cualquier parte de la card (excepto botón de favoritos), se navega a la página del servicio
- La URL sigue el patrón: `/service/{serviceId}/{serviceSlug}`

**Validación de Navegación:**
- Verificar que la URL cambia correctamente
- Verificar que el nombre del servicio en la página coincide con el título de la promoción
- Verificar que la descripción del servicio coincide (parcialmente) con la descripción de la promoción

**Selectores en Página de Servicio:**
- Nombre: `h4.text-dark-neutral`, `h5.text-dark-neutral`, `h6.text-dark-neutral` (según viewport)
- Descripción: `p.text-dark-neutral.break-words`

---

## Estructura de Datos

### Objeto de Promoción

```typescript
interface Promocion {
  id: number;
  servicio_id: number;
  titulo: string;
  descripcion: string;
  oferta_corta: string; // "10% OFF", "2x1", "$500"
  fecha_inicio: string; // ISO 8601
  fecha_fin: string; // ISO 8601
  imagen_url: string;
  beneficio_neto_porcentual: number | null;
  ubicaciones_cubiertas: string[];
  activa: boolean;
  servicio: {
    id: number;
    nombre: string;
    descripcion: string;
    slug: string;
  };
}
```

### Cálculo de Beneficio Neto

```typescript
function calcularBeneficioNeto(oferta: string, precioServicio?: number): number | null {
  // Descuento porcentual: "10% OFF"
  const porcentajeMatch = oferta.match(/(\d+(?:\.\d+)?)\s*%/i);
  if (porcentajeMatch) {
    return parseFloat(porcentajeMatch[1]);
  }
  
  // Promoción NxM: "3x2"
  const nxmMatch = oferta.match(/(\d+)\s*x\s*(\d+)/i);
  if (nxmMatch) {
    const n = parseInt(nxmMatch[1]);
    const m = parseInt(nxmMatch[2]);
    return ((n - m) / n) * 100;
  }
  
  // Cupón en monto: "$500" (requiere precio del servicio)
  const montoMatch = oferta.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (montoMatch && precioServicio) {
    const monto = parseFloat(montoMatch[1].replace(/,/g, ''));
    return (monto / precioServicio) * 100;
  }
  
  return null; // No se puede calcular
}
```

---

## Algoritmos y Lógica de Negocio

### Algoritmo de Ordenamiento

```typescript
function ordenarPromociones(promociones: Promocion[]): Promocion[] {
  return promociones.sort((a, b) => {
    // Prioridad 1: Beneficio neto (descendente)
    const beneficioA = a.beneficio_neto_porcentual ?? -1;
    const beneficioB = b.beneficio_neto_porcentual ?? -1;
    
    // Promociones con beneficio antes que sin beneficio
    if (beneficioA === -1 && beneficioB !== -1) return 1;
    if (beneficioA !== -1 && beneficioB === -1) return -1;
    
    // Si ambas tienen beneficio, ordenar descendente
    if (beneficioA !== -1 && beneficioB !== -1) {
      if (beneficioA !== beneficioB) {
        return beneficioB - beneficioA; // Descendente
      }
    }
    
    // Prioridad 2: Relevancia de ubicación (si aplica)
    // (Implementación específica según lógica de negocio)
    
    // Prioridad 3: Fecha de creación / ID (descendente)
    return b.id - a.id;
  });
}
```

### Algoritmo de Filtrado por Texto

```typescript
function filtrarPorTexto(promociones: Promocion[], texto: string): Promocion[] {
  const textoLimpio = texto.trim().toLowerCase();
  if (!textoLimpio) return promociones;
  
  return promociones.filter(promo => {
    const tituloMatch = promo.servicio.nombre.toLowerCase().includes(textoLimpio);
    const descripcionMatch = promo.servicio.descripcion.toLowerCase().includes(textoLimpio);
    const ofertaMatch = promo.oferta_corta.toLowerCase().includes(textoLimpio);
    
    return tituloMatch || descripcionMatch || ofertaMatch;
  });
}
```

### Algoritmo de Filtrado por Ubicación

```typescript
function filtrarPorUbicacion(promociones: Promocion[], ubicacion: string): Promocion[] {
  // Validar que la promoción cubre la ubicación seleccionada
  return promociones.filter(promo => {
    return promo.ubicaciones_cubiertas.some(ubicacionCubierta => {
      // Comparación de ubicaciones (implementación específica)
      return ubicacionCubierta.toLowerCase().includes(ubicacion.toLowerCase()) ||
             ubicacion.toLowerCase().includes(ubicacionCubierta.toLowerCase());
    });
  });
}
```

---

## Selectores y Elementos DOM

### Selectores Principales

#### Formulario de Búsqueda

```typescript
// Campo de búsqueda por texto
const searchInput = page.locator('input#Search').first();
// O alternativamente:
const searchInput = page.locator('input').filter({
  has: page.locator('label:has-text("Buscar")')
}).first();

// Campo de ubicación
const locationInput = page.locator('input#Address').first();
// O alternativamente:
const locationInput = page.locator('input[name="Address"]').first();
```

#### Cards de Promoción

```typescript
// Locator principal para todas las cards
function getPromoCardsLocator(page: Page) {
  return page.locator('div.flex.flex-col.rounded-8.shadow-4.cursor-pointer').filter({
    has: page.locator('div.bg-orange-950, div[class*="orange-950"]').filter({
      has: page.locator('i.icon-promotion, i[class*="promotion"]')
    })
  });
}

// Elementos dentro de una card
const card = promoCards.nth(index);

// Badge de promoción
const badge = card.locator('div.bg-orange-950').first();
const iconoPromocion = badge.locator('i.icon-promotion').first();
const textoOferta = badge.locator('p').first();

// Botón de favoritos
const botonFavoritos = card.locator('button').filter({
  has: page.locator('i.icon-heart, i.icon-heart-solid')
}).first();

// Título
const titulo = card.locator('p.text-large.text-dark-neutral.font-bold.text-start').first();

// Descripción
const descripcion = card.locator('p.text-dark-neutral.text-start.truncate').first();
```

#### Google Places Autocomplete

```typescript
// Sugerencias de Google Places
const sugerencias = page.locator('ul li.cursor-pointer');

// Seleccionar primera sugerencia
const primeraSugerencia = sugerencias.first();
```

### Validación de Visibilidad

```typescript
async function countVisiblePromoCards(page: Page): Promise<number> {
  const promoCards = getPromoCardsLocator(page);
  const totalCards = await promoCards.count();
  
  let visibleCount = 0;
  for (let i = 0; i < totalCards; i++) {
    const card = promoCards.nth(i);
    const isVisible = await card.isVisible().catch(() => false);
    if (isVisible) {
      const boundingBox = await card.boundingBox().catch(() => null);
      if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
        const badgeVisible = await card.locator('div.bg-orange-950').first().isVisible().catch(() => false);
        if (badgeVisible) {
          visibleCount++;
        }
      }
    }
  }
  
  return visibleCount;
}
```

---

## Integraciones

### 1. Google Places Autocomplete

**Propósito**: Permitir al usuario seleccionar una ubicación para filtrar promociones.

**Implementación:**
- Campo de input con `id="Address"` o `name="Address"`
- Integración con Google Places JavaScript API
- Sugerencias aparecen en `ul li.cursor-pointer`

**Flujo de Interacción:**
1. Usuario escribe en el campo
2. Google Places muestra sugerencias
3. Usuario selecciona una sugerencia
4. El valor se actualiza en el input
5. Se dispara el filtrado de promociones

### 2. API de Promociones

**Endpoint Esperado**: `GET /api/promotions` (o similar)

**Parámetros de Query:**
- `search`: Texto de búsqueda (opcional)
- `location`: Ubicación filtrada (opcional)
- `page`: Número de página (opcional)
- `limit`: Límite de resultados (opcional)

**Respuesta Esperada:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "servicio_id": 123,
      "titulo": "Promoción Especial",
      "descripcion": "Descripción de la promoción",
      "oferta_corta": "10% OFF",
      "fecha_inicio": "2025-12-01T00:00:00Z",
      "fecha_fin": "2025-12-31T23:59:59Z",
      "imagen_url": "https://...",
      "beneficio_neto_porcentual": 10.0,
      "ubicaciones_cubiertas": ["Tepatitlán", "Guadalajara"],
      "activa": true,
      "servicio": {
        "id": 123,
        "nombre": "FiestaRoy",
        "descripcion": "Ricos pasteles",
        "slug": "fiestaroy"
      }
    }
  ]
}
```

### 3. API de Favoritos

**Endpoints:**
- `POST /api/favorites`: Marcar promoción como favorita
- `DELETE /api/favorites/{id}`: Desmarcar promoción como favorita
- `GET /api/favorites`: Obtener lista de favoritos

---

## Casos de Uso

### Caso de Uso 1: Explorar Promociones

**Actor**: Cliente

**Flujo:**
1. Cliente navega a `/promotions`
2. Sistema muestra todas las promociones activas ordenadas por beneficio neto
3. Cliente explora las cards disponibles
4. Cliente puede hacer clic en una card para ver detalles del servicio

**Resultado Esperado**: Cliente ve todas las promociones disponibles y puede navegar a servicios de interés.

### Caso de Uso 2: Buscar Promoción por Texto

**Actor**: Cliente

**Flujo:**
1. Cliente navega a `/promotions`
2. Cliente escribe texto en el campo de búsqueda (ej: "FiestaRoy")
3. Sistema filtra promociones que contienen el texto
4. Sistema mantiene el orden de relevancia (beneficio neto)
5. Si no hay resultados, muestra mensaje de estado vacío

**Resultado Esperado**: Cliente encuentra promociones relevantes según su búsqueda.

### Caso de Uso 3: Filtrar por Ubicación

**Actor**: Cliente

**Flujo:**
1. Cliente navega a `/promotions`
2. Cliente hace clic en el campo de ubicación
3. Cliente escribe nombre de ciudad (ej: "Tepatitlan")
4. Google Places muestra sugerencias
5. Cliente selecciona una sugerencia
6. Sistema filtra promociones que cubren esa ubicación
7. Sistema actualiza el grid con resultados filtrados

**Resultado Esperado**: Cliente ve solo promociones disponibles en su ubicación.

### Caso de Uso 4: Marcar como Favorito

**Actor**: Cliente

**Flujo:**
1. Cliente navega a `/promotions`
2. Cliente encuentra una promoción de interés
3. Cliente hace clic en el botón de favoritos de la card
4. Sistema marca la promoción como favorita
5. El icono cambia a `icon-heart-solid`
6. Cliente navega a `/client/favorites`
7. Sistema muestra la promoción en la lista de favoritos

**Resultado Esperado**: Cliente puede guardar promociones de interés para consultarlas después.

### Caso de Uso 5: Navegar a Servicio

**Actor**: Cliente

**Flujo:**
1. Cliente navega a `/promotions`
2. Cliente encuentra una promoción de interés
3. Cliente hace clic en la card (no en el botón de favoritos)
4. Sistema navega a `/service/{serviceId}/{serviceSlug}`
5. Sistema muestra la página del servicio con:
   - Nombre del servicio (coincide con título de promoción)
   - Descripción del servicio (coincide con descripción de promoción)

**Resultado Esperado**: Cliente accede a la página completa del servicio para obtener más información.

---

## Consideraciones Técnicas

### Performance

1. **Lazy Loading**: Las imágenes de las cards deberían cargarse de forma diferida (lazy loading)
2. **Paginación/Scroll Infinito**: Para grandes volúmenes de promociones, implementar paginación o scroll infinito
3. **Debounce en Búsqueda**: Implementar debounce en el campo de búsqueda para evitar múltiples llamadas API

### Accesibilidad

1. **ARIA Labels**: Los botones de favoritos y cards deberían tener `aria-label` descriptivos
2. **Navegación por Teclado**: Asegurar que todas las interacciones sean accesibles por teclado
3. **Contraste**: Verificar que el texto sobre las imágenes tenga suficiente contraste

### Responsive Design

1. **Breakpoints**:
   - Mobile: < 768px (1 columna)
   - Tablet: 768px - 1023px (2 columnas)
   - Desktop: ≥ 1024px (3+ columnas)

2. **Touch Targets**: Los botones y cards deben tener un tamaño mínimo de 44x44px en móvil

3. **Viewport**: Asegurar que el contenido se adapte correctamente a diferentes tamaños de pantalla

### Manejo de Errores

1. **Estado Vacío**: Mostrar mensaje claro cuando no hay promociones
2. **Error de API**: Mostrar mensaje de error si falla la carga de promociones
3. **Timeout de Google Places**: Manejar casos donde Google Places no responde

### Testing

**Cobertura de Pruebas Automatizadas:**

- ✅ Carga básica de la vista
- ✅ Validación de estructura de cards
- ✅ Catálogo completo de promociones
- ✅ Ordenamiento por beneficio neto
- ✅ Búsqueda por texto
- ✅ Filtrado por ubicación
- ✅ Sistema de favoritos
- ✅ Navegación a página de servicio
- ✅ Responsividad (mobile/tablet/desktop)

**Archivo de Pruebas**: `tests/client/promociones-dashboard.spec.ts`

---

## Referencias

- **Archivo de Pruebas**: `tests/client/promociones-dashboard.spec.ts`
- **Análisis de Cobertura**: `docs/reports/ANALISIS-COBERTURA-PROMOCIONES.md`
- **Resumen de Pruebas**: `docs/reports/RESUMEN-PRUEBAS-AGREGADAS-PROMOCIONES.md`

---

## Versión del Documento

- **Versión**: 1.0
- **Última Actualización**: Diciembre 2025
- **Autor**: Documentación generada a partir de análisis de código y pruebas automatizadas

